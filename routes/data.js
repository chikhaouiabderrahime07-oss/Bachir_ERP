const express  = require('express');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const Counter  = require('../models/Counter');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth); // ALL data routes require authentication

// ─── GET /api/data/next-num/:type — Atomic counter for BR/BL numbers ──
// Returns the next unique number for a given type (brs/bls) and year.
// Uses MongoDB atomic $inc to prevent duplicates with concurrent users.
router.get('/next-num/:type', async (req, res) => {
  try {
    const type = req.params.type; // 'brs' or 'bls'
    const year = parseInt(req.query.year) || new Date().getFullYear();
    if (!['brs', 'bls'].includes(type)) {
      return res.status(400).json({ error: 'Type invalide (brs ou bls)' });
    }

    const counterId = `${type}_${year}`;

    // Check if counter exists; if not, initialize from current max in DB
    const existing = await Counter.findOne({ _id: counterId });
    if (!existing) {
      const docs = await Document.find({ col: type, 'data.year': year }).lean();
      const nums = docs.map(d => parseInt(d.data?.brNum || d.data?.blNum) || 0);
      const currentMax = nums.length ? Math.max(...nums) : 99; // Start at 100
      await Counter.create({ _id: counterId, seq: currentMax });
    }

    // Atomically increment and return
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

// ─── GET /api/data/timbre-slabs ── Dedicated slabs storage ──────
// Stores slabs as a real Document (not Mixed settings) — 100% reliable
router.get('/timbre-slabs', async (req, res) => {
  try {
    const doc = await Document.findOne({ col: 'timbre_slabs', 'data.key': 'main' }).lean();
    res.json(doc?.data?.slabs || []);
  } catch (e) {
    console.error('[TIMBRE-SLABS/GET]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/data/timbre-slabs ── Save slabs array ──────────────
router.put('/timbre-slabs', async (req, res) => {
  try {
    const slabs = Array.isArray(req.body) ? req.body : [];
    await Document.findOneAndUpdate(
      { col: 'timbre_slabs', 'data.key': 'main' },
      { col: 'timbre_slabs', data: { key: 'main', slabs } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, count: slabs.length });
  } catch (e) {
    console.error('[TIMBRE-SLABS/PUT]', e);
    res.status(500).json({ error: e.message });
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
    // Deep merge via JSON round-trip (ensures plain objects, no Mongoose proxies)
    const merged = JSON.parse(JSON.stringify({ ...current, ...req.body }));

    // Use native MongoDB driver directly — bypasses all Mongoose Mixed-type
    // tracking issues (markModified not needed, arrays always saved correctly)
    await Settings.collection.updateOne(
      { key: 'main' },
      { $set: { value: merged, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json(merged);
  } catch (e) {
    console.error('[SETTINGS/PATCH]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ─── GET /api/data/:col  (get all docs in a collection) ──────────
router.get('/:col', async (req, res) => {
  try {
    const docs = await Document.find({ col: req.params.col }).lean();
    res.json(docs.map(d => d.data));
  } catch (e) {
    console.error('[DATA/GET]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/data/:col/:id  (get single doc) ────────────────────
router.get('/:col/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({
      col: req.params.col,
      'data.id': Number(req.params.id)
    }).lean();
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });
    res.json(doc.data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/data/:col  (insert — server assigns ID atomically) ─
router.post('/:col', async (req, res) => {
  try {
    const col  = req.params.col;
    const data = req.body;
    const now  = new Date().toISOString();
    const year = new Date().getFullYear();

    // ── Guard: if a document with this exact id already exists → update it ──
    // This prevents duplicates when migration or reconnect sends same data twice.
    if (data.id) {
      const existing = await Document.findOne({ col, 'data.id': Number(data.id) });
      if (existing) {
        const merged = { ...existing.data, ...data, updatedAt: now };
        existing.data = merged;
        existing.updatedAt = new Date();
        await existing.save();
        return res.status(200).json(merged); // 200 = updated (not 201 created)
      }
    }

    // ── 1. Atomic internal ID ──────────────────────────────────────
    const existingDocs = await Document.find({ col }).select('data.id').lean();
    const existingIds  = existingDocs.map(d => Number(d.data?.id) || 0);
    const currentMaxId = existingIds.length ? Math.max(...existingIds) : 0;
    await Counter.initFromMax(`id_${col}`, currentMaxId, 1);
    const nextCounterId = await Counter.nextSeq(`id_${col}`);

    const finalId = (data.id !== undefined && data.id !== null && !isNaN(Number(data.id)))
      ? Number(data.id)
      : nextCounterId;

    if (finalId >= nextCounterId) {
      await Counter.initFromMax(`id_${col}`, finalId, 1);
    }

    // ── 2. Atomic BR number — reject duplicates ───────────────────
    let brNum = data.brNum;
    if (col === 'brs') {
      const brYear = data.year || year;
      // If client sent a manual brNum, check it's not already taken
      if (brNum) {
        const dup = await Document.findOne({ col: 'brs', 'data.brNum': Number(brNum), 'data.year': brYear });
        if (dup) {
          return res.status(409).json({ error: `Le numéro BR ${brNum} est déjà utilisé pour l'année ${brYear}` });
        }
      } else {
        // Auto-assign from atomic counter
        const counterId = `brs_${brYear}`;
        const existing = await Counter.findOne({ _id: counterId });
        if (!existing) {
          const docs = await Document.find({ col: 'brs', 'data.year': brYear }).lean();
          const nums = docs.map(d => parseInt(d.data?.brNum) || 0);
          const currentMax = nums.length ? Math.max(...nums) : 99;
          await Counter.create({ _id: counterId, seq: currentMax });
        }
        brNum = await Counter.nextSeq(counterId);
      }
      // Rebuild ref server-side to match the actual brNum
      const suppAbbrev = data.ref?.match(/\/([A-Z]+)\//)?.[1] || '';
      const n = String(brNum).padStart(3, '0');
      data.ref = suppAbbrev ? `${n}/BR/${suppAbbrev}/${data.year || brYear}` : `BR/${n}/${data.year || brYear}`;
    }

    // ── 3. Build final document ────────────────────────────────────
    const newData = {
      ...data,
      id:        finalId,
      ...(col === 'brs' ? { brNum: Number(brNum) } : {}),
      createdAt:    data.createdAt || now,
      updatedAt:    now,
      createdBy:    data.createdBy    ?? req.user.id,
      createdByName: data.createdByName ?? req.user.name,
    };

    await Document.create({ col, data: newData });
    res.status(201).json(newData);

  } catch (e) {
    console.error('[DATA/POST]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/:col/bulk  (safe upsert — never deletes) ─────
// Only used for migration. Uses upsert-by-id so running it twice
// never creates duplicates. Does NOT delete anything.
router.put('/:col/bulk', async (req, res) => {
  try {
    const col   = req.params.col;
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array expected' });

    if (items.length) {
      const ops = items.map(item => ({
        updateOne: {
          filter: { col, 'data.id': item.id },
          update: { $set: { col, data: item, updatedAt: new Date() } },
          upsert: true  // insert if not found, update if found — NEVER duplicates
        }
      }));
      await Document.bulkWrite(ops);
    }

    res.json({ synced: items.length });
  } catch (e) {
    console.error('[DATA/BULK]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/:col/:id  (full replace of one doc) ───────────
router.put('/:col/:id', async (req, res) => {
  try {
    const col    = req.params.col;
    const id     = Number(req.params.id);
    const update = { ...req.body, updatedAt: new Date().toISOString() };

    const doc = await Document.findOneAndUpdate(
      { col, 'data.id': id },
      { $set: { data: update, updatedAt: new Date() } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });
    res.json(doc.data);
  } catch (e) {
    console.error('[DATA/PUT]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/data/:col/:id  (partial update) ──────────────────
router.patch('/:col/:id', async (req, res) => {
  try {
    const col = req.params.col;
    const id  = Number(req.params.id);
    const doc = await Document.findOne({ col, 'data.id': id });
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });

    const patch = req.body;

    // ── Duplicate check for BR number on update ──────────────────
    if (col === 'brs' && patch.brNum !== undefined) {
      const brYear = patch.year || doc.data.year || new Date().getFullYear();
      const dup = await Document.findOne({
        col: 'brs', 'data.brNum': Number(patch.brNum), 'data.year': brYear, 'data.id': { $ne: id }
      });
      if (dup) {
        return res.status(409).json({ error: `Le numéro BR ${patch.brNum} est déjà utilisé pour l'année ${brYear}` });
      }
    }


    const merged  = { ...doc.data, ...patch, updatedAt: new Date().toISOString() };
    doc.data      = merged;
    doc.updatedAt = new Date();
    await doc.save();
    res.json(merged);
  } catch (e) {
    console.error('[DATA/PATCH]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /api/data/:col/:id ────────────────────────────────────
router.delete('/:col/:id', async (req, res) => {
  try {
    const col   = req.params.col;
    const rawId = req.params.id;
    const numId = Number(rawId);
    const query = isNaN(numId)
      ? { col, 'data.id': rawId }
      : { col, $or: [{ 'data.id': numId }, { 'data.id': String(numId) }] };
    const result = await Document.deleteOne(query);
    if (!result.deletedCount) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ success: true, id: rawId });
  } catch (e) {
    console.error('[DATA/DELETE]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// ─── POST /api/data/:col/dedup  (remove duplicates from a collection) ──
// Admin-only cleanup endpoint. Keeps the FIRST document for each data.id
// and removes all subsequent duplicates.
router.post('/:col/dedup', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    const col = req.params.col;
    const docs = await Document.find({ col }).sort({ createdAt: 1 }).lean();
    const seen = new Set();
    const toDelete = [];
    for (const doc of docs) {
      const key = String(doc.data?.id);
      if (seen.has(key)) {
        toDelete.push(doc._id);
      } else {
        seen.add(key);
      }
    }
    if (toDelete.length) {
      await Document.deleteMany({ _id: { $in: toDelete } });
    }
    res.json({ removed: toDelete.length, remaining: docs.length - toDelete.length });
  } catch (e) {
    console.error('[DATA/DEDUP]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

