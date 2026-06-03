import React, { useMemo, useState } from 'react';
import { tokens, ui } from '../../shared/styles.js';

function urgencyTone(urgency) {
  if (urgency === 'ORDER_TODAY') return { label: 'Critical', color: '#b03028', bg: '#fde9e6' };
  if (urgency === 'ORDER_THIS_WEEK') return { label: 'Low', color: '#9f6a12', bg: '#fff2dd' };
  if (urgency === 'PLAN_AHEAD') return { label: 'Plan', color: '#5f7a21', bg: '#edf6df' };
  return { label: 'Healthy', color: '#2f7a48', bg: '#eaf7ef' };
}

function fmtNum(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(digits).replace(/\.0$/, '');
}

export default function StockTab({ items, loading, error, onRefresh, onSelectIngredient }) {
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('all');
  const [urgency, setUrgency] = useState('all');

  const suppliers = useMemo(
    () => Array.from(new Set((items || []).map((i) => i.supplierName).filter(Boolean))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items || []).filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (supplier !== 'all' && item.supplierName !== supplier) return false;
      if (urgency !== 'all' && item.urgency !== urgency) return false;
      return true;
    });
  }, [items, search, supplier, urgency]);

  return (
    <div style={{ padding: 18, overflow: 'auto', height: '100%', background: '#1f2021', color: '#efe6d7' }}>
      <div style={{ ...ui.card, padding: 12, marginBottom: 12, background: '#f0e4cd', borderColor: '#e0cfab', color: '#5e4a2b' }}>
        {'Toast sales -> ingredient consumption -> forecast -> reorder. Current inventory and daily use drive demand.'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter ingredients..."
          style={{ ...ui.input, background: '#2b2c2d', color: '#efe6d7', borderColor: '#464a4f' }}
        />
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...ui.input, background: '#2b2c2d', color: '#efe6d7', borderColor: '#464a4f' }}>
          <option value="all">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ ...ui.input, background: '#2b2c2d', color: '#efe6d7', borderColor: '#464a4f' }}>
          <option value="all">All urgency</option>
          <option value="ORDER_TODAY">Order today</option>
          <option value="ORDER_THIS_WEEK">This week</option>
          <option value="PLAN_AHEAD">Plan ahead</option>
          <option value="HEALTHY">Healthy</option>
        </select>
        <button style={{ ...ui.button, background: '#2b2c2d', color: '#efe6d7', border: '1px solid #4a4e52' }} onClick={onRefresh}>Recalculate</button>
      </div>

      {loading && <div style={{ ...ui.card, padding: 14, background: '#2a2b2c', borderColor: '#44474c', color: '#efe6d7' }}>Loading stock status...</div>}
      {error && <div style={{ ...ui.card, padding: 14, background: '#fff3f1', borderColor: '#f0c6bf' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ ...ui.card, overflow: 'hidden', background: '#2a2b2c', borderColor: '#44474c' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#232425' }}>
                <th style={th}>Ingredient</th>
                <th style={th}>Supplier</th>
                <th style={th}>Stock health</th>
                <th style={th}>Daily use</th>
                <th style={th}>Days left</th>
                <th style={th}>Cost/unit</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const tone = urgencyTone(item.urgency);
                const dot = item.hasPhysicalLink ? '#2f7a48' : '#a5acb8';
                return (
                  <tr
                    key={item.id}
                    style={{ cursor: 'pointer', borderTop: '1px solid #3e4246' }}
                    onClick={() => onSelectIngredient(item)}
                  >
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                        {item.name}
                      </span>
                    </td>
                    <td style={td}>{item.supplierName || '-'}</td>
                    <td style={td}>{item.hasPhysicalLink ? 'Physical linked' : 'Estimate only'}</td>
                    <td style={td}>{fmtNum(item.dailyUse, 2)} {item.buyUnit}/day</td>
                    <td style={td}>{item.daysLeft === null ? '-' : `${fmtNum(item.daysLeft, 1)}d`}</td>
                    <td style={td}>{item.costPerUnit === null ? '-' : `$${fmtNum(item.costPerUnit, 4)}`}</td>
                    <td style={td}>
                      <span style={{ background: tone.bg, color: tone.color, borderRadius: 12, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>
                        {tone.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td style={tdEmpty} colSpan={7}>No ingredients match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#9fa5ad',
};

const td = {
  padding: '10px 12px',
  fontSize: 13,
  color: '#efe6d7',
};

const tdEmpty = {
  ...td,
  textAlign: 'center',
  color: tokens.colors.muted,
};
