// src/modules/catalog/AIIntakeView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AI-powered document intake for recipes and supplier invoices.
//
// Flow:
//   1. Pick mode (Recipe SOP | Supplier Invoice)
//   2. Upload file
//   3. Claude parses it → review screen
//   4. Remove unwanted items, edit anything wrong
//   5. Confirm → existing import API creates everything in DB
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { api } from '../../api.js';
import { tokens as C, ui } from '../../shared/styles.js';

const F = {
  display: C.fonts.heading,
  ui: C.fonts.body,
};

const card = {
  ...ui.card,
};

const btnPrimary = {
  ...ui.button,
  background: C.ink,
  color: '#fff',
};

const btnGhost = {
  ...ui.button,
  background: 'transparent',
  color: C.textSecond,
  border: `1px solid ${C.beigeLight}`,
};

const tone = {
  textPrimary: C.ink,
  textMuted: C.textMuted,
  white: C.white,
  green: C.colors.success,
  amber: C.colors.warn,
  red: C.colors.danger,
  greenBg: '#E8F8EF',
  amberBg: '#FEFCE8',
  redBg: '#FDEDEC',
  redBorder: '#FCA5A5',
};

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

async function parseApiResponse(res) {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    return data;
  }

  const text = await res.text().catch(() => '');
  if (!text.trim()) return {};

  // Some proxies/middlewares may return JSON with a missing content-type.
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function authFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

