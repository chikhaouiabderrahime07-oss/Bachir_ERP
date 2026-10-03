const express  = require('express');
const bcrypt   = require('bcryptjs');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const Counter  = require('../models/Counter');
const auth     = require('../middleware/auth');
const { bump, snapshot } = require('../lib/versions');

const router = express.Router();
router.use(auth); // ALL data routes require authentication

// ─── Helpers ──────────────────────────────────────────────────────
const SECRET_USER_FIELDS = ['password', 'currentSessionId'];

/** Remove secrets from a users document before it leaves the server. */
function publicData(col, data) {
  if (col !== 'users' || !data) return data;
  const safe = { ...data };
  SECRET_USER_FIELDS.forEach(f => delete safe[f]);
  return safe;
}

/** The `users` collection (accounts, roles, passwords) is administrator-only for writes. */
function adminOnlyForUsers(req, res, next) {
  if (req.params.col === 'users' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admins uniquement' });
  }
  next();
}

/** Never store a plain-text password at rest. */
async function hashPasswordIfNeeded(data) {
  if (data && typeof data.password === 'string' && data.password && !data.password.startsWith('$2')) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return data;
}

/** Match a document id that may have been stored as number or string. */
function idQuery(col, rawId) {
  const numId = Number(rawId);
  return isNaN(numId)
    ? { col, 'data.id': rawId }
    : { col, $or: [{ 'data.id': numId }, { 'data.id': String(numId) }] };
}

/** Initialise the per-collection id counter ONCE from the current max id (no scan per insert). */
async function ensureCounter(col) {
  const cid = `id_${col}`;
  const existing = await Counter.findOne({ _id: cid }).lean();
  if (!existing) {
    const top = await Document.findOne({ col, 'data.id': { $type: 'number' } })
      .sort({ 'data.id': -1 }).select('data.id').lean();
    try { await Counter.create({ _id: cid, seq: Number(top?.data?.id) || 0 }); }
    catch (_) { /* concurrent init — fine */ }
  }
  return cid;
}

/** Allocate a server-side numeric id for a collection. */
async function allocateId(col) {
  const cid = await ensureCounter(col);
  return Counter.nextSeq(cid);
}

/** Make sure the id counter never falls behind an id supplied by a client. */
async function raiseCounter(col, id) {
  const cid = await ensureCounter(col);
  await Counter.updateOne({ _id: cid }, { $max: { seq: id } });
}

// ─── GET /api/data/_versions — cheap change detector (no DB access) ──
router.get('/_versions', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(snapshot());
});

