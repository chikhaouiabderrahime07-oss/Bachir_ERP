import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

function calcTimbre(amountHT, tvaAmount, slabs, settings) {
  const ht = Number(amountHT) || 0;
  if (ht <= 0) return 0;
  const tva = tvaAmount !== undefined && tvaAmount !== null ? Number(tvaAmount) : round2(ht * 0.19);
  const baseAmt = round2(ht + tva);
  if (baseAmt <= 0) return 0;

  let globalRate = Number(settings.timbreRate) || 0.01;
  let globalPerTranche = Number(settings.timbrePerTranche) || 1.0;
  const timbreMin = Number(settings.timbreMin) || 0;
  const timbreMax = Number(settings.timbreMax) || 0;
  const useCeil = settings.timbreUseCeil === true;

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

async function runIndependentAudit() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas: erp_bachir');

  const coll = mongoose.connection.db.collection('documents');
  const settingsColl = mongoose.connection.db.collection('settings');

  // 1. Settings & Slabs
  const slabDoc = await coll.findOne({ col: 'timbre_slabs', 'data.key': 'main' });
  const slabs = slabDoc?.data?.slabs || [
    { min: 0, max: 30000, rate: 0.01, perTranche: 1 },
    { min: 30001, max: 100000, rate: 0.01, perTranche: 1.5 },
    { min: 100001, max: null, rate: 0.01, perTranche: 2 }
  ];
  const settingsDoc = await settingsColl.findOne({ key: 'main' });
  const settings = settingsDoc?.value || {};

  // 2. Audit BLs
  const bls = await coll.find({ col: 'bls' }).sort({ 'data.id': 1 }).toArray();
  let bl_storedHT = 0, bl_calcHT = 0;
  let bl_storedTVA = 0, bl_calcTVA = 0;
  let bl_storedTimbre = 0, bl_calcTimbre = 0;
  let bl_storedTTC = 0, bl_calcTTC = 0;
  let bl_lineMismatches = 0;
  let bl_ttcMismatches = 0;
  const bl_statusCounts = {};

  for (const doc of bls) {
    const d = doc.data;
    bl_statusCounts[d.status] = (bl_statusCounts[d.status] || 0) + 1;

    let sumLine = 0;
    for (const l of (d.lines || [])) {
      const q = (l.qtyDelivered !== undefined && l.qtyDelivered !== null) ? Number(l.qtyDelivered) : Number(l.qty || 0);
      const p = Number(l.price || 0);
      const disc = Number(l.disc || 0);
      const expectedLine = round2(q * p * (1 - disc / 100));
      if (Math.abs(expectedLine - Number(l.total || 0)) > 0.01) {
        bl_lineMismatches++;
      }
      sumLine = round2(sumLine + Number(l.total || 0));
    }

    const sHT = Number(d.totalHT || 0);
    const sTVA = Number(d.tvaAmount || 0);
    const sTmb = Number(d.timbreAmount || 0);
    const sTTC = Number(d.totalTTC || 0);

    const cHT = round2(sumLine);
    const cTVA = round2(cHT * (Number(d.tvaRate ?? 19) / 100));
    const cTmb = d.noTimbre ? 0 : calcTimbre(cHT, cTVA, slabs, settings);
    const cTTC = round2(cHT + cTVA + cTmb);

    bl_storedHT += sHT;
    bl_calcHT += cHT;
    bl_storedTVA += sTVA;
    bl_calcTVA += cTVA;
    bl_storedTimbre += sTmb;
    bl_calcTimbre += cTmb;
    bl_storedTTC += sTTC;
    bl_calcTTC += cTTC;

    if (Math.abs(sTTC - cTTC) > 0.01 || Math.abs(sTTC - (sHT + sTVA + sTmb)) > 0.01) {
      bl_ttcMismatches++;
    }
  }

  // 3. Audit EVs
  const evDocs = await coll.find({ col: 'etat_vente_docs' }).sort({ 'data.id': 1 }).toArray();
  let ev_storedHT = 0, ev_calcHT = 0;
  let ev_storedTVA = 0, ev_calcTVA = 0;
  let ev_storedTimbre = 0, ev_calcTimbre = 0;
  let ev_storedTTC = 0, ev_calcTTC = 0;
  let ev_storedRealBchNet = 0;
  let ev_storedEcart = 0;
  const ev_anomalies = [];

  for (const doc of evDocs) {
    const d = doc.data;
    let sumItems = 0;
    for (const it of (d.items || [])) {
      sumItems = round2(sumItems + round2(Number(it.qty || 0) * Number(it.unitPrice || 0)));
    }
    const sHT = Number(d.totalHT || 0);
    const cHT = round2(sumItems);
    const sTVA = Number(d.tvaAmount || 0);
    const cTVA = round2(cHT * 0.19);
    const sTmb = Number(d.timbreAmount || 0);
    const cTmb = round2(round2(cHT + cTVA) * 0.01);
    const sTTC = Number(d.totalTTC ?? d.netTotalTTC ?? 0);
    const cTTC = round2(cHT + cTVA + cTmb);
    const sRealBch = Number(d.realBchNet ?? 0);
    const sEcart = Number(d.ecartFiscal ?? 0);

    ev_storedHT += sHT;
    ev_calcHT += cHT;
    ev_storedTVA += sTVA;
    ev_calcTVA += cTVA;
    ev_storedTimbre += sTmb;
    ev_calcTimbre += cTmb;
    ev_storedTTC += sTTC;
    ev_calcTTC += cTTC;
    ev_storedRealBchNet += sRealBch;
    ev_storedEcart += sEcart;

    const fA = round2(sRealBch - sTTC);
    const fB = round2(sTTC - sRealBch);
    if (Math.abs(sEcart - fB) > 0.02 && Math.abs(sEcart - fA) > 0.02) {
      ev_anomalies.push({
        id: d.id,
        ref: d.ref,
        date: d.date,
        sEcart,
        fA,
        fB,
        sTTC,
        sRealBch
      });
    }
  }

  // 4. Audit Sessions
  const sessions = await coll.find({ col: 'sessions' }).sort({ 'data.id': 1 }).toArray();
  const retours = await coll.find({ col: 'bon_retours' }).toArray();
  let closedCount = 0, openCount = 0;
  let sessionsWithSalesCount = 0;
  let zeroSalesCount = 0;
  let totalSalesStored = 0;
  let totalReturnsStored = 0;
  let totalRealBchNetStored = 0;

  for (const sDoc of sessions) {
    const s = sDoc.data;
    if (s.status === 'closed') closedCount++;
    if (s.status === 'open') openCount++;
    if (Number(s.totalSales || 0) > 0) {
      sessionsWithSalesCount++;
      totalSalesStored += Number(s.totalSales || 0);
      totalReturnsStored += Number(s.totalReturns || 0);
      totalRealBchNetStored += Number(s.realBchNet || 0);
    } else if (s.status === 'closed') {
      zeroSalesCount++;
    }
  }

  // 5. Audit Caisse Admin
  const caisseDocs = await coll.find({ col: 'caisse_admin' }).sort({ 'data.id': 1 }).toArray();
  let caisseDeposits = 0;
  let caisseEVWithdrawals = 0;
  let caisseCharges = 0;
  let caisseOtherWithdrawals = 0;
  let matchEVTTC = 0;
  let matchBCHNet = 0;

  for (const cDoc of caisseDocs) {
    const c = cDoc.data;
    const amt = Number(c.amount || 0);
    if (c.type === 'deposit') {
      caisseDeposits = round2(caisseDeposits + amt);
    } else if (c.type === 'withdrawal') {
      if (c.source === 'transfert_banque_etat_vente') {
        caisseEVWithdrawals = round2(caisseEVWithdrawals + amt);
        const linkedEV = evDocs.find(e => e.data.id === c.etatVenteId || e.data.ref === c.etatVenteRef);
        const evTTC = Number(linkedEV?.data?.totalTTC ?? linkedEV?.data?.netTotalTTC ?? 0);
        const bchNet = Number(c.realBchNet || linkedEV?.data?.realBchNet || 0);
        if (Math.abs(amt - evTTC) <= 0.02) matchEVTTC++;
        if (Math.abs(amt - bchNet) <= 0.02) matchBCHNet++;
      } else if (c.source === 'charge') {
        caisseCharges = round2(caisseCharges + amt);
      } else {
        caisseOtherWithdrawals = round2(caisseOtherWithdrawals + amt);
      }
    }
  }
  const netSafe = round2(caisseDeposits - (caisseEVWithdrawals + caisseCharges + caisseOtherWithdrawals));

  // 6. Audit Bank Transactions
  const bankDocs = await coll.find({ col: 'bank_transactions' }).sort({ 'data.id': 1 }).toArray();
  let bankTotal = 0;
  let bankEVTotal = 0;
  let bankOtherTotal = 0;
  const unmatchedBank = [];

  for (const bDoc of bankDocs) {
    const b = bDoc.data;
    const amt = Number(b.amount || 0);
    bankTotal = round2(bankTotal + amt);
    if (b.subtype === 'etat_vente') {
      bankEVTotal = round2(bankEVTotal + amt);
    } else {
      bankOtherTotal = round2(bankOtherTotal + amt);
    }
    const matchingCaisse = caisseDocs.find(c =>
      c.data.type === 'withdrawal' &&
      (c.data.etatVenteRef === b.etatVenteRef || Math.abs(Number(c.data.amount) - amt) <= 0.02)
    );
    if (!matchingCaisse) {
      unmatchedBank.push({ id: b.id, ref: b.ref, date: b.date, amount: amt, subtype: b.subtype, note: b.note });
    }
  }

  // 7. Audit Bon Retours
  const brList = retours.map(r => r.data);

  const report = {
    bls: {
      count: bls.length,
      statusCounts: bl_statusCounts,
      storedTotals: { ht: round2(bl_storedHT), tva: round2(bl_storedTVA), timbre: round2(bl_storedTimbre), ttc: round2(bl_storedTTC) },
      calcTotals: { ht: round2(bl_calcHT), tva: round2(bl_calcTVA), timbre: round2(bl_calcTimbre), ttc: round2(bl_calcTTC) },
      lineMismatches: bl_lineMismatches,
      ttcMismatches: bl_ttcMismatches
    },
    evs: {
      count: evDocs.length,
      storedTotals: { ht: round2(ev_storedHT), tva: round2(ev_storedTVA), timbre: round2(ev_storedTimbre), ttc: round2(ev_storedTTC), realBchNet: round2(ev_storedRealBchNet), ecart: round2(ev_storedEcart) },
      calcTotals: { ht: round2(ev_calcHT), tva: round2(ev_calcTVA), timbre: round2(ev_calcTimbre), ttc: round2(ev_calcTTC) },
      anomalies: ev_anomalies
    },
    sessions: {
      count: sessions.length,
      closed: closedCount,
      open: openCount,
      sessionsWithSales: sessionsWithSalesCount,
      zeroSales: zeroSalesCount,
      storedSales: round2(totalSalesStored),
      storedReturns: round2(totalReturnsStored),
      storedNet: round2(totalRealBchNetStored)
    },
    caisse: {
      count: caisseDocs.length,
      deposits: caisseDeposits,
      evWithdrawals: caisseEVWithdrawals,
      charges: caisseCharges,
      otherWithdrawals: caisseOtherWithdrawals,
      netSafeBalance: netSafe,
      matchEVTTC,
      matchBCHNet
    },
    bank: {
      count: bankDocs.length,
      bankTotal,
      bankEVTotal,
      bankOtherTotal,
      unmatchedBank
    },
    bonRetours: {
      count: brList.length,
      records: brList
    }
  };

  console.log('=== Independent Audit Completed ===');
  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

runIndependentAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
