import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Sidebar from './shared/components/Sidebar.jsx';
import Header from './shared/components/Header.jsx';
import CatalogShell from './modules/catalog/CatalogShell.jsx';
import InventoryShell from './modules/inventory/InventoryShell.jsx';
import { tokens, ui } from './shared/styles.js';

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await api.login(pin);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ ...ui.page, display: 'grid', placeItems: 'center', padding: 18 }}>
      <form onSubmit={handleSubmit} style={{ ...ui.card, width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ fontFamily: tokens.fonts.heading, fontSize: 40, marginBottom: 8 }}>SirMamun</div>
        <div style={{ color: tokens.colors.muted, marginBottom: 16 }}>
          Enter your PIN to continue to the operations platform.
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: tokens.colors.muted }}>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={ui.input}
            minLength={4}
            maxLength={16}
            required
          />
        </label>

        {error && (
          <div style={{ marginTop: 10, ...ui.card, padding: 10, background: '#fff5f3', borderColor: '#f0c9c2' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ ...ui.button, marginTop: 14, width: '100%', background: tokens.colors.ink, color: '#fff' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function Placeholder({ label }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ ...ui.card, padding: 24 }}>
        <div style={{ fontFamily: tokens.fonts.heading, fontSize: 30, marginBottom: 8 }}>{label}</div>
        <div style={{ color: tokens.colors.muted }}>
          This module is reserved. Inventory (Module 2) is currently integrated.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [module, setModule] = useState('inventory');
  const [subView, setSubView] = useState('reorder');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 960);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isLoggedIn = useMemo(() => !!user, [user]);

  function handleNavigate(nextModule, nextSubView) {
    setModule(nextModule);
    if (nextSubView) setSubView(nextSubView);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sm_user');
    setUser(null);
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div style={{ ...ui.page, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100dvh' }}>
      <Sidebar module={module} subView={subView} onNavigate={handleNavigate} isMobile={isMobile} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header module={module} subView={subView} user={user} onLogout={logout} />

        {module === 'catalog' && (
          <CatalogShell subView={subView} user={user} onNavigate={handleNavigate} onLogout={logout} />
        )}
        {module === 'inventory' && (
          <InventoryShell subView={subView} setSubView={setSubView} user={user} />
        )}
        {module === 'dashboard' && <Placeholder label="Dashboard" />}
        {module === 'scheduling' && <Placeholder label="Scheduling" />}
        {module === 'analytics' && <Placeholder label="Analytics" />}
      </div>
    </div>
  );
}
