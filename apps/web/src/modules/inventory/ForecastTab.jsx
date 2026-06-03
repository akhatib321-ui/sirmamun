import React, { useMemo } from 'react';
import { ui } from '../../shared/styles.js';

function barColor(urgency) {
  if (urgency === 'ORDER_TODAY') return '#cc4e48';
  if (urgency === 'ORDER_THIS_WEEK') return '#cc902a';
  if (urgency === 'PLAN_AHEAD') return '#7aa52a';
  return '#4d8b2f';
}

function widthFromDays(daysLeft) {
  if (daysLeft === null || !Number.isFinite(daysLeft)) return 100;
  const clamped = Math.max(0, Math.min(30, daysLeft));
  return (clamped / 30) * 100;
}

export default function ForecastTab({ items, onOpenOrders }) {
  const rows = useMemo(() => (items || []).slice().sort((a, b) => {
    const aDays = a.daysLeft ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysLeft ?? Number.MAX_SAFE_INTEGER;
    return aDays - bDays;
  }), [items]);

  return (
    <div style={{ padding: 18, overflow: 'auto', height: '100%', background: '#1f2021', color: '#efe6d7' }}>
      <div style={{ ...ui.card, padding: 14, background: '#2a2b2c', borderColor: '#44474c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: '#f1e7d9' }}>Next 30 days</div>
          <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={onOpenOrders}>Generate order for all due</button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((item) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 72px', gap: 10, alignItems: 'center' }}>
              <div style={{ color: '#efe6d7' }}>{item.name}</div>
              <div style={{ background: '#232425', borderRadius: 8, height: 18, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${widthFromDays(item.daysLeft)}%`,
                    background: barColor(item.urgency),
                  }}
                />
              </div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#d7c7ad' }}>
                {item.daysLeft === null ? '-' : `${item.daysLeft.toFixed(1)}d`}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div style={{ opacity: 0.7 }}>No forecast data yet.</div>}
        </div>
      </div>
    </div>
  );
}
