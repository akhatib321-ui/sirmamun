// src/modules/catalog/UomView.jsx
import { useEffect, useState } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import { UOM_TABLE, convert, ALL_UNITS } from '../../shared/uom.js';
import { api } from '../../api.js';

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
  customCard: { ...ui.card, marginTop: 18, overflow: 'hidden' },
  customHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', borderBottom: `1px solid ${C.beigeLight}`, background: C.white,
  },
  customTitle: {
    fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted,
  },
  customHint: { fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted },
  customListHead: {
    display: 'grid', gridTemplateColumns: '1fr 100px 90px 1.6fr auto', gap: 8,
    padding: '8px 14px', borderBottom: `1px solid ${C.beigeLight}`, background: '#f6efe6',
    fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: C.textMuted,
  },
  customRow: {
    display: 'grid', gridTemplateColumns: '1fr 100px 90px 1.6fr auto', gap: 8,
    padding: '8px 14px', borderBottom: `1px solid ${C.beigeLight}`,
    alignItems: 'center', fontFamily: 'DM Sans', fontSize: 12, color: C.ink,
  },
  customCode: { fontFamily: "'Courier New',monospace", color: C.gold, fontWeight: 700 },
  deleteBtn: {
    ...ui.button,
    background: '#fff3f2',
    color: '#b53a2d',
    border: '1px solid #f1b9b2',
    padding: '4px 8px',
    fontSize: 11,
  },
  form: {
    display: 'grid',
    gridTemplateColumns: '1fr 120px 120px 1.4fr 1.4fr auto',
    gap: 8,
    alignItems: 'end',
    padding: '12px 14px',
    background: C.cream,
  },
  formField: { display: 'flex', flexDirection: 'column', gap: 3 },
  formLabel: {
    fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted,
  },
  formInput: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  formSelect: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  addBtn: {
    ...ui.button,
    background: C.ink,
    color: C.gold,
    padding: '7px 14px',
  },
  err: { fontFamily: 'DM Sans', fontSize: 12, color: '#b53a2d', padding: '0 14px 12px' },
};

const FAMILIES = [
  { key: 'weight', label: '⚖️ Weight', border: '#C4B5FD', base: 'grams' },
  { key: 'volume', label: '💧 Volume', border: '#7DD3FC', base: 'ml' },
  { key: 'count',  label: '🔢 Count',  border: '#86EFAC', base: 'each' },
];

const NON_STANDARD_UNITS = ['shot', 'scoop', 'dropper'];

const NON_STANDARD_DEFAULTS = {
  shot: { family: 'count', baseValue: 1, label: 'Double shot', notes: '19g beans -> 34ml espresso' },
  scoop: { family: 'count', baseValue: 1, label: 'Scoop', notes: 'Custom scoop count unit' },
  dropper: { family: 'count', baseValue: 1, label: 'Dropper', notes: 'Custom dropper count unit' },
};

