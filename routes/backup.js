const express  = require('express');
const Document = require('../models/Document');
const Settings = require('../models/Settings');
const Backup   = require('../models/Backup');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// All backup routes require admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins uniquement' });
  next();
};
router.use(adminOnly);

// ─── Core backup function ─────────────────────────────────────────
async function createBackup(label, type = 'auto', createdBy = 'system') {
  const COLLECTIONS = [
    'users', 'brs', 'bls', 'suppliers', 'clients',
    'caisse_admin', 'sessions', 'catalogue', 'history', 'audit_log',
    'work_log', 'inventory'
  ];

  const snapshot = {};
  for (const col of COLLECTIONS) {
    const docs = await Document.find({ col }).lean();
    snapshot[col] = docs.map(d => d.data);
  }
  const settings = await Settings.findOne({ key: 'main' }).lean();
  snapshot._settings = settings?.value || {};
  snapshot._timestamp = new Date().toISOString();

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const backup = await Backup.create({
    label,
    type,
    createdBy,
    data: snapshot,
    expiresAt: thirtyDaysFromNow,
  });

  return backup;
}

// ─── GET /api/backup  (list all backups) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const backups = await Backup.find()
      .select('label type createdBy createdAt expiresAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(backups);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/backup  (create manual backup) ────────────────────
router.post('/', async (req, res) => {
  try {
    const label = req.body.label || `Manuel — ${new Date().toLocaleString('fr-FR')}`;
    const backup = await createBackup(label, 'manual', req.user.name);
    res.status(201).json({ success: true, id: backup._id, label: backup.label });
  } catch (e) {
    console.error('[BACKUP/create]', e);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// ─── POST /api/backup/:id/restore  (restore a backup) ────────────
router.post('/:id/restore', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id).lean();
    if (!backup) return res.status(404).json({ error: 'Sauvegarde non trouvée' });

    // Create a safety backup of current state before restoring
    await createBackup(`Avant restauration — ${new Date().toLocaleString('fr-FR')}`, 'auto', 'system');

    // Restore each collection
    for (const [col, items] of Object.entries(backup.data)) {
      if (col.startsWith('_')) continue; // skip _settings, _timestamp
      await Document.deleteMany({ col });
      if (items.length) {
        await Document.insertMany(items.map(data => ({ col, data })));
      }
    }

    // Restore settings
    if (backup.data._settings) {
      await Settings.findOneAndUpdate(
        { key: 'main' },
        { value: backup.data._settings },
        { upsert: true }
      );
    }

    res.json({ success: true, message: `Restauration effectuée depuis: ${backup.label}` });
  } catch (e) {
    console.error('[BACKUP/restore]', e);
    res.status(500).json({ error: 'Erreur lors de la restauration' });
  }
});

// ─── DELETE /api/backup/:id ───────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Backup.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = { router, createBackup };
