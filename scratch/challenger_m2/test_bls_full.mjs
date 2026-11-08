import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

function calcTimbre(amountHT, tvaAmount, slabs, settings) {
  const ht = Number(amountHT) || 0;
  if (ht <= 0) return 0;
  const tva = tvaAmount !== undefined && tvaAmount !== null ? Number(tvaAmount) : round2(ht * 0.19);
  const baseAmt = round2(ht + tva);
  if (baseAmt <= 0) return 0;

  let globalRate = Number(settings?.timbreRate) || 0.01;
  let globalPerTranche = Number(settings?.timbrePerTranche) || 1.0;
  const timbreMin = Number(settings?.timbreMin) || 0;
  const timbreMax = Number(settings?.timbreMax) || 0;
  const useCeil = settings?.timbreUseCeil === true;

  let rate = globalRate;
  let perTranche = globalPerTranche;
  let slabCap = 0;

  if (slabs && slabs.length) {
    const slab = slabs.find(sl => {
      const min = Number(sl.min) || 0;
      const max = (sl.max !== null && sl.max !== undefined && sl.max !== '') ? Number(sl.max) : Infinity;
      return baseAmt >= min && baseAmt <= max;
    });
    if (slab) {
      rate = Number(slab.rate) || globalRate;
      perTranche = Number(slab.perTranche) || globalPerTranche;
      slabCap = Number(slab.cap) || 0;
    }
  }

  const tranches = useCeil ? Math.ceil(baseAmt * rate) : (baseAmt * rate);
  let timbre = tranches * perTranche;
  if (timbreMin > 0) timbre = Math.max(timbreMin, timbre);
  if (slabCap > 0) timbre = Math.min(slabCap, timbre);
  else if (timbreMax > 0) timbre = Math.min(timbreMax, timbre);
  return round2(timbre);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  const slabDoc = await coll.findOne({ col: 'timbre_slabs', 'data.key': 'main' });
  const slabs = slabDoc?.data?.slabs || [
    { min: 0, max: 30000, rate: 0.01, perTranche: 1 },
    { min: 30001, max: 100000, rate: 0.01, perTranche: 1.5 },
    { min: 100001, max: null, rate: 0.01, perTranche: 2 }
  ];

  const settingsDoc = await mongoose.connection.db.collection('settings').findOne({ key: 'main' });
  const settings = settingsDoc || {};

  const blDocs = await coll.find({ col: 'bls' }).toArray();
  console.log(`Loaded ${blDocs.length} BL documents from MongoDB Atlas.`);

  let lineDiscrepancies = [];
  let htDiscrepancies = [];
  let tvaDiscrepancies = [];
  let timbreDiscrepancies = [];
  let ttcDiscrepancies = [];
  let sumStoredHT = 0, sumCalcHT = 0;
  let sumStoredTVA = 0, sumCalcTVA = 0;
  let sumStoredTimbre = 0, sumCalcTimbre = 0;
  let sumStoredTTC = 0, sumCalcTTC = 0;

  const sources = {};
  const statuses = {};
  let withDiscount = [];
  let multiLineBLs = [];
  let returnedBLs = [];
  let zeroOrNegativeBLs = [];

  for (const doc of blDocs) {
    const d = doc.data || {};
    const id = d.id;
    const ref = d.ref;
    const status = d.status || 'unknown';
    const source = d.source || 'none';

    sources[source] = (sources[source] || 0) + 1;
    statuses[status] = (statuses[status] || 0) + 1;

    if (d.status === 'returned' || d.isReturned) {
      returnedBLs.push(d);
    }

    const lines = d.lines || [];
    if (lines.length > 1) {
      multiLineBLs.push({ id, ref, linesCount: lines.length });
    }

    let calculatedHT = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const qty = Number(line.qtyDelivered ?? line.qty) || 0;
      const price = Number(line.price) || 0;
      const disc = Number(line.disc) || 0;
      if (disc > 0) withDiscount.push({ id, ref, disc });

      const lineTotalCalc = round2(qty * price * (1 - disc / 100));
      const lineTotalStored = round2(line.total);

      if (Math.abs(lineTotalCalc - lineTotalStored) > 0.01) {
        lineDiscrepancies.push({ id, ref, lineIdx: i, calc: lineTotalCalc, stored: lineTotalStored });
      }
      calculatedHT = round2(calculatedHT + lineTotalCalc);
    }

    const storedHT = round2(d.totalHT);
    const calculatedTVA = round2(calculatedHT * 0.19);
    const storedTVA = round2(d.tvaAmount);

    const calculatedTimbre = d.noTimbre ? 0 : calcTimbre(calculatedHT, calculatedTVA, slabs, settings);
    const storedTimbre = round2(d.timbreAmount);

    const calculatedTTC = round2(calculatedHT + calculatedTVA + calculatedTimbre);
    const storedTTC = round2(d.totalTTC);

    if (Math.abs(calculatedHT - storedHT) > 0.01) {
      htDiscrepancies.push({ id, ref, calc: calculatedHT, stored: storedHT });
    }
    if (Math.abs(calculatedTVA - storedTVA) > 0.01) {
      tvaDiscrepancies.push({ id, ref, calc: calculatedTVA, stored: storedTVA });
    }
    if (Math.abs(calculatedTimbre - storedTimbre) > 0.01) {
      timbreDiscrepancies.push({ id, ref, calc: calculatedTimbre, stored: storedTimbre });
    }
    if (Math.abs(calculatedTTC - storedTTC) > 0.01) {
      ttcDiscrepancies.push({ id, ref, calc: calculatedTTC, stored: storedTTC });
    }

    if (storedTTC <= 0) {
      zeroOrNegativeBLs.push({ id, ref, storedTTC });
    }

    sumStoredHT = round2(sumStoredHT + storedHT);
    sumCalcHT = round2(sumCalcHT + calculatedHT);
    sumStoredTVA = round2(sumStoredTVA + storedTVA);
    sumCalcTVA = round2(sumCalcTVA + calculatedTVA);
    sumStoredTimbre = round2(sumStoredTimbre + storedTimbre);
    sumCalcTimbre = round2(sumCalcTimbre + calculatedTimbre);
    sumStoredTTC = round2(sumStoredTTC + storedTTC);
    sumCalcTTC = round2(sumCalcTTC + calculatedTTC);
  }

  console.log('--- BL AUDIT RESULTS ---');
  console.log('Total BLs:', blDocs.length);
  console.log('Sources:', sources);
  console.log('Statuses:', statuses);
  console.log('Multi-line BLs count:', multiLineBLs.length);
  console.log('With discount count:', withDiscount.length);
  console.log('Returned BLs count:', returnedBLs.length);
  console.log('Zero or negative BLs count:', zeroOrNegativeBLs.length);
  console.log('Sum HT: Stored =', sumStoredHT, ', Calc =', sumCalcHT, ', Delta =', round2(sumStoredHT - sumCalcHT));
  console.log('Sum TVA: Stored =', sumStoredTVA, ', Calc =', sumCalcTVA, ', Delta =', round2(sumStoredTVA - sumCalcTVA));
  console.log('Sum Timbre: Stored =', sumStoredTimbre, ', Calc =', sumCalcTimbre, ', Delta =', round2(sumStoredTimbre - sumCalcTimbre));
  console.log('Sum TTC: Stored =', sumStoredTTC, ', Calc =', sumCalcTTC, ', Delta =', round2(sumStoredTTC - sumCalcTTC));
  console.log('Line discrepancies:', lineDiscrepancies.length);
  console.log('HT discrepancies:', htDiscrepancies.length);
  console.log('TVA discrepancies:', tvaDiscrepancies.length);
  console.log('Timbre discrepancies:', timbreDiscrepancies.length);
  console.log('TTC discrepancies:', ttcDiscrepancies.length);

  // Top 10 Highest BLs
  const sortedByTTC = [...blDocs].sort((a, b) => (b.data?.totalTTC || 0) - (a.data?.totalTTC || 0));
  console.log('\nTop 5 Highest BLs:');
  sortedByTTC.slice(0, 5).forEach(b => {
    const d = b.data;
    console.log(`  BL #${d.id} (${d.ref}) Date: ${d.date} TTC: ${d.totalTTC} HT: ${d.totalHT} TVA: ${d.tvaAmount} Timbre: ${d.timbreAmount}`);
  });

  // Returned BLs inspection
  console.log('\nReturned BLs detail:');
  returnedBLs.forEach(d => {
    console.log(`  BL #${d.id} (${d.ref}) Date: ${d.date} TTC: ${d.totalTTC} Status: ${d.status} ReturnRef: ${d.returnRef}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
