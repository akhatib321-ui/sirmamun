// src/modules/inventory/InventoryShell.jsx — UPDATED WITH AGGREGATE ROUTES
import { useState, useEffect } from 'react';
import Header from '../../shared/components/Header.jsx';
import ReorderOverview       from './ReorderOverview.jsx';
import ReorderDetail         from './ReorderDetail.jsx';
import OrderList             from './OrderList.jsx';
import AggregateReorderDetail from './AggregateReorderDetail.jsx';
import AggregateOrderList    from './AggregateOrderList.jsx';
import CsvUpload             from './CsvUpload.jsx';
import Matching              from './Matching.jsx';
import { getLocations }      from '../../api.additions.js';
import { C, F, btnGhost }    from '../../shared/styles.js';

const SUB_LABELS = {
  reorder:           'Reorder',
  'reorder-detail':  'Reorder list',
  'order-list':      'Order list',
  'aggregate-detail':'Combined reorder list',
  'aggregate-order': 'Combined order',
  sales:             'Upload CSV',
  matching:          'Item matching',
  suppliers:         'Suppliers',
};

export default function InventoryShell({ subView: initialSubView, user, onNavigate }) {
  const [subView,    setSubView]   = useState(initialSubView ?? 'reorder');
  const [context,    setContext]   = useState({});
  const [locations,  setLocations] = useState([]);

  useEffect(() => {
    getLocations()
      .then(res => setLocations(res.data?.items ?? res.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSubView && initialSubView !== subView) {
      setSubView(initialSubView);
      setContext({});
    }
  }, [initialSubView]);

  const navigate = (view, ctx = {}) => {
    setSubView(view);
    setContext(ctx);
  };

  const headerActions = subView === 'reorder' ? (
    <button style={btnGhost} onClick={() => navigate('sales')}>Upload CSV</button>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        moduleLabel="Inventory"
        subLabel={SUB_LABELS[subView] ?? subView}
        user={user}
        actions={headerActions}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {subView === 'reorder' && (
          <ReorderOverview
            locations={locations} user={user}
            onNavigate={(mod, view, ctx) => navigate(view, ctx)}
          />
        )}

        {/* Per-location drill-in (unchanged) */}
        {subView === 'reorder-detail' && (
          <ReorderDetail
            locationId={context.locationId}
            locationName={context.locationName}
            onBack={() => navigate('reorder')}
            onGenerateOrder={(locId, locName, sugId) =>
              navigate('order-list', { locationId: locId, locationName: locName, suggestionId: sugId })
            }
          />
        )}
        {subView === 'order-list' && (
          <OrderList
            locationId={context.locationId}
            locationName={context.locationName}
            suggestionId={context.suggestionId}
            onBack={() => navigate('reorder-detail', { locationId: context.locationId, locationName: context.locationName })}
          />
        )}

        {/* Aggregate views (new) */}
        {subView === 'aggregate-detail' && (
          <AggregateReorderDetail
            aggregateData={context.aggregateData}
            onBack={() => navigate('reorder')}
            onGenerateOrder={(orderData) =>
              navigate('aggregate-order', { orderData, locations })
            }
          />
        )}
        {subView === 'aggregate-order' && (
          <AggregateOrderList
            orderData={context.orderData}
            locations={context.locations ?? locations}
            onBack={() => navigate('aggregate-detail', { aggregateData: context.aggregateData })}
          />
        )}

        {subView === 'sales' && (
          <CsvUpload
            locations={locations}
            onNavigate={(mod, view, ctx) => navigate(view, ctx ?? {})}
          />
        )}
        {subView === 'matching' && <Matching locations={locations} />}
        {subView === 'suppliers' && (
          <div style={{ padding: 40, fontFamily: F.ui, fontSize: 13, color: C.textMuted }}>
            Suppliers management coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
