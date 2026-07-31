const cron = require('node-cron');
const { createBackup } = require('../routes/backup');

/**
 * Runs every night at 23:59 (server timezone = UTC, Algeria = UTC+1)
 * So we schedule at 22:59 UTC to hit 23:59 Algeria time.
 * 
 * Cron format: second(optional) minute hour day month weekday
 *   "59 22 * * *" = 22:59 UTC = 23:59 Algeria time
 */
function startBackupCron() {
  cron.schedule('59 22 * * *', async () => {
    try {
      const label = `Automatique — ${new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' })}`;
      const backup = await createBackup(label, 'auto', 'system');
      console.log(`✅ [CRON] Sauvegarde automatique créée: ${backup.label} (${backup._id})`);
    } catch (e) {
      console.error('❌ [CRON] Erreur sauvegarde automatique:', e.message);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('⏰ [CRON] Sauvegarde automatique programmée à 23:59 (heure algérienne)');
}

module.exports = { startBackupCron };
