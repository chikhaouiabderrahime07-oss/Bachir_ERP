/* ============================================================
   MODULES.JS — All Application Modules
   ERP v2.0 — Bilingual FR/AR | RTL/LTR
   Dashboard · BR · BL · Caisse · Admin Caisse · Suppliers
   Stats · Eval · Users · Settings · Audit · UI
   ============================================================ */

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
const UI = {
  showModal(title, body, footer = '', size = 'md') {
    const ov = document.getElementById('modalOverlay');
    const mc = document.getElementById('modalContainer');
    if (!ov || !mc) return;
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFooter').innerHTML = footer;
    mc.className = 'modal-container';
    if (size === 'sm') mc.classList.add('modal-sm');
    if (size === 'lg') mc.classList.add('modal-lg');
    if (size === 'xl') mc.classList.add('modal-xl');
    ov.classList.add('active');
    setTimeout(() => document.getElementById('modalBody')?.querySelector('input,select,textarea')?.focus(), 80);
  },
  closeModal() { if (typeof FormGuide !== 'undefined') FormGuide.stop(); document.getElementById('modalOverlay')?.classList.remove('active'); },
  toggleTheme() {
    const s = DB.getSettings();
    const next = s.themeMode === 'dark' ? 'light' : 'dark';
    DB.saveSettings({ themeMode: next });
    this.applyTheme();
  },
  applyTheme() {
    const s = DB.getSettings();
    const mode = s.themeMode || 'light';
    document.body.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    if (s.themeColor) {
      const hex = s.themeColor.replace('#','');
      const r = parseInt(hex.slice(0,2),16)||0;
      const g = parseInt(hex.slice(2,4),16)||0;
      const b = parseInt(hex.slice(4,6),16)||0;
      document.documentElement.style.setProperty('--primary', s.themeColor);
      document.documentElement.style.setProperty('--primary-rgb', `${r},${g},${b}`);
    }
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  },
  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    if (!sb) return;
    if (window.innerWidth < 768) { sb.classList.toggle('open'); ov?.classList.toggle('active'); }
    else { sb.classList.toggle('collapsed'); }
  },
  toggleUserMenu() { document.getElementById('userDropdown')?.classList.toggle('open'); },
  startClock() { /* managed by App._tickClock() */ }
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
const DashboardModule = {
  render() {
    const u = Auth.getCurrentUser();
    const isAdmin = Auth.isAdmin();
    const brs = DB.getAll('brs');
    const bls = DB.getAll('bls');
    const today = Utils.today();
    const session = SessionMgr.getTodaySession(u.id);
    const suppliers = DB.getAll('suppliers');
    const clients = DB.getAll('clients');
    const supMap = {}; suppliers.forEach(s=>supMap[s.id]=s);
    const cliMap = {}; clients.forEach(c=>cliMap[c.id]=c);

    // Stats
    const todayBRs = brs.filter(b => (b.date||'').slice(0,10) === today);
    const todayBLs = bls.filter(b => (b.date||'').slice(0,10) === today);
    const openBRs = brs.filter(b => b.status === 'open' || !b.status).length;
    const openBLs = bls.filter(b => b.status === 'open' || !b.status).length;
    const deliveredBLs = bls.filter(b => b.status === 'delivered');
    const totalRevenue = deliveredBLs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const totalPurchases = brs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const margin = totalRevenue - totalPurchases;

    let vaultBalance = 0, bankTotal = 0;
    if (isAdmin) {
      const ca = DB.getAll('caisse_admin');
      vaultBalance = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+(Number(t.amount)||0),0) - ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+(Number(t.amount)||0),0);
      const btx = DB.getAll('bank_transactions');
      const banks = DB.getSettings().banks || [];
      banks.forEach(b => {
        bankTotal += btx.filter(t=>t.bankId===b.id&&t.type==='deposit').reduce((s,t)=>s+(t.amount||0),0) - btx.filter(t=>t.bankId===b.id&&t.type==='payment').reduce((s,t)=>s+(t.amount||0),0);
      });
    }

    // Monthly chart data (last 6 months)
    const byMonth = {};
    deliveredBLs.forEach(b => { const m=(b.date||'').substring(0,7); if(m) byMonth[m]=(byMonth[m]||0)+(b.totalTTC||0); });
    const months = Object.keys(byMonth).sort().slice(-6);
    const maxMonth = Math.max(...Object.values(byMonth), 1);

    // Top clients by revenue
    const clientRevenue = {};
    deliveredBLs.forEach(b => { clientRevenue[b.clientId] = (clientRevenue[b.clientId]||0) + (b.totalTTC||0); });
    const topClients = Object.entries(clientRevenue).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Recent activity (last 8 events)
    const recentBRs = [...brs].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
    const recentBLs = [...bls].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
    const activity = [...recentBRs.map(b=>({type:'BR',ref:b.ref,date:b.date,amount:b.totalTTC,name:supMap[b.supplierId]?.name})), ...recentBLs.map(b=>({type:'BL',ref:b.ref,date:b.date,amount:b.totalTTC,name:cliMap[b.clientId]?.name}))].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8);

    const sessionBanner = (!session && u.role !== 'admin') ? `
    <div style="background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(245,158,11,.03));border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:10px"><i class="fas fa-sun" style="font-size:20px;color:#f59e0b"></i><div><div style="font-weight:700;font-size:13px;color:var(--text)">${T.get('caisse_no_session')}</div><div style="font-size:11px;color:var(--text4)">Démarrez votre journée pour activer la caisse</div></div></div>
      <button class="btn btn-warning btn-sm" onclick="CaisseModule.showMorningPrompt()"><i class="fas fa-play-circle"></i> ${T.get('caisse_start_now')}</button>
    </div>` : '';

    const isAR = T.isRTL();
    return `<div style="padding:20px 24px;max-width:1200px;margin:0 auto">
    ${sessionBanner}

    <!-- Hero Stats Strip -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-8px;right:-8px;width:50px;height:50px;background:rgba(14,165,233,.08);border-radius:50%"></div>
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">${isAR?'إجمالي المبيعات':'Chiffre d\'affaires'}</div>
        <div style="font-size:22px;font-weight:900;color:#0ea5e9;margin-top:4px">${Utils.fmtCurrency(totalRevenue)}</div>
        <div style="font-size:10px;color:var(--text4);margin-top:2px">${deliveredBLs.length} BL livrés</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-8px;right:-8px;width:50px;height:50px;background:rgba(139,92,246,.08);border-radius:50%"></div>
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">${isAR?'إجمالي المشتريات':'Total achats'}</div>
        <div style="font-size:22px;font-weight:900;color:#8b5cf6;margin-top:4px">${Utils.fmtCurrency(totalPurchases)}</div>
        <div style="font-size:10px;color:var(--text4);margin-top:2px">${brs.length} BR</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-8px;right:-8px;width:50px;height:50px;background:rgba(${margin>=0?'16,185,129':'239,68,68'},.08);border-radius:50%"></div>
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">${isAR?'الهامش':'Marge'}</div>
        <div style="font-size:22px;font-weight:900;color:${margin>=0?'#10b981':'#ef4444'};margin-top:4px">${Utils.fmtCurrency(margin)}</div>
        <div style="font-size:10px;color:var(--text4);margin-top:2px">${margin>=0?'↑ Bénéfice':'↓ Perte'}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-8px;right:-8px;width:50px;height:50px;background:rgba(245,158,11,.08);border-radius:50%"></div>
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">${isAR?'في الانتظار':'En attente'}</div>
        <div style="font-size:22px;font-weight:900;color:#f59e0b;margin-top:4px">${openBRs + openBLs}</div>
        <div style="font-size:10px;color:var(--text4);margin-top:2px">${openBRs} BR + ${openBLs} BL ouverts</div>
      </div>
    </div>

    ${isAdmin ? `<!-- Admin Finance Strip -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:14px;padding:16px 20px;color:#fff;cursor:pointer" onclick="App.loadModule('admin_caisse')">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:10px;letter-spacing:1px;opacity:.7">SOLDE CAISSE</div><i class="fas fa-vault" style="opacity:.3"></i></div>
        <div style="font-size:24px;font-weight:900;margin-top:6px">${Utils.fmtCurrency(vaultBalance)}</div>
      </div>
      <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:14px;padding:16px 20px;color:#fff;cursor:pointer" onclick="App.loadModule('bank')">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:10px;letter-spacing:1px;opacity:.7">SOLDE BANQUE</div><i class="fas fa-university" style="opacity:.3"></i></div>
        <div style="font-size:24px;font-weight:900;margin-top:6px">${Utils.fmtCurrency(bankTotal)}</div>
      </div>
      <div style="background:linear-gradient(135deg,#312e81,#4338ca);border-radius:14px;padding:16px 20px;color:#fff">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:10px;letter-spacing:1px;opacity:.7">AUJOURD'HUI</div><i class="fas fa-calendar-day" style="opacity:.3"></i></div>
        <div style="font-size:24px;font-weight:900;margin-top:6px">${todayBRs.length + todayBLs.length} docs</div>
        <div style="font-size:10px;opacity:.7;margin-top:2px">${todayBRs.length} BR · ${todayBLs.length} BL</div>
      </div>
    </div>` : ''}

    <!-- Quick Actions -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="App.loadModule('brs')"><i class="fas fa-plus"></i> Nouveau BR</button>
      <button class="btn btn-sm" style="background:rgba(14,165,233,.1);color:#0ea5e9;border:1px solid rgba(14,165,233,.2)" onclick="App.loadModule('bls')"><i class="fas fa-file-export"></i> Voir les BL</button>
      <button class="btn btn-sm" style="background:rgba(139,92,246,.1);color:#8b5cf6;border:1px solid rgba(139,92,246,.2)" onclick="App.loadModule('partners')"><i class="fas fa-handshake"></i> Hub Commercial</button>
      ${isAdmin?'<button class="btn btn-sm" style="background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2)" onclick="App.loadModule(\'admin_caisse\')"><i class="fas fa-vault"></i> Caisse Admin</button>':''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- Monthly Revenue Chart -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13px"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> ${isAR?'المبيعات الشهرية':'CA mensuel'}</div>
        <div style="padding:16px 18px">
          ${months.length>0 ? `<div style="display:flex;align-items:flex-end;gap:8px;height:120px">
            ${months.map(m => { const h=(byMonth[m]/maxMonth)*100; return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:9px;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(byMonth[m])}</div><div style="width:100%;background:linear-gradient(180deg,var(--primary),rgba(var(--primary-rgb),.4));border-radius:6px 6px 0 0;height:${Math.max(h,8)}%;transition:height .5s"></div><div style="font-size:9px;color:var(--text4);font-weight:600">${m.substring(5)}</div></div>`; }).join('')}
          </div>` : '<div style="text-align:center;color:var(--text4);padding:30px">Pas encore de données</div>'}
        </div>
      </div>

      <!-- Activity Timeline -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13px"><i class="fas fa-stream" style="color:var(--primary)"></i> ${isAR?'النشاط الأخير':'Activité récente'}</div>
        <div style="padding:8px 12px;max-height:200px;overflow-y:auto">
          ${activity.length ? activity.map(a => `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--border)">
            <div style="width:28px;height:28px;border-radius:8px;background:${a.type==='BR'?'rgba(139,92,246,.1)':'rgba(14,165,233,.1)'};display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas ${a.type==='BR'?'fa-file-import':'fa-file-export'}" style="font-size:10px;color:${a.type==='BR'?'#8b5cf6':'#0ea5e9'}"></i></div>
            <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text)">${Utils.escHTML(a.ref||'')}</div><div style="font-size:10px;color:var(--text4)">${Utils.escHTML(a.name||'')} · ${a.date||''}</div></div>
            <div style="font-size:12px;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(a.amount||0)}</div>
          </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text4)">Aucune activité</div>'}
        </div>
      </div>
    </div>

    ${topClients.length > 0 ? `
    <!-- Top Clients -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-top:16px">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13px"><i class="fas fa-trophy" style="color:#f59e0b"></i> ${isAR?'أفضل الزبائن':'Top Clients'}</div>
      <div style="padding:8px 12px">
        ${topClients.map(([cId, rev], i) => { const c = cliMap[cId]; const pct = (rev/totalRevenue)*100; return `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--border)">
          <div style="width:24px;height:24px;border-radius:8px;background:${i<3?'linear-gradient(135deg,#f59e0b,#d97706)':'var(--bg3)'};display:flex;align-items:center;justify-content:center;color:${i<3?'#fff':'var(--text4)'};font-size:10px;font-weight:900;flex-shrink:0">${i+1}</div>
          <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600">${Utils.escHTML(c?.name||'Client #'+cId)}</div><div style="margin-top:4px;background:var(--bg3);border-radius:20px;height:4px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,#0ea5e9,#0284c7);border-radius:20px;width:${pct}%"></div></div></div>
          <div style="font-size:12px;font-weight:800;color:#0ea5e9">${Utils.fmtCurrency(rev)}</div>
        </div>`; }).join('')}
      </div>
    </div>` : ''}
    </div>`;
  }
};

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// DELIVERY ADDRESS HELPERS — shared by Suppliers & Clients modules
// ═══════════════════════════════════════════════════════════════════════
function _buildDeliveryAddrSection(entity, addrs, isAdmin) {
  const lbl = T.isRTL() ? 'عناوين التسليم' : 'Adresses de livraison';
  const rows = (addrs||[]).map((a,i) => `
    <div class="da-row" id="da-row-${entity}-${i}" data-is-default="${a.isDefault?'1':''}" style="display:flex;gap:10px;align-items:stretch;background:${a.isDefault?'rgba(var(--primary-rgb),.06)':'var(--bg)'};border:1.5px solid ${a.isDefault?'var(--primary)':'var(--border2, var(--border))'};border-radius:10px;padding:10px 14px;margin-bottom:8px;transition:all .2s">
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:8px;align-items:center">
          <i class="fas fa-map-pin" style="color:${a.isDefault?'var(--primary)':'var(--text4)'};font-size:12px;width:14px"></i>
          <input type="text" class="da-label" placeholder="${T.isRTL()?'اسم الموقع':'Nom du lieu (ex: Dépôt Oran, Chantier...)'}" value="${Utils.escHTML(a.label||'')}" style="font-weight:700;font-size:12px;flex:1;border:none;background:transparent;padding:4px 0;border-bottom:1px dashed var(--border)">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <i class="fas fa-road" style="color:var(--text4);font-size:11px;width:14px"></i>
          <input type="text" class="da-addr" placeholder="${T.isRTL()?'العنوان الكامل':'Adresse complète de livraison...'}" value="${Utils.escHTML(a.address||'')}" style="font-size:12px;flex:1;border:none;background:transparent;padding:4px 0;border-bottom:1px dashed var(--border)">
        </div>
      </div>
      ${isAdmin ? `<div style="display:flex;flex-direction:column;gap:4px;justify-content:center">
        <button class="btn btn-xs ${a.isDefault?'btn-primary':'btn-outline'}" onclick="_setDefaultDeliveryAddr('${entity}',${i})" title="${a.isDefault?'Par défaut':'Définir par défaut'}" style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px">${a.isDefault?'<i class="fas fa-star" style="font-size:10px"></i>':'<i class="far fa-star" style="font-size:10px"></i>'}</button>
        <button class="btn btn-xs btn-danger" onclick="_removeDeliveryAddr('${entity}',${i})" title="Supprimer" style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;opacity:.7"><i class="fas fa-trash-alt" style="font-size:9px"></i></button>
      </div>` : ''}
    </div>`).join('');

  const emptyState = `<div id="da-empty-${entity}" style="text-align:center;padding:20px 16px;color:var(--text4);font-size:12px;border:2px dashed var(--border);border-radius:10px"><i class="fas fa-map-marked-alt" style="font-size:22px;opacity:.25;display:block;margin-bottom:6px"></i>${T.isRTL()?'لا توجد عناوين تسليم':'Aucune adresse enregistrée'}</div>`;
  const addBtn = isAdmin ? `<button class="btn btn-sm btn-outline" onclick="_addDeliveryAddr('${entity}')" style="width:100%;border-style:dashed;margin-top:6px;color:var(--primary);font-weight:600"><i class="fas fa-plus"></i> ${T.isRTL()?'إضافة عنوان جديد':'Ajouter une adresse'}</button>` : '';
  return `
  <div style="background:linear-gradient(135deg,rgba(var(--primary-rgb),.03),transparent);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <div style="width:28px;height:28px;border-radius:8px;background:rgba(var(--primary-rgb),.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-truck" style="font-size:11px;color:var(--primary)"></i></div>
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--text)">${lbl}</div>
        <div style="font-size:10px;color:var(--text4)">${T.isRTL()?'عناوين مختلفة عن المقر':'Destinations différentes du siège social'}</div>
      </div>
    </div>
    <div id="da-container-${entity}">
      ${rows || emptyState}
    </div>
    ${addBtn}
  </div>`;
}

function _addDeliveryAddr(entity) {
  const c = document.getElementById('da-container-' + entity);
  if (!c) return;
  const idx = Date.now();
  const emptyDiv = c.querySelector('[id^="da-empty-"]');
  if (emptyDiv) emptyDiv.remove();
  c.insertAdjacentHTML('beforeend', `
    <div class="da-row" id="da-row-${entity}-${idx}" data-is-default="" style="display:flex;gap:10px;align-items:stretch;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:8px;transition:all .2s">
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:8px;align-items:center">
          <i class="fas fa-map-pin" style="color:var(--text4);font-size:12px;width:14px"></i>
          <input type="text" class="da-label" placeholder="Nom du lieu (ex: Dépôt Oran, Chantier...)" style="font-weight:700;font-size:12px;flex:1;border:none;background:transparent;padding:4px 0;border-bottom:1px dashed var(--border)">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <i class="fas fa-road" style="color:var(--text4);font-size:11px;width:14px"></i>
          <input type="text" class="da-addr" placeholder="Adresse complète de livraison..." style="font-size:12px;flex:1;border:none;background:transparent;padding:4px 0;border-bottom:1px dashed var(--border)">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center">
        <button class="btn btn-xs btn-outline" onclick="_setDefaultDeliveryAddr('${entity}','${idx}')" title="Définir par défaut" style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px"><i class="far fa-star" style="font-size:10px"></i></button>
        <button class="btn btn-xs btn-danger" onclick="_removeDeliveryAddr('${entity}','${idx}')" title="Supprimer" style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;opacity:.7"><i class="fas fa-trash-alt" style="font-size:9px"></i></button>
      </div>
    </div>`);
  const newRow = document.getElementById('da-row-' + entity + '-' + idx);
  if (newRow) newRow.querySelector('.da-label')?.focus();
}

function _removeDeliveryAddr(entity, idx) {
  const row = document.getElementById('da-row-' + entity + '-' + idx);
  if (row) row.remove();
  const c = document.getElementById('da-container-' + entity);
  if (c && !c.querySelector('.da-row')) {
    c.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text4);font-size:12px"><i class="fas fa-map-marker-alt" style="font-size:20px;opacity:.3;display:block;margin-bottom:6px"></i>${T.isRTL()?'لا توجد عناوين تسليم بعد':'Aucune adresse de livraison enregistrée'}</div>`;
  }
}

function _setDefaultDeliveryAddr(entity, idx) {
  const c = document.getElementById('da-container-' + entity);
  if (!c) return;
  c.querySelectorAll('.da-row').forEach(row => {
    const isThis = row.id === 'da-row-' + entity + '-' + idx;
    row.style.background = isThis ? 'rgba(var(--primary-rgb),.08)' : 'var(--bg3)';
    row.style.borderColor = isThis ? 'var(--primary)' : 'var(--border)';
    const btn = row.querySelector('button');
    if (btn) { btn.className = 'btn btn-xs ' + (isThis ? 'btn-primary' : 'btn-outline'); btn.innerHTML = isThis ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'; }
    row.setAttribute('data-is-default', isThis ? '1' : '');
  });
}

function _collectDeliveryAddrs(entity) {
  const c = document.getElementById('da-container-' + entity);
  if (!c) return [];
  const rows = c.querySelectorAll('.da-row');
  const results = [];
  rows.forEach((row, i) => {
    const label   = row.querySelector('.da-label')?.value?.trim() || '';
    const address = row.querySelector('.da-addr')?.value?.trim()  || '';
    if (!address) return;
    const isDefault = !!(row.dataset.isDefault === '1' || row.getAttribute('data-is-default') === '1');
    results.push({ id: i + 1, label, address, isDefault });
  });
  // Ensure at most one default; if none, first becomes default
  if (results.length && !results.some(a => a.isDefault)) results[0].isDefault = true;
  return results;
}

// ═══════════════════════════════════════════════════════════════
// ALGERIAN WILAYAS (kept for backward compat — not used in new forms) — 58 Wilayas (list shared across all modules)
// ═══════════════════════════════════════════════════════════════
const WILAYAS_DZ = [
  '01 - Adrar','02 - Chlef','03 - Laghouat','04 - Oum El Bouaghi','05 - Batna',
  '06 - Béjaïa','07 - Biskra','08 - Béchar','09 - Blida','10 - Bouira',
  '11 - Tamanrasset','12 - Tébessa','13 - Tlemcen','14 - Tiaret','15 - Tizi Ouzou',
  '16 - Alger','17 - Djelfa','18 - Jijel','19 - Sétif','20 - Saïda',
  '21 - Skikda','22 - Sidi Bel Abbès','23 - Annaba','24 - Guelma','25 - Constantine',
  '26 - Médéa','27 - Mostaganem','28 - M\'Sila','29 - Mascara','30 - Ouargla',
  '31 - Oran','32 - El Bayadh','33 - Illizi','34 - Bordj Bou Arréridj','35 - Boumerdès',
  '36 - El Tarf','37 - Tindouf','38 - Tissemsilt','39 - El Oued','40 - Khenchela',
  '41 - Souk Ahras','42 - Tipaza','43 - Mila','44 - Aïn Defla','45 - Naâma',
  '46 - Aïn Témouchent','47 - Ghardaïa','48 - Relizane',
  '49 - Timimoun','50 - Bordj Badji Mokhtar','51 - Ouled Djellal','52 - Béni Abbès',
  '53 - In Salah','54 - In Guezzam','55 - Touggourt','56 - Djanet',
  '57 - El M\'Ghair','58 - El Meniaa'
];

/** Build a <select> for Algerian wilayas with optional current value */
function _wilayaSelect(id, currentVal='', required=false) {
  return `<select id="${id}" ${required ? 'required' : ''} style="width:100%">
    <option value="">— ${T.isRTL() ? 'اختر الولاية' : 'Choisir la wilaya'} —</option>
    ${WILAYAS_DZ.map(w => `<option value="${Utils.escHTML(w)}" ${currentVal===w?'selected':''}>${Utils.escHTML(w)}</option>`).join('')}
  </select>`;
}


const BRModule = {
  _filters: { q:'', supplierId:'all', status:'all', year:'all', createdBy:'all', dateFrom:'', dateTo:'', sortDir:'desc' },
  _lineCount: 0,

  render() {
    const { q, status, supplierId, year, createdBy, dateFrom, dateTo } = this._filters;
    const suppliers = DB.getAll('suppliers');
    const supMap = {}; suppliers.forEach(s=>supMap[s.id]=s);
    const years = [...new Set(DB.getAll('brs').map(b=>b.year).filter(Boolean))].sort((a,b)=>b-a);

    let items = DB.getAll('brs');
    // All users see all BRs — no isolation. Traceability via createdByName/updatedByName.
    if (q) { const ql=q.toLowerCase(); items=items.filter(b=>(b.ref+' '+(supMap[b.supplierId]?.name||'')+' '+(b.notes||'')).toLowerCase().includes(ql)); }
    if (status !== 'all') items = items.filter(b=>(b.status||'open')===status);
    if (supplierId !== 'all') items = items.filter(b=>String(b.supplierId)===String(supplierId));
    if (year !== 'all') items = items.filter(b=>String(b.year)===String(year));
    if (createdBy !== 'all') items = items.filter(b=>String(b.createdBy)===String(createdBy));
    if (dateFrom) items = items.filter(b=>(b.date||'')>=dateFrom);
    if (dateTo) items = items.filter(b=>(b.date||'')<=dateTo);
    items.sort((a,b)=>{
      const cmp = String(b.createdAt).localeCompare(String(a.createdAt));
      return this._filters.sortDir === 'asc' ? -cmp : cmp;
    });

    const blMap = {};
    // Include active BLs AND recycled BLs — so a BR with a deleted BL still shows as "has BL"
    DB.getAll('bls').forEach(bl => blMap[bl.brId] = bl);
    DB.getAll('recycle_bin').filter(e => e.collection === 'bls').forEach(e => { if (!blMap[e.item?.brId]) blMap[e.item?.brId] = e.item; });

    const isAdmin = Auth.isAdmin();
    const perms   = Auth.getCurrentUser()?.permissions || {};
    const canCreate = isAdmin || Auth.can('canCreateBR');

    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-file-import"></i> ${T.get('br_title')}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${items.length}</span>
          <button class="btn btn-sm" onclick="BRModule.exportBRCSV()" title="Exporter CSV" style="background:rgba(34,197,94,.1);color:#16a34a;border:1.5px solid rgba(34,197,94,.25);border-radius:8px"><i class="fas fa-file-csv"></i> CSV</button>
          ${canCreate ? `<button class="btn btn-primary" onclick="BRModule.showCreate()"><i class="fas fa-plus"></i> ${T.get('br_new')}</button>` : ''}
        </div>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:2;min-width:180px">
          <label>${T.get('search')}</label>
          <input type="text" id="br-search-input" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
            oninput="BRModule._filters.q=this.value;App.reloadDebounced('brs')">
        </div>
        <div class="filter-group">
          <label>${T.get('col_supplier')}</label>
          <select onchange="BRModule._filters.supplierId=this.value;App.loadModule('brs')">
            <option value="all">${T.get('all')}</option>
            ${suppliers.map(s=>`<option value="${s.id}" ${String(supplierId)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.get('col_status')}</label>
          <select onchange="BRModule._filters.status=this.value;App.loadModule('brs')">
            <option value="all">${T.get('all')}</option>
            <option value="open" ${status==='open'?'selected':''}>${T.get('st_open')}</option>
            <option value="delivered" ${status==='delivered'?'selected':''}>${T.get('st_delivered')}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>${T.get('date')} (${T.isRTL()?'السنة':'Année'})</label>
          <select onchange="BRModule._filters.year=this.value;App.loadModule('brs')">
            <option value="all">${T.get('all')}</option>
            ${years.map(y=>`<option value="${y}" ${String(year)===String(y)?'selected':''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'أنشئ بواسطة':'Créé par'}</label>
          <select onchange="BRModule._filters.createdBy=this.value;App.loadModule('brs')">
            <option value="all">${T.get('all')}</option>
            ${DB.getAll('users').map(u=>`<option value="${u.id}" ${String(createdBy)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'من تاريخ':'Date début'}</label>
          <input type="date" value="${dateFrom||''}" onchange="BRModule._filters.dateFrom=this.value;App.loadModule('brs')">
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'إلى تاريخ':'Date fin'}</label>
          <input type="date" value="${dateTo||''}" onchange="BRModule._filters.dateTo=this.value;App.loadModule('brs')">
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'الترتيب':'Tri'}</label>
          <button class="btn btn-outline" style="height:36px;padding:0 12px;display:flex;align-items:center;gap:6px"
            onclick="BRModule._filters.sortDir=BRModule._filters.sortDir==='asc'?'desc':'asc';App.loadModule('brs')">
            <i class="fas fa-sort-amount-${this._filters.sortDir==='asc'?'up':'down'}"></i>
            ${this._filters.sortDir==='asc' ? (T.isRTL()?'أقدم':'Ancien') : (T.isRTL()?'أحدث':'Récent')}
          </button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${T.get('col_ref')}</th><th>${T.get('col_date')}</th><th>${T.get('col_supplier')}</th>
            <th>${T.get('col_total_ht')}</th><th>${T.get('col_timbre')}</th><th>${T.get('col_total_ttc')}</th>
            <th>${T.get('col_status')}</th><th>Traçabilité</th><th>${T.get('col_actions')}</th>
          </tr></thead>
          <tbody>
            ${items.length ? items.map(br=>{
              const sup = supMap[br.supplierId];
              const isLocked = br.status==='delivered'||br.status==='locked';
              const hasBL = !!blMap[br.id];
              const canEdit = Auth.canEdit(br);
              const canDel = Auth.canDelete(br);
              return `<tr>
                <td><strong>${Utils.escHTML(br.ref||'')}</strong>${isLocked?` <i class="fas fa-lock locked-icon"></i>`:''}</td>
                <td>${Utils.fmtDate(br.date)} <span style="color:var(--text4);font-size:10px">${br.createdAt?new Date(br.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span></td>
                <td>${Utils.escHTML(sup?.name||'-')}</td>
                <td>${Utils.fmtCurrency(br.totalHT)}</td>
                <td>${Utils.fmtCurrency(br.timbreAmount)}</td>
                <td class="fw-bold text-primary">${Utils.fmtCurrency(br.totalTTC)}</td>
                <td>${Utils.statusBadge(br.status||'open')}</td>
                <td style="font-size:11px;color:var(--text4);line-height:1.6">
                  <div title="Cr\u00e9\u00e9 par"><i class="fas fa-user" style="color:var(--primary);width:12px"></i> <strong>${Utils.escHTML(br.createdByName||'-')}</strong></div>
                  ${br.updatedByName && br.updatedByName !== br.createdByName ? `<div title="Modifi\u00e9 par"><i class="fas fa-pen" style="color:var(--warning);width:12px"></i> ${Utils.escHTML(br.updatedByName)}</div>` : ''}
                </td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="BRModule.showDetail(${br.id})" title="${T.get('details')}"><i class="fas fa-eye"></i></button>
                  ${!hasBL && !isLocked && (Auth.isAdmin()||Auth.can('canCreateBL'))?`<button class="btn-quick" onclick="BLModule.showGenerate(${br.id})" title="${T.get('br_gen_bl')}"><i class="fas fa-truck"></i> ${T.get('br_gen_bl_short')}</button>`:''}
                  ${canEdit?`<button class="btn btn-xs btn-outline" onclick="BRModule.showEdit(${br.id})" title="${T.get('edit')}"><i class="fas fa-edit"></i></button>`:''}
                  <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBR(${br.id})" title="${T.get('pdf')}"><i class="fas fa-file-pdf"></i></button>
                  ${canDel?`<button class="btn btn-xs btn-danger" onclick="BRModule.deleteBR(${br.id})" title="${T.get('delete')}"><i class="fas fa-trash"></i></button>`:''}
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-import"></i><h4>${T.get('no_data')}</h4><p>${T.get('br_new')}</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },

  // ── Supplier options ─────────────────────────────────────
  _supOpts(sel='') {
    return DB.getAll('suppliers').sort((a,b)=>a.name.localeCompare(b.name))
      .map(s=>`<option value="${s.id}" ${String(sel)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('');
  },

  // ── Line row HTML ────────────────────────────────────────
  _lineRowHTML(line={}, idx) {
    const qty = line.qty ?? 1;
    const price = line.price ?? 0;
    const disc = line.disc ?? 0;
    const tot = qty * price * (1 - disc/100);
    return `<tr id="br-line-${idx}">
      <td class="col-num" style="text-align:center;color:var(--text4);font-size:11px">${idx+1}</td>
      <td class="col-designation">
        <div class="autocomplete-wrap">
          <input type="text" id="br-des-${idx}" value="${Utils.escHTML(line.designation||'')}"
            placeholder="${T.get('br_designation')}"
            oninput="BRModule._onDesInput(${idx},this.value)"
            onfocus="BRModule._onDesInput(${idx},this.value)"
            onblur="setTimeout(()=>BRModule._closeAC(${idx}),200)">
          <div class="autocomplete-dropdown" id="br-ac-${idx}"></div>
        </div>
      </td>
      <td class="col-unit"><input type="text" id="br-unit-${idx}" value="${Utils.escHTML(line.unit||'')}" placeholder="u"></td>
      <td class="col-qty"><input type="number" id="br-qty-${idx}" value="${qty}" min="0" step="any" oninput="BRModule._recalcLine(${idx})"></td>
      <td class="col-price"><input type="number" id="br-price-${idx}" value="${price}" min="0" step="any" oninput="BRModule._recalcLine(${idx})"></td>
      <td class="col-disc"><input type="number" id="br-disc-${idx}" value="${disc}" min="0" max="100" step="any" oninput="BRModule._recalcLine(${idx})"></td>
      <td class="col-total" id="br-ltot-${idx}">${Utils.fmtCurrency(tot)}</td>
      <td class="col-del"><button class="btn btn-xs btn-danger btn-icon-only" onclick="BRModule._removeLine(${idx})"><i class="fas fa-times"></i></button></td>
    </tr>`;
  },

  _onDesInput(idx, val) {
    const dd = document.getElementById(`br-ac-${idx}`);
    if (!dd) return;
    if (!val || val.length < 1) { dd.style.display='none'; return; }
    const arts = DB.searchArticles(val);
    if (!arts.length) { dd.style.display='none'; return; }
    dd.innerHTML = arts.map(a=>
      `<div class="autocomplete-item" onmousedown="BRModule._selectArticle(${idx},'${Utils.escHTML(a.name).replace(/'/g,"\\'")}','${Utils.escHTML(a.unit||'').replace(/'/g,"\\'")}',${a.price||0})">
        <span>${Utils.escHTML(a.name)}</span>
        <span class="ac-price">${Utils.fmtCurrency(a.price||0)}</span>
      </div>`
    ).join('');
    dd.style.display = 'block';
  },

  _closeAC(idx) {
    const dd = document.getElementById(`br-ac-${idx}`); if(dd) dd.style.display='none';
  },

  _selectArticle(idx, name, unit, price) {
    const des = document.getElementById(`br-des-${idx}`);
    const u = document.getElementById(`br-unit-${idx}`);
    const p = document.getElementById(`br-price-${idx}`);
    if (des) { des.value = name; des.dispatchEvent(new Event('change')); }
    if (u && unit) { u.value = unit; u.dispatchEvent(new Event('change')); }
    if (p) { p.value = price; p.dispatchEvent(new Event('change')); }
    this._closeAC(idx);
    this._recalcLine(idx);
    // Focus quantity field after article selection
    const qtyEl = document.getElementById(`br-qty-${idx}`);
    if (qtyEl && !qtyEl.value) setTimeout(() => qtyEl.focus(), 50);
  },

  _recalcLine(idx) {
    const qty = parseFloat(document.getElementById(`br-qty-${idx}`)?.value)||0;
    const price = parseFloat(document.getElementById(`br-price-${idx}`)?.value)||0;
    const disc = parseFloat(document.getElementById(`br-disc-${idx}`)?.value)||0;
    const tot = qty * price * (1 - disc/100);
    const el = document.getElementById(`br-ltot-${idx}`);
    if (el) el.textContent = Utils.fmtCurrency(tot);
    this._recalcTotals();
  },

  _recalcTotals() {
    let ht = 0;
    let idx = 0;
    while (document.getElementById(`br-line-${idx}`)) {
      const qty   = parseFloat(document.getElementById(`br-qty-${idx}`)?.value)||0;
      const price = parseFloat(document.getElementById(`br-price-${idx}`)?.value)||0;
      const disc  = parseFloat(document.getElementById(`br-disc-${idx}`)?.value)||0;
      ht += qty * price * (1 - disc/100);
      idx++;
    }
    const extra    = parseFloat(document.getElementById('br-extra')?.value)||0;
    const totalHT  = ht + extra;
    const tvaRate  = parseFloat(document.getElementById('br-tva-rate')?.value) ?? 19;
    const tva      = totalHT * tvaRate / 100;
    const noTimbre = document.getElementById('br-no-timbre')?.checked;
    const autoTimbre = noTimbre ? 0 : DB.calcTimbre(totalHT);
    const timbreDetail = noTimbre ? null : DB.calcTimbreDetail(totalHT);
    const timbreInput = document.getElementById('br-timbre');
    if (timbreInput && (!timbreInput.dataset.manual || noTimbre)) timbreInput.value = autoTimbre.toFixed(2);
    const timbre   = noTimbre ? 0 : (parseFloat(timbreInput?.value)||0);
    const totalTTC = totalHT + tva + timbre;

    const el = id => document.getElementById(id);
    if (el('br-total-ht'))       el('br-total-ht').textContent       = Utils.fmtCurrency(totalHT);
    if (el('br-total-tva'))      el('br-total-tva').textContent      = Utils.fmtCurrency(tva);
    if (el('br-tva-pct'))        el('br-tva-pct').textContent        = tvaRate + '%';
    if (el('br-total-timbre-disp')) el('br-total-timbre-disp').textContent = Utils.fmtCurrency(timbre);
    if (el('br-total-ttc'))      el('br-total-ttc').textContent      = Utils.fmtCurrency(totalTTC);
    // Show calculation detail: "ceil(HT × 0.0119) = X tranches × 1.5 DA"
    const detailStr = noTimbre ? '' : timbreDetail
      ? `ceil(${Utils.fmtCurrency(totalHT).replace(' DA','')} × ${timbreDetail.rate}) = ${timbreDetail.tranches} tranches × ${timbreDetail.perTranche} DA`
      : '';
    if (el('br-timbre-auto'))  el('br-timbre-auto').textContent  = detailStr;
    if (el('br-timbre-auto2')) el('br-timbre-auto2').textContent  = detailStr ? `(${detailStr})` : '';
  },

  _toggleTimbre(noTimbre) {
    const inp = document.getElementById('br-timbre');
    if (noTimbre) {
      inp.value = '0.00';
      inp.disabled = true;
      inp.dataset.manual = '1';
    } else {
      inp.disabled = false;
      delete inp.dataset.manual;
    }
    this._recalcTotals();
  },

  _addLine(line={}) {
    const tbody = document.getElementById('br-lines-body');
    if (!tbody) return;
    let maxIdx = -1;
    let i = 0;
    while (document.getElementById(`br-line-${i}`)) { maxIdx = i; i++; }
    const idx = maxIdx + 1;
    tbody.insertAdjacentHTML('beforeend', this._lineRowHTML(line, idx));
    this._recalcTotals();
  },

  _removeLine(idx) {
    document.getElementById(`br-line-${idx}`)?.remove();
    this._recalcTotals();
  },

  _getLines() {
    const lines = [];
    let idx = 0;
    while (document.getElementById(`br-line-${idx}`)) {
      const designation = (document.getElementById(`br-des-${idx}`)?.value||'').trim();
      if (designation) {
        const unit = document.getElementById(`br-unit-${idx}`)?.value||'';
        const qty = parseFloat(document.getElementById(`br-qty-${idx}`)?.value)||0;
        const price = parseFloat(document.getElementById(`br-price-${idx}`)?.value)||0;
        const disc = parseFloat(document.getElementById(`br-disc-${idx}`)?.value)||0;
        const tot = qty * price * (1 - disc/100);
        lines.push({ designation, unit, qty, price, disc, total: tot });
        DB.saveArticle(designation, unit, price);
      }
      idx++;
    }
    return lines;
  },

  _validateBRNum(num, year, excludeId=null) {
    const fb   = document.getElementById('br-num-feedback');
    const prev = document.getElementById('br-ref-preview');
    if (!num || isNaN(num) || Number(num)<1) {
      if (fb) fb.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Numéro invalide</span>`;
      if (prev) prev.textContent = '';
      return;
    }
    const taken = DB.isBRNumTaken(Number(num), year, excludeId);
    if (fb) fb.innerHTML = taken
      ? `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Déjà utilisé</span>`
      : `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Disponible</span>`;
    // Read abbreviation from currently selected supplier
    const suppId   = parseInt(document.getElementById('br-supplier')?.value)||0;
    const suppAbbr = suppId ? (DB.getById('suppliers', suppId)?.abbrev||'') : '';
    const ref = DB.buildBRRef(Number(num), year, suppAbbr);
    if (prev) {
      prev.innerHTML = `<span style="font-weight:800;color:var(--primary);font-size:13px">${ref}</span>`;
    }
  },

  async _modalBody(br=null) {
    const year = new Date().getFullYear();
    const nextNum = await DB.getNextBRNum();
    const brNum = br ? br.brNum : nextNum;
    const brYear = br ? br.year : year;
    const initLines = br ? (br.lines||[]) : [{}];
    return `
    <div class="form-grid cols-2" style="margin-bottom:10px">
      <div class="form-group">
        <label class="required">${T.get('br_supplier')}</label>
        <select id="br-supplier" required
          onchange="BRModule._validateBRNum(document.getElementById('br-num').value,document.getElementById('br-year').value,${br?.id||'null'})">
          <option value="">— ${T.isRTL()?'اختر مورداً':'Choisir un fournisseur'} —</option>
          ${this._supOpts(br?.supplierId)}
        </select>
      </div>
      <div class="form-group">
        <label class="required">${T.get('col_date')}</label>
        <input type="date" id="br-date" value="${br?.date||Utils.today()}">
      </div>
      <div class="form-group">
        <label class="required">${T.isRTL()?'رقم الوصل':'N° BR'}</label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" id="br-num" value="${brNum}" min="1" style="width:100px"
            oninput="BRModule._validateBRNum(this.value,document.getElementById('br-year').value,${br?.id||'null'})">
          <span id="br-ref-preview" style="font-size:13px;font-weight:800;color:var(--primary)">${DB.buildBRRef(brNum,brYear,br?DB.getById('suppliers',br.supplierId)?.abbrev||'':'')}</span>
        </div>
        <div id="br-num-feedback" style="font-size:11px;margin-top:2px"></div>
      </div>
      <div class="form-group">
        <label>${T.isRTL()?'السنة المالية':'Année fiscale'}</label>
        <input type="number" id="br-year" value="${brYear}" min="2020" max="2099" style="width:100px"
          oninput="BRModule._validateBRNum(document.getElementById('br-num').value,this.value,${br?.id||'null'})">
      </div>
      <div class="form-group">
        <label>${T.isRTL()?'استُلم بواسطة':'Réceptionné par'}</label>
        <input type="text" id="br-receiver" value="${Utils.escHTML(br?.receivedBy||Auth.getCurrentUser()?.name||'')}" placeholder="Nom du réceptionnaire">
      </div>
      <div class="form-group">
        <label>${T.isRTL()?'مراقب بواسطة':'Contrôlé par'}</label>
        <input type="text" id="br-controller" value="${Utils.escHTML(br?.controlledBy||Auth.getCurrentUser()?.name||'')}" placeholder="Nom du contrôleur">

      </div>
    </div>

    <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
      <i class="fas fa-list"></i> ${T.get('br_lines')}
    </div>
    <div class="table-wrap" style="margin-bottom:8px">
      <table class="lines-table">
        <thead><tr>
          <th>#</th>
          <th style="text-align:left">${T.get('br_designation')}</th>
          <th>${T.get('br_unit')}</th>
          <th>${T.get('br_qty')}</th>
          <th>${T.get('br_unit_price')}</th>
          <th>${T.get('br_disc')} %</th>
          <th>Total HT</th>
          <th></th>
        </tr></thead>
        <tbody id="br-lines-body">
          ${initLines.map((l,i)=>this._lineRowHTML(l,i)).join('')}
        </tbody>
      </table>
    </div>
    <button class="btn btn-outline btn-sm" onclick="BRModule._addLine({})" style="margin-bottom:12px">
      <i class="fas fa-plus"></i> ${T.isRTL()?'إضافة سطر':'Ajouter ligne'}
    </button>

    <div class="form-grid cols-2">
      <div class="form-group">
        <label>${T.isRTL()?'مصاريف إضافية':'Frais supplémentaires'}</label>
        <input type="number" id="br-extra" value="${br?.extraFees||0}" min="0" step="any"
          oninput="BRModule._recalcTotals()">
      </div>
      <div class="form-group">
        <label>${T.isRTL()?'نسبة TVA (%)':'Taux TVA (%)'}</label>
        <input type="number" id="br-tva-rate" value="${(br?.tvaRate??DB.getSettings().tvaRate??19)}" min="0" max="100" step="0.1"
          oninput="BRModule._recalcTotals()">
      </div>
      <div class="form-group">
        <label>${T.get('br_timbre')} <small id="br-timbre-auto" style="color:var(--text4)"></small></label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="number" id="br-timbre" value="${(br?.timbreAmount||0).toFixed(2)}" min="0" step="any"
            oninput="this.dataset.manual='1';BRModule._recalcTotals()" style="flex:1" ${br?.noTimbre ? 'disabled' : ''}>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;margin:0">
            <input type="checkbox" id="br-no-timbre" ${br?.noTimbre ? 'checked' : ''} onchange="BRModule._toggleTimbre(this.checked)">
            ${T.isRTL() ? 'بدون طابع' : 'Sans timbre'}
          </label>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      <div class="totals-box" style="min-width:260px">
        <div class="totals-row"><label>${T.isRTL()?'المجموع قبل الرسوم':'Montant HT'}</label><span id="br-total-ht">0,00 DA</span></div>
        <div class="totals-row"><label>${T.isRTL()?'TVA':'Taxes (TVA)'} <span id="br-tva-pct" style="color:var(--text4);font-size:10px"></span></label><span id="br-total-tva">0,00 DA</span></div>
        <div class="totals-row"><label>${T.get('br_timbre')} <small id="br-timbre-auto2" style="color:var(--text4)"></small></label><span id="br-total-timbre-disp">0,00 DA</span></div>
        <div class="totals-row grand-total"><label>${T.isRTL()?'المجموع الشامل':'TOTAL TTC'}</label><span id="br-total-ttc">0,00 DA</span></div>
      </div>
    </div>
    <div class="form-group" style="margin-top:10px">
      <label>${T.get('br_notes')}</label>
      <textarea id="br-notes" rows="2" style="resize:vertical;width:100%" placeholder="Observations...">${Utils.escHTML(br?.notes||'')}</textarea>
    </div>`;
  },

  async showCreate() {
    // Admin must pick a user to assign this BR to (caisse attribution)
    if (Auth.isAdmin()) {
      // Only show users who have canCreateBR permission
      const users = DB.getAll('users').filter(u => u.role !== 'admin' && Auth.getUserPermissions(u).canCreateBR === true && u.active !== falselse);
      if (users.length > 0) {
        const opts = users.map(u=>`<option value="${u.id}">${Utils.escHTML(u.name||u.username)}</option>`).join('');
        const picked = await Dialog.show({
          title: '👤 Créer en tant que...',
          message: `<div style="margin-bottom:10px;font-size:13px">Ce BR sera attribué à la caisse de :</div><select id="dlg_as_user">${opts}</select><div style="margin-top:10px;font-size:11px">Vous restez affiché comme "Modifié par" pour transparence</div>`,
          type: 'info', confirmText: 'Continuer', cancelText: 'Annuler'
        });
        if (!picked) return;
        BRModule._adminActAsUserId = parseInt(document.getElementById('dlg_as_user')?.value);
      }
    }
    const body = await this._modalBody(null);
    UI.showModal(`<i class="fas fa-file-import"></i> ${T.get('br_new')}`, body, `
      <button class="btn btn-secondary" onclick="UI.closeModal()"> ${T.get('cancel')}</button>
      <button class="btn btn-outline" onclick="BRModule._saveBR(null,true)"><i class="fas fa-print"></i> Sauver & PDF</button>
      <button class="btn btn-primary" onclick="BRModule._saveBR(null,false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'xl');
    setTimeout(()=>{ BRModule._recalcTotals(); FormGuide.start(['br-supplier','br-date','br-num','br-des-0','br-qty-0','br-price-0']); }, 100);
  },

  async showEdit(id) {
    const br = DB.getById('brs', id);
    if (!br) return;
    const body = await this._modalBody(br);
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')} BR — ${br.ref}`, body, `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="BRModule._saveBR(${id},false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'xl');
    setTimeout(()=>{ BRModule._recalcTotals(); FormGuide.start(['br-supplier','br-date','br-num','br-des-0','br-qty-0','br-price-0']); }, 100);
  },

  _saveBR(editId, andPrint) {
    // Permission guard: non-admin users must have canCreateBR permission
    const curUser = Auth.getCurrentUser();
    if (!Auth.isAdmin() && !Auth.can('canCreateBR')) {
      Utils.notify('⛔ Permission refusée : création BR', 'error');
      UI.closeModal(); return;
    }
    const brNum    = parseInt(document.getElementById('br-num')?.value);
    const year     = parseInt(document.getElementById('br-year')?.value) || new Date().getFullYear();
    const supplierId = parseInt(document.getElementById('br-supplier')?.value);
    const date     = document.getElementById('br-date')?.value || Utils.today();
    const notes    = document.getElementById('br-notes')?.value || '';
    const extraFees= parseFloat(document.getElementById('br-extra')?.value)||0;
    const noTimbre = document.getElementById('br-no-timbre')?.checked || false;
    const timbre   = noTimbre ? 0 : (parseFloat(document.getElementById('br-timbre')?.value)||0);
    const tvaRateRaw = parseFloat(document.getElementById('br-tva-rate')?.value);
    const tvaRate  = isNaN(tvaRateRaw) ? 19 : tvaRateRaw;
    const receivedBy  = (document.getElementById('br-receiver')?.value||Auth.getCurrentUser()?.name||'').trim();
    const controlledBy= (document.getElementById('br-controller')?.value||'').trim();

    if (!supplierId) { Utils.notify('Sélectionnez un fournisseur', 'error'); return; }
    if (!brNum || brNum<1) { Utils.notify('Numéro BR invalide', 'error'); return; }
    if (DB.isBRNumTaken(brNum, year, editId)) { Utils.notify('Ce numéro BR est déjà utilisé', 'error'); return; }

    const lines = this._getLines();
    if (!lines.length) { Utils.notify('Ajoutez au moins un article', 'error'); return; }

    const totalHT  = Math.round((lines.reduce((s,l)=>s+l.total,0) + extraFees) * 100) / 100;
    const tvaAmount = Math.round(totalHT * tvaRate / 100 * 100) / 100;
    const totalTTC = Math.round((totalHT + tvaAmount + timbre) * 100) / 100;
    const suppAbbrev = DB.getById('suppliers', supplierId)?.abbrev || '';
    const ref      = DB.buildBRRef(brNum, year, suppAbbrev);

    const data = {
      ref, brNum, year, supplierId, date, lines, extraFees,
      totalHT, tvaRate, tvaAmount, timbreAmount: timbre, noTimbre, totalTTC,
      notes, receivedBy, controlledBy, status: 'open'
    };

    // ── Admin acting as another user ──────────────────────────────
    const adminU = Auth.getCurrentUser();
    const targetUserId = Auth.isAdmin() && BRModule._adminActAsUserId ? BRModule._adminActAsUserId : adminU?.id;
    const targetUser = DB.getById('users', targetUserId) || adminU;
    data.createdBy = targetUserId;
    data.createdByName = targetUser?.name || targetUser?.username || '?';
    data.lastModifiedBy = adminU?.id;
    data.lastModifiedByName = adminU?.name;
    BRModule._adminActAsUserId = null; // reset

    let savedBR;
    if (editId) {
      savedBR = DB.update('brs', editId, data);
      const bl = DB.getAll('bls').find(b=>Number(b.brId)===Number(editId));
      if (bl) DB.update('bls', bl.id, { ref: DB.buildBLRef(brNum,year,null,suppAbbrev) }, 'Sync avec BR modifié');
      Utils.notify((T.isRTL()?'تم تعديل وصل الاستلام':'BR modifié avec succès'), 'success');
    } else {
      savedBR = DB.insert('brs', data);
      Utils.notify((T.isRTL()?'تم إنشاء وصل الاستلام':'BR créé avec succès'), 'success');
    }
    UI.closeModal();
    App.loadModule('brs');
    if (andPrint && savedBR) setTimeout(()=>PDFGen.exportBR(savedBR.id), 300);
  },

  showDetail(id) {
    const br = DB.getById('brs', id);
    if (!br) return;
    const sup = DB.getById('suppliers', br.supplierId);
    const bl = DB.getAll('bls').find(b=>Number(b.brId)===Number(id));
    const isLocked = br.status==='delivered'||br.status==='locked';
    const canEdit = Auth.canEdit(br);

    const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${Utils.statusBadge(br.status||'open')}
      ${isLocked?`<span class="badge badge-danger"><i class="fas fa-lock"></i> ${T.get('locked')}</span>`:''}
    </div>
    <table class="detail-table">
      <tr><th>${T.get('col_ref')}</th><td><strong>${Utils.escHTML(br.ref||'')}</strong></td></tr>
      <tr><th>${T.get('br_date')}</th><td>${Utils.fmtDate(br.date)} <span style="color:var(--text4);font-size:10px">${br.createdAt?new Date(br.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span></td></tr>
      <tr><th>${T.get('br_supplier')}</th><td>${Utils.escHTML(sup?.name||'-')}</td></tr>
      ${bl?`<tr><th>${T.isRTL()?"BL مرتبط":"BL lié"}</th><td><strong>${Utils.escHTML(bl.ref||'')}</strong></td></tr>`:''}
      <tr><th>${T.get('br_total_ht')}</th><td>${Utils.fmtCurrency(br.totalHT)}</td></tr>
      <tr><th>${T.get('br_timbre')}</th><td>${Utils.fmtCurrency(br.timbreAmount)}</td></tr>
      <tr><th>${T.get('br_total_ttc')}</th><td class="fw-bold text-primary" style="font-size:15px">${Utils.fmtCurrency(br.totalTTC)}</td></tr>
      ${br.notes?`<tr><th>${T.get('br_notes')}</th><td>${Utils.escHTML(br.notes)}</td></tr>`:''}
      ${br.tags?.length?`<tr><th>${T.get('br_tags')}</th><td>${br.tags.map(t=>`<span class="badge badge-secondary">${Utils.escHTML(t)}</span>`).join(' ')}</td></tr>`:''}
    </table>
    <h4 style="font-size:13px;font-weight:700;margin:16px 0 8px;color:var(--text2)"><i class="fas fa-list"></i> ${T.get('br_lines')}</h4>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>${T.get('br_designation')}</th><th>${T.get('br_unit')}</th><th>${T.get('br_qty')}</th><th>${T.get('br_unit_price')}</th><th>${T.get('br_disc')}</th><th>${T.get('br_line_total')}</th></tr></thead>
        <tbody>
          ${(br.lines||[]).map((l,i)=>`<tr>
            <td>${i+1}</td>
            <td>${Utils.escHTML(l.designation||'')}</td>
            <td>${Utils.escHTML(l.unit||'')}</td>
            <td>${l.qty}</td>
            <td>${Utils.fmtCurrency(l.price)}</td>
            <td>${l.disc?l.disc+'%':'—'}</td>
            <td class="fw-bold text-primary">${Utils.fmtCurrency(l.total)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${Utils.historyHTML('brs', id)}`;

    const footer = `
    ${canEdit&&!isLocked?`<button class="btn btn-outline" onclick="UI.closeModal();BRModule.showEdit(${id})"><i class="fas fa-edit"></i> ${T.get('edit')}</button>`:''}
    ${!bl&&!isLocked&&(Auth.isAdmin()||Auth.can('canCreateBL'))?`<button class="btn btn-success" onclick="UI.closeModal();BLModule.showGenerate(${id})"><i class="fas fa-truck"></i> ${T.get('br_gen_bl')}</button>`:''}
    <button class="btn btn-outline" onclick="PDFGen.exportBR(${id})"><i class="fas fa-file-pdf"></i> PDF</button>
    <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('close')}</button>`;
    UI.showModal(`<i class="fas fa-file-import"></i> ${br.ref}`, body, footer, 'lg');
  },

  async deleteBR(id) {
    if (!Auth.isAdmin() && !Auth.can('canDeleteBR')) { Utils.notify('\u26d4 Permission refusée — suppression BR','error'); return; }
    const ok1 = await Dialog.confirm(T.isRTL() ? 'حذف الوصل' : 'Supprimer le BR', T.get('delete')+(T.isRTL()?' هذا الوصل؟':' ce BR ?'), 'danger');
    if (!ok1) return;
    const linkedBLs = DB.getAll('bls').filter(b=>Number(b.brId)===Number(id));
    if (linkedBLs.length) {
      const ok2 = await Dialog.confirm(T.isRTL() ? 'يوجد BL مرتبط' : 'BL lié', (T.isRTL()?`يوجد ${linkedBLs.length} BL مرتبط. حذف الاثنين؟`:`${linkedBLs.length} BL(s) lié(s) à ce BR. Supprimer tout ?`), 'danger');
      if (!ok2) return;
      for (const bl of linkedBLs) {
        // Create correction entry instead of silently deleting caisse history
        const blAmount = Number(bl.totalTTC || 0);
        if (bl.status === 'delivered' && blAmount > 0) {
          const ru = Auth.getCurrentUser();
          DB.insert('caisse_admin', {
            type:'withdrawal', source:'bl_error_delete', blId:bl.id, blRef:bl.ref||'',
            amount:blAmount, note:'Correction — suppression BR cascade '+(bl.ref||''),
            userId:bl.createdBy||ru?.id, userName:bl.createdByName||ru?.name, date:Utils.today()
          });
        }
        DB.delete('bls', bl.id);
      }
    }
    DB.delete('brs', id);
    Utils.notify((T.isRTL()?'تم حذف الوصل':'BR supprimé'), 'success');
  App.loadModule('brs');
  },

  // Remove the caisse_admin bl_delivery entry for a specific BL (called on delete)
  _cleanCaisseForBL(blId) {
    const blIdNum = Number(blId);
    const caisse = DB.getAll('caisse_admin');
    const toRemove = caisse.filter(e => e.source === 'bl_delivery' && Number(e.blId) === blIdNum);
    if (!toRemove.length) return;
    const cleaned = caisse.filter(e => !(e.source === 'bl_delivery' && Number(e.blId) === blIdNum));
    DB.rawSet('caisse_admin', cleaned);
    // Cloud sync: remove orphan entries
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      toRemove.forEach(e => window.API.remove('caisse_admin', e.id).catch(() => {}));
    }
    console.log(`[CaisseClean] Removed ${toRemove.length} caisse entries for BL id=${blId}`);
  },

  _applyFilters() {
    const status = document.getElementById('br-filter-status')?.value||'';
    const suppId = document.getElementById('br-filter-supplier')?.value||'';
    const from   = document.getElementById('br-filter-from')?.value||'';
    const to     = document.getElementById('br-filter-to')?.value||'';
    BRModule._activeFilters = { status, suppId, from, to };
    App.loadModule('brs');
  },
  _resetFilters() { BRModule._activeFilters = {}; App.loadModule('brs'); },
  _activeFilters: {},
  exportBRCSV() {
    const sups = {}; DB.getAll('suppliers').forEach(s => sups[s.id] = s);
    const items = DB.getAll('brs');
    const rows = items.map(br => [
      br.ref||'', br.date||'', (sups[br.supplierId]||{}).name||'',
      Number(br.totalHT||0), Number(br.tvaRate||0), Number(br.tvaAmount||0),
      Number(br.timbreAmount||0), Number(br.totalTTC||0),
      br.status||'open', br.receivedBy||'', br.notes||''
    ]);
    exportXLSX(
      ['Référence','Date','Fournisseur','Total HT','TVA %','Montant TVA','Timbre','Total TTC','Statut','Réceptionné par','Notes'],
      rows,
      'Bons_Reception_' + new Date().toISOString().slice(0,10)
    );
  }
};

// ═══════════════════════════════════════════════════════════════
// BL MODULE
// ═══════════════════════════════════════════════════════════════

const BLModule = {
  _filters: { q:'', status:'all', clientId:'all', dateFrom:'', dateTo:'', createdBy:'all', driver:'all', sortDir:'desc' },

  render() {
    // ── Inline History view ──
    if (this._viewingHistory) {
      return `<div style="padding:24px">
        <div class="card">
          <div class="card-header" style="border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:12px">
              <button class="btn btn-secondary" onclick="BLModule.hideHistory()" style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;font-weight:700">
                <i class="fas fa-arrow-left"></i> ← Retour aux BL
              </button>
              <div>
                <h3 style="margin:0"><i class="fas fa-history" style="color:var(--primary)"></i> Historique des BL</h3>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Toutes les lignes de livraison</div>
              </div>
            </div>
          </div>
          <div id="bl-history-container">${this._renderHistoryHTML()}</div>
        </div>
      </div>`;
    }


    const { q, status } = this._filters;
    const clients = DB.getAll('clients');
    const cliMap = {}; clients.forEach(c=>cliMap[c.id]=c);
    const allBRs = DB.getAll('brs');
    const brMap = {}; allBRs.forEach(b=>brMap[b.id]=b);
    const allUsers = DB.getAll('users');

    let items = DB.getAll('bls');
    if (q) { const ql=q.toLowerCase(); items=items.filter(b=>(b.ref+' '+(b.driverName||'')+' '+(b.truckIMM||'')+' '+(brMap[b.brId]?.ref||'')+' '+(cliMap[b.clientId]?.name||'')).toLowerCase().includes(ql)); }
    if (status!=='all') items=items.filter(b=>(b.status||'open')===status);
    if (this._filters.clientId && this._filters.clientId!=='all') items=items.filter(b=>String(b.clientId)===String(this._filters.clientId));
    if (this._filters.dateFrom) items=items.filter(b=>(b.date||'')>=this._filters.dateFrom);
    if (this._filters.dateTo)   items=items.filter(b=>(b.date||'')<=this._filters.dateTo);
    if (this._filters.createdBy && this._filters.createdBy!=='all') items=items.filter(b=>String(b.createdBy)===String(this._filters.createdBy));
    if (this._filters.driver && this._filters.driver!=='all') items=items.filter(b=>(b.driverName||'')===this._filters.driver);
    items.sort((a,b)=>{
      const cmp = String(b.createdAt).localeCompare(String(a.createdAt));
      return this._filters.sortDir === 'asc' ? -cmp : cmp;
    });

    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-file-export"></i> ${T.get('bl_title')}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${items.length}</span>
          <button class="btn btn-sm" onclick="BLModule.exportBLCSV()" title="Exporter CSV" style="background:rgba(34,197,94,.1);color:#16a34a;border:1.5px solid rgba(34,197,94,.25);border-radius:8px"><i class="fas fa-file-csv"></i> CSV</button>
          <button class="btn btn-outline" onclick="BLModule.showHistory()"><i class="fas fa-history"></i> Historique</button>
          ${(Auth.isAdmin()||(Auth.can('canCreateBL')))?`<button class="btn btn-success" onclick="BLModule.showNewBL()"><i class="fas fa-plus"></i> ${T.get('bl_new')}</button>`:''}
        </div>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:2;min-width:180px">
          <label>${T.get('search')}</label>
          <input type="text" id="bl-search-input" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
            oninput="BLModule._filters.q=this.value;App.reloadDebounced('bls')">
        </div>
        <div class="filter-group">
          <label>${T.get('col_client')}</label>
          <select onchange="BLModule._filters.clientId=this.value;App.loadModule('bls')">
            <option value="all">${T.get('all')}</option>
            ${clients.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${String(BLModule._filters.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.get('col_status')}</label>
          <select onchange="BLModule._filters.status=this.value;App.loadModule('bls')">
            <option value="all">${T.get('all')}</option>
            <option value="open" ${status==='open'?'selected':''}>${T.get('st_open')}</option>
            <option value="delivered" ${status==='delivered'?'selected':''}>${T.get('st_delivered')}</option>
            <option value="returned" ${status==='returned'?'selected':''}>🔄 Retourné</option>
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'من تاريخ':'Date début'}</label>
          <input type="date" value="${BLModule._filters.dateFrom||''}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);height:36px"
            onchange="BLModule._filters.dateFrom=this.value;App.loadModule('bls')">
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'إلى تاريخ':'Date fin'}</label>
          <input type="date" value="${BLModule._filters.dateTo||''}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);height:36px"
            onchange="BLModule._filters.dateTo=this.value;App.loadModule('bls')">
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'أنشئ بواسطة':'Créé par'}</label>
          <select onchange="BLModule._filters.createdBy=this.value;App.loadModule('bls')" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);height:36px">
            <option value="all">${T.get('all')}</option>
            ${allUsers.map(u=>`<option value="${u.id}" ${String(BLModule._filters.createdBy)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'السائق':'Chauffeur'}</label>
          <select onchange="BLModule._filters.driver=this.value;App.loadModule('bls')" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);height:36px">
            <option value="all">${T.get('all')}</option>
            ${[...new Set(items.map(b=>b.driverName).filter(Boolean))].sort().map(d=>`<option value="${d}" ${BLModule._filters.driver===d?'selected':''}>${Utils.escHTML(d)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'الترتيب':'Tri'}</label>
          <button class="btn btn-outline" style="height:36px;padding:0 12px;display:flex;align-items:center;gap:6px"
            onclick="BLModule._filters.sortDir=BLModule._filters.sortDir==='asc'?'desc':'asc';App.loadModule('bls')">
            <i class="fas fa-sort-amount-${this._filters.sortDir==='asc'?'up':'down'}"></i>
            ${this._filters.sortDir==='asc' ? (T.isRTL()?'أقدم':'Ancien') : (T.isRTL()?'أحدث':'Récent')}
          </button>
        </div>
        <div class="filter-group" style="flex:0 0 auto">
          <label>&nbsp;</label>
          <div style="display:flex;gap:5px">
            <button class="btn btn-sm" onclick="BLModule._filters={q:'',status:'all',clientId:'all',dateFrom:'',dateTo:'',createdBy:'all',driver:'all',sortDir:'desc'};App.loadModule('bls')" title="${T.isRTL()?'إعادة تعيين':'Réinitialiser les filtres'}" style="height:36px;width:36px;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,.1);color:#dc2626;border:1.5px solid rgba(239,68,68,.25);border-radius:8px;font-size:13px"><i class="fas fa-times"></i></button>
            <button class="btn btn-sm" onclick="BLModule.exportBLCSV()" title="Exporter vers Excel" style="height:36px;width:36px;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(34,197,94,.1);color:#16a34a;border:1.5px solid rgba(34,197,94,.25);border-radius:8px;font-size:14px"><i class="fas fa-file-excel"></i></button>
          </div>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${T.get('col_ref')}</th><th>${T.get('bl_linked_br')}</th><th>${T.get('col_date')}</th>
            <th>${T.get('col_client')}</th><th>${T.isRTL()?'عنوان التسليم':'Destination'}</th><th>${T.get('col_driver')}</th><th>${T.get('col_truck')}</th>
            <th>${T.get('col_total_ttc')}</th><th>${T.get('col_status')}</th><th>Traçabilité</th><th>${T.get('col_actions')}</th>
          </tr></thead>
          <tbody>
            ${items.length ? items.map(bl=>{
              const br = brMap[bl.brId];
              const cli = cliMap[bl.clientId];
              const isLocked = bl.status==='delivered'||bl.status==='locked';
              return `<tr>
                <td><strong>${Utils.escHTML(bl.ref||'')}</strong>${isLocked?` <i class="fas fa-lock locked-icon"></i>`:''}</td>
                <td>${br?`<span class="badge badge-primary">${Utils.escHTML(br.ref)}</span>`:'-'}</td>
                <td>${Utils.fmtDate(bl.date)} <span style="color:var(--text4);font-size:10px">${bl.createdAt?new Date(bl.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span></td>
                <td>${Utils.escHTML(cli?.name||'-')}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text3)" title="${Utils.escHTML(bl.destinationAddress||cli?.address||'')}">${Utils.escHTML((bl.destinationAddress||cli?.address||'-').substring(0,35))}${(bl.destinationAddress||'').length>35?'…':''}</td>
                <td>${Utils.escHTML(bl.driverName||'-')}</td>
                <td><code>${Utils.escHTML(bl.truckIMM||'-')}</code></td>
                <td class="fw-bold text-primary">${Utils.fmtCurrency(bl.totalTTC||br?.totalTTC||0)}</td>
                <td>${Utils.statusBadge(bl.status||'open')}</td>
                <td style="font-size:11px;color:var(--text4);line-height:1.6">
                  <div title="CR par"><i class="fas fa-user" style="color:var(--primary);width:12px"></i> <strong>${Utils.escHTML(bl.createdByName||'-')}</strong></div>
                  ${bl.updatedByName && bl.updatedByName !== bl.createdByName ? `<div title="Modifi\u00e9 par"><i class="fas fa-pen" style="color:var(--warning);width:12px"></i> ${Utils.escHTML(bl.updatedByName)}</div>` : ''}
                </td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="BLModule.showDetail(${bl.id})" title="${T.get('details')}"><i class="fas fa-eye"></i></button>
                  ${(!isLocked||Auth.isAdmin())?`<button class="btn btn-xs btn-outline" onclick="BLModule.showEdit(${bl.id},${Auth.isAdmin()})" title="${T.get('edit')}"><i class="fas fa-edit"></i></button>`:''}
                  ${!isLocked?`<button class="btn btn-xs btn-success" onclick="BLModule.confirmDelivery(${bl.id})" title="${T.get('bl_delivered')}"><i class="fas fa-check-circle"></i></button>`:''}
                  <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBL(${bl.id})" title="PDF"><i class="fas fa-file-pdf"></i></button>
                  ${(!isLocked||Auth.isAdmin())?`<button class="btn btn-xs btn-danger" onclick="BLModule.deleteBL(${bl.id})" title="${T.get('delete')}"><i class="fas fa-trash"></i></button>`:''}
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-file-export"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },


  async showNewBL() {
    // Admin picks a user who has canCreateBL permission
    if (Auth.isAdmin()) {
      const users = DB.getAll('users').filter(u => u.role !== 'admin' && Auth.getUserPermissions(u).canCreateBL === true && u.active !== falselse);
      if (users.length > 0) {
        const opts = users.map(u=>`<option value="${u.id}">${Utils.escHTML(u.name||u.username)}</option>`).join('');
        const picked = await Dialog.show({
          title: '👤 Créer en tant que...',
          message: `<div style="margin-bottom:10px;font-size:13px">Ce BL sera attribué à la caisse de :</div><select id="dlg_bl_as_user">${opts}</select><div style="margin-top:10px;font-size:11px">Vous restez affiché comme "Modifié par" pour transparence</div>`,
          type: 'info', confirmText: 'Continuer', cancelText: 'Annuler'
        });
        if (!picked) return;
        BLModule._adminActAsUserId = parseInt(document.getElementById('dlg_bl_as_user')?.value);
      }
    }
    const allBRs = DB.getAll('brs');
    const openBRs = allBRs.filter(b => b.status !== 'delivered' && b.status !== 'locked');
    const supMap = {}; DB.getAll('suppliers').forEach(s => supMap[s.id] = s);
    if (!openBRs.length) { Utils.notify('Aucun BR disponible — créez un BR d\'abord.', 'warning'); return; }
    openBRs.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    UI.showModal(`<i class="fas fa-truck"></i> ${T.get('bl_new')}`, `
    <div class="form-group mb-2">
      <label class="required">Sélectionner le BR à livrer</label>
      <select id="newbl-br" onchange="BLModule._onNewBLBRChange(this.value)" required>
        <option value="">— Choisir un BR —</option>
        ${openBRs.map(br => `<option value="${br.id}">${Utils.escHTML(br.ref)} — ${Utils.escHTML(supMap[br.supplierId]?.name||'?')} — ${Utils.fmtCurrency(br.totalTTC)}</option>`).join('')}
      </select>
    </div>
    <div id="newbl-info"></div>
    <div id="newbl-form" style="display:none"><div id="newbl-form-inner"></div></div>`, `
    <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
    <button class="btn btn-outline" id="newbl-pdf" style="display:none" onclick="BLModule._saveFromNewBL(true)"><i class="fas fa-file-pdf"></i> Sauver & PDF</button>
    <button class="btn btn-success" id="newbl-save" style="display:none" onclick="BLModule._saveFromNewBL(false)"><i class="fas fa-truck"></i> Créer BL</button>`, 'xl');
  },

  _onNewBLBRChange(brId) {
    const info = document.getElementById('newbl-info');
    const form = document.getElementById('newbl-form');
    const inner = document.getElementById('newbl-form-inner');
    const btn1  = document.getElementById('newbl-save');
    const btn2  = document.getElementById('newbl-pdf');
    if (!brId) {
      if (info)  info.innerHTML = '';
      if (form)  form.style.display = 'none';
      if (btn1)  btn1.style.display = 'none';
      if (btn2)  btn2.style.display = 'none';
      return;
    }
    const br  = DB.getById('brs', Number(brId));
    const sup = DB.getById('suppliers', br?.supplierId);
    const existingBLs = DB.getAll('bls').filter(b => b.brId === Number(brId));
    const partInfo = existingBLs.length ? `<span class="badge badge-warning" style="margin-left:8px">${existingBLs.length} BL(s) partiel(s)</span>` : '';
    if (info) info.innerHTML = `<div class="alert alert-info" style="margin-top:8px">
      <i class="fas fa-link"></i>
      <strong>${Utils.escHTML(br?.ref||'')}</strong> — ${Utils.escHTML(sup?.name||'?')} — <strong>${Utils.fmtCurrency(br?.totalTTC||0)}</strong>${partInfo}
    </div>`;
    if (inner) inner.innerHTML = this._blModalBody(br, null);
    if (form)  form.style.display = 'block';
    if (btn1)  btn1.style.display = 'inline-flex';
    if (btn2)  btn2.style.display = 'inline-flex';
    setTimeout(() => BLModule._recalcBLTotals(), 80);
  },

  _saveFromNewBL(andPrint) {
    const brId = Number(document.getElementById('newbl-br')?.value);
    if (!brId) { Utils.notify('Sélectionnez un BR', 'error'); return; }
    this._saveBL(brId, null, andPrint||false);
  },

  showGenerate(brId) {
    if (!Auth.isAdmin() && !Auth.can('canCreateBL')) { Utils.notify('⛔ Permission refusée — création BL', 'error'); return; }
    const br = DB.getById('brs', brId);
    if (!br) return;
    UI.showModal(`<i class="fas fa-truck"></i> ${T.get('bl_from_br')} — ${br.ref}`, this._blModalBody(br, null), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-outline" onclick="BLModule._saveBL(${brId},null,true)"><i class="fas fa-print"></i> Sauver & PDF</button>
      <button class="btn btn-success" onclick="BLModule._saveBL(${brId},null,false)"><i class="fas fa-truck"></i> Générer BL</button>`, 'xl');
    setTimeout(() => { BLModule._recalcBLTotals(); FormGuide.start(['bl-client','bl-destination','bl-driver','bl-truck','bl-date']); }, 100);
  },

  showEdit(blId, adminOverride = false) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    if (!br) return;
    const title = adminOverride
      ? `<i class="fas fa-shield-alt" style="color:#a78bfa"></i> Admin Edit — ${bl.ref} <span style="font-size:11px;background:rgba(99,102,241,.15);color:#a78bfa;padding:2px 8px;border-radius:6px;margin-left:6px">Override</span>`
      : `<i class="fas fa-edit"></i> ${T.get('edit')} BL — ${bl.ref}`;
    const sarfBtn = Auth.isAdmin()
      ? `<button class="btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none" onclick="UI.closeModal();BLModule.adminEditSarf(${blId})"><i class="fas fa-coins"></i> صرف</button>`
      : '';
    UI.showModal(title, this._blModalBody(br, bl), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      ${sarfBtn}
      ${adminOverride
        ? `<button class="btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff" onclick="BLModule._saveBL(${bl.brId},${blId},false,true)"><i class="fas fa-shield-alt"></i> Sauver (Admin)</button>`
        : `<button class="btn btn-warning" onclick="BLModule._saveBL(${bl.brId},${blId},false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`
      }`, 'xl');
    setTimeout(() => { BLModule._recalcBLTotals(); FormGuide.start(['bl-client','bl-destination','bl-driver','bl-truck','bl-date']); }, 100);
  },

  _onDriverInput(val) {
    const dd = document.getElementById('bl-driver-ac');
    if (!dd) return;
    if (!val || val.length < 1) { dd.style.display='none'; return; }
    const drivers = DB.getAll('drivers').filter(d => d.name.toLowerCase().includes((val||'').toLowerCase()));
    if (!drivers.length) { dd.style.display='none'; return; }
    // Show ALL matching drivers (same logic as article autocomplete in BR)
    dd.innerHTML = drivers.slice(0, 10).map(d =>
      `<div class="autocomplete-item" onmousedown="BLModule._selectDriver('${Utils.escHTML(d.name).replace(/'/g,"\\'").replace(/"/g,'&quot;')}','${(d.imm||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">
        <span><i class="fas fa-id-card" style="color:var(--primary);margin-right:6px"></i>${Utils.escHTML(d.name)}</span>
        ${d.imm ? `<span class="ac-price">${Utils.escHTML(d.imm)}</span>` : ''}
      </div>`
    ).join('');
    dd.style.display = 'block';
  },
  _closeDriverAC() {
    const dd = document.getElementById('bl-driver-ac');
    if (dd) dd.style.display='none';
    const name = document.getElementById('bl-driver')?.value;
    if (name) { const imm=DB.getDriverIMM(name); if(imm){const t=document.getElementById('bl-truck');if(t&&!t.value){t.value=imm; t.dispatchEvent(new Event('change'));}} }
  },
  _selectDriver(name, imm) {
    const di=document.getElementById('bl-driver'); if(di) { di.value=name; di.dispatchEvent(new Event('change')); }
    const ti=document.getElementById('bl-truck');  if(ti&&imm) { ti.value=imm; ti.dispatchEvent(new Event('change')); }
    this._closeDriverAC();
  },

  _blModalBody(br, bl=null) {
    const lines = br?.lines || [];
    const sup = DB.getById('suppliers', br.supplierId) || {};
    return `
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <!-- LEFT: Our Company / Fournisseur -->
      <div style="flex:1;min-width:200px;background:linear-gradient(135deg,rgba(var(--primary-rgb),.08),rgba(var(--primary-rgb),.03));border:1px solid rgba(var(--primary-rgb),.2);border-radius:12px;padding:12px 16px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--primary);margin-bottom:6px"><i class="fas fa-building"></i> Fournisseur / Origine</div>
        <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:4px">${Utils.escHTML(DB.getSettings().companyName||sup.name||'—')}</div>
        <div style="font-size:11px;color:var(--text3);line-height:1.8">
          ${DB.getSettings().nif?`NIF : ${Utils.escHTML(DB.getSettings().nif)}<br>`:''}${DB.getSettings().rc?`RC : ${Utils.escHTML(DB.getSettings().rc)}<br>`:''}
          <i class="fas fa-link" style="font-size:9px"></i> BR : <strong>${Utils.escHTML(br.ref)}</strong>
        </div>
      </div>
      <!-- RIGHT: Client details -->
      <div style="min-width:200px;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.03));border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:12px 16px" id="bl-client-credit-box">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--success);margin-bottom:6px"><i class="fas fa-user-tie"></i> Client / Destinataire</div>
        <div id="bl-client-name-disp" style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:4px">—</div>
        <div id="bl-client-details" style="font-size:11px;color:var(--text3);line-height:1.8"></div>
      </div>
      <!-- PLACEHOLDER to keep old anchor working -->
      <div style="display:none">
        <div style="font-size:9px;color:var(--primary)">${Utils.escHTML(sup.nif?`NIF : ${sup.nif}`:'')}${sup.rc?`RC : ${Utils.escHTML(sup.rc)}<br>`:''}
          <i class="fas fa-link" style="font-size:9px"></i> BR : <strong>${Utils.escHTML(br.ref)}</strong>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;background:var(--bg3);padding:10px;border-radius:8px;align-items:center">
      <span style="font-weight:600;font-size:13px;color:var(--text1)"><i class="fas fa-truck-loading"></i> Type :</span>
      <button class="btn btn-sm btn-outline" onclick="BLModule._fillAllQtys()"><i class="fas fa-check-double"></i> Livraison Complète</button>
      <button class="btn btn-sm btn-outline" onclick="BLModule._clearQtys()"><i class="fas fa-eraser"></i> Vider Qtés</button>
      <span id="bl-partial-badge" style="display:none" class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Partielle</span>
    </div>
    <div class="form-group mb-2">
      <label class="required">${T.get('col_client')}</label>
      <select id="bl-client" required onchange="BLModule._updateClientCredit(this.value)">
        <option value="">-- Choisir un client --</option>
        ${DB.getAll('clients').sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${String(bl?.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group mb-2" id="bl-destination-wrap">
      <label style="font-weight:600;display:flex;align-items:center;gap:6px"><i class="fas fa-map-marker-alt" style="color:var(--primary)"></i> ${T.isRTL()?'عنوان التسليم':'Adresse de destination'}</label>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="bl-dest-select" onchange="BLModule._onDestSelect(this.value)"
          style="flex:0 0 auto;width:180px;font-size:12px;border-radius:8px;padding:6px 8px;border:1px solid var(--border);background:var(--bg3);color:var(--text)">
          <option value="">-- Adresses enregistrées --</option>
          ${(()=>{ const cli=bl?.clientId?DB.getById('clients',Number(bl.clientId)):null; return (cli?.deliveryAddresses||[]).map((a,i)=>`<option value="${Utils.escHTML(a.address)}" ${(bl?.destinationAddress||'')===(a.address)?'selected':''}>${Utils.escHTML(a.label||'Adresse '+(i+1))}${a.isDefault?' ⭐':''}</option>`).join(''); })()}
        </select>
        <input type="text" id="bl-destination"
          value="${Utils.escHTML(bl?.destinationAddress || (()=>{ const cli=bl?.clientId?DB.getById('clients',Number(bl.clientId)):null; return (cli?.deliveryAddresses?.find(a=>a.isDefault)||cli?.deliveryAddresses?.[0])?.address || cli?.address || ''; })())}"
          placeholder="${T.isRTL()?'أدخل عنوان التسليم...':'Saisir l\'adresse de livraison...'}"
          style="flex:1;font-weight:500">
      </div>
    </div>
    <div class="form-grid cols-2" style="margin-bottom:12px">
      <div class="form-group">
        <label class="required">${T.get('bl_driver')} <small>${T.get('bl_driver_hint')}</small></label>
        <div class="autocomplete-wrap">
          <input type="text" id="bl-driver" value="${Utils.escHTML(bl?.driverName||'')}"
            placeholder="${T.get('bl_driver')}"
            oninput="BLModule._onDriverInput(this.value)"
            onfocus="BLModule._onDriverInput(this.value)"
            onblur="setTimeout(()=>BLModule._closeDriverAC(),200)">
          <div class="autocomplete-dropdown" id="bl-driver-ac"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="required">${T.get('bl_truck')}</label>
        <input type="text" id="bl-truck" value="${Utils.escHTML(bl?.truckIMM||'')}" placeholder="Ex: 17-123-16">
      </div>
      <div class="form-group">
        <label class="required">${T.get('col_date')}</label>
        <input type="date" id="bl-date" value="${bl?.date||Utils.today()}">
      </div>
      <div class="form-group">
        <label>${T.get('br_notes')}</label>
        <input type="text" id="bl-notes" value="${Utils.escHTML(bl?.notes||'')}" placeholder="${T.get('br_notes')}">
      </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
      <i class="fas fa-list"></i> Articles à livrer
    </div>
    <div class="table-wrap" style="margin-bottom:12px">
      <table class="lines-table">
        <thead><tr>
          <th>#</th><th style="text-align:left">Désignation</th><th>Unité</th>
          <th>Qté BR</th><th>Qté à livrer <span style="color:var(--danger)">*</span></th>
          <th>Prix Unit.</th><th>Remise</th><th>Total HT</th>
        </tr></thead>
        <tbody>
          ${lines.map((l,i) => {
            const existingLine = bl?.lines?.find(x=>x.designation===l.designation);
            const qtyDel = existingLine ? (existingLine.qtyDelivered ?? existingLine.qty ?? l.qty) : l.qty;
            const tot = (Number(qtyDel)||0) * (Number(l.price)||0) * (1-(Number(l.disc)||0)/100);
            return `<tr>
              <td>${i+1}</td>
              <td style="text-align:left"><strong>${Utils.escHTML(l.designation||'')}</strong></td>
              <td style="text-align:center">${Utils.escHTML(l.unit||'U')}</td>
              <td style="text-align:center;color:var(--text4)">${l.qty||0}</td>
              <td><input type="number" id="bl-qty-${i}" value="${qtyDel||0}" min="0"
                max="${l.qty||9999}" step="any" style="width:80px;text-align:center"
                data-brqty="${l.qty||0}" data-price="${l.price||0}" data-disc="${l.disc||0}"
                oninput="BLModule._recalcBLLine(${i})"></td>
              <td style="text-align:right">${Utils.fmtCurrency(l.price||0)}</td>
              <td style="text-align:center">${l.disc||0}%</td>
              <td id="bl-linetot-${i}" style="text-align:right;font-weight:600">${Utils.fmtCurrency(tot)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;justify-content:space-between;margin-top:12px">
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:600;white-space:nowrap">${T.isRTL()?'نسبة TVA (%)':'Taux TVA (%)'}</label>
        <input type="number" id="bl-tva-rate" value="${DB.getSettings().tvaRate??19}" min="0" max="100" step="0.1"
          style="width:70px;font-size:13px;font-weight:700;text-align:center;border-radius:8px;padding:4px 8px"
          oninput="BLModule._recalcBLTotals()">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;margin:0;margin-left:auto">
          <input type="checkbox" id="bl-no-timbre" ${bl?.noTimbre ? 'checked' : ''} onchange="BLModule._toggleTimbre(this.checked)">
          ${T.isRTL() ? 'بدون طابع' : 'Sans timbre'}
        </label>
      </div>
      <div class="totals-box" style="min-width:280px">
        <div class="totals-row"><label>${T.isRTL()?'المجموع قبل الرسوم':'Montant HT'}</label><span id="bl-tot-ht">0,00 DA</span></div>
        <div class="totals-row"><label>${T.isRTL()?'TVA':'Taxes (TVA)'} <span id="bl-tva-pct" style="color:var(--text4);font-size:10px"></span></label><span id="bl-tot-tva">0,00 DA</span></div>
        <div class="totals-row"><label>${T.isRTL()?'الطابع الجبائي':'Timbre Fiscal'}</label>
          <input type="number" id="bl-tot-timbre"
            value="${(bl?.timbreAmount ?? 0).toFixed(2)}"
            ${bl?.timbreAmount ? 'data-manual="1"' : ''}
            min="0" step="any"
            style="width:120px;text-align:right;font-weight:700;font-size:13px;border-radius:6px;padding:2px 8px"
            oninput="this.dataset.manual='1';BLModule._recalcBLTotals()">
        </div>
        <div class="totals-row grand-total"><label>${T.isRTL()?'المجموع الشامل':'TOTAL TTC'}</label><span id="bl-tot-ttc">0,00 DA</span></div>
      </div>
    </div>`;
  },

  _updateClientCredit(clientId) {
    const nameEl    = document.getElementById('bl-client-name-disp');
    const detailEl  = document.getElementById('bl-client-details');
    const destSel   = document.getElementById('bl-dest-select');
    const destInput = document.getElementById('bl-destination');
    if (!clientId) {
      if (nameEl) nameEl.textContent = '—';
      if (detailEl) detailEl.innerHTML = '';
      if (destSel) destSel.innerHTML = '<option value="">-- Adresses enregistrées --</option>';
      if (destInput) destInput.value = '';
      return;
    }
    const cli = DB.getById('clients', Number(clientId));
    if (!cli) return;
    if (nameEl) nameEl.textContent = cli.name || '—';
    if (detailEl) {
      const rows = [];
      if (cli.nif)     rows.push(`NIF : ${Utils.escHTML(cli.nif)}`);
      if (cli.nis)     rows.push(`NIS : ${Utils.escHTML(cli.nis)}`);
      if (cli.rc)      rows.push(`RC : ${Utils.escHTML(cli.rc)}`);
      if (cli.ai)      rows.push(`AI : ${Utils.escHTML(cli.ai)}`);
      if (cli.address) rows.push(`<i class="fas fa-map-marker-alt" style="font-size:9px"></i> ${Utils.escHTML(cli.address)}`);
      if (cli.phone)   rows.push(`<i class="fas fa-phone" style="font-size:9px"></i> ${Utils.escHTML(cli.phone)}`);
      if (cli.email)   rows.push(`<i class="fas fa-envelope" style="font-size:9px"></i> ${Utils.escHTML(cli.email)}`);
      detailEl.innerHTML = rows.join('<br>');
    }
    // Update destination dropdown with client's saved delivery addresses
    if (destSel) {
      const addrs = cli.deliveryAddresses || [];
      destSel.innerHTML = '<option value="">-- Adresses enregistrées --</option>' +
        addrs.map((a,i) => `<option value="${Utils.escHTML(a.address)}">${Utils.escHTML(a.label||'Adresse '+(i+1))}${a.isDefault?' ⭐':''}</option>`).join('');
      // Auto-fill with default address (or first, or main address)
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (destInput) { destInput.value = def?.address || cli.address || ''; destInput.dispatchEvent(new Event('change')); }
      if (destSel && def) destSel.value = def.address;
    } else if (destInput) {
      const addrs = cli.deliveryAddresses || [];
      const def = addrs.find(a => a.isDefault) || addrs[0];
      destInput.value = def?.address || cli.address || '';
      destInput.dispatchEvent(new Event('change'));
    }
    // Notify FormGuide that fields changed
    if (typeof FormGuide !== 'undefined' && typeof FormGuide._update === 'function') setTimeout(() => FormGuide._update(false), 100);
  },

  _onDestSelect(val) {
    const inp = document.getElementById('bl-destination');
    if (inp && val) { inp.value = val; inp.dispatchEvent(new Event('change')); }
  },



  _recalcBLLine(idx) {
    const input = document.getElementById(`bl-qty-${idx}`);
    if (!input) return;
    const maxQty = parseFloat(input.max) || 999999;
    let qty = parseFloat(input.value) || 0;
    if (qty > maxQty) {
      qty = maxQty;
      input.value = maxQty;
      input.style.borderColor = 'var(--danger)';
      Utils.notify('Quantité limitée à ' + maxQty + ' (quantité BR)', 'warning');
    } else {
      input.style.borderColor = '';
    }
    const price = parseFloat(input.dataset.price)||0;
    const disc  = parseFloat(input.dataset.disc)||0;
    const tot   = qty * price * (1 - disc/100);
    const el = document.getElementById(`bl-linetot-${idx}`);
    if (el) el.textContent = Utils.fmtCurrency(tot);
    this._recalcBLTotals();
  },

  _recalcBLTotals() {
    let ht = 0, i = 0;
    while (document.getElementById(`bl-qty-${i}`)) {
      const input = document.getElementById(`bl-qty-${i}`);
      const qty = parseFloat(input.value)||0;
      ht += qty * (parseFloat(input.dataset.price)||0) * (1 - (parseFloat(input.dataset.disc)||0)/100);
      i++;
    }
    const tvaRate  = parseFloat(document.getElementById('bl-tva-rate')?.value) ?? 19;
    const tva      = ht * tvaRate / 100;
    const noTimbre = document.getElementById('bl-no-timbre')?.checked;
    const autoTimbre = noTimbre ? 0 : DB.calcTimbre(ht);
    const timbreInput = document.getElementById('bl-tot-timbre');
    if (timbreInput && (!timbreInput.dataset.manual || noTimbre)) timbreInput.value = autoTimbre.toFixed(2);
    const timbre = noTimbre ? 0 : (parseFloat(timbreInput?.value)||0);
    const el = n => document.getElementById(n);
    if (el('bl-tot-ht'))     el('bl-tot-ht').textContent     = Utils.fmtCurrency(ht);
    if (el('bl-tot-tva'))    el('bl-tot-tva').textContent    = Utils.fmtCurrency(tva);
    if (el('bl-tva-pct'))    el('bl-tva-pct').textContent    = tvaRate + '%';
    if (el('bl-tot-ttc'))    el('bl-tot-ttc').textContent    = Utils.fmtCurrency(ht + tva + timbre);
    let isPartial = false, j = 0;
    while (document.getElementById(`bl-qty-${j}`)) {
      const inp = document.getElementById(`bl-qty-${j}`);
      if ((parseFloat(inp.value)||0) < (parseFloat(inp.dataset.brqty)||0)) { isPartial = true; break; }
      j++;
    }
    const badge = document.getElementById('bl-partial-badge');
    if (badge) badge.style.display = isPartial ? 'inline-flex' : 'none';
  },

  _toggleTimbre(noTimbre) {
    const inp = document.getElementById('bl-tot-timbre');
    if (noTimbre) {
      inp.value = '0.00';
      inp.disabled = true;
      inp.dataset.manual = '1';
    } else {
      inp.disabled = false;
      delete inp.dataset.manual;
    }
    this._recalcBLTotals();
  },

  _fillAllQtys() {
    let i = 0;
    while (document.getElementById(`bl-qty-${i}`)) {
      const input = document.getElementById(`bl-qty-${i}`);
      input.value = input.dataset.brqty||0;
      this._recalcBLLine(i); i++;
    }
  },

  _clearQtys() {
    let i = 0;
    while (document.getElementById(`bl-qty-${i}`)) {
      const input = document.getElementById(`bl-qty-${i}`);
      input.value = 0;
      this._recalcBLLine(i); i++;
    }
  },

  _saveBL(brId, editBlId, andPrint, adminOverride = false) {
    // Permission guard: non-admin users must have canCreateBL permission
    if (!Auth.isAdmin() && !Auth.can('canCreateBL')) {
      Utils.notify('⛔ Vous n’avez pas la permission de créer des BL', 'error');
      UI.closeModal(); return;
    }
    const driverName = (document.getElementById('bl-driver')?.value||'').trim();
    const truckIMM   = (document.getElementById('bl-truck')?.value||'').trim();
    const date       = document.getElementById('bl-date')?.value || Utils.today();
    const notes      = document.getElementById('bl-notes')?.value||'';
    const clientId   = document.getElementById('bl-client')?.value;
    const br = DB.getById('brs', brId);
    // ── Guard: block BL generation if BR was deleted (moved to recycle bin) ──
    if (!br) {
      Utils.notify(T.isRTL() ? 'خطأ: هذا الوصل محذوف ولا يمكن إنشاء BL منه.' : 'Erreur : ce BR a été supprimé — impossible de créer un BL.', 'error');
      UI.closeModal();
      return;
    }
    if (!clientId)   { Utils.notify(T.get('col_client')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    if (!driverName) { Utils.notify(T.get('bl_driver')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    if (!truckIMM)   { Utils.notify(T.get('bl_truck')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }


    /* Collect lines with their delivered quantities */
    const brLines = br.lines || [];
    const deliveredLines = brLines.map((l, i) => {
      const qty   = parseFloat(document.getElementById(`bl-qty-${i}`)?.value)||0;
      const price = Number(l.price)||0;
      const disc  = Number(l.disc)||0;
      const tot   = qty * price * (1 - disc/100);
      return { ...l, qtyDelivered: qty, qty, total: tot };
    }).filter(l => l.qtyDelivered > 0);

    if (!deliveredLines.length) {
      Utils.notify('Saisissez au moins une quantité à livrer > 0.', 'error');
      return;
    }

    /* Determine if partial */
    const isPartial = brLines.some((l, i) => {
      const qty = parseFloat(document.getElementById(`bl-qty-${i}`)?.value)||0;
      return qty < (Number(l.qty)||0);
    });

    /* Totals */
    const totalHT  = Math.round(deliveredLines.reduce((s,l) => s+l.total, 0) * 100) / 100;
    const tvaRate  = parseFloat(document.getElementById('bl-tva-rate')?.value) ?? DB.getSettings().tvaRate ?? 19;
    const tvaAmount = Math.round(totalHT * tvaRate / 100 * 100) / 100;
    const noTimbre = document.getElementById('bl-no-timbre')?.checked || false;
    const timbre   = noTimbre ? 0 : (parseFloat(document.getElementById('bl-tot-timbre')?.value) || DB.calcTimbre(totalHT));
    const totalTTC = Math.round((totalHT + tvaAmount + timbre) * 100) / 100;

    /* Build reference */
    let ref, partNum = null;
    if (editBlId) {
      const existing = DB.getById('bls', editBlId);
      ref = existing?.ref || DB.buildBLRef(br.brNum, br.year);
      partNum = existing?.partNum || null;
    } else if (isPartial) {
      partNum = DB.getNextBLPartNum(brId);
      ref = DB.buildBLRef(br.brNum, br.year, partNum);
    } else {
      ref = DB.buildBLRef(br.brNum, br.year);
    }

    DB.saveDriver(driverName, truckIMM);

    const data = {
      ref, brId, clientId: Number(clientId), driverName, truckIMM, date, notes,
      destinationAddress: (document.getElementById('bl-destination')?.value||'').trim(),
      lines: deliveredLines, totalHT, tvaRate, tvaAmount, timbreAmount: timbre, noTimbre, totalTTC,
      isPartial, partNum,
      // On admin override keep delivered status; otherwise new BL starts as open
      status: (adminOverride && editBlId) ? (DB.getById('bls', editBlId)?.status || 'open') : 'open'
    };

    // Admin acting as user attribution (new BL only)
    if (!editBlId) {
      const adminU = Auth.getCurrentUser();
      const targetUserId = Auth.isAdmin() && BLModule._adminActAsUserId ? BLModule._adminActAsUserId : adminU?.id;
      const targetUser = DB.getById('users', targetUserId) || adminU;
      data.createdBy = targetUserId;
      data.createdByName = targetUser?.name || targetUser?.username || '?';
      data.lastModifiedBy = adminU?.id;
      data.lastModifiedByName = adminU?.name;
      BLModule._adminActAsUserId = null; // reset
    }

    // Admin override edit: tag the record
    if (adminOverride && editBlId) {
      const adminU = Auth.getCurrentUser();
      data.lastAdminEdit = new Date().toISOString();
      data.lastAdminEditBy = adminU?.name;
    }

    let savedBL;
    if (editBlId) {
      savedBL = DB.update('bls', editBlId, data,
        adminOverride ? `Admin override edit (${Auth.getCurrentUser()?.name})` : null);
      Utils.notify((T.isRTL()?'تم تعديل وصل التسليم': adminOverride ? '✅ BL modifié (Admin Override)' : 'BL modifié'), 'success');
    } else {
      savedBL = DB.insert('bls', data);
      if (!isPartial) DB.update('brs', brId, { status:'delivered', deliveredAt:new Date().toISOString() }, 'Livraison complète via BL');
      Utils.notify(isPartial ? `BL partiel créé : ${ref}` : `BL créé : ${ref}`, 'success');
    }
    UI.closeModal();
    App.loadModule('bls');
    if (andPrint && savedBL) setTimeout(()=>PDFGen.exportBL(savedBL.id), 300);
  },

  async confirmDelivery(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    const u = Auth.getCurrentUser();
    // Use BL's own totalTTC (may differ from BR if partial delivery)
    const amount = Number(bl.totalTTC || br?.totalTTC || 0);
    const ok = await Utils.confirm2(
      T.get('bl_delivered_msg'),
      `Montant TTC: ${Utils.fmtCurrency(amount)}\n\nConfirmer définitivement ?`
    );
    if (!ok) return;

    const now = new Date().toISOString();
    // Mark BL delivered + traceability
    DB.update('bls', blId, {
      status: 'delivered', deliveredAt: now,
      deliveredBy: u?.id, deliveredByName: u?.name || 'Inconnu'
    }, 'Livraison confirmée');
    // Mark BR delivered + traceability
    // Only mark BR as delivered if ALL linked BLs are now delivered
    if (bl.brId) {
      const otherBLs = DB.getAll('bls').filter(b => Number(b.brId) === Number(bl.brId));
      const allDelivered = otherBLs.every(b => Number(b.id) === Number(blId) || b.status === 'delivered');
      if (allDelivered) {
        DB.update('brs', bl.brId, {
          status: 'delivered', deliveredAt: now,
          deliveredBy: u?.id, deliveredByName: u?.name || 'Inconnu'
        }, 'Livraison confirmée (depuis BL)');
      }
    }

    // ── Immediate caisse entry ──
    // Amount comes from the BR (as per client: "caisse amount is calculated from the BR")
    // But goes to the caisse of whoever CREATED the BL (not the BR creator)
    const blCreatorId = bl.createdBy || u?.id;
    const blCreator = DB.getById('users', blCreatorId);
    const today = Utils.today();
    // Avoid double-entry if already exists for this BL (Number() for type-safe comparison)
    const alreadyExists = DB.getAll('caisse_admin').some(e => Number(e.blId) === Number(blId) && e.source === 'bl_delivery');
    if (!alreadyExists && amount > 0) {
      DB.insert('caisse_admin', {
        type: 'deposit',
        source: 'bl_delivery',
        blId,
        blRef: bl.ref,
        brRef: br?.ref,
        brCreatedBy: br?.createdBy,
        brCreatedByName: br?.createdByName,
        userId: blCreatorId,      // ← cash goes to BL creator's caisse
        userName: blCreator?.name || blCreator?.username || 'Utilisateur',
        deliveredBy: u?.id,       // ← who clicked confirm
        deliveredByName: u?.name,
        sessionDate: today,
        amount: Number(bl.totalTTC || br?.totalTTC || 0),  // ← amount from BL (correct for partial deliveries)
        note: `BL ${bl.ref} (BR ${br?.ref||'?'}) — créé par ${blCreator?.name||'?'}, validé par ${u?.name||'?'}`
      });
    }

    Utils.notify((T.isRTL()?'تم تأكيد التسليم! الوثائق مقفلة.':'Livraison confirmée ! Documents verrouillés.'), 'success');

    // ── صرف (Sarf) Popup — always ask after delivery ──
    const sarfPopup = async () => {
      const sessions = DB.getAll('sessions');
      const todaySession = sessions.find(s => s.userId === u?.id && s.date === Utils.today() && s.status === 'open');
      const liqRemain = todaySession ? (todaySession.liquidStart||0)-(todaySession.sarfTotal||0) : 0;
      const hasSarf = await Dialog.show({
        title: T.isRTL()?'مصاريف التسليمة':'Frais de livraison',
        message: `<div style="padding:4px 0">
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(245,158,11,.03));border:1px solid rgba(245,158,11,.15);border-radius:12px;margin-bottom:14px">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-receipt" style="color:#fff;font-size:16px"></i></div>
            <div><div style="font-weight:700;font-size:13px;color:var(--text)">${T.isRTL()?'هل دفعت مصاريف إضافية؟':'Avez-vous eu des frais suppl\u00e9mentaires ?'}</div>
            <div style="font-size:11px;color:var(--text4);margin-top:2px">${Utils.escHTML(bl.ref||'')} \u00b7 ${Utils.fmtCurrency(amount)}</div></div>
          </div>
          ${todaySession ? '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px">' +
            '<div style="text-align:center;padding:8px;background:var(--bg3);border-radius:8px"><div style="font-size:9px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">D\u00e9part</div><div style="font-weight:800;font-size:14px;margin-top:2px">' + Utils.fmtCurrency(todaySession.liquidStart||0) + '</div></div>' +
            '<div style="text-align:center;padding:8px;background:rgba(245,158,11,.06);border-radius:8px"><div style="font-size:9px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">D\u00e9pens\u00e9</div><div style="font-weight:800;font-size:14px;color:#f59e0b;margin-top:2px">' + Utils.fmtCurrency(todaySession.sarfTotal||0) + '</div></div>' +
            '<div style="text-align:center;padding:8px;background:rgba(' + (liqRemain>0?'16,185,129':'239,68,68') + ',.06);border-radius:8px"><div style="font-size:9px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px">Restant</div><div style="font-weight:800;font-size:14px;color:' + (liqRemain>0?'#10b981':'#ef4444') + ';margin-top:2px">' + Utils.fmtCurrency(liqRemain) + '</div></div></div>' : ''}
        </div>`,
        type: 'info',
        confirmText: T.isRTL()?'\u0646\u0639\u0645\u060c \u0623\u0633\u062c\u0644':'Oui, d\u00e9clarer',
        cancelText: T.isRTL()?'\u0644\u0627 \u0634\u064a\u0621':'Non, rien'
      });
      if (hasSarf) {
        const sarfResult = await Dialog.show({
          title: T.isRTL()?'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0635\u0627\u0631\u064a\u0641':'D\u00e9clarer les frais',
          message: `<div style="padding:4px 0">
            <div style="margin-bottom:14px">
              <label style="font-weight:700;font-size:12px;display:block;margin-bottom:6px"><i class="fas fa-coins" style="color:#f59e0b"></i> ${T.isRTL()?'\u0627\u0644\u0645\u0628\u0644\u063a (\u062f\u062c)':'Montant (DA)'}</label>
              <input type="number" id="sarf_amount" placeholder="0.00" style="width:100%;font-size:22px;font-weight:800;text-align:center;padding:12px;background:var(--bg3);border:2px solid var(--border);border-radius:10px;color:var(--text)" min="0" step="any">
              <div style="display:flex;gap:6px;margin-top:8px">
                <button type="button" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:11px;font-weight:700;cursor:pointer" onclick="document.getElementById('sarf_amount').value=500">500</button>
                <button type="button" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:11px;font-weight:700;cursor:pointer" onclick="document.getElementById('sarf_amount').value=1000">1 000</button>
                <button type="button" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:11px;font-weight:700;cursor:pointer" onclick="document.getElementById('sarf_amount').value=2000">2 000</button>
                <button type="button" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:11px;font-weight:700;cursor:pointer" onclick="document.getElementById('sarf_amount').value=5000">5 000</button>
              </div>
            </div>
            <div style="margin-bottom:8px">
              <label style="font-weight:600;font-size:12px;display:block;margin-bottom:6px"><i class="fas fa-sticky-note" style="color:var(--text4)"></i> ${T.isRTL()?'\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629':'Motif'}</label>
              <input type="text" id="sarf_note" placeholder="${T.isRTL()?'\u0648\u0642\u0648\u062f\u060c \u0631\u0633\u0648\u0645 \u0637\u0631\u064a\u0642...':'Carburant, p\u00e9age, repas...'}" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px">
            </div>
          </div>`,
          type: 'warning',
          confirmText: T.isRTL()?'\u062a\u0633\u062c\u064a\u0644':'Enregistrer',
          cancelText: T.isRTL()?'\u0625\u0644\u063a\u0627\u0621':'Annuler'
        });
        if (sarfResult) {
          const sarfAmt = parseFloat(document.getElementById('sarf_amount')?.value||0);
          const sarfNote = document.getElementById('sarf_note')?.value||'';
          if (sarfAmt > 0) {
            if (todaySession) {
              const sarf = todaySession.sarf || [];
              sarf.push({ blId, blRef: bl.ref, amount: sarfAmt, note: sarfNote, at: new Date().toISOString() });
              const newSarfTotal = sarf.reduce((s,e) => s + e.amount, 0);
              DB.update('sessions', todaySession.id, { sarf, sarfTotal: newSarfTotal });
              Utils.notify('\u2705 \u0635\u0631\u0641 ' + Utils.fmtCurrency(sarfAmt) + ' \u2014 Restant: ' + Utils.fmtCurrency((todaySession.liquidStart||0) - newSarfTotal), 'success', 5000);
            } else {
              DB.insert('caisse_admin', {
                type: 'withdrawal', source: 'sarf', blId, blRef: bl.ref,
                userId: u?.id, userName: u?.name, sessionDate: Utils.today(),
                amount: sarfAmt, note: '\u0635\u0631\u0641: ' + (sarfNote || 'BL ' + bl.ref)
              });
              Utils.notify('\u2705 \u0635\u0631\u0641 ' + Utils.fmtCurrency(sarfAmt) + ' enregistr\u00e9', 'success', 5000);
            }
          }
        }
      }
    };
    await sarfPopup();
    App.loadModule('bls');
  },


  showDetail(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    const cli = bl ? DB.getById('clients', bl.clientId) : null;
    const isLocked = bl.status==='delivered'||bl.status==='locked';

    const body = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${Utils.statusBadge(bl.status||'open')}
      ${isLocked?`<span class="badge badge-danger"><i class="fas fa-lock"></i> ${T.get('locked')}</span>`:''}
    </div>
    <table class="detail-table">
      <tr><th>${T.isRTL()?"مرجع BL":"Référence BL"}</th><td><strong>${Utils.escHTML(bl.ref||'')}</strong></td></tr>
      <tr><th>${T.get('bl_linked_br')}</th><td>${br?`<strong>${Utils.escHTML(br.ref)}</strong>`:'-'}</td></tr>
      <tr><th>${T.get('col_date')}</th><td>${Utils.fmtDate(bl.date)} <span style="color:var(--text4);font-size:10px">${bl.createdAt?new Date(bl.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span></td></tr>
      <tr><th>${T.get('col_client')}</th><td>${Utils.escHTML(cli?.name||'-')}</td></tr>
      <tr><th>${T.get('bl_driver')}</th><td>${Utils.escHTML(bl.driverName||'-')}</td></tr>
      <tr><th>${T.get('bl_truck')}</th><td><code>${Utils.escHTML(bl.truckIMM||'-')}</code></td></tr>
      <tr><th>${T.get('col_total_ttc')}</th><td class="fw-bold text-primary" style="font-size:15px">${Utils.fmtCurrency(br?.totalTTC||0)}</td></tr>
      ${bl.notes?`<tr><th>${T.get('br_notes')}</th><td>${Utils.escHTML(bl.notes)}</td></tr>`:''}
    </table>
    ${Utils.historyHTML('bls', blId)}`;

    const footer = `
      ${!isLocked?`<button class="btn btn-outline" onclick="UI.closeModal();BLModule.showEdit(${blId})"><i class="fas fa-edit"></i> ${T.get('edit')}</button>`:''}
      ${!isLocked?`<button class="btn btn-success" onclick="UI.closeModal();BLModule.confirmDelivery(${blId})"><i class="fas fa-check-circle"></i> ${T.get('bl_delivered')}</button>`:''}
      ${isLocked&&Auth.isAdmin()?`<button class="btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;gap:6px" onclick="UI.closeModal();BLModule.adminOverrideEdit(${blId})"><i class="fas fa-shield-alt"></i> Admin Modif</button>`:''}
      ${isLocked&&Auth.isAdmin()?`<button class="btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none" onclick="UI.closeModal();BLModule.adminEditSarf(${blId})"><i class="fas fa-coins"></i> صرف</button>`:''}
      <button class="btn btn-outline" onclick="PDFGen.exportBL(${blId})"><i class="fas fa-file-pdf"></i> PDF</button>
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('close')}</button>`;
    UI.showModal(`<i class="fas fa-file-export"></i> ${bl.ref}`, body, footer, 'lg');
  },

  async adminOverrideEdit(blId) {
    if (!Auth.isAdmin()) return;
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    // Admin gets the FULL edit modal — same as regular edit
    // Temporarily unlock for this admin action
    UI.closeModal();
    BLModule.showEdit(blId, true /* adminOverride */);
  },

  async adminEditSarf(blId) {
    if (!Auth.isAdmin()) return;
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    // Find existing sarf entries linked to this BL across all sessions
    const allSessions = DB.getAll('sessions');
    let existing = [];
    allSessions.forEach(s => { (s.sarf||[]).forEach(e => { if(Number(e.blId)===Number(blId)) existing.push({...e,sessionId:s.id,sessionUserId:s.userId}); }); });
    // Also check caisse_admin sarf withdrawals
    const admSarf = DB.getAll('caisse_admin').filter(e => Number(e.blId)===Number(blId) && e.source==='sarf');
    const existingHtml = existing.length+admSarf.length > 0 ? ('<div style="margin-bottom:14px;background:#1e2a3e;border-radius:10px;padding:10px 14px;border:1px solid rgba(255,255,255,.08)"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.5px;margin-bottom:8px">صرف existants</div>'+[...existing,...admSarf].map(e=>'<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)"><span style="color:#94a3b8">'+Utils.escHTML(e.note||'—')+'</span><span style="font-weight:700;color:#f59e0b">'+Utils.fmtCurrency(e.amount)+'</span></div>').join('')+'</div>') : '';
    const users = DB.getAll('users').filter(u=>u.role!=='admin');
    const blCreatorId = bl.createdBy;
    const sarfUsers = users.map(u=>'<option value="'+u.id+'" '+(String(u.id)===String(blCreatorId)?'selected':'')+'>'+Utils.escHTML(u.name||u.username)+'</option>').join('');
    const res = await Dialog.show({
      title: `✏️ Modifier صرف — ${bl.ref}`,
      message: existingHtml+'<div class="form-group"><label>Utilisateur (caisse concernée)</label><select id="adm_sarf_user">'+sarfUsers+'</select></div><div class="form-group"><label>Montant صرف (DA)</label><input type="number" id="adm_sarf_amt" placeholder="0" style="font-size:22px;font-weight:800;text-align:center" min="0"></div><div class="form-group"><label>Motif</label><input type="text" id="adm_sarf_note" placeholder="Carburant, péage..."></div>',
      type: 'warning', confirmText: 'Ajouter صرف', cancelText: 'Annuler'
    });
    if (!res) return;
    const targetUserId = parseInt(document.getElementById('adm_sarf_user')?.value);
    const sarfAmt = parseFloat(document.getElementById('adm_sarf_amt')?.value||0);
    const sarfNote = document.getElementById('adm_sarf_note')?.value||'';
    if (!sarfAmt || sarfAmt <= 0) { Utils.notify('Montant invalide','warning'); return; }
    const adm = Auth.getCurrentUser();
    const targetUser = DB.getById('users', targetUserId);
    // Find today's session for that user OR use admin's
    const tSess = DB.getAll('sessions').find(s => s.userId===targetUserId && s.status==='open');
    if (tSess) {
      const sarf = tSess.sarf || [];
      sarf.push({ blId, blRef: bl.ref, amount: sarfAmt, note: sarfNote, at: new Date().toISOString(), addedBy: adm?.name });
      DB.update('sessions', tSess.id, { sarf, sarfTotal: sarf.reduce((s,e)=>s+e.amount,0) });
    } else {
      DB.insert('caisse_admin', {
        type:'withdrawal', source:'sarf', blId, blRef: bl.ref,
        userId: targetUserId, userName: targetUser?.name||'?',
        sessionDate: Utils.today(), amount: sarfAmt,
        note: `صرف (admin ${adm?.name}): ${sarfNote||'BL '+bl.ref}`
      });
    }
    Utils.notify(`✅ صرف ${Utils.fmtCurrency(sarfAmt)} ajouté pour ${targetUser?.name||'?'}`, 'success');
    App.loadModule('bls');
  },

  async deleteBL(id) {
    const bl = DB.getById('bls', id);
    if (!bl) return;
    console.log('[DEBUG deleteBL]', { id, status: bl.status, ref: bl.ref, totalTTC: bl.totalTTC, isAdmin: Auth.isAdmin(), canDeleteBL: Auth.can('canDeleteBL') });
    if (!Auth.isAdmin() && !Auth.can('canDeleteBL')) { Utils.notify('⛔ Permission refusée — suppression BL','error'); return; }

    const isValidated = bl.status === 'delivered' || bl.status === 'locked';
    const u = Auth.getCurrentUser();
    const amount = Number(bl.totalTTC || 0);

    // Non-admin can only delete their own non-delivered BLs
    if (!Auth.isAdmin() && isValidated) {
      Utils.notify('⛔ BL livré — suppression admin uniquement', 'error'); return;
    }
    if (!Auth.isAdmin() && bl.createdBy !== u?.id) {
      Utils.notify('⛔ Vous ne pouvez supprimer que vos propres BL','error'); return;
    }

    // ── Admin always gets two-path dialog, non-admin gets simple confirm ──
    if (!Auth.isAdmin()) {
      const ok = await Dialog.confirm('Supprimer BL', `Supprimer le BL ${bl.ref||''} ?`, 'danger');
      if (!ok) return;
      DB.delete('bls', id);
      Utils.notify('BL supprimé', 'success');
      App.loadModule('bls');
      return;
    }

    const returnBtn = `<button id="dlg_bl_return" onclick="document.getElementById('dlg_bl_choice').value='return';document.querySelector('.dlg-btn-primary').click()"
      style="display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:12px;cursor:pointer;text-align:left;width:100%">
      <span style="font-size:28px;flex-shrink:0">🔄</span>
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px">Retour Marchandise</div>
      <div style="font-size:11px;opacity:.85">Le BL reste visible avec statut "Retourné". Un retrait est créé en caisse pour corriger le solde.</div></div>
    </button>`;

    const errorBtn = `<button id="dlg_bl_error" onclick="document.getElementById('dlg_bl_choice').value='error';document.querySelector('.dlg-btn-primary').click()"
      style="display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:12px;cursor:pointer;text-align:left;width:100%">
      <span style="font-size:28px;flex-shrink:0">🗑️</span>
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px">BL Erroné — Supprimer</div>
      <div style="font-size:11px;opacity:.85">Le BL va à la corbeille.${isValidated ? ' Le montant est corrigé en caisse.' : ''}</div></div>
    </button>`;

    const choice = await Dialog.show({
      title: '⚠️ Suppression BL',
      message: `<div style="margin-bottom:16px;padding:14px 16px;background:#1e293b;border-radius:10px;border-left:4px solid #f59e0b">
        <div style="color:#fbbf24;font-weight:700;margin-bottom:4px;font-size:15px">BL ${Utils.escHTML(bl.ref||'')} — ${Utils.fmtCurrency(amount)}</div>
        <div style="font-size:12px;color:#94a3b8">${isValidated ? '✅ Livré — un dépôt de ' + Utils.fmtCurrency(amount) + ' a été généré en caisse.' : '📝 Brouillon — aucun mouvement de caisse.'}</div>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">${isValidated ? 'Choisissez une action :' : 'Confirmer la suppression :'}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${isValidated ? returnBtn : ''}
        ${errorBtn}
      </div>
      <input type="hidden" id="dlg_bl_choice" value="">
      <style>.dlg-btn-primary{display:none!important}</style>`,
      type: 'warning', confirmText: 'OK', cancelText: 'Annuler'
    });

    const action = document.getElementById('dlg_bl_choice')?.value;
    if (!choice || !action) return;

    const br = bl.brId ? DB.getById('brs', bl.brId) : null;
    const ref = bl.ref || `BL-${id}`;
    const now = new Date().toISOString();

    if (action === 'return') {
      // ═══ PATH A: RETURNED MERCHANDISE ═══════════════════════
      // 1. Mark BL as 'returned' (keep it visible)
      DB.update('bls', id, {
        status: 'returned',
        returnedAt: now,
        returnedBy: u?.id,
        returnedByName: u?.name || 'Admin'
      }, 'Retour marchandise');

      // 2. Create FORCED withdrawal in caisse (original deposit stays!)
      if (amount > 0) {
        DB.insert('caisse_admin', {
          type: 'withdrawal',
          source: 'bl_return',
          blId: id,
          blRef: ref,
          amount,
          note: `🔄 Retour marchandise — ${ref} (${Utils.fmtCurrency(amount)})`,
          userId: bl.createdBy || u?.id,
          userName: bl.createdByName || u?.name,
          returnedBy: u?.id,
          returnedByName: u?.name,
          date: Utils.today()
        });
      }

      // 3. Reopen linked BR if needed
      if (br && (br.status === 'delivered' || br.status === 'billed')) {
        const otherDelivered = DB.getAll('bls').filter(b =>
          Number(b.brId) === Number(bl.brId) && Number(b.id) !== Number(id) && b.status === 'delivered'
        );
        if (!otherDelivered.length) {
          DB.update('brs', br.id, { status: 'open' }, 'Retour BL — BR réouvert');
        }
      }

      Utils.notify(`🔄 BL ${ref} marqué comme retourné — caisse ajustée de ${Utils.fmtCurrency(amount)}`, 'success', 6000);
      App.loadModule('bls');

    } else if (action === 'error') {
      // ═══ PATH B: WRONG BL — DELETE + CORRECTION ═════════════
      // 1. Create correction withdrawal in caisse (original deposit stays!)
      if (amount > 0) {
        DB.insert('caisse_admin', {
          type: 'withdrawal',
          source: 'bl_error_delete',
          blId: id,
          blRef: ref,
          amount,
          note: `🗑️ Correction — suppression BL erroné ${ref} (${Utils.fmtCurrency(amount)})`,
          userId: bl.createdBy || u?.id,
          userName: bl.createdByName || u?.name,
          deletedBy: u?.id,
          deletedByName: u?.name,
          date: Utils.today()
        });
      }

      // 2. Delete BL (goes to recycle bin via DB.delete)
      DB.delete('bls', id);

      // 3. Reopen linked BR if needed
      if (br && (br.status === 'delivered' || br.status === 'billed')) {
        const otherDelivered = DB.getAll('bls').filter(b =>
          Number(b.brId) === Number(bl.brId) && Number(b.id) !== Number(id) && b.status === 'delivered'
        );
        if (!otherDelivered.length) {
          DB.update('brs', br.id, { status: 'open' }, 'BL erroné supprimé — BR réouvert');
        }
      }

      Utils.notify(`🗑️ BL ${ref} supprimé — correction caisse de ${Utils.fmtCurrency(amount)} créée`, 'success', 6000);
      App.loadModule('bls');
    }
  },

  _applyFilters() {
    const status = document.getElementById('bl-filter-status')?.value||'';
    const clientId = document.getElementById('bl-filter-client')?.value||'';
    const from = document.getElementById('bl-filter-from')?.value||'';
    const to   = document.getElementById('bl-filter-to')?.value||'';
    BLModule._activeFilters = { status, clientId, from, to };
    App.loadModule('bls');
  },
  _resetFilters() {
    BLModule._activeFilters = {};
    App.loadModule('bls');
  },
  _activeFilters: {},
  exportBLCSV() {
    const brs  = {}; DB.getAll('brs').forEach(b => brs[b.id] = b);
    const clis = {}; DB.getAll('clients').forEach(c => clis[c.id] = c);
    const rows = DB.getAll('bls').map(bl => [
      bl.ref||'', bl.date||'',
      (clis[bl.clientId]||{}).name||'',
      (brs[bl.brId]||{}).ref||'',
      bl.driverName||'', bl.truckIMM||'',
      Number(bl.totalHT||0), Number(bl.tvaRate||0), Number(bl.tvaAmount||0),
      Number(bl.timbreAmount||0), Number(bl.totalTTC||0),
      bl.status||'open', bl.notes||''
    ]);
    exportXLSX(
      ['Référence','Date','Client','BR lié','Chauffeur','Immatriculation','Total HT','TVA %','Montant TVA','Timbre','Total TTC','Statut','Notes'],
      rows,
      'Bons_Livraison_' + new Date().toISOString().slice(0,10)
    );
  },

  _historyFilters: { dateFrom: '', dateTo: '', clientId: 'all', q: '', status: 'all', sortDir: 'desc' },
  _viewingHistory: false,

  showHistory() {
    this._historyFilters = { dateFrom: '', dateTo: '', clientId: 'all', q: '', status: 'all', sortDir: 'desc' };
    this._viewingHistory = true;
    App.loadModule('bls');
  },

  hideHistory() {
    this._viewingHistory = false;
    App.loadModule('bls');
  },

  updateHistory() {
    const c = document.getElementById('bl-history-container');
    if (c) c.innerHTML = this._renderHistoryHTML();
  },

  exportHistory() {
    const { rows } = this._getHistoryData();
    const headers = ['Date', 'BL Ref', 'Client', 'Designation', 'Qty', 'Prix Unit', 'Total', 'Statut'];
    const exportRows = rows.map(r => [
      r.date, r.blRef, r.clientName, r.designation, Number(r.qty), Number(r.price), Number(r.total), r.status
    ]);
    exportXLSX(headers, exportRows, 'Historique_BL_' + new Date().toISOString().slice(0,10));
  },

  _getHistoryData() {
    const f = this._historyFilters;
    const clients = DB.getAll('clients');
    const cliMap = {}; clients.forEach(c => cliMap[c.id] = c);
    let bls = DB.getAll('bls');
    if (f.dateFrom) bls = bls.filter(b => (b.date || '') >= f.dateFrom);
    if (f.dateTo) bls = bls.filter(b => (b.date || '') <= f.dateTo);
    if (f.clientId !== 'all') bls = bls.filter(b => String(b.clientId) === String(f.clientId));
    if (f.status && f.status !== 'all') bls = bls.filter(b => (b.status || 'open') === f.status);
    const ql = (f.q || '').toLowerCase();
    let rows = [], grandTotal = 0;
    bls.forEach(bl => {
      const clientName = cliMap[bl.clientId]?.name || '-';
      (bl.lines || []).forEach(line => {
        const designation = line.designation || '';
        const ref = bl.ref || '';
        if (ql && !designation.toLowerCase().includes(ql) && !ref.toLowerCase().includes(ql) && !clientName.toLowerCase().includes(ql)) return;
        rows.push({ blId: bl.id, date: bl.date || '', blRef: ref, clientName, designation, qty: line.qty || 0, price: line.price || 0, total: line.total || 0, status: bl.status || 'open' });
        grandTotal += (line.total || 0);
      });
    });
    const dir = f.sortDir === 'asc' ? 1 : -1;
    rows.sort((a,b) => dir * (a.date.localeCompare(b.date) || a.blId - b.blId));
    return { rows, grandTotal, cliMap };
  },

  _renderHistoryHTML() {
    const data = this._getHistoryData();
    const f = this._historyFilters;
    const isAdmin = Auth.isAdmin();
    const clients = Object.values(data.cliMap).sort((a,b) => a.name.localeCompare(b.name));
    const tbody = data.rows.map(r => {
      let refHtml = Utils.escHTML(r.blRef);
      if (isAdmin) refHtml = `<a href="javascript:void(0)" onclick="BLModule.hideHistory();setTimeout(()=>BLModule.showEdit(${r.blId}),200)" style="text-decoration:none;color:var(--primary);font-weight:700">${refHtml}</a>`;
      return `<tr>
        <td style="white-space:nowrap">${Utils.fmtDate(r.date)}</td>
        <td>${refHtml}</td>
        <td>${Utils.escHTML(r.clientName)}</td>
        <td style="font-weight:600">${Utils.escHTML(r.designation)}</td>
        <td style="text-align:center">${r.qty}</td>
        <td>${Utils.fmtCurrency(r.price)}</td>
        <td class="fw-bold" style="color:var(--primary)">${Utils.fmtCurrency(r.total)}</td>
        <td>${Utils.statusBadge(r.status)}</td>
      </tr>`;
    }).join('');

    const hasFilters = f.q || f.dateFrom || f.dateTo || f.clientId !== 'all' || f.status !== 'all';
    const sortIcon = f.sortDir === 'asc' ? 'fa-sort-amount-up' : 'fa-sort-amount-down';
    const sortLabel = f.sortDir === 'asc' ? 'Plus ancien' : 'Plus récent';

    return `
      <div class="smart-filters">
        <div class="sf-search">
          <i class="fas fa-search sf-search-icon"></i>
          <input type="text" class="sf-search-input" value="${Utils.escHTML(f.q)}" placeholder="Rechercher réf, client, article..." oninput="BLModule._historyFilters.q=this.value;BLModule.updateHistory()">
        </div>
        <div class="sf-chips">
          <select class="sf-chip-select" onchange="BLModule._historyFilters.clientId=this.value;BLModule.updateHistory()">
            <option value="all">Tous clients</option>
            ${clients.map(c=>`<option value="${c.id}" ${String(f.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
          </select>
          <select class="sf-chip-select" onchange="BLModule._historyFilters.status=this.value;BLModule.updateHistory()">
            <option value="all" ${f.status==='all'?'selected':''}>Tous statuts</option>
            <option value="open" ${f.status==='open'?'selected':''}>✅ Ouverts</option>
            <option value="delivered" ${f.status==='delivered'?'selected':''}>📦 Livrés</option>
          </select>
          <input type="date" class="sf-date-input" value="${f.dateFrom}" title="Date début" onchange="BLModule._historyFilters.dateFrom=this.value;BLModule.updateHistory()">
          <span class="sf-date-sep">→</span>
          <input type="date" class="sf-date-input" value="${f.dateTo}" title="Date fin" onchange="BLModule._historyFilters.dateTo=this.value;BLModule.updateHistory()">
          <button class="btn btn-outline btn-sm" onclick="BLModule._historyFilters.sortDir=BLModule._historyFilters.sortDir==='asc'?'desc':'asc';BLModule.updateHistory()" title="Trier">
            <i class="fas ${sortIcon}"></i> ${sortLabel}
          </button>
          ${hasFilters ? `<button class="sf-clear" title="Effacer filtres" onclick="BLModule._historyFilters={dateFrom:'',dateTo:'',clientId:'all',q:'',status:'all',sortDir:'desc'};BLModule.updateHistory()"><i class="fas fa-times"></i></button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="BLModule.exportHistory()"><i class="fas fa-file-excel" style="color:#1d6f42"></i> Excel</button>
          <span class="badge badge-secondary" style="margin-left:4px">${data.rows.length} ligne(s)</span>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>Date</th><th>BL Réf</th><th>Client</th><th>Désignation</th>
            <th style="text-align:center">Qté</th><th>Prix Unit.</th><th>Total</th><th>Statut</th>
          </tr></thead>
          <tbody>${data.rows.length ? tbody : `<tr><td colspan="8" class="text-center text-muted" style="padding:32px"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>${T.get('no_data')}</td></tr>`}</tbody>
          <tfoot><tr>
            <td colspan="6" style="text-align:right;font-weight:700;padding:12px 16px">Grand Total (${data.rows.length} lignes)</td>
            <td colspan="2" style="font-weight:900;color:var(--primary);font-size:15px;padding:12px 16px">${Utils.fmtCurrency(data.grandTotal)}</td>
          </tr></tfoot>
        </table>
      </div>`;
  }
};

const CaisseModule = {
  render() {
    const u = Auth.getCurrentUser();
    if (!u) return '';
    // Admin view: show all cashier operations for today
    if (Auth.isAdmin()) {
      return CaisseModule._renderAdminTodayView();
    }
    const session = SessionMgr.getTodaySession(u.id);
    if (!session) return this._renderNoSession(u);
    return this._renderSession(u, session);
  },

  _renderNoSession(u) {
    const isAR = T.isRTL();
    return `<div style="padding:24px">
    <div class="card" style="max-width:500px;margin:60px auto;text-align:center;padding:40px 30px">
      <div style="font-size:64px;margin-bottom:16px;opacity:.6">🔐</div>
      <h3 style="margin-bottom:8px;color:var(--text)">${isAR ? 'لا توجد جلسة مفتوحة اليوم' : 'Aucune session ouverte aujourd\'hui'}</h3>
      <p style="color:var(--text-muted);margin-bottom:24px;font-size:13px">
        ${isAR ? 'يرجى فتح جلسة الصندوق لبدء العمل' : 'Veuillez ouvrir une session de caisse pour commencer à travailler.'}
      </p>
      <button class="btn btn-primary" onclick="CaisseModule.showMorningPrompt()" style="padding:10px 30px;font-size:15px">
        <i class="fas fa-door-open"></i> ${isAR ? 'فتح جلسة اليوم' : 'Ouvrir la session du jour'}
      </button>
    </div></div>`;
  },
  _renderSession(u, session) {
    const today = Utils.today();
    const brTotal = SessionMgr.getDayBRTotal(u.id, today);
    const deliveryTotal = SessionMgr.getDayDeliveryTotal(u.id, today);
    const isClosed = session.status === 'closed';
    const todayBRs = DB.getAll('brs').filter(b=>(b.date||'').slice(0,10)===today&&b.createdBy===u.id);
    const todayDeliveries = DB.getAll('caisse_admin').filter(e => e.source==='bl_delivery' && e.userId===u.id && e.sessionDate===today);
    const isAR = T.isRTL();

    // Performance evaluation
    const allSess = DB.getAll('sessions').filter(s=>s.userId===u.id&&s.status==='closed');
    allSess.sort((a,b)=>b.date.localeCompare(a.date));
    const totalSessions = allSess.length;
    const perfectSessions = allSess.filter(s=>Math.abs(s.ecart||0)<0.01).length;
    const accuracyPct = totalSessions>0 ? Math.round(perfectSessions/totalSessions*100) : 100;
    const totalEcarts = allSess.reduce((t,s)=>t+Math.abs(s.ecart||0),0);
    const avgEcart = totalSessions>0 ? totalEcarts/totalSessions : 0;
    const last7 = allSess.slice(0,7), prev7 = allSess.slice(7,14);
    const avgL7 = last7.length>0?last7.reduce((t,s)=>t+Math.abs(s.ecart||0),0)/last7.length:0;
    const avgP7 = prev7.length>0?prev7.reduce((t,s)=>t+Math.abs(s.ecart||0),0)/prev7.length:avgL7;
    const improving = avgL7 <= avgP7;
    let streak = 0; for (const s of allSess) { if(Math.abs(s.ecart||0)<0.01) streak++; else break; }

    const ek = (ic,lb,vl,co) => '<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px 10px;text-align:center"><div style="font-size:20px;margin-bottom:4px">'+ic+'</div><div style="font-size:20px;font-weight:900;color:'+(co||'#fff')+'">'+vl+'</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:rgba(255,255,255,.5);margin-top:4px">'+lb+'</div></div>';

    const accColor = accuracyPct>=80?'#4ade80':accuracyPct>=50?'#facc15':'#f87171';
    const evalCards = ek('🎯',isAR?'نسبة الدقة':'Précision',accuracyPct+'%',accColor)
      + ek('🔥',isAR?'سلسلة مثالية':'Série parfaite',streak,streak>0?'#4ade80':'rgba(255,255,255,.5)')
      + ek(improving?'📈':'📉',isAR?'الاتجاه':'Tendance',improving?(isAR?'تحسّن':'En progrès'):(isAR?'تراجع':'À améliorer'),improving?'#4ade80':'#f87171')
      + ek('⚖️',isAR?'متوسط الفارق':'Écart moyen',Utils.fmtCurrency(avgEcart),avgEcart<1?'#4ade80':'#facc15');

    const closedBadge = isClosed
      ? '<span class="badge badge-success" style="font-size:13px;padding:6px 14px"><i class="fas fa-check-circle"></i> '+T.get('caisse_closed')+'</span> <button class="btn btn-outline btn-sm" onclick="CaisseModule.showCloture(true)"><i class="fas fa-edit"></i> '+T.get('caisse_reopen')+'</button>'
      : '<button class="btn btn-primary" onclick="CaisseModule.showCloture(false)"><i class="fas fa-door-closed"></i> '+T.get('caisse_cloture')+'</button>';

    const sessionBadge = isClosed
      ? '<span class="badge badge-success" style="margin-'+(isAR?'right':'left')+':auto"><i class="fas fa-lock"></i> '+(isAR?'مغلقة':'Clôturée')+'</span>'
      : '<span class="badge badge-warning" style="margin-'+(isAR?'right':'left')+':auto"><i class="fas fa-clock"></i> '+(isAR?'مفتوحة':'En cours')+'</span>';

    const ecColor = Math.abs(session.ecart||0)<1?'var(--success)':'var(--danger)';
    const ecSign = (session.ecart||0)>=0?'+':'';

    let closedCards = '';
    if (isClosed) {
      closedCards = `
      <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--success)">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_especes')} ${isAR?'مُصرَّحة':'déclarées'}</div>
        <div style="font-size:24px;font-weight:900;color:var(--success)">${Utils.fmtCurrency(session.closedEspeces)}</div>
      </div>
      <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--warning)">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_monnaie')} ${isAR?'نهائي':'final'}</div>
        <div style="font-size:24px;font-weight:900;color:var(--warning)">${Utils.fmtCurrency(session.closedMonnaie||0)}</div>
      </div>
      <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid ${ecColor}">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_ecart')}</div>
        <div style="font-size:24px;font-weight:900;color:${ecColor}">${ecSign}${Utils.fmtCurrency(session.ecart||0)}</div>
      </div>`;
    } else {
      closedCards = `
      <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--text-muted)">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_especes')} ${isAR?'(متوقعة)':'(attendues)'}</div>
        <div style="font-size:24px;font-weight:900;color:var(--text)">${Utils.fmtCurrency(deliveryTotal)}</div>
      </div>`;
    }

    const alertMsg = isClosed ? `
      <div class="alert ${Math.abs(session.ecart||0)<1?'alert-success':'alert-warning'}" style="margin-top:16px">
        <i class="fas fa-${Math.abs(session.ecart||0)<1?'check-circle':'exclamation-triangle'}"></i>
        ${Math.abs(session.ecart||0)<1?(isAR?'الصندوق متوازن تماماً.':'Caisse parfaitement équilibrée.'):(isAR?'تم اكتشاف فارق — تحقق من وصولاتك.':'Un écart a été détecté — vérifiez vos BR.')}
      </div>` : '';

    const brRows = todayBRs.length ? todayBRs.map((br,i) => {
      const sup = DB.getById('suppliers',br.supplierId);
      return '<tr style="border-bottom:1px solid var(--border);'+(i%2?'background:var(--bg-inset)':'')+'"><td style="padding:10px 14px"><strong style="color:var(--primary)">'+Utils.escHTML(br.ref||'')+'</strong></td><td style="padding:10px 14px;color:var(--text)">'+Utils.escHTML(sup?.name||'-')+'</td><td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--text)">'+Utils.fmtCurrency(br.totalTTC)+'</td><td style="padding:10px 14px;text-align:center">'+Utils.statusBadge(br.status||'open')+'</td></tr>';
    }).join('') : '<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--text-muted)"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px"></i>'+(isAR?'لا وصولات اليوم':"Aucun BR aujourd'hui")+'</td></tr>';

    const brFooter = todayBRs.length ? '<tfoot><tr style="background:var(--bg-inset);border-top:2px solid var(--border)"><td colspan="2" style="padding:12px 14px;font-weight:800;text-align:right;font-size:14px;color:var(--text)">TOTAL</td><td style="padding:12px 14px;text-align:right;font-weight:900;font-size:16px;color:var(--primary)">'+Utils.fmtCurrency(brTotal)+'</td><td></td></tr></tfoot>' : '';

    const thStyle = 'padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)';

    return `<div style="padding:24px" ${isAR?'dir="rtl"':''}>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:var(--text);margin:0">${T.get('caisse_title')}</h2>
        <p style="color:var(--text-muted);font-size:12px;margin:4px 0 0">📅 ${isAR?'اليوم':'Aujourd\'hui'} — ${Utils.fmtDate(today)} — ${Utils.escHTML(u.name)}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">${closedBadge}</div>
    </div>

    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:14px;padding:20px;margin-bottom:20px;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.2)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <i class="fas fa-trophy" style="font-size:18px;color:#facc15"></i>
        <h3 style="font-size:15px;font-weight:700;margin:0">${isAR?'تقييم أدائي':'Mon évaluation'}</h3>
        <span style="margin-${isAR?'right':'left'}:auto;font-size:10px;color:rgba(255,255,255,.4)">${totalSessions} ${isAR?'جلسة':'session(s)'}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">${evalCards}</div>
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:20px;box-shadow:var(--shadow-sm)">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-calendar-day" style="color:var(--primary)"></i>
        <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'جلسة اليوم':'Session du jour'} — ${Utils.fmtDate(today)}</h3>
        ${sessionBadge}
      </div>
      <div style="padding:18px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--info,#38bdf8)">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${isAR?'BL مُسلَّمة (صندوقي)':'BL Livrés (ma caisse)'}</div>
            <div style="font-size:24px;font-weight:900;color:var(--info,#38bdf8)">${Utils.fmtCurrency(deliveryTotal)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${todayDeliveries.length} livraison(s)</div>
          </div>
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--primary)">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${isAR?'إجمالي BR (معلوماتي)':'Total BR (info)'}</div>
            <div style="font-size:24px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(brTotal)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${todayBRs.length} BR(s)</div>
          </div>
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--warning)">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_monnaie')} ${isAR?'أولي':'départ'}</div>
            <div style="font-size:24px;font-weight:900;color:var(--warning)">${Utils.fmtCurrency(session.startingMonnaie||0)}</div>
          </div>
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid #f59e0b">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${isAR?'السيولة / الصرف':'Liquide / صرف'}</div>
            <div style="font-size:18px;font-weight:900;color:#f59e0b">${Utils.fmtCurrency(session.liquidStart||0)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${isAR?'صرف':'صرف'}: −${Utils.fmtCurrency(session.sarfTotal||0)} → ${Utils.fmtCurrency((session.liquidStart||0)-(session.sarfTotal||0))}</div>
          </div>
          ${closedCards}
        </div>
        ${alertMsg}
      </div>
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-truck" style="color:var(--info,#38bdf8)"></i>
        <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'BL المُسلَّمة اليوم':'Mes BL livrés du jour'}</h3>
        <span style="margin-${isAR?'right':'left'}:auto;font-size:11px;color:var(--text-muted)">${todayDeliveries.length} livraison(s) — ${Utils.fmtCurrency(deliveryTotal)}</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
            <th style="${thStyle};text-align:left">BL Réf</th>
            <th style="${thStyle};text-align:left">BR Réf</th>
            <th style="${thStyle};text-align:right">Montant</th>
            <th style="${thStyle};text-align:left">Validé par</th>
            <th style="${thStyle};text-align:left">Heure</th>
          </tr></thead>
          <tbody>${todayDeliveries.length ? todayDeliveries.map((d,i) =>
            '<tr style="border-bottom:1px solid var(--border);'+(i%2?'background:var(--bg-inset)':'')+'">' +
            '<td style="padding:10px 14px"><strong style="color:var(--info,#38bdf8)">'+ Utils.escHTML(d.blRef||'-') +'</strong></td>' +
            '<td style="padding:10px 14px;color:var(--text)">'+ Utils.escHTML(d.brRef||'-') +'</td>' +
            '<td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--text)">'+ Utils.fmtCurrency(d.amount) +'</td>' +
            '<td style="padding:10px 14px;font-size:11px;color:var(--text3)">'+ Utils.escHTML(d.deliveredByName||'-') +'</td>' +
            '<td style="padding:10px 14px;font-size:11px;color:var(--text4)">'+ Utils.fmtDateTime(d.createdAt) +'</td>' +
            '</tr>'
          ).join('') : '<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--text-muted)"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px"></i>'+(isAR?'لا تسليمات اليوم':'Aucune livraison aujourd\'hui')+'</td></tr>'}
          </tbody>
          ${todayDeliveries.length ? '<tfoot><tr style="background:var(--bg-inset);border-top:2px solid var(--border)"><td colspan="2" style="padding:12px 14px;font-weight:800;text-align:right;font-size:14px;color:var(--text)">TOTAL</td><td style="padding:12px 14px;text-align:right;font-weight:900;font-size:16px;color:var(--info,#38bdf8)">'+ Utils.fmtCurrency(deliveryTotal) +'</td><td colspan="2"></td></tr></tfoot>' : ''}
        </table>
      </div>
    </div>
    ${(session.sarf||[]).length > 0 ? `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-top:16px;box-shadow:var(--shadow-sm)">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-money-bill-wave" style="color:#f59e0b"></i>
        <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'مصاريف الصرف اليوم':'Dépenses صرف du jour'}</h3>
        <span style="margin-${isAR?'right':'left'}:auto;font-size:11px;color:var(--text-muted)">${(session.sarf||[]).length} — Total: ${Utils.fmtCurrency(session.sarfTotal||0)}</span>
      </div>
      <div style="padding:12px">
        ${(session.sarf||[]).map(s => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg3);border-radius:10px;border-left:3px solid #f59e0b;margin-bottom:6px">
          <div style="font-size:20px">💸</div>
          <div style="flex:1">
            <div style="font-weight:800;color:#d97706;font-size:15px">${Utils.fmtCurrency(s.amount)}</div>
            <div style="font-size:11px;color:var(--text4)">${Utils.escHTML(s.note||'Sans motif')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text4)">BL: ${Utils.escHTML(s.blRef||'?')}</div>
            <div style="font-size:10px;color:var(--text4)">${s.at ? new Date(s.at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'}) : ''}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}
    ${this._renderUserHistory(u)}
    </div>`;
  },


  _renderAdminTodayView() {
    const isAR = T.isRTL();
    const today = Utils.today();
    const users = DB.getAll('users').filter(u => u.role === 'user');
    const sessions = DB.getAll('sessions').filter(s => s.date === today);
    const allBRs = DB.getAll('brs').filter(b => (b.date||'').slice(0,10) === today);
    const caTx = DB.getAll('caisse_admin').filter(t => (t.createdAt||'').slice(0,10) === today);

    // Per-user rows
    const allDeliveries = DB.getAll('caisse_admin').filter(t =>
      t.source === 'bl_delivery' && (t.createdAt||'').slice(0,10) === today
    );
    const rows = users.map(u => {
      const sess = sessions.find(s => s.userId === u.id);
      const uBRs = allBRs.filter(b => b.createdBy === u.id);
      const brTotal = uBRs.reduce((t,b) => t+(Number(b.totalTTC)||0), 0);
      const blDelivered = allDeliveries.filter(e => e.userId === u.id).reduce((t,e) => t+(Number(e.amount)||0), 0);
      const deposited = caTx.filter(t => t.type==='deposit' && t.userId===u.id).reduce((t,tx) => t+(Number(tx.amount)||0), 0);
      const sessStatus = sess
        ? (sess.status==='closed'
            ? `<span class="badge badge-success"><i class="fas fa-lock"></i> ${isAR?'مغلقة':'Clôturée'}</span>`
            : `<span class="badge badge-warning"><i class="fas fa-clock"></i> ${isAR?'مفتوحة':'En cours'}</span>`)
        : `<span class="badge badge-secondary">${isAR?'لا توجد جلسة':'Pas de session'}</span>`;
      const ecart = sess?.ecart ?? null;
      const ecartStr = ecart !== null ? Utils.fmtCurrency(ecart) : '—';
      const ecartColor = ecart === null ? 'var(--text4)' : Math.abs(ecart)<0.01 ? 'var(--success)' : 'var(--warning)';
      return `<tr>
        <td><strong>${Utils.escHTML(u.name)}</strong></td>
        <td>${sessStatus}</td>
        <td style="color:var(--primary);font-weight:700">${Utils.fmtCurrency(brTotal)}</td>
        <td style="color:var(--info,#38bdf8);font-weight:700">${blDelivered>0?Utils.fmtCurrency(blDelivered):'<span style="color:var(--text4)">—</span>'}</td>
        <td style="color:var(--success);font-weight:700">${Utils.fmtCurrency(deposited)}</td>
        <td style="color:${ecartColor};font-weight:700">${ecartStr}</td>
        <td style="color:var(--warning);font-weight:700">${Utils.fmtCurrency(sess?.startingMonnaie||0)}</td>
      </tr>`;
    }).join('');

    // Today transactions (all caisse_admin for today) — with source icons
    const sourceIcon = src => ({
      bl_delivery:       '<i class="fas fa-truck" style="color:var(--primary)"></i>',
      bl_return:         '<i class="fas fa-rotate-left" style="color:#f59e0b"></i>',
      bl_error_delete:   '<i class="fas fa-ban" style="color:var(--danger)"></i>',
      user_cloture:      '<i class="fas fa-door-closed" style="color:var(--success)"></i>',
      admin_manual:      '<i class="fas fa-user-shield" style="color:var(--warning)"></i>',
      admin_withdrawal:  '<i class="fas fa-minus-circle" style="color:var(--danger)"></i>',
      bank_transfer:     '<i class="fas fa-university" style="color:var(--info)"></i>',
      supplier_payment:  '<i class="fas fa-industry" style="color:#a78bfa"></i>',
    })[src] || '<i class="fas fa-exchange-alt" style="color:var(--text4)"></i>';
    const txRows = caTx.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(t => `
      <div class="tx-item ${t.type}" style="cursor:pointer" onclick="AdminCaisseModule.showDetail(${t.id})">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <span style="font-size:18px;width:24px;text-align:center">${sourceIcon(t.source)}</span>
          <div>
            <div style="font-size:11px;color:var(--text4)"><i class="fas fa-clock"></i> ${Utils.fmtDateTime(t.createdAt)}</div>
            <div style="font-weight:600;color:var(--text);font-size:13px">${Utils.escHTML(t.note||t.source||'-')}</div>
            <div style="font-size:11px;color:var(--text3)">${Utils.escHTML(t.userName||'-')}${t.deliveredByName && t.deliveredByName!==t.userName ? ` — livré par <strong>${Utils.escHTML(t.deliveredByName)}</strong>` : ''}</div>
          </div>
        </div>
        <div style="text-align:right;display:flex;align-items:center;gap:6px">
          <div class="badge ${t.type==='deposit'?'badge-success':'badge-danger'}" style="font-size:12px">
            ${t.type==='deposit'?'+':'-'}${Utils.fmtCurrency(t.amount)}
          </div>
          <button class="btn-correct" onclick="event.stopPropagation();AdminCaisseModule._correctEntry(${t.id})" title="Corriger"><i class="fas fa-edit"></i></button>
        </div>
      </div>`).join('');

    const totalBR   = allBRs.reduce((t,b) => t+(Number(b.totalTTC)||0), 0);
    const totalBLDel= caTx.filter(t=>t.source==='bl_delivery').reduce((t,e)=>t+(Number(e.amount)||0),0);
    const totalDep  = caTx.filter(t=>t.type==='deposit').reduce((t,tx) => t+(Number(tx.amount)||0), 0);
    const totalWith = caTx.filter(t=>t.type==='withdrawal').reduce((t,tx) => t+(Number(tx.amount)||0), 0);

    return `<div style="padding:24px" ${isAR?'dir="rtl"':''}>
      <h2 style="font-size:18px;font-weight:800;margin-bottom:16px">
        <i class="fas fa-calendar-day" style="color:var(--primary)"></i>
        ${isAR?'عمليات الصندوق اليوم':'Opérations de caisse du jour'} — ${Utils.fmtDate(today)}
      </h2>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي BR (متوقع)':'Total BR (attendu)'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--primary);margin-top:6px">${Utils.fmtCurrency(totalBR)}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;border-top:3px solid var(--info,#38bdf8)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'BL مُسلَّمة (محقق)':'BL Livrés (réalisé)'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--info,#38bdf8);margin-top:6px">${Utils.fmtCurrency(totalBLDel)}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي الإيداعات':'Total Dépôts'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--success);margin-top:6px">${Utils.fmtCurrency(totalDep)}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي السحوبات':'Total Retraits'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--danger);margin-top:6px">${totalWith>0?'-':''}${Utils.fmtCurrency(totalWith)}</div>
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-header"><h3><i class="fas fa-users" style="color:var(--primary)"></i> ${isAR?'ملخص المستخدمين اليوم':'Résumé caissiers du jour'}</h3></div>
        <div class="table-wrap"><table class="data-table" style="font-size:12px">
          <thead><tr>
            <th>${isAR?'المستخدم':'Utilisateur'}</th>
            <th>${isAR?'الجلسة':'Session'}</th>
            <th>${isAR?'إجمالي BR':'Total BR'}</th>
            <th style="color:var(--info,#38bdf8)">${isAR?'BL مُسلَّمة':'BL Livrés'}</th>
            <th>${isAR?'مُودَع':'Versé'}</th>
            <th>${isAR?'الفارق':'Écart'}</th>
            <th>${isAR?'الصرف':'Monnaie'}</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="7" class="text-muted text-center">${isAR?'لا يوجد مستخدمون':'Aucun utilisateur'}</td></tr>`}</tbody>
        </table></div>
      </div>

      <div class="card mb-2">
        <div class="card-header">
          <h3><i class="fas fa-list"></i> ${isAR?'معاملات اليوم':'Transactions du jour'}</h3>
          <div class="card-actions">
            <button class="btn btn-success btn-sm" onclick="AdminCaisseModule.showDeposit()"><i class="fas fa-arrow-down"></i> ${isAR?'إيداع':'Dépôt'}</button>
            <button class="btn btn-danger btn-sm" onclick="AdminCaisseModule.showWithdrawal()"><i class="fas fa-arrow-up"></i> ${isAR?'سحب':'Retrait'}</button>
          </div>
        </div>
        <div class="transaction-tree" style="max-height:350px;overflow-y:auto">
          ${txRows || `<div class="empty-state" style="padding:24px"><i class="fas fa-inbox"></i><p>${isAR?'لا توجد معاملات اليوم':'Aucune transaction aujourd\'hui'}</p></div>`}
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-primary" onclick="App.loadModule('admin_caisse')">
          <i class="fas fa-vault"></i> ${isAR?'الصندوق الرئيسي الكامل':'Caisse Principale complète'}
        </button>
      </div>
    </div>`;
  },


  showMorningPrompt() {
    const u = Auth.getCurrentUser();
    if (!u) return;
    // Skip if user doesn't require daily liquid (permission based)
    const perms = Auth.getUserPermissions(u);
    if (perms.requireDailyLiquid === false) {
      // Auto-start session with 0 liquid
      SessionMgr.startSession(u.id, 0, 0, false, '');
      App.reloadCurrent();
      return;
    }
    const isAR = T.isRTL();
    const lastSession = SessionMgr.getLastClosedSession(u.id);
    const prevMonnaie = lastSession?.closedMonnaie || 0;
    const html = `
      <div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4);margin-bottom:6px">
          ${isAR ? 'صندوق الأمس (مرجع)' : "Monnaie d'hier (référence)"}
        </div>
        <div style="font-size:24px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(prevMonnaie)}</div>
        ${lastSession ? `<div style="font-size:11px;color:var(--text4);margin-top:4px">${lastSession.date}</div>` : ''}
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label>${isAR ? 'الصندوق الأولي (Monnaie en caisse)' : 'Fond de caisse initial (Monnaie)'}</label>
        <div style="position:relative">
          <input type="number" id="startMonnaieInput" class="form-control" step="0.01" min="0" value="${prevMonnaie.toFixed(2)}">
          <span style="position:absolute;top:50%;${isAR?'left:12px':'right:12px'};transform:translateY(-50%);color:var(--text-muted);font-weight:700">DA</span>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label style="font-weight:700;color:var(--primary)"><i class="fas fa-wallet"></i> ${isAR ? 'السيولة في اليد (Liquide)' : 'Liquide en main'}</label>
        <div style="position:relative">
          <input type="number" id="liquidStartInput" class="form-control" step="0.01" min="0" value="${prevMonnaie.toFixed(2)}"
            oninput="CaisseModule._checkLiquidDiscrepancy(${prevMonnaie})">
          <span style="position:absolute;top:50%;${isAR?'left:12px':'right:12px'};transform:translateY(-50%);color:var(--text-muted);font-weight:700">DA</span>
        </div>
      </div>
      <div id="liquidDiscrepancyWarn" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:16px"></i>
          <strong style="color:#ef4444;font-size:13px">${isAR ? 'فرق مع صندوق الأمس!' : "Écart avec le montant d'hier !"}</strong>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label style="color:#ef4444;font-size:12px">${isAR ? 'سبب الفرق (إجباري)' : "Motif de l'écart (obligatoire)"} *</label>
          <input type="text" id="discrepancyNote" placeholder="${isAR ? 'اشرح سبب الفرق...' : 'Expliquez la différence...'}" style="width:100%;border-color:rgba(239,68,68,.4)">
        </div>
      </div>
      <small style="color:var(--text4);display:block;margin-top:6px">${isAR ? 'أدخل المبالغ الموجودة معك في بداية اليوم' : 'Saisissez les montants en votre possession en début de journée'}</small>
    `;
    const footer = `
      <button class="btn btn-outline" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="CaisseModule._saveMorningSession()">${isAR ? 'بدء الجلسة' : 'Démarrer la session'}</button>
    `;
    UI.showModal(isAR ? 'فتح جلسة اليوم' : 'Ouverture de session', html, footer, 'md');
    setTimeout(() => document.getElementById('startMonnaieInput')?.focus(), 100);
  },

  _checkLiquidDiscrepancy(prevAmount) {
    const liquid = parseFloat(document.getElementById('liquidStartInput')?.value) || 0;
    const diff = Math.abs(liquid - prevAmount);
    const warnEl = document.getElementById('liquidDiscrepancyWarn');
    if (warnEl) warnEl.style.display = diff > 1 ? 'block' : 'none';
  },

  _saveMorningSession() {
    const u = Auth.getCurrentUser();
    if (!u) return;
    const monnaie = Number(document.getElementById('startMonnaieInput')?.value) || 0;
    const liquidStart = Number(document.getElementById('liquidStartInput')?.value) || 0;
    const lastSession = SessionMgr.getLastClosedSession(u.id);
    const prevMonnaie = lastSession?.closedMonnaie || 0;
    const diff = Math.abs(liquidStart - prevMonnaie);
    const hasDiscrepancy = diff > 1;
    const discrepancyNote = document.getElementById('discrepancyNote')?.value?.trim() || '';
    if (hasDiscrepancy && !discrepancyNote) {
      Utils.notify("Vous devez expliquer l'écart avec le montant d'hier", 'warning');
      document.getElementById('discrepancyNote')?.focus();
      return;
    }
    SessionMgr.startSession(u.id, monnaie, liquidStart, hasDiscrepancy, discrepancyNote);
    UI.closeModal();
    App.reloadCurrent();
  },

  showCloture(isEdit=false) {
    const u = Auth.getCurrentUser();
    const today = Utils.today();
    const deliveryTotal = SessionMgr.getDayDeliveryTotal(u.id, today);
    const brTotal = SessionMgr.getDayBRTotal(u.id, today);
    const session = SessionMgr.getTodaySession(u.id);
    const prevEspeces = session?.closedEspeces ?? deliveryTotal;
    const prevMonnaie = session?.closedMonnaie ?? (session?.startingMonnaie ?? 0);
    const todayDeliveries = DB.getAll('caisse_admin').filter(e => e.source==='bl_delivery' && e.userId===u.id && e.sessionDate===today);
    const isAR = T.isRTL();
    const sarf = session?.sarf || [];
    const sarfTotal = sarf.reduce((s,e) => s + (e.amount||0), 0);
    const liquidStart = session?.liquidStart || 0;
    const expectedLiquid = liquidStart - sarfTotal;
    const prevLiquidEnd = session?.liquidEnd ?? expectedLiquid;

    const sarfListHTML = sarf.length ? sarf.map(s => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:6px">
        <div style="font-size:16px">💸</div>
        <div style="flex:1">
          <div style="font-weight:700;color:#d97706">${Utils.fmtCurrency(s.amount)}</div>
          <div style="font-size:11px;color:var(--text4)">${Utils.escHTML(s.note||'')} — BL: ${Utils.escHTML(s.blRef||'?')}</div>
        </div>
        <div style="font-size:10px;color:var(--text4)">${s.at ? new Date(s.at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'}) : ''}</div>
      </div>`).join('') : `<div style="color:var(--text4);font-size:12px;text-align:center;padding:12px">Aucun صرف aujourd'hui</div>`;

    UI.showModal(`🌙 ${T.get('caisse_cloture')}`, `
    <!-- Reconciliation Summary -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--bg3);border-radius:10px;padding:12px;text-align:center;border-top:3px solid var(--primary)">
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.4px">BL Livrés</div>
        <div style="font-size:20px;font-weight:900;color:var(--primary);margin-top:4px">${Utils.fmtCurrency(deliveryTotal)}</div>
        <div style="font-size:10px;color:var(--text4)">${todayDeliveries.length} livraison(s)</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:12px;text-align:center;border-top:3px solid #f59e0b">
        <div style="font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:.4px">Total صرف</div>
        <div style="font-size:20px;font-weight:900;color:#f59e0b;margin-top:4px">${Utils.fmtCurrency(sarfTotal)}</div>
        <div style="font-size:10px;color:var(--text4)">${sarf.length} dépense(s)</div>
      </div>
    </div>

    <!-- Liquid Reconciliation -->
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:12px;padding:16px;color:#fff;margin-bottom:16px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px"><i class="fas fa-wallet"></i> ${isAR?'مقارنة السيولة':'Réconciliation Liquide'}</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:13px">
        <span style="opacity:.7">Liquide départ</span><span style="font-weight:700">${Utils.fmtCurrency(liquidStart)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:13px">
        <span style="opacity:.7">− Total صرف</span><span style="font-weight:700;color:#f59e0b">−${Utils.fmtCurrency(sarfTotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:15px;font-weight:900">
        <span>= Liquide attendu</span><span style="color:#4ade80">${Utils.fmtCurrency(expectedLiquid)}</span>
      </div>
    </div>

    <!-- صرف Details -->
    ${sarf.length > 0 ? `
    <details style="margin-bottom:16px">
      <summary style="cursor:pointer;font-weight:700;font-size:13px;color:var(--text);padding:6px 0">
        <i class="fas fa-list" style="color:#f59e0b"></i> Détail des صرف (${sarf.length})
      </summary>
      <div style="margin-top:8px">${sarfListHTML}</div>
    </details>` : ''}

    <div class="alert alert-info mb-2">
      <i class="fas fa-info-circle"></i>
      <strong>${T.get('caisse_expected')}:</strong> ${Utils.fmtCurrency(deliveryTotal)}
      (${todayDeliveries.length} BL livrés)
    </div>
    <div class="form-grid cols-2" style="margin-bottom:12px">
      <div class="form-group">
        <label class="required"><i class="fas fa-money-bill-wave"></i> ${T.get('caisse_especes')}</label>
        <input type="number" id="cloEspeces" value="${prevEspeces.toFixed(2)}" min="0" step="any"
          style="font-size:18px;font-weight:700;text-align:center"
          oninput="CaisseModule._updateEcartDisplay(${deliveryTotal})">
      </div>
      <div class="form-group">
        <label class="required"><i class="fas fa-coins"></i> ${T.get('caisse_monnaie')}</label>
        <input type="number" id="cloMonnaie" value="${prevMonnaie.toFixed(2)}" min="0" step="any"
          style="font-size:18px;font-weight:700;text-align:center">
      </div>
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <label class="required" style="color:#f59e0b"><i class="fas fa-wallet"></i> ${isAR?'السيولة المتبقية في اليد':'Liquide restant en main'}</label>
      <input type="number" id="cloLiquidEnd" value="${prevLiquidEnd.toFixed(2)}" min="0" step="any"
        style="font-size:18px;font-weight:700;text-align:center;border-color:#f59e0b"
        oninput="CaisseModule._updateLiquidEcart(${expectedLiquid})">
      <div id="liquidEcartDisplay" style="margin-top:6px;font-size:13px;font-weight:700"></div>
    </div>
    <div class="cloture-compare mb-2">
      <div class="compare-box expected">
        <div class="cb-label">${T.get('caisse_expected')}</div>
        <div class="cb-value">${Utils.fmtCurrency(deliveryTotal)}</div>
      </div>
      <div class="compare-box actual">
        <div class="cb-label">${T.get('caisse_ecart')} Caisse</div>
        <div class="cb-value" id="clotureEcartDisplay">—</div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
     <button class="btn btn-primary btn-lg" onclick="CaisseModule._saveCloture(${isEdit})">
       <i class="fas fa-door-closed"></i> ${isEdit?T.get('save'):T.get('caisse_cloture')}
     </button>`, 'lg');
    setTimeout(()=>{
      CaisseModule._updateEcartDisplay(deliveryTotal);
      CaisseModule._updateLiquidEcart(expectedLiquid);
    }, 100);
  },

  _updateLiquidEcart(expected) {
    const liquid = parseFloat(document.getElementById('cloLiquidEnd')?.value)||0;
    const ecart = liquid - expected;
    const el = document.getElementById('liquidEcartDisplay');
    if (el) {
      const color = Math.abs(ecart)<1?'#10b981':'#ef4444';
      el.innerHTML = `<span style="color:${color}">Écart liquide: ${ecart>=0?'+':''}${Utils.fmtCurrency(ecart)} ${Math.abs(ecart)<1?'✅':'⚠️'}</span>`;
    }
  },

  _updateEcartDisplay(expected) {
    const especes = parseFloat(document.getElementById('cloEspeces')?.value)||0;
    const ecart = especes - expected;
    const el = document.getElementById('clotureEcartDisplay');
    if (el) {
      el.textContent = (ecart>=0?'+':'') + Utils.fmtCurrency(ecart);
      el.className = `cb-value ${Math.abs(ecart)<1?'ecart-zero':ecart>0?'ecart-positive':'ecart-negative'}`;
    }
  },

  async _saveCloture(isEdit) {
    const especes = parseFloat(document.getElementById('cloEspeces')?.value)||0;
    const monnaie = parseFloat(document.getElementById('cloMonnaie')?.value)||0;
    const liquidEnd = parseFloat(document.getElementById('cloLiquidEnd')?.value)||0;
    const u = Auth.getCurrentUser();
    const session = SessionMgr.getTodaySession(u.id);
    const expectedLiquid = (session?.liquidStart||0) - (session?.sarfTotal||0);
    const liquidEcart = liquidEnd - expectedLiquid;
    const ok = await Dialog.confirm(T.isRTL() ? 'إغلاق اليوم' : 'Clôture', `Confirmer la clôture ?\n${T.get('caisse_especes')}: ${Utils.fmtCurrency(especes)}\n${T.get('caisse_monnaie')}: ${Utils.fmtCurrency(monnaie)}\nLiquide: ${Utils.fmtCurrency(liquidEnd)}`, 'warning');
    if (!ok) return;
    // Save liquid data to session
    if (session) {
      DB.update('sessions', session.id, { liquidEnd, liquidEcart });
    }
    if (isEdit) {
      SessionMgr.updateCloture(u.id, especes, monnaie);
      Utils.notify((T.isRTL()?'تم تحديث الإغلاق':'Clôture mise à jour'), 'success');
    } else {
      SessionMgr.closeSession(u.id, especes, monnaie);
      Utils.notify((T.isRTL()?'تم إغلاق اليوم!':'Journée clôturée !'), 'success');
    }
    UI.closeModal();
    App.loadModule('caisse');
  },

  /* ─── User self-history ─────────────────────────────────────── */
  _renderUserHistory(u) {
    if (!this._filters) {
      const d = new Date(); d.setDate(d.getDate() - 7);
      this._filters = { dateFrom: d.toISOString().slice(0,10), dateTo: Utils.today() };
    }
    const { dateFrom, dateTo } = this._filters;
    const isAR = T.isRTL();

    let allSessions = DB.getAll('sessions').filter(s => s.userId===u.id);
    if (dateFrom) allSessions = allSessions.filter(s => s.date >= dateFrom);
    if (dateTo) allSessions = allSessions.filter(s => s.date <= dateTo);
    allSessions.sort((a,b)=>b.date.localeCompare(a.date));

    let allBRs = DB.getAll('brs').filter(b => b.createdBy===u.id);
    let filteredBRs = allBRs;
    if (dateFrom) filteredBRs = filteredBRs.filter(b => (b.date||'').slice(0,10) >= dateFrom);
    if (dateTo) filteredBRs = filteredBRs.filter(b => (b.date||'').slice(0,10) <= dateTo);

    const allLogs = DB.getAll('work_log').filter(l => l.userId===u.id);
    let allAdminCA = DB.getAll('caisse_admin').filter(t => t.userId===u.id);
    if (dateFrom) allAdminCA = allAdminCA.filter(t => (t.createdAt||'').slice(0,10) >= dateFrom);
    if (dateTo) allAdminCA = allAdminCA.filter(t => (t.createdAt||'').slice(0,10) <= dateTo);
    const suppliers = {}; DB.getAll('suppliers').forEach(s=>suppliers[s.id]=s);

    const totalEcart = allSessions.filter(s=>s.status==='closed').reduce((t,s)=>t+Math.abs(s.ecart||0),0);
    const totalBRTTC = filteredBRs.reduce((t,b)=>t+(Number(b.totalTTC)||0),0);
    const closedCount = allSessions.filter(s=>s.status==='closed').length;
    const totalDeposited = allAdminCA.filter(t=>t.type==='deposit').reduce((t,tx)=>t+(Number(tx.amount)||0),0);

    if (!allSessions.length) return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-top:20px;overflow:hidden">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-history" style="color:var(--primary)"></i>
        <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'سجل التاريخ':'Mon Historique'}</h3>
      </div>
      <div style="padding:40px;text-align:center;color:var(--text-muted)">
        <i class="fas fa-calendar-times" style="font-size:32px;opacity:.3;display:block;margin-bottom:10px"></i>
        <p>${T.get('no_data')}</p>
      </div>
    </div>`;

    const fmtT = ts => { if(!ts) return '—'; const d=new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };

    const rows = allSessions.slice(0,60).map((session,si) => {
      const dayBRs = allBRs.filter(b => (b.date||'').slice(0,10)===session.date);
      const brTotal = dayBRs.reduce((t,b)=>t+(Number(b.totalTTC)||0),0);
      const dayLog = allLogs.find(l=>l.date===session.date);
      const ecart = session.ecart||0;
      const ecColor = Math.abs(ecart)<0.01?'var(--success)':ecart>0?'var(--warning)':'var(--danger)';
      const isClosed = session.status==='closed';
      const dayDeposited = allAdminCA.filter(t=>t.type==='deposit'&&t.userId===u.id&&(t.createdAt||'').slice(0,10)===session.date).reduce((t,tx)=>t+(Number(tx.amount)||0),0);

      let durStr = '';
      if (dayLog?.loginTime && dayLog?.logoutTime) {
        const m = Math.round((new Date(dayLog.logoutTime)-new Date(dayLog.loginTime))/60000);
        durStr = Math.floor(m/60)+'h'+String(m%60).padStart(2,'0');
      }

      // Main row (clickable to expand)
      const mainRow = '<tr style="cursor:pointer;border-bottom:1px solid var(--border);'+(si%2?'background:var(--bg-inset)':'')+'" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\'none\'">'
        + '<td style="padding:12px 14px"><strong style="color:var(--text)">'+Utils.fmtDate(session.date)+'</strong>'
        + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">'
        + '<i class="fas fa-sign-in-alt" style="color:var(--success);font-size:9px"></i> '+fmtT(dayLog?.loginTime)
        + ' → '
        + '<i class="fas fa-sign-out-alt" style="color:var(--danger);font-size:9px"></i> '+(isClosed&&dayLog?.logoutTime?fmtT(dayLog.logoutTime):'<span style="color:var(--warning)">...</span>')
        + (durStr?' · <strong>'+durStr+'</strong>':'')
        + '</div></td>'
        + '<td style="padding:12px 14px;text-align:center"><strong style="font-size:16px;color:var(--primary)">'+dayBRs.length+'</strong><div style="font-size:9px;color:var(--text-muted)">'+(isAR?'وصل':'BR')+'</div></td>'
        + '<td style="padding:12px 14px;text-align:right"><strong style="font-size:14px;color:var(--text)">'+Utils.fmtCurrency(brTotal)+'</strong></td>'
        + '<td style="padding:12px 14px;text-align:center">'
        + (isClosed
          ? '<span style="font-weight:800;font-size:14px;color:'+ecColor+'">'+(ecart>=0?'+':'')+Utils.fmtCurrency(ecart)+'</span>'
          : '<span class="badge badge-warning" style="font-size:10px"><i class="fas fa-clock"></i> '+(isAR?'مفتوح':'Ouverte')+'</span>')
        + '</td>'
        + '<td style="padding:12px 14px;text-align:right">'
        + (dayDeposited>0
          ? '<strong style="color:var(--success);font-size:13px">'+Utils.fmtCurrency(dayDeposited)+'</strong>'
          : '<span style="color:var(--text-muted)">—</span>')
        + '</td>'
        + '<td style="padding:12px 14px;text-align:center;width:30px"><i class="fas fa-chevron-down" style="color:var(--text-muted);font-size:10px;transition:.2s"></i></td>'
        + '</tr>';

      // Expandable detail row
      let detailContent = '';
      if (dayBRs.length) {
        const thS = 'padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted);border-bottom:2px solid var(--border)';
        detailContent += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">'
          + '<thead><tr>'
          + '<th style="'+thS+';text-align:left">'+(isAR?'المرجع':'Réf.')+'</th>'
          + '<th style="'+thS+';text-align:left">'+(isAR?'المورد':'Fournisseur')+'</th>'
          + '<th style="'+thS+';text-align:right">HT</th>'
          + '<th style="'+thS+';text-align:right">'+(isAR?'طابع':'Timbre')+'</th>'
          + '<th style="'+thS+';text-align:right">TTC</th>'
          + '<th style="'+thS+';text-align:center">'+(isAR?'الحالة':'Statut')+'</th>'
          + '</tr></thead><tbody>';
        dayBRs.forEach((br,bi) => {
          detailContent += '<tr style="border-bottom:1px solid var(--border);'+(bi%2?'background:rgba(var(--primary-rgb),.02)':'')+'">'
            + '<td style="padding:7px 10px;font-weight:600;color:var(--primary)">'+Utils.escHTML(br.ref||'')+'</td>'
            + '<td style="padding:7px 10px;color:var(--text)">'+Utils.escHTML(suppliers[br.supplierId]?.name||'—')+'</td>'
            + '<td style="padding:7px 10px;text-align:right;color:var(--text)">'+Utils.fmtCurrency(br.totalHT)+'</td>'
            + '<td style="padding:7px 10px;text-align:right;color:var(--text-muted)">'+Utils.fmtCurrency(br.timbreAmount)+'</td>'
            + '<td style="padding:7px 10px;text-align:right;font-weight:700;color:var(--primary)">'+Utils.fmtCurrency(br.totalTTC)+'</td>'
            + '<td style="padding:7px 10px;text-align:center">'+Utils.statusBadge(br.status||'open')+'</td>'
            + '</tr>';
        });
        detailContent += '</tbody><tfoot><tr style="border-top:2px solid var(--border);background:var(--bg-inset)">'
          + '<td colspan="4" style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px">'+(isAR?'الإجمالي':'TOTAL')+'</td>'
          + '<td style="padding:8px 10px;text-align:right;font-weight:900;color:var(--primary);font-size:13px">'+Utils.fmtCurrency(brTotal)+'</td>'
          + '<td></td></tr></tfoot></table>';
      } else {
        detailContent += '<p style="color:var(--text-muted);font-size:12px;font-style:italic;margin:0">'+(isAR?'لا براسيل هذا اليوم':'Aucun BR créé ce jour.')+'</p>';
      }

      // Caisse detail grid (for closed sessions)
      if (isClosed) {
        const gS = 'background:var(--bg-inset);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center';
        const gL = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted);margin-bottom:4px';
        const gV = 'font-size:16px;font-weight:800';
        detailContent += '<div style="margin-top:12px;padding:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px"><i class="fas fa-cash-register" style="color:var(--primary)"></i> '+(isAR?'تفاصيل الصندوق':'Détail caisse')+'</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px">'
          + '<div style="'+gS+';border-left:3px solid var(--primary)"><div style="'+gL+'">'+(isAR?'متوقع (BR)':'Attendu')+'</div><div style="'+gV+';color:var(--text)">'+Utils.fmtCurrency(brTotal)+'</div></div>'
          + '<div style="'+gS+';border-left:3px solid var(--success)"><div style="'+gL+'">'+(isAR?'مُصرَّح':'Déclaré')+'</div><div style="'+gV+';color:var(--success)">'+Utils.fmtCurrency(session.closedEspeces||0)+'</div></div>'
          + '<div style="'+gS+';border-left:3px solid var(--warning)"><div style="'+gL+'">'+(isAR?'صرف أولي':'Monnaie dép.')+'</div><div style="'+gV+';color:var(--warning)">'+Utils.fmtCurrency(session.startingMonnaie||0)+'</div></div>'
          + '<div style="'+gS+';border-left:3px solid var(--warning)"><div style="'+gL+'">'+(isAR?'صرف نهائي':'Monnaie fin.')+'</div><div style="'+gV+';color:var(--warning)">'+Utils.fmtCurrency(session.closedMonnaie||0)+'</div></div>'
          + '<div style="'+gS+';border-left:3px solid '+ecColor+'"><div style="'+gL+'">'+(isAR?'الفارق':'Écart')+'</div><div style="'+gV+';color:'+ecColor+'">'+(ecart>=0?'+':'')+Utils.fmtCurrency(ecart)+'</div></div>'
          + (dayDeposited>0?'<div style="'+gS+';border-left:3px solid var(--success)"><div style="'+gL+'">'+(isAR?'مسلّم للصندوق':'Versé caisse')+'</div><div style="'+gV+';color:var(--success)">'+Utils.fmtCurrency(dayDeposited)+'</div></div>':'')
          + '</div></div>';
      }

      const detailRow = '<tr style="display:none;background:var(--bg-card)"><td colspan="6" style="padding:16px 20px;border-bottom:2px solid var(--border)">'+detailContent+'</td></tr>';

      return mainRow + detailRow;
    }).join('');

    const thH = 'padding:12px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)';

    return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-top:20px;overflow:hidden;box-shadow:var(--shadow-sm)">
      <!-- Header with date filters -->
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <i class="fas fa-history" style="color:var(--primary);font-size:16px"></i>
          <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'سجل التاريخ والتتبع':'Mon Historique & Traçabilité'}</h3>
        </div>
        <div style="margin-${isAR?'right':'left'}:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <input type="date" value="${dateFrom}" onchange="CaisseModule._filters.dateFrom=this.value;App.loadModule('caisse')" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:11px;background:var(--bg-card);color:var(--text)">
          <span style="color:var(--text-muted);font-size:11px">→</span>
          <input type="date" value="${dateTo}" onchange="CaisseModule._filters.dateTo=this.value;App.loadModule('caisse')" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:11px;background:var(--bg-card);color:var(--text)">
        </div>
      </div>

      <!-- Summary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg-inset)">
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:900;color:var(--text)">${closedCount}</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted)">${isAR?'جلسات مغلقة':'Journées clôturées'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:900;color:var(--primary)">${allBRs.length}</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted)">${isAR?'إجمالي BR':'Total BR'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(totalBRTTC)}</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted)">${isAR?'إجمالي TTC':'Total TTC'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:900;color:${totalEcart>0?'var(--warning)':'var(--success)'}">${Utils.fmtCurrency(totalEcart)}</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted)">${isAR?'مجموع الفوارق':'Total Écarts'}</div>
        </div>
        ${totalDeposited>0?'<div style="text-align:center"><div style="font-size:16px;font-weight:900;color:var(--success)">'+Utils.fmtCurrency(totalDeposited)+'</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-muted)">'+(isAR?'مجموع ما سلمته':'Total versé caisse')+'</div></div>':''}
      </div>

      <!-- Table -->
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
              <th style="${thH};text-align:left">${isAR?'التاريخ':'Date'}</th>
              <th style="${thH};text-align:center">${isAR?'عدد BR':'BR'}</th>
              <th style="${thH};text-align:right">${isAR?'إجمالي TTC':'Total TTC'}</th>
              <th style="${thH};text-align:center">${isAR?'الفارق':'Écart'}</th>
              <th style="${thH};text-align:right">${isAR?'مسلّم للصندوق':'Versé Caisse'}</th>
              <th style="${thH};width:30px"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN CAISSE MODULE
// ═══════════════════════════════════════════════════════════════
const AdminCaisseModule = {
  _filterType: 'all',
  _adminTab: 'overview',  /* overview | deposits | withdrawals | reconciliation | users */
  _filters: { dateFrom:'', dateTo:'', userId:'all' },
  _charts: {},

  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> ${T.isRTL()?"الوصول مخصص للمسؤولين":"Accès réservé aux administrateurs"}</div></div>`;
    const isAR = T.isRTL();
    const tab = this._adminTab || 'overview';

    // ── Raw data (no filter applied to globals) ──
    const caAll = DB.getAll('caisse_admin').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const allDeposits   = caAll.filter(t=>t.type==='deposit');
    const allWithdrawals= caAll.filter(t=>t.type==='withdrawal');
    const deposits   = allDeposits.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const withdrawals= allWithdrawals.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const balance    = deposits - withdrawals;
    const allUsers   = DB.getAll('users');
    const users      = allUsers.filter(u=>u.role==='user');
    const sessions   = DB.getAll('sessions');
    // totalBR_expected is informational only (not added to balance)
    const allBRs     = DB.getAll('brs');
    const totalBR_expected = allBRs.filter(b=>b.status==='delivered'||b.status==='billed').reduce((t,b)=>t+(Number(b.totalTTC)||0),0);

    // ── Filtered data (for Deposits / Withdrawals tabs) ──
    const df = this._filters.dateFrom;
    const dt = this._filters.dateTo;
    const fu = this._filters.userId;
    let filteredCa = [...caAll];
    if (df) filteredCa = filteredCa.filter(t=>(t.createdAt||'').slice(0,10)>=df);
    if (dt) filteredCa = filteredCa.filter(t=>(t.createdAt||'').slice(0,10)<=dt);
    if (fu && fu!=='all') filteredCa = filteredCa.filter(t=>String(t.userId)===String(fu));
    const filteredDeps = filteredCa.filter(t=>t.type==='deposit');
    const filteredWits = filteredCa.filter(t=>t.type==='withdrawal');

    // ── KPIs ──
    const closedSessions = sessions.filter(s=>s.status==='closed');
    const zeroEcartPct = closedSessions.length>0 ? Math.round(closedSessions.filter(s=>Math.abs(s.ecart||0)<0.01).length/closedSessions.length*100) : 100;
    const globalEcart = closedSessions.reduce((t,s)=>t+Math.abs(s.ecart||0),0);
    const activeDays = new Set(caAll.map(t=>(t.createdAt||'').slice(0,10))).size;
    const avgDaily = activeDays>0 ? deposits/activeDays : 0;
    const autoDeposits = allDeposits.filter(t=>t.source==='user_cloture');
    const manualDeposits= allDeposits.filter(t=>t.source!=='user_cloture');
    const netFlowThisMonth = (()=>{
      const m=new Date(); m.setDate(1); const ms=m.toISOString().slice(0,10);
      const md=caAll.filter(t=>t.type==='deposit'&&(t.createdAt||'').slice(0,10)>=ms).reduce((s,t)=>s+(Number(t.amount)||0),0);
      const mw=caAll.filter(t=>t.type==='withdrawal'&&(t.createdAt||'').slice(0,10)>=ms).reduce((s,t)=>s+(Number(t.amount)||0),0);
      return md-mw;
    })();

    // ── Tab label builder ──
    const TABS = [
      {id:'overview',       icon:'fa-th-large',        label:isAR?'نظرة عامة':'Vue d\'ensemble'},
      {id:'deposits',       icon:'fa-arrow-alt-circle-down', label:isAR?'الإيداعات':'Dépôts',   accent:'#22c55e'},
      {id:'withdrawals',    icon:'fa-arrow-alt-circle-up',   label:isAR?'السحوبات':'Retraits', accent:'#ef4444'},
      {id:'sarf',           icon:'fa-coins',            label:isAR?'الصرف':'Suivi صرف',  accent:'#f59e0b'},
      {id:'reconciliation', icon:'fa-balance-scale',    label:isAR?'تسوية يومية':'Rapprochement'},
      {id:'sessions',       icon:'fa-calendar-check',   label:isAR?'جلسات الصندوق':'Sessions Caisse', accent:'#8b5cf6'},
      {id:'caissiers',      icon:'fa-users',            label:isAR?'الكشافون':'Caissiers'},
    ];

    // ── Vault banner (always visible) ──
    const vaultBanner = `
    <div class="vault-hero" style="margin-bottom:20px">
      <div class="vault-icon-wrap"><i class="fas fa-vault"></i></div>
      <div class="vault-info">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.6">${isAR?'الرصيد الإجمالي':'SOLDE TOTAL'}</div>
        <div class="vault-amount" style="font-size:40px;font-weight:900;color:#4ade80">${Utils.fmtCurrency(balance)}</div>
        <div style="opacity:.5;font-size:12px;margin-top:4px">
          ${isAR?'إجمالي الإيداعات':'Total dépôts'}: ${Utils.fmtCurrency(deposits)} &nbsp;·&nbsp; ${isAR?'إجمالي السحوبات':'Retraits'}: ${Utils.fmtCurrency(withdrawals)}
        </div>
        <div style="opacity:.4;font-size:11px;margin-top:2px">${isAR?'BR livrés (prévisionnel)':'BR livrés (prévisionnel)'}: ${Utils.fmtCurrency(totalBR_expected)}</div>
        <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
          <span style="font-size:12px;opacity:.7">↓ ${Utils.fmtCurrency(deposits)}</span>
          <span style="font-size:12px;opacity:.7">↑ ${Utils.fmtCurrency(withdrawals)}</span>
          <span style="font-size:12px;color:#4ade80;font-weight:700">${netFlowThisMonth>=0?'+':''}${Utils.fmtCurrency(netFlowThisMonth)} ${isAR?'هذا الشهر':'ce mois'}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-left:auto">
        <button class="btn btn-success" onclick="AdminCaisseModule.showDeposit()" style="white-space:nowrap">
          <i class="fas fa-arrow-down"></i> ${isAR?'+ إيداع':'+ Dépôt'}
        </button>
        <button class="btn btn-danger" onclick="AdminCaisseModule.showWithdrawal()" style="white-space:nowrap">
          <i class="fas fa-arrow-up"></i> ${isAR?'- سحب':'- Retrait'}
        </button>
      </div>
    </div>`;

    // ── KPI mini-cards row ──
    const kpiRow = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
      ${[
        {icon:'fa-receipt',       color:'#3b82f6', bg:'rgba(59,130,246,.12)', label:isAR?'إجمالي BR المتوقع':'BR Attendu',         val:Utils.fmtCurrency(totalBR_expected)},
        {icon:'fa-arrow-down',    color:'#22c55e', bg:'rgba(34,197,94,.12)',  label:isAR?'الإيداعات الكلية':'Total Dépôts',         val:Utils.fmtCurrency(deposits)},
        {icon:'fa-arrow-up',      color:'#ef4444', bg:'rgba(239,68,68,.12)', label:isAR?'السحوبات الكلية':'Total Retraits',         val:Utils.fmtCurrency(withdrawals)},
        {icon:'fa-balance-scale', color:'#f59e0b', bg:'rgba(245,158,11,.12)',label:isAR?'إجمالي الفوارق':'Total Écarts',            val:Utils.fmtCurrency(globalEcart)},
        {icon:'fa-check-circle',  color:'#10b981', bg:'rgba(16,185,129,.12)',label:isAR?'نسبة التوازن':'Équilibre',                 val:zeroEcartPct+'%'},
        {icon:'fa-chart-line',    color:'#8b5cf6', bg:'rgba(139,92,246,.12)',label:isAR?'متوسط يومي':'Moy/jour',                   val:Utils.fmtCurrency(avgDaily)},
        {icon:'fa-robot',         color:'#06b6d4', bg:'rgba(6,182,212,.12)', label:isAR?'إيداع تلقائي/يدوي':'Auto/Manuel',         val:autoDeposits.length+' / '+manualDeposits.length},
      ].map(k=>`
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden;transition:.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div style="position:absolute;top:0;right:0;width:48px;height:48px;background:${k.bg};border-radius:0 14px 0 100%"></div>
          <i class="fas ${k.icon}" style="color:${k.color};font-size:18px;margin-bottom:10px;display:block"></i>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text4);margin-bottom:4px">${k.label}</div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">${k.val}</div>
        </div>
      `).join('')}
    </div>`;

    // ── Filters bar (for Deposits / Withdrawals) ──
    const filtersBar = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding:14px;background:var(--bg2);border-radius:12px;border:1px solid var(--border);margin-bottom:16px">
      <div class="filter-group">
        <label>${isAR?'من تاريخ':'Du'}</label>
        <input type="date" value="${df||''}" onchange="AdminCaisseModule._filters.dateFrom=this.value;App.loadModule('admin_caisse')">
      </div>
      <div class="filter-group">
        <label>${isAR?'إلى تاريخ':'Au'}</label>
        <input type="date" value="${dt||''}" onchange="AdminCaisseModule._filters.dateTo=this.value;App.loadModule('admin_caisse')">
      </div>
      <div class="filter-group">
        <label>${isAR?'المستخدم':'Utilisateur'}</label>
        <select onchange="AdminCaisseModule._filters.userId=this.value;App.loadModule('admin_caisse')">
          <option value="all">${T.get('all')}</option>
          ${allUsers.map(u=>`<option value="${u.id}" ${String(fu)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-outline" onclick="AdminCaisseModule._filters={dateFrom:'',dateTo:'',userId:'all'};App.loadModule('admin_caisse')"><i class="fas fa-times"></i></button>
      <div style="margin-left:auto;display:flex;gap:8px">
        <span style="font-size:12px;color:var(--text3);align-self:center">
          ${isAR?'إجمالي مصفى:':'Filtré:'} <strong>${filteredCa.length}</strong> ${isAR?'معاملة':'opérations'}
        </span>
      </div>
    </div>`;

    // ── Transaction row renderer ──
    const txRow = (t, colorVar, sign) => `
    <tr onclick="AdminCaisseModule.showDetail(${t.id})" style="cursor:pointer">
      <td>
        <div style="font-size:12px;font-weight:700">${Utils.fmtDate(t.createdAt)}</div>
        <div style="font-size:11px;color:var(--text4)">${(Utils.fmtDateTime(t.createdAt)||'').split(' ')[1]||''}</div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${colorVar==='success'?'#22c55e':'#ef4444'},${colorVar==='success'?'#16a34a':'#dc2626'});display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#fff;font-size:10px;font-weight:800">${(t.userName||'?').charAt(0).toUpperCase()}</span>
          </div>
          <span style="font-weight:600;font-size:13px">${Utils.escHTML(t.userName||'—')}</span>
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="badge ${t.source==='user_cloture'?'badge-info':'badge-secondary'}" style="font-size:9px">${t.source==='user_cloture'?(isAR?'تلقائي':'Auto'):(isAR?'يدوي':'Manuel')}</span>
          <span style="font-size:12px;color:var(--text2)">${Utils.escHTML(t.note||t.destination||t.source||'—')}</span>
        </div>
        ${t.bankRef?`<div style="font-size:10px;color:var(--text4);margin-top:2px"><i class="fas fa-hashtag" style="font-size:8px"></i> ${Utils.escHTML(t.bankRef)}</div>`:''}
      </td>
      <td style="text-align:right">
        <div style="font-size:16px;font-weight:900;color:var(--${colorVar})">${sign}${Utils.fmtCurrency(t.amount)}</div>
      </td>
      <td>
        <button onclick="event.stopPropagation();PDFGen.exportDecharge(${t.id})" class="btn btn-xs btn-outline" style="color:var(--${colorVar});border-color:var(--${colorVar})" title="PDF">
          <i class="fas fa-file-pdf"></i>
        </button>
      </td>
    </tr>`;

    // ── OVERVIEW TAB ──
    const tabOverview = `
    ${kpiRow}
    <div class="card mb-2" style="overflow:hidden">
      <div class="card-header"><h3><i class="fas fa-chart-area" style="color:var(--primary)"></i> ${isAR?'تطور الصندوق':'Évolution du coffre'}</h3></div>
      <div class="card-body" style="padding:16px"><canvas id="chart-vault-evolution" style="max-height:220px"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card" style="overflow:hidden">
        <div class="card-header" style="background:linear-gradient(135deg,rgba(34,197,94,.1),transparent);border-bottom:2px solid rgba(34,197,94,.2)">
          <h3 style="color:var(--success)"><i class="fas fa-arrow-down"></i> ${isAR?'آخر الإيداعات':'Derniers dépôts'}</h3>
          <div class="card-actions">
            <span class="badge badge-success">${allDeposits.length}</span>
            <button class="btn btn-outline btn-sm" onclick="AdminCaisseModule._adminTab='deposits';App.loadModule('admin_caisse')" style="font-size:11px">${isAR?'عرض الكل':'Voir tout'}</button>
          </div>
        </div>
        <div style="padding:8px">
          ${allDeposits.slice(0,5).map(t=>`
          <div onclick="AdminCaisseModule.showDetail(${t.id})" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin-bottom:4px;border-radius:10px;border:1px solid rgba(34,197,94,.1);background:rgba(34,197,94,.02);transition:.15s" onmouseover="this.style.background='rgba(34,197,94,.07)'" onmouseout="this.style.background='rgba(34,197,94,.02)'">
            <div>
              <div style="font-weight:600;font-size:12px">${Utils.escHTML(t.note||t.source||'—')}</div>
              <div style="font-size:10px;color:var(--text4)">${Utils.fmtDateTime(t.createdAt)} · ${Utils.escHTML(t.userName||'')}</div>
            </div>
            <div style="font-weight:800;color:var(--success);font-size:14px">+${Utils.fmtCurrency(t.amount)}</div>
          </div>`).join('')}
          ${!allDeposits.length?`<div style="text-align:center;padding:20px;color:var(--text4)"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:6px"></i>${isAR?'لا يوجد':'Aucun'}</div>`:''}
        </div>
        <div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--bg3);font-size:12px;display:flex;justify-content:space-between">
          <span style="color:var(--text3)">${isAR?'الإجمالي':'Total'}</span>
          <strong style="color:var(--success)">${Utils.fmtCurrency(deposits)}</strong>
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="card-header" style="background:linear-gradient(135deg,rgba(239,68,68,.1),transparent);border-bottom:2px solid rgba(239,68,68,.2)">
          <h3 style="color:var(--danger)"><i class="fas fa-arrow-up"></i> ${isAR?'آخر السحوبات':'Derniers retraits'}</h3>
          <div class="card-actions">
            <span class="badge badge-danger">${allWithdrawals.length}</span>
            <button class="btn btn-outline btn-sm" onclick="AdminCaisseModule._adminTab='withdrawals';App.loadModule('admin_caisse')" style="font-size:11px">${isAR?'عرض الكل':'Voir tout'}</button>
          </div>
        </div>
        <div style="padding:8px">
          ${allWithdrawals.slice(0,5).map(t=>`
          <div onclick="AdminCaisseModule.showDetail(${t.id})" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin-bottom:4px;border-radius:10px;border:1px solid rgba(239,68,68,.1);background:rgba(239,68,68,.02);transition:.15s" onmouseover="this.style.background='rgba(239,68,68,.07)'" onmouseout="this.style.background='rgba(239,68,68,.02)'">
            <div>
              <div style="font-weight:600;font-size:12px">${Utils.escHTML(t.note||t.destination||'—')}</div>
              <div style="font-size:10px;color:var(--text4)">${Utils.fmtDateTime(t.createdAt)} · ${Utils.escHTML(t.userName||'')}</div>
            </div>
            <div style="font-weight:800;color:var(--danger);font-size:14px">-${Utils.fmtCurrency(t.amount)}</div>
          </div>`).join('')}
          ${!allWithdrawals.length?`<div style="text-align:center;padding:20px;color:var(--text4)"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:6px"></i>${isAR?'لا يوجد':'Aucun'}</div>`:''}
        </div>
        <div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--bg3);font-size:12px;display:flex;justify-content:space-between">
          <span style="color:var(--text3)">${isAR?'الإجمالي':'Total'}</span>
          <strong style="color:var(--danger)">${Utils.fmtCurrency(withdrawals)}</strong>
        </div>
      </div>
    </div>`;

    // ── DEPOSITS FULL TABLE TAB ──
    const tabDeposits = `
    ${filtersBar}
    <div class="card" style="overflow:hidden">
      <div class="card-header" style="background:linear-gradient(135deg,rgba(34,197,94,.1),transparent);border-bottom:2px solid rgba(34,197,94,.2)">
        <h3 style="color:var(--success)"><i class="fas fa-arrow-alt-circle-down"></i> ${isAR?'سجل الإيداعات الكامل':'Historique complet des dépôts'}</h3>
        <div class="card-actions">
          <span class="badge badge-success">${filteredDeps.length}</span>
          <button class="btn btn-outline btn-sm" onclick="AdminCaisseModule.exportCaisseXLSX('deposit')" title="Excel"><i class="fas fa-file-excel" style="color:#1d6f42"></i> Excel</button>
          <button class="btn btn-success btn-sm" onclick="AdminCaisseModule.showDeposit()"><i class="fas fa-plus"></i> ${isAR?'إيداع جديد':'Nouveau'}</button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${isAR?'التاريخ والوقت':'Date & Heure'}</th>
            <th>${isAR?'المستخدم':'Utilisateur'}</th>
            <th>${isAR?'الموضوع / المصدر':'Motif / Source'}</th>
            <th style="text-align:right">${isAR?'المبلغ':'Montant'}</th>
            <th>PDF</th>
          </tr></thead>
          <tbody>
            ${filteredDeps.length ? filteredDeps.map(t=>txRow(t,'success','+')).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg3);display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text3);font-size:12px">${isAR?'إجمالي المعروض':'Total filtré'}</span>
        <strong style="color:var(--success);font-size:18px">${Utils.fmtCurrency(filteredDeps.reduce((s,t)=>s+(Number(t.amount)||0),0))}</strong>
      </div>
    </div>`;

    // ── WITHDRAWALS FULL TABLE TAB ──
    const tabWithdrawals = `
    ${filtersBar}
    <div class="card" style="overflow:hidden">
      <div class="card-header" style="background:linear-gradient(135deg,rgba(239,68,68,.1),transparent);border-bottom:2px solid rgba(239,68,68,.2)">
        <h3 style="color:var(--danger)"><i class="fas fa-arrow-alt-circle-up"></i> ${isAR?'سجل السحوبات الكامل':'Historique complet des retraits'}</h3>
        <div class="card-actions">
          <span class="badge badge-danger">${filteredWits.length}</span>
          <button class="btn btn-outline btn-sm" onclick="AdminCaisseModule.exportCaisseXLSX('withdrawal')" title="Excel"><i class="fas fa-file-excel" style="color:#1d6f42"></i> Excel</button>
          <button class="btn btn-danger btn-sm" onclick="AdminCaisseModule.showWithdrawal()"><i class="fas fa-plus"></i> ${isAR?'سحب جديد':'Nouveau'}</button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${isAR?'التاريخ والوقت':'Date & Heure'}</th>
            <th>${isAR?'المستخدم':'Utilisateur'}</th>
            <th>${isAR?'الوجهة / المرجع':'Destination / Réf'}</th>
            <th style="text-align:right">${isAR?'المبلغ':'Montant'}</th>
            <th>PDF</th>
          </tr></thead>
          <tbody>
            ${filteredWits.length ? filteredWits.map(t=>txRow(t,'danger','-')).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg3);display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text3);font-size:12px">${isAR?'إجمالي المعروض':'Total filtré'}</span>
        <strong style="color:var(--danger);font-size:18px">-${Utils.fmtCurrency(filteredWits.reduce((s,t)=>s+(Number(t.amount)||0),0))}</strong>
      </div>
    </div>`;

    // ── RECONCILIATION TAB ──
    const dateSet = new Set();
    sessions.forEach(s=>dateSet.add(s.date));
    caAll.forEach(t=>dateSet.add((t.createdAt||'').slice(0,10)));
    const sortedDates = [...dateSet].filter(Boolean).sort((a,b)=>b.localeCompare(a)).slice(0,90);
    const dailyRows = sortedDates.map(date=>{
      const daySessions = sessions.filter(s=>s.date===date&&s.status==='closed');
      const dayBRTotal  = allBRs.filter(b=>(b.date||'').slice(0,10)===date).reduce((t,b)=>t+(Number(b.totalTTC)||0),0);
      const dayDeps     = caAll.filter(t=>t.type==='deposit'&&(t.createdAt||'').slice(0,10)===date).reduce((t,x)=>t+(Number(x.amount)||0),0);
      const dayWits     = caAll.filter(t=>t.type==='withdrawal'&&(t.createdAt||'').slice(0,10)===date).reduce((t,x)=>t+(Number(x.amount)||0),0);
      const dayEcart    = daySessions.reduce((t,s)=>t+(s.ecart||0),0);
      const dayDiff     = dayDeps - dayBRTotal;
      const ecCls       = Math.abs(dayDiff)<1?'var(--success)':dayDiff>0?'var(--warning)':'var(--danger)';
      if (dayBRTotal===0&&dayDeps===0&&dayWits===0) return '';
      return `<tr>
        <td><strong>${Utils.fmtDate(date)}</strong></td>
        <td style="color:var(--primary);font-weight:700">${Utils.fmtCurrency(dayBRTotal)}</td>
        <td style="color:var(--success);font-weight:700">${Utils.fmtCurrency(dayDeps)}</td>
        <td style="color:var(--danger);font-weight:600">${dayWits>0?'-'+Utils.fmtCurrency(dayWits):'—'}</td>
        <td style="color:${ecCls};font-weight:800">${dayDiff>=0?'+':''}${Utils.fmtCurrency(dayDiff)}</td>
        <td style="color:${Math.abs(dayEcart)<0.01?'var(--success)':'var(--warning)'};font-weight:600">${dayEcart>=0?'+':''}${Utils.fmtCurrency(dayEcart)}</td>
        <td style="color:var(--text3)">${daySessions.length}</td>
      </tr>`;
    }).filter(Boolean).join('');

    const tabReconciliation = `
    <div class="card" style="overflow:hidden">
      <div class="card-header">
        <h3><i class="fas fa-calendar-check" style="color:var(--success)"></i> ${isAR?'التسوية اليومية':'Rapprochement journalier'}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${sortedDates.length} ${isAR?'يوم':'jours'}</span>
          <button class="btn btn-outline btn-sm" onclick="AdminCaisseModule.exportCaisseXLSX('reconciliation')" title="Excel"><i class="fas fa-file-excel" style="color:#1d6f42"></i> Excel</button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table" style="font-size:12px">
          <thead><tr>
            <th>${isAR?'التاريخ':'Date'}</th>
            <th>${isAR?'BR متوقع':'BR Attendu'}</th>
            <th>${isAR?'إيداعات':'Dépôts'}</th>
            <th>${isAR?'سحوبات':'Retraits'}</th>
            <th>${isAR?'فارق الإيداع':'Écart Dépôt'}</th>
            <th>${isAR?'فارق الصندوق':'Écart Caisse'}</th>
            <th>${isAR?'جلسات':'Sessions'}</th>
          </tr></thead>
          <tbody>${dailyRows||'<tr><td colspan="7" class="text-center text-muted">'+T.get('no_data')+'</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;

    // ── SESSIONS TAB ──
    const sessFilter = AdminCaisseModule._sessFilter || { userId:'all', dateFrom:'', dateTo:'' };
    let allSess = [...sessions].sort((a,b) => b.date.localeCompare(a.date));
    if (sessFilter.userId !== 'all') allSess = allSess.filter(s => String(s.userId) === String(sessFilter.userId));
    if (sessFilter.dateFrom) allSess = allSess.filter(s => s.date >= sessFilter.dateFrom);
    if (sessFilter.dateTo) allSess = allSess.filter(s => s.date <= sessFilter.dateTo);

    const sessRows = allSess.map(s => {
      const u = allUsers.find(x => x.id === s.userId);
      const brTotal = DB.getAll('brs').filter(b => b.createdBy === s.userId && (b.date||'').slice(0,10) === s.date).reduce((t,b) => t + (Number(b.totalTTC)||0), 0);
      const ecColor = s.status === 'closed' ? (Math.abs(s.ecart||0) < 0.01 ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)';
      const ecSign = (s.ecart||0) >= 0 ? '+' : '';
      return `<tr>
        <td style="font-weight:600">${Utils.fmtDate(s.date)}</td>
        <td>${Utils.escHTML(u?.name||'-')}</td>
        <td>${Utils.fmtCurrency(s.startingMonnaie||0)}</td>
        <td>${Utils.fmtCurrency(brTotal)}</td>
        <td>${s.status==='closed' ? Utils.fmtCurrency(s.closedEspeces||0) : '<span class="badge badge-warning">En cours</span>'}</td>
        <td>${s.status==='closed' ? Utils.fmtCurrency(s.closedMonnaie||0) : '-'}</td>
        <td style="color:${ecColor};font-weight:700">${s.status==='closed' ? ecSign+Utils.fmtCurrency(s.ecart||0) : '-'}</td>
        <td><span class="badge ${s.status==='closed'?'badge-success':'badge-warning'}">${s.status==='closed'?(isAR?'مغلقة':'Clôturée'):(isAR?'مفتوحة':'En cours')}</span></td>
        <td>${s.status==='closed' ? `<button class="btn btn-outline btn-sm" onclick="AdminCaisseModule.showRectifySession(${s.id})" title="${isAR?'تصحيح':'Rectifier'}"><i class="fas fa-edit"></i></button>` : ''}</td>
      </tr>`;
    }).join('');

    const tabSessions = `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-calendar-check" style="color:#8b5cf6"></i> ${isAR?'جميع جلسات الصندوق':'Toutes les Sessions Caisse'}</h3>
        <span class="badge badge-secondary">${allSess.length}</span>
      </div>
      <div class="filters-bar" style="flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div class="filter-group">
          <label>${isAR?'المستخدم':'Utilisateur'}</label>
          <select onchange="AdminCaisseModule._sessFilter=AdminCaisseModule._sessFilter||{};AdminCaisseModule._sessFilter.userId=this.value;App.loadModule('admin_caisse')">
            <option value="all">${T.get('all')}</option>
            ${allUsers.filter(u=>u.role!=='admin').map(u=>`<option value="${u.id}" ${String(sessFilter.userId)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${isAR?'من':'Du'}</label>
          <input type="date" value="${sessFilter.dateFrom||''}" onchange="AdminCaisseModule._sessFilter=AdminCaisseModule._sessFilter||{};AdminCaisseModule._sessFilter.dateFrom=this.value;App.loadModule('admin_caisse')">
        </div>
        <div class="filter-group">
          <label>${isAR?'إلى':'Au'}</label>
          <input type="date" value="${sessFilter.dateTo||''}" onchange="AdminCaisseModule._sessFilter=AdminCaisseModule._sessFilter||{};AdminCaisseModule._sessFilter.dateTo=this.value;App.loadModule('admin_caisse')">
        </div>
        <div class="filter-group" style="align-self:flex-end">
          <button class="btn btn-outline" onclick="AdminCaisseModule._sessFilter={userId:'all',dateFrom:'',dateTo:''};App.loadModule('admin_caisse')"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${isAR?'التاريخ':'Date'}</th>
            <th>${isAR?'المستخدم':'Utilisateur'}</th>
            <th>${isAR?'رصيد أولي':'Monnaie init.'}</th>
            <th>${isAR?'إجمالي BR':'Total BR'}</th>
            <th>${isAR?'نقد مُصرَّح':'Espèces décl.'}</th>
            <th>${isAR?'صرف نهائي':'Monnaie fin.'}</th>
            <th>${isAR?'الفارق':'Écart'}</th>
            <th>${isAR?'الحالة':'Statut'}</th>
            <th></th>
          </tr></thead>
          <tbody>${sessRows || `<tr><td colspan="9" class="text-center text-muted">${T.get('no_data')}</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

    // ── CAISSIERS TAB ──
    const userSummaryCards = users.map(u=>{
      const uSessions = sessions.filter(s=>s.userId===u.id&&s.status==='closed');
      const uBRs = allBRs.filter(b=>b.createdBy===u.id);
      const totalBRTTC = uBRs.reduce((t,b)=>t+(Number(b.totalTTC)||0),0);
      const totalDeposited = caAll.filter(t=>t.type==='deposit'&&t.source==='user_cloture'&&t.userId===u.id).reduce((t,x)=>t+(Number(x.amount)||0),0);
      const totalEcart = uSessions.reduce((t,s)=>t+Math.abs(s.ecart||0),0);
      const zeroEc = uSessions.filter(s=>Math.abs(s.ecart||0)<0.01).length;
      const ecPct = uSessions.length>0 ? Math.round(zeroEc/uSessions.length*100) : 100;
      const lastSess = sessions.filter(s=>s.userId===u.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
      const monnaie = lastSess?.closedMonnaie ?? lastSess?.startingMonnaie ?? 0;
      const ecColor = ecPct>=90?'#22c55e':ecPct>=70?'#f59e0b':'#ef4444';
      return `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:20px;transition:.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#38bdf8);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#fff;font-size:18px;font-weight:900">${(u.name||'?').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div style="font-weight:800;font-size:15px;color:var(--text)">${Utils.escHTML(u.name)}</div>
            <div style="font-size:11px;color:var(--text4)">${uSessions.length} session(s) · ${isAR?'آخر جلسة':'Dernière'}: ${Utils.fmtDate(lastSess?.date||'')}</div>
          </div>
          <div style="margin-left:auto;text-align:center">
            <div style="font-size:22px;font-weight:900;color:${ecColor}">${ecPct}%</div>
            <div style="font-size:10px;color:var(--text4)">${isAR?'توازن':'équilibre'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="text-align:center;background:var(--bg3);border-radius:10px;padding:10px">
            <div style="font-size:12px;color:var(--primary);font-weight:800">${Utils.fmtCurrency(totalBRTTC)}</div>
            <div style="font-size:9px;color:var(--text4);margin-top:2px">${isAR?'إجمالي BR':'Total BR'}</div>
          </div>
          <div style="text-align:center;background:var(--bg3);border-radius:10px;padding:10px">
            <div style="font-size:12px;color:var(--success);font-weight:800">${Utils.fmtCurrency(totalDeposited)}</div>
            <div style="font-size:9px;color:var(--text4);margin-top:2px">${isAR?'مسلّم':'Versé'}</div>
          </div>
          <div style="text-align:center;background:var(--bg3);border-radius:10px;padding:10px">
            <div style="font-size:12px;color:${totalEcart>0?'var(--warning)':'var(--success)'};font-weight:800">${Utils.fmtCurrency(totalEcart)}</div>
            <div style="font-size:9px;color:var(--text4);margin-top:2px">${isAR?'فوارق':'Écarts'}</div>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text4);margin-bottom:4px">
            <span>${isAR?'نسبة التوازن':'Taux d équilibre'}</span><span>${ecPct}%</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${ecPct}%;background:${ecColor};border-radius:3px;transition:width .5s"></div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border)">
          <span style="font-size:11px;color:var(--text4)">${isAR?'الصرف الحالي':'Monnaie en main'}</span>
          <span style="font-size:15px;font-weight:800;color:var(--warning)">${Utils.fmtCurrency(monnaie)}</span>
        </div>
      </div>`;
    }).join('');

    const tabCaissiers = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${userSummaryCards || `<div class="empty-state"><i class="fas fa-users"></i><h4>${T.get('no_data')}</h4></div>`}
    </div>`;

    // ── Tab: صرف Monitor ──────────────────────────────────────────
    const sarfDf = this._filters.dateFrom;
    const sarfDt = this._filters.dateTo;
    const allSessions2 = DB.getAll('sessions');
    // Collect all sarf entries from sessions
    const sarfEntries = [];
    allSessions2.forEach(sess => {
      (sess.sarf||[]).forEach(e => {
        if (sarfDf && e.at && e.at.slice(0,10) < sarfDf) return;
        if (sarfDt && e.at && e.at.slice(0,10) > sarfDt) return;
        const u = allUsers.find(x=>x.id===sess.userId);
        sarfEntries.push({...e, userName: u?.name||u?.username||'?', userId: sess.userId, sessionId: sess.id, src:'session'});
      });
    });
    // Also collect from caisse_admin source=sarf
    DB.getAll('caisse_admin').filter(e=>e.source==='sarf').forEach(e=>{
      if (sarfDf && e.sessionDate && e.sessionDate < sarfDf) return;
      if (sarfDt && e.sessionDate && e.sessionDate > sarfDt) return;
      const u = allUsers.find(x=>x.id===e.userId);
      sarfEntries.push({...e, userName: u?.name||u?.username||e.userName||'?', src:'caisse', at: e.createdAt||e.sessionDate});
    });
    sarfEntries.sort((a,b)=>(b.at||'').localeCompare(a.at||''));
    const sarfTotal = sarfEntries.reduce((s,e)=>s+(e.amount||0),0);
    // Group by user
    const sarfByUser = {};
    sarfEntries.forEach(e=>{
      if (!sarfByUser[e.userId]) sarfByUser[e.userId]={name:e.userName, entries:[], total:0};
      sarfByUser[e.userId].entries.push(e);
      sarfByUser[e.userId].total += (e.amount||0);
    });
    const tabSarf = `
    <div style="margin-bottom:20px">
      <!-- Filters -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px;background:var(--bg2);padding:14px 16px;border-radius:12px;border:1px solid var(--border)">
        <i class="fas fa-coins" style="color:#f59e0b;font-size:18px"></i>
        <strong style="color:var(--text);font-size:14px">Suivi صرف — Frais de livraison</strong>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="date" value="${sarfDf}" onchange="AdminCaisseModule._filters.dateFrom=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)">
          <span style="color:var(--text4)">→</span>
          <input type="date" value="${sarfDt}" onchange="AdminCaisseModule._filters.dateTo=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)">
          <select onchange="AdminCaisseModule._filters.userId=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)">
            <option value="all">Tous les utilisateurs</option>
            ${users.map(u=>`<option value="${u.id}" ${fu===String(u.id)?'selected':''}>${Utils.escHTML(u.name||u.username)}</option>`).join('')}
          </select>
          <button class="btn btn-outline" onclick="AdminCaisseModule._filters={dateFrom:'',dateTo:'',userId:'all'};App.loadModule('admin_caisse')" style="font-size:11px;padding:7px 12px"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <!-- Total KPI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        <div class="stat-card-v2">
          <div class="stat-icon-v2 orange"><i class="fas fa-coins"></i></div>
          <div class="stat-body-v2"><div class="stat-value-v2" style="font-size:18px">${Utils.fmtCurrency(sarfTotal)}</div><div class="stat-label-v2">Total صرف</div></div>
        </div>
        <div class="stat-card-v2">
          <div class="stat-icon-v2 purple"><i class="fas fa-receipt"></i></div>
          <div class="stat-body-v2"><div class="stat-value-v2">${sarfEntries.length}</div><div class="stat-label-v2">Entrées صرف</div></div>
        </div>
        <div class="stat-card-v2">
          <div class="stat-icon-v2 blue"><i class="fas fa-users"></i></div>
          <div class="stat-body-v2"><div class="stat-value-v2">${Object.keys(sarfByUser).length}</div><div class="stat-label-v2">Utilisateurs</div></div>
        </div>
        ${sarfEntries.length>0?`<div class="stat-card-v2"><div class="stat-icon-v2 green"><i class="fas fa-calculator"></i></div><div class="stat-body-v2"><div class="stat-value-v2" style="font-size:16px">${Utils.fmtCurrency(sarfTotal/sarfEntries.length)}</div><div class="stat-label-v2">Moy. / entrée</div></div></div>`:''}
      </div>
      <!-- Per-user breakdown -->
      ${Object.values(sarfByUser).sort((a,b)=>b.total-a.total).map(ug=>`
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px">
        <div style="padding:12px 16px;background:linear-gradient(135deg,rgba(245,158,11,.08),transparent);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px">${(ug.name||'?')[0].toUpperCase()}</div>
            <div style="font-weight:700;font-size:14px;color:var(--text)">${Utils.escHTML(ug.name)}</div>
          </div>
          <div style="font-size:20px;font-weight:900;color:#f59e0b">${Utils.fmtCurrency(ug.total)}</div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="border-bottom:1px solid var(--border);background:var(--bg3)">
              <th style="padding:8px 12px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Date</th>
              <th style="padding:8px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">BL Ref</th>
              <th style="padding:8px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Motif</th>
              <th style="padding:8px;text-align:right;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Montant</th>
              <th style="padding:8px;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Ajouté par</th>
            </tr></thead>
            <tbody>${ug.entries.map(e=>`
              <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
                <td style="padding:8px 12px;color:var(--text3)">${(e.at||e.sessionDate||'').slice(0,10)}</td>
                <td style="padding:8px;font-weight:600;color:var(--text)">${Utils.escHTML(e.blRef||'—')}</td>
                <td style="padding:8px;color:var(--text2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.escHTML(e.note||'')}</td>
                <td style="padding:8px;text-align:right;font-weight:800;color:#f59e0b">${Utils.fmtCurrency(e.amount)}</td>
                <td style="padding:8px;font-size:11px;color:var(--text4)">${Utils.escHTML(e.addedBy||'auto')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`).join('') || `<div class="empty-state"><i class="fas fa-coins" style="font-size:40px;color:var(--text4)"></i><p>Aucun صرف trouvé</p></div>`}
    </div>`;

    const tabContent = tab==='overview' ? tabOverview
      : tab==='deposits'       ? tabDeposits
      : tab==='withdrawals'    ? tabWithdrawals
      : tab==='sarf'           ? tabSarf
      : tab==='reconciliation' ? tabReconciliation
      : tab==='sessions'       ? tabSessions
      : tab==='caissiers'      ? tabCaissiers
      : tabOverview;

    return `<div style="padding:24px" ${isAR?'dir="rtl"':''}>
      ${vaultBanner}
      <!-- Tab nav -->
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px;background:var(--bg2);padding:5px;border-radius:14px;border:1px solid var(--border)">
        ${TABS.map(t=>`
        <button onclick="AdminCaisseModule._adminTab='${t.id}';App.loadModule('admin_caisse')"
          style="flex:1;min-width:90px;padding:8px 12px;border:none;border-radius:10px;cursor:pointer;font-size:11px;font-weight:700;transition:all .2s;text-align:center;
          background:${tab===t.id?'var(--primary)':'transparent'};
          color:${tab===t.id?'#fff':t.accent||'var(--text3)'};
          box-shadow:${tab===t.id?'0 2px 8px rgba(0,0,0,.2)':'none'}">
          <i class="fas ${t.icon}" style="display:block;font-size:14px;margin-bottom:3px"></i>
          ${t.label}
        </button>`).join('')}
      </div>
      <!-- Tab content -->
      ${tabContent}
    </div>`;
  },

  initCharts() {
    if (typeof Chart === 'undefined') return;
    Object.values(this._charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    this._charts = {};
    const ca = DB.getAll('caisse_admin').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    if (!ca.length) return;

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(148,163,184,0.15)';

    const dayMap = {};
    ca.forEach(t => {
      const d = (t.createdAt || '').slice(0, 10);
      if (!d) return;
      if (!dayMap[d]) dayMap[d] = { dep: 0, wit: 0 };
      if (t.type === 'deposit') dayMap[d].dep += Number(t.amount) || 0;
      else if (t.type === 'withdrawal') dayMap[d].wit += Number(t.amount) || 0;
    });

    const days = Object.keys(dayMap).sort();
    let bal = 0;
    const balances = days.map(d => {
      bal += dayMap[d].dep - dayMap[d].wit;
      return bal;
    });

    const depAmts = days.map(d => dayMap[d].dep);
    const witAmts = days.map(d => -dayMap[d].wit);

    const ctx = document.getElementById('chart-vault-evolution');
    if (ctx) {
      this._charts.vault = new Chart(ctx, {
        type: 'line',
        data: {
          labels: days.map(d => { const p=d.split('-'); return p[2]+'/'+p[1]; }),
          datasets: [
            { label: T.isRTL()?'\u0627\u0644\u0631\u0635\u064a\u062f':'Solde', data: balances, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2.5 },
            { label: T.isRTL()?'\u0625\u064a\u062f\u0627\u0639\u0627\u062a':'D\u00e9p\u00f4ts', data: depAmts, type: 'bar', backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 4 },
            { label: T.isRTL()?'\u0633\u062d\u0648\u0628\u0627\u062a':'Retraits', data: witAmts, type: 'bar', backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 4 },
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { grid: { color: gridColor }, ticks: { callback: v => (v/1000).toFixed(0)+'k' } },
            x: { grid: { display: false } }
          },
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => Utils.fmtCurrency(Math.abs(ctx.raw)) } } }
        }
      });
    }
  },


  exportCaisseXLSX(type) {
    const ca = DB.getAll('caisse_admin').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    const isAR = T.isRTL();
    let filtered = type ? ca.filter(t=>t.type===type) : ca;
    if (this._filters.dateFrom) filtered = filtered.filter(t=>(t.createdAt||'').slice(0,10)>=this._filters.dateFrom);
    if (this._filters.dateTo)   filtered = filtered.filter(t=>(t.createdAt||'').slice(0,10)<=this._filters.dateTo);
    if (this._filters.userId && this._filters.userId!=='all') filtered = filtered.filter(t=>String(t.userId)===String(this._filters.userId));
    const rows = filtered.map(t=>[
      Utils.fmtDate(t.createdAt)||'',
      t.type==='deposit'?(isAR?'إيداع':'Dépôt'):(isAR?'سحب':'Retrait'),
      Number(t.amount)||0,
      t.userName||'',
      t.note||t.source||'',
      t.destination||'',
      t.bankRef||'',
    ]);
    const filename = type==='deposit'?'Caisse_Depots':type==='withdrawal'?'Caisse_Retraits':'Caisse_Historique';
    if(typeof exportXLSX !== 'undefined') {
      exportXLSX(
        [isAR?'التاريخ':'Date', isAR?'النوع':'Type', isAR?'المبلغ':'Montant',
         isAR?'المستخدم':'Utilisateur', isAR?'ملاحظة':'Note',
         isAR?'الوجهة':'Destination', isAR?'مرجع':'Référence'],
        rows,
        filename + '_' + new Date().toISOString().slice(0,10)
      );
    } else {
      Utils.notify('SheetJS non chargé — rafraîchissez la page', 'warning');
    }
  },

  showDeposit() {
    UI.showModal(`<i class="fas fa-arrow-down" style="color:var(--success)"></i> ${T.get('adm_deposit')}`, `
    <div class="form-group mb-2">
      <label class="required">${T.get('amount')}</label>
      <input type="number" id="depAmount" min="0" step="any" placeholder="0.00"
        style="font-size:24px;font-weight:800;text-align:center">
    </div>
    <div class="form-group">
      <label>${T.get('note')}</label>
      <textarea id="depNote" rows="2" placeholder="${T.isRTL()?`سبب الإيداع...`:`Motif du dépôt...`}"></textarea>
    </div>`, `
    <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
    <button class="btn btn-success btn-lg" onclick="AdminCaisseModule._saveDeposit()">
      <i class="fas fa-arrow-down"></i> ${T.get('save')}
    </button>`, 'sm');
  },
  _saveDeposit() {
    if (!Auth.isAdmin()) { Utils.notify('⛔ Réservé à l\'admin','error'); return; }
    const amount = parseFloat(document.getElementById('depAmount')?.value) || 0;
    const note = (document.getElementById('depNote')?.value || '').trim();
    if (!amount || amount <= 0) {
      Utils.notify(T.isRTL() ? 'المبلغ غير صالح' : 'Montant invalide', 'error');
      return;
    }
    const u = Auth.getCurrentUser();
    DB.insert('caisse_admin', {
      type: 'deposit',
      source: 'admin_manual',
      userId: u.id,
      userName: u.name,
      amount,
      note
    });
    UI.closeModal();
    Utils.notify(T.isRTL() ? 'تم حفظ الإيداع' : 'Dépôt enregistré', 'success');
    App.reloadCurrent();
  },

  showWithdrawal() {
    const ca = DB.getAll('caisse_admin');
    const balance = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+t.amount,0) - ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+t.amount,0);
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    const bankOpts = `<option value="">-- Autre destination --</option>` + banks.map(b=>`<option value="${b.id}">${Utils.escHTML(b.name)} — ${Utils.escHTML(b.bankName||'')}</option>`).join('');
    UI.showModal(`<i class="fas fa-arrow-up" style="color:var(--danger)"></i> ${T.get('adm_withdrawal')}`, `
    <div class="alert alert-warning mb-2">
      <i class="fas fa-exclamation-triangle"></i>
      ${T.get('adm_immutable')}<br>
      <small>${T.get('adm_correction_note')}</small>
    </div>
    <div class="alert alert-info mb-2">
      <i class="fas fa-vault"></i> ${T.isRTL()?"الرصيد الحالي:":"Solde actuel:"} <strong>${Utils.fmtCurrency(balance)}</strong>
    </div>
    ${banks.length ? `
    <div class="form-group" style="margin-bottom:12px">
      <label style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;display:block">
        <i class="fas fa-university" style="color:var(--primary);margin-right:6px"></i>Compte bancaire destinataire
      </label>
      <select id="withBankId" style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:14px;font-weight:600;background:var(--bg3);color:var(--text)"
        onchange="(function(){ const bid=document.getElementById('withBankId').value; const s=DB.getSettings(); const bank=(s.banks||[]).find(b=>b.id===bid); const d=document.getElementById('withDest'); if(bank) d.value='Versement \u2192 '+bank.name+' ('+bank.bankName+')'; else if(d.value.indexOf('Versement')===0) d.value=''; })()"
      >${bankOpts}</select>
    </div>` : ''}
    <div class="form-grid cols-2">
      <div class="form-group">
        <label class="required">${T.get('amount')}</label>
        <input type="number" id="withAmount" min="0" step="any" placeholder="0.00"
          style="font-size:20px;font-weight:800;text-align:center">
      </div>
      <div class="form-group">
        <label class="required">${T.get('adm_dest')}</label>
        <input type="text" id="withDest" placeholder="${T.isRTL()?`مثال: تحويل بنك BNA`:`Ex: Versement Banque BNA`}">
      </div>
      <div class="form-group">
        <label>${T.get('adm_bank_ref')}</label>
        <input type="text" id="withBankRef" placeholder="${T.isRTL()?`رقم الوصل / الشيك`:`N° bordereau / chèque`}">
      </div>
      <div class="form-group">
        <label>${T.get('note')}</label>
        <input type="text" id="withNote" placeholder="${T.isRTL()?`ملاحظات...`:`Observations...`}">
      </div>
    </div>`, `
    <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
    <button class="btn btn-danger btn-lg" onclick="AdminCaisseModule._saveWithdrawal()">
      <i class="fas fa-arrow-up"></i> ${T.get('confirm')} ${T.isRTL()?"سحب":"Retrait"}
    </button>`, 'md');
  },

  async _saveWithdrawal() {
    const amount = parseFloat(document.getElementById('withAmount')?.value)||0;
    const destination = (document.getElementById('withDest')?.value||'').trim();
    const bankRef = document.getElementById('withBankRef')?.value||'';
    const note = document.getElementById('withNote')?.value||'';
    const bankId = document.getElementById('withBankId')?.value||'';
    if (!amount||amount<=0) { Utils.notify((T.isRTL()?'المبلغ غير صالح':'Montant invalide'), 'error'); return; }
    if (!destination) { Utils.notify(T.get('adm_dest')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const ok = await Utils.confirm2(
      T.get('adm_confirm1'),
      T.get('adm_confirm2') + '\n\nMontant: ' + Utils.fmtCurrency(amount) + '\nDestination: ' + destination
    );
    if (!ok) return;
    // ── STRICT BALANCE CHECK — NEVER allow caisse to go negative ──
    const caisseBalance = DB.getAll('caisse_admin').reduce((s,t) => t.type==='deposit' ? s+t.amount : s-t.amount, 0);
    if (amount > caisseBalance) {
      Utils.notify(`⛔ Solde caisse insuffisant ! Disponible: ${Utils.fmtCurrency(Math.max(0,caisseBalance))}`, 'danger');
      return;
    }
    const u = Auth.getCurrentUser();
    const src = bankId ? 'bank_transfer' : 'admin_withdrawal';
    const tx = DB.insert('caisse_admin', { type:'withdrawal', source: src, userId:u.id, userName:u.name, amount, destination, bankRef, note, bankId: bankId||null });
    // If a specific bank was selected → auto-credit that bank account
    if (bankId) {
      const s2 = DB.getSettings();
      const bank = (s2.banks||[]).find(b=>b.id===bankId);
      DB.insert('bank_transactions', {
        bankId, type:'deposit', amount,
        note: `Versement depuis caisse${note?' — '+note:''}`,
        date: Utils.today(), by: u?.id, caisseRef: tx?.id
      });
      Utils.notify(`✅ ${Utils.fmtCurrency(amount)} versé vers ${bank?.name||'banque'} — les deux registres mis à jour`, 'success', 5000);
    } else {
      Utils.notify((T.isRTL()?'تم حفظ السحب':'Retrait enregistré'), 'success');
    }
    UI.closeModal();
    App.loadModule('admin_caisse');
    if (tx) setTimeout(()=>PDFGen.exportDecharge(tx.id), 400);
  },


  showDetail(id) {
    const t = DB.getById('caisse_admin', id);
    if (!t) return;
    const body = `<table class="detail-table">
      <tr><th>Type</th><td><span class="badge ${t.type==='deposit'?'badge-success':'badge-danger'}">${t.type==='deposit'?T.get('adm_deposit'):T.get('adm_withdrawal')}</span></td></tr>
      <tr><th>${T.get('amount')}</th><td class="${t.type==='deposit'?'text-success':'text-danger'} fw-bold" style="font-size:18px">${t.type==='deposit'?'+':'-'}${Utils.fmtCurrency(t.amount)}</td></tr>
      <tr><th>${T.get('col_date')}</th><td>${Utils.fmtDateTime(t.createdAt)}</td></tr>
      <tr><th>${T.get('col_by')}</th><td>${Utils.escHTML(t.userName||'-')}</td></tr>
      ${t.destination?`<tr><th>${T.get('adm_dest')}</th><td>${Utils.escHTML(t.destination)}</td></tr>`:''}
      ${t.bankRef?`<tr><th>${T.get('adm_bank_ref')}</th><td>${Utils.escHTML(t.bankRef)}</td></tr>`:''}
      ${t.note?`<tr><th>${T.get('note')}</th><td>${Utils.escHTML(t.note)}</td></tr>`:''}
    </table>`;
    const footer = `
      <button class="btn btn-outline" onclick="PDFGen.exportDecharge(${id})"><i class="fas fa-file-pdf"></i> ${T.isRTL()?'وصل PDF':'Décharge PDF'}</button>
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('close')}</button>`;
    UI.showModal(`<i class="fas fa-info-circle"></i> ${T.isRTL()?"تفاصيل العملية":"Détails transaction"}`, body, footer, 'md');
  },

  /* ── Admin Rectify Session (with cascade preview) ── */
  showRectifySession(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session || session.status !== 'closed') { Utils.notify('Session introuvable ou non clôturée', 'error'); return; }
    const isAR = T.isRTL();
    const user = DB.getById('users', session.userId);
    const brTotal = SessionMgr.getDayDeliveryTotal(session.userId, session.date);

    // Find all FUTURE sessions for this user (cascade chain)
    const futureSessions = DB.getAll('sessions')
      .filter(s => s.userId === session.userId && s.date > session.date && s.status === 'closed')
      .sort((a,b) => a.date.localeCompare(b.date));

    const cascadePreview = futureSessions.length ? `
      <div class="alert alert-warning" style="margin-top:16px">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>${isAR ? 'تنبيه — تعديل متتالي' : 'Attention — Modification en cascade'}</strong><br>
        ${isAR
          ? `تعديل هذه الجلسة سيؤثر على <strong>${futureSessions.length}</strong> جلسة(ات) لاحقة لهذا المستخدم.`
          : `La modification de cette session affectera <strong>${futureSessions.length}</strong> session(s) suivante(s) de cet utilisateur.`}
      </div>
      <div style="max-height:150px;overflow-y:auto;margin-top:8px;border:1px solid var(--border);border-radius:8px;padding:8px">
        <table style="width:100%;font-size:11px">
          <tr style="color:var(--text4);font-weight:700"><td>Date</td><td>${isAR?'رصيد أولي':'Monnaie init.'}</td><td>${isAR?'سيتغير إلى':'Changera à'}</td></tr>
          <tbody id="rectify-cascade-preview">
            ${futureSessions.map(s => `<tr><td>${Utils.fmtDate(s.date)}</td><td>${Utils.fmtCurrency(s.startingMonnaie||0)}</td><td style="color:var(--warning)">⟶ ?</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : '';

    const body = `
    <div style="margin-bottom:16px;padding:14px;background:var(--bg-inset);border-radius:10px;border-left:4px solid #8b5cf6">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:800;color:var(--text)">${Utils.escHTML(user?.name||'-')}</span>
        <span style="font-size:12px;color:var(--text4)">${Utils.fmtDate(session.date)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div>${isAR?'إجمالي BR':'Total BR'}: <strong>${Utils.fmtCurrency(brTotal)}</strong></div>
        <div>${isAR?'الفارق الحالي':'Écart actuel'}: <strong style="color:${Math.abs(session.ecart||0)<0.01?'var(--success)':'var(--danger)'}">${Utils.fmtCurrency(session.ecart||0)}</strong></div>
      </div>
    </div>
    <div class="form-group">
      <label>${isAR?'المبلغ النقدي المصحح':'Espèces corrigées'}</label>
      <input type="number" id="rectify-especes" value="${session.closedEspeces||0}" step="0.01" min="0"
        oninput="AdminCaisseModule._previewCascade(${sessionId})">
    </div>
    <div class="form-group">
      <label>${isAR?'الصرف (Monnaie) المصحح':'Monnaie corrigée'}</label>
      <input type="number" id="rectify-monnaie" value="${session.closedMonnaie||0}" step="0.01" min="0"
        oninput="AdminCaisseModule._previewCascade(${sessionId})">
    </div>
    <div class="form-group">
      <label>${isAR?'سبب التصحيح':'Raison de la rectification'}</label>
      <input type="text" id="rectify-reason" placeholder="${isAR?'مثال: خطأ في العد':'Ex: Erreur de comptage'}" value="">
    </div>
    <div id="rectify-ecart-preview" style="padding:10px;background:var(--bg-inset);border-radius:8px;text-align:center;margin-top:8px">
      ${isAR?'الفارق الجديد':'Nouvel écart'}: <strong>${Utils.fmtCurrency((session.closedEspeces||0) - brTotal)}</strong>
    </div>
    ${cascadePreview}`;

    const footer = `
      <button class="btn btn-outline" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="AdminCaisseModule._applyRectification(${sessionId})">
        <i class="fas fa-check"></i> ${isAR?'تطبيق التصحيح':'Appliquer la rectification'}
      </button>`;

    UI.showModal(`<i class="fas fa-edit" style="color:#8b5cf6"></i> ${isAR?'تصحيح الجلسة':'Rectifier la session'}`, body, footer, 'md');
    setTimeout(() => this._previewCascade(sessionId), 100);
  },

  _previewCascade(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session) return;
    const newEspeces = Number(document.getElementById('rectify-especes')?.value) || 0;
    const newMonnaie = Number(document.getElementById('rectify-monnaie')?.value) || 0;
    const brTotal = SessionMgr.getDayDeliveryTotal(session.userId, session.date);
    const newEcart = newEspeces - brTotal;
    const isAR = T.isRTL();

    // Update écart preview
    const ecPrev = document.getElementById('rectify-ecart-preview');
    if (ecPrev) ecPrev.innerHTML = `${isAR?'الفارق الجديد':'Nouvel écart'}: <strong style="color:${Math.abs(newEcart)<0.01?'var(--success)':'var(--danger)'}">${Utils.fmtCurrency(newEcart)}</strong>`;

    // Update cascade preview
    const preview = document.getElementById('rectify-cascade-preview');
    if (preview) {
      const futureSessions = DB.getAll('sessions')
        .filter(s => s.userId === session.userId && s.date > session.date && s.status === 'closed')
        .sort((a,b) => a.date.localeCompare(b.date));

      let carryMonnaie = newMonnaie;
      preview.innerHTML = futureSessions.map(s => {
        const newStart = carryMonnaie;
        carryMonnaie = s.closedMonnaie || 0; // keep their closing monnaie unless we recalculate
        return `<tr>
          <td>${Utils.fmtDate(s.date)}</td>
          <td>${Utils.fmtCurrency(s.startingMonnaie||0)}</td>
          <td style="color:var(--warning);font-weight:700">⟶ ${Utils.fmtCurrency(newStart)}</td>
        </tr>`;
      }).join('');
    }
  },

  _applyRectification(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session) return;
    const newEspeces = Number(document.getElementById('rectify-especes')?.value) || 0;
    const newMonnaie = Number(document.getElementById('rectify-monnaie')?.value) || 0;
    const reason = (document.getElementById('rectify-reason')?.value || '').trim() || 'Rectification admin';
    const isAR = T.isRTL();

    const deliveryTotal = SessionMgr.getDayDeliveryTotal(session.userId, session.date);
    const newEcart = newEspeces - deliveryTotal;

    // 1. Update the target session
    DB.update('sessions', sessionId, {
      closedEspeces: newEspeces,
      closedMonnaie: newMonnaie,
      ecart: newEcart
    }, `[ADMIN RECTIF] ${reason}`);

    // 2. Update the corresponding caisse_admin deposit
    const caisseEntries = DB.getAll('caisse_admin');
    const dep = caisseEntries.find(e => e.sessionId === sessionId && e.source === 'user_cloture');
    if (dep) {
      DB.update('caisse_admin', dep.id, { amount: newEspeces }, `[ADMIN RECTIF] ${reason}`);
    }

    // 3. CASCADE: Update all future sessions' startingMonnaie
    const futureSessions = DB.getAll('sessions')
      .filter(s => s.userId === session.userId && s.date > session.date)
      .sort((a,b) => a.date.localeCompare(b.date));

    let carryMonnaie = newMonnaie;
    let cascadeCount = 0;
    for (const fs of futureSessions) {
      if (Math.abs((fs.startingMonnaie||0) - carryMonnaie) > 0.001) {
        DB.update('sessions', fs.id, { startingMonnaie: carryMonnaie }, `[CASCADE] ${reason}`);
        cascadeCount++;
      }
      // The carry for the NEXT session is this session's closedMonnaie (unchanged)
      carryMonnaie = fs.closedMonnaie ?? carryMonnaie;
    }

    UI.closeModal();
    const msg = isAR
      ? `✅ تم تصحيح الجلسة${cascadeCount > 0 ? ` + ${cascadeCount} جلسة(ات) لاحقة` : ''}`
      : `✅ Session rectifiée${cascadeCount > 0 ? ` + ${cascadeCount} session(s) en cascade` : ''}`;
    Utils.notify(msg, 'success', 4000);
    App.loadModule('admin_caisse');
  }
};

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS MODULE
// ═══════════════════════════════════════════════════════════════
const SuppliersModule = {
  render() {
    const items = DB.getAll('suppliers').sort((a,b)=>a.name.localeCompare(b.name));
    const brMap = {};
    DB.getAll('brs').forEach(b=>{ if(!brMap[b.supplierId]) brMap[b.supplierId]=0; brMap[b.supplierId]++; });
    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-building"></i> ${T.get('sup_title')}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${items.length}</span>
          <button class="btn btn-primary" onclick="SuppliersModule.showCreate()"><i class="fas fa-plus"></i> ${T.get('sup_new')}</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>${T.get('sup_name')}</th><th>${T.isRTL()?'اختصار':'Abrév.'}</th><th>${T.get('sup_phone')}</th><th>${T.isRTL()?'الولاية':'Wilaya'}</th><th>${T.get('sup_address')}</th><th>${T.get('sup_contact')}</th><th>${T.isRTL()?"عدد BR":"BR count"}</th><th>${T.get('col_actions')}</th></tr></thead>
          <tbody>
            ${items.length ? items.map(s=>`<tr>
              <td><strong>${Utils.escHTML(s.name)}</strong></td>
              <td>${Utils.escHTML(s.phone||'-')}</td>
              <td>${Utils.escHTML(s.address||'-')}</td>
              <td>${Utils.escHTML(s.contact||'-')}</td>
              <td><span class="badge badge-primary">${brMap[s.id]||0}</span></td>
              <td class="td-actions">
                <button class="btn btn-xs btn-primary" onclick="SuppliersModule.showSupplierDetail(${s.id})" title="Détails"><i class="fas fa-chart-line"></i></button>
                <button class="btn btn-xs btn-outline" onclick="SuppliersModule.showEdit(${s.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-xs btn-danger" onclick="SuppliersModule.deleteSup(${s.id})"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-building"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },

  _form(s={}) {
    const isAdmin = Auth.isAdmin();
    const addrs = s.deliveryAddresses || [];
    return `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px"><i class="fas fa-id-card"></i> ${T.isRTL()?'بيانات التعريف الرسمية':'Identification Officielle'}</div>
      <div class="form-grid cols-2">
        <div class="form-group span-full"><label class="required" style="font-weight:600">${T.get('sup_name')} / Raison Sociale</label><input id="sName" value="${Utils.escHTML(s.name||'')}" placeholder="${T.isRTL()?'اسم المورد أو الشركة...':'Nom ou raison sociale...'}" required></div>
        <div class="form-group"><label style="font-weight:700;color:var(--primary)">Abréviation <small style="color:var(--text4)">(code court BR/BL)</small></label><input id="sAbbrev" value="${Utils.escHTML(s.abbrev||'')}" placeholder="MAX 5 LETTRES" maxlength="5" style="font-family:monospace;font-weight:800;text-transform:uppercase;letter-spacing:2px" oninput="this.value=this.value.toUpperCase()"></div>
        <div class="form-group"><label style="font-weight:600">NIF</label><input id="sNif" value="${Utils.escHTML(s.nif||'')}" placeholder="000012345678900" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">NIS</label><input id="sNis" value="${Utils.escHTML(s.nis||'')}" placeholder="000012345678901" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">RC</label><input id="sRc" value="${Utils.escHTML(s.rc||'')}" placeholder="00/00-XXXXXXX"></div>
        <div class="form-group"><label style="font-weight:600">Art. Imposition (AI)</label><input id="sAi" value="${Utils.escHTML(s.ai||'')}" placeholder="00000000000000" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">${T.get('sup_phone')} / Fax</label><input id="sPhone" value="${Utils.escHTML(s.phone||'')}" placeholder="0X XX XX XX XX"></div>
        <div class="form-group"><label style="font-weight:600">Email</label><input id="sEmail" type="email" value="${Utils.escHTML(s.email||'')}" placeholder="contact@societe.dz"></div>
        <div class="form-group"><label style="font-weight:600">${T.isRTL()?'جهة الاتصال':'Contact / Représentant'}</label><input id="sContact" value="${Utils.escHTML(s.contact||'')}" placeholder="${T.isRTL()?'اسم جهة الاتصال':'Nom du contact'}"></div>
        <div class="form-group span-full"><label style="font-weight:600">${T.get('sup_address')} <small style="color:var(--text4)">(${T.isRTL()?'عنوان الشركة الرئيسي':'adresse du siège'})</small></label><input id="sAddress" value="${Utils.escHTML(s.address||'')}"></div>
      </div>
      ${_buildDeliveryAddrSection('sup', addrs, isAdmin)}
    </div>`;
  },

  showCreate() {
    UI.showModal(`<i class="fas fa-building"></i> ${T.get('sup_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="SuppliersModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
    setTimeout(() => FormGuide.start(['sName','sAbbrev','sNif','sRc','sPhone','sAddress']), 100);
  },
  showEdit(id) {
    const s = DB.getById('suppliers', id);
    if (!s) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')}`, this._form(s), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="SuppliersModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
    setTimeout(() => FormGuide.start(['sName','sAbbrev','sNif','sRc','sPhone','sAddress']), 100);
  },
  _save(id) {
    if (!Auth.isAdmin() && !Auth.can('canEditSuppliers')) { Utils.notify('⛔ Permission refusée','error'); return; }
    const name = (document.getElementById('sName')?.value||'').trim();
    if (!name) { Utils.notify(T.get('sup_name')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const data = {
      name,
      abbrev: (document.getElementById('sAbbrev')?.value||'').trim().toUpperCase().slice(0,5),
      nif: document.getElementById('sNif')?.value||'',
      nis: document.getElementById('sNis')?.value||'',
      rc:  document.getElementById('sRc')?.value||'',
      ai:  document.getElementById('sAi')?.value||'',
      deliveryAddresses: _collectDeliveryAddrs('sup'),
      phone: document.getElementById('sPhone')?.value||'',
      email: document.getElementById('sEmail')?.value||'',
      contact: document.getElementById('sContact')?.value||'',
      address: document.getElementById('sAddress')?.value||''
    };
    if (id) { DB.update('suppliers',id,data); Utils.notify((T.isRTL()?'تم تعديل المورد':'Fournisseur modifié'),'success'); }
    else { DB.insert('suppliers',data); Utils.notify((T.isRTL()?'تمت إضافة المورد':'Fournisseur ajouté'),'success'); }
    UI.closeModal(); App.loadModule('suppliers');
  },
  async deleteSup(id) {
    if (!Auth.isAdmin() && !Auth.can('canEditSuppliers')) { Utils.notify('⛔ Permission refusée','error'); return; }
    const hasBRs = DB.getAll('brs').some(b=>b.supplierId===id);
    if (hasBRs) { Utils.notify((T.isRTL()?'غير ممكن: هذا المورد لديه وصولات مرتبطة.':'Impossible: ce fournisseur a des BR liés.'),'error'); return; }
    const ok = await Dialog.confirm(T.isRTL() ? 'حذف المورد' : 'Supprimer fournisseur', T.get('delete')+'?', 'danger');
    if (!ok) return;
    DB.delete('suppliers',id); Utils.notify((T.isRTL()?'تم حذف المورد':'Fournisseur supprimé'),'success'); App.loadModule('suppliers');
  }
};

const ClientsModule = {
  render() {
    const items = DB.getAll('clients').sort((a,b)=>a.name.localeCompare(b.name));
    const brMap = {};
    DB.getAll('brs').forEach(b=>{ if(!brMap[b.supplierId]) brMap[b.supplierId]=0; brMap[b.supplierId]++; });
    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-building"></i> ${T.get('cli_title')}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${items.length}</span>
          <button class="btn btn-primary" onclick="ClientsModule.showCreate()"><i class="fas fa-plus"></i> ${T.get('cli_new')}</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>${T.get('cli_name')}</th><th>${T.get('cli_phone')}</th><th>${T.isRTL()?'الولاية':'Wilaya'}</th><th>${T.get('cli_address')}</th><th>${T.get('cli_contact')}</th><th>${T.isRTL()?"BL count":"BL count"}</th><th>${T.get('col_actions')}</th></tr></thead>
          <tbody>
            ${items.length ? items.map(s=>`<tr>
              <td><strong>${Utils.escHTML(s.name)}</strong></td>
              <td>${Utils.escHTML(s.phone||'-')}</td>
              <td><span style="font-size:11px;background:var(--bg2);padding:2px 8px;border-radius:12px;font-weight:600">${Utils.escHTML(s.wilaya||'-')}</span></td>
              <td>${Utils.escHTML(s.address||'-')}</td>
              <td>${Utils.escHTML(s.contact||'-')}</td>
              <td><span class="badge badge-primary">${DB.getAll('bls').filter(b=>String(b.clientId)===String(s.id)).length}</span></td>
              <td class="td-actions">
                <button class="btn btn-xs btn-primary" onclick="ClientsModule.showClientDetail(${s.id})" title="Détails"><i class="fas fa-chart-line"></i></button>
                <button class="btn btn-xs btn-outline" onclick="ClientsModule.showEdit(${s.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-xs btn-danger" onclick="ClientsModule.deleteCli(${s.id})"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-building"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },

  _form(s={}) {
    const isAdmin = Auth.isAdmin();
    const addrs = s.deliveryAddresses || [];
    return `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px"><i class="fas fa-id-card"></i> ${T.isRTL()?'بيانات التعريف الرسمية':'Identification Officielle'}</div>
      <div class="form-grid cols-2">
        <div class="form-group span-full"><label class="required" style="font-weight:600">${T.get('cli_name')} / Raison Sociale</label><input id="sName" value="${Utils.escHTML(s.name||'')}" placeholder="Nom ou raison sociale du client..." required></div>
        <div class="form-group"><label style="font-weight:600">NIF <small style="color:var(--text4)">(Numéro d'Identification Fiscale)</small></label><input id="sNif" value="${Utils.escHTML(s.nif||'')}" placeholder="000012345678900" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">NIS <small style="color:var(--text4)">(Identif. Statistique)</small></label><input id="sNis" value="${Utils.escHTML(s.nis||'')}" placeholder="000012345678901" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">RC <small style="color:var(--text4)">(Registre du Commerce)</small></label><input id="sRc" value="${Utils.escHTML(s.rc||'')}" placeholder="00/00-XXXXXXX"></div>
        <div class="form-group"><label style="font-weight:600">Art. Imposition (AI)</label><input id="sAi" value="${Utils.escHTML(s.ai||'')}" placeholder="00000000000000" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">${T.get('cli_phone')} / Fax</label><input id="sPhone" value="${Utils.escHTML(s.phone||'')}" placeholder="0X XX XX XX XX"></div>
        <div class="form-group"><label style="font-weight:600">Email</label><input id="sEmail" type="email" value="${Utils.escHTML(s.email||'')}" placeholder="contact@client.dz"></div>
        <div class="form-group"><label style="font-weight:600">Contact / Représentant</label><input id="sContact" value="${Utils.escHTML(s.contact||'')}" placeholder="Nom du contact"></div>
        <div class="form-group span-full"><label style="font-weight:600">${T.get('cli_address')} <small style="color:var(--text4)">(${T.isRTL()?'عنوان الشركة الرئيسي':'adresse du siège social'})</small></label><input id="sAddress" value="${Utils.escHTML(s.address||'')}"></div>
      </div>
      ${_buildDeliveryAddrSection('cli', addrs, isAdmin)}
    </div>`;
  },

  showCreate() {
    UI.showModal(`<i class="fas fa-building"></i> ${T.get('cli_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="ClientsModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
    setTimeout(() => FormGuide.start(['sName','sNif','sRc','sPhone','sAddress']), 100);
  },
  showEdit(id) {
    const s = DB.getById('clients', id);
    if (!s) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')}`, this._form(s), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="ClientsModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
    setTimeout(() => FormGuide.start(['sName','sNif','sRc','sPhone','sAddress']), 100);
  },
  _save(id) {
    if (!Auth.isAdmin() && !Auth.can('canEditClients')) { Utils.notify('⛔ Permission refusée','error'); return; }
    const name = (document.getElementById('sName')?.value||'').trim();
    if (!name) { Utils.notify(T.get('cli_name')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const data = {
      name,
      nif: document.getElementById('sNif')?.value||'',
      nis: document.getElementById('sNis')?.value||'',
      rc:  document.getElementById('sRc')?.value||'',
      ai:  document.getElementById('sAi')?.value||'',
      deliveryAddresses: _collectDeliveryAddrs('cli'),
      phone: document.getElementById('sPhone')?.value||'',
      email: document.getElementById('sEmail')?.value||'',
      contact: document.getElementById('sContact')?.value||'',
      address: document.getElementById('sAddress')?.value||''
    };
    if (id) { DB.update('clients',id,data); Utils.notify((T.isRTL()?'تم تعديل الزبون':'Client modifié'),'success'); }
    else { DB.insert('clients',data); Utils.notify((T.isRTL()?'تمت إضافة الزبون':'Client ajouté'),'success'); }
    UI.closeModal(); App.loadModule('clients');
  },
  async deleteCli(id) {
    if (!Auth.isAdmin() && !Auth.can('canEditClients')) { Utils.notify('⛔ Permission refusée','error'); return; }
    // Check BLs linked to this client (not BRs — clients are linked via BLs)
    const hasLinkedBLs = DB.getAll('bls').some(b => Number(b.clientId) === Number(id));
    if (hasLinkedBLs) { Utils.notify((T.isRTL()?'غير ممكن: هذا الزبون لديه وصولات تسليم مرتبطة.':'Impossible: ce client a des BL liés — supprimez-les d\'abord.'),'error'); return; }
    const ok = await Dialog.confirm(T.isRTL() ? 'حذف الزبون' : 'Supprimer client', T.get('delete')+'?', 'danger');
    if (!ok) return;
    DB.delete('clients',id); Utils.notify((T.isRTL()?'تم حذف الزبون':'Client supprimé'),'success'); App.loadModule('clients');
  }
};

// ═══════════════════════════════════════════════════════════════
// STATS MODULE — Full analytics with Chart.js
// ═══════════════════════════════════════════════════════════════
const StatsModule = {
  _period: 'month',
  _charts: {},
  _customFrom: '',
  _customTo: '',

  _getRange() {
    if (this._period === 'custom' && this._customFrom) {
      return new Date(this._customFrom);
    }
    const d = new Date();
    d.setHours(0,0,0,0);
    if (this._period === 'week')  { d.setDate(d.getDate()-7); return d; }
    if (this._period === 'month') { d.setDate(1); return d; }
    if (this._period === 'year')  { d.setMonth(0); d.setDate(1); return d; }
    return null;
  },

  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> ${T.get('locked')} — ${T.isRTL()?"وصول المسؤول مطلوب":"Accès administrateur requis"}</div></div>`;

    const isAR = T.isRTL();
    const lbl = {
      title:        isAR ? 'الإحصائيات والتحليل'         : 'Analytique & Performance',
      totalBR:      isAR ? 'إجمالي وصولات الاستلام' : 'Total BR',
      bonsRec:      isAR ? 'وصولات الاستلام'            : 'Bons de réception',
      livraisons:   isAR ? 'التسليمات'                   : 'Livraisons',
      tauxLivr:     isAR ? 'نسبة التسليم'               : 'Taux',
      montantTotal: isAR ? 'مجموع المبالغ'             : 'Montant Total',
      moy:          isAR ? 'متوسط'                     : 'Moy.',
      timbre:       isAR ? 'الطابع الجبائي'           : 'Timbre Fiscal',
      coffre:       isAR ? 'صندوق رئيسي'               : 'Coffre',
      solde:        isAR ? 'الرصيد'                     : 'Solde caisse principale',
      evolution:    isAR ? 'تطور 30 يوماً'              : 'Évolution 30 jours',
      parFourn:     isAR ? 'حسب المورد'               : 'Par fournisseur',
      perfUsers:    isAR ? 'أداء المستخدمين'          : 'Performance utilisateurs',
      fluxMois:     isAR ? 'تدفق 12 شهراً'               : 'Flux mensuel 12 mois',
      tendance:     isAR ? 'اتجاه الشهر'              : 'Tendance du mois',
      topFourn:     isAR ? 'أفضل الموردين'            : 'Top Fournisseurs',
      perfUsr:      isAR ? 'أداء المستخدمين'          : 'Performance Utilisateurs',
      topArticles:  isAR ? 'أكثر المنتجات شراءً'       : 'Top Articles achetés',
      exportStats:  isAR ? 'تصدير التقرير'            : 'Exporter le rapport',
    };

    const startDate = this._getRange();
    const endDate = this._customTo ? new Date(this._customTo + 'T23:59:59') : null;
    const allBRs = DB.getAll('brs');
    let brs = startDate ? allBRs.filter(b => new Date(b.createdAt) >= startDate) : allBRs;
    if (endDate) brs = brs.filter(b => new Date(b.createdAt) <= endDate);
    const bls = DB.getAll('bls');
    const delivered = bls.filter(b => b.status === 'delivered');
    const totalTTC = brs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const totalTimbre = brs.reduce((s,b) => s+(Number(b.timbreAmount)||0), 0);
    const ca = DB.getAll('caisse_admin');
    const vaultDeposits    = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const vaultWithdrawals = ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const vaultBalance = vaultDeposits - vaultWithdrawals;
    const avgBR = brs.length ? totalTTC / brs.length : 0;
    const deliveredBRsCount = brs.filter(b => b.status === 'delivered' || b.status === 'billed').length;
    const deliveryRate = brs.length ? Math.min(100, Math.round(deliveredBRsCount/brs.length*100)) : 0;

    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const curMonthBRs  = allBRs.filter(b => new Date(b.createdAt) >= curMonthStart);
    const prevMonthBRs = allBRs.filter(b => { const d=new Date(b.createdAt); return d>=prevMonthStart && d<curMonthStart; });
    const curMonthTTC  = curMonthBRs.reduce((s,b)=>s+(Number(b.totalTTC)||0),0);
    const prevMonthTTC = prevMonthBRs.reduce((s,b)=>s+(Number(b.totalTTC)||0),0);
    const monthGrowth  = prevMonthTTC > 0 ? ((curMonthTTC - prevMonthTTC) / prevMonthTTC * 100) : (curMonthTTC > 0 ? 100 : 0);
    const isGrowing    = monthGrowth >= 0;
    const MONTHS_AR    = ['جان','فيف','مار','أفر','ماي','جوان','جول','أوت','سبت','أكت','نوف','ديس'];
    const MONTHS_FR    = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    const MONTHS       = isAR ? MONTHS_AR : MONTHS_FR;
    const curMonthName = MONTHS[now.getMonth()];
    const prevMonthName= MONTHS[(now.getMonth()-1+12)%12];

    const allSessions = DB.getAll('sessions');
    const closedSessions = allSessions.filter(s=>s.status==='closed');
    const totalUserEcart  = closedSessions.reduce((t,s)=>t+Math.abs(s.ecart||0),0);
    const zeroEcart  = closedSessions.filter(s=>Math.abs(s.ecart||0)<0.01).length;
    const nonZeroEc  = closedSessions.length - zeroEcart;

    return `<div style="padding:0" ${isAR?'dir="rtl"':''}>
    <!-- ── Stats Header ── -->
    <div style="padding:24px 24px 20px;background:linear-gradient(135deg,var(--bg2),var(--bg3));border-bottom:1px solid var(--border)">
      <div class="d-flex flex-between" style="flex-wrap:wrap;gap:10px;align-items:flex-end">
        <div>
          <h2 style="font-size:22px;font-weight:900;color:var(--text)"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> ${lbl.title}</h2>
          <p style="color:var(--text3);font-size:12px;margin-top:4px">
            ${brs.length} BR &nbsp;·&nbsp; ${delivered.length} livraisons &nbsp;·&nbsp; Taux: ${deliveryRate}%
            &nbsp;·&nbsp;
            <span style="color:${isGrowing?'var(--success)':'var(--danger)'}">
              ${isGrowing?'↗':'↘'} ${Math.abs(monthGrowth).toFixed(1)}% vs ${prevMonthName}
            </span>
          </p>
        </div>
        <div style="display:flex;gap:6px;padding-bottom:2px;align-items:center">
          ${['week','month','year','all'].map(p =>
            `<button class="btn btn-sm ${this._period===p?'btn-primary':'btn-outline'}" onclick="StatsModule._period='${p}';StatsModule._customFrom='';StatsModule._customTo='';App.loadModule('stats')">
              ${p==='week'?T.get('stat_week'):p==='month'?T.get('stat_month'):p==='year'?T.get('stat_year'):T.get('stat_all')}
            </button>`).join('')}
          <span style="width:1px;height:24px;background:var(--border);margin:0 4px"></span>
          <input type="date" id="stats-from" value="${this._customFrom||''}" onchange="StatsModule._customFrom=this.value;StatsModule._period='custom';App.loadModule('stats')"
            style="font-size:11px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);height:30px">
          <span style="font-size:11px;color:var(--text3)">→</span>
          <input type="date" id="stats-to" value="${this._customTo||''}" onchange="StatsModule._customTo=this.value;StatsModule._period='custom';App.loadModule('stats')"
            style="font-size:11px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);height:30px">
          <button class="btn btn-sm btn-outline" onclick="StatsModule.exportStatsExcel()" title="${lbl.exportStats}">
            <i class="fas fa-file-excel"></i>
          </button>
        </div>
      </div>
    </div>

    <div style="padding:24px">
    <!-- ── KPI Cards (bilingual via lbl) ── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#1e3a6e,#2563eb);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(37,99,235,.35)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.7">${lbl.totalBR}</div>
        <div style="font-size:44px;font-weight:900;margin:4px 0;line-height:1">${brs.length}</div>
        <div style="font-size:11px;opacity:.6">${lbl.bonsRec}</div>
      </div>
      <div style="background:linear-gradient(135deg,#065f46,#10b981);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(16,185,129,.35)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.7">${lbl.livraisons}</div>
        <div style="font-size:44px;font-weight:900;margin:4px 0;line-height:1">${delivered.length}</div>
        <div style="font-size:11px;opacity:.6">${lbl.tauxLivr}: ${deliveryRate}%</div>
      </div>
      <div style="background:linear-gradient(135deg,#78350f,#f59e0b);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(245,158,11,.35)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.7">${lbl.montantTotal}</div>
        <div style="font-size:22px;font-weight:900;margin:4px 0">${Utils.fmtCurrency(totalTTC)}</div>
        <div style="font-size:11px;opacity:.6">${lbl.moy} ${Utils.fmtCurrency(avgBR)}/BR</div>
      </div>
      <div style="background:linear-gradient(135deg,#4c1d95,#8b5cf6);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(139,92,246,.35)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.7">${lbl.timbre}</div>
        <div style="font-size:22px;font-weight:900;margin:4px 0">${Utils.fmtCurrency(totalTimbre)}</div>
        <div style="font-size:11px;opacity:.6">${isAR?'ضريبة متراكمة':'Taxe cumulée'}</div>
      </div>
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.6">${lbl.coffre}</div>
        <div style="font-size:22px;font-weight:900;margin:4px 0">${Utils.fmtCurrency(vaultBalance)}</div>
        <div style="font-size:11px;opacity:.5">${lbl.solde}</div>
      </div>
      <div style="background:linear-gradient(135deg,${isGrowing?'#065f46,#10b981':'#7f1d1d,#ef4444'});border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 18px rgba(0,0,0,.25)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.7">${lbl.tendance}</div>
        <div style="font-size:32px;font-weight:900;margin:4px 0">${isGrowing?'↗':'↘'} ${Math.abs(monthGrowth).toFixed(1)}%</div>
        <div style="font-size:10px;opacity:.7">${curMonthName} ${Utils.fmtCurrency(curMonthTTC)}<br>${prevMonthName} ${Utils.fmtCurrency(prevMonthTTC)}</div>
      </div>
    </div>

    <!-- ── Caisse health row ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:8px">${isAR?'توازن الصندوق':'Équilibre caisse'}</div>
        <div style="font-size:26px;font-weight:900;color:${zeroEcart>=nonZeroEc?'var(--success)':'var(--warning)'}">${closedSessions.length>0?Math.round(zeroEcart/closedSessions.length*100):100}%</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${zeroEcart} / ${closedSessions.length} ${isAR?'مغلقة':'clôturées'}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:8px">${isAR?'مجموع الفوارق':'Écarts caisse'}</div>
        <div style="font-size:20px;font-weight:900;color:${totalUserEcart>0?'var(--warning)':'var(--success)'}">${Utils.fmtCurrency(totalUserEcart)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${nonZeroEc} ${isAR?'جلسة بفارق':'session(s) avec écart'}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:6px">${isAR?'الصندوق الرئيسي':'Caisse principale'}</div>
        <div style="display:flex;justify-content:center;gap:14px;margin-top:4px">
          <div><div style="font-size:13px;font-weight:700;color:var(--success)">${Utils.fmtCurrency(vaultDeposits)}</div><div style="font-size:9px;color:var(--text4)">${isAR?'مداخيل':'Entrées'}</div></div>
          <div><div style="font-size:13px;font-weight:700;color:var(--danger)">${Utils.fmtCurrency(vaultWithdrawals)}</div><div style="font-size:9px;color:var(--text4)">${isAR?'مخارج':'Sorties'}</div></div>
        </div>
      </div>
    </div>


    <!-- ── Charts ── -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-line"></i> ${lbl.evolution}</h3></div>
        <div class="card-body" style="padding:16px"><canvas id="chart-trend" style="max-height:260px"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-pie"></i> ${lbl.parFourn}</h3></div>
        <div class="card-body" style="padding:16px"><canvas id="chart-suppliers" style="max-height:260px"></canvas></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-boxes"></i> ${lbl.topArticles}</h3></div>
        <div class="card-body" style="padding:16px"><canvas id="chart-top-articles" style="max-height:220px"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-area"></i> ${lbl.fluxMois}</h3></div>
        <div class="card-body" style="padding:16px"><canvas id="chart-cashflow" style="max-height:220px"></canvas></div>
      </div>
    </div>

    <!-- ── Detail Tables ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-building"></i> ${lbl.topFourn}</h3></div>
        <div class="table-wrap"><table class="data-table" style="font-size:12px"><thead><tr>
          <th>${isAR?'المورد':'Fournisseur'}</th><th>BR</th><th>TTC</th><th>%</th>
        </tr></thead>
        <tbody id="stats-sup-table"><tr><td colspan="4" class="text-center text-muted" style="padding:20px"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody></table></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-users"></i> ${lbl.perfUsr}</h3></div>
        <div class="table-wrap"><table class="data-table" style="font-size:12px"><thead><tr>
          <th>${isAR?'المستخدم':'Utilisateur'}</th><th>BR</th><th>TTC</th><th>${isAR?'تسليمات':'Livraisons'}</th>
        </tr></thead>
        <tbody id="stats-user-table"><tr><td colspan="4" class="text-center text-muted" style="padding:20px"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody></table></div>
      </div>
    </div>

    <!-- ── Caisse Flow Section ── -->
    <div style="margin-top:20px;padding-top:20px;border-top:2px solid var(--border)">
      <h3 style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:14px"><i class="fas fa-vault" style="color:var(--primary)"></i> ${isAR?'\u062a\u062f\u0641\u0642\u0627\u062a \u0627\u0644\u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u0631\u0626\u064a\u0633\u064a':'Flux de la Caisse Principale'}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3)">${isAR?'\u0625\u064a\u062f\u0627\u0639\u0627\u062a \u0627\u0644\u0634\u0647\u0631':'D\u00e9p\u00f4ts ce mois'}</div>
          <div style="font-size:18px;font-weight:900;color:var(--success);margin-top:4px">${Utils.fmtCurrency((() => { const m=new Date();m.setDate(1);const ms=m.toISOString().slice(0,10); return ca.filter(t=>t.type==='deposit'&&(t.createdAt||'').slice(0,10)>=ms).reduce((s,t)=>s+(Number(t.amount)||0),0); })())}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3)">${isAR?'\u0633\u062d\u0648\u0628\u0627\u062a \u0627\u0644\u0634\u0647\u0631':'Retraits ce mois'}</div>
          <div style="font-size:18px;font-weight:900;color:var(--danger);margin-top:4px">${Utils.fmtCurrency((() => { const m=new Date();m.setDate(1);const ms=m.toISOString().slice(0,10); return ca.filter(t=>t.type==='withdrawal'&&(t.createdAt||'').slice(0,10)>=ms).reduce((s,t)=>s+(Number(t.amount)||0),0); })())}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3)">${isAR?'\u0639\u062f\u062f \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a':'Nb transactions'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--text);margin-top:4px">${ca.length}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-chart-bar"></i> ${isAR?'\u0625\u064a\u062f\u0627\u0639\u0627\u062a / \u0633\u062d\u0648\u0628\u0627\u062a \u0634\u0647\u0631\u064a\u0629':'D\u00e9p\u00f4ts / Retraits mensuels'}</h3></div>
          <div class="card-body" style="padding:16px"><canvas id="chart-caisse-monthly" style="max-height:220px"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-chart-line"></i> ${isAR?'\u062a\u0637\u0648\u0631 \u0631\u0635\u064a\u062f \u0627\u0644\u0635\u0646\u062f\u0648\u0642':'\u00c9volution solde coffre'}</h3></div>
          <div class="card-body" style="padding:16px"><canvas id="chart-vault-line" style="max-height:220px"></canvas></div>
        </div>
      </div>
    </div>
    </div></div>`;
  },

  initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }
    // Destroy existing charts
    Object.values(this._charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    this._charts = {};

    const startDate = this._getRange();
    const allBRs = DB.getAll('brs');
    const brs = startDate ? allBRs.filter(b => new Date(b.createdAt) >= startDate) : allBRs;
    const suppliers = DB.getAll('suppliers');
    const supMap = {}; suppliers.forEach(s => supMap[s.id] = s);
    const users = DB.getAll('users');
    const bls = DB.getAll('bls');

    const isDark = document.documentElement.dataset.theme === 'dark' || DB.getSettings().themeMode === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    /* ─ 1. 30-day trend ─ */
    const trendCtx = document.getElementById('chart-trend');
    if (trendCtx) {
      const days = 30;
      const labels = [];
      const amounts = [];
      const counts = [];
      for (let i = days-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        const key = d.toISOString().slice(0,10);
        labels.push(key.slice(5));
        const dayBRs = brs.filter(b => (b.date||b.createdAt||'').slice(0,10) === key);
        amounts.push(dayBRs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0));
        counts.push(dayBRs.length);
      }
      this._charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: (T.isRTL()?'المبلغ TTC (د.ج)':'Montant TTC (DA)'), data: amounts, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.10)', fill: true, tension: 0.4, pointRadius: 3, yAxisID: 'y' },
            { label: (T.isRTL()?'عدد BR':'Nb BR'), data: counts, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.10)', fill: false, tension: 0.4, pointRadius: 3, yAxisID: 'y1' },
          ]
        },
        options: { responsive: true, interaction: { mode: 'index', intersect: false },
          scales: { y: { position: 'left', grid: { color: gridColor }, ticks: { callback: v => (v/1000).toFixed(0)+'k DA' } },
                    y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { stepSize: 1 } } },
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.datasetIndex===0 ? Utils.fmtCurrency(ctx.raw) : ctx.raw+' BR' } } }
        }
      });
    }

    /* ─ 2. Supplier doughnut ─ */
    const supCtx = document.getElementById('chart-suppliers');
    if (supCtx) {
      const supStats = {};
      brs.forEach(b => { const id=b.supplierId; if(!supStats[id]) supStats[id]={count:0,total:0}; supStats[id].count++; supStats[id].total+=Number(b.totalTTC)||0; });
      const sorted = Object.entries(supStats).sort((a,b) => b[1].total-a[1].total).slice(0,8);
      const palette = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
      this._charts.suppliers = new Chart(supCtx, {
        type: 'doughnut',
        data: { labels: sorted.map(([id]) => supMap[id]?.name||'?'), datasets: [{ data: sorted.map(([,d]) => d.total), backgroundColor: palette, hoverOffset: 6 }] },
        options: { responsive: true, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => Utils.fmtCurrency(ctx.raw) } } } }
      });
      // Fill table
      const tbody = document.getElementById('stats-sup-table');
      if (tbody) {
        const total = sorted.reduce((s,[,d]) => s+d.total, 0);
        tbody.innerHTML = sorted.map(([id,d]) => `<tr>
          <td><strong>${Utils.escHTML(supMap[id]?.name||'-')}</strong></td>
          <td>${d.count}</td><td class="text-primary fw-bold">${Utils.fmtCurrency(d.total)}</td>
          <td><span class="badge badge-primary">${total?((d.total/total)*100).toFixed(1)+'%':'0%'}</span></td></tr>`).join('')
          || '<tr><td colspan="4" class="text-muted text-center">Aucune donnée</td></tr>';
      }
    }

    /* ─ 3. User performance bar ─ */
    const userCtx = document.getElementById('chart-users');
    if (userCtx) {
      const userStats = {};
      brs.forEach(b => { if(!b.createdBy)return; if(!userStats[b.createdBy])userStats[b.createdBy]={count:0,total:0,deliveries:0}; userStats[b.createdBy].count++; userStats[b.createdBy].total+=Number(b.totalTTC)||0; });
      bls.filter(b=>b.status==='delivered').forEach(b => { const br=DB.getById('brs',b.brId); if(br?.createdBy&&userStats[br.createdBy]) userStats[br.createdBy].deliveries++; });
      const sorted = Object.entries(userStats).sort((a,b) => b[1].total-a[1].total);
      const labels = sorted.map(([id]) => users.find(u=>u.id===Number(id))?.name||'?');
      this._charts.users = new Chart(userCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: (T.isRTL()?'المبلغ TTC':'Montant TTC'), data: sorted.map(([,d])=>d.total), backgroundColor: 'rgba(14,165,233,0.8)', borderRadius: 6, yAxisID: 'y' },
            { label: 'Livraisons', data: sorted.map(([,d])=>d.deliveries), backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 6, yAxisID: 'y1' },
          ]
        },
        options: { responsive: true, interaction: { mode: 'index', intersect: false },
          scales: { y: { position: 'left', grid: { color: gridColor }, ticks: { callback: v => (v/1000).toFixed(0)+'k' } }, y1: { position: 'right', grid: { drawOnChartArea: false } } },
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.datasetIndex===0 ? Utils.fmtCurrency(ctx.raw) : ctx.raw+' livraisons' } } }
        }
      });
      // Fill user table
      const tbody = document.getElementById('stats-user-table');
      if (tbody) {
        tbody.innerHTML = sorted.map(([id,d]) => {
          const u = users.find(x=>x.id===Number(id));
          return `<tr><td><strong>${Utils.escHTML(u?.name||'-')}</strong></td><td>${d.count}</td><td class="text-primary fw-bold">${Utils.fmtCurrency(d.total)}</td><td><span class="badge badge-success">${d.deliveries}</span></td></tr>`;
        }).join('') || '<tr><td colspan="4" class="text-muted text-center">Aucune donnée</td></tr>';
      }
    }

    /* ─ 4. 12-month cash flow ─ */
    const cashCtx = document.getElementById('chart-cashflow');
    if (cashCtx) {
      const monthLabels = [];
      const monthAmounts = [];
      const monthCounts = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
        const y = d.getFullYear(), m = d.getMonth();
        const key = `${y}-${String(m+1).padStart(2,'0')}`;
        monthLabels.push(key.slice(0,7));
        const monthBRs = allBRs.filter(b => (b.date||b.createdAt||'').slice(0,7) === key);
        monthAmounts.push(monthBRs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0));
        monthCounts.push(monthBRs.length);
      }
      this._charts.cashflow = new Chart(cashCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            { label: (T.isRTL()?'المبلغ TTC':'Montant TTC'), data: monthAmounts, backgroundColor: 'rgba(139,92,246,0.75)', borderRadius: 5, yAxisID: 'y' },
            { label: (T.isRTL()?'عدد BR':'Nb BR'), data: monthCounts, type: 'line', borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.4, pointRadius: 4, yAxisID: 'y1' },
          ]
        },
        options: { responsive: true, interaction: { mode: 'index', intersect: false },
          scales: { y: { position: 'left', grid: { color: gridColor }, ticks: { callback: v => (v/1000).toFixed(0)+'k' } }, y1: { position: 'right', grid: { drawOnChartArea: false } } },
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.datasetIndex===0 ? Utils.fmtCurrency(ctx.raw) : ctx.raw+' BR' } } }
        }
      });
    }

    /* ─ 5. Caisse monthly deposits vs withdrawals ─ */
    const caisseMonthCtx = document.getElementById('chart-caisse-monthly');
    if (caisseMonthCtx) {
      const caTx = DB.getAll('caisse_admin');
      const cMonths = [], cDeps = [], cWits = [];
      for (let i=11; i>=0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        cMonths.push(key);
        cDeps.push(caTx.filter(t=>t.type==='deposit'&&(t.createdAt||'').slice(0,7)===key).reduce((s,t)=>s+(Number(t.amount)||0),0));
        cWits.push(caTx.filter(t=>t.type==='withdrawal'&&(t.createdAt||'').slice(0,7)===key).reduce((s,t)=>s+(Number(t.amount)||0),0));
      }
      this._charts.caisseMonthly = new Chart(caisseMonthCtx, {
        type: 'bar',
        data: {
          labels: cMonths,
          datasets: [
            { label: T.isRTL()?'\u0625\u064a\u062f\u0627\u0639\u0627\u062a':'D\u00e9p\u00f4ts', data: cDeps, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 5 },
            { label: T.isRTL()?'\u0633\u062d\u0648\u0628\u0627\u062a':'Retraits', data: cWits, backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 5 },
          ]
        },
        options: { responsive: true, scales: { y: { grid: { color: gridColor }, ticks: { callback: v=>(v/1000).toFixed(0)+'k' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }
      });
    }

    /* ─ 6. Vault balance evolution ─ */
    const vaultLineCtx = document.getElementById('chart-vault-line');
    if (vaultLineCtx) {
      const caTx = DB.getAll('caisse_admin').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      const vDayMap = {};
      caTx.forEach(t => {
        const d = (t.createdAt||'').slice(0,10);
        if (!vDayMap[d]) vDayMap[d] = { dep:0, wit:0 };
        if (t.type==='deposit') vDayMap[d].dep += Number(t.amount)||0;
        else vDayMap[d].wit += Number(t.amount)||0;
      });
      const vDays = Object.keys(vDayMap).sort();
      let vBal = 0;
      const vBalances = vDays.map(d => { vBal += vDayMap[d].dep - vDayMap[d].wit; return vBal; });
      this._charts.vaultLine = new Chart(vaultLineCtx, {
        type: 'line',
        data: {
          labels: vDays.map(d => { const p=d.split('-'); return p[2]+'/'+p[1]; }),
          datasets: [{ label: T.isRTL()?'\u0631\u0635\u064a\u062f \u0627\u0644\u0635\u0646\u062f\u0648\u0642':'Solde coffre', data: vBalances, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.12)', fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2.5 }]
        },
        options: { responsive: true, scales: { y: { grid: { color: gridColor }, ticks: { callback: v=>(v/1000).toFixed(0)+'k' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
      });
    }

    // ── Top Articles chart (horizontal bar — top 10 by value) ──
    const topArtCtx = document.getElementById('chart-top-articles');
    if (topArtCtx) {
      const artMap = {};
      const allBRs = DB.getAll('brs');
      allBRs.forEach(br => {
        (br.lines || []).forEach(l => {
          const name = (l.designation || '').trim();
          if (!name) return;
          artMap[name] = (artMap[name] || 0) + (Number(l.total) || 0);
        });
      });
      const sorted = Object.entries(artMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
      const artColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'];
      this._charts.topArticles = new Chart(topArtCtx, {
        type: 'bar',
        data: {
          labels: sorted.map(([n]) => n.length > 20 ? n.slice(0,18)+'…' : n),
          datasets: [{ label: T.isRTL()?'القيمة':'Valeur (DA)', data: sorted.map(([,v]) => v),
            backgroundColor: artColors, borderRadius: 6, borderSkipped: false }]
        },
        options: { indexAxis: 'y', responsive: true,
          scales: { x: { grid: { color: gridColor }, ticks: { callback: v=>(v/1000).toFixed(0)+'k' } }, y: { grid: { display: false } } },
          plugins: { legend: { display: false } }
        }
      });
    }
  },

  // ── Export Stats to Excel ──
  exportStatsExcel() {
    const isAR = T.isRTL();
    const allBRs = DB.getAll('brs');
    const allBLs = DB.getAll('bls');
    const ca = DB.getAll('caisse_admin');
    const headers = ['Date','Réf BR','Fournisseur','Total HT','TVA','Timbre','Total TTC','Statut','BL Réf','BL Statut'];
    const rows = allBRs.map(br => {
      const sup = DB.getById('suppliers', br.supplierId);
      const bl = allBLs.find(b => Number(b.brId) === Number(br.id));
      return [
        br.date || '', br.ref || '', sup?.name || '',
        Number(br.totalHT)||0, Number(br.tvaAmount)||0, Number(br.timbreAmount)||0, Number(br.totalTTC)||0,
        br.status || '', bl?.ref || '', bl?.status || ''
      ];
    });
    // Add summary rows
    const totalHT = rows.reduce((s,r) => s + (Number(r[3])||0), 0);
    const totalTVA = rows.reduce((s,r) => s + (Number(r[4])||0), 0);
    const totalTimbre = rows.reduce((s,r) => s + (Number(r[5])||0), 0);
    const totalTTC = rows.reduce((s,r) => s + (Number(r[6])||0), 0);
    rows.push([]);
    rows.push(['TOTAL','','', totalHT, totalTVA, totalTimbre, totalTTC, '','','']);
    // Caisse summary
    const deps = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const wits = ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+(Number(t.amount)||0),0);
    rows.push(['CAISSE','Dépôts','', deps, '','','','','','']);
    rows.push(['','Retraits','', wits, '','','','','','']);
    rows.push(['','SOLDE','', deps-wits, '','','','','','']);

    if (typeof exportXLSX !== 'undefined') {
      exportXLSX(headers, rows, `rapport_stats_${Utils.today()}`);
      Utils.notify(isAR?'تم تصدير التقرير':'Rapport exporté', 'success');
    } else {
      Utils.notify('Excel export non disponible', 'error');
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// USER EVALUATION MODULE — Full drill-down analytics
// ═══════════════════════════════════════════════════════════════
const EvalModule = {
  _view: 'overview',   // 'overview' | 'user'
  _userId: null,
  _dateFilter: 'all',  // 'all' | 'month' | 'week'

  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> ${T.isRTL()?"وصول المسؤول مطلوب":"Accès administrateur requis"}</div></div>`;
    if (this._view === 'user' && this._userId) return this._renderUser();
    return this._renderOverview();
  },

  _renderOverview() {
    const users    = DB.getAll('users').filter(u => u.role !== 'admin');
    const sessions = DB.getAll('sessions');
    const workLogs = DB.getAll('work_log');
    const allBRs   = DB.getAll('brs');
    const allBLs   = DB.getAll('bls');

    if (!users.length) return `<div style="padding:24px"><div class="empty-state"><i class="fas fa-users"></i><h4>Aucun utilisateur</h4><p>Créez des utilisateurs pour voir l'évaluation.</p></div></div>`;

    const cards = users.map(u => {
      const uSessions = sessions.filter(s => s.userId === u.id);
      const uClosed   = uSessions.filter(s => s.status === 'closed');
      const uBRs      = allBRs.filter(b => b.createdBy === u.id);
      const uDeliveries = allBLs.filter(b => b.status==='delivered' && allBRs.find(br => br.id===b.brId && br.createdBy===u.id));
      const uLogs     = workLogs.filter(l => l.userId === u.id);

      let totalMin = 0;
      uLogs.forEach(l => {
        if (l.loginTime && l.logoutTime) totalMin += (new Date(l.logoutTime)-new Date(l.loginTime))/60000;
      });
      const hours = Math.floor(totalMin/60), mins = Math.round(totalMin%60);
      const totalEcart = uClosed.reduce((s, ses) => s+Math.abs(ses.ecart||0), 0);
      const totalTTC   = uBRs.reduce((s, b) => s+(Number(b.totalTTC)||0), 0);
      const lastSess   = uSessions.sort((a,b)=>b.date.localeCompare(a.date))[0];
      const score      = totalTTC>0 ? Math.max(0,Math.min(100, Math.round(100-(totalEcart/totalTTC)*500))) : 100;
      const scoreColor = score>=90?'#16a34a':score>=70?'#f59e0b':'#dc2626';

      return `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:var(--transition);box-shadow:var(--shadow-sm)"
           onmouseenter="this.style.boxShadow='var(--shadow)';this.style.transform='translateY(-2px)'"
           onmouseleave="this.style.boxShadow='var(--shadow-sm)';this.style.transform=''"
           onclick="EvalModule._userId=${u.id};EvalModule._view='user';EvalModule._dateFilter='all';App.loadModule('eval')">
        <!-- Card header -->
        <div style="padding:16px 20px;background:linear-gradient(135deg,var(--bg3),var(--bg2));border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;flex-shrink:0">
            ${u.name.charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:15px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escHTML(u.name)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:1px">${Utils.escHTML(u.username)} &middot; ${T.get('role_'+u.role)}</div>
          </div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:26px;font-weight:900;color:${scoreColor}">${score}<span style="font-size:14px">%</span></div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Score</div>
          </div>
        </div>
        <!-- Stats grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;text-align:center;padding:16px 10px 12px;gap:6px">
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--text)">${uClosed.length}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">Sessions</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--primary)">${uBRs.length}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">BR créés</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--success)">${uDeliveries.length}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">${T.isRTL()?"التسليمات":"Livraisons"}</div>
          </div>
          <div>
            <div style="font-size:${totalEcart>0?'16':'22'}px;font-weight:900;color:${totalEcart>0?'var(--warning)':'var(--success)'}">${totalEcart>0?Utils.fmtCurrency(totalEcart):'✓'}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">Écart total</div>
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:8px 20px;border-top:1px solid var(--border);background:var(--bg3);font-size:10px;color:var(--text4);display:flex;justify-content:space-between">
          <span><i class="fas fa-clock"></i> ${hours}h ${mins}min travaillé</span>
          <span>Dernière: ${lastSess ? Utils.fmtDate(lastSess.date) : '—'}</span>
        </div>
      </div>`;
    }).join('');

    return `<div style="padding:24px">
    <div class="d-flex flex-between mb-2" style="flex-wrap:wrap;gap:10px;align-items:center">
      <div>
        <h2 style="font-size:22px;font-weight:900"><i class="fas fa-user-clock" style="color:var(--primary)"></i> Évaluation Utilisateurs</h2>
        <p style="font-size:12px;color:var(--text3);margin-top:2px">${users.length} utilisateur(s) — cliquez sur une carte pour voir le détail complet</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
      ${cards}
    </div>
    </div>`;
  },

  _renderUser() {
    const u = DB.getById('users', this._userId);
    if (!u) { this._view='overview'; return this.render(); }

    const allSessions = DB.getAll('sessions').filter(s => s.userId===u.id).sort((a,b)=>b.date.localeCompare(a.date));
    const allBRs      = DB.getAll('brs').filter(b => b.createdBy===u.id);
    const allBLs      = DB.getAll('bls');
    const allLogs     = DB.getAll('work_log').filter(l => l.userId===u.id);
    const suppliers   = DB.getAll('suppliers');
    const supMap = {}; suppliers.forEach(s => supMap[s.id]=s);

    // Date filter
    let sessions = allSessions;
    if (this._dateFilter === 'week')  { const c=new Date(); c.setDate(c.getDate()-7); c.setHours(0,0,0,0); sessions=allSessions.filter(s=>new Date(s.date)>=c); }
    if (this._dateFilter === 'month') { const c=new Date(); c.setDate(1); c.setHours(0,0,0,0); sessions=allSessions.filter(s=>new Date(s.date)>=c); }

    // Summary stats
    const closedSess  = allSessions.filter(s => s.status==='closed');
    const totalEcart  = closedSess.reduce((s,ses) => s+Math.abs(ses.ecart||0), 0);
    const positiveEC  = closedSess.filter(s=>(s.ecart||0)>0.01).length;
    const negativeEC  = closedSess.filter(s=>(s.ecart||0)<-0.01).length;
    const zeroEC      = closedSess.filter(s=>Math.abs(s.ecart||0)<0.01).length;
    const totalTTC    = allBRs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const score       = totalTTC>0 ? Math.max(0,Math.min(100, Math.round(100-(totalEcart/totalTTC)*500))) : 100;
    const scoreColor  = score>=90?'var(--success)':score>=70?'var(--warning)':'var(--danger)';
    let totalMin=0; allLogs.forEach(l=>{ if(l.loginTime&&l.logoutTime) totalMin+=(new Date(l.logoutTime)-new Date(l.loginTime))/60000; });
    const hours = Math.floor(totalMin/60);

    // Day cards
    const dayCards = sessions.map(session => {
      const dayBRs  = allBRs.filter(b => (b.date||'').slice(0,10)===session.date);
      const brTotal = dayBRs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
      const dayLog  = allLogs.filter(l=>l.date===session.date).sort((a,b)=>(a.loginTime||'').localeCompare(b.loginTime||''))[0];
      const isClosed= session.status==='closed';
      const ecart   = session.ecart||0;
      const ecClass = Math.abs(ecart)<0.01?'success':ecart>0?'warning':'danger';

      const fmtTime = ts => {
        if (!ts) return '—';
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      };
      const durStr = (() => {
        if (!dayLog?.loginTime||!dayLog?.logoutTime) return '';
        const m = Math.round((new Date(dayLog.logoutTime)-new Date(dayLog.loginTime))/60000);
        return `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`;
      })();

      const brRows = dayBRs.map(br => {
        const blLinked = allBLs.find(bl => Number(bl.brId)===Number(br.id));
        return `<tr>
          <td><strong>${Utils.escHTML(br.ref||'')}</strong></td>
          <td>${Utils.escHTML(supMap[br.supplierId]?.name||'—')}</td>
          <td>${Utils.fmtCurrency(br.totalHT)}</td>
          <td>${Utils.fmtCurrency(br.timbreAmount)}</td>
          <td style="font-weight:700;color:var(--primary)">${Utils.fmtCurrency(br.totalTTC)}</td>
          <td>${Utils.statusBadge(br.status||'open')}</td>
          <td>${blLinked?`<span class="badge badge-success"><i class="fas fa-truck"></i> BL/${blLinked.ref}</span>`:'<span class="badge badge-secondary">—</span>'}</td>
        </tr>`;
      }).join('');

      return `
      <div class="card mb-2" style="overflow:hidden">
        <!-- Day header -->
        <div style="padding:14px 20px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:16px;flex-wrap:wrap;cursor:pointer"
             onclick="this.closest('.card').querySelector('.day-body').classList.toggle('d-none')">
          <div style="flex:0 0 auto">
            <div style="font-weight:800;font-size:16px;color:var(--text)">${Utils.fmtDate(session.date)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:3px">
              <span style="color:var(--success)"><i class="fas fa-sign-in-alt"></i></span> ${fmtTime(dayLog?.loginTime)}
              &nbsp;&rarr;&nbsp;
              <span style="color:var(--danger)"><i class="fas fa-sign-out-alt"></i></span> ${isClosed&&dayLog?.logoutTime?fmtTime(dayLog.logoutTime):'<span style="color:var(--warning)">En cours</span>'}
              ${durStr?`&nbsp;&middot;&nbsp;<i class="fas fa-stopwatch" style="color:var(--primary)"></i> <strong>${durStr}</strong>`:''}
            </div>
          </div>
          <div style="display:flex;gap:20px;margin-left:auto;flex-wrap:wrap">
            <div style="text-align:center">
              <div style="font-size:20px;font-weight:900;color:var(--primary)">${dayBRs.length}</div>
              <div style="font-size:10px;color:var(--text3)">BR</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:16px;font-weight:700;color:var(--text)">${Utils.fmtCurrency(brTotal)}</div>
              <div style="font-size:10px;color:var(--text3)">Total TTC</div>
            </div>
            ${isClosed ? `
            <div style="text-align:center">
              <div style="font-size:16px;font-weight:700;color:var(--${ecClass})">${ecart>=0?'+':''}${Utils.fmtCurrency(ecart)}</div>
              <div style="font-size:10px;color:var(--text3)">Écart</div>
            </div>
            <div style="display:flex;align-items:center">${Utils.statusBadge('delivered')}</div>` :
            `<span class="badge badge-warning" style="align-self:center"><i class="fas fa-clock"></i> Session ouverte</span>`}
          </div>
          <i class="fas fa-chevron-down" style="color:var(--text4);flex-shrink:0"></i>
        </div>

        <!-- Day body -->
        <div class="day-body">
          <!-- BR table -->
          ${dayBRs.length ? `
          <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:10px">
              <i class="fas fa-file-import" style="color:var(--primary)"></i> Bons de Réception (${dayBRs.length})
            </div>
            <div class="table-wrap">
              <table class="data-table" style="font-size:12px">
                <thead><tr><th>Référence</th><th>Fournisseur</th><th>HT</th><th>Timbre</th><th>TTC</th><th>Statut</th><th>BL</th></tr></thead>
                <tbody>${brRows}</tbody>
                <tfoot><tr>
                  <td colspan="4" style="padding:9px 14px;font-weight:700;text-align:right">TOTAL JOURNÉE</td>
                  <td style="padding:9px 14px;font-weight:900;font-size:14px;color:var(--primary)">${Utils.fmtCurrency(brTotal)}</td>
                  <td colspan="2"></td>
                </tr></tfoot>
              </table>
            </div>
          </div>` : `<div style="padding:14px 20px;font-size:12px;color:var(--text4);font-style:italic"><i class="fas fa-inbox"></i> Aucun BR créé ce jour.</div>`}

          <!-- Caisse cloture -->
          ${isClosed ? `
          <div style="padding:16px 20px;background:var(--bg3)">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:12px">
              <i class="fas fa-cash-register" style="color:var(--warning)"></i> Clôture de Caisse (صرف)
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px">
              <div class="eval-kpi"><div class="ek-value">${Utils.fmtCurrency(session.startingMonnaie||0)}</div><div class="ek-label">صرف départ</div></div>
              <div class="eval-kpi"><div class="ek-value">${Utils.fmtCurrency(brTotal)}</div><div class="ek-label">Attendu (BRs)</div></div>
              <div class="eval-kpi"><div class="ek-value" style="color:var(--primary)">${Utils.fmtCurrency(session.closedEspeces||0)}</div><div class="ek-label">Espèces déclarées</div></div>
              <div class="eval-kpi"><div class="ek-value" style="color:var(--warning)">${Utils.fmtCurrency(session.closedMonnaie||0)}</div><div class="ek-label">صرف final</div></div>
              <div class="eval-kpi" style="border-color:var(--${ecClass})">
                <div class="ek-value" style="color:var(--${ecClass})">${ecart>=0?'+':''}${Utils.fmtCurrency(ecart)}</div>
                <div class="ek-label">Écart caisse</div>
              </div>
            </div>
            <div class="alert alert-${ecClass==='success'?'success':ecClass==='warning'?'warning':'danger'}" style="font-size:12px;margin:0">
              <i class="fas fa-${ecClass==='success'?'check-circle':'exclamation-triangle'}"></i>
              ${Math.abs(ecart)<0.01 ? 'Caisse parfaitement équilibrée ✓' :
                ecart>0 ? `Excédent de ${Utils.fmtCurrency(ecart)} — vérifier les BR.` :
                          `Manque de ${Utils.fmtCurrency(Math.abs(ecart))} — à justifier.`}
            </div>
          </div>` : `
          <div style="padding:12px 20px;background:var(--bg3)">
            <span class="badge badge-warning"><i class="fas fa-clock"></i> Session non encore clôturée</span>
          </div>`}
        </div>
      </div>`;
    }).join('');

    // ── BL history with sarf per BL ──────────────────────────
    const userBLs = DB.getAll('bls').filter(bl => {
      // BLs created by this user or attributed via createdBy
      if (String(bl.createdBy) === String(u.id)) return true;
      // Also BLs from this user's BRs
      const br2 = DB.getById('brs', bl.brId);
      return br2 && String(br2.createdBy) === String(u.id);
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const blTotal = userBLs.reduce((s,bl) => s+(Number(bl.totalTTC||0)),0);
    const blSarfTotal = userBLs.reduce((s,bl) => {
      const sess = DB.getAll('sessions').find(ss => ss.userId===u.id && (ss.sarf||[]).some(e=>Number(e.blId)===Number(bl.id)));
      if (sess) return s + (sess.sarf||[]).filter(e=>Number(e.blId)===Number(bl.id)).reduce((t,e)=>t+e.amount,0);
      return s;
    }, 0);

    const blRows = userBLs.map(bl => {
      const br2 = DB.getById('brs', bl.brId);
      const sess = DB.getAll('sessions').find(ss => ss.userId===u.id && (ss.sarf||[]).some(e=>Number(e.blId)===Number(bl.id)));
      const blSarf = sess ? (sess.sarf||[]).filter(e=>Number(e.blId)===Number(bl.id)) : [];
      const admSarf = DB.getAll('caisse_admin').filter(e => Number(e.blId)===Number(bl.id) && e.source==='sarf' && e.userId===u.id);
      const sarfEntries = [...blSarf, ...admSarf];
      const sarfTotal2  = sarfEntries.reduce((t,e)=>t+(e.amount||0),0);
      const sarfBadge = sarfTotal2 > 0
        ? `<span style="background:rgba(245,158,11,.15);color:#f59e0b;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">صرف ${Utils.fmtCurrency(sarfTotal2)}</span>`
        : `<span style="color:var(--text4);font-size:11px">—</span>`;
      return `<tr>
        <td style="padding:8px 14px;font-weight:700">${Utils.escHTML(bl.ref||'')}</td>
        <td style="padding:8px">${Utils.escHTML(bl.clientName||'—')}</td>
        <td style="padding:8px">${Utils.escHTML(br2?.ref||'—')}</td>
        <td style="padding:8px">${(bl.deliveredAt||bl.createdAt||'').slice(0,10)}</td>
        <td style="padding:8px;text-align:right;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(bl.totalTTC||br2?.totalTTC||0)}</td>
        <td style="padding:8px">${sarfBadge}</td>
        <td style="padding:8px">${Utils.statusBadge(bl.status||'open')}</td>
      </tr>`;
    }).join('');

    const blSection = `
    <div class="card mb-2" style="overflow:hidden">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <h3><i class="fas fa-truck" style="color:var(--success)"></i> Historique BL <span class="badge badge-secondary">${userBLs.length}</span></h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:12px;color:var(--text3)">صرف total: <strong style="color:#f59e0b">${Utils.fmtCurrency(blSarfTotal)}</strong></span>
          <button class="btn btn-sm btn-outline" onclick="EvalModule._exportBLCSV(${u.id})" style="font-size:11px">
            <i class="fas fa-file-csv"></i> Exporter CSV
          </button>
        </div>
      </div>
      ${userBLs.length ? `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
            <th style="padding:8px 14px;text-align:left;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">BL Réf</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">Client</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">BR lié</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">Date</th>
            <th style="padding:8px;text-align:right;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">TTC</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">صرف</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">Statut</th>
          </tr></thead>
          <tbody>${blRows}</tbody>
          <tfoot><tr style="border-top:2px solid var(--border);background:var(--bg3)">
            <td colspan="4" style="padding:9px 14px;font-weight:700;text-align:right">TOTAL</td>
            <td style="padding:9px 14px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(blTotal)}</td>
            <td style="padding:9px 14px;font-weight:900;color:#f59e0b">${Utils.fmtCurrency(blSarfTotal)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>` : `<div style="padding:20px;text-align:center;color:var(--text4)"><i class="fas fa-inbox"></i> Aucun BL</div>`}
    </div>`;

    return `<div style="padding:24px">
    <!-- Back + title -->
    <div class="d-flex flex-between mb-2" style="flex-wrap:wrap;gap:12px;align-items:center">
      <div style="display:flex;align-items:center;gap:14px">
        <button class="btn btn-outline btn-sm" onclick="EvalModule._view='overview';App.loadModule('eval')">
          <i class="fas fa-arrow-left"></i> Retour
        </button>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900">${u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:18px;font-weight:900">${Utils.escHTML(u.name)}</div>
            <div style="font-size:12px;color:var(--text3)">${Utils.escHTML(u.username)}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        ${['all','month','week'].map(f=>`
        <button class="btn btn-sm ${this._dateFilter===f?'btn-primary':'btn-outline'}" onclick="EvalModule._dateFilter='${f}';App.loadModule('eval')">
          ${f==='all'?'Tout':f==='month'?'Ce mois':'7 jours'}
        </button>`).join('')}
      </div>
    </div>

    <!-- Summary KPIs -->
    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-icon blue"><i class="fas fa-calendar-check"></i></div>
        <div><div class="kpi-label">Sessions clôturées</div><div class="kpi-value">${closedSess.length}/${allSessions.length}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon green"><i class="fas fa-file-import"></i></div>
        <div><div class="kpi-label">Total BR créés</div><div class="kpi-value">${allBRs.length}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon" style="background:rgba(16,185,129,.1);color:var(--success)"><i class="fas fa-truck"></i></div>
        <div><div class="kpi-label">BL livrés</div><div class="kpi-value">${userBLs.filter(b=>b.status==='delivered').length}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon orange"><i class="fas fa-coins"></i></div>
        <div><div class="kpi-label">Total TTC</div><div class="kpi-value" style="font-size:16px">${Utils.fmtCurrency(totalTTC)}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon" style="background:rgba(245,158,11,.1);color:#f59e0b"><i class="fas fa-coins"></i></div>
        <div><div class="kpi-label">Total صرف</div><div class="kpi-value" style="font-size:16px;color:#f59e0b">${Utils.fmtCurrency(blSarfTotal)}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon red"><i class="fas fa-balance-scale"></i></div>
        <div><div class="kpi-label">Total Écarts</div><div class="kpi-value" style="font-size:16px;color:${totalEcart>0?'var(--warning)':'var(--success)'}">${Utils.fmtCurrency(totalEcart)}</div></div></div>
      <div class="kpi-card"><div class="kpi-icon purple"><i class="fas fa-clock"></i></div>
        <div><div class="kpi-label">Heures travaillées</div><div class="kpi-value">${hours}h</div></div></div>
      <div class="kpi-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3))">
        <div class="kpi-icon" style="background:${scoreColor};width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900;flex-shrink:0">
          ${score}%
        </div>
        <div><div class="kpi-label">Score performance</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">
            ${zeroEC} équilibré · ${positiveEC} excédent · ${negativeEC} manque
          </div>
        </div>
      </div>
    </div>

    <!-- BL History with Sarf -->
    ${blSection}

    <!-- Écart breakdown -->
    ${closedSess.length ? `
    <div class="card mb-2">
      <div class="card-header"><h3><i class="fas fa-balance-scale"></i> Analyse des écarts de caisse</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;text-align:center">
          <div style="padding:16px;background:rgba(16,185,129,.08);border-radius:10px;border:1px solid rgba(16,185,129,.2)">
            <div style="font-size:32px;font-weight:900;color:var(--success)">${zeroEC}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px"><i class="fas fa-check-circle" style="color:var(--success)"></i> Caisse équilibrée</div>
          </div>
          <div style="padding:16px;background:rgba(245,158,11,.08);border-radius:10px;border:1px solid rgba(245,158,11,.2)">
            <div style="font-size:32px;font-weight:900;color:var(--warning)">${positiveEC}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px"><i class="fas fa-plus-circle" style="color:var(--warning)"></i> Excédent détecté</div>
          </div>
          <div style="padding:16px;background:rgba(239,68,68,.08);border-radius:10px;border:1px solid rgba(239,68,68,.2)">
            <div style="font-size:32px;font-weight:900;color:var(--danger)">${negativeEC}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px"><i class="fas fa-minus-circle" style="color:var(--danger)"></i> Manque détecté</div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- Timeline -->
    <h3 style="font-size:15px;font-weight:800;margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <i class="fas fa-history" style="color:var(--primary)"></i> Historique des journées
      <span class="badge badge-secondary">${sessions.length}</span>
    </h3>
    ${sessions.length ? dayCards : `<div class="empty-state"><i class="fas fa-calendar-times"></i><h4>Aucune session</h4><p>Aucune activité pour cette période.</p></div>`}
    </div>`;
  },

  _exportBLCSV(userId) {
    const u = DB.getById('users', userId);
    const userBLs = DB.getAll('bls').filter(bl => {
      if (String(bl.createdBy) === String(userId)) return true;
      const br2 = DB.getById('brs', bl.brId);
      return br2 && String(br2.createdBy) === String(userId);
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const rows = [['BL Ref','Client','BR Ref','Date','TTC','صرف Total','Statut']];
    userBLs.forEach(bl => {
      const br2 = DB.getById('brs', bl.brId);
      const sess = DB.getAll('sessions').find(ss => ss.userId===userId && (ss.sarf||[]).some(e=>Number(e.blId)===Number(bl.id)));
      const blSarf = sess ? (sess.sarf||[]).filter(e=>Number(e.blId)===Number(bl.id)).reduce((t,e)=>t+e.amount,0) : 0;
      rows.push([bl.ref||'', bl.clientName||'', br2?.ref||'', (bl.deliveredAt||bl.createdAt||'').slice(0,10), bl.totalTTC||br2?.totalTTC||0, blSarf, bl.status||'']);
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+(encodeURIComponent('\uFEFF'+csv));
    a.download=`BL_${u?.name||userId}_${Utils.today()}.csv`; a.click();
    Utils.notify('CSV exporté','success');
  }
}; // ── end EvalModule ──

// ═══════════════════════════════════════════════════════════════
// CATALOGUE MODULE — Articles + Drivers management
// ═══════════════════════════════════════════════════════════════
const CatalogueModule = {
  _tab: 'articles',
  _q: '',

  render() {
    return this._tab === 'articles' ? this._renderArticles() : this._renderDrivers();
  },

  _renderArticles() {
    const q = this._q.toLowerCase();
    let items = DB.getAll('articles').sort((a,b) => a.name.localeCompare(b.name));
    if (q) items = items.filter(a => a.name.toLowerCase().includes(q)||(a.unit||'').toLowerCase().includes(q));

    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-database"></i> ${T.isRTL()?"قاعدة البيانات — المواد والسائقين":"Base de données — Articles & Chauffeurs"}</h3>
        <button class="btn btn-primary" onclick="CatalogueModule._showAddArticle()">
          <i class="fas fa-plus"></i> Ajouter article
        </button>
      </div>
      <div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg3)">
        <button class="settings-tab ${this._tab==='articles'?'active':''}" onclick="CatalogueModule._tab='articles';CatalogueModule._q='';App.loadModule('catalogue')">
          <i class="fas fa-box"></i> Articles <span class="badge badge-secondary" style="margin-left:4px">${DB.getAll('articles').length}</span>
        </button>
        <button class="settings-tab ${this._tab==='drivers'?'active':''}" onclick="CatalogueModule._tab='drivers';CatalogueModule._q='';App.loadModule('catalogue')">
          <i class="fas fa-truck"></i> Chauffeurs <span class="badge badge-secondary" style="margin-left:4px">${DB.getAll('drivers').length}</span>
        </button>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:1">
          <label>${T.isRTL()?"بحث":"Rechercher"}</label>
          <input type="text" id="cat-article-search" value="${Utils.escHTML(this._q)}" placeholder="Rechercher un article..."
            oninput="CatalogueModule._q=this.value;App.reloadDebounced('catalogue')">
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>${T.isRTL()?"التسمية":"Désignation"}</th><th>${T.isRTL()?"الوحدة":"Unité"}</th><th>${T.isRTL()?"آخر سعر":"Dernier prix"}</th><th>${T.isRTL()?"مستخدم":"Utilisé"}</th><th>${T.isRTL()?"إجراءات":"Actions"}</th></tr></thead>
          <tbody>
            ${items.length ? items.map((a,i) => {
              const usedCount = DB.getAll('brs').reduce((s,br) => s+(br.lines||[]).filter(l=>l.designation===a.name).length, 0);
              return `<tr>
                <td style="color:var(--text4);font-size:11px">${i+1}</td>
                <td><strong>${Utils.escHTML(a.name)}</strong></td>
                <td>${Utils.escHTML(a.unit||'—')}</td>
                <td class="text-primary fw-bold">${Utils.fmtCurrency(a.price||0)}</td>
                <td><span class="badge badge-secondary">${usedCount}x</span></td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="CatalogueModule._showEditArticle(${a.id})" title="${T.isRTL()?`تعديل`:`Modifier`}"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-xs btn-danger" onclick="CatalogueModule._deleteArticle(${a.id})" title="${T.isRTL()?`حذف`:`Supprimer`}"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-box-open"></i><h4>Aucun article</h4><p>Les articles s'ajoutent automatiquement lors des BR.</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },

  _renderDrivers() {
    const q = this._q.toLowerCase();
    let items = DB.getAll('drivers').sort((a,b) => a.name.localeCompare(b.name));
    if (q) items = items.filter(d => d.name.toLowerCase().includes(q)||(d.imm||'').toLowerCase().includes(q));

    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-database"></i> ${T.isRTL()?"قاعدة البيانات — المواد والسائقين":"Base de données — Articles & Chauffeurs"}</h3>
        <button class="btn btn-primary" onclick="CatalogueModule._showAddDriver()">
          <i class="fas fa-plus"></i> Ajouter chauffeur
        </button>
      </div>
      <div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg3)">
        <button class="settings-tab ${this._tab==='articles'?'active':''}" onclick="CatalogueModule._tab='articles';CatalogueModule._q='';App.loadModule('catalogue')">
          <i class="fas fa-box"></i> Articles <span class="badge badge-secondary" style="margin-left:4px">${DB.getAll('articles').length}</span>
        </button>
        <button class="settings-tab ${this._tab==='drivers'?'active':''}" onclick="CatalogueModule._tab='drivers';CatalogueModule._q='';App.loadModule('catalogue')">
          <i class="fas fa-truck"></i> Chauffeurs <span class="badge badge-secondary" style="margin-left:4px">${DB.getAll('drivers').length}</span>
        </button>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:1">
          <label>${T.isRTL()?"بحث":"Rechercher"}</label>
          <input type="text" id="cat-driver-search" value="${Utils.escHTML(this._q)}" placeholder="Rechercher un chauffeur..."
            oninput="CatalogueModule._q=this.value;App.reloadDebounced('catalogue')">
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>${T.isRTL()?"اسم السائق":"Nom du chauffeur"}</th><th>${T.isRTL()?"لوحة التسجيل":"Immatriculation"}</th><th>${T.isRTL()?"التسليمات":"Livraisons"}</th><th>${T.isRTL()?"إجراءات":"Actions"}</th></tr></thead>
          <tbody>
            ${items.length ? items.map((d,i) => {
              const blCount = DB.getAll('bls').filter(bl => bl.driverName===d.name).length;
              return `<tr>
                <td style="color:var(--text4);font-size:11px">${i+1}</td>
                <td><strong>${Utils.escHTML(d.name)}</strong></td>
                <td><code>${Utils.escHTML(d.imm||'—')}</code></td>
                <td><span class="badge badge-success">${blCount}</span></td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="CatalogueModule._showEditDriver(${d.id})" title="${T.isRTL()?`تعديل`:`Modifier`}"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-xs btn-danger" onclick="CatalogueModule._deleteDriver(${d.id})" title="${T.isRTL()?`حذف`:`Supprimer`}"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-truck"></i><h4>Aucun chauffeur</h4><p>Les chauffeurs s'ajoutent automatiquement lors des BL.</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },

  _articleForm(a={}) {
    return `<div class="form-grid cols-2">
      <div class="form-group span-full"><label class="required">${T.isRTL()?"التسمية":"Désignation"}</label><input id="cat-name" value="${Utils.escHTML(a.name||'')}" placeholder="Nom de l'article"></div>
      <div class="form-group"><label>${T.isRTL()?"الوحدة":"Unité"}</label><input id="cat-unit" value="${Utils.escHTML(a.unit||'')}" placeholder="pcs, m², kg..."></div>
      <div class="form-group"><label>Prix par défaut (DA)</label><input type="number" id="cat-price" value="${a.price||0}" min="0" step="any"></div>
    </div>`;
  },
  _showAddArticle() {
    UI.showModal('<i class="fas fa-plus"></i> Nouvel Article', this._articleForm(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="CatalogueModule._saveArticle(null)"><i class="fas fa-save"></i> Enregistrer</button>`, 'md');
  },
  _showEditArticle(id) {
    const a = DB.getById('articles', id); if (!a) return;
    UI.showModal('<i class="fas fa-edit"></i> Modifier Article', this._articleForm(a), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-warning" onclick="CatalogueModule._saveArticle(${id})"><i class="fas fa-save"></i> Enregistrer</button>`, 'md');
  },
  _saveArticle(id) {
    const name  = (document.getElementById('cat-name')?.value||'').trim();
    const unit  = (document.getElementById('cat-unit')?.value||'').trim();
    const price = parseFloat(document.getElementById('cat-price')?.value)||0;
    if (!name) { Utils.notify((T.isRTL()?'التسمية مطلوبة':'Désignation requise'),'error'); return; }
    if (id) { DB.update('articles',id,{name,unit,price}); Utils.notify((T.isRTL()?'تم تعديل المادة':'Article modifié'),'success'); }
    else    { DB.insert('articles',{name,unit,price}); Utils.notify((T.isRTL()?'تمت إضافة المادة':'Article ajouté'),'success'); }
    UI.closeModal(); App.loadModule('catalogue');
  },
  async _deleteArticle(id) {
    const ok = await Dialog.confirm(T.isRTL() ? 'حذف المادة' : 'Supprimer article', (T.isRTL()?'حذف هذه المادة؟':'Supprimer cet article ?'), 'danger');
    if (!ok) return;
    DB.delete('articles',id); Utils.notify((T.isRTL()?'تم حذف المادة':'Article supprimé'),'success'); App.loadModule('catalogue');
  },

  _driverForm(d={}) {
    return `<div class="form-grid cols-2">
      <div class="form-group"><label class="required">${T.isRTL()?"اسم السائق":"Nom du chauffeur"}</label><input id="drv-name" value="${Utils.escHTML(d.name||'')}" placeholder="Prénom Nom"></div>
      <div class="form-group"><label>${T.isRTL()?"لوحة التسجيل":"Immatriculation"}</label><input id="drv-imm" value="${Utils.escHTML(d.imm||'')}" placeholder="17-123-16"></div>
    </div>`;
  },
  _showAddDriver() {
    UI.showModal('<i class="fas fa-plus"></i> Nouveau Chauffeur', this._driverForm(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="CatalogueModule._saveDriver(null)"><i class="fas fa-save"></i> Enregistrer</button>`, 'md');
  },
  _showEditDriver(id) {
    const d = DB.getById('drivers', id); if (!d) return;
    UI.showModal('<i class="fas fa-edit"></i> Modifier Chauffeur', this._driverForm(d), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-warning" onclick="CatalogueModule._saveDriver(${id})"><i class="fas fa-save"></i> Enregistrer</button>`, 'md');
  },
  _saveDriver(id) {
    const name = (document.getElementById('drv-name')?.value||'').trim();
    const imm  = (document.getElementById('drv-imm')?.value||'').trim();
    if (!name) { Utils.notify((T.isRTL()?'الاسم مطلوب':'Nom requis'),'error'); return; }
    if (id) { DB.update('drivers',id,{name,imm}); Utils.notify((T.isRTL()?'تم تعديل السائق':'Chauffeur modifié'),'success'); }
    else    { DB.insert('drivers',{name,imm}); Utils.notify((T.isRTL()?'تمت إضافة السائق':'Chauffeur ajouté'),'success'); }
    UI.closeModal(); App.loadModule('catalogue');
  },
  async _deleteDriver(id) {
    const ok = await Dialog.confirm(T.isRTL() ? 'حذف السائق' : 'Supprimer chauffeur', (T.isRTL()?'حذف هذا السائق؟':'Supprimer ce chauffeur ?'), 'danger');
    if (!ok) return;
    DB.delete('drivers',id); Utils.notify((T.isRTL()?'تم حذف السائق':'Chauffeur supprimé'),'success'); App.loadModule('catalogue');
  }
};


// ═══════════════════════════════════════════════════════════════
// USERS MODULE
// ═══════════════════════════════════════════════════════════════
const UsersModule = {
  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> Accès administrateur</div></div>`;
    const isAR = T.isRTL();
    const users = DB.getAll('users');
    const sessions = DB.getAll('sessions');
    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-users"></i> ${T.get('usr_title')}</h3>
        <button class="btn btn-primary" onclick="UsersModule.showCreate()"><i class="fas fa-plus"></i> ${T.get('usr_new')}</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>${T.get('usr_name')}</th><th>${T.get('usr_login')}</th><th>${T.get('usr_role')}</th><th>Statut</th><th>Dernière session</th><th>${T.get('col_actions')}</th></tr></thead>
          <tbody>
            ${users.map(u=>{
              const lastSess = sessions.filter(s=>s.userId===u.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
              return `<tr>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar ${u.role==='admin'?'admin-avatar':''}" style="width:28px;height:28px;font-size:11px">${u.name.charAt(0)}</div><strong>${Utils.escHTML(u.name)}</strong></div></td>
                <td><code>${Utils.escHTML(u.username)}</code></td>
                <td><span class="badge ${u.role==='admin'?'badge-danger':'badge-primary'}">${T.get('role_'+u.role)}</span></td>
                <td><span class="badge ${u.active!==false?'badge-success':'badge-secondary'}">${u.active!==false?T.get('usr_active'):T.get('usr_inactive')}</span></td>
                <td>${lastSess?Utils.fmtDate(lastSess.date):'<span class="text-muted">—</span>'}</td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="UsersModule.showEdit(${u.id})"><i class="fas fa-edit"></i></button>
                  ${u.id!==Auth.getCurrentUser()?.id?`<button class="btn btn-xs ${u.active!==false?'btn-warning':'btn-success'}" onclick="UsersModule.toggleActive(${u.id})">${u.active!==false?'<i class="fas fa-ban"></i>':'<i class="fas fa-check"></i>'}</button><button class="btn btn-xs btn-danger" onclick="UsersModule.deleteUser(${u.id})" title="${isAR?'حذف':'Supprimer'}"><i class="fas fa-trash-alt"></i></button>`:''} 
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },
  _form(u={}) {
    const pl = {
      canCreateBR:{label:'Créer des BR',icon:'fa-file-import'},canCreateBL:{label:'Créer des BL',icon:'fa-file-export'},
      canViewBRs:{label:'Voir les BR',icon:'fa-eye'},canViewBLs:{label:'Voir les BL',icon:'fa-eye'},
      canViewCaisse:{label:'Voir sa caisse',icon:'fa-cash-register'},canViewSuppliers:{label:'Voir fournisseurs',icon:'fa-building'},
      canViewClients:{label:'Voir clients',icon:'fa-users'},canViewStats:{label:'Voir statistiques',icon:'fa-chart-bar'},
      canViewCatalogue:{label:'Catalogue',icon:'fa-database'},canViewBank:{label:'Comptes banque',icon:'fa-university'},
      canEditSuppliers:{label:'Modifier fournisseurs',icon:'fa-edit'},canEditClients:{label:'Modifier clients',icon:'fa-edit'},
      canDeleteBR:{label:'Supprimer des BR',icon:'fa-trash'},canDeleteBL:{label:'Supprimer des BL',icon:'fa-trash'},
      requireDailyLiquid:{label:'Doit déclarer liquide',icon:'fa-coins'},
    };
    const cp = u.id ? Auth.getUserPermissions(u) : Auth._defaultPermissions();
    const pg = Object.entries(pl).map(([k,m])=>{
      const c = cp[k]===true;
      return `<label class="perm-item ${c?'checked':''}" onclick="this.classList.toggle('checked')">
        <input type="checkbox" data-perm="${k}" ${c?'checked':''} onchange="this.parentElement.classList.toggle('checked',this.checked)">
        <i class="fas ${m.icon}" style="color:var(--primary);font-size:12px"></i>
        <span style="font-size:12px">${m.label}</span>
      </label>`;
    }).join('');
    return `<div class="form-grid cols-2">
      <div class="form-group"><label class="required">${T.get('usr_name')}</label><input id="uName" value="${Utils.escHTML(u.name||'')}" required></div>
      <div class="form-group"><label class="required">${T.get('usr_login')}</label><input id="uUsername" value="${Utils.escHTML(u.username||'')}" required autocomplete="off"></div>
      <div class="form-group"><label ${!u.id?'class="required"':''}>${T.get('usr_pass')} ${u.id?`(${T.isRTL()?"فارغ = بدون تغيير":"vide = inchangé"})`:''}</label>
        <input type="password" id="uPassword" ${!u.id?'required':''} autocomplete="new-password"></div>
      <div class="form-group"><label>${T.get('usr_role')}</label>
        <select id="uRole" onchange="document.getElementById('permSection').style.display=this.value==='admin'?'none':'block'"><option value="user" ${u.role!=='admin'?'selected':''}>${T.get('role_user')}</option><option value="admin" ${u.role==='admin'?'selected':''}>${T.get('role_admin')}</option></select>
      </div>
    </div>
    <div id="permSection" style="display:${u.role==='admin'?'none':'block'};margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px"><i class="fas fa-shield-alt" style="color:var(--primary)"></i> Permissions d'accès</div>
      <div class="perm-grid">${pg}</div>
    </div>`;
  },
  showCreate() {
    UI.showModal(`<i class="fas fa-user-plus"></i> ${T.get('usr_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="UsersModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
  },
  showEdit(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')}`, this._form(u), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="UsersModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
  },
  _save(id) {
    const name = (document.getElementById('uName')?.value||'').trim();
    const username = (document.getElementById('uUsername')?.value||'').trim().toLowerCase();
    const password = document.getElementById('uPassword')?.value||'';
    const role = document.getElementById('uRole')?.value||'user';
    if (!name||!username) { Utils.notify((T.isRTL()?'الحقول مطلوبة':'Champs requis'), 'error'); return; }
    if (!id && !password) { Utils.notify(T.get('usr_pass')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const dup = DB.getAll('users').find(u=>u.username===username&&u.id!==id);
    if (dup) { Utils.notify((T.isRTL()?'المعرف مستخدم بالفعل':'Identifiant déjà utilisé'), 'error'); return; }
    const data = { name, username, role };
    if (role !== 'admin') {
      const perms = {};
      document.querySelectorAll('[data-perm]').forEach(cb => { perms[cb.dataset.perm] = cb.checked; });
      data.permissions = perms;
    }
    if (password) data.password = password;
    console.log('[DEBUG UserSave]', { id, data: JSON.parse(JSON.stringify(data)) });
    if (id) { DB.update('users',id,data); Utils.notify((T.isRTL()?'تم تعديل المستخدم':'Utilisateur modifié'),'success'); }
    else { DB.insert('users',{...data,active:true}); Utils.notify((T.isRTL()?'تم إنشاء المستخدم':'Utilisateur créé'),'success'); }
    UI.closeModal(); SettingsModule._tab='users'; App.loadModule('settings');
  },
  toggleActive(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    if (u.role === 'admin' && u.active !== false) {
      const admins = DB.getAll('users').filter(x => x.role === 'admin' && x.active !== false);
      if (admins.length <= 1) {
        Utils.notify(T.isRTL() ? 'لا يمكن تعطيل آخر مسؤول' : 'Impossible de désactiver le dernier admin', 'error');
        return;
      }
    }
    DB.update('users', id, { active: u.active === false });
    Utils.notify(T.isRTL() ? 'تم تغيير الحالة' : 'Statut modifié', 'success');
    SettingsModule._tab='users'; App.loadModule('settings');
  },

  async deleteUser(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    const me = Auth.getCurrentUser();
    if (u.id === me?.id) {
      Utils.notify(T.isRTL() ? 'لا يمكنك حذف حسابك الخاص' : 'Impossible de supprimer votre propre compte', 'error');
      return;
    }
    if (u.role === 'admin') {
      const admins = DB.getAll('users').filter(x => x.role === 'admin');
      if (admins.length <= 1) {
        Utils.notify(T.isRTL() ? 'لا يمكن حذف المسؤول الأخير' : 'Impossible de supprimer le dernier administrateur', 'error');
        return;
      }
    }
    const name = u.name || u.username;
    const ok = await Dialog.confirm(
      T.isRTL() ? 'حذف المستخدم' : 'Supprimer l\'utilisateur',
      `"${name}"\n\n${T.isRTL() ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'}`,
      'danger'
    );
    if (!ok) return;
    DB.delete('users', id);
    Utils.notify('✅ ' + (T.isRTL() ? 'تم حذف المستخدم' : 'Utilisateur supprimé'), 'success');
    SettingsModule._tab='users'; App.loadModule('settings');
  }
};


// ═══════════════════════════════════════════════════════════════
// SETTINGS MODULE
// ═══════════════════════════════════════════════════════════════
const SettingsModule = {
  _tab: 'company',
  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> Accès administrateur</div></div>`;
    const s = DB.getSettings();
    const isAR = T.isRTL();
    const TABS = [
      {id:'company', icon:'fa-building',   label:T.get('set_company'),  color:'#3b82f6'},
      {id:'timbre',  icon:'fa-stamp',       label:T.get('set_timbre'),   color:'#f59e0b'},
      {id:'appear',  icon:'fa-palette',     label:T.get('set_theme'),    color:'#8b5cf6'},
      {id:'banks',   icon:'fa-university',  label:'Banques',             color:'#10b981'},
      {id:'users',   icon:'fa-users-cog',   label:T.get('nav_users'),    color:'#ef4444'},
      {id:'data',    icon:'fa-database',    label:T.get('set_data'),     color:'#6366f1'},
    ];
    const active = this._tab || 'company';
    const accentColor = TABS.find(t=>t.id===active)?.color || 'var(--primary)';
    return `<div style="padding:0" ${isAR?'dir="rtl"':''}>
    <!-- Settings Header -->
    <div style="padding:24px 28px 0;background:linear-gradient(135deg,var(--bg2),var(--bg3));border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),#38bdf8);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas fa-cog" style="color:#fff;font-size:18px"></i>
        </div>
        <div>
          <h2 style="font-size:20px;font-weight:900;color:var(--text);margin:0">${T.get('set_title')}</h2>
          <p style="font-size:12px;color:var(--text4);margin:2px 0 0">${isAR?'ضبط إعدادات النظام والشركة':'Configurez votre système et votre entreprise'}</p>
        </div>
      </div>
      <!-- Tab pills -->
      <div style="display:flex;gap:2px;overflow-x:auto">
        ${TABS.map(t=>`
        <button onclick="SettingsModule._tab='${t.id}';App.loadModule('settings')" style="
          display:flex;align-items:center;gap:7px;padding:10px 18px;
          border:none;cursor:pointer;font-size:12.5px;font-weight:700;white-space:nowrap;
          border-radius:10px 10px 0 0;transition:all .2s;
          background:${active===t.id?'var(--bg)':'transparent'};
          color:${active===t.id?t.color:'var(--text4)'};
          border-bottom:${active===t.id?`3px solid ${t.color}`:'3px solid transparent'};
          box-shadow:${active===t.id?'0 -2px 10px rgba(0,0,0,.06)':'none'}">
          <i class="fas ${t.icon}" style="font-size:13px"></i>${t.label}
        </button>`).join('')}
      </div>
    </div>
    <!-- Tab Content -->
    <div style="padding:24px 28px">
      ${this._tab==='company'?this._tabCompany(s):''}
      ${this._tab==='timbre'?this._tabTimbre(s):''}
      ${this._tab==='appear'?this._tabAppear(s):''}
      ${this._tab==='banks'?this._tabBanks(s):''}
      ${this._tab==='users'?this._tabUsers():''}
      ${this._tab==='data'?this._tabData():''}
    </div>
    </div>`;
  },

  _tabUsers() {
    const users = DB.getAll('users').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const isAR = T.isRTL();
    return `<div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div><div style="font-weight:800;font-size:16px">${T.get('nav_users')}</div><div style="font-size:12px;color:var(--text4);margin-top:4px">${isAR?'إدارة المستخدمين والصلاحيات':'Gérez les utilisateurs et leurs permissions'}</div></div>
        <button class="btn btn-primary" onclick="UsersModule.showCreate()"><i class="fas fa-user-plus"></i> ${T.get('usr_new')}</button>
      </div>
      <div style="display:grid;gap:10px">
        ${users.map(u => {
          const isAdmin = u.role==='admin';
          const perms = !isAdmin ? Auth.getUserPermissions(u) : null;
          const activePerms = perms ? Object.entries(perms).filter(([k,v])=>v!==false).length : 0;
          return `<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;transition:all .15s" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
            <div style="width:42px;height:42px;border-radius:12px;background:${isAdmin?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,var(--primary),#7c3aed)'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900;flex-shrink:0">${(u.name||'?')[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:var(--text)">${Utils.escHTML(u.name)} ${isAdmin?'<span style="background:#f59e0b;color:#fff;padding:1px 8px;border-radius:20px;font-size:9px;font-weight:800;margin-left:6px">ADMIN</span>':''}</div>
              <div style="font-size:11px;color:var(--text4);margin-top:2px">@${Utils.escHTML(u.username)} ${!isAdmin?'· '+activePerms+' permissions':''}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-sm btn-outline" onclick="UsersModule.showEdit(${u.id})"><i class="fas fa-edit"></i></button>
              ${u.id!==Auth.getCurrentUser()?.id?`<button class="btn btn-sm" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)" onclick="UsersModule.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  _tabBanks(s) {
    const banks = s.banks || [];
    return `<div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div><div style="font-weight:800;font-size:16px">Comptes Bancaires</div><div style="font-size:12px;color:var(--text4);margin-top:4px">Gérez vos comptes pour les virements et paiements fournisseurs</div></div>
        <button class="btn btn-primary" onclick="SettingsModule._addBank()"><i class="fas fa-plus"></i> Ajouter</button>
      </div>
      ${banks.length===0?`<div class="empty-state"><i class="fas fa-university" style="font-size:40px;color:var(--text4)"></i><p>Aucun compte bancaire configuré</p></div>`:`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${banks.map(b=>`<div class="card-v2"><div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0"><i class="fas fa-university"></i></div>
            <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px">${Utils.escHTML(b.name)}</div><div style="font-size:12px;color:var(--text4)">${Utils.escHTML(b.bankName||'')}</div>
              ${b.accountNum?`<div style="font-size:11px;color:var(--text4);font-family:monospace;margin-top:4px">${Utils.escHTML(b.accountNum)}</div>`:''}</div>
            <div style="display:flex;gap:6px"><button class="btn btn-sm btn-outline" onclick="SettingsModule._editBank('${b.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)" onclick="SettingsModule._deleteBank('${b.id}')"><i class="fas fa-trash"></i></button></div>
          </div></div>`).join('')}
      </div>`}
    </div>`;
  },
  async _addBank() {
    const dzBanks=["BNA - Banque Nationale d'Algérie","CPA - Crédit Populaire d'Algérie","BADR - Banque de l'Agriculture et du Développement Rural","BEA - Banque Extérieure d'Algérie","BDL - Banque de Développement Local","CNEP - Caisse Nationale d'Épargne et de Prévoyance","AGB - Algeria Gulf Bank","SGA - Société Générale Algérie","ABC - Arab Banking Corporation","BNP Paribas El Djazaïr","Natixis Algérie","CITIBANK Algeria","HSBC Algeria","Al Baraka Bank","Al Salam Bank","Trust Bank Algeria","Housing Bank","Franç. Banque d'Algérie"];
    const opts = dzBanks.map(b=>`<option value="${b}">${b}</option>`).join('');
    const selHtml = `<select id="bank_bname" style="width:100%" onchange="document.getElementById('bank_bname_custom').style.display=this.value==='Autre'?'block':'none'"><option value="">-- Sélectionner --</option>${opts}<option value="Autre">Autre...</option></select><input type="text" id="bank_bname_custom" placeholder="Saisir le nom de la banque" style="width:100%;margin-top:5px;display:none;">`;
    const r = await Dialog.show({title:'Ajouter un compte bancaire',message:`<div class="form-group" style="margin-bottom:10px"><label>Nom du compte <span style="color:red">*</span></label><input type="text" id="bank_name" placeholder="Ex: Compte courant" style="width:100%"></div><div class="form-group" style="margin-bottom:10px"><label>Nom de la banque</label>${selHtml}</div><div class="form-group"><label>N° de compte</label><input type="text" id="bank_num" placeholder="Ex: 000 12345 67890" style="width:100%"></div>`,type:'info',confirmText:'Ajouter',cancelText:'Annuler'});
    if(!r)return;const name=document.getElementById('bank_name')?.value?.trim();if(!name){Utils.notify('Le nom est requis','warning',3000);return;}
    let bname=document.getElementById('bank_bname')?.value||'';if(bname==='Autre')bname=document.getElementById('bank_bname_custom')?.value?.trim()||'';
    const s=DB.getSettings();const banks=s.banks||[];banks.push({id:'bank_'+Date.now(),name,bankName:bname,accountNum:document.getElementById('bank_num')?.value?.trim()||''});
    DB.saveSettings({banks});Utils.notify('\u2705 Compte ajouté','success');App.loadModule('settings');
  },
  async _editBank(bankId) {
    const s=DB.getSettings();const banks=s.banks||[];const b=banks.find(x=>x.id===bankId);if(!b)return;
    const dzBanks=["BNA - Banque Nationale d'Algérie","CPA - Crédit Populaire d'Algérie","BADR - Banque de l'Agriculture et du Développement Rural","BEA - Banque Extérieure d'Algérie","BDL - Banque de Développement Local","CNEP - Caisse Nationale d'Épargne et de Prévoyance","AGB - Algeria Gulf Bank","SGA - Société Générale Algérie","ABC - Arab Banking Corporation","BNP Paribas El Djazaïr","Natixis Algérie","CITIBANK Algeria","HSBC Algeria","Al Baraka Bank","Al Salam Bank","Trust Bank Algeria","Housing Bank","Franç. Banque d'Algérie"];
    const isOther = b.bankName && !dzBanks.includes(b.bankName);
    const opts = dzBanks.map(bk=>`<option value="${bk}" ${b.bankName===bk?'selected':''}>${bk}</option>`).join('');
    const selHtml = `<select id="bank_bname" style="width:100%" onchange="document.getElementById('bank_bname_custom').style.display=this.value==='Autre'?'block':'none'"><option value="">-- Sélectionner --</option>${opts}<option value="Autre" ${isOther?'selected':''}>Autre...</option></select><input type="text" id="bank_bname_custom" placeholder="Saisir le nom de la banque" value="${isOther?Utils.escHTML(b.bankName):''}" style="width:100%;margin-top:5px;display:${isOther?'block':'none'};">`;
    const r=await Dialog.show({title:'Modifier le compte',message:`<div class="form-group" style="margin-bottom:10px"><label>Nom du compte</label><input type="text" id="bank_name" value="${Utils.escHTML(b.name)}" style="width:100%"></div><div class="form-group" style="margin-bottom:10px"><label>Nom de la banque</label>${selHtml}</div><div class="form-group"><label>N° de compte</label><input type="text" id="bank_num" value="${Utils.escHTML(b.accountNum||'')}" style="width:100%"></div>`,type:'info',confirmText:'Enregistrer',cancelText:'Annuler'});
    if(!r)return;b.name=document.getElementById('bank_name')?.value?.trim()||b.name;
    let bname=document.getElementById('bank_bname')?.value||'';if(bname==='Autre')bname=document.getElementById('bank_bname_custom')?.value?.trim()||'';
    b.bankName=bname;
    b.accountNum=document.getElementById('bank_num')?.value?.trim()||'';
    DB.saveSettings({banks});Utils.notify('\u2705 Compte mis à jour','success');App.loadModule('settings');
  },
  async _deleteBank(bankId) {
    const ok=await Dialog.confirm('Supprimer ce compte ?','Les transactions passées seront conservées.','danger');if(!ok)return;
    const s=DB.getSettings();const banks=(s.banks||[]).filter(b=>b.id!==bankId);DB.saveSettings({banks});Utils.notify('Compte supprimé','info');App.loadModule('settings');
  },

  _tabCompany(s) {
    const isAR = T.isRTL();
    const field = (id, label, value, opts='', icon='fa-pen') => `
    <div class="form-group" style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);display:flex;align-items:center;gap:5px;margin-bottom:5px">
        <i class="fas ${icon}" style="font-size:10px;color:var(--primary)"></i>${label}
      </label>
      <input id="${id}" value="${Utils.escHTML(value||'')}" ${opts}
        style="background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-size:13.5px;font-weight:600;color:var(--text);width:100%;transition:.2s;outline:none"
        onfocus="this.style.borderColor='var(--primary)';this.style.boxShadow='0 0 0 3px rgba(var(--primary-rgb),.12)'"
        onblur="this.style.borderColor='var(--border)';this.style.boxShadow='none'">
    </div>`;

    const sectionBox = (icon, color, bg, title, content) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;background:${bg};border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div style="width:30px;height:30px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${icon}" style="color:#fff;font-size:13px"></i>
        </div>
        <span style="font-size:12px;font-weight:800;color:var(--text);letter-spacing:.3px">${title}</span>
      </div>
      <div style="padding:18px">${content}</div>
    </div>`;

    const logoBox = (key, label, current) => `
    <div style="background:var(--bg);border:2px dashed var(--border);border-radius:12px;padding:16px;text-align:center;transition:.2s"
      onmouseover="this.style.borderColor='var(--primary)';this.style.background='rgba(var(--primary-rgb),.04)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg)'">
      <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--text4);margin-bottom:10px;text-transform:uppercase">${label}</div>
      ${current
        ? `<img src="${current}" style="max-height:56px;max-width:100%;border-radius:8px;border:1px solid var(--border);margin-bottom:10px;display:block;margin-left:auto;margin-right:auto">`
        : `<div style="height:56px;display:flex;align-items:center;justify-content:center;margin-bottom:10px">
             <i class="fas fa-image" style="font-size:28px;color:var(--border)"></i>
           </div>`}
      <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;font-size:12px;font-weight:600;color:var(--text3);transition:.15s"
        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';this.style.borderColor='var(--primary)'" onmouseout="this.style.background='var(--bg2)';this.style.color='var(--text3)';this.style.borderColor='var(--border)'">
        <i class="fas fa-upload" style="font-size:11px"></i>${isAR?'تحميل':'Choisir'}
        <input type="file" accept="image/*" style="display:none" onchange="SettingsModule._handleLogo('${key}',this)">
      </label>
      ${current ? `<button onclick="SettingsModule._clearLogo('${key}')" class="btn btn-xs" style="margin-top:6px;display:block;margin-left:auto;margin-right:auto;color:var(--danger);background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:4px 10px;font-size:11px">
        <i class="fas fa-trash-alt"></i> ${isAR?'حذف':'Supprimer'}
      </button>` : ''}
    </div>`;

    return `
    ${sectionBox('building','#3b82f6','rgba(59,130,246,.06)',isAR?'هوية الشركة':'Identité de la société',`
      <div style="display:grid;grid-template-columns:1fr;gap:0">
        ${field('sCompName', isAR?'اسم الشركة':'Raison sociale', s.companyName, 'style="font-size:16px;font-weight:800" placeholder="SPA ..."', 'fa-building')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('sPhone', isAR?'الهاتف':'Téléphone', s.phone, 'type="tel"', 'fa-phone')}
          ${field('sFax', isAR?'الفاكس':'Fax', s.fax, 'type="tel"', 'fa-fax')}
        </div>
        ${field('sEmail', isAR?'البريد الإلكتروني':'Email', s.email, 'type="email"', 'fa-envelope')}
        ${field('sAddr', isAR?'العنوان':'Adresse', s.address, 'placeholder="Wilaya, Commune..."', 'fa-map-marker-alt')}
      </div>
    `)}

    ${sectionBox('id-card','#f59e0b','rgba(245,158,11,.06)',isAR?'المعرفات الجبائية':'Identifiants fiscaux',`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">NIF</div>
          <input id="sNif" value="${Utils.escHTML(s.nif||'')}" placeholder="000000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">NIS</div>
          <input id="sNis" value="${Utils.escHTML(s.nis||'')}" placeholder="000000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">RC</div>
          <input id="sRc" value="${Utils.escHTML(s.rc||'')}" placeholder="00/00-XXXXXXX" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">AI (Art. Imposition)</div>
          <input id="sAi" value="${Utils.escHTML(s.ai||'')}" placeholder="00000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
      </div>
    `)}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px">
      ${logoBox('logoLeft', isAR?'شعار يساري':'Logo gauche', s.logoLeft)}
      ${logoBox('logoRight', isAR?'شعار يميني':'Logo droit', s.logoRight)}
      <!-- TVA card -->
      <div style="background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.02));border:1.5px solid rgba(16,185,129,.2);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#10b981;margin-bottom:14px">
          <i class="fas fa-percentage"></i> ${isAR?'نسبة TVA':'Taux TVA'}
        </div>
        <div style="position:relative;margin-bottom:10px">
          <input id="sTvaRate" type="number" min="0" max="100" step="0.1" value="${s.tvaRate??19}"
            style="font-size:36px;font-weight:900;text-align:center;width:110px;background:transparent;border:none;color:#10b981;outline:none;padding:0">
          <span style="position:absolute;bottom:4px;right:-10px;font-size:16px;font-weight:800;color:rgba(16,185,129,.6)">%</span>
        </div>
        <div style="font-size:10px;color:var(--text4);background:var(--bg2);border-radius:6px;padding:4px 10px;border:1px solid var(--border)">${isAR?'يُطبَّق على BR / BL':'Appliqué aux BR / BL'}</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="SettingsModule._saveCompany()" style="width:100%;padding:12px;font-size:14px;font-weight:800;border-radius:12px">
      <i class="fas fa-save"></i> ${isAR?'حفظ الإعدادات':'Enregistrer les paramètres'}
    </button>`;
  },

  _handleLogo(key, input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { DB.saveSettings({[key]:e.target.result}); App.loadModule('settings'); if(typeof App!=='undefined') App._applyBranding?.(); };
    reader.readAsDataURL(file);
  },
  _clearLogo(key) { DB.saveSettings({[key]:''}); App.loadModule('settings'); },
  _saveCompany() {
    DB.saveSettings({
      companyName: document.getElementById('sCompName')?.value||'',
      address: document.getElementById('sAddr')?.value||'',
      phone: document.getElementById('sPhone')?.value||'',
      fax: document.getElementById('sFax')?.value||'',
      email: document.getElementById('sEmail')?.value||'',
      nif: document.getElementById('sNif')?.value||'',
      rc: document.getElementById('sRc')?.value||'',
      nis: document.getElementById('sNis')?.value||'',
      ai: document.getElementById('sAi')?.value||'',
      tvaRate: parseFloat(document.getElementById('sTvaRate')?.value) || 19,
    });
    if (typeof App!=='undefined') App._applyBranding?.();
    Utils.notify((T.isRTL()?'تم حفظ إعدادات الشركة':'Paramètres société enregistrés'), 'success');
  },

  _tabTimbre(s) {
    const slabs = s.timbreSlabs && s.timbreSlabs.length ? s.timbreSlabs : [];
    const globalRate       = s.timbreRate       ?? 0.0119;
    const globalPerTranche = s.timbrePerTranche ?? 1.5;
    const timbreMin        = s.timbreMin        ?? 0;
    const isAR = T.isRTL();

    const slabRows = slabs.length ? slabs.map((sl,i) => `
      <div class="slab-row" id="slab-${i}" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
        <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'من (DA)' : 'Min (DA)'}</label><input type="number" class="slab-min" value="${sl.min??0}" min="0"></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'الى (DA)' : 'Max (DA)'}</label><input type="number" class="slab-max" value="${sl.max!==null&&sl.max!==undefined?sl.max:''}" placeholder="∞"></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'معامل (rate)' : 'Taux (rate)'}</label><input type="number" class="slab-rate" value="${sl.rate??globalRate}" step="0.0001" oninput="SettingsModule._previewTimbre()"></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'DA/شريحة' : 'DA/tranche'}</label><input type="number" class="slab-pt" value="${sl.perTranche??globalPerTranche}" step="0.01" oninput="SettingsModule._previewTimbre()"></div>
        <button class="btn btn-xs btn-danger" onclick="this.parentElement.remove();SettingsModule._previewTimbre()" style="height:36px;margin-bottom:1px"><i class="fas fa-times"></i></button>
      </div>`).join('') : '';

    return `
    <style>
      .timbre-law-card{background:linear-gradient(135deg,#0f2027 0%,#1e3a5f 50%,#0f4c75 100%);border-radius:16px;padding:20px;margin-bottom:20px;color:#e0f2fe;border:1px solid rgba(56,189,248,.2)}
      .timbre-sim-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px}
      .timbre-sim-result{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
      .timbre-sim-cell{background:var(--bg3,var(--bg));border-radius:10px;padding:14px;text-align:center}
      .timbre-sim-cell .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:6px}
      .timbre-sim-cell .value{font-size:22px;font-weight:900}
      .timbre-sim-step{background:var(--bg3,var(--bg));border-radius:8px;padding:10px 14px;margin-top:10px;font-size:12px;color:var(--text3);border-left:3px solid var(--primary)}
    </style>

    <!-- FORMULA EXPLANATION -->
    <div class="timbre-law-card">
      <h3 style="margin:0 0 6px;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px">
        <i class="fas fa-stamp" style="color:#38bdf8"></i>
        ${isAR ? 'الطابع الجبائي — صيغة الحساب بالشرائح' : 'Timbre Fiscal — Calcul par tranches'}
      </h3>
      <div style="font-size:11px;opacity:.65;margin-bottom:12px;font-style:italic">
        ${isAR ? 'الصيغة: timbre = HT × rate × DA/tranche (لكل شريحة)' : 'Formule : timbre = HT × taux × DA/tranche (par slab)'}
      </div>
      <div style="background:rgba(0,0,0,.3);border-radius:10px;padding:12px;font-size:12px">
        <code style="background:rgba(56,189,248,.2);padding:2px 8px;border-radius:4px;color:#7dd3fc">tranches = HT × rate</code>
        &nbsp;→&nbsp;
        <code style="background:rgba(56,189,248,.2);padding:2px 8px;border-radius:4px;color:#7dd3fc">timbre = tranches × DA/tranche</code>
        <br><small style="opacity:.7;margin-top:8px;display:block">${isAR ? 'كل شريحة تعرّف نطاق HT ومعامل خاص. إذا لا توجد شرائح يستخدم المعامل الافتراضي.' : 'Chaque slab définit un intervalle HT avec son propre taux. Sans slabs : taux global.'}</small>
      </div>
    </div>

    <!-- LIVE SIMULATOR -->
    <div class="timbre-sim-wrap">
      <div style="font-weight:800;font-size:15px;margin-bottom:4px;color:var(--text)">
        <i class="fas fa-calculator" style="color:var(--primary)"></i>
        ${isAR ? 'حاسبة الطابع الفورية' : 'Simulateur de timbre en temps réel'}
      </div>
      <input type="number" id="timbre-sim-amt" min="0" step="100" placeholder="${isAR ? 'مثال: 38894' : 'ex: 38 894'}"
        style="width:100%;padding:10px 14px;font-size:18px;font-weight:700;border-radius:10px;border:2px solid var(--border);background:var(--bg);color:var(--text);margin-top:10px"
        oninput="SettingsModule._previewTimbre()">
      <div id="timbre-sim-result" style="margin-top:14px;color:var(--text3);font-size:13px">
        ${isAR ? '← أدخل مبلغًا لرؤية النتيجة' : '← Saisissez un montant pour voir le calcul'}
      </div>
    </div>

    <!-- GLOBAL DEFAULTS -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
      <h4 style="margin:0 0 14px;font-size:13px;font-weight:800;color:var(--text)">
        <i class="fas fa-sliders-h" style="color:var(--primary);margin-right:6px"></i>
        ${isAR ? 'المعاملات الافتراضية (تُستخدم إذا لم تنطبق أي شريحة)' : 'Taux globaux par défaut (utilisés si aucun slab ne correspond)'}
      </h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
        <div class="form-group" style="margin:0">
          <label style="font-size:11px;font-weight:700;color:var(--text3)">${isAR ? 'معامل افتراضي (rate)' : 'Taux global (rate)'}</label>
          <input type="number" id="timbre-rate-input" value="${globalRate}" min="0" step="0.0001"
            style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-weight:700;font-size:14px"
            oninput="SettingsModule._previewTimbre()">
          <small style="color:var(--text4);font-size:10px">Ex: 0.0119</small>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px;font-weight:700;color:var(--text3)">${isAR ? 'DA/شريحة افتراضي' : 'DA/tranche global'}</label>
          <input type="number" id="timbre-per-tranche-input" value="${globalPerTranche}" min="0" step="0.01"
            style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-weight:700;font-size:14px"
            oninput="SettingsModule._previewTimbre()">
          <small style="color:var(--text4);font-size:10px">Ex: 1.5</small>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px;font-weight:700;color:var(--text3)">${isAR ? 'الحد الأدنى (DA)' : 'Minimum (DA)'}</label>
          <input type="number" id="timbre-min-input" value="${timbreMin}" min="0" step="1"
            style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-weight:700;font-size:14px">
          <small style="color:var(--text4);font-size:10px">0 = ${isAR ? 'بدون حد أدنى' : 'sans minimum'}</small>
        </div>
      </div>
    </div>

    <!-- SLABS TABLE -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h4 style="margin:0;font-size:13px;font-weight:800;color:var(--text)">
          <i class="fas fa-layer-group" style="color:var(--primary);margin-right:6px"></i>
          ${isAR ? 'جدول الشرائح (اختياري)' : 'Tableau des tranches (optionnel)'}
        </h4>
        <button class="btn btn-sm btn-outline" onclick="SettingsModule._addSlab()">
          <i class="fas fa-plus"></i> ${isAR ? 'إضافة شريحة' : 'Ajouter slab'}
        </button>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">
        <i class="fas fa-info-circle" style="color:var(--primary)"></i>
        ${isAR ? 'إذا تركت الجدول فارغاً سيستخدم المعامل الافتراضي. الشرائح تُحدد نطاقات HT مع معاملات خاصة.' : 'Laissez vide pour utiliser uniquement le taux global. Les slabs définissent des intervalles HT avec des taux personnalisés.'}
      </div>
      <div id="slabsContainer">${slabRows}</div>
      ${!slabs.length ? `<div style="text-align:center;padding:20px;color:var(--text4);font-size:12px"><i class="fas fa-th-list" style="font-size:24px;margin-bottom:8px;display:block;opacity:.3"></i>${isAR ? 'لا توجد شرائح — يستخدم المعامل الافتراضي' : 'Aucun slab — taux global utilisé'}</div>` : ''}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="SettingsModule._saveTimbre()">
        <i class="fas fa-save"></i> ${T.get('save')}
      </button>
      <button class="btn btn-secondary" onclick="SettingsModule._resetTimbre()">
        <i class="fas fa-undo"></i> ${isAR ? 'إعادة تعيين' : 'Réinitialiser'}
      </button>
    </div>`;
  },

  _addSlab() {
    const c = document.getElementById('slabsContainer');
    if (!c) return;
    const idx = Date.now();
    const isAR = T.isRTL();
    const defRate = parseFloat(document.getElementById('timbre-rate-input')?.value) || 0.0119;
    const defPT   = parseFloat(document.getElementById('timbre-per-tranche-input')?.value) || 1.5;
    c.insertAdjacentHTML('beforeend', `
    <div class="slab-row" id="slab-${idx}" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
      <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'من (DA)' : 'Min (DA)'}</label><input type="number" class="slab-min" value="0" min="0"></div>
      <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'الى (DA)' : 'Max (DA)'}</label><input type="number" class="slab-max" placeholder="∞"></div>
      <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'معامل (rate)' : 'Taux'}</label><input type="number" class="slab-rate" value="${defRate}" step="0.0001" oninput="SettingsModule._previewTimbre()"></div>
      <div class="form-group" style="margin:0"><label style="font-size:10px;color:var(--text3);font-weight:700">${isAR ? 'DA/شريحة' : 'DA/tranche'}</label><input type="number" class="slab-pt" value="${defPT}" step="0.01" oninput="SettingsModule._previewTimbre()"></div>
      <button class="btn btn-xs btn-danger" onclick="this.parentElement.remove();SettingsModule._previewTimbre()" style="height:36px;margin-bottom:1px"><i class="fas fa-times"></i></button>
    </div>`);
  },

  _previewTimbre() {
    const amt = parseFloat(document.getElementById('timbre-sim-amt')?.value) || 0;
    const el  = document.getElementById('timbre-sim-result');
    if (!el) return;
    const isAR = T.isRTL();
    if (!amt || amt < 0) {
      el.innerHTML = `<span style="color:var(--text3)">${isAR ? '← أدخل مبلغًا لرؤية النتيجة' : '← Saisissez un montant pour voir le calcul'}</span>`;
      return;
    }
    const globalRate = parseFloat(document.getElementById('timbre-rate-input')?.value) || 0.0119;
    const globalPT   = parseFloat(document.getElementById('timbre-per-tranche-input')?.value) || 1.5;
    // Find matching slab
    const rows = Array.from(document.querySelectorAll('#slabsContainer .slab-row'));
    const slabs = rows.map(row => ({
      min: parseFloat(row.querySelector('.slab-min')?.value)||0,
      max: row.querySelector('.slab-max')?.value ? parseFloat(row.querySelector('.slab-max').value) : null,
      rate: parseFloat(row.querySelector('.slab-rate')?.value)||globalRate,
      perTranche: parseFloat(row.querySelector('.slab-pt')?.value)||globalPT,
    })).sort((a,b) => a.min - b.min);

    let rate = globalRate, perTranche = globalPT, slabLabel = isAR ? 'المعامل الافتراضي' : 'Taux global';
    if (slabs.length) {
      const slab = slabs.find(sl => amt >= sl.min && (sl.max === null || sl.max === undefined || amt <= sl.max));
      if (slab) {
        rate = slab.rate; perTranche = slab.perTranche;
        slabLabel = `${isAR?'شريحة':'Slab'} ${slab.min.toLocaleString('fr-FR')} – ${slab.max!==null&&slab.max!==undefined ? slab.max.toLocaleString('fr-FR') : '∞'} DA`;
      }
    }

    const tranches = amt * rate;
    const timbre   = Math.round(tranches * perTranche * 100) / 100;
    const ttc      = amt + timbre;
    const fmtDA    = v => Utils.fmtCurrency(v);

    el.innerHTML = `
      <div class="timbre-sim-result">
        <div class="timbre-sim-cell">
          <div class="label">${isAR ? 'المبلغ HT' : 'Montant HT'}</div>
          <div class="value" style="color:var(--text)">${fmtDA(amt)}</div>
        </div>
        <div class="timbre-sim-cell">
          <div class="label">${isAR ? 'الطابع الجبائي' : 'Timbre fiscal'}</div>
          <div class="value" style="color:#f59e0b">${fmtDA(timbre)}</div>
        </div>
        <div class="timbre-sim-cell" style="background:var(--primary-light,rgba(14,165,233,.08));border:2px solid var(--primary)">
          <div class="label" style="color:var(--primary)">${isAR ? 'المجموع TTC' : 'Total TTC'}</div>
          <div class="value" style="color:var(--primary)">${fmtDA(ttc)}</div>
        </div>
      </div>
      <div class="timbre-sim-step">
        <strong>${isAR ? 'تفاصيل:' : 'Détail :'}</strong>
        <span style="color:var(--primary);font-weight:700">${slabLabel}</span>
        &nbsp;— ${amt.toLocaleString('fr-FR')} &times; ${rate} = <strong>${Math.round(tranches*100)/100}</strong> ${isAR ? 'شريحة' : 'tranches'}
        &nbsp;&times;&nbsp; <strong>${perTranche} DA</strong>
        = <strong style="color:var(--primary)">${fmtDA(timbre)}</strong>
      </div>
    `;
  },

  _saveTimbre() {
    const _n = (v, fb) => { const p = parseFloat(v); return isNaN(p) ? fb : p; }; // safe: 0 stays 0
    const rate       = _n(document.getElementById('timbre-rate-input')?.value, 0.0119);
    const perTranche = _n(document.getElementById('timbre-per-tranche-input')?.value, 1.5);
    const timbreMin  = _n(document.getElementById('timbre-min-input')?.value, 0);
    const rows = document.querySelectorAll('#slabsContainer .slab-row');
    const slabs = Array.from(rows).map(row => ({
      min:        _n(row.querySelector('.slab-min')?.value, 0),
      max:        row.querySelector('.slab-max')?.value.trim() ? _n(row.querySelector('.slab-max').value, null) : null,
      rate:       _n(row.querySelector('.slab-rate')?.value, rate),
      perTranche: _n(row.querySelector('.slab-pt')?.value, perTranche),
    })).sort((a,b) => a.min - b.min);

    // Save rate/perTranche/min via settings (simple scalar values — work fine)
    DB.saveSettings({ timbreRate: rate, timbrePerTranche: perTranche, timbreMin });

    // Save slabs via DEDICATED collection — bypasses all Mixed-type issues
    localStorage.setItem('timbre_slabs_data', JSON.stringify(slabs));
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.saveTimbreSlabs(slabs).then(r => {
        console.log('[timbreSlabs] saved to DB:', r?.count, 'slabs');
        Utils.notify((T.isRTL() ? 'تم حفظ إعدادات الطابع ✓' : 'Tranches timbre sauvegardées ✓'), 'success');
      }).catch(e => {
        console.error('[timbreSlabs] cloud save FAILED:', e.message);
        Utils.notify('❌ Erreur sauvegarde tranches: ' + e.message, 'danger', 6000);
      });
    } else {
      Utils.notify((T.isRTL() ? 'تم حفظ إعدادات الطابع' : 'Paramètres timbre enregistrés'), 'success');
    }
  },

  _resetTimbre() {
    const def = DB._defaultSettings();
    DB.saveSettings({ timbreRate: def.timbreRate, timbrePerTranche: def.timbrePerTranche, timbreMin: def.timbreMin });
    localStorage.setItem('timbre_slabs_data', JSON.stringify([]));
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.saveTimbreSlabs([]).catch(() => {});
    }
    Utils.notify((T.isRTL() ? 'تمت إعادة تعيين الطابع' : 'Timbre réinitialisé'), 'success');
    App.loadModule('settings');
  },


  _tabAppear(s) {
    const cur = s.themeColor || "#006078";
    const dm  = s.themeMode  || "light";
    const presets = [
      {c:"#006078",n:"Teal Profond (défaut)"},{c:"#0ea5e9",n:"Bleu Ciel"},{c:"#2563eb",n:"Bleu Royal"},
      {c:"#7c3aed",n:"Violet"},{c:"#059669",n:"Émeraude"},{c:"#0f766e",n:"Sarcelle"},
      {c:"#d97706",n:"Ambre"},{c:"#dc2626",n:"Rouge"},{c:"#db2777",n:"Rose"},{c:"#475569",n:"Ardoise"},
    ];
    return `<div>
      <div class="form-group" style="margin-bottom:22px">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:12px">
          <i class="fas fa-palette" style="color:var(--primary);margin-right:6px"></i>Couleur principale
        </label>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">
          ${presets.map(p=>`<div title="${p.n}" onclick="SettingsModule._applyColor('${p.c}')"
            style="width:38px;height:38px;border-radius:50%;background:${p.c};cursor:pointer;
                   border:${cur===p.c?'4px solid #0f172a':'3px solid transparent'};
                   box-shadow:0 2px 10px rgba(0,0,0,.2);
                   transform:${cur===p.c?'scale(1.2)':'scale(1)'};transition:transform .15s"
            onmouseover="this.style.transform='scale(1.15)'"
            onmouseout="this.style.transform='${cur===p.c?'scale(1.2)':'scale(1)'}'"
          ></div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="color" id="sColor" value="${cur}"
            style="width:46px;height:40px;cursor:pointer;border-radius:8px;border:1px solid var(--border)"
            oninput="SettingsModule._applyColor(this.value)">
          <span style="font-size:12px;color:var(--text-muted)">Couleur personnalisée</span>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:22px">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:12px">
          <i class="fas fa-adjust" style="color:var(--primary);margin-right:6px"></i>Mode d&apos;affichage
        </label>
        <div style="display:flex;gap:10px">
          <div onclick="SettingsModule._applyMode('light')"
            style="flex:1;padding:16px;border-radius:12px;text-align:center;cursor:pointer;transition:.2s;
                   border:2px solid ${dm==='light'?'var(--primary)':'var(--border)'};
                   background:${dm==='light'?'var(--primary-light)':'var(--surface)'}">
            <div style="font-size:26px;margin-bottom:6px">☀️</div>
            <div style="font-weight:700;color:${dm==='light'?'var(--primary)':'var(--text)'}">Clair</div>
          </div>
          <div onclick="SettingsModule._applyMode('dark')"
            style="flex:1;padding:16px;border-radius:12px;text-align:center;cursor:pointer;transition:.2s;
                   border:2px solid ${dm==='dark'?'var(--primary)':'var(--border)'};
                   background:${dm==='dark'?'var(--primary-light)':'var(--surface)'}">
            <div style="font-size:26px;margin-bottom:6px">🌙</div>
            <div style="font-weight:700;color:${dm==='dark'?'var(--primary)':'var(--text)'}">Sombre</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="SettingsModule._resetAppear()">
          <i class="fas fa-undo"></i> Réinitialiser
        </button>
      </div>
    </div>`;
  },

  _applyColor(color) {
    const hex = color.replace("#","");
    const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--primary-rgb", `${r},${g},${b}`);
    if (document.getElementById("sColor")) document.getElementById("sColor").value = color;
    DB.saveSettings({ themeColor: color });
    App.loadModule("settings");
  },
  _applyMode(mode) {
    DB.saveSettings({ themeMode: mode });
    document.body.setAttribute("data-theme", mode);
    App.loadModule("settings");
  },
  _resetAppear() {
    DB.saveSettings({ themeColor: "#006078", themeMode: "light" });
    document.documentElement.style.setProperty("--primary", "#006078");
    document.documentElement.style.setProperty("--primary-rgb", "0,96,120");
    document.body.removeAttribute("data-theme");
    App.loadModule("settings");
  },
  _saveAppear() {
    const color = document.getElementById('sColor')?.value||'#0ea5e9';
    const mode = document.getElementById('sMode')?.value||'light';
    DB.saveSettings({ themeColor:color, themeMode:mode });
    UI.applyTheme();
    Utils.notify((T.isRTL()?'تم حفظ المظهر':'Apparence enregistrée'), 'success');
  },

  _tabData() {
    const isAR = T.isRTL();
    const hasAPI = typeof window.API !== 'undefined';

    return `<div style="display:flex;flex-direction:column;gap:16px">

    <!-- ── SECTION 1: SERVER BACKUPS (only when hosted) ── -->
    ${hasAPI ? `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden">
      <div style="padding:14px 18px;background:rgba(59,130,246,.06);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div style="width:30px;height:30px;border-radius:8px;background:#3b82f6;display:flex;align-items:center;justify-content:center">
          <i class="fas fa-cloud" style="color:#fff;font-size:13px"></i>
        </div>
        <span style="font-size:13px;font-weight:800;color:var(--text)">${isAR ? 'السحابة — النسخ الاحتياطية' : 'Sauvegardes Cloud (MongoDB)'}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="SettingsModule._cleanDuplicates()" style="color:#f59e0b;border-color:rgba(245,158,11,.35)" title="${isAR ? 'حذف المكررات' : 'Supprimer les doublons'}">
            <i class="fas fa-broom"></i> ${isAR ? 'تنظيف' : 'Dédupliquer'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="SettingsModule._resetAllData()" style="color:#ef4444;border-color:rgba(239,68,68,.35)" title="${isAR ? 'حذف كل البيانات' : 'Effacer toutes les données'}">
            <i class="fas fa-skull-crossbones"></i> ${isAR ? 'إعادة ضبط كامل' : 'Reset TOUT'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="SettingsModule._loadBackups()" id="btn-refresh-backups">
            <i class="fas fa-sync-alt"></i> ${isAR ? 'تحديث' : 'Actualiser'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="SettingsModule._createManualBackup()">
            <i class="fas fa-plus"></i> ${isAR ? 'نسخة يدوية' : 'Sauvegarde manuelle'}
          </button>
        </div>
      </div>
      <div id="backups-container" style="padding:16px;min-height:80px;display:flex;align-items:center;justify-content:center">
        <div style="color:var(--text4);font-size:12px">
          <i class="fas fa-cloud-download-alt" style="font-size:24px;display:block;text-align:center;margin-bottom:8px;opacity:.4"></i>
          ${isAR ? 'اضغط «تحديث» لتحميل النسخ الاحتياطية' : 'Cliquez «Actualiser» pour charger les sauvegardes'}
        </div>
      </div>
      <div style="padding:10px 18px;border-top:1px solid var(--border);background:var(--bg3)">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text4)">
          <i class="fas fa-info-circle" style="color:#3b82f6"></i>
          ${isAR ? 'نسخة تلقائية كل ليلة 23:59 — تُحفظ لمدة 30 يوماً ثم تُحذف تلقائياً' : 'Sauvegarde automatique chaque nuit à 23h59 — conservée 30 jours puis supprimée automatiquement'}
        </div>
      </div>
    </div>

    <!-- ── MIGRATION TOOL ── -->
    <div style="background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(139,92,246,.02));border:1.5px solid rgba(139,92,246,.25);border-radius:16px;padding:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:30px;height:30px;border-radius:8px;background:#8b5cf6;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas fa-database" style="color:#fff;font-size:13px"></i>
        </div>
        <div>
          <div style="font-weight:800;font-size:13px;color:var(--text)">${isAR ? 'ترحيل البيانات المحلية → السحابة' : 'Migrer données locales → Cloud'}</div>
          <div style="font-size:11px;color:var(--text4)">${isAR ? 'انقل كل بياناتك الموجودة إلى MongoDB دفعة واحدة' : 'Envoyez toutes vos données existantes vers MongoDB en un clic'}</div>
        </div>
      </div>
      <button class="btn btn-sm" onclick="SettingsModule._migrateLocalToCloud()" style="background:#8b5cf6;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:12px;cursor:pointer">
        <i class="fas fa-cloud-upload-alt"></i> ${isAR ? 'ترحيل الآن' : 'Migrer maintenant'}
      </button>
    </div>
    ` : `
    <!-- ── NO API: Info banner ── -->
    <div style="background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-radius:12px;padding:14px;display:flex;gap:10px">
      <i class="fas fa-info-circle" style="color:#f59e0b;margin-top:2px;flex-shrink:0"></i>
      <div style="font-size:12px;color:var(--text3)">
        <strong>${isAR ? 'وضع محلي' : 'Mode local'}</strong><br>
        ${isAR ? 'السحابة غير متوفرة. النسخ الاحتياطية السحابية تعمل فقط بعد النشر على Render.com' : 'Sauvegardes cloud disponibles uniquement après déploiement sur Render.com'}
      </div>
    </div>
    `}

    <!-- ── SECTION 2: LOCAL JSON EXPORT / IMPORT ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--success);margin-bottom:8px">
          <i class="fas fa-download"></i> ${T.get('set_export')}
        </div>
        <p style="color:var(--text4);font-size:11px;margin-bottom:10px">${isAR ? 'تنزيل كل البيانات JSON' : 'Télécharger toutes les données en JSON'}</p>
        <button class="btn btn-success btn-sm" onclick="SettingsModule._exportData()" style="width:100%">
          <i class="fas fa-download"></i> ${T.get('set_export')}
        </button>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--warning);margin-bottom:8px">
          <i class="fas fa-upload"></i> ${T.get('set_import')}
        </div>
        <p style="color:var(--text4);font-size:11px;margin-bottom:10px">${isAR ? 'استيراد من ملف JSON' : 'Importer depuis un fichier JSON'}</p>
        <label style="display:block;margin-bottom:8px">
          <input type="file" id="importFile" accept=".json" style="font-size:11px;color:var(--text3);width:100%">
        </label>
        <button class="btn btn-warning btn-sm" onclick="SettingsModule._importData()" style="width:100%">
          <i class="fas fa-upload"></i> ${T.get('set_import')}
        </button>
      </div>
    </div>

    <!-- ── SECTION 3: DANGER ZONE ── -->
    <div style="background:rgba(239,68,68,.04);border:1.5px solid rgba(239,68,68,.2);border-radius:14px;padding:16px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--danger);margin-bottom:8px">
        <i class="fas fa-exclamation-triangle"></i> ${T.get('set_reset_all')}
      </div>
      <p style="color:var(--text4);font-size:11px;margin-bottom:10px">⚠️ ${isAR ? 'حذف جميع البيانات من قاعدة البيانات والخادم نهائياً' : 'Supprime TOUTES les données du serveur et localement. Action irréversible.'}</p>
      <button class="btn btn-danger btn-sm" onclick="SettingsModule._resetAllData()">
        <i class="fas fa-skull-crossbones"></i> ${isAR ? 'حذف كل شيء' : 'SUPPRIMER TOUT'}
      </button>
    </div>

    </div>`;
  },

  // ── Load backups from server ────────────────────────────────────
  async _loadBackups() {
    const container = document.getElementById('backups-container');
    const btn = document.getElementById('btn-refresh-backups');
    if (!container || !window.API) return;

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    container.innerHTML = `<div style="color:var(--text4);font-size:12px;text-align:center"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>`;

    try {
      const backups = await API.listBackups();
      const isAR = T.isRTL();

      if (!backups || !backups.length) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text4);font-size:12px">
          <i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
          ${isAR ? 'لا توجد نسخ احتياطية بعد' : 'Aucune sauvegarde pour l\'instant'}
        </div>`;
        return;
      }

      const rows = backups.map(b => {
        const date = new Date(b.createdAt).toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' });
        const expires = new Date(b.expiresAt).toLocaleDateString('fr-FR');
        const isAuto = b.type === 'auto';
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg);margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:7px;background:${isAuto ? 'rgba(59,130,246,.15)' : 'rgba(139,92,246,.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${isAuto ? 'fa-robot' : 'fa-hand-paper'}" style="font-size:11px;color:${isAuto ? '#3b82f6' : '#8b5cf6'}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escHTML(b.label)}</div>
            <div style="font-size:10px;color:var(--text4)">${date} · ${isAR ? 'ينتهي' : 'Expire'}: ${expires}</div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button onclick="SettingsModule._restoreBackup('${b._id}', '${Utils.escHTML(b.label).replace(/'/g,'\\\'')}')"
              class="btn btn-xs" style="background:rgba(16,185,129,.1);color:var(--success);border:1px solid rgba(16,185,129,.2);border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer" title="Restaurer">
              <i class="fas fa-undo-alt"></i> ${isAR ? 'استعادة' : 'Restaurer'}
            </button>
            <button onclick="SettingsModule._deleteBackup('${b._id}')"
              class="btn btn-xs" style="background:rgba(239,68,68,.08);color:var(--danger);border:1px solid rgba(239,68,68,.15);border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer" title="Supprimer">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>`;
      }).join('');

      container.innerHTML = `<div style="max-height:320px;overflow-y:auto;padding:2px">${rows}</div>`;
    } catch (e) {
      container.innerHTML = `<div style="color:var(--danger);text-align:center;font-size:12px;padding:16px">
        <i class="fas fa-exclamation-circle"></i> ${e.message || 'Erreur de connexion serveur'}
      </div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualiser'; }
    }
  },

  // ── Create manual backup ────────────────────────────────────────
  async _createManualBackup() {
    if (!window.API) return;
    const label = await Dialog.prompt(
      T.isRTL() ? 'نسخة احتياطية جديدة' : 'Nouvelle sauvegarde',
      T.isRTL() ? 'اختر اسمًا لهذه النسخة الاحتياطية' : 'Choisissez un nom pour cette sauvegarde',
      { placeholder: `Manuel — ${new Date().toLocaleString('fr-DZ')}` }
    );
    if (label === null) return;
    try {
      Utils.notify(T.isRTL() ? 'جارٍ الإنشاء…' : 'Création en cours…', 'info');
      await API.createBackup(label || `Manuel — ${new Date().toLocaleString('fr-DZ')}`);
      Utils.notify(T.isRTL() ? '✅ تم إنشاء النسخة الاحتياطية' : '✅ Sauvegarde créée avec succès', 'success');
      this._loadBackups();
    } catch (e) {
      Utils.notify('Erreur: ' + e.message, 'error');
    }
  },

  // ── Restore a backup ───────────────────────────────────────────
  async _restoreBackup(id, label) {
    if (!window.API) return;
    const ok = await Dialog.confirm(
      T.isRTL() ? 'استعادة نسخة احتياطية' : 'Restaurer une sauvegarde',
      (T.isRTL()
        ? `استعادة من:\n"${label}"\n\nسيتم استبدال جميع البيانات الحالية.\nسيتم إنشاء نسخة أمان تلقائيًا.`
        : `Restaurer depuis:\n"${label}"\n\nCette action remplace TOUTES les données actuelles.\nUne sauvegarde de sécurité sera créée automatiquement.`),
      'warning'
    );
    if (!ok) return;
    try {
      Utils.notify(T.isRTL() ? 'جارٍ الاستعادة…' : 'Restauration en cours…', 'info');
      const result = await API.restoreBackup(id);
      Utils.notify('✅ ' + (result.message || 'Restauration réussie'), 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      Utils.notify('Erreur restauration: ' + e.message, 'error');
    }
  },

  // ── Delete a backup ────────────────────────────────────────────
  async _deleteBackup(id) {
    if (!window.API) return;
    const ok = await Dialog.confirm(
      T.isRTL() ? 'حذف النسخة الاحتياطية' : 'Supprimer la sauvegarde',
      T.isRTL() ? 'هل أنت متأكد من حذف هذه النسخة الاحتياطية؟' : 'Êtes-vous sûr de vouloir supprimer cette sauvegarde ?',
      'danger'
    );
    if (!ok) return;
    try {
      await API.deleteBackup(id);
      Utils.notify(T.isRTL() ? 'تم الحذف' : 'Sauvegarde supprimée', 'success');
      this._loadBackups();
    } catch (e) {
      Utils.notify('Erreur: ' + e.message, 'error');
    }
  },

  // ── One-click migrate localStorage → MongoDB ───────────────────
  async _migrateLocalToCloud() {
    if (!window.API) return;
    const ok = await Dialog.confirm(
      T.isRTL() ? 'نقل البيانات إلى السحابة' : 'Migrer vers le Cloud',
      T.isRTL()
        ? 'سيتم إرسال جميع بياناتك المحلية إلى MongoDB.\n\nيستخدم وضع upsert — لن يتم إنشاء أي نسخ مكررة.'
        : 'Cette opération va envoyer toutes vos données locales vers MongoDB.\n\nUtilise le mode upsert — aucun doublon ne sera créé.',
      'info'
    );
    if (!ok) return;
    try {
      Utils.notify('Migration en cours…', 'info');
      const COLS = ['users','brs','bls','suppliers','clients','caisse_admin','sessions','catalogue','history','audit_log'];
      let total = 0;
      for (const col of COLS) {
        const items = DB.getAll(col);
        if (items.length) {
          await API.bulkSync(col, items);
          total += items.length;
        }
      }
      const settings = DB.getSettings();
      await API.saveSettings(settings);
      Utils.notify(`✅ Migration terminée — ${total} documents envoyés`, 'success');
    } catch (e) {
      Utils.notify('Erreur migration: ' + e.message, 'error');
    }
  },

  // ── Clean duplicates already in MongoDB ────────────────────────
  async _cleanDuplicates() {
    if (!window.API) return;
    const ok = await Dialog.confirm(
      T.isRTL() ? 'تنظيف المكررات' : 'Nettoyer les doublons',
      T.isRTL()
        ? 'سيتم الاحتفاظ بالنسخة الأولى من كل مستند وحذف النسخ المكررة.'
        : 'Garde le premier exemplaire de chaque document et supprime les copies en double.',
      'warning'
    );
    if (!ok) return;
    const COLS = ['users','brs','bls','suppliers','clients','caisse_admin','sessions','catalogue','history','audit_log'];
    let totalRemoved = 0;
    Utils.notify('Nettoyage en cours…', 'info');
    for (const col of COLS) {
      try {
        const r = await window.API._req('POST', `/data/${col}/dedup`, {});
        if (r?.removed) totalRemoved += r.removed;
      } catch(e) { /* col might be empty */ }
    }
    if (totalRemoved > 0) {
      await window.API.syncCloudToLocal();
      App.reloadCurrent();
    }
    Utils.notify(`✅ Nettoyage terminé — ${totalRemoved} doublon(s) supprimé(s)`, totalRemoved > 0 ? 'success' : 'info');
  },

  // ── Full database reset — wipes ALL data from MongoDB ──────────
  async _resetAllData() {
    if (!window.API) {
      await Dialog.alert(
        T.isRTL() ? 'غير متاح' : 'Non disponible',
        T.isRTL() ? 'متاح فقط في وضع السحابة' : 'Disponible uniquement en mode cloud.',
        'info'
      );
      return;
    }

    // Step 1: serious warning
    const ok = await Dialog.confirm(
      '⚠️ ' + (T.isRTL() ? 'إعادة ضبط كامل' : 'RÉINITIALISATION TOTALE'),
      T.isRTL()
        ? 'سيتم حذف:\n• جميع سندات الاستلام والتسليم\n• جميع العملاء والموردين\n• جميع بيانات الصندوق\n• جميع المستخدمين\n• جميع الإعدادات\n\nسيتم إعادة إنشاء المسؤول فقط (admin/admin123).\n\nهل أنت متأكد؟'
        : 'Cela va SUPPRIMER:\n• Tous les BRs et BLs\n• Tous les clients et fournisseurs\n• Toute la caisse\n• Tous les utilisateurs et paramètres\n\nSeul l\'admin (admin / admin123) sera recréé.\n\nCette action est IRRÉVERSIBLE.',
      'danger'
    );
    if (!ok) return;

    // Step 2: require admin password
    const password = await Dialog.promptPassword(
      T.isRTL() ? 'تأكيد كلمة المرور' : 'Confirmation par mot de passe',
      T.isRTL() ? 'أدخل كلمة مرور المسؤول للتأكيد:' : 'Entrez le mot de passe administrateur pour confirmer:',
      { label: T.isRTL() ? 'كلمة المرور' : 'Mot de passe admin' }
    );
    if (password === null || !password) {
      Utils.notify(T.isRTL() ? 'تم الإلغاء' : 'Opération annulée', 'info');
      return;
    }

    try {
      Utils.notify(T.isRTL() ? 'جارٍ إعادة الضبط…' : 'Réinitialisation en cours…', 'info');
      console.log('[RESET] Sending reset request...');

      const result = await window.API._req('POST', '/admin/reset-all', { confirm: 'RESET_TOUT', password });
      console.log('[RESET] Server response:', result);

      // Handle null (401/token expired)
      if (!result) {
        Utils.notify('❌ Session expirée — reconnectez-vous et réessayez', 'error');
        return;
      }

      if (result.success) {
        console.log('[RESET] Success — clearing all localStorage...');
        // Nuclear option: clear EVERYTHING in localStorage
        localStorage.clear();
        
        await Dialog.alert(
          '✅ ' + (T.isRTL() ? 'تمت إعادة الضبط' : 'Base réinitialisée'),
          T.isRTL() ? 'تمت إعادة ضبط قاعدة البيانات بنجاح.\nتواصل مع مسؤول تكنولوجيا المعلومات للحصول على بيانات الدخول.' : 'Base de données réinitialisée avec succès.\nContactez votre administrateur IT pour les identifiants d\'accès.',
          'success'
        );
        location.reload();
      } else {
        Utils.notify('❌ ' + (result.error || 'Erreur inconnue'), 'error');
      }
    } catch(e) {
      console.error('[RESET] Error:', e);
      Utils.notify('❌ Erreur: ' + e.message, 'error');
    }
  },

};






// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// RECYCLE BIN MODULE (Admin only)
// ═══════════════════════════════════════════════════════════════
const RecycleBinModule = {
  _filter: 'all',

  render() {
    if (!Auth.isAdmin()) return `<div style="padding:60px;text-align:center;color:var(--text3)"><i class="fas fa-lock" style="font-size:48px;opacity:.2;display:block;margin-bottom:12px"></i>${T.isRTL()?'للمسؤول فقط':'Réservé à l\'administrateur'}</div>`;
    const isAR = T.isRTL();
    const all = DB.getAll('recycle_bin').slice().reverse();
    const filter = this._filter || 'all';
    const items = filter === 'all' ? all : all.filter(e => e.collection === filter);
    const collections = [...new Set(all.map(e=>e.collection))];
    const pending = all.filter(e=>!e.restored).length;
    const restored = all.filter(e=>e.restored).length;

    const colLabel = { brs:'BR', bls:'BL', suppliers:isAR?'مورد':'Fournisseur', clients:isAR?'زبون':'Client', articles:isAR?'مادة':'Article', drivers:isAR?'سائق':'Chauffeur', users:isAR?'مستخدم':'Utilisateur' };
    const colIcon  = { brs:'fa-file-import', bls:'fa-file-export', suppliers:'fa-building', clients:'fa-user-tie', articles:'fa-boxes', drivers:'fa-truck', users:'fa-user-circle' };
    const colGrad  = { brs:'135deg,#1d4ed8,#3b82f6', bls:'135deg,#6d28d9,#8b5cf6', suppliers:'135deg,#0369a1,#0ea5e9', clients:'135deg,#065f46,#10b981', articles:'135deg,#92400e,#f59e0b', drivers:'135deg,#3730a3,#6366f1', users:'135deg,#991b1b,#ef4444' };

    const filterTabs = ['all',...collections].map(c => {
      const cnt = c==='all' ? all.length : all.filter(e=>e.collection===c).length;
      const active = filter === c;
      return `<button onclick="RecycleBinModule._filter='${c}';App.loadModule('recycle_bin')"
        style="padding:7px 14px;border-radius:20px;border:1.5px solid ${active?'var(--primary)':'var(--border)'};
               background:${active?'var(--primary)':'transparent'};color:${active?'#fff':'var(--text3)'};
               font-size:12px;font-weight:600;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:6px">
        <i class="fas ${colIcon[c]||'fa-layer-group'}" style="font-size:10px"></i>
        ${c==='all'?(isAR?'الكل':'Tout'):(colLabel[c]||c)}
        <span style="background:${active?'rgba(255,255,255,.25)':'var(--bg2)'};color:${active?'#fff':'var(--text3)'};border-radius:10px;padding:1px 7px;font-size:10px">${cnt}</span>
      </button>`;
    }).join('');

    const cards = items.map(e => {
      const item = e.item || {};
      const col  = e.collection;
      const grad = colGrad[col] || '135deg,var(--primary),var(--primary)';
      const icon = colIcon[col] || 'fa-file';
      const lbl  = colLabel[col] || col;
      const name = item.ref || item.name || item.username || `#${item.id||'?'}`;
      const sub  = item.supplier || item.client || item.designation || item.totalTTC
        ? `${item.totalTTC?Utils.fmtCurrency(item.totalTTC):''} ${item.status?`· ${item.status}`:''}`
        : '';
      const done = e.restored;
      const dDate = Utils.fmtDateTime(e.deletedAt);

      const checked = RecycleBinModule._selected.has(e.id);

      return `<div style="background:var(--bg-card,var(--bg2));border:1px solid ${checked?'var(--primary)':'var(--border)'};border-radius:14px;overflow:hidden;
                         display:flex;flex-direction:column;transition:.2s;${done?'opacity:.5':''}
                         box-shadow:0 2px 8px rgba(0,0,0,.06)" class="rb-card">
        <!-- Top: color strip + checkbox -->
        <div style="height:5px;background:linear-gradient(${grad});position:relative">
          <input type="checkbox" id="rb-cb-${e.id}" ${checked?'checked':''}
            onchange="RecycleBinModule.toggleSelect(${e.id})"
            style="position:absolute;top:8px;${isAR?'left':'right'}:10px;width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
        </div>
        <div style="padding:16px 18px;flex:1;display:flex;flex-direction:column;gap:10px">
          <!-- Badge + name row -->
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(${grad});
                        display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas ${icon}" style="color:#fff;font-size:16px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
                          color:var(--text3);margin-bottom:2px">${lbl}</div>
              <div style="font-size:15px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                   title="${Utils.escHTML(name)}">${Utils.escHTML(name)}</div>
              ${sub ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${Utils.escHTML(sub)}</div>` : ''}
            </div>
            ${done ? `<span style="background:#d1fae5;color:#065f46;border-radius:8px;padding:3px 8px;font-size:10px;font-weight:700;white-space:nowrap"><i class="fas fa-check"></i> ${isAR?'مُسترجَع':'Restauré'}</span>` : ''}
          </div>
          <!-- Timeline info -->
          <div style="background:var(--bg,var(--bg3));border-radius:8px;padding:10px 12px">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3)">
              <i class="fas fa-trash-alt" style="color:#ef4444;font-size:10px"></i>
              <span>${isAR?'حُذف بواسطة':'Supprimé par'}: <strong style="color:var(--text)">${Utils.escHTML(e.deletedByName||'—')}</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3);margin-top:4px">
              <i class="fas fa-clock" style="color:var(--text3);font-size:10px"></i>
              <span>${dDate}</span>
            </div>
          </div>
        </div>
        <!-- Action footer -->
        <div style="padding:10px 18px;border-top:1px solid var(--border);background:var(--bg,rgba(0,0,0,.02));display:flex;gap:8px">
          ${done
            ? `<div style="font-size:11px;color:var(--text3);text-align:center;width:100%"><i class="fas fa-check-circle" style="color:#10b981"></i> ${isAR?'تمت الاستعادة':'Déjà restauré'}</div>`
            : `<button onclick="RecycleBinModule.restore(${e.id})"
                 style="flex:1;padding:7px;border-radius:8px;border:none;background:var(--primary);color:#fff;
                        font-size:11px;font-weight:700;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;gap:5px"
                 onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                <i class="fas fa-undo"></i> ${T.get('rb_restore')}
              </button>`
          }
          <button onclick="RecycleBinModule.permanentDelete(${e.id})"
            style="padding:7px 12px;border-radius:8px;border:1px solid rgba(239,68,68,.3);background:transparent;
                   color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:4px"
            onmouseover="this.style.background='rgba(239,68,68,.08)'" onmouseout="this.style.background='transparent'">
            <i class="fas fa-fire-alt" style="font-size:10px"></i>
          </button>
        </div>
      </div>`;
    }).join('');

    return `<div style="padding:28px;max-width:1400px;margin:0 auto" ${isAR?'dir="rtl"':''}>
      <style>
        .rb-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12)!important}
        @keyframes rbFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .rb-card{animation:rbFadeIn .25s ease both}
      </style>

      <!-- ─── HEADER ─── -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:28px">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#dc2626,#ef4444);
                        display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(239,68,68,.3)">
              <i class="fas fa-trash-restore" style="color:#fff;font-size:20px"></i>
            </div>
            <div>
              <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">${isAR?'سلة المحذوفات':'Corbeille'}</h2>
              <p style="margin:2px 0 0;font-size:12px;color:var(--text3)">${isAR?'أرشيف العناصر المحذوفة — للمسؤول فقط':'Historique des suppressions — admin uniquement'}</p>
            </div>
          </div>
        </div>
        <!-- Stats chips -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:8px 14px;font-size:12px">
            <i class="fas fa-trash" style="color:#ef4444"></i> <strong>${all.length}</strong> ${isAR?'عنصر':'éléments'}
          </div>
          <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:8px 14px;font-size:12px">
            <i class="fas fa-clock" style="color:#f59e0b"></i> <strong>${pending}</strong> ${isAR?'قابل للاستعادة':'restaurables'}
          </div>
          <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:8px 14px;font-size:12px">
            <i class="fas fa-check" style="color:#10b981"></i> <strong>${restored}</strong> ${isAR?'مستعاد':'restaurés'}
          </div>
          ${all.length ? `<button onclick="RecycleBinModule.emptyBin()"
            style="padding:8px 16px;border-radius:10px;border:1.5px solid rgba(239,68,68,.4);background:transparent;
                   color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;transition:.15s"
            onmouseover="this.style.background='rgba(239,68,68,.08)'" onmouseout="this.style.background='transparent'">
            <i class="fas fa-fire-alt"></i> ${isAR?'تفريغ نهائي':'Vider définitivement'}
          </button>` : ''}
        </div>
      </div>

      <!-- ─── FILTER TABS + SELECT ALL ─── -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;align-items:center">
        ${filterTabs}
        ${items.length ? `<button onclick="RecycleBinModule.selectAll()"
          style="margin-left:auto;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;
                 color:var(--text3);font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">
          <i class="fas fa-check-double" style="font-size:10px"></i> ${isAR?'تحديد الكل':'Tout sélectionner'}
        </button>` : ''}
      </div>

      <!-- ─── CARDS GRID ─── -->
      ${!items.length
        ? `<div style="text-align:center;padding:80px 40px;color:var(--text3)">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <i class="fas fa-leaf" style="font-size:36px;color:var(--text3);opacity:.3"></i>
            </div>
            <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px">${isAR?'السلة فارغة':'Corbeille vide'}</div>
            <div style="font-size:13px">${isAR?'لم يتم حذف أي عنصر بعد':'Aucun élément supprimé pour le moment'}</div>
           </div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${cards}</div>`
      }

      <!-- ─── BULK ACTION BAR (visible when items selected) ─── -->
      <div id="rb-bulk-bar" style="display:none;position:sticky;bottom:20px;margin-top:20px;padding:14px 20px;
           background:var(--bg-card,var(--bg2));border:2px solid var(--primary);border-radius:14px;
           box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:10;
           display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span id="rb-sel-count" style="font-weight:800;color:var(--primary);font-size:14px"></span>
        <button onclick="RecycleBinModule.permanentDeleteSelected()"
          style="padding:8px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">
          <i class="fas fa-fire-alt"></i> ${isAR?'حذف نهائي للمحددين':'Suppr. définitive'}
        </button>
        <button onclick="RecycleBinModule.clearSelection()"
          style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:12px;cursor:pointer">
          ${isAR?'إلغاء التحديد':'Désélectionner'}
        </button>
      </div>
    </div>`;
  },

  _selected: new Set(),

  toggleSelect(binId) {
    if (this._selected.has(binId)) this._selected.delete(binId);
    else this._selected.add(binId);
    this._updateBulkBar();
    // Toggle checkbox visual
    const cb = document.getElementById(`rb-cb-${binId}`);
    if (cb) cb.checked = this._selected.has(binId);
  },

  selectAll() {
    const all = DB.getAll('recycle_bin');
    const filter = this._filter || 'all';
    const items = filter === 'all' ? all : all.filter(e => e.collection === filter);
    const allSelected = items.every(e => this._selected.has(e.id));
    if (allSelected) {
      items.forEach(e => this._selected.delete(e.id));
    } else {
      items.forEach(e => this._selected.add(e.id));
    }
    // Refresh checkboxes
    items.forEach(e => {
      const cb = document.getElementById(`rb-cb-${e.id}`);
      if (cb) cb.checked = this._selected.has(e.id);
    });
    this._updateBulkBar();
  },

  clearSelection() {
    this._selected.clear();
    document.querySelectorAll('[id^="rb-cb-"]').forEach(cb => cb.checked = false);
    this._updateBulkBar();
  },

  _updateBulkBar() {
    const bar = document.getElementById('rb-bulk-bar');
    const cnt = document.getElementById('rb-sel-count');
    if (!bar) return;
    const n = this._selected.size;
    bar.style.display = n > 0 ? 'flex' : 'none';
    if (cnt) cnt.textContent = T.isRTL() ? `${n} عنصر محدد` : `${n} sélectionné(s)`;
  },

  async restore(binId) {
    const isAR = T.isRTL();
    const ok = await Dialog.confirm(isAR?'استعادة العنصر':'Restaurer l\'élément', T.get('rb_confirm_restore'), 'warning');
    if (!ok) return;

    const result = DB.restoreFromBin(binId);
    if (!result.ok) { Utils.notify(result.error || T.get('rb_already'), 'error'); return; }

    if (result.refWarning) {
      const { oldRef, newRef } = result.refWarning;
      await Dialog.confirm(
        isAR ? '⚠️ تعارض المرجع' : '⚠️ Conflit de référence',
        `${T.get('rb_ref_taken')} <strong>${newRef}</strong>\n\n${isAR?`المرجع الأصلي "${oldRef}" مشغول — تم تعيين مرجع جديد تلقائياً.`:
          `La référence originale "${oldRef}" est déjà utilisée.\nUn nouveau numéro a été attribué automatiquement : ${newRef}`}`,
        'warning',
        [isAR?'فهمت':'Compris']
      );
    }

    Utils.notify(T.get('rb_restored'), 'success');
    this._selected.delete(binId);
    App.loadModule('recycle_bin');
  },

  // Permanently delete ONE item from recycle bin (cannot be restored)
  async permanentDelete(binId) {
    const isAR = T.isRTL();
    const ok = await Dialog.confirm(
      isAR?'حذف نهائي':'Suppression définitive',
      isAR?'هذا العنصر سيُحذف نهائياً ولا يمكن استعادته. متأكد؟':
           'Cet élément sera définitivement supprimé et ne pourra plus être restauré. Confirmer ?',
      'danger'
    );
    if (!ok) return;
    this._permaDeleteIds([binId]);
    Utils.notify(isAR?'تم الحذف النهائي':'Supprimé définitivement', 'success');
    App.loadModule('recycle_bin');
  },

  // Permanently delete all SELECTED items
  async permanentDeleteSelected() {
    if (!this._selected.size) return;
    const isAR = T.isRTL();
    const n = this._selected.size;
    const ok = await Dialog.confirm(
      isAR?'حذف نهائي':'Suppression définitive',
      isAR?`حذف ${n} عنصر(عناصر) نهائياً؟ لا يمكن التراجع.`:
           `Supprimer définitivement ${n} élément(s) ? Cette action est irréversible.`,
      'danger'
    );
    if (!ok) return;
    this._permaDeleteIds([...this._selected]);
    this._selected.clear();
    Utils.notify(isAR?`تم حذف ${n} عنصر نهائياً`:`${n} élément(s) supprimé(s) définitivement`, 'success');
    App.loadModule('recycle_bin');
  },

  // Internal: remove specific IDs from recycle_bin + cloud
  _permaDeleteIds(ids) {
    const idSet = new Set(ids.map(Number));
    const bin = DB.getAll('recycle_bin');
    const toRemove = bin.filter(e => idSet.has(Number(e.id)));
    const remaining = bin.filter(e => !idSet.has(Number(e.id)));

    // NOTE: Caisse history is NEVER deleted — audit trail stays intact.

    DB.rawSet('recycle_bin', remaining);
    // Cloud: remove from server
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      toRemove.forEach(e => window.API.remove('recycle_bin', e.id).catch(() => {}));
    }
  },

  async emptyBin() {
    const isAR = T.isRTL();
    const ok = await Dialog.confirm(
      isAR?'تفريغ السلة':'Vider la corbeille',
      isAR?'هذا سيزيل جميع العناصر المحذوفة نهائياً. هل أنت متأكد؟':
           'Ceci supprimera définitivement tous les éléments de la corbeille. Confirmer ?',
      'danger'
    );
    if (!ok) return;
    // Read BEFORE clearing so we can cloud-delete
    const toRemove = DB.getAll('recycle_bin');
    // NOTE: Caisse history is NEVER deleted — audit trail stays intact.
    DB.rawSet('recycle_bin', []);
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      toRemove.forEach(e => window.API.remove('recycle_bin', e.id).catch(() => {}));
    }
    this._selected.clear();
    Utils.notify(isAR?'تم تفريغ السلة':'Corbeille vidée', 'success');
    App.loadModule('recycle_bin');
  }
};

// ═══════════════════════════════════════════════════════════════
// AUDIT MODULE
// ═══════════════════════════════════════════════════════════════
const AuditModule = {

  _filters: { q:'', collection:'all', action:'all', dateFrom:'', dateTo:'', userId:'all' },
  
  exportHistoryXLSX() {
    const isAR = T.isRTL();
    const { q, collection, action, dateFrom, dateTo, userId } = this._filters;
    let entries = DB.getAll('history').reverse();
    
    if (q) { const ql=q.toLowerCase(); entries=entries.filter(e=>(e.userName+' '+e.action+' '+e.col+' '+e.note).toLowerCase().includes(ql)); }
    if (collection!=='all') entries=entries.filter(e=>e.col===collection);
    if (action!=='all') entries=entries.filter(e=>e.action===action);
    if (dateFrom) entries=entries.filter(e=>(e.ts||'')>=dateFrom);
    if (dateTo) entries=entries.filter(e=>(e.ts||'')<=dateTo);
    if (userId!=='all') entries=entries.filter(e=>String(e.userId)===String(userId));

    const rows = entries.map(e => [
      Utils.fmtDateTime(e.ts)||'',
      e.userName||'-',
      e.action||'',
      e.col||'',
      e.docId||'',
      e.note||''
    ]);
    
    if(typeof exportXLSX !== 'undefined') {
      exportXLSX(
        [isAR?'التاريخ':'Date', isAR?'المستخدم':'Utilisateur', isAR?'الإجراء':'Action', isAR?'القسم':'Section', isAR?'المعرف':'ID', isAR?'التفاصيل':'Détails'],
        rows,
        'Historique_Global_' + new Date().toISOString().slice(0,10)
      );
    } else {
      Utils.notify('SheetJS non chargé', 'warning');
    }
  },

  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> ${T.isRTL()?"وصول المسؤول فقط":"Accès administrateur"}</div></div>`;
    const { q, collection, action, dateFrom, dateTo, userId } = this._filters;
    let entries = DB.getAll('history').reverse();
    
    if (q) { const ql=q.toLowerCase(); entries=entries.filter(e=>(e.userName+' '+e.action+' '+e.col+' '+e.note).toLowerCase().includes(ql)); }
    if (collection!=='all') entries=entries.filter(e=>e.col===collection);
    if (action!=='all') entries=entries.filter(e=>e.action===action);
    if (dateFrom) entries=entries.filter(e=>(e.ts||'')>=dateFrom);
    if (dateTo) entries=entries.filter(e=>(e.ts||'')<=dateTo);
    if (userId!=='all') entries=entries.filter(e=>String(e.userId)===String(userId));
    
    const totalCount = entries.length;
    entries = entries.slice(0, 300); // Display limit for performance

    const users = DB.getAll('users');
    const isAR = T.isRTL();
    const actionColors = { CREATE:'badge-success', UPDATE:'badge-warning', DELETE:'badge-danger' };
    
    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-history"></i> ${isAR?'السجل الشامل':'Historique Global'}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${entries.length} / ${totalCount}</span>
          <button class="btn btn-outline btn-sm" onclick="AuditModule.exportHistoryXLSX()" title="Export Excel"><i class="fas fa-file-excel" style="color:#1d6f42"></i> Excel</button>
        </div>
      </div>
      <div class="filters-bar" style="flex-wrap:wrap;gap:8px">
        <div class="filter-group">
          <label>${T.isRTL()?"بحث":"Recherche"}</label>
          <input type="text" id="audit-search-input" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
            oninput="AuditModule._filters.q=this.value;App.reloadDebounced('audit')">
        </div>
        <div class="filter-group">
          <label>${T.get('aud_collection')}</label>
          <select onchange="AuditModule._filters.collection=this.value;App.loadModule('audit')">
            <option value="all">${T.get('all')}</option>
            <option value="brs" ${collection==='brs'?'selected':''}>Bons de Réception</option>
            <option value="bls" ${collection==='bls'?'selected':''}>Bons de Livraison</option>
            <option value="caisse_admin" ${collection==='caisse_admin'?'selected':''}>Caisse Principale</option>
            <option value="suppliers" ${collection==='suppliers'?'selected':''}>Fournisseurs</option>
            <option value="clients" ${collection==='clients'?'selected':''}>Clients</option>
            <option value="users" ${collection==='users'?'selected':''}>Utilisateurs</option>
            <option value="sessions" ${collection==='sessions'?'selected':''}>Sessions Caisse</option>
          </select>
        </div>
        <div class="filter-group">
          <label>${T.get('aud_action')}</label>
          <select onchange="AuditModule._filters.action=this.value;App.loadModule('audit')">
            <option value="all">${T.get('all')}</option>
            <option value="CREATE" ${action==='CREATE'?'selected':''}>${T.get('aud_create')}</option>
            <option value="UPDATE" ${action==='UPDATE'?'selected':''}>${T.get('aud_update')}</option>
            <option value="DELETE" ${action==='DELETE'?'selected':''}>${T.get('aud_delete')}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>${isAR?'المستخدم':'Utilisateur'}</label>
          <select onchange="AuditModule._filters.userId=this.value;App.loadModule('audit')">
            <option value="all">${T.get('all')}</option>
            ${users.map(u=>`<option value="${u.id}" ${String(userId)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${isAR?'من':'Du'}</label>
          <input type="date" value="${dateFrom}" onchange="AuditModule._filters.dateFrom=this.value;App.loadModule('audit')">
        </div>
        <div class="filter-group">
          <label>${isAR?'إلى':'Au'}</label>
          <input type="date" value="${dateTo}" onchange="AuditModule._filters.dateTo=this.value;App.loadModule('audit')">
        </div>
        <div class="filter-group" style="align-self:flex-end">
          <button class="btn btn-outline" onclick="AuditModule._filters={q:'',collection:'all',action:'all',dateFrom:'',dateTo:'',userId:'all'};App.loadModule('audit')" title="${T.isRTL()?'إعادة تعيين':'Réinitialiser'}"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${T.get('col_date')}</th>
            <th>${T.get('aud_by')}</th>
            <th>${T.get('aud_action')}</th>
            <th>${T.get('aud_collection')}</th>
            <th>${isAR?'التفاصيل':'Détails'}</th>
          </tr></thead>
          <tbody>
            ${entries.length ? entries.map(e=>`<tr>
              <td style="font-size:11px;white-space:nowrap;color:var(--text2)">${Utils.fmtDateTime(e.ts)}</td>
              <td style="font-weight:600">${Utils.escHTML(e.userName||'-')}</td>
              <td><span class="badge ${actionColors[e.action]||'badge-secondary'}">${e.action}</span></td>
              <td><code style="color:var(--primary)">${e.col} #${e.docId}</code></td>
              <td style="font-size:11px;color:var(--text3)">${Utils.escHTML(e.note||'-')}</td>
            </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-history"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  }
};
// Register modules
const Modules = {
  dashboard: DashboardModule, brs: BRModule, bls: BLModule, caisse: CaisseModule, admin_caisse: AdminCaisseModule,
  suppliers: SuppliersModule, clients: ClientsModule, catalogue: CatalogueModule, stats: StatsModule, users: UsersModule, eval: EvalModule,
  settings: SettingsModule, audit: AuditModule
};
window.Modules = Modules;


// ═══════════════════════════════════════════════════════════════
// BANK MODULE — Accounts, transfers, supplier payments
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// BANK MODULE — Full rework: accounts, deposits, transfers, supplier payments
// ═══════════════════════════════════════════════════════════════
const BankModule = {
  _filters: null,
  _page: 0,
  _activeBank: null, // bankId for detail view, null for overview

  // ── Auto-reference generator ─────────────────────────────────
  _ref(prefix) {
    const d = new Date();
    return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  },

  // ── Balance calculator for one bank account ───────────────────
  _bankBalance(bankId) {
    const txs = DB.getAll('bank_transactions').filter(t => t.bankId === bankId);
    const dep = txs.filter(t => t.type === 'deposit').reduce((s,t) => s+(t.amount||0), 0);
    const out = txs.filter(t => t.type === 'payment').reduce((s,t) => s+(t.amount||0), 0);
    return { balance: dep - out, totalIn: dep, totalOut: out, txCount: txs.length };
  },

  render() {
    if (!Auth.isAdmin() && !Auth.can('canViewBank'))
      return `<div class="empty-state"><i class="fas fa-lock" style="font-size:40px;color:var(--text4)"></i><p>Accès non autorisé</p></div>`;

    if (BankModule._activeBank) return BankModule._renderAccountDetail(BankModule._activeBank);

    if (!BankModule._filters) BankModule._filters = { bankId:'all', type:'all', dateFrom:'', dateTo:'', q:'' };
    if (typeof BankModule._page !== 'number') BankModule._page = 0;

    window.updateBankFilter = (k,v) => { BankModule._filters[k]=v; BankModule._page=0; App.loadModule('bank'); };
    window.setBankPage = p => { BankModule._page=p; App.loadModule('bank'); };

    const settings = DB.getSettings();
    const banks    = settings.banks || [];
    const allTxs   = DB.getAll('bank_transactions');
    const supPays  = DB.getAll('supplier_payments');

    // Per-account stats
    const accountStats = {};
    banks.forEach(b => { accountStats[b.id] = BankModule._bankBalance(b.id); });
    const grandTotal = Object.values(accountStats).reduce((s,v) => s + v.balance, 0);
    const grandIn    = Object.values(accountStats).reduce((s,v) => s + v.totalIn, 0);
    const grandOut   = Object.values(accountStats).reduce((s,v) => s + v.totalOut, 0);

    // Total paid to suppliers (across all bank accounts + caisse)
    const totalSupPaid = supPays.reduce((s,p) => s+(p.amount||0), 0);
    const totalBR      = DB.getAll('brs').reduce((s,b) => s+(b.totalTTC||0), 0);
    const totalDue     = Math.max(0, totalBR - totalSupPaid);

    // Filter transactions
    const f = BankModule._filters;
    let filteredTxs = allTxs.filter(t => {
      if (f.bankId !== 'all' && t.bankId !== f.bankId) return false;
      if (f.type   !== 'all' && t.type   !== f.type)   return false;
      if (f.dateFrom && (t.date||'') < f.dateFrom) return false;
      if (f.dateTo   && (t.date||'') > f.dateTo)   return false;
      if (f.q && !(t.note||'').toLowerCase().includes(f.q.toLowerCase()) &&
                !(t.ref||'').toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    });
    filteredTxs.sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.id - a.id);
    const totalTxs = filteredTxs.length;
    const limit = 25;
    const pages = Math.ceil(totalTxs / limit) || 1;
    if (BankModule._page >= pages) BankModule._page = Math.max(0, pages-1);
    const pageTxs = filteredTxs.slice(BankModule._page * limit, (BankModule._page+1) * limit);

    const supMap = {}; DB.getAll('suppliers').forEach(s => supMap[s.id]=s);

    const isAdmin = Auth.isAdmin();

    return `<div style="padding:24px;max-width:1300px;margin:0 auto">

  <!-- ── Header ── -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="font-size:22px;font-weight:900;margin:0;display:flex;align-items:center;gap:10px;color:var(--text)">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center">
          <i class="fas fa-university" style="color:#fff;font-size:18px"></i>
        </div>
        Comptes Bancaires
      </h2>
      <p style="font-size:13px;color:var(--text4);margin:6px 0 0 50px">Gérez vos dépôts, virements et paiements fournisseurs</p>
    </div>
    ${isAdmin ? `<div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;gap:6px" onclick="BankModule._depositExternal()">
        <i class="fas fa-plus-circle"></i> Dépôt Externe
      </button>
      <button class="btn" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border:none;gap:6px" onclick="BankModule._transferFromCaisse()">
        <i class="fas fa-exchange-alt"></i> Virement Caisse→Banque
      </button>
      <button class="btn" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;gap:6px" onclick="BankModule.paySupplierModal()">
        <i class="fas fa-hand-holding-usd"></i> Payer Fournisseur
      </button>
    </div>` : ''}
  </div>

  <!-- ── Global KPI strip ── -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px">
    ${[
      {label:'Solde Total Banque', val:Utils.fmtCurrency(grandTotal), icon:'fa-wallet', color:'#3b82f6', bg:'rgba(59,130,246,.1)'},
      {label:'Total Entrants',     val:Utils.fmtCurrency(grandIn),    icon:'fa-arrow-circle-down', color:'#10b981', bg:'rgba(16,185,129,.1)'},
      {label:'Total Sortants',     val:Utils.fmtCurrency(grandOut),   icon:'fa-arrow-circle-up',   color:'#ef4444', bg:'rgba(239,68,68,.1)'},
      {label:'Payé Fournisseurs',  val:Utils.fmtCurrency(totalSupPaid),icon:'fa-building',         color:'#f59e0b', bg:'rgba(245,158,11,.1)'},
      {label:'Reste à Payer',      val:Utils.fmtCurrency(totalDue),   icon:'fa-exclamation-circle', color:'#e11d48', bg:'rgba(225,29,72,.1)'},
    ].map(k=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text4);letter-spacing:.5px">${k.label}</span>
        <div style="width:30px;height:30px;border-radius:8px;background:${k.bg};display:flex;align-items:center;justify-content:center">
          <i class="fas ${k.icon}" style="color:${k.color};font-size:13px"></i>
        </div>
      </div>
      <div style="font-size:18px;font-weight:800;color:var(--text)">${k.val}</div>
    </div>`).join('')}
  </div>

  <!-- ── Account cards ── -->
  ${banks.length === 0
    ? `<div class="empty-state" style="margin-bottom:24px">
        <i class="fas fa-university" style="font-size:40px;color:var(--text4)"></i>
        <p>Aucun compte bancaire configuré</p>
        ${isAdmin ? `<button class="btn btn-primary" onclick="SettingsModule._tab='banks';App.loadModule('settings')"><i class="fas fa-cog"></i> Configurer</button>` : ''}
      </div>`
    : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:24px">
    ${banks.map(b => {
      const st = accountStats[b.id] || {balance:0,totalIn:0,totalOut:0,txCount:0};
      const pct = st.totalIn > 0 ? Math.round((st.totalOut/st.totalIn)*100) : 0;
      const sup = DB.getAll('supplier_payments').filter(p=>p.bankId===b.id).reduce((s,p)=>s+(p.amount||0),0);
      return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden"
        onclick="BankModule._activeBank='${b.id}';App.loadModule('bank')"
        onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='#3b82f6';this.style.boxShadow='0 8px 24px rgba(59,130,246,.15)'"
        onmouseleave="this.style.transform='';this.style.borderColor='var(--border)';this.style.boxShadow='none'">
        <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(59,130,246,.05)"></div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#3b82f6;margin-bottom:4px">${Utils.escHTML(b.bankName||'Banque')}</div>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:2px">${Utils.escHTML(b.name)}</div>
        ${b.accountNum ? `<div style="font-size:11px;color:var(--text4);font-family:monospace;margin-bottom:12px">${Utils.escHTML(b.accountNum)}</div>` : '<div style="margin-bottom:12px"></div>'}
        <div style="font-size:28px;font-weight:900;color:${st.balance>=0?'var(--text)':'#ef4444'};margin-bottom:16px">${Utils.fmtCurrency(st.balance)}</div>
        <!-- Progress bar: paid/deposited -->
        <div style="background:rgba(255,255,255,.06);border-radius:4px;height:4px;margin-bottom:12px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10b981,#ef4444);border-radius:4px;transition:width .3s"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
          <div style="text-align:center;background:rgba(16,185,129,.08);border-radius:8px;padding:6px">
            <div style="color:#10b981;font-weight:700">${Utils.fmtCurrency(st.totalIn)}</div>
            <div style="color:var(--text4);margin-top:2px">Déposé</div>
          </div>
          <div style="text-align:center;background:rgba(239,68,68,.08);border-radius:8px;padding:6px">
            <div style="color:#ef4444;font-weight:700">${Utils.fmtCurrency(st.totalOut)}</div>
            <div style="color:var(--text4);margin-top:2px">Sorti</div>
          </div>
        </div>
        ${isAdmin ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);display:flex;gap:6px">
          <button class="btn btn-xs" style="flex:1;background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2)" onclick="event.stopPropagation();BankModule._depositExternal('${b.id}')"><i class="fas fa-plus"></i> Dépôt</button>
          <button class="btn btn-xs" style="flex:1;background:rgba(139,92,246,.1);color:#8b5cf6;border:1px solid rgba(139,92,246,.2)" onclick="event.stopPropagation();BankModule.paySupplierModal('${b.id}')"><i class="fas fa-hand-holding-usd"></i> Payer</button>
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>`}

  <!-- ── Transaction history ── -->
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div style="font-weight:800;font-size:15px;color:var(--text)">Toutes les transactions <span style="font-size:12px;color:var(--text4);font-weight:400">(${totalTxs})</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="date" value="${f.dateFrom}" onchange="updateBankFilter('dateFrom',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:12px">
        <input type="date" value="${f.dateTo}" onchange="updateBankFilter('dateTo',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:12px">
        <select onchange="updateBankFilter('bankId',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:12px">
          <option value="all">Tous comptes</option>
          ${banks.map(b=>`<option value="${b.id}" ${f.bankId===b.id?'selected':''}>${Utils.escHTML(b.name)}</option>`).join('')}
        </select>
        <select onchange="updateBankFilter('type',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:12px">
          <option value="all">Tous types</option>
          <option value="deposit" ${f.type==='deposit'?'selected':''}>Entrants (+)</option>
          <option value="payment" ${f.type==='payment'?'selected':''}>Sortants (−)</option>
        </select>
        <input type="text" placeholder="🔍 Recherche..." value="${Utils.escHTML(f.q)}" onkeyup="if(event.key==='Enter')updateBankFilter('q',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:12px;min-width:150px">
        <button class="btn btn-xs" style="background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2)" onclick="BankModule.exportExcel()">
          <i class="fas fa-file-excel"></i> Excel
        </button>
      </div>
    </div>

    ${totalTxs === 0
      ? `<div style="padding:60px;text-align:center;color:var(--text4)"><i class="fas fa-inbox" style="font-size:36px;margin-bottom:12px;display:block"></i>Aucune transaction trouvée</div>`
      : `<div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Réf</th>
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Date</th>
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Compte</th>
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Type</th>
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Fournisseur</th>
            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Note</th>
            <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text4)">Montant</th>
            <th style="padding:12px 16px;width:80px"></th>
          </tr>
        </thead>
        <tbody>
          ${pageTxs.map((t,i) => {
            const bank = banks.find(x=>x.id===t.bankId);
            const sup  = t.supplierId ? supMap[t.supplierId] : null;
            const isD  = t.type === 'deposit';
            const subtypeLabel = {
              transfer_from_caisse: '🔄 Virement Caisse',
              external_deposit:     '💵 Dépôt Externe',
              supplier_payment:     '🏭 Paiement Fournisseur',
              correction:           '✏️ Correction',
            }[t.subtype] || (isD ? '➕ Entrée' : '➖ Sortie');
            return `<tr style="border-bottom:1px solid var(--border);transition:background .15s" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
              <td style="padding:11px 16px;font-family:monospace;font-size:11px;color:var(--text4)">${Utils.escHTML(t.ref||'—')}</td>
              <td style="padding:11px 16px;color:var(--text2)">${t.date||'—'}</td>
              <td style="padding:11px 16px;font-weight:700;color:var(--text)">${Utils.escHTML(bank?.name||'?')}</td>
              <td style="padding:11px 16px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${isD?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'};color:${isD?'#10b981':'#ef4444'}">${subtypeLabel}</span></td>
              <td style="padding:11px 16px;color:var(--text2)">${sup ? Utils.escHTML(sup.name) : '—'}</td>
              <td style="padding:11px 16px;color:var(--text3);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.escHTML(t.note||'')}">${Utils.escHTML(t.note||'—')}</td>
              <td style="padding:11px 16px;text-align:right;font-weight:800;font-size:14px;color:${isD?'#10b981':'#ef4444'}">${isD?'+':'−'}${Utils.fmtCurrency(t.amount||0)}</td>
              <td style="padding:11px 16px;text-align:right">
                <button title="Décharge PDF" style="background:transparent;border:none;color:var(--text4);cursor:pointer;padding:4px 6px;border-radius:6px;transition:all .15s" onclick="BankModule._printDecharge(${t.id})" onmouseenter="this.style.background='rgba(59,130,246,.1)';this.style.color='#3b82f6'" onmouseleave="this.style.background='transparent';this.style.color='var(--text4)'"><i class="fas fa-file-pdf"></i></button>
                ${isAdmin ? `<button title="Corriger" style="background:transparent;border:none;color:var(--text4);cursor:pointer;padding:4px 6px;border-radius:6px;transition:all .15s" onclick="BankModule._correctTx(${t.id})" onmouseenter="this.style.background='rgba(245,158,11,.1)';this.style.color='#f59e0b'" onmouseleave="this.style.background='transparent';this.style.color='var(--text4)'"><i class="fas fa-edit"></i></button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${pages > 1 ? `<div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:12px;color:var(--text4)">Page ${BankModule._page+1} / ${pages} — ${totalTxs} transaction(s)</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-xs" onclick="setBankPage(${BankModule._page-1})" ${BankModule._page===0?'disabled':''}>‹ Préc.</button>
        <button class="btn btn-xs" onclick="setBankPage(${BankModule._page+1})" ${BankModule._page>=pages-1?'disabled':''}>Suiv. ›</button>
      </div>
    </div>` : ''}
    `}
  </div>
</div>`;
  },

  // ── Per-account detail view ───────────────────────────────────
  _renderAccountDetail(bankId) {
    const settings = DB.getSettings();
    const bank = (settings.banks||[]).find(b=>b.id===bankId);
    if (!bank) { BankModule._activeBank=null; App.loadModule('bank'); return ''; }

    const txs = DB.getAll('bank_transactions').filter(t=>t.bankId===bankId);
    txs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id);
    const st  = BankModule._bankBalance(bankId);

    const supPaysForBank = DB.getAll('supplier_payments').filter(p=>p.bankId===bankId);
    const supMap = {}; DB.getAll('suppliers').forEach(s=>supMap[s.id]=s);

    const isAdmin = Auth.isAdmin();

    return `<div style="padding:24px;max-width:1100px;margin:0 auto">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
    <button class="btn btn-xs" style="background:var(--bg2);border:1px solid var(--border);color:var(--text)" onclick="BankModule._activeBank=null;App.loadModule('bank')">
      <i class="fas fa-arrow-left"></i> Retour
    </button>
    <h2 style="font-size:20px;font-weight:900;margin:0;color:var(--text)">${Utils.escHTML(bank.bankName||'Banque')} — ${Utils.escHTML(bank.name)}</h2>
    ${bank.accountNum?`<span style="font-family:monospace;font-size:12px;background:var(--bg3);padding:4px 10px;border-radius:8px;color:var(--text4)">${Utils.escHTML(bank.accountNum)}</span>`:''}
  </div>

  <!-- KPIs -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
    ${[
      {label:'Solde Actuel',   val:Utils.fmtCurrency(st.balance),  color:st.balance>=0?'#3b82f6':'#ef4444', icon:'fa-scale-balanced'},
      {label:'Total Entrants', val:Utils.fmtCurrency(st.totalIn),  color:'#10b981', icon:'fa-arrow-circle-down'},
      {label:'Total Sortants', val:Utils.fmtCurrency(st.totalOut), color:'#ef4444', icon:'fa-arrow-circle-up'},
      {label:'Payé Fournisseurs', val:Utils.fmtCurrency(supPaysForBank.reduce((s,p)=>s+p.amount,0)), color:'#f59e0b', icon:'fa-building'},
      {label:'Transactions',   val:st.txCount, color:'#8b5cf6', icon:'fa-list'},
    ].map(k=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text4);letter-spacing:.5px;margin-bottom:6px">${k.label}</div>
      <div style="font-size:20px;font-weight:900;color:${k.color}">${k.val}</div>
    </div>`).join('')}
  </div>

  ${isAdmin ? `<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
    <button class="btn" style="background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.3)" onclick="BankModule._depositExternal('${bankId}')"><i class="fas fa-plus"></i> Dépôt Externe</button>
    <button class="btn" style="background:rgba(59,130,246,.1);color:#3b82f6;border:1px solid rgba(59,130,246,.3)" onclick="BankModule._transferFromCaisse('${bankId}')"><i class="fas fa-exchange-alt"></i> Virement Caisse</button>
    <button class="btn" style="background:rgba(139,92,246,.1);color:#8b5cf6;border:1px solid rgba(139,92,246,.3)" onclick="BankModule.paySupplierModal('${bankId}')"><i class="fas fa-hand-holding-usd"></i> Payer Fournisseur</button>
  </div>` : ''}

  <!-- Transaction list -->
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:800;font-size:14px;color:var(--text)">
      Historique des transactions (${txs.length})
    </div>
    ${txs.length===0
      ? `<div style="padding:60px;text-align:center;color:var(--text4)"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:10px"></i>Aucune transaction</div>`
      : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--bg3)">
          <th style="padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Réf</th>
          <th style="padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Date</th>
          <th style="padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Type</th>
          <th style="padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Fournisseur / Note</th>
          <th style="padding:10px 16px;text-align:right;font-size:10px;text-transform:uppercase;color:var(--text4)">Montant</th>
          <th style="padding:10px 16px;width:70px"></th>
        </tr></thead>
        <tbody>
        ${txs.map(t=>{
          const sup = t.supplierId ? supMap[t.supplierId] : null;
          const isD = t.type==='deposit';
          const stl = {transfer_from_caisse:'🔄 Virement Caisse',external_deposit:'💵 Dépôt Externe',supplier_payment:'🏭 Paiement Fournisseur',correction:'✏️ Correction'}[t.subtype]||(isD?'➕ Entrée':'➖ Sortie');
          return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
            <td style="padding:10px 16px;font-family:monospace;font-size:11px;color:var(--text4)">${Utils.escHTML(t.ref||'—')}</td>
            <td style="padding:10px 16px;color:var(--text2)">${t.date||'—'}</td>
            <td style="padding:10px 16px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${isD?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'};color:${isD?'#10b981':'#ef4444'}">${stl}</span></td>
            <td style="padding:10px 16px;color:var(--text3)"><div style="font-weight:600;color:var(--text)">${sup?Utils.escHTML(sup.name):''}</div><div style="font-size:11px">${Utils.escHTML(t.note||'—')}</div></td>
            <td style="padding:10px 16px;text-align:right;font-weight:800;color:${isD?'#10b981':'#ef4444'}">${isD?'+':'−'}${Utils.fmtCurrency(t.amount||0)}</td>
            <td style="padding:10px 16px;text-align:right">
              <button title="Décharge PDF" style="background:transparent;border:none;cursor:pointer;color:var(--text4);padding:4px" onclick="BankModule._printDecharge(${t.id})"><i class="fas fa-file-pdf"></i></button>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`}
  </div>
</div>`;
  },

  // ── External Deposit ──────────────────────────────────────────
  async _depositExternal(prefillBankId) {
    if (!Auth.isAdmin()) return;
    const banks = DB.getSettings().banks || [];
    if (!banks.length) { Utils.notify('Configurez un compte dans Paramètres → Banques','warning'); return; }
    const opts = banks.map(b=>`<option value="${b.id}" ${b.id===prefillBankId?'selected':''}>${Utils.escHTML(b.name)} — ${Utils.escHTML(b.bankName||'')}</option>`).join('');
    const r = await Dialog.show({
      title: '💵 Dépôt Externe — Banque',
      message: `<div style="margin-bottom:14px;padding:10px 14px;background:#1e2a3e;border-radius:10px;border-left:3px solid #10b981;font-size:12px;color:#94a3b8">Dépôt direct sur le compte bancaire (hors caisse — ex: dépôt personnel, crédit bancaire)</div><div class="form-group"><label>Compte bancaire</label><select id="dep_bank">${opts}</select></div><div class="form-group"><label>Montant (DA)</label><input type="number" id="dep_amt" placeholder="0" style="font-size:22px;font-weight:800;text-align:center" min="0"></div><div class="form-group"><label>Date</label><input type="date" id="dep_date" value="${Utils.today()}"></div><div class="form-group"><label>Note / Référence</label><input type="text" id="dep_note" placeholder="Dépôt bordereau n°..."></div>`,
      type: 'info', confirmText: '✅ Enregistrer le dépôt', cancelText: 'Annuler'
    });
    if (!r) return;
    const bankId = document.getElementById('dep_bank')?.value;
    const amount = parseFloat(document.getElementById('dep_amt')?.value||0);
    const date   = document.getElementById('dep_date')?.value || Utils.today();
    const note   = document.getElementById('dep_note')?.value || '';
    if (!amount || amount <= 0) { Utils.notify('Montant invalide','warning'); return; }
    const u   = Auth.getCurrentUser();
    const ref = BankModule._ref('DEP');
    const tx  = DB.insert('bank_transactions', { bankId, type:'deposit', subtype:'external_deposit', amount, note, date, ref, by:u?.id, byName:u?.name });
    Utils.notify(`✅ Dépôt de ${Utils.fmtCurrency(amount)} enregistré`, 'success');
    App.loadModule('bank');
    setTimeout(() => PDFGen.exportBankDecharge(tx.id), 500);
  },

  // ── Transfer Caisse → Banque ──────────────────────────────────
  async _transferFromCaisse(prefillBankId) {
    if (!Auth.isAdmin()) return;
    const banks = DB.getSettings().banks || [];
    if (!banks.length) { Utils.notify('Configurez un compte dans Paramètres → Banques','warning'); return; }
    const cBal = DB.getAll('caisse_admin').reduce((s,t)=>t.type==='deposit'?s+t.amount:s-t.amount, 0);
    const opts = banks.map(b=>`<option value="${b.id}" ${b.id===prefillBankId?'selected':''}>${Utils.escHTML(b.name)} — ${Utils.escHTML(b.bankName||'')}</option>`).join('');
    const r = await Dialog.show({
      title: '🔄 Virement Caisse → Banque',
      message: `<div style="margin-bottom:14px;padding:10px 14px;background:#1e2a3e;border-radius:10px;border-left:3px solid #3b82f6;font-size:12px;color:#94a3b8">Solde caisse disponible : <span style="font-weight:800;color:#e2e8f0">${Utils.fmtCurrency(cBal)}</span></div><div class="form-group"><label>Compte bancaire destinataire</label><select id="dlg_bank">${opts}</select></div><div class="form-group"><label>Montant (DA)</label><input type="number" id="dlg_amount" placeholder="0" style="font-size:22px;font-weight:800;text-align:center" min="0" max="${cBal}"></div><div class="form-group"><label>Date</label><input type="date" id="dlg_date" value="${Utils.today()}"></div><div class="form-group"><label>Note</label><input type="text" id="dlg_note" placeholder="Virement mensuel..."></div>`,
      type: 'info', confirmText: '✅ Effectuer le virement', cancelText: 'Annuler'
    });
    if (!r) return;
    const bankId = document.getElementById('dlg_bank')?.value;
    const amount = parseFloat(document.getElementById('dlg_amount')?.value||0);
    const date   = document.getElementById('dlg_date')?.value || Utils.today();
    const note   = document.getElementById('dlg_note')?.value || '';
    if (!amount || amount <= 0) { Utils.notify('Montant invalide','warning'); return; }
    if (amount > cBal) { Utils.notify(`Solde caisse insuffisant (${Utils.fmtCurrency(cBal)})`, 'danger'); return; }
    const u    = Auth.getCurrentUser();
    const bank = (DB.getSettings().banks||[]).find(b=>b.id===bankId);
    const ref  = BankModule._ref('VIR');
    // Deduct from caisse
    DB.insert('caisse_admin', { type:'withdrawal', source:'bank_transfer', amount, note:`Virement → ${bank?.name||bankId}: ${note}`, ref, userId:u?.id, userName:u?.name, date });
    // Add to bank
    const tx = DB.insert('bank_transactions', { bankId, type:'deposit', subtype:'transfer_from_caisse', amount, note:`Depuis caisse: ${note}`, date, ref, by:u?.id, byName:u?.name });
    Utils.notify(`✅ Virement de ${Utils.fmtCurrency(amount)} vers ${bank?.name}`, 'success');
    App.loadModule('bank');
    setTimeout(() => PDFGen.exportBankDecharge(tx.id), 500);
  },

  // ── Unified Supplier Payment Modal (from bank OR supplier module) ──
  async paySupplierModal(prefillBankId, prefillSupplierId) {
    if (!Auth.isAdmin()) return;
    const suppliers = DB.getAll('suppliers');
    if (!suppliers.length) { Utils.notify('Aucun fournisseur configuré','warning'); return; }
    const banks   = DB.getSettings().banks || [];

    const supOpts  = suppliers.map(s=>`<option value="${s.id}" ${String(s.id)===String(prefillSupplierId)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('');
    const bankOpts = banks.map(b=>{
      const bal = BankModule._bankBalance(b.id).balance;
      return `<option value="${b.id}" ${b.id===prefillBankId?'selected':''}>${Utils.escHTML(b.name)} — ${Utils.fmtCurrency(bal)}</option>`;
    }).join('');

    // Initialize info WHEN dialog renders
    setTimeout(() => { BankModule._onSupChange(); BankModule._onSourceChange(); BankModule._validatePayAmt(); }, 120);

    const r = await Dialog.show({
      title: '🏭 Paiement Fournisseur',
      message: `
<div class="form-group"><label style="color:#e2e8f0;font-weight:700">Fournisseur</label><select id="pay_sup" onchange="BankModule._onSupChange();BankModule._validatePayAmt()" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155">${supOpts}</select></div>

<!-- Supplier info panel -->
<div id="pay_sup_info" style="margin-bottom:14px;padding:12px 14px;background:linear-gradient(135deg,#0f1729,#162032);border-radius:10px;border:1px solid #1e3a5f;font-size:12px;color:#94a3b8">Chargement...</div>

<div class="form-group"><label style="color:#e2e8f0;font-weight:700">Source du paiement</label><select id="pay_source" onchange="BankModule._onSourceChange();BankModule._validatePayAmt()" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155"><option value="bank">🏦 Banque</option><option value="caisse">💵 Caisse (espèces)</option></select></div>

<div id="pay_bank_row" class="form-group"><label style="color:#e2e8f0;font-weight:700">Compte bancaire</label><select id="pay_bank" onchange="BankModule._onSourceChange();BankModule._validatePayAmt()" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155">${bankOpts||'<option value="">Aucun compte</option>'}</select></div>

<!-- Available balance bar -->
<div id="pay_bal_info" style="margin-bottom:14px;padding:10px 14px;background:#0c1524;border-radius:10px;border-left:4px solid #3b82f6;display:flex;justify-content:space-between;align-items:center">
  <span style="font-size:12px;color:#94a3b8">💰 Solde disponible :</span>
  <strong id="pay_avail_lbl" style="font-size:16px;color:#10b981">—</strong>
</div>

<div class="form-group"><label style="color:#e2e8f0;font-weight:700">Montant à payer (DA)</label><input type="number" id="pay_amt" placeholder="0" oninput="BankModule._validatePayAmt()" style="font-size:22px;font-weight:800;text-align:center;background:#1e293b;color:#e2e8f0;border:1px solid #334155" min="0" step="1"></div>

<!-- Live validation / preview panel -->
<div id="pay_validation" style="margin-bottom:10px;padding:10px 14px;border-radius:10px;font-size:12px;display:none"></div>

<!-- After-payment preview -->
<div id="pay_preview" style="margin-bottom:14px;padding:12px 14px;background:#0f1729;border-radius:10px;border:1px solid #1e3a5f;display:none">
  <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#64748b;margin-bottom:8px">📊 APERÇU APRÈS PAIEMENT</div>
  <div id="pay_preview_content" style="font-size:12px;color:#94a3b8"></div>
</div>

<div class="form-group"><label style="color:#e2e8f0;font-weight:700">Date</label><input type="date" id="pay_date" value="${Utils.today()}" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155"></div>
<div class="form-group"><label style="color:#e2e8f0;font-weight:700">Note / Référence</label><input type="text" id="pay_note" placeholder="Paiement BR n°..." style="background:#1e293b;color:#e2e8f0;border:1px solid #334155"></div>`,
      type: 'info', confirmText: '✅ Enregistrer & Décharge', cancelText: 'Annuler'
    });

    if (!r) return;

    const supplierId = parseInt(document.getElementById('pay_sup')?.value);
    const source     = document.getElementById('pay_source')?.value || 'bank';
    const bankId     = source === 'bank' ? (document.getElementById('pay_bank')?.value || null) : null;
    const amount     = parseFloat(document.getElementById('pay_amt')?.value || 0);
    const date       = document.getElementById('pay_date')?.value || Utils.today();
    const note       = document.getElementById('pay_note')?.value || '';

    if (!supplierId) { Utils.notify('Sélectionnez un fournisseur','warning'); return; }
    if (!amount || amount <= 0) { Utils.notify('Montant invalide','warning'); return; }

    // ── STRICT BALANCE ENFORCEMENT ──
    if (source === 'bank') {
      if (!bankId) { Utils.notify('Sélectionnez un compte bancaire','warning'); return; }
      const bankBal = BankModule._bankBalance(bankId).balance;
      if (amount > bankBal) { Utils.notify(`⛔ Solde insuffisant — disponible: ${Utils.fmtCurrency(bankBal)}`, 'danger'); return; }
    } else {
      const caisseBalance = DB.getAll('caisse_admin').reduce((s,t)=>t.type==='deposit'?s+t.amount:s-t.amount, 0);
      if (amount > caisseBalance) { Utils.notify(`⛔ Solde caisse insuffisant — disponible: ${Utils.fmtCurrency(Math.max(0,caisseBalance))}`, 'danger'); return; }
    }

    const u   = Auth.getCurrentUser();
    const sup = DB.getById('suppliers', supplierId);
    const ref = BankModule._ref('PAY');

    const pay = DB.insert('supplier_payments', {
      supplierId, bankId: source==='bank'?bankId:null, source, amount, note, date, ref,
      by: u?.id, byName: u?.name
    });

    if (source === 'bank') {
      DB.insert('bank_transactions', {
        bankId, type:'payment', subtype:'supplier_payment',
        supplierId, amount, note, date, ref, by:u?.id, byName:u?.name
      });
    } else {
      DB.insert('caisse_admin', {
        type:'withdrawal', source:'supplier_payment',
        supplierId, amount, ref,
        note:`Paiement fournisseur ${sup?.name||'?'}: ${note}`,
        userId:u?.id, userName:u?.name, date
      });
    }

    Utils.notify(`✅ Paiement de ${Utils.fmtCurrency(amount)} à ${sup?.name} — Réf: ${ref}`, 'success');
    App.loadModule('bank');
    setTimeout(() => PDFGen.exportSupplierPayDecharge(pay.id), 600);
  },

  // ── Helper: update supplier info panel ────────────────────────
  _onSupChange() {
    const supId = parseInt(document.getElementById('pay_sup')?.value);
    const el = document.getElementById('pay_sup_info');
    if (!el || !supId) return;
    const sup      = DB.getById('suppliers', supId);
    const totalBR  = DB.getAll('brs').filter(b=>b.supplierId===supId).reduce((s,b)=>s+(b.totalTTC||0),0);
    const totalPaid= DB.getAll('supplier_payments').filter(p=>p.supplierId===supId).reduce((s,p)=>s+(p.amount||0),0);
    const due      = totalBR - totalPaid;
    const pct      = totalBR > 0 ? Math.min(100, Math.round((totalPaid/totalBR)*100)) : 0;
    const nbBR     = DB.getAll('brs').filter(b=>b.supplierId===supId).length;
    const nbPays   = DB.getAll('supplier_payments').filter(p=>p.supplierId===supId).length;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,.2);display:flex;align-items:center;justify-content:center;color:#a78bfa;font-weight:900;font-size:14px">${(sup?.name||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700;color:#e2e8f0;font-size:13px">${Utils.escHTML(sup?.name||'?')}</div>
          <div style="font-size:10px;color:#64748b">${nbBR} BR · ${nbPays} paiements</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div style="background:rgba(139,92,246,.1);border-radius:8px;padding:6px">
          <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">Total BR</div>
          <div style="font-weight:800;color:#a78bfa;font-size:13px">${Utils.fmtCurrency(totalBR)}</div>
        </div>
        <div style="background:rgba(16,185,129,.1);border-radius:8px;padding:6px">
          <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">Déjà payé</div>
          <div style="font-weight:800;color:#10b981;font-size:13px">${Utils.fmtCurrency(totalPaid)}</div>
        </div>
        <div style="background:${due>0?'rgba(239,68,68,.12)':'rgba(16,185,129,.12)'};border-radius:8px;padding:6px">
          <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">Reste dû</div>
          <div style="font-weight:800;color:${due>0?'#ef4444':'#10b981'};font-size:13px">${Utils.fmtCurrency(Math.max(0,due))}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.06);border-radius:4px;height:5px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10b981,${pct>=100?'#059669':'#a78bfa'});border-radius:4px;transition:width .3s"></div>
      </div>
      <div style="text-align:right;font-size:10px;color:#64748b;margin-top:3px">${pct}% payé</div>`;

    // Pre-fill amount with remaining due
    const amtEl = document.getElementById('pay_amt');
    if (amtEl && !amtEl.value && due > 0) amtEl.value = due;
    BankModule._validatePayAmt();
  },

  // ── Helper: toggle bank row + update available balance ────────
  _onSourceChange() {
    const source  = document.getElementById('pay_source')?.value;
    const bankRow = document.getElementById('pay_bank_row');
    if (bankRow) bankRow.style.display = source === 'bank' ? 'block' : 'none';

    const lbl = document.getElementById('pay_avail_lbl');
    if (!lbl) return;

    if (source === 'bank') {
      const bankId = document.getElementById('pay_bank')?.value;
      if (bankId) {
        const bal = BankModule._bankBalance(bankId).balance;
        lbl.textContent = Utils.fmtCurrency(Math.max(0, bal));
        lbl.style.color = bal > 0 ? '#10b981' : '#ef4444';
      }
    } else {
      const cBal = DB.getAll('caisse_admin').reduce((s,t)=>t.type==='deposit'?s+t.amount:s-t.amount, 0);
      lbl.textContent = Utils.fmtCurrency(Math.max(0, cBal));
      lbl.style.color = cBal > 0 ? '#10b981' : '#ef4444';
    }
    BankModule._validatePayAmt();
  },

  // ── Live validation: check amount vs balance + show preview ───
  _validatePayAmt() {
    const amt      = parseFloat(document.getElementById('pay_amt')?.value || 0);
    const source   = document.getElementById('pay_source')?.value || 'bank';
    const bankId   = document.getElementById('pay_bank')?.value;
    const supId    = parseInt(document.getElementById('pay_sup')?.value);
    const valEl    = document.getElementById('pay_validation');
    const prevEl   = document.getElementById('pay_preview');
    const prevC    = document.getElementById('pay_preview_content');
    const confirmBtn = document.querySelector('.dlg-actions .btn-primary, .dlg-actions button:first-child');

    if (!valEl) return;

    // Get available balance
    let available = 0;
    let sourceName = '';
    if (source === 'bank' && bankId) {
      available = BankModule._bankBalance(bankId).balance;
      const bank = (DB.getSettings().banks||[]).find(b=>b.id===bankId);
      sourceName = bank?.name || 'Banque';
    } else if (source === 'caisse') {
      available = DB.getAll('caisse_admin').reduce((s,t)=>t.type==='deposit'?s+t.amount:s-t.amount, 0);
      sourceName = 'Caisse';
    }

    const overBudget = amt > 0 && amt > available;

    // Show validation error if over budget
    if (overBudget) {
      valEl.style.display = 'block';
      valEl.style.background = 'rgba(239,68,68,.15)';
      valEl.style.border = '1px solid rgba(239,68,68,.4)';
      valEl.style.color = '#fca5a5';
      valEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-exclamation-triangle" style="font-size:16px;color:#ef4444"></i><div><strong style="color:#ef4444">⛔ Solde insuffisant !</strong><br>Vous voulez payer <strong>${Utils.fmtCurrency(amt)}</strong> mais ${sourceName} n'a que <strong>${Utils.fmtCurrency(Math.max(0,available))}</strong></div></div>`;
      // Disable confirm button
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; confirmBtn.style.pointerEvents = 'none'; }
    } else if (amt <= 0) {
      valEl.style.display = 'none';
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; confirmBtn.style.pointerEvents = 'none'; }
    } else {
      valEl.style.display = 'none';
      // Re-enable confirm button
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; confirmBtn.style.pointerEvents = 'auto'; }
    }

    // Show after-payment preview
    if (prevEl && prevC && amt > 0 && !overBudget && supId) {
      const totalBR   = DB.getAll('brs').filter(b=>b.supplierId===supId).reduce((s,b)=>s+(b.totalTTC||0),0);
      const totalPaid = DB.getAll('supplier_payments').filter(p=>p.supplierId===supId).reduce((s,p)=>s+(p.amount||0),0);
      const dueNow    = totalBR - totalPaid;
      const dueAfter  = dueNow - amt;
      const balAfter  = available - amt;

      prevEl.style.display = 'block';
      prevC.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:rgba(59,130,246,.08);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:10px;color:#64748b;margin-bottom:3px">Solde ${sourceName} après</div>
          <div style="font-weight:800;color:#3b82f6;font-size:14px">${Utils.fmtCurrency(Math.max(0,balAfter))}</div>
        </div>
        <div style="background:${dueAfter<=0?'rgba(16,185,129,.08)':'rgba(245,158,11,.08)'};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:10px;color:#64748b;margin-bottom:3px">Reste fournisseur après</div>
          <div style="font-weight:800;color:${dueAfter<=0?'#10b981':'#f59e0b'};font-size:14px">${dueAfter<=0?'✅ Soldé':Utils.fmtCurrency(dueAfter)}</div>
        </div>
      </div>`;
    } else if (prevEl) {
      prevEl.style.display = 'none';
    }
  },
  // ── Print décharge for a bank transaction ─────────────────────
  _printDecharge(txId) {
    PDFGen.exportBankDecharge(txId);
  },

  // ── Correct a transaction (admin only) ───────────────────────
  async _correctTx(txId) {
    if (!Auth.isAdmin()) return;
    const tx = DB.getById('bank_transactions', txId);
    if (!tx) return;
    const r = await Dialog.show({
      title: '✏️ Corriger transaction',
      message: `<div class="form-group"><label>Nouveau montant</label><input type="number" id="dlg_ca" value="${tx.amount}" style="font-size:20px;font-weight:800;text-align:center"></div><div class="form-group"><label>Motif de correction</label><input type="text" id="dlg_cn" placeholder="Erreur de saisie..."></div>`,
      type: 'warning', confirmText: 'Corriger', cancelText: 'Annuler'
    });
    if (!r) return;
    const newAmt = parseFloat(document.getElementById('dlg_ca')?.value||tx.amount);
    const cn     = document.getElementById('dlg_cn')?.value || '';
    const u = Auth.getCurrentUser();
    DB.update('bank_transactions', txId, { amount:newAmt, subtype:'correction', note:(tx.note||'')+` [Corrigé ${u?.name}: ${cn}]`, correctedBy:u?.id, correctedAt:new Date().toISOString() });
    Utils.notify('Transaction corrigée','success');
    App.loadModule('bank');
  },

  // ── Excel export ─────────────────────────────────────────────
  exportExcel() {
    const f = BankModule._filters || {};
    const banks = DB.getSettings().banks || [];
    const supMap = {}; DB.getAll('suppliers').forEach(s=>supMap[s.id]=s);
    const txs = DB.getAll('bank_transactions').filter(t => {
      if (f.bankId && f.bankId !== 'all' && t.bankId !== f.bankId) return false;
      if (f.type   && f.type   !== 'all' && t.type   !== f.type)   return false;
      if (f.dateFrom && (t.date||'') < f.dateFrom) return false;
      if (f.dateTo   && (t.date||'') > f.dateTo)   return false;
      return true;
    });
    txs.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if (typeof exportXLSX !== 'undefined') {
      const rows = txs.map(t => {
        const b = banks.find(x=>x.id===t.bankId);
        const s = t.supplierId ? supMap[t.supplierId] : null;
        return [t.date||'', t.ref||'', b?.name||'?', t.type==='deposit'?'Entrée':'Sortie', t.subtype||'', s?.name||'', t.note||'', t.type==='deposit'?(t.amount||0):0, t.type!=='deposit'?(t.amount||0):0];
      });
      exportXLSX(['Date','Référence','Compte','Sens','Sous-type','Fournisseur','Note','Entrant (DA)','Sortant (DA)'], rows, 'transactions_bancaires');
    } else if (typeof CSVExport !== 'undefined') {
      const rows = txs.map(t => {
        const b = banks.find(x=>x.id===t.bankId);
        const s = t.supplierId ? supMap[t.supplierId] : null;
        return [t.date||'', t.ref||'', b?.name||'?', t.type==='deposit'?'Entree':'Sortie', s?.name||'', t.note||'', t.amount||0];
      });
      CSVExport.download('Transactions_Bancaires', ['Date','Ref','Compte','Sens','Fournisseur','Note','Montant'], rows);
    } else {
      Utils.notify('Export non disponible','warning');
    }
  },

  // ── Legacy alias ─────────────────────────────────────────────
  exportCsv() { BankModule.exportExcel(); },
  _openBank(bankId) { BankModule._activeBank = bankId; App.loadModule('bank'); },
  _updSupBal(supId) { BankModule._onSupChange(); },
  _paySupplier(bankId) { BankModule.paySupplierModal(bankId); },
};
Modules.bank = BankModule;



// ═══════════════════════════════════════════════════════════════
// PARTNERS MODULE — Merged Clients + Suppliers with tabs
// ═══════════════════════════════════════════════════════════════
const PartnersModule = {
  _tab: 'clients',
  _detailId: null,
  _detailType: null,

  render() {
    if (this._detailId && this._detailType) return this._renderDetail();
    return this._renderList();
  },

  _renderList() {
    if (!this._listFilters) this._listFilters = {q:'', wilaya:'all', sort:'name', supStatus:'all'};
    this._exportList = (type) => {
      if (type === 'clients') {
        const cls = DB.getAll('clients');
        const b = DB.getAll('bls');
        const rows = cls.map(c => {
          const cB = b.filter(x=>String(x.clientId)===String(c.id));
          const rev = cB.filter(x=>x.status==='delivered').reduce((s,x)=>s+(x.totalTTC||0),0);
          return [c.name, c.phone||'', c.wilaya||'', c.address||'', cB.length, rev];
        });
        CSVExport.download('Clients', ['Nom','Telephone','Wilaya','Adresse','Nb_BL','CA'], rows);
      } else {
        const sups = DB.getAll('suppliers');
        const br = DB.getAll('brs');
        const pays = DB.getAll('supplier_payments');
        const rows = sups.map(s => {
          const pur = br.filter(x=>x.supplierId===s.id).reduce((sum,x)=>sum+(x.totalTTC||0),0);
          const pd = pays.filter(p=>p.supplierId===s.id).reduce((sum,p)=>sum+(p.amount||0),0);
          return [s.name, s.phone||'', s.address||'', pur, pd, pur-pd];
        });
        CSVExport.download('Fournisseurs', ['Nom','Telephone','Adresse','Achats','Paye','Reste'], rows);
      }
    };
    
    const isAR = T.isRTL();
    const clients = DB.getAll('clients');
    const suppliers = DB.getAll('suppliers');
    const bls = DB.getAll('bls');
    const brs = DB.getAll('brs');
    const supPayments = DB.getAll('supplier_payments');
    const tab = this._tab || 'clients';

    let totalRevenue = 0, totalPurchases = 0, totalOutstandingSup = 0;
    
    let deliveredBLs = bls.filter(b=>b.status==='delivered');
    totalRevenue = deliveredBLs.reduce((s,b)=>s+(b.totalTTC||0),0);
    
    totalPurchases = brs.reduce((s,b)=>s+(b.totalTTC||0),0);
    const totalPayments = supPayments.reduce((s,p)=>s+(p.amount||0),0);
    totalOutstandingSup = totalPurchases - totalPayments;

    const tabBtn = (id, icon, label, count, color) => `<button onclick="PartnersModule._tab='${id}';PartnersModule._detailId=null;PartnersModule._listFilters={q:'',wilaya:'all',sort:'name',supStatus:'all'};App.loadModule('partners')" style="display:flex;align-items:center;gap:8px;padding:8px 20px;border:none;cursor:pointer;font-size:13px;font-weight:700;border-radius:24px;transition:all .2s;background:${tab===id?color:'var(--bg2)'};color:${tab===id?'#fff':'var(--text)'};border:1px solid ${tab===id?color:'var(--border)'};box-shadow:${tab===id?'0 4px 12px '+color+'40':'none'}"><i class="fas ${icon}"></i>${label}<span style="background:${tab===id?'rgba(255,255,255,0.2)':'var(--bg3)'};color:${tab===id?'#fff':'var(--text4)'};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:800">${count}</span></button>`;

    return `<div style="padding:0">
    <div style="padding:24px 24px 0;background:var(--bg);border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,var(--primary),#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.1)"><i class="fas fa-handshake" style="color:#fff;font-size:20px"></i></div>
          <div><h2 style="font-size:24px;font-weight:900;color:var(--text);margin:0;letter-spacing:-0.5px">${isAR?'الشركاء':'Partenaires'}</h2><p style="font-size:13px;color:var(--text4);margin:4px 0 0">${isAR?'إدارة الزبائن والموردين':'Gérez vos clients et fournisseurs'}</p></div>
        </div>
        <div style="display:flex;gap:24px;text-align:right;background:var(--bg2);padding:12px 24px;border-radius:16px;border:1px solid var(--border)">
          <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">${isAR?'إجمالي المبيعات':"Chiffre d'Affaires"}</div><div style="font-size:18px;font-weight:800;color:#0ea5e9">${Utils.fmtCurrency(totalRevenue)}</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">${isAR?'إجمالي المشتريات':'Total Achats'}</div><div style="font-size:18px;font-weight:800;color:#8b5cf6">${Utils.fmtCurrency(totalPurchases)}</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">${isAR?'ديون الموردين':'Dettes Fournisseurs'}</div><div style="font-size:18px;font-weight:800;color:#f59e0b">${Utils.fmtCurrency(totalOutstandingSup)}</div></div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        ${tabBtn('clients','fa-users',isAR?'الزبائن':'Clients',clients.length,'#0ea5e9')}
        ${tabBtn('suppliers','fa-building',isAR?'الموردون':'Fournisseurs',suppliers.length,'#8b5cf6')}
      </div>
    </div>
    <div style="padding:24px;background:var(--bg3);min-height:calc(100vh - 200px)">
      ${tab==='clients' ? this._clientsList(clients, bls) : this._suppliersList(suppliers, brs, supPayments)}
    </div>
    </div>`;
  },

  _clientsList(clients, bls) {
    const isAR = T.isRTL();
    let f = this._listFilters || {q:'', wilaya:'all', sort:'name', supStatus:'all'};
    const wilayas = [...new Set(clients.map(c=>c.wilaya).filter(w=>w))].sort();
    
    let clientStats = clients.map(c => {
      const cBLs = bls.filter(b=>String(b.clientId)===String(c.id));
      const delivered = cBLs.filter(b=>b.status==='delivered');
      const revenue = delivered.reduce((s,b)=>s+(b.totalTTC||0),0);
      return { ...c, blCount: cBLs.length, revenue };
    });

    if (f.q) {
      const q = f.q.toLowerCase();
      clientStats = clientStats.filter(c => (c.name||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q));
    }
    if (f.wilaya && f.wilaya !== 'all') {
      clientStats = clientStats.filter(c => c.wilaya === f.wilaya);
    }
    
    if (f.sort === 'name') clientStats.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    else if (f.sort === 'revenue') clientStats.sort((a,b)=>b.revenue - a.revenue);
    else if (f.sort === 'date') clientStats.sort((a,b)=>b.id - a.id);

    return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;align-items:center;justify-content:space-between;background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="position:relative">
          <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text4)"></i>
          <input type="text" placeholder="${isAR?'بحث...':'Rechercher...'}" value="${Utils.escHTML(f.q)}" oninput="PartnersModule._listFilters.q=this.value;App.loadModule('partners')" style="padding:10px 14px 10px 36px;border:1px solid var(--border);border-radius:8px;font-size:13px;width:240px;background:var(--bg);color:var(--text);outline:none" onfocus="this.style.borderColor='#0ea5e9'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <select onchange="PartnersModule._listFilters.wilaya=this.value;App.loadModule('partners')" style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;cursor:pointer">
          <option value="all">${isAR?'كل الولايات':'Toutes les wilayas'}</option>
          ${wilayas.map(w => `<option value="${Utils.escHTML(w)}" ${f.wilaya===w?'selected':''}>${Utils.escHTML(w)}</option>`).join('')}
        </select>
        <select onchange="PartnersModule._listFilters.sort=this.value;App.loadModule('partners')" style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;cursor:pointer">
          <option value="name" ${f.sort==='name'?'selected':''}>${isAR?'الاسم':'Nom'}</option>
          <option value="revenue" ${f.sort==='revenue'?'selected':''}>${isAR?'المبيعات':"Chiffre d'Affaires"}</option>
          <option value="date" ${f.sort==='date'?'selected':''}>${isAR?'تاريخ الإضافة':"Date d'ajout"}</option>
        </select>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-outline" style="border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600" onclick="PartnersModule._exportList('clients')"><i class="fas fa-file-csv" style="margin-right:6px"></i> CSV</button>
        <button class="btn btn-primary" style="background:#0ea5e9;border-color:#0ea5e9;color:#fff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(14,165,233,0.3)" onclick="ClientsModule.showCreate()"><i class="fas fa-plus" style="margin-right:6px"></i> ${T.get('cli_new')}</button>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px" id="partnerCliGrid">
      ${clientStats.length ? clientStats.map(c => `
      <div class="partner-card" onclick="PartnersModule._detailType='client';PartnersModule._detailId=${c.id};App.loadModule('partners')" style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:16px" onmouseenter="this.style.borderColor='#0ea5e9';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.06)'" onmouseleave="this.style.borderColor='var(--border)';this.style.transform='none';this.style.boxShadow='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#0284c7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900;flex-shrink:0;box-shadow:0 4px 8px rgba(14,165,233,0.3)">${(c.name||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text)">${Utils.escHTML(c.name)}</div>
              <div style="font-size:11px;color:var(--text4);margin-top:2px"><i class="fas fa-phone" style="margin-right:4px"></i>${Utils.escHTML(c.phone||'-')}</div>
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-xs btn-outline" style="border:none;background:var(--bg3);width:28px;height:28px;padding:0;border-radius:6px;display:flex;align-items:center;justify-content:center" onclick="event.stopPropagation();ClientsModule.showEdit(${c.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-outline" style="border:none;background:var(--bg3);color:#ef4444;width:28px;height:28px;padding:0;border-radius:6px;display:flex;align-items:center;justify-content:center" onclick="event.stopPropagation();ClientsModule.deleteCli(${c.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        ${c.wilaya ? `<div style="font-size:11px;color:var(--text4);background:var(--bg3);padding:4px 8px;border-radius:6px;display:inline-block;align-self:flex-start"><i class="fas fa-map-marker-alt" style="margin-right:6px"></i>${Utils.escHTML(c.wilaya)}</div>` : ''}
        <div style="margin-top:auto;padding-top:16px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;align-items:flex-end">
          <div><div style="font-size:10px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">${isAR?'إجمالي المبيعات':'Total CA'}</div><div style="font-size:14px;font-weight:800;color:#0ea5e9;margin-top:4px">${Utils.fmtCurrency(c.revenue)}</div></div>
          <div style="text-align:right"><div style="font-size:10px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">${isAR?'سندات التسليم':'Bons de Livraison'}</div><div style="font-size:13px;font-weight:700;color:var(--text2);margin-top:4px">${c.blCount} BL</div></div>
        </div>
      </div>`).join('') : `<div style="grid-column:1/-1;padding:40px;text-align:center;background:var(--bg2);border-radius:12px;border:1px dashed var(--border)"><i class="fas fa-users" style="font-size:48px;color:var(--text4);margin-bottom:16px"></i><div style="font-size:15px;font-weight:700;color:var(--text)">${T.get('no_data')}</div><div style="font-size:13px;color:var(--text4);margin-top:8px">Aucun client trouvé</div></div>`}
    </div>`;
  },

  _suppliersList(suppliers, brs, payments) {
    const isAR = T.isRTL();
    let f = this._listFilters || {q:'', wilaya:'all', sort:'name', supStatus:'all'};
    
    let supStats = suppliers.map(s => {
      const sBRs = brs.filter(b=>b.supplierId===s.id);
      const totalPurchase = sBRs.reduce((sum,b)=>sum+(b.totalTTC||0),0);
      const totalPaid = payments.filter(p=>p.supplierId===s.id).reduce((sum,p)=>sum+(p.amount||0),0);
      const remaining = totalPurchase - totalPaid;
      return { ...s, brCount: sBRs.length, totalPurchase, totalPaid, remaining };
    });

    if (f.q) {
      const q = f.q.toLowerCase();
      supStats = supStats.filter(s => (s.name||'').toLowerCase().includes(q) || (s.phone||'').toLowerCase().includes(q));
    }
    if (f.supStatus === 'paid') {
      supStats = supStats.filter(s => s.remaining <= 0 && s.totalPurchase > 0);
    } else if (f.supStatus === 'unpaid') {
      supStats = supStats.filter(s => s.remaining > 0);
    }
    
    if (f.sort === 'name') supStats.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    else if (f.sort === 'purchases') supStats.sort((a,b)=>b.totalPurchase - a.totalPurchase);
    else if (f.sort === 'date') supStats.sort((a,b)=>b.id - a.id);

    return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;align-items:center;justify-content:space-between;background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="position:relative">
          <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text4)"></i>
          <input type="text" placeholder="${isAR?'بحث...':'Rechercher...'}" value="${Utils.escHTML(f.q)}" oninput="PartnersModule._listFilters.q=this.value;App.loadModule('partners')" style="padding:10px 14px 10px 36px;border:1px solid var(--border);border-radius:8px;font-size:13px;width:240px;background:var(--bg);color:var(--text);outline:none" onfocus="this.style.borderColor='#8b5cf6'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <select onchange="PartnersModule._listFilters.supStatus=this.value;App.loadModule('partners')" style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;cursor:pointer">
          <option value="all" ${f.supStatus==='all'?'selected':''}>${isAR?'كل الحالات':'Tous les statuts'}</option>
          <option value="unpaid" ${f.supStatus==='unpaid'?'selected':''}>${isAR?'غير مدفوع':'Non payé'}</option>
          <option value="paid" ${f.supStatus==='paid'?'selected':''}>${isAR?'مدفوع':'Payé (Soldé)'}</option>
        </select>
        <select onchange="PartnersModule._listFilters.sort=this.value;App.loadModule('partners')" style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;cursor:pointer">
          <option value="name" ${f.sort==='name'?'selected':''}>${isAR?'الاسم':'Nom'}</option>
          <option value="purchases" ${f.sort==='purchases'?'selected':''}>${isAR?'المشتريات':'Total Achats'}</option>
          <option value="date" ${f.sort==='date'?'selected':''}>${isAR?'تاريخ الإضافة':"Date d'ajout"}</option>
        </select>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-outline" style="border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600" onclick="PartnersModule._exportList('suppliers')"><i class="fas fa-file-csv" style="margin-right:6px"></i> CSV</button>
        <button class="btn btn-primary" style="background:#8b5cf6;border-color:#8b5cf6;color:#fff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(139,92,246,0.3)" onclick="SuppliersModule.showCreate()"><i class="fas fa-plus" style="margin-right:6px"></i> ${T.get('sup_new')}</button>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px" id="partnerSupGrid">
      ${supStats.length ? supStats.map(s => {
        const pct = s.totalPurchase>0?Math.min(100,(s.totalPaid/s.totalPurchase)*100):0;
        return `
      <div class="partner-card" onclick="PartnersModule._detailType='supplier';PartnersModule._detailId=${s.id};App.loadModule('partners')" style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:16px" onmouseenter="this.style.borderColor='#8b5cf6';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.06)'" onmouseleave="this.style.borderColor='var(--border)';this.style.transform='none';this.style.boxShadow='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900;flex-shrink:0;box-shadow:0 4px 8px rgba(139,92,246,0.3)">${(s.name||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text)">${Utils.escHTML(s.name)}</div>
              <div style="font-size:11px;color:var(--text4);margin-top:2px"><i class="fas fa-phone" style="margin-right:4px"></i>${Utils.escHTML(s.phone||'-')}</div>
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-xs btn-outline" style="border:none;background:var(--bg3);width:28px;height:28px;padding:0;border-radius:6px;display:flex;align-items:center;justify-content:center" onclick="event.stopPropagation();SuppliersModule.showEdit(${s.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-outline" style="border:none;background:var(--bg3);color:#ef4444;width:28px;height:28px;padding:0;border-radius:6px;display:flex;align-items:center;justify-content:center" onclick="event.stopPropagation();SuppliersModule.deleteSup(${s.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:10px;font-weight:700;color:var(--text4);text-transform:uppercase;letter-spacing:0.5px">
            <span>Paiements (${Math.round(pct)}%)</span>
            <span style="color:${s.remaining>0?'#f59e0b':'#10b981'}">${s.remaining>0?'Reste '+Utils.fmtCurrency(s.remaining):'✅ Soldé'}</span>
          </div>
          <div style="background:var(--bg3);border-radius:20px;height:6px;overflow:hidden;width:100%"><div style="height:100%;border-radius:20px;background:${pct>=100?'#10b981':'linear-gradient(90deg,#8b5cf6,#7c3aed)'};width:${Math.min(pct,100)}%;transition:width .5s"></div></div>
        </div>

        <div style="margin-top:auto;padding-top:16px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;align-items:flex-end">
          <div><div style="font-size:10px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">${isAR?'إجمالي المشتريات':'Total Achats'}</div><div style="font-size:14px;font-weight:800;color:#8b5cf6;margin-top:4px">${Utils.fmtCurrency(s.totalPurchase)}</div></div>
          <div style="text-align:right"><div style="font-size:10px;color:var(--text4);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">${isAR?'سندات الاستلام':'Bons de Réception'}</div><div style="font-size:13px;font-weight:700;color:var(--text2);margin-top:4px">${s.brCount} BR</div></div>
        </div>
      </div>`;
      }).join('') : `<div style="grid-column:1/-1;padding:40px;text-align:center;background:var(--bg2);border-radius:12px;border:1px dashed var(--border)"><i class="fas fa-building" style="font-size:48px;color:var(--text4);margin-bottom:16px"></i><div style="font-size:15px;font-weight:700;color:var(--text)">${T.get('no_data')}</div><div style="font-size:13px;color:var(--text4);margin-top:8px">Aucun fournisseur trouvé</div></div>`}
    </div>`;
  },

  _filterRows(q, type) {
    const id = type==='cli'?'partnerCliRows':'partnerSupRows';
    const rows = document.querySelectorAll('#'+id+' .partner-row');
    const ql = q.toLowerCase();
    rows.forEach(r => r.style.display = r.dataset.name.includes(ql)?'flex':'none');
  },

  _renderDetail() {
    if (this._detailType === 'client') return this._clientDetail(this._detailId);
    return this._supplierDetail(this._detailId);
  },

  _clientDetail(clientId) {
    const c = DB.getById('clients', clientId);
    if (!c) { this._detailId=null; return this._renderList(); }
    const isAR = T.isRTL();
    const bls = DB.getAll('bls').filter(b=>String(b.clientId)===String(clientId));
    const delivered = bls.filter(b=>b.status==='delivered');
    const pending = bls.filter(b=>b.status!=='delivered');
    const totalRevenue = delivered.reduce((s,b)=>s+(b.totalTTC||0),0);
    const avgBL = delivered.length>0?totalRevenue/delivered.length:0;

    // Monthly breakdown
    const byMonth = {};
    delivered.forEach(b => { const m=(b.date||'').substring(0,7); if(m) byMonth[m]=(byMonth[m]||0)+(b.totalTTC||0); });
    const months = Object.keys(byMonth).sort().slice(-6);
    const maxMonth = Math.max(...Object.values(byMonth), 1);

    return `<div style="padding:16px;max-width:1100px;margin:0 auto">
    <button class="btn btn-outline" style="margin-bottom:16px" onclick="PartnersModule._detailId=null;PartnersModule._tab='clients';App.loadModule('partners')"><i class="fas fa-arrow-left"></i> ${isAR?'رجوع':'Retour'}</button>

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0c4a6e,#0284c7);border-radius:16px;padding:24px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:rgba(255,255,255,.06);border-radius:50%"></div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900">${(c.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1"><div style="font-size:22px;font-weight:900">${Utils.escHTML(c.name)}</div><div style="font-size:12px;opacity:.7;margin-top:4px">${[c.phone,c.email,c.wilaya,c.address].filter(Boolean).map(v=>Utils.escHTML(v)).join(' · ')}</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:none" onclick="ClientsModule.showEdit(${c.id})"><i class="fas fa-edit"></i> ${isAR?'تعديل':'Modifier'}</button>
        </div>
      </div>
    </div>

    <!-- Contact Info Card -->
    ${c.nif||c.nis||c.rc||c.ai ? `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px"><i class="fas fa-id-card" style="color:var(--primary)"></i> ${isAR?'المعلومات القانونية':'Informations légales'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
        ${c.nif?`<div style="background:var(--bg3);border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:var(--text4);font-weight:700">NIF</div><div style="font-size:13px;font-weight:600;font-family:monospace">${Utils.escHTML(c.nif)}</div></div>`:''}
        ${c.nis?`<div style="background:var(--bg3);border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:var(--text4);font-weight:700">NIS</div><div style="font-size:13px;font-weight:600;font-family:monospace">${Utils.escHTML(c.nis)}</div></div>`:''}
        ${c.rc?`<div style="background:var(--bg3);border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:var(--text4);font-weight:700">RC</div><div style="font-size:13px;font-weight:600">${Utils.escHTML(c.rc)}</div></div>`:''}
        ${c.ai?`<div style="background:var(--bg3);border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:var(--text4);font-weight:700">AI</div><div style="font-size:13px;font-weight:600;font-family:monospace">${Utils.escHTML(c.ai)}</div></div>`:''}
      </div>
    </div>` : ''}

    <!-- KPI Stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px">
      <div class="stat-card-v2"><div class="stat-icon-v2 blue"><i class="fas fa-file-export"></i></div><div class="stat-body-v2"><div class="stat-value-v2">${delivered.length}</div><div class="stat-label-v2">BL livrés</div></div></div>
      <div class="stat-card-v2"><div class="stat-icon-v2 green"><i class="fas fa-coins"></i></div><div class="stat-body-v2"><div class="stat-value-v2" style="font-size:16px">${Utils.fmtCurrency(totalRevenue)}</div><div class="stat-label-v2">CA total</div></div></div>
      <div class="stat-card-v2"><div class="stat-icon-v2 purple"><i class="fas fa-chart-line"></i></div><div class="stat-body-v2"><div class="stat-value-v2" style="font-size:16px">${Utils.fmtCurrency(avgBL)}</div><div class="stat-label-v2">Moy. / BL</div></div></div>
      <div class="stat-card-v2"><div class="stat-icon-v2 orange"><i class="fas fa-hourglass-half"></i></div><div class="stat-body-v2"><div class="stat-value-v2">${pending.length}</div><div class="stat-label-v2">En attente</div></div></div>
    </div>

    <!-- Monthly Revenue Chart -->
    ${months.length>0 ? `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;font-size:13px;margin-bottom:14px"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> CA mensuel</div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:100px">
        ${months.map(m => { const h = (byMonth[m]/maxMonth)*100; return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:10px;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(byMonth[m])}</div><div style="width:100%;background:linear-gradient(180deg,#0ea5e9,#0284c7);border-radius:6px 6px 0 0;height:${Math.max(h,8)}%;transition:height .5s"></div><div style="font-size:9px;color:var(--text4);font-weight:600">${m.substring(5)}</div></div>`; }).join('')}
      </div>
    </div>` : ''}

    <!-- Delivery Addresses -->
    ${(c.deliveryAddresses||[]).length>0 ? `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px"><i class="fas fa-map-marker-alt" style="color:#ef4444"></i> ${isAR?'عناوين التسليم':'Adresses de livraison'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
        ${c.deliveryAddresses.map((a,i) => `<div style="background:var(--bg3);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:8px"><i class="fas fa-map-pin" style="color:#ef4444;font-size:14px"></i><span style="font-size:12px">${Utils.escHTML(typeof a==='string'?a:a.label||a.address||'')}</span></div>`).join('')}
      </div>
    </div>` : ''}

    <!-- BL History -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center">
        <span><i class="fas fa-file-export" style="color:#0ea5e9"></i> ${isAR?'سجل الفواتير':'Historique des livraisons'}</span>
        <div style="display:flex;gap:6px;align-items:center"><span style="font-size:11px;color:var(--text4)">${bls.length} BL</span><button class="btn btn-sm btn-outline" onclick="CSVExport.exportBLs(${clientId})" title="Export CSV"><i class="fas fa-download"></i></button></div>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 14px;text-align:left">Réf</th><th style="padding:10px;text-align:left">Date</th><th style="padding:10px;text-align:left">Statut</th><th style="padding:10px;text-align:left">Articles</th><th style="padding:10px;text-align:right">HT</th><th style="padding:10px;text-align:right">TTC</th></tr></thead>
        <tbody>${bls.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(bl => {
          const items = (bl.items||[]).length;
          return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
            <td style="padding:10px 14px;font-weight:600">${Utils.escHTML(bl.ref||'')}</td>
            <td style="padding:10px;color:var(--text2)">${bl.date||''}</td>
            <td style="padding:10px"><span class="badge ${bl.status==='delivered'?'badge-success':'badge-warning'}" style="font-size:10px">${bl.status==='delivered'?'✅ Livré':'⏳ En cours'}</span></td>
            <td style="padding:10px;color:var(--text4)">${items} article${items>1?'s':''}</td>
            <td style="padding:10px;text-align:right;font-weight:600">${Utils.fmtCurrency(bl.totalHT||0)}</td>
            <td style="padding:10px;text-align:right;font-weight:800;color:var(--primary)">${Utils.fmtCurrency(bl.totalTTC||0)}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text4);padding:30px">Aucun BL</td></tr>'}
        </tbody>
      </table></div>
    </div>
    </div>`;
  },

  _supplierDetail(supplierId) {
    const s = DB.getById('suppliers', supplierId);
    if (!s) { this._detailId=null; return this._renderList(); }
    const isAR = T.isRTL();
    const isAdmin = Auth.isAdmin();
    const brs      = DB.getAll('brs').filter(b=>b.supplierId===supplierId);
    const payments = DB.getAll('supplier_payments').filter(p=>p.supplierId===supplierId);
    const banks    = DB.getSettings().banks || [];
    const bankMap  = {}; banks.forEach(b=>bankMap[b.id]=b);

    const totalBR   = brs.reduce((s,b)=>s+(b.totalTTC||0),0);
    const totalPaid = payments.reduce((s,p)=>s+(p.amount||0),0);
    const remaining = Math.max(0, totalBR - totalPaid);
    const pct       = totalBR>0?Math.min(100,(totalPaid/totalBR)*100):0;

    // Build per-BR payment info
    const brsPaid = {}; // brId -> amount paid (rough allocation by date)
    payments.forEach(p=>{ (p.brIds||[]).forEach(bid=>{ brsPaid[bid]=(brsPaid[bid]||0)+(p.amount||0); }); });

    return `<div style="padding:20px;max-width:1100px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn btn-outline" onclick="PartnersModule._detailId=null;PartnersModule._tab='suppliers';App.loadModule('partners')"><i class="fas fa-arrow-left"></i> ${isAR?'رجوع':'Retour'}</button>
    </div>

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);border-radius:16px;padding:24px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:rgba(255,255,255,.06);border-radius:50%"></div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900">${(s.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:22px;font-weight:900">${Utils.escHTML(s.name)}</div>
          <div style="font-size:12px;opacity:.7;margin-top:4px">${[s.phone,s.email,s.address].filter(Boolean).map(v=>Utils.escHTML(v)).join(' · ')}</div>
          ${s.nif?`<div style="font-size:11px;opacity:.6;margin-top:2px">NIF: ${Utils.escHTML(s.nif)}</div>`:''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:none" onclick="SuppliersModule.showEdit(${s.id})"><i class="fas fa-edit"></i> Modifier</button>
          ${isAdmin?`<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;font-weight:700" onclick="BankModule.paySupplierModal(null,${s.id})"><i class="fas fa-hand-holding-usd"></i> Payer ce fournisseur</button>`:''}
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px">
      ${[
        {label:'Total Achats (BR)', val:Utils.fmtCurrency(totalBR), color:'#8b5cf6', icon:'fa-file-import'},
        {label:'Total Payé',        val:Utils.fmtCurrency(totalPaid), color:'#10b981', icon:'fa-check-circle'},
        {label:'Reste à Payer',     val:Utils.fmtCurrency(remaining), color:remaining>0?'#ef4444':'#10b981', icon:'fa-exclamation-circle'},
        {label:'Paiements',         val:payments.length, color:'#3b82f6', icon:'fa-credit-card'},
        {label:'BRs',               val:brs.length, color:'#f59e0b', icon:'fa-file'},
      ].map(k=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text4);letter-spacing:.5px;margin-bottom:6px">${k.label}</div>
        <div style="font-size:18px;font-weight:900;color:${k.color}">${k.val}</div>
      </div>`).join('')}
    </div>

    <!-- Progress bar -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:8px">
        <span style="color:var(--text4)">Progression des paiements</span>
        <span style="color:${pct>=100?'#10b981':'#f59e0b'}">${Math.round(pct)}%</span>
      </div>
      <div style="background:var(--bg3);border-radius:8px;height:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${pct>=100?'#10b981':'#8b5cf6'},${pct>=100?'#059669':'#a78bfa'});border-radius:8px;transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text4);margin-top:6px">
        <span>Payé: ${Utils.fmtCurrency(totalPaid)}</span>
        <span>Total: ${Utils.fmtCurrency(totalBR)}</span>
      </div>
    </div>

    <!-- BR History with payment status -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center">
        <span><i class="fas fa-file-import" style="color:#8b5cf6"></i> Bons de Réception (${brs.length})</span>
        <button class="btn btn-sm btn-outline" onclick="CSVExport.exportBRs(${supplierId})"><i class="fas fa-download"></i> Export</button>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--bg3)">
          <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Réf</th>
          <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Date</th>
          <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Statut</th>
          <th style="padding:10px;text-align:right;font-size:10px;text-transform:uppercase;color:var(--text4)">Total TTC</th>
          <th style="padding:10px;width:80px"></th>
        </tr></thead>
        <tbody>${brs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(br=>{
          const statusColor = br.status==='delivered'?'#10b981':'#f59e0b';
          const statusLabel = br.status==='delivered'?'✅ Reçu':'📋 Ouvert';
          return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
            <td style="padding:10px 14px;font-weight:700;color:var(--text)">${Utils.escHTML(br.ref||'')}</td>
            <td style="padding:10px;color:var(--text2)">${br.date||''}</td>
            <td style="padding:10px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${br.status==='delivered'?'rgba(16,185,129,.12)':'rgba(245,158,11,.12)'};color:${statusColor}">${statusLabel}</span></td>
            <td style="padding:10px;text-align:right;font-weight:800;color:#8b5cf6">${Utils.fmtCurrency(br.totalTTC||0)}</td>
            <td style="padding:10px;text-align:right">
              <button title="PDF" style="background:transparent;border:none;color:var(--text4);cursor:pointer;padding:4px" onclick="PDFGen.exportBR(${br.id})"><i class="fas fa-file-pdf"></i></button>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text4);padding:24px">Aucun BR</td></tr>'}
        </tbody>
      </table></div>
    </div>

    <!-- Payment History -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-weight:700;font-size:14px"><i class="fas fa-credit-card" style="color:#10b981"></i> Historique Paiements (${payments.length})</span>
        <div style="display:flex;gap:8px">
          ${isAdmin?`<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none" onclick="BankModule.paySupplierModal(null,${s.id})"><i class="fas fa-plus"></i> Payer</button>`:''}
          <button class="btn btn-sm btn-outline" onclick="CSVExport.exportPayments(${supplierId})"><i class="fas fa-download"></i> Export</button>
        </div>
      </div>
      ${payments.length===0
        ? `<div style="padding:40px;text-align:center;color:var(--text4)"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:10px"></i>Aucun paiement enregistré</div>`
        : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--bg3)">
            <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Réf</th>
            <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Date</th>
            <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Source</th>
            <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text4)">Note</th>
            <th style="padding:10px;text-align:right;font-size:10px;text-transform:uppercase;color:var(--text4)">Montant</th>
            <th style="padding:10px;width:80px"></th>
          </tr></thead>
          <tbody>${payments.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(p=>{
            const bank = p.bankId ? bankMap[p.bankId] : null;
            const srcLabel = p.source==='caisse' ? '💵 Caisse' : (bank?`🏦 ${Utils.escHTML(bank.name)}`:'🏦 Banque');
            return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
              <td style="padding:10px 14px;font-family:monospace;font-size:11px;color:var(--text4)">${Utils.escHTML(p.ref||'—')}</td>
              <td style="padding:10px;color:var(--text2)">${p.date||'—'}</td>
              <td style="padding:10px"><span style="font-size:11px;font-weight:600;color:${p.source==='caisse'?'#f59e0b':'#3b82f6'}">${srcLabel}</span></td>
              <td style="padding:10px;color:var(--text3);font-size:12px">${Utils.escHTML(p.note||'—')}</td>
              <td style="padding:10px;text-align:right;font-weight:900;color:#10b981;font-size:15px">−${Utils.fmtCurrency(p.amount||0)}</td>
              <td style="padding:10px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
                <button title="Décharge PDF" style="background:transparent;border:none;color:var(--text4);cursor:pointer;padding:4px" onclick="PDFGen.exportSupplierPayDecharge(${p.id})"><i class="fas fa-file-pdf"></i></button>
                ${isAdmin?`<button title="Corriger" style="background:transparent;border:none;color:var(--text4);cursor:pointer;padding:4px" onclick="PartnersModule._correctPay(${p.id})"><i class="fas fa-edit"></i></button>`:''}
              </td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>`}
    </div>
  </div>`;
  },


  async _correctPay(payId) {
    if(!Auth.isAdmin())return;const pay=DB.getById('supplier_payments',payId);if(!pay)return;
    const r=await Dialog.show({title:'Corriger paiement',message:`<div class="form-group" style="margin-bottom:10px"><label>Nouveau montant</label><input type="number" id="dlg_cp_a" value="${pay.amount}" style="width:100%"></div><div class="form-group"><label>Note</label><input type="text" id="dlg_cp_n" placeholder="Motif" style="width:100%"></div>`,type:'warning',confirmText:'Corriger',cancelText:'Annuler'});
    if(!r)return;const newAmt=parseFloat(document.getElementById('dlg_cp_a')?.value||pay.amount);const cn=document.getElementById('dlg_cp_n')?.value||'';const u=Auth.getCurrentUser();
    DB.update('supplier_payments',payId,{amount:newAmt,note:(pay.note||'')+` [Corrigé par ${u?.name}: ${cn}]`,correctedBy:u?.id,correctedAt:new Date().toISOString()});
    Utils.notify('Paiement corrigé','success');
    this._detailType='supplier';this._detailId=pay.supplierId;App.loadModule('partners');
  }
};
Modules.partners = PartnersModule;


// ═══════════════════════════════════════════════════════════════
// ADMIN CAISSE CORRECTIONS — Edit any entry
// ═══════════════════════════════════════════════════════════════
AdminCaisseModule._correctEntry = async function(entryId) {
  if (!Auth.isAdmin()) return;
  const entry = DB.getById('caisse_admin', entryId);
  if (!entry) return;
  const r = await Dialog.show({
    title: 'Corriger cette entrée',
    message: `<div style="margin-bottom:12px;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:12px;color:var(--text4)">Type: ${entry.type==='deposit'?'Dépôt':'Retrait'}</div><div style="font-weight:700;font-size:16px;color:${entry.type==='deposit'?'#10b981':'#ef4444'}">${entry.type==='deposit'?'+':'−'}${Utils.fmtCurrency(entry.amount)}</div><div style="font-size:11px;color:var(--text4)">${Utils.escHTML(entry.note||'')}</div></div><div class="form-group" style="margin-bottom:10px"><label>Nouveau montant</label><input type="number" id="dlg_ce_a" value="${entry.amount}" style="width:100%"></div><div class="form-group" style="margin-bottom:10px"><label>Nouvelle note</label><input type="text" id="dlg_ce_n" value="${Utils.escHTML(entry.note||'')}" style="width:100%"></div><div class="form-group"><label>Motif de correction</label><input type="text" id="dlg_ce_m" placeholder="Pourquoi cette correction..." style="width:100%"></div>`,
    type: 'warning', confirmText: 'Corriger', cancelText: 'Annuler'
  });
  if (!r) return;
  const newAmt = parseFloat(document.getElementById('dlg_ce_a')?.value || entry.amount);
  const newNote = document.getElementById('dlg_ce_n')?.value || entry.note;
  const motif = document.getElementById('dlg_ce_m')?.value || '';
  const u = Auth.getCurrentUser();
  DB.update('caisse_admin', entryId, {
    amount: newAmt, note: newNote + (motif ? ` [Corrigé par ${u?.name}: ${motif}]` : ''),
    correctedBy: u?.id, correctedAt: new Date().toISOString(), oldAmount: entry.amount
  });
  if (entry.source === 'bl_delivery' && entry.userId) {
    const session = DB.getAll('sessions').find(s => s.userId === entry.userId && s.date === entry.sessionDate);
    if (session && session.status === 'closed') {
      const deliveryTotal = DB.getAll('caisse_admin').filter(e => e.source === 'bl_delivery' && e.userId === entry.userId && e.sessionDate === entry.sessionDate).reduce((s,e) => s + (Number(e.amount)||0), 0);
      DB.update('sessions', session.id, { ecart: (session.closedEspeces||0) - deliveryTotal });
    }
  }
  Utils.notify('✅ Entrée corrigée','success');App.loadModule('admin_caisse');
};



// CSV EXPORT UTILITY
const CSVExport = {
  download(filename, headers, rows) {
    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows.map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(';'))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
    Utils.notify('Export CSV OK', 'success');
  },
  exportBLs(clientId) {
    const bls = DB.getAll('bls').filter(b => String(b.clientId)===String(clientId));
    const c = DB.getById('clients', clientId);
    this.download('BL_' + (c?.name||'client'), ['Ref','Date','Statut','HT','TTC','Articles'], bls.map(b => [b.ref, b.date, b.status==='delivered'?'Livre':'En cours', b.totalHT||0, b.totalTTC||0, (b.items||[]).length]));
  },
  exportBRs(supplierId) {
    const brs = DB.getAll('brs').filter(b => b.supplierId===supplierId);
    const s = DB.getById('suppliers', supplierId);
    this.download('BR_' + (s?.name||'fournisseur'), ['Ref','Date','Statut','HT','TTC','Articles'], brs.map(b => [b.ref, b.date, b.status==='delivered'?'Recu':'Ouvert', b.totalHT||0, b.totalTTC||0, (b.items||[]).length]));
  },
  exportPayments(supplierId) {
    const pays = DB.getAll('supplier_payments').filter(p => p.supplierId===supplierId);
    const s = DB.getById('suppliers', supplierId);
    const banks = DB.getSettings().banks || [];
    this.download('Paiements_' + (s?.name||'fournisseur'), ['Date','Montant','Banque','Note'], pays.map(p => [p.date, p.amount, (banks.find(b=>b.id===p.bankId)?.name||''), p.note||'']));
  },
  exportBankTx(bankId) {
    const txs = DB.getAll('bank_transactions').filter(t => !bankId || t.bankId===bankId);
    const banks = DB.getSettings().banks || [];
    this.download('Banque_transactions', ['Date','Compte','Type','Montant','Note'], txs.map(t => [t.date, (banks.find(b=>b.id===t.bankId)?.name||''), t.type==='deposit'?'Virement':'Paiement', t.amount, t.note||'']));
  }
};
window.CSVExport = CSVExport;
