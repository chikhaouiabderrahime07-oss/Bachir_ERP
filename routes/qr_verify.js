const express = require('express');
const crypto = require('crypto');
const zlib = require('zlib');
const Document = require('../models/Document');
const Settings = require('../models/Settings');

const router = express.Router();

const SECRET = crypto
  .createHash('sha256')
  .update(String(process.env.JWT_SECRET || 'erp-bachir-qr-secret-2026') + '::qr-motor-v1')
  .digest();

const oneTimeTickets = new Map();
const transientSnapshots = new Map();

function pruneCaches() {
  const now = Date.now();
  for (const [k, v] of oneTimeTickets.entries()) {
    if (!v || now > v.expiresAt) oneTimeTickets.delete(k);
  }
  while (transientSnapshots.size > 200) {
    const oldestKey = transientSnapshots.keys().next().value;
    if (oldestKey === undefined) break;
    transientSnapshots.delete(oldestKey);
  }
}

function encryptQrPayload(obj) {
  const payload = {
    ...obj,
    iat: Date.now(),
    rnd: crypto.randomBytes(16).toString('hex')
  };
  const compressed = zlib.deflateRawSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
}

function decryptQrPayload(token) {
  if (!token || typeof token !== 'string' || token.length < 40) return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET, iv);
    decipher.setAuthTag(authTag);
    const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const jsonStr = zlib.inflateRawSync(compressed).toString('utf8');
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

