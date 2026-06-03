import React, { useMemo, useState } from 'react';
import ReorderOverview from './ReorderOverview.jsx';
import ReorderDetail from './ReorderDetail.jsx';
import OrderList from './OrderList.jsx';
import CsvUpload from './CsvUpload.jsx';
import Matching from './Matching.jsx';
import AggregateReorderDetail from './AggregateReorderDetail.jsx';
import AggregateOrderList from './AggregateOrderList.jsx';

export default function InventoryShell({ subView, setSubView, user, legacyReorderContent = null }) {
  const [activeLocationId, setActiveLocationId] = useState('');
  const [activeReportId, setActiveReportId] = useState('');
  const [aggregateData, setAggregateData] = useState(null);
  const [aggregateOrderData, setAggregateOrderData] = useState(null);
  const [showCardsSection, setShowCardsSection] = useState(true);
  const [showLegacySection, setShowLegacySection] = useState(true);

  const view = useMemo(() => {
    if (!subView) return 'reorder';
    return subView;
  }, [subView]);

  if (view === 'reorder-detail') {
    return (
      <ReorderDetail
        locationId={activeLocationId}
        onBack={() => setSubView('reorder')}
        onOpenOrderList={(locationId) => {
          setActiveLocationId(locationId);
          setSubView('order-list');
        }}
      />
    );
  }

  if (view === 'order-list') {
    return (
      <OrderList
        locationId={activeLocationId}
        onBack={() => setSubView('reorder')}
      />
    );
  }

  if (view === 'aggregate-detail') {
    return (
      <AggregateReorderDetail
        aggregateData={aggregateData}
        onBack={() => setSubView('reorder')}
        onBuildOrder={(orderData) => {
          setAggregateOrderData(orderData);
          setSubView('aggregate-order');
        }}
      />
    );
  }

  if (view === 'aggregate-order') {
    return (
      <AggregateOrderList
        orderData={aggregateOrderData}
        onBack={() => setSubView('aggregate-detail')}
      />
    );
  }

  if (view === 'upload-csv') {
    return (
      <CsvUpload
        onOpenMatching={(reportId) => {
          setActiveReportId(reportId);
          setSubView('matching');
        }}
      />
    );
  }

  if (view === 'matching') {
    return (
      <Matching
        initialReportId={activeReportId}
        onRunReorderNow={(locationId) => {
          setActiveLocationId(locationId);
          setSubView('reorder');
        }}
      />
    );
  }

  const overview = (
    <ReorderOverview
      embedded={view === 'reorder' && !!legacyReorderContent}
      onOpenDetail={(locationId, nextAggregateData = null) => {
        if (locationId === 'aggregate') {
          setAggregateData(nextAggregateData);
          setSubView('aggregate-detail');
          return;
        }

        setActiveLocationId(locationId);
        setSubView('reorder-detail');
      }}
      onOpenOrderList={(locationId, nextOrderData = null, nextAggregateData = null) => {
        if (locationId === 'aggregate') {
          setAggregateData(nextAggregateData);
          setAggregateOrderData(nextOrderData);
          setSubView('aggregate-order');
          return;
        }

        setActiveLocationId(locationId);
        setSubView('order-list');
      }}
      onOpenUpload={() => setSubView('upload-csv')}
      onOpenMatching={() => setSubView('matching')}
    />
  );

  if (view === 'reorder' && legacyReorderContent) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 20px 0', background: '#1f2021' }}>
          <button
            onClick={() => setShowCardsSection((v) => !v)}
            style={{
              border: '1px solid #4d5155',
              background: '#2b2c2d',
              color: '#d7c7ad',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {showCardsSection ? 'Hide Cards Section' : 'Show Cards Section'}
          </button>
          <button
            onClick={() => setShowLegacySection((v) => !v)}
            style={{
              border: '1px solid #4d5155',
              background: '#2b2c2d',
              color: '#d7c7ad',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {showLegacySection ? 'Hide Legacy Reorder Section' : 'Show Legacy Reorder Section'}
          </button>
        </div>

        {showCardsSection ? overview : null}

        {showLegacySection ? (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {legacyReorderContent}
          </div>
        ) : null}
      </>
    );
  }

  return overview;
}
