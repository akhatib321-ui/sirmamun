import React, { useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens, ui } from '../../shared/styles.js';

const URGENCY_STYLE = {
  ORDER_TODAY: { bg: '#fde8e5', fg: '#ab2f25', label: 'Order today' },
  ORDER_THIS_WEEK: { bg: '#fff2d9', fg: '#9e6e13', label: 'Order this week' },
  PLAN_AHEAD: { bg: '#e9f6ef', fg: '#226f45', label: 'Plan ahead' },
};

export default function AggregateReorderDetail({ aggregateData, onBack, onBuildOrder }) {
  const items = aggregateData?.items || [];
  const statuses = aggregateData?.locationStatuses || [];
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(new Set(items.map((i) => i.ingredientId)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const staleLocations = useMemo(
    () => statuses.filter((s) => (s.ageHours ?? 0) > 72),
    [statuses],
  );

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.ingredientId)),
    [items, selected],
  );

  const totalCost = selectedItems.reduce((sum, item) => sum + (item.totalEstimatedCost || 0), 0);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBuild() {
    if (!selected.size) {
      setError('Select at least one ingredient.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await api.buildAggregateOrder(Array.from(selected));
      onBuildOrder(res.data);
    } catch (err) {
      setError(err.message || 'Could not build combined order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, height: 'calc(100vh - 88px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={{ ...ui.button, background: '#efe9dd' }} onClick={onBack}>Back</button>
      </div>

      <div style={{ ...ui.card, padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 22 }}>Combined Reorder List</div>
        <div style={{ color: tokens.colors.muted, marginTop: 4 }}>
          {items.length} ingredients across {statuses.filter((s) => s.hasData).length} locations
        </div>
        {staleLocations.length > 0 && (
          <div style={{ marginTop: 10, background: '#fff2d9', border: '1px solid #f0d7a0', borderRadius: 10, padding: 10, fontSize: 13, color: '#9e6e13' }}>
            Stale data warning: {staleLocations.map((s) => s.locationName).join(', ')} not updated in 72+ hours.
          </div>
        )}
      </div>

      <div style={{ ...ui.card, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ color: tokens.colors.muted, fontSize: 13 }}>
          {selected.size} of {items.length} selected • Est. cost ${totalCost.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...ui.button, background: '#eef4f7' }} onClick={() => setSelected(new Set(items.map((i) => i.ingredientId)))}>Select All</button>
          <button style={{ ...ui.button, background: '#efe9dd' }} onClick={() => setSelected(new Set())}>Clear</button>
          <button style={{ ...ui.button, background: tokens.colors.ink, color: '#fff', opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={handleBuild}>
            {busy ? 'Building...' : 'Generate Combined Order'}
          </button>
        </div>
      </div>

      {error && <div style={{ ...ui.card, padding: 12, background: '#fff5f3', borderColor: '#f0c9c2', marginBottom: 12 }}>{error}</div>}

      <div style={{ ...ui.card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 1fr 1fr 1fr 40px', gap: 8, padding: '10px 12px', background: '#f7f3eb', fontSize: 12, fontWeight: 700, color: tokens.colors.muted }}>
          <div />
          <div>Ingredient</div>
          <div>Urgency</div>
          <div>Total Qty</div>
          <div>Est. Cost</div>
          <div />
        </div>

        {items.map((item) => {
          const expandedRow = expanded.has(item.ingredientId);
          const urgency = URGENCY_STYLE[item.maxUrgency] || URGENCY_STYLE.PLAN_AHEAD;
          return (
            <div key={item.ingredientId} style={{ borderTop: '1px solid #eadfce' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 1fr 1fr 1fr 40px', gap: 8, padding: '10px 12px', alignItems: 'center', opacity: selected.has(item.ingredientId) ? 1 : 0.55 }}>
                <input type='checkbox' checked={selected.has(item.ingredientId)} onChange={() => toggleSelect(item.ingredientId)} />
                <div>
                  <div style={{ fontWeight: 700 }}>{item.ingredientName}</div>
                  <div style={{ fontSize: 12, color: tokens.colors.muted }}>{item.supplierName || 'Unassigned supplier'} • {item.unit}</div>
                </div>
                <div>
                  <span style={{ background: urgency.bg, color: urgency.fg, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {urgency.label}
                  </span>
                </div>
                <div style={{ fontWeight: 700 }}>{Number(item.totalSuggestedQty || 0).toFixed(1)} {item.unit}</div>
                <div style={{ fontWeight: 700 }}>{item.totalEstimatedCost != null ? `$${Number(item.totalEstimatedCost).toFixed(2)}` : '—'}</div>
                <button style={{ ...ui.button, background: '#eef4f7', padding: '4px 8px' }} onClick={() => toggleExpand(item.ingredientId)}>
                  {expandedRow ? '−' : '+'}
                </button>
              </div>

              {expandedRow && (
                <div style={{ background: '#fcfaf6', padding: '8px 12px 12px 46px' }}>
                  {item.locationBreakdown?.map((loc) => (
                    <div key={`${item.ingredientId}-${loc.locationId}`} style={{ fontSize: 13, color: tokens.colors.muted, marginBottom: 4 }}>
                      {loc.locationName}: {Number(loc.suggestedQty || 0).toFixed(1)} {item.unit}
                      {loc.daysUntilStockout != null ? ` • ${Number(loc.daysUntilStockout).toFixed(1)}d left` : ''}
                      {loc.estimatedCost != null ? ` • $${Number(loc.estimatedCost).toFixed(2)}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
