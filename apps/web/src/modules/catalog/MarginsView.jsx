// src/modules/catalog/MarginsView.jsx
import { useState, useEffect } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import { cogsOf, marginOf, marginColor, marginBg, buildIngMap } from '../../shared/uom.js';
import { api } from '../../api.js';

const CATS = ['Signature Espresso','Matcha & Chai','Wanderlust','Espresso Basics','Refreshers','Frappes & Smoothies','Tea Selection','Grab N Go','Pastries'];
const fmt2 = n => `$${Number(n).toFixed(2)}`;
const fmtPct = p => p === null ? '—' : `${p.toFixed(1)}%`;

const s = {
  page: { padding: '20px 24px', background: C.cream, minHeight: '100%' },
  toolbar: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  catSelect: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 12px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  legend: { display: 'flex', alignItems: 'center', gap: 8 },
  legendPill: (bg, color) => ({
    padding: '2px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700,
    background: bg, color, fontFamily: "'Courier New',monospace",
  }),
  tableWrap: { ...ui.card, overflow: 'hidden' },
  th: {
    padding: '8px 14px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
    background: C.cream, borderBottom: `1px solid ${C.beigeLight}`, textAlign: 'left',
  },
  td: {
    padding: '10px 14px', borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: 'DM Sans', fontSize: 13, color: C.ink,
  },
  pill: (pct) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: 100,
    fontSize: 12, fontWeight: 700, fontFamily: "'Courier New',monospace",
    background: marginBg(pct), color: marginColor(pct),
  }),
  monoVal: { fontFamily: "'Courier New',monospace" },
  notCosted: { color: C.textMuted, fontSize: 12 },
  csvModal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  csvBox: {
    background: C.white, borderRadius: 14, padding: 24,
    width: 'min(680px,92vw)', border: `1px solid ${C.beigeLight}`,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  csvTextarea: {
    width: '100%', height: 260, fontFamily: "'Courier New',monospace",
    fontSize: 11, padding: 10, border: `1px solid ${C.beigeLight}`,
    borderRadius: 8, background: C.cream, color: C.ink,
    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
  },
};

export default function MarginsView({ locationId }) {
  const [recipes,     setRecipes]    = useState([]);
  const [ingMap,      setIngMap]     = useState({});
  const [loading,     setLoading]    = useState(true);
  const [catFilter,   setCatFilter]  = useState('');
  const [csvModal,    setCsvModal]   = useState(null);
  const [copied,      setCopied]     = useState(false);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    Promise.all([api.getRecipes(locationId, 1, 200), api.getIngredients(1, 200)])
      .then(([rRes, iRes]) => {
        setIngMap(buildIngMap(iRes.data?.items ?? []));
        setRecipes(rRes.data?.items ?? []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [locationId]);

  const filtered = recipes
    .filter(r => !catFilter || r.category === catFilter)
    .map(r => ({ r, m: marginOf(r, ingMap), c: cogsOf(r, ingMap) }))
    .sort((a, b) => {
      if (a.m === null && b.m === null) return 0;
      if (a.m === null) return 1;
      if (b.m === null) return -1;
      return b.m - a.m;
    });

  const costedCount  = filtered.filter(x => x.m !== null).length;
  const avgMargin    = costedCount > 0
    ? filtered.filter(x => x.m !== null).reduce((s, x) => s + x.m, 0) / costedCount
    : null;

  const exportCsv = () => {
    const rows = [['Item','Category','COGS','Sell price','Profit','Margin %','Costed']];
    filtered.forEach(({ r, m, c }) =>
      rows.push([
        `"${r.name}"`, r.category,
        m !== null ? c.toFixed(4) : '',
        Number(r.sellPrice).toFixed(2),
        m !== null ? (r.sellPrice - c).toFixed(4) : '',
        m !== null ? m.toFixed(1) : '',
        r.ingredients?.length ? 'Yes' : 'No',
      ])
    );
    setCsvModal(rows.map(r => r.join(',')).join('\n'));
    setCopied(false);
  };

  const copyCsv = () => {
    navigator.clipboard.writeText(csvModal ?? '')
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  return (
    <div style={s.page}>
      <div style={s.toolbar}>
        <select style={s.catSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={s.legend}>
          {[['70%+','#E8F8EF','#1D7A3F'],['50–70%','#FEFCE8','#C59B00'],['<50%','#FDEDEC','#B03A2E'],['not costed','#F3EEE8','#9C8E82']].map(([l,bg,cl]) => (
            <span key={l} style={s.legendPill(bg, cl)}>{l}</span>
          ))}
        </div>
        {avgMargin !== null && (
          <span style={{ marginLeft: 'auto', fontFamily: 'DM Sans', fontSize: 12, color: C.textSecond }}>
            Avg margin ({costedCount} costed): <strong style={{ color: marginColor(avgMargin) }}>{avgMargin.toFixed(1)}%</strong>
          </span>
        )}
        <button style={{ ...ui.button, fontSize: 12 }} onClick={exportCsv}>↓ Export CSV</button>
      </div>

      <div style={s.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Item','Category','COGS','Sell price','Profit / item','Margin'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: C.textMuted, padding: 28 }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: C.textMuted, padding: 28 }}>No recipes yet.</td></tr>
            )}
            {filtered.map(({ r, m, c }, idx) => (
              <tr key={r.id} style={{ background: idx % 2 === 0 ? C.white : '#FDFAF6' }}>
                <td style={{ ...s.td, fontWeight: 500 }}>{r.name}</td>
                <td style={{ ...s.td, color: C.textMuted, fontSize: 12 }}>{r.category}</td>
                <td style={{ ...s.td, ...s.monoVal }}>{m !== null ? fmt2(c) : <span style={s.notCosted}>—</span>}</td>
                <td style={{ ...s.td, ...s.monoVal }}>{fmt2(r.sellPrice)}</td>
                <td style={{ ...s.td, ...s.monoVal }}>{m !== null ? fmt2(r.sellPrice - c) : <span style={s.notCosted}>—</span>}</td>
                <td style={s.td}><span style={s.pill(m)}>{fmtPct(m)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, marginTop: 10 }}>
        Export CSV → upload to your Claude Project alongside TOAST reports for revenue-weighted margin analysis.
      </p>

      {csvModal && (
        <div style={s.csvModal} onClick={() => setCsvModal(null)}>
          <div style={s.csvBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 700, color: C.ink }}>Export CSV</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted, marginTop: 2 }}>Copy → paste into .csv or Google Sheets</div>
              </div>
              <button style={{ ...ui.button, fontSize: 12 }} onClick={() => setCsvModal(null)}>✕ Close</button>
            </div>
            <textarea id="csv-ta" readOnly value={csvModal} onClick={e => e.target.select()} style={s.csvTextarea} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={{ ...ui.button, fontSize: 13, padding: '8px 20px' }} onClick={copyCsv}>
                {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
              </button>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted }}>Save as <strong>baladi_margins.csv</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
