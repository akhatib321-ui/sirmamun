const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Backward-compat with previous app session key.
  sessionStorage.removeItem('sm_user');
}

export function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clampPageLimit(limit, max = 100) {
  return Math.min(limit, max);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearAuth();
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    const e = new Error(err.message ?? 'Request failed');
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function loginReq(pin) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Invalid PIN' }));
    const e = new Error(err.message ?? 'Invalid PIN');
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  // Keep prior app logic functional during migration.
  sessionStorage.setItem('sm_user', JSON.stringify(data.user));
  return data.user;
}

export const api = {
  // ── Bootstrap ─────────────────────────────────────────────
  fetchAll: ()                                        => req('GET',    '/bootstrap'),

  // ── Auth ──────────────────────────────────────────────────
  login: (pin)                                        => loginReq(pin),
  listUsers: ()                                       => req('GET',    '/auth/users'),
  createUser: (name, pin, role, locationIds)           => req('POST',   '/auth/users',       { name, pin, role, locationIds }),
  updateUser: (id, dto)                               => req('PUT',    `/auth/users/${id}`, dto),
  deleteUser: (id)                                    => req('DELETE', `/auth/users/${id}`),

  // ── Locations ─────────────────────────────────────────────
  createLocation: (name, parentId = null)            => req('POST',   '/locations',        { name, parentId }),
  updateLocation: (id, dto)                          => req('PUT',    `/locations/${id}`,  dto),
  deleteLocation: (id)                                => req('DELETE', `/locations/${id}`),

  // ── Items ─────────────────────────────────────────────────
  createItem: (dto)                                   => req('POST',   '/items',            dto),
  updateItem: (id, dto)                               => req('PUT',    `/items/${id}`,      dto),
  deleteItem: (id)                                    => req('DELETE', `/items/${id}`),

  // ── Stock ─────────────────────────────────────────────────
  addStock: (iid, lid, qty)                          => req('POST',   '/stock',            { iid, lid, qty }),
  adjust: (stockId, qty, actor, note)                => req('PUT',    `/stock/${stockId}`, { qty, note, ...actor }),
  batchAdjust: (changes, actor)                      => req('POST',   '/stock/batch',      { changes, ...actor }),
  consume: (stockId, amount, actor)                  => req('POST',   '/stock/consume',    { stockId, amount, ...actor }),
  transfer: (iid, fromLid, toLid, qty, actor)        => req('POST',   '/transfer',         { iid, fromLid, toLid, qty, ...actor }),

  // ── Import ────────────────────────────────────────────────
  bulkImport: (rows)                                 => req('POST',   '/import',           { rows }),

  // ── Settings ──────────────────────────────────────────────
  updateSettings: (config)                           => req('PUT',    '/settings',         config),

  // ── Module 2: Inventory Frontend ─────────────────────────
  getLocations: ()                                   => req('GET',    '/locations'),
  getSuppliers: (page = 1, limit = 50)              => req('GET',    `/inventory/suppliers?page=${page}&limit=${limit}`),
  createSupplier: (dto)                              => req('POST',   '/inventory/suppliers', dto),

  getIngredients: (page = 1, limit = 50)             => req('GET',    `/catalog/ingredients?page=${page}&limit=${clampPageLimit(limit)}`),
  getIngredient: (id)                                 => req('GET',    `/catalog/ingredients/${id}`),
  createIngredient: (dto)                            => req('POST',   '/catalog/ingredients', dto),
  updateIngredient: (id, dto)                        => req('PATCH',  `/catalog/ingredients/${id}`, dto),
  addIngredientCost: (ingredientId, locationId, dto) => req('POST',   `/catalog/ingredients/${ingredientId}/costs/${locationId}`, dto),
  getCustomUnits: ()                                  => req('GET',    '/catalog/custom-units'),
  createCustomUnit: (dto)                             => req('POST',   '/catalog/custom-units', dto),
  updateCustomUnit: (id, dto)                         => req('PATCH',  `/catalog/custom-units/${id}`, dto),
  deleteCustomUnit: (id)                              => req('DELETE', `/catalog/custom-units/${id}`),

  getRecipes: (locationId, page = 1, limit = 100)    => req('GET',    `/catalog/recipes/${locationId}?page=${page}&limit=${clampPageLimit(limit)}`),
  createRecipe: (dto)                                => req('POST',   '/catalog/recipes', dto),
  updateRecipe: (id, dto)                            => req('PATCH',  `/catalog/recipes/detail/${id}`, dto),
  addRecipeIngredient: (recipeId, dto)               => req('POST',   `/catalog/recipes/detail/${recipeId}/ingredients`, dto),
  removeRecipeIngredient: (recipeId, ingredientId)   => req('DELETE', `/catalog/recipes/detail/${recipeId}/ingredients/${ingredientId}`),

  importCatalogJson: (locationId, payload)           => req('POST',   `/catalog/import/json/${locationId}`, payload),
  importIngredientsCsv: async (locationId, file) => {
    const token = authToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE}/catalog/import/ingredients-csv/${locationId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (res.status === 401) {
      clearAuth();
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'CSV upload failed' }));
      const e = new Error(err.message ?? 'CSV upload failed');
      e.status = res.status;
      throw e;
    }

    return res.json();
  },

  generateReorder: (locationId, windowDays = 7)      => req('POST',   `/inventory/reorder/generate/${locationId}?windowDays=${windowDays}`),
  getReorderAlerts: (locationId)                     => req('GET',    `/inventory/reorder/alerts/${locationId}`),
  getReorderPending: (locationId)                    => req('GET',    `/inventory/reorder/pending/${locationId}`),
  getReorderHistory: (locationId, page = 1, limit = 20) => req('GET', `/inventory/reorder/history/${locationId}?page=${page}&limit=${limit}`),
  getReorderById: (id)                               => req('GET',    `/inventory/reorder/${id}`),
  getAggregateReorder: ()                            => req('GET',    '/inventory/reorder/aggregate'),
  recalculateAggregateReorder: (windowDays = 7)      => req('POST',   `/inventory/reorder/aggregate/recalculate?windowDays=${windowDays}`),
  buildAggregateOrder: (ingredientIds)               => req('POST',   '/inventory/reorder/aggregate/build-order', { ingredientIds }),
  markAggregateOrdered: (payload)                    => req('POST',   '/inventory/reorder/aggregate/mark-ordered', payload),
  getStockStatus: (windowDays = 7)                   => req('GET',    `/inventory/stock-status?windowDays=${windowDays}`),
  getStockStatusSummary: (windowDays = 7)            => req('GET',    `/inventory/stock-status/summary?windowDays=${windowDays}`),
  getStockChainItems: ()                              => req('GET',    '/inventory/stock-chain/items'),
  resolveStockChain: (ingredientId, locationId, stockItemId) => {
    const params = new URLSearchParams();
    if (locationId) params.set('locationId', locationId);
    if (stockItemId) params.set('stockItemId', stockItemId);
    const query = params.toString();
    return req('GET', `/inventory/stock-chain/resolve/${ingredientId}${query ? `?${query}` : ''}`);
  },
  linkIngredientStock: (ingredientId, stockItemId)    => req('POST',   `/inventory/stock-chain/link/${ingredientId}`, { stockItemId }),
  unlinkIngredientStock: (ingredientId)               => req('DELETE', `/inventory/stock-chain/link/${ingredientId}`),

  getSalesReports: (locationId, page = 1, limit = 25) => req('GET',   `/inventory/sales/${locationId}?page=${page}&limit=${limit}`),
  getUnmatchedItems: (reportId)                      => req('GET',    `/inventory/sales/reports/${reportId}/unmatched`),
  manualMatch: (itemId, recipeId)                    => req('PATCH',  `/inventory/sales/items/${itemId}/match`, { recipeId }),

  uploadSalesCsv: async (locationId, reportDate, file) => {
    const token = authToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE}/inventory/sales/import/${locationId}?reportDate=${encodeURIComponent(reportDate)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (res.status === 401) {
      clearAuth();
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'CSV upload failed' }));
      const e = new Error(err.message ?? 'CSV upload failed');
      e.status = res.status;
      throw e;
    }

    return res.json();
  },
};
