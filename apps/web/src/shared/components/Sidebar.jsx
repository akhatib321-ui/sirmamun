import React from 'react';
import { tokens } from '../styles.js';

const topNav = [
  { id: 'dashboard', label: 'Dashboard', module: 'dashboard', subView: '' },
  { id: 'inventory', label: 'Inventory', module: 'orders', subView: 'stock' },
  { id: 'catalog', label: 'Catalog', module: 'catalog', subView: 'ingredients' },
  { id: 'recipes', label: 'Recipes', module: 'catalog', subView: 'recipes' },
  { id: 'ai-orders', label: 'AI Orders', module: 'orders', subView: 'stock' },
];

const orderViews = [
  { id: 'stock', label: 'Stock', section: 'Smart Orders' },
  { id: 'forecast', label: 'Forecast', section: 'Smart Orders' },
  { id: 'orders', label: 'Orders', section: 'Smart Orders' },
  { id: 'reorder', label: 'Reorder', section: 'Legacy' },
  { id: 'upload-csv', label: 'Upload Toast / Product Sales', section: 'Legacy' },
  { id: 'matching', label: 'Matching', section: 'Legacy' },
];

function isTopLinkActive(link, module, subView) {
  if (link.id === 'dashboard') return false;
  if (link.id === 'inventory') return module === 'orders' && subView === 'stock';
  if (link.id === 'recipes') return module === 'catalog' && subView === 'recipes';
  if (link.id === 'catalog') return module === 'catalog' && subView !== 'recipes';
  if (link.id === 'ai-orders') return module === 'orders';
  return false;
}

export default function Sidebar({ module, subView, onNavigate, isMobile, urgentCount = 0 }) {
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
      <div style={{ marginBottom: 14, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.72 }}>
        Navigation
      </div>

      <div style={{ display: isMobile ? 'flex' : 'grid', gap: 8, overflowX: isMobile ? 'auto' : 'visible' }}>
        {topNav.map((item) => {
          const active = isTopLinkActive(item, module, subView);
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.module, item.subView);
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{item.label}</span>
                {item.id === 'ai-orders' && urgentCount > 0 && (
                  <span
                    style={{
                      background: '#fce6e2',
                      color: '#9f2f24',
                      borderRadius: 999,
                      padding: '1px 7px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {urgentCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {module === 'orders' && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
            Smart Orders Views
          </div>
          <div style={{ display: isMobile ? 'flex' : 'grid', gap: 6, overflowX: isMobile ? 'auto' : 'visible' }}>
            {(() => {
              const list = orderViews;
              let lastSection = '';
              return list.map((item) => {
                const active = subView === item.id;
                const sectionChanged = item.section && item.section !== lastSection;
                lastSection = item.section || lastSection;

                return (
                  <React.Fragment key={item.id}>
                    {sectionChanged && module === 'orders' && (
                      <div
                        style={{
                          marginTop: item.section === 'Legacy' ? 8 : 0,
                          marginBottom: 2,
                          padding: '0 4px',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          opacity: 0.65,
                        }}
                      >
                        {item.section}
                      </div>
                    )}
                    <button
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
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {item.label}
                    </button>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      )}
    </aside>
  );
}