export default function UomView() {
  const [fromUnit, setFromUnit] = useState('lb');
  const [toUnit,   setToUnit]   = useState('g');
  const [qty,      setQty]      = useState('5');
  const [customUnits, setCustomUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    label: '',
    baseValue: '',
    notes: '',
  });
  const [form, setForm] = useState({
    name: '',
    family: 'volume',
    baseValue: '',
    notes: '',
    label: '',
  });

  const loadCustomUnits = async () => {
    try {
      const first = await api.getCustomUnits();
      const current = first.data ?? [];
      const existingNames = new Set(current.map((u) => u.name));

      await Promise.all(
        NON_STANDARD_UNITS
          .filter((name) => !existingNames.has(name))
          .map((name) => api.createCustomUnit({ name, ...NON_STANDARD_DEFAULTS[name] })),
      ).catch(() => {});

      const finalRes = await api.getCustomUnits();
      setCustomUnits(finalRes.data ?? current);
    } catch {
      setCustomUnits([]);
    }
  };

  useEffect(() => {
    loadCustomUnits();
  }, []);

  const mergedUnits = Array.from(
    new Set([
      ...ALL_UNITS.filter((u) => !NON_STANDARD_UNITS.includes(u)),
      ...NON_STANDARD_UNITS,
      ...customUnits.map((u) => u.name),
    ]),
  );

  const getUnitEntry = (unitName) => {
    const custom = customUnits.find((u) => u.name === unitName);
    if (custom) return { family: custom.family, base: custom.baseValue, label: custom.label };
    if (UOM_TABLE[unitName]) return UOM_TABLE[unitName];
    return null;
  };

  const convertMerged = (value, from, to) => {
    if (UOM_TABLE[from] && UOM_TABLE[to]) {
      const baseFactor = convert(from, to);
      return baseFactor === null ? null : value * baseFactor;
    }

    const fromUnitEntry = getUnitEntry(from);
    const toUnitEntry = getUnitEntry(to);
    if (!fromUnitEntry || !toUnitEntry) return null;
    if (fromUnitEntry.family !== toUnitEntry.family) return null;
    return (value * fromUnitEntry.base) / toUnitEntry.base;
  };

  const result = convertMerged(parseFloat(qty) || 0, fromUnit, toUnit);
  const factor = convertMerged(1, fromUnit, toUnit);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.baseValue || !form.label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createCustomUnit({
        name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
        family: form.family,
        baseValue: parseFloat(form.baseValue),
        notes: form.notes.trim() || undefined,
        label: form.label.trim(),
      });
      setForm({ name: '', family: 'volume', baseValue: '', notes: '', label: '' });
      loadCustomUnits();
    } catch (e) {
      setError(e.message || 'Failed to add custom unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteCustomUnit(id);
      loadCustomUnits();
    } catch (e) {
      setError(e.message || 'Failed to delete custom unit');
    }
  };

  const beginEdit = (unit) => {
    setEditingId(unit.id);
    setEditForm({
      label: unit.label || '',
      baseValue: String(unit.baseValue ?? ''),
      notes: unit.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ label: '', baseValue: '', notes: '' });
  };

  const saveEdit = async (unit) => {
    try {
      await api.updateCustomUnit(unit.id, {
        label: editForm.label.trim() || unit.label,
        baseValue: parseFloat(editForm.baseValue) || unit.baseValue,
        notes: editForm.notes.trim() || undefined,
      });
      cancelEdit();
      loadCustomUnits();
    } catch (e) {
      setError(e.message || 'Failed to update unit');
    }
  };

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
            {mergedUnits.map(u => <option key={u} value={u}>{u} — {getUnitEntry(u)?.label ?? u}</option>)}
          </select>
          <span style={s.arrow}>→</span>
          <select style={s.select} value={toUnit} onChange={e => setToUnit(e.target.value)}>
            {mergedUnits.map(u => <option key={u} value={u}>{u} — {getUnitEntry(u)?.label ?? u}</option>)}
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

      <div style={s.customCard}>
        <div style={s.customHeader}>
          <div style={s.customTitle}>Custom units</div>
          <div style={s.customHint}>Define and edit package units like bottle, bag, jug, shot, scoop, dropper</div>
        </div>

        {customUnits.length > 0 && (
          <div style={s.customListHead}>
            <div>Unit</div>
            <div>Family</div>
            <div>Base</div>
            <div>Label / Notes</div>
            <div />
          </div>
        )}

        {customUnits.map((unit) => (
          <div key={unit.id} style={s.customRow}>
            <div style={s.customCode}>{unit.name}</div>
            <div>{unit.family}</div>
            <div>
              {editingId === unit.id ? (
                <input
                  style={{ ...s.formInput, width: '100%', padding: '4px 8px' }}
                  type="number"
                  value={editForm.baseValue}
                  onChange={(e) => setEditForm((p) => ({ ...p, baseValue: e.target.value }))}
                />
              ) : unit.baseValue}
            </div>
            <div>
              {editingId === unit.id ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <input
                    style={{ ...s.formInput, padding: '4px 8px' }}
                    value={editForm.label}
                    onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
                  />
                  <input
                    style={{ ...s.formInput, padding: '4px 8px' }}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="notes"
                  />
                </div>
              ) : (
                <>
                  <strong>{unit.label}</strong>
                  {unit.notes ? ` - ${unit.notes}` : ''}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {editingId === unit.id ? (
                <>
                  <button style={{ ...s.deleteBtn, background: '#ecfdf3', borderColor: '#b9e7c9', color: '#1f7a42' }} onClick={() => saveEdit(unit)}>Save</button>
                  <button style={{ ...s.deleteBtn, background: '#fff', borderColor: '#ddd', color: '#666' }} onClick={cancelEdit}>Cancel</button>
                </>
              ) : (
                <button style={{ ...s.deleteBtn, background: '#eef3ff', borderColor: '#c9d5fb', color: '#3559b8' }} onClick={() => beginEdit(unit)}>Edit</button>
              )}
              <button style={s.deleteBtn} onClick={() => handleDelete(unit.id)}>Delete</button>
            </div>
          </div>
        ))}

        <div style={s.form}>
          <div style={s.formField}>
            <span style={s.formLabel}>Unit name</span>
            <input
              style={s.formInput}
              value={form.name}
              placeholder="bottle"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div style={s.formField}>
            <span style={s.formLabel}>Family</span>
            <select
              style={s.formSelect}
              value={form.family}
              onChange={(e) => setForm((p) => ({ ...p, family: e.target.value }))}
            >
              <option value="volume">volume</option>
              <option value="weight">weight</option>
              <option value="count">count</option>
            </select>
          </div>
          <div style={s.formField}>
            <span style={s.formLabel}>Base value</span>
            <input
              style={s.formInput}
              type="number"
              value={form.baseValue}
              placeholder="750"
              onChange={(e) => setForm((p) => ({ ...p, baseValue: e.target.value }))}
            />
          </div>
          <div style={s.formField}>
            <span style={s.formLabel}>Label</span>
            <input
              style={s.formInput}
              value={form.label}
              placeholder="Syrup bottle (750ml)"
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            />
          </div>
          <div style={s.formField}>
            <span style={s.formLabel}>Notes</span>
            <input
              style={s.formInput}
              value={form.notes}
              placeholder="optional"
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <button
            style={{ ...s.addBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? 'Saving...' : '+ Add'}
          </button>
        </div>
        {error && <div style={s.err}>{error}</div>}
      </div>

      {/* Reference tables */}
      <div style={s.tables}>
        {FAMILIES.map(fam => {
          const units = ALL_UNITS.filter(k => UOM_TABLE[k].family === fam.key && !NON_STANDARD_UNITS.includes(k));
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
