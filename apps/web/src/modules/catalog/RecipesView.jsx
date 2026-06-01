import { useEffect, useState } from 'react';
import { tokens as C, ui } from '../../shared/styles.js';
import {
  cpuIn,
  cogsOf,
  marginOf,
  marginColor,
  marginBg,
  compatibleUnits,
  canConvert,
} from '../../shared/uom.js';
import { useResponsive } from '../../shared/useResponsive.js';
import { api } from '../../api.js';

const CATS = [
  'Signature Espresso',
  'Matcha & Chai',
  'Wanderlust',
  'Espresso Basics',
  'Refreshers',
  'Frappes & Smoothies',
  'Tea Selection',
  'Grab N Go',
  'Pastries',
];

const fmt2 = (n) => `$${Number(n).toFixed(2)}`;
const fmt4 = (n) => `$${Number(n).toFixed(4)}`;
const fmtPct = (p) => (p === null ? '—' : `${p.toFixed(1)}%`);

function IngredientCard({ ri, ingMap, onRemove }) {
  const ing = ingMap[ri.ingredientId];
  if (!ing) return null;

  const useUnit = ri.useUnit || ing.unit;
  const unitCost = cpuIn(ing, useUnit);
  const compat = canConvert(ing.unit, useUnit);

  return (
    <div style={{ ...ui.card, padding: '10px 12px', marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
          {ing.name}
          {useUnit !== ing.unit && compat && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginLeft: 6, background: '#EDE9FE', color: '#5B21B6' }}>
              ⇄
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          {ri.quantity} {useUnit}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700, color: C.gold }}>
          {compat ? fmt2(unitCost * ri.quantity) : '—'}
        </div>
        <button
          onClick={() => onRemove(ri.ingredientId)}
          style={{ fontSize: 11, padding: '2px 8px', marginTop: 4, background: '#FDEDEC', color: C.colors.danger, border: '1px solid #FCA5A5', borderRadius: 4, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function RecipeDetail({ recipe, ingMap, allIngredients, locationId, isMobile, onUpdated }) {
  const [price, setPrice] = useState(recipe.sellPrice ?? 0);
  const [addIng, setAddIng] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addUnit, setAddUnit] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedIng = allIngredients.find((i) => i.id === addIng);
  const cogs = cogsOf(recipe, ingMap);
  const margin = marginOf(recipe, ingMap);

  const available = allIngredients.filter(
    (i) => !(recipe.ingredients ?? []).find((ri) => ri.ingredientId === i.id),
  );

  async function handlePriceBlur() {
    try {
      await api.updateRecipe(recipe.id, { sellPrice: parseFloat(price) || 0 });
      onUpdated();
    } catch {
      // no-op
    }
  }

  async function handleAdd() {
    if (!addIng || !addQty) return;
    setSaving(true);
    try {
      await api.addRecipeIngredient(recipe.id, {
        ingredientId: addIng,
        quantity: parseFloat(addQty),
        useUnit: addUnit || selectedIng?.unit,
      });
      setAddIng('');
      setAddQty('1');
      setAddUnit('');
      onUpdated();
    } catch {
      // no-op
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(ingredientId) {
    try {
      await api.removeRecipeIngredient(recipe.id, ingredientId);
      onUpdated();
    } catch {
      // no-op
    }
  }

  const thStyle = {
    padding: '6px 10px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.textMuted,
    background: C.cream,
    borderBottom: `1px solid ${C.beigeLight}`,
    textAlign: 'left',
  };

  const tdStyle = {
    padding: '8px 10px',
    borderBottom: `1px solid ${C.beigeLight}`,
    fontSize: 12,
    color: C.ink,
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: isMobile ? 14 : '20px 24px', overflowY: 'auto', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: C.fonts.heading, fontSize: isMobile ? 18 : 22, fontWeight: 700, marginBottom: 4 }}>{recipe.name}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>{recipe.category}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 14 }}>
        <div style={{ ...ui.card, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 3 }}>COGS</div>
          <div style={{ fontFamily: C.fonts.heading, fontSize: 19, fontWeight: 700, color: C.gold }}>
            {recipe.ingredients?.length ? fmt2(cogs) : '—'}
          </div>
        </div>
        <div style={{ ...ui.card, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 3 }}>Price</div>
          <div style={{ fontFamily: C.fonts.heading, fontSize: 19, fontWeight: 700 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>$</span>
            <input
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 18,
                fontWeight: 700,
                border: 'none',
                borderBottom: `2px solid ${C.beigeLight}`,
                borderRadius: 0,
                background: 'transparent',
                color: C.ink,
                outline: 'none',
                width: 64,
                textAlign: 'center',
                padding: '2px 4px',
              }}
              type='number'
              value={Number(price).toFixed(2)}
              step='0.25'
              min='0'
              onChange={(e) => setPrice(e.target.value)}
              onBlur={handlePriceBlur}
            />
          </div>
        </div>
        <div style={{ ...ui.card, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 3 }}>Margin</div>
          <div style={{ fontFamily: C.fonts.heading, fontSize: 19, fontWeight: 700 }}>
            <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 100, fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace", background: marginBg(margin), color: marginColor(margin) }}>
              {fmtPct(margin)}
            </span>
          </div>
        </div>
      </div>

      {recipe.ingredients?.length ? (
        <div style={{ fontSize: 12, color: C.textSecond, marginBottom: 14 }}>
          Profit per item: <strong>{fmt2(Number(price) - cogs)}</strong>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.colors.warn, marginBottom: 14 }}>No ingredients yet — add below to calculate margin</div>
      )}

      <div style={{ ...ui.card, overflow: 'hidden', marginBottom: 14 }}>
        {isMobile ? (
          <div style={{ padding: 8 }}>
            {!(recipe.ingredients?.length) && (
              <div style={{ padding: '16px 0', fontSize: 13, color: C.textMuted, textAlign: 'center' }}>Add your first ingredient below</div>
            )}
            {(recipe.ingredients ?? []).map((ri) => (
              <IngredientCard key={ri.id ?? ri.ingredientId} ri={ri} ingMap={ingMap} onRemove={handleRemove} />
            ))}
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ingredient', 'Qty', 'Use unit', 'Buy unit', 'Cost/unit', 'Line cost', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!(recipe.ingredients?.length) && (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: C.textMuted, padding: 20 }}>
                      Add your first ingredient below
                    </td>
                  </tr>
                )}
                {(recipe.ingredients ?? []).map((ri) => {
                  const ing = ingMap[ri.ingredientId];
                  if (!ing) return null;
                  const useUnit = ri.useUnit || ing.unit;
                  const unitCost = cpuIn(ing, useUnit);
                  const compat = canConvert(ing.unit, useUnit);
                  return (
                    <tr key={ri.id ?? ri.ingredientId}>
                      <td style={tdStyle}>
                        {ing.name}
                        {useUnit !== ing.unit && compat && (
                          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginLeft: 5, background: '#EDE9FE', color: '#5B21B6' }}>⇄</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "'Courier New', monospace" }}>{ri.quantity}</td>
                      <td style={{ ...tdStyle, color: C.textMuted }}>{useUnit}</td>
                      <td style={{ ...tdStyle, color: C.textMuted, fontSize: 11 }}>{ing.unit}</td>
                      <td style={{ ...tdStyle, fontFamily: "'Courier New', monospace", fontSize: 11 }}>
                        {compat ? fmt4(unitCost) : <span style={{ color: C.colors.danger }}>fix unit</span>}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "'Courier New', monospace", fontWeight: 600 }}>
                        {compat ? fmt2(unitCost * ri.quantity) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleRemove(ri.ingredientId)}
                          style={{ fontSize: 11, padding: '2px 8px', background: '#FDEDEC', color: C.colors.danger, border: '1px solid #FCA5A5', borderRadius: 4, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px', background: C.cream, borderTop: `1px solid ${C.beigeLight}`, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: isMobile ? '1 1 100%' : undefined }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted }}>Add ingredient</span>
            <select
              style={{ fontSize: 13, padding: '6px 8px', border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white, color: C.ink, outline: 'none', width: isMobile ? '100%' : 220 }}
              value={addIng}
              onChange={(e) => {
                setAddIng(e.target.value);
                const ing = allIngredients.find((item) => item.id === e.target.value);
                setAddUnit(ing?.unit || '');
              }}
            >
              <option value=''>— choose —</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted }}>Qty</span>
            <input
              style={{ fontSize: 13, padding: '6px 8px', border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white, color: C.ink, outline: 'none', width: 64 }}
              type='number'
              value={addQty}
              step='0.5'
              min='0'
              onChange={(e) => setAddQty(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textMuted }}>Unit</span>
            <select
              style={{ fontSize: 13, padding: '6px 8px', border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white, color: C.ink, outline: 'none', width: 90 }}
              value={addUnit}
              onChange={(e) => setAddUnit(e.target.value)}
              disabled={!selectedIng}
            >
              {selectedIng ? compatibleUnits(selectedIng.unit).map((u) => <option key={u} value={u}>{u}</option>) : <option value=''>—</option>}
            </select>
          </div>
          <button
            style={{ ...ui.button, alignSelf: 'flex-end', background: C.colors.ink, color: '#fff', opacity: saving ? 0.6 : 1 }}
            onClick={handleAdd}
            disabled={saving}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeList({ recipes, ingMap, selected, isMobile, onSelect, onCreated, locationId }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState(CATS[0]);
  const [adding, setAdding] = useState(false);

  const filtered = recipes.filter(
    (r) => (!cat || r.category === cat) && (!search || r.name.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleCreate() {
    if (!newName.trim() || !locationId) return;
    setAdding(true);
    try {
      const res = await api.createRecipe({ name: newName.trim(), category: newCat, locationId });
      setNewName('');
      onCreated(res.data?.id);
    } catch {
      // no-op
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search recipes...'
        style={{ padding: '10px 12px', fontSize: 14, border: 'none', borderBottom: `1px solid ${C.beigeLight}`, background: C.cream, outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      <select
        value={cat}
        onChange={(e) => setCat(e.target.value)}
        style={{ padding: '7px 12px', fontSize: 12, border: 'none', borderBottom: `1px solid ${C.beigeLight}`, background: C.cream, outline: 'none', width: '100%' }}
      >
        <option value=''>All categories ({recipes.length})</option>
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && <div style={{ padding: '20px 14px', fontSize: 12, color: C.textMuted }}>No recipes yet.</div>}
        {filtered.map((r) => {
          const m = marginOf(r, ingMap);
          return (
            <div
              key={r.id}
              style={{ padding: '11px 14px', borderBottom: `1px solid ${C.beigeLight}`, cursor: 'pointer', background: selected === r.id && !isMobile ? C.cream : C.white, borderLeft: `3px solid ${selected === r.id && !isMobile ? C.gold : 'transparent'}` }}
              onClick={() => onSelect(r.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{r.name}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, color: marginColor(m) }}>{fmtPct(m)}</div>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{r.category}</div>
              {isMobile && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Tap to edit</div>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 10, borderTop: `1px solid ${C.beigeLight}`, background: C.cream, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New recipe name...'
          style={{ fontSize: 13, padding: '7px 10px', border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white, color: C.ink, outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
        <select
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          style={{ fontSize: 12, padding: '7px 10px', border: `1px solid ${C.beigeLight}`, borderRadius: 8, background: C.white, color: C.ink, outline: 'none', width: '100%', boxSizing: 'border-box' }}
        >
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button style={{ ...ui.button, width: '100%', fontSize: 12, background: C.colors.ink, color: '#fff', opacity: adding ? 0.6 : 1 }} onClick={handleCreate} disabled={adding}>
          {adding ? '...' : '+ New recipe'}
        </button>
      </div>
    </>
  );
}

export default function RecipesView({ locationId }) {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [ingMap, setIngMap] = useState({});
  const [selId, setSelId] = useState(null);
  const [mobilePanel, setMobilePanel] = useState('list');
  const { isMobile } = useResponsive();

  const load = () => {
    Promise.all([api.getRecipes(locationId, 1, 200), api.getIngredients(1, 200)])
      .then(([rRes, iRes]) => {
        const nextIngredients = iRes.data?.items ?? [];
        const nextRecipes = rRes.data?.items ?? [];
        setIngredients(nextIngredients);
        setIngMap(Object.fromEntries(nextIngredients.map((i) => [i.id, i])));
        setRecipes(nextRecipes);
        setSelId((currentSelId) =>
          nextRecipes.some((recipe) => recipe.id === currentSelId)
            ? currentSelId
            : (nextRecipes[0]?.id ?? null),
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (locationId) load();
  }, [locationId]);

  const selRecipe = recipes.find((r) => r.id === selId) ?? null;

  function handleSelect(id) {
    setSelId(id);
    if (isMobile) setMobilePanel('detail');
  }

  function handleCreated(id) {
    load();
    if (id) {
      setSelId(id);
      if (isMobile) setMobilePanel('detail');
    }
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.cream }}>
        {mobilePanel === 'list' || !selRecipe ? (
          <div style={{ flex: 1, background: C.white, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <RecipeList
              recipes={recipes}
              ingMap={ingMap}
              selected={selId}
              isMobile
              onSelect={handleSelect}
              onCreated={handleCreated}
              locationId={locationId}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <button
              onClick={() => setMobilePanel('list')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', borderBottom: `1px solid ${C.beigeLight}`, width: '100%', textAlign: 'left', flexShrink: 0 }}
            >
              ← All recipes
            </button>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <RecipeDetail
                key={selRecipe.id}
                recipe={selRecipe}
                ingMap={ingMap}
                allIngredients={ingredients}
                locationId={locationId}
                isMobile
                onUpdated={load}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, background: C.cream, overflow: 'hidden' }}>
      <div style={{ width: 240, minWidth: 240, background: C.white, borderRight: `1px solid ${C.beigeLight}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <RecipeList
          recipes={recipes}
          ingMap={ingMap}
          selected={selId}
          isMobile={false}
          onSelect={handleSelect}
          onCreated={handleCreated}
          locationId={locationId}
        />
      </div>
      {!selRecipe ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.textMuted, fontSize: 13, padding: 40, textAlign: 'center' }}>
          Select a recipe to edit its ingredient list
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex' }}>
          <RecipeDetail
            key={selRecipe.id}
            recipe={selRecipe}
            ingMap={ingMap}
            allIngredients={ingredients}
            locationId={locationId}
            isMobile={false}
            onUpdated={load}
          />
        </div>
      )}
    </div>
  );
}
