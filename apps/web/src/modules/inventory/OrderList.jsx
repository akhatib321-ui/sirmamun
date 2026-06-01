import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { ui } from '../../shared/styles.js';

export default function OrderList({ locationId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    async function load() {
      if (!locationId) {
        setError('No location selected');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await api.getReorderPending(locationId);
        setSuggestion(res.data || null);
      } catch (err) {
        setError(err.message || 'Could not load pending suggestion');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [locationId]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const item of suggestion?.items || []) {
      const supplierName = item.supplier?.name || 'Unassigned Supplier';
      if (!groups.has(supplierName)) groups.set(supplierName, []);
      groups.get(supplierName).push(item);
    }
    return Array.from(groups.entries());
  }, [suggestion]);

  async function copyGroup(name, items) {
    const text = [
      `Supplier: ${name}`,
      `Location: ${locationId}`,
      '',
      ...items.map((item) => `- ${item.ingredient?.name || 'Ingredient'}: ${item.suggestedQty} ${item.ingredient?.unit || ''}`),
      '',
      `Generated at: ${new Date(suggestion.generatedAt).toLocaleString()}`
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(name);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div style={{ padding: 20, height: 'calc(100vh - 88px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={{ ...ui.button, background: '#efe9dd' }} onClick={onBack}>Back</button>
      </div>

      {loading && <div style={{ ...ui.card, padding: 16 }}>Loading order list...</div>}
      {error && <div style={{ ...ui.card, padding: 16, background: '#fff5f3', borderColor: '#f0c9c2' }}>{error}</div>}
      {!loading && !error && !suggestion && <div style={{ ...ui.card, padding: 16 }}>No pending suggestion available.</div>}

      {!loading && suggestion && (
        <div style={{ display: 'grid', gap: 12 }}>
          {grouped.map(([supplierName, items]) => (
            <div key={supplierName} style={{ ...ui.card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{supplierName}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>{items.length} items</div>
                </div>
                <button style={{ ...ui.button, background: '#e4f1f3' }} onClick={() => copyGroup(supplierName, items)}>
                  {copied === supplierName ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 7 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{item.ingredient?.name || 'Ingredient'}</span>
                    <span style={{ fontWeight: 700 }}>{item.suggestedQty} {item.ingredient?.unit || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
