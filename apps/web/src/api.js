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
};
