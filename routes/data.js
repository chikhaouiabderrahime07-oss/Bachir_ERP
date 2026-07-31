const express  = require('express');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const Counter  = require('../models/Counter');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth); // ALL data routes require authentication

// ═══════════════════════════════════════════════════════════════════
// IMPORTANT: Specific routes MUST come before parameterized routes!
// Express matches routes in order — /settings/main must be declared
// before /:col/:id or Express will treat "settings" as :col and
// "main" as :id, causing a 404.
// ═══════════════════════════════════════════════════════════════════

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
    const current = await Settings.findOne({ key: 'main' });
    const merged  = { ...(current?.value || {}), ...req.body };
    await Settings.findOneAndUpdate(
      { key: 'main' },
      { value: merged },
      { upsert: true, new: true }
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

    // ── 1. Atomic internal ID ──────────────────────────────────────
    const existingDocs = await Document.find({ col }).select('data.id').lean();
    const existingIds  = existingDocs.map(d => Number(d.data?.id) || 0);
    const currentMaxId = existingIds.length ? Math.max(...existingIds) : 0;
    await Counter.initFromMax(`id_${col}`, currentMaxId, 1);
    const newId = await Counter.nextSeq(`id_${col}`);

    // ── 2. Atomic BR number ────────────────────────────────────────
    let brNum = data.brNum;
    if (col === 'brs') {
      const existingBrs  = await Document.find({ col: 'brs', 'data.year': year }).select('data.brNum').lean();
      const existingNums = existingBrs.map(d => Number(d.data?.brNum) || 0);
      const currentMaxBr = existingNums.length ? Math.max(...existingNums) : 99;
      await Counter.initFromMax(`brNum_${year}`, currentMaxBr, 100);
      brNum = await Counter.nextSeq(`brNum_${year}`);
    }

    // ── 3. Atomic BL number ────────────────────────────────────────
    let blNum = data.blNum;
    if (col === 'bls') {
      const existingBls  = await Document.find({ col: 'bls', 'data.year': year }).select('data.blNum').lean();
      const existingNums = existingBls.map(d => Number(d.data?.blNum) || 0);
      const currentMaxBl = existingNums.length ? Math.max(...existingNums) : 99;
      await Counter.initFromMax(`blNum_${year}`, currentMaxBl, 100);
      blNum = await Counter.nextSeq(`blNum_${year}`);
    }

    // ── 4. Build final document ────────────────────────────────────
    const newData = {
      ...data,
      id:        newId,
      ...(col === 'brs' ? { brNum } : {}),
      ...(col === 'bls' ? { blNum } : {}),
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

// ─── PUT /api/data/:col/bulk  (full collection upsert) ───────────
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
          upsert: true
        }
      }));
      await Document.bulkWrite(ops);
    }

    // Remove stale docs not in new list
    const ids = items.map(i => i.id);
    await Document.deleteMany({ col, 'data.id': { $nin: ids } });

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

    const merged  = { ...doc.data, ...req.body, updatedAt: new Date().toISOString() };
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
    const col    = req.params.col;
    const id     = Number(req.params.id);
    const result = await Document.deleteOne({ col, 'data.id': id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ success: true, id });
  } catch (e) {
    console.error('[DATA/DELETE]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
