/**
 * Server-side RAM cache + compressed MongoDB snapshot (_boot_snapshot_v1).
 *
 * Why this exists:
 * MongoDB Atlas M0 free tier throttles multi-thousand-document scans (~60s for 7,780 docs),
 * whereas reading a single ~380 KB gzipped snapshot document from `Settings` takes ~120 ms,
 * and delta queries using `{ col: 1, updatedAt: 1 }` take ~25 ms.
 *
 * This module keeps all active collections (`BOOT_COLS`) warm in Node RAM, reconciles any
 * writes via fast delta queries + covered-index ID checks, and persists a debounced gzipped
 * snapshot back to `Settings` so cold starts wake in ~150 ms instead of ~60 s.
 */
const zlib = require('zlib');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const versions = require('./versions');

const SNAPSHOT_KEY = '_boot_snapshot_v1';
const BOOT_COLS = [
  'users', 'suppliers', 'clients', 'articles', 'drivers', 'sessions',
  'caisse_admin', 'bank_transactions', 'bank_accounts', 'supplier_payments',
  'etat_vente_docs', 'bon_retours', 'bank_charges', 'recurring_charges',
  'notifications', 'fiches_paie', 'rh_rectifications', 'paie_validations',
  'pointage_validations', 'recycle_bin', 'bls', 'brs'
];
const BOOT_SET = new Set(BOOT_COLS);

// col -> { byKey: Map<string, { _id, data, updatedAt, createdAt }>, lastSyncMs: number, dirty: boolean }
const store = new Map();
let initPromise = null;
let ready = false;
let saveTimer = null;

// Key by the MongoDB _id (always unique). Keying by data.id let duplicate ids mask deleted
// "ghost" docs: the count check (byKey.size === total) passed while a deleted BCH stayed cached.
function docKey(d) {
  if (d && d._id) return '_id:' + String(d._id);
  const id = d && d.data && d.data.id;
  if (id !== undefined && id !== null && id !== '') return 'id:' + String(id);
  return 'rnd:' + Math.random();
}

function ensureEntry(col) {
  let e = store.get(col);
  if (!e) {
    e = { byKey: new Map(), lastSyncMs: 0, dirty: true };
    store.set(col, e);
  }
  return e;
}

function upsertRawDoc(col, d) {
  if (!d || !d.data) return;
  const e = ensureEntry(col);
  const k = docKey(d);
  const updMs = d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now();
  const crtMs = d.createdAt ? new Date(d.createdAt).getTime() : updMs;
  e.byKey.set(k, {
    _id: d._id ? String(d._id) : undefined,
    data: d.data,
    updatedAt: new Date(updMs),
    createdAt: new Date(crtMs)
  });
}

function scheduleSnapshotSave() {
  if (!ready) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSnapshotNow().catch(err => console.warn('[Cache] snapshot save failed:', err.message));
  }, 8000);
  if (typeof saveTimer.unref === 'function') saveTimer.unref();
}

