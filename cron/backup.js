const cron = require('node-cron');
const { createBackup, maybeCatchupBackup } = require('../routes/backup');
const Backup = require('../models/Backup');

/**
 * Twice-Daily Automated Backups: Exactly at 12:00 AM and 12:00 PM (Africa/Algiers time).
 * - 12:00 AM Algeria = 23:00 UTC (0 23 * * *)
 * - 12:00 PM Algeria = 11:00 UTC (0 11 * * *)
 * 
 * No continuous 2-minute loops. Zero CPU or database contention during work hours.
 */
function startBackupCron() {
  // 1. 12:00 AM (Midnight) Algeria time
  cron.schedule('0 23 * * *', async () => {
    try {
      const nowStr = new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' });
      const label = `Sauvegarde Automatique (12 AM - Minuit) — ${nowStr}`;
      const backup = await createBackup(label, 'auto', 'system');
      console.log(`✅ [CRON] Sauvegarde automatique 12 AM archivée: ${backup.label}`);
    } catch (e) {
      console.error('❌ [CRON] Erreur sauvegarde 12 AM:', e.message);
    }
  }, { timezone: 'UTC' });

  // 2. 12:00 PM (Midday) Algeria time
  cron.schedule('0 11 * * *', async () => {
    try {
      const nowStr = new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' });
      const label = `Sauvegarde Automatique (12 PM - Midi) — ${nowStr}`;
      const backup = await createBackup(label, 'auto', 'system');
      console.log(`✅ [CRON] Sauvegarde automatique 12 PM archivée: ${backup.label}`);
    } catch (e) {
      console.error('❌ [CRON] Erreur sauvegarde 12 PM:', e.message);
    }
  }, { timezone: 'UTC' });

  // 3. Catch-up check on boot & one-time cleanup of legacy intraday snapshots
  setTimeout(async () => {
    try {
      if (maybeCatchupBackup) {
        await maybeCatchupBackup();
      }
      // Purge any old 2-minute / intraday snapshots from previous versions
      const purged = await Backup.deleteMany({ type: 'intraday' });
      if (purged.deletedCount > 0) {
        console.log(`🧹 [BACKUP] Purgé ${purged.deletedCount} anciens snapshots intraday de MongoDB.`);
      }
    } catch (e) {
      console.warn('⚠️ [BACKUP/boot-cleanup]', e.message);
    }
  }, 60 * 1000); // 1 minute after boot

  console.log('⏰ [CRON] Sauvegardes bi-quotidiennes actives: 12 AM (Minuit) et 12 PM (Midi) uniquement.');
}

module.exports = { startBackupCron };
