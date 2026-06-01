import React from 'react';
import { tokens } from '../styles.js';

const navGroups = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'catalog', label: 'Menu & Costs',
    sub: [
      { id: 'ingredients', label: 'Ingredients' },
      { id: 'recipes', label: 'Recipes' },
      { id: 'margins', label: 'Margins' },
      { id: 'uom', label: 'UOM guide' },
    ]
  },
  { id: 'inventory', label: 'Inventory',
    sub: [
      { id: 'reorder', label: 'Reorder' },
      { id: 'upload-csv', label: 'Upload CSV' },
      { id: 'matching', label: 'Matching' }
    ]
  },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'analytics', label: 'Analytics' }
];

export default function Sidebar({ module, subView, onNavigate, isMobile }) {
  return (
    <aside
      style={{
        width: isMobile ? '100%' : 270,
        background: 'linear-gradient(180deg, #1d1823 0%, #141218 100%)',
        color: '#f6f2ed',
        padding: '20px 16px',
        paddingTop: 'calc(20px + env(safe-area-inset-top))',
        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none'
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: tokens.fonts.heading, fontSize: 30, lineHeight: 1 }}>SirMamun</div>
        <div style={{ opacity: 0.72, fontSize: 13, marginTop: 6 }}>Operations Platform</div>
      </div>

      <div style={{ display: isMobile ? 'flex' : 'grid', gap: 8, overflowX: isMobile ? 'auto' : 'visible' }}>
        {navGroups.map((item) => {
          const active = module === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                const defaultSub = item.sub?.[0]?.id ?? '';
                onNavigate(item.id, defaultSub);
              }}
              style={{
                textAlign: 'left',
                border: 'none',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minWidth: 0,
                color: active ? '#1f1820' : '#f6f2ed',
                background: active ? tokens.colors.brandSoft : 'transparent',
                fontWeight: active ? 700 : 500
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {(module === 'inventory' || module === 'catalog') && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
            {module === 'inventory' ? 'Inventory Views' : 'Menu & Costs Views'}
          </div>
          <div style={{ display: isMobile ? 'flex' : 'grid', gap: 6, overflowX: isMobile ? 'auto' : 'visible' }}>
            {navGroups
              .find(g => g.id === module)
              ?.sub?.map((item) => {
                const active = subView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(module, item.id)}
                    style={{
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      color: active ? '#fff' : '#d7cec1',
                      background: active ? tokens.colors.brand : 'transparent',
                      fontWeight: active ? 700 : 500
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </aside>
  );
}
