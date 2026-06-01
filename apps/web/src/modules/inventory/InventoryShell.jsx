import React, { useMemo, useState } from 'react';
import ReorderOverview from './ReorderOverview.jsx';
import ReorderDetail from './ReorderDetail.jsx';
import OrderList from './OrderList.jsx';
import CsvUpload from './CsvUpload.jsx';
import Matching from './Matching.jsx';

export default function InventoryShell({ subView, setSubView, user }) {
  const [activeLocationId, setActiveLocationId] = useState('');
  const [activeReportId, setActiveReportId] = useState('');

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
      onOpenDetail={(locationId) => {
        setActiveLocationId(locationId);
        setSubView('reorder-detail');
      }}
      onOpenOrderList={(locationId) => {
        setActiveLocationId(locationId);
        setSubView('order-list');
      }}
      onOpenUpload={() => setSubView('upload-csv')}
      onOpenMatching={() => setSubView('matching')}
    />
  );
}
