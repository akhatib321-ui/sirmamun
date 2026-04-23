const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  // ── Bootstrap ────────────────────────────────────────────────
  fetchAll: ()                              => req('GET',    '/bootstrap'),

  // ── Locations ───────────────────────────────────────────────
  createLocation: (name)                   => req('POST',   '/locations',       { name }),
  deleteLocation: (id)                     => req('DELETE', `/locations/${id}`),

  // ── Items ────────────────────────────────────────────────────
  createItem: (dto)                        => req('POST',   '/items',           dto),
  updateItem: (id, dto)                    => req('PUT',    `/items/${id}`,     dto),
  deleteItem: (id)                         => req('DELETE', `/items/${id}`),

  // ── Stock ────────────────────────────────────────────────────
  addStock: (iid, lid, qty)               => req('POST',   '/stock',           { iid, lid, qty }),
  adjust: (stockId, qty, note)            => req('PUT',    `/stock/${stockId}`, { qty, note }),
  batchAdjust: (changes)                  => req('POST',   '/stock/batch',     { changes }),
  transfer: (iid, fromLid, toLid, qty)   => req('POST',   '/transfer',        { iid, fromLid, toLid, qty }),

  // ── Import ───────────────────────────────────────────────────
  bulkImport: (rows)                      => req('POST',   '/import',          { rows }),
};
