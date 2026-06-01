// src/modules/catalog/RecipesView.jsx
import { useState, useEffect } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import {
  cpuIn, cogsOf, marginOf, marginColor, marginBg,
  compatibleUnits, convert, canConvert, UOM_TABLE,
} from '../../shared/uom.js';
import { api } from '../../api.js';

const CATS = ['Signature Espresso','Matcha & Chai','Wanderlust','Espresso Basics','Refreshers','Frappes & Smoothies','Tea Selection','Grab N Go','Pastries'];
const fmt2 = n => `$${Number(n).toFixed(2)}`;
const fmt4 = n => `$${Number(n).toFixed(4)}`;
const fmtPct = p => p === null ? '—' : `${p.toFixed(1)}%`;

const s = {
  shell: { display: 'flex', height: '100%', background: C.cream },
  left: {
    width: 240, background: C.white, borderRight: `1px solid ${C.beigeLight}`,
    flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto',
  },
  leftSearch: {
    padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 14,
    border: 'none', borderBottom: `1px solid ${C.beigeLight}`,
    background: C.cream, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  leftFilter: {
    padding: '6px 12px', fontFamily: 'DM Sans', fontSize: 12,
    border: 'none', borderBottom: `1px solid ${C.beigeLight}`,
    background: C.cream, outline: 'none', width: '100%',
  },
  recipeItem: (active) => ({
    padding: '10px 14px', borderBottom: `1px solid ${C.beigeLight}`,
    cursor: 'pointer', background: active ? C.cream : C.white,
    borderLeft: `3px solid ${active ? C.gold : 'transparent'}`,
  }),
  recipeName: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: C.ink },
  recipeCat:  { fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, marginTop: 1 },
  recipeMargin: (pct) => ({
    fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 700,
    color: marginColor(pct),
  }),
  recipeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  leftFooter: {
    padding: 10, borderTop: `1px solid ${C.beigeLight}`,
    background: C.cream, display: 'flex', flexDirection: 'column', gap: 6,
  },
  leftInput: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  right: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 },
  metaCard: {
    ...ui.card, padding: '12px 16px', textAlign: 'center',
  },
  metaLabel: { fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 },
  metaVal: (color) => ({ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, color: color ?? C.ink }),
  priceInput: {
    fontFamily: "'Courier New',monospace", fontSize: 20, fontWeight: 700,
    border: 'none', borderBottom: `2px solid ${C.beigeLight}`, borderRadius: 0,
    background: 'transparent', color: C.ink, outline: 'none',
    width: 80, textAlign: 'center', padding: '2px 4px',
  },
  profitLine: { fontFamily: 'DM Sans', fontSize: 12, color: C.textSecond, marginBottom: 20 },
  ingTable: { ...ui.card, overflow: 'hidden', marginBottom: 16 },
  th: {
    padding: '7px 12px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted,
    background: C.cream, borderBottom: `1px solid ${C.beigeLight}`, textAlign: 'left',
  },
  td: {
    padding: '8px 12px', borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: 'DM Sans', fontSize: 13, color: C.ink, verticalAlign: 'middle',
  },
  convTag: {
    display: 'inline-block', fontSize: 10, padding: '1px 6px', borderRadius: 4,
    fontWeight: 600, marginLeft: 6, background: '#EDE9FE', color: '#5B21B6',
  },
  addIngRow: {
    display: 'flex', gap: 8, alignItems: 'flex-end',
    padding: '12px 14px', background: C.cream,
    borderTop: `1px solid ${C.beigeLight}`, flexWrap: 'wrap',
  },
  addField: { display: 'flex', flexDirection: 'column', gap: 3 },
  addLabel: { fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted },
  addSelect: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none',
  },
  addInput: {
    fontFamily: 'DM Sans', fontSize: 13, padding: '6px 10px',
    border: `1px solid ${C.beigeLight}`, borderRadius: 8,
    background: C.white, color: C.ink, outline: 'none', width: 70,
  },
  convHint: {
    fontSize: 11, color: '#5B21B6', background: '#EDE9FE',
    padding: '3px 10px', borderRadius: 4, display: 'inline-block', marginTop: 6,
  },
  pillTag: (pct) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: 100,
    fontSize: 12, fontWeight: 700, fontFamily: "'Courier New',monospace",
    background: marginBg(pct), color: marginColor(pct),
  }),
  empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, color: C.textMuted, fontFamily: 'DM Sans', fontSize: 13,
  },
};

