// apps/api/src/modules/catalog/catalog-ai-intake.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Accepts uploaded files (PDF, XLSX, CSV, plain text) and uses Claude to:
//
//   mode: 'recipes'  → extract recipes + ingredients from an SOP or menu doc
//   mode: 'invoice'  → extract ingredient costs from a supplier invoice
//
// In both modes, existing ingredients are sent to Claude so it can do semantic
// matching rather than exact string matching. The response is a preview payload
// the user reviews before anything is written to the database.
//
// Install: npm install pdf-parse xlsx
//          npm install -D @types/pdf-parse
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../core/prisma/prisma.service';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS   = 2200;
const MAX_INPUT_TEXT_CHARS = 45000;
const MAX_INGREDIENT_CONTEXT = 400;

// ─── response shapes ─────────────────────────────────────────────────────────

export interface ParsedIngredient {
  ingredientName: string;
  quantity:       number;
  useUnit:        string;
  matchedExisting: boolean;
}

export interface ParsedRecipe {
  name:        string;
  category:    string;
  sellPrice:   number;
  ingredients: ParsedIngredient[];
}

export interface ParsedInvoiceItem {
  rawName:               string;   // exactly as on invoice
  resolvedName:          string;   // standardised name
  matchedIngredientId:   string | null;
  matchedIngredientName: string | null;
  isNewIngredient:       boolean;
  matchConfidence:       'high' | 'medium' | 'low' | 'none';
  unit:                  string;
  pkgSize:               number;
  qtyBought:             number;
  unitPrice:             number | null;
  totalPaid:             number;
  notes:                 string;
}

export interface RecipeParseResult {
  mode:           'recipes';
  recipes:        ParsedRecipe[];
  newIngredients: Array<{ name: string; unit: string }>;
  rawText:        string; // for debugging
}

export interface InvoiceParseResult {
  mode:         'invoice';
  supplierName: string | null;
  invoiceDate:  string | null;
  items:        ParsedInvoiceItem[];
  rawText:      string;
}

