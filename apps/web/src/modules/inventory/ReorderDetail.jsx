import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { ui } from '../../shared/styles.js';

export default function ReorderDetail({ locationId, onBack, onOpenOrderList }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null);

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
        setError(err.message || 'Could not load suggestion details');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [locationId]);

  return (
    <div style={{ padding: 20, height: 'calc(100vh - 88px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={{ ...ui.button, background: '#efe9dd' }} onClick={onBack}>Back</button>
        {suggestion && (
          <button style={{ ...ui.button, background: '#15121a', color: '#fff' }} onClick={() => onOpenOrderList(locationId)}>
            Generate Order List
          </button>
        )}
      </div>

      {loading && <div style={{ ...ui.card, padding: 16 }}>Loading reorder detail...</div>}
      {error && <div style={{ ...ui.card, padding: 16, background: '#fff5f3', borderColor: '#f0c9c2' }}>{error}</div>}

      {!loading && !error && !suggestion && (
        <div style={{ ...ui.card, padding: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No pending suggestion</div>
          <div>Run reorder generation in overview, then return here for item-level detail.</div>
        </div>
      )}

      {!loading && suggestion && (
        <div style={{ ...ui.card, padding: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Pending Suggestion</div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
            Generated: {new Date(suggestion.generatedAt).toLocaleString()} | Items: {suggestion.items?.length || 0}
          </div>

          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr>
                  <Th>Ingredient</Th>
                  <Th>Supplier</Th>
                  <Th>Urgency</Th>
                  <Th>Suggested Qty</Th>
                  <Th>Days Left</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {(suggestion.items || []).map((item) => (
                  <tr key={item.id}>
                    <Td>{item.ingredient?.name || '-'}</Td>
                    <Td>{item.supplier?.name || '-'}</Td>
                    <Td>{item.urgency}</Td>
                    <Td>{item.suggestedQty}</Td>
                    <Td>{item.daysUntilStockout}</Td>
                    <Td>{item.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{ textAlign: 'left', borderBottom: '1px solid #eadfce', padding: '10px 8px', fontSize: 12 }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td style={{ verticalAlign: 'top', borderBottom: '1px solid #f2ebe0', padding: '10px 8px', fontSize: 13 }}>
      {children}
    </td>
  );
}
