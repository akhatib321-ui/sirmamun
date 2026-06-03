import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens, ui } from '../../shared/styles.js';

export default function ReorderOverview({ onOpenDetail, onOpenOrderList, onOpenUpload, onOpenMatching, embedded = false }) {
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [aggregate, setAggregate] = useState(null);
  const [aggregateLoading, setAggregateLoading] = useState(true);
  const [aggregateBusy, setAggregateBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyByLocation, setBusyByLocation] = useState({});
  const [error, setError] = useState('');

  async function refreshAggregate() {
    setAggregateLoading(true);
    try {
      const result = await api.getAggregateReorder();
      setAggregate(result.data || null);
    } catch {
      setAggregate(null);
    } finally {
      setAggregateLoading(false);
    }
  }

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
    refreshAggregate();
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

  async function handleAggregateRecalculate() {
    setAggregateBusy(true);
    try {
      await api.recalculateAggregateReorder();
      await refresh();
      await refreshAggregate();
    } catch (err) {
      setError(err.message || 'Could not recalculate aggregate reorder');
    } finally {
      setAggregateBusy(false);
    }
  }

  async function handleOpenAggregateOrder() {
    if (!aggregate?.items?.length) return;
    try {
      const ids = aggregate.items.map((item) => item.ingredientId);
      const result = await api.buildAggregateOrder(ids);
      onOpenOrderList('aggregate', result.data, aggregate);
    } catch (err) {
      setError(err.message || 'Could not build combined order');
    }
  }

  return (
    <div style={{ padding: 20, minHeight: embedded ? 'auto' : 'calc(100dvh - 88px)', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ ...ui.card, padding: 16, marginBottom: 14, borderLeft: `4px solid ${tokens.colors.brand}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Low Stock</div>
            <div style={{ color: tokens.colors.muted, marginTop: 3, fontSize: 13 }}>
              {aggregateLoading
                ? 'Loading aggregate data...'
                : `${aggregate?.locationStatuses?.filter((s) => s.hasData).length || 0} of ${aggregate?.locationStatuses?.length || 0} locations have pending reorder data`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ ...ui.button, background: '#efe9dd', opacity: aggregateBusy ? 0.7 : 1 }}
              onClick={handleAggregateRecalculate}
              disabled={aggregateBusy}
            >
              {aggregateBusy ? 'Recalculating...' : 'Recalculate All'}
            </button>
            <button
              style={{ ...ui.button, background: tokens.colors.brandSoft }}
              onClick={() => onOpenDetail('aggregate', aggregate)}
              disabled={!aggregate?.items?.length}
            >
              View Combined List
            </button>
            <button
              style={{ ...ui.button, background: tokens.colors.ink, color: '#fff' }}
              onClick={handleOpenAggregateOrder}
              disabled={!aggregate?.items?.length}
            >
              Generate Combined Order
            </button>
          </div>
        </div>

        {!aggregateLoading && aggregate?.summary && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12 }}>
            <Badge label="Order Today" value={aggregate.summary.orderToday || 0} tone="danger" />
            <Badge label="This Week" value={aggregate.summary.orderThisWeek || 0} tone="warn" />
            <Badge label="Plan Ahead" value={aggregate.summary.planAhead || 0} tone="ok" />
          </div>
        )}
      </div>

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
        <div style={{ ...ui.card, padding: 16, color: tokens.colors.muted }}>
          Location cards were removed from the Low Stock view.
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