// ─── GET /api/data/next-num/:type — Atomic counter for BR/BL numbers ──
router.get('/next-num/:type', async (req, res) => {
  try {
    const type = req.params.type; // 'brs' or 'bls'
    const year = parseInt(req.query.year) || new Date().getFullYear();
    if (!['brs', 'bls', 'etat_vente'].includes(type)) {
      return res.status(400).json({ error: 'Type invalide (brs, bls ou etat_vente)' });
    }

    const counterId = `${type}_${year}`;
    const existing = await Counter.findOne({ _id: counterId });
    if (!existing) {
      let docs;
      if (type === 'etat_vente') {
        docs = await Document.find({ col: 'etat_vente_docs', 'data.year': year }).lean();
      } else {
        docs = await Document.find({ col: type, 'data.year': year }).lean();
      }
      const nums = docs.map(d => {
        if (type === 'etat_vente' && d.data?.ref) {
          const match = d.data.ref.match(/ET\/(\d+)\//);
          if (match) return parseInt(match[1]);
        }
        return parseInt(d.data?.brNum || d.data?.blNum) || 0;
      });
      const currentMax = nums.length ? Math.max(...nums) : (type === 'etat_vente' ? 0 : 99);
      try { await Counter.create({ _id: counterId, seq: currentMax }); } catch (_) { /* race */ }
    }

    const next = await Counter.nextSeq(counterId);
    res.json({ num: next });
  } catch (e) {
    console.error('[NEXT-NUM]', e);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// IMPORTANT: Specific routes MUST come before parameterized routes!
// ═══════════════════════════════════════════════════════════════════

// ─── GET /api/data/timbre-slabs ──────────────────────────────────
router.get('/timbre-slabs', async (req, res) => {
  try {
    const doc = await Document.findOne({ col: 'timbre_slabs', 'data.key': 'main' }).lean();
    res.json(doc?.data?.slabs || []);
  } catch (e) {
    console.error('[TIMBRE-SLABS/GET]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/timbre-slabs ──────────────────────────────────
router.put('/timbre-slabs', async (req, res) => {
  try {
    const slabs = Array.isArray(req.body) ? req.body : [];
    await Document.findOneAndUpdate(
      { col: 'timbre_slabs', 'data.key': 'main' },
      { col: 'timbre_slabs', data: { key: 'main', slabs } },
      { upsert: true, new: true }
    );
    bump('_timbre_slabs');
    res.json({ ok: true, count: slabs.length });
  } catch (e) {
    console.error('[TIMBRE-SLABS/PUT]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/data/settings/main ─────────────────────────────────
router.get('/settings/main', async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'main' }).lean();
    if (!s) { s = { value: {} }; }
    res.json(s.value);
  } catch (e) {
    console.error('[SETTINGS/GET]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/data/settings/main ───────────────────────────────
router.patch('/settings/main', async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: 'main' }).lean();
    const current = doc?.value || {};
    const merged = JSON.parse(JSON.stringify({ ...current, ...req.body }));
    await Settings.collection.updateOne(
      { key: 'main' },
      { $set: { value: merged, updatedAt: new Date() } },
      { upsert: true }
    );
    bump('_settings');
    res.json(merged);
  } catch (e) {
    console.error('[SETTINGS/PATCH]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/data/:col  (get all docs in a collection) ──────────
//   ?limit=N          newest N (newest first)        — legacy
//   ?tail=N           newest N, returned oldest→newest — for append-only logs
router.get('/:col', async (req, res) => {
  try {
    const col = req.params.col;
    const limit = parseInt(req.query.limit) || 0;
    const tail  = parseInt(req.query.tail) || 0;
    let docs;
    if (tail > 0) {
      docs = await Document.find({ col }).sort({ createdAt: -1 }).limit(tail).lean();
      docs.reverse();
    } else {
      let query = Document.find({ col });
      if (limit > 0) {
        const sortDir = req.query.sort === 'asc' ? 1 : -1;
        query = query.sort({ createdAt: sortDir }).limit(limit);
      }
      docs = await query.lean();
    }
    res.json(docs.map(d => publicData(col, d.data)));
  } catch (e) {
    console.error('[DATA/GET]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/data/:col/:id  (get single doc) ────────────────────
router.get('/:col/:id', async (req, res) => {
  try {
    const doc = await Document.findOne(idQuery(req.params.col, req.params.id)).lean();
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });
    res.json(publicData(req.params.col, doc.data));
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/data/:col  (insert) ───────────────────────────────
router.post('/:col', adminOnlyForUsers, async (req, res) => {
  try {
    const col  = req.params.col;
    const data = { ...(req.body || {}) };
    const now  = new Date().toISOString();
    const year = new Date().getFullYear();

    if (col === 'users') await hashPasswordIfNeeded(data);

    const hasId = data.id !== undefined && data.id !== null && data.id !== '' && !isNaN(Number(data.id));

    // ── Idempotency guard: same id already stored → this is a retry, merge instead of duplicating ──
    if (hasId) {
      const numId = Number(data.id);
      const existing = await Document.findOne({ col, 'data.id': numId });
      if (existing) {
        const merged = { ...existing.data, ...data, id: numId, updatedAt: now };
        existing.data = merged;
        existing.updatedAt = new Date();
        await existing.save();
        bump(col);
        return res.status(200).json(publicData(col, merged));
      }
    }

    // ── Internal id ───────────────────────────────────────────────
    let finalId;
    if (hasId) {
      finalId = Number(data.id);
      await raiseCounter(col, finalId);
    } else {
      finalId = await allocateId(col);
    }

    // ── BR numbering: atomic, duplicates rejected ─────────────────
    let brNum = data.brNum;
    if (col === 'brs') {
      const brYear = data.year || year;
      if (brNum) {
        const dup = await Document.findOne({ col: 'brs', 'data.brNum': Number(brNum), 'data.year': brYear });
        if (dup) {
          return res.status(409).json({ error: `Le numéro BR ${brNum} est déjà utilisé pour l'année ${brYear}` });
        }
      } else {
        const counterId = `brs_${brYear}`;
        const existing = await Counter.findOne({ _id: counterId });
        if (!existing) {
          const docs = await Document.find({ col: 'brs', 'data.year': brYear }).select('data.brNum').lean();
          const nums = docs.map(d => parseInt(d.data?.brNum) || 0);
          const currentMax = nums.length ? Math.max(...nums) : 99;
          try { await Counter.create({ _id: counterId, seq: currentMax }); } catch (_) { /* race */ }
        }
        brNum = await Counter.nextSeq(counterId);
      }
      const suppAbbrev = data.ref?.match(/\/([A-Z]+)\//)?.[1] || '';
      const n = String(brNum).padStart(3, '0');
      data.ref = suppAbbrev ? `${n}/BR/${suppAbbrev}/${data.year || brYear}` : `BR/${n}/${data.year || brYear}`;
    }

    const newData = {
      ...data,
      id:        finalId,
      ...(col === 'brs' ? { brNum: Number(brNum) } : {}),
      createdAt:     data.createdAt || now,
      updatedAt:     now,
      createdBy:     data.createdBy    ?? req.user.id,
      createdByName: data.createdByName ?? req.user.name,
    };

    await Document.create({ col, data: newData });
    bump(col);
    res.status(201).json(publicData(col, newData));

  } catch (e) {
    console.error('[DATA/POST]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/:col/bulk  (safe upsert — never deletes) ──────
router.put('/:col/bulk', adminOnlyForUsers, async (req, res) => {
  try {
    const col   = req.params.col;
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array expected' });
    if (col !== 'users' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admins uniquement' });
    }

    if (items.length) {
      const ops = items.map(item => ({
        updateOne: {
          filter: { col, 'data.id': item.id },
          update: { $set: { col, data: item, updatedAt: new Date() } },
          upsert: true
        }
      }));
      await Document.bulkWrite(ops);
      bump(col);
    }
    res.json({ synced: items.length });
  } catch (e) {
    console.error('[DATA/BULK]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/:col/:id  (full replace of one doc) ───────────
router.put('/:col/:id', adminOnlyForUsers, async (req, res) => {
  try {
    const col    = req.params.col;
    const id     = Number(req.params.id);
    const update = { ...req.body, updatedAt: new Date().toISOString() };
    if (col === 'users') await hashPasswordIfNeeded(update);

    const doc = await Document.findOneAndUpdate(
      { col, 'data.id': id },
      { $set: { data: update, updatedAt: new Date() } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });
    bump(col);
    res.json(publicData(col, doc.data));
  } catch (e) {
    console.error('[DATA/PUT]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/data/:col/:id  (partial, ATOMIC field-level update) ──
// Only the fields present in the body are written, using $set on each
// field. Two users editing DIFFERENT fields of the same document can no
// longer overwrite each other (the old read-merge-save lost updates).
router.patch('/:col/:id', adminOnlyForUsers, async (req, res) => {
  try {
    const col = req.params.col;
    const query = idQuery(col, req.params.id);
    const patch = { ...(req.body || {}) };

    delete patch.id;                       // an id never changes
    delete patch.currentSessionId;         // only the login route may touch sessions
    if (col === 'users') {
      delete patch.lastLoginAt;
      if ('password' in patch) {
        if (!patch.password) delete patch.password;   // empty = unchanged
        else await hashPasswordIfNeeded(patch);
      }
    }

    // ── Duplicate check for BR number on update ──────────────────
    if (col === 'brs' && patch.brNum !== undefined) {
      const current = await Document.findOne(query).select('data.year data.id').lean();
      if (!current) return res.status(404).json({ error: 'Non trouvé' });
      const brYear = patch.year || current.data.year || new Date().getFullYear();
      const dup = await Document.findOne({
        col: 'brs', 'data.brNum': Number(patch.brNum), 'data.year': brYear, 'data.id': { $ne: current.data.id }
      });
      if (dup) {
        return res.status(409).json({ error: `Le numéro BR ${patch.brNum} est déjà utilisé pour l'année ${brYear}` });
      }
    }

    const nowIso = new Date().toISOString();
    const set = { 'data.updatedAt': nowIso, updatedAt: new Date() };
    let dottedSafe = true;
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'updatedAt') continue;
      if (k.includes('.') || k.startsWith('$') || k === '') { dottedSafe = false; break; }
      set[`data.${k}`] = v;
    }

    let doc;
    if (dottedSafe) {
      doc = await Document.findOneAndUpdate(query, { $set: set }, { new: true }).lean();
    } else {
      // Exotic keys: fall back to read-merge-save
      const found = await Document.findOne(query);
      if (!found) return res.status(404).json({ error: 'Non trouvé' });
      found.data = { ...found.data, ...patch, updatedAt: nowIso };
      found.updatedAt = new Date();
      await found.save();
      doc = found.toObject();
    }
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });

    bump(col);
    res.json(publicData(col, doc.data));
  } catch (e) {
    console.error('[DATA/PATCH]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /api/data/:col/:id ────────────────────────────────────
router.delete('/:col/:id', adminOnlyForUsers, async (req, res) => {
  try {
    const col   = req.params.col;
    const result = await Document.deleteOne(idQuery(col, req.params.id));
    if (!result.deletedCount) return res.status(404).json({ error: 'Non trouvé' });
    bump(col);
    res.json({ success: true, id: req.params.id });
  } catch (e) {
    console.error('[DATA/DELETE]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/data/:col/dedup  (remove duplicates from a collection) ──
router.post('/:col/dedup', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    const col = req.params.col;
    const docs = await Document.find({ col }).sort({ createdAt: 1 }).select('data.id createdAt').lean();
    const seen = new Set();
    const toDelete = [];
    for (const doc of docs) {
      const key = String(doc.data?.id);
      if (seen.has(key)) toDelete.push(doc._id);
      else seen.add(key);
    }
    if (toDelete.length) {
      await Document.deleteMany({ _id: { $in: toDelete } });
      bump(col);
    }
    res.json({ removed: toDelete.length, remaining: docs.length - toDelete.length });
  } catch (e) {
    console.error('[DATA/DEDUP]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
