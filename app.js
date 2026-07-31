/* ============================================================
   APP.JS — Application Bootstrap & Router
   ERP Douroub Eldjazair v4.8.1 – strict permissions + dynamic sidebar
   ============================================================ */

const App = {
    currentModule: null,
    currentTab: null,
    _reloadTimer: null,

    init(){
        DB.init();
        // Init scan storage (IndexedDB, offline, cross-browser)
        try { ScanStore.init(); } catch(e) { /* ignore */ }
        // Apply UI theme (brand color + light/dark) even on the login screen
        if (typeof UI !== 'undefined' && UI.applyTheme) UI.applyTheme();
        this.applyBranding();
        this.initShortcuts();
        if(Auth.isLoggedIn()){
            this.showApp();
            this.buildSidebar();
            this.loadModule('dashboard');
            UI.startClock();
        } else {
            document.getElementById('loginScreen').style.display='flex';
            document.getElementById('appContainer').style.display='none';
        }

        document.getElementById('loginForm').addEventListener('submit',e=>{
            e.preventDefault();
            const fd=new FormData(e.target);
            if(Auth.login(fd.get('username'),fd.get('password'))){
                this.showApp();
                this.buildSidebar();
                this.loadModule('dashboard');
                UI.startClock();
                // AFTER LOGIN, add a test notification for admin
                const user = Auth.getCurrentUser();
                if (user && user.role === 'admin') {
                    console.log('Admin logged in – adding test notification');
                    Notify.add({ userId: user.id, category:'system', priority:'low', title:'Connexion', message:'🔔 Centre de notifications prêt.', link:'#' });
                }
            } else {
                Utils.showNotification('Identifiants incorrects','error');
            }
        });

        // Listen for notification updates to refresh the bell
        window.addEventListener('notification-update', () => {
            this.refreshNotificationBell();
        });
    },

    initShortcuts(){
        document.addEventListener('keydown', (e) => {
            // Global search
            if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'k') {
                e.preventDefault();
                if (Auth.isLoggedIn() && typeof GlobalSearch !== 'undefined') {
                    GlobalSearch.open();
                }
            }
        });
    },

    applyBranding(){
        const s = DB.getSettings();
        const companyName = (s.companyName || 'ERP').trim();
        const logo = s.logoLeft || s.leftLogo || '';

        // ── Topbar company brand ──
        const topBrand = document.getElementById('topCompanyBrand');
        const topName  = document.getElementById('topCompanyName');
        const topLogo  = document.getElementById('topCompanyLogo');
        if (topName) topName.textContent = companyName;
        if (topBrand) topBrand.style.display = 'flex';
        if (topLogo) { topLogo.src = logo || ''; topLogo.style.display = logo ? 'block' : 'none'; }

        // ── Sidebar header ──
        const sbName = document.getElementById('sbBrandName') || document.getElementById('sidebarBrandName');
        const sbImg  = document.getElementById('sbBrandImg')  || document.getElementById('sidebarBrandLogo');
        const sbIcon = document.getElementById('sbBrandIcon');
        const shortName = companyName.length > 26 ? (companyName.slice(0,26) + '…') : companyName;
        if (sbName) sbName.textContent = shortName;
        if (logo && sbImg) {
            sbImg.src = logo;
            sbImg.style.display = 'block';
            if (sbIcon) sbIcon.style.display = 'none';
        } else if (sbImg) {
            sbImg.style.display = 'none';
            if (sbIcon) sbIcon.style.display = 'flex';
        }

        // ── Login screen logo ──
        const loginLogo = document.getElementById('loginBrandLogo') || document.getElementById('loginLogo');
        const loginIcon = document.getElementById('loginBrandIcon');
        if (loginLogo) {
            if (logo) { loginLogo.src=logo; loginLogo.style.display='block'; if(loginIcon) loginIcon.style.display='none'; }
            else      { loginLogo.style.display='none'; if(loginIcon) loginIcon.style.display='inline-block'; }
        }
    },

    showApp(){
        document.getElementById('loginScreen').style.display='none';
        document.getElementById('appContainer').style.display='block';
        // Update branding (company name/logo) now that sidebar is visible
        this.applyBranding();
        const u=Auth.getCurrentUser();
        if(u){
            const nameEl = document.getElementById('topUserName') || document.getElementById('userName');
            const avatarEl = document.getElementById('topAvatar') || document.getElementById('userAvatar');
            const fullNameEl = document.getElementById('ddUserFullName') || document.getElementById('userFullName');
            const roleEl = document.getElementById('ddUserRole') || document.getElementById('userRole');
            if(nameEl) nameEl.textContent=u.name;
            if(avatarEl) avatarEl.textContent=u.name.charAt(0).toUpperCase();
            if(fullNameEl) fullNameEl.textContent=u.name;
            if(roleEl) roleEl.textContent=Auth.getRoleLabel(u.role);
        }
        // Update topbar company branding
        if (typeof App._updateCompanyInfo === 'function') App._updateCompanyInfo();
        // Add notification bell after a tiny delay to ensure DOM ready
        setTimeout(() => this.addNotificationBell(), 100);
    },

    addNotificationBell() {
        const header = document.querySelector('.topbar .topbar-right');
        console.log('Looking for header:', header);
        if (header) {
            console.log('Header found. Existing bell?', header.querySelector('.notification-bell'));
            if (!header.querySelector('.notification-bell')) {
                const bell = document.createElement('div');
                bell.innerHTML = Notify.renderBell();
                header.prepend(bell.firstChild);
                console.log('Bell added.');
            } else {
                console.log('Bell already exists.');
            }
        } else {
            console.error('Header .topbar .topbar-right not found!');
        }
    },

    refreshNotificationBell() {
        const header = document.querySelector('.topbar .topbar-right');
        const existingBell = header?.querySelector('.notification-bell');
        if (existingBell) {
            const newBell = document.createElement('div');
            newBell.innerHTML = Notify.renderBell();
            existingBell.replaceWith(newBell.firstChild);
            console.log('Bell refreshed.');
        } else {
            console.log('No bell to refresh, adding new one.');
            this.addNotificationBell();
        }
    },

    buildSidebar() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const navContainer = document.querySelector('.sidebar nav');
        if (!navContainer) return;

        const menuConfig = [
            { section: 'Principal', items: [
                { module: 'dashboard', icon: 'fa-tachometer-alt', label: 'Tableau de Bord' },
                { module: 'notifications', icon: 'fa-bell', label: 'Notifications' }
            ]},
            { section: 'Demandes', roles: ['normal','dg','appro','admin'], items: [
                { module: 'requests', tab: 'das', icon: 'fa-file-alt', label: 'DA - Demandes d\'Achat' },
                { module: 'requests', tab: 'dss', icon: 'fa-hands-helping', label: 'DS - Demandes de Service' },
                { module: 'requests', tab: 'dcs', icon: 'fa-file-signature', label: 'DC - Demandes de Contrat' }
            ]},
            { section: 'Approvisionnement', roles: ['dg','appro','admin'], items: [
                { module: 'procurement', tab: 'bcs', icon: 'fa-file-invoice', label: 'BC - Bons de Commande' },
                { module: 'procurement', tab: 'brs', icon: 'fa-truck-loading', label: 'BR - Bons de Réception' },
                { module: 'procurement', tab: 'dps', icon: 'fa-money-check-alt', label: 'DP - Demandes Paiement' },
                { module: 'contracts', icon: 'fa-file-contract', label: 'Contrats' }
            ]},
            // Stock: visible for everyone (normal = consultation mode). Operational docs stay restricted.
            { section: 'Stock', roles: ['magasinier','dg','appro','admin','normal'], items: [
                // Two separate entries pointing to the same module but different tabs (views)
                { module: 'stock', tab: 'articles', icon: 'fa-boxes-stacked', label: 'Stock & Inventaire' },
                { module: 'stock', tab: 'inv', icon: 'fa-barcode', label: "Codes d'inventaire (PV)" },
                { module: 'decharges', icon: 'fa-clipboard-check', label: 'Décharges', roles: ['magasinier','dg','appro','admin'] },
                { module: 'pvs', icon: 'fa-certificate', label: 'PV Mise à Disposition', roles: ['magasinier','dg','appro','admin'] }
            ]},
            { section: 'Finance', roles: ['dg','appro','admin'], items: [
                { module: 'budgets', icon: 'fa-wallet', label: 'Budgets', roles: ['dg','admin'] },
                { module: 'accounting', icon: 'fa-book', label: 'Comptabilité (Journal)' },
                { module: 'evaluations', icon: 'fa-star', label: 'Évaluations Fournisseurs' }
            ]},
            { section: 'Analyse', roles: ['dg','appro','admin'], items: [
                { module: 'reports', icon: 'fa-chart-bar', label: 'Rapports & Statistiques' }
            ]},
            { section: 'Base de Données', roles: ['dg','appro','admin'], items: [
                { module: 'archives', icon: 'fa-database', label: 'Base des Données (Scans)' }
            ]},
            { section: 'Références', roles: ['dg','appro','admin'], items: [
                { module: 'suppliers', icon: 'fa-building', label: 'Fournisseurs' }
            ]},
            { section: 'Audit', roles: ['admin'], items: [
                { module: 'workflow', icon: 'fa-project-diagram', label: 'Workflow & Audit' }
            ]},
            { section: 'Configuration', roles: ['admin'], items: [
                { module: 'settings', icon: 'fa-cog', label: 'Paramètres' }
            ]}
        ];

        let html = '';
        menuConfig.forEach(group => {
            const hasAccess = !group.roles || group.roles.includes(user.role);
            if (!hasAccess) return;

            html += `<div class="nav-section">${group.section}</div>`;
            group.items.forEach(item => {
                if (item.roles && !item.roles.includes(user.role)) return;
                const tabAttr = item.tab ? ` data-tab="${item.tab}"` : '';
                html += `<a class="nav-item" data-module="${item.module}"${tabAttr}><i class="fas ${item.icon}"></i> <span>${item.label}</span></a>`;
            });
        });

        html += `<div style="padding:16px;text-align:center;color:rgba(255,255,255,.3);font-size:11px;margin-top:auto;">ERP Douroub v4.8.2<br>Développé par CHIKHAOUI ABDERRAHIME</div>`;

        navContainer.innerHTML = html;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const mod = item.dataset.module;
                const tab = item.dataset.tab || null;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.loadModule(mod, tab);
            });
        });

        if (this.currentModule) {
            const active = document.querySelector(`.nav-item[data-module="${this.currentModule}"]` +
                (this.currentTab ? `[data-tab="${this.currentTab}"]` : ''));
            if (active) active.classList.add('active');
        }
    },

    loadModule(mod, tab) {
        if (!Auth.canView(mod)) {
            document.getElementById('mainContent').innerHTML = '<div class="alert alert-danger"><i class="fas fa-lock"></i> Accès non autorisé à ce module.</div>';
            return;
        }

        // Preserve focus/caret for inputs (fixes search getting "stuck" on each keystroke)
        const focusSnap = (typeof UI !== 'undefined' && UI.captureFocus) ? UI.captureFocus() : null;

        this.currentModule = mod;
        this.currentTab = tab;
        const main = document.getElementById('mainContent');
        const bc = document.getElementById('breadcrumb');

        const titles = {
            dashboard:'Tableau de Bord', requests:'Demandes',
            procurement:'Approvisionnement', stock:'Stock & Inventaire',
            decharges:'Décharges', pvs:'PV de Mise à Disposition',
            notifications:'Notifications',
            suppliers:'Fournisseurs', workflow:'Workflow & Audit',
            settings:'Paramètres', reports:'Rapports & Statistiques', contracts:'Contrats', archives:'Base des Données (Scans)'
        };
        // Breadcrumb can depend on tab (especially for Stock which has two menu entries)
        if (bc) {
            if (mod === 'stock' && tab === 'inv') bc.textContent = "Codes d'inventaire (PV)";
            else if (mod === 'stock') bc.textContent = 'Stock & Inventaire';
            else if (mod === 'requests'){
                if(tab === 'das') bc.textContent = "DA - Demandes d'Achat";
                else if(tab === 'dss') bc.textContent = 'DS - Demandes de Service';
                else if(tab === 'dcs') bc.textContent = 'DC - Demandes de Contrat';
                else bc.textContent = titles[mod] || mod;
            }
            else bc.textContent = titles[mod] || mod;
        }

        try {
            switch(mod){
                case 'dashboard': main.innerHTML = Dashboard.render(); break;
                case 'notifications': main.innerHTML = NotificationsCenter.render(); break;
                case 'requests': main.innerHTML = Requests.render(tab || 'das'); break;
                case 'procurement': main.innerHTML = Procurement.render(tab || 'bcs'); break;
                case 'contracts': main.innerHTML = Contracts.render(); break;
                case 'budgets': main.innerHTML = Budgets.render(); break;
                case 'accounting': main.innerHTML = Accounting.render(); break;
                case 'evaluations': main.innerHTML = SupplierEvaluations.render(); break;
                case 'stock':
                    main.innerHTML = Stock.render();
                    // Post-process Stock view to really separate the two sections (articles vs inventaire codes)
                    this.postRenderStock(tab);
                    break;
                case 'decharges': main.innerHTML = Decharges.render(); break;
                case 'pvs': main.innerHTML = PVs.render(); break;
                case 'suppliers': main.innerHTML = Suppliers.render(); break;
                case 'workflow': main.innerHTML = WorkflowModule.render(); break;
                case 'settings': main.innerHTML = Settings.render(); break;
                case 'reports': main.innerHTML = Reports.render(); break;
                case 'archives': main.innerHTML = Archives.render(); break;
                default: main.innerHTML = '<p class="text-center text-muted mt-2">Module non trouvé</p>';
            }
        } catch(e) {
            console.error('Module error:', e);
            main.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Erreur de chargement: ${e.message}</div>`;
        }


        // Enable click-to-sort on all tables (adds header arrows automatically)
        try{
            if(typeof UI !== 'undefined' && UI.makeSortableTables) UI.makeSortableTables(main);
        }catch(e){}

        // Restore focus after full render
        if(focusSnap && typeof UI !== 'undefined' && UI.restoreFocus){
            setTimeout(()=>{ try{ UI.restoreFocus(focusSnap); }catch(_e){} }, 0);
        }

        // Optional post-render hooks (charts, etc.)
        try{
            if(mod === 'reports' && typeof Reports !== 'undefined' && Reports.afterRender){
                setTimeout(()=>{ try{ Reports.afterRender(); }catch(e){} }, 0);
            }
        }catch(e){}
    }
    ,

    // Debounced reload helper (ideal for search inputs)
    reloadDebounced(mod, tab=null, delay=180){
        try{ clearTimeout(this._reloadTimer); }catch(e){}
        this._reloadTimer = setTimeout(()=>{ this.loadModule(mod, tab); }, delay);
    },

    postRenderStock(tab){
        // Stock.render() outputs BOTH sections (Articles + Codes inventaire).
        // Sidebar entries should display only the selected section.
        try{
            const main = document.getElementById('mainContent');
            if(!main) return;

            // Find the two cards by header title (robust vs relying on order)
            const cards = Array.from(main.querySelectorAll('.card'));
            const stockCard = cards.find(c => (c.querySelector('.card-header h3')?.textContent || '').toLowerCase().includes('stock'));
            const invCard = cards.find(c => (c.querySelector('.card-header h3')?.textContent || '').toLowerCase().includes("codes d'inventaire"));

            if(!stockCard && !invCard) return;

            if(tab === 'inv'){
                if(stockCard) stockCard.style.display = 'none';
                if(invCard) invCard.style.display = '';
                const invInput = invCard?.querySelector('input[type="text"]');
                if(invInput) setTimeout(()=>invInput.focus(), 50);
            } else {
                if(stockCard) stockCard.style.display = '';
                if(invCard) invCard.style.display = 'none';
            }
        }catch(e){
            console.error('postRenderStock error:', e);
        }
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());