// ─── service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CatalogAiIntakeService {
  private readonly logger = new Logger(CatalogAiIntakeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async parseDocument(
    buffer:   Buffer,
    mimeType: string,
    filename: string,
    mode:     'recipes' | 'invoice',
    organizationId: number,
    locationId:     string,
  ): Promise<RecipeParseResult | InvoiceParseResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        'ANTHROPIC_API_KEY is not configured. Add it to your environment variables to use AI intake.'
      );
    }

    // Load existing ingredients for semantic matching
    const existingIngredients = await this.prisma.ingredient.findMany({
      where: { organizationId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: 'asc' },
    });

    this.logger.log(`AI intake: mode=${mode}, file=${filename}, type=${mimeType}, ingredients=${existingIngredients.length}`);

    const isPdf = mimeType === 'application/pdf' || filename.endsWith('.pdf');

    if (mode === 'recipes') {
      return this.extractRecipes(buffer, mimeType, isPdf, existingIngredients, apiKey);
    } else {
      return this.extractInvoice(buffer, mimeType, isPdf, existingIngredients, apiKey);
    }
  }

  // ─── Recipe extraction ────────────────────────────────────────────────────

  private async extractRecipes(
    buffer:      Buffer,
    mimeType:    string,
    isPdf:       boolean,
    existing:    Array<{ id: string; name: string; unit: string }>,
    apiKey:      string,
  ): Promise<RecipeParseResult> {
    const CATS = [
      'Signature Espresso','Matcha & Chai','Wanderlust','Espresso Basics',
      'Refreshers','Frappes & Smoothies','Tea Selection','Grab N Go','Pastries',
    ];

    const existingList = existing
      .slice(0, MAX_INGREDIENT_CONTEXT)
      .map(i => `  - "${i.name}" (buy unit: ${i.unit})`)
      .join('\n');

    const existingNote = existing.length > MAX_INGREDIENT_CONTEXT
      ? `\nNOTE: Only the first ${MAX_INGREDIENT_CONTEXT} existing ingredients are included for cost control.`
      : '';

    const prompt = `You are a restaurant recipe analyst. Extract all recipes and menu items from this document.

EXISTING INGREDIENTS IN THE SYSTEM — use these exact names when referencing known ingredients:
${existingList || '  (none yet — treat all ingredients as new)'}${existingNote}

VALID CATEGORIES (assign the best fit for each recipe):
${CATS.map(c => `  - ${c}`).join('\n')}

For each recipe you find:
1. Extract the full recipe name
2. Assign the most appropriate category
3. Extract sell price if visible, otherwise use 0
4. List all ingredients with quantities and units
5. For each ingredient, check if it matches an existing ingredient above — use the EXACT existing name if matched

CRITICAL: Respond ONLY with valid JSON matching this exact shape. No markdown, no explanation:
{
  "recipes": [
    {
      "name": "Baladi Vanilla Date Oat Milk Latte",
      "category": "Signature Espresso",
      "sellPrice": 6.75,
      "ingredients": [
        { "ingredientName": "Oatly Full Fat Oat Milk", "quantity": 8, "useUnit": "oz", "matchedExisting": true },
        { "ingredientName": "Date syrup", "quantity": 2, "useUnit": "pump", "matchedExisting": true },
        { "ingredientName": "Espresso (double shot)", "quantity": 1, "useUnit": "shot", "matchedExisting": true }
      ]
    }
  ],
  "newIngredients": [
    { "name": "Butterfly Pea Flower Syrup", "unit": "pump" }
  ]
}`;

    const { content, rawText } = await this.callClaude(buffer, mimeType, isPdf, prompt, apiKey);

    let parsed: { recipes: ParsedRecipe[]; newIngredients: Array<{ name: string; unit: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Claude could not extract structured recipe data from this document. ' +
        'Ensure the document contains readable recipe text and try again.'
      );
    }

    return {
      mode:           'recipes',
      recipes:        parsed.recipes ?? [],
      newIngredients: parsed.newIngredients ?? [],
      rawText,
    };
  }

  // ─── Invoice extraction ───────────────────────────────────────────────────

  private async extractInvoice(
    buffer:   Buffer,
    mimeType: string,
    isPdf:    boolean,
    existing: Array<{ id: string; name: string; unit: string }>,
    apiKey:   string,
  ): Promise<InvoiceParseResult> {
    const existingList = existing
      .slice(0, MAX_INGREDIENT_CONTEXT)
      .map(i => `  - id:"${i.id}" name:"${i.name}" unit:${i.unit}`)
      .join('\n');

    const existingNote = existing.length > MAX_INGREDIENT_CONTEXT
      ? `\nNOTE: Only the first ${MAX_INGREDIENT_CONTEXT} existing ingredients are included for cost control.`
      : '';

    const prompt = `You are a restaurant inventory assistant analyzing a supplier invoice or order confirmation.

EXISTING INGREDIENTS IN THIS RESTAURANT'S SYSTEM:
${existingList || '  (none yet — all will be new)'}${existingNote}

For each product line item on this invoice:
1. Extract the raw product name exactly as it appears
2. Create a clean, standardized ingredient name
3. Semantically match to an existing ingredient if it's the same physical product:
   - Use your knowledge of food products — "Oatly Oat Milk 64oz" = "Oatly Full Fat Oat Milk"
   - "2% Milk 1gal" = "2% reduced fat milk"
   - "HVY CREAM 32OZ" = "Heavy whipping cream"
   - Be confident about clear matches (high), cautious about partial matches (medium)
4. Extract: unit of measure, package size in that unit, quantity of packages, price per package, total paid
5. If total is missing but unit price and qty are present, compute total = unitPrice × qty

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation:
{
  "supplier": "Amazon Fresh",
  "invoiceDate": "2026-05-28",
  "items": [
    {
      "rawName": "Oatly Oat Milk 64 FL OZ (Pack of 30)",
      "resolvedName": "Oatly Full Fat Oat Milk",
      "matchedIngredientId": "the-uuid-from-above-or-null",
      "matchedIngredientName": "Oatly Full Fat Oat Milk",
      "isNewIngredient": false,
      "matchConfidence": "high",
      "unit": "oz",
      "pkgSize": 64,
      "qtyBought": 30,
      "unitPrice": 5.27,
      "totalPaid": 158.10,
      "notes": ""
    }
  ]
}`;

    const { content, rawText } = await this.callClaude(buffer, mimeType, isPdf, prompt, apiKey);

    let parsed: { supplier: string; invoiceDate: string; items: ParsedInvoiceItem[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Claude could not extract structured cost data from this document. ' +
        'Ensure the document is a readable invoice or order confirmation and try again.'
      );
    }

    return {
      mode:         'invoice',
      supplierName: parsed.supplier ?? null,
      invoiceDate:  parsed.invoiceDate ?? null,
      items:        parsed.items ?? [],
      rawText,
    };
  }

  // ─── Claude API call ──────────────────────────────────────────────────────

  private async callClaude(
    buffer:   Buffer,
    mimeType: string,
    isPdf:    boolean,
    prompt:   string,
    apiKey:   string,
  ): Promise<{ content: string; rawText: string }> {
    let messages: any[];
    let rawText = '';

    if (isPdf) {
      // Send PDF directly — Claude reads it natively
      const base64 = buffer.toString('base64');
      messages = [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt },
        ],
      }];
      rawText = '[PDF document sent to Claude directly]';
    } else {
      // Extract text from XLSX/CSV/plain text
      rawText = this.extractTextFromFile(buffer, mimeType);
      if (rawText.length > MAX_INPUT_TEXT_CHARS) {
        rawText = `${rawText.slice(0, MAX_INPUT_TEXT_CHARS)}\n\n[TRUNCATED: input reduced for token/cost control]`;
      }
      messages = [{
        role: 'user',
        content: `${prompt}\n\n---DOCUMENT CONTENT---\n${rawText}`,
      }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
        'anthropic-beta':       'pdfs-2024-09-25', // enables native PDF support
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`Claude API error: ${err}`);
      throw new BadRequestException('AI processing failed. Please try again.');
    }

    const data = await response.json();
    const content = data.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    // Strip any accidental markdown fences
    const clean = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

    return { content: clean, rawText };
  }

  // ─── File text extraction (non-PDF) ──────────────────────────────────────

  private extractTextFromFile(buffer: Buffer, mimeType: string): string {
    // XLSX / XLS
    if (
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('excel') ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return workbook.SheetNames
        .map(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          return `=== Sheet: ${sheetName} ===\n` +
            rows.map(row => row.join('\t')).join('\n');
        })
        .join('\n\n');
    }

    // CSV or plain text
    return buffer.toString('utf-8');
  }
}
