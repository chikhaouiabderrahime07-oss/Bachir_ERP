import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');
  const latestAuditLog = await coll.find({ col: 'audit_log' }).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('Latest audit_log entries:');
  for (const l of latestAuditLog) {
    console.log(`  id: ${l.data?.id}, action: ${l.data?.action}, user: ${l.data?.userName}, createdAt: ${l.createdAt}`);
  }
  const latestDocUpdated = await coll.find({}).sort({ updatedAt: -1 }).limit(5).toArray();
  console.log('Latest updated documents across entire database:');
  for (const d of latestDocUpdated) {
    console.log(`  col: ${d.col}, id: ${d.data?.id}, updatedAt: ${d.updatedAt}`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