router.post('/api/qr-verify/mint', express.json({ limit: '4mb' }), (req, res) => {
  try {
    pruneCaches();
    const { type, id, col, ref, snap } = req.body || {};
    if (!type) return res.status(400).json({ ok: false, error: 'Missing type' });

    let snapId = null;
    if (snap && typeof snap === 'object') {
      snapId = crypto.randomBytes(12).toString('hex');
      transientSnapshots.set(snapId, { snap, createdAt: Date.now() });
    }

    const qrToken = encryptQrPayload({
      t: String(type),
      id: id !== undefined ? id : null,
      c: col ? String(col) : null,
      r: ref ? String(ref) : null,
      s: snapId
    });

    const xfProto = req.headers['x-forwarded-proto'];
    const proto = xfProto ? String(xfProto).split(',')[0].trim() : (req.protocol || 'https');
    const host = req.get('host');
    const url = `${proto}://${host}/v/${qrToken}`;
    res.set('Cache-Control', 'no-store').json({ ok: true, token: qrToken, url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function findDocInCol(col, id, ref) {
  const orConds = [];
  if (id !== null && id !== undefined && id !== '') {
    const numId = Number(id);
    if (!Number.isNaN(numId)) orConds.push({ 'data.id': numId });
    orConds.push({ 'data.id': String(id) });
  }
  if (ref) {
    orConds.push({ 'data.ref': String(ref) });
  }
  if (!orConds.length) return null;
  const doc = await Document.findOne({ col, $or: orConds }).lean();
  return doc ? doc.data : null;
}

async function resolveQrData(payload) {
  const t = payload.t;
  const id = payload.id;
  const ref = payload.r;
  const snapEntry = payload.s ? transientSnapshots.get(payload.s) : null;
  const snap = snapEntry ? snapEntry.snap : null;

  const settingsDoc = await Settings.findOne({ key: 'main' }).lean();
  const settings = (settingsDoc && settingsDoc.value) ? settingsDoc.value : {};
  const cols = {};

  const loadColAll = async (colName) => {
    const docs = await Document.find({ col: colName }).lean();
    cols[colName] = docs.map(d => d.data).filter(Boolean);
  };

  if (['bch', 'bl', 'bl_route', 'tempo_bl'].includes(t)) {
    const bl = await findDocInCol('bls', id, ref);
    cols.bls = bl ? [bl] : [];
    await Promise.all([loadColAll('brs'), loadColAll('clients'), loadColAll('suppliers'), loadColAll('bon_retours')]);
  } else if (t === 'br') {
    const br = await findDocInCol('brs', id, ref);
    cols.brs = br ? [br] : [];
    await loadColAll('suppliers');
  } else if (t === 'bon_retour') {
    const ret = await findDocInCol('bon_retours', id, ref);
    cols.bon_retours = ret ? [ret] : [];
    await Promise.all([loadColAll('bls'), loadColAll('brs'), loadColAll('clients'), loadColAll('suppliers')]);
  } else if (t === 'etat_vente') {
    const ev = await findDocInCol('etat_vente_docs', id, ref);
    cols.etat_vente_docs = ev ? [ev] : [];
    await Promise.all([loadColAll('bls'), loadColAll('bon_retours')]);
  } else if (t === 'decharge') {
    const tx = await findDocInCol('caisse_admin', id, ref);
    cols.caisse_admin = tx ? [tx] : [];
  } else if (t === 'bank_decharge') {
    const tx = await findDocInCol('bank_transactions', id, ref);
    cols.bank_transactions = tx ? [tx] : [];
  } else if (t === 'supplier_pay_decharge') {
    const pay = await findDocInCol('supplier_payments', id, ref);
    cols.supplier_payments = pay ? [pay] : [];
    await loadColAll('suppliers');
  } else if (payload.c) {
    const doc = await findDocInCol(payload.c, id, ref);
    cols[payload.c] = doc ? [doc] : [];
  }

  return { type: t, id: id ?? ( (cols[payload.c || 'bls'] && cols[payload.c || 'bls'][0]?.id) || null ), ref, cols, snap, settings };
}

router.post('/v/consume/:dlTicket', async (req, res) => {
  try {
    pruneCaches();
    const { dlTicket } = req.params;
    const entry = oneTimeTickets.get(dlTicket);
    if (!entry || Date.now() > entry.expiresAt) {
      oneTimeTickets.delete(dlTicket);
      return res.status(410).set('Cache-Control', 'no-store').json({
        ok: false,
        error: 'Lien à usage unique expiré ou déjà consommé.'
      });
    }
    // Strict one-time burn BEFORE any async resolution
    oneTimeTickets.delete(dlTicket);

    const data = await resolveQrData(entry.payload);
    return res.set('Cache-Control', 'no-store').json({ ok: true, token: entry.qrToken || '', ...data });
  } catch (e) {
    return res.status(500).set('Cache-Control', 'no-store').json({ ok: false, error: e.message });
  }
});

function renderInvalidPage() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Vérification Sécurisée</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#090d16;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;padding:20px}
.card{max-width:440px;width:100%;background:#111827;border:1px solid #ef444455;border-radius:16px;padding:28px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.ico{font-size:42px;margin-bottom:12px}.ttl{font-size:16px;font-weight:800;color:#f87171;margin-bottom:8px}.sub{font-size:13px;color:#94a3b8;line-height:1.5}</style></head>
<body><div class="card"><div class="ico">⛔</div><div class="ttl">Lien de sécurité invalide ou corrompu</div><div class="sub">La signature cryptographique AES-256-GCM de ce QR code n'a pas pu être vérifiée.</div></div></body></html>`;
}

router.get('/v/:qrToken', (req, res) => {
  pruneCaches();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const payload = decryptQrPayload(req.params.qrToken);
  if (!payload || !payload.t) {
    return res.status(403).send(renderInvalidPage());
  }

  const dlTicket = crypto.randomBytes(48).toString('base64url');
  oneTimeTickets.set(dlTicket, { payload, qrToken: req.params.qrToken, expiresAt: Date.now() + 60 * 1000 });
  const maskedTicket = dlTicket.slice(0, 16) + '...' + dlTicket.slice(-12);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Téléchargement Unique Sécurisé</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top,#1e293b 0%,#090d16 70%);color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;padding:18px;box-sizing:border-box}
  .card{max-width:460px;width:100%;background:rgba(17,24,39,.95);border:1px solid rgba(56,189,248,.28);border-radius:18px;padding:28px 24px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.65)}
  .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(14,165,233,.12);border:1px solid rgba(14,165,248,.3);color:#38bdf8;font-size:10.5px;font-weight:800;letter-spacing:.8px;padding:5px 12px;border-radius:99px;margin-bottom:14px}
  .ico{font-size:38px;margin-bottom:10px}
  .ttl{font-size:15px;font-weight:800;letter-spacing:.4px;color:#f1f5f9;margin-bottom:8px}
  .tok{font-family:monospace;font-size:11px;color:#94a3b8;background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;margin:12px 0;word-break:break-all}
  .status{font-size:13px;font-weight:700;padding:12px;border-radius:10px;margin-top:14px;background:rgba(30,41,59,.7);color:#e2e8f0;line-height:1.45}
  .status.ok{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.4);color:#34d399}
  .status.err{background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.4);color:#f87171}
  .note{font-size:11px;color:#64748b;margin-top:12px}
</style>
<script>
window.T = { isRTL: function(){ return false; }, get: function(k){ return k; } };
window.Utils = {
  notify: function(){},
  today: function(){ return new Date().toISOString().slice(0,10); },
  escHTML: function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, ''); },
  numberToWordsFR: function(n){
    if (n === 0) return 'zéro dinars';
    var u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
    var t = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];
    function c1000(num, isTh){
      var c = Math.floor(num / 100), rem = num % 100, r = '';
      if (c === 1) r += 'cent ';
      else if (c > 1) r += u[c] + ' cent' + (rem === 0 && !isTh ? 's ' : ' ');
      if (rem > 0) {
        if (rem < 20) r += u[rem] + ' ';
        else {
          var ten = Math.floor(rem / 10), unit = rem % 10;
          if (ten === 7 || ten === 9) { ten--; unit += 10; }
          if (ten === 8 && unit === 0) r += 'quatre-vingt' + (isTh ? ' ' : 's ');
          else if (ten === 8) r += 'quatre-vingt-' + u[unit] + ' ';
          else {
            r += t[ten];
            if (unit === 1) r += ' et un ';
            else if (unit === 11 && ten === 6) r += ' et onze ';
            else if (unit > 0) r += '-' + u[unit] + ' ';
            else r += ' ';
          }
        }
      }
      return r.trim();
    }
    var b = Math.floor(n / 1e9); n %= 1e9;
    var m = Math.floor(n / 1e6); n %= 1e6;
    var k = Math.floor(n / 1e3); n %= 1e3;
    var res = '';
    if (b > 0) res += c1000(b) + (b === 1 ? ' milliard ' : ' milliards ');
    if (m > 0) res += c1000(m) + (m === 1 ? ' million ' : ' millions ');
    if (k > 0) res += (k === 1 ? 'mille ' : c1000(k, true) + ' mille ');
    if (n > 0) res += c1000(n) + ' ';
    return res.trim() + ' dinars';
  }
};
window.DB = { getSettings: function(){ return {}; }, getAll: function(){ return []; }, getById: function(){ return null; } };
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<script src="/pdf.js"></script>
</head><body>
<div class="card">
  <div class="badge">🔒 AES-256-GCM • ANTI-FRAUDE</div>
  <div class="ico" id="stIco">⏳</div>
  <div class="ttl">CANAL DE TÉLÉCHARGEMENT SÉCURISÉ À USAGE UNIQUE</div>
  <div class="tok">JETON : ${maskedTicket}</div>
  <div class="status" id="stBox">Décryptage et génération directe du PDF original en cours...</div>
  <div class="note">Ce lien expire immédiatement après 1 seul téléchargement (60s max).</div>
</div>
<script>
(async function(){
  const stBox = document.getElementById('stBox');
  const stIco = document.getElementById('stIco');
  try {
    const resp = await fetch('/v/consume/${dlTicket}', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data || !data.ok) {
      stIco.textContent = '⛔';
      stBox.className = 'status err';
      stBox.textContent = (data && data.error) || '⛔ Lien à usage unique expiré ou déjà consommé.';
      return;
    }
    const cols = data.cols || {};
    const settings = data.settings || {};
    window.DB = {
      getSettings: () => settings,
      getAll: (col) => Array.isArray(cols[col]) ? cols[col] : [],
      getById: (col, id) => {
        const arr = Array.isArray(cols[col]) ? cols[col] : [];
        return arr.find(x => x && (String(x.id) === String(id) || (x.ref && String(x.ref) === String(id)))) || arr[0] || null;
      }
    };
    const regenFn = window.PDFGen && (window.PDFGen.regenerateFromQrPayload || window.PDFGen._regenerateFromQrPayload);
    if (typeof regenFn === 'function') {
      await regenFn.call(window.PDFGen, data);
    }
    stIco.textContent = '✅';
    stBox.className = 'status ok';
    stBox.textContent = '✅ Téléchargement unique effectué — Ce lien est désormais expiré et détruit.';
  } catch (err) {
    stIco.textContent = '⛔';
    stBox.className = 'status err';
    stBox.textContent = '⛔ Lien à usage unique expiré ou déjà consommé.';
  }
})();
</script></body></html>`;

  return res.status(200).send(html);
});

router.encryptQrPayload = encryptQrPayload;
router.decryptQrPayload = decryptQrPayload;
router.oneTimeTickets = oneTimeTickets;
router.transientSnapshots = transientSnapshots;

module.exports = router;