function RecipeDetail({ recipe, ingMap, allIngredients, locationId, onUpdated }) {
  const [price,     setPrice]   = useState(recipe.sellPrice ?? 0);
  const [addIng,    setAddIng]  = useState('');
  const [addQty,    setAddQty]  = useState('1');
  const [addUnit,   setAddUnit] = useState('');
  const [saving,    setSaving]  = useState(false);

  const selectedIng = allIngredients.find(i => i.id === addIng);

  const cogs   = cogsOf(recipe, ingMap);
  const margin = marginOf(recipe, ingMap);

  const handlePriceBlur = async () => {
    try { await api.updateRecipe(recipe.id, { sellPrice: parseFloat(price) || 0 }); onUpdated(); }
    catch {}
  };

  const handleAdd = async () => {
    if (!addIng || !addQty) return;
    setSaving(true);
    try {
      await api.addRecipeIngredient(recipe.id, {
        ingredientId: addIng,
        quantity: parseFloat(addQty),
        useUnit: addUnit || selectedIng?.unit,
      });
      setAddIng(''); setAddQty('1'); setAddUnit('');
      onUpdated();
    } catch {}
    setSaving(false);
  };

  const handleRemove = async (ingredientId) => {
    try { await api.removeRecipeIngredient(recipe.id, ingredientId); onUpdated(); }
    catch {}
  };

  const available = allIngredients.filter(i => !(recipe.ingredients ?? []).find(ri => ri.ingredientId === i.id));

  return (
    <div style={s.right}>
      {/* Metrics */}
      <div style={s.metaGrid}>
        <div style={s.metaCard}>
          <div style={s.metaLabel}>COGS</div>
          <div style={s.metaVal(C.gold)}>
            {recipe.ingredients?.length ? fmt2(cogs) : '—'}
          </div>
        </div>
        <div style={s.metaCard}>
          <div style={s.metaLabel}>Sell price</div>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700 }}>
            <span style={{ fontSize: 14, color: C.textMuted }}>$</span>
            <input
              style={s.priceInput} type="number"
              value={Number(price).toFixed(2)} step="0.25" min="0"
              onChange={e => setPrice(e.target.value)}
              onBlur={handlePriceBlur}
            />
          </div>
        </div>
        <div style={s.metaCard}>
          <div style={s.metaLabel}>Margin</div>
          <div style={s.metaVal()}>
            <span style={s.pillTag(margin)}>{fmtPct(margin)}</span>
          </div>
        </div>
      </div>

      {recipe.ingredients?.length > 0 && (
        <div style={s.profitLine}>
          Profit per item: <strong>{fmt2(price - cogs)}</strong> ·
          COGS is <strong>{price > 0 ? ((cogs / price) * 100).toFixed(1) : '—'}%</strong> of sell price
        </div>
      )}
      {!recipe.ingredients?.length && (
        <div style={{ ...s.profitLine, color: '#d4a574' }}>
          ⚠ No ingredients yet — add them below to calculate real margin
        </div>
      )}

      {/* Ingredient table */}
      <div style={s.ingTable}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Ingredient','Qty','Use unit','Bought in','Cost/use-unit','Line cost',''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!recipe.ingredients?.length && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: C.textMuted, padding: 20 }}>
                Add your first ingredient below
              </td></tr>
            )}
            {(recipe.ingredients ?? []).map(ri => {
              const ing = ingMap[ri.ingredientId];
              if (!ing) return null;
              const useUnit = ri.useUnit || ing.unit;
              const uc = cpuIn(ing, useUnit);
              const isConv = useUnit !== ing.unit;
              const compat = canConvert(ing.unit, useUnit);
              return (
                <tr key={ri.id ?? ri.ingredientId}>
                  <td style={s.td}>
                    {ing.name}
                    {isConv && compat && <span style={s.convTag}>⇄</span>}
                    {isConv && !compat && <span style={{ ...s.convTag, background: '#FEE2E2', color: '#991B1B' }}>⚠</span>}
                  </td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace" }}>{ri.quantity}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>{useUnit}</td>
                  <td style={{ ...s.td, color: C.textMuted, fontSize: 11 }}>{ing.unit}</td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace", fontSize: 11, color: isConv && compat ? '#5B21B6' : C.textMuted }}>
                    {compat ? fmt4(uc) : <span style={{ color: '#d32f2f' }}>n/a</span>}
                  </td>
                  <td style={{ ...s.td, fontFamily: "'Courier New',monospace", fontWeight: 600 }}>
                    {compat ? fmt2(uc * ri.quantity) : <span style={{ color: '#d32f2f', fontSize: 11 }}>fix unit</span>}
                  </td>
                  <td style={s.td}>
                    <button
                      style={{ fontFamily: 'DM Sans', fontSize: 11, padding: '2px 8px', background: '#FDEDEC', color: '#d32f2f', border: `1px solid #FCA5A5`, borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => handleRemove(ri.ingredientId)}
                    >✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add ingredient */}
        <div style={s.addIngRow}>
          <div style={s.addField}>
            <span style={s.addLabel}>Add ingredient</span>
            <select style={{ ...s.addSelect, width: 220 }} value={addIng}
              onChange={e => { setAddIng(e.target.value); const ing = allIngredients.find(i => i.id === e.target.value); setAddUnit(ing?.unit ?? ''); }}>
              <option value="">— choose —</option>
              {available.map(i => <option key={i.id} value={i.id}>{i.name} (buy: {i.unit})</option>)}
            </select>
          </div>
          <div style={s.addField}>
            <span style={s.addLabel}>Qty</span>
            <input style={s.addInput} type="number" value={addQty} step="0.5" min="0" onChange={e => setAddQty(e.target.value)} />
          </div>
          <div style={s.addField}>
            <span style={s.addLabel}>Use unit</span>
            <select style={{ ...s.addSelect, width: 100 }} value={addUnit}
              onChange={e => setAddUnit(e.target.value)}
              disabled={!selectedIng}>
              {selectedIng
                ? compatibleUnits(selectedIng.unit).map(u => <option key={u} value={u}>{u}</option>)
                : <option value="">—</option>
              }
            </select>
          </div>
          <button style={{ ...ui.button, alignSelf: 'flex-end', opacity: saving ? 0.6 : 1 }} onClick={handleAdd} disabled={saving}>
            + Add
          </button>
          {selectedIng && addUnit && addUnit !== selectedIng.unit && (
            <div style={{ width: '100%' }}>
              <span style={s.convHint}>
                ⇄ 1 {selectedIng.unit} = {convert(selectedIng.unit, addUnit)?.toFixed(4)} {addUnit} — cost converts automatically
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecipesView({ locationId, user }) {
  const [recipes,     setRecipes]     = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [ingMap,      setIngMap]      = useState({});
  const [selId,       setSelId]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [newName,     setNewName]     = useState('');
  const [newCat,      setNewCat]      = useState(CATS[0]);
  const [adding,      setAdding]      = useState(false);

  const load = () => {
    Promise.all([
      api.getRecipes(locationId, 1, 200),
      api.getIngredients(1, 200),
    ]).then(([rRes, iRes]) => {
      const ings = iRes.data?.items ?? [];
      const nextRecipes = rRes.data?.items ?? [];
      setIngredients(ings);
      setIngMap(Object.fromEntries(ings.map(i => [i.id, i])));
      setRecipes(nextRecipes);
      setSelId(currentSelId => nextRecipes.some(recipe => recipe.id === currentSelId)
        ? currentSelId
        : (nextRecipes[0]?.id ?? null));
    }).catch(() => {});
  };

  useEffect(() => { if (locationId) load(); }, [locationId]);

  const filtered = recipes.filter(r =>
    (!catFilter || r.category === catFilter) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!newName.trim() || !locationId) return;
    setAdding(true);
    try {
      const res = await api.createRecipe({ name: newName.trim(), category: newCat, locationId });
      setNewName('');
      load();
      setSelId(res.data?.id);
    } catch {}
    setAdding(false);
  };

  const selRecipe = recipes.find(r => r.id === selId) ?? null;

  return (
    <div style={{ ...s.shell, height: 'calc(100vh - 52px)' }}>
      {/* Left panel */}
      <div style={s.left}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search recipes…" style={s.leftSearch} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={s.leftFilter}>
          <option value="">All categories ({recipes.length})</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 14px', fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted }}>
              No recipes yet.
            </div>
          )}
          {filtered.map(r => {
            const m = marginOf(r, ingMap);
            return (
              <div key={r.id} style={s.recipeItem(selId === r.id)} onClick={() => setSelId(r.id)}>
                <div style={s.recipeRow}>
                  <div style={s.recipeName}>{r.name}</div>
                  <div style={s.recipeMargin(m)}>{fmtPct(m)}</div>
                </div>
                <div style={s.recipeCat}>{r.category}</div>
              </div>
            );
          })}
        </div>
        <div style={s.leftFooter}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="New recipe name…" style={s.leftInput} />
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ ...s.leftInput, fontSize: 12 }}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <button style={{ ...ui.button, width: '100%', fontSize: 12, opacity: adding ? 0.6 : 1 }}
            onClick={handleCreate} disabled={adding}>
            {adding ? '…' : '+ New recipe'}
          </button>
        </div>
      </div>

      {/* Right panel */}
      {!selRecipe
        ? <div style={s.empty}>← Select a recipe to build its ingredient list</div>
        : <RecipeDetail
            key={selRecipe.id}
            recipe={selRecipe}
            ingMap={ingMap}
            allIngredients={ingredients}
            locationId={locationId}
            onUpdated={load}
          />
      }
    </div>
  );
}
