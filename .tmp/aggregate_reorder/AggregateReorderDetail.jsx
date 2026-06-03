// src/modules/inventory/AggregateReorderDetail.jsx
// Combined ingredient list across all locations.
// Each row shows total suggested qty + location breakdown on expand.
// Checkboxes select items for the combined order list.

import { useState } from 'react';
import { C, F, card, btnPrimary, btnSecondary, btnGhost } from '../../shared/styles.js';

const BASE = '/api/v1';

async function buildOrder(ingredientIds) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/inventory/reorder/aggregate/build-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ingredientIds }),
  });
  return res.json();
}

const URGENCY_CONFIG = {
  ORDER_TODAY:     { label: 'Order today',     color: C.red,   bg: '#FDEDEC', border: '#F5C6C0' },
  ORDER_THIS_WEEK: { label: 'Order this week', color: C.amber, bg: '#FEFCE8', border: '#F5E4A0' },
  PLAN_AHEAD:      { label: 'Plan ahead',      color: C.gold,  bg: '#FFF8E8', border: '#F5E0A0' },
};

const s = {
  page: { padding: '20px 24px', background: C.cream, minHeight: '100%' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: F.ui, fontSize: 12, color: C.textMuted,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
  },
  header: { marginBottom: 20 },
  title: { fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 4 },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.textMuted },
  staleAlert: {
    background: C.amberBg, border: `1px solid ${C.amberBorder}`,
    borderRadius: 8, padding: '8px 14px',
    fontFamily: F.ui, fontSize: 12, color: C.amber,
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
  },
  sectionLabel: {
    fontFamily: F.ui, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
    padding: '8px 16px', background: C.cream,
    borderBottom: `1px solid ${C.beigeLight}`, borderTop: `1px solid ${C.beigeLight}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  tableCard: { ...card, overflow: 'hidden', marginBottom: 12 },
  row: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 120px 100px 100px 100px 28px',
    padding: '10px 14px',
    borderBottom: `1px solid ${C.beigeLight}`,
    alignItems: 'center', gap: 8,
  },
  rowHeader: {
    fontFamily: F.ui, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted,
    background: C.cream,
  },
  ingName: { fontFamily: F.ui, fontSize: 13, fontWeight: 600, color: C.textPrimary },
  ingSub: { fontFamily: F.ui, fontSize: 11, color: C.textMuted, marginTop: 1 },
  mono: { fontFamily: "'Courier New',monospace", fontSize: 12 },
  urgencyPill: (cfg) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 100,
    fontSize: 10, fontWeight: 700, fontFamily: F.ui,
    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    whiteSpace: 'nowrap',
  }),
  expandBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.textMuted, fontSize: 14, padding: 0,
  },
  // Location breakdown
  locBreakdown: {
    gridColumn: '1 / -1',
    background: '#FDFAF6',
    borderTop: `1px solid ${C.beigeLight}`,
    padding: '8px 52px 10px',
  },
  locRow: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '4px 0', fontFamily: F.ui, fontSize: 12,
  },
  locName: { width: 120, color: C.textPrimary, fontWeight: 500 },
  locVal: { fontFamily: "'Courier New',monospace", fontSize: 11, color: C.textSecond, minWidth: 80 },
  locUrgencyDot: (color) => ({
    width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
  }),
  footer: {
    position: 'sticky', bottom: 0,
    background: C.white, borderTop: `1px solid ${C.beigeLight}`,
    padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12,
  },
  footerLeft: { flex: 1, fontFamily: F.ui, fontSize: 13, color: C.textSecond },
  footerCost: { fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary },
};

const URGENCY_ORDER = { ORDER_TODAY: 3, ORDER_THIS_WEEK: 2, PLAN_AHEAD: 1 };
const URGENCY_DOT_COLORS = { ORDER_TODAY: C.red, ORDER_THIS_WEEK: C.amber, PLAN_AHEAD: C.gold };

export default function AggregateReorderDetail({ aggregateData, onBack, onGenerateOrder }) {
  const [selected,  setSelected]  = useState(() => new Set(
    (aggregateData?.items ?? []).map(i => i.ingredientId)
  ));
  const [expanded,  setExpanded]  = useState(new Set());
  const [building,  setBuilding]  = useState(false);

  const items = aggregateData?.items ?? [];
  const locationStatuses = aggregateData?.locationStatuses ?? [];
  const staleLocations = locationStatuses.filter(l => l.ageHours > 72);

  // Group by urgency for display
  const byUrgency = {};
  for (const item of items) {
    if (!byUrgency[item.maxUrgency]) byUrgency[item.maxUrgency] = [];
    byUrgency[item.maxUrgency].push(item);
  }

  const selectedItems = items.filter(i => selected.has(i.ingredientId));
  const totalCost = selectedItems.reduce((s, i) => s + (i.totalEstimatedCost ?? 0), 0);

  const toggleSelect = id =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleExpand = id =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll   = () => setSelected(new Set(items.map(i => i.ingredientId)));
  const selectNone  = () => setSelected(new Set());

  const handleGenerateOrder = async () => {
    if (!selected.size) return;
    setBuilding(true);
    try {
      const res = await buildOrder([...selected]);
      onGenerateOrder(res.data);
    } catch {}
    setBuilding(false);
  };

  const ItemRow = ({ item }) => {
    const cfg   = URGENCY_CONFIG[item.maxUrgency] ?? URGENCY_CONFIG.PLAN_AHEAD;
    const isExp = expanded.has(item.ingredientId);
    const isSel = selected.has(item.ingredientId);

    return (
      <>
        <div style={{
          ...s.row,
          background: isSel ? C.white : '#FDFAF6',
          opacity: isSel ? 1 : 0.5,
        }}>
          {/* Checkbox */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <input
              type="checkbox" checked={isSel}
              onChange={() => toggleSelect(item.ingredientId)}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
          </div>
          {/* Name + supplier */}
          <div>
            <div style={s.ingName}>{item.ingredientName}</div>
            <div style={s.ingSub}>{item.supplierName ?? 'No supplier'} · {item.unit}</div>
          </div>
          {/* Urgency */}
          <div><span style={s.urgencyPill(cfg)}>{cfg.label}</span></div>
          {/* Total suggested qty */}
          <div style={s.mono}>
            {Number(item.totalSuggestedQty).toFixed(1)} <span style={{ color: C.textMuted }}>{item.unit}</span>
          </div>
          {/* Min days until stockout */}
          <div style={{ ...s.mono, color: item.minDaysUntilStockout < 3 ? C.red : C.textSecond }}>
            {item.minDaysUntilStockout !== null
              ? `${Number(item.minDaysUntilStockout).toFixed(1)}d`
              : '—'
            }
          </div>
          {/* Est cost */}
          <div style={{ ...s.mono, color: C.gold }}>
            {item.totalEstimatedCost !== null
              ? `$${Number(item.totalEstimatedCost).toFixed(2)}`
              : '—'
            }
          </div>
          {/* Expand toggle */}
          <button style={s.expandBtn} onClick={() => toggleExpand(item.ingredientId)}>
            {isExp ? '▲' : '▼'}
          </button>
        </div>

        {/* Location breakdown */}
        {isExp && (
          <div style={{ ...s.row, ...s.locBreakdown, padding: '8px 14px 10px 52px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>
                Per location
              </div>
              {item.locationBreakdown.map(loc => (
                <div key={loc.locationId} style={s.locRow}>
                  <span style={{ ...s.locUrgencyDot(URGENCY_DOT_COLORS[loc.urgency] ?? C.textMuted) }} />
                  <span style={s.locName}>{loc.locationName}</span>
                  <span style={s.locVal}>{Number(loc.suggestedQty).toFixed(1)} {item.unit}</span>
                  <span style={s.locVal}>
                    {loc.daysUntilStockout !== null ? `${Number(loc.daysUntilStockout).toFixed(1)}d remaining` : '—'}
                  </span>
                  {loc.estimatedCost !== null && (
                    <span style={{ ...s.locVal, color: C.gold }}>${Number(loc.estimatedCost).toFixed(2)}</span>
                  )}
                  {loc.suggestionAge > 72 && (
                    <span style={{ fontFamily: F.ui, fontSize: 10, color: C.amber }}>⚠ {loc.suggestionAge}h old</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ ...s.page, flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <button style={s.backBtn} onClick={onBack}>← All locations</button>
        <div style={s.header}>
          <div style={s.title}>Combined reorder list</div>
          <div style={s.meta}>
            {items.length} ingredients across {locationStatuses.filter(l => l.hasData).length} locations
          </div>
        </div>

        {staleLocations.length > 0 && (
          <div style={s.staleAlert}>
            ⚠ {staleLocations.map(l => l.locationName).join(', ')} — data is {Math.max(...staleLocations.map(l => l.ageHours))}+ hours old. Consider recalculating.
          </div>
        )}

        {/* Select all / none */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button style={btnGhost} onClick={selectAll}>Select all</button>
          <button style={btnGhost} onClick={selectNone}>Deselect all</button>
          <span style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted, alignSelf: 'center' }}>
            {selected.size} of {items.length} selected
          </span>
        </div>

        {/* Items grouped by urgency */}
        {['ORDER_TODAY', 'ORDER_THIS_WEEK', 'PLAN_AHEAD'].map(urgency => {
          const group = byUrgency[urgency];
          if (!group?.length) return null;
          const cfg = URGENCY_CONFIG[urgency];
          return (
            <div key={urgency} style={s.tableCard}>
              <div style={{ ...s.sectionLabel, color: cfg.color }}>
                <span>{cfg.label}</span>
                <span style={{ fontWeight: 400, color: C.textMuted }}>{group.length} item{group.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Table header */}
              <div style={{ ...s.row, ...s.rowHeader }}>
                <div />
                <div>Ingredient</div>
                <div>Urgency</div>
                <div>Total qty</div>
                <div>Days left</div>
                <div>Est. cost</div>
                <div />
              </div>
              {group.map(item => <ItemRow key={item.ingredientId} item={item} />)}
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div style={s.footer}>
        <div style={s.footerLeft}>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted }}>Selected est. cost</div>
          <div style={s.footerCost}>${totalCost.toFixed(2)}</div>
        </div>
        <button style={btnGhost} onClick={onBack}>Back</button>
        <button
          style={{ ...btnPrimary, opacity: (!selected.size || building) ? 0.5 : 1 }}
          onClick={handleGenerateOrder} disabled={!selected.size || building}
        >
          {building ? 'Building…' : `Generate order (${selected.size} items) →`}
        </button>
      </div>
    </div>
  );
}
