import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('MongoDB Collections:', collections.map(c => c.name));

  const coll = mongoose.connection.db.collection('documents');
  const distinctCols = await coll.distinct('col');
  console.log('Distinct "col" in documents collection:', distinctCols);

  for (const c of distinctCols) {
    const count = await coll.countDocuments({ col: c });
    console.log(`  col '${c}': ${count}`);
  }

  // Also check if there are other collections
  for (const c of collections) {
    if (c.name !== 'documents') {
      const cnt = await mongoose.connection.db.collection(c.name).countDocuments();
      console.log(`Collection '${c.name}': ${cnt}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
