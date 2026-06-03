import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { ui, tokens } from '../../shared/styles.js';

function groupBySupplier(items) {
  const map = new Map();
  for (const item of items || []) {
    const key = item.supplierId || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        supplierId: key,
        supplierName: item.supplierName || 'No supplier',
        supplierType: item.supplierType || 'OPERATIONAL',
        items: [],
      });
    }
    map.get(key).items.push(item);
  }
  return Array.from(map.values());
}

export default function OrdersTab({ onUrgentUpdated }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aggregate, setAggregate] = useState(null);

  const groups = useMemo(() => groupBySupplier(aggregate?.items || []), [aggregate]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAggregateReorder();
      setAggregate(res.data || null);
    } catch (e) {
      setError(e.message || 'Could not load aggregate reorder');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function recalc() {
    setBusy(true);
    setError('');
    try {
      await api.recalculateAggregateReorder(7);
      await load();
      onUrgentUpdated?.();
    } catch (e) {
      setError(e.message || 'Recalculate failed');
    } finally {
      setBusy(false);
    }
  }

  async function markOrdered(group) {
    setBusy(true);
    setError('');
    try {
      await api.markAggregateOrdered({
        supplierId: group.supplierId,
        deliveryLocationId: null,
        items: group.items,
      });
      await load();
      onUrgentUpdated?.();
    } catch (e) {
      setError(e.message || 'Could not mark as ordered');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 18, overflow: 'auto', height: '100%', background: '#1f2021', color: '#efe6d7' }}>
      <div style={{ ...ui.card, padding: 14, marginBottom: 12, background: '#2a2b2c', borderColor: '#44474c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#f1e7d9' }}>Aggregate orders</div>
            <div style={{ color: '#c5b8a7', marginTop: 2 }}>
              {aggregate?.summary?.orderToday || 0} order today
            </div>
          </div>
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52', opacity: busy ? 0.7 : 1 }} onClick={recalc} disabled={busy}>
            {busy ? 'Working...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {loading && <div style={{ ...ui.card, padding: 14, background: '#2a2b2c', borderColor: '#44474c', color: '#efe6d7' }}>Loading orders...</div>}
      {error && (
        <div
          style={{
            ...ui.card,
            padding: 14,
            background: '#fff3f1',
            borderColor: '#f0c6bf',
            color: '#9f2f24',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 10 }}>
          {groups.map((group) => (
            <div key={group.supplierId} style={{ ...ui.card, overflow: 'hidden', background: '#2a2b2c', borderColor: '#44474c' }}>
              <div style={{ padding: 12, background: '#232425', color: '#efe6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{group.supplierName}</div>
                  <div style={{ opacity: 0.8, fontSize: 12, color: '#c5b8a7' }}>{group.items.length} items</div>
                </div>
                <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={() => markOrdered(group)} disabled={busy || group.supplierId === 'unknown'}>
                  Mark as ordered
                </button>
              </div>
              <div style={{ padding: 12, display: 'grid', gap: 6 }}>
                {group.items.map((item) => (
                  <div key={item.ingredientId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: '#efe6d7' }}>{item.ingredientName}</span>
                    <span style={{ fontWeight: 700, color: '#f1d59a' }}>{Number(item.totalSuggestedQty || 0).toFixed(1)} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <div style={{ ...ui.card, padding: 14, background: '#2a2b2c', borderColor: '#44474c', color: '#efe6d7' }}>No supplier groups yet.</div>}
        </div>
      )}
    </div>
  );
}