async function parseFile(locationId, mode, file) {
  const token = localStorage.getItem('token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/catalog/ai-intake/parse/${locationId}?mode=${mode}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.message || `Parse failed (${res.status})`);
  return data;
}

async function confirmImport(locationId, payload) {
  return authFetch(`/catalog/import/json/${locationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── styles ──────────────────────────────────────────────────────────────────
const s = {
  page: { padding: '24px', background: C.cream, minHeight: '100%', maxWidth: 900 },
  heading: { fontFamily: F.display, fontSize: 22, fontWeight: 700, color: tone.textPrimary, marginBottom: 6 },
  subheading: { fontFamily: F.ui, fontSize: 13, color: tone.textMuted, marginBottom: 28, lineHeight: 1.6 },
  modeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 },
  modeCard: (active) => ({
    ...card, padding: '20px', cursor: 'pointer',
    borderColor: active ? C.gold : C.beigeLight,
    borderWidth: active ? 2 : 1,
    transition: 'all .15s',
    background: active ? '#FFF8E8' : tone.white,
  }),
  modeIcon: { fontSize: 28, marginBottom: 10 },
  modeTitle: { fontFamily: F.display, fontSize: 16, fontWeight: 700, color: tone.textPrimary, marginBottom: 4 },
  modeDesc: { fontFamily: F.ui, fontSize: 12, color: tone.textMuted, lineHeight: 1.5 },
  dropzone: (dragging, hasFile) => ({
    border: `2px dashed ${dragging ? C.gold : hasFile ? tone.green : C.beigeLight}`,
    borderRadius: 10, padding: '28px 20px', textAlign: 'center',
    cursor: 'pointer', transition: 'all .15s',
    background: dragging ? '#FFF8E8' : hasFile ? tone.greenBg : tone.white,
    marginBottom: 14,
  }),
  dropIcon: { fontSize: 28, marginBottom: 8 },
  dropLabel: { fontFamily: F.ui, fontSize: 14, fontWeight: 600, color: tone.textPrimary, marginBottom: 4 },
  dropSub: { fontFamily: F.ui, fontSize: 12, color: tone.textMuted },
  spinner: { fontFamily: F.ui, fontSize: 13, color: tone.textMuted, textAlign: 'center', padding: '40px 20px' },
  // Review
  reviewHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, flexWrap: 'wrap', gap: 10,
  },
  reviewTitle: { fontFamily: F.display, fontSize: 18, fontWeight: 700, color: tone.textPrimary },
  reviewMeta: { fontFamily: F.ui, fontSize: 12, color: tone.textMuted },
  recipeCard: (removed) => ({
    ...card, marginBottom: 10, overflow: 'hidden',
    opacity: removed ? 0.35 : 1, transition: 'opacity .2s',
  }),
  recipeHeader: {
    padding: '10px 14px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', cursor: 'pointer',
    borderBottom: `1px solid ${C.beigeLight}`,
  },
  recipeName: { fontFamily: F.ui, fontSize: 13, fontWeight: 600, color: tone.textPrimary },
  recipeCat: { fontFamily: F.ui, fontSize: 11, color: tone.textMuted, marginTop: 1 },
  recipeIngList: { padding: '8px 14px 10px' },
  recipeIngRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
    fontFamily: F.ui, fontSize: 12, color: C.textSecond,
    borderBottom: `1px solid ${C.beigeLight}`,
  },
  ingDot: (matched) => ({
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
    background: matched ? tone.green : tone.amber,
  }),
  // Invoice review table
  invTable: { ...card, overflow: 'hidden', marginBottom: 14 },
  th: {
    padding: '7px 12px', fontFamily: F.ui, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: tone.textMuted,
    background: C.cream, borderBottom: `1px solid ${C.beigeLight}`, textAlign: 'left',
  },
  td: {
    padding: '8px 12px', borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: F.ui, fontSize: 12, color: tone.textPrimary, verticalAlign: 'middle',
  },
  matchBadge: (conf) => ({
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
    background: conf === 'high' ? tone.greenBg : conf === 'medium' ? tone.amberBg : '#F3EEE8',
    color: conf === 'high' ? tone.green : conf === 'medium' ? tone.amber : tone.textMuted,
  }),
  newBadge: {
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 100, background: '#EDE9FE', color: '#5B21B6',
  },
  removeBtn: {
    fontFamily: F.ui, fontSize: 11, padding: '2px 8px',
    background: '#FDEDEC', color: tone.red, border: `1px solid #FCA5A5`,
    borderRadius: 4, cursor: 'pointer',
  },
  undoBtn: {
    fontFamily: F.ui, fontSize: 11, padding: '2px 8px',
    background: C.cream, color: tone.textMuted, border: `1px solid ${C.beigeLight}`,
    borderRadius: 4, cursor: 'pointer',
  },
  resultBox: (isError) => ({
    background: isError ? tone.redBg : tone.greenBg,
    border: `1px solid ${isError ? tone.redBorder : '#86EFAC'}`,
    borderRadius: 8, padding: '14px 16px', marginBottom: 16,
  }),
  resultTitle: (isError) => ({
    fontFamily: F.ui, fontSize: 13, fontWeight: 700,
    color: isError ? tone.red : tone.green, marginBottom: 8,
  }),
  resultRow: { fontFamily: F.ui, fontSize: 12, color: C.textSecond, marginBottom: 2 },
};

// ─── Recipe review ────────────────────────────────────────────────────────────
function RecipeReview({ parsed, onConfirm, locationId }) {
  const [removed, setRemoved] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = id => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const removeRecipe = idx => setRemoved(p => new Set([...p, idx]));
  const restoreRecipe = idx => setRemoved(p => { const n = new Set(p); n.delete(idx); return n; });

  const activeCount = parsed.recipes.length - removed.size;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Build import payload — same format as existing import endpoint
      const newIngs = (parsed.newIngredients ?? []).map(i => ({ name: i.name, unit: i.unit, costs: [] }));
      const recipes = parsed.recipes
        .filter((_, i) => !removed.has(i))
        .map(r => ({
          name:      r.name,
          category:  r.category,
          sellPrice: r.sellPrice ?? 0,
          ingredients: r.ingredients.map(ri => ({
            ingredientName: ri.ingredientName,
            quantity:       ri.quantity,
            useUnit:        ri.useUnit,
          })),
        }));

      const res = await confirmImport(locationId, { version: 1, ingredients: newIngs, recipes });
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setConfirming(false);
  };

  if (result) {
    const isError = !!result.error || result.hasErrors;
    return (
      <div style={s.resultBox(isError)}>
        <div style={s.resultTitle(isError)}>{result.error ? 'Import failed' : isError ? 'Import completed with warnings' : '✓ Import successful'}</div>
        {result.error
          ? <div style={s.resultRow}>{result.error}</div>
          : <>
              <div style={s.resultRow}>{result.summary?.recipes?.created ?? 0} recipes created, {result.summary?.recipes?.updated ?? 0} updated</div>
              <div style={s.resultRow}>{result.summary?.links?.created ?? 0} ingredient links created</div>
              {result.errors?.length > 0 && result.errors.slice(0,5).map((e,i) => <div key={i} style={{ ...s.resultRow, color: C.red }}>⚠ {e}</div>)}
            </>
        }
        <button style={{ ...btnPrimary, marginTop: 12, fontSize: 12 }} onClick={onConfirm}>
          Done — open Recipes tab
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={s.reviewHeader}>
        <div>
          <div style={s.reviewTitle}>Review extracted recipes</div>
          <div style={s.reviewMeta}>{activeCount} of {parsed.recipes.length} selected · {parsed.newIngredients?.length ?? 0} new ingredients will be created</div>
        </div>
        <button
          style={{ ...btnPrimary, opacity: (activeCount === 0 || confirming) ? 0.5 : 1 }}
          onClick={handleConfirm} disabled={activeCount === 0 || confirming}
        >
          {confirming ? 'Importing…' : `Import ${activeCount} recipe${activeCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <span style={{ fontFamily: F.ui, fontSize: 11, color: C.textMuted }}>
          <span style={{ ...s.ingDot(true), display: 'inline-block', marginRight: 4 }} /> Matched existing ingredient
        </span>
        <span style={{ fontFamily: F.ui, fontSize: 11, color: C.textMuted }}>
          <span style={{ ...s.ingDot(false), display: 'inline-block', marginRight: 4 }} /> New ingredient
        </span>
      </div>

      {parsed.recipes.map((recipe, idx) => (
        <div key={idx} style={s.recipeCard(removed.has(idx))}>
          <div style={s.recipeHeader} onClick={() => toggle(idx)}>
            <div>
              <div style={s.recipeName}>{recipe.name}</div>
              <div style={s.recipeCat}>{recipe.category} · {recipe.ingredients?.length ?? 0} ingredients · ${Number(recipe.sellPrice).toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted }}>{expanded.has(idx) ? '▲' : '▼'}</span>
              {removed.has(idx)
                ? <button style={s.undoBtn} onClick={e => { e.stopPropagation(); restoreRecipe(idx); }}>Restore</button>
                : <button style={s.removeBtn} onClick={e => { e.stopPropagation(); removeRecipe(idx); }}>Remove</button>
              }
            </div>
          </div>
          {expanded.has(idx) && (
            <div style={s.recipeIngList}>
              {(recipe.ingredients ?? []).map((ri, j) => (
                <div key={j} style={s.recipeIngRow}>
                  <span style={s.ingDot(ri.matchedExisting)} />
                  <span style={{ flex: 1 }}>{ri.ingredientName}</span>
                  <span style={{ color: C.textMuted, fontFamily: "'Courier New',monospace" }}>{ri.quantity} {ri.useUnit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Invoice review ────────────────────────────────────────────────────────────
function InvoiceReview({ parsed, onConfirm, locationId }) {
  const [removed, setRemoved] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const activeCount = parsed.items.length - removed.size;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const ingredients = parsed.items
        .filter((_, i) => !removed.has(i))
        .map(item => ({
          name:  item.matchedIngredientName ?? item.resolvedName,
          unit:  item.unit,
          costs: [{
            pkgSize:      item.pkgSize,
            qtyBought:    item.qtyBought,
            totalPaid:    item.totalPaid,
            purchaseDate: parsed.invoiceDate ?? new Date().toISOString().split('T')[0],
            source:       parsed.supplierName ?? 'Invoice import',
          }],
        }));

      const res = await confirmImport(locationId, { version: 1, ingredients, recipes: [] });
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setConfirming(false);
  };

  if (result) {
    const isError = !!result.error || result.hasErrors;
    return (
      <div style={s.resultBox(isError)}>
        <div style={s.resultTitle(isError)}>{result.error ? 'Import failed' : isError ? 'Completed with warnings' : '✓ Costs updated'}</div>
        {result.error
          ? <div style={s.resultRow}>{result.error}</div>
          : <>
              <div style={s.resultRow}>{result.summary?.ingredients?.created ?? 0} new ingredients created</div>
              <div style={s.resultRow}>{result.summary?.costs?.added ?? 0} cost records added</div>
              {result.errors?.length > 0 && result.errors.slice(0,5).map((e,i) => <div key={i} style={{ ...s.resultRow, color: C.red }}>⚠ {e}</div>)}
            </>
        }
        <button style={{ ...btnPrimary, marginTop: 12, fontSize: 12 }} onClick={onConfirm}>
          Done — open Ingredients tab
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={s.reviewHeader}>
        <div>
          <div style={s.reviewTitle}>Review extracted costs</div>
          <div style={s.reviewMeta}>
            {parsed.supplierName && <strong>{parsed.supplierName} · </strong>}
            {parsed.invoiceDate && `${parsed.invoiceDate} · `}
            {activeCount} of {parsed.items.length} items selected
          </div>
        </div>
        <button
          style={{ ...btnPrimary, opacity: (activeCount === 0 || confirming) ? 0.5 : 1 }}
          onClick={handleConfirm} disabled={activeCount === 0 || confirming}
        >
          {confirming ? 'Updating…' : `Update ${activeCount} ingredient${activeCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['high', 'Matched — confident'], ['medium', 'Matched — review name'], ['none', 'New ingredient']].map(([c, l]) => (
          <span key={c} style={{ fontFamily: F.ui, fontSize: 11 }}>
            <span style={s.matchBadge(c)}>{l}</span>
          </span>
        ))}
      </div>

      <div style={s.invTable}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Invoice item', 'Maps to', 'Pkg', 'Qty', 'Total', '$/unit', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.items.map((item, idx) => {
              const isRemoved = removed.has(idx);
              const unitCost = item.pkgSize > 0 ? item.totalPaid / (item.pkgSize * item.qtyBought) : null;
              return (
                <tr key={idx} style={{ background: isRemoved ? '#F9F4EE' : idx%2===0 ? C.white : '#FDFAF6', opacity: isRemoved ? 0.4 : 1 }}>
                  <td style={s.td}>
                    <div style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted }}>{item.rawName}</div>
                  </td>
                  <td style={s.td}>
                    <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 600 }}>
                      {item.matchedIngredientName ?? item.resolvedName}
                    </div>
                    <div style={{ marginTop: 3 }}>
                      {item.isNewIngredient
                        ? <span style={s.newBadge}>new ingredient</span>
                        : <span style={s.matchBadge(item.matchConfidence)}>{item.matchConfidence}</span>
                      }
                    </div>
                  </td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace" }}>{item.pkgSize} {item.unit}</td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace" }}>{item.qtyBought}</td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace" }}>${Number(item.totalPaid).toFixed(2)}</td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace", color: C.gold, fontWeight: 700 }}>
                    {unitCost !== null ? `$${unitCost.toFixed(4)}` : '—'}
                  </td>
                  <td style={s.td}>
                    {isRemoved
                      ? <button style={s.undoBtn} onClick={() => setRemoved(p => { const n=new Set(p); n.delete(idx); return n; })}>Restore</button>
                      : <button style={s.removeBtn} onClick={() => setRemoved(p => new Set([...p, idx]))}>✕</button>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────
export default function AIIntakeView({ locationId, onNavigate }) {
  const [mode,     setMode]     = useState(null); // 'recipes' | 'invoice' | 'toast-sales'
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [parsing,  setParsing]  = useState(false);
  const [parsed,   setParsed]   = useState(null);
  const [error,    setError]    = useState(null);
  const [toastReportDate, setToastReportDate] = useState('');
  const [toastResult, setToastResult] = useState(null);
  const fileRef = useRef();

  const MODES = [
    {
      key: 'recipes',
      icon: '📋',
      title: 'Import from SOP or menu doc',
      desc: 'Upload your operations manual, menu PDF, or recipe spreadsheet. Claude extracts every recipe with its ingredients, quantities, and units.',
      accepts: '.pdf,.xlsx,.xls,.csv,.txt',
    },
    {
      key: 'invoice',
      icon: '🧾',
      title: 'Update costs from invoice',
      desc: 'Upload an Amazon Fresh order confirmation, Wowbo invoice, or any supplier document. Claude extracts costs and matches items to your ingredient library.',
      accepts: '.pdf,.xlsx,.xls,.csv,.txt',
    },
    {
      key: 'toast-sales',
      icon: '📈',
      title: 'Upload Toast or product sales CSV',
      desc: 'Upload your Toast Product Mix (All Levels) CSV for Smart Orders matching and reorder generation.',
      accepts: '.csv,text/csv',
    },
  ];

  const handleFile = f => { setFile(f); setError(null); setParsed(null); };

  const handleParse = async () => {
    if (!file || !mode || !locationId) return;
    setParsing(true); setError(null);
    try {
      if (mode === 'toast-sales') {
        if (!toastReportDate) throw new Error('Select report date before uploading.');
        const res = await api.uploadSalesCsv(locationId, toastReportDate, file);
        setToastResult(res?.data ?? null);
      } else {
        const res = await parseFile(locationId, mode, file);
        setParsed(res);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setMode(null);
    setFile(null);
    setParsed(null);
    setError(null);
    setToastReportDate('');
    setToastResult(null);
  };

  // ── Review screens ──────────────────────────────────────────────────────────
  if (parsed) {
    return (
      <div style={s.page}>
        <button style={{ ...btnGhost, marginBottom: 16, fontSize: 12 }} onClick={reset}>← Start over</button>
        {parsed.mode === 'recipes'
          ? <RecipeReview parsed={parsed} locationId={locationId} onConfirm={() => onNavigate?.('catalog', 'recipes')} />
          : <InvoiceReview parsed={parsed} locationId={locationId} onConfirm={() => onNavigate?.('catalog', 'ingredients')} />
        }
      </div>
    );
  }

  // ── Upload screen ───────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.heading}>AI Intake</div>
      <div style={s.subheading}>
        Upload a document and Claude will extract recipes or costs automatically,
        or upload Toast/Product Sales CSV for Smart Orders matching.
        You review everything before anything is saved.
      </div>

      {/* Mode selection */}
      <div style={s.modeGrid}>
        {MODES.map(m => (
          <div key={m.key} style={s.modeCard(mode === m.key)} onClick={() => { setMode(m.key); setFile(null); setParsed(null); }}>
            <div style={s.modeIcon}>{m.icon}</div>
            <div style={s.modeTitle}>{m.title}</div>
            <div style={s.modeDesc}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* File upload */}
      {mode && (
        <>
          {mode === 'toast-sales' && (
            <div style={{ ...ui.card, padding: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Report Date</div>
              <input
                type="date"
                value={toastReportDate}
                onChange={(e) => setToastReportDate(e.target.value)}
                style={{ ...ui.input, width: '100%' }}
              />
            </div>
          )}

          <div
            style={s.dropzone(dragging, !!file)}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <div style={s.dropIcon}>{file ? '📄' : '📂'}</div>
            <div style={s.dropLabel}>{file ? file.name : 'Drop file here or click to browse'}</div>
            <div style={s.dropSub}>
              {mode === 'toast-sales' ? 'Toast Product Mix CSV (All Levels)' : 'PDF, Excel (.xlsx), CSV, or plain text'}
            </div>
          </div>
          <input
            ref={fileRef} type="file"
            accept={MODES.find(m2 => m2.key === mode)?.accepts}
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
          />

          {error && (
            <div style={{ ...s.resultBox(true), marginBottom: 14 }}>
              <div style={s.resultTitle(true)}>{mode === 'toast-sales' ? 'Upload failed' : 'Parse failed'}</div>
              <div style={s.resultRow}>{error}</div>
            </div>
          )}

          {toastResult && mode === 'toast-sales' && (
            <div style={{ ...s.resultBox(false), marginBottom: 14 }}>
              <div style={s.resultTitle(false)}>Upload successful</div>
              <div style={s.resultRow}>Item count: {toastResult.itemCount ?? 0}</div>
              <div style={s.resultRow}>Status: {toastResult.status ?? 'processing'}</div>
              <div style={s.resultRow}>{toastResult.message ?? 'Matching has started in the background.'}</div>
              <button
                style={{ ...btnPrimary, marginTop: 12, fontSize: 12 }}
                onClick={() => onNavigate?.('orders', 'matching')}
              >
                Open Smart Orders Matching
              </button>
            </div>
          )}

          {parsing ? (
            <div style={s.spinner}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>✨</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Claude is reading your document…</div>
              <div>Extracting and matching against your ingredient library. This takes 10–20 seconds.</div>
            </div>
          ) : (
            <button
              style={{ ...btnPrimary, opacity: (!file || (mode === 'toast-sales' && !toastReportDate)) ? 0.5 : 1, fontSize: 14 }}
              onClick={handleParse}
              disabled={!file || (mode === 'toast-sales' && !toastReportDate)}
            >
              {mode === 'recipes' ? '✨ Extract recipes' : mode === 'invoice' ? '✨ Extract costs' : 'Upload Toast / Product Sales'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
