import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('documents');

  const caisseDocs = await coll.find({ col: 'caisse_admin' }).toArray();
  console.log(`Loaded ${caisseDocs.length} caisse_admin records.`);

  const deposits = [];
  const withdrawals = [];
  const charges = [];
  const others = [];

  let sumDeposits = 0;
  let sumBankWithdrawals = 0;
  let sumCharges = 0;
  let sumOthers = 0;

  const idSet = new Set();
  const duplicateIds = [];

  for (const doc of caisseDocs) {
    const d = doc.data || {};
    if (idSet.has(d.id)) {
      duplicateIds.push(d.id);
    }
    idSet.add(d.id);

    const amt = round2(d.amount);
    if (d.type === 'deposit') {
      if (d.source === 'user_cloture') {
        deposits.push(d);
        sumDeposits = round2(sumDeposits + amt);
      } else {
        others.push(d);
        sumOthers = round2(sumOthers + amt);
      }
    } else if (d.type === 'withdrawal') {
      if (d.source === 'transfert_banque_etat_vente') {
        withdrawals.push(d);
        sumBankWithdrawals = round2(sumBankWithdrawals + amt);
      } else if (d.source === 'charge' || d.source === 'depense' || d.notes?.includes('CAMERA') || !d.source) {
        charges.push(d);
        sumCharges = round2(sumCharges + amt);
      } else {
        others.push(d);
        sumOthers = round2(sumOthers - amt);
      }
    }
  }

  console.log('\n--- CAISSE BREAKDOWN ---');
  console.log('Duplicate IDs found in caisse_admin:', duplicateIds);
  console.log(`Deposits (user_cloture): count = ${deposits.length}, sum = ${sumDeposits.toLocaleString()} DA`);
  console.log(`Withdrawals (transfert_banque_etat_vente): count = ${withdrawals.length}, sum = ${sumBankWithdrawals.toLocaleString()} DA`);
  console.log(`Charges/Expenses: count = ${charges.length}, sum = ${sumCharges.toLocaleString()} DA`);
  console.log(`Other movements: count = ${others.length}, sum = ${sumOthers.toLocaleString()} DA`);

  charges.forEach(c => {
    console.log(`  Charge details: ID #${c.id}, Date: ${c.date}, Amt: ${c.amount}, Source: ${c.source}, Notes: ${c.notes}`);
  });

  const netBalance = round2(sumDeposits - sumBankWithdrawals - sumCharges + sumOthers);
  console.log(`\nNet Safe Balance: ${netBalance.toLocaleString()} DA (${netBalance} DA)`);
  console.log('Is exactly +378,422.76 DA?:', netBalance === 378422.76);

  // Now cross-check against all sessions
  console.log('\n--- RECONCILIATION WITH SESSIONS & EVS ---');
  const sessions = await coll.find({ col: 'sessions' }).toArray();
  const evDocs = await coll.find({ col: 'etat_vente_docs' }).toArray();

  console.log(`Total sessions in DB: ${sessions.length}`);
  console.log(`Total EV docs in DB: ${evDocs.length}`);

  let sumSessionRealBCHNet = 0;
  let sumEVTTC = 0;
  let salesSessionsCount = 0;

  for (const s of sessions) {
    const d = s.data || {};
    const sales = round2(d.totalSales);
    const returns = round2(d.totalReturns);
    const net = round2(sales - returns);
    if (sales > 0 || net > 0 || d.realBchNet > 0) {
      salesSessionsCount++;
      sumSessionRealBCHNet = round2(sumSessionRealBCHNet + (round2(d.realBchNet) || net));
    }
  }

  for (const ev of evDocs) {
    const d = ev.data || {};
    sumEVTTC = round2(sumEVTTC + round2(d.totalTTC));
  }

  console.log(`Commercial sales sessions count: ${salesSessionsCount}`);
  console.log(`Sum of Session Real BCH Net: ${sumSessionRealBCHNet.toLocaleString()} DA`);
  console.log(`Sum of Caisse Deposits:     ${sumDeposits.toLocaleString()} DA`);
  console.log(`Delta (Caisse Deposits - Session Net): ${round2(sumDeposits - sumSessionRealBCHNet)} DA`);

  console.log(`\nSum of EV TTC:            ${sumEVTTC.toLocaleString()} DA`);
  console.log(`Sum of Bank Withdrawals:   ${sumBankWithdrawals.toLocaleString()} DA`);
  console.log(`Delta (Bank Withdrawals - EV TTC): ${round2(sumBankWithdrawals - sumEVTTC)} DA`);

  // Check 1:1 match between each caisse withdrawal and its EV
  let evWithdrawalMismatches = 0;
  for (const w of withdrawals) {
    const matchEV = evDocs.find(e => Math.abs(round2(e.data?.totalTTC) - round2(w.amount)) <= 0.02);
    if (!matchEV) {
      console.log(`  Unmatched withdrawal: ID #${w.id}, Amt: ${w.amount}, Date: ${w.date}`);
      evWithdrawalMismatches++;
    }
  }
  console.log(`Total caisse withdrawals unmatched to an EV: ${evWithdrawalMismatches}`);

  // Check 1:1 match between each caisse deposit and a sales session / EV realBchNet
  let depositMismatches = 0;
  for (const dep of deposits) {
    const matchEV = evDocs.find(e => Math.abs(round2(e.data?.realBchNet) - round2(dep.amount)) <= 0.02);
    if (!matchEV) {
      console.log(`  Unmatched deposit: ID #${dep.id}, Amt: ${dep.amount}, Date: ${dep.date}`);
      depositMismatches++;
    }
  }
  console.log(`Total caisse deposits unmatched to EV realBchNet: ${depositMismatches}`);

  await mongoose.disconnect();
}

run().catch(console.error);
