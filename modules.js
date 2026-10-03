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
    const cur = localStorage.getItem('themeMode') || s.themeMode || 'light';
    const next = cur === 'light' ? 'dark' : (cur === 'dark' ? 'comfort' : 'light');
    DB.saveSettings({ themeMode: next });
    localStorage.setItem('themeMode', next);
    this.applyTheme();
  },
  applyTheme() {
    const s = DB.getSettings();
    const mode = localStorage.getItem('themeMode') || s.themeMode || 'light';
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
    const btn = document.getElementById('themeToggleBtn');
    if (icon) icon.className = mode === 'dark' ? 'fas fa-sun' : (mode === 'comfort' ? 'fas fa-lightbulb' : 'fas fa-moon');
    if (btn) btn.title = mode === 'light' ? 'Mode Sombre' : (mode === 'dark' ? 'Mode Confort' : 'Mode Clair');
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
  _displayLimit: 50,

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
    // ONLY include active BLs — NOT recycled ones. A deleted BL must free its BR.
    DB.getAll('bls').filter(bl => bl.status !== 'returned').forEach(bl => blMap[bl.brId] = bl);

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
            <th style="font-size:11px">${T.get('col_ref')}</th><th style="font-size:11px">${T.get('col_date')}</th><th style="font-size:11px">${T.get('col_supplier')}</th>
            <th style="font-size:11px">${T.get('col_total_ht')}</th><th style="font-size:11px">${T.get('col_timbre')}</th><th style="font-size:11px">${T.get('col_total_ttc')}</th>
            <th style="font-size:11px">${T.get('col_status')}</th><th class="td-actions" style="font-size:11px">${T.get('col_actions')}</th>
          </tr></thead>
          <tbody>
            ${items.length ? items.slice(0, this._displayLimit).map(br=>{
              const sup = supMap[br.supplierId];
              const isLocked = br.status==='delivered'||br.status==='locked';
              const hasBL = !!blMap[br.id];
              const canEdit = Auth.canEdit(br);
              const canDel = Auth.canDelete(br);
              return `<tr>
                <td><strong>${Utils.escHTML(br.ref||'')}</strong>${isLocked?` <i class="fas fa-lock locked-icon"></i>`:''}${br.isAutoGenerated ? `<div style="margin-top:3px"><span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;padding:2px 6px;background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.12));color:#059669;border-radius:4px;font-weight:700;border:1px solid rgba(16,185,129,.2)"><i class="fas fa-industry"></i> Validé Usine${br.bcRef ? ' · '+Utils.escHTML(br.bcRef) : ''}</span></div>` : ''}<div style="font-size:10px;color:var(--text4);margin-top:2px"><i class="fas fa-user" style="width:10px"></i> ${Utils.escHTML(br.createdByName||'-')}${br.updatedByName && br.updatedByName !== br.createdByName ? ` <i class="fas fa-pen" style="color:#f59e0b;font-size:8px"></i> ${Utils.escHTML(br.updatedByName)}` : ''}</div></td>
                <td style="white-space:nowrap">${Utils.fmtDate(br.date).substring(0,5)}<div style="color:var(--text4);font-size:10px;margin-top:2px">${br.createdAt?new Date(br.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div></td>
                <td>${Utils.escHTML(sup?.name||'-')}${br.ticketPesee ? `<div style="margin-top:3px"><span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;padding:2px 6px;background:rgba(16,185,129,.1);color:#059669;border-radius:4px;font-weight:700"><i class="fas fa-weight-hanging"></i> ${Utils.escHTML(br.ticketPesee)}</span></div>` : ''}</td>
                <td style="white-space:nowrap">${Utils.fmtCurrency(br.totalHT)}</td>
                <td style="white-space:nowrap">${Utils.fmtCurrency(br.timbreAmount)}</td>
                <td class="fw-bold text-primary" style="white-space:nowrap">${Utils.fmtCurrency(br.totalTTC)}</td>
                <td style="text-align:center"><div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><div style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${isLocked?'rgba(16,185,129,.1)':'rgba(14,165,233,.1)'};color:${isLocked?'#10b981':'#0ea5e9'}"><i class="fas ${isLocked?'fa-check':'fa-clock'}" style="font-size:11px"></i></div><div style="font-size:10px;font-weight:700;color:${isLocked?'#10b981':'#0ea5e9'};line-height:1.2">${isLocked?'Enlevé & Livré':'Émis'}</div><div style="font-size:9px;color:${isLocked?'#10b981':'#0ea5e9'};line-height:1;direction:rtl">${isLocked?'تم الاستلام':'صادر'}</div></div>${hasBL ? `<div style="margin-top:2px"><span style="display:inline-flex;align-items:center;gap:2px;font-size:8px;padding:1px 4px;background:rgba(99,102,241,.1);color:#6366f1;border-radius:3px;font-weight:700"><i class="fas fa-truck"></i> BCH</span></div>` : ''}</td>
                <td class="td-actions" style="white-space:nowrap">
                  <button class="btn btn-xs" onclick="BRModule.showDetail(${br.id})" title="${T.get('details')}" style="color:#3b82f6;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2)"><i class="fas fa-eye"></i></button>
                  ${!hasBL && !isLocked && (Auth.isAdmin()||Auth.can('canCreateBL'))?`<button class="btn btn-xs" onclick="BLModule.showGenerate(${br.id})" title="${T.get('br_gen_bl')}" style="color:#10b981;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);font-weight:700;font-size:10px"><i class="fas fa-truck"></i> BCH</button>`:''}
                  ${canEdit?`<button class="btn btn-xs" onclick="BRModule.showEdit(${br.id})" title="${T.get('edit')}" style="color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2)"><i class="fas fa-edit"></i></button>`:''}
                  <button class="btn btn-xs" onclick="PDFGen.exportBR(${br.id})" title="${T.get('pdf')}" style="color:#ef4444;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><i class="fas fa-file-pdf"></i></button>
                  ${canDel?`<button class="btn btn-xs" onclick="BRModule.deleteBR(${br.id})" title="${T.get('delete')}" style="color:#ef4444;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash"></i></button>`:''}
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-file-import"></i><h4>${T.get('no_data')}</h4><p>${T.get('br_new')}</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
      ${items.length > this._displayLimit ? `
        <div style="text-align:center;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px">
          <span style="font-size:12px;color:var(--text4)">${T.isRTL()?'عرض':'Affiché'} ${Math.min(this._displayLimit, items.length)} / ${items.length}</span>
          <button class="btn" onclick="BRModule._displayLimit+=50;App.loadModule('brs')" style="background:linear-gradient(135deg,#6366f1,#818cf8);color:white;border:none;border-radius:8px;padding:8px 20px;font-weight:700;font-size:13px">
            <i class="fas fa-arrow-down"></i> ${T.isRTL()?'تحميل المزيد':'Charger plus'} (+50)
          </button>
          <button class="btn btn-outline" onclick="BRModule._displayLimit=99999;App.loadModule('brs')" style="font-size:11px;padding:6px 12px">
            ${T.isRTL()?'عرض الكل':'Tout afficher'} (${items.length})
          </button>
        </div>` : ''}
    </div></div>`;
  },

  // ── Supplier options ─────────────────────────────────────
  _supOpts(sel='') {
    return DB.getAll('suppliers').sort((a,b)=>(a.name||'').localeCompare(b.name||''))
      .map(s=>`<option value="${s.id}" ${String(sel)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('');
  },

  // ── Line row HTML ────────────────────────────────────────
  _lineRowHTML(line={}, idx) {
    const qty = line.qty ?? 1;
    const price = line.price ?? 0;
    const disc = line.disc ?? 0;
    const tot = Math.round(qty * price * (1 - disc/100) * 100) / 100;
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
    const tot = Math.round(qty * price * (1 - disc/100) * 100) / 100;
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
      ht += Math.round(qty * price * (1 - disc/100) * 100) / 100;
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
        const tot = Math.round(qty * price * (1 - disc/100) * 100) / 100;
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
      const users = DB.getAll('users').filter(u => u.role !== 'admin' && Auth.getUserPermissions(u).canCreateBR === true && u.active !== false);
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
    // console.log(`[CaisseClean] Removed ${toRemove.length} caisse entries for BL id=${blId}`);
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
  _filters: { q:'', status:'all', clientId:'all', supplierId:'all', dateFrom:'', dateTo:'', createdBy:'all', driver:'all', sortDir:'desc' },
  _displayLimit: 50, // Lazy render: show 50 at a time

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
    const curUser = Auth.getCurrentUser();
    const todayDate = Utils.today();
    if (!Auth.isAdmin() && curUser) {
      items = items.filter(b => {
        const bDate = (b.date || b.createdAt || '').slice(0, 10);
        if (bDate < todayDate) return true; // Past days appear for ALL users so anyone can return them!
        return String(b.createdBy) === String(curUser.id) || String(b.deliveredBy) === String(curUser.id);
      });
    }
    if (q) { const ql=q.toLowerCase(); items=items.filter(b=>(b.ref+' '+(b.driverName||'')+' '+(b.truckIMM||'')+' '+(b.linkedBrRef||'')+' '+(brMap[b.brId]?.ref||'')+' '+(cliMap[b.clientId]?.name||'')+' '+(DB.getById('suppliers', b.supplierId)?.name||'')).toLowerCase().includes(ql)); }
    if (status!=='all') items=items.filter(b=>(b.status||'open')===status);
    if (this._filters.clientId && this._filters.clientId!=='all') items=items.filter(b=>String(b.clientId)===String(this._filters.clientId));
    if (this._filters.supplierId && this._filters.supplierId!=='all') items=items.filter(b=>String(b.supplierId)===String(this._filters.supplierId));
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
            ${clients.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c=>`<option value="${c.id}" ${String(BLModule._filters.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
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
            <th style="font-size:11px">${T.get('col_ref')}</th><th style="font-size:11px">${T.get('bl_linked_br')}</th><th style="font-size:11px">${T.get('col_date')}</th>
            <th style="font-size:11px">${T.get('col_client')}</th><th style="font-size:11px">${T.isRTL()?'السائق':'Chauffeur'}</th>
            <th style="font-size:11px">${T.get('col_total_ttc')}</th><th style="font-size:11px">${T.get('col_status')}</th><th class="td-actions" style="font-size:11px;text-align:center">${T.get('col_actions')}</th>
          </tr></thead>
          <tbody>
            ${items.length ? items.slice(0, this._displayLimit).map(bl=>{
              const br = brMap[bl.brId];
              const cli = cliMap[bl.clientId];
              const isLocked = bl.status==='delivered'||bl.status==='locked';
              const dest = bl.destinationAddress||cli?.address||'';
               return `<tr>
                <td><strong>${Utils.escHTML(bl.ref||'')}</strong>${isLocked?` <i class="fas fa-lock locked-icon"></i>`:''}${bl.status==='returned'?`<div style="font-size:10px;color:#ef4444;margin-top:2px"><i class="fas fa-undo"></i> Ret.</div>`:''}<div style="font-size:10px;color:var(--text4);margin-top:2px"><i class="fas fa-user" style="width:10px"></i> ${Utils.escHTML(bl.createdByName||'-')}</div></td>
                <td>${br?`<span class="badge badge-primary" style="font-size:10px;padding:2px 5px">${Utils.escHTML(br.ref)}</span>`:'-'}</td>
                <td style="white-space:nowrap">${Utils.fmtDate(bl.date).substring(0,5)}<div style="color:var(--text4);font-size:10px;margin-top:2px">${bl.createdAt?new Date(bl.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div></td>
                <td>${Utils.escHTML(cli?.name||'-')}</td>
                <td>${Utils.escHTML(bl.driverName||'-')}<div style="font-size:10px;color:var(--text4)"><code>${Utils.escHTML(bl.truckIMM||'')}</code></div></td>
                <td class="fw-bold text-primary" style="white-space:nowrap">${Utils.fmtCurrency(bl.totalTTC||br?.totalTTC||0)}</td>
                <td style="text-align:center"><div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><div style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${bl.status==='delivered'?'rgba(16,185,129,.1)':bl.status==='returned'?'rgba(239,68,68,.1)':'rgba(14,165,233,.1)'};color:${bl.status==='delivered'?'#10b981':bl.status==='returned'?'#ef4444':'#0ea5e9'}"><i class="fas ${bl.status==='delivered'?'fa-check':bl.status==='returned'?'fa-undo':'fa-clock'}" style="font-size:11px"></i></div><div style="font-size:10px;font-weight:700;color:${bl.status==='delivered'?'#10b981':bl.status==='returned'?'#ef4444':'#0ea5e9'};line-height:1.2">${bl.status==='delivered'?'Livré':bl.status==='returned'?'Retourné':'En cours'}</div><div style="font-size:9px;color:${bl.status==='delivered'?'#10b981':bl.status==='returned'?'#ef4444':'#0ea5e9'};line-height:1;direction:rtl">${bl.status==='delivered'?'تم التسليم':bl.status==='returned'?'مرتجع':'قيد التنفيذ'}</div></div>${bl.linkedBrId || bl.status === 'validated_usine' ? `<div style="margin-top:3px"><span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:2px 6px;background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(5,150,105,.15));color:#059669;border-radius:4px;font-weight:800;border:1px solid rgba(16,185,129,.25)"><i class="fas fa-industry"></i> Validé Usine ✓</span></div>` : (bl.status === 'pending_usine' ? `<div style="margin-top:3px"><span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:2px 6px;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(217,119,6,.15));color:#d97706;border-radius:4px;font-weight:800;border:1px solid rgba(245,158,11,.25)"><i class="fas fa-hourglass-half"></i> En attente Usine</span></div>` : '')}</td>
                <td class="td-actions" style="white-space:nowrap">
                  <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:nowrap">
                    <button class="btn btn-xs" onclick="BLModule.showDetail(${bl.id})" title="${T.get('details')}" style="color:#3b82f6;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-eye"></i></button>
                    ${Auth.canEdit(bl)?`<button class="btn btn-xs" onclick="BLModule.showEdit(${bl.id},${Auth.isAdmin()})" title="Modifier" style="color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-edit"></i></button>`:''}
                    ${bl.status==='returned'?'':(Auth.canReturn(bl)?`<button class="btn btn-xs" onclick="BLModule.processReturn(${bl.id})" title="Retour" style="color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-undo"></i></button>`:((!isLocked)?`<button class="btn btn-xs" onclick="BLModule.confirmDelivery(${bl.id})" title="Livrer" style="color:#10b981;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-check"></i></button>`:''))}
                    <button class="btn btn-xs" onclick="PDFGen.exportBonChargement(${bl.id})" title="BCH PDF" style="color:#ef4444;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn btn-xs" onclick="PDFGen.exportBLRoute(${bl.id})" title="BL Route" style="color:#3b82f6;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-road"></i></button>
                    ${bl.status==='returned'?`<button class="btn btn-xs" onclick="PDFGen.exportBonRetour(${bl.id})" title="${T.isRTL()?'سند إرجاع':'Bon de Retour PDF'}" style="color:#fff;background:linear-gradient(135deg,#f97316,#ea580c);border:none;min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-exchange-alt"></i></button>`:''}
                    ${Auth.canDelete(bl)?`<button class="btn btn-xs" onclick="BLModule.deleteBL(${bl.id})" title="Supprimer" style="color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);min-width:30px;min-height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px"><i class="fas fa-trash"></i></button>`:''}
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-file-export"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
      ${items.length > this._displayLimit ? `
        <div style="text-align:center;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px">
          <span style="font-size:12px;color:var(--text4)">${T.isRTL()?'عرض':'Affiché'} ${Math.min(this._displayLimit, items.length)} / ${items.length}</span>
          <button class="btn" onclick="BLModule._displayLimit+=50;App.loadModule('bls')" style="background:linear-gradient(135deg,#6366f1,#818cf8);color:white;border:none;border-radius:8px;padding:8px 20px;font-weight:700;font-size:13px">
            <i class="fas fa-arrow-down"></i> ${T.isRTL()?'تحميل المزيد':'Charger plus'} (+50)
          </button>
          <button class="btn btn-outline" onclick="BLModule._displayLimit=99999;App.loadModule('bls')" style="font-size:11px;padding:6px 12px">
            ${T.isRTL()?'عرض الكل':'Tout afficher'} (${items.length})
          </button>
        </div>` : ''}
    </div></div>`;
  },


  async showNewBL() {
    // Admin picks a user who has canCreateBL permission
    if (Auth.isAdmin()) {
      const users = DB.getAll('users').filter(u => u.role !== 'admin' && Auth.getUserPermissions(u).canCreateBL === true && u.active !== false);
      if (users.length > 0) {
        const opts = users.map(u=>`<option value="${u.id}">${Utils.escHTML(u.name||u.username)}</option>`).join('');
        const picked = await Dialog.show({
          title: '👤 Attribuer la création à...',
          message: `<div style="margin-bottom:10px;font-size:13px">Ce Bon de Chargement sera comptabilisé dans la mini-caisse de :</div><select id="dlg_bl_as_user" class="input">${opts}</select><div style="margin-top:10px;font-size:11px">Vous restez affiché comme "Modifié par" pour transparence</div>`,
          type: 'info', confirmText: 'Continuer', cancelText: 'Annuler'
        });
        if (!picked) return;
        BLModule._adminActAsUserId = parseInt(document.getElementById('dlg_bl_as_user')?.value);
      }
    }

    const allBRs = DB.getAll('brs');
    const openBRs = allBRs.filter(b => b.status !== 'delivered' && b.status !== 'locked');
    const supMap = {}; DB.getAll('suppliers').forEach(s => supMap[s.id] = s);
    const allSuppliers = DB.getAll('suppliers');
    const allClients = DB.getAll('clients');
    const allArticles = DB.getAll('articles');
    openBRs.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    // Modal HTML with 2 Modes
    const modalHTML = `
    <div style="margin-bottom:12px">
      <!-- Mode Switcher -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <button type="button" id="btn-mode-direct" class="btn btn-primary" onclick="BLModule._switchNewBCHMode('direct')" style="padding:12px 14px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700">
          <i class="fas fa-industry" style="font-size:18px"></i>
          <div style="text-align:left">
            <div>1. Courtage Direct Usine</div>
            <div style="font-size:10px;font-weight:400;opacity:.85">Enlèvement usine sans BR préalable</div>
          </div>
        </button>
        <button type="button" id="btn-mode-stock" class="btn btn-outline" onclick="BLModule._switchNewBCHMode('stock')" style="padding:12px 14px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700">
          <i class="fas fa-boxes" style="font-size:18px"></i>
          <div style="text-align:left">
            <div>2. Déstockage Dépôt</div>
            <div style="font-size:10px;font-weight:400;opacity:.85">Depuis un BR existant en stock (${openBRs.length})</div>
          </div>
        </button>
      </div>

      <!-- PANEL 1: DIRECT FACTORY MODE (No prior BR) -->
      <div id="bch-panel-direct">
        <div style="background:var(--bg2);padding:14px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px">
          <div class="form-row-3" style="margin-bottom:10px">
            <div class="form-group mb-0">
              <label class="required"><i class="fas fa-industry"></i> Usine / Fournisseur</label>
              <select id="direct-bch-supplier" class="input" required>
                <option value="">— Choisir l'Usine —</option>
                ${allSuppliers.map(s => `<option value="${s.id}">${Utils.escHTML(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="required"><i class="fas fa-user-tie"></i> Client Destinataire</label>
              <select id="direct-bch-client" class="input" required onchange="BLModule._onDirectClientChange(this.value)">
                <option value="">— Choisir le Client —</option>
                ${allClients.map(c => `<option value="${c.id}">${Utils.escHTML(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-0">
              <label><i class="fas fa-calendar-day"></i> Date d'émission</label>
              <input type="date" id="direct-bch-date" class="input" value="${Utils.today()}">
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group mb-0">
              <label class="required"><i class="fas fa-id-card"></i> Nom du Chauffeur</label>
              <input type="text" id="direct-bch-driver" class="input" placeholder="Nom complet..." oninput="BLModule._onDirectDriverInput(this.value)">
            </div>
            <div class="form-group mb-0">
              <label class="required"><i class="fas fa-truck"></i> Matricule Camion</label>
              <input type="text" id="direct-bch-truck" class="input" placeholder="Ex: 01234-123-16">
            </div>
            <div class="form-group mb-0">
              <label><i class="fas fa-map-marker-alt"></i> Destination / Chantier</label>
              <input type="text" id="direct-bch-dest" class="input" placeholder="Adresse de livraison...">
            </div>
          </div>
        </div>

        <!-- Articles Table -->
        <div style="font-weight:800;font-size:13px;margin-bottom:8px;color:var(--text);display:flex;justify-content:space-between;align-items:center">
          <span><i class="fas fa-list"></i> Marchandises à charger</span>
          <button type="button" class="btn btn-xs btn-outline" onclick="BLModule._addDirectBCHRow()"><i class="fas fa-plus"></i> Ajouter ligne</button>
        </div>

        <datalist id="bch-articles-list">
          ${allArticles.map(a => `<option value="${Utils.escHTML(a.name)}" data-unit="${Utils.escHTML(a.unit||'U')}" data-price="${a.price||0}">`).join('')}
        </datalist>

        <div class="table-wrap" style="margin-bottom:12px;max-height:260px;overflow-y:auto">
          <table class="table" style="width:100%;font-size:12px">
            <thead>
              <tr style="background:var(--bg3)">
                <th style="min-width:180px">Désignation</th>
                <th style="width:70px">Unité</th>
                <th style="width:90px">Quantité</th>
                <th style="width:110px">P.U. Vente HT</th>
                <th style="width:110px">P.U. Achat Usine</th>
                <th style="width:80px">Remise %</th>
                <th style="width:110px;text-align:right">Total HT</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody id="direct-bch-rows"></tbody>
          </table>
        </div>

        <!-- Direct Totals Box -->
        <div style="background:var(--bg2);padding:14px;border-radius:10px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px">
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <div class="form-group mb-0" style="width:110px">
              <label>TVA %</label>
              <select id="direct-bch-tva-rate" class="input" onchange="BLModule._recalcDirectBCHTotals()">
                <option value="19" selected>19 %</option>
                <option value="9">9 %</option>
                <option value="0">0 % (Exo)</option>
              </select>
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:14px">
              <input type="checkbox" id="direct-bch-no-timbre" onchange="BLModule._recalcDirectBCHTotals()">
              Exonéré de timbre
            </label>
          </div>

          <div style="display:flex;flex-direction:column;gap:4px;min-width:260px;text-align:right">
            <div style="font-size:12px;color:var(--text3)">Total HT : <strong id="direct-bch-tot-ht" style="color:var(--text)">0,00 DA</strong></div>
            <div style="font-size:12px;color:var(--text3)">TVA (<span id="direct-bch-tva-pct">19%</span>) : <strong id="direct-bch-tot-tva" style="color:var(--text)">0,00 DA</strong></div>
            <div style="font-size:12px;color:var(--text3)">Timbre Fiscal : <strong id="direct-bch-tot-timbre" style="color:var(--text)">0,00 DA</strong></div>
            <div style="font-size:16px;font-weight:900;color:var(--primary);border-top:2px solid var(--primary);padding-top:6px;margin-top:2px">
              TOTAL TTC : <span id="direct-bch-tot-ttc">0,00 DA</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL 2: STOCK BR MODE (Existing BR) -->
      <div id="bch-panel-stock" style="display:none">
        <div class="form-group mb-2">
          <label class="required">Sélectionner le BR en stock</label>
          <select id="newbl-br" onchange="BLModule._onNewBLBRChange(this.value)">
            <option value="">— Choisir un BR en stock —</option>
            ${openBRs.map(br => `<option value="${br.id}">${Utils.escHTML(br.ref)} — ${Utils.escHTML(supMap[br.supplierId]?.name||'?')} — ${Utils.fmtCurrency(br.totalTTC)}</option>`).join('')}
          </select>
        </div>
        <div id="newbl-info"></div>
        <div id="newbl-form" style="display:none"><div id="newbl-form-inner"></div></div>
      </div>
    </div>
    `;

    const footerHTML = `
      <div id="bch-footer-direct" style="display:flex;gap:8px;justify-content:flex-end;width:100%">
        <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
        <button class="btn btn-outline" onclick="BLModule._saveDirectBCH(true, 'route')"><i class="fas fa-road"></i> Sauver & BL Route</button>
        <button class="btn btn-outline" onclick="BLModule._saveDirectBCH(true, 'bch')"><i class="fas fa-file-pdf"></i> Sauver & Bon Chargement (2 Volets)</button>
        <button class="btn btn-success" onclick="BLModule._saveDirectBCH(false)"><i class="fas fa-truck-loading"></i> Créer Bon de Chargement</button>
      </div>
      <div id="bch-footer-stock" style="display:none;gap:8px;justify-content:flex-end;width:100%">
        <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
        <button class="btn btn-outline" id="newbl-pdf" style="display:none" onclick="BLModule._saveFromNewBL(true)"><i class="fas fa-file-pdf"></i> Sauver & PDF</button>
        <button class="btn btn-success" id="newbl-save" style="display:none" onclick="BLModule._saveFromNewBL(false)"><i class="fas fa-truck"></i> Créer BL</button>
      </div>
    `;

    UI.showModal(`<i class="fas fa-truck-loading"></i> Nouveau Bon de Chargement (BCH)`, modalHTML, footerHTML, 'xl');

    // Initialize with 1 default empty line in Direct mode
    BLModule._directBCHRows = [];
    BLModule._addDirectBCHRow();
  },

  _switchNewBCHMode(mode) {
    const pDirect = document.getElementById('bch-panel-direct');
    const pStock  = document.getElementById('bch-panel-stock');
    const fDirect = document.getElementById('bch-footer-direct');
    const fStock  = document.getElementById('bch-footer-stock');
    const bDirect = document.getElementById('btn-mode-direct');
    const bStock  = document.getElementById('btn-mode-stock');

    if (mode === 'direct') {
      if (pDirect) pDirect.style.display = 'block';
      if (pStock)  pStock.style.display = 'none';
      if (fDirect) fDirect.style.display = 'flex';
      if (fStock)  fStock.style.display = 'none';
      if (bDirect) { bDirect.className = 'btn btn-primary'; }
      if (bStock)  { bStock.className = 'btn btn-outline'; }
    } else {
      if (pDirect) pDirect.style.display = 'none';
      if (pStock)  pStock.style.display = 'block';
      if (fDirect) fDirect.style.display = 'none';
      if (fStock)  fStock.style.display = 'flex';
      if (bDirect) { bDirect.className = 'btn btn-outline'; }
      if (bStock)  { bStock.className = 'btn btn-primary'; }
    }
  },

  _addDirectBCHRow(item = {}) {
    const tbody = document.getElementById('direct-bch-rows');
    if (!tbody) return;
    const idx = (BLModule._directBCHRows = BLModule._directBCHRows || []).length;
    BLModule._directBCHRows.push(idx);

    const tr = document.createElement('tr');
    tr.id = `direct-bch-tr-${idx}`;
    tr.innerHTML = `
      <td>
        <input type="text" id="direct-bch-des-${idx}" list="bch-articles-list" class="input" style="padding:6px 8px;font-size:12px" placeholder="Désignation marchandise..." value="${Utils.escHTML(item.designation||'')}" oninput="BLModule._onDirectArticleSelect(${idx}, this.value)">
      </td>
      <td>
        <input type="text" id="direct-bch-unit-${idx}" class="input" style="padding:6px 8px;font-size:12px;text-align:center" placeholder="U" value="${Utils.escHTML(item.unit||'U')}">
      </td>
      <td>
        <input type="number" id="direct-bch-qty-${idx}" class="input" style="padding:6px 8px;font-size:12px;text-align:center" min="0" step="any" placeholder="0" value="${item.qty||''}" oninput="BLModule._recalcDirectBCHRow(${idx})">
      </td>
      <td>
        <input type="number" id="direct-bch-price-${idx}" class="input" style="padding:6px 8px;font-size:12px;text-align:right" min="0" step="any" placeholder="0.00" value="${item.price||''}" oninput="BLModule._recalcDirectBCHRow(${idx})">
      </td>
      <td>
        <input type="number" id="direct-bch-buy-${idx}" class="input" style="padding:6px 8px;font-size:12px;text-align:right" min="0" step="any" placeholder="0.00" value="${item.purchasePrice||''}">
      </td>
      <td>
        <input type="number" id="direct-bch-disc-${idx}" class="input" style="padding:6px 8px;font-size:12px;text-align:center" min="0" max="100" step="any" placeholder="0" value="${item.disc||0}" oninput="BLModule._recalcDirectBCHRow(${idx})">
      </td>
      <td style="text-align:right;font-weight:700;vertical-align:middle">
        <span id="direct-bch-tot-${idx}">0,00 DA</span>
      </td>
      <td style="text-align:center;vertical-align:middle">
        <button type="button" class="btn btn-xs btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="BLModule._removeDirectBCHRow(${idx})"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
    BLModule._recalcDirectBCHTotals();
  },

  _onDirectArticleSelect(idx, val) {
    if (!val) return;
    const art = DB.getAll('articles').find(a => a && a.name && a.name.toLowerCase() === val.toLowerCase());
    if (art) {
      const uInp = document.getElementById(`direct-bch-unit-${idx}`);
      const pInp = document.getElementById(`direct-bch-price-${idx}`);
      const bInp = document.getElementById(`direct-bch-buy-${idx}`);
      if (uInp && art.unit) uInp.value = art.unit;
      if (pInp && art.price && !pInp.value) pInp.value = art.price;
      if (bInp && art.purchasePrice && !bInp.value) bInp.value = art.purchasePrice;
      BLModule._recalcDirectBCHRow(idx);
    }
  },

  _removeDirectBCHRow(idx) {
    const tr = document.getElementById(`direct-bch-tr-${idx}`);
    if (tr) tr.remove();
    BLModule._recalcDirectBCHTotals();
  },

  _recalcDirectBCHRow(idx) {
    const qty = parseFloat(document.getElementById(`direct-bch-qty-${idx}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`direct-bch-price-${idx}`)?.value) || 0;
    const disc = parseFloat(document.getElementById(`direct-bch-disc-${idx}`)?.value) || 0;
    const tot = Math.round(qty * price * (1 - disc / 100) * 100) / 100;
    const span = document.getElementById(`direct-bch-tot-${idx}`);
    if (span) span.textContent = Utils.fmtCurrency(tot);
    BLModule._recalcDirectBCHTotals();
  },

  _recalcDirectBCHTotals() {
    let totalHT = 0;
    const rows = document.querySelectorAll('#direct-bch-rows tr');
    rows.forEach(tr => {
      const idx = tr.id.replace('direct-bch-tr-', '');
      const qty = parseFloat(document.getElementById(`direct-bch-qty-${idx}`)?.value) || 0;
      const price = parseFloat(document.getElementById(`direct-bch-price-${idx}`)?.value) || 0;
      const disc = parseFloat(document.getElementById(`direct-bch-disc-${idx}`)?.value) || 0;
      totalHT += Math.round(qty * price * (1 - disc / 100) * 100) / 100;
    });
    totalHT = Math.round(totalHT * 100) / 100;

    const tvaRate = parseFloat(document.getElementById('direct-bch-tva-rate')?.value) ?? 19;
    const tvaAmt = Math.round(totalHT * tvaRate / 100 * 100) / 100;
    const noTimbre = document.getElementById('direct-bch-no-timbre')?.checked || false;
    const timbreAmt = noTimbre ? 0 : DB.calcTimbre(totalHT);
    const totalTTC = Math.round((totalHT + tvaAmt + timbreAmt) * 100) / 100;

    const el = id => document.getElementById(id);
    if (el('direct-bch-tot-ht')) el('direct-bch-tot-ht').textContent = Utils.fmtCurrency(totalHT);
    if (el('direct-bch-tva-pct')) el('direct-bch-tva-pct').textContent = tvaRate + '%';
    if (el('direct-bch-tot-tva')) el('direct-bch-tot-tva').textContent = Utils.fmtCurrency(tvaAmt);
    if (el('direct-bch-tot-timbre')) el('direct-bch-tot-timbre').textContent = Utils.fmtCurrency(timbreAmt);
    if (el('direct-bch-tot-ttc')) el('direct-bch-tot-ttc').textContent = Utils.fmtCurrency(totalTTC);
  },

  _onDirectClientChange(clientId) {
    if (!clientId) return;
    const cli = DB.getById('clients', Number(clientId));
    const destInp = document.getElementById('direct-bch-dest');
    if (cli && destInp && !destInp.value && cli.address) {
      destInp.value = cli.address;
    }
  },

  _onDirectDriverInput(name) {
    if (!name) return;
    const imm = DB.getDriverIMM(name);
    const truckInp = document.getElementById('direct-bch-truck');
    if (imm && truckInp && !truckInp.value) {
      truckInp.value = imm;
    }
  },

  async _saveDirectBCH(andPrint = false, printType = 'bch') {
    if (!Auth.isAdmin() && !Auth.can('canCreateBL')) {
      Utils.notify('⛔ Vous n’avez pas la permission de créer des Bons de Chargement', 'error');
      return;
    }

    const supplierId = document.getElementById('direct-bch-supplier')?.value;
    const clientId   = document.getElementById('direct-bch-client')?.value;
    const date       = document.getElementById('direct-bch-date')?.value || Utils.today();
    const driverName = (document.getElementById('direct-bch-driver')?.value||'').trim();
    const truckIMM   = (document.getElementById('direct-bch-truck')?.value||'').trim();
    const destAddr   = (document.getElementById('direct-bch-dest')?.value||'').trim();

    if (!supplierId) { Utils.notify('Veuillez sélectionner une Usine / Fournisseur', 'error'); return; }
    if (!clientId)   { Utils.notify('Veuillez sélectionner un Client', 'error'); return; }
    if (!driverName) { Utils.notify('Veuillez indiquer le nom du chauffeur', 'error'); return; }
    if (!truckIMM)   { Utils.notify('Veuillez indiquer le matricule du camion', 'error'); return; }

    const rows = document.querySelectorAll('#direct-bch-rows tr');
    const lines = [];
    rows.forEach(tr => {
      const idx = tr.id.replace('direct-bch-tr-', '');
      const designation = (document.getElementById(`direct-bch-des-${idx}`)?.value || '').trim();
      const unit = (document.getElementById(`direct-bch-unit-${idx}`)?.value || 'U').trim();
      const qty = parseFloat(document.getElementById(`direct-bch-qty-${idx}`)?.value) || 0;
      const price = parseFloat(document.getElementById(`direct-bch-price-${idx}`)?.value) || 0;
      const purchasePrice = parseFloat(document.getElementById(`direct-bch-buy-${idx}`)?.value) || price;
      const disc = parseFloat(document.getElementById(`direct-bch-disc-${idx}`)?.value) || 0;
      const tot = Math.round(qty * price * (1 - disc / 100) * 100) / 100;

      if (designation && qty > 0) {
        lines.push({
          designation,
          unit,
          qty,
          qtyDelivered: qty,
          price,
          purchasePrice,
          disc,
          total: tot
        });
      }
    });

    if (!lines.length) {
      Utils.notify('Veuillez saisir au moins une marchandise avec quantité > 0', 'error');
      return;
    }

    const totalHT = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    const tvaRate = parseFloat(document.getElementById('direct-bch-tva-rate')?.value) ?? 19;
    const tvaAmount = Math.round(totalHT * tvaRate / 100 * 100) / 100;
    const noTimbre = document.getElementById('direct-bch-no-timbre')?.checked || false;
    const timbreAmount = noTimbre ? 0 : DB.calcTimbre(totalHT);
    const totalTTC = Math.round((totalHT + tvaAmount + timbreAmount) * 100) / 100;

    const sup = DB.getById('suppliers', Number(supplierId));
    const cli = DB.getById('clients', Number(clientId));
    const year = new Date().getFullYear();
    const nextBCHNum = await DB.getNextBCHNum();
    const ref = DB.buildBCHRef(nextBCHNum, year, null, sup?.refAbbrev || '');

    DB.saveDriver(driverName, truckIMM);

    // Save articles to catalog if new
    lines.forEach(l => {
      DB.saveArticle(l.designation, l.unit, l.price);
    });

    // User attribution
    const adminU = Auth.getCurrentUser();
    const targetUserId = (Auth.isAdmin() && BLModule._adminActAsUserId) ? BLModule._adminActAsUserId : adminU?.id;
    const targetUser = DB.getById('users', targetUserId) || adminU;
    BLModule._adminActAsUserId = null;

    const bchDoc = {
      ref,
      bchNum: nextBCHNum,
      year,
      date,
      supplierId: Number(supplierId),
      supplierName: sup?.name || 'Usine',
      clientId: Number(clientId),
      clientName: cli?.name || 'Client',
      driverName,
      truckIMM,
      destinationAddress: destAddr || cli?.address || '',
      lines,
      totalHT,
      tvaRate,
      tvaAmount,
      noTimbre,
      timbreAmount,
      totalTTC,
      status: 'pending_usine', // STRICT: Courtage sans BR is pending usine loading!
      isBonChargement: true,
      brId: null,
      linkedBrId: null,
      linkedBrRef: null,
      createdBy: targetUserId,
      createdByName: targetUser?.name || targetUser?.username || 'Utilisateur',
      createdAt: new Date().toISOString()
    };

    const savedBCH = DB.insert('bls', bchDoc);

    // Create reserved BR immediately
    try {
      const reservedBR = await DB.createReservedBR(savedBCH.id);
      Utils.notify(`BR réservé: ${reservedBR.ref} — En attente validation usine`, 'info', 4000);
    } catch(e) { console.error('Reserved BR error:', e); }

    Utils.notify(`BCH ${ref} cree - En attente validation usine ${sup?.name || ''}`, 'success', 5000);

    // Notify: BCH sent to usine
    if (typeof NotifMgr !== 'undefined') {
      NotifMgr.add({
        type: 'bc_created',
        title: T.isRTL() ? 'تم إرسال BCH إلى المصنع' : 'BCH envoye vers l\'usine',
        message: T.isRTL() ? `تم إرسال BCH ${ref} إلى ${sup?.name||'المصنع'} للشحن. السائق: ${driver||'-'} (${imm||'-'}).` : `Le BCH ${ref} a ete envoye vers ${sup?.name||'l\'usine'} pour chargement. Chauffeur: ${driver||'-'} (${imm||'-'}).`,
        link: { mod: 'bls', id: savedBCH.id },
        data: { bcId: savedBCH.id }
      });
    }

    UI.closeModal();
    App.loadModule('bls');

    if (andPrint && savedBCH) {
      setTimeout(() => {
        if (printType === 'route') {
          PDFGen.exportBLRoute(savedBCH.id);
        } else {
          PDFGen.exportBonChargement(savedBCH.id);
        }
      }, 300);
    }
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

  async showGenerate(brId) {
    if (!Auth.isAdmin() && !Auth.can('canCreateBL')) { Utils.notify('⛔ Permission refusée — création BL', 'error'); return; }
    const br = DB.getById('brs', brId);
    if (!br) return;

    // Admin picks which user this BL belongs to (same as showNewBL)
    if (Auth.isAdmin()) {
      const users = DB.getAll('users').filter(u => u.role !== 'admin' && Auth.getUserPermissions(u).canCreateBL === true && u.active !== false);
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

    UI.showModal(`<i class="fas fa-truck"></i> ${T.get('bl_from_br')} — ${br.ref}`, this._blModalBody(br, null), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-outline" onclick="BLModule._saveBL(${brId},null,true)"><i class="fas fa-print"></i> Sauver & PDF</button>
      <button class="btn btn-success" onclick="BLModule._saveBL(${brId},null,false)"><i class="fas fa-truck"></i> Générer BL</button>`, 'xl');
    setTimeout(() => { BLModule._recalcBLTotals(); FormGuide.start(['bl-client','bl-destination','bl-driver','bl-truck','bl-date']); }, 100);
  },

  showEdit(blId, adminOverride = false) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    if (bl.status === 'returned') {
      Utils.notify("Ce bon de livraison a été retourné et est archivé définitivement. Modification impossible.", 'error');
      return;
    }
    if (!Auth.canEdit(bl) && !adminOverride) {
      Utils.notify("Ce document date d'un jour antérieur ou la caisse est clôturée. Seul l'administrateur peut le modifier.", 'warning');
      return;
    }
    const br = DB.getById('brs', bl.brId);
    if (!br) return;
    const title = adminOverride
      ? `<i class="fas fa-shield-alt" style="color:#a78bfa"></i> Admin Edit — ${bl.ref} <span style="font-size:11px;background:rgba(99,102,241,.15);color:#a78bfa;padding:2px 8px;border-radius:6px;margin-left:6px">Override</span>`
      : `<i class="fas fa-edit"></i> ${T.get('edit')} BL — ${bl.ref}`;
    UI.showModal(title, this._blModalBody(br, bl), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      ${adminOverride
        ? `<button class="btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff" onclick="BLModule._saveBL(${bl.brId},${blId},false,true)"><i class="fas fa-shield-alt"></i> Sauver (Admin)</button>`
        : `<button class="btn btn-warning" onclick="BLModule._saveBL(${bl.brId},${blId},false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`
      }
      ${(bl.status !== 'delivered' && bl.status !== 'locked') ? `<button class="btn btn-success" onclick="BLModule._saveBL(${bl.brId},${blId},false);setTimeout(()=>BLModule.confirmDelivery(${blId}),500)"><i class="fas fa-check-circle"></i> Sauver & Valider</button>` : ''}`, 'xl');
    setTimeout(() => { BLModule._recalcBLTotals(); FormGuide.start(['bl-client','bl-destination','bl-driver','bl-truck','bl-date']); }, 100);
  },

  _onDriverInput(val) {
    const dd = document.getElementById('bl-driver-ac');
    if (!dd) return;
    if (!val || val.length < 1) { dd.style.display='none'; return; }
    const drivers = DB.getAll('drivers').filter(d => (d.name||'').toLowerCase().includes((val||'').toLowerCase()));
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
    
    // Calculate already-delivered quantities for this BR (from existing active BLs)
    const existingBLs = bl ? [] : DB.getAll('bls').filter(b => Number(b.brId) === Number(br.id) && b.status !== 'returned');
    const deliveredQtyByLine = {};
    existingBLs.forEach(existingBL => {
      (existingBL.lines || []).forEach(line => {
        const key = line.designation || line.articleId || '';
        deliveredQtyByLine[key] = (deliveredQtyByLine[key] || 0) + (Number(line.qtyDelivered || line.qty) || 0);
      });
    });

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
        ${DB.getAll('clients').sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c=>`<option value="${c.id}" ${String(bl?.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
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
            let qtyDel, maxQty;
            if (existingLine) {
              qtyDel = existingLine.qtyDelivered ?? existingLine.qty ?? l.qty;
              maxQty = l.qty || 9999;
            } else {
              qtyDel = Math.max(0, (Number(l.qty)||0) - (deliveredQtyByLine[l.designation || l.articleId || ''] || 0));
              maxQty = qtyDel;
            }
            const tot = (Number(qtyDel)||0) * (Number(l.price)||0) * (1-(Number(l.disc)||0)/100);
            return `<tr>
              <td>${i+1}</td>
              <td style="text-align:left"><strong>${Utils.escHTML(l.designation||'')}</strong></td>
              <td style="text-align:center">${Utils.escHTML(l.unit||'U')}</td>
              <td style="text-align:center;color:var(--text4)">${l.qty||0}</td>
              <td><input type="number" id="bl-qty-${i}" value="${qtyDel||0}" min="0"
                max="${maxQty}" step="any" style="width:80px;text-align:center"
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
    const tot   = Math.round(qty * price * (1 - disc/100) * 100) / 100;
    const el = document.getElementById(`bl-linetot-${idx}`);
    if (el) el.textContent = Utils.fmtCurrency(tot);
    this._recalcBLTotals();
  },

  _recalcBLTotals() {
    let ht = 0, i = 0;
    while (document.getElementById(`bl-qty-${i}`)) {
      const input = document.getElementById(`bl-qty-${i}`);
      const qty = parseFloat(input.value)||0;
      ht += Math.round(qty * (parseFloat(input.dataset.price)||0) * (1 - (parseFloat(input.dataset.disc)||0)/100) * 100) / 100;
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
      const tot   = Math.round(qty * price * (1 - disc/100) * 100) / 100;
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
      ref = existing?.ref || DB.buildBCHRef(br.brNum, br.year);
      partNum = existing?.partNum || null;
    } else if (isPartial) {
      partNum = DB.getNextBLPartNum(brId);
      ref = DB.buildBCHRef(br.brNum, br.year, partNum);
    } else {
      ref = DB.buildBCHRef(br.brNum, br.year);
    }

    DB.saveDriver(driverName, truckIMM);

    const data = {
      ref, brId, clientId: Number(clientId), driverName, truckIMM, date, notes,
      destinationAddress: (document.getElementById('bl-destination')?.value||'').trim(),
      lines: deliveredLines, totalHT, tvaRate, tvaAmount, timbreAmount: timbre, noTimbre, totalTTC,
      isPartial, partNum,
      isBonChargement: true,
      // From existing BR in stock -> goods already received, so validated usine
      status: (adminOverride && editBlId) ? (DB.getById('bls', editBlId)?.status || 'validated_usine') : 'validated_usine'
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
      // Auto-purge any old recycle bin entries for this BR since merchandise is now assigned to a new BL
      const bin = DB.getAll('recycle_bin');
      const conflicting = bin.filter(e => e.collection === 'bls' && Number(e.item?.brId) === Number(brId));
      if (conflicting.length) {
        const remainingBin = bin.filter(e => !(e.collection === 'bls' && Number(e.item?.brId) === Number(brId)));
        localStorage.setItem('recycle_bin', JSON.stringify(remainingBin));
        if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
          conflicting.forEach(ce => window.API.remove('recycle_bin', ce.id).catch(() => {}));
        }
      }
      if (!isPartial) DB.update('brs', brId, { status:'delivered', deliveredAt:new Date().toISOString() }, 'Livraison complète via BL');
      Utils.notify(isPartial ? `BL partiel créé : ${ref}` : `BL créé : ${ref}`, 'success');
    }
    UI.closeModal();
    App.loadModule('bls');
    if (andPrint && savedBL) setTimeout(()=>PDFGen.exportBonChargement(savedBL.id), 300);
  },

  async confirmDelivery(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    const u = Auth.getCurrentUser();

    // ── Returned BL is permanently reserved & locked forever ──
    if (bl.status === 'returned') {
      Utils.notify('⛔ Ce Bon de Livraison est définitivement archivé comme RETOURNÉ. Sa référence est réservée et ne peut pas être réutilisée.', 'warning', 5000);
      return;
    }
    // ── Already delivered — no double-confirm ──
    if (bl.status === 'delivered') {
      Utils.notify('ℹ️ Ce bon est déjà marqué comme livré.', 'info');
      return;
    }
    // ── pending_usine: factory hasn't validated yet ──
    if (bl.status === 'pending_usine') {
      // Check if BR is still reserved (factory hasn't validated yet)
      const linkedBR = bl.linkedBrId ? DB.getById('brs', bl.linkedBrId) : null;
      if (!linkedBR || linkedBR.status === 'reserved') {
        Utils.notify('⛔ Ce bon est en attente de validation usine. L\'usine doit d\'abord confirmer le chargement.', 'error', 5000);
        return;
      }
    }

    // Use BL's own totalTTC (may differ from BR if partial delivery)
    const amount = Number(bl.totalTTC || br?.totalTTC || 0);
    const ok = await Utils.confirm2(
      T.get('bl_delivered_msg'),
      `Montant TTC: ${Utils.fmtCurrency(amount)}\n\nConfirmer définitivement ?`
    );
    if (!ok) return;

    const now = new Date().toISOString();
    // Mark BL delivered + traceability (clear returned flags if re-delivering)
    DB.update('bls', blId, {
      status: 'delivered', deliveredAt: now,
      deliveredBy: u?.id, deliveredByName: u?.name || 'Inconnu',
      returnedAt: null, returnedBy: null, returnedByName: null
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
    // Use NET deposit count: deposits minus withdrawals for this BL
    // A re-delivered BL after return has: 1 deposit + 1 withdrawal = net 0 → needs new deposit
    const blCreatorId = bl.createdBy || u?.id;
    const blCreator = DB.getById('users', blCreatorId);
    const today = Utils.today();
    const caisseEntries = DB.getAll('caisse_admin').filter(e => Number(e.blId) === Number(blId));
    const depositCount = caisseEntries.filter(e => e.type === 'deposit' && e.source === 'bl_delivery').length;
    const withdrawCount = caisseEntries.filter(e => e.type === 'withdrawal' && (e.source === 'bl_return' || e.source === 'bl_error_delete')).length;
    const netDeposits = depositCount - withdrawCount;

    if (netDeposits < 1 && amount > 0) {
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
        amount: Number(bl.totalTTC || br?.totalTTC || 0),
        note: `BL ${bl.ref} (BR ${br?.ref||'?'}) — créé par ${blCreator?.name||'?'}, validé par ${u?.name||'?'}`
      });
    }

    // Brain recalibrates immediately after delivery
    DB.MasterBrain.recalibrateAll();

    Utils.notify((T.isRTL()?'تم تأكيد التسليم! الوثائق مقفلة.':'Livraison confirmee ! Documents verrouilles.'), 'success');

    // Notify: goods arrived from usine
    if (typeof NotifMgr !== 'undefined') {
      NotifMgr.add({
        type: 'bc_validated',
        title: T.isRTL() ? 'تأكيد التسليم - وصلت البضاعة' : 'Livraison confirmee - Marchandise arrivee',
        message: T.isRTL() ? `تم تسليم BCH ${bl.ref}. المبلغ: ${Utils.fmtCurrency(Number(bl.totalTTC||0))}. الوثائق مقفلة.` : `Le BCH ${bl.ref} a ete livre. Montant: ${Utils.fmtCurrency(Number(bl.totalTTC||0))}. Documents verrouilles.`,
        link: { mod: 'bls', id: blId },
        data: { bcId: blId }
      });
    }

    App.loadModule('bls');
  },

  showDetail(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    const cli = bl ? DB.getById('clients', bl.clientId) : null;
    const isLocked = bl.status==='delivered'||bl.status==='locked';
    const isReturned = bl.status==='returned';

    const body = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${Utils.statusBadge(bl.status||'open')}
      ${isLocked && !isReturned ? `<span class="badge badge-success"><i class="fas fa-check-circle"></i> Livré</span>` : ''}
      ${isReturned ? `<span class="badge badge-danger" style="background:#ef4444;color:#fff;font-weight:700"><i class="fas fa-ban"></i> RETOURNÉ</span>` : ''}
    </div>
    ${isReturned ? `<div style="background:linear-gradient(135deg,rgba(239,68,68,.06),rgba(220,38,38,.06));border:2px solid rgba(239,68,68,.2);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid rgba(239,68,68,.15)">
        <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0"><i class="fas fa-undo"></i></div>
        <div>
          <div style="font-weight:900;font-size:16px;color:#ef4444">${T.isRTL()?'سند إرجاع البضاعة':'BON DE RETOUR'}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${Utils.escHTML(bl.returnRef||'—')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <i class="fas fa-truck-loading" style="color:#f59e0b;width:16px"></i>
          <div><div style="font-size:10px;color:var(--text4);font-weight:600">${T.isRTL()?'مرجع BCH':'Réf BCH'}</div><strong>${Utils.escHTML(bl.ref||'—')}</strong></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <i class="fas fa-file-alt" style="color:#3b82f6;width:16px"></i>
          <div><div style="font-size:10px;color:var(--text4);font-weight:600">${T.isRTL()?'مرجع BR':'Réf BR coordonné'}</div><strong>${br ? Utils.escHTML(br.ref) : '—'}</strong></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <i class="fas fa-calendar-times" style="color:#ef4444;width:16px"></i>
          <div><div style="font-size:10px;color:var(--text4);font-weight:600">${T.isRTL()?'تاريخ الإرجاع':'Date de retour'}</div><strong>${bl.returnedAt ? Utils.fmtDateTime(bl.returnedAt) : '—'}</strong></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <i class="fas fa-user-shield" style="color:#8b5cf6;width:16px"></i>
          <div><div style="font-size:10px;color:var(--text4);font-weight:600">${T.isRTL()?'بواسطة':'Traité par'}</div><strong>${Utils.escHTML(bl.returnedByName||'—')}</strong></div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px 12px;background:rgba(239,68,68,.06);border-radius:8px;border:1px solid rgba(239,68,68,.12)">
        <div style="font-size:10px;color:#ef4444;font-weight:700;margin-bottom:4px"><i class="fas fa-exclamation-circle"></i> ${T.isRTL()?'سبب الإرجاع':'MOTIF DU RETOUR'}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${Utils.escHTML(bl.returnReason||'—')}</div>
      </div>
    </div>` : ''}
    <table class="detail-table">
      <tr><th>${T.isRTL()?"مرجع BL":"Référence BL"}</th><td><strong>${Utils.escHTML(bl.ref||'')}</strong></td></tr>
      <tr><th>${T.get('bl_linked_br')}</th><td>${br?`<strong>${Utils.escHTML(br.ref)}</strong>`:'-'}</td></tr>
      <tr><th>${T.get('col_date')}</th><td>${Utils.fmtDate(bl.date)} <span style="color:var(--text4);font-size:10px">${bl.createdAt?new Date(bl.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span></td></tr>
      <tr><th>${T.get('col_client')}</th><td>${Utils.escHTML(cli?.name||'-')}</td></tr>
      <tr><th>${T.get('bl_driver')}</th><td>${Utils.escHTML(bl.driverName||'-')}</td></tr>
      <tr><th>${T.get('bl_truck')}</th><td><code>${Utils.escHTML(bl.truckIMM||'-')}</code></td></tr>
      <tr><th>${T.get('col_total_ttc')}</th><td class="fw-bold text-primary" style="font-size:15px">${Utils.fmtCurrency(bl.totalTTC||br?.totalTTC||0)}</td></tr>
      ${bl.notes?`<tr><th>${T.get('br_notes')}</th><td>${Utils.escHTML(bl.notes)}</td></tr>`:''}
    </table>
    ${Utils.historyHTML('bls', blId)}`;

    const footer = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center">
      ${(!isLocked && !isReturned)?`<button class="btn btn-success" style="font-size:12px" onclick="UI.closeModal();BLModule.confirmDelivery(${blId})"><i class="fas fa-check-circle"></i> ${T.get('bl_delivered')}</button>`:''}
      ${Auth.canEdit(bl)&&!isReturned?`<button class="btn btn-outline" style="font-size:12px" onclick="UI.closeModal();BLModule.showEdit(${blId})"><i class="fas fa-edit"></i> ${T.get('edit')}</button>`:''}
      ${(isLocked && !isReturned && Auth.canReturn(bl))?`<button class="btn" style="background:#ef4444;color:#fff;border:none;font-size:12px" onclick="UI.closeModal();BLModule.processReturn(${blId})"><i class="fas fa-undo"></i> ${T.isRTL()?'إرجاع':'Retour'}</button>`:''}
      ${isLocked && !isReturned && Auth.isAdmin()?`<button class="btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;font-size:12px" onclick="UI.closeModal();BLModule.adminOverrideEdit(${blId})"><i class="fas fa-shield-alt"></i> Admin</button>`:''}
      ${isReturned && Auth.isAdmin()?`<button class="btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;font-size:12px" onclick="UI.closeModal();BLModule.undoReturn(${blId})"><i class="fas fa-undo-alt"></i> ${T.isRTL()?'إلغاء الإرجاع':'Annuler Retour'}</button>`:''}
      ${bl.status === 'pending_usine' ? `<button class="btn btn-success" style="background:#10b981;color:#fff;border:none;font-size:12px" onclick="UI.closeModal();SupplierPortalModule.promptValidation(${blId})"><i class="fas fa-industry"></i> Valider Usine</button>` : ''}
      <span style="width:1px;height:24px;background:var(--border);margin:0 2px"></span>
      <button class="btn btn-outline" style="font-size:11px;padding:6px 10px" onclick="PDFGen.exportBonChargement(${blId})"><i class="fas fa-file-pdf" style="color:#ef4444"></i> BCH</button>
      <button class="btn btn-outline" style="font-size:11px;padding:6px 10px" onclick="PDFGen.exportBLRoute(${blId})"><i class="fas fa-road" style="color:#3b82f6"></i> BL Route</button>
      ${isReturned ? `<button class="btn" style="background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;font-size:11px;padding:6px 10px" onclick="PDFGen.exportBonRetour(${blId})"><i class="fas fa-exchange-alt"></i> ${T.isRTL()?'سند إرجاع':'Bon Retour'}</button>` : ''}
      <button class="btn btn-outline" style="font-size:11px;padding:6px 10px" onclick="UI.closeModal();BCSupervisionModule.showTimeline(${blId})"><i class="fas fa-history"></i> Traçabilité</button>
      <span style="width:1px;height:24px;background:var(--border);margin:0 2px"></span>
      <button class="btn btn-secondary" style="font-size:12px" onclick="UI.closeModal()">${T.get('close')}</button>
    </div>`;
    const modalTitle = isReturned 
      ? `<i class="fas fa-undo" style="color:#ef4444"></i> ${T.isRTL()?'سند إرجاع':'Bon de Retour'} — ${bl.ref}` 
      : `<i class="fas fa-file-export"></i> ${bl.ref}`;
    UI.showModal(modalTitle, body, footer, 'lg');
  },

  async adminOverrideEdit(blId) {
    if (!Auth.isAdmin()) return;
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    if (bl.status === 'returned') {
      Utils.notify("Ce BL a été retourné et est archivé définitivement.", 'error');
      return;
    }
    UI.closeModal();
    BLModule.showEdit(blId, true /* adminOverride */);
  },
  async undoReturn(blId) {
    if (!Auth.isAdmin()) return;
    const bl = DB.getById('bls', blId);
    if (!bl || bl.status !== 'returned') return;
    const isAR = T.isRTL();
    
    const ok = await Dialog.show({
      title: isAR ? 'إلغاء إرجاع البضاعة' : 'Annuler le Retour',
      message: isAR 
        ? `<div style="padding:10px"><div class="alert alert-warning" style="font-size:13px"><i class="fas fa-exclamation-triangle"></i> <strong>تنبيه:</strong> سيتم إلغاء إرجاع ${Utils.escHTML(bl.ref)} وإعادته إلى حالة "تم التسليم".</div><p>هل أنت متأكد؟</p></div>`
        : `<div style="padding:10px"><div class="alert alert-warning" style="font-size:13px"><i class="fas fa-exclamation-triangle"></i> <strong>Attention :</strong> Le retour de ${Utils.escHTML(bl.ref)} sera annulé et le BL passera en statut "Livré".</div><p>Êtes-vous sûr ?</p></div>`,
      type: 'warning',
      confirmText: isAR ? 'نعم، إلغاء الإرجاع' : 'Oui, Annuler le Retour',
      cancelText: isAR ? 'لا' : 'Non'
    });
    if (!ok) return;
    
    // Restore the BL to delivered status
    DB.update('bls', blId, {
      status: 'delivered',
      returnRef: null,
      returnReason: null,
      returnedAt: null,
      returnedBy: null,
      returnedByName: null,
      undoneReturnAt: new Date().toISOString(),
      undoneReturnBy: Auth.getCurrentUser()?.id
    }, isAR ? 'إلغاء الإرجاع (مسؤول)' : 'Annulation retour (admin)');
    
    // Remove the bon de retour if it exists
    const retours = DB.getAll('bon_retours');
    const ret = retours.find(r => Number(r.blId) === Number(blId) || Number(r.bcId) === Number(blId));
    if (ret) DB.delete('bon_retours', ret.id);
    
    Utils.notify(isAR ? '✅ تم إلغاء الإرجاع بنجاح' : '✅ Retour annulé — BL restauré en "Livré"', 'success');
    App.loadModule('bls');
  },

  async processReturn(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    if (bl.status === 'returned') {
      Utils.notify('Ce bon de livraison a déjà été retourné.', 'warning');
      return;
    }
    const u = Auth.getCurrentUser();
    const cli = bl ? DB.getById('clients', bl.clientId) : null;
    const br = bl.brId ? DB.getById('brs', bl.brId) : null;
    const amount = Number(bl.totalTTC || br?.totalTTC || 0);

    const isAR = T.isRTL();
    const reasons = isAR ? [
      'بضاعة تالفة',
      'عدم مطابقة المواد',
      'رفض الزبون عند الاستلام',
      'إلغاء الطلبية من الزبون',
      'سبب آخر'
    ] : [
      'Marchandise endommagée / avariée',
      'Non-conformité des articles',
      'Refus du client à la réception',
      'Annulation de commande par le client',
      'Autre motif'
    ];
    const opts = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

    const modalHTML = `
      <div style="padding:4px 0">
        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;margin-bottom:16px">
          <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0">
            <i class="fas fa-undo"></i>
          </div>
          <div>
            <div style="font-weight:800;font-size:15px;color:var(--text)">${isAR ? 'إنشاء سند إرجاع' : 'Générer un Bon de Retour (BR)'}</div>
            <div style="font-size:12px;color:var(--text4);margin-top:2px">Bon de Chargement: <strong>${Utils.escHTML(bl.ref||'')}</strong> — Montant: <strong style="color:var(--danger)">${Utils.fmtCurrency(amount)}</strong></div>
          </div>
        </div>

        ${isAR ? `
        <div class="alert alert-warning mb-2" style="font-size:12px">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>العواقب المحاسبية :</strong>
          <ul style="margin:6px 0 0 16px;padding:0;direction:rtl">
            <li>سيتم إنشاء <strong>سند إرجاع</strong> رسمي.</li>
            <li>سيتم خصم المبلغ (-) من تقرير المبيعات اليومي.</li>
            <li>سيتم تسجيل سحب من الخزينة لموازنة المبلغ المحصل.</li>
            <li>سيتم <strong>حجز مرجع سند الشحن هذا كمرتجع</strong> نهائيا.</li>
          </ul>
        </div>
        ` : `
        <div class="alert alert-warning mb-2" style="font-size:12px">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Conséquences comptables & ERP :</strong>
          <ul style="margin:6px 0 0 16px;padding:0">
            <li>Un <strong>Bon de Retour</strong> officiel (séquence BR) sera généré.</li>
            <li>Le montant sera déduit en <strong>MOINS (−)</strong> sur l'État de Vente du jour.</li>
            <li>Un retrait de caisse sera enregistré pour équilibrer la monnaie encaissée.</li>
            <li>La référence de ce Bon de Chargement sera <strong>réservée définitivement comme retournée</strong>.</li>
          </ul>
        </div>
        `}

        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">${isAR ? 'سبب الإرجاع' : 'Motif du retour'}</label>
          <select id="ret_reason_sel" class="input" style="width:100%;margin-bottom:8px" onchange="if(this.value==='Autre motif' || this.value==='سبب آخر') document.getElementById('ret_reason_custom').style.display='block'; else document.getElementById('ret_reason_custom').style.display='none';">
            ${opts}
          </select>
          <input type="text" id="ret_reason_custom" class="input" style="width:100%;display:none" placeholder="Précisez le motif du retour...">
        </div>

        <div class="form-group mb-2">
          <label style="font-weight:700">${isAR ? 'ملاحظات' : 'Observations / Remarques'}</label>
          <textarea id="ret_notes" class="input" style="width:100%;height:60px" placeholder="Détails supplémentaires..."></textarea>
        </div>
      </div>`;

    const ok = await Dialog.show({
      title: isAR ? `إرجاع البضاعة — ${bl.ref}` : `Retour Marchandise — Bon de Chargement ${bl.ref}`,
      message: modalHTML,
      type: 'danger',
      confirmText: isAR ? 'تأكيد الإرجاع وإنشاء سند الإرجاع' : 'Confirmer le Retour & Générer BR',
      cancelText: isAR ? 'إلغاء' : 'Annuler'
    });

    if (!ok) return;

    let reason = document.getElementById('ret_reason_sel')?.value || 'Retour marchandise';
    if (reason === 'Autre motif' || reason === 'سبب آخر') {
      const custom = document.getElementById('ret_reason_custom')?.value?.trim();
      if (custom) reason = custom;
    }
    const notes = document.getElementById('ret_notes')?.value?.trim() || '';
    const fullReason = notes ? `${reason} (${notes})` : reason;

    const today = Utils.today();
    const now = new Date();
    const year = now.getFullYear();
    const retNum = DB.getAll('bon_retours').filter(r => (r.ref||'').includes('/' + year)).length + 1;
    const brRef = `BR-${bl.ref || String(retNum).padStart(3, '0')}`;

    // 1. Create official Bon de Retour
    const brDoc = {
      id: DB.nextId('bon_retours'),
      ref: brRef,
      blId: bl.id,
      bcId: bl.id,
      isBonChargement: true,
      blRef: bl.ref,
      clientId: bl.clientId,
      clientName: cli?.name || bl.clientName || 'Client',
      date: today,
      items: bl.items || bl.lines || br?.items || [],
      totalHT: Number(bl.totalHT || br?.totalHT || 0),
      totalTVA: Number(bl.totalTVA || br?.totalTVA || 0),
      totalTTC: amount,
      reason: fullReason,
      createdBy: u?.id,
      createdByName: u?.name || u?.username || 'Utilisateur',
      createdAt: now.toISOString(),
      status: 'validated'
    };
    DB.insert('bon_retours', brDoc);

    // 2. Lock the BL permanently as returned
    DB.update('bls', bl.id, {
      status: 'returned',
      isReturned: true,
      returnRef: brRef,
      returnedAt: now.toISOString(),
      returnedBy: u?.id,
      returnedByName: u?.name || u?.username,
      returnReason: fullReason
    }, 'Marchandise retournée — Bon de retour ' + brRef);

    // 3. Register caisse deduction
    DB.insert('caisse_admin', {
      type: 'withdrawal',
      source: 'bl_return',
      blId: bl.id,
      blRef: bl.ref,
      returnRef: brRef,
      userId: u?.id,
      userName: u?.name || u?.username,
      sessionDate: today,
      amount: amount,
      note: `Retour BL ${bl.ref} (${brRef}): ${fullReason}`,
      createdAt: now.toISOString()
    });

    // 4. Recalibrate MasterBrain
    DB.MasterBrain.recalibrateAll();

    Utils.notify(`Bon de Retour ${brRef} genere - BCH archive definitivement.`, 'success', 6000);

    // Notify: goods returned to usine
    if (typeof NotifMgr !== 'undefined') {
      NotifMgr.add({
        type: 'bc_returned',
        title: T.isRTL() ? 'إرجاع البضاعة إلى المصنع' : 'Retour Marchandise vers l\'usine',
        message: T.isRTL() ? `تم إرجاع BCH ${bl.ref}. وصل الإرجاع: ${brRef}. المبلغ: ${Utils.fmtCurrency(amount)}.` : `Le BCH ${bl.ref} a ete retourne. Bon de Retour: ${brRef}. Montant: ${Utils.fmtCurrency(amount)}.`,
        link: { mod: 'bls', id: bl.id },
        data: { bcId: bl.id, brRef }
      });
    }
    if (typeof PDFGen !== 'undefined' && PDFGen.exportBonRetour) {
      setTimeout(() => PDFGen.exportBonRetour(brDoc.id), 400);
    }
    App.loadModule('bls');
  },

  async deleteBL(id) {
    const bl = DB.getById('bls', id);
    if (!bl) return;
    if (bl.status === 'returned') {
      Utils.notify('⛔ Ce bon de livraison a été retourné et est archivé définitivement. Suppression impossible.', 'error');
      return;
    }
    if (!Auth.canDelete(bl)) {
      Utils.notify("⛔ Ce BL date d'un jour antérieur ou la caisse est clôturée. Seul un administrateur peut le supprimer.", 'error');
      return;
    }
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
      <div style="font-size:11px;opacity:.85">Génère un Bon de Retour officiel et déduit le montant de l'État de Vente du jour.</div></div>
    </button>`;

    const errorBtn = `<button id="dlg_bl_error" onclick="document.getElementById('dlg_bl_choice').value='error';document.querySelector('.dlg-btn-primary').click()"
      style="display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:12px;cursor:pointer;text-align:left;width:100%">
      <span style="font-size:28px;flex-shrink:0">🗑️</span>
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px">BL Erroné — Supprimer</div>
      <div style="font-size:11px;opacity:.85">Le BL va à la corbeille.${isValidated ? ' Le montant est corrigé en caisse.' : ''}</div></div>
    </button>`;

    const choice = await Dialog.show({
      title: '⚠️ Suppression BL',
      message: `<div style="margin-bottom:16px;padding:14px 16px;background:var(--bg-inset);border-radius:10px;border-left:4px solid #f59e0b">
        <div style="color:#fbbf24;font-weight:700;margin-bottom:4px;font-size:15px">BL ${Utils.escHTML(bl.ref||'')} — ${Utils.fmtCurrency(amount)}</div>
        <div style="font-size:12px;color:var(--text3)">${isValidated ? '✅ Livré — un dépôt de ' + Utils.fmtCurrency(amount) + ' a été généré en caisse.' : '📝 Brouillon — aucun mouvement de caisse.'}</div>
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

    if (action === 'return') {
      await BLModule.processReturn(id);
      return;
    }

    const br = bl.brId ? DB.getById('brs', bl.brId) : null;
    const ref = bl.ref || `BL-${id}`;
    const now = new Date().toISOString();

    if (action === 'error') {
      // ═══ PATH B: WRONG BL — DELETE (Brain handles caisse correction) ════
      // NO manual withdrawal creation — the Brain will automatically remove the
      // bl_delivery deposit once the BL no longer exists. This prevents the
      // oscillation bug where withdrawal + deposit cleanup created negative balances.

      // 1. Delete BL (goes to recycle bin via DB.delete)
      DB.delete('bls', id);

      // 2. Handle linked BR: reopen manual BRs, delete auto-generated BRs
      const linkedBR = bl.brId ? DB.getById('brs', bl.brId) : (bl.linkedBrId ? DB.getById('brs', bl.linkedBrId) : null);
      if (linkedBR) {
        if (linkedBR.isAutoGenerated) {
          // Auto-generated BR from supplier validation — delete it too (it's meaningless without BCH)
          DB.delete('brs', linkedBR.id);
        } else {
          // Manual BR (Déstockage Dépôt) — reopen if no other delivered BLs reference it
          const brIdToCheck = bl.brId || bl.linkedBrId;
          const otherDelivered = DB.getAll('bls').filter(b =>
            (Number(b.brId) === Number(brIdToCheck) || Number(b.linkedBrId) === Number(brIdToCheck)) && Number(b.id) !== Number(id) && b.status === 'delivered'
          );
          if (!otherDelivered.length) {
            DB.update('brs', linkedBR.id, { status: 'open' }, 'BL erroné supprimé — BR libéré');
          }
        }
      }

      // 3. Brain recalibrates immediately — removes the deposit for this deleted BL
      DB.MasterBrain.recalibrateAll();

      Utils.notify(`🗑️ BL ${ref} supprimé${isValidated ? ` — caisse corrigée automatiquement` : ''}`, 'success', 6000);
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
    const clients = Object.values(data.cliMap).sort((a,b) => (a.name||'').localeCompare(b.name||''));
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

const SupplierPortalModule = {
  _filterSupplierId: 'all',
  _filterStatus: 'pending_usine',
  _activeTab: 'validation',
  _suiviDateFrom: '',
  _suiviDateTo: '',
  _suiviSearch: '',

  render() {
    const curUser = Auth.getCurrentUser();
    const isSupplier = curUser?.role === 'supplier' || curUser?.role === 'supplier_agent';
    const supplierId = isSupplier ? curUser.supplierId : this._filterSupplierId;
    const allSuppliers = DB.getAll('suppliers');
    const allBLs = DB.getAll('bls');

    let items = allBLs.filter(b => b.status !== 'returned' && b.status !== 'cancelled');
    if (supplierId && supplierId !== 'all') {
      items = items.filter(b => String(b.supplierId) === String(supplierId));
    }
    if (this._filterStatus !== 'all') {
      if (this._filterStatus === 'pending_usine') {
        // pending_usine: BCH awaiting factory validation (may have reserved BR now)
        items = items.filter(b => b.status === 'pending_usine' || (!b.status || b.status === 'open'));
      } else if (this._filterStatus === 'validated_usine') {
        items = items.filter(b => (b.brId || b.linkedBrId || b.status === 'validated_usine') && b.status !== 'delivered');
      } else {
        items = items.filter(b => b.status === this._filterStatus);
      }
    }
    items.sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));

    // Pending count: BCHs awaiting factory validation (may have reserved BR)
    const pendingCount = allBLs.filter(b => (b.status === 'pending_usine' || (!b.status || b.status === 'open')) && b.status !== 'returned' && b.status !== 'cancelled' && (supplierId === 'all' || String(b.supplierId) === String(supplierId))).length;
    const validatedToday = allBLs.filter(b => (b.status === 'validated_usine' || b.linkedBrId || b.brId) && (b.validatedAt||b.createdAt||'').slice(0,10) === Utils.today() && (supplierId === 'all' || String(b.supplierId) === String(supplierId))).length;

    // Get supplier info for branded header
    const mySupplier = isSupplier && supplierId ? DB.getById('suppliers', supplierId) : null;

    return `
    <div style="padding:24px 28px;max-width:1300px;margin:0 auto">
      ${isSupplier && mySupplier ? `
      <div style="display:flex;align-items:center;gap:18px;padding:20px 24px;background:linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#0f766e 100%);border-radius:16px;margin-bottom:20px;box-shadow:0 6px 20px rgba(13,148,136,.3)">
        ${mySupplier.logo ? `<img src="${mySupplier.logo}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;border:3px solid rgba(255,255,255,.3);box-shadow:0 4px 12px rgba(0,0,0,.2)">` : `<div style="width:56px;height:56px;border-radius:12px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;font-weight:900;border:3px solid rgba(255,255,255,.3)">${Utils.escHTML((mySupplier.name||'?').charAt(0))}</div>`}
        <div style="flex:1">
          <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:0.5px">${Utils.escHTML(mySupplier.name)}</div>
          <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:3px">${curUser.role === 'supplier_agent' ? '👷 Agent de Validation sur Site' : '🏭 Portail Enlèvements & Validation'}</div>
          ${mySupplier.address ? `<div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:2px"><i class="fas fa-map-marker-alt"></i> ${Utils.escHTML(mySupplier.address)}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:rgba(255,255,255,.7)">Connecté en tant que</div>
          <div style="font-size:14px;font-weight:700;color:#fff">${Utils.escHTML(curUser.name || curUser.username)}</div>
        </div>
      </div>` : `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:14px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0d9488,#14b8a6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;box-shadow:0 4px 12px rgba(13,148,136,.3)">
            <i class="fas fa-industry"></i>
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">Portail Usines & Fournisseurs — Enlèvements</h2>
            <div style="font-size:13px;color:var(--text4);margin-top:2px">Validation des chargements camions et génération automatique des Bons de Réception (BR)</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-outline" onclick="App.loadModule('bls')"><i class="fas fa-arrow-left"></i> Bons de Chargement</button>
          <button class="btn btn-primary" onclick="App.loadModule('bc_supervision')"><i class="fas fa-stream"></i> Pipeline Suivi</button>
        </div>
      </div>`}

      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px">
        <div class="stat-card" style="border-left:4px solid #f59e0b;background:var(--bg)">
          <div class="stat-title"><i class="fas fa-clock" style="color:#f59e0b"></i> En attente Usine</div>
          <div class="stat-val" style="color:#f59e0b;font-size:24px">${pendingCount}</div>
          <div class="stat-sub">Camions en route / à charger</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #10b981;background:var(--bg)">
          <div class="stat-title"><i class="fas fa-check-circle" style="color:#10b981"></i> Validés Aujourd'hui</div>
          <div class="stat-val" style="color:#10b981;font-size:24px">${validatedToday}</div>
          <div class="stat-sub">BRs créés automatiquement</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--primary);background:var(--bg)">
          <div class="stat-title"><i class="fas fa-boxes" style="color:var(--primary)"></i> Total Chargements</div>
          <div class="stat-val" style="color:var(--primary);font-size:24px">${items.length}</div>
          <div class="stat-sub">Actuellement affichés</div>
        </div>
      </div>

      <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg2);padding:4px;border-radius:10px">
        <button class="btn" style="flex:1;border:none;padding:10px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;${this._activeTab==='validation'?'background:var(--primary);color:#fff':'background:transparent;color:var(--text3)'}" onclick="SupplierPortalModule._activeTab='validation';App.loadModule(App._currentModule)"><i class="fas fa-clipboard-check"></i> Validation Chargements</button>
        <button class="btn" style="flex:1;border:none;padding:10px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;${this._activeTab==='suivi'?'background:var(--primary);color:#fff':'background:transparent;color:var(--text3)'}" onclick="SupplierPortalModule._activeTab='suivi';App.loadModule(App._currentModule)"><i class="fas fa-chart-line"></i> Suivi & Historique</button>
      </div>

      ${this._activeTab === 'validation' ? `
      <div class="card" style="margin-bottom:20px">
        <div class="filters-bar" style="padding:14px 18px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          ${!isSupplier ? `
          <div class="filter-group" style="min-width:200px">
            <label>Usine / Fournisseur</label>
            <select onchange="SupplierPortalModule._filterSupplierId=this.value;App.loadModule('supplier_portal')">
              <option value="all">Toutes les Usines</option>
              ${allSuppliers.map(s => `<option value="${s.id}" ${String(this._filterSupplierId)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('')}
            </select>
          </div>` : ''}

          <div class="filter-group" style="min-width:180px">
            <label>Statut</label>
            <select onchange="SupplierPortalModule._filterStatus=this.value;App.loadModule('supplier_portal')">
              <option value="all" ${this._filterStatus==='all'?'selected':''}>Tous les statuts</option>
              <option value="pending_usine" ${this._filterStatus==='pending_usine'?'selected':''}>⏳ En attente de chargement</option>
              <option value="validated_usine" ${this._filterStatus==='validated_usine'?'selected':''}>🏭 Validés usine (BR coordonné)</option>
              <option value="delivered" ${this._filterStatus==='delivered'?'selected':''}>✅ Livrés client</option>
            </select>
          </div>

          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="App.loadModule('supplier_portal')"><i class="fas fa-sync-alt"></i> Actualiser</button>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        ${items.length ? items.map(bc => {
          const sup = allSuppliers.find(s => s.id === bc.supplierId) || { name: bc.supplierName || 'Usine' };
          const cli = DB.getById('clients', bc.clientId) || { name: 'Client' };
          const isValidated = bc.status === 'validated_usine' || bc.status === 'delivered';
          const lines = bc.lines || [];
          return `
          <div class="card" style="padding:18px;border-left:5px solid ${isValidated ? '#10b981' : '#f59e0b'};transition:all .2s ease">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px">
              <div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:16px;font-weight:900;color:var(--text)">${Utils.escHTML(bc.ref)}</span>
                  ${Utils.statusBadge(bc.status || 'pending_usine')}
                  ${bc.linkedBrRef ? `<span class="badge badge-success"><i class="fas fa-link"></i> BR Coordonné : ${Utils.escHTML(bc.linkedBrRef)}</span>` : ''}
                </div>
                <div style="font-size:12px;color:var(--text4);margin-top:4px">
                  Émis le ${Utils.fmtDate(bc.date)} ${bc.createdAt ? 'à ' + new Date(bc.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''}
                  ${bc.createdByName ? ` par <strong>${Utils.escHTML(bc.createdByName)}</strong>` : ''}
                </div>
              </div>

              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn btn-sm btn-outline" onclick="PDFGen.exportBonChargement(${bc.id})" title="Imprimer Bon de Chargement 2 volets">
                  <i class="fas fa-file-pdf"></i> Imprimer BCH (2 Volets)
                </button>
                ${!isValidated ? `
                <button class="btn btn-sm btn-success" style="background:#10b981;color:#fff;font-weight:700" onclick="SupplierPortalModule.promptValidation(${bc.id})">
                  <i class="fas fa-check-circle"></i> Valider Chargement & Générer BR
                </button>` : `
                <span style="font-size:11px;font-weight:700;color:#10b981;background:rgba(16,185,129,.1);padding:5px 12px;border-radius:8px">
                  <i class="fas fa-lock"></i> Chargé & BR Validé
                </span>`}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;background:var(--bg2);padding:12px;border-radius:10px;margin-bottom:12px">
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--primary);margin-bottom:3px"><i class="fas fa-industry"></i> Usine / Fournisseur</div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${Utils.escHTML(sup.name)}</div>
              </div>
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#10b981;margin-bottom:3px"><i class="fas fa-id-card"></i> Chauffeur & Camion</div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${Utils.escHTML(bc.driverName || 'Non spécifié')} ${bc.driverPhone ? `<a href="tel:${bc.driverPhone}" style="color:var(--primary);font-size:11px;margin-left:4px"><i class="fas fa-phone"></i> ${Utils.escHTML(bc.driverPhone)}</a>` : ''}</div>
                <div style="font-size:11px;color:var(--text3)">Matricule: <code>${Utils.escHTML(bc.truckIMM || '-')}</code></div>
              </div>
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--text);margin-bottom:3px"><i class="fas fa-user-tie"></i> Client & Destination</div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${Utils.escHTML(cli.name || '-')}</div>
                <div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${Utils.escHTML(bc.destinationAddress||'')}">${Utils.escHTML(bc.destinationAddress || '-')}</div>
              </div>
            </div>

            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text4);margin-bottom:6px">
              <i class="fas fa-list"></i> Marchandises à charger pour ce camion :
            </div>
            <div class="table-wrap">
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);background:var(--bg3)">
                    <th style="padding:6px 10px;text-align:left">#</th>
                    <th style="padding:6px 10px;text-align:left">Désignation</th>
                    <th style="padding:6px 10px;text-align:center">Unité</th>
                    <th style="padding:6px 10px;text-align:center">Quantité à Charger</th>
                    <th style="padding:6px 10px;text-align:right">Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  ${lines.map((l, idx) => `
                  <tr style="border-bottom:1px solid var(--border)">
                    <td style="padding:6px 10px;color:var(--text4)">${idx + 1}</td>
                    <td style="padding:6px 10px;font-weight:700;color:var(--text)">${Utils.escHTML(l.designation)}</td>
                    <td style="padding:6px 10px;text-align:center">${Utils.escHTML(l.unit || 'U')}</td>
                    <td style="padding:6px 10px;text-align:center;font-weight:800;color:var(--primary);font-size:13px">${Utils.fmtNum(l.qtyDelivered || l.qty)}</td>
                    <td style="padding:6px 10px;text-align:right;color:var(--text3)">${Utils.fmtCurrency(l.total)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>

            ${bc.ticketPesee ? `
            <div style="margin-top:10px;font-size:11px;color:#10b981;display:flex;align-items:center;gap:6px">
              <i class="fas fa-weight-hanging"></i> <strong>Ticket de Pesée / Bon Usine :</strong> ${Utils.escHTML(bc.ticketPesee)} (Validé par ${Utils.escHTML(bc.validatedBy||'Usine')} le ${Utils.fmtDateTime ? Utils.fmtDateTime(bc.validatedAt) : bc.validatedAt})
            </div>` : ''}
          </div>`;
        }).join('') : `
        <div class="empty-state" style="padding:60px 20px;text-align:center;background:var(--bg);border-radius:12px;border:1px solid var(--border)">
          <i class="fas fa-check-circle" style="font-size:42px;color:#10b981;opacity:.6;margin-bottom:12px"></i>
          <h4 style="font-size:16px;color:var(--text);margin:0">Aucun chargement en attente pour le moment</h4>
          <p style="color:var(--text4);font-size:13px;margin-top:4px">Tous les camions ont été chargés et les bons de réception coordonnés ont été générés.</p>
        </div>`}
      </div>
      ` : ''}

      ${this._activeTab === 'suivi' ? (() => {
        const sId = supplierId && supplierId !== 'all' ? supplierId : null;
        const allBRs = DB.getAll('brs').filter(b => !sId || String(b.supplierId) === String(sId));
        const allPays = DB.getAll('supplier_payments').filter(p => !sId || String(p.supplierId) === String(sId));
        const totalPurchased = Math.round(allBRs.filter(b => b.status !== 'reserved').reduce((s,b) => s + (Number(b.totalTTC)||0), 0) * 100) / 100;
        const totalPaid = Math.round(allPays.reduce((s,p) => s + (Number(p.amount)||0), 0) * 100) / 100;
        const balance = Math.round((totalPurchased - totalPaid) * 100) / 100;
        let fBRs = allBRs.filter(b => b.status !== 'reserved');
        if (this._suiviDateFrom) fBRs = fBRs.filter(b => (b.date||b.createdAt||'') >= this._suiviDateFrom);
        if (this._suiviDateTo) fBRs = fBRs.filter(b => (b.date||b.createdAt||'') <= this._suiviDateTo + 'T23:59:59');
        if (this._suiviSearch) { const q = this._suiviSearch.toLowerCase(); fBRs = fBRs.filter(b => (b.ref||'').toLowerCase().includes(q) || (b.lines||[]).some(l => (l.designation||'').toLowerCase().includes(q))); }
        fBRs.sort((a,b) => (b.date||b.createdAt||'').localeCompare(a.date||a.createdAt||''));
        const pm = {};
        allBRs.filter(b => b.status !== 'reserved').forEach(br => { (br.lines||[]).forEach(l => { const k = (l.designation||'?').trim(); if (!pm[k]) pm[k] = { d: k, u: l.unit||'U', q: 0, a: 0, n: 0 }; pm[k].q += Number(l.qty)||0; pm[k].a += Number(l.total)||0; pm[k].n++; }); });
        const prods = Object.values(pm).sort((a,b) => b.a - a.a);
        return `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px">
        <div class="stat-card" style="border-left:4px solid #7c3aed;background:var(--bg)"><div class="stat-title"><i class="fas fa-file-import" style="color:#7c3aed"></i> Total Achats (BR)</div><div class="stat-val" style="color:#7c3aed;font-size:20px">${Utils.fmtCurrency(totalPurchased)}</div><div class="stat-sub">${allBRs.filter(b=>b.status!=='reserved').length} bons de réception</div></div>
        <div class="stat-card" style="border-left:4px solid #10b981;background:var(--bg)"><div class="stat-title"><i class="fas fa-check-double" style="color:#10b981"></i> Total Payé</div><div class="stat-val" style="color:#10b981;font-size:20px">${Utils.fmtCurrency(totalPaid)}</div><div class="stat-sub">${allPays.length} paiements</div></div>
        <div class="stat-card" style="border-left:4px solid ${balance>0?'#ef4444':'#10b981'};background:var(--bg)"><div class="stat-title"><i class="fas fa-balance-scale" style="color:${balance>0?'#ef4444':'#10b981'}"></i> Solde Dû</div><div class="stat-val" style="color:${balance>0?'#ef4444':'#10b981'};font-size:20px">${Utils.fmtCurrency(balance)}</div><div class="stat-sub">${balance>0?'Créance fournisseur':'Soldé'}</div></div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <input type="date" class="input" style="padding:6px 10px;font-size:12px" value="${this._suiviDateFrom}" onchange="SupplierPortalModule._suiviDateFrom=this.value;App.loadModule(App._currentModule)">
        <span style="color:var(--text4);font-size:12px">→</span>
        <input type="date" class="input" style="padding:6px 10px;font-size:12px" value="${this._suiviDateTo}" onchange="SupplierPortalModule._suiviDateTo=this.value;App.loadModule(App._currentModule)">
        <input type="text" class="input" style="padding:6px 10px;font-size:12px;flex:1;min-width:180px" value="${Utils.escHTML(this._suiviSearch||'')}" onchange="SupplierPortalModule._suiviSearch=this.value;App.loadModule(App._currentModule)" placeholder="🔍 Rechercher (réf, produit...)">
        <button class="btn btn-outline" style="font-size:12px" onclick="SupplierPortalModule._suiviDateFrom='';SupplierPortalModule._suiviDateTo='';SupplierPortalModule._suiviSearch='';App.loadModule(App._currentModule)"><i class="fas fa-times"></i> Reset</button>
      </div>
      <div style="margin-bottom:16px">
        <h4 style="font-size:14px;font-weight:800;color:var(--text);margin:0 0 10px"><i class="fas fa-boxes" style="color:var(--primary)"></i> Récapitulatif par Produit</h4>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg3)"><th style="padding:8px 12px;text-align:left">Produit</th><th style="padding:8px 12px;text-align:center">Unité</th><th style="padding:8px 12px;text-align:center">Qté Totale Livrée</th><th style="padding:8px 12px;text-align:right">Montant Total</th><th style="padding:8px 12px;text-align:center">Nb Livraisons</th></tr></thead>
          <tbody>${prods.map(p=>'<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 12px;font-weight:700">'+Utils.escHTML(p.d)+'</td><td style="padding:6px 12px;text-align:center">'+Utils.escHTML(p.u)+'</td><td style="padding:6px 12px;text-align:center;font-weight:800;color:var(--primary)">'+Utils.fmtNum(p.q)+'</td><td style="padding:6px 12px;text-align:right;font-weight:600">'+Utils.fmtCurrency(p.a)+'</td><td style="padding:6px 12px;text-align:center;color:var(--text4)">'+p.n+'</td></tr>').join('')}${!prods.length?'<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text4)">Aucun produit livré</td></tr>':''}</tbody>
        </table></div>
      </div>
      <h4 style="font-size:14px;font-weight:800;color:var(--text);margin:0 0 10px"><i class="fas fa-history" style="color:var(--primary)"></i> Historique des Livraisons (${fBRs.length})</h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${fBRs.slice(0,50).map(br=>{const bcR=br.bcRef||(br.bcId?(DB.getById('bls',br.bcId)||{}).ref:null);return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px 16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:800;color:var(--primary);font-size:13px">'+Utils.escHTML(br.ref||'')+'</span>'+Utils.statusBadge(br.status||'open')+(br.isAutoGenerated?'<span style="padding:2px 8px;background:rgba(139,92,246,.1);color:#7c3aed;border-radius:6px;font-size:10px;font-weight:700">BCH Auto</span>':'<span style="padding:2px 8px;background:rgba(59,130,246,.1);color:#3b82f6;border-radius:6px;font-size:10px;font-weight:700">Dépôt Direct</span>')+'</div><div style="font-size:11px;color:var(--text4)">'+(br.date||(br.createdAt||'').slice(0,10))+'</div></div><div style="display:flex;gap:14px;font-size:12px;color:var(--text3);flex-wrap:wrap">'+(bcR?'<span><i class="fas fa-truck-loading"></i> BCH: '+Utils.escHTML(bcR)+'</span>':'')+'<span><i class="fas fa-boxes"></i> '+(br.lines||[]).length+' article(s)</span><span style="font-weight:700;color:var(--text)"><i class="fas fa-coins"></i> '+Utils.fmtCurrency(br.totalTTC||0)+'</span></div>'+((br.lines||[]).length?'<div style="margin-top:4px;font-size:11px;color:var(--text4)">'+((br.lines||[]).map(l=>Utils.fmtNum(l.qty)+' '+Utils.escHTML(l.unit||'U')+' '+Utils.escHTML(l.designation)).join(' · '))+'</div>':'')+'</div>';}).join('')}
        ${!fBRs.length?'<div style="padding:40px;text-align:center;color:var(--text4);background:var(--bg);border-radius:10px"><i class="fas fa-inbox" style="font-size:30px;margin-bottom:8px;opacity:.4"></i><br>Aucune livraison trouvée</div>':''}
      </div>`;
      })() : ''}

    </div>`;
  },

  async promptValidation(bcId) {
    const bc = DB.getById('bls', bcId);
    if (!bc) return;
    const lines = bc.lines || [];
    const sup = DB.getById('suppliers', bc.supplierId) || { name: bc.supplierName || 'Usine' };

    const modalHTML = `
      <div style="padding:6px 0">
        <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:12px;padding:14px;margin-bottom:14px;display:flex;gap:12px;align-items:center">
          <div style="width:40px;height:40px;border-radius:10px;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px">
            <i class="fas fa-industry"></i>
          </div>
          <div>
            <div style="font-weight:800;font-size:14px;color:var(--text)">Validation du Chargement — ${Utils.escHTML(bc.ref)}</div>
            <div style="font-size:12px;color:var(--text4)">Usine : <strong>${Utils.escHTML(sup.name)}</strong></div>
          </div>
        </div>

        <div style="background:var(--bg2);padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:12px">
          <div><i class="fas fa-id-card" style="color:var(--primary)"></i> Chauffeur : <strong>${Utils.escHTML(bc.driverName || '-')}</strong> (${Utils.escHTML(bc.driverPhone || '-')})</div>
          <div><i class="fas fa-truck" style="color:var(--primary)"></i> Matricule Camion : <strong>${Utils.escHTML(bc.truckIMM || '-')}</strong></div>
          <div><i class="fas fa-user" style="color:var(--primary)"></i> Client : <strong>${Utils.escHTML(bc.clientName || 'Client')}</strong></div>
        </div>

        <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:6px">Articles chargés dans le camion :</div>
        <ul style="margin:0 0 12px 18px;padding:0;font-size:12px;color:var(--text)">
          ${lines.map(l => `<li><strong>${Utils.fmtNum(l.qtyDelivered || l.qty)} ${Utils.escHTML(l.unit||'U')}</strong> — ${Utils.escHTML(l.designation)}</li>`).join('')}
        </ul>

        <div class="form-group mb-2">
          <label style="font-weight:700"><i class="fas fa-weight-hanging"></i> N° Bon usine / Ticket de pesée (optionnel)</label>
          <input type="text" id="dlg_ticket_pesee" class="input" placeholder="Ex: PESEE-10492 ou N° Bon usine">
        </div>

        <div class="alert alert-info" style="font-size:11px;margin-top:10px">
          <i class="fas fa-info-circle"></i> Cette action va <strong>générer automatiquement le Bon de Réception (BR)</strong> officiel, verrouillé et coordonné avec ce chargement.
        </div>
      </div>
    `;

    const ok = await Dialog.show({
      title: '🏭 Confirmer le Chargement Usine',
      message: modalHTML,
      type: 'info',
      confirmText: 'Confirmer & Générer BR Auto',
      cancelText: 'Annuler'
    });

    if (!ok) return;

    const ticket = document.getElementById('dlg_ticket_pesee')?.value?.trim() || '';
    const curUser = Auth.getCurrentUser();

    try {
      const autoBR = await DB.createAutoBRFromBC(bcId, curUser, ticket);
      Utils.notify(`✅ Chargement validé ! BR ${autoBR.ref} généré automatiquement.`, 'success', 5000);
      App.loadModule(App._currentModule === 'supplier_portal' ? 'supplier_portal' : 'bls');
    } catch(e) {
      console.error(e);
      Utils.notify('Erreur validation : ' + e.message, 'error');
    }
  }
};

// ═════════════════════════════════════════════════════════════════
// SUIVI & SUPERVISION DES CHARGEMENTS (Pipeline & Traçabilité)
// ═════════════════════════════════════════════════════════════════
const BCSupervisionModule = {
  _filters: { supplierId: 'all', driver: 'all', status: 'all', dateFrom: '', dateTo: '', q: '' },

  render() {
    const allBCs = DB.getAll('bls');
    const allSuppliers = DB.getAll('suppliers');
    const allClients = DB.getAll('clients');

    const supMap = {}; allSuppliers.forEach(s => supMap[s.id] = s);
    const cliMap = {}; allClients.forEach(c => cliMap[c.id] = c);

    let items = allBCs.filter(b => b.isBonChargement || (b.ref && (b.ref.startsWith('BCH') || b.ref.startsWith('BC') || b.ref.startsWith('BL'))));

    const { supplierId, driver, status, dateFrom, dateTo, q } = this._filters;

    // Auto-filter for supplier/supplier_agent users — only see their own BCH
    const curUser = Auth.getCurrentUser();
    const isSupplierUser = curUser?.role === 'supplier' || curUser?.role === 'supplier_agent';
    if (isSupplierUser && curUser.supplierId) {
      items = items.filter(b => String(b.supplierId) === String(curUser.supplierId));
    }

    if (q) {
      const ql = q.toLowerCase();
      items = items.filter(b => (b.ref + ' ' + (b.driverName||'') + ' ' + (b.truckIMM||'') + ' ' + (b.linkedBrRef||'') + ' ' + (cliMap[b.clientId]?.name||'') + ' ' + (supMap[b.supplierId]?.name||'')).toLowerCase().includes(ql));
    }
    if (supplierId !== 'all') items = items.filter(b => String(b.supplierId) === String(supplierId));
    if (driver !== 'all') items = items.filter(b => (b.driverName||'') === driver);
    if (status !== 'all') items = items.filter(b => (b.status||'open') === status);
    if (dateFrom) items = items.filter(b => (b.date||'') >= dateFrom);
    if (dateTo) items = items.filter(b => (b.date||'') <= dateTo);

    items.sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));

    // Pipeline Groups — use STATUS-based classification (not brId presence)
    // Since all BCH now get a reserved BR on creation, we check status instead
    const pipePending   = items.filter(b => b.status === 'pending_usine' || b.status === 'open' || (!b.status && !b.brId));
    const pipeValidated = items.filter(b => b.status === 'validated_usine');
    const pipeDelivered = items.filter(b => b.status === 'delivered');
    const pipeReturned  = items.filter(b => b.status === 'returned');

    const totalTTC = items.filter(b => b.status !== 'returned').reduce((s,b) => s + (Number(b.totalTTC)||0), 0);
    const totalReturnsTTC = items.filter(b => b.status === 'returned').reduce((s,b) => s + (Number(b.totalTTC)||0), 0);

    return `
    <div style="padding:24px 28px;max-width:1400px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:14px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;box-shadow:0 4px 12px rgba(37,99,235,.3)">
            <i class="fas fa-stream"></i>
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">Suivi & Supervision des Chargements</h2>
            <div style="font-size:13px;color:var(--text4);margin-top:2px">Pipeline en temps réel, traçabilité usine, BRs coordonnés et audit des flux</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-outline" onclick="App.loadModule('bls')"><i class="fas fa-list"></i> Liste des Bons</button>
          <button class="btn btn-primary" onclick="App.loadModule('supplier_portal')"><i class="fas fa-industry"></i> Portail Usines</button>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px">
        <div class="stat-card" style="border-left:4px solid #f59e0b">
          <div class="stat-title"><i class="fas fa-clock" style="color:#f59e0b"></i> En attente Usine</div>
          <div class="stat-val" style="color:#f59e0b">${pipePending.length}</div>
          <div class="stat-sub">${Utils.fmtCurrency(pipePending.reduce((s,b)=>s+(Number(b.totalTTC)||0),0))}</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #0d9488">
          <div class="stat-title"><i class="fas fa-industry" style="color:#0d9488"></i> Validés Usine / BR</div>
          <div class="stat-val" style="color:#0d9488">${pipeValidated.length}</div>
          <div class="stat-sub">${Utils.fmtCurrency(pipeValidated.reduce((s,b)=>s+(Number(b.totalTTC)||0),0))}</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #10b981">
          <div class="stat-title"><i class="fas fa-check-circle" style="color:#10b981"></i> Enlevés & Livrés</div>
          <div class="stat-val" style="color:#10b981">${pipeDelivered.length}</div>
          <div class="stat-sub">${Utils.fmtCurrency(pipeDelivered.reduce((s,b)=>s+(Number(b.totalTTC)||0),0))}</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #ef4444">
          <div class="stat-title"><i class="fas fa-undo" style="color:#ef4444"></i> Retours Déduits</div>
          <div class="stat-val" style="color:#ef4444">${pipeReturned.length}</div>
          <div class="stat-sub">−${Utils.fmtCurrency(totalReturnsTTC)}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="filters-bar" style="padding:14px 18px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <div class="filter-group" style="flex:2;min-width:180px">
            <label>Recherche rapide</label>
            <input type="text" value="${Utils.escHTML(q)}" placeholder="Réf BCH, Chauffeur, Camion, BR..."
              oninput="BCSupervisionModule._filters.q=this.value;App.reloadDebounced('bc_supervision')">
          </div>
          <div class="filter-group">
            <label>Usine / Fournisseur</label>
            <select onchange="BCSupervisionModule._filters.supplierId=this.value;App.loadModule('bc_supervision')">
              <option value="all">Toutes les usines</option>
              ${allSuppliers.map(s => `<option value="${s.id}" ${String(supplierId)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label>Chauffeur</label>
            <select onchange="BCSupervisionModule._filters.driver=this.value;App.loadModule('bc_supervision')">
              <option value="all">Tous les chauffeurs</option>
              ${[...new Set(allBCs.map(b => b.driverName).filter(Boolean))].sort().map(d => `<option value="${d}" ${driver===d?'selected':''}>${Utils.escHTML(d)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label>Période début</label>
            <input type="date" value="${dateFrom}" onchange="BCSupervisionModule._filters.dateFrom=this.value;App.loadModule('bc_supervision')">
          </div>
          <div class="filter-group">
            <label>Période fin</label>
            <input type="date" value="${dateTo}" onchange="BCSupervisionModule._filters.dateTo=this.value;App.loadModule('bc_supervision')">
          </div>
          <div class="filter-group" style="flex:0 0 auto">
            <label>&nbsp;</label>
            <button class="btn btn-outline btn-sm" onclick="BCSupervisionModule._filters={supplierId:'all',driver:'all',status:'all',dateFrom:'',dateTo:'',q:''};App.loadModule('bc_supervision')"><i class="fas fa-times"></i> Réinitialiser</button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:flex-start">
        <!-- Col 1: En attente Usine -->
        <div style="background:var(--bg2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #f59e0b">
            <strong style="font-size:13px;color:var(--text)"><i class="fas fa-clock" style="color:#f59e0b"></i> 1. En attente Usine</strong>
            <span class="badge badge-warning">${pipePending.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${pipePending.map(bc => this._renderKanbanCard(bc, supMap, cliMap)).join('') || `<div style="padding:20px;text-align:center;color:var(--text4);font-size:11px">Aucun en attente</div>`}
          </div>
        </div>

        <!-- Col 2: Validé Usine (BR Généré) -->
        <div style="background:var(--bg2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #0d9488">
            <strong style="font-size:13px;color:var(--text)"><i class="fas fa-industry" style="color:#0d9488"></i> 2. Validé Usine / BR</strong>
            <span class="badge badge-primary">${pipeValidated.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${pipeValidated.map(bc => this._renderKanbanCard(bc, supMap, cliMap)).join('') || `<div style="padding:20px;text-align:center;color:var(--text4);font-size:11px">Aucun validé</div>`}
          </div>
        </div>

        <!-- Col 3: Enlevé & Livré -->
        <div style="background:var(--bg2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #10b981">
            <strong style="font-size:13px;color:var(--text)"><i class="fas fa-check-circle" style="color:#10b981"></i> 3. Enlevé & Livré</strong>
            <span class="badge badge-success">${pipeDelivered.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${pipeDelivered.map(bc => this._renderKanbanCard(bc, supMap, cliMap)).join('') || `<div style="padding:20px;text-align:center;color:var(--text4);font-size:11px">Aucun livré</div>`}
          </div>
        </div>

        <!-- Col 4: Retourné -->
        <div style="background:var(--bg2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #ef4444">
            <strong style="font-size:13px;color:var(--text)"><i class="fas fa-undo" style="color:#ef4444"></i> 4. Retourné</strong>
            <span class="badge badge-danger">${pipeReturned.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${pipeReturned.map(bc => this._renderKanbanCard(bc, supMap, cliMap)).join('') || `<div style="padding:20px;text-align:center;color:var(--text4);font-size:11px">Aucun retour</div>`}
          </div>
        </div>
      </div>
    </div>`;
  },

  _renderKanbanCard(bc, supMap, cliMap) {
    const sup = supMap[bc.supplierId] || { name: bc.supplierName || 'Usine' };
    const cli = cliMap[bc.clientId] || { name: 'Client' };
    return `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;box-shadow:0 2px 6px rgba(0,0,0,.03)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <strong style="font-size:13px;color:var(--primary)">${Utils.escHTML(bc.ref)}</strong>
          <span style="font-size:11px;font-weight:800;color:var(--text)">${Utils.fmtCurrency(bc.totalTTC)}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">
          <i class="fas fa-industry" style="width:12px"></i> Usine: <strong>${Utils.escHTML(sup.name)}</strong>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">
          <i class="fas fa-id-card" style="width:12px"></i> Chauffeur: <strong>${Utils.escHTML(bc.driverName||'-')}</strong> <code>${Utils.escHTML(bc.truckIMM||'')}</code>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px">
          <i class="fas fa-user-tie" style="width:12px"></i> Client: <strong>${Utils.escHTML(cli.name||'-')}</strong>
        </div>
        ${bc.linkedBrRef ? `<div style="font-size:10px;background:rgba(16,185,129,.1);color:#10b981;padding:3px 6px;border-radius:6px;font-weight:700;margin-bottom:8px"><i class="fas fa-link"></i> Coordonné: ${Utils.escHTML(bc.linkedBrRef)}</div>` : ''}
        <div style="display:flex;gap:4px;border-top:1px solid var(--border);padding-top:8px">
          <button class="btn btn-xs btn-outline" style="flex:1" onclick="BCSupervisionModule.showTimeline(${bc.id})" title="Traçabilité & Historique"><i class="fas fa-history"></i> Traçabilité</button>
          <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBonChargement(${bc.id})" title="Imprimer BCH (2 Volets)"><i class="fas fa-print"></i></button>
          <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBLRoute(${bc.id})" title="BL pour la route"><i class="fas fa-truck"></i></button>
        </div>
      </div>
    `;
  },

  showTimeline(bcId) {
    const bc = DB.getById('bls', bcId);
    if (!bc) return;
    const sup = DB.getById('suppliers', bc.supplierId) || { name: bc.supplierName || 'Usine' };
    const cli = DB.getById('clients', bc.clientId) || { name: 'Client' };
    const br = bc.linkedBrId ? DB.getById('brs', bc.linkedBrId) : null;
    const ret = bc.status === 'returned' ? DB.getAll('bon_retours').find(r => Number(r.bcId) === Number(bc.id) || r.blRef === bc.ref) : null;

    const html = `
      <div style="padding:10px 0">
        <div style="display:flex;align-items:center;gap:12px;background:var(--bg2);padding:14px;border-radius:12px;margin-bottom:20px">
          <div style="width:44px;height:44px;border-radius:10px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px">
            <i class="fas fa-stream"></i>
          </div>
          <div>
            <div style="font-weight:800;font-size:16px;color:var(--text)">Traçabilité & Cycle de Vie — ${Utils.escHTML(bc.ref)}</div>
            <div style="font-size:12px;color:var(--text4)">Client: <strong>${Utils.escHTML(cli.name)}</strong> | Usine: <strong>${Utils.escHTML(sup.name)}</strong> | Montant: <strong style="color:var(--primary)">${Utils.fmtCurrency(bc.totalTTC)}</strong></div>
          </div>
        </div>

        <div style="position:relative;padding-left:32px;display:flex;flex-direction:column;gap:20px;border-left:2px solid var(--border);margin-left:14px">
          <!-- Step 1 -->
          <div style="position:relative">
            <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:#10b981;border:3px solid var(--bg);box-shadow:0 0 0 2px #10b981"></div>
            <div style="font-weight:800;font-size:13px;color:var(--text)">1. Émission du Bon de Chargement & Encaissement Caisse</div>
            <div style="font-size:11px;color:var(--text4);margin-top:2px">Date: ${Utils.fmtDate(bc.date)} ${bc.createdAt ? 'à ' + new Date(bc.createdAt).toLocaleTimeString('fr-FR') : ''} | Émetteur: <strong>${Utils.escHTML(bc.createdByName||'Caissier')}</strong></div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Montant TTC perçu au comptoir : <strong>${Utils.fmtCurrency(bc.totalTTC)}</strong> (${Utils.escHTML(bc.paymentMethod||'Espèces')})</div>
          </div>

          <!-- Step 2 -->
          <div style="position:relative">
            <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid var(--bg);box-shadow:0 0 0 2px #3b82f6"></div>
            <div style="font-weight:800;font-size:13px;color:var(--text)">2. Prise en charge Chauffeur & Départ Usine</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Chauffeur: <strong>${Utils.escHTML(bc.driverName||'-')}</strong> | Téléphone: <strong>${Utils.escHTML(bc.driverPhone||'-')}</strong> | Véhicule: <code>${Utils.escHTML(bc.truckIMM||'-')}</code></div>
            <div style="font-size:11px;color:var(--text4);margin-top:2px">Documents remis au chauffeur : Volet 1 (Chauffeur) + Volet 2 (Usine)</div>
          </div>

          <!-- Step 3 -->
          <div style="position:relative">
            <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:${bc.validatedAt ? '#0d9488' : '#94a3b8'};border:3px solid var(--bg);box-shadow:0 0 0 2px ${bc.validatedAt ? '#0d9488' : '#94a3b8'}"></div>
            <div style="font-weight:800;font-size:13px;color:${bc.validatedAt ? 'var(--text)' : 'var(--text4)'}">3. Validation Usine & Confirmation Chargement</div>
            ${bc.validatedAt ? `
            <div style="font-size:11px;color:#0d9488;margin-top:2px"><i class="fas fa-check-circle"></i> Validé le ${Utils.fmtDateTime ? Utils.fmtDateTime(bc.validatedAt) : bc.validatedAt} par <strong>${Utils.escHTML(bc.validatedBy||'Usine')}</strong></div>
            ${bc.ticketPesee ? `<div style="font-size:11px;color:var(--text3);margin-top:2px"><i class="fas fa-weight-hanging"></i> Ticket de Pesée / N° Usine : <strong>${Utils.escHTML(bc.ticketPesee)}</strong></div>` : ''}
            ` : `<div style="font-size:11px;color:#f59e0b;margin-top:2px"><i class="fas fa-clock"></i> En cours — Chauffeur en route vers l'usine ${Utils.escHTML(sup.name)}</div>`}
          </div>

          <!-- Step 4 -->
          <div style="position:relative">
            <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:${br ? '#8b5cf6' : '#94a3b8'};border:3px solid var(--bg);box-shadow:0 0 0 2px ${br ? '#8b5cf6' : '#94a3b8'}"></div>
            <div style="font-weight:800;font-size:13px;color:${br ? 'var(--text)' : 'var(--text4)'}">4. Génération Automatique du Bon de Réception (BR)</div>
            ${br ? `
            <div style="font-size:11px;color:#8b5cf6;margin-top:2px"><i class="fas fa-link"></i> BR officiel généré : <strong>${Utils.escHTML(br.ref)}</strong> (${Utils.fmtCurrency(br.totalTTC)})</div>
            <div style="font-size:11px;color:var(--text4);margin-top:2px"><i class="fas fa-lock"></i> Verrouillé — Modifiable uniquement par l'administrateur</div>
            ` : `<div style="font-size:11px;color:var(--text4);margin-top:2px">En attente de validation usine pour génération automatique</div>`}
          </div>

          <!-- Step 5 (if returned) -->
          ${bc.status === 'returned' ? `
          <div style="position:relative">
            <div style="position:absolute;left:-41px;top:0;width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid var(--bg);box-shadow:0 0 0 2px #ef4444"></div>
            <div style="font-weight:800;font-size:13px;color:#ef4444">5. Marchandise Retournée (Bon de Retour Émis)</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Retourné le ${Utils.fmtDateTime ? Utils.fmtDateTime(bc.returnedAt) : bc.returnedAt} par <strong>${Utils.escHTML(bc.returnedByName||'Utilisateur')}</strong></div>
            ${ret ? `<div style="font-size:11px;color:#ef4444;margin-top:2px"><i class="fas fa-undo"></i> Motif : <strong>${Utils.escHTML(ret.reason||'Non spécifié')}</strong> | Déduit en MOINS (−) sur l'État de Vente : <strong>−${Utils.fmtCurrency(bc.totalTTC)}</strong></div>` : ''}
            <div style="font-size:10px;color:var(--text4);margin-top:2px">Référence ${bc.ref} réservée définitivement comme retournée.</div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    UI.showModal(`<i class="fas fa-history"></i> Traçabilité — ${bc.ref}`, html, `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Fermer</button>
      <button class="btn btn-outline" onclick="PDFGen.exportBonChargement(${bc.id})"><i class="fas fa-print"></i> Imprimer BCH (2 Volets)</button>
      <button class="btn btn-outline" onclick="PDFGen.exportBLRoute(${bc.id})"><i class="fas fa-truck"></i> BL Route</button>
    `, 'lg');
  }
};

const CaisseModule = {
  render() {
    const u = Auth.getCurrentUser();
    if (!u) return '';
    const today = Utils.today();
    const isAR = T.isRTL();

    // Auto-ensure open session exists for today
    let session = SessionMgr.getTodaySession(u.id);
    if (!session) {
      session = SessionMgr.startSession(u.id);
    }

    const summary = SessionMgr.getUserDaySummary(u.id, today);
    const isClosed = session.status === 'closed';
    const closedNet = session.closedNet !== null && session.closedNet !== undefined ? session.closedNet : summary.netAmount;
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    const bankDoc = session.bankId ? banks.find(b => String(b.id) === String(session.bankId)) : null;
    const bankName = session.bankName || bankDoc?.name || (banks.length > 0 ? banks[0].name : 'Banque');

    // BL rows
    const blRows = summary.bls.length ? summary.bls.map((b, i) => {
      const cli = DB.getById('clients', b.clientId);
      return `<tr style="border-bottom:1px solid var(--border);${i % 2 ? 'background:var(--bg-inset)' : ''}">
        <td style="padding:10px 14px"><strong style="color:var(--primary)">${Utils.escHTML(b.ref || '')}</strong></td>
        <td style="padding:10px 14px;color:var(--text)">${Utils.escHTML(cli?.name || b.clientName || '—')}</td>
        <td style="padding:10px 14px;font-size:11px;color:var(--text4)">${b.createdAt ? new Date(b.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--success)">+${Utils.fmtCurrency(b.totalTTC)}</td>
        <td style="padding:10px 14px;text-align:center">${Utils.statusBadge(b.status || 'delivered')}</td>
        <td style="padding:10px 14px;text-align:right;white-space:nowrap">
          <button class="btn btn-xs btn-outline" onclick="BLModule.showDetail(${b.id})" title="${T.get('details')}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBonChargement(${b.id})" title="Imprimer BCH (2 Volets)"><i class="fas fa-print"></i></button>
          <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBLRoute(${b.id})" title="BL pour la route"><i class="fas fa-truck"></i></button>
          ${!isClosed ? `<button class="btn btn-xs btn-danger" style="background:#ef4444;color:#fff;border:none" onclick="BLModule.processReturn(${b.id})" title="Retour Marchandise"><i class="fas fa-undo"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-muted)"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px"></i>${isAR ? 'لا توجد وصولات تسليم اليوم' : 'Aucun bon de livraison validé aujourd\'hui'}</td></tr>`;

    // Retours rows
    const retoursRows = summary.retours.length ? summary.retours.map((r, i) => {
      const cli = DB.getById('clients', r.clientId);
      return `<tr style="border-bottom:1px solid var(--border);${i % 2 ? 'background:var(--bg-inset)' : ''}">
        <td style="padding:10px 14px"><strong style="color:var(--danger)">${Utils.escHTML(r.ref || '')}</strong></td>
        <td style="padding:10px 14px;color:var(--text)"><span class="badge badge-secondary">${Utils.escHTML(r.blRef || '—')}</span></td>
        <td style="padding:10px 14px;color:var(--text)">${Utils.escHTML(cli?.name || r.clientName || '—')}</td>
        <td style="padding:10px 14px;font-size:12px;color:var(--text3)">${Utils.escHTML(r.reason || '—')}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--danger)">-${Utils.fmtCurrency(r.totalTTC)}</td>
        <td style="padding:10px 14px;text-align:right">
          ${window.PDFGen ? `<button class="btn btn-xs btn-outline" onclick="PDFGen.exportBonRetour(${r.id})" title="PDF"><i class="fas fa-file-pdf"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted)"><i class="fas fa-check-circle" style="font-size:20px;opacity:.3;display:block;margin-bottom:6px"></i>${isAR ? 'لا توجد مرتجعات اليوم' : 'Aucun retour marchandise enregistré aujourd\'hui'}</td></tr>`;

    const thStyle = 'padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)';

    return `<div style="padding:24px" ${isAR ? 'dir="rtl"' : ''}>
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="avatar" style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">
            ${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:12px;object-fit:cover">` : Utils.escHTML((u.name || u.username || 'U').charAt(0).toUpperCase())}
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:800;color:var(--text);margin:0;display:flex;align-items:center;gap:10px">
              ${T.get('caisse_title')} <span style="font-size:13px;font-weight:600;color:var(--text4)">(${Utils.escHTML(u.name)})</span>
            </h2>
            <p style="color:var(--text-muted);font-size:12px;margin:3px 0 0">
              📅 ${isAR ? 'اليوم' : 'Aujourd\'hui'} — ${Utils.fmtDate(today)}
            </p>
          </div>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="CaisseModule.printDailyTicket()" title="Imprimer le ticket récapitulatif du jour">
            <i class="fas fa-receipt"></i> ${isAR ? 'طباعة الوصل' : 'Ticket Récapitulatif'}
          </button>
          ${isClosed
            ? `<span class="badge badge-success" style="font-size:13px;padding:7px 14px"><i class="fas fa-lock"></i> ${isAR ? 'مغلقة' : 'Caisse Clôturée'}</span>
               <button class="btn btn-success btn-sm" onclick="CaisseModule.viewEtatVente()"><i class="fas fa-file-invoice-dollar"></i> ${isAR ? 'عرض تقرير المبيعات' : 'Voir État de Vente'}</button>`
            : `<button class="btn btn-primary btn-sm" onclick="CaisseModule.showCloture()" style="background:linear-gradient(135deg,#0284c7,#0369a1);border:none;box-shadow:0 4px 12px rgba(2,132,199,.3)">
                <i class="fas fa-door-closed"></i> ${isAR ? 'إغلاق الصندوق وتحويل للبنك' : 'Clôturer ma Caisse & Verser en Banque'}
               </button>`
          }
          ${Auth.isAdmin() ? `<button class="btn btn-secondary btn-sm" onclick="App.loadModule('admin_caisse')" title="Supervision générale Admin"><i class="fas fa-vault"></i> Caisse Principale</button>` : ''}
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);border-top:3px solid var(--success)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">
            <i class="fas fa-truck" style="color:var(--success)"></i> ${isAR ? 'مبيعات اليوم (BCH)' : 'Ventes BCH du jour'}
          </div>
          <div style="font-size:24px;font-weight:900;color:var(--success)">+${Utils.fmtCurrency(summary.grossSales)}</div>
          <div style="font-size:11px;color:var(--text4);margin-top:2px">${summary.bls.length} bon(s) de chargement</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);border-top:3px solid var(--danger)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">
            <i class="fas fa-undo" style="color:var(--danger)"></i> ${isAR ? 'مرتجعات البضاعة (BR)' : 'Retours Marchandise (BR)'}
          </div>
          <div style="font-size:24px;font-weight:900;color:var(--danger)">-${Utils.fmtCurrency(summary.totalReturns)}</div>
          <div style="font-size:11px;color:var(--text4);margin-top:2px">${summary.retours.length} bon(s) de retour déduit(s)</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);border-top:3px solid var(--primary)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">
            <i class="fas fa-wallet" style="color:var(--primary)"></i> ${isAR ? 'صافي الصندوق (في اليد)' : 'Net en Caisse (À Verser)'}
          </div>
          <div style="font-size:26px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(isClosed ? closedNet : summary.netAmount)}</div>
          <div style="font-size:11px;color:var(--text4);margin-top:2px">Formule : Ventes − Retours</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);border-top:3px solid var(--info,#38bdf8)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">
            <i class="fas fa-university" style="color:var(--info,#38bdf8)"></i> ${isAR ? 'حالة التحويل البنكي' : 'Versement Banque'}
          </div>
          <div style="font-size:14px;font-weight:800;color:var(--text);margin-top:6px">
            ${isClosed
              ? `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Versé à ${Utils.escHTML(bankName)}</span>`
              : `<span style="color:var(--warning)"><i class="fas fa-hourglass-half"></i> En attente de clôture</span>`
            }
          </div>
          <div style="font-size:11px;color:var(--text4);margin-top:4px">${isClosed ? 'État de vente généré & transmis' : 'Sera versé automatiquement'}</div>
        </div>
      </div>

      <!-- Live État de Vente Notice -->
      <div style="background:linear-gradient(135deg,rgba(2,132,199,.06),rgba(2,132,199,.02));border:1px solid rgba(2,132,199,.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:8px;background:rgba(2,132,199,.15);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px">
            <i class="fas fa-file-invoice-dollar"></i>
          </div>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--text)">
              ${isClosed ? 'État de Vente du jour clôturé & déposé' : 'Aperçu de l\'État de Vente à générer'}
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">
              ${isClosed
                ? `Réf : <strong>${Utils.escHTML(session.etatVenteRef || 'Généré')}</strong> — Montant transféré : <strong>${Utils.fmtCurrency(closedNet)}</strong> vers <strong>${Utils.escHTML(bankName)}</strong>.`
                : `Total Ventes : <strong>+${Utils.fmtCurrency(summary.grossSales)}</strong> − Retours : <strong style="color:var(--danger)">-${Utils.fmtCurrency(summary.totalReturns)}</strong> = Net à transférer en banque : <strong style="color:var(--primary)">${Utils.fmtCurrency(summary.netAmount)}</strong>.`
              }
            </div>
          </div>
        </div>
        ${isClosed ? `<button class="btn btn-outline btn-sm" onclick="CaisseModule.viewEtatVente()"><i class="fas fa-eye"></i> Consulter</button>` : ''}
      </div>

      <!-- Tables Grid: Ventes BLs & Retours Marchandise -->
      <div style="display:grid;grid-template-columns:1fr;gap:20px;margin-bottom:24px">
        <!-- Table 1: Mes BLs du jour -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)">
          <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            <i class="fas fa-truck" style="color:var(--primary)"></i>
            <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR ? 'وصولات الشحن الصادرة اليوم (المبيعات)' : 'Mes Bons de Chargement du jour (Ventes)'}</h3>
            <span style="margin-${isAR ? 'right' : 'left'}:auto;font-size:11px;color:var(--text-muted)">${summary.bls.length} chargement(s) — Total : <strong>+${Utils.fmtCurrency(summary.grossSales)}</strong></span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
                <th style="${thStyle};text-align:left">Réf BCH</th>
                <th style="${thStyle};text-align:left">Client</th>
                <th style="${thStyle};text-align:left">Heure</th>
                <th style="${thStyle};text-align:right">Montant TTC</th>
                <th style="${thStyle};text-align:center">Statut</th>
                <th style="${thStyle};text-align:right">Actions</th>
              </tr></thead>
              <tbody>${blRows}</tbody>
              ${summary.bls.length ? `<tfoot><tr style="background:var(--bg-inset);border-top:2px solid var(--border)">
                <td colspan="3" style="padding:12px 14px;font-weight:800;text-align:right;font-size:13px;color:var(--text)">TOTAL VENTES BCH</td>
                <td style="padding:12px 14px;text-align:right;font-weight:900;font-size:15px;color:var(--success)">+${Utils.fmtCurrency(summary.grossSales)}</td>
                <td colspan="2"></td>
              </tr></tfoot>` : ''}
            </table>
          </div>
        </div>

        <!-- Table 2: Mes Retours Marchandise du jour -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)">
          <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            <i class="fas fa-undo" style="color:var(--danger)"></i>
            <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR ? 'مرتجعات البضاعة اليوم (خصومات)' : 'Mes Retours Marchandise du jour (Bons de Retour)'}</h3>
            <span style="margin-${isAR ? 'right' : 'left'}:auto;font-size:11px;color:var(--text-muted)">${summary.retours.length} retour(s) — Total : <strong style="color:var(--danger)">-${Utils.fmtCurrency(summary.totalReturns)}</strong></span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
                <th style="${thStyle};text-align:left">Réf BR</th>
                <th style="${thStyle};text-align:left">BCH d'origine</th>
                <th style="${thStyle};text-align:left">Client</th>
                <th style="${thStyle};text-align:left">Motif</th>
                <th style="${thStyle};text-align:right">Montant Déduit</th>
                <th style="${thStyle};text-align:right">Actions</th>
              </tr></thead>
              <tbody>${retoursRows}</tbody>
              ${summary.retours.length ? `<tfoot><tr style="background:var(--bg-inset);border-top:2px solid var(--border)">
                <td colspan="4" style="padding:12px 14px;font-weight:800;text-align:right;font-size:13px;color:var(--text)">TOTAL RETOURS DÉDUITS</td>
                <td style="padding:12px 14px;text-align:right;font-weight:900;font-size:15px;color:var(--danger)">-${Utils.fmtCurrency(summary.totalReturns)}</td>
                <td></td>
              </tr></tfoot>` : ''}
            </table>
          </div>
        </div>
      </div>

      <!-- Past Sessions History -->
      ${this._renderUserHistory(u)}
    </div>`;
  },

  async showCloture() {
    const u = Auth.getCurrentUser();
    if (!u) return;
    const today = Utils.today();
    const session = SessionMgr.getTodaySession(u.id);
    if (session && session.status === 'closed') {
      Utils.notify('Votre caisse est déjà clôturée pour aujourd\'hui.', 'info');
      return;
    }

    const summary = SessionMgr.getUserDaySummary(u.id, today);
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    if (!banks.length) {
      Utils.notify("Aucun compte bancaire configuré dans les paramètres de l'entreprise.", 'warning');
      return;
    }

    const bankOpts = banks.map(b => `<option value="${b.id}">${Utils.escHTML(b.name)} — ${Utils.escHTML(b.bankName || '')} (${Utils.escHTML(b.accountNum || 'Compte')})</option>`).join('');

    const modalHTML = `
      <div style="padding:4px 0">
        <div style="background:linear-gradient(135deg,rgba(2,132,199,.08),rgba(2,132,199,.02));border:1px solid rgba(2,132,199,.2);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text4);letter-spacing:.5px;margin-bottom:8px">Récapitulatif de clôture</div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
            <span style="color:var(--text2)">Total Ventes Bons de Chargement (${summary.bls.length})</span>
            <span style="font-weight:700;color:var(--success)">+${Utils.fmtCurrency(summary.grossSales)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
            <span style="color:var(--text2)">Total Retours Marchandise (${summary.retours.length})</span>
            <span style="font-weight:700;color:var(--danger)">-${Utils.fmtCurrency(summary.totalReturns)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:1px solid var(--border);font-size:16px;font-weight:900">
            <span style="color:var(--text)">Net à transférer en Banque</span>
            <span style="color:var(--primary)">${Utils.fmtCurrency(summary.netAmount)}</span>
          </div>
        </div>

        <div class="form-group mb-2">
          <label class="required" style="font-weight:700"><i class="fas fa-university" style="color:var(--primary)"></i> Compte bancaire destinataire</label>
          <select id="cloture_bank_id" class="input" style="width:100%;font-weight:600;padding:10px">
            ${bankOpts}
          </select>
        </div>

        <div class="form-group mb-2">
          <label style="font-weight:700">Observations / Note de clôture</label>
          <input type="text" id="cloture_note" class="input" style="width:100%" placeholder="Remarques éventuelles sur la journée...">
        </div>

        <div class="alert alert-info mb-1" style="font-size:11px">
          <i class="fas fa-info-circle"></i>
          La clôture génère l'État de Vente journalier avec la liste complète des BL et les retours déduits, crédite le compte bancaire et verrouille les opérations du jour.
        </div>
      </div>`;

    const ok = await Dialog.show({
      title: `🌙 Clôture de Caisse — ${Utils.fmtDate(today)}`,
      message: modalHTML,
      type: 'info',
      confirmText: 'Confirmer la Clôture & Verser en Banque',
      cancelText: 'Annuler'
    });

    if (!ok) return;

    const bankId = document.getElementById('cloture_bank_id')?.value;
    const note = document.getElementById('cloture_note')?.value?.trim() || '';

    try {
      const result = await SessionMgr.closeMiniCaisse(u.id, bankId, note);
      Utils.notify(`✅ Caisse clôturée avec succès ! État de vente ${result?.etatDoc?.ref || ''} généré et fonds versés.`, 'success', 6000);
      App.loadModule('caisse');
    } catch (e) {
      console.error(e);
      Utils.notify("Erreur lors de la clôture : " + e.message, 'error');
    }
  },

  viewEtatVente() {
    const u = Auth.getCurrentUser();
    const today = Utils.today();
    const session = SessionMgr.getTodaySession(u.id);
    let etatDoc = null;
    if (session?.etatVenteId) {
      etatDoc = DB.getById('etat_vente_docs', session.etatVenteId);
    }
    if (!etatDoc) {
      etatDoc = DB.getAll('etat_vente_docs').find(d => (d.dateStart === today || d.date === today) && d.createdBy === u?.id);
    }
    if (!etatDoc) {
      Utils.notify("Aucun État de Vente trouvé pour aujourd'hui.", 'warning');
      return;
    }
    if (window.PDFGen && PDFGen.exportEtatVente) {
      PDFGen.exportEtatVente(etatDoc);
    } else {
      App.loadModule('etat_vente');
    }
  },

  printDailyTicket() {
    const u = Auth.getCurrentUser();
    const today = Utils.today();
    const session = SessionMgr.getTodaySession(u.id);
    const summary = SessionMgr.getUserDaySummary(u.id, today);
    const settings = DB.getSettings();

    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) {
      Utils.notify("Veuillez autoriser les fenêtres contextuelles (popups) pour imprimer le ticket.", 'warning');
      return;
    }

    const blsHtml = summary.bls.map(b => `
      <div style="display:flex;justify-content:space-between;margin:3px 0;font-size:11px">
        <span>${Utils.escHTML(b.ref)} (${Utils.escHTML(b.clientName || 'Client').slice(0, 15)})</span>
        <span>+${Utils.fmtCurrency(b.totalTTC)}</span>
      </div>`).join('');

    const retoursHtml = summary.retours.length ? `
      <div style="border-top:1px dashed #000;margin-top:6px;padding-top:4px">
        <div style="font-weight:700;font-size:11px;margin-bottom:4px">RETOURS MARCHANDISE :</div>
        ${summary.retours.map(r => `
          <div style="display:flex;justify-content:space-between;margin:2px 0;font-size:11px;color:#c00">
            <span>${Utils.escHTML(r.ref)} (${Utils.escHTML(r.blRef || 'BL')})</span>
            <span>-${Utils.fmtCurrency(r.totalTTC)}</span>
          </div>`).join('')}
      </div>` : '';

    w.document.write(`
      <html>
      <head>
        <title>Ticket Récapitulatif - ${today}</title>
        <style>
          body { font-family: monospace, sans-serif; font-size: 12px; margin: 0; padding: 12px; color: #000; }
          .center { text-align: center; }
          .line { border-bottom: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="center bold" style="font-size:14px">${Utils.escHTML(settings.companyName || 'ERP LOGISTIQUE')}</div>
        <div class="center" style="font-size:10px">TICKET RÉCAPITULATIF DE CAISSE</div>
        <div class="line"></div>
        <div class="flex"><span>Date :</span><span>${today}</span></div>
        <div class="flex"><span>Caissier :</span><span>${Utils.escHTML(u.name)}</span></div>
        <div class="flex"><span>Statut :</span><span>${session?.status === 'closed' ? 'CLÔTURÉ' : 'EN COURS'}</span></div>
        <div class="line"></div>
        <div class="bold" style="font-size:11px;margin-bottom:4px">VENTES DU JOUR (${summary.bls.length}) :</div>
        ${blsHtml || '<div>Aucun BL</div>'}
        ${retoursHtml}
        <div class="line"></div>
        <div class="flex bold"><span>TOTAL VENTES :</span><span>+${Utils.fmtCurrency(summary.grossSales)}</span></div>
        <div class="flex bold"><span>TOTAL RETOURS :</span><span>-${Utils.fmtCurrency(summary.totalReturns)}</span></div>
        <div class="line"></div>
        <div class="flex bold" style="font-size:14px"><span>NET CAISSE :</span><span>${Utils.fmtCurrency(summary.netAmount)}</span></div>
        <div class="line"></div>
        <div class="center" style="font-size:9px;margin-top:12px">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
      </body>
      </html>
    `);
    w.document.close();
  },

  _renderUserHistory(u) {
    const isAR = T.isRTL();
    const sessions = DB.getAll('sessions').filter(s => s.userId === u.id);
    sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const rows = sessions.slice(0, 15).map(s => {
      const isCl = s.status === 'closed';
      return `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px 12px;font-weight:700">${Utils.fmtDate(s.date)}</td>
        <td style="padding:8px 12px;text-align:center">${isCl ? `<span class="badge badge-success"><i class="fas fa-lock"></i> Clôturée</span>` : `<span class="badge badge-warning"><i class="fas fa-clock"></i> En cours</span>`}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--success);font-weight:700">+${Utils.fmtCurrency(s.totalSales || 0)}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--danger);font-weight:700">-${Utils.fmtCurrency(s.totalReturns || 0)}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(s.closedNet !== null && s.closedNet !== undefined ? s.closedNet : (s.totalSales || 0) - (s.totalReturns || 0))}</td>
        <td style="padding:8px 12px;color:var(--text3);font-size:11px">${Utils.escHTML(s.bankName || 'Banque')}</td>
      </tr>`;
    }).join('');

    return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);margin-top:20px">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-history" style="color:var(--text-muted)"></i>
        <h3 style="font-size:13px;font-weight:700;margin:0;color:var(--text)">${isAR ? 'سجل جلسات الصندوق السابقة' : 'Historique de mes sessions précédentes'}</h3>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
            <th style="padding:8px 12px;text-align:left;color:var(--text4)">Date</th>
            <th style="padding:8px 12px;text-align:center;color:var(--text4)">Statut</th>
            <th style="padding:8px 12px;text-align:right;color:var(--text4)">Ventes</th>
            <th style="padding:8px 12px;text-align:right;color:var(--text4)">Retours</th>
            <th style="padding:8px 12px;text-align:right;color:var(--text4)">Net Versé</th>
            <th style="padding:8px 12px;text-align:left;color:var(--text4)">Banque</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-muted)">Aucun historique disponible</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
  },

  async showMorningPrompt() {
    const u = Auth.getCurrentUser();
    if (!u) return;
    
    const ok = await Dialog.show({
      title: 'Démarrer votre journée de caisse?',
      message: `<div class="form-group"><label>Montant en caisse au début (DA)</label><input type="number" id="morning_start_amount" class="input" style="font-size:20px;font-weight:800;text-align:center" value="0"></div>`,
      type: 'info',
      confirmText: 'Démarrer',
      cancelText: 'Annuler'
    });
    
    if (!ok) return;
    
    const amount = Number(document.getElementById('morning_start_amount')?.value || 0);
    const today = Utils.today();
    const now = new Date().toTimeString().slice(0, 5);
    
    DB.insert('sessions', {
      userId: u.id,
      userName: u.name,
      date: today,
      startTime: now,
      startAmount: amount,
      status: 'open'
    });
    
    App.loadModule('dashboard');
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
      {id:'mini_caisses',   icon:'fa-cash-register',    label:isAR?'مراقبة الصناديق':'Supervision Mini-Caisses', accent:'#0284c7'},
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
            <th>${isAR?'الصافي المحصّل':'Net Versé'}</th>
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
          <span style="font-size:11px;color:var(--text4)">${isAR?'صافي الصندوق':'Net en caisse'}</span>
          <span style="font-size:15px;font-weight:800;color:var(--warning)">${Utils.fmtCurrency(monnaie)}</span>
        </div>
      </div>`;
    }).join('');

    const tabCaissiers = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${userSummaryCards || `<div class="empty-state"><i class="fas fa-users"></i><h4>${T.get('no_data')}</h4></div>`}
    </div>`;

    // ── Tab: Supervision des Mini Caisses ─────────────────────────
    const mcDf = this._filters.dateFrom;
    const mcDt = this._filters.dateTo;
    const mcUserFilter = this._filters.userId;
    const allSessionsList = DB.getAll('sessions');
    const filteredSessions = allSessionsList.filter(s => {
      if (mcDf && s.date < mcDf) return false;
      if (mcDt && s.date > mcDt) return false;
      if (mcUserFilter && mcUserFilter !== 'all' && String(s.userId) !== String(mcUserFilter)) return false;
      return true;
    });

    let totalMCSales = 0;
    let totalMCReturns = 0;
    let totalMCNet = 0;
    let totalMCClosed = 0;

    const cashierData = filteredSessions.map(s => {
      const cashierUser = allUsers.find(x => x.id === s.userId);
      const sum = SessionMgr.getUserDaySummary(s.userId, s.date);
      const netVal = s.status === 'closed' && s.closedNet !== null && s.closedNet !== undefined ? s.closedNet : sum.netAmount;
      totalMCSales += sum.grossSales;
      totalMCReturns += sum.totalReturns;
      totalMCNet += netVal;
      if (s.status === 'closed') totalMCClosed++;
      return { session: s, user: cashierUser, summary: sum, netVal };
    });

    const tabMiniCaisses = `
    <div style="margin-bottom:20px">
      <!-- Filters & Title Bar -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px;background:var(--bg2);padding:14px 18px;border-radius:12px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(2,132,199,.15);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px">
            <i class="fas fa-cash-register"></i>
          </div>
          <div>
            <strong style="color:var(--text);font-size:15px">${isAR ? 'مراقبة وإدارة صناديق المستخدمين' : 'Supervision des Mini Caisses Utilisateurs'}</strong>
            <div style="font-size:11px;color:var(--text4);margin-top:2px">Contrôle des ventes journalières, retours, clôtures et versements bancaires</div>
          </div>
        </div>

        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="date" value="${this._filters.dateFrom}" onchange="AdminCaisseModule._filters.dateFrom=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)" title="Date début">
          <span style="color:var(--text4)">→</span>
          <input type="date" value="${this._filters.dateTo}" onchange="AdminCaisseModule._filters.dateTo=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)" title="Date fin">
          <select onchange="AdminCaisseModule._filters.userId=this.value;App.loadModule('admin_caisse')" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text)">
            <option value="all">Tous les caissiers</option>
            ${users.map(u => `<option value="${u.id}" ${mcUserFilter === String(u.id) ? 'selected' : ''}>${Utils.escHTML(u.name || u.username)}</option>`).join('')}
          </select>
          <button class="btn btn-outline" onclick="AdminCaisseModule._filters={dateFrom:'',dateTo:'',userId:'all'};App.loadModule('admin_caisse')" style="font-size:11px;padding:7px 12px" title="Réinitialiser filtres"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        <div class="stat-card-v2">
          <div class="stat-icon-v2 blue"><i class="fas fa-truck"></i></div>
          <div class="stat-body-v2">
            <div class="stat-value-v2" style="font-size:18px;color:var(--success)">+${Utils.fmtCurrency(totalMCSales)}</div>
            <div class="stat-label-v2">Total Ventes BCH</div>
          </div>
        </div>

        <div class="stat-card-v2">
          <div class="stat-icon-v2 orange"><i class="fas fa-undo"></i></div>
          <div class="stat-body-v2">
            <div class="stat-value-v2" style="font-size:18px;color:var(--danger)">-${Utils.fmtCurrency(totalMCReturns)}</div>
            <div class="stat-label-v2">Total Retours Déduits</div>
          </div>
        </div>

        <div class="stat-card-v2">
          <div class="stat-icon-v2 green"><i class="fas fa-vault"></i></div>
          <div class="stat-body-v2">
            <div class="stat-value-v2" style="font-size:18px;color:var(--primary)">${Utils.fmtCurrency(totalMCNet)}</div>
            <div class="stat-label-v2">Net Total Encaissé</div>
          </div>
        </div>

        <div class="stat-card-v2">
          <div class="stat-icon-v2 purple"><i class="fas fa-door-closed"></i></div>
          <div class="stat-body-v2">
            <div class="stat-value-v2">${totalMCClosed} / ${filteredSessions.length}</div>
            <div class="stat-label-v2">Sessions Clôturées</div>
          </div>
        </div>
      </div>

      <!-- Cashiers Sessions Table -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
                <th style="padding:12px 16px;text-align:left;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Caissier</th>
                <th style="padding:12px 16px;text-align:left;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Date</th>
                <th style="padding:12px 16px;text-align:center;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Statut</th>
                <th style="padding:12px 16px;text-align:right;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Ventes BCH</th>
                <th style="padding:12px 16px;text-align:right;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Retours (BR)</th>
                <th style="padding:12px 16px;text-align:right;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Net Caisse</th>
                <th style="padding:12px 16px;text-align:right;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Versé Banque</th>
                <th style="padding:12px 16px;text-align:center;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Réf État Vente</th>
                <th style="padding:12px 16px;text-align:right;color:var(--text4);font-size:11px;font-weight:700;text-transform:uppercase">Actions Admin</th>
              </tr>
            </thead>
            <tbody>
              ${cashierData.length ? cashierData.map(({ session: s, user: u, summary: sum, netVal }) => {
                const isCl = s.status === 'closed';
                const etatDoc = s.etatVenteId ? DB.getById('etat_vente_docs', s.etatVenteId) : null;
                return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
                  <td style="padding:12px 16px">
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="avatar" style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">
                        ${u?.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:8px;object-fit:cover">` : Utils.escHTML((u?.name || u?.username || '?').charAt(0).toUpperCase())}
                      </div>
                      <div>
                        <strong style="color:var(--text)">${Utils.escHTML(u?.name || u?.username || '—')}</strong>
                        ${u?.jobTitle ? `<div style="font-size:10px;color:var(--text4)">${Utils.escHTML(u.jobTitle)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td style="padding:12px 16px;color:var(--text2);font-weight:600">${Utils.fmtDate(s.date)}</td>
                  <td style="padding:12px 16px;text-align:center">
                    ${isCl
                      ? `<span class="badge badge-success"><i class="fas fa-lock"></i> Clôturée</span>`
                      : `<span class="badge badge-warning"><i class="fas fa-clock"></i> En cours</span>`
                    }
                  </td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;color:var(--success)">+${Utils.fmtCurrency(sum.grossSales)}</td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;color:var(--danger)">-${Utils.fmtCurrency(sum.totalReturns)}</td>
                  <td style="padding:12px 16px;text-align:right;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(sum.netAmount)}</td>
                  <td style="padding:12px 16px;text-align:right;font-weight:900;color:var(--text)">${isCl ? Utils.fmtCurrency(netVal) : '<span style="color:var(--text4)">—</span>'}</td>
                  <td style="padding:12px 16px;text-align:center">
                    ${etatDoc ? `<button class="btn btn-xs btn-outline" onclick="PDFGen.exportEtatVente(DB.getById('etat_vente_docs', ${etatDoc.id}))" title="Voir PDF État de Vente"><i class="fas fa-file-invoice-dollar" style="color:var(--primary)"></i> ${Utils.escHTML(etatDoc.ref)}</button>` : '<span style="color:var(--text4);font-size:11px">—</span>'}
                  </td>
                  <td style="padding:12px 16px;text-align:right;white-space:nowrap">
                    <button class="btn btn-xs" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:5px 10px;font-weight:700" onclick="AdminCaisseModule.rectifyUserCloture('${s.id}')" title="Rectifier le montant clôturé / versé en cas d'erreur">
                      <i class="fas fa-edit"></i> Rectifier
                    </button>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text4)"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>Aucune session trouvée pour ces filtres</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

    const tabContent = tab==='overview' ? tabOverview
      : tab==='deposits'       ? tabDeposits
      : tab==='withdrawals'    ? tabWithdrawals
      : tab==='mini_caisses'   ? tabMiniCaisses
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

  async rectifyUserCloture(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session) return;
    const u = DB.getById('users', session.userId);
    const oldNet = session.closedNet || 0;

    const modalHTML = `
      <div style="padding:4px 0">
        <div class="alert alert-warning mb-2" style="font-size:12px">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Correction Admin :</strong> Cette modification ajustera le versement déclaré de la mini caisse, mettra à jour l'entrée de caisse correspondante et le mouvement bancaire.
        </div>
        <div style="background:var(--bg-inset);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="color:var(--text3)">Caissier :</span>
            <strong style="color:var(--text)">${Utils.escHTML(u?.name || 'Caissier')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="color:var(--text3)">Date session :</span>
            <strong>${Utils.fmtDate(session.date)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--text3)">Montant actuel versé :</span>
            <strong style="color:var(--primary);font-size:15px">${Utils.fmtCurrency(oldNet)}</strong>
          </div>
        </div>

        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Nouveau montant rectifié (DA)</label>
          <input type="number" id="rect_new_net" class="input" style="width:100%;font-size:18px;font-weight:800;text-align:center" min="0" step="any" value="${oldNet}">
        </div>

        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Motif de la rectification (obligatoire)</label>
          <input type="text" id="rect_admin_motif" class="input" style="width:100%" placeholder="Ex: Erreur de saisie du caissier, ajustement monnaie...">
        </div>
      </div>`;

    const ok = await Dialog.show({
      title: `✏️ Rectifier Versement Mini Caisse — ${u?.name || ''}`,
      message: modalHTML,
      type: 'warning',
      confirmText: 'Enregistrer la Rectification',
      cancelText: 'Annuler'
    });

    if (!ok) return;

    const newNet = parseFloat(document.getElementById('rect_new_net')?.value);
    const motif = document.getElementById('rect_admin_motif')?.value?.trim();

    if (isNaN(newNet) || newNet < 0) {
      Utils.notify("Montant invalide.", "error");
      return;
    }
    if (!motif) {
      Utils.notify("Veuillez indiquer le motif de la rectification.", "warning");
      return;
    }

    const conf = await Utils.confirm2(
      `Confirmer la rectification du versement pour ${u?.name || 'le caissier'} ?`,
      `Nouveau montant : ${Utils.fmtCurrency(newNet)} (Ancien : ${Utils.fmtCurrency(oldNet)})\nMotif : ${motif}`
    );
    if (!conf) return;

    const updated = SessionMgr.updateCloture(sessionId, newNet, motif);
    if (updated) {
      Utils.notify("✅ Versement mini caisse rectifié avec succès.", "success", 5000);
      App.loadModule('admin_caisse');
    }
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
    } else if (typeof CSVExport !== 'undefined') {
      const headers = [isAR?'التاريخ':'Date', isAR?'النوع':'Type', isAR?'المبلغ':'Montant',
         isAR?'المستخدم':'Utilisateur', isAR?'ملاحظة':'Note',
         isAR?'الوجهة':'Destination', isAR?'مرجع':'Référence'];
      CSVExport.download(headers, rows, filename + '_' + new Date().toISOString().slice(0,10));
    } else {
      Utils.notify('Export non disponible — rafraîchissez la page', 'warning');
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
      <label>${isAR?'المبلغ الصافي المصحح':'Net versé corrigé'}</label>
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
    const items = DB.getAll('suppliers').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
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
                <button class="btn btn-xs btn-primary" onclick="PartnersModule._detailType='supplier';PartnersModule._detailId=${s.id};App.loadModule('partners')" title="Détails"><i class="fas fa-chart-line"></i></button>
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
    const items = DB.getAll('clients').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
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
                <button class="btn btn-xs btn-primary" onclick="PartnersModule._detailType='client';PartnersModule._detailId=${s.id};App.loadModule('partners')" title="Détails"><i class="fas fa-chart-line"></i></button>
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
    } else if (typeof CSVExport !== 'undefined') {
      CSVExport.download(headers, rows, `rapport_stats_${Utils.today()}`);
      Utils.notify(isAR?'تم تصدير التقرير':'Rapport exporté (CSV)', 'success');
    } else {
      Utils.notify('Export non disponible', 'error');
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
            ${(u.name||'?').charAt(0).toUpperCase()}
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
              <i class="fas fa-cash-register" style="color:var(--primary)"></i> Clôture Mini Caisse & Versement
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px">
              <div class="eval-kpi"><div class="ek-value">${Utils.fmtCurrency(session.totalSales||brTotal)}</div><div class="ek-label">Ventes Brutes</div></div>
              <div class="eval-kpi"><div class="ek-value">${Utils.fmtCurrency(brTotal)}</div><div class="ek-label">Attendu (BRs)</div></div>
              <div class="eval-kpi"><div class="ek-value" style="color:var(--primary)">${Utils.fmtCurrency(session.closedEspeces||0)}</div><div class="ek-label">Espèces déclarées</div></div>
              <div class="eval-kpi"><div class="ek-value" style="color:var(--primary)">${Utils.fmtCurrency(session.closedNet||session.closedEspeces||brTotal)}</div><div class="ek-label">Net Versé Banque</div></div>
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

    // ── BL history & Returns per BL ──────────────────────────
    const userBLs = DB.getAll('bls').filter(bl => {
      if (String(bl.createdBy) === String(u.id)) return true;
      const br2 = DB.getById('brs', bl.brId);
      return br2 && String(br2.createdBy) === String(u.id);
    }).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    const blTotal = userBLs.reduce((s,bl) => s+(Number(bl.totalTTC||0)),0);

    const blRows = userBLs.map(bl => {
      const br2 = DB.getById('brs', bl.brId);
      const isRet = bl.status === 'returned';
      return `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px 14px;font-weight:700">${Utils.escHTML(bl.ref||'')}</td>
        <td style="padding:8px">${Utils.escHTML(bl.clientName||'—')}</td>
        <td style="padding:8px">${Utils.escHTML(br2?.ref||'—')}</td>
        <td style="padding:8px">${(bl.deliveredAt||bl.createdAt||'').slice(0,10)}</td>
        <td style="padding:8px;text-align:right;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(bl.totalTTC||br2?.totalTTC||0)}</td>
        <td style="padding:8px;text-align:center">
          ${isRet
            ? '<span class="badge badge-danger"><i class="fas fa-undo"></i> Retourné</span>'
            : '<span class="badge badge-success"><i class="fas fa-check"></i> Vendu</span>'
          }
        </td>
        <td style="padding:8px">${Utils.statusBadge(bl.status||'open')}</td>
      </tr>`;
    }).join('');

    const blSection = `
    <div class="card mb-2" style="overflow:hidden">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <h3><i class="fas fa-truck" style="color:var(--success)"></i> Historique BL <span class="badge badge-secondary">${userBLs.length}</span></h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:12px;color:var(--text3)">Total Ventes: <strong style="color:var(--success)">${Utils.fmtCurrency(blTotal)}</strong></span>
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
            <th style="padding:8px;text-align:center;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">Retour</th>
            <th style="padding:8px;color:var(--text4);font-size:10px;font-weight:700;text-transform:uppercase">Statut</th>
          </tr></thead>
          <tbody>${blRows}</tbody>
          <tfoot><tr style="border-top:2px solid var(--border);background:var(--bg3)">
            <td colspan="4" style="padding:9px 14px;font-weight:700;text-align:right">TOTAL</td>
            <td style="padding:9px 14px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(blTotal)}</td>
            <td></td>
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
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900">${(u.name||'?').charAt(0).toUpperCase()}</div>
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
        <div><div class="kpi-label">Total Ventes BL</div><div class="kpi-value" style="font-size:16px;color:#f59e0b">${Utils.fmtCurrency(blSarfTotal)}</div></div></div>
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

    <!-- BL History & Returns -->
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
    const rows = [['BL Ref','Client','BR Ref','Date','TTC','Statut Retour','Statut Global']];
    userBLs.forEach(bl => {
      const br2 = DB.getById('brs', bl.brId);
      rows.push([bl.ref||'', bl.clientName||'', br2?.ref||'', (bl.deliveredAt||bl.createdAt||'').slice(0,10), bl.totalTTC||br2?.totalTTC||0, bl.status==='returned'?'Retourné':'Normal', bl.status||'']);
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
    let items = DB.getAll('articles').filter(a => a && a.name).sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if (q) items = items.filter(a => (a.name||'').toLowerCase().includes(q)||(a.unit||'').toLowerCase().includes(q));

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
    let items = DB.getAll('drivers').sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if (q) items = items.filter(d => (d.name||'').toLowerCase().includes(q)||(d.imm||'').toLowerCase().includes(q));

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
      <div class="card-header" style="flex-wrap:wrap;gap:12px">
        <div>
          <h3 style="margin:0"><i class="fas fa-users-cog"></i> ${T.get('usr_title')} & Ressources Humaines</h3>
          <p style="font-size:12px;color:var(--text4);margin:4px 0 0">Gestion des profils employés, photos, départements, salaires et permissions</p>
        </div>
        <button class="btn btn-primary" onclick="UsersModule.showCreate()"><i class="fas fa-user-plus"></i> ${T.get('usr_new')}</button>
      </div>
      <div class="table-wrap">
        <table class="data-table" style="font-size:13px">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Identifiant</th>
              <th>Département</th>
              <th>Poste / Rôle</th>
              <th>Salaire Base</th>
              <th>Statut</th>
              <th>Dernière session</th>
              <th>${T.get('col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const lastSess = sessions.filter(s => s.userId === u.id).sort((a,b) => (b.date||'').localeCompare(a.date||''))[0];
              const avatarHTML = u.avatar
                ? `<img src="${u.avatar}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:1.5px solid var(--border)">`
                : `<div class="avatar ${u.role==='admin'?'admin-avatar':''}" style="width:36px;height:36px;font-size:13px;border-radius:10px">${Utils.escHTML((u.name||'?').charAt(0).toUpperCase())}</div>`;

              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHTML}
                    <div>
                      <strong style="color:var(--text)">${Utils.escHTML(u.name)}</strong>
                      ${u.phone ? `<div style="font-size:11px;color:var(--text4)"><i class="fas fa-phone-alt" style="font-size:9px"></i> ${Utils.escHTML(u.phone)}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td><code>${Utils.escHTML(u.username)}</code></td>
                <td><span style="font-size:12px;color:var(--text2)">${Utils.escHTML(u.department || 'Général')}</span></td>
                <td>
                  <div style="font-weight:600;font-size:12px">${Utils.escHTML(u.jobTitle || '—')}</div>
                  ${u.role === 'supplier'
                    ? `<span class="badge" style="background:#0d9488;color:#fff;font-size:10px;margin-top:2px"><i class="fas fa-industry"></i> ${T.get('role_supplier') || 'Usine / Fournisseur'}</span>`
                    : `<span class="badge ${u.role==='admin'?'badge-danger':'badge-primary'}" style="font-size:10px;margin-top:2px">${T.get('role_'+u.role)}</span>`
                  }
                  ${u.supplierId ? `<div style="font-size:10px;color:var(--text4);margin-top:2px"><i class="fas fa-industry"></i> ${Utils.escHTML(DB.getById('suppliers', u.supplierId)?.name || 'Usine')}</div>` : ''}
                </td>
                <td style="font-weight:700;color:var(--primary)">${u.baseSalary ? Utils.fmtCurrency(u.baseSalary) : '<span style="color:var(--text4)">—</span>'}</td>
                <td><span class="badge ${u.active!==false?'badge-success':'badge-secondary'}">${u.active!==false?T.get('usr_active'):T.get('usr_inactive')}</span></td>
                <td style="color:var(--text3);font-size:12px">${lastSess ? Utils.fmtDate(lastSess.date) : '<span class="text-muted">—</span>'}</td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="UsersModule.showEdit(${u.id})" title="Modifier"><i class="fas fa-edit"></i></button>
                  ${u.id !== Auth.getCurrentUser()?.id ? `
                    <button class="btn btn-xs ${u.active!==false?'btn-warning':'btn-success'}" onclick="UsersModule.toggleActive(${u.id})" title="${u.active!==false?'Désactiver':'Activer'}">${u.active!==false?'<i class="fas fa-ban"></i>':'<i class="fas fa-check"></i>'}</button>
                    <button class="btn btn-xs btn-danger" onclick="UsersModule.deleteUser(${u.id})" title="${isAR?'حذف':'Supprimer'}"><i class="fas fa-trash-alt"></i></button>
                  ` : ''}
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
      canViewCaisse:{label:'Voir sa mini caisse',icon:'fa-cash-register'},canViewSuppliers:{label:'Voir fournisseurs',icon:'fa-building'},
      canViewClients:{label:'Voir clients',icon:'fa-users'},canViewStats:{label:'Voir statistiques',icon:'fa-chart-bar'},
      canViewCatalogue:{label:'Catalogue',icon:'fa-database'},canViewBank:{label:'Comptes banque',icon:'fa-university'},
      canEditSuppliers:{label:'Modifier fournisseurs',icon:'fa-edit'},canEditClients:{label:'Modifier clients',icon:'fa-edit'},
      canDeleteBR:{label:'Supprimer des BR',icon:'fa-trash'},canDeleteBL:{label:'Supprimer des BL',icon:'fa-trash'}
    };
    const cp = u.id ? Auth.getUserPermissions(u) : Auth._defaultPermissions();
    const pg = Object.entries(pl).map(([k,m]) => {
      const c = cp[k] === true;
      return `<label class="perm-item ${c?'checked':''}" onclick="this.classList.toggle('checked')">
        <input type="checkbox" data-perm="${k}" ${c?'checked':''} onchange="this.parentElement.classList.toggle('checked',this.checked)">
        <i class="fas ${m.icon}" style="color:var(--primary);font-size:12px"></i>
        <span style="font-size:12px">${m.label}</span>
      </label>`;
    }).join('');

    const previewSrc = u.avatar || '';

    return `
    <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:20px;background:var(--bg3);padding:16px;border-radius:14px;border:1px solid var(--border)">
      <div style="position:relative;width:76px;height:76px;border-radius:16px;overflow:hidden;background:var(--bg2);border:2px dashed var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <img id="uAvatarPreview" src="${previewSrc}" style="width:100%;height:100%;object-fit:cover;${previewSrc?'':'display:none'}">
        <div id="uAvatarPlaceholder" style="${previewSrc?'display:none':''};text-align:center;color:var(--text4);font-size:11px">
          <i class="fas fa-camera" style="font-size:22px;display:block;margin-bottom:4px;color:var(--primary)"></i> Photo
        </div>
      </div>
      <div style="flex:1">
        <label style="font-weight:700;font-size:13px;color:var(--text);display:block;margin-bottom:4px">Photo de profil / Avatar RH</label>
        <p style="font-size:11px;color:var(--text4);margin:0 0 10px">Formats JPG, PNG ou WebP. Utilisé dans le pointage et l'application.</p>
        <input type="file" id="uAvatarFileInput" accept="image/*" style="font-size:12px" onchange="
          const file = this.files[0];
          if (file) {
            const r = new FileReader();
            r.onload = e => {
              document.getElementById('uAvatarData').value = e.target.result;
              const img = document.getElementById('uAvatarPreview');
              img.src = e.target.result;
              img.style.display = 'block';
              document.getElementById('uAvatarPlaceholder').style.display = 'none';
            };
            r.readAsDataURL(file);
          }
        ">
        <input type="hidden" id="uAvatarData" value="${previewSrc}">
      </div>
    </div>

    <!-- Identifiants & Rôle -->
    <div class="form-grid cols-2" style="margin-bottom:16px">
      <div class="form-group"><label class="required">${T.get('usr_name')}</label><input id="uName" value="${Utils.escHTML(u.name||'')}" required placeholder="Nom et prénom"></div>
      <div class="form-group"><label class="required">${T.get('usr_login')}</label><input id="uUsername" value="${Utils.escHTML(u.username||'')}" required autocomplete="off" placeholder="Nom d'utilisateur"></div>
      <div class="form-group"><label ${!u.id?'class="required"':''}>${T.get('usr_pass')} ${u.id?'(vide = inchangé)':''}</label>
        <input type="password" id="uPassword" ${!u.id?'required':''} autocomplete="new-password"></div>
      <div class="form-group"><label>${T.get('usr_role')}</label>
        <select id="uRole" onchange="
          const isSup = this.value === 'supplier' || this.value === 'supplier_agent';
          const isAdmin = this.value === 'admin';
          document.getElementById('permSection').style.display = (isAdmin || isSup) ? 'none' : 'block';
          const sg = document.getElementById('uSupplierSelectGroup');
          if (sg) sg.style.display = isSup ? 'block' : 'none';
        ">
          <option value="user" ${u.role!=='admin'&&u.role!=='supplier'&&u.role!=='supplier_agent'?'selected':''}>${T.get('role_user')}</option>
          <option value="supplier" ${u.role==='supplier'?'selected':''}>🏭 Usine / Fournisseur (Portail Enlèvements)</option>
          <option value="supplier_agent" ${u.role==='supplier_agent'?'selected':''}>👷 Agent Usine (Validation sur site uniquement)</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>${T.get('role_admin')}</option>
        </select>
      </div>
      <div class="form-group" id="uSupplierSelectGroup" style="display:${u.role==='supplier'||u.role==='supplier_agent'?'block':'none'}">
        <label class="required"><i class="fas fa-industry"></i> Usine / Fournisseur associé</label>
        <select id="uSupplierId">
          <option value="">-- Sélectionner l'Usine --</option>
          ${DB.getAll('suppliers').map(s => `<option value="${s.id}" ${String(u.supplierId)===String(s.id)?'selected':''}>${Utils.escHTML(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Informations RH (Ressources Humaines) -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-weight:800;font-size:13px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-id-card-alt" style="color:var(--primary)"></i> Fiche Ressources Humaines (RH)
      </div>
      <div class="form-grid cols-2">
        <div class="form-group"><label>Poste / Fonction</label><input id="uJobTitle" value="${Utils.escHTML(u.jobTitle||'')}" placeholder="Ex: Caissier Vendeur, Responsable Dépôt..."></div>
        <div class="form-group"><label>Département / Service</label>
          <select id="uDepartment">
            <option value="Ventes & Caisse" ${(u.department||'')==='Ventes & Caisse'?'selected':''}>Ventes & Caisse</option>
            <option value="Approvisionnement & Stock" ${(u.department||'')==='Approvisionnement & Stock'?'selected':''}>Approvisionnement & Stock</option>
            <option value="Logistique & Livraison" ${(u.department||'')==='Logistique & Livraison'?'selected':''}>Logistique & Livraison</option>
            <option value="Administration & Comptabilité" ${(u.department||'')==='Administration & Comptabilité'?'selected':''}>Administration & Comptabilité</option>
            <option value="Direction Générale" ${(u.department||'')==='Direction Générale'?'selected':''}>Direction Générale</option>
          </select>
        </div>
        <div class="form-group"><label>Salaire de base mensuel (DA)</label><input type="number" id="uBaseSalary" value="${u.baseSalary||''}" placeholder="Ex: 50000" min="0" step="any"></div>
        <div class="form-group"><label>Taux horaire HS (DA/h)</label><input type="number" id="uTauxHoraire" value="${u.tauxHoraire||''}" placeholder="Ex: 300" min="0" step="any"></div>
        <div class="form-group"><label>Solde congé annuel (jours)</label><input type="number" id="uCongeBalance" value="${u.congeBalance||30}" placeholder="30" min="0" step="1"></div>
        <div class="form-group"><label>Date d'embauche</label><input type="date" id="uHireDate" value="${u.hireDate||''}"></div>
        <div class="form-group"><label>N° Téléphone</label><input type="text" id="uPhone" value="${Utils.escHTML(u.phone||'')}" placeholder="Ex: 0550 12 34 56"></div>
        <div class="form-group"><label>Remarques / Notes RH</label><input type="text" id="uRhNotes" value="${Utils.escHTML(u.rhNotes||'')}" placeholder="Notes internes..."></div>
      </div>
    </div>

    <!-- Permissions Section -->
    <div id="permSection" style="display:${u.role==='admin'?'none':'block'};margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px"><i class="fas fa-shield-alt" style="color:var(--primary)"></i> Permissions d'accès à l'ERP</div>
      <div class="perm-grid">${pg}</div>
    </div>`;
  },

  showCreate() {
    UI.showModal(`<i class="fas fa-user-plus"></i> ${T.get('usr_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="UsersModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
  },

  showEdit(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')} Collaborateur`, this._form(u), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="UsersModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
  },

  _save(id) {
    const name = (document.getElementById('uName')?.value||'').trim();
    const username = (document.getElementById('uUsername')?.value||'').trim().toLowerCase();
    const password = document.getElementById('uPassword')?.value||'';
    const role = document.getElementById('uRole')?.value||'user';
    const supplierId = (role === 'supplier' || role === 'supplier_agent') ? (parseInt(document.getElementById('uSupplierId')?.value) || null) : null;
    const avatar = document.getElementById('uAvatarData')?.value || '';
    const jobTitle = document.getElementById('uJobTitle')?.value?.trim() || '';
    const department = document.getElementById('uDepartment')?.value || 'Ventes & Caisse';
    const baseSalary = parseFloat(document.getElementById('uBaseSalary')?.value || 0) || 0;
    const tauxHoraire = parseFloat(document.getElementById('uTauxHoraire')?.value || 0) || 0;
    const congeBalance = parseInt(document.getElementById('uCongeBalance')?.value || 30) || 30;
    const hireDate = document.getElementById('uHireDate')?.value || '';
    const phone = document.getElementById('uPhone')?.value?.trim() || '';
    const rhNotes = document.getElementById('uRhNotes')?.value?.trim() || '';

    if (!name||!username) { Utils.notify((T.isRTL()?'الحقول مطلوبة':'Champs requis'), 'error'); return; }
    if (!id && !password) { Utils.notify(T.get('usr_pass')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    if ((role === 'supplier' || role === 'supplier_agent') && !supplierId) {
      Utils.notify("Veuillez sélectionner l'Usine / Fournisseur associé à ce compte", 'error');
      return;
    }
    const dup = DB.getAll('users').find(u => u.username===username && u.id!==id);
    if (dup) { Utils.notify((T.isRTL()?'المعرف مستخدم بالفعل':'Identifiant déjà utilisé'), 'error'); return; }

    const data = { 
      name, username, role, supplierId, avatar, jobTitle, department, baseSalary, tauxHoraire, congeBalance, hireDate, phone, rhNotes 
    };

    if (role !== 'admin') {
      const perms = {};
      document.querySelectorAll('[data-perm]').forEach(cb => { perms[cb.dataset.perm] = cb.checked; });
      data.permissions = perms;
    }
    if (password) data.password = password;

    if (id) {
      DB.update('users', id, data);
      Utils.notify('✅ Collaborateur modifié avec succès', 'success');
    } else {
      DB.insert('users', { ...data, active: true });
      Utils.notify('✅ Collaborateur créé avec succès', 'success');
    }
    UI.closeModal();
    App.loadModule('users');
  },

  toggleActive(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    if (u.role === 'admin' && u.active !== false) {
      const admins = DB.getAll('users').filter(x => x.role === 'admin' && x.active !== false);
      if (admins.length <= 1) {
        Utils.notify('Impossible de désactiver le dernier admin', 'error');
        return;
      }
    }
    DB.update('users', id, { active: u.active === false });
    Utils.notify('Statut collaborateur mis à jour', 'success');
    App.loadModule('users');
  },

  async deleteUser(id) {
    const u = DB.getById('users', id);
    if (!u) return;
    const me = Auth.getCurrentUser();
    if (u.id === me?.id) {
      Utils.notify('Impossible de supprimer votre propre compte', 'error');
      return;
    }
    if (u.role === 'admin') {
      const admins = DB.getAll('users').filter(x => x.role === 'admin');
      if (admins.length <= 1) {
        Utils.notify('Impossible de supprimer le dernier administrateur', 'error');
        return;
      }
    }
    const name = u.name || u.username;
    const ok = await Utils.confirm2(
      'Supprimer ce collaborateur ?',
      `Collaborateur : "${name}"\nCette action est irréversible.`
    );
    if (!ok) return;
    DB.delete('users', id);
    Utils.notify('✅ Collaborateur supprimé', 'success');
    App.loadModule('users');
  }
};
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
      {id:'bank_fees', icon:'fa-money-check-alt', label:'Frais Bancaires', color:'#dc2626'},
      {id:'rh',      icon:'fa-user-clock',  label:'RH / Paie',           color:'#6366f1'},
      {id:'etatvente',icon:'fa-file-invoice-dollar',label:T.get('nav_etat_vente'), color:'#0d9488'},
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
      ${this._tab==='etatvente'?this._tabEtatVente(s):''}
      ${this._tab==='data'?this._tabData():''}
      ${this._tab==='bank_fees'?this._tabBankFees(s):''}
      ${this._tab==='rh'?this._tabRH(s):''}
    </div>
    </div>`;
  },

  _tabRH(s) {
    const rh = s.rh || {};
    const users = DB.getAll('users').filter(u => u.active !== false);
    return `
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas fa-user-clock" style="color:#fff;font-size:16px"></i>
        </div>
        <div>
          <h3 style="margin:0;font-size:18px;font-weight:800;color:var(--text)">Configuration RH / Paie</h3>
          <p style="margin:2px 0 0;font-size:12px;color:var(--text4)">Taux CNAS, IRG, salaire par defaut et configuration des employes</p>
        </div>
      </div>

      <!-- Global RH Config -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px">
        <h4 style="margin:0 0 14px;font-size:14px;font-weight:800;color:var(--text)"><i class="fas fa-cog" style="color:#6366f1;margin-right:6px"></i>Parametres Globaux de Paie</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Taux CNAS Salarie (%)</label>
            <input type="number" id="rh_taux_cnas" class="input" style="width:100%" value="${rh.tauxCNAS || 9}" step="0.5" min="0" max="50">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Taux CNAS Employeur (%)</label>
            <input type="number" id="rh_taux_cnas_emp" class="input" style="width:100%" value="${rh.tauxCNASEmployeur || 26}" step="0.5" min="0" max="50">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Salaire de Base par Defaut (DA)</label>
            <input type="number" id="rh_salaire_defaut" class="input" style="width:100%" value="${rh.salaireDefaut || 45000}" step="1000">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Jours Reference / Mois</label>
            <input type="number" id="rh_jours_ref" class="input" style="width:100%" value="${rh.joursRef || 30}" min="20" max="31">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Taux Horaire HS par Defaut (DA/h)</label>
            <input type="number" id="rh_taux_hs_defaut" class="input" style="width:100%" value="${rh.tauxHSDefaut || 260}" step="10">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Activer IRG (Impot)</label>
            <select id="rh_irg_active" class="input" style="width:100%">
              <option value="1" ${rh.irgActive !== false ? 'selected' : ''}>Oui - Calculer IRG</option>
              <option value="0" ${rh.irgActive === false ? 'selected' : ''}>Non - Sans IRG</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="SettingsModule._saveRH()" style="margin-top:16px;width:100%;padding:12px;font-weight:700">
          <i class="fas fa-save"></i> Sauvegarder les Parametres RH
        </button>
      </div>

      <!-- Per-User Salary Overview -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px">
        <h4 style="margin:0 0 14px;font-size:14px;font-weight:800;color:var(--text)"><i class="fas fa-users" style="color:#10b981;margin-right:6px"></i>Salaires par Employe (${users.length})</h4>
        <div class="table-shell" style="overflow-x:auto">
        <table class="data-table" style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
            <th style="padding:8px;text-align:left">Employe</th>
            <th style="padding:8px;text-align:left">Poste</th>
            <th style="padding:8px;text-align:right">Salaire Base (DA)</th>
            <th style="padding:8px;text-align:right">Taux Horaire (DA/h)</th>
            <th style="padding:8px;text-align:center">Conge (solde)</th>
          </tr></thead>
          <tbody>
            ${users.map(u => `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px 8px;font-weight:600">${Utils.escHTML(u.name)}</td>
              <td style="padding:6px 8px;color:var(--text3)">${Utils.escHTML(u.jobTitle||'-')}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;color:var(--primary)">${Utils.fmtCurrency(u.baseSalary || rh.salaireDefaut || 45000)}</td>
              <td style="padding:6px 8px;text-align:right">${Utils.fmtCurrency(u.tauxHoraire || rh.tauxHSDefaut || 260)}</td>
              <td style="padding:6px 8px;text-align:center">${u.congeBalance || 30} j</td>
            </tr>`).join('')}
          </tbody>
        </table>
        </div>
        <p style="font-size:11px;color:var(--text4);margin:10px 0 0"><i class="fas fa-info-circle"></i> Modifiez le salaire et taux horaire de chaque employe dans l'onglet <strong>Utilisateurs</strong>.</p>
      </div>
    </div>`;
  },

  _saveRH() {
    const s = DB.getSettings();
    const rh = {
      tauxCNAS: parseFloat(document.getElementById('rh_taux_cnas')?.value || 9),
      tauxCNASEmployeur: parseFloat(document.getElementById('rh_taux_cnas_emp')?.value || 26),
      salaireDefaut: parseFloat(document.getElementById('rh_salaire_defaut')?.value || 45000),
      joursRef: parseInt(document.getElementById('rh_jours_ref')?.value || 30),
      tauxHSDefaut: parseFloat(document.getElementById('rh_taux_hs_defaut')?.value || 260),
      irgActive: document.getElementById('rh_irg_active')?.value === '1',
    };
    DB.saveSettings({...s, rh});
    Utils.notify('Parametres RH sauvegardes avec succes !', 'success');
    App.loadModule('settings');
  },

  _tabBankFees(s) {
    const isAR = T.isRTL();
    const banks = s.banks || [];
    const fees = s.bankFees || {};

    const ALGERIAN_BANKS = [
      { name: 'BNA', depositFee: 0, withdrawalFee: 50, packFee: 1500, transferFee: 200 },
      { name: 'CPA', depositFee: 0, withdrawalFee: 75, packFee: 2000, transferFee: 250 },
      { name: 'BADR', depositFee: 0, withdrawalFee: 50, packFee: 1500, transferFee: 200 },
      { name: 'BEA', depositFee: 0, withdrawalFee: 100, packFee: 2500, transferFee: 300 },
      { name: 'BDL', depositFee: 0, withdrawalFee: 50, packFee: 1200, transferFee: 150 },
      { name: 'CNEP', depositFee: 0, withdrawalFee: 30, packFee: 1000, transferFee: 100 },
      { name: 'Gulf Bank', depositFee: 0, withdrawalFee: 150, packFee: 3000, transferFee: 350 },
      { name: 'SGA', depositFee: 50, withdrawalFee: 100, packFee: 3500, transferFee: 400 },
      { name: 'AGB', depositFee: 0, withdrawalFee: 100, packFee: 2800, transferFee: 300 },
      { name: 'Trust Bank', depositFee: 0, withdrawalFee: 75, packFee: 2000, transferFee: 200 },
      { name: 'Autre', depositFee: 0, withdrawalFee: 0, packFee: 0, transferFee: 0 },
    ];

    if (!banks.length) {
      return `<div class="alert alert-info">Veuillez d'abord configurer des comptes bancaires dans l'onglet Banques.</div>`;
    }

    window._saveBankFees = () => {
      const bFees = {};
      banks.forEach(b => {
        bFees[b.id] = {
          depositFee: parseFloat(document.getElementById(`bf_dep_${b.id}`).value) || 0,
          depositFeePercent: parseFloat(document.getElementById(`bf_deppct_${b.id}`).value) || 0,
          withdrawalFee: parseFloat(document.getElementById(`bf_with_${b.id}`).value) || 0,
          transferFee: parseFloat(document.getElementById(`bf_trans_${b.id}`).value) || 0,
          checkFee: parseFloat(document.getElementById(`bf_check_${b.id}`).value) || 0,
          packFee: parseFloat(document.getElementById(`bf_pack_${b.id}`).value) || 0,
          packFeeDay: parseInt(document.getElementById(`bf_packday_${b.id}`).value) || 1
        };
      });
      DB.saveSettings({ bankFees: bFees });
      Utils.notify(isAR ? 'تم الحفظ' : 'Enregistré', 'success');
    };

    window._applyBankTemplate = (bankId, sel) => {
      const tmpl = ALGERIAN_BANKS.find(x => x.name === sel.value);
      if (tmpl) {
        document.getElementById(`bf_dep_${bankId}`).value = tmpl.depositFee;
        document.getElementById(`bf_with_${bankId}`).value = tmpl.withdrawalFee;
        document.getElementById(`bf_pack_${bankId}`).value = tmpl.packFee;
        document.getElementById(`bf_trans_${bankId}`).value = tmpl.transferFee;
      }
    };

    let html = `<div style="max-width:800px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div><div style="font-weight:800;font-size:16px">Frais Bancaires Automatiques</div></div>
        <button class="btn btn-primary" onclick="_saveBankFees()"><i class="fas fa-save"></i> ${T.get('save')}</button>
      </div>`;

    banks.forEach(b => {
      const f = fees[b.id] || {};
      html += `<div style="background:var(--bg2);padding:16px;border-radius:12px;margin-bottom:16px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px">
          <div style="font-weight:700;color:var(--primary)"><i class="fas fa-university"></i> ${Utils.escHTML(b.name)}</div>
          <select class="input" style="width:200px;padding:4px" onchange="_applyBankTemplate('${b.id}', this)">
            <option value="">-- Modèle de frais --</option>
            ${ALGERIAN_BANKS.map(x => `<option value="${x.name}">${x.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="label">Frais de versement fixe (DA)</label>
            <input type="number" id="bf_dep_${b.id}" class="input" value="${f.depositFee||0}">
          </div>
          <div>
            <label class="label">Frais de versement (%)</label>
            <input type="number" step="0.01" id="bf_deppct_${b.id}" class="input" value="${f.depositFeePercent||0}">
          </div>
          <div>
            <label class="label">Frais de retrait (DA)</label>
            <input type="number" id="bf_with_${b.id}" class="input" value="${f.withdrawalFee||0}">
          </div>
          <div>
            <label class="label">Frais de virement (DA)</label>
            <input type="number" id="bf_trans_${b.id}" class="input" value="${f.transferFee||0}">
          </div>
          <div>
            <label class="label">Frais de remise chèque (DA)</label>
            <input type="number" id="bf_check_${b.id}" class="input" value="${f.checkFee||0}">
          </div>
          <div style="display:flex;gap:8px">
            <div style="flex:2">
              <label class="label">Pack Mensuel (DA)</label>
              <input type="number" id="bf_pack_${b.id}" class="input" value="${f.packFee||0}">
            </div>
            <div style="flex:1">
              <label class="label">Jour</label>
              <input type="number" id="bf_packday_${b.id}" class="input" value="${f.packFeeDay||1}" min="1" max="28">
            </div>
          </div>
        </div>
      </div>`;
    });

    html += `</div>`;
    return html;
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-weight:800;font-size:16px;color:var(--text)">Comptes Bancaires & Coordonnées</div>
          <div style="font-size:12px;color:var(--text4);margin-top:4px">Gérez vos comptes, RIB, IBAN, agences et paramètres de versement</div>
        </div>
        <button class="btn btn-primary" onclick="SettingsModule._addBank()"><i class="fas fa-plus"></i> Ajouter un compte</button>
      </div>
      ${banks.length===0?`<div class="empty-state"><i class="fas fa-university" style="font-size:40px;color:var(--text4)"></i><p>Aucun compte bancaire configuré</p></div>`:`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
        ${banks.map(b => {
          const bal = (typeof BankModule !== 'undefined') ? BankModule._bankBalance(b.id).balance : 0;
          return `<div class="card-v2" style="position:relative">
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),#0284c7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0">
                <i class="fas fa-university"></i>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;font-size:15px;color:var(--text)">${Utils.escHTML(b.name)}</div>
                <div style="font-size:12px;color:var(--primary);font-weight:700">${Utils.escHTML(b.bankName||'Banque')}</div>
                ${b.agency ? `<div style="font-size:11px;color:var(--text3)">📍 ${Utils.escHTML(b.agency)}</div>` : ''}
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm btn-outline" onclick="SettingsModule._editBank('${b.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)" onclick="SettingsModule._deleteBank('${b.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
              </div>
            </div>

            <!-- Details grid -->
            <div style="background:var(--bg3);border-radius:10px;padding:10px 12px;font-size:11px;display:grid;gap:4px;margin-bottom:12px">
              ${b.accountNum ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text4)">N° Compte :</span><strong style="font-family:monospace;color:var(--text)">${Utils.escHTML(b.accountNum)}</strong></div>` : ''}
              ${b.rib ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text4)">RIB :</span><strong style="font-family:monospace;color:var(--primary)">${Utils.escHTML(b.rib)}</strong></div>` : ''}
              ${b.iban ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text4)">IBAN :</span><strong style="font-family:monospace;color:var(--text2)">${Utils.escHTML(b.iban)}</strong></div>` : ''}
              ${b.swift ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text4)">SWIFT/BIC :</span><strong style="font-family:monospace;color:var(--text2)">${Utils.escHTML(b.swift)}</strong></div>` : ''}
              ${b.initialBalance ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text4)">Solde initial :</span><span style="color:var(--text3)">${Utils.fmtCurrency(b.initialBalance)}</span></div>` : ''}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px dashed var(--border)">
              <span style="font-size:12px;color:var(--text4)">Solde Actuel :</span>
              <strong style="font-size:16px;color:${bal>=0?'var(--text)':'var(--danger)'}">${Utils.fmtCurrency(bal)}</strong>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
  },

  async _addBank() {
    const dzBanks = [
      "Baraka Bank (Al Baraka)",
      "BNA (Banque Nationale d'Algérie)",
      "CPA (Crédit Populaire d'Algérie)",
      "BADR (Banque de l'Agriculture et du Développement Rural)",
      "BEA (Banque Extérieure d'Algérie)",
      "BDL (Banque de Développement Local)",
      "CNEP (Caisse Nationale d'Épargne et de Prévoyance)",
      "ABC (Arab Banking Corporation)",
      "Gulf Bank Algérie",
      "AGB (Algeria Gulf Bank)",
      "Trust Bank Algeria",
      "Société Générale Algérie",
      "Housing Bank Algérie",
      "Natixis Algérie",
      "CNMA (Caisse Nationale de Mutualité Agricole)"
    ];
    const opts = dzBanks.map(b => `<option value="${b}">${b}</option>`).join('');
    const selHtml = `<select id="bank_bname" class="input" style="width:100%" onchange="document.getElementById('bank_bname_custom').style.display=this.value==='Autre'?'block':'none'"><option value="">-- Sélectionner une banque --</option>${opts}<option value="Autre">Autre...</option></select><input type="text" id="bank_bname_custom" class="input" placeholder="Saisir le nom de la banque" style="width:100%;margin-top:6px;display:none;">`;

    const formHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <label class="required" style="font-weight:700">Nom du compte / Intitulé</label>
          <input type="text" id="bank_name" class="input" placeholder="Ex: Compte Courant Principal, Compte Ventes...">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="font-weight:700">Établissement bancaire</label>
          ${selHtml}
        </div>
        <div class="form-group">
          <label style="font-weight:700">Agence / Guichet</label>
          <input type="text" id="bank_agency" class="input" placeholder="Ex: Agence Didouche Mourad 123">
        </div>
        <div class="form-group">
          <label style="font-weight:700">N° de compte</label>
          <input type="text" id="bank_num" class="input" placeholder="Ex: 002 00012 3456789">
        </div>
        <div class="form-group">
          <label style="font-weight:700">RIB (20 chiffres)</label>
          <input type="text" id="bank_rib" class="input" placeholder="00200012345678901234" maxlength="24">
        </div>
        <div class="form-group">
          <label style="font-weight:700">IBAN</label>
          <input type="text" id="bank_iban" class="input" placeholder="DZ50 0020 0012 3456 7890 1234">
        </div>
        <div class="form-group">
          <label style="font-weight:700">Code SWIFT / BIC</label>
          <input type="text" id="bank_swift" class="input" placeholder="Ex: BNAIDZAL">
        </div>
        <div class="form-group">
          <label style="font-weight:700">Solde initial de départ (DA)</label>
          <input type="number" id="bank_init_bal" class="input" placeholder="0" min="0" step="any" value="0">
        </div>
      </div>`;

    const r = await Dialog.show({
      title: '🏦 Ajouter un compte bancaire',
      message: formHtml,
      type: 'info',
      confirmText: 'Ajouter le compte',
      cancelText: 'Annuler'
    });

    if (!r) return;
    const name = document.getElementById('bank_name')?.value?.trim();
    if (!name) { Utils.notify('Le nom du compte est requis', 'warning', 3000); return; }

    let bname = document.getElementById('bank_bname')?.value || '';
    if (bname === 'Autre') bname = document.getElementById('bank_bname_custom')?.value?.trim() || '';

    const newBank = {
      id: 'bank_' + Date.now(),
      name,
      bankName: bname,
      agency: document.getElementById('bank_agency')?.value?.trim() || '',
      accountNum: document.getElementById('bank_num')?.value?.trim() || '',
      rib: document.getElementById('bank_rib')?.value?.trim() || '',
      iban: document.getElementById('bank_iban')?.value?.trim() || '',
      swift: document.getElementById('bank_swift')?.value?.trim() || '',
      initialBalance: parseFloat(document.getElementById('bank_init_bal')?.value || 0) || 0
    };

    const s = DB.getSettings();
    const banks = s.banks || [];
    banks.push(newBank);
    DB.saveSettings({ banks });
    Utils.notify('✅ Compte bancaire ajouté avec succès', 'success');
    App.loadModule('settings');
  },

  async _editBank(bankId) {
    const s = DB.getSettings();
    const banks = s.banks || [];
    const b = banks.find(x => x.id === bankId);
    if (!b) return;

    const dzBanks = [
      "Baraka Bank (Al Baraka)",
      "BNA (Banque Nationale d'Algérie)",
      "CPA (Crédit Populaire d'Algérie)",
      "BADR (Banque de l'Agriculture et du Développement Rural)",
      "BEA (Banque Extérieure d'Algérie)",
      "BDL (Banque de Développement Local)",
      "CNEP (Caisse Nationale d'Épargne et de Prévoyance)",
      "ABC (Arab Banking Corporation)",
      "Gulf Bank Algérie",
      "AGB (Algeria Gulf Bank)",
      "Trust Bank Algeria",
      "Société Générale Algérie",
      "Housing Bank Algérie",
      "Natixis Algérie",
      "CNMA (Caisse Nationale de Mutualité Agricole)"
    ];
    const isOther = b.bankName && !dzBanks.includes(b.bankName);
    const opts = dzBanks.map(bk => `<option value="${bk}" ${b.bankName === bk ? 'selected' : ''}>${bk}</option>`).join('');
    const selHtml = `<select id="bank_bname" class="input" style="width:100%" onchange="document.getElementById('bank_bname_custom').style.display=this.value==='Autre'?'block':'none'"><option value="">-- Sélectionner une banque --</option>${opts}<option value="Autre" ${isOther ? 'selected' : ''}>Autre...</option></select><input type="text" id="bank_bname_custom" class="input" placeholder="Saisir le nom de la banque" value="${isOther ? Utils.escHTML(b.bankName) : ''}" style="width:100%;margin-top:6px;display:${isOther ? 'block' : 'none'};">`;

    const formHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <label class="required" style="font-weight:700">Nom du compte / Intitulé</label>
          <input type="text" id="bank_name" class="input" value="${Utils.escHTML(b.name)}">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="font-weight:700">Établissement bancaire</label>
          ${selHtml}
        </div>
        <div class="form-group">
          <label style="font-weight:700">Agence / Guichet</label>
          <input type="text" id="bank_agency" class="input" value="${Utils.escHTML(b.agency || '')}" placeholder="Ex: Agence Didouche Mourad 123">
        </div>
        <div class="form-group">
          <label style="font-weight:700">N° de compte</label>
          <input type="text" id="bank_num" class="input" value="${Utils.escHTML(b.accountNum || '')}" placeholder="Ex: 002 00012 3456789">
        </div>
        <div class="form-group">
          <label style="font-weight:700">RIB (20 chiffres)</label>
          <input type="text" id="bank_rib" class="input" value="${Utils.escHTML(b.rib || '')}" placeholder="00200012345678901234">
        </div>
        <div class="form-group">
          <label style="font-weight:700">IBAN</label>
          <input type="text" id="bank_iban" class="input" value="${Utils.escHTML(b.iban || '')}" placeholder="DZ50 0020 0012 3456 7890 1234">
        </div>
        <div class="form-group">
          <label style="font-weight:700">Code SWIFT / BIC</label>
          <input type="text" id="bank_swift" class="input" value="${Utils.escHTML(b.swift || '')}" placeholder="Ex: BNAIDZAL">
        </div>
        <div class="form-group">
          <label style="font-weight:700">Solde initial de départ (DA)</label>
          <input type="number" id="bank_init_bal" class="input" value="${b.initialBalance || 0}" min="0" step="any">
        </div>
      </div>`;

    const r = await Dialog.show({
      title: '✏️ Modifier le compte bancaire',
      message: formHtml,
      type: 'info',
      confirmText: 'Enregistrer les modifications',
      cancelText: 'Annuler'
    });

    if (!r) return;
    b.name = document.getElementById('bank_name')?.value?.trim() || b.name;
    let bname = document.getElementById('bank_bname')?.value || '';
    if (bname === 'Autre') bname = document.getElementById('bank_bname_custom')?.value?.trim() || '';
    b.bankName = bname;
    b.agency = document.getElementById('bank_agency')?.value?.trim() || '';
    b.accountNum = document.getElementById('bank_num')?.value?.trim() || '';
    b.rib = document.getElementById('bank_rib')?.value?.trim() || '';
    b.iban = document.getElementById('bank_iban')?.value?.trim() || '';
    b.swift = document.getElementById('bank_swift')?.value?.trim() || '';
    b.initialBalance = parseFloat(document.getElementById('bank_init_bal')?.value || 0) || 0;

    DB.saveSettings({ banks });
    Utils.notify('✅ Compte bancaire mis à jour', 'success');
    App.loadModule('settings');
  },

  async _deleteBank(bankId) {
    const ok = await Utils.confirm2('Supprimer ce compte bancaire ?', 'Les transactions passées associées seront conservées pour l\'audit.');
    if (!ok) return;
    const s = DB.getSettings();
    const banks = (s.banks || []).filter(b => b.id !== bankId);
    DB.saveSettings({ banks });
    Utils.notify('Compte bancaire supprimé', 'info');
    App.loadModule('settings');
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

  _tabEtatVente(s) {
    const isAR = T.isRTL();
    const sectionBox = (icon, color, bg, title, content) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.03)">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:var(--bg3,var(--bg))">
        <div style="width:32px;height:32px;border-radius:8px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center"><i class="fas fa-${icon}"></i></div>
        <div style="font-weight:800;font-size:14px;color:var(--text)">${title}</div>
      </div>
      <div style="padding:18px">${content}</div>
    </div>`;

    const field = (id, label, val, attrs='', icon='') => `
      <div class="form-group"><label style="font-size:11px;font-weight:700;color:var(--text3)">${icon?`<i class="fas ${icon}" style="margin-right:6px"></i>`:''}${label}</label><input id="${id}" value="${Utils.escHTML(val||'')}" ${attrs}></div>`;

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
    <div style="background:linear-gradient(135deg,rgba(13,148,136,.1),rgba(20,184,166,.05));border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid rgba(13,148,136,.2)">
      <div style="font-weight:800;color:#0f766e;margin-bottom:4px"><i class="fas fa-info-circle"></i> Entête de l'État de Vente</div>
      <div style="font-size:12px;color:var(--text3)">Ces informations seront utilisées exclusivement pour générer l'entête du document d'État de Vente.</div>
    </div>

    ${sectionBox('building','#0d9488','rgba(13,148,136,.1)',isAR?'هوية الشركة':'Identité de la société (État de Vente)',`
      <div style="display:grid;grid-template-columns:1fr;gap:0">
        ${field('evCompName', isAR?'اسم الشركة':'Raison sociale', s.evCompanyName, 'style="font-size:16px;font-weight:800" placeholder="SPA ..."', 'fa-building')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('evPhone', isAR?'الهاتف':'Téléphone', s.evPhone, 'type="tel"', 'fa-phone')}
          ${field('evFax', isAR?'الفاكس':'Fax', s.evFax, 'type="tel"', 'fa-fax')}
        </div>
        ${field('evEmail', isAR?'البريد الإلكتروني':'Email', s.evEmail, 'type="email"', 'fa-envelope')}
        ${field('evAddr', isAR?'العنوان':'Adresse', s.evAddress, 'placeholder="Wilaya, Commune..."', 'fa-map-marker-alt')}
      </div>
    `)}

    ${sectionBox('id-card','#0ea5e9','rgba(14,165,233,.1)',isAR?'المعرفات الجبائية':'Identifiants fiscaux',`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">NIF</div>
          <input id="evNif" value="${Utils.escHTML(s.evNif||'')}" placeholder="000000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">NIS</div>
          <input id="evNis" value="${Utils.escHTML(s.evNis||'')}" placeholder="000000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">RC</div>
          <input id="evRc" value="${Utils.escHTML(s.evRc||'')}" placeholder="00/00-XXXXXXX" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">AI (Art. Imposition)</div>
          <input id="evAi" value="${Utils.escHTML(s.evAi||'')}" placeholder="00000000000000" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text4);margin-bottom:5px">Capital social</div>
          <input id="evCapital" value="${Utils.escHTML(s.evCapital||'')}" placeholder="Ex: 1 000 000 DA" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);width:100%" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
      </div>
    `)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      ${logoBox('evLogoLeft', isAR?'شعار يساري (Etat Vente)':'Logo gauche (EV)', s.evLogoLeft)}
      ${logoBox('evLogoRight', isAR?'شعار يميني (Etat Vente)':'Logo droit (EV)', s.evLogoRight)}
    </div>

    <button class="btn btn-primary" onclick="SettingsModule._saveEtatVente()" style="width:100%;padding:12px;font-size:14px;font-weight:800;border-radius:12px;background:linear-gradient(135deg,#0d9488,#14b8a6)">
      <i class="fas fa-save"></i> Enregistrer les paramètres de l'État de Vente
    </button>`;
  },

  _saveEtatVente() {
    DB.saveSettings({
      evCompanyName: document.getElementById('evCompName')?.value||'',
      evAddress: document.getElementById('evAddr')?.value||'',
      evPhone: document.getElementById('evPhone')?.value||'',
      evFax: document.getElementById('evFax')?.value||'',
      evEmail: document.getElementById('evEmail')?.value||'',
      evNif: document.getElementById('evNif')?.value||'',
      evRc: document.getElementById('evRc')?.value||'',
      evNis: document.getElementById('evNis')?.value||'',
      evAi: document.getElementById('evAi')?.value||'',
      evCapital: document.getElementById('evCapital')?.value||'',
    });
    Utils.notify('Paramètres de l\'État de Vente enregistrés', 'success');
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
        // console.log('[timbreSlabs] saved to DB:', r?.count, 'slabs');
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

  async _exportData() {
    try {
      const data = DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Utils.notify('✅ Données exportées avec succès', 'success');
    } catch(e) {
      Utils.notify('❌ Erreur: ' + e.message, 'error');
    }
  },

  async _importData() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput?.files?.length) { Utils.notify('Sélectionnez un fichier JSON d\'abord', 'warning'); return; }
    try {
      const text = await fileInput.files[0].text();
      const data = JSON.parse(text);
      DB.importAll(data);
      Utils.notify('✅ Données importées avec succès. Rechargement...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch(e) {
      Utils.notify('❌ Erreur d\'import: ' + e.message, 'error');
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
      // console.log('[RESET] Sending reset request...');

      const result = await window.API._req('POST', '/admin/reset-all', { confirm: 'RESET_TOUT', password });
      // console.log('[RESET] Server response:', result);

      // Handle null (401/token expired)
      if (!result) {
        Utils.notify('❌ Session expirée — reconnectez-vous et réessayez', 'error');
        return;
      }

      if (result.success) {
        // console.log('[RESET] Success — clearing all localStorage...');
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
    // Brain recalibrates immediately after restore
    DB.MasterBrain.recalibrateAll();
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
    } else if (typeof CSVExport !== 'undefined') {
      const headers = [isAR?'التاريخ':'Date', isAR?'المستخدم':'Utilisateur', isAR?'الإجراء':'Action', isAR?'القسم':'Section', isAR?'المعرف':'ID', isAR?'التفاصيل':'Détails'];
      CSVExport.download(headers, rows, 'Historique_Global_' + new Date().toISOString().slice(0,10));
    } else {
      Utils.notify('Export non disponible', 'warning');
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
    const settings = DB.getSettings();
    const bank = (settings.banks || []).find(b => b.id === bankId);
    const initBal = Number(bank?.initialBalance) || 0;
    const txs = DB.getAll('bank_transactions').filter(t => t.bankId === bankId);
    const dep = txs.filter(t => t.type === 'deposit').reduce((s,t) => s+(t.amount||0), 0);
    const out = txs.filter(t => t.type === 'payment').reduce((s,t) => s+(t.amount||0), 0);
    return { balance: initBal + dep - out, totalIn: dep, totalOut: out, txCount: txs.length, initialBalance: initBal };
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
      <button class="btn" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;gap:6px" onclick="BankModule.showExtraitModal()"><i class="fas fa-file-invoice"></i> Extrait de Compte</button>
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
          <button class="btn btn-xs" style="flex:1;background:rgba(2,132,199,.1);color:#0284c7;border:1px solid rgba(2,132,199,.2)" onclick="event.stopPropagation();BankModule.showExtraitModal('${b.id}')"><i class="fas fa-file-invoice"></i> Extrait</button>
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
      message: `<div style="margin-bottom:14px;padding:10px 14px;background:var(--bg3);border-radius:10px;border-left:3px solid #10b981;font-size:12px;color:var(--text2);border:1px solid var(--border)">Dépôt direct sur le compte bancaire (hors caisse — ex: dépôt personnel, crédit bancaire)</div><div class="form-group"><label>Compte bancaire</label><select id="dep_bank">${opts}</select></div><div class="form-group"><label>Montant (DA)</label><input type="number" id="dep_amt" placeholder="0" style="font-size:22px;font-weight:800;text-align:center" min="0"></div><div class="form-group"><label>Date</label><input type="date" id="dep_date" value="${Utils.today()}"></div><div class="form-group"><label>Note / Référence</label><input type="text" id="dep_note" placeholder="Dépôt bordereau n°..."></div>`,
      type: 'info', confirmText: '✅ Enregistrer le dépôt', cancelText: 'Annuler'
    });
    if (!r) return;
    const bankId = document.getElementById('dep_bank')?.value;
    const amount = parseFloat(document.getElementById('dep_amt')?.value||0);
    const date   = document.getElementById('dep_date')?.value || Utils.today();
    const note   = document.getElementById('dep_note')?.value || '';
    if (!amount || amount <= 0) { Utils.notify('Montant invalide','warning'); return; }
    const bank = (DB.getSettings().banks||[]).find(b=>b.id===bankId);
    const conf = await Utils.confirm2(
      'Confirmer le dépôt bancaire externe ?',
      `Compte bancaire : ${bank?.name || 'Banque'}\nMontant : ${Utils.fmtCurrency(amount)}\nDate : ${date}\nNote : ${note || '—'}`
    );
    if (!conf) return;
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
      message: `<div style="margin-bottom:14px;padding:10px 14px;background:var(--bg3);border-radius:10px;border-left:3px solid #3b82f6;font-size:12px;color:var(--text2);border:1px solid var(--border)">Solde caisse disponible : <strong style="color:var(--text)">${Utils.fmtCurrency(cBal)}</strong></div><div class="form-group"><label>Compte bancaire destinataire</label><select id="dlg_bank">${opts}</select></div><div class="form-group"><label>Montant (DA)</label><input type="number" id="dlg_amount" placeholder="0" style="font-size:22px;font-weight:800;text-align:center" min="0" max="${cBal}"></div><div class="form-group"><label>Date</label><input type="date" id="dlg_date" value="${Utils.today()}"></div><div class="form-group"><label>Note</label><input type="text" id="dlg_note" placeholder="Virement mensuel..."></div>`,
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
    const conf = await Utils.confirm2(
      'Confirmer le virement Caisse → Banque ?',
      `De : Caisse Principale\nVers : ${bank?.name || 'Banque'}\nMontant : ${Utils.fmtCurrency(amount)}\nDate : ${date}`
    );
    if (!conf) return;
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
<div class="form-group mb-2"><label style="font-weight:700">Fournisseur</label><select id="pay_sup" class="input" onchange="BankModule._onSupChange();BankModule._validatePayAmt()" style="width:100%">${supOpts}</select></div>

<!-- Supplier info panel -->
<div id="pay_sup_info" style="margin-bottom:14px;padding:12px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);font-size:12px;color:var(--text2)">Chargement...</div>

<div class="form-group mb-2"><label style="font-weight:700">Source du paiement</label><select id="pay_source" class="input" onchange="BankModule._onSourceChange();BankModule._validatePayAmt()" style="width:100%"><option value="bank">🏦 Banque</option><option value="caisse">💵 Caisse (espèces)</option></select></div>

<div id="pay_bank_row" class="form-group mb-2"><label style="font-weight:700">Compte bancaire</label><select id="pay_bank" class="input" onchange="BankModule._onSourceChange();BankModule._validatePayAmt()" style="width:100%">${bankOpts||'<option value="">Aucun compte</option>'}</select></div>

<!-- Available balance bar -->
<div id="pay_bal_info" style="margin-bottom:14px;padding:10px 14px;background:var(--bg3);border-radius:10px;border-left:4px solid #3b82f6;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
  <span style="font-size:12px;color:var(--text3)">💰 Solde disponible :</span>
  <strong id="pay_avail_lbl" style="font-size:16px;color:#10b981">—</strong>
</div>

<div class="form-group mb-2"><label style="font-weight:700">Montant à payer (DA)</label><input type="number" id="pay_amt" class="input" placeholder="0" oninput="BankModule._validatePayAmt()" style="font-size:22px;font-weight:800;text-align:center;width:100%" min="0" step="1"></div>

<!-- Live validation / preview panel -->
<div id="pay_validation" style="margin-bottom:10px;padding:10px 14px;border-radius:10px;font-size:12px;display:none"></div>

<!-- After-payment preview -->
<div id="pay_preview" style="margin-bottom:14px;padding:12px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);display:none">
  <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:var(--text4);margin-bottom:8px">📊 APERÇU APRÈS PAIEMENT</div>
  <div id="pay_preview_content" style="font-size:12px;color:var(--text2)"></div>
</div>

<div class="form-group mb-2"><label style="font-weight:700">Date</label><input type="date" id="pay_date" class="input" value="${Utils.today()}" style="width:100%"></div>
<div class="form-group mb-2"><label style="font-weight:700">Note / Référence</label><input type="text" id="pay_note" class="input" placeholder="Paiement BR n°..." style="width:100%"></div>`,
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
    const targetBank = bankId ? (DB.getSettings().banks||[]).find(b=>b.id===bankId) : null;
    const conf = await Utils.confirm2(
      'Confirmer le règlement fournisseur ?',
      `Fournisseur : ${sup?.name || 'Fournisseur'}\nMontant : ${Utils.fmtCurrency(amount)}\nSource : ${source==='bank' ? ('Banque ' + (targetBank?.name || '')) : 'Caisse Principale (Espèces)'}\nDate : ${date}`
    );
    if (!conf) return;

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

      // Auto-fee for bank withdrawal
      const settings = DB.getSettings();
      const bFees = settings.bankFees?.[bankId];
      if (bFees && bFees.withdrawalFee > 0) {
        const feeAmt = Number(bFees.withdrawalFee);
        const txFee = {
          id: 'tx_' + Date.now() + Math.random().toString(36).substr(2,5),
          bankId: bankId,
          type: 'payment',
          amount: feeAmt,
          date: date,
          note: `FRAIS RETRAIT: ${ref}`,
          userId: u?.id,
          createdAt: new Date().toISOString()
        };
        DB.insert('bank_transactions', txFee);
        
        const charge = {
          id: 'chg_' + Date.now() + Math.random().toString(36).substr(2,5),
          type: 'auto',
          subtype: 'withdrawal_fee',
          bankId: bankId,
          amount: feeAmt,
          label: `Frais de retrait - ${ref}`,
          date: date,
          linkedTxId: txFee.id,
          linkedRef: ref,
          recurring: false,
          createdBy: u?.id,
          createdByName: u?.name,
          createdAt: new Date().toISOString()
        };
        DB.insert('bank_charges', charge);
      }
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
    const conf = await Utils.confirm2(
      'Confirmer la correction de la transaction ?',
      `Réf : ${tx.ref || tx.id}\nAncien montant : ${Utils.fmtCurrency(tx.amount)}\nNouveau montant : ${Utils.fmtCurrency(newAmt)}\nMotif : ${cn || 'Correction'}`
    );
    if (!conf) return;

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

  showExtraitModal(bankId = null) {
    const banks = DB.getSettings().banks || [];
    if (!banks.length) { Utils.notify('Configurez un compte bancaire d\'abord','warning'); return; }
    
    const bankOpts = banks.map(b=>`<option value="${b.id}" ${b.id===bankId?'selected':''}>${Utils.escHTML(b.name)}</option>`).join('');
    
    // Default to first day of current month to today
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const today = Utils.today();
    
    const html = `
      <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center;background:var(--bg2);padding:10px;border-radius:8px">
        <select id="ex_bank_id" class="input" style="flex:1">${bankOpts}</select>
        <input type="date" id="ex_date_from" class="input" value="${firstDay}">
        <input type="date" id="ex_date_to" class="input" value="${today}">
        <button class="btn btn-primary" onclick="BankModule._updateExtraitPreview()"><i class="fas fa-sync"></i> Filtrer</button>
      </div>
      <div id="ex_preview_content" style="min-height:300px;background:#fff;padding:20px;border:1px solid #ddd;border-radius:4px;color:#000;font-family:Arial,sans-serif">
        <div style="text-align:center;color:#666;margin-top:40px"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>
      </div>
    `;

    Dialog.show({
      title: 'Extrait de Compte',
      message: html,
      type: 'info',
      confirmText: '🖨️ Imprimer',
      cancelText: 'Fermer',
      width: '800px'
    }).then(ok => {
      if (ok) {
        const content = document.getElementById('ex_preview_content').innerHTML;
        const w = window.open('','_blank');
        w.document.write(`<html><head><title>Extrait de Compte</title><style>table{width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;}th,td{border:1px solid #000;padding:6px;text-align:left;}th{background:#eee;} .text-right{text-align:right;} h2,h3{text-align:center;margin:5px 0;} @media print { @page { size: A4 portrait; margin: 15mm; } body { -webkit-print-color-adjust: exact; } button { display: none; } }</style></head><body onload="window.print()">` + content + '</body></html>');
        w.document.close();
      }
    });

    setTimeout(() => this._updateExtraitPreview(), 100);
  },

  _updateExtraitPreview() {
    const bankId = document.getElementById('ex_bank_id')?.value;
    const dateFrom = document.getElementById('ex_date_from')?.value;
    const dateTo = document.getElementById('ex_date_to')?.value;
    const el = document.getElementById('ex_preview_content');
    if (!el || !bankId) return;

    const bank = (DB.getSettings().banks || []).find(b=>b.id===bankId);
    let txs = DB.getAll('bank_transactions').filter(t => t.bankId === bankId);
    
    // Sort chronological
    txs.sort((a,b) => (a.date||'').localeCompare(b.date||'') || a.id - b.id);
    
    // Calculate solde initial (before dateFrom)
    let soldeInitial = 0;
    const txsInPeriod = [];
    
    for (const t of txs) {
      const isDeposit = t.type === 'deposit';
      const amt = t.amount || 0;
      
      if (dateFrom && (t.date||'') < dateFrom) {
        soldeInitial += isDeposit ? amt : -amt;
      } else if (!dateTo || (t.date||'') <= dateTo) {
        txsInPeriod.push(t);
      }
    }

    let currentSolde = soldeInitial;
    let html = `
      <h2>EXTRAIT DE COMPTE</h2>
      <h3>${Utils.escHTML(bank?.name || '')} - ${Utils.escHTML(bank?.accountNum || '')}</h3>
      <div style="margin-bottom:15px;font-size:12px">Période du <strong>${dateFrom}</strong> au <strong>${dateTo}</strong></div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Réf / Pièce</th>
            <th class="text-right">Débit</th>
            <th class="text-right">Crédit</th>
            <th class="text-right">Solde</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3"><strong>SOLDE INITIAL</strong></td>
            <td></td>
            <td></td>
            <td class="text-right"><strong>${Utils.fmtCurrency(soldeInitial)}</strong></td>
          </tr>
    `;

    for (const t of txsInPeriod) {
      const isDeposit = t.type === 'deposit';
      const amt = t.amount || 0;
      currentSolde += isDeposit ? amt : -amt;
      
      const debit = !isDeposit ? Utils.fmtCurrency(amt) : '';
      const credit = isDeposit ? Utils.fmtCurrency(amt) : '';
      
      html += `
        <tr>
          <td>${Utils.escHTML(t.date || '')}</td>
          <td>${Utils.escHTML(t.note || t.subtype || '')}</td>
          <td>${Utils.escHTML(t.ref || '')}</td>
          <td class="text-right" style="color:red">${debit}</td>
          <td class="text-right" style="color:green">${credit}</td>
          <td class="text-right"><strong>${Utils.fmtCurrency(currentSolde)}</strong></td>
        </tr>
      `;
    }

    html += `
          <tr>
            <td colspan="3"><strong>SOLDE FINAL</strong></td>
            <td></td>
            <td></td>
            <td class="text-right"><strong>${Utils.fmtCurrency(currentSolde)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
    
    el.innerHTML = html;
  }
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
// ETAT DE VENTE MODULE
// ═══════════════════════════════════════════════════════════════
const EtatVenteModule = {
  _view: 'generate', // 'generate' or 'history'
  _dateStart: null,
  _dateEnd: null,
  _userFilter: 'all',

  _getDateStart() { return this._dateStart || (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0]); },
  _getDateEnd() { return this._dateEnd || (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0]); },
  
  render() {
    const isAR = T.isRTL();
    return `
    <div style="padding:24px 28px;max-width:1300px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:14px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0d9488,#14b8a6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(13,148,136,.3)">
            <i class="fas fa-file-invoice-dollar"></i>
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">${T.get('nav_etat_vente') || 'État de Vente'}</h2>
            <div style="font-size:13px;color:var(--text4);margin-top:2px">Bilan officiel des livraisons, retours marchandise déduits et dépôts bancaires</div>
          </div>
        </div>
        
        <div style="display:flex;background:var(--bg2);padding:4px;border-radius:10px;border:1px solid var(--border)">
          <button class="btn" style="border:none;background:${this._view==='generate'?'var(--primary)':'transparent'};color:${this._view==='generate'?'#fff':'var(--text)'};border-radius:8px;padding:6px 16px;font-weight:600;font-size:13px" onclick="EtatVenteModule._setView('generate')">
            <i class="fas fa-plus-circle" style="margin-right:6px"></i> Générer
          </button>
          <button class="btn" style="border:none;background:${this._view==='history'?'var(--primary)':'transparent'};color:${this._view==='history'?'#fff':'var(--text)'};border-radius:8px;padding:6px 16px;font-weight:600;font-size:13px" onclick="EtatVenteModule._setView('history')">
            <i class="fas fa-history" style="margin-right:6px"></i> Historique
          </button>
        </div>
      </div>
      
      <div id="evContainer">
        ${this._view === 'generate' ? this._renderGenerateView() : this._renderHistoryView()}
      </div>
    </div>
    `;
  },

  _setView(v) {
    this._view = v;
    App.loadModule('etat_vente');
  },
  
  _updateDates() {
    this._dateStart = document.getElementById('evDateStart')?.value || this._getDateStart();
    this._dateEnd = document.getElementById('evDateEnd')?.value || this._getDateEnd();
    this._userFilter = document.getElementById('evUserFilter')?.value || 'all';
    const container = document.getElementById('evContainer');
    if (container) {
       container.innerHTML = this._view === 'generate' ? this._renderGenerateView() : this._renderHistoryView();
    }
  },
  
  _setToday() {
    const today = typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0];
    this._dateStart = today;
    this._dateEnd = today;
    this._userFilter = 'all';
    App.loadModule('etat_vente');
  },

  _getFilteredData() {
    const ds = this._getDateStart();
    const de = this._getDateEnd();
    const uf = this._userFilter;

    // Filter BLs (Delivered or locked, excluding returned)
    const allBLs = DB.getAll('bls');
    const bls = allBLs.filter(b => {
      const bDate = (b.date || b.createdAt || '').slice(0, 10);
      if (bDate < ds || bDate > de) return false;
      // Only include delivered or locked BLs — not pending, validated, or returned
      if (b.status !== 'delivered' && b.status !== 'locked') return false;
      if (uf !== 'all' && String(b.createdBy) !== String(uf)) return false;
      return true;
    });

    // Filter Bons de Retour in that period
    const allRetours = DB.getAll('bon_retours');
    const retours = allRetours.filter(r => {
      const rDate = (r.date || r.createdAt || '').slice(0, 10);
      if (rDate < ds || rDate > de) return false;
      if (uf !== 'all' && String(r.userId || r.createdBy) !== String(uf)) return false;
      return true;
    });

    // Aggregated product lines from BLs
    const aggregated = {};
    bls.forEach(bl => {
      const lines = bl.lines || [];
      lines.forEach(line => {
        const key = (line.designation || '').trim();
        if (!key) return;
        const qty = Number(line.qtyDelivered || line.qty) || 0;
        const price = Number(line.price) || 0;
        const disc = Number(line.disc) || 0;
        const effectivePrice = price * (1 - disc / 100);
        if (!aggregated[key]) {
          aggregated[key] = {
            designation: key,
            unit: line.unit || 'U',
            qty: 0,
            unitPrice: effectivePrice
          };
        }
        aggregated[key].qty += qty;
        if (effectivePrice > aggregated[key].unitPrice) {
          aggregated[key].unitPrice = effectivePrice;
        }
      });
    });

    const items = Object.values(aggregated).sort((a, b) => a.designation.localeCompare(b.designation));

    const grossTotalTTC = bls.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);
    const returnsTotalTTC = retours.reduce((sum, r) => sum + (Number(r.totalTTC) || 0), 0);
    const netTotalTTC = Math.max(0, Math.round((grossTotalTTC - returnsTotalTTC) * 100) / 100);

    return { bls, retours, items, grossTotalTTC, returnsTotalTTC, netTotalTTC };
  },
  
  _renderGenerateView() {
    const { bls, retours, items, grossTotalTTC, returnsTotalTTC, netTotalTTC } = this._getFilteredData();
    const settings = DB.getSettings();
    const tvaRate = Number(settings.tvaRate) || 19;
    const allUsers = DB.getAll('users');

    let totalHT = 0;
    items.forEach(item => { totalHT += item.qty * item.unitPrice; });
    const tvaAmt = totalHT * (tvaRate / 100);
    const timbreAmt = DB.calcTimbre(totalHT);

    let html = `
    <!-- Filter bar -->
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;gap:12px;align-items:center;flex-wrap:wrap;background:var(--bg2);padding:14px 18px;border-radius:12px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);padding:6px 12px;border-radius:8px;border:1px solid var(--border)">
          <span style="font-size:11px;color:var(--text4);font-weight:700">Du</span>
          <input type="date" id="evDateStart" value="${this._getDateStart()}" style="border:none;background:transparent;outline:none;font-weight:700;color:var(--text);font-size:12px" onchange="EtatVenteModule._updateDates()">
          <span style="font-size:11px;color:var(--text4);font-weight:700">Au</span>
          <input type="date" id="evDateEnd" value="${this._getDateEnd()}" style="border:none;background:transparent;outline:none;font-weight:700;color:var(--text);font-size:12px" onchange="EtatVenteModule._updateDates()">
        </div>
        <select id="evUserFilter" onchange="EtatVenteModule._updateDates()" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg3);color:var(--text);font-weight:600">
          <option value="all">Tous les caissiers / vendeurs</option>
          ${allUsers.map(u => `<option value="${u.id}" ${this._userFilter === String(u.id) ? 'selected' : ''}>${Utils.escHTML(u.name || u.username)}</option>`).join('')}
        </select>
        <button class="btn btn-outline" onclick="EtatVenteModule._setToday()" style="font-size:12px;padding:7px 14px;font-weight:700;border-radius:8px">
          <i class="fas fa-calendar-day"></i> Aujourd'hui
        </button>
      </div>

      <div>
        <button class="btn btn-primary" onclick="EtatVenteModule._saveAndGenerate()" style="background:linear-gradient(135deg,#0d9488,#14b8a6);border:none;box-shadow:0 4px 14px rgba(13,148,136,.35);padding:9px 18px;font-size:13px;font-weight:700">
          <i class="fas fa-file-invoice-dollar" style="margin-right:6px"></i> Générer État & Verser en Banque
        </button>
      </div>
    </div>

    <!-- Summary KPI cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#0ea5e9;margin-bottom:4px">Bons de Livraison Inclus</div>
        <div style="font-size:24px;font-weight:900;color:#0ea5e9">${bls.length} BL</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--success);margin-bottom:4px">Total Brut Ventes (+)</div>
        <div style="font-size:20px;font-weight:900;color:var(--success)">+${Utils.fmtCurrency(grossTotalTTC)}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--danger);margin-bottom:4px">Retours Déduits (−)</div>
        <div style="font-size:20px;font-weight:900;color:var(--danger)">-${Utils.fmtCurrency(returnsTotalTTC)} <span style="font-size:12px;font-weight:600;color:var(--text4)">(${retours.length} BR)</span></div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(13,148,136,.12),rgba(20,184,166,.05));border:1px solid rgba(13,148,136,.25);border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#0d9488;margin-bottom:4px">Net à Déposer en Banque</div>
        <div style="font-size:22px;font-weight:900;color:#0d9488">${Utils.fmtCurrency(netTotalTTC)}</div>
      </div>
    </div>

    <!-- Section 1: Aggregated Products Table -->
    <div style="background:var(--bg2);border-radius:14px;border:1px solid var(--border);overflow:hidden;margin-bottom:24px;box-shadow:0 4px 15px rgba(0,0,0,.02)">
      <div style="padding:14px 20px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <strong style="color:var(--text);font-size:14px"><i class="fas fa-boxes" style="color:var(--primary);margin-right:8px"></i> I. Récapitulatif Cumulé des Articles Vendus (${items.length} références)</strong>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
              <th style="padding:10px 16px;text-align:left;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px;width:50px">N°</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Désignation</th>
              <th style="padding:10px 16px;text-align:center;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px;width:100px">Unité</th>
              <th style="padding:10px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px;width:120px">Qté</th>
              <th style="padding:10px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px;width:150px">P.U HT</th>
              <th style="padding:10px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px;width:150px">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${items.length ? items.map((item, idx) => `
            <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
              <td style="padding:10px 16px;color:var(--text4);font-weight:600">${idx+1}</td>
              <td style="padding:10px 16px;font-weight:700;color:var(--text)">${Utils.escHTML(item.designation)}</td>
              <td style="padding:10px 16px;text-align:center;color:var(--text3)">${Utils.escHTML(item.unit)}</td>
              <td style="padding:10px 16px;text-align:right;font-weight:700;color:#0ea5e9">${Number(item.qty).toLocaleString('fr-FR')}</td>
              <td style="padding:10px 16px;text-align:right;color:var(--text2)">${Utils.fmtCurrency(item.unitPrice)}</td>
              <td style="padding:10px 16px;text-align:right;font-weight:800;color:var(--text)">${Utils.fmtCurrency(item.qty * item.unitPrice)}</td>
            </tr>`).join('') : `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text4)">Aucun article vendu pour cette période</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 2: Bottom Table 1 - Bons de Livraison inclus -->
    <div style="background:var(--bg2);border-radius:14px;border:1px solid var(--border);overflow:hidden;margin-bottom:24px;box-shadow:0 4px 15px rgba(0,0,0,.02)">
      <div style="padding:14px 20px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <strong style="color:var(--text);font-size:14px"><i class="fas fa-truck" style="color:#0ea5e9;margin-right:8px"></i> II. Bons de Livraison Inclus dans l'État (${bls.length} BLs)</strong>
        <span style="font-weight:800;color:var(--success);font-size:14px">Total Brut : +${Utils.fmtCurrency(grossTotalTTC)}</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px;width:50px">N°</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Réf BL</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Date</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Caissier / Vendeur</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Client</th>
              <th style="padding:10px 16px;text-align:right;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            ${bls.length ? bls.map((b, idx) => {
              const u = allUsers.find(x => x.id === b.createdBy);
              return `<tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
                <td style="padding:9px 16px;color:var(--text4);font-weight:600">${idx+1}</td>
                <td style="padding:9px 16px;font-family:monospace;font-weight:700;color:var(--primary)">${Utils.escHTML(b.ref || '—')}</td>
                <td style="padding:9px 16px;color:var(--text2)">${Utils.fmtDate(b.date)}</td>
                <td style="padding:9px 16px;color:var(--text)">${Utils.escHTML(u?.name || '—')}</td>
                <td style="padding:9px 16px;color:var(--text2)">${Utils.escHTML(b.clientName || 'Client Comptoir')}</td>
                <td style="padding:9px 16px;text-align:right;font-weight:800;color:var(--success)">+${Utils.fmtCurrency(b.totalTTC || 0)}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text4)">Aucun bon de livraison pour cette sélection</td></tr>`}
          </tbody>
          ${bls.length ? `
          <tfoot>
            <tr style="background:var(--bg3);font-weight:900;border-top:2px solid var(--border)">
              <td colspan="5" style="padding:12px 16px;text-align:right;text-transform:uppercase;font-size:11px;color:var(--text2)">TOTAL BRUT DES VENTES BL :</td>
              <td style="padding:12px 16px;text-align:right;font-size:14px;color:var(--success)">+${Utils.fmtCurrency(grossTotalTTC)}</td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
    </div>

    <!-- Section 3: Bottom Table 2 - Retours Marchandise déduits -->
    <div style="background:var(--bg2);border-radius:14px;border:1px solid var(--border);overflow:hidden;margin-bottom:24px;box-shadow:0 4px 15px rgba(0,0,0,.02)">
      <div style="padding:14px 20px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <strong style="color:var(--danger);font-size:14px"><i class="fas fa-undo" style="margin-right:8px"></i> III. Retours Marchandise Déduits de l'État (${retours.length} Bons de Retour)</strong>
        <span style="font-weight:800;color:var(--danger);font-size:14px">Total Déduit : -${Utils.fmtCurrency(returnsTotalTTC)}</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px;width:50px">N°</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Réf Bon Retour</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">BL Origine</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Date</th>
              <th style="padding:10px 16px;text-align:left;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Client & Motif</th>
              <th style="padding:10px 16px;text-align:right;color:var(--text4);font-weight:700;text-transform:uppercase;font-size:10px">Déduction TTC</th>
            </tr>
          </thead>
          <tbody>
            ${retours.length ? retours.map((r, idx) => `
            <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
              <td style="padding:9px 16px;color:var(--text4);font-weight:600">${idx+1}</td>
              <td style="padding:9px 16px;font-family:monospace;font-weight:700;color:var(--danger)">${Utils.escHTML(r.ref || '—')}</td>
              <td style="padding:9px 16px;font-family:monospace;color:var(--text2)">${Utils.escHTML(r.blRef || '—')}</td>
              <td style="padding:9px 16px;color:var(--text2)">${Utils.fmtDate(r.date)}</td>
              <td style="padding:9px 16px;color:var(--text)">
                <div>${Utils.escHTML(r.clientName || 'Client')}</div>
                ${r.motif ? `<div style="font-size:10px;color:var(--danger)">Motif: ${Utils.escHTML(r.motif)}</div>` : ''}
              </td>
              <td style="padding:9px 16px;text-align:right;font-weight:900;color:var(--danger)">-${Utils.fmtCurrency(r.totalTTC || 0)}</td>
            </tr>`).join('') : `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text4)"><i class="fas fa-check-circle" style="color:var(--success);margin-right:6px"></i> Aucun retour de marchandise pour cette période (Déduction: 0 DA)</td></tr>`}
          </tbody>
          ${retours.length ? `
          <tfoot>
            <tr style="background:var(--bg3);font-weight:900;border-top:2px solid var(--border)">
              <td colspan="5" style="padding:12px 16px;text-align:right;text-transform:uppercase;font-size:11px;color:var(--text2)">TOTAL DÉDUCTIONS RETOURS :</td>
              <td style="padding:12px 16px;text-align:right;font-size:14px;color:var(--danger)">-${Utils.fmtCurrency(returnsTotalTTC)}</td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
    </div>

    <!-- Section 4: Final Recap & Bank Transfer Confirmation -->
    <div style="background:var(--bg2);border-radius:14px;border:2px solid var(--primary);padding:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:var(--text4);margin-bottom:6px">BILAN OFFICIEL DU VERSEMENT BANCAIRE</div>
        <div style="display:flex;gap:20px;align-items:baseline;flex-wrap:wrap">
          <div>
            <span style="font-size:12px;color:var(--text3)">Ventes Brut :</span>
            <strong style="color:var(--success);font-size:14px;margin-left:4px">+${Utils.fmtCurrency(grossTotalTTC)}</strong>
          </div>
          <div>
            <span style="font-size:12px;color:var(--text3)">Retours :</span>
            <strong style="color:var(--danger);font-size:14px;margin-left:4px">-${Utils.fmtCurrency(returnsTotalTTC)}</strong>
          </div>
          <div style="border-left:2px solid var(--border);padding-left:16px">
            <span style="font-size:13px;color:var(--text);font-weight:700">NET ENCAISSÉ À VERSER :</span>
            <span style="font-size:26px;font-weight:900;color:var(--primary);margin-left:8px">${Utils.fmtCurrency(netTotalTTC)}</span>
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="EtatVenteModule._saveAndGenerate()" style="background:linear-gradient(135deg,#0d9488,#14b8a6);border:none;box-shadow:0 4px 14px rgba(13,148,136,.35);padding:12px 24px;font-size:14px;font-weight:800;border-radius:10px">
        <i class="fas fa-file-pdf" style="margin-right:8px"></i> Confirmer & Éditer le PDF
      </button>
    </div>
    `;

    return html;
  },
  
  _renderHistoryView() {
    let docs = DB.getAll('etat_vente_docs').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const isAdmin = Auth.isAdmin();
    
    let html = `
    <div style="background:var(--bg2);border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.03)">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
            <th style="padding:12px 16px;text-align:left;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Réf État</th>
            <th style="padding:12px 16px;text-align:left;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Période</th>
            <th style="padding:12px 16px;text-align:left;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Établi par</th>
            <th style="padding:12px 16px;text-align:center;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">BLs / Retours</th>
            <th style="padding:12px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Total Brut</th>
            <th style="padding:12px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Retours</th>
            <th style="padding:12px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Net TTC</th>
            <th style="padding:12px 16px;text-align:center;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Statut</th>
            <th style="padding:12px 16px;text-align:right;color:var(--text3);font-weight:700;text-transform:uppercase;font-size:11px">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (docs.length === 0) {
      html += `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text4)">Aucun état de vente archivé</td></tr>`;
    } else {
      docs.forEach(doc => {
        const periodStr = doc.dateStart === doc.dateEnd ? Utils.fmtDate(doc.dateStart) : `Du ${Utils.fmtDate(doc.dateStart)} au ${Utils.fmtDate(doc.dateEnd)}`;
        
        let stBadge = '';
        if (doc.status === 'pending_admin') {
          stBadge = `<span style="background:rgba(245,158,11,0.12);color:#f59e0b;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700"><i class="fas fa-clock"></i> En attente</span>`;
        } else if (doc.status === 'validated' || doc.status === 'deposited') {
          stBadge = `<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700"><i class="fas fa-check"></i> Validé</span>`;
        } else {
          stBadge = `<span style="background:rgba(245,158,11,0.12);color:#f59e0b;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700">Généré</span>`;
        }
        
        const nbBL = (doc.blList || []).length;
        const nbRet = (doc.returnList || []).length;
        const gross = doc.totalBLsTTC || doc.grossTotalTTC || doc.totalTTC || 0;
        const retVal = doc.totalReturnsTTC || doc.returnsTotalTTC || 0;
        const netVal = doc.totalTTC || 0;

        html += `
        <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
          <td style="padding:12px 16px;font-weight:800;color:var(--text);font-family:monospace">${Utils.escHTML(doc.ref)}</td>
          <td style="padding:12px 16px;color:var(--text2)">${periodStr}</td>
          <td style="padding:12px 16px;color:var(--text)">${Utils.escHTML(doc.createdByName || doc.userName || '—')}</td>
          <td style="padding:12px 16px;text-align:center">
            <span class="badge" style="background:rgba(14,165,233,.1);color:#0ea5e9">${nbBL} BL</span>
            ${nbRet > 0 ? `<span class="badge" style="background:rgba(239,68,68,.1);color:#ef4444;margin-left:4px">${nbRet} BR</span>` : ''}
          </td>
          <td style="padding:12px 16px;text-align:right;font-weight:700;color:var(--success)">+${Utils.fmtCurrency(gross)}</td>
          <td style="padding:12px 16px;text-align:right;font-weight:700;color:var(--danger)">${retVal > 0 ? '-' + Utils.fmtCurrency(retVal) : '—'}</td>
          <td style="padding:12px 16px;text-align:right;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(netVal)}</td>
          <td style="padding:12px 16px;text-align:center">${stBadge}</td>
          <td style="padding:12px 16px;text-align:right;white-space:nowrap">`;
          
          if (doc.status === 'pending_admin' && isAdmin) {
            html += `<button class="btn btn-xs btn-outline" onclick="EtatVenteModule._adminValidate('${doc.id}')" title="Valider" style="margin-right:4px;color:var(--success)"><i class="fas fa-check"></i> Valider</button>`;
            html += `<button class="btn btn-xs btn-outline" onclick="EtatVenteModule._adminEdit('${doc.id}')" title="Modifier" style="margin-right:4px;color:var(--primary)"><i class="fas fa-edit"></i> Modifier</button>`;
          }
          
          html += `
            <button class="btn btn-xs btn-outline" onclick="EtatVenteModule._reprint('${doc.id}')" title="Imprimer / Télécharger PDF">
              <i class="fas fa-file-pdf" style="color:var(--primary)"></i> PDF
            </button>
          </td>
        </tr>`;
      });
    }
    
    html += `</tbody></table></div>`;
    return html;
  },

  async _adminValidate(docId) {
    const doc = DB.getById('etat_vente_docs', docId);
    if (!doc) return;
    // Guard: prevent double-validation (duplicate bank deposit)
    if (doc.status === 'validated') {
      Utils.notify('Cet état de vente a déjà été validé.', 'warning');
      return;
    }
    const gross = doc.grossTotalTTC || doc.totalBLsTTC || doc.totalTTC || 0;
    const ret = doc.returnsTotalTTC || doc.totalReturnsTTC || 0;
    const net = doc.netTotalTTC || doc.totalTTC || 0;
    
    const res = await Dialog.show({
      title: 'Valider l\'État de Vente',
      message: `
        <div style="text-align:left">
          <p>Veuillez confirmer les montants avant de valider et de verser en banque :</p>
          <div style="margin-top:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Total Brut Ventes TTC</label>
            <input type="number" step="0.01" id="v_gross" class="input" value="${gross}" style="width:100%;margin-bottom:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Retours TTC</label>
            <input type="number" step="0.01" id="v_ret" class="input" value="${ret}" style="width:100%;margin-bottom:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Net à verser</label>
            <input type="number" step="0.01" id="v_net" class="input" value="${net}" style="width:100%">
          </div>
        </div>
      `,
      type: 'info',
      confirmText: 'Valider et Verser',
      cancelText: 'Annuler'
    });
    
    if (!res) return;
    
    const nGross = Number(document.getElementById('v_gross')?.value) || 0;
    const nRet = Number(document.getElementById('v_ret')?.value) || 0;
    const nNet = Number(document.getElementById('v_net')?.value) || 0;
    
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    let selectedBankId = doc.bankId || (banks.length > 0 ? banks[0].id : null);
    
    await DB.update('etat_vente_docs', doc.id, {
      grossTotalTTC: nGross,
      totalBLsTTC: nGross,
      returnsTotalTTC: nRet,
      totalReturnsTTC: nRet,
      netTotalTTC: nNet,
      totalTTC: nNet,
      status: 'validated'
    });
    
    const now = new Date();
    const u = Auth.getCurrentUser();
    
    if (selectedBankId && nNet > 0) {
      const depositData = {
        type: 'deposit',
        subtype: 'etat_vente',
        bankId: selectedBankId,
        amount: nNet,
        date: doc.dateEnd || doc.date || now.toISOString().split('T')[0],
        ref: 'EV-DEP-' + (doc.ref || '').replace(/\//g, '-'),
        note: `Dépôt État de Vente ${doc.ref} (Validé par Admin)`,
        etatVenteId: doc.id,
        etatVenteRef: doc.ref,
        createdBy: u?.id,
        createdByName: u?.name,
        createdAt: now.toISOString()
      };
      const savedDeposit = await DB.insert('bank_transactions', depositData);
      await DB.update('etat_vente_docs', doc.id, { bankDepositId: savedDeposit.id });
      Utils.notify(`État validé. Dépôt de ${Utils.fmtCurrency(nNet)} enregistré.`, 'success', 5000);
    } else {
      Utils.notify('État validé sans dépôt bancaire.', 'success');
    }
    
    App.loadModule('etat_vente');
  },

  async _adminEdit(docId) {
    const doc = DB.getById('etat_vente_docs', docId);
    if (!doc) return;
    const gross = doc.grossTotalTTC || doc.totalBLsTTC || doc.totalTTC || 0;
    const ret = doc.returnsTotalTTC || doc.totalReturnsTTC || 0;
    const net = doc.netTotalTTC || doc.totalTTC || 0;
    
    const res = await Dialog.show({
      title: 'Modifier l\'État de Vente',
      message: `
        <div style="text-align:left">
          <div style="margin-top:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Total Brut Ventes TTC</label>
            <input type="number" step="0.01" id="e_gross" class="input" value="${gross}" style="width:100%;margin-bottom:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Retours TTC</label>
            <input type="number" step="0.01" id="e_ret" class="input" value="${ret}" style="width:100%;margin-bottom:10px">
            <label style="display:block;margin-bottom:4px;font-weight:bold;font-size:12px">Net à verser</label>
            <input type="number" step="0.01" id="e_net" class="input" value="${net}" style="width:100%">
          </div>
        </div>
      `,
      type: 'info',
      confirmText: 'Enregistrer',
      cancelText: 'Annuler'
    });
    
    if (!res) return;
    
    const nGross = Number(document.getElementById('e_gross')?.value) || 0;
    const nRet = Number(document.getElementById('e_ret')?.value) || 0;
    const nNet = Number(document.getElementById('e_net')?.value) || 0;
    
    await DB.update('etat_vente_docs', doc.id, {
      grossTotalTTC: nGross,
      totalBLsTTC: nGross,
      returnsTotalTTC: nRet,
      totalReturnsTTC: nRet,
      netTotalTTC: nNet,
      totalTTC: nNet
    });
    
    Utils.notify('État de vente modifié avec succès.', 'success');
    App.loadModule('etat_vente');
  },

  async _saveAndGenerate() {
    const { bls, retours, items, grossTotalTTC, returnsTotalTTC, netTotalTTC } = this._getFilteredData();
    if (!bls.length && !retours.length) {
      Utils.notify('Aucun bon de livraison ni retour pour cette sélection.', 'warning');
      return;
    }
    
    const isAdmin = Auth.isAdmin();
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    let selectedBankId = null;
    
    if (banks.length > 1) {
      let optionsHtml = banks.map(b => `<option value="${b.id}">${Utils.escHTML(b.name)} (${b.bankName || 'Banque'})</option>`).join('');
      const r = await Dialog.show({
        title: 'Sélectionner la banque de dépôt',
        message: `
        <div style="padding:6px 0">
          <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Choisissez le compte bancaire vers lequel verser le montant net :</p>
          <div class="form-group"><label style="font-weight:700">Compte Bancaire</label><select id="ev_bank_select" class="input" style="width:100%">${optionsHtml}</select></div>
        </div>`,
        type: 'info',
        confirmText: 'Confirmer la banque',
        cancelText: 'Annuler'
      });
      if (!r) return;
      selectedBankId = document.getElementById('ev_bank_select')?.value;
    } else if (banks.length === 1) {
      selectedBankId = banks[0].id;
    }

    const selectedBank = banks.find(b => String(b.id) === String(selectedBankId));

    // Double confirmation to avoid miss clicks
    const confirmed = await Utils.confirm2(
      `Valider et enregistrer l'État de Vente ?`,
      `Montant Brut des BLs : +${Utils.fmtCurrency(grossTotalTTC)}\nRetours Marchandise : -${Utils.fmtCurrency(returnsTotalTTC)}\nNet Versé en Banque : ${Utils.fmtCurrency(netTotalTTC)}${selectedBank ? '\nBanque cible : ' + selectedBank.name : ''}`
    );
    if (!confirmed) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    let seqNum = DB.getAll('etat_vente_docs').filter(d => (d.ref||'').includes(`/${year}`)).length + 1;
    
    try {
      if (typeof API !== 'undefined') {
        const res = await API.get('/data/next-num/etat_vente?year=' + year);
        if (res && res.num) seqNum = res.num;
      }
    } catch(e) {
      console.error('Failed to get seqNum from API', e);
    }
    
    const ref = `ET/${String(seqNum).padStart(3, '0')}/${month}/${year}`;
    const tvaRate = Number(settings.tvaRate) || 19;
    let totalHT = 0;
    items.forEach(item => { totalHT += item.qty * item.unitPrice; });
    const tvaAmt = totalHT * (tvaRate / 100);
    const timbreAmt = DB.calcTimbre(totalHT);
    const u = Auth.getCurrentUser();
    
    const initialStatus = isAdmin ? 'validated' : 'pending_admin';
    
    const etatData = {
      ref: ref,
      year: year,
      date: this._getDateEnd(),
      dateStart: this._getDateStart(),
      dateEnd: this._getDateEnd(),
      items: items,
      blList: bls.map(b => ({ id: b.id, ref: b.ref, date: b.date, clientName: b.clientName || 'Client Comptoir', totalTTC: Number(b.totalTTC)||0, createdBy: b.createdBy })),
      returnList: retours.map(r => ({ id: r.id, ref: r.ref, blRef: r.blRef, date: r.date, clientName: r.clientName || 'Client', motif: r.motif || 'Retour marchandise', totalTTC: Number(r.totalTTC)||0, userId: r.userId })),
      totalBLsTTC: grossTotalTTC,
      grossTotalTTC: grossTotalTTC,
      totalReturnsTTC: returnsTotalTTC,
      returnsTotalTTC: returnsTotalTTC,
      netTotalTTC: netTotalTTC,
      totalHT: totalHT,
      tvaRate: tvaRate,
      tvaAmount: tvaAmt,
      timbreRate: settings.timbreRate || 0.0119,
      timbreAmount: timbreAmt,
      totalTTC: netTotalTTC,
      createdBy: u?.id,
      createdByName: u?.name || 'Utilisateur',
      createdAt: now.toISOString(),
      bankId: selectedBankId,
      bankDepositId: null,
      status: initialStatus
    };
    
    let savedDoc;
    try {
      savedDoc = await DB.insert('etat_vente_docs', etatData);
    } catch(e) {
      console.error(e);
      Utils.notify("Erreur lors de la sauvegarde de l'état de vente", 'error');
      return;
    }
    
    // Deposit into bank
    if (isAdmin && selectedBankId && netTotalTTC > 0) {
       const depositData = {
         type: 'deposit',
         subtype: 'etat_vente',
         bankId: selectedBankId,
         amount: netTotalTTC,
         date: this._getDateEnd(),
         ref: 'EV-DEP-' + ref.replace(/\//g, '-'),
         note: `Dépôt État de Vente ${ref} — ${bls.length} BLs (${Utils.fmtCurrency(grossTotalTTC)}), ${retours.length} Retours (-${Utils.fmtCurrency(returnsTotalTTC)})`,
         etatVenteId: savedDoc.id,
         etatVenteRef: ref,
         createdBy: u?.id,
         createdByName: u?.name,
         createdAt: now.toISOString()
       };
       const savedDeposit = await DB.insert('bank_transactions', depositData);
       
       await DB.update('etat_vente_docs', savedDoc.id, {
         bankDepositId: savedDeposit.id
       });
       savedDoc.bankDepositId = savedDeposit.id;
       
       Utils.notify(`✅ Dépôt de ${Utils.fmtCurrency(netTotalTTC)} vers ${selectedBank ? selectedBank.name : 'Banque'} validé.`, 'success', 5000);
    } else if (!isAdmin) {
       Utils.notify(`✅ État de vente généré avec succès. En attente de validation admin.`, 'success', 5000);
    }
    
    this._doPDF(savedDoc, settings);
    this._view = 'history';
    App.loadModule('etat_vente');
  },
  
  _reprint(id) {
    const doc = DB.getById('etat_vente_docs', id);
    if (!doc) return;
    const settings = DB.getSettings();
    this._doPDF(doc, settings);
  },

  _doPDF(doc, settings) {
    const period = doc.dateStart === doc.dateEnd ? Utils.fmtDate(doc.dateStart) : `Du ${Utils.fmtDate(doc.dateStart)} au ${Utils.fmtDate(doc.dateEnd)}`;
    const banks = settings.banks || [];
    const bank = banks.find(b => String(b.id) === String(doc.bankId));

    const data = {
      ref: doc.ref,
      createdByName: doc.createdByName || doc.userName,
      createdAt: doc.createdAt,
      items: doc.items || [],
      totalHT: doc.totalHT,
      tvaAmt: doc.tvaAmount,
      tvaRate: doc.tvaRate,
      timbreAmt: doc.timbreAmount || 0,
      totalTTC: doc.totalTTC,
      period: period,
      settings: settings,
      blList: doc.blList || [],
      returnList: doc.returnList || [],
      grossTotalTTC: doc.totalBLsTTC || doc.grossTotalTTC || doc.totalTTC,
      returnsTotalTTC: doc.totalReturnsTTC || doc.returnsTotalTTC || 0,
      netTotalTTC: doc.totalTTC,
      bankName: bank ? bank.name : ''
    };
    PDFGen.exportEtatVente(data);
  }
};
window.EtatVenteModule = EtatVenteModule;

// ═══════════════════════════════════════════════════════════════
// POINTAGE MODULE (Time Tracking / Attendance)
// ═══════════════════════════════════════════════════════════════
const PointageModule = {
  _month: new Date().getMonth(),
  _year: new Date().getFullYear(),
  _page: 0,
  _perPage: 10,
  _searchQ: '',
  
  render() {
    const users = DB.getAll('users').filter(u => u.active !== false);
    const logs = DB.getAll('work_log');
    const rects = DB.getAll('rh_rectifications') || [];
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const todayStr = Utils.today();
    const isAR = T.isRTL();
    const isAdmin = Auth.isAdmin();
    const targetYM = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
    const pvs = DB.getAll('pointage_validations') || [];
    const isPointageValidated = pvs.some(v => v.month === targetYM);
    
    // Build rich attendance data per user
    const userData = users.map(u => {
      const userLogs = logs.filter(l => {
        if (String(l.userId) !== String(u.id)) return false;
        const d = (l.date || l.loginTime || '').slice(0, 7);
        const targetYM = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
        return d === targetYM;
      });

      const userRects = rects.filter(r => {
        if (String(r.userId) !== String(u.id)) return false;
        const d = (r.date || '').slice(0, 7);
        const targetYM = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
        return d === targetYM;
      });
      
      const days = {};
      let totalHours = 0;
      let totalDays = 0;
      let countLate = 0;
      let countAbsentJust = 0;
      let countAbsentUnjust = 0;
      let countLeave = 0;
      let countMission = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayDate = new Date(this._year, this._month, day);
        const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6; // Friday/Saturday
        const isPastOrToday = dateStr <= todayStr;

        // 1. Check if admin rectification exists
        const rect = userRects.find(r => r.date === dateStr);
        if (rect) {
          days[day] = {
            status: rect.status || 'present',
            hours: Number(rect.hours) || 0,
            motif: rect.motif || 'Rectifié par admin',
            isRectified: true
          };
          if (rect.status === 'present') { totalHours += (rect.hours || 8); totalDays++; }
          else if (rect.status === 'late') { totalHours += (rect.hours || 4); totalDays++; countLate++; }
          else if (rect.status === 'absent_justified') { countAbsentJust++; }
          else if (rect.status === 'absent_unjustified') { countAbsentUnjust++; }
          else if (rect.status === 'conge') { countLeave++; }
          else if (rect.status === 'mission') { totalHours += (rect.hours || 8); totalDays++; countMission++; }
          continue;
        }

        // 2. Check work logs
        const dayLogs = userLogs.filter(l => (l.date || '').startsWith(dateStr) || (l.loginTime || '').startsWith(dateStr));
        if (dayLogs.length > 0) {
          let hours = 0;
          dayLogs.forEach(log => {
            if (log.loginTime && log.logoutTime) {
              hours += (new Date(log.logoutTime) - new Date(log.loginTime)) / 3600000;
            } else if (log.loginTime) {
              hours += (new Date() - new Date(log.loginTime)) / 3600000;
            }
          });
          hours = Math.min(Math.round(hours * 10) / 10, 24);
          days[day] = { status: 'present', hours, motif: 'Pointage normal', isRectified: false };
          totalHours += hours;
          totalDays++;
        } else {
          if (!isPastOrToday) {
            days[day] = { status: 'future', hours: null, motif: '', isRectified: false };
          } else if (isWeekend) {
            days[day] = { status: 'weekend', hours: null, motif: 'Repos hebdomadaire', isRectified: false };
          } else {
            days[day] = { status: 'absent_unjustified', hours: 0, motif: 'Absence non enregistrée', isRectified: false };
            countAbsentUnjust++;
          }
        }
      }
      
      return { 
        user: u, days, 
        totalHours: Math.round(totalHours * 10) / 10, 
        totalDays, countLate, countAbsentJust, countAbsentUnjust, countLeave, countMission 
      };
    });
    
    // Filter by search
    let filteredData = userData;
    if (this._searchQ) {
      const sq = this._searchQ.toLowerCase();
      filteredData = userData.filter(d => (d.user.name||'').toLowerCase().includes(sq) || (d.user.jobTitle||'').toLowerCase().includes(sq) || (d.user.department||'').toLowerCase().includes(sq));
    }
    const totalPages = Math.max(1, Math.ceil(filteredData.length / this._perPage));
    if (this._page >= totalPages) this._page = totalPages - 1;
    const pagedData = filteredData.slice(this._page * this._perPage, (this._page + 1) * this._perPage);

    // Summary KPIs
    const totalUsers = users.length;
    const avgHours = userData.length ? Math.round(userData.reduce((s,d) => s + d.totalHours, 0) / Math.max(userData.length, 1) * 10) / 10 : 0;
    const mostActive = userData.slice().sort((a,b) => b.totalHours - a.totalHours)[0];
    const totalAbsences = userData.reduce((s,d) => s + d.countAbsentUnjust + d.countAbsentJust, 0);
    
    let html = `
    <div style="padding:clamp(12px, 2vw, 24px);max-width:100%;width:100%;box-sizing:border-box;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(99,102,241,.3)">
            <i class="fas fa-user-clock"></i>
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">${T.get('nav_pointage') || 'Pointage & Présences RH'}</h2>
            <div style="font-size:13px;color:var(--text4);margin-top:2px">Suivi de présence, heures travaillées, retards et rectification administrateur</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn" onclick="PointageModule._prevMonth()" style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 12px"><i class="fas fa-chevron-left"></i></button>
          <span style="font-weight:800;font-size:16px;min-width:180px;text-align:center;color:var(--text)">${monthNames[this._month]} ${this._year}</span>
          <button class="btn" onclick="PointageModule._nextMonth()" style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 12px"><i class="fas fa-chevron-right"></i></button>
          <button class="btn btn-outline" onclick="PointageModule._setThisMonth()" style="font-weight:700">Mois en cours</button>
          <button class="btn" onclick="PointageModule._showFicheSelection()" style="background:linear-gradient(135deg,#10b981,#34d399);color:white;border:none;border-radius:8px;padding:8px 12px;font-weight:700;">
            <i class="fas fa-file-invoice-dollar"></i> Générer Fiche de Paie
          </button>
          <button class="btn" onclick="PointageModule._showPayHistory()" style="background:linear-gradient(135deg,#6366f1,#818cf8);color:white;border:none;border-radius:8px;padding:8px 12px;font-weight:700;">
            <i class="fas fa-history"></i> Historique Paie
          </button>
          <button class="btn btn-primary" onclick="PointageModule._exportExcel()" style="background:linear-gradient(135deg,#6366f1,#818cf8);border:none">
            <i class="fas fa-file-excel"></i> Export Excel
          </button>
          <button class="btn" onclick="PointageModule.validatePointage()" style="background:linear-gradient(135deg,${isPointageValidated ? '#f59e0b,#d97706' : '#10b981,#059669'});color:white;border:none;border-radius:8px;padding:8px 12px;font-weight:700;">
            <i class="fas ${isPointageValidated ? 'fa-lock-open' : 'fa-check-circle'}"></i> ${isPointageValidated ? 'Validé ✓ (cliquer pour modifier)' : 'Valider le Pointage'}
          </button>
          ${isPointageValidated ? `<button class="btn btn-primary" onclick="PointageModule.showPayrollCloture()" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;border-radius:8px;padding:8px 12px;font-weight:700;">
            <i class="fas fa-money-check-alt"></i> Clôturer les Paies
          </button>` : ''}
        </div>
      </div>
      
      <!-- KPIs Strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6366f1;margin-bottom:4px">Collaborateurs Actifs</div>
          <div style="font-size:22px;font-weight:900;color:#6366f1">${totalUsers}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#10b981;margin-bottom:4px">Moyenne Heures / Mois</div>
          <div style="font-size:22px;font-weight:900;color:#10b981">${avgHours}h</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#f59e0b;margin-bottom:4px">Top Présence</div>
          <div style="font-size:16px;font-weight:900;color:#f59e0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${mostActive ? Utils.escHTML(mostActive.user.name) + ' (' + mostActive.totalHours + 'h)' : '-'}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#ef4444;margin-bottom:4px">Total Absences Signalées</div>
          <div style="font-size:22px;font-weight:900;color:#ef4444">${totalAbsences}</div>
        </div>
      </div>

      <!-- Legend bar -->
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--bg2);padding:10px 16px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;font-size:11px">
        <span style="font-weight:700;color:var(--text3)">Légende :</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(16,185,129,.2);border:1px solid #10b981"></span> Présent (h)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(245,158,11,.2);border:1px solid #f59e0b"></span> Retard (RET)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(239,68,68,.2);border:1px solid #ef4444"></span> Absent Injustifié (ABS)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(217,119,6,.2);border:1px solid #d97706"></span> Absent Justifié (JUST)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(14,165,233,.2);border:1px solid #0ea5e9"></span> Congé (CG)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(139,92,246,.2);border:1px solid #8b5cf6"></span> Mission (MIS)</span>
        ${isAdmin ? `<span style="margin-left:auto;color:var(--primary);font-weight:700"><i class="fas fa-mouse-pointer"></i> Cliquez sur une case pour rectifier</span>` : ''}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap">
        <input type="text" class="input" style="padding:6px 12px;font-size:12px;max-width:300px" value="${Utils.escHTML(this._searchQ||'')}" onchange="PointageModule._searchQ=this.value;PointageModule._page=0;App.loadModule('pointage')" placeholder="🔍 Rechercher un collaborateur...">
        <div style="display:flex;gap:6px;align-items:center;font-size:12px">
          <span style="color:var(--text4)">${filteredData.length} employé(s) · Page ${this._page+1}/${totalPages}</span>
          <button class="btn btn-outline btn-sm" ${this._page<=0?'disabled':''} onclick="PointageModule._page--;App.loadModule('pointage')"><i class="fas fa-chevron-left"></i></button>
          <button class="btn btn-outline btn-sm" ${this._page>=totalPages-1?'disabled':''} onclick="PointageModule._page++;App.loadModule('pointage')"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
      
      <!-- Attendance Grid -->
      <div style="background:var(--bg2);border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.03);width:100%;max-width:100%;box-sizing:border-box">
        <div class="table-shell" style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;max-width:100%">
          <table style="width:100%;border-collapse:collapse;font-size:10px;min-width:850px">
            <thead>
              <tr style="background:var(--bg3);border-bottom:2px solid var(--border)">
                <th class="pointage-sticky-col" style="padding:10px 12px;text-align:${isAR?'right':'left'};color:var(--text3);font-weight:700;min-width:130px">${isAR ? 'الموظف' : 'Collaborateur'}</th>
                ${Array.from({length: daysInMonth}, (_, i) => {
                  const dayDate = new Date(this._year, this._month, i + 1);
                  const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6;
                  return `<th style="padding:4px 1px;text-align:center;color:${isWeekend ? 'var(--text4)' : 'var(--text3)'};font-weight:700;font-size:9px;min-width:24px;${isWeekend ? 'background:rgba(0,0,0,.03);' : ''}">${i+1}</th>`;
                }).join('')}
                <th style="padding:10px 8px;text-align:center;color:var(--text);font-weight:800;background:var(--bg3)">Heures</th>
                <th style="padding:10px 8px;text-align:center;color:var(--text);font-weight:800;background:var(--bg3)">Présences</th>
                <th style="padding:10px 8px;text-align:center;color:var(--danger);font-weight:800;background:var(--bg3)">Absences</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    pagedData.forEach(d => {
      const u = d.user;
      const avatarHTML = u.avatar
        ? `<img src="${u.avatar}" style="width:24px;height:24px;border-radius:6px;object-fit:cover">`
        : `<div class="avatar" style="width:24px;height:24px;font-size:10px;border-radius:6px">${(u.name||'?').charAt(0).toUpperCase()}</div>`;

      html += `<tr style="border-bottom:1px solid var(--border)">`;
      html += `<td class="pointage-sticky-col" style="padding:8px 12px;font-weight:700;color:var(--text);text-align:${isAR?'right':'left'}">
        <div style="display:flex;align-items:center;gap:8px">
          ${avatarHTML}
          <div>
            <div style="font-size:12px">${Utils.escHTML(u.name)}</div>
            ${u.jobTitle ? `<div style="font-size:10px;color:var(--text4);font-weight:400">${Utils.escHTML(u.jobTitle)}</div>` : ''}
          </div>
        </div>
      </td>`;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const cell = d.days[day] || { status: 'future', hours: null };
        const dateStr = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayDate = new Date(this._year, this._month, day);
        const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6;

        let badge = '-';
        let bg = 'transparent';
        let color = 'var(--text4)';
        let title = cell.motif || '';

        switch(cell.status) {
          case 'present':
            badge = (cell.hours || 8) + 'h';
            bg = 'rgba(16,185,129,.15)';
            color = '#059669';
            break;
          case 'late':
            badge = `RET(${cell.hours||4}h)`;
            bg = 'rgba(245,158,11,.15)';
            color = '#d97706';
            break;
          case 'absent_unjustified':
            badge = 'ABS';
            bg = 'rgba(239,68,68,.15)';
            color = '#dc2626';
            break;
          case 'absent_justified':
            badge = 'JUST';
            bg = 'rgba(217,119,6,.15)';
            color = '#b45309';
            break;
          case 'conge':
            badge = 'CG';
            bg = 'rgba(14,165,233,.15)';
            color = '#0284c7';
            break;
          case 'mission':
            badge = 'MIS';
            bg = 'rgba(139,92,246,.15)';
            color = '#7c3aed';
            break;
          case 'weekend':
            badge = 'WE';
            color = 'var(--text4)';
            bg = 'rgba(0,0,0,.03)';
            break;
          default:
            badge = '—';
            color = 'var(--text4)';
        }

        const clickAttr = isAdmin
          ? `onclick="PointageModule.showRectifyModal('${u.id}','${dateStr}')" style="padding:2px 1px;font-size:9px;text-align:center;cursor:pointer;background:${bg};color:${color};font-weight:700;border-right:1px solid var(--border);position:relative"`
          : `style="padding:2px 1px;font-size:9px;text-align:center;background:${bg};color:${color};font-weight:700;border-right:1px solid var(--border)"`;

        html += `<td ${clickAttr} title="${Utils.escHTML(title || (isAdmin ? 'Cliquer pour rectifier' : ''))}">
          ${cell.isRectified ? '<span style="position:absolute;top:1px;right:2px;font-size:7px;color:#f59e0b">★</span>' : ''}
          ${badge}
        </td>`;
      }
      
      html += `<td style="padding:8px;text-align:center;font-weight:900;color:var(--primary)">${d.totalHours}h</td>`;
      html += `<td style="padding:8px;text-align:center;font-weight:800;color:var(--success)">${d.totalDays} j</td>`;
      html += `<td style="padding:8px;text-align:center;font-weight:800;color:var(--danger)">${d.countAbsentUnjust + d.countAbsentJust} j</td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table></div></div></div>`;
    return html;
  },

  _prevMonth() {
    this._month--;
    if (this._month < 0) { this._month = 11; this._year--; }
    App.loadModule('pointage');
  },

  _nextMonth() {
    this._month++;
    if (this._month > 11) { this._month = 0; this._year++; }
    App.loadModule('pointage');
  },

  _setThisMonth() {
    this._month = new Date().getMonth();
    this._year = new Date().getFullYear();
    App.loadModule('pointage');
  },

  // ── Admin Attendance Rectification Modal ──────────────────────
  async showRectifyModal(userId, dateStr) {
    if (!Auth.isAdmin()) {
      Utils.notify("Seul l'administrateur peut modifier le pointage RH.", "warning");
      return;
    }
    
    // Check if this month's pointage is already validated — block modifications
    const rectMonth = dateStr.substring(0, 7); // "YYYY-MM"
    const pvs = DB.getAll('pointage_validations') || [];
    if (pvs.some(v => v.month === rectMonth)) {
      // Check if paie was clôturée too
      const paieVals = DB.getAll('paie_validations') || [];
      if (paieVals.find(p => p.month === rectMonth)) {
        Utils.notify("Modification impossible : les paies de ce mois sont déjà clôturées. Supprimez d'abord la charge.", "error");
      } else {
        Utils.notify("Ce mois est déjà validé. Annulez d'abord la validation du pointage pour modifier.", "warning");
      }
      return;
    }
    const u = DB.getById('users', userId) || DB.getAll('users').find(x => String(x.id) === String(userId));
    if (!u) {
      Utils.notify("Collaborateur introuvable (ID: " + userId + ")", "error");
      return;
    }

    const allRects = DB.getAll('rh_rectifications') || [];
    const currentRect = allRects.find(r => String(r.userId) === String(u.id) && r.date === dateStr);

    const statuses = [
      { id: 'present', label: '✅ Présent (Journée normale - 8h)', hours: 8 },
      { id: 'late', label: '⏱️ Retard / Présence partielle', hours: 4 },
      { id: 'absent_unjustified', label: '❌ Absent non justifié (0h)', hours: 0 },
      { id: 'absent_justified', label: '📋 Absence justifiée / Maladie / Urgence', hours: 0 },
      { id: 'conge', label: '🏖️ Congé payé / Récupération', hours: 0 },
      { id: 'mission', label: '🚗 Mission extérieure / Déplacement', hours: 8 }
    ];

    const curStatus = currentRect ? currentRect.status : 'present';
    const curHours = currentRect ? (currentRect.hours !== undefined ? currentRect.hours : 8) : 8;
    const curMotif = currentRect ? currentRect.motif : '';

    const optsHtml = statuses.map(s => `<option value="${s.id}" data-hours="${s.hours}" ${s.id === curStatus ? 'selected' : ''}>${s.label}</option>`).join('');

    const modalHTML = `
      <div style="padding:6px 0">
        <div style="background:var(--bg3);border-radius:10px;padding:12px 16px;margin-bottom:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text4)">Collaborateur :</span>
            <strong style="color:var(--text)">${Utils.escHTML(u.name)} (${Utils.escHTML(u.jobTitle || 'Employé')})</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text4)">Date concernée :</span>
            <strong style="color:var(--primary)">${Utils.fmtDate(dateStr)}</strong>
          </div>
        </div>

        <div class="form-group mb-2">
          <label style="font-weight:700">Statut de présence RH</label>
          <select id="rect_rh_status" class="input" style="width:100%" onchange="
            const sel = this.options[this.selectedIndex];
            const h = sel.getAttribute('data-hours');
            if (h !== null) document.getElementById('rect_rh_hours').value = h;
          ">${optsHtml}</select>
        </div>

        <div class="form-group mb-2">
          <label style="font-weight:700">Heures comptabilisées</label>
          <input type="number" id="rect_rh_hours" class="input" style="width:100%" min="0" max="24" step="0.5" value="${curHours}">
        </div>

        <div class="form-group mb-2">
          <label style="font-weight:700">Motif & Justification RH</label>
          <input type="text" id="rect_rh_motif" class="input" style="width:100%" placeholder="Ex: Présent, Certificat médical, Mission..." value="${Utils.escHTML(curMotif)}">
        </div>
      </div>`;

    const r = await Dialog.show({
      title: `📋 Rectification Pointage — ${u.name}`,
      message: modalHTML,
      type: 'warning',
      confirmText: 'Enregistrer la Rectification',
      cancelText: 'Annuler'
    });

    if (!r) return;

    const st = document.getElementById('rect_rh_status')?.value || 'present';
    const hrs = parseFloat(document.getElementById('rect_rh_hours')?.value || 0);
    const motifInput = document.getElementById('rect_rh_motif')?.value?.trim();
    const finalMotif = motifInput || 'Rectification manuelle administrateur';

    const admin = Auth.getCurrentUser();

    if (currentRect) {
      DB.update('rh_rectifications', currentRect.id, {
        status: st,
        hours: hrs,
        motif: finalMotif,
        rectifiedBy: admin?.id,
        rectifiedByName: admin?.name,
        rectifiedAt: new Date().toISOString()
      });
    } else {
      DB.insert('rh_rectifications', {
        userId: u.id,
        date: dateStr,
        status: st,
        hours: hrs,
        motif: finalMotif,
        rectifiedBy: admin?.id,
        rectifiedByName: admin?.name,
        rectifiedAt: new Date().toISOString()
      });
    }

    Utils.notify(`✅ Pointage de ${u.name} pour le ${Utils.fmtDate(dateStr)} mis à jour.`, 'success');
    App.loadModule('pointage');
  },
  _openRectifModal(userId, dateStr) { return this.showRectifyModal(userId, dateStr); },

  async _closePaieMonth() {
    const m = this._month + 1;
    const y = this._year;
    const label = `${String(m).padStart(2,'0')}/${y}`;
    const fiches = DB.getAll('fiches_paie').filter(f => f.month === m && f.year === y);
    if (!fiches.length) { Utils.notify('Aucune fiche de paie pour ' + label, 'warning'); return; }

    // Check if already closed
    const existing = DB.getAll('bank_charges').find(c => c.subtype === 'Salaires & Primes RH' && c.label && c.label.includes(label));
    if (existing) { Utils.notify('La paie du mois ' + label + ' est deja cloturee dans les charges.', 'warning'); return; }

    const totalNet = Math.round(fiches.reduce((s, f) => s + (f.netPayer || 0), 0) * 100) / 100;
    const totalBrut = Math.round(fiches.reduce((s, f) => s + (f.salaireBrut || 0), 0) * 100) / 100;
    const totalCNAS = Math.round(fiches.reduce((s, f) => s + (f.cotisationCNAS || 0), 0) * 100) / 100;

    const banks = DB.getSettings().banks || [];
    const bankOpts = banks.map(b => `<option value="${b.id}">Banque : ${Utils.escHTML(b.name)}</option>`).join('');

    const detailHtml = fiches.map(f => 
      `<tr><td style="padding:4px 8px">${Utils.escHTML(f.userName)}</td><td style="padding:4px 8px;text-align:right">${Utils.fmtCurrency(f.netPayer||0)}</td></tr>`
    ).join('');

    const r = await Dialog.show({
      title: 'Cloturer la Paie du Mois ' + label,
      message: `
        <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Fiches generees :</span><strong>${fiches.length}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total Brut :</span><strong>${Utils.fmtCurrency(totalBrut)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total CNAS :</span><strong style="color:#ef4444">-${Utils.fmtCurrency(totalCNAS)}</strong></div>
          <div style="display:flex;justify-content:space-between;border-top:2px solid var(--primary);padding-top:6px;margin-top:6px"><span style="font-weight:800;font-size:16px">Total Net a Payer :</span><strong style="font-size:18px;color:#10b981">${Utils.fmtCurrency(totalNet)}</strong></div>
        </div>
        <div style="max-height:120px;overflow-y:auto;margin-bottom:12px">
          <table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr style="background:var(--bg3)"><th style="padding:4px 8px;text-align:left">Employe</th><th style="padding:4px 8px;text-align:right">Net</th></tr></thead><tbody>${detailHtml}</tbody></table>
        </div>
        <div class="form-group"><label style="font-weight:700">Source de paiement</label>
          <select id="paie_source" class="input" style="width:100%">
            <option value="caisse">Caisse Principale (Especes)</option>
            ${bankOpts}
          </select>
        </div>`,
      type: 'info',
      confirmText: 'Cloturer et Enregistrer la Charge',
      cancelText: 'Annuler'
    });
    if (!r) return;

    const source = document.getElementById('paie_source')?.value || 'caisse';
    const u = Auth.getCurrentUser();

    // Create single charge for the monthly total
    const paieDetailsList = fiches.map(f => ({
      employeeId: f.userId,
      employeeName: f.userName,
      baseSalary: f.salaireBase || 0,
      daysPresent: f.joursTravailles || 0,
      absences: f.joursAbsence || 0,
      totalWorkingDays: f.joursTotal || 0,
      netPay: f.netPayer || 0,
      role: f.role || '',
      poste: f.jobTitle || f.department || ''
    }));
    DB.insert('bank_charges', {
      type: 'auto',
      subtype: 'Salaires & Primes RH',
      label: `Masse salariale ${label} (${fiches.length} employes)`,
      category: 'Salaires & Primes RH',
      bankId: source,
      amount: totalNet,
      date: Utils.today(),
      recurring: false,
      paieValidation: true,
      month: `${y}-${String(m).padStart(2,'0')}`,
      employeeCount: fiches.length,
      paieDetails: paieDetailsList,
      createdBy: u?.id,
      createdByName: u?.name,
      createdAt: new Date().toISOString()
    });

    // Create the financial debit transaction
    if (source === 'caisse') {
      DB.insert('caisse_admin', {
        type: 'withdrawal', source: 'charge',
        amount: totalNet,
        note: `Paie mois ${label} - ${fiches.length} employes`,
        userId: u?.id, userName: u?.name,
        date: Utils.today()
      });
    } else {
      DB.insert('bank_transactions', {
        bankId: source, type: 'payment', subtype: 'charge',
        amount: totalNet,
        note: `Paie mois ${label} - ${fiches.length} employes`,
        date: Utils.today(),
        by: u?.id, byName: u?.name,
        createdAt: new Date().toISOString()
      });
    }

    Utils.notify(`Paie du mois ${label} cloturee : ${Utils.fmtCurrency(totalNet)} debite de ${source === 'caisse' ? 'la caisse' : 'la banque'}`, 'success');
    App.loadModule('pointage');
  },

  _exportExcel() {
    Utils.notify("Génération de l'export Excel des présences...", "info");
    // Simple table to CSV/XLS export
    const rows = [
      ['Collaborateur', 'Poste', 'Heures Travaillées', 'Jours Présents', 'Retards', 'Absences Justifiées', 'Absences Injustifiées']
    ];
    const users = DB.getAll('users').filter(u => u.active !== false);
    const logs = DB.getAll('work_log');
    const rects = DB.getAll('rh_rectifications') || [];
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();

    users.forEach(u => {
      let totH = 0; let totD = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const r = rects.find(x => String(x.userId)===String(u.id) && x.date===dStr);
        if (r && (r.status==='present'||r.status==='late'||r.status==='mission')) {
          totH += (Number(r.hours)||0); totD++;
        }
      }
      rows.push([u.name, u.jobTitle||'—', totH, totD, 0, 0, 0]);
    });

    if (typeof exportXLSX !== 'undefined') {
      exportXLSX(rows[0], rows.slice(1), `Pointage_${this._year}_${this._month+1}`);
    } else {
      let csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pointage_${this._year}_${this._month+1}.csv`;
      a.click();
    }
  },

  async _showPayHistory() {
    const fiches = DB.getAll('fiches_paie').sort((a,b) => (b.year*100+b.month) - (a.year*100+a.month));
    if (!fiches.length) { Utils.notify('Aucune fiche de paie enregistrée.', 'warning'); return; }
    
    let html = '<div style="max-height:60vh;overflow-y:auto">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<thead><tr style="background:var(--bg3);border-bottom:2px solid var(--border)">';
    html += '<th style="padding:8px;text-align:left">Employé</th>';
    html += '<th style="padding:8px;text-align:center">Période</th>';
    html += '<th style="padding:8px;text-align:right">Brut</th>';
    html += '<th style="padding:8px;text-align:right">CNAS</th>';
    html += '<th style="padding:8px;text-align:right">IRG</th>';
    html += '<th style="padding:8px;text-align:right;color:#10b981;font-weight:800">Net</th>';
    html += '<th style="padding:8px;text-align:center">PDF</th>';
    html += '</tr></thead><tbody>';
    
    fiches.forEach(f => {
      html += `<tr style="border-bottom:1px solid var(--border)">`;
      html += `<td style="padding:6px 8px;font-weight:600">${Utils.escHTML(f.userName||'—')}</td>`;
      html += `<td style="padding:6px 8px;text-align:center">${String(f.month).padStart(2,'0')}/${f.year}</td>`;
      html += `<td style="padding:6px 8px;text-align:right">${Utils.fmtCurrency(f.salaireBrut||0)}</td>`;
      html += `<td style="padding:6px 8px;text-align:right;color:#ef4444">−${Utils.fmtCurrency(f.cotisationCNAS||0)}</td>`;
      html += `<td style="padding:6px 8px;text-align:right;color:#ef4444">−${Utils.fmtCurrency(f.irg||0)}</td>`;
      html += `<td style="padding:6px 8px;text-align:right;font-weight:800;color:#10b981">${Utils.fmtCurrency(f.netPayer||0)}</td>`;
      html += `<td style="padding:6px 8px;text-align:center"><button class="btn btn-sm" style="background:#6366f1;color:white;border:none;padding:3px 8px;border-radius:6px;font-size:10px" onclick="PointageModule._reprintFiche('${f.id}')"><i class="fas fa-file-pdf"></i></button></td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    Dialog.alert('📋 Historique des Fiches de Paie', html);
  },

  _reprintFiche(ficheId) {
    const f = DB.getAll('fiches_paie').find(x => String(x.id) === String(ficheId));
    if (!f) { Utils.notify('Fiche introuvable', 'warning'); return; }
    if (typeof PDFGen !== 'undefined' && PDFGen.exportFicheDePayeSimple) {
      PDFGen.exportFicheDePayeSimple({
        employeeName: f.userName, department: f.department||'-', jobTitle: f.jobTitle||'-',
        monthLabel: `${String(f.month).padStart(2,'0')} / ${f.year}`,
        totalDays: String(f.joursTotal), workedDays: String(f.joursTravailles),
        daysAbsent: f.joursAbsence || 0,
        daysMission: f.joursMission || 0,
        daysLate: f.joursRetard || 0,
        daysLeave: f.joursConge || 0,
        totalHours: f.totalHeures || 0,
        baseSalary: f.salaireBase, prorata: f.prorata, overtime: f.montantHS, bonuses: f.primes,
        grossTotal: f.salaireBrut,
        deductions: [
          ...(f.cotisationCNAS > 0 ? [{ label: `CNAS (${f.tauxCNAS}%)`, amount: f.cotisationCNAS }] : []),
          ...(f.irg > 0 ? [{ label: 'IRG', amount: f.irg }] : []),
          ...(f.retenues > 0 ? [{ label: 'Retenues', amount: f.retenues }] : []),
        ],
        totalDeductions: Math.round((f.cotisationCNAS+f.irg+(f.retenues||0))*100)/100,
        netPay: f.netPayer,
      });
    }
  },

  async _showFicheSelection() {
    const users = DB.getAll('users').filter(u => u.active !== false);
    if (!users.length) return Utils.notify("Aucun utilisateur actif.", "error");

    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const optsHtml = users.map(u => `<option value="${u.id}">${Utils.escHTML(u.name)} (${Utils.escHTML(u.jobTitle || 'Employé')})</option>`).join('');
    const monthOpts = monthNames.map((m, i) => `<option value="${i}" ${i === this._month ? 'selected' : ''}>${m}</option>`).join('');
    const curYear = new Date().getFullYear();
    const yearOpts = [curYear-1, curYear, curYear+1].map(y => `<option value="${y}" ${y === this._year ? 'selected' : ''}>${y}</option>`).join('');
    
    const r = await Dialog.show({
      title: '📄 Générer Fiche de Paie',
      message: `
        <div class="form-group mb-2">
          <label style="font-weight:700">Sélectionner l'employé</label>
          <select id="fiche_user_id" class="input" style="width:100%">${optsHtml}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
          <div class="form-group">
            <label style="font-weight:700">Mois</label>
            <select id="fiche_month" class="input" style="width:100%">${monthOpts}</select>
          </div>
          <div class="form-group">
            <label style="font-weight:700">Année</label>
            <select id="fiche_year" class="input" style="width:100%">${yearOpts}</select>
          </div>
        </div>`,
      type: 'info',
      confirmText: 'Suivant',
      cancelText: 'Annuler'
    });

    if (r) {
      const userId = document.getElementById('fiche_user_id')?.value || users[0].id;
      const selMonth = parseInt(document.getElementById('fiche_month')?.value ?? this._month);
      const selYear = parseInt(document.getElementById('fiche_year')?.value ?? this._year);
      this._ficheMonth = selMonth;
      this._ficheYear = selYear;
      this._generateFicheDePayeModal(userId);
    }
  },

  _updateFicheCalc() {
    const sb = parseFloat(document.getElementById('fiche_salaire_base')?.value || 0);
    const jt = parseFloat(document.getElementById('fiche_jours_trav')?.value || 0);
    const tt = parseFloat(document.getElementById('fiche_jours_total')?.value || 30);
    const tauxHS = parseFloat(document.getElementById('fiche_taux_hs')?.value || 0);
    const nbHS = parseFloat(document.getElementById('fiche_nb_hs')?.value || 0);
    const primes = parseFloat(document.getElementById('fiche_primes')?.value || 0);
    const retenues = parseFloat(document.getElementById('fiche_retenues')?.value || 0);
    const tauxCNAS = parseFloat(document.getElementById('fiche_taux_cnas')?.value || 9) / 100;
    const rhSettings = DB.getSettings().rh || {};
    const irgActive = rhSettings.irgActive !== false;
    
    const prorata = Math.round(sb * (tt > 0 ? jt / tt : 0) * 100) / 100;
    const montantHS = Math.round(tauxHS * nbHS * 100) / 100;
    const brut = Math.round((prorata + montantHS + primes) * 100) / 100;
    const cnas = Number((brut * tauxCNAS).toFixed(2));
    const baseImposable = Number((brut - cnas).toFixed(2));
    
    // IRG progressif — Barème Algérie 2022+ (LF2022 art.104)
    let irg = 0;
    if (irgActive) {
      if (baseImposable <= 30000) irg = 0;
      else if (baseImposable <= 120000) irg = Number(((baseImposable - 30000) * 0.23).toFixed(2));
      else if (baseImposable <= 360000) irg = Number((20700 + (baseImposable - 120000) * 0.27).toFixed(2));
      else irg = Number((85500 + (baseImposable - 360000) * 0.30).toFixed(2));
    }
    const net = Number((brut - cnas - irg - retenues).toFixed(2));
    
    const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = Utils.fmtCurrency(v); };
    setVal('fiche_d_prorata', prorata);
    setVal('fiche_d_hs', montantHS);
    setVal('fiche_d_brut', brut);
    setVal('fiche_d_cnas', cnas);
    setVal('fiche_d_irg', irg);
    
    const netDisplay = document.getElementById('fiche_net_display');
    if (netDisplay) netDisplay.innerText = Utils.fmtCurrency(net);
  },

  async _submitFiche(action) {
    const u = this._currentFicheUser;
    if (!u) return Utils.notify("Données employé manquantes.", "error");

    const sb = parseFloat(document.getElementById('fiche_salaire_base')?.value || 0);
    const jt = parseFloat(document.getElementById('fiche_jours_trav')?.value || 0);
    const tt = parseFloat(document.getElementById('fiche_jours_total')?.value || 30);
    const tauxHS = parseFloat(document.getElementById('fiche_taux_hs')?.value || 0);
    const nbHS = parseFloat(document.getElementById('fiche_nb_hs')?.value || 0);
    const primes = parseFloat(document.getElementById('fiche_primes')?.value || 0);
    const retenues = parseFloat(document.getElementById('fiche_retenues')?.value || 0);
    const tauxCNASRate = parseFloat(document.getElementById('fiche_taux_cnas')?.value || 9);
    const tauxCNAS = tauxCNASRate / 100;
    
    const prorata = Math.round(sb * (tt > 0 ? jt / tt : 0) * 100) / 100;
    const montantHS = Math.round(tauxHS * nbHS * 100) / 100;
    const brut = Math.round((prorata + montantHS + primes) * 100) / 100;
    const cnas = Number((brut * tauxCNAS).toFixed(2));
    const baseImposable = Number((brut - cnas).toFixed(2));
    const rhS = DB.getSettings().rh || {};
    
    // IRG progressif — Barème Algérie 2022+ (LF2022 art.104)
    let irg = 0;
    if (rhS.irgActive !== false) {
      if (baseImposable <= 30000) irg = 0;
      else if (baseImposable <= 120000) irg = Number(((baseImposable - 30000) * 0.23).toFixed(2));
      else if (baseImposable <= 360000) irg = Number((20700 + (baseImposable - 120000) * 0.27).toFixed(2));
      else irg = Number((85500 + (baseImposable - 360000) * 0.30).toFixed(2));
    }
    
    const net = Number((brut - cnas - irg - retenues).toFixed(2));

    const data = {
      userId: u.id,
      userName: u.name,
      jobTitle: u.jobTitle || 'Employé',
      department: u.department || 'Général',
      month: (this._currentFicheMonth !== undefined ? this._currentFicheMonth : this._month) + 1,
      year: this._currentFicheYear || this._year,
      salaireBase: sb,
      joursTotal: tt,
      joursTravailles: jt,
      joursAbsence: parseFloat(document.getElementById('fiche_jours_abs')?.value || 0),
      tauxHS,
      nbHS,
      montantHS,
      primes,
      retenues,
      tauxCNAS: tauxCNASRate,
      salaireBrut: brut,
      prorata,
      cotisationCNAS: cnas,
      irg,
      netPayer: net,
      createdAt: new Date().toISOString()
    };

    // Add attendance breakdown
    const att = this._ficheAttendance || {};
    data.joursMission = att.joursMission || 0;
    data.joursRetard = att.joursRetard || 0;
    data.joursConge = att.joursConge || 0;
    data.totalHeures = att.totalHeures || 0;

    DB.insert('fiches_paie', data);

    if (action === 'pdf') {
      if (typeof PDFGen !== 'undefined' && PDFGen.exportFicheDePayeSimple) {
        const pdfData = {
          employeeName: data.userName,
          department: data.department || '-',
          jobTitle: data.jobTitle || '-',
          monthLabel: `${String(data.month).padStart(2,'0')} / ${data.year}`,
          totalDays: String(data.joursTotal),
          workedDays: String(data.joursTravailles),
          daysAbsent: data.joursAbsence || 0,
          daysMission: data.joursMission || 0,
          daysLate: data.joursRetard || 0,
          daysLeave: data.joursConge || 0,
          totalHours: data.totalHeures || 0,
          baseSalary: data.salaireBase,
          prorata: data.prorata,
          overtime: data.montantHS,
          bonuses: data.primes,
          grossTotal: data.salaireBrut,
          deductions: [
            ...(data.cotisationCNAS > 0 ? [{ label: `CNAS Salarie (${data.tauxCNAS}%)`, amount: data.cotisationCNAS }] : []),
            ...(data.irg > 0 ? [{ label: 'IRG (Impot sur revenu)', amount: data.irg }] : []),
            ...(data.retenues > 0 ? [{ label: 'Autres retenues', amount: data.retenues }] : []),
          ],
          totalDeductions: Math.round((data.cotisationCNAS + data.irg + data.retenues) * 100) / 100,
          netPay: data.netPayer,
        };
        PDFGen.exportFicheDePayeSimple(pdfData);
        Utils.notify("Fiche de paie generee et exportee en PDF !", "success");
      } else {
        Utils.notify("Fiche enregistrée (générateur PDF en cours de chargement).", "info");
      }
    } else {
      Utils.notify("✅ Fiche de paie enregistrée avec succès !", "success");
    }

    if (Dialog._resolve) Dialog._resolve(true);
  },

  async _generateFicheDePayeModal(userId) {
    const u = DB.getById('users', userId) || DB.getAll('users').find(x => String(x.id) === String(userId));
    if (!u) {
      Utils.notify("Collaborateur introuvable.", "error");
      return;
    }
    this._currentFicheUser = u;

    // Use selected period from fiche selection dialog
    const ficheMonth = this._ficheMonth !== undefined ? this._ficheMonth : this._month;
    const ficheYear = this._ficheYear !== undefined ? this._ficheYear : this._year;
    this._currentFicheMonth = ficheMonth;
    this._currentFicheYear = ficheYear;

    // Load RH settings
    const rhSettings = DB.getSettings().rh || {};

    // Get attendance data for selected month/year
    const logs = DB.getAll('work_log').filter(l => String(l.userId) === String(u.id));
    const rects = DB.getAll('rh_rectifications').filter(r => String(r.userId) === String(u.id)) || [];
    const daysInMonth = new Date(ficheYear, ficheMonth + 1, 0).getDate();
    
    let joursTravailles = 0;
    let joursAbsence = 0;
    let joursMission = 0;
    let joursRetard = 0;
    let joursConge = 0;
    let totalHeures = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${ficheYear}-${String(ficheMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayDate = new Date(ficheYear, ficheMonth, day);
      const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6;
      
      const rect = rects.find(r => r.date === dateStr);
      if (rect) {
        if (rect.status === 'present') { joursTravailles++; totalHeures += Number(rect.hours || 8); }
        else if (rect.status === 'mission') { joursTravailles++; joursMission++; totalHeures += Number(rect.hours || 8); }
        else if (rect.status === 'late') { joursTravailles++; joursRetard++; totalHeures += Number(rect.hours || 4); }
        else if (rect.status === 'absent_unjustified' || rect.status === 'absent_justified') { joursAbsence++; }
        else if (rect.status === 'conge') { joursConge++; }
      } else {
        const dayLogs = logs.filter(l => (l.date || '').startsWith(dateStr) || (l.loginTime || '').startsWith(dateStr));
        if (dayLogs.length > 0) {
          joursTravailles++;
          let hrs = 0;
          dayLogs.forEach(log => {
            if (log.loginTime && log.logoutTime) hrs += (new Date(log.logoutTime) - new Date(log.loginTime)) / 3600000;
            else if (log.loginTime) hrs += 8;
          });
          totalHeures += Math.min(Math.round(hrs * 10) / 10, 24);
        }
        else if (!isWeekend && dateStr <= Utils.today()) { joursAbsence++; }
      }
    }
    totalHeures = Math.round(totalHeures * 10) / 10;
    this._ficheAttendance = { joursTravailles, joursAbsence, joursMission, joursRetard, joursConge, totalHeures };

    const salaireBase = u.baseSalary || u.salary || rhSettings.salaireDefaut || 45000;
    const tauxHoraireDefault = u.tauxHoraire || rhSettings.tauxHSDefaut || Math.round((salaireBase / 173.33) * 100) / 100;
    const defaultCNAS = rhSettings.tauxCNAS || 9;
    const defaultJoursRef = rhSettings.joursRef || 30;
    const irgActive = rhSettings.irgActive !== false;
    const congeDays = rects.filter(r => r.status === 'conge' && r.date && r.date.startsWith(`${ficheYear}-${String(ficheMonth+1).padStart(2,'0')}`)).length;
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    const modalHTML = `
      <div style="padding:4px 0">
        <!-- Employee Info Header -->
        <div style="background:var(--bg3);border-radius:10px;padding:12px 16px;margin-bottom:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text4)">Employé :</span>
            <strong style="color:var(--text)">${Utils.escHTML(u.name)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text4)">Département/Poste :</span>
            <strong style="color:var(--text)">${Utils.escHTML(u.department || '-')} / ${Utils.escHTML(u.jobTitle || '-')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text4)">Période :</span>
            <strong style="color:var(--primary)">${monthNames[ficheMonth]} ${ficheYear}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:var(--text4)">Congé ce mois / Solde annuel :</span>
            <strong style="color:${congeDays > 0 ? '#f59e0b' : 'var(--text)'}">${congeDays} jour(s) pris / ${u.congeBalance || 30} jours</strong>
          </div>
        </div>

        <!-- Section 1: Base & Présence -->
        <div style="font-weight:800;font-size:12px;color:var(--text);margin-bottom:8px;border-bottom:2px solid var(--primary);padding-bottom:4px">
          <i class="fas fa-coins" style="color:var(--primary)"></i> SALAIRE & PRÉSENCE
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Salaire de Base (DA)</label>
            <input type="number" id="fiche_salaire_base" class="input" style="width:100%" value="${salaireBase}" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Jours Référence (mois)</label>
            <input type="number" id="fiche_jours_total" class="input" style="width:100%" value="${defaultJoursRef}" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Jours Travaillés</label>
            <input type="number" id="fiche_jours_trav" class="input" style="width:100%" value="${joursTravailles}" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Jours Absence</label>
            <input type="number" id="fiche_jours_abs" class="input" style="width:100%;background:var(--bg3)" value="${joursAbsence}" readonly>
          </div>
        </div>

        <!-- Section 2: Heures Sup & Primes -->
        <div style="font-weight:800;font-size:12px;color:var(--text);margin-bottom:8px;border-bottom:2px solid #f59e0b;padding-bottom:4px">
          <i class="fas fa-plus-circle" style="color:#f59e0b"></i> COMPLÉMENTS DE RÉMUNÉRATION
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Taux Horaire HS (DA/h)</label>
            <input type="number" id="fiche_taux_hs" class="input" style="width:100%" value="${tauxHoraireDefault}" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Nb Heures Sup</label>
            <input type="number" id="fiche_nb_hs" class="input" style="width:100%" value="0" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Primes (DA)</label>
            <input type="number" id="fiche_primes" class="input" style="width:100%" value="0" oninput="PointageModule._updateFicheCalc()">
          </div>
        </div>

        <!-- Section 3: Cotisations & Retenues -->
        <div style="font-weight:800;font-size:12px;color:var(--text);margin-bottom:8px;border-bottom:2px solid #ef4444;padding-bottom:4px">
          <i class="fas fa-minus-circle" style="color:#ef4444"></i> COTISATIONS & RETENUES
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Taux CNAS Salarié (%)</label>
            <input type="number" id="fiche_taux_cnas" class="input" style="width:100%" value="${defaultCNAS}" step="0.5" oninput="PointageModule._updateFicheCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:11px;font-weight:700">Autres Retenues (DA)</label>
            <input type="number" id="fiche_retenues" class="input" style="width:100%" value="0" oninput="PointageModule._updateFicheCalc()">
          </div>
        </div>

        <!-- Breakdown Table -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:10px">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0;color:var(--text3)">Salaire prorata</td>
              <td id="fiche_d_prorata" style="text-align:right;font-weight:600;color:var(--text)">--</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0;color:var(--text3)">Heures Supplémentaires</td>
              <td id="fiche_d_hs" style="text-align:right;font-weight:600;color:var(--text)">--</td>
            </tr>
            <tr style="border-bottom:2px solid var(--primary)">
              <td style="padding:4px 0;font-weight:800;color:var(--primary)">Salaire Brut</td>
              <td id="fiche_d_brut" style="text-align:right;font-weight:800;color:var(--primary)">--</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0;color:#ef4444">− CNAS Salarié</td>
              <td id="fiche_d_cnas" style="text-align:right;font-weight:600;color:#ef4444">--</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0;color:#ef4444">− IRG (Impôt)</td>
              <td id="fiche_d_irg" style="text-align:right;font-weight:600;color:#ef4444">--</td>
            </tr>
          </table>
        </div>

        <!-- NET à Payer -->
        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(52,211,153,0.1));border:2px solid #10b981;border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:12px;font-weight:800;color:#059669;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Net à Payer</div>
          <div id="fiche_net_display" style="font-size:28px;font-weight:900;color:#10b981">--</div>
        </div>

        <!-- Custom Action Buttons -->
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
          <button class="btn btn-outline" type="button" onclick="if(Dialog._resolve) Dialog._resolve(false)">Annuler</button>
          <button class="btn" type="button" style="background:#6366f1;color:white;border:none;font-weight:700" onclick="PointageModule._submitFiche('pdf')">
            <i class="fas fa-file-pdf"></i> Générer PDF
          </button>
          <button class="btn btn-primary" type="button" style="font-weight:700" onclick="PointageModule._submitFiche('save')">
            <i class="fas fa-save"></i> Sauvegarder
          </button>
        </div>
      </div>`;

    setTimeout(() => { this._updateFicheCalc(); }, 60);

    await Dialog.show({
      title: `📄 Fiche de Paie — ${u.name}`,
      message: modalHTML,
      hideButtons: true
    });
  },

  async validatePointage() {
    if (!Auth.isAdmin()) {
      Utils.notify("Seul l'administrateur peut valider le pointage.", "error");
      return;
    }
    const targetYM = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
    const pvs = DB.getAll('pointage_validations') || [];
    const existing = pvs.find(v => v.month === targetYM);
    if (existing) {
      // Already validated — offer to UN-validate
      const r = await Dialog.show({
        title: 'Pointage déjà validé',
        message: `<p>Le pointage de <strong>${targetYM}</strong> est déjà validé.</p>
          <p>Voulez-vous <strong>annuler la validation</strong> pour permettre les modifications ?</p>
          <p style="color:var(--danger);font-size:12px"><i class="fas fa-exclamation-triangle"></i> Ceci ne sera possible que si les paies n'ont pas encore été clôturées.</p>`,
        confirmText: 'Annuler la Validation',
        cancelText: 'Fermer',
        type: 'warning'
      });
      if (r) {
        // Check if paie was already clôturée
        const paieVals = DB.getAll('paie_validations') || [];
        if (paieVals.find(p => p.month === targetYM)) {
          Utils.notify("Impossible : les paies de ce mois sont déjà clôturées. Supprimez d'abord la charge correspondante.", "error");
          return;
        }
        DB.delete('pointage_validations', existing.id);
        Utils.notify("Validation du pointage annulée. Vous pouvez modifier les présences.", "success");
        App.loadModule('pointage');
      }
      return;
    }
    
    const oldPage = this._page;
    const oldPerPage = this._perPage;
    this._page = 0;
    this._perPage = 10000;
    
    const fullHtml = this.render();
    
    this._page = oldPage;
    this._perPage = oldPerPage;
    
    const temp = document.createElement('div');
    temp.innerHTML = fullHtml;
    const tableDiv = temp.querySelector('.table-shell');
    const tableHtml = tableDiv ? tableDiv.outerHTML : '<p>Table introuvable</p>';
    
    const modalHTML = `
      <div style="padding:10px;">
        <p style="margin-top:0">Veuillez vérifier les présences avant de valider. Une fois validé, vous pourrez clôturer les paies.</p>
        <div style="max-height:60vh;overflow-y:auto;border:1px solid var(--border);border-radius:12px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,.03);">
          ${tableHtml}
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>
          <button class="btn btn-success" style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;font-weight:700" onclick="PointageModule.confirmValidatePointage()">
            <i class="fas fa-check"></i> Valider définitivement le Pointage
          </button>
        </div>
      </div>
    `;
    UI.showModal(`Valider le Pointage - ${String(this._month+1).padStart(2,'0')}/${this._year}`, modalHTML, "", "xl");
  },

  confirmValidatePointage() {
    const targetYM = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
    DB.insert('pointage_validations', {
      month: targetYM,
      validatedBy: Auth.getCurrentUser().id,
      validatedAt: new Date().toISOString()
    });
    UI.closeModal();
    Utils.notify("Pointage validé avec succès", "success");
    App.loadModule('pointage');
  },

  async showPayrollCloture() {
    if (!Auth.isAdmin()) {
      Utils.notify("Seul l'administrateur peut clôturer les paies.", "error");
      return;
    }
    const monthKey = `${this._year}-${String(this._month+1).padStart(2,'0')}`;
    
    const pvs = DB.getAll('pointage_validations') || [];
    if (!pvs.some(v => v.month === monthKey)) {
      Utils.notify("Veuillez d'abord valider le pointage de ce mois.", "error");
      return;
    }
    
    const validations = DB.getAll('paie_validations') || [];
    if (validations.find(v => v.month === monthKey)) {
      Utils.notify("Les paies de ce mois ont déjà été clôturées.", "warning");
      return;
    }
    
    // Check if charges were already created for this month to be extra safe
    const charges = DB.getAll('bank_charges');
    if (charges.find(c => c.paieValidation === true && c.month === monthKey)) {
      Utils.notify("Les charges de paie de ce mois existent déjà.", "warning");
      return;
    }

    const users = DB.getAll('users').filter(u => u.active !== false);
    const logs = DB.getAll('work_log');
    const rects = DB.getAll('rh_rectifications') || [];
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();
    
    let totalWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(this._year, this._month, day);
      if (d.getDay() !== 5 && d.getDay() !== 6) totalWorkingDays++;
    }

    const banks = (DB.getSettings().banks || []);
    const bankOpts = banks.map(b => `<option value="${b.id}">Banque : ${Utils.escHTML(b.name)}</option>`).join('');

    let html = `<div style="padding:10px 0;">
      <p style="margin-top:0;">Validation et intégration des salaires pour <strong>${String(this._month+1).padStart(2,'0')}/${this._year}</strong> (Jours ouvrables théoriques: ${totalWorkingDays})</p>
      <div class="form-group mb-2">
        <label style="font-weight:bold;">Imputer les charges à :</label>
        <select id="paie_bank_source" class="input" style="width:100%;padding:8px;">
          <option value="caisse">Caisse Principale (Espèces)</option>
          ${bankOpts}
        </select>
      </div>
      <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead style="position:sticky;top:0;background:var(--bg3);z-index:1;">
          <tr style="border-bottom:2px solid var(--border)">
            <th style="padding:8px;text-align:left">Employé</th>
            <th style="padding:8px;text-align:center">Base (DA)</th>
            <th style="padding:8px;text-align:center">Présences</th>
            <th style="padding:8px;text-align:center">Absences</th>
            <th style="padding:8px;text-align:right">Net à Payer</th>
          </tr>
        </thead>
        <tbody>`;

    const payrollData = [];

    users.forEach(u => {
      let daysPresent = 0;
      let absences = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayDate = new Date(this._year, this._month, day);
        const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6;
        
        const rect = rects.find(r => String(r.userId) === String(u.id) && r.date === dateStr);
        if (rect) {
          if (rect.status === 'present' || rect.status === 'mission') daysPresent++;
          else if (rect.status === 'absent_unjustified') absences++;
        } else if (!isWeekend) {
          const hasLog = logs.some(l => String(l.userId) === String(u.id) && ((l.date || '').startsWith(dateStr) || (l.loginTime || '').startsWith(dateStr)));
          if (hasLog) daysPresent++;
          else if (dateStr <= Utils.today()) absences++; 
        }
      }
      
      const baseSalary = parseFloat(u.baseSalary || u.salary || 0);
      let netPay = 0;
      if (baseSalary > 0) {
        netPay = Math.round(baseSalary * (daysPresent / Math.max(1, totalWorkingDays)));
      }
      
      payrollData.push({ employee: u, daysPresent, absences, baseSalary, netPay });
      
      html += `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px"><strong>${Utils.escHTML(u.name)}</strong></td>
        <td style="padding:8px;text-align:center">${Utils.fmtCurrency(baseSalary)}</td>
        <td style="padding:8px;text-align:center;color:var(--success)">${daysPresent}</td>
        <td style="padding:8px;text-align:center;color:var(--danger)">${absences}</td>
        <td style="padding:8px;text-align:right;font-weight:bold;color:var(--primary)">${Utils.fmtCurrency(netPay)}</td>
      </tr>`;
    });
    
    const grandTotal = payrollData.reduce((s, d) => s + d.netPay, 0);
    const totalEmployees = payrollData.filter(d => d.netPay > 0).length;
    
    html += `</tbody>
      <tfoot>
        <tr style="background:var(--bg3);border-top:2px solid var(--primary)">
          <td style="padding:10px 8px;font-weight:900;font-size:13px" colspan="2">TOTAL (${totalEmployees} employés)</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;color:var(--success)">${payrollData.reduce((s,d)=>s+d.daysPresent,0)}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;color:var(--danger)">${payrollData.reduce((s,d)=>s+d.absences,0)}</td>
          <td style="padding:10px 8px;text-align:right;font-weight:900;font-size:14px;color:var(--primary)">${Utils.fmtCurrency(grandTotal)}</td>
        </tr>
      </tfoot>
    </table></div></div>`;

    const r = await Dialog.show({
      title: 'Clôturer les Paies',
      message: html,
      confirmText: 'Clôturer & Créer les Charges',
      cancelText: 'Annuler',
      type: 'warning'
    });

    if (r) {
      const bankId = document.getElementById('paie_bank_source').value;
      const admin = Auth.getCurrentUser();
      const payDate = Utils.today();
      
      // Build details array for all employees
      const employeeDetails = payrollData.filter(d => d.netPay > 0).map(d => ({
        employeeId: d.employee.id,
        employeeName: d.employee.name,
        baseSalary: d.baseSalary,
        daysPresent: d.daysPresent,
        absences: d.absences,
        totalWorkingDays: totalWorkingDays,
        netPay: d.netPay,
        role: d.employee.role || '',
        poste: d.employee.poste || d.employee.position || ''
      }));
      
      // Create ONE single charge for the total payroll
      const chg = {
        type: 'manual',
        subtype: 'Salaires & Primes RH',
        label: `Masse salariale ${String(this._month+1).padStart(2,'0')}/${this._year} (${employeeDetails.length} employés)`,
        category: 'Salaires & Primes RH',
        bankId: bankId,
        amount: grandTotal,
        date: payDate,
        recurring: false,
        paieValidation: true,
        month: monthKey,
        employeeCount: employeeDetails.length,
        // Store ALL employee payroll details inside this single charge
        paieDetails: employeeDetails,
        createdBy: admin.id,
        createdByName: admin.name,
        createdAt: new Date().toISOString()
      };
      DB.insert('bank_charges', chg);
      
      // One single bank transaction for the total
      if (bankId !== 'caisse') {
        DB.insert('bank_transactions', {
          bankId: bankId,
          date: payDate,
          type: 'withdrawal',
          amount: grandTotal,
          note: chg.label,
          docRef: 'PAIE'
        });
      }
      
      DB.insert('paie_validations', { month: monthKey, validatedAt: new Date().toISOString(), validatedBy: admin.id });
      Utils.notify("Paies clôturées — 1 charge totale de " + Utils.fmtCurrency(grandTotal) + " créée.", "success");
      App.loadModule('charges');
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// CHARGES & FRAIS BANCAIRES MODULE (Journal + Charges Récurrentes)
// ═══════════════════════════════════════════════════════════════
const ChargesModule = {
  _tab: 'journal', // 'journal' or 'recurring'
  _filter: 'all',
  _dateStart: null,
  _dateEnd: null,
  _displayLimit: 50,
  
  render() {
    if (!Auth.isAdmin()) return "<div style='padding:40px;text-align:center;color:var(--text3)'><i class='fas fa-lock' style='font-size:48px;opacity:.2;display:block;margin-bottom:12px'></i>Accès administrateur uniquement</div>";
    
    return `
    <div style="padding:24px;max-width:1300px;margin:0 auto">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#dc2626,#f87171);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(220,38,38,.3)">
            <i class="fas fa-file-invoice-dollar"></i>
          </div>
          <div>
            <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--text)">Charges & Frais d'Exploitation</h2>
            <div style="font-size:13px;color:var(--text4);margin-top:2px">Gestion des frais bancaires, loyers, factures et charges récurrentes planifiées</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <div style="display:flex;background:var(--bg2);padding:4px;border-radius:10px;border:1px solid var(--border)">
            <button class="btn" style="border:none;background:${this._tab==='journal'?'var(--primary)':'transparent'};color:${this._tab==='journal'?'#fff':'var(--text)'};border-radius:8px;padding:6px 16px;font-weight:700;font-size:12px" onclick="ChargesModule._tab='journal';App.loadModule('charges')">
              <i class="fas fa-book"></i> Journal des Charges
            </button>
            <button class="btn" style="border:none;background:${this._tab==='recurring'?'var(--primary)':'transparent'};color:${this._tab==='recurring'?'#fff':'var(--text)'};border-radius:8px;padding:6px 16px;font-weight:700;font-size:12px" onclick="ChargesModule._tab='recurring';App.loadModule('charges')">
              <i class="fas fa-redo"></i> Charges Récurrentes (${(DB.getAll('recurring_charges')||[]).length})
            </button>
          </div>
          ${this._tab === 'journal'
            ? `<button class="btn btn-primary" onclick="ChargesModule._addCharge()" style="background:linear-gradient(135deg,#dc2626,#ef4444);border:none"><i class="fas fa-plus"></i> Saisir une charge</button>`
            : `<button class="btn btn-primary" onclick="ChargesModule._addRecurringCharge()" style="background:linear-gradient(135deg,#0284c7,#0ea5e9);border:none"><i class="fas fa-plus"></i> Nouvelle charge récurrente</button>`
          }
        </div>
      </div>

      ${this._tab === 'journal' ? this._renderJournal() : this._renderRecurring()}
    </div>`;
  },

  _renderJournal() {
    let charges = DB.getAll('bank_charges').sort((a, b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||'').localeCompare(a.createdAt||''));
    const ds = this._dateStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const de = this._dateEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    
    charges = charges.filter(c => (c.date||'') >= ds && (c.date||'') <= de);
    if (this._filter !== 'all') charges = charges.filter(c => c.type === this._filter);
    
    const total = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalAuto = charges.filter(c => c.type === 'auto').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalManual = charges.filter(c => c.type === 'manual').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const banks = DB.getSettings().banks || [];

    return `
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;margin-bottom:24px">
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Total Charges Période</div>
          <div style="font-size:24px;font-weight:900;color:var(--danger)">${Utils.fmtCurrency(total)}</div>
        </div>
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Frais Automatiques</div>
          <div style="font-size:24px;font-weight:900;color:var(--text)">${Utils.fmtCurrency(totalAuto)}</div>
        </div>
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Charges Fixes & Manuelles</div>
          <div style="font-size:24px;font-weight:900;color:var(--text)">${Utils.fmtCurrency(totalManual)}</div>
        </div>
      </div>

      <!-- Filters Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg2);padding:12px 16px;border-radius:12px;border:1px solid var(--border);margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm ${this._filter==='all'?'btn-primary':'btn-outline'}" onclick="ChargesModule._filter='all';App.loadModule('charges')">Toutes</button>
          <button class="btn btn-sm ${this._filter==='auto'?'btn-primary':'btn-outline'}" onclick="ChargesModule._filter='auto';App.loadModule('charges')">Automatiques</button>
          <button class="btn btn-sm ${this._filter==='manual'?'btn-primary':'btn-outline'}" onclick="ChargesModule._filter='manual';App.loadModule('charges')">Manuelles</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" class="input" style="padding:6px 10px;font-size:12px" value="${ds}" onchange="ChargesModule._dateStart=this.value;App.loadModule('charges')">
          <span style="color:var(--text4)">à</span>
          <input type="date" class="input" style="padding:6px 10px;font-size:12px" value="${de}" onchange="ChargesModule._dateEnd=this.value;App.loadModule('charges')">
        </div>
      </div>

      <!-- Table -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg3);text-align:left;font-size:11px;color:var(--text3);text-transform:uppercase">
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Date</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Source / Compte</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Désignation & Catégorie</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:right">Montant</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Auteur</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${charges.length ? charges.slice(0, this._displayLimit).map(c => {
              const b = banks.find(x => x.id === c.bankId) || { name: c.bankId === 'caisse' ? 'Caisse Principale' : 'Banque' };
              return `
              <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
                <td style="padding:12px 16px;font-weight:600;color:var(--text2)">${Utils.fmtDate(c.date)}</td>
                <td style="padding:12px 16px;font-weight:700;color:var(--primary)">
                  <i class="fas ${c.bankId==='caisse'?'fa-cash-register':'fa-university'}"></i> ${Utils.escHTML(b.name)}
                </td>
                <td style="padding:12px 16px">
                  <div style="font-weight:700;font-size:13px;color:var(--text)">${Utils.escHTML(c.label || c.subtype)}</div>
                  <div style="font-size:11px;margin-top:3px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    ${c.type === 'auto'
                      ? `<span style="background:rgba(16,185,129,.12);color:#059669;padding:2px 6px;border-radius:4px;font-weight:700"><i class="fas fa-robot"></i> Auto</span>`
                      : `<span style="background:rgba(139,92,246,.12);color:#7c3aed;padding:2px 6px;border-radius:4px;font-weight:700"><i class="fas fa-user-edit"></i> Manuel</span>`
                    }
                    ${c.recurring ? `<span style="background:rgba(245,158,11,.12);color:#d97706;padding:2px 6px;border-radius:4px;font-weight:700"><i class="fas fa-redo"></i> Récurrent</span>` : ''}
                    ${c.paieValidation ? `<span style="background:rgba(99,102,241,.12);color:#6366f1;padding:2px 6px;border-radius:4px;font-weight:700"><i class="fas fa-id-badge"></i> Paie RH</span>` : ''}
                    ${c.category ? `<span style="color:var(--text4)">· ${Utils.escHTML(c.category)}</span>` : ''}
                    ${c.paieDetails && Array.isArray(c.paieDetails) ? `<span style="color:var(--text4);font-size:10px">· ${c.paieDetails.length} employés</span>` : (c.paieDetails ? `<span style="color:var(--text4);font-size:10px">· ${c.paieDetails.daysPresent}j/${c.paieDetails.totalWorkingDays}j</span>` : '')}
                  </div>
                </td>
                <td style="padding:12px 16px;font-weight:900;color:var(--danger);text-align:right">-${Utils.fmtCurrency(c.amount)}</td>
                <td style="padding:12px 16px;font-size:12px;color:var(--text4)">${Utils.escHTML(c.createdByName || '—')}</td>
                <td style="padding:12px 16px;text-align:right;white-space:nowrap">
                  ${c.paieValidation ? `<button class="btn btn-xs" onclick="ChargesModule._showPayrollDetail('${c.id}')" title="Détails Paie" style="color:#6366f1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2)"><i class="fas fa-info-circle"></i></button>` : ''}
                  <button class="btn btn-xs" onclick="ChargesModule._exportChargePDF('${c.id}')" title="PDF" style="color:#ef4444;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><i class="fas fa-file-pdf"></i></button>
                  <button class="btn btn-xs" onclick="ChargesModule._editCharge('${c.id}')" title="Modifier" style="color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2)"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-xs" onclick="ChargesModule._deleteCharge('${c.id}')" title="Supprimer" style="color:#ef4444;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text4)">Aucune charge enregistrée pour cette période</td></tr>`}
          </tbody>
        </table>
      </div>
      ${charges.length > this._displayLimit ? `
        <div style="text-align:center;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px">
          <span style="font-size:12px;color:var(--text4)">Affiché ${Math.min(this._displayLimit, charges.length)} / ${charges.length}</span>
          <button class="btn" onclick="ChargesModule._displayLimit+=50;App.loadModule('charges')" style="background:linear-gradient(135deg,#6366f1,#818cf8);color:white;border:none;border-radius:8px;padding:8px 20px;font-weight:700;font-size:13px">
            <i class="fas fa-arrow-down"></i> Charger plus (+50)
          </button>
        </div>` : ''}
    `;
  },

  _renderRecurring() {
    const list = DB.getAll('recurring_charges') || [];
    const banks = DB.getSettings().banks || [];
    const today = Utils.today();

    const totalMonthlyEst = list.filter(r => r.active !== false).reduce((sum, r) => {
      const a = Number(r.amount) || 0;
      switch(r.frequency) {
        case 'hebdomadaire': return sum + (a * 4.33);
        case 'trimestrielle': return sum + (a / 3);
        case 'semestrielle': return sum + (a / 6);
        case 'annuelle': return sum + (a / 12);
        default: return sum + a;
      }
    }, 0);

    return `
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:24px">
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Modèles Récurrents</div>
          <div style="font-size:24px;font-weight:900;color:var(--primary)">${list.length} charges</div>
        </div>
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Estimation Mensuelle</div>
          <div style="font-size:24px;font-weight:900;color:var(--danger)">${Utils.fmtCurrency(Math.round(totalMonthlyEst))}</div>
        </div>
        <div style="background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text4);font-weight:700;text-transform:uppercase;margin-bottom:4px">Charges Échues à Traiter</div>
          <div style="font-size:24px;font-weight:900;color:#f59e0b">${list.filter(r => r.active !== false && (r.nextDueDate||'') <= today).length}</div>
        </div>
      </div>

      <!-- Table of Recurring Templates -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg3);text-align:left;font-size:11px;color:var(--text3);text-transform:uppercase">
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Désignation & Catégorie</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Fréquence</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border)">Compte Débité</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:right">Montant Prévu</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:center">Prochaine Échéance</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:center">Mode</th>
              <th style="padding:12px 16px;border-bottom:1px solid var(--border);text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map(r => {
              const b = banks.find(x => x.id === r.bankId) || { name: r.bankId === 'caisse' ? 'Caisse Principale' : 'Banque' };
              const isOverdue = r.active !== false && (r.nextDueDate || '') <= today;
              return `
              <tr style="border-bottom:1px solid var(--border)" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
                <td style="padding:12px 16px">
                  <strong style="color:var(--text)">${Utils.escHTML(r.label)}</strong>
                  <div style="font-size:11px;color:var(--text4);margin-top:2px">${Utils.escHTML(r.category || 'Charge d\'exploitation')}</div>
                </td>
                <td style="padding:12px 16px">
                  <span class="badge" style="background:rgba(2,132,199,.1);color:#0284c7;text-transform:capitalize">${r.frequency}</span>
                </td>
                <td style="padding:12px 16px;font-weight:600;color:var(--text2)">
                  <i class="fas ${r.bankId==='caisse'?'fa-cash-register':'fa-university'}"></i> ${Utils.escHTML(b.name)}
                </td>
                <td style="padding:12px 16px;font-weight:900;color:var(--danger);text-align:right">
                  ${Utils.fmtCurrency(r.amount)}
                </td>
                <td style="padding:12px 16px;text-align:center">
                  ${isOverdue
                    ? `<span class="badge badge-danger" style="animation:pulse 2s infinite"><i class="fas fa-exclamation-circle"></i> ${Utils.fmtDate(r.nextDueDate)} (À échéance)</span>`
                    : `<span class="badge badge-success"><i class="fas fa-calendar-check"></i> ${Utils.fmtDate(r.nextDueDate)}</span>`
                  }
                </td>
                <td style="padding:12px 16px;text-align:center">
                  ${r.autoDebit
                    ? `<span style="background:rgba(16,185,129,.12);color:#059669;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700"><i class="fas fa-robot"></i> Auto-décaissement</span>`
                    : `<span style="background:rgba(139,92,246,.12);color:#7c3aed;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700"><i class="fas fa-hand-pointer"></i> Manuel</span>`
                  }
                </td>
                <td style="padding:12px 16px;text-align:right;white-space:nowrap">
                  <button class="btn btn-xs btn-primary" onclick="ChargesModule.executeRecurring('${r.id}')" title="Exécuter et débiter maintenant">
                    <i class="fas fa-play"></i> Exécuter
                  </button>
                  <button class="btn btn-xs btn-outline" style="color:var(--danger);border-color:var(--danger);margin-left:4px" onclick="ChargesModule.deleteRecurring('${r.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text4)">Aucun modèle de charge récurrente configuré</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  },

  async _addCharge() {
    const banks = DB.getSettings().banks || [];
    const categories = [
      'Loyer & Bail commercial',
      'Électricité & Gaz (Sonelgaz)',
      'Eau (Algérienne des Eaux)',
      'Télécom & Internet (Algérie Télécom)',
      'Salaires & Primes RH',
      'Assurances professionnelles',
      'Logiciels & Cloud',
      'Entretien & Maintenance',
      'Impôts & Taxes',
      'Frais de tenue de compte & Pack bancaire',
      'Autre charge'
    ];

    const bankOpts = banks.map(b => `<option value="${b.id}">Banque : ${Utils.escHTML(b.name)}</option>`).join('');
    const catOpts = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const modalHTML = `
      <div style="padding:4px 0">
        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Désignation de la charge</label>
          <input type="text" id="chg_label" class="input" style="width:100%" placeholder="Ex: Facture Sonelgaz 3ème trimestre, Loyer dépôt...">
        </div>
        <div class="form-group mb-2">
          <label style="font-weight:700">Catégorie</label>
          <select id="chg_cat" class="input" style="width:100%">${catOpts}</select>
        </div>
        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Montant (DA)</label>
          <input type="number" id="chg_amount" class="input" style="width:100%;font-size:18px;font-weight:800;text-align:center" min="0" step="any" placeholder="0">
        </div>
        <div class="form-group mb-2">
          <label style="font-weight:700">Source de paiement (Compte débité)</label>
          <select id="chg_source" class="input" style="width:100%">
            <option value="caisse">💵 Caisse Principale (Espèces)</option>
            ${bankOpts}
          </select>
        </div>
        <div class="form-group mb-2">
          <label style="font-weight:700">Date de la charge</label>
          <input type="date" id="chg_date" class="input" style="width:100%" value="${Utils.today()}">
        </div>
      </div>`;

    const r = await Dialog.show({
      title: '💵 Saisir une Charge d\'Exploitation',
      message: modalHTML,
      type: 'info',
      confirmText: 'Enregistrer la Charge',
      cancelText: 'Annuler'
    });

    if (!r) return;

    const label = document.getElementById('chg_label')?.value?.trim();
    const category = document.getElementById('chg_cat')?.value;
    const amount = parseFloat(document.getElementById('chg_amount')?.value || 0);
    const source = document.getElementById('chg_source')?.value || 'caisse';
    const date = document.getElementById('chg_date')?.value || Utils.today();

    if (!label) { Utils.notify('La désignation est obligatoire', 'warning'); return; }
    if (!amount || amount <= 0) { Utils.notify('Montant invalide', 'warning'); return; }

    const conf = await Utils.confirm2(
      'Confirmer l\'enregistrement de la charge ?',
      `Désignation : ${label}\nMontant : ${Utils.fmtCurrency(amount)}\nDébit : ${source === 'caisse' ? 'Caisse Principale' : 'Compte bancaire'}`
    );
    if (!conf) return;

    const u = Auth.getCurrentUser();
    const isCaisse = source === 'caisse';

    // 1. Insert in bank_charges
    const chgDoc = DB.insert('bank_charges', {
      type: 'manual',
      subtype: category,
      label,
      category,
      bankId: source,
      amount,
      date,
      recurring: false,
      createdBy: u?.id,
      createdByName: u?.name,
      createdAt: new Date().toISOString()
    });

    // 2. Insert debit transaction
    if (isCaisse) {
      DB.insert('caisse_admin', {
        type: 'withdrawal',
        source: 'charge',
        amount,
        note: `Charge: ${label} (${category})`,
        userId: u?.id,
        userName: u?.name,
        date
      });
    } else {
      DB.insert('bank_transactions', {
        bankId: source,
        type: 'payment',
        subtype: 'charge',
        amount,
        note: `Charge: ${label} (${category})`,
        date,
        by: u?.id,
        byName: u?.name,
        createdAt: new Date().toISOString()
      });
    }

    Utils.notify(`✅ Charge de ${Utils.fmtCurrency(amount)} enregistrée avec succès`, 'success');
    App.loadModule('charges');
  },

  async _addRecurringCharge() {
    const banks = DB.getSettings().banks || [];
    const categories = [
      'Loyer & Bail commercial',
      'Électricité & Gaz (Sonelgaz)',
      'Eau (Algérienne des Eaux)',
      'Télécom & Internet (Algérie Télécom)',
      'Salaires & Primes RH',
      'Assurances professionnelles',
      'Logiciels & Cloud',
      'Entretien & Maintenance',
      'Impôts & Taxes',
      'Frais de tenue de compte & Pack bancaire',
      'Autre charge'
    ];

    const bankOpts = banks.map(b => `<option value="${b.id}">Banque : ${Utils.escHTML(b.name)}</option>`).join('');
    const catOpts = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const modalHTML = `
      <div style="padding:4px 0">
        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Désignation de la charge récurrente</label>
          <input type="text" id="rc_label" class="input" style="width:100%" placeholder="Ex: Loyer Mensuel Local, Abonnement Internet Fibre...">
        </div>
        <div class="form-group mb-2">
          <label style="font-weight:700">Catégorie</label>
          <select id="rc_cat" class="input" style="width:100%">${catOpts}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="mb-2">
          <div class="form-group">
            <label class="required" style="font-weight:700">Montant périodique (DA)</label>
            <input type="number" id="rc_amount" class="input" style="width:100%" min="0" step="any" placeholder="0">
          </div>
          <div class="form-group">
            <label style="font-weight:700">Fréquence</label>
            <select id="rc_freq" class="input" style="width:100%">
              <option value="mensuelle">Mensuelle (Chaque mois)</option>
              <option value="hebdomadaire">Hebdomadaire (Chaque semaine)</option>
              <option value="trimestrielle">Trimestrielle (Tous les 3 mois)</option>
              <option value="semestrielle">Semestrielle (Tous les 6 mois)</option>
              <option value="annuelle">Annuelle (Tous les ans)</option>
            </select>
          </div>
        </div>
        <div class="form-group mb-2">
          <label style="font-weight:700">Compte débité</label>
          <select id="rc_bank" class="input" style="width:100%">
            <option value="caisse">💵 Caisse Principale (Espèces)</option>
            ${bankOpts}
          </select>
        </div>
        <div class="form-group mb-2">
          <label class="required" style="font-weight:700">Date de première / prochaine échéance</label>
          <input type="date" id="rc_next_date" class="input" style="width:100%" value="${Utils.today()}">
        </div>
        <div class="form-group mb-2" style="background:var(--bg3);padding:10px;border-radius:8px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="rc_auto_debit" checked>
            <span><strong>Activer l'auto-décaissement automatique</strong> (débit automatique surveillé par le système)</span>
          </label>
        </div>
      </div>`;

    const r = await Dialog.show({
      title: '🔄 Configurer une Charge Récurrente',
      message: modalHTML,
      type: 'info',
      confirmText: 'Créer le Modèle Récurrent',
      cancelText: 'Annuler'
    });

    if (!r) return;

    const label = document.getElementById('rc_label')?.value?.trim();
    const category = document.getElementById('rc_cat')?.value;
    const amount = parseFloat(document.getElementById('rc_amount')?.value || 0);
    const frequency = document.getElementById('rc_freq')?.value || 'mensuelle';
    const bankId = document.getElementById('rc_bank')?.value || 'caisse';
    const nextDueDate = document.getElementById('rc_next_date')?.value || Utils.today();
    const autoDebit = document.getElementById('rc_auto_debit')?.checked === true;

    if (!label) { Utils.notify('La désignation est requise', 'warning'); return; }
    if (!amount || amount <= 0) { Utils.notify('Montant invalide', 'warning'); return; }

    DB.insert('recurring_charges', {
      id: 'rc_' + Date.now(),
      label,
      category,
      amount,
      frequency,
      bankId,
      nextDueDate,
      autoDebit,
      active: true,
      lastExecuted: null,
      createdAt: new Date().toISOString()
    });

    Utils.notify(`✅ Charge récurrente "${label}" programmée avec succès`, 'success');
    ChargesModule._tab = 'recurring';
    App.loadModule('charges');
  },

  async executeRecurring(rcId) {
    const r = (DB.getAll('recurring_charges') || []).find(x => x.id === rcId);
    if (!r) return;

    const conf = await Utils.confirm2(
      `Exécuter la charge récurrente "${r.label}" ?`,
      `Montant : ${Utils.fmtCurrency(r.amount)}\nDébit : ${r.bankId === 'caisse' ? 'Caisse Principale' : 'Compte bancaire'}\nDate : ${Utils.today()}`
    );
    if (!conf) return;

    const u = Auth.getCurrentUser();
    const today = Utils.today();
    const isCaisse = r.bankId === 'caisse';

    // 1. Record charge
    DB.insert('bank_charges', {
      type: 'manual',
      subtype: r.category || 'Charge récurrente',
      label: `[Récurrent] ${r.label}`,
      category: r.category,
      bankId: r.bankId,
      amount: r.amount,
      date: today,
      recurring: true,
      recurringId: r.id,
      createdBy: u?.id,
      createdByName: u?.name,
      createdAt: new Date().toISOString()
    });

    // 2. Record transaction
    if (isCaisse) {
      DB.insert('caisse_admin', {
        type: 'withdrawal',
        source: 'charge',
        amount: r.amount,
        note: `Charge récurrente: ${r.label}`,
        userId: u?.id,
        userName: u?.name,
        date: today
      });
    } else {
      DB.insert('bank_transactions', {
        bankId: r.bankId,
        type: 'payment',
        subtype: 'charge',
        amount: r.amount,
        note: `Charge récurrente: ${r.label}`,
        date: today,
        by: u?.id,
        byName: u?.name,
        createdAt: new Date().toISOString()
      });
    }

    // 3. Advance nextDueDate
    const nextDate = new Date(r.nextDueDate || today);
    switch(r.frequency) {
      case 'hebdomadaire': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'trimestrielle': nextDate.setMonth(nextDate.getMonth() + 3); break;
      case 'semestrielle': nextDate.setMonth(nextDate.getMonth() + 6); break;
      case 'annuelle': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      default: nextDate.setMonth(nextDate.getMonth() + 1); // mensuelle
    }
    const newDueDateStr = nextDate.toISOString().split('T')[0];

    DB.update('recurring_charges', r.id, {
      nextDueDate: newDueDateStr,
      lastExecuted: today
    });

    Utils.notify(`✅ Charge récurrente exécutée. Prochaine échéance : ${Utils.fmtDate(newDueDateStr)}`, 'success', 5000);
    App.loadModule('charges');
  },

  async deleteRecurring(rcId) {
    const ok = await Utils.confirm2('Supprimer cette charge récurrente ?', 'Le modèle programmé sera supprimé. Les charges passées restent enregistrées.');
    if (!ok) return;
    DB.delete('recurring_charges', rcId);
    Utils.notify('Charge récurrente supprimée', 'info');
    App.loadModule('charges');
  },

  _showPayrollDetail(id) {
    const charges = DB.getAll('bank_charges');
    const c = charges.find(x => String(x.id) === String(id));
    if (!c) { Utils.notify('Charge introuvable', 'warning'); return; }
    
    let details = c.paieDetails || [];
    const isArray = Array.isArray(details);
    let employees = isArray ? details : (details && details.employeeName ? [details] : []);
    
    // Fallback: if no paieDetails, try to reconstruct from fiches_paie using the month
    if (employees.length === 0 && c.month) {
      const parts = c.month.split('-');
      if (parts.length === 2) {
        const fy = parseInt(parts[0]), fm = parseInt(parts[1]);
        const fiches = DB.getAll('fiches_paie').filter(f => f.year === fy && f.month === fm);
        employees = fiches.map(f => ({
          employeeName: f.userName || '-',
          baseSalary: f.salaireBase || 0,
          daysPresent: f.joursTravailles || 0,
          absences: f.joursAbsence || 0,
          totalWorkingDays: f.joursTotal || 0,
          netPay: f.netPayer || 0,
          poste: f.jobTitle || f.department || ''
        }));
      }
    }
    // Another fallback: parse month from label like "Masse salariale 05/2026"
    if (employees.length === 0 && c.label) {
      const match = c.label.match(/(\d{2})\/(\d{4})/);
      if (match) {
        const fm = parseInt(match[1]), fy = parseInt(match[2]);
        const fiches = DB.getAll('fiches_paie').filter(f => f.year === fy && f.month === fm);
        employees = fiches.map(f => ({
          employeeName: f.userName || '-',
          baseSalary: f.salaireBase || 0,
          daysPresent: f.joursTravailles || 0,
          absences: f.joursAbsence || 0,
          totalWorkingDays: f.joursTotal || 0,
          netPay: f.netPayer || 0,
          poste: f.jobTitle || f.department || ''
        }));
      }
    }
    
    const banks = DB.getSettings().banks || [];
    const bank = banks.find(b => b.id === c.bankId) || { name: c.bankId === 'caisse' ? 'Caisse Principale' : 'Banque' };
    const totalNet = employees.length > 0 ? employees.reduce((s, e) => s + (e.netPay || 0), 0) : c.amount;
    const totalPresent = employees.reduce((s, e) => s + (e.daysPresent || 0), 0);
    const totalAbsent = employees.reduce((s, e) => s + (e.absences || 0), 0);
    
    let empRows = employees.map(e => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:6px 10px;font-weight:600">${Utils.escHTML(e.employeeName || '-')}</td>
        <td style="padding:6px 10px;font-size:11px;color:var(--text4)">${Utils.escHTML(e.poste || e.role || '-')}</td>
        <td style="padding:6px 10px;text-align:center">${Utils.fmtCurrency(e.baseSalary || 0)}</td>
        <td style="padding:6px 10px;text-align:center;color:var(--success);font-weight:700">${e.daysPresent || 0}/${e.totalWorkingDays || 0}</td>
        <td style="padding:6px 10px;text-align:center;color:var(--danger);font-weight:700">${e.absences || 0}</td>
        <td style="padding:6px 10px;text-align:right;font-weight:800;color:var(--primary)">${Utils.fmtCurrency(e.netPay || 0)}</td>
      </tr>`).join('');
    
    const html = `
    <div style="padding:0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:14px;background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.08));border-radius:10px">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900"><i class="fas fa-users"></i></div>
        <div>
          <div style="font-weight:800;font-size:16px;color:var(--text)">Masse Salariale — ${Utils.escHTML(c.month || '')}</div>
          <div style="font-size:12px;color:var(--text4)">${employees.length} employés · ${Utils.escHTML(bank.name)}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:11px;color:var(--text4)">Total</div>
          <div style="font-weight:900;font-size:18px;color:var(--primary)">${Utils.fmtCurrency(totalNet)}</div>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:rgba(16,185,129,.06);padding:10px;border-radius:8px;text-align:center;border:1px solid rgba(16,185,129,.15)">
          <div style="font-size:11px;color:#059669;margin-bottom:3px">Total Présences</div>
          <div style="font-weight:800;font-size:18px;color:#10b981">${totalPresent} j</div>
        </div>
        <div style="background:rgba(239,68,68,.06);padding:10px;border-radius:8px;text-align:center;border:1px solid rgba(239,68,68,.15)">
          <div style="font-size:11px;color:#dc2626;margin-bottom:3px">Total Absences</div>
          <div style="font-weight:800;font-size:18px;color:#ef4444">${totalAbsent} j</div>
        </div>
        <div style="background:rgba(14,165,233,.06);padding:10px;border-radius:8px;text-align:center;border:1px solid rgba(14,165,233,.15)">
          <div style="font-size:11px;color:#0284c7;margin-bottom:3px">Date / Par</div>
          <div style="font-weight:700;font-size:12px;color:#0ea5e9">${Utils.fmtDate(c.date)}<br>${Utils.escHTML(c.createdByName || '-')}</div>
        </div>
      </div>
      
      <div style="max-height:350px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:var(--bg3);z-index:1">
            <tr style="border-bottom:2px solid var(--border)">
              <th style="padding:8px 10px;text-align:left">Employé</th>
              <th style="padding:8px 10px;text-align:left">Poste</th>
              <th style="padding:8px 10px;text-align:center">Base</th>
              <th style="padding:8px 10px;text-align:center">Prés.</th>
              <th style="padding:8px 10px;text-align:center">Abs.</th>
              <th style="padding:8px 10px;text-align:right">Net</th>
            </tr>
          </thead>
          <tbody>${empRows}</tbody>
          <tfoot>
            <tr style="background:var(--bg3);border-top:2px solid var(--primary)">
              <td colspan="3" style="padding:8px 10px;font-weight:900">TOTAL (${employees.length})</td>
              <td style="padding:8px 10px;text-align:center;font-weight:800;color:var(--success)">${totalPresent}</td>
              <td style="padding:8px 10px;text-align:center;font-weight:800;color:var(--danger)">${totalAbsent}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
    
    Dialog.show({
      title: `<i class="fas fa-file-invoice-dollar" style="color:#6366f1"></i> Détails Masse Salariale — ${Utils.escHTML(c.month || '')}`,
      message: html,
      confirmText: 'Fermer',
      cancelText: null,
      type: 'info'
    });
  },

  async _editCharge(id) {
    const charges = DB.getAll('bank_charges');
    const c = charges.find(x => String(x.id) === String(id));
    if (!c) { Utils.notify('Charge introuvable', 'warning'); return; }

    const banks = DB.getSettings().banks || [];
    const categories = [
      'Loyer & Bail commercial', 'Electricite & Gaz (Sonelgaz)', 'Eau (ADE)',
      'Telecom & Internet', 'Salaires & Primes RH', 'Assurances professionnelles',
      'Logiciels & Cloud', 'Entretien & Maintenance', 'Impots & Taxes',
      'Frais bancaires', 'Autre charge'
    ];
    const bankOpts = banks.map(b => `<option value="${b.id}" ${c.bankId===b.id?'selected':''}>${Utils.escHTML(b.name)}</option>`).join('');
    const catOpts = categories.map(cat => `<option value="${cat}" ${c.category===cat?'selected':''}>${cat}</option>`).join('');

    const r = await Dialog.show({
      title: 'Modifier la Charge',
      message: `
        <div style="padding:4px 0">
          <div class="form-group mb-2"><label style="font-weight:700">Designation</label>
            <input type="text" id="edit_chg_label" class="input" style="width:100%" value="${Utils.escHTML(c.label||'')}">
          </div>
          <div class="form-group mb-2"><label style="font-weight:700">Categorie</label>
            <select id="edit_chg_cat" class="input" style="width:100%">${catOpts}</select>
          </div>
          <div class="form-group mb-2"><label style="font-weight:700">Montant (DA)</label>
            <input type="number" id="edit_chg_amount" class="input" style="width:100%;font-size:18px;font-weight:800;text-align:center" min="0" step="any" value="${c.amount||0}">
          </div>
          <div class="form-group mb-2"><label style="font-weight:700">Source de paiement</label>
            <select id="edit_chg_source" class="input" style="width:100%">
              <option value="caisse" ${c.bankId==='caisse'?'selected':''}>Caisse Principale</option>
              ${bankOpts}
            </select>
          </div>
          <div class="form-group mb-2"><label style="font-weight:700">Date</label>
            <input type="date" id="edit_chg_date" class="input" style="width:100%" value="${c.date||Utils.today()}">
          </div>
        </div>`,
      type: 'info', confirmText: 'Enregistrer', cancelText: 'Annuler'
    });
    if (!r) return;

    const newLabel = document.getElementById('edit_chg_label')?.value?.trim();
    const newCat = document.getElementById('edit_chg_cat')?.value;
    const newAmount = parseFloat(document.getElementById('edit_chg_amount')?.value || 0);
    const newSource = document.getElementById('edit_chg_source')?.value || 'caisse';
    const newDate = document.getElementById('edit_chg_date')?.value || c.date;

    if (!newLabel) { Utils.notify('Designation obligatoire', 'warning'); return; }
    if (newAmount <= 0) { Utils.notify('Montant invalide', 'warning'); return; }

    const oldAmount = c.amount || 0;
    const oldSource = c.bankId || 'caisse';
    const diff = newAmount - oldAmount;
    const u = Auth.getCurrentUser();

    // Update the charge record
    c.label = newLabel;
    c.category = newCat;
    c.subtype = newCat;
    c.amount = newAmount;
    c.bankId = newSource;
    c.date = newDate;
    c.modifiedAt = new Date().toISOString();
    c.modifiedBy = u?.name;
    DB.rawSet('bank_charges', charges);

    // If amount or source changed, adjust financial records
    if (diff !== 0 || oldSource !== newSource) {
      // Reverse old transaction
      if (oldSource === 'caisse') {
        DB.insert('caisse_admin', {
          type: 'deposit', source: 'charge_reversal',
          amount: oldAmount,
          note: `Ajustement charge: ${newLabel} (ancien montant annule)`,
          userId: u?.id, userName: u?.name, date: Utils.today()
        });
      }
      // Create new transaction with new amount/source
      if (newSource === 'caisse') {
        DB.insert('caisse_admin', {
          type: 'withdrawal', source: 'charge',
          amount: newAmount,
          note: `Charge modifiee: ${newLabel}`,
          userId: u?.id, userName: u?.name, date: newDate
        });
      } else {
        DB.insert('bank_transactions', {
          bankId: newSource, type: 'payment', subtype: 'charge',
          amount: newAmount,
          note: `Charge modifiee: ${newLabel}`,
          date: newDate, by: u?.id, byName: u?.name,
          createdAt: new Date().toISOString()
        });
      }
    }

    Utils.notify('Charge modifiee avec succes', 'success');
    App.loadModule('charges');
  },

  _exportChargePDF(id) {
    const c = DB.getAll('bank_charges').find(x => String(x.id) === String(id));
    if (!c) { Utils.notify('Charge introuvable', 'warning'); return; }
    const banks = DB.getSettings().banks || [];
    const bank = banks.find(b => b.id === c.bankId) || { name: c.bankId === 'caisse' ? 'Caisse Principale' : 'Banque' };
    const settings = DB.getSettings();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'Entreprise', pw/2, y, { align: 'center' }); y += 8;
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text('Reçu de Charge / Frais', pw/2, y, { align: 'center' }); y += 10;

    // Line
    doc.setDrawColor(100); doc.setLineWidth(0.5); doc.line(15, y, pw-15, y); y += 8;

    // Info rows
    doc.setFontSize(11);
    const info = [
      ['Libellé :', c.label || c.subtype || '-'],
      ['Catégorie :', c.category || '-'],
      ['Date :', Utils.fmtDate(c.date)],
      ['Source :', bank.name],
      ['Type :', c.type === 'auto' ? 'Automatique' : 'Manuel'],
      ['Créé par :', c.createdByName || '-'],
    ];
    info.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold'); doc.text(k, 20, y);
      doc.setFont('helvetica', 'normal'); doc.text(String(v), 65, y);
      y += 7;
    });
    y += 3;

    // Amount box
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(20, y, pw-40, 14, 3, 3, 'F');
    doc.setTextColor(255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(`Montant : -${Utils.fmtCurrency(c.amount)}`, pw/2, y+9, { align: 'center' });
    doc.setTextColor(0); y += 22;

    // If payroll charge, show employee table
    if (c.paieValidation) {
      let employees = [];
      if (c.paieDetails && Array.isArray(c.paieDetails)) {
        employees = c.paieDetails;
      } else if (c.month) {
        const p = c.month.split('-');
        if (p.length===2) employees = DB.getAll('fiches_paie').filter(f=>f.year===parseInt(p[0])&&f.month===parseInt(p[1])).map(f=>({employeeName:f.userName,baseSalary:f.salaireBase||0,daysPresent:f.joursTravailles||0,netPay:f.netPayer||0,poste:f.jobTitle||''}));
      }
      if (employees.length > 0) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Détail par Employé :', 20, y); y += 6;
        doc.autoTable({
          startY: y,
          head: [['Employé', 'Poste', 'Jours Prés.', 'Net à Payer']],
          body: employees.map(e => [e.employeeName, e.poste||'-', String(e.daysPresent||0), Utils.fmtCurrency(e.netPay||0)]),
          foot: [['TOTAL', '', '', Utils.fmtCurrency(employees.reduce((s,e)=>s+(e.netPay||0),0))]],
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [99,102,241], textColor: 255 },
          footStyles: { fillColor: [240,240,240], fontStyle: 'bold' },
          margin: { left: 20, right: 20 }
        });
      }
    }

    doc.save(`Charge_${(c.label||'').replace(/[^a-zA-Z0-9]/g,'_').substring(0,30)}_${c.date||''}.pdf`);
    Utils.notify('PDF généré avec succès', 'success');
  },

  async _deleteCharge(id) {
    const c = DB.getAll('bank_charges').find(x => String(x.id) === String(id));
    if (!c) return;

    const ok = await Utils.confirm2(
      'Supprimer cette charge ?',
      `${c.label || 'Charge'} — ${Utils.fmtCurrency(c.amount||0)}\n\nLe montant sera re-credite dans ${c.bankId === 'caisse' ? 'la caisse' : 'le compte bancaire'}.`
    );
    if (!ok) return;

    const u = Auth.getCurrentUser();

    // Reverse the financial impact
    if (c.bankId === 'caisse' || !c.bankId) {
      DB.insert('caisse_admin', {
        type: 'deposit', source: 'charge_reversal',
        amount: c.amount || 0,
        note: `Annulation charge: ${c.label || 'Sans designation'}`,
        userId: u?.id, userName: u?.name,
        date: Utils.today()
      });
    } else {
      DB.insert('bank_transactions', {
        bankId: c.bankId, type: 'deposit', subtype: 'charge_reversal',
        amount: c.amount || 0,
        note: `Annulation charge: ${c.label || 'Sans designation'}`,
        date: Utils.today(), by: u?.id, byName: u?.name,
        createdAt: new Date().toISOString()
      });
    }

    DB.delete('bank_charges', id);
    Utils.notify('Charge supprimee et montant re-credite', 'success');
    App.loadModule('charges');
  }
};
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


// ── Window Aliases for Multi-Portal Support ──
window.BonChargementModule = BLModule;
window.SupplierPortalModule = SupplierPortalModule;
window.BCSupervisionModule = BCSupervisionModule;
window.BCHSupervisionModule = BCSupervisionModule;
