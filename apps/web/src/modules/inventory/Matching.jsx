import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens, ui } from '../../shared/styles.js';
import { useResponsive } from '../../shared/useResponsive.js';

function reportLabel(report) {
  return `${new Date(report.reportDate).toLocaleDateString()} (${report._count?.items || 0} items)`;
}

export default function Matching({ initialReportId, onRunReorderNow }) {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(initialReportId || '');
  const [recipes, setRecipes] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [selectedRecipeByItem, setSelectedRecipeByItem] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const { isMobile } = useResponsive();

  useEffect(() => {
    async function init() {
      try {
        const locs = await api.getLocations();
        const parentLocations = (locs || []).filter((loc) => !loc.parentId);
        setLocations(parentLocations);
      } catch (err) {
        setError(err.message || 'Could not load locations');
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadReports() {
      if (!locationId) {
        setReports([]);
        return;
      }
      try {
        const res = await api.getSalesReports(locationId);
        setReports(res?.data?.items || []);
      } catch (err) {
        setError(err.message || 'Could not load reports');
      }
    }
    loadReports();
  }, [locationId]);

  useEffect(() => {
    async function loadMatchingData() {
      if (!reportId) {
        setUnmatched([]);
        setRecipes([]);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const unmatchedRes = await api.getUnmatchedItems(reportId);
        setUnmatched(unmatchedRes?.data?.unmatchedItems || []);
        setRecipes(unmatchedRes?.data?.availableRecipes || []);
      } catch (err) {
        setError(err.message || 'Could not load unmatched items');
      } finally {
        setLoading(false);
      }
    }

    loadMatchingData();
  }, [reportId]);

  const reportOptions = useMemo(
    () => reports.map((r) => ({ id: r.id, label: reportLabel(r) })),
    [reports],
  );

  async function handleMatch(itemId) {
    const recipeId = selectedRecipeByItem[itemId];
    if (!recipeId) {
      setError('Select a recipe before confirming.');
      return;
    }

    setError('');
    try {
      await api.manualMatch(itemId, recipeId);
      setSelectedRecipeByItem((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      const next = await api.getUnmatchedItems(reportId);
      setUnmatched(next?.data?.unmatchedItems || []);
    } catch (err) {
      setError(err.message || 'Manual match failed');
    }
  }

  async function handleRunReorderNow() {
    if (!locationId) {
      setError('Pick a location first');
      return;
    }

    setGenerating(true);
    try {
      await api.generateReorder(locationId);
      onRunReorderNow(locationId);
    } catch (err) {
      setError(err.message || 'Could not run reorder');
    } finally {
      setGenerating(false);
    }
  }

  const controls = (
    <div style={{ ...ui.card, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: tokens.fonts.heading, fontSize: 28 }}>Sales Item Matching</div>
      <div style={{ color: tokens.colors.muted, marginTop: 4 }}>
        Review unmatched items and map them to recipes so future imports auto-match.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
          gap: 10,
          marginTop: 14,
        }}
      >
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={ui.input}>
          <option value=''>Select location</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>

        <select value={reportId} onChange={(e) => setReportId(e.target.value)} style={ui.input}>
          <option value=''>Select report</option>
          {reportOptions.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>

        <button
          style={{ ...ui.button, background: '#16121a', color: '#fff', opacity: generating ? 0.7 : 1 }}
          onClick={handleRunReorderNow}
          disabled={generating}
        >
          {generating ? 'Running...' : 'Run Reorder Now'}
        </button>
      </div>
    </div>
  );

  const list = (
    <div style={{ ...ui.card, padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Unmatched Items ({unmatched.length})</div>
      {unmatched.length === 0 ? (
        <div>Everything is matched for this report.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {unmatched.map((item) => (
            <div key={item.id} style={{ border: '1px solid #efe5d8', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{item.itemName}</div>
              <div style={{ color: tokens.colors.muted, fontSize: 13, marginBottom: 8 }}>
                Qty sold: {item.qtySold}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                  gap: 8,
                }}
              >
                <select
                  value={selectedRecipeByItem[item.id] || ''}
                  onChange={(e) =>
                    setSelectedRecipeByItem((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  style={ui.input}
                >
                  <option value=''>Select recipe</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
                <button
                  style={{ ...ui.button, background: tokens.colors.brandSoft }}
                  onClick={() => handleMatch(item.id)}
                >
                  Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        padding: isMobile ? 14 : 20,
        height: 'calc(100vh - 88px)',
        overflow: 'auto',
      }}
    >
      {controls}
      {error && (
        <div
          style={{
            ...ui.card,
            padding: 10,
            background: '#fff5f3',
            borderColor: '#f0c9c2',
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}
      {loading ? <div style={{ ...ui.card, padding: 14 }}>Loading unmatched items...</div> : reportId ? list : null}
    </div>
  );
}
