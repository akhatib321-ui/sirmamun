import { tokens as C } from '../../shared/styles.js';
import { UOM_TABLE } from '../../shared/uom.js';

function baseUnitFor(recipeUnit) {
  const entry = UOM_TABLE[recipeUnit];
  if (!entry) return 'ml';
  if (entry.family === 'volume') return 'ml';
  if (entry.family === 'weight') return 'g';
  return 'each';
}

const s = {
  box: {
    background: '#f9f5ff',
    border: '1px solid #ddd6fe',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    padding: '9px 14px',
    background: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#5b21b6',
  },
  completeBadge: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 100,
    background: '#5b21b6',
    color: '#fff',
  },
  warningBadge: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 100,
    background: C.colors.warn,
    color: '#fff',
  },
  body: { padding: '12px 14px' },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '6px 0',
  },
  stepLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 },
  dot: (filled, color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    background: filled ? color : C.beigeLight,
    border: filled ? 'none' : `1px solid ${C.beigeLight}`,
    marginTop: 2,
  }),
  connector: {
    width: 1,
    flex: 1,
    minHeight: 16,
    background: '#ddd6fe',
    margin: '2px 0',
  },
  stepMain: { flex: 1 },
  stepUnit: {
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    fontWeight: 700,
    color: '#3c3489',
    lineHeight: 1.2,
  },
  stepLabel: { fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, marginTop: 1 },
  resolved: {
    margin: '10px 0 0',
    padding: '8px 10px',
    background: '#ede9fe',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resolvedLabel: { fontFamily: 'DM Sans', fontSize: 12, color: '#5b21b6' },
  resolvedValue: { fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: '#3c3489' },
  warning: {
    padding: '8px 10px',
    background: '#fff2dd',
    borderRadius: 6,
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#9c6d11',
    lineHeight: 1.5,
    marginTop: 8,
  },
  noChain: {
    padding: '10px 14px',
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: C.textMuted,
    fontStyle: 'italic',
  },
};

function buildChainSteps(ingredient, chain) {
  if (chain?.chain?.length) {
    return chain.chain.map((step) => ({
      unit: step.unit,
      note: step.note,
      qty: step.qty,
      filled: true,
    }));
  }

  const steps = [];
  const baseUnit = baseUnitFor(ingredient?.unit ?? '');

  if (ingredient?.stockItemId) {
    steps.push({ unit: '(box)', note: 'SirMamun physical count', filled: true });
  }
  if (ingredient?.purchaseUnit) {
    steps.push({ unit: ingredient.purchaseUnit, note: 'purchase unit', filled: true });
    steps.push({
      unit: baseUnit,
      note: `1 ${ingredient.purchaseUnit} = ${ingredient.purchaseToBase ?? '?'} ${baseUnit}`,
      filled: !!ingredient.purchaseToBase,
    });
  }
  if (ingredient?.unit) {
    steps.push({ unit: ingredient.unit, note: 'recipe unit', filled: true });
  }

  return steps;
}

export default function IngredientChainDisplay({ ingredient, chain }) {
  const recipeUnit = ingredient?.unit ?? '';
  const baseUnit = baseUnitFor(recipeUnit);

  const hasAnyChainData =
    ingredient?.purchaseUnit ||
    ingredient?.purchaseToBase ||
    ingredient?.stockItemId ||
    chain?.chain?.length > 0;

  if (!hasAnyChainData) {
    return (
      <div style={s.box}>
        <div style={s.header}>
          <span style={s.headerTitle}>UOM chain</span>
        </div>
        <div style={s.noChain}>
          No chain configured. Open ingredient edit and add purchase unit + conversion.
        </div>
      </div>
    );
  }

  const steps = buildChainSteps(ingredient, chain);
  const isComplete = chain?.isComplete ?? false;
  const warning = chain?.warning ?? null;

  const resolvedQty = chain?.resolvedQty;
  const physicalQty = chain?.physicalQty;
  const physicalUnit = chain?.physicalUnit;

  let perPurchaseUnit = null;
  if (ingredient?.purchaseUnit && ingredient?.purchaseToBase) {
    const recipeEntry = UOM_TABLE[recipeUnit];
    const baseEntry = UOM_TABLE[baseUnit];
    if (recipeEntry && baseEntry && recipeEntry.family === baseEntry.family) {
      perPurchaseUnit = (ingredient.purchaseToBase * baseEntry.base) / recipeEntry.base;
    }
  }

  return (
    <div style={s.box}>
      <div style={s.header}>
        <span style={s.headerTitle}>UOM chain</span>
        {chain
          ? (
            <span style={isComplete ? s.completeBadge : s.warningBadge}>
              {isComplete ? 'Complete' : 'Incomplete'}
            </span>
            )
          : <span style={{ ...s.warningBadge, background: C.textMuted }}>Not resolved</span>}
      </div>

      <div style={s.body}>
        {steps.map((step, i) => (
          <div key={`${step.unit}-${i}`}>
            <div style={s.step}>
              <div style={s.stepLeft}>
                <div style={s.dot(step.filled, i === steps.length - 1 ? '#059669' : '#7c3aed')} />
                {i < steps.length - 1 && <div style={s.connector} />}
              </div>
              <div style={s.stepMain}>
                <div style={s.stepUnit}>{step.unit}</div>
                <div style={s.stepLabel}>{step.note}</div>
              </div>
              {step.qty !== undefined && (
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: '#5b21b6', paddingTop: 2 }}>
                  {Number(step.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        ))}

        {physicalQty != null && resolvedQty != null && (
          <div style={s.resolved}>
            <span style={s.resolvedLabel}>{physicalQty} {physicalUnit} in stock</span>
            <span style={s.resolvedValue}>= {Number(resolvedQty).toLocaleString(undefined, { maximumFractionDigits: 1 })} {recipeUnit}</span>
          </div>
        )}

        {perPurchaseUnit != null && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#7c3aed', marginTop: 6 }}>
            1 {ingredient.purchaseUnit} = {perPurchaseUnit.toFixed(perPurchaseUnit < 1 ? 4 : 1)} {recipeUnit}
          </div>
        )}

        {warning && <div style={s.warning}>{warning}</div>}
      </div>
    </div>
  );
}
