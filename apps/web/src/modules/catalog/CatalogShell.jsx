// src/modules/catalog/CatalogShell.jsx
import { useState, useEffect } from 'react';
import IngredientsView from './IngredientsView.jsx';
import RecipesView from './RecipesView.jsx';
import MarginsView from './MarginsView.jsx';
import UomView from './UomView.jsx';
import { api } from '../../api.js';
import { tokens as C } from '../../shared/styles.js';

// Tab bar within the catalog module
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'ingredients', label: '🫙 Ingredients' },
    { key: 'recipes',     label: '📋 Recipes' },
    { key: 'margins',     label: '📊 Margins' },
    { key: 'uom',         label: '📐 UOM guide' },
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

export default function CatalogShell({ subView: initialSubView, onNavigate }) {
  const [subView,    setSubView]   = useState(initialSubView ?? 'ingredients');
  const [locations,  setLocations] = useState([]);
  const [locationId, setLocId]     = useState('');

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
    onNavigate?.('catalog', nextSubView);
  };

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
        {locationSelector}
      </div>
      <TabBar active={subView} onChange={handleTabChange} />
      <div style={{ flex: 1, overflowY: subView === 'recipes' ? 'hidden' : 'auto' }}>
        {subView === 'ingredients' && <IngredientsView locationId={locationId} />}
        {subView === 'recipes'     && <RecipesView     locationId={locationId} />}
        {subView === 'margins'     && <MarginsView     locationId={locationId} />}
        {subView === 'uom'         && <UomView />}
      </div>
    </div>
  );
}