async function saveSnapshotNow() {
  const colsObj = {};
  let minSync = Date.now();
  for (const col of BOOT_COLS) {
    const e = store.get(col);
    if (!e) continue;
    if (e.lastSyncMs > 0 && e.lastSyncMs < minSync) minSync = e.lastSyncMs;
    colsObj[col] = Array.from(e.byKey.values()).map(v => ({
      _id: v._id,
      data: v.data,
      u: v.updatedAt ? v.updatedAt.getTime() : 0,
      c: v.createdAt ? v.createdAt.getTime() : 0
    }));
  }
  const payload = JSON.stringify({ ts: minSync, cols: colsObj });
  const gzBase64 = zlib.gzipSync(Buffer.from(payload, 'utf8'), { level: 6 }).toString('base64');
  await Settings.findOneAndUpdate(
    { key: SNAPSHOT_KEY },
    { $set: { value: { ts: minSync, gz: gzBase64 }, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function initCache() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const t0 = Date.now();
    try {
      const snapDoc = await Settings.findOne({ key: SNAPSHOT_KEY }).lean();
      if (snapDoc && snapDoc.value && snapDoc.value.gz) {
        const rawJson = zlib.gunzipSync(Buffer.from(snapDoc.value.gz, 'base64')).toString('utf8');
        const parsed = JSON.parse(rawJson);
        const snapTs = Number(parsed.ts) || Date.now();
        for (const col of BOOT_COLS) {
          const e = ensureEntry(col);
          e.byKey.clear();
          const list = (parsed.cols && parsed.cols[col]) || [];
          for (const item of list) {
            upsertRawDoc(col, {
              _id: item._id,
              data: item.data,
              updatedAt: item.u ? new Date(item.u) : new Date(snapTs),
              createdAt: item.c ? new Date(item.c) : new Date(snapTs)
            });
          }
          e.lastSyncMs = snapTs;
          e.dirty = false;
        }
        // Apply any documents modified since the snapshot was taken (uses { updatedAt: -1 } index)
        const now = Date.now();
        const deltaDocs = await Document.find({
          updatedAt: { $gt: new Date(Math.max(0, snapTs - 10000)) }
        }).lean();
        const touchedCols = new Set();
        for (const d of deltaDocs) {
          if (!BOOT_SET.has(d.col)) continue;
          upsertRawDoc(d.col, d);
          touchedCols.add(d.col);
        }
        // Drop "ghost" docs deleted from MongoDB after the snapshot was taken (covered index scan, _id only)
        let ghosts = 0;
        const liveIds = await Document.find({ col: { $in: BOOT_COLS } }).select('_id col').lean();
        const liveByCol = new Map();
        for (const d of liveIds) {
          if (!liveByCol.has(d.col)) liveByCol.set(d.col, new Set());
          liveByCol.get(d.col).add('_id:' + String(d._id));
        }
        for (const col of BOOT_COLS) {
          const e = ensureEntry(col);
          const valid = liveByCol.get(col) || new Set();
          for (const k of Array.from(e.byKey.keys())) {
            if (!valid.has(k)) { e.byKey.delete(k); ghosts++; touchedCols.add(col); }
          }
          // Docs missing from the snapshot (e.g. collapsed duplicate ids) → force a refresh on first read
          if (e.byKey.size !== valid.size) e.dirty = true;
        }
        for (const col of BOOT_COLS) {
          ensureEntry(col).lastSyncMs = now;
        }
        ready = true;
        console.log(`⚡ [Cache] Loaded snapshot + ${deltaDocs.length} delta docs (${ghosts} deleted ghosts purged) in ${Date.now() - t0} ms`);
        if (touchedCols.size > 0) scheduleSnapshotSave();
        return;
      }
    } catch (e) {
      console.warn('[Cache] Snapshot load failed, falling back to DB build:', e.message);
    }

    // Fallback if no snapshot exists yet: build from DB and immediately save snapshot
    const now = Date.now();
    const allDocs = await Document.find(
      { col: { $in: BOOT_COLS } },
      { _id: 1, col: 1, data: 1, updatedAt: 1, createdAt: 1 }
    ).lean();
    for (const col of BOOT_COLS) {
      const e = ensureEntry(col);
      e.byKey.clear();
      e.lastSyncMs = now;
      e.dirty = false;
    }
    for (const d of allDocs) upsertRawDoc(d.col, d);
    ready = true;
    console.log(`⚡ [Cache] Built initial cache (${allDocs.length} docs) in ${Date.now() - t0} ms`);
    await saveSnapshotNow().catch(() => {});
  })();
  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

async function refreshColIfNeeded(col) {
  if (!BOOT_SET.has(col)) return null;
  if (!ready) await initCache();
  const e = ensureEntry(col);
  if (!e.dirty) return e;

  const now = Date.now();
  const sinceDate = new Date(Math.max(0, e.lastSyncMs - 5000));
  const [changed, total] = await Promise.all([
    Document.find({ col, updatedAt: { $gt: sinceDate } }).lean(),
    Document.countDocuments({ col })
  ]);
  for (const d of changed) upsertRawDoc(col, d);

  // If count differs (a deletion happened), reconcile keys using the covered index `{ col: 1, 'data.id': 1 }`
  if (e.byKey.size !== total) {
    const idDocs = await Document.find({ col }).select('_id data.id').lean();
    const validKeys = new Set(idDocs.map(docKey));
    for (const k of Array.from(e.byKey.keys())) {
      if (!validKeys.has(k)) e.byKey.delete(k);
    }
    // If still missing docs (e.g. inserted without updatedAt), fetch only missing keys
    if (e.byKey.size < total) {
      const fullDocs = await Document.find({ col }).lean();
      e.byKey.clear();
      for (const d of fullDocs) upsertRawDoc(col, d);
    }
  }

  e.lastSyncMs = now;
  e.dirty = false;
  scheduleSnapshotSave();
  return e;
}

async function getCachedDocs(col) {
  if (!BOOT_SET.has(col)) return null;
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return null;
  const e = await refreshColIfNeeded(col);
  return Array.from(e.byKey.values());
}

function isBootCol(col) {
  return BOOT_SET.has(col);
}

// Remove a deleted document from the RAM cache immediately (called by the DELETE route)
function evictDoc(col, mongoId) {
  if (!BOOT_SET.has(col) || !mongoId) return false;
  const e = store.get(col);
  if (!e) return false;
  const removed = e.byKey.delete('_id:' + String(mongoId));
  if (removed) scheduleSnapshotSave();
  return removed;
}

// Hook into lib/versions so every bump(col) marks that collection dirty in RAM
versions.onBump((col) => {
  if (col === '*') {
    for (const c of BOOT_COLS) ensureEntry(c).dirty = true;
    scheduleSnapshotSave();
  } else if (BOOT_SET.has(col)) {
    ensureEntry(col).dirty = true;
    scheduleSnapshotSave();
  }
});

module.exports = {
  BOOT_COLS,
  SNAPSHOT_KEY,
  initCache,
  getCachedDocs,
  isBootCol,
  evictDoc,
  saveSnapshotNow
};
