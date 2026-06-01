// src/modules/catalog/UomView.jsx
import { useState } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import { UOM_TABLE, convert, ALL_UNITS } from '../../shared/uom.js';

const s = {
  page: { padding: '24px 32px', background: C.cream, minHeight: '100%', maxWidth: 980 },
  intro: { fontFamily: 'DM Sans', fontSize: 13, color: C.textSecond, lineHeight: 1.6, marginBottom: 24 },
  converterCard: { ...ui.card, padding: '16px 20px', marginBottom: 24, background: C.white },
  converterTitle: { fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 },
  converterRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  input: {
    fontFamily: "'Courier New',monospace", fontSize: 16, padding: '7px 12px', width: 90,
    border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white,
    color: C.ink, outline: 'none',
  },
  select: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '7px 12px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  arrow: { fontFamily: 'DM Sans', fontSize: 16, fontWeight: 700, color: C.textMuted },
  result: (valid) => ({
    fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700,
    color: valid ? C.gold : '#d32f2f', minWidth: 180,
  }),
  factor: { fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted, marginTop: 4 },
  tables: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 },
  familyCard: (border) => ({ ...ui.card, overflow: 'hidden', borderTop: `3px solid ${border}` }),
  familyHeader: { padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.ink, background: C.white, borderBottom: `1px solid ${C.beigeLight}` },
  th: { padding: '6px 12px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, background: '#f6efe6', borderBottom: `1px solid ${C.beigeLight}`, textAlign: 'left' },
  td: { padding: '7px 12px', borderBottom: `1px solid ${C.beigeLight}`, fontFamily: 'DM Sans', fontSize: 12, color: C.ink },
  unitCode: { fontFamily: "'Courier New',monospace", fontWeight: 700, color: C.gold, fontSize: 13 },
  notes: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 },
  note: { ...ui.card, padding: '12px 16px', background: C.white },
  noteTitle: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 },
  noteText: { fontFamily: 'DM Sans', fontSize: 12, color: C.textSecond, lineHeight: 1.6 },
};

const FAMILIES = [
  { key: 'weight', label: '⚖️ Weight', border: '#C4B5FD', base: 'grams' },
  { key: 'volume', label: '💧 Volume', border: '#7DD3FC', base: 'ml' },
  { key: 'count',  label: '🔢 Count',  border: '#86EFAC', base: 'each' },
];

export default function UomView() {
  const [fromUnit, setFromUnit] = useState('lb');
  const [toUnit,   setToUnit]   = useState('g');
  const [qty,      setQty]      = useState('5');

  const factor = convert(fromUnit, toUnit);
  const result = factor !== null ? (parseFloat(qty) || 0) * factor : null;

  return (
    <div style={s.page}>
      <p style={s.intro}>
        Unit conversions happen automatically in recipes when the buy unit and use unit differ.
        <strong> Pump = 15ml</strong>. <strong>Shot = 1 double shot</strong> (19g beans → 34ml espresso).
      </p>

      {/* Quick converter */}
      <div style={s.converterCard}>
        <div style={s.converterTitle}>Quick converter</div>
        <div style={s.converterRow}>
          <input style={s.input} type="number" value={qty} step="any" min="0" onChange={e => setQty(e.target.value)} />
          <select style={s.select} value={fromUnit} onChange={e => setFromUnit(e.target.value)}>
            {ALL_UNITS.map(u => <option key={u} value={u}>{u} — {UOM_TABLE[u]?.label}</option>)}
          </select>
          <span style={s.arrow}>→</span>
          <select style={s.select} value={toUnit} onChange={e => setToUnit(e.target.value)}>
            {ALL_UNITS.map(u => <option key={u} value={u}>{u} — {UOM_TABLE[u]?.label}</option>)}
          </select>
          <div>
            <div style={s.result(result !== null)}>
              {result !== null
                ? `${result < 0.001 ? result.toExponential(3) : result.toFixed(4)} ${toUnit}`
                : '⚠ Incompatible units'}
            </div>
            {result !== null && factor !== null && (
              <div style={s.factor}>1 {fromUnit} = {factor.toFixed(6)} {toUnit}</div>
            )}
          </div>
        </div>
      </div>

      {/* Reference tables */}
      <div style={s.tables}>
        {FAMILIES.map(fam => {
          const units = ALL_UNITS.filter(k => UOM_TABLE[k].family === fam.key);
          return (
            <div key={fam.key} style={s.familyCard(fam.border)}>
              <div style={s.familyHeader}>{fam.label} — base: {fam.base}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={s.th}>Unit</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>= {fam.base}</th>
                </tr></thead>
                <tbody>
                  {units.map(u => (
                    <tr key={u}>
                      <td style={{ ...s.td, ...s.unitCode }}>{u}</td>
                      <td style={{ ...s.td, color: C.textMuted }}>{UOM_TABLE[u].label}</td>
                      <td style={{ ...s.td, fontFamily: "'Courier New',monospace", fontSize: 11 }}>
                        {UOM_TABLE[u].base === 1 ? 'base unit' : UOM_TABLE[u].base.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div style={s.notes}>
        <div style={s.note}>
          <div style={s.noteTitle}>Coffee bean example</div>
          <div style={s.noteText}>
            Buy beans in <strong>lb</strong> at $45 for 5lb = $9.00/lb. In recipes, set use-unit to <strong>g</strong>, qty = 19.
            Cost auto-calculates: $9.00 ÷ 453.592 × 19 = <strong style={{ color: C.gold }}>$0.377 per double shot</strong>.
          </div>
        </div>
        <div style={s.note}>
          <div style={s.noteTitle}>oz (fluid) vs oz_w (weight)</div>
          <div style={s.noteText}>
            <strong>oz</strong> = fluid ounce (29.57 ml) — use for liquids, milk, sauces.
            <strong> oz_w</strong> = weight ounce (28.35 g) — use for dry goods.
            A pump is 15ml ≈ ½ fluid oz. "½ oz syrup" = 1 pump.
          </div>
        </div>
      </div>
    </div>
  );
}
