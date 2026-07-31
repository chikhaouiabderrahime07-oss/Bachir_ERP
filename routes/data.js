const express  = require('express');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth); // ALL data routes require authentication

// ─── Helper: get next auto-increment id per collection ───────────
async function nextId(col) {
  const docs = await Document.find({ col }).select('data.id').lean();
  const ids = docs.map(d => Number(d.data?.id) || 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

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
    const doc = await Document.findOne({ col: req.params.col, 'data.id': Number(req.params.id) }).lean();
    if (!doc) return res.status(404).json({ error: 'Non trouvé' });
    res.json(doc.data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/data/:col  (insert new doc) ───────────────────────
router.post('/:col', async (req, res) => {
  try {
    const col  = req.params.col;
    const data = req.body;
    const id   = data.id || await nextId(col);
    const now  = new Date().toISOString();

    const newData = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: now,
      createdBy: data.createdBy ?? req.user.id,
      userName:  data.userName  ?? req.user.name,
    };

    await Document.create({ col, data: newData });
    res.status(201).json(newData);
  } catch (e) {
    console.error('[DATA/POST]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /api/data/:col/:id  (update doc) ────────────────────────
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

    const merged = { ...doc.data, ...req.body, updatedAt: new Date().toISOString() };
    doc.data     = merged;
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
    const col = req.params.col;
    const id  = Number(req.params.id);
    const result = await Document.deleteOne({ col, 'data.id': id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ success: true, id });
  } catch (e) {
    console.error('[DATA/DELETE]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/data/settings/main ─────────────────────────────────
router.get('/settings/main', async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'main' }).lean();
    if (!s) s = { value: {} };
    res.json(s.value);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/data/settings/main ───────────────────────────────
router.patch('/settings/main', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    const current = await Settings.findOne({ key: 'main' });
    const merged  = { ...(current?.value || {}), ...req.body };
    await Settings.findOneAndUpdate({ key: 'main' }, { value: merged }, { upsert: true, new: true });
    res.json(merged);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
