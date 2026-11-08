import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');
  const ev24 = await coll.findOne({ col: 'etat_vente_docs', 'data.id': 24 });
  const d = ev24.data;
  console.log('EV #24 Keys & values (scalar):');
  for (const k of Object.keys(d)) {
    if (!Array.isArray(d[k]) && typeof d[k] !== 'object') {
      console.log(`  ${k}: ${d[k]}`);
    } else if (Array.isArray(d[k])) {
      console.log(`  ${k}: Array(${d[k].length})`);
    } else {
      console.log(`  ${k}: Object`);
    }
  }
  await mongoose.disconnect();
}
run();
