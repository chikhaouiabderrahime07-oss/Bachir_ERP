const cron = require('node-cron');
const { createBackup, maybeDailyBackup } = require('../routes/backup');

/**
 * Nightly backup at 23:59 Algeria time (22:59 UTC).
 *
 * IMPORTANT: on Render's free tier the service sleeps after 15 min of
 * inactivity, and a sleeping process cannot run cron jobs. So we ALSO run a
 * catch-up check: shortly after every boot, hourly while awake, and on every
 * admin login (see routes/auth.js). It only creates a backup if the last
 * automatic one is older than 20 hours, so nothing is duplicated.
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
  }, { timezone: 'UTC' });

  const catchUp = () => maybeDailyBackup().catch(e => console.error('❌ [BACKUP/catch-up]', e.message));
  setTimeout(catchUp, 60 * 1000);          // after boot / wake-up
  setInterval(catchUp, 60 * 60 * 1000);    // hourly while awake

  console.log('⏰ [CRON] Sauvegarde automatique 23:59 (heure algérienne) + rattrapage au réveil');
}

module.exports = { startBackupCron, maybeDailyBackup };
