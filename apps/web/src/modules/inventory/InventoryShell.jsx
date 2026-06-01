import React, { useMemo, useState } from 'react';
import ReorderOverview from './ReorderOverview.jsx';
import ReorderDetail from './ReorderDetail.jsx';
import OrderList from './OrderList.jsx';
import CsvUpload from './CsvUpload.jsx';
import Matching from './Matching.jsx';
import AggregateReorderDetail from './AggregateReorderDetail.jsx';
import AggregateOrderList from './AggregateOrderList.jsx';

export default function InventoryShell({ subView, setSubView, user }) {
  const [activeLocationId, setActiveLocationId] = useState('');
  const [activeReportId, setActiveReportId] = useState('');
  const [aggregateData, setAggregateData] = useState(null);
  const [aggregateOrderData, setAggregateOrderData] = useState(null);

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

  return (
    <ReorderOverview
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
}
