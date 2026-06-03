// src/modules/inventory/AggregateOrderList.jsx
// Combined order list from the aggregate view.
// OPERATIONAL suppliers: shows qty split per location → creates separate orders.
// OVERSEAS_BULK suppliers: single order with delivery location selector.

import { useState } from 'react';
import { C, F, card, btnPrimary, btnSecondary, btnGhost } from '../../shared/styles.js';

const BASE = '/api/v1';

async function authReq(path, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const SUPPLIER_TYPE_LABELS = {
  OPERATIONAL:   'Frequent order',
  DOMESTIC_BULK: 'Bulk order',
  OVERSEAS_BULK: 'International',
};

const TODAY = new Date().toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
});

// Build a plain text copy string for a supplier group
function buildPlainText(group, locations, deliveryLocationId) {
  const deliveryLoc = locations.find(l => l.id === deliveryLocationId);
  const isOverseas  = group.supplierType === 'OVERSEAS_BULK';

  const lines = [
    'ORDER REQUEST',
    `Supplier: ${group.supplierName}`,
    isOverseas
      ? `Deliver to: ${deliveryLoc?.name ?? 'TBD'} — ${deliveryLoc?.address ?? ''}`
      : `Multiple locations — see split below`,
    `Date: ${TODAY}`,
    '',
  ];

  for (const item of group.items) {
    if (isOverseas) {
      // Single line — total qty only for overseas
      lines.push(
        `${item.ingredientName}  |  Qty: ${Number(item.totalSuggestedQty).toFixed(1)} ${item.unit}` +
        (item.totalEstimatedCost ? `  |  Est. $${Number(item.totalEstimatedCost).toFixed(2)}` : '')
      );
    } else {
      // Show split for operational
      const splitStr = item.locationBreakdown
        .map(lb => `${lb.locationName}: ${Number(lb.suggestedQty).toFixed(1)}`)
        .join(' | ');
      lines.push(
        `${item.ingredientName}  |  Total: ${Number(item.totalSuggestedQty).toFixed(1)} ${item.unit}` +
        `  |  Split: ${splitStr}` +
        (item.totalEstimatedCost ? `  |  Est. $${Number(item.totalEstimatedCost).toFixed(2)}` : '')
      );
    }
  }

  lines.push('');
  lines.push(`Subtotal: $${group.subtotal.toFixed(2)}`);
  return lines.join('\n');
}

const s = {
  page: { padding: '20px 24px', background: C.cream, minHeight: '100%' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: F.ui, fontSize: 12, color: C.textMuted,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
  },
  title: { fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 4 },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.textMuted, marginBottom: 24 },
  supplierCard: { ...card, overflow: 'hidden', marginBottom: 16 },
  supplierHeader: {
    padding: '12px 16px', background: C.black,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
  },
  supplierName: { fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.gold },
  supplierMeta: { fontFamily: F.ui, fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 },
  supplierActions: { display: 'flex', gap: 8, alignItems: 'center' },
  supplierBtn: (active) => ({
    fontFamily: F.ui, fontSize: 11, padding: '4px 12px',
    border: `1px solid ${active ? C.gold : 'rgba(201,150,63,.4)'}`,
    borderRadius: 50, background: 'transparent',
    color: active ? C.gold : 'rgba(255,255,255,.6)', cursor: 'pointer',
  }),
  // Delivery location selector (OVERSEAS_BULK)
  deliveryBar: {
    padding: '10px 16px', background: C.amberBg,
    borderBottom: `1px solid ${C.amberBorder}`,
    display: 'flex', alignItems: 'center', gap: 12,
    fontFamily: F.ui, fontSize: 12, color: C.amber, flexWrap: 'wrap',
  },
  deliverySelect: {
    fontFamily: F.ui, fontSize: 13, padding: '5px 10px',
    border: `1px solid ${C.amberBorder}`, borderRadius: 8,
    background: C.amberBg, color: C.amber, outline: 'none',
  },
  // Table
  th: {
    padding: '7px 14px', fontFamily: F.ui, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted,
    background: C.cream, borderBottom: `1px solid ${C.beigeLight}`, textAlign: 'left',
  },
  td: {
    padding: '10px 14px', borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: F.ui, fontSize: 13, color: C.textPrimary, verticalAlign: 'top',
  },
  mono: { fontFamily: "'Courier New',monospace" },
  locSplit: {
    fontFamily: F.ui, fontSize: 11, color: C.textMuted, marginTop: 3,
  },
  locSplitItem: { display: 'flex', alignItems: 'center', gap: 4 },
  locDot: (color) => ({ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }),
  subtotal: {
    padding: '10px 16px', display: 'flex', justifyContent: 'space-between',
    fontFamily: F.ui, fontSize: 12, color: C.textMuted,
    background: C.cream,
  },
  grandTotal: {
    ...card, padding: '14px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8,
  },
  grandTotalLabel: { fontFamily: F.ui, fontSize: 13, color: C.textSecond },
  grandTotalVal:   { fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary },

  // Confirm modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    background: C.white, borderRadius: '20px 20px 0 0',
    padding: 24, width: '100%', maxWidth: 480,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, background: C.beigeLight, margin: '0 auto 16px' },
  modalTitle: { fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8 },
  modalBody: { fontFamily: F.ui, fontSize: 13, color: C.textSecond, marginBottom: 16, lineHeight: 1.6 },
  modalInput: {
    fontFamily: F.ui, fontSize: 14, padding: '8px 12px', width: '100%',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.cream, color: C.textPrimary, outline: 'none',
    marginTop: 4, marginBottom: 16, boxSizing: 'border-box',
  },
};

