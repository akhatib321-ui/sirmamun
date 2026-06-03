// src/modules/inventory/ReorderOverview.jsx — WITH AGGREGATE
// Top card: org-level rollup across all locations
// Below: individual location cards (unchanged behavior)

import { useState, useEffect } from 'react';
import { C, F, card, btnPrimary, btnSecondary, btnGhost } from '../../shared/styles.js';
import { getReorderAlerts, generateReorder } from '../../api.additions.js';

const BASE = '/api/v1';

async function getAggregate(token) {
  const res = await fetch(`${BASE}/inventory/reorder/aggregate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function recalculateAll(token) {
  const res = await fetch(`${BASE}/inventory/reorder/aggregate/recalculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

const s = {
  page: { padding: '20px 24px', background: C.cream, minHeight: '100%' },

  // Aggregate card — visually distinct from location cards
  aggCard: {
    ...card,
    marginBottom: 20,
    overflow: 'hidden',
    borderLeft: `4px solid ${C.gold}`,
  },
  aggHeader: {
    padding: '14px 18px 10px',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    borderBottom: `1px solid ${C.beigeLight}`,
  },
  aggTitle: { fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.textPrimary },
  aggSubtitle: { fontFamily: F.ui, fontSize: 12, color: C.textMuted, marginTop: 2 },
  aggBody: {
    padding: '12px 18px',
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
  },
  aggStat: { textAlign: 'center' },
  aggStatNum: (color) => ({
    fontFamily: F.display, fontSize: 26, fontWeight: 700, color,
  }),
  aggStatLabel: {
    fontFamily: F.ui, fontSize: 10, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
    marginTop: 2,
  },
  aggFooter: {
    padding: '10px 18px',
    borderTop: `1px solid ${C.beigeLight}`,
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
  },
  staleWarning: {
    fontFamily: F.ui, fontSize: 11, color: C.amber,
    display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto',
  },
  locationStatus: {
    fontFamily: F.ui, fontSize: 11, color: C.textMuted,
  },

  // Section headers
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: F.ui, fontSize: 11, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
  },

  // Location cards (unchanged from before)
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  locCard: { ...card, overflow: 'hidden' },
  locHeader: {
    padding: '11px 14px', borderBottom: `1px solid ${C.beigeLight}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  locName: { fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.textPrimary },
  locMeta: { fontFamily: F.ui, fontSize: 11, color: C.textMuted },
  locBody: { padding: '10px 14px' },
  urgencyRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0',
  },
  urgencyLeft: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontFamily: F.ui, fontSize: 12, color: C.textSecond,
  },
  urgencyDot: (color) => ({
    width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
  }),
  urgencyCount: (color, count) => ({
    fontFamily: F.display, fontSize: 14, fontWeight: 700,
    color: count > 0 ? color : C.textMuted,
  }),
  locFooter: {
    padding: '8px 14px', borderTop: `1px solid ${C.beigeLight}`,
    display: 'flex', gap: 8,
  },
};

const URGENCY = [
  { key: 'orderToday',     label: 'Order today',     color: C.red },
  { key: 'orderThisWeek', label: 'Order this week', color: C.amber },
  { key: 'planAhead',     label: 'Plan ahead',      color: C.gold },
];

// ── Aggregate card ────────────────────────────────────────────────────────────
function AggregateCard({ onViewCombined, onRecalculate }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [recalculating,setRecalculating]= useState(false);
  const token = localStorage.getItem('token');

  const load = () => {
    setLoading(true);
    getAggregate(token)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateAll(token);
      // Poll after 20 seconds for fresh data
      setTimeout(load, 20000);
    } catch {}
    setRecalculating(false);
  };

  const summary = data?.summary;
  const staleCount = data?.locationStatuses?.filter(l => l.ageHours > 72).length ?? 0;
  const dataLocations = data?.locationStatuses?.filter(l => l.hasData).length ?? 0;
  const totalLocations = data?.locationStatuses?.length ?? 0;

  return (
    <div style={s.aggCard}>
      <div style={s.aggHeader}>
        <div>
          <div style={s.aggTitle}>All locations — combined view</div>
          <div style={s.aggSubtitle}>
            {loading ? 'Loading…' : `${dataLocations} of ${totalLocations} locations have data`}
          </div>
        </div>
        <button
          style={{ ...btnGhost, fontSize: 11, opacity: recalculating ? 0.6 : 1 }}
          onClick={handleRecalculate} disabled={recalculating}
        >
          {recalculating ? 'Queuing…' : '↺ Recalculate all'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px 18px', fontFamily: F.ui, fontSize: 13, color: C.textMuted }}>
          Loading aggregate data…
        </div>
      ) : !summary || (summary.orderToday + summary.orderThisWeek + summary.planAhead === 0) ? (
        <div style={{ padding: '16px 18px', fontFamily: F.ui, fontSize: 13, color: C.textMuted }}>
          No pending reorder data across any location. Click "Recalculate all" to generate.
        </div>
      ) : (
        <div style={s.aggBody}>
          {URGENCY.map(u => (
            <div key={u.key} style={s.aggStat}>
              <div style={s.aggStatNum(summary[u.key] > 0 ? u.color : C.textMuted)}>
                {summary[u.key]}
              </div>
              <div style={s.aggStatLabel}>{u.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={s.aggFooter}>
        {summary && (summary.orderToday + summary.orderThisWeek + summary.planAhead) > 0 && (
          <>
            <button style={btnSecondary} onClick={() => onViewCombined(data)}>
              View combined list
            </button>
            <button style={btnPrimary} onClick={() => onViewCombined(data, true)}>
              Generate combined order
            </button>
            {summary.totalEstimatedCost > 0 && (
              <span style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted, marginLeft: 'auto' }}>
                Est. total: <strong>${Number(summary.totalEstimatedCost).toFixed(2)}</strong>
              </span>
            )}
          </>
        )}
        {staleCount > 0 && (
          <span style={s.staleWarning}>
            ⚠ {staleCount} location{staleCount !== 1 ? 's' : ''} not updated in 72+ hours
          </span>
        )}
      </div>
    </div>
  );
}

// ── Location card ────────────────────────────────────────────────────────────
function LocationCard({ location, onViewList, onGenerateOrder }) {
  const [alerts,     setAlerts]     = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getReorderAlerts(location.id)
      .then(res => setAlerts(res.data))
      .catch(() => setAlerts({ hasSuggestion: false }));
  }, [location.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReorder(location.id);
      setTimeout(async () => {
        const res = await getReorderAlerts(location.id);
        setAlerts(res.data);
        setGenerating(false);
      }, 5000);
    } catch { setGenerating(false); }
  };

  return (
    <div style={s.locCard}>
      <div style={s.locHeader}>
        <div>
          <div style={s.locName}>{location.name}</div>
          {alerts?.generatedAt && (
            <div style={s.locMeta}>
              {new Date(alerts.generatedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
        </div>
        {alerts?.orderToday > 0 && (
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.red }} />
        )}
      </div>
      <div style={s.locBody}>
        {!alerts ? (
          [70, 55, 65].map((w, i) => (
            <div key={i} style={{ height: 12, background: C.beigeLight, borderRadius: 4, marginBottom: 6, width: `${w}%` }} />
          ))
        ) : !alerts.hasSuggestion ? (
          <div style={{ fontFamily: F.ui, fontSize: 12, color: C.textMuted }}>No data yet</div>
        ) : (
          [
            ['ORDER TODAY',     C.red,   alerts.orderToday],
            ['ORDER THIS WEEK', C.amber, alerts.orderThisWeek],
            ['PLAN AHEAD',      C.gold,  alerts.planAhead],
          ].map(([label, color, count]) => (
            <div key={label} style={s.urgencyRow}>
              <span style={s.urgencyLeft}>
                <span style={s.urgencyDot(color)} />
                {label.toLowerCase().replace('_', ' ')}
              </span>
              <span style={s.urgencyCount(color, count)}>
                {count} item{count !== 1 ? 's' : ''}
              </span>
            </div>
          ))
        )}
      </div>
      <div style={s.locFooter}>
        {alerts?.hasSuggestion ? (
          <>
            <button style={btnSecondary} onClick={() => onViewList(location.id, location.name)}>
              View list
            </button>
            <button style={btnPrimary} onClick={() => onGenerateOrder(location.id, location.name, alerts.suggestionId)}>
              Generate order
            </button>
          </>
        ) : (
          <button
            style={{ ...btnSecondary, opacity: generating ? 0.6 : 1 }}
            onClick={handleGenerate} disabled={generating}
          >
            {generating ? 'Calculating…' : 'Calculate reorder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main overview ─────────────────────────────────────────────────────────────
export default function ReorderOverview({ locations, user, onNavigate }) {
  const handleViewCombined = (aggregateData, jumpToOrder = false) => {
    onNavigate('inventory', jumpToOrder ? 'aggregate-order' : 'aggregate-detail', { aggregateData });
  };

  const handleViewList = (locationId, locationName) => {
    onNavigate('inventory', 'reorder-detail', { locationId, locationName });
  };

  const handleGenerateOrder = (locationId, locationName, suggestionId) => {
    onNavigate('inventory', 'order-list', { locationId, locationName, suggestionId });
  };

  return (
    <div style={s.page}>
      {/* Aggregate card — always at top */}
      <AggregateCard
        onViewCombined={handleViewCombined}
        onRecalculate={() => {}}
      />

      {/* Per-location cards */}
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>By location</span>
        <button style={btnGhost} onClick={() => onNavigate('inventory', 'sales')}>
          Upload CSV
        </button>
      </div>

      {!locations?.length ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: C.textMuted }}>
          No locations found. Add locations in Settings.
        </div>
      ) : (
        <div style={s.grid}>
          {locations.map(loc => (
            <LocationCard
              key={loc.id} location={loc}
              onViewList={handleViewList}
              onGenerateOrder={handleGenerateOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
