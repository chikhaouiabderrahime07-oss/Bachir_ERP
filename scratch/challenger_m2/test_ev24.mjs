import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  // Find EV #24
  const ev24 = await coll.findOne({ col: 'etat_vente_docs', $or: [{ 'data.id': 24 }, { 'data.ref': 'ET/23102027/10/26' }] });
  console.log('EV #24 Doc Found:');
  console.log('ID:', ev24?.data?.id);
  console.log('Ref:', ev24?.data?.ref);
  console.log('Date:', ev24?.data?.date);
  console.log('SessionId:', ev24?.data?.sessionId);
  console.log('Stored HT:', ev24?.data?.totalHT);
  console.log('Stored TVA:', ev24?.data?.totalTVA);
  console.log('Stored Timbre:', ev24?.data?.timbreFiscal);
  console.log('Stored TTC:', ev24?.data?.totalTTC);
  console.log('Stored RealBCHNet:', ev24?.data?.realBchNet);
  console.log('Stored EcartFiscal:', ev24?.data?.ecartFiscal);
  console.log('Number of items in EV #24:', ev24?.data?.items?.length);
  console.log('Linked BL count in bls array:', ev24?.data?.bls?.length || ev24?.data?.blRefs?.length);
  console.log('BLs field:', JSON.stringify(ev24?.data?.bls || ev24?.data?.blRefs));

  // Find the BLs linked to this EV
  // Check how BLs are linked to EV: by sessionId (20), or by date (2026-10-22) and user ALLAC (3), or by explicit array
  const blRefs = ev24?.data?.blRefs || (ev24?.data?.bls || []).map(b => typeof b === 'string' ? b : b.ref || b);
  console.log('Explicit BL refs count:', blRefs?.length);

  // Let's also query BLs for user 3 on date 2026-10-22
  const queryBLs = await coll.find({
    col: 'bls',
    $or: [
      { 'data.ref': { $in: blRefs || [] } },
      { 'data.date': '2026-10-22', 'data.createdBy': 3 }
    ]
  }).toArray();
  console.log(`Found ${queryBLs.length} BLs matching EV #24 criteria.`);

  // Let's aggregate items from these BLs
  const itemMap = {};
  let blTotalHT = 0, blTotalTVA = 0, blTotalTimbre = 0, blTotalTTC = 0;

  for (const b of queryBLs) {
    const d = b.data;
    blTotalHT = round2(blTotalHT + (d.totalHT || 0));
    blTotalTVA = round2(blTotalTVA + (d.tvaAmount || 0));
    blTotalTimbre = round2(blTotalTimbre + (d.timbreAmount || 0));
    blTotalTTC = round2(blTotalTTC + (d.totalTTC || 0));

    for (const line of d.lines || []) {
      const des = line.designation;
      const qty = Number(line.qtyDelivered ?? line.qty) || 0;
      const price = Number(line.price) || 0;
      if (!itemMap[des]) {
        itemMap[des] = { designation: des, qty: 0, bchTotal: 0, unitPrice: price };
      }
      itemMap[des].qty += qty;
      itemMap[des].bchTotal = round2(itemMap[des].bchTotal + round2(qty * price));
    }
  }

  console.log('\n--- BL Aggregation for EV #24 ---');
  console.log('Total BL count:', queryBLs.length);
  console.log('Sum BL HT:', blTotalHT);
  console.log('Sum BL TVA:', blTotalTVA);
  console.log('Sum BL Timbre:', blTotalTimbre);
  console.log('Sum BL TTC (Real BCH Gross):', blTotalTTC);

  // Now calculate EV fiscal figures from aggregated items
  // In EV calculation:
  // EV HT = sum of (qty * evUnitPrice)
  // Let's check evUnitPrice vs bch price: EV items in ev24
  console.log('\nEV #24 Stored Items vs BL Aggregation:');
  let calcEvHT = 0;
  for (const it of ev24?.data?.items || []) {
    const match = itemMap[it.designation];
    console.log(`  Item: "${it.designation}"`);
    console.log(`    EV Qty: ${it.qty}, BL Qty: ${match?.qty}, Delta Qty: ${(it.qty || 0) - (match?.qty || 0)}`);
    console.log(`    EV UnitPrice: ${it.unitPrice}, Stored Total: ${it.total}`);
    calcEvHT = round2(calcEvHT + round2(it.qty * it.unitPrice));
  }

  const calcEvTVA = round2(calcEvHT * 0.19);
  const calcEvTimbre = round2((calcEvHT + calcEvTVA) * 0.01);
  const calcEvTTC = round2(calcEvHT + calcEvTVA + calcEvTimbre);

  console.log('\n--- Recomputed EV #24 Totals from BL lines ---');
  console.log('Calculated EV HT:', calcEvHT, 'Stored EV HT:', ev24?.data?.totalHT);
  console.log('Calculated EV TVA:', calcEvTVA, 'Stored EV TVA:', ev24?.data?.totalTVA);
  console.log('Calculated EV Timbre (1%):', calcEvTimbre, 'Stored EV Timbre:', ev24?.data?.timbreFiscal);
  console.log('Calculated EV TTC:', calcEvTTC, 'Stored EV TTC:', ev24?.data?.totalTTC);

  // Variance / Ecart Fiscal
  const realBchNet = blTotalTTC; // no returns for user 3 on 2026-10-22
  const formulaB = round2(calcEvTTC - realBchNet);
  const formulaA = round2(realBchNet - calcEvTTC);

  console.log('\n--- Écart Fiscal Analysis ---');
  console.log('Real BCH Net:', realBchNet);
  console.log('Stored EV TTC:', ev24?.data?.totalTTC);
  console.log('Formula B (EV - BCH):', formulaB);
  console.log('Formula A (BCH - EV):', formulaA);
  console.log('Stored ecartFiscal in EV #24:', ev24?.data?.ecartFiscal);

  // Check Caisse Admin Entry #204
  const caisseEntries = await coll.find({ col: 'caisse_admin', $or: [{ 'data.id': 204 }, { 'data.etatVenteId': 24 }, { 'data.notes': { $regex: '23102027|ET/24' } }] }).toArray();
  console.log('\nCaisse admin entries related to EV #24:');
  caisseEntries.forEach(c => {
    console.log(`  Caisse #${c.data.id} Type: ${c.data.type} Source: ${c.data.source} Amt: ${c.data.amount} ecartFiscal: ${c.data.ecartFiscal} Notes: ${c.data.notes}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