// Location dot colors for breakdown
const LOC_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function AggregateOrderList({ orderData, locations, onBack }) {
  const [deliveryLocations, setDeliveryLocations] = useState({}); // supplierId → locationId
  const [ordered,   setOrdered]   = useState(new Set());
  const [copying,   setCopying]   = useState(null);
  const [confirmGroup, setConfirmGroup] = useState(null);
  const [expectedDate, setExpectedDate] = useState('');

  const groups = orderData?.supplierGroups ?? [];
  const allLocations = locations ?? [];
  const grandTotal = orderData?.grandTotal ?? 0;

  // Location color map
  const locColorMap = {};
  allLocations.forEach((l, i) => { locColorMap[l.id] = LOC_COLORS[i % LOC_COLORS.length]; });

  const handleCopy = (group) => {
    const deliveryLocId = deliveryLocations[group.supplierId] ?? allLocations[0]?.id;
    const text = buildPlainText(group, allLocations, deliveryLocId);
    navigator.clipboard.writeText(text).then(() => {
      setCopying(group.supplierId);
      setTimeout(() => setCopying(null), 2200);
    });
  };

  const handleMarkOrdered = (group) => {
    if (group.supplierType === 'OPERATIONAL') {
      confirmOrder(group, null);
    } else {
      setConfirmGroup(group);
    }
  };

  const confirmOrder = async (group, deliveryDate) => {
    try {
      // For OPERATIONAL: create one SupplierOrder record per location
      // For OVERSEAS_BULK/DOMESTIC_BULK: create one record at delivery location
      const deliveryLocId = deliveryLocations[group.supplierId] ?? allLocations[0]?.id;
      const isOverseas = group.supplierType !== 'OPERATIONAL';

      if (isOverseas) {
        // Single order at delivery location
        await authReq(`/inventory/suppliers/${group.supplierId}/orders`, 'POST', {
          locationId: deliveryLocId,
          items: group.items.map(i => ({
            ingredientId: i.ingredientId,
            qtyOrdered: i.totalSuggestedQty,
            unit: i.unit,
            unitCost: i.totalEstimatedCost ? i.totalEstimatedCost / i.totalSuggestedQty : 0,
          })),
          expectedAt: deliveryDate || undefined,
          notes: `Combined order — stock distributes to other locations from here. Breakdown: ${
            i.locationBreakdown?.map(lb => `${lb.locationName}: ${lb.suggestedQty.toFixed(1)}`).join(', ')
          }`,
        });
      } else {
        // Separate order per location
        const byLocation = new Map();
        for (const item of group.items) {
          for (const lb of item.locationBreakdown) {
            if (!byLocation.has(lb.locationId)) byLocation.set(lb.locationId, []);
            byLocation.get(lb.locationId).push({
              ingredientId: item.ingredientId,
              qtyOrdered: lb.suggestedQty,
              unit: item.unit,
              unitCost: lb.estimatedCost ? lb.estimatedCost / lb.suggestedQty : 0,
            });
          }
        }
        await Promise.all(
          [...byLocation.entries()].map(([locId, items]) =>
            authReq(`/inventory/suppliers/${group.supplierId}/orders`, 'POST', {
              locationId: locId,
              items,
            })
          )
        );
      }

      setOrdered(p => new Set([...p, group.supplierId]));
      setConfirmGroup(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={onBack}>← Back to combined list</button>
      <div style={s.title}>Combined order list</div>
      <div style={s.meta}>{TODAY} · {groups.length} supplier{groups.length !== 1 ? 's' : ''}</div>

      {groups.map(group => (
        <div key={group.supplierId} style={{ ...s.supplierCard, opacity: ordered.has(group.supplierId) ? 0.5 : 1 }}>
          <div style={s.supplierHeader}>
            <div>
              <div style={s.supplierName}>{group.supplierName}</div>
              <div style={s.supplierMeta}>
                {SUPPLIER_TYPE_LABELS[group.supplierType] ?? group.supplierType} · {group.items.length} items · est. ${Number(group.subtotal).toFixed(2)}
                {group.leadTimeDays && ` · ${group.leadTimeDays}d lead time`}
              </div>
            </div>
            <div style={s.supplierActions}>
              <button
                style={s.supplierBtn(copying === group.supplierId)}
                onClick={() => handleCopy(group)}
              >
                {copying === group.supplierId ? '✓ Copied' : 'Copy'}
              </button>
              {!ordered.has(group.supplierId) ? (
                <button
                  style={{ ...s.supplierBtn(false), borderColor: 'rgba(255,255,255,.25)', color: C.white }}
                  onClick={() => handleMarkOrdered(group)}
                >
                  Mark as ordered
                </button>
              ) : (
                <span style={{ fontFamily: F.ui, fontSize: 11, color: C.green }}>✓ Ordered</span>
              )}
            </div>
          </div>

          {/* OVERSEAS_BULK: delivery location selector */}
          {group.supplierType !== 'OPERATIONAL' && (
            <div style={s.deliveryBar}>
              <span>⚠ {group.supplierType === 'OVERSEAS_BULK' ? 'International order' : 'Bulk order'} — ships to one location:</span>
              <select
                style={s.deliverySelect}
                value={deliveryLocations[group.supplierId] ?? allLocations[0]?.id ?? ''}
                onChange={e => setDeliveryLocations(p => ({ ...p, [group.supplierId]: e.target.value }))}
              >
                {allLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <span style={{ fontSize: 11 }}>
                Stock distributes to other locations via inventory snapshots.
              </span>
            </div>
          )}

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Ingredient</th>
                <th style={s.th}>Total qty</th>
                <th style={s.th}>Est. cost</th>
                {group.supplierType === 'OPERATIONAL' && <th style={s.th}>Location split</th>}
              </tr>
            </thead>
            <tbody>
              {group.items.map(item => (
                <tr key={item.ingredientId}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{item.ingredientName}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {item.maxUrgency?.toLowerCase().replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td style={{ ...s.td, ...s.mono }}>
                    {Number(item.totalSuggestedQty).toFixed(1)} {item.unit}
                  </td>
                  <td style={{ ...s.td, ...s.mono, color: C.gold }}>
                    {item.totalEstimatedCost != null ? `$${Number(item.totalEstimatedCost).toFixed(2)}` : '—'}
                  </td>
                  {group.supplierType === 'OPERATIONAL' && (
                    <td style={s.td}>
                      {(item.locationBreakdown ?? []).map(lb => (
                        <div key={lb.locationId} style={s.locSplitItem}>
                          <span style={s.locDot(locColorMap[lb.locationId] ?? C.textMuted)} />
                          <span style={s.locSplit}>
                            {lb.locationName}: <strong>{Number(lb.suggestedQty).toFixed(1)} {item.unit}</strong>
                          </span>
                        </div>
                      ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={s.subtotal}>
            <span>Subtotal</span>
            <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              ${Number(group.subtotal).toFixed(2)}
            </span>
          </div>
        </div>
      ))}

      <div style={s.grandTotal}>
        <div style={s.grandTotalLabel}>Total estimated cost — all suppliers</div>
        <div style={s.grandTotalVal}>${Number(grandTotal).toFixed(2)}</div>
      </div>

      {/* Confirm modal */}
      {confirmGroup && (
        <div style={s.overlay} onClick={() => setConfirmGroup(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHandle} />
            <div style={s.modalTitle}>Confirm order — {confirmGroup.supplierName}</div>
            <div style={s.modalBody}>
              {confirmGroup.supplierType === 'OVERSEAS_BULK'
                ? `International order with ${confirmGroup.leadTimeDays}-day lead time. Delivers to ${
                    allLocations.find(l => l.id === (deliveryLocations[confirmGroup.supplierId] ?? allLocations[0]?.id))?.name
                  }. Enter expected delivery date.`
                : `Bulk order of ${confirmGroup.items.length} items from ${confirmGroup.supplierName}. Confirm to record.`
              }
            </div>
            {confirmGroup.supplierType !== 'OPERATIONAL' && (
              <div>
                <div style={{ fontFamily: F.ui, fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {confirmGroup.supplierType === 'OVERSEAS_BULK' ? 'Expected delivery date' : 'Expected delivery (optional)'}
                </div>
                <input
                  type="date" style={s.modalInput}
                  value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...btnGhost, flex: 1 }} onClick={() => setConfirmGroup(null)}>Cancel</button>
              <button
                style={{
                  ...btnPrimary, flex: 1, textAlign: 'center',
                  opacity: (confirmGroup.supplierType === 'OVERSEAS_BULK' && !expectedDate) ? 0.5 : 1,
                }}
                onClick={() => confirmOrder(confirmGroup, expectedDate || null)}
                disabled={confirmGroup.supplierType === 'OVERSEAS_BULK' && !expectedDate}
              >
                Confirm order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
