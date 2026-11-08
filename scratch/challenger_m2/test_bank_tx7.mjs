import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  console.log('--- BANK TX #7 INSPECTION ---');
  const btx7 = await coll.findOne({ col: 'bank_transactions', 'data.id': 7 });
  console.log('Bank Tx #7 full data:');
  console.log(JSON.stringify(btx7, null, 2));

  console.log('\n--- SEARCHING CAISSE_ADMIN FOR 200,000 DA ---');
  const allCaisse = await coll.find({ col: 'caisse_admin' }).toArray();
  console.log(`Total caisse_admin documents: ${allCaisse.length}`);

  // 1. Any entry with amount 200,000
  const matchAmount = allCaisse.filter(c => Math.abs(c.data?.amount || 0) === 200000);
  console.log(`Entries with amount 200,000: ${matchAmount.length}`);
  matchAmount.forEach(c => console.log('  Found:', c.data));

  // 2. Any entry mentioning 200000, 200 000, BTX-0886, or virement in notes
  const matchText = allCaisse.filter(c => {
    const str = JSON.stringify(c.data || {}).toLowerCase();
    return str.includes('200000') || str.includes('200 000') || str.includes('btx-0886') || str.includes('btx');
  });
  console.log(`Entries matching text search (200000 / BTX): ${matchText.length}`);
  matchText.forEach(c => console.log('  Found text match:', c.data));

  // 3. Search for any withdrawal in September 2026
  const septWithdrawals = allCaisse.filter(c => {
    const d = c.data || {};
    return d.type === 'withdrawal' && (d.date?.startsWith('2026-09') || d.createdAt?.startsWith('2026-09'));
  });
  console.log(`\nCaisse withdrawals dated in September 2026: ${septWithdrawals.length}`);
  septWithdrawals.forEach(c => console.log('  Sept withdrawal:', c.data?.id, c.data?.date, c.data?.amount, c.data?.source, c.data?.notes));

  // 4. Search in recycle_bin
  console.log('\n--- SEARCHING RECYCLE_BIN ---');
  const recycleItems = await coll.find({ col: 'recycle_bin' }).toArray();
  console.log(`Total items in recycle_bin: ${recycleItems.length}`);
  const caisseRecycle = recycleItems.filter(r => {
    const s = JSON.stringify(r).toLowerCase();
    return s.includes('caisse') || s.includes('200000') || s.includes('200 000');
  });
  console.log(`Recycle bin items related to caisse / 200000: ${caisseRecycle.length}`);
  caisseRecycle.forEach(r => console.log('  Recycle item:', r));

  // 5. Search in audit_log for 200,000
  console.log('\n--- SEARCHING AUDIT_LOG FOR 200,000 ---');
  const auditLogs = await coll.find({
    col: 'audit_log',
    $or: [
      { 'data.details': { $regex: '200000|200 000|BTX-0886' } },
      { 'data.action': { $regex: '200000|200 000|BTX-0886' } },
      { 'data.entityId': 7 }
    ]
  }).toArray();
  console.log(`Audit log entries matching 200000 / Tx 7: ${auditLogs.length}`);
  auditLogs.forEach(a => console.log('  Audit log:', a.data));

  // 6. Check settings.main bank accounts
  console.log('\n--- CHECKING SETTINGS.MAIN BANK ACCOUNTS ---');
  const settingsDoc = await mongoose.connection.db.collection('settings').findOne({ key: 'main' });
  console.log('Settings banks:', JSON.stringify(settingsDoc?.banks, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
