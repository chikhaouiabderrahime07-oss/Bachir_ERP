/**
 * API.js — Client-side bridge between the app and the MongoDB backend
 * Replaces the localStorage DB class when running in hosted mode.
 * 
 * This file is loaded BEFORE core.js.
 * It sets window._API_MODE = true when a backend is detected,
 * and patches the DB object to use fetch() instead of localStorage.
 */

const API = (() => {
  const BASE = '/api';
  let _token = localStorage.getItem('_erp_token') || null;
  let _user  = null;

  // ── Token helpers ───────────────────────────────────────────────
  function setToken(token) {
    _token = token;
    localStorage.setItem('_erp_token', token);
  }
  function clearToken() {
    _token = null;
    localStorage.removeItem('_erp_token');
  }
  function getUser() { return _user; }

  // ── Fetch wrapper ───────────────────────────────────────────────
  async function req(method, path, body) {
    // Don't even try if we have no token (prevents pointless 401s)
    if (!_token && path !== '/auth/login') {
      console.warn(`[API] No token — skipping ${method} ${path}`);
      return null;
    }

    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ..._token ? { Authorization: `Bearer ${_token}` } : {},
      },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(BASE + path, opts);
      
      // Token expired — clear it and signal the app gracefully (NO location.reload!)
      if (res.status === 401) {
        clearToken();
        // Dispatch event — App will handle showing login screen without page reload
        window.dispatchEvent(new CustomEvent('erp:session-expired'));
        return null;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (e) {
      console.error(`[API] ${method} ${path}`, e.message);
      throw e;
    }
  }

  // ── Auth ────────────────────────────────────────────────────────
  async function syncCloudToLocal() {
    const COLS = [
      'users', 'brs', 'bls', 'suppliers', 'clients',
      'caisse_admin', 'sessions', 'history', 'audit_log',
      'articles', 'drivers',
      'work_log', 'recycle_bin'
    ];
    const MERGE_COLS = new Set(['history', 'audit_log']);

    const results = await Promise.allSettled([
      ...COLS.map(col => getAll(col).then(data => ({ col, data }))),
      getSettings().then(data   => ({ col: '_settings', data })),
      getTimbreSlabs().then(data => ({ col: '_timbre_slabs', data }))
    ]);

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const { col, data } = result.value;
      if (col === '_settings') {
        if (data && Object.keys(data).length) {
          localStorage.setItem('settings', JSON.stringify(data));
        }
      } else if (col === '_timbre_slabs') {
        // Store slabs in dedicated key — separate from settings
        if (Array.isArray(data)) {
          localStorage.setItem('timbre_slabs_data', JSON.stringify(data));
        }
      } else if (data && Array.isArray(data)) {
        if (MERGE_COLS.has(col)) {
          const local = JSON.parse(localStorage.getItem(col) || '[]');
          const serverIds = new Set(data.map(e => `${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
          const uniqueLocal = local.filter(e => !serverIds.has(`${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
          const merged = [...data, ...uniqueLocal].sort((a,b) => (a.ts||'').localeCompare(b.ts||''));
          localStorage.setItem(col, JSON.stringify(merged.slice(-5000)));
        } else {
          localStorage.setItem(col, JSON.stringify(data));
        }
      }
    }
  }


  async function login(username, password) {
    const data = await req('POST', '/auth/login', { username, password });
    if (data?.token) {
      setToken(data.token);
      _user = data.user;
    }
    return data;
  }

  function logout() {
    clearToken();
    _user = null;
  }

  function isLoggedIn() { return !!_token; }

  // Decode JWT to get user without a server call
  function decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch { return null; }
  }

  function initFromToken() {
    if (_token) {
      const decoded = decodeToken(_token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        _user = { id: decoded.id, name: decoded.name, username: decoded.username, role: decoded.role };
        return true;
      } else {
        clearToken();
        return false;
      }
    }
    return false;
  }

  // ── Data CRUD ───────────────────────────────────────────────────
  async function getAll(col)     { return req('GET',    `/data/${col}`) || []; }
  async function getById(col,id) { return req('GET',    `/data/${col}/${id}`); }
  async function insert(col,doc) { return req('POST',   `/data/${col}`, doc); }
  async function update(col,id,patch) { return req('PATCH', `/data/${col}/${id}`, patch); }
  async function remove(col,id)  { return req('DELETE', `/data/${col}/${id}`); }
  async function bulkSync(col, items) { return req('PUT', `/data/${col}/bulk`, items); }
  async function getSettings()      { return req('GET',    '/data/settings/main') || {}; }
  async function saveSettings(patch){ return req('PATCH',  '/data/settings/main', patch); }
  async function getTimbreSlabs()   { return req('GET',    '/data/timbre-slabs') || []; }
  async function saveTimbreSlabs(slabs){ return req('PUT', '/data/timbre-slabs', slabs); }

  // ── Backup ──────────────────────────────────────────────────────
  async function listBackups()      { return req('GET',    '/backup'); }
  async function createBackup(lbl)  { return req('POST',   '/backup', { label: lbl }); }
  async function restoreBackup(id)  { return req('POST',   `/backup/${id}/restore`); }
  async function deleteBackup(id)   { return req('DELETE', `/backup/${id}`); }

  // ── Health check ─────────────────────────────────────────────────
  async function ping() {
    try {
      const r = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      return r.ok;
    } catch { return false; }
  }

  return {
    syncCloudToLocal, login, logout, isLoggedIn, getUser, initFromToken,
    getAll, getById, insert, update, remove, bulkSync,
    getSettings, saveSettings, getTimbreSlabs, saveTimbreSlabs,
    listBackups, createBackup, restoreBackup, deleteBackup,
    ping,
    _req: req, // exposed for admin utility calls
  };
})();

window.API = API;
