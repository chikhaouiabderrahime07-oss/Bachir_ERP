import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');
  
  const sampleBL = await coll.findOne({ col: 'bls' });
  console.log('Sample BL structure:');
  console.log(JSON.stringify(sampleBL, null, 2));

  // Check direct factory BLs, returned BLs, highest amount BLs
  const returnedBLs = await coll.find({ col: 'bls', $or: [{ status: 'returned' }, { 'data.status': 'returned' }, { 'data.isReturned': true }] }).toArray();
  console.log('Returned BLs count:', returnedBLs.length);
  returnedBLs.forEach(b => console.log('Returned BL:', b.data?.id, b.data?.ref, b.data?.totalTTC, b.data?.status));

  // Check direct factory indicators
  const allBLs = await coll.find({ col: 'bls' }).toArray();
  const directTypes = new Set();
  allBLs.forEach(b => {
    const d = b.data || {};
    if (d.type) directTypes.add('type:' + d.type);
    if (d.isDirect !== undefined) directTypes.add('isDirect:' + d.isDirect);
    if (d.isUsine !== undefined) directTypes.add('isUsine:' + d.isUsine);
    if (d.factory !== undefined) directTypes.add('factory:' + d.factory);
    if (d.destination) directTypes.add('destination:' + d.destination);
  });
  console.log('Distinct BL indicators:', Array.from(directTypes));

  await mongoose.disconnect();
}

run().catch(console.error);
