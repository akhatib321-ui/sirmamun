import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { tokens as C, ui } from '../../shared/styles.js';

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 18, 24, 0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: 16,
  },
  panel: {
    ...ui.card,
    width: '100%',
    maxWidth: 720,
    maxHeight: '88vh',
    overflowY: 'auto',
    padding: 18,
  },
  title: {
    fontFamily: 'Playfair Display',
    fontSize: 22,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  label: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.textMuted,
    display: 'block',
    marginBottom: 4,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 8,
    border: `1px solid ${C.beigeLight}`,
    background: C.white,
    padding: '10px 12px',
    fontFamily: 'DM Sans',
    fontSize: 13,
    marginBottom: 12,
    outline: 'none',
  },
  result: (ok) => ({
    borderRadius: 10,
    border: `1px solid ${ok ? '#b7dfc7' : '#f1b9b2'}`,
    background: ok ? '#eefaf2' : '#fff3f2',
    color: ok ? '#1f7a45' : '#b53a2d',
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 1.5,
    padding: '10px 12px',
    marginBottom: 10,
  }),
  chainCard: {
    border: `1px solid ${C.beigeLight}`,
    borderRadius: 10,
    background: '#fffdfa',
    overflow: 'hidden',
    marginBottom: 12,
  },
  chainHeader: {
    padding: '8px 12px',
    borderBottom: `1px solid ${C.beigeLight}`,
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: C.textMuted,
    background: C.cream,
  },
  step: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 12,
    alignItems: 'start',
    padding: '8px 12px',
    borderBottom: `1px solid ${C.beigeLight}`,
  },
  qty: {
    fontFamily: "'Courier New',monospace",
    color: C.gold,
    fontWeight: 700,
    fontSize: 13,
  },
  note: {
    fontFamily: 'DM Sans',
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  btnGhost: {
    ...ui.button,
    border: `1px solid ${C.beigeLight}`,
    background: 'transparent',
    color: C.ink,
    padding: '8px 12px',
  },
  btnWarn: {
    ...ui.button,
    border: '1px solid #f1b9b2',
    background: '#fff3f2',
    color: '#b53a2d',
    padding: '8px 12px',
  },
  btnPrimary: {
    ...ui.button,
    border: 'none',
    background: C.ink,
    color: C.gold,
    padding: '8px 14px',
  },
};

export default function IngredientLinkPanel({ ingredient, locationId, onClose, onSaved }) {
  const [stockItems, setStockItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(ingredient.stockItemId ?? '');
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedMeta = useMemo(
    () => stockItems.find((item) => item.id === selectedItem) ?? null,
    [stockItems, selectedItem],
  );

  useEffect(() => {
    api
      .getStockChainItems()
      .then((res) => setStockItems(res.data ?? []))
      .catch(() => setStockItems([]));
  }, []);

  useEffect(() => {
    const targetItemId = selectedItem || ingredient.stockItemId;
    if (!targetItemId) {
      setChain(null);
      return;
    }

    setLoading(true);
    setError(null);
    api
      .resolveStockChain(ingredient.id, locationId, targetItemId)
      .then((res) => setChain(res.data ?? null))
      .catch((e) => {
        setChain(null);
        setError(e.message || 'Could not resolve chain');
      })
      .finally(() => setLoading(false));
  }, [ingredient.id, ingredient.stockItemId, locationId, selectedItem]);

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setError(null);
    try {
      await api.linkIngredientStock(ingredient.id, selectedItem);
      onSaved?.({ ...ingredient, stockItemId: selectedItem });
    } catch (e) {
      setError(e.message || 'Failed to save stock link');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.unlinkIngredientStock(ingredient.id);
      onSaved?.({ ...ingredient, stockItemId: null });
    } catch (e) {
      setError(e.message || 'Failed to unlink stock item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        <div style={s.title}>Link Stock Item</div>
        <div style={s.subtitle}>
          Connect {ingredient.name} ({ingredient.unit}) to a legacy stock item and preview
          the conversion chain before saving.
        </div>

        <label style={s.label}>Inventory Item</label>
        <select
          style={s.select}
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
        >
          <option value="">Select an item</option>
          {stockItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.unit ? ` (${item.unit})` : ''}
              {item.supplier ? ` · ${item.supplier}` : ''}
            </option>
          ))}
        </select>

        {selectedMeta && (
          <div style={{ ...s.subtitle, marginBottom: 10 }}>
            Selected: {selectedMeta.name}
          </div>
        )}

        {loading && <div style={s.subtitle}>Resolving chain...</div>}

        {!loading && chain && (
          <>
            <div style={s.result(chain.isComplete)}>
              {chain.isComplete
                ? `Chain complete: ${chain.physicalQty} ${chain.physicalUnit} => ${chain.resolvedQty} ${chain.resolvedUnit}`
                : `Chain incomplete: ${chain.warning || 'Unknown issue'}`}
            </div>

            {chain.chain?.length > 0 && (
              <div style={s.chainCard}>
                <div style={s.chainHeader}>Conversion Chain</div>
                {chain.chain.map((step, index) => (
                  <div
                    key={`${step.unit}-${index}`}
                    style={{ ...s.step, borderBottom: index === chain.chain.length - 1 ? 'none' : s.step.borderBottom }}
                  >
                    <div style={s.qty}>
                      {step.qty} {step.unit}
                    </div>
                    <div style={s.note}>{step.note}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div style={{ ...s.result(false), marginTop: 4 }}>
            {error}
          </div>
        )}

        <div style={s.actions}>
          {ingredient.stockItemId && (
            <button style={s.btnWarn} onClick={handleUnlink} disabled={saving}>
              Unlink
            </button>
          )}
          <button style={s.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...s.btnPrimary, opacity: !selectedItem || saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={!selectedItem || saving}
          >
            {saving ? 'Saving...' : 'Save Link'}
          </button>
        </div>
      </div>
    </div>
  );
}