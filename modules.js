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
  closeModal() { document.getElementById('modalOverlay')?.classList.remove('active'); },
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
    const brs = DB.getAll('brs');
    const bls = DB.getAll('bls');
    const today = Utils.today();
    const session = SessionMgr.getTodaySession(u.id);
    const todayBRs = brs.filter(b => (b.date||'').slice(0,10) === today && b.createdBy === u.id);
    const todayTotal = todayBRs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const openBRs = brs.filter(b => b.status === 'open' || !b.status).length;
    const openBLs = bls.filter(b => b.status === 'open' || !b.status).length;

    let vaultBalance = 0;
    if (Auth.isAdmin()) {
      const ca = DB.getAll('caisse_admin');
      vaultBalance = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+(Number(t.amount)||0),0)
                   - ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+(Number(t.amount)||0),0);
    }

    const sessionBanner = (!session && u.role !== 'admin') ? `
    <div class="alert alert-warning mb-2" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="fas fa-sun"></i> ${T.get('caisse_no_session')}</span>
      <button class="btn btn-warning btn-sm" onclick="CaisseModule.showMorningPrompt()">
        <i class="fas fa-play-circle"></i> ${T.get('caisse_start_now')}
      </button>
    </div>` : '';

    const recentBRs = [...brs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
    const suppliers = DB.getAll('suppliers');
    const supMap = {}; suppliers.forEach(s=>supMap[s.id]=s);

    return `<div style="padding:24px">
    ${sessionBanner}
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon blue"><i class="fas fa-file-import"></i></div>
        <div><div class="kpi-label">${T.get('stat_br_total')} (ouverts)</div><div class="kpi-value">${openBRs}</div><div class="kpi-sub">${brs.length} total</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon orange"><i class="fas fa-file-export"></i></div>
        <div><div class="kpi-label">${T.get('stat_bl_total')} (ouverts)</div><div class="kpi-value">${openBLs}</div><div class="kpi-sub">${bls.length} total</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon green"><i class="fas fa-coins"></i></div>
        <div><div class="kpi-label">${T.get('stat_caisse')} (${T.isRTL()?"اليوم":"aujourd'hui"})</div><div class="kpi-value" style="font-size:18px">${Utils.fmtCurrency(todayTotal)}</div><div class="kpi-sub">${todayBRs.length} BR</div></div>
      </div>
      ${Auth.isAdmin() ? `<div class="kpi-card">
        <div class="kpi-icon purple"><i class="fas fa-vault"></i></div>
        <div><div class="kpi-label">${T.get('adm_balance')}</div><div class="kpi-value" style="font-size:18px">${Utils.fmtCurrency(vaultBalance)}</div><div class="kpi-sub">${T.get('nav_admin_caisse')}</div></div>
      </div>` : ''}
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-history"></i> ${T.isRTL()?"آخر وصولات الاستلام":"Derniers BR"}</h3>
          <button class="btn btn-sm btn-outline" onclick="App.loadModule('brs')"><i class="fas fa-arrow-right"></i> ${T.get('view')} ${T.get('all')}</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>${T.get('col_ref')}</th><th>${T.get('col_date')}</th><th>${T.get('col_supplier')}</th><th>${T.get('col_total_ttc')}</th><th>${T.get('col_status')}</th></tr></thead>
            <tbody>
              ${recentBRs.length ? recentBRs.map(br=>`<tr>
                <td><strong>${Utils.escHTML(br.ref||'')}</strong></td>
                <td>${Utils.fmtDate(br.date)}</td>
                <td>${Utils.escHTML(supMap[br.supplierId]?.name||'-')}</td>
                <td class="fw-bold text-primary">${Utils.fmtCurrency(br.totalTTC)}</td>
                <td>${Utils.statusBadge(br.status||'open')}</td>
              </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><i class="fas fa-inbox"></i><p>${T.isRTL()?"لا توجد وصولات":"Aucun BR"}</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-info-circle"></i> ${T.isRTL()?"دليل سريع":"Guide rapide"}</h3></div>
        <div class="card-body">
          ${[
            ['1','fa-file-import','blue','Créer un BR','Module BR → Nouveau BR → Remplir les articles → Enregistrer'],
            ['2','fa-file-export','green','Générer un BL','Sur la ligne BR → bouton vert "Générer BL" → Saisir camion/chauffeur'],
            ['3','fa-check-circle','orange','Confirmer livraison','Sur le BL → "Confirmer Livraison" → Verrouille définitivement'],
            ['4','fa-cash-register','purple','Clôture journée','Ma Caisse → Clôture → Saisir espèces + monnaie'],
          ].map(([n,icon,color,title,desc])=>`
          <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">
            <div class="kpi-icon ${color}" style="width:36px;height:36px;font-size:14px;flex-shrink:0"><i class="fas ${icon}"></i></div>
            <div><strong style="color:var(--text);font-size:13px">${title}</strong><p style="color:var(--text3);font-size:12px;margin-top:3px">${desc}</p></div>
          </div>`).join('')}
        </div>
      </div>
    </div></div>`;
  }
};

// ═══════════════════════════════════════════════════════════════
// BR MODULE
// ═══════════════════════════════════════════════════════════════
const BRModule = {
  _filters: { q:'', supplierId:'all', status:'all', year:'all', createdBy:'all', dateFrom:'', dateTo:'', sortDir:'desc' },
  _lineCount: 0,

  render() {
    const { q, status, supplierId, year, createdBy, dateFrom, dateTo } = this._filters;
    const suppliers = DB.getAll('suppliers');
    const supMap = {}; suppliers.forEach(s=>supMap[s.id]=s);
    const years = [...new Set(DB.getAll('brs').map(b=>b.year).filter(Boolean))].sort((a,b)=>b-a);

    let items = DB.getAll('brs');
    if (!Auth.isAdmin()) items = items.filter(b => b.createdBy === Auth.getCurrentUser()?.id);
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
    DB.getAll('bls').forEach(bl=>blMap[bl.brId]=bl);

    return `<div style="padding:24px">
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-file-import"></i> ${T.get('br_title')}</h3>
        <div class="card-actions">
          <span class="badge badge-secondary">${items.length}</span>
          <button class="btn btn-outline btn-sm" onclick="BRModule.exportBRCSV()" title="Exporter CSV"><i class="fas fa-file-csv"></i> CSV</button>
          <button class="btn btn-primary" onclick="BRModule.showCreate()"><i class="fas fa-plus"></i> ${T.get('br_new')}</button>
        </div>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:2;min-width:180px">
          <label>${T.get('search')}</label>
          <input type="text" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
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
            <th>${T.get('col_status')}</th><th>${T.get('col_actions')}</th>
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
                <td>${Utils.fmtDate(br.date)}</td>
                <td>${Utils.escHTML(sup?.name||'-')}</td>
                <td>${Utils.fmtCurrency(br.totalHT)}</td>
                <td>${Utils.fmtCurrency(br.timbreAmount)}</td>
                <td class="fw-bold text-primary">${Utils.fmtCurrency(br.totalTTC)}</td>
                <td>${Utils.statusBadge(br.status||'open')}</td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="BRModule.showDetail(${br.id})" title="${T.get('details')}"><i class="fas fa-eye"></i></button>
                  ${!hasBL && !isLocked?`<button class="btn-quick" onclick="BLModule.showGenerate(${br.id})" title="${T.get('br_gen_bl')}"><i class="fas fa-truck"></i> ${T.get('br_gen_bl_short')}</button>`:''}
                  ${canEdit?`<button class="btn btn-xs btn-outline" onclick="BRModule.showEdit(${br.id})" title="${T.get('edit')}"><i class="fas fa-edit"></i></button>`:''}
                  <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBR(${br.id})" title="${T.get('pdf')}"><i class="fas fa-file-pdf"></i></button>
                  ${canDel?`<button class="btn btn-xs btn-danger" onclick="BRModule.deleteBR(${br.id})" title="${T.get('delete')}"><i class="fas fa-trash"></i></button>`:''}
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-file-import"></i><h4>${T.get('no_data')}</h4><p>${T.get('br_new')}</p></div></td></tr>`}
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
    if (des) des.value = name;
    if (u && unit) u.value = unit;
    if (p) p.value = price;
    this._closeAC(idx);
    this._recalcLine(idx);
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
    const autoTimbre = DB.calcTimbre(totalHT);
    const timbreInput = document.getElementById('br-timbre');
    if (timbreInput && !timbreInput.dataset.manual) timbreInput.value = autoTimbre.toFixed(2);
    const timbre   = parseFloat(timbreInput?.value)||0;
    const totalTTC = totalHT + tva + timbre;

    const el = id => document.getElementById(id);
    if (el('br-total-ht'))       el('br-total-ht').textContent       = Utils.fmtCurrency(totalHT);
    if (el('br-total-tva'))      el('br-total-tva').textContent      = Utils.fmtCurrency(tva);
    if (el('br-tva-pct'))        el('br-tva-pct').textContent        = tvaRate + '%';
    if (el('br-total-timbre-disp')) el('br-total-timbre-disp').textContent = Utils.fmtCurrency(timbre);
    if (el('br-total-ttc'))      el('br-total-ttc').textContent      = Utils.fmtCurrency(totalTTC);
    if (el('br-timbre-auto'))    el('br-timbre-auto').textContent    = Utils.fmtCurrency(autoTimbre);
    if (el('br-timbre-auto2'))   el('br-timbre-auto2').textContent   = '(' + Utils.fmtCurrency(autoTimbre) + ')';
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

  _modalBody(br=null) {
    const year = new Date().getFullYear();
    const nextNum = DB.getNextBRNum();
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
        <input type="number" id="br-timbre" value="${(br?.timbreAmount||0).toFixed(2)}" min="0" step="any"
          oninput="this.dataset.manual='1';BRModule._recalcTotals()">
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

  showCreate() {
    const body = this._modalBody(null);
    UI.showModal(`<i class="fas fa-file-import"></i> ${T.get('br_new')}`, body, `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-outline" onclick="BRModule._saveBR(null,true)"><i class="fas fa-print"></i> Sauver & PDF</button>
      <button class="btn btn-primary" onclick="BRModule._saveBR(null,false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'xl');
    setTimeout(()=>BRModule._recalcTotals(),80);
  },

  showEdit(id) {
    const br = DB.getById('brs', id);
    if (!br) return;
    const body = this._modalBody(br);
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')} BR — ${br.ref}`, body, `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="BRModule._saveBR(${id},false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'xl');
    setTimeout(()=>BRModule._recalcTotals(),80);
  },

  _saveBR(editId, andPrint) {
    const brNum    = parseInt(document.getElementById('br-num')?.value);
    const year     = parseInt(document.getElementById('br-year')?.value) || new Date().getFullYear();
    const supplierId = parseInt(document.getElementById('br-supplier')?.value);
    const date     = document.getElementById('br-date')?.value || Utils.today();
    const notes    = document.getElementById('br-notes')?.value || '';
    const extraFees= parseFloat(document.getElementById('br-extra')?.value)||0;
    const timbre   = parseFloat(document.getElementById('br-timbre')?.value)||0;
    const tvaRate  = parseFloat(document.getElementById('br-tva-rate')?.value) ?? 19;
    const receivedBy  = (document.getElementById('br-receiver')?.value||Auth.getCurrentUser()?.name||'').trim();
    const controlledBy= (document.getElementById('br-controller')?.value||'').trim();

    if (!supplierId) { Utils.notify('Sélectionnez un fournisseur', 'error'); return; }
    if (!brNum || brNum<1) { Utils.notify('Numéro BR invalide', 'error'); return; }
    if (DB.isBRNumTaken(brNum, year, editId)) { Utils.notify('Ce numéro BR est déjà utilisé', 'error'); return; }

    const lines = this._getLines();
    if (!lines.length) { Utils.notify('Ajoutez au moins un article', 'error'); return; }

    const totalHT  = lines.reduce((s,l)=>s+l.total,0) + extraFees;
    const tvaAmount = totalHT * tvaRate / 100;
    const totalTTC = totalHT + tvaAmount + timbre;
    const suppAbbrev = DB.getById('suppliers', supplierId)?.abbrev || '';
    const ref      = DB.buildBRRef(brNum, year, suppAbbrev);

    const data = {
      ref, brNum, year, supplierId, date, lines, extraFees,
      totalHT, tvaRate, tvaAmount, timbreAmount: timbre, totalTTC,
      notes, receivedBy, controlledBy, status: 'open'
    };

    let savedBR;
    if (editId) {
      savedBR = DB.update('brs', editId, data);
      const bl = DB.getAll('bls').find(b=>b.brId===editId);
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
    const bl = DB.getAll('bls').find(b=>b.brId===id);
    const isLocked = br.status==='delivered'||br.status==='locked';
    const canEdit = Auth.canEdit(br);

    const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${Utils.statusBadge(br.status||'open')}
      ${isLocked?`<span class="badge badge-danger"><i class="fas fa-lock"></i> ${T.get('locked')}</span>`:''}
    </div>
    <table class="detail-table">
      <tr><th>${T.get('col_ref')}</th><td><strong>${Utils.escHTML(br.ref||'')}</strong></td></tr>
      <tr><th>${T.get('br_date')}</th><td>${Utils.fmtDate(br.date)}</td></tr>
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
    ${!bl&&!isLocked?`<button class="btn btn-success" onclick="UI.closeModal();BLModule.showGenerate(${id})"><i class="fas fa-truck"></i> ${T.get('br_gen_bl')}</button>`:''}
    <button class="btn btn-outline" onclick="PDFGen.exportBR(${id})"><i class="fas fa-file-pdf"></i> PDF</button>
    <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('close')}</button>`;
    UI.showModal(`<i class="fas fa-file-import"></i> ${br.ref}`, body, footer, 'lg');
  },

  deleteBR(id) {
    if (!confirm(T.get('delete')+(T.isRTL()?' هذا الوصل؟':' ce BR ?'))) return;
    const bl = DB.getAll('bls').find(b=>b.brId===id);
    if (bl) {
      if (!confirm((T.isRTL()?'يوجد BL مرتبط. حذف الاثنين؟':'Un BL est lié à ce BR. Supprimer les deux ?'))) return;
      DB.delete('bls', bl.id);
    }
    DB.delete('brs', id);
    Utils.notify((T.isRTL()?'تم حذف الوصل':'BR supprimé'), 'success');
    App.loadModule('brs');
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
    const { q, status } = this._filters;
    const clients = DB.getAll('clients');
    const cliMap = {}; clients.forEach(c=>cliMap[c.id]=c);
    const brMap = {}; DB.getAll('brs').forEach(b=>brMap[b.id]=b);

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
          <button class="btn btn-outline btn-sm" onclick="BLModule.exportBLCSV()" title="Exporter CSV"><i class="fas fa-file-csv"></i> CSV</button>
          <button class="btn btn-success" onclick="BLModule.showNewBL()">
            <i class="fas fa-plus"></i> ${T.get('bl_new')}
          </button>
        </div>
      </div>
      <div class="filters-bar">
        <div class="filter-group" style="flex:2;min-width:180px">
          <label>${T.get('search')}</label>
          <input type="text" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
            oninput="BLModule._filters.q=this.value;App.reloadDebounced('bls')">
        </div>
        <div class="filter-group">
          <label>${T.get('col_client')}</label>
          <select onchange="BLModule._filters.clientId=this.value;App.loadModule('bls')">
            <option value="all">${T.get('all')}</option>
            ${DB.getAll('clients').sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${String(BLModule._filters.clientId)===String(c.id)?'selected':''}>${Utils.escHTML(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.get('col_status')}</label>
          <select onchange="BLModule._filters.status=this.value;App.loadModule('bls')">
            <option value="all">${T.get('all')}</option>
            <option value="open" ${status==='open'?'selected':''}>${T.get('st_open')}</option>
            <option value="delivered" ${status==='delivered'?'selected':''}>${T.get('st_delivered')}</option>
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
            ${DB.getAll('users').map(u=>`<option value="${u.id}" ${String(BLModule._filters.createdBy)===String(u.id)?'selected':''}>${Utils.escHTML(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>${T.isRTL()?'السائق':'Chauffeur'}</label>
          <select onchange="BLModule._filters.driver=this.value;App.loadModule('bls')" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);height:36px">
            <option value="all">${T.get('all')}</option>
            ${[...new Set(DB.getAll('bls').map(b=>b.driverName).filter(Boolean))].sort().map(d=>`<option value="${d}" ${BLModule._filters.driver===d?'selected':''}>${Utils.escHTML(d)}</option>`).join('')}
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
        <div class="filter-group" style="align-self:flex-end">
          <button class="btn btn-outline" onclick="BLModule._filters={q:'',status:'all',clientId:'all',dateFrom:'',dateTo:'',createdBy:'all',driver:'all',sortDir:'desc'};App.loadModule('bls')" title="${T.isRTL()?'إعادة تعيين':'Réinitialiser'}"><i class="fas fa-times"></i></button>
          <button class="btn btn-outline" onclick="BLModule.exportBLCSV()" title="Excel"><i class="fas fa-file-excel" style="color:#1d6f42"></i></button>
        </div>
      </div>
      <div class="table-shell">
        <table class="data-table">
          <thead><tr>
            <th>${T.get('col_ref')}</th><th>${T.get('bl_linked_br')}</th><th>${T.get('col_date')}</th>
            <th>${T.get('col_client')}</th><th>${T.get('col_driver')}</th><th>${T.get('col_truck')}</th>
            <th>${T.get('col_total_ttc')}</th><th>${T.get('col_status')}</th><th>${T.get('col_actions')}</th>
          </tr></thead>
          <tbody>
            ${items.length ? items.map(bl=>{
              const br = brMap[bl.brId];
              const cli = cliMap[bl.clientId];
              const isLocked = bl.status==='delivered'||bl.status==='locked';
              return `<tr>
                <td><strong>${Utils.escHTML(bl.ref||'')}</strong>${isLocked?` <i class="fas fa-lock locked-icon"></i>`:''}</td>
                <td>${br?`<span class="badge badge-primary">${Utils.escHTML(br.ref)}</span>`:'-'}</td>
                <td>${Utils.fmtDate(bl.date)}</td>
                <td>${Utils.escHTML(cli?.name||'-')}</td>
                <td>${Utils.escHTML(bl.driverName||'-')}</td>
                <td><code>${Utils.escHTML(bl.truckIMM||'-')}</code></td>
                <td class="fw-bold text-primary">${Utils.fmtCurrency(br?.totalTTC||0)}</td>
                <td>${Utils.statusBadge(bl.status||'open')}</td>
                <td class="td-actions">
                  <button class="btn btn-xs btn-outline" onclick="BLModule.showDetail(${bl.id})" title="${T.get('details')}"><i class="fas fa-eye"></i></button>
                  ${!isLocked?`<button class="btn btn-xs btn-outline" onclick="BLModule.showEdit(${bl.id})" title="${T.get('edit')}"><i class="fas fa-edit"></i></button>`:''}
                  ${!isLocked?`<button class="btn btn-xs btn-success" onclick="BLModule.confirmDelivery(${bl.id})" title="${T.get('bl_delivered')}"><i class="fas fa-check-circle"></i></button>`:''}
                  <button class="btn btn-xs btn-outline" onclick="PDFGen.exportBL(${bl.id})" title="PDF"><i class="fas fa-file-pdf"></i></button>
                  ${(!isLocked||Auth.isAdmin())?`<button class="btn btn-xs btn-danger" onclick="BLModule.deleteBL(${bl.id})" title="${T.get('delete')}"><i class="fas fa-trash"></i></button>`:''}
                </td>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-export"></i><h4>${T.get('no_data')}</h4></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },


  showNewBL() {
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
    const br = DB.getById('brs', brId);
    if (!br) return;
    UI.showModal(`<i class="fas fa-truck"></i> ${T.get('bl_from_br')} — ${br.ref}`, this._blModalBody(br, null), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-outline" onclick="BLModule._saveBL(${brId},null,true)"><i class="fas fa-print"></i> Sauver & PDF</button>
      <button class="btn btn-success" onclick="BLModule._saveBL(${brId},null,false)"><i class="fas fa-truck"></i> Générer BL</button>`, 'xl');
    setTimeout(() => BLModule._recalcBLTotals(), 80);
  },

  showEdit(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    if (!br) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')} BL — ${bl.ref}`, this._blModalBody(br, bl), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="BLModule._saveBL(${bl.brId},${blId},false)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'xl');
    setTimeout(() => BLModule._recalcBLTotals(), 80);
  },

  _onDriverInput(val) {
    const dd = document.getElementById('bl-driver-ac');
    if (!dd) return;
    const drivers = DB.getAll('drivers').filter(d=>d.name.toLowerCase().includes((val||'').toLowerCase())).slice(0,8);
    if (!val || !drivers.length) { dd.style.display='none'; return; }
    dd.innerHTML = drivers.map(d=>
      `<div class="autocomplete-item" onmousedown="BLModule._selectDriver('${Utils.escHTML(d.name).replace(/'/g,"\\'").replace(/"/g,'&quot;')}','${(d.imm||'').replace(/'/g,"\\'")}')"><span>${Utils.escHTML(d.name)}</span><span class="ac-price">${d.imm||''}</span></div>`
    ).join('');
    dd.style.display='block';
  },
  _closeDriverAC() {
    const dd = document.getElementById('bl-driver-ac');
    if (dd) dd.style.display='none';
    const name = document.getElementById('bl-driver')?.value;
    if (name) { const imm=DB.getDriverIMM(name); if(imm){const t=document.getElementById('bl-truck');if(t&&!t.value)t.value=imm;} }
  },
  _selectDriver(name, imm) {
    const di=document.getElementById('bl-driver'); if(di) di.value=name;
    const ti=document.getElementById('bl-truck');  if(ti&&imm) ti.value=imm;
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
      </div>
      <div class="totals-box" style="min-width:280px">
        <div class="totals-row"><label>${T.isRTL()?'المجموع قبل الرسوم':'Montant HT'}</label><span id="bl-tot-ht">0,00 DA</span></div>
        <div class="totals-row"><label>${T.isRTL()?'TVA':'Taxes (TVA)'} <span id="bl-tva-pct" style="color:var(--text4);font-size:10px"></span></label><span id="bl-tot-tva">0,00 DA</span></div>
        <div class="totals-row"><label>${T.isRTL()?'الطابع الجبائي':'Timbre Fiscal'}</label><span id="bl-tot-timbre">0,00 DA</span></div>
        <div class="totals-row grand-total"><label>${T.isRTL()?'المجموع الشامل':'TOTAL TTC'}</label><span id="bl-tot-ttc">0,00 DA</span></div>
      </div>
    </div>`;
  },

  _updateClientCredit(clientId) {
    const nameEl    = document.getElementById('bl-client-name-disp');
    const detailEl  = document.getElementById('bl-client-details');
    if (!clientId) {
      if (nameEl) nameEl.textContent = '—';
      if (detailEl) detailEl.innerHTML = '';
      return;
    }
    const cli = DB.getById('clients', clientId);
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
    const timbre   = DB.calcTimbre(ht);
    const el = n => document.getElementById(n);
    if (el('bl-tot-ht'))     el('bl-tot-ht').textContent     = Utils.fmtCurrency(ht);
    if (el('bl-tot-tva'))    el('bl-tot-tva').textContent    = Utils.fmtCurrency(tva);
    if (el('bl-tva-pct'))    el('bl-tva-pct').textContent    = tvaRate + '%';
    if (el('bl-tot-timbre')) el('bl-tot-timbre').textContent = Utils.fmtCurrency(timbre);
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

  _saveBL(brId, editBlId, andPrint) {
    const driverName = (document.getElementById('bl-driver')?.value||'').trim();
    const truckIMM   = (document.getElementById('bl-truck')?.value||'').trim();
    const date       = document.getElementById('bl-date')?.value || Utils.today();
    const notes      = document.getElementById('bl-notes')?.value||'';
    const clientId   = document.getElementById('bl-client')?.value;
    const br = DB.getById('brs', brId);
    if (!br) return;
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
    const totalHT  = deliveredLines.reduce((s,l) => s+l.total, 0);
    const tvaRate  = parseFloat(document.getElementById('bl-tva-rate')?.value) ?? DB.getSettings().tvaRate ?? 19;
    const tvaAmount = totalHT * tvaRate / 100;
    const timbre   = DB.calcTimbre(totalHT);
    const totalTTC = totalHT + tvaAmount + timbre;

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
      lines: deliveredLines, totalHT, tvaRate, tvaAmount, timbreAmount: timbre, totalTTC,
      isPartial, partNum, status: 'open'
    };

    let savedBL;
    if (editBlId) {
      savedBL = DB.update('bls', editBlId, data);
      Utils.notify((T.isRTL()?'تم تعديل وصل التسليم':'BL modifié'), 'success');
    } else {
      savedBL = DB.insert('bls', data);
      if (!isPartial) DB.update('brs', brId, { status:'delivered', deliveredAt:new Date().toISOString() }, 'Livraison complète via BL');
      Utils.notify(isPartial ? `BL partiel créé : ${ref}` : `BL créé : ${ref}`, 'success');
    }
    UI.closeModal();
    App.loadModule('bls');
    if (andPrint && savedBL) setTimeout(()=>PDFGen.exportBL(savedBL.id), 300);
  },

  confirmDelivery(blId) {
    const bl = DB.getById('bls', blId);
    if (!bl) return;
    const br = DB.getById('brs', bl.brId);
    if (!Utils.confirm2(
      T.get('bl_delivered_msg'),
      `Montant TTC: ${Utils.fmtCurrency(br?.totalTTC||0)}\n\nConfirmer définitivement ?`
    )) return;
    DB.update('bls', blId, { status:'delivered', deliveredAt: new Date().toISOString() }, 'Livraison confirmée');
    if (bl.brId) DB.update('brs', bl.brId, { status:'delivered', deliveredAt: new Date().toISOString() }, 'Livraison confirmée (depuis BL)');
    Utils.notify((T.isRTL()?'تم تأكيد التسليم! الوثائق مقفلة.':'Livraison confirmée ! Documents verrouillés.'), 'success');
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
      <tr><th>${T.get('col_date')}</th><td>${Utils.fmtDate(bl.date)}</td></tr>
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
      <button class="btn btn-outline" onclick="PDFGen.exportBL(${blId})"><i class="fas fa-file-pdf"></i> PDF</button>
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('close')}</button>`;
    UI.showModal(`<i class="fas fa-file-export"></i> ${bl.ref}`, body, footer, 'lg');
  },

  deleteBL(id) {
    const bl = DB.getById('bls', id);
    if (!bl) return;
    const isValidated = bl.status === 'delivered' || bl.status === 'locked';
    if (isValidated && !Auth.isAdmin()) {
      Utils.notify(T.isRTL()?'لا يمكن حذف BL مُسلَّم — المسؤول فقط':'BL livré — suppression admin uniquement', 'error');
      return;
    }
    if (isValidated) {
      if (!confirm(T.isRTL()?'هذا BL مُسلَّم. هل أنت متأكد من الحذف؟':'Ce BL est livré. Confirmer la suppression ?')) return;
    } else {
      if (!confirm(T.isRTL()?'حذف هذا BL؟':'Supprimer ce BL ?')) return;
    }
    DB.delete('bls', id);
    if (bl?.brId) {
      const br = DB.getById('brs', bl.brId);
      // Free the BR — reopen it so the number is available again
      if (br && (br.status === 'delivered' || br.status === 'billed')) {
        DB.update('brs', br.id, { status: 'open' }, T.isRTL()?'حذف BL — إعادة فتح BR':'BL supprimé — BR réouvert');
      }
    }
    Utils.notify(T.isRTL()?'تم حذف BL':'BL supprimé', 'success');
    App.loadModule('bls');
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
  _renderSession(u, session) {
    const today = Utils.today();
    const brTotal = SessionMgr.getDayBRTotal(u.id, today);
    const isClosed = session.status === 'closed';
    const todayBRs = DB.getAll('brs').filter(b=>(b.date||'').slice(0,10)===today&&b.createdBy===u.id);
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
        <div style="font-size:24px;font-weight:900;color:var(--text)">${Utils.fmtCurrency(brTotal)}</div>
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
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--primary)">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${isAR?'إجمالي BR اليوم':'Total BR du jour'}</div>
            <div style="font-size:24px;font-weight:900;color:var(--primary)">${Utils.fmtCurrency(brTotal)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${todayBRs.length} BR(s)</div>
          </div>
          <div style="background:var(--bg-inset);border-radius:var(--radius);padding:14px;text-align:center;border-left:3px solid var(--warning)">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${T.get('caisse_monnaie')} ${isAR?'أولي':'départ'}</div>
            <div style="font-size:24px;font-weight:900;color:var(--warning)">${Utils.fmtCurrency(session.startingMonnaie||0)}</div>
          </div>
          ${closedCards}
        </div>
        ${alertMsg}
      </div>
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)">
      <div style="padding:14px 18px;background:var(--bg-inset);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <i class="fas fa-receipt" style="color:var(--primary)"></i>
        <h3 style="font-size:14px;font-weight:700;margin:0;color:var(--text)">${isAR?'وصولات اليوم':'BR du jour'}</h3>
        <span style="margin-${isAR?'right':'left'}:auto;font-size:11px;color:var(--text-muted)">${todayBRs.length} BR(s)</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--bg-inset);border-bottom:2px solid var(--border)">
            <th style="${thStyle};text-align:left">${T.get('col_ref')}</th>
            <th style="${thStyle};text-align:left">${T.get('col_supplier')}</th>
            <th style="${thStyle};text-align:right">${T.get('col_total_ttc')}</th>
            <th style="${thStyle};text-align:center">${T.get('col_status')}</th>
          </tr></thead>
          <tbody>${brRows}</tbody>
          ${brFooter}
        </table>
      </div>
    </div>
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
    const rows = users.map(u => {
      const sess = sessions.find(s => s.userId === u.id);
      const uBRs = allBRs.filter(b => b.createdBy === u.id);
      const brTotal = uBRs.reduce((t,b) => t+(Number(b.totalTTC)||0), 0);
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
        <td style="color:var(--success);font-weight:700">${Utils.fmtCurrency(deposited)}</td>
        <td style="color:${ecartColor};font-weight:700">${ecartStr}</td>
        <td style="color:var(--warning);font-weight:700">${Utils.fmtCurrency(sess?.startingMonnaie||0)}</td>
      </tr>`;
    }).join('');

    // Today transactions (all caisse_admin for today)
    const txRows = caTx.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(t => `
      <div class="tx-item ${t.type}" style="cursor:pointer" onclick="AdminCaisseModule.showDetail(${t.id})">
        <div>
          <div style="font-size:11px;color:var(--text4)"><i class="fas fa-clock"></i> ${Utils.fmtDateTime(t.createdAt)}</div>
          <div style="font-weight:600;color:var(--text);font-size:13px">${Utils.escHTML(t.note||t.source||'-')}</div>
          <div style="font-size:11px;color:var(--text3)">${Utils.escHTML(t.userName||'-')}</div>
        </div>
        <div style="text-align:right">
          <div class="badge ${t.type==='deposit'?'badge-success':'badge-danger'}" style="font-size:12px">
            ${t.type==='deposit'?'+':'-'}${Utils.fmtCurrency(t.amount)}
          </div>
        </div>
      </div>`).join('');

    const totalBR = allBRs.reduce((t,b) => t+(Number(b.totalTTC)||0), 0);
    const totalDep = caTx.filter(t=>t.type==='deposit').reduce((t,tx) => t+(Number(tx.amount)||0), 0);
    const totalWith = caTx.filter(t=>t.type==='withdrawal').reduce((t,tx) => t+(Number(tx.amount)||0), 0);

    return `<div style="padding:24px" ${isAR?'dir="rtl"':''}>
      <h2 style="font-size:18px;font-weight:800;margin-bottom:16px">
        <i class="fas fa-calendar-day" style="color:var(--primary)"></i>
        ${isAR?'عمليات الصندوق اليوم':'Opérations de caisse du jour'} — ${Utils.fmtDate(today)}
      </h2>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي BR':'Total BR'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--primary);margin-top:6px">${Utils.fmtCurrency(totalBR)}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي الإيداعات':'Total Dépôts'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--success);margin-top:6px">${Utils.fmtCurrency(totalDep)}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">${isAR?'إجمالي السحوبات':'Total Retraits'}</div>
          <div style="font-size:22px;font-weight:900;color:var(--danger);margin-top:6px">${totalWith>0?'-':''}  ${Utils.fmtCurrency(totalWith)}</div>
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-header"><h3><i class="fas fa-users" style="color:var(--primary)"></i> ${isAR?'ملخص المستخدمين اليوم':'Résumé caissiers du jour'}</h3></div>
        <div class="table-wrap"><table class="data-table" style="font-size:12px">
          <thead><tr>
            <th>${isAR?'المستخدم':'Utilisateur'}</th>
            <th>${isAR?'الجلسة':'Session'}</th>
            <th>${isAR?'إجمالي BR':'Total BR'}</th>
            <th>${isAR?'مُودَع':'Versé'}</th>
            <th>${isAR?'الفارق':'Écart'}</th>
            <th>${isAR?'الصرف':'Monnaie'}</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="6" class="text-muted text-center">${isAR?'لا يوجد مستخدمون':'Aucun utilisateur'}</td></tr>`}</tbody>
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
    const isAR = T.isRTL();
    const html = `
      <div class="form-group mb-0">
        <label>${isAR ? 'الصندوق الأولي (Monnaie)' : 'Fond de caisse initial (Monnaie)'}</label>
        <div style="position:relative">
          <input type="number" id="startMonnaieInput" class="form-control" step="0.01" min="0" value="0">
          <span style="position:absolute;top:50%;${isAR?'left:12px':'right:12px'};transform:translateY(-50%);color:var(--text-muted);font-weight:700">DA</span>
        </div>
        <small style="color:var(--text4);display:block;margin-top:6px">${isAR ? 'أدخل المبلغ الموجود في الصندوق في بداية اليوم' : 'Saisissez le montant présent en caisse en début de journée'}</small>
      </div>
    `;
    const footer = `
      <button class="btn btn-outline" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="CaisseModule._saveMorningSession()">${isAR ? 'بدء الجلسة' : 'Démarrer la session'}</button>
    `;
    UI.showModal(isAR ? 'فتح جلسة اليوم' : 'Ouverture de session', html, footer, 'sm');
    setTimeout(() => document.getElementById('startMonnaieInput')?.focus(), 100);
  },

  _saveMorningSession() {
    const u = Auth.getCurrentUser();
    if (!u) return;
    const val = Number(document.getElementById('startMonnaieInput')?.value) || 0;
    SessionMgr.startSession(u.id, val);
    UI.closeModal();
    App.reloadCurrent();
  },

  showCloture(isEdit=false) {
    const u = Auth.getCurrentUser();
    const today = Utils.today();
    const brTotal = SessionMgr.getDayBRTotal(u.id, today);
    const session = SessionMgr.getTodaySession(u.id);
    const prevEspeces = session?.closedEspeces ?? brTotal;
    const prevMonnaie = session?.closedMonnaie ?? (session?.startingMonnaie ?? 0);

    UI.showModal(`🌙 ${T.get('caisse_cloture')}`, `
    <div class="alert alert-info mb-2">
      <i class="fas fa-info-circle"></i>
      <strong>${T.get('caisse_expected')}:</strong> ${Utils.fmtCurrency(brTotal)}
      (${DB.getAll('brs').filter(b=>(b.date||'').slice(0,10)===today&&b.createdBy===u.id).length} BR)
    </div>
    <p style="color:var(--text2);margin-bottom:16px">${T.get('caisse_cloture_msg')}</p>
    <div class="cloture-compare mb-2">
      <div class="compare-box expected">
        <div class="cb-label">${T.get('caisse_expected')}</div>
        <div class="cb-value">${Utils.fmtCurrency(brTotal)}</div>
      </div>
      <div class="compare-box actual">
        <div class="cb-label">${T.get('caisse_ecart')} (en temps réel)</div>
        <div class="cb-value" id="clotureEcartDisplay">—</div>
      </div>
    </div>
    <div class="form-grid cols-2">
      <div class="form-group">
        <label class="required"><i class="fas fa-money-bill-wave"></i> ${T.get('caisse_especes')}</label>
        <input type="number" id="cloEspeces" value="${prevEspeces.toFixed(2)}" min="0" step="any"
          style="font-size:18px;font-weight:700;text-align:center"
          oninput="CaisseModule._updateEcartDisplay(${brTotal})">
      </div>
      <div class="form-group">
        <label class="required"><i class="fas fa-coins"></i> ${T.get('caisse_monnaie')}</label>
        <input type="number" id="cloMonnaie" value="${prevMonnaie.toFixed(2)}" min="0" step="any"
          style="font-size:18px;font-weight:700;text-align:center">
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
     <button class="btn btn-primary btn-lg" onclick="CaisseModule._saveCloture(${isEdit})">
       <i class="fas fa-door-closed"></i> ${isEdit?T.get('save'):T.get('caisse_cloture')}
     </button>`, 'md');
    setTimeout(()=>CaisseModule._updateEcartDisplay(brTotal), 100);
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

  _saveCloture(isEdit) {
    const especes = parseFloat(document.getElementById('cloEspeces')?.value)||0;
    const monnaie = parseFloat(document.getElementById('cloMonnaie')?.value)||0;
    const u = Auth.getCurrentUser();
    if (!confirm(`Confirmer la clôture ?\n${T.get('caisse_especes')}: ${Utils.fmtCurrency(especes)}\n${T.get('caisse_monnaie')}: ${Utils.fmtCurrency(monnaie)}`)) return;
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
    const allBRs     = DB.getAll('brs');
    const totalBR_expected = allBRs.reduce((t,b)=>t+(Number(b.totalTTC)||0),0);

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
      {id:'reconciliation', icon:'fa-balance-scale',    label:isAR?'تسوية يومية':'Rapprochement'},
      {id:'caissiers',      icon:'fa-users',            label:isAR?'الكشافون':'Caissiers'},
    ];

    // ── Vault banner (always visible) ──
    const vaultBanner = `
    <div class="vault-hero" style="margin-bottom:20px">
      <div class="vault-icon-wrap"><i class="fas fa-vault"></i></div>
      <div class="vault-info">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.6">${isAR?'الرصيد الإجمالي':'SOLDE TOTAL'}</div>
        <div class="vault-amount" style="font-size:40px;font-weight:900;color:#4ade80">${Utils.fmtCurrency(balance + totalBR_expected)}</div>
        <div style="opacity:.5;font-size:12px;margin-top:4px">
          ${isAR?'الصندوق':'Caisse'}: ${Utils.fmtCurrency(balance)} &nbsp;·&nbsp; BR: ${Utils.fmtCurrency(totalBR_expected)}
        </div>
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

    // ── Tab switcher helper ──
    const tabContent = tab==='overview' ? tabOverview
      : tab==='deposits'       ? tabDeposits
      : tab==='withdrawals'    ? tabWithdrawals
      : tab==='reconciliation' ? tabReconciliation
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
    UI.showModal(`<i class="fas fa-arrow-up" style="color:var(--danger)"></i> ${T.get('adm_withdrawal')}`, `
    <div class="alert alert-warning mb-2">
      <i class="fas fa-exclamation-triangle"></i>
      ${T.get('adm_immutable')}<br>
      <small>${T.get('adm_correction_note')}</small>
    </div>
    <div class="alert alert-info mb-2">
      <i class="fas fa-vault"></i> ${T.isRTL()?"الرصيد الحالي:":"Solde actuel:"} <strong>${Utils.fmtCurrency(balance)}</strong>
    </div>
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

  _saveWithdrawal() {
    const amount = parseFloat(document.getElementById('withAmount')?.value)||0;
    const destination = (document.getElementById('withDest')?.value||'').trim();
    const bankRef = document.getElementById('withBankRef')?.value||'';
    const note = document.getElementById('withNote')?.value||'';
    if (!amount||amount<=0) { Utils.notify((T.isRTL()?'المبلغ غير صالح':'Montant invalide'), 'error'); return; }
    if (!destination) { Utils.notify(T.get('adm_dest')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    if (!Utils.confirm2(
      T.get('adm_confirm1'),
      T.get('adm_confirm2') + '\n\nMontant: ' + Utils.fmtCurrency(amount) + '\nDestination: ' + destination
    )) return;
    const u = Auth.getCurrentUser();
    const tx = DB.insert('caisse_admin', { type:'withdrawal', source:'admin_withdrawal', userId:u.id, userName:u.name, amount, destination, bankRef, note });
    UI.closeModal();
    Utils.notify((T.isRTL()?'تم حفظ السحب':'Retrait enregistré'), 'success');
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
          <thead><tr><th>${T.get('sup_name')}</th><th>${T.isRTL()?'اختصار':'Abrév.'}</th><th>${T.get('sup_phone')}</th><th>${T.get('sup_address')}</th><th>${T.get('sup_contact')}</th><th>${T.isRTL()?"عدد BR":"BR count"}</th><th>${T.get('col_actions')}</th></tr></thead>
          <tbody>
            ${items.length ? items.map(s=>`<tr>
              <td><strong>${Utils.escHTML(s.name)}</strong></td>
              <td>${Utils.escHTML(s.phone||'-')}</td>
              <td>${Utils.escHTML(s.address||'-')}</td>
              <td>${Utils.escHTML(s.contact||'-')}</td>
              <td><span class="badge badge-primary">${brMap[s.id]||0}</span></td>
              <td class="td-actions">
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
    return `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px"><i class="fas fa-id-card"></i> ${T.isRTL()?'بيانات التعريف الرسمية':'Identification Officielle'}</div>
      <div class="form-grid cols-2">
        <div class="form-group span-full"><label class="required" style="font-weight:600">${T.get('sup_name')} / Raison Sociale</label><input id="sName" value="${Utils.escHTML(s.name||'')}" placeholder="${T.isRTL()?'اسم المورد أو الشركة...':'Nom ou raison sociale...'}" required></div>
        <div class="form-group"><label style="font-weight:700;color:var(--primary)">Abréviation <small style="color:var(--text4)">(code court BR/BL — ex: GIB, BNA…)</small></label><input id="sAbbrev" value="${Utils.escHTML(s.abbrev||'')}" placeholder="MAX 5 LETTRES" maxlength="5" style="font-family:monospace;font-weight:800;text-transform:uppercase;letter-spacing:2px" oninput="this.value=this.value.toUpperCase()"></div>
        <div class="form-group"><label style="font-weight:600">NIF <small style="color:var(--text4)">(Numéro d'Identification Fiscale)</small></label><input id="sNif" value="${Utils.escHTML(s.nif||'')}" placeholder="000012345678900" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">NIS <small style="color:var(--text4)">(Identif. Statistique)</small></label><input id="sNis" value="${Utils.escHTML(s.nis||'')}" placeholder="000012345678901" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">RC <small style="color:var(--text4)">(Registre du Commerce)</small></label><input id="sRc" value="${Utils.escHTML(s.rc||'')}" placeholder="00/00-XXXXXXX"></div>
        <div class="form-group"><label style="font-weight:600">Art. d'Imposition (AI)</label><input id="sAi" value="${Utils.escHTML(s.ai||'')}" placeholder="00000000000000" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">${T.get('sup_phone')} / Fax</label><input id="sPhone" value="${Utils.escHTML(s.phone||'')}" placeholder="0X XX XX XX XX"></div>
        <div class="form-group"><label style="font-weight:600">Email</label><input id="sEmail" type="email" value="${Utils.escHTML(s.email||'')}" placeholder="contact@societe.dz"></div>
        <div class="form-group"><label style="font-weight:600">${T.isRTL()?'جهة الاتصال':'Contact / Représentant'}</label><input id="sContact" value="${Utils.escHTML(s.contact||'')}" placeholder="${T.isRTL()?'اسم جهة الاتصال':'Nom du contact'}"></div>
        <div class="form-group span-full"><label style="font-weight:600">${T.get('sup_address')}</label><input id="sAddress" value="${Utils.escHTML(s.address||'')}"></div>
      </div>
    </div>`;
  },

  showCreate() {
    UI.showModal(`<i class="fas fa-building"></i> ${T.get('sup_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="SuppliersModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
  },
  showEdit(id) {
    const s = DB.getById('suppliers', id);
    if (!s) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')}`, this._form(s), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="SuppliersModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'lg');
  },
  _save(id) {
    const name = (document.getElementById('sName')?.value||'').trim();
    if (!name) { Utils.notify(T.get('sup_name')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const data = {
      name,
      abbrev: (document.getElementById('sAbbrev')?.value||'').trim().toUpperCase().slice(0,5),
      nif: document.getElementById('sNif')?.value||'',
      nis: document.getElementById('sNis')?.value||'',
      rc:  document.getElementById('sRc')?.value||'',
      ai:  document.getElementById('sAi')?.value||'',
      phone: document.getElementById('sPhone')?.value||'',
      email: document.getElementById('sEmail')?.value||'',
      contact: document.getElementById('sContact')?.value||'',
      address: document.getElementById('sAddress')?.value||''
    };
    if (id) { DB.update('suppliers',id,data); Utils.notify((T.isRTL()?'تم تعديل المورد':'Fournisseur modifié'),'success'); }
    else { DB.insert('suppliers',data); Utils.notify((T.isRTL()?'تمت إضافة المورد':'Fournisseur ajouté'),'success'); }
    UI.closeModal(); App.loadModule('suppliers');
  },
  deleteSup(id) {
    const hasBRs = DB.getAll('brs').some(b=>b.supplierId===id);
    if (hasBRs) { Utils.notify((T.isRTL()?'غير ممكن: هذا المورد لديه وصولات مرتبطة.':'Impossible: ce fournisseur a des BR liés.'),'error'); return; }
    if (!confirm(T.get('delete')+'?')) return;
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
          <thead><tr><th>${T.get('cli_name')}</th><th>${T.get('cli_phone')}</th><th>${T.get('cli_address')}</th><th>${T.get('cli_contact')}</th><th>${T.isRTL()?"عدد BR":"BR count"}</th><th>${T.get('col_actions')}</th></tr></thead>
          <tbody>
            ${items.length ? items.map(s=>`<tr>
              <td><strong>${Utils.escHTML(s.name)}</strong></td>
              <td>${Utils.escHTML(s.phone||'-')}</td>
              <td>${Utils.escHTML(s.address||'-')}</td>
              <td>${Utils.escHTML(s.contact||'-')}</td>
              <td><span class="badge badge-primary">${brMap[s.id]||0}</span></td>
              <td class="td-actions">
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
    return `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px"><i class="fas fa-id-card"></i> Identification Officielle</div>
      <div class="form-grid cols-2">
        <div class="form-group span-full"><label class="required" style="font-weight:600">${T.get('cli_name')} / Raison Sociale</label><input id="sName" value="${Utils.escHTML(s.name||'')}" placeholder="Nom ou raison sociale du client..." required></div>
        <div class="form-group"><label style="font-weight:600">NIF <small style="color:var(--text4)">(Numéro d'Identification Fiscale)</small></label><input id="sNif" value="${Utils.escHTML(s.nif||'')}" placeholder="000012345678900" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">NIS <small style="color:var(--text4)">(Identif. Statistique)</small></label><input id="sNis" value="${Utils.escHTML(s.nis||'')}" placeholder="000012345678901" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">RC <small style="color:var(--text4)">(Registre du Commerce)</small></label><input id="sRc" value="${Utils.escHTML(s.rc||'')}" placeholder="00/00-XXXXXXX"></div>
        <div class="form-group"><label style="font-weight:600">Art. Imposition</label><input id="sAi" value="${Utils.escHTML(s.ai||'')}" placeholder="00000000000000" style="font-family:monospace"></div>
        <div class="form-group"><label style="font-weight:600">${T.get('cli_phone')} / Fax</label><input id="sPhone" value="${Utils.escHTML(s.phone||'')}" placeholder="0X XX XX XX XX"></div>
        <div class="form-group"><label style="font-weight:600">Contact / Représentant</label><input id="sContact" value="${Utils.escHTML(s.contact||'')}" placeholder="Nom du contact"></div>
        <div class="form-group span-full"><label style="font-weight:600">${T.get('cli_address')}</label><input id="sAddress" value="${Utils.escHTML(s.address||'')}"></div>
      </div>
    </div>`;
  },

  showCreate() {
    UI.showModal(`<i class="fas fa-building"></i> ${T.get('cli_new')}`, this._form(), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-primary" onclick="ClientsModule._save(null)"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
  },
  showEdit(id) {
    const s = DB.getById('clients', id);
    if (!s) return;
    UI.showModal(`<i class="fas fa-edit"></i> ${T.get('edit')}`, this._form(s), `
      <button class="btn btn-secondary" onclick="UI.closeModal()">${T.get('cancel')}</button>
      <button class="btn btn-warning" onclick="ClientsModule._save(${id})"><i class="fas fa-save"></i> ${T.get('save')}</button>`, 'md');
  },
  _save(id) {
    const name = (document.getElementById('sName')?.value||'').trim();
    if (!name) { Utils.notify(T.get('cli_name')+(T.isRTL()?' مطلوب':' requis'), 'error'); return; }
    const data = {
      name,
      nif: document.getElementById('sNif')?.value||'',
      nis: document.getElementById('sNis')?.value||'',
      rc:  document.getElementById('sRc')?.value||'',
      ai:  document.getElementById('sAi')?.value||'',
      phone: document.getElementById('sPhone')?.value||'',
      email: document.getElementById('sEmail')?.value||'',
      contact: document.getElementById('sContact')?.value||'',
      address: document.getElementById('sAddress')?.value||''
    };
    if (id) { DB.update('clients',id,data); Utils.notify((T.isRTL()?'تم تعديل الزبون':'Client modifié'),'success'); }
    else { DB.insert('clients',data); Utils.notify((T.isRTL()?'تمت إضافة الزبون':'Client ajouté'),'success'); }
    UI.closeModal(); App.loadModule('clients');
  },
  deleteCli(id) {
    const hasBRs = DB.getAll('brs').some(b=>b.supplierId===id);
    if (hasBRs) { Utils.notify((T.isRTL()?'غير ممكن: هذا الزبون لديه وصولات مرتبطة.':'Impossible: ce client a des BR liés.'),'error'); return; }
    if (!confirm(T.get('delete')+'?')) return;
    DB.delete('clients',id); Utils.notify((T.isRTL()?'تم حذف الزبون':'Client supprimé'),'success'); App.loadModule('clients');
  }
};

// ═══════════════════════════════════════════════════════════════
// STATS MODULE — Full analytics with Chart.js
// ═══════════════════════════════════════════════════════════════
const StatsModule = {
  _period: 'month',
  _charts: {},

  _getRange() {
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
    };

    const startDate = this._getRange();
    const allBRs = DB.getAll('brs');
    const brs = startDate ? allBRs.filter(b => new Date(b.createdAt) >= startDate) : allBRs;
    const bls = DB.getAll('bls');
    const delivered = bls.filter(b => b.status === 'delivered');
    const totalTTC = brs.reduce((s,b) => s+(Number(b.totalTTC)||0), 0);
    const totalTimbre = brs.reduce((s,b) => s+(Number(b.timbreAmount)||0), 0);
    const ca = DB.getAll('caisse_admin');
    const vaultDeposits    = ca.filter(t=>t.type==='deposit').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const vaultWithdrawals = ca.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const vaultBalance = vaultDeposits - vaultWithdrawals;
    const avgBR = brs.length ? totalTTC / brs.length : 0;
    const deliveryRate = brs.length ? Math.round(delivered.length/brs.length*100) : 0;

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
        <div style="display:flex;gap:6px;padding-bottom:2px">
          ${['week','month','year','all'].map(p =>
            `<button class="btn btn-sm ${this._period===p?'btn-primary':'btn-outline'}" onclick="StatsModule._period='${p}';App.loadModule('stats')">
              ${p==='week'?T.get('stat_week'):p==='month'?T.get('stat_month'):p==='year'?T.get('stat_year'):T.get('stat_all')}
            </button>`).join('')}
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
        <div class="card-header"><h3><i class="fas fa-chart-bar"></i> ${lbl.perfUsr}</h3></div>
        <div class="card-body" style="padding:16px"><canvas id="chart-users" style="max-height:220px"></canvas></div>
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
        const blLinked = allBLs.find(bl => bl.brId===br.id);
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
      <div class="kpi-card"><div class="kpi-icon orange"><i class="fas fa-coins"></i></div>
        <div><div class="kpi-label">Total TTC</div><div class="kpi-value" style="font-size:16px">${Utils.fmtCurrency(totalTTC)}</div></div></div>
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
  }
};

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
          <input type="text" value="${Utils.escHTML(this._q)}" placeholder="Rechercher un article..."
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
          <input type="text" value="${Utils.escHTML(this._q)}" placeholder="Rechercher un chauffeur..."
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
  _deleteArticle(id) {
    if (!confirm((T.isRTL()?'حذف هذه المادة؟':'Supprimer cet article ?'))) return;
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
  _deleteDriver(id) {
    if (!confirm((T.isRTL()?'حذف هذا السائق؟':'Supprimer ce chauffeur ?'))) return;
    DB.delete('drivers',id); Utils.notify((T.isRTL()?'تم حذف السائق':'Chauffeur supprimé'),'success'); App.loadModule('catalogue');
  }
};


// ═══════════════════════════════════════════════════════════════
// USERS MODULE
// ═══════════════════════════════════════════════════════════════
const UsersModule = {
  render() {
    if (!Auth.isAdmin()) return `<div style="padding:24px"><div class="alert alert-danger"><i class="fas fa-lock"></i> Accès administrateur</div></div>`;
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
                  ${u.id!==Auth.getCurrentUser()?.id?`<button class="btn btn-xs ${u.active!==false?'btn-warning':'btn-success'}" onclick="UsersModule.toggleActive(${u.id})">${u.active!==false?'<i class="fas fa-ban"></i>':'<i class="fas fa-check"></i>'}</button>`:''} 
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div></div>`;
  },
  _form(u={}) {
    return `<div class="form-grid cols-2">
      <div class="form-group"><label class="required">${T.get('usr_name')}</label><input id="uName" value="${Utils.escHTML(u.name||'')}" required></div>
      <div class="form-group"><label class="required">${T.get('usr_login')}</label><input id="uUsername" value="${Utils.escHTML(u.username||'')}" required autocomplete="off"></div>
      <div class="form-group"><label ${!u.id?'class="required"':''}>${T.get('usr_pass')} ${u.id?`(${T.isRTL()?"فارغ = بدون تغيير":"vide = inchangé"})`:''}</label>
        <input type="password" id="uPassword" ${!u.id?'required':''} autocomplete="new-password"></div>
      <div class="form-group"><label>${T.get('usr_role')}</label>
        <select id="uRole"><option value="user" ${u.role!=='admin'?'selected':''}>${T.get('role_user')}</option><option value="admin" ${u.role==='admin'?'selected':''}>${T.get('role_admin')}</option></select>
      </div>
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
    if (password) data.password = password;
    if (id) { DB.update('users',id,data); Utils.notify((T.isRTL()?'تم تعديل المستخدم':'Utilisateur modifié'),'success'); }
    else { DB.insert('users',{...data,active:true}); Utils.notify((T.isRTL()?'تم إنشاء المستخدم':'Utilisateur créé'),'success'); }
    UI.closeModal(); App.loadModule('users');
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
    App.loadModule('users');
  },

  deleteUser(id) {
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
    if (!confirm((T.isRTL() ? 'حذف المستخدم' : 'Supprimer') + ' "' + name + '" ?\n' + (T.isRTL() ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'))) return;
    DB.delete('users', id);
    Utils.notify('✅ ' + (T.isRTL() ? 'تم حذف المستخدم' : 'Utilisateur supprimé'), 'success');
    App.loadModule('users');
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
      {id:'data',    icon:'fa-database',    label:T.get('set_data'),     color:'#10b981'},
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
      ${this._tab==='data'?this._tabData():''}
    </div>
    </div>`;
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
    const slabs = s.timbreSlabs || [];
    return `
    <div class="alert alert-info mb-2"><i class="fas fa-info-circle"></i> ${T.get('set_timbre_slabs')} — ${T.isRTL()?'القانون الجبائي الجزائري':'Loi fiscale algérienne'}</div>
    <div id="slabsContainer">
      ${slabs.map((sl,i)=>`
      <div class="slab-row" id="slab-${i}">
        <div class="form-group"><label style="font-size:10px">${T.get('set_slab_min')}</label>
          <input type="number" class="slab-min" value="${sl.min}" min="0"></div>
        <div class="form-group"><label style="font-size:10px">${T.get('set_slab_max')}</label>
          <input type="number" class="slab-max" value="${sl.max!==null?sl.max:''}" placeholder="∞"></div>
        <div class="form-group"><label style="font-size:10px">${T.get('set_slab_rate')}</label>
          <input type="number" class="slab-rate" value="${sl.rate}" min="0" max="100" step="0.01"></div>
        <div class="form-group"><label style="font-size:10px">${T.get('set_slab_cap')}</label>
          <input type="number" class="slab-cap" value="${sl.cap!==null?sl.cap:''}" placeholder="—"></div>
        <button class="btn btn-xs btn-danger" onclick="document.getElementById('slab-${i}').remove()" style="align-self:flex-end;margin-bottom:2px"><i class="fas fa-times"></i></button>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-outline" onclick="SettingsModule._addSlab()"><i class="fas fa-plus"></i> ${T.get('set_add_slab')}</button>
      <button class="btn btn-primary" onclick="SettingsModule._saveTimbre()"><i class="fas fa-save"></i> ${T.get('save')}</button>
      <button class="btn btn-secondary" onclick="SettingsModule._resetTimbre()"><i class="fas fa-undo"></i> ${T.get('set_reset_slabs')}</button>
    </div>`;
  },

  _addSlab() {
    const c = document.getElementById('slabsContainer');
    if (!c) return;
    const idx = c.children.length;
    c.insertAdjacentHTML('beforeend', `
    <div class="slab-row" id="slab-${idx}">
      <div class="form-group"><label style="font-size:10px">${T.get('set_slab_min')}</label><input type="number" class="slab-min" value="0" min="0"></div>
      <div class="form-group"><label style="font-size:10px">${T.get('set_slab_max')}</label><input type="number" class="slab-max" placeholder="∞"></div>
      <div class="form-group"><label style="font-size:10px">${T.get('set_slab_rate')}</label><input type="number" class="slab-rate" value="0" step="0.01"></div>
      <div class="form-group"><label style="font-size:10px">${T.get('set_slab_cap')}</label><input type="number" class="slab-cap" placeholder="—"></div>
      <button class="btn btn-xs btn-danger" onclick="this.parentElement.remove()" style="align-self:flex-end;margin-bottom:2px"><i class="fas fa-times"></i></button>
    </div>`);
  },

  _saveTimbre() {
    const rows = document.querySelectorAll('#slabsContainer .slab-row');
    const slabs = Array.from(rows).map(row=>({
      min: parseFloat(row.querySelector('.slab-min')?.value)||0,
      max: row.querySelector('.slab-max')?.value ? parseFloat(row.querySelector('.slab-max').value) : null,
      rate: parseFloat(row.querySelector('.slab-rate')?.value)||0,
      cap: row.querySelector('.slab-cap')?.value ? parseFloat(row.querySelector('.slab-cap').value) : null,
    }));
    DB.saveSettings({ timbreSlabs: slabs });
    Utils.notify((T.isRTL()?'تم حفظ شرائح الطابع':'Tranches timbre enregistrées'), 'success');
  },

  _resetTimbre() {
    DB.saveSettings({ timbreSlabs: DB._defaultSettings().timbreSlabs });
    Utils.notify((T.isRTL()?'تمت إعادة تعيين الشرائح':'Tranches réinitialisées'), 'success');
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
      <p style="color:var(--text4);font-size:11px;margin-bottom:10px">⚠️ ${T.get('set_reset_confirm')}</p>
      <button class="btn btn-danger btn-sm" onclick="DB.hardReset()">
        <i class="fas fa-trash-alt"></i> ${T.get('set_reset_all')}
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
    const label = prompt(T.isRTL() ? 'اسم النسخة الاحتياطية:' : 'Nom de la sauvegarde:', `Manuel — ${new Date().toLocaleString('fr-DZ')}`);
    if (!label) return;
    try {
      Utils.notify(T.isRTL() ? 'جارٍ الإنشاء…' : 'Création en cours…', 'info');
      await API.createBackup(label);
      Utils.notify(T.isRTL() ? '✅ تم إنشاء النسخة الاحتياطية' : '✅ Sauvegarde créée avec succès', 'success');
      this._loadBackups();
    } catch (e) {
      Utils.notify('Erreur: ' + e.message, 'error');
    }
  },

  // ── Restore a backup ───────────────────────────────────────────
  async _restoreBackup(id, label) {
    if (!window.API) return;
    if (!confirm(`⚠️ Restaurer depuis:\n"${label}"\n\nCette action remplace TOUTES les données actuelles.\nUne sauvegarde de sécurité sera créée automatiquement.\n\nContinuer ?`)) return;
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
    if (!confirm(T.isRTL() ? 'حذف هذه النسخة الاحتياطية؟' : 'Supprimer cette sauvegarde ?')) return;
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
    if (!confirm('Cette opération va envoyer toutes vos données locales (localStorage) vers MongoDB.\n\nUtilise le mode upsert — aucun doublon ne sera créé.\n\nContinuer ?')) return;
    try {
      Utils.notify('Migration en cours…', 'info');
      const COLS = ['users','brs','bls','suppliers','clients','caisse_admin','sessions','catalogue','history','audit_log'];
      let total = 0;
      for (const col of COLS) {
        const items = DB.getAll(col);
        if (items.length) {
          // Use bulkSync (upsert by id) — NEVER creates duplicates
          await API.bulkSync(col, items);
          total += items.length;
        }
      }
      // Migrate settings
      const settings = DB.getSettings();
      await API.saveSettings(settings);
      Utils.notify(`✅ Migration terminée — ${total} documents envoyés (aucun doublon)`, 'success');
    } catch (e) {
      Utils.notify('Erreur migration: ' + e.message, 'error');
    }
  },

  // ── Clean duplicates already in MongoDB ────────────────────────
  async _cleanDuplicates() {
    if (!window.API) return;
    if (!confirm('Nettoyer les doublons dans MongoDB ?\n\nGarde le premier exemplaire de chaque document, supprime les copies.\n\nContinuer ?')) return;
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
      alert('Disponible uniquement en mode cloud.');
      return;
    }
    // Step 1: warning
    if (!confirm('⚠️ ATTENTION — OPÉRATION IRRÉVERSIBLE ⚠️\n\nCela va SUPPRIMER:\n• Tous les BRs et BLs\n• Tous les clients et fournisseurs\n• Toute la caisse\n• Tous les utilisateurs\n• Tous les paramètres\n\nSeul l\'admin (admin/admin123) sera recréé.\n\nVous êtes sûr de vouloir continuer ?')) return;

    // Step 2: require typed confirmation
    const phrase = prompt('Pour confirmer, tapez exactement:\n\nRESET_TOUT');
    if (phrase !== 'RESET_TOUT') {
      Utils.notify('Opération annulée — phrase incorrecte', 'info');
      return;
    }

    try {
      Utils.notify('Réinitialisation en cours…', 'info');
      const result = await window.API._req('POST', '/admin/reset-all', { confirm: 'RESET_TOUT' });
      if (result?.success) {
        // Clear local cache too
        const COLS = ['users','brs','bls','suppliers','clients','caisse_admin','sessions','catalogue','history','audit_log','settings'];
        COLS.forEach(c => localStorage.removeItem(c));
        localStorage.removeItem('_erp_token');
        localStorage.removeItem('currentUser');
        alert('✅ Base de données réinitialisée!\n\nConnectez-vous avec:\nIdentifiant: admin\nMot de passe: admin123');
        location.reload();
      }
    } catch(e) {
      Utils.notify('Erreur reset: ' + e.message, 'error');
    }
  },

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
          <input type="text" value="${Utils.escHTML(q)}" placeholder="${T.get('search')}"
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