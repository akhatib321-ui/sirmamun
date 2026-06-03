import React from 'react';
import { tokens } from '../styles.js';

const subViewTitles = {
  reorder: 'Reorder Overview',
  'reorder-detail': 'Reorder Detail',
  'order-list': 'Order List',
  'upload-csv': 'Upload Sales CSV',
  matching: 'Item Matching'
};

export default function Header({ module, subView, user, onLogout }) {
  const moduleTitles = {
    orders: 'Smart Orders',
    catalog: 'Catalog',
  };
  const moduleTitle = moduleTitles[module] || (module ? module.charAt(0).toUpperCase() + module.slice(1) : 'Platform');
  const title = subViewTitles[subView] || moduleTitle;

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '18px 22px',
        paddingTop: 'calc(18px + env(safe-area-inset-top))',
        borderBottom: `1px solid ${tokens.colors.border}`,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(6px)',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}
    >
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: tokens.colors.muted }}>
          {moduleTitle}
        </div>
        <div style={{ fontFamily: tokens.fonts.heading, fontSize: 'clamp(22px, 4vw, 30px)', lineHeight: 1.1 }}>{title}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: tokens.colors.muted }}>Signed in as</div>
          <div style={{ fontWeight: 700 }}>{user?.name || 'User'}</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            border: `1px solid ${tokens.colors.border}`,
            background: '#fff',
            borderRadius: 10,
            padding: '9px 12px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
