import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens } from '../../shared/styles.js';
import StockTab from './StockTab.jsx';
import ForecastTab from './ForecastTab.jsx';
import OrdersTab from './OrdersTab.jsx';
import IngredientDetail from './IngredientDetail.jsx';

const SMART_TABS = ['stock', 'forecast', 'orders'];

export default function SmartOrdersShell({ subView, onNavigate, onUrgentUpdated }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const activeTab = useMemo(() => {
    if (SMART_TABS.includes(subView)) return subView;
    return 'stock';
  }, [subView]);

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getStockStatus(7);
      setStatus(res.data || null);
    } catch (e) {
      setError(e.message || 'Could not load stock status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'orders') return;
    if (status) return;
    loadStatus();
  }, [activeTab, status]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#1f2021' }}>
      <div style={{ borderBottom: '1px solid #3a3d40', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#262728' }}>
        <div style={{ display: 'flex', gap: 18 }}>
          <Tab active={activeTab === 'stock'} onClick={() => onNavigate('orders', 'stock')}>Stock</Tab>
          <Tab active={activeTab === 'forecast'} onClick={() => onNavigate('orders', 'forecast')}>Forecast</Tab>
          <Tab active={activeTab === 'orders'} onClick={() => onNavigate('orders', 'orders')}>Orders</Tab>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigate('orders', 'orders')}
            style={{
              border: 'none',
              background: '#f4e8e7',
              color: '#a33227',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Orders today
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'stock' && (
          <StockTab
            items={status?.items || []}
            loading={loading}
            error={error}
            onRefresh={loadStatus}
            onSelectIngredient={(item) => {
              setSelected(item);
              setDetailOpen(true);
            }}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastTab
            items={status?.items || []}
            onOpenOrders={() => onNavigate('orders', 'orders')}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab onUrgentUpdated={onUrgentUpdated} />
        )}

        {detailOpen && (
          <IngredientDetail
            item={selected}
            isModal
            onClose={() => setDetailOpen(false)}
            onOpenOrders={() => {
              setDetailOpen(false);
              onNavigate('orders', 'orders');
            }}
            onViewRecipeUsage={() => {
              if (!selected) return;
              setDetailOpen(false);
              onNavigate('catalog', 'recipes', {
                recipeFocusIngredient: { id: selected.id, name: selected.name },
              });
            }}
            onCostSaved={async () => {
              await loadStatus();
              onUrgentUpdated?.();
            }}
          />
        )}
      </div>

    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderBottom: active ? '2px solid #c9963f' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#f5ecdb' : '#c0b29d',
        fontWeight: active ? 700 : 500,
        padding: '12px 2px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

