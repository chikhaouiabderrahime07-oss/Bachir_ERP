import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');
  const ev24 = await coll.findOne({ col: 'etat_vente_docs', 'data.id': 24 });
  console.log('EV #24 Full data object:');
  console.log(JSON.stringify(ev24?.data, null, 2));

  const ev23 = await coll.findOne({ col: 'etat_vente_docs', 'data.id': 23 });
  console.log('EV #23 Full data object for comparison:');
  console.log(JSON.stringify(ev23?.data, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
