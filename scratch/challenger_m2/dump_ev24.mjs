import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');
  const ev24 = await coll.findOne({ col: 'etat_vente_docs', 'data.id': 24 });
  console.log(JSON.stringify(ev24?.data, null, 2));
  await mongoose.disconnect();
}
run();
