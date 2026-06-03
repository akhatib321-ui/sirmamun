// src/modules/catalog/CatalogShell.jsx
import { useState, useEffect } from 'react';
import IngredientsView from './IngredientsView.jsx';
import RecipesView from './RecipesView.jsx';
import MarginsView from './MarginsView.jsx';
import UomView from './UomView.jsx';
import AIIntakeView from './AIIntakeView.jsx';
import ImportModal from './ImportModal.jsx';
import ReorderOverview from '../inventory/ReorderOverview.jsx';
import CsvUpload from '../inventory/CsvUpload.jsx';
import Matching from '../inventory/Matching.jsx';
import { api } from '../../api.js';
import { tokens as C } from '../../shared/styles.js';

// Tab bar within the catalog module
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'ingredients', label: '🫙 Ingredients' },
    { key: 'recipes',     label: '📋 Recipes' },
    { key: 'margins',     label: '📊 Margins' },
    { key: 'uom',         label: '📐 UOM guide' },
    { key: 'utilities',   label: '🧰 Utilities' },
    { key: 'ai-intake',   label: '✨ AI Intake' },
  ];
  return (
    <div style={{ display: 'flex', background: C.cream, borderBottom: `1px solid ${C.beigeLight}` }}>
      {tabs.map(t => (
        <button
          key={t.key}
          style={{
            padding: '10px 18px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
            background: 'transparent',
            color: active === t.key ? C.ink : C.textSecond,
            borderBottom: active === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
          }}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function CatalogShell({ subView: initialSubView, navigationContext, onNavigate, user }) {
  const [subView,    setSubView]   = useState(initialSubView ?? 'ingredients');
  const [locations,  setLocations] = useState([]);
  const [locationId, setLocId]     = useState('');
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [utilityView, setUtilityView] = useState('low-stock');
  const [matchedReportId, setMatchedReportId] = useState('');

  useEffect(() => {
    api.getLocations()
      .then(res => {
        const locs = Array.isArray(res) ? res : (res.data?.items ?? res.data ?? []);
        const parentLocations = locs.filter(loc => !loc.parentId);
        const preferred = parentLocations[0] ?? null;
        setLocations(parentLocations);
        if (preferred) setLocId(preferred.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSubView && initialSubView !== subView) setSubView(initialSubView);
  }, [initialSubView]);

  const handleTabChange = (nextSubView) => {
    setSubView(nextSubView);
    if (nextSubView === 'utilities') {
      setUtilityView('low-stock');
    }
    onNavigate?.('catalog', nextSubView);
  };

  useEffect(() => {
    if (subView === 'utilities' && initialSubView === 'utilities') {
      setUtilityView('low-stock');
    }
  }, [subView, initialSubView]);

  const locationSelector = locations.length > 1 ? (
    <select
      value={locationId}
      onChange={e => setLocId(e.target.value)}
      style={{
        fontFamily: 'DM Sans', fontSize: 12, padding: '5px 12px',
        border: `1px solid ${C.beigeLight}`, borderRadius: 50,
        background: C.cream, color: C.textSecond, outline: 'none',
      }}
    >
      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 24px', background: C.cream, borderBottom: `1px solid ${C.beigeLight}` }}>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted }}>
          Catalog Views
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {locationSelector}
          {user?.role === 'admin' && (
            <button
              style={{
                fontFamily: 'DM Sans',
                fontSize: 12,
                padding: '5px 14px',
                border: `1px solid ${C.gold}`,
                borderRadius: 50,
                background: 'transparent',
                color: C.gold,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
              onClick={() => setShowImport(true)}
            >
              Legacy Import
            </button>
          )}
        </div>
      </div>
      <TabBar active={subView} onChange={handleTabChange} />
      <div style={{ flex: 1, overflowY: subView === 'recipes' ? 'hidden' : 'auto' }}>
        {subView === 'ingredients' && <IngredientsView key={`ingredients-${refreshKey}`} locationId={locationId} />}
        {subView === 'recipes'     && <RecipesView     key={`recipes-${refreshKey}`} locationId={locationId} locations={locations} initialIngredientFilter={navigationContext?.recipeFocusIngredient ?? null} />}
        {subView === 'margins'     && <MarginsView     key={`margins-${refreshKey}`} locationId={locationId} />}
        {subView === 'uom'         && <UomView />}
        {subView === 'utilities'   && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: C.cream }}>
            <div style={{ display: 'flex', gap: 8, padding: '12px 24px 0', flexWrap: 'wrap' }}>
              {[
                { key: 'low-stock', label: 'Low Stock' },
                { key: 'upload-toast', label: 'Upload Toast' },
                { key: 'matching', label: 'Matching' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setUtilityView(item.key)}
                  style={{
                    padding: '7px 12px', borderRadius: 999, border: `1px solid ${utilityView === item.key ? C.gold : C.beigeLight}`,
                    background: utilityView === item.key ? C.goldP : C.white, color: utilityView === item.key ? C.warm : C.textSecond,
                    fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {utilityView === 'low-stock' && (
                <ReorderOverview
                  onOpenDetail={() => {}}
                  onOpenOrderList={() => {}}
                  onOpenUpload={() => setUtilityView('upload-toast')}
                  onOpenMatching={() => setUtilityView('matching')}
                />
              )}
              {utilityView === 'upload-toast' && (
                <CsvUpload
                  onOpenMatching={(reportId) => {
                    setMatchedReportId(reportId);
                    setUtilityView('matching');
                  }}
                />
              )}
              {utilityView === 'matching' && (
                <Matching
                  initialReportId={matchedReportId}
                  onRunReorderNow={() => setUtilityView('low-stock')}
                />
              )}
            </div>
          </div>
        )}
        {subView === 'ai-intake'   && <AIIntakeView locationId={locationId} onNavigate={onNavigate} />}
      </div>
      {showImport && locationId && (
        <ImportModal
          locationId={locationId}
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            setRefreshKey((k) => k + 1);
          }}
          onOpenAiIntake={() => {
            setShowImport(false);
            handleTabChange('ai-intake');
          }}
          onOpenOrdersMatching={() => {
            setShowImport(false);
            onNavigate?.('orders', 'matching');
          }}
        />
      )}
    </div>
  );
}
