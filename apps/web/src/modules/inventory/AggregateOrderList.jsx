import React, { useMemo } from 'react';
import { useState } from 'react';
import { api } from '../../api.js';
import { ui, tokens } from '../../shared/styles.js';

function buildCopyText(group) {
  const lines = [];
  lines.push(`Supplier: ${group.supplierName}`);
  lines.push(`Type: ${group.supplierType}`);
  lines.push('');
  for (const item of group.items || []) {
    const splits = (item.locationBreakdown || [])
      .map((lb) => `${lb.locationName}: ${Number(lb.suggestedQty || 0).toFixed(1)} ${item.unit}`)
      .join(' | ');

    lines.push(`- ${item.ingredientName}: ${Number(item.totalSuggestedQty || 0).toFixed(1)} ${item.unit}`);
    if (splits) lines.push(`  split: ${splits}`);
  }
  lines.push('');
  lines.push(`Subtotal: $${Number(group.subtotal || 0).toFixed(2)}`);
  return lines.join('\n');
}

export default function AggregateOrderList({ orderData, onBack }) {
  const groups = orderData?.supplierGroups || [];
  const locations = orderData?.locations || [];
  const [ordered, setOrdered] = useState(new Set());
  const [busySupplierId, setBusySupplierId] = useState('');
  const [deliveryBySupplier, setDeliveryBySupplier] = useState({});
  const [error, setError] = useState('');

  const grandTotal = useMemo(
    () => groups.reduce((sum, g) => sum + (g.subtotal || 0), 0),
    [groups],
  );

  async function handleCopy(group) {
    const text = buildCopyText(group);
    await navigator.clipboard.writeText(text);
  }

  async function handleMarkOrdered(group) {
    setError('');
    setBusySupplierId(group.supplierId);

    try {
      const isOperational = group.supplierType === 'OPERATIONAL';
      const payload = {
        supplierId: group.supplierId,
        deliveryLocationId: isOperational
          ? null
          : (deliveryBySupplier[group.supplierId] || locations[0]?.id || null),
        items: group.items,
      };

      await api.markAggregateOrdered(payload);
      setOrdered((prev) => new Set([...prev, group.supplierId]));
    } catch (err) {
      setError(err.message || 'Could not mark supplier as ordered');
    } finally {
      setBusySupplierId('');
    }
  }

  return (
    <div style={{ padding: 20, height: 'calc(100vh - 88px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={{ ...ui.button, background: '#efe9dd' }} onClick={onBack}>Back</button>
      </div>

      <div style={{ ...ui.card, padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 22 }}>Combined Order List</div>
        <div style={{ color: tokens.colors.muted, marginTop: 4 }}>
          {groups.length} supplier groups • Estimated total ${Number(grandTotal || 0).toFixed(2)}
        </div>
      </div>

      {error && (
        <div style={{ ...ui.card, padding: 12, background: '#fff5f3', borderColor: '#f0c9c2', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {groups.length === 0 && (
        <div style={{ ...ui.card, padding: 16 }}>No items selected for combined order.</div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {groups.map((group) => (
          <div key={group.supplierId} style={{ ...ui.card, overflow: 'hidden', opacity: ordered.has(group.supplierId) ? 0.65 : 1 }}>
            <div style={{ background: '#16121a', color: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{group.supplierName}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{group.supplierType} • {group.items?.length || 0} items</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...ui.button, background: '#f4e2cf' }} onClick={() => handleCopy(group)}>Copy</button>
                <button
                  style={{ ...ui.button, background: '#eef4f7', opacity: busySupplierId === group.supplierId ? 0.7 : 1 }}
                  disabled={ordered.has(group.supplierId) || busySupplierId === group.supplierId}
                  onClick={() => handleMarkOrdered(group)}
                >
                  {ordered.has(group.supplierId)
                    ? 'Ordered'
                    : busySupplierId === group.supplierId
                      ? 'Saving...'
                      : 'Mark as ordered'}
                </button>
              </div>
            </div>

            {group.supplierType !== 'OPERATIONAL' && (
              <div style={{ padding: 12, background: '#fff2d9', borderBottom: '1px solid #f0d7a0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#9e6e13', fontWeight: 700 }}>Ships to one location:</span>
                <select
                  style={{ ...ui.input, width: 240, padding: '8px 10px' }}
                  value={deliveryBySupplier[group.supplierId] || locations[0]?.id || ''}
                  onChange={(e) => setDeliveryBySupplier((prev) => ({ ...prev, [group.supplierId]: e.target.value }))}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ padding: 12 }}>
              {(group.items || []).map((item) => (
                <div key={item.ingredientId} style={{ borderBottom: '1px solid #eadfce', padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{item.ingredientName}</div>
                    <div style={{ fontWeight: 700 }}>{Number(item.totalSuggestedQty || 0).toFixed(1)} {item.unit}</div>
                  </div>
                  <div style={{ color: tokens.colors.muted, fontSize: 12, marginTop: 3 }}>
                    {(item.locationBreakdown || []).map((lb) => `${lb.locationName}: ${Number(lb.suggestedQty || 0).toFixed(1)} ${item.unit}`).join(' | ')}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, background: '#f7f3eb', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: tokens.colors.muted }}>Subtotal</span>
              <span style={{ fontWeight: 700 }}>${Number(group.subtotal || 0).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
