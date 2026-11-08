import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  const ev25 = await coll.findOne({ col: 'etat_vente_docs', 'data.id': 25 });
  console.log('--- EV #25 STORED DOCUMENT ---');
  const d = ev25.data;
  console.log('ID:', d.id, 'Ref:', d.ref, 'Date:', d.date);
  console.log('SessionId:', d.sessionId);
  console.log('Stored totalHT:', d.totalHT);
  console.log('Stored tvaAmount:', d.tvaAmount);
  console.log('Stored timbreAmount:', d.timbreAmount);
  console.log('Stored totalTTC (Net EV TTC):', d.totalTTC);
  console.log('Stored grossTotalTTC:', d.grossTotalTTC);
  console.log('Stored totalReturnsTTC:', d.totalReturnsTTC);
  console.log('Stored returnsTotalTTC:', d.returnsTotalTTC);
  console.log('Stored realBchGross:', d.realBchGross);
  console.log('Stored realBchNet:', d.realBchNet);
  console.log('Stored ecartFiscal:', d.ecartFiscal);

  // Bon de Retour #1
  const br1 = await coll.findOne({ col: 'bon_retours', 'data.id': 1 });
  console.log('\n--- BON DE RETOUR #1 ---');
  console.log('BR Data:', JSON.stringify(br1?.data, null, 2));

  // Session #40
  const sess40 = await coll.findOne({ col: 'sessions', 'data.id': 40 });
  console.log('\n--- SESSION #40 ---');
  console.log('Session 40 Data:', JSON.stringify(sess40?.data, null, 2));

  // Caisse entry #216
  const caisseEntries = await coll.find({ col: 'caisse_admin', $or: [{ 'data.etatVenteId': 25 }, { 'data.sessionId': 40 }, { 'data.id': 216 }] }).toArray();
  console.log('\n--- CAISSE ADMIN ENTRIES FOR EV #25 / SESS 40 ---');
  caisseEntries.forEach(c => {
    console.log(`Caisse #${c.data.id} Type: ${c.data.type} Source: ${c.data.source} Amt: ${c.data.amount} ecartFiscal: ${c.data.ecartFiscal} Notes: ${c.data.notes}`);
  });

  // Mathematical Distortion Analysis:
  console.log('\n--- MATHEMATICAL DISTORTION RECONCILIATION ---');
  const grossEvTTC = round2(d.grossTotalTTC);
  const netEvTTC = round2(d.totalTTC);
  const realBchNet = round2(d.realBchNet);
  const returnBchTTC = round2(br1?.data?.totalTTC || 138969.81);

  console.log('Gross EV TTC:', grossEvTTC);
  console.log('Net EV TTC:', netEvTTC);
  console.log('Return EV TTC Delta (Gross EV TTC - Net EV TTC):', round2(grossEvTTC - netEvTTC));
  console.log('Return BCH TTC (from Bon de Retour):', returnBchTTC);
  console.log('Real BCH Net:', realBchNet);

  const erroneousDistortedEcart = round2(grossEvTTC - realBchNet);
  console.log('Erroneous Formula (Gross EV TTC - Real BCH Net):', erroneousDistortedEcart);
  console.log('Stored ecartFiscal in EV #25:', d.ecartFiscal);
  console.log('Matches stored ecartFiscal exactly?:', erroneousDistortedEcart === d.ecartFiscal);

  const trueFormulaBEcart = round2(netEvTTC - realBchNet);
  const trueFormulaAEcart = round2(realBchNet - netEvTTC);
  console.log('True Formula B (Net EV TTC - Real BCH Net):', trueFormulaBEcart);
  console.log('True Formula A (Real BCH Net - Net EV TTC):', trueFormulaAEcart);

  const distortionDelta = round2(d.ecartFiscal - trueFormulaBEcart);
  console.log('Distortion Delta (Stored - Formula B):', distortionDelta);

  await mongoose.disconnect();
}

run().catch(console.error);
