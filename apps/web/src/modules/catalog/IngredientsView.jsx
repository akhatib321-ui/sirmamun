// src/modules/catalog/IngredientsView.jsx
import { useState, useEffect, useRef } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import { ALL_UNITS, UOM_TABLE } from '../../shared/uom.js';
import { api } from '../../api.js';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt4 = n => `$${Number(n).toFixed(4)}`;
const fmt2 = n => `$${Number(n).toFixed(2)}`;

function latestCost(ing) { return ing.costs?.[0] ?? null; }
function latestUnitCost(ing) { return latestCost(ing)?.unitCost ?? null; }
function latestSource(ing) {
  const sup = latestCost(ing)?.supplier?.name;
  return sup ?? (ing.notes ?? '—');
}

const isAmazon = ing => latestSource(ing).toLowerCase().includes('amazon');

// ─── styles ──────────────────────────────────────────────────────────────────
const s = {
  page:   { padding: '20px 24px', background: C.cream, minHeight: '100%' },
  toolbar:{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  search: {
    fontFamily: 'DM Sans', fontSize: 14, padding: '7px 12px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none', width: 220,
  },
  groupBtn: (active) => ({
    fontFamily: 'DM Sans', fontSize: 12, padding: '5px 12px',
    border: `1px solid ${active ? C.ink : C.beigeLight}`,
    borderRadius: 50, background: active ? C.ink : C.white,
    color: active ? C.gold : C.textSecond, cursor: 'pointer',
  }),
  tableWrap: { ...ui.card, overflow: 'hidden' },
  table:    { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
  th: {
    padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
    background: C.cream, borderBottom: `1px solid ${C.beigeLight}`,
    textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none',
  },
  thSort: { cursor: 'pointer' },
  td: {
    padding: '8px 12px', borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: 'DM Sans', fontSize: 13, color: C.ink, verticalAlign: 'middle',
  },
  groupHeader: {
    padding: '6px 12px',
    background: '#F5ECD9', borderBottom: `1px solid ${C.beigeLight}`,
    borderTop: `1px solid ${C.beigeLight}`,
    fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  groupCount: { fontWeight: 400, color: C.textMuted },
  tag: (variant) => ({
    display: 'inline-block', fontSize: 10, padding: '1px 6px',
    borderRadius: 4, fontWeight: 600, marginLeft: 6,
    background: variant === 'az' ? '#FEF3C7' : '#F1F5F9',
    color: variant === 'az' ? '#92400E' : '#64748B',
  }),
  costBadge: {
    fontFamily: "'Courier New', monospace", fontSize: 12,
    fontWeight: 700, color: C.gold,
  },
  numInput: {
    fontFamily: "'Courier New', monospace", fontSize: 12,
    padding: '4px 8px', width: 80, border: `1px solid ${C.beigeLight}`,
    borderRadius: 6, background: C.cream, color: C.ink, outline: 'none',
  },
  addForm: {
    display: 'grid',
    gridTemplateColumns: '2fr .65fr .8fr .75fr .9fr 1fr auto',
    gap: 8, alignItems: 'end', padding: '12px 14px',
    background: C.cream, borderTop: `1px solid ${C.beigeLight}`,
  },
  addField: { display: 'flex', flexDirection: 'column', gap: 3 },
  addLabel: {
    fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted,
  },
  addInput: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none', width: '100%',
    boxSizing: 'border-box',
  },
  addSelect: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none', width: '100%',
  },
  hint: {
    padding: '6px 14px 10px', fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted,
  },
  // Cost entry modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,18,24,.58)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    backdropFilter: 'blur(8px)', padding: 20,
  },
  modal: {
    background: C.white, border: `1px solid ${C.beigeLight}`,
    borderRadius: 20, boxShadow: '0 28px 64px rgba(20,18,24,.28)',
    padding: 24, width: '100%', maxWidth: 520,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, background: C.beigeLight, margin: '0 auto 16px' },
  modalTitle: { fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 16 },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  modalField: { display: 'flex', flexDirection: 'column', gap: 4 },
  modalLabel: { fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' },
  modalInput: {
    fontFamily: 'DM Sans', fontSize: 14, padding: '8px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  computedCost: {
    background: C.cream, border: `1px solid ${C.beigeLight}`,
    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
    fontFamily: 'DM Sans', fontSize: 13, color: C.textSecond,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  computedVal: { fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: C.gold },
};

// ─── IngRow ──────────────────────────────────────────────────────────────────
function IngRow({ ing, idx, isEven, canDrag, onAddCost, onDragStart, onDragEnd, onDragOver }) {
  const uc   = latestUnitCost(ing);
  const lc   = latestCost(ing);
  const az   = isAmazon(ing);

  return (
    <tr
      draggable={canDrag}
      onDragStart={e => onDragStart(e, ing.id)}
      onDragEnd={onDragEnd}
      onDragOver={e => onDragOver(e, ing.id)}
      style={{ background: isEven ? C.white : '#FDFAF6' }}
    >
      <td style={{ ...s.td, width: 28, textAlign: 'center', color: C.beigeLight, cursor: canDrag ? 'grab' : 'default', fontSize: 14 }}>
        {canDrag ? '⠿' : '·'}
      </td>
      <td style={s.td}>
        {ing.name}
        <span style={s.tag(az ? 'az' : 'mn')}>{az ? 'Amazon' : 'manual'}</span>
      </td>
      <td style={{ ...s.td, color: C.textMuted }}>{ing.unit}</td>
      <td style={{ ...s.td, fontFamily: "'Courier New',monospace", fontSize: 12 }}>
        {lc ? `${lc.pkgSize} × ${lc.qtyBought}` : '—'}
      </td>
      <td style={{ ...s.td, fontFamily: "'Courier New',monospace", fontSize: 12 }}>
        {lc ? fmt2(lc.totalPaid) : '—'}
      </td>
      <td style={s.td}>
        {uc !== null
          ? <span style={s.costBadge}>{fmt4(uc)}</span>
          : <span style={{ color: C.textMuted, fontSize: 12 }}>no cost yet</span>
        }
      </td>
      <td style={{ ...s.td, color: C.textMuted, fontSize: 12 }}>
        {latestSource(ing)}
      </td>
      <td style={s.td}>
        <button style={{ fontFamily: 'DM Sans', fontSize: 11, padding: '3px 10px', background: 'transparent', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 4, cursor: 'pointer' }} onClick={() => onAddCost(ing)}>
          + Cost
        </button>
      </td>
    </tr>
  );
}

// ─── AddCostModal ─────────────────────────────────────────────────────────────
function AddCostModal({ ingredient, locationId, onClose, onSaved }) {
  const [form, setForm] = useState({ pkgSize: '', qtyBought: '1', totalPaid: '', purchaseDate: new Date().toISOString().split('T')[0], invoiceRef: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const computed = (form.pkgSize && form.qtyBought && form.totalPaid)
    ? parseFloat(form.totalPaid) / (parseFloat(form.pkgSize) * parseFloat(form.qtyBought))
    : null;

  const handleSave = async () => {
    if (!computed) return;
    setSaving(true);
    setError(null);
    try {
      await api.addIngredientCost(ingredient.id, locationId, {
        pkgSize:      parseFloat(form.pkgSize),
        qtyBought:    parseInt(form.qtyBought),
        totalPaid:    parseFloat(form.totalPaid),
        purchaseDate: form.purchaseDate,
        invoiceRef:   form.invoiceRef || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHandle} />
        <div style={s.modalTitle}>Add cost — {ingredient.name}</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
          Buy unit: <strong>{ingredient.unit}</strong>. Enter the purchase details from your invoice.
        </div>
        <div style={s.modalGrid}>
          <div style={s.modalField}>
            <span style={s.modalLabel}>Package size ({ingredient.unit})</span>
            <input style={s.modalInput} type="number" value={form.pkgSize} onChange={set('pkgSize')} placeholder="e.g. 64" />
          </div>
          <div style={s.modalField}>
            <span style={s.modalLabel}>Qty bought</span>
            <input style={s.modalInput} type="number" value={form.qtyBought} onChange={set('qtyBought')} placeholder="e.g. 30" min="1" />
          </div>
          <div style={s.modalField}>
            <span style={s.modalLabel}>Total paid ($)</span>
            <input style={s.modalInput} type="number" value={form.totalPaid} onChange={set('totalPaid')} placeholder="e.g. 158.10" step="0.01" />
          </div>
          <div style={s.modalField}>
            <span style={s.modalLabel}>Purchase date</span>
            <input style={s.modalInput} type="date" value={form.purchaseDate} onChange={set('purchaseDate')} />
          </div>
        </div>
        <div style={s.modalField}>
          <span style={s.modalLabel}>Invoice ref (optional)</span>
          <input style={{ ...s.modalInput, width: '100%', boxSizing: 'border-box', marginBottom: 14 }} type="text" value={form.invoiceRef} onChange={set('invoiceRef')} placeholder="AMZ-2026-05 or WB-001" />
        </div>
        {computed !== null && (
          <div style={s.computedCost}>
            <span>Cost per {ingredient.unit}</span>
            <span style={s.computedVal}>${computed.toFixed(6)}</span>
          </div>
        )}
        {error && <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#d32f2f', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ fontFamily: 'DM Sans', fontSize: 13, padding: '8px 14px', background: 'transparent', color: C.ink, border: `1px solid ${C.beigeLight}`, borderRadius: 8, cursor: 'pointer', flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            style={{ ...ui.button, flex: 1, opacity: (!computed || saving) ? 0.5 : 1 }}
            onClick={handleSave} disabled={!computed || saving}
          >
            {saving ? 'Saving…' : 'Save cost'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────
export default function IngredientsView({ locationId, user }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [search,     setSearch]       = useState('');
  const [groupBy,    setGroupBy]      = useState('none');
  const [sortCol,    setSortCol]      = useState(null);
  const [sortDir,    setSortDir]      = useState('asc');
  const [addModal,   setAddModal]     = useState(null);
  const [newIng,     setNewIng]       = useState({ name: '', unit: 'oz', notes: '' });
  const [adding,     setAdding]       = useState(false);
  const dragId  = useRef(null);
  const dragOver = useRef(null);

  const load = () => {
    setLoading(true);
    api.getIngredients(1, 200)
      .then(res => { setIngredients(res.data?.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newIng.name.trim()) return;
    setAdding(true);
    try {
      await api.createIngredient({ name: newIng.name.trim(), unit: newIng.unit, notes: newIng.notes || undefined });
      setNewIng({ name: '', unit: 'oz', notes: '' });
      load();
    } catch { }
    setAdding(false);
  };

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const onDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };
  const onDragEnd = e => {
    e.currentTarget.style.opacity = '1';
    dragId.current = null; dragOver.current = null;
  };
  const onDragOver = (e, id) => { e.preventDefault(); dragOver.current = id; };

  // Filter → sort → group
  const filtered = ingredients.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.unit.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    const av = sortCol === 'name' ? a.name.toLowerCase()
             : sortCol === 'unit' ? a.unit
             : sortCol === 'cost' ? (latestUnitCost(a) ?? -1)
             : latestSource(a).toLowerCase();
    const bv = sortCol === 'name' ? b.name.toLowerCase()
             : sortCol === 'unit' ? b.unit
             : sortCol === 'cost' ? (latestUnitCost(b) ?? -1)
             : latestSource(b).toLowerCase();
    return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0)
                             : (av > bv ? -1 : av < bv ? 1 : 0);
  }) : filtered;

  const grouped = groupBy !== 'none' ? (() => {
    const map = {};
    sorted.forEach(i => {
      const key = groupBy === 'unit' ? i.unit : (isAmazon(i) ? 'Amazon Fresh' : 'Manual');
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.keys(map).sort().map(k => ({ key: k, items: map[k] }));
  })() : null;

  const SortArrow = ({ col }) =>
    sortCol !== col
      ? <span style={{ marginLeft: 4, color: C.beigeLight }}>⇅</span>
      : <span style={{ marginLeft: 4, color: C.gold }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;

  const canDrag = groupBy === 'none' && !sortCol;

  const renderRows = (list) => list.map((ing, idx) => (
    <IngRow
      key={ing.id} ing={ing} idx={idx} isEven={idx % 2 === 0}
      canDrag={canDrag}
      onAddCost={setAddModal}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}
    />
  ));

  return (
    <div style={s.page}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Filter ingredients…" style={s.search} />
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted }}>Group:</span>
        {[['none','None'],['unit','By unit'],['source','By source']].map(([v,l]) => (
          <button key={v} style={s.groupBtn(groupBy === v)} onClick={() => setGroupBy(v)}>{l}</button>
        ))}
        {sortCol && (
          <button style={s.groupBtn(false)} onClick={() => setSortCol(null)}>✕ Clear sort</button>
        )}
        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, marginLeft: 'auto' }}>
          {canDrag ? '⠿ Drag to reorder' : 'Click headers to sort'}
        </span>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 28 }} />
                <th style={{ ...s.th, ...s.thSort }} onClick={() => toggleSort('name')}>
                  Ingredient <SortArrow col="name" />
                </th>
                <th style={{ ...s.th, ...s.thSort }} onClick={() => toggleSort('unit')}>
                  Buy unit <SortArrow col="unit" />
                </th>
                <th style={s.th}>Pkg size × qty</th>
                <th style={s.th}>Total paid</th>
                <th style={{ ...s.th, ...s.thSort }} onClick={() => toggleSort('cost')}>
                  Cost / unit <SortArrow col="cost" />
                </th>
                <th style={{ ...s.th, ...s.thSort }} onClick={() => toggleSort('source')}>
                  Source <SortArrow col="source" />
                </th>
                <th style={s.th} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: C.textMuted, padding: 28 }}>Loading ingredients…</td></tr>
              )}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: C.textMuted, padding: 28 }}>
                  No ingredients yet. Add one below.
                </td></tr>
              )}
              {!loading && grouped
                ? grouped.map(({ key, items }) => [
                    <tr key={`gh-${key}`}>
                      <td colSpan={8} style={{ ...s.groupHeader }}>
                        <span>{key}</span>
                        <span style={s.groupCount}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      </td>
                    </tr>,
                    ...renderRows(items),
                  ])
                : renderRows(sorted)
              }
            </tbody>
          </table>
        </div>

        {/* Add ingredient form */}
        <div style={s.addForm}>
          <div style={s.addField}>
            <span style={s.addLabel}>Ingredient name</span>
            <input style={s.addInput} value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Oatly Oat Milk" />
          </div>
          <div style={s.addField}>
            <span style={s.addLabel}>Buy unit</span>
            <select style={s.addSelect} value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}>
              {ALL_UNITS.map(u => <option key={u} value={u}>{u} — {UOM_TABLE[u]?.label}</option>)}
            </select>
          </div>
          <div style={{ ...s.addField, gridColumn: 'span 4' }}>
            <span style={s.addLabel}>Notes / source</span>
            <input style={s.addInput} value={newIng.notes} onChange={e => setNewIng(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Amazon Fresh, 64oz carton" />
          </div>
          <button style={{ ...ui.button, alignSelf: 'flex-end' }} onClick={handleAdd} disabled={adding}>
            {adding ? '…' : '+ Add'}
          </button>
        </div>
        <div style={s.hint}>
          After adding an ingredient, click <strong>+ Cost</strong> on the row to enter invoice pricing.
          Cost per unit is calculated automatically: total paid ÷ (pkg size × qty bought).
        </div>
      </div>

      {/* Add cost modal */}
      {addModal && (
        <AddCostModal
          ingredient={addModal}
          locationId={locationId}
          onClose={() => setAddModal(null)}
          onSaved={() => { setAddModal(null); load(); }}
        />
      )}
    </div>
  );
}
