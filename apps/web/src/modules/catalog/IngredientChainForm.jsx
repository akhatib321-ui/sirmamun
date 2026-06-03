import { tokens as C } from '../../shared/styles.js';
import { UOM_TABLE } from '../../shared/uom.js';

function baseUnitFor(recipeUnit) {
  const entry = UOM_TABLE[recipeUnit];
  if (!entry) return { base: '?', family: null };
  if (entry.family === 'volume') return { base: 'ml', family: 'volume' };
  if (entry.family === 'weight') return { base: 'g', family: 'weight' };
  return { base: 'each', family: 'count' };
}

function baseToRecipe(baseQty, baseUnit, recipeUnit) {
  const from = UOM_TABLE[baseUnit];
  const to = UOM_TABLE[recipeUnit];
  if (!from || !to || from.family !== to.family) return null;
  return (baseQty * from.base) / to.base;
}

const s = {
  section: {
    borderTop: `1px solid ${C.beigeLight}`,
    padding: '16px 0 0',
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: C.textMuted,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 1.5,
    marginBottom: 14,
  },
  fieldRow: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  label: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: C.textMuted,
  },
  input: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    padding: '8px 12px',
    border: `1px solid ${C.beigeLight}`,
    borderRadius: 8,
    background: C.cream,
    color: C.ink,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  baseUnit: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: C.textMuted,
    padding: '8px 10px',
    border: `1px solid ${C.beigeLight}`,
    borderRadius: 8,
    background: '#f5f0f0',
    whiteSpace: 'nowrap',
  },
  preview: {
    background: C.cream,
    border: `1px solid ${C.beigeLight}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 4,
  },
  previewTitle: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.textMuted,
    marginBottom: 8,
  },
  chainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    borderBottom: `1px solid ${C.beigeLight}`,
  },
  chainDot: (complete) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    background: complete ? C.colors.success : C.beigeLight,
  }),
  chainStep: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    fontWeight: 700,
    color: C.ink,
    minWidth: 100,
  },
  chainNote: { fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, flex: 1 },
  chainArrow: { color: C.textMuted, fontSize: 12, flexShrink: 0 },
  resolved: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: 600,
    color: C.colors.success,
    marginTop: 8,
  },
  warning: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: C.colors.warn,
    marginTop: 8,
    lineHeight: 1.5,
  },
  clearBtn: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: C.textMuted,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    textDecoration: 'underline',
    alignSelf: 'flex-end',
  },
};

export default function IngredientChainForm({ ingredient, onChange }) {
  const recipeUnit = ingredient?.unit ?? '';
  const { base: baseUnit, family } = baseUnitFor(recipeUnit);
  const purchaseUnit = ingredient?.purchaseUnit ?? '';
  const purchaseToBase = ingredient?.purchaseToBase ?? '';

  const toBaseNum = Number.parseFloat(purchaseToBase);
  const preview = (() => {
    if (!purchaseUnit || !purchaseToBase || Number.isNaN(toBaseNum) || toBaseNum <= 0) return null;
    const recipeQty = baseToRecipe(toBaseNum, baseUnit, recipeUnit);
    return { baseQty: toBaseNum, baseUnit, recipeQty };
  })();

  const hasChainData = !!purchaseUnit || !!purchaseToBase;

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>Purchase chain</div>
      <div style={s.sectionDesc}>
        Connect supplier purchase units to recipe units. This should match SirMamun alt unit labels.
      </div>

      <div style={s.fieldRow}>
        <div style={s.field}>
          <span style={s.label}>Purchase unit</span>
          <input
            style={s.input}
            type="text"
            value={purchaseUnit}
            placeholder="e.g. bottle, bag, can"
            onChange={(e) => onChange({ purchaseUnit: e.target.value || null })}
          />
        </div>
        <div style={s.field}>
          <span style={s.label}>Per purchase unit</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...s.input, width: 90 }}
              type="number"
              value={purchaseToBase}
              placeholder="750"
              min="0"
              step="any"
              onChange={(e) => onChange({ purchaseToBase: e.target.value ? Number.parseFloat(e.target.value) : null })}
            />
            <span style={s.baseUnit}>{baseUnit}</span>
          </div>
        </div>
        {hasChainData && (
          <button type="button" style={s.clearBtn} onClick={() => onChange({ purchaseUnit: null, purchaseToBase: null })}>
            Clear
          </button>
        )}
      </div>

      <div style={s.preview}>
        <div style={s.previewTitle}>Chain preview</div>

        <div style={s.chainRow}>
          <span style={s.chainDot(!!ingredient?.stockItemId)} />
          <span style={s.chainStep}>{ingredient?.stockItemId ? 'Box' : '-'}</span>
          <span style={s.chainNote}>{ingredient?.stockItemId ? 'SirMamun physical count' : 'No SirMamun item linked yet'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0 2px 3px' }}>
          <span style={{ ...s.chainArrow, marginRight: 8 }}>↓</span>
          <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted }}>
            alt unit conversion (SirMamun item)
          </span>
        </div>

        <div style={s.chainRow}>
          <span style={s.chainDot(!!purchaseUnit)} />
          <span style={s.chainStep}>{purchaseUnit || '-'}</span>
          <span style={s.chainNote}>{purchaseUnit ? 'purchase unit' : 'enter purchase unit above'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0 2px 3px' }}>
          <span style={{ ...s.chainArrow, marginRight: 8 }}>↓</span>
          <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted }}>
            {purchaseUnit && purchaseToBase
              ? `1 ${purchaseUnit} = ${purchaseToBase} ${baseUnit}`
              : 'enter conversion above'}
          </span>
        </div>

        <div style={s.chainRow}>
          <span style={s.chainDot(!!purchaseToBase)} />
          <span style={s.chainStep}>{baseUnit}</span>
          <span style={s.chainNote}>base {family} unit</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0 2px 3px' }}>
          <span style={{ ...s.chainArrow, marginRight: 8 }}>↓</span>
          <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted }}>
            {UOM_TABLE[recipeUnit]
              ? `UOM guide: 1 ${recipeUnit} = ${UOM_TABLE[recipeUnit].base} ${baseUnit}`
              : 'from UOM guide'}
          </span>
        </div>

        <div style={{ ...s.chainRow, borderBottom: 'none' }}>
          <span style={s.chainDot(!!recipeUnit)} />
          <span style={s.chainStep}>{recipeUnit || '-'}</span>
          <span style={s.chainNote}>recipe unit</span>
        </div>

        {preview?.recipeQty != null ? (
          <div style={s.resolved}>
            1 {purchaseUnit} = {preview.recipeQty.toFixed(preview.recipeQty < 1 ? 4 : 1)} {recipeUnit}
          </div>
        ) : hasChainData && !preview ? (
          <div style={s.warning}>
            Cannot resolve chain yet. Check conversion values and recipe unit.
          </div>
        ) : null}
      </div>
    </div>
  );
}
