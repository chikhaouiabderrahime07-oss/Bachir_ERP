const mongoose = require('mongoose');
const uri = 'mongodb+srv://komanaamana_db_user:IlHafgmh7r6ViWO1@bachir.7kon0li.mongodb.net/erp_bachir?appName=Bachir';
async function run() {
  await mongoose.connect(uri);
  const cols = await mongoose.connection.collection('documents').distinct('col');
  console.log('Collections in MongoDB:', cols);
  for (const c of cols) {
    const count = await mongoose.connection.collection('documents').countDocuments({ col: c });
    console.log(c + ': ' + count);
  }
  await mongoose.disconnect();
}
run();
