import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens, ui } from '../../shared/styles.js';

export default function ReorderOverview({ onOpenDetail, onOpenOrderList, onOpenUpload, onOpenMatching }) {
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyByLocation, setBusyByLocation] = useState({});
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const allLocations = await api.getLocations();
      const locationList = (allLocations || []).filter((loc) => !loc.parentId);
      setLocations(locationList);
      const pairs = await Promise.all(
        locationList.map(async (loc) => {
          try {
            const result = await api.getReorderAlerts(loc.id);
            return [loc.id, result.data || { hasSuggestion: false }];
          } catch {
            return [loc.id, { hasSuggestion: false }];
          }
        })
      );
      setAlerts(Object.fromEntries(pairs));
    } catch (err) {
      setError(err.message || 'Could not load reorder overview');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const locationCards = useMemo(() => {
    return locations.map((loc) => ({
      ...loc,
      alert: alerts[loc.id] || { hasSuggestion: false }
    }));
  }, [locations, alerts]);

  async function handleGenerate(locationId) {
    setBusyByLocation((prev) => ({ ...prev, [locationId]: true }));
    try {
      await api.generateReorder(locationId);
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to queue reorder');
    } finally {
      setBusyByLocation((prev) => ({ ...prev, [locationId]: false }));
    }
  }

  return (
    <div style={{ padding: 20, minHeight: 'calc(100dvh - 88px)', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: tokens.colors.muted }}>
          Calculate reorder suggestions across all locations and drill in by urgency.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...ui.button, background: tokens.colors.sky }} onClick={onOpenUpload}>Upload Toast or Upload Product Sales</button>
          <button style={{ ...ui.button, background: tokens.colors.brandSoft }} onClick={onOpenMatching}>Matching</button>
        </div>
      </div>

      {error && (
        <div style={{ ...ui.card, borderColor: '#f0c6bd', background: '#fff5f3', padding: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...ui.card, padding: 20 }}>Loading locations...</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 14
          }}
        >
          {locationCards.map((loc) => {
            const a = loc.alert;
            return (
              <div key={loc.id} style={{ ...ui.card, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{loc.name}</div>
                    <div style={{ color: tokens.colors.muted, marginTop: 3, fontSize: 13 }}>
                      {a.hasSuggestion
                        ? `${a.total} items suggested`
                        : 'No pending suggestion'}
                    </div>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      background: a.hasSuggestion ? '#efe9ff' : '#f2efe9',
                      color: a.hasSuggestion ? '#4f2e93' : '#7c7060'
                    }}
                  >
                    {a.hasSuggestion ? 'Ready' : 'Idle'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14, fontSize: 12 }}>
                  <Badge label="Order Today" value={a.orderToday || 0} tone="danger" />
                  <Badge label="This Week" value={a.orderThisWeek || 0} tone="warn" />
                  <Badge label="Plan Ahead" value={a.planAhead || 0} tone="ok" />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    style={{ ...ui.button, background: tokens.colors.ink, color: '#fff' }}
                    onClick={() => handleGenerate(loc.id)}
                    disabled={!!busyByLocation[loc.id]}
                  >
                    {busyByLocation[loc.id] ? 'Calculating...' : 'Calculate Reorder'}
                  </button>
                  <button style={{ ...ui.button, background: tokens.colors.brandSoft }} onClick={() => onOpenDetail(loc.id)}>
                    View Detail
                  </button>
                  <button style={{ ...ui.button, background: '#eef4f7' }} onClick={() => onOpenOrderList(loc.id)}>
                    Generate Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({ label, value, tone }) {
  const toneMap = {
    danger: { bg: '#fde8e5', fg: '#ab2f25' },
    warn: { bg: '#fff2d9', fg: '#9e6e13' },
    ok: { bg: '#e9f6ef', fg: '#226f45' }
  };
  const t = toneMap[tone] || toneMap.ok;

  return (
    <div style={{ background: t.bg, color: t.fg, borderRadius: 10, padding: '7px 10px', minWidth: 84 }}>
      <div style={{ fontWeight: 700 }}>{value}</div>
      <div>{label}</div>
    </div>
  );
}
