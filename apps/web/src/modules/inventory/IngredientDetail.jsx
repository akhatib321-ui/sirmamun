import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { ui, tokens } from '../../shared/styles.js';
import { ALL_UNITS, UOM_TABLE } from '../../shared/uom.js';
import IngredientChainDisplay from './IngredientChainDisplay.jsx';

function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(digits).replace(/\.0+$/, '');
}

function resolveUnitMeta(unit, customUnits) {
  const base = UOM_TABLE[unit];
  if (base) {
    return { name: unit, family: base.family, toBase: base.base, label: base.label || unit };
  }

  const custom = (customUnits || []).find((u) => u.name === unit);
  if (!custom) {
    return null;
  }

  return {
    name: custom.name,
    family: custom.family,
    toBase: custom.toBase,
    label: custom.label || custom.name,
  };
}

function convertQty(qty, fromUnit, toUnit, customUnits) {
  const q = Number(qty);
  if (!Number.isFinite(q)) return null;
  if (fromUnit === toUnit) return q;

  const from = resolveUnitMeta(fromUnit, customUnits);
  const to = resolveUnitMeta(toUnit, customUnits);
  if (!from || !to || from.family !== to.family) return null;

  return (q * from.toBase) / to.toBase;
}

function AddCostModal({ ingredient, onClose, onSaved }) {
  const [ingredientUnit, setIngredientUnit] = useState(ingredient.buyUnit);
  const [form, setForm] = useState({
    buyUnit: ingredient.buyUnit,
    pkgSize: '',
    qtyBought: '1',
    totalPaid: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceRef: '',
    locationId: ingredient.locations?.[0]?.locationId ?? '',
  });
  const [customUnits, setCustomUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    let active = true;
    api.getCustomUnits()
      .then((res) => {
        if (active) setCustomUnits(res.data ?? []);
      })
      .catch(() => {
        if (active) setCustomUnits([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.getIngredients(1, 250)
      .then((res) => {
        if (!active) return;
        const match = (res.data?.items ?? []).find((it) => it.id === ingredient.id);
        setIngredientUnit(match?.unit ?? ingredient.buyUnit);
      })
      .catch(() => {
        if (active) setIngredientUnit(ingredient.buyUnit);
      });

    return () => {
      active = false;
    };
  }, [ingredient.id, ingredient.buyUnit]);

  const ingredientMeta = useMemo(
    () => resolveUnitMeta(ingredientUnit, customUnits),
    [ingredientUnit, customUnits],
  );

  const buyUnitOptions = useMemo(() => {
    if (!ingredientMeta) {
      return [ingredientUnit];
    }

    const familyBuiltIns = ALL_UNITS.filter((u) => UOM_TABLE[u]?.family === ingredientMeta.family);
    const familyCustom = (customUnits || [])
      .filter((u) => u.family === ingredientMeta.family)
      .map((u) => u.name);

    return Array.from(new Set([...familyBuiltIns, ...familyCustom]));
  }, [customUnits, ingredientUnit, ingredientMeta]);

  const parsedPkgSize = Number.parseFloat(form.pkgSize);
  const parsedQtyBought = Number.parseFloat(form.qtyBought);
  const parsedTotalPaid = Number.parseFloat(form.totalPaid);
  const pkgSizeInIngredientUnit = convertQty(parsedPkgSize, form.buyUnit, ingredientUnit, customUnits);

  const computed = (
    Number.isFinite(parsedTotalPaid)
    && Number.isFinite(parsedQtyBought)
    && parsedQtyBought > 0
    && Number.isFinite(pkgSizeInIngredientUnit)
    && pkgSizeInIngredientUnit > 0
  )
    ? parsedTotalPaid / (pkgSizeInIngredientUnit * parsedQtyBought)
    : null;

  const conversionHint = Number.isFinite(pkgSizeInIngredientUnit)
    ? `${parsedPkgSize || 0} ${form.buyUnit} = ${pkgSizeInIngredientUnit.toFixed(4)} ${ingredientUnit}`
    : null;

  const handleSave = async () => {
    if (!computed || !form.locationId) return;

    setSaving(true);
    setError('');
    try {
      await api.addIngredientCost(ingredient.id, form.locationId, {
        buyUnit: form.buyUnit,
        pkgSize: pkgSizeInIngredientUnit,
        qtyBought: Number.parseInt(form.qtyBought, 10),
        totalPaid: parsedTotalPaid,
        purchaseDate: form.purchaseDate,
        invoiceRef: form.invoiceRef || undefined,
      });
      onSaved?.();
    } catch (e) {
      setError(e.message || 'Could not save ingredient cost');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1e7d9', marginBottom: 8 }}>
          Add cost from invoice
        </div>
        <div style={{ fontSize: 13, color: '#c5b8a7', marginBottom: 12 }}>
          Ingredient: <strong style={{ color: '#f1e7d9' }}>{ingredient.name}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={fieldLabel}>
            Location
            <select value={form.locationId} onChange={set('locationId')} style={fieldInput}>
              {ingredient.locations?.map((loc) => (
                <option key={loc.locationId} value={loc.locationId}>{loc.locationName}</option>
              ))}
            </select>
          </label>
          <label style={fieldLabel}>
            Buy unit
            <select value={form.buyUnit} onChange={set('buyUnit')} style={fieldInput}>
              {buyUnitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>
          <label style={fieldLabel}>
            Package size ({form.buyUnit})
            <input type="number" value={form.pkgSize} onChange={set('pkgSize')} style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            Qty bought
            <input type="number" min="1" value={form.qtyBought} onChange={set('qtyBought')} style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            Total paid ($)
            <input type="number" step="0.01" value={form.totalPaid} onChange={set('totalPaid')} style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            Purchase date
            <input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} style={fieldInput} />
          </label>
        </div>

        <label style={{ ...fieldLabel, marginTop: 10 }}>
          Invoice ref (optional)
          <input type="text" value={form.invoiceRef} onChange={set('invoiceRef')} style={fieldInput} placeholder="AMZ-2026-05" />
        </label>

        {form.pkgSize && conversionHint && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#c5b8a7' }}>Conversion: {conversionHint}</div>
        )}
        {form.pkgSize && !conversionHint && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#f5aaa0' }}>
            Cannot convert {form.buyUnit} to {ingredientUnit}. Pick a compatible unit.
          </div>
        )}
        {computed !== null && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#232425', border: '1px solid #3e4246', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#c5b8a7' }}>Cost per {ingredientUnit}</span>
            <span style={{ color: '#f1e7d9', fontWeight: 700 }}>${computed.toFixed(6)}</span>
          </div>
        )}
        {error && <div style={{ marginTop: 10, color: '#f5aaa0', fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52', flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...ui.button, background: '#b68941', color: '#1f1507', flex: 1, opacity: (!computed || !form.locationId || saving) ? 0.5 : 1 }} onClick={handleSave} disabled={!computed || !form.locationId || saving}>
            {saving ? 'Saving...' : 'Save cost'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IngredientDetail({
  item,
  onBack,
  onOpenOrders,
  onViewRecipeUsage,
  onCostSaved,
  isModal = false,
  onClose,
}) {
  const [showAddCost, setShowAddCost] = useState(false);
  const [detail, setDetail] = useState(null);
  const [chain, setChain] = useState(null);

  const primaryLocationId = item?.locations?.[0]?.locationId ?? null;

  useEffect(() => {
    let active = true;

    async function loadDetailAndChain() {
      if (!item?.id) {
        if (active) {
          setDetail(null);
          setChain(null);
        }
        return;
      }

      try {
        const [detailRes, chainRes] = await Promise.all([
          api.getIngredient(item.id),
          api.resolveStockChain(item.id, primaryLocationId, item.linkedItemId ?? undefined),
        ]);

        if (active) {
          setDetail(detailRes.data ?? null);
          setChain(chainRes.data ?? null);
        }
      } catch {
        if (active) {
          setDetail(null);
          setChain(null);
        }
      }
    }

    loadDetailAndChain();
    return () => {
      active = false;
    };
  }, [item?.id, item?.linkedItemId, primaryLocationId]);

  if (!item) {
    return (
      <div style={{ padding: 18, background: '#1f2021', minHeight: '100%' }}>
        <div style={{ ...ui.card, padding: 14, background: '#2a2b2c', borderColor: '#44474c', color: '#efe6d7' }}>Select an ingredient from Stock tab.</div>
      </div>
    );
  }

  const topRisks = (item.locations || [])
    .filter((l) => l.daysLeft !== null)
    .sort((a, b) => (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 2)
    .map((l) => `${l.locationName}: ${fmt(l.daysLeft, 1)}d`)
    .join(' · ');

  return (
    <div style={isModal ? overlayStyle : { padding: 18, overflow: 'auto', height: '100%', background: '#1f2021', color: '#efe6d7' }} onClick={isModal ? onClose : undefined}>
      <div style={isModal ? modalStyle : null} onClick={isModal ? (e) => e.stopPropagation() : undefined}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'space-between' }}>
        {!isModal && (
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={onBack}>Back to stock</button>
        )}
        {isModal && (
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52', marginLeft: 'auto' }} onClick={onClose}>Close</button>
        )}
      </div>

      <div style={{ ...ui.card, overflow: 'hidden', background: '#2a2b2c', borderColor: '#44474c' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #3e4246' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#f1e7d9' }}>{item.name}</div>
              <div style={{ color: '#c5b8a7', marginTop: 4 }}>
                {item.supplierName || 'No supplier'} · buy unit: {item.buyUnit}
              </div>
            </div>
            <button style={{ ...ui.button, background: '#fcebea', color: '#9f2f24' }}>{item.urgency === 'ORDER_TODAY' ? 'Order today' : item.urgency}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: 14, borderRight: '1px solid #3e4246' }}>
            <div style={h}>Catalog</div>
            <Line label={`Cost / ${item.buyUnit}`} value={item.costPerUnit === null ? '-' : `$${fmt(item.costPerUnit, 4)}`} />
            <Line label="Recipe units" value={(item.recipeUnits || []).join(', ') || '-'} />
            <Line label="Used in recipes" value={(item.recipeNames || []).join(', ') || '-'} />
          </div>
          <div style={{ padding: 14 }}>
            <div style={h}>Inventory</div>
            <Line label="Stock on hand" value={`${fmt(item.stockOnHand, 1)} ${item.buyUnit}`} />
            <Line label="Daily use (combined)" value={`${fmt(item.dailyUse, 2)} ${item.buyUnit}/day`} />
            <Line label="Runs out" value={topRisks || '-'} />
            <div style={{ marginTop: 12 }}>
              <IngredientChainDisplay
                ingredient={detail ?? item}
                chain={chain}
                locationId={primaryLocationId}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: '1px solid #3e4246', display: 'flex', gap: 8 }}>
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={() => setShowAddCost(true)}>+ Add cost from invoice</button>
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={onViewRecipeUsage}>View recipe usage</button>
          <button style={{ ...ui.button, background: '#b68941', color: '#1f1507' }} onClick={onOpenOrders}>Add to order list</button>
        </div>
      </div>

      {showAddCost && (
        <AddCostModal
          ingredient={item}
          onClose={() => setShowAddCost(false)}
          onSaved={() => {
            setShowAddCost(false);
            onCostSaved?.();
          }}
        />
      )}
      </div>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid #3e4246' }}>
      <span style={{ color: '#c5b8a7' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#efe6d7' }}>{value}</span>
    </div>
  );
}

const h = {
  fontSize: 12,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#b9a98d',
  marginBottom: 8,
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.45)',
  zIndex: 80,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 16,
};

const modalStyle = {
  width: 'min(980px, 96vw)',
  maxHeight: '92vh',
  overflow: 'auto',
  background: '#1f2021',
  color: '#efe6d7',
  border: '1px solid #3e4246',
  borderRadius: 14,
  padding: 18,
  boxSizing: 'border-box',
};

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: '#c5b8a7',
};

const fieldInput = {
  ...ui.input,
  background: '#2b2c2d',
  color: '#efe6d7',
  borderColor: '#464a4f',
};
