import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  const evDocs = await coll.find({ col: 'etat_vente_docs' }).sort({ 'data.id': 1 }).toArray();
  console.log(`Auditing all ${evDocs.length} EV documents comprehensively...`);

  let anomaliesCount = 0;

  for (const doc of evDocs) {
    const d = doc.data;
    const id = d.id;
    const ref = d.ref;
    const date = d.date;

    // 1. Recalculate HT from items
    let calcHT = 0;
    for (const item of d.items || []) {
      const q = Number(item.qty) || 0;
      const p = Number(item.unitPrice) || 0;
      calcHT = round2(calcHT + round2(q * p));
    }

    const storedHT = round2(d.totalHT);
    const calcTVA = round2(calcHT * 0.19);
    const storedTVA = round2(d.tvaAmount ?? d.totalTVA);
    const calcTimbre = round2((calcHT + calcTVA) * 0.01);
    const storedTimbre = round2(d.timbreAmount ?? d.timbreFiscal);
    const calcTTC = round2(calcHT + calcTVA + calcTimbre);
    const storedTTC = round2(d.totalTTC);

    const storedRealBchNet = round2(d.realBchNet);
    const formulaB_ecart = round2(calcTTC - storedRealBchNet);
    const formulaA_ecart = round2(storedRealBchNet - calcTTC);
    const storedEcart = d.ecartFiscal !== undefined ? round2(d.ecartFiscal) : null;

    const htDiff = Math.abs(calcHT - storedHT);
    const tvaDiff = Math.abs(calcTVA - storedTVA);
    const timbreDiff = Math.abs(calcTimbre - storedTimbre);
    const ttcDiff = Math.abs(calcTTC - storedTTC);

    let isDiscrepancy = false;
    let notes = [];

    if (htDiff > 0.01) { isDiscrepancy = true; notes.push(`HT mismatch: calc ${calcHT} vs stored ${storedHT}`); }
    if (tvaDiff > 0.01) { isDiscrepancy = true; notes.push(`TVA mismatch: calc ${calcTVA} vs stored ${storedTVA}`); }
    if (timbreDiff > 0.01) { isDiscrepancy = true; notes.push(`Timbre mismatch: calc ${calcTimbre} vs stored ${storedTimbre}`); }
    if (ttcDiff > 0.01) { isDiscrepancy = true; notes.push(`TTC mismatch: calc ${calcTTC} vs stored ${storedTTC}`); }

    if (storedEcart === null) {
      isDiscrepancy = true;
      notes.push(`Missing ecartFiscal field (null/undefined)`);
    } else {
      const diffB = Math.abs(storedEcart - formulaB_ecart);
      const diffA = Math.abs(storedEcart - formulaA_ecart);
      if (diffB > 0.01 && diffA > 0.01) {
        isDiscrepancy = true;
        notes.push(`Ecart mismatch: stored ${storedEcart} vs FormB ${formulaB_ecart} / FormA ${formulaA_ecart}`);
      }
    }

    if (isDiscrepancy) {
      anomaliesCount++;
      console.log(`[ANOMALY] EV #${id} (${ref}) ${date}: ${notes.join('; ')}`);
    }
  }

  console.log(`\nAudit finished: ${anomaliesCount} anomalies found across ${evDocs.length} EV documents.`);
  await mongoose.disconnect();
}

run().catch(console.error);
