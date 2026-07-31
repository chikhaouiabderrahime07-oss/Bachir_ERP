/* ============================================================
   CORE.JS — Database · Auth · Lang · Utils · SessionMgr
   ERP v2.0 — Supplier/Logistics Management
   ============================================================ */

// ─── LANG (Bilingual FR/AR) ────────────────────────────────────
const T = {
  _l: localStorage.getItem('lang') || 'fr',
  fr: {
    app_name:'ERP Fournisseur', app_by:'Développé par CHIKHAOUI ABDERRAHIME',
    login:'Connexion', logout:'Déconnexion', username:'Identifiant', password:'Mot de passe',
    login_error:'Identifiants incorrects', login_sub:'Système de gestion — Accès sécurisé',
    // Nav
    nav_dashboard:'Tableau de Bord', nav_brs:'Bons de Réception', nav_bls:'Bons de Livraison',
    nav_caisse:'Ma Caisse', nav_admin_caisse:'Caisse Principale', nav_suppliers:'Fournisseurs',
    nav_catalogue:'Catalogue BD', nav_stats:'Statistiques', nav_eval:'Évaluation Utilisateurs',
    nav_users:'Utilisateurs', nav_settings:'Paramètres', nav_audit:'Audit',
    // Sections
    sec_documents:'Documents', sec_cash:'Trésorerie', sec_refs:'Références', sec_analysis:'Analyse', sec_admin:'Administration',
    // Common
    add:'Ajouter', edit:'Modifier', delete:'Supprimer', save:'Enregistrer', cancel:'Annuler',
    close:'Fermer', confirm:'Confirmer', print:'Imprimer', pdf:'PDF', search:'Rechercher...',
    yes:'Oui', no:'Non', all:'Tous', actions:'Actions', date:'Date', amount:'Montant',
    user_col:'Utilisateur', source:'Source', note:'Note', notes:'Notes', ref:'Référence',
    tags:'Tags', total:'Total', status:'Statut', supplier:'Fournisseur', details:'Détails',
    generate:'Générer', view:'Voir', loading:'Chargement...', no_data:'Aucune donnée',
    locked:'Verrouillé', unlock_admin:'Seul l\'Admin peut modifier',
    // BR
    br_title:'Bons de Réception', br_new:'Nouveau BR', br_ref:'Référence BR',
    br_num:'Numéro BR', br_num_hint:'Suggéré automatiquement — modifiable',
    br_num_exists:'Ce numéro existe déjà !', br_num_ok:'Numéro disponible',
    br_supplier:'Fournisseur', br_date:'Date de réception', br_lines:'Articles reçus',
    br_designation:'Désignation', br_unit:'Unité', br_qty:'Quantité', br_unit_price:'Prix Unitaire',
    br_disc:'Remise %', br_line_total:'Total Ligne', br_extra_fees:'Frais supplémentaires',
    br_timbre:'Timbre Fiscal', br_timbre_auto:'(calculé automatiquement)', br_total_ht:'Total HT',
    br_total_ttc:'Total TTC', br_notes:'Notes & Observations', br_tags:'Tags',
    br_add_line:'Ajouter Article', br_gen_bl:'Générer BL', br_gen_bl_short:'Générer BL',
    br_lock_msg:'Ce BR est verrouillé (livraison confirmée).',
    br_preview_ref:'Aperçu référence',
    // BL
    bl_title:'Bons de Livraison', bl_new:'Nouveau BL', bl_from_br:'Générer depuis BR',
    bl_truck:'Immatriculation Camion', bl_driver:'Nom du Chauffeur',
    bl_driver_hint:'Le camion sera auto-rempli si le chauffeur est connu',
    bl_delivered:'Confirmer Livraison', bl_delivered_msg:'Ceci va verrouiller définitivement le BR et le BL. Impossible à annuler par les utilisateurs.',
    bl_linked_br:'BR lié',
    // Status
    st_open:'Ouvert', st_delivered:'Livré', st_locked:'Verrouillé', st_pending:'En attente',
    // Caisse User
    caisse_title:'Ma Caisse — Session du Jour',
    caisse_morning_title:'Démarrage de journée',
    caisse_morning_greeting:'Bonjour !',
    caisse_morning_msg:'Votre monnaie de report d\'hier est :',
    caisse_morning_confirm:'Confirmer ce montant de départ ?',
    caisse_start_btn:'Démarrer ma journée',
    caisse_no_session:'Aucune session démarrée aujourd\'hui.',
    caisse_start_now:'Démarrer maintenant',
    caisse_especes:'Espèces (billets)',
    caisse_monnaie:'Monnaie / Change (pièces)',
    caisse_cloture:'Clôture de journée',
    caisse_cloture_msg:'Saisissez les montants physiques dans votre tiroir',
    caisse_expected:'Montant attendu (BR)',
    caisse_actual:'Montant réel déclaré',
    caisse_ecart:'Écart',
    caisse_br_total:'Total BR du jour',
    caisse_closed:'Journée clôturée',
    caisse_reopen:'Modifier clôture',
    caisse_especes_deposited:'Espèces → Caisse principale',
    // Admin caisse
    adm_title:'Caisse Principale', adm_balance:'Solde actuel',
    adm_inflows:'Entrées', adm_outflows:'Sorties', adm_transactions:'Transactions',
    adm_deposit:'Dépôt manuel', adm_withdrawal:'Retrait / Versement banque',
    adm_new_dep:'+ Dépôt', adm_new_with:'- Retrait',
    adm_confirm1:'Êtes-vous sûr de vouloir effectuer ce retrait ?',
    adm_confirm2:'CONFIRMATION FINALE : Cette opération est irréversible.',
    adm_immutable:'Cette opération ne peut être ni modifiée ni supprimée.',
    adm_correction_note:'Pour corriger une erreur, créez un nouveau dépôt avec la mention "Correction".',
    adm_dest:'Destination / Motif', adm_bank_ref:'Référence bancaire',
    adm_from_cloture:'Clôture utilisateur', adm_manual:'Manuel Admin',
    // Suppliers
    sup_title:'Fournisseurs', sup_new:'Nouveau Fournisseur', sup_name:'Nom',
    sup_phone:'Téléphone', sup_address:'Adresse', sup_contact:'Contact',
    // Users & Eval
    usr_title:'Utilisateurs', usr_new:'Nouvel Utilisateur', usr_name:'Nom complet',
    usr_login:'Identifiant (login)', usr_pass:'Mot de passe', usr_role:'Rôle',
    usr_active:'Actif', usr_inactive:'Inactif', usr_sessions:'Sessions',
    eval_title:'Évaluation Utilisateurs', eval_user:'Utilisateur', eval_login:'Heure connexion',
    eval_logout:'Heure déco.', eval_hours:'Heures travail', eval_brs:'BR créés',
    eval_deliveries:'Livraisons', eval_errors:'Écarts caisse', eval_date:'Date',
    // Settings
    set_title:'Paramètres', set_company:'Informations Société', set_timbre:'Timbre Fiscal',
    set_logos:'Logos', set_users:'Utilisateurs', set_data:'Données',
    set_logo_left:'Logo Gauche', set_logo_right:'Logo Droit',
    set_name:'Nom de la société', set_address:'Adresse', set_phone:'Téléphone',
    set_fax:'Fax', set_email:'Email', set_nif:'NIF', set_rc:'RC', set_nis:'NIS',
    set_timbre_slabs:'Tranches de timbre fiscal', set_slab_min:'Min (DA)', set_slab_max:'Max (DA)',
    set_slab_rate:'Taux %', set_slab_cap:'Plafond (DA)', set_add_slab:'Ajouter tranche',
    set_reset_slabs:'Réinitialiser (défauts légaux)',
    set_export:'Exporter données (JSON)', set_import:'Importer données',
    set_reset_all:'Réinitialiser tout', set_reset_confirm:'Ceci supprime TOUTES les données !',
    set_theme:'Apparence', set_theme_color:'Couleur principale',
    set_theme_mode:'Mode', set_light:'Clair', set_dark:'Sombre',
    // Stats
    stat_title:'Statistiques', stat_period:'Période',
    stat_week:'7 jours', stat_month:'Ce mois', stat_year:'Cette année', stat_all:'Tout',
    stat_br_total:'BR total', stat_bl_total:'BL total', stat_delivered:'Livrés',
    stat_caisse:'Montant total reçu', stat_per_supplier:'Par fournisseur', stat_per_user:'Par utilisateur',
    // Audit
    aud_title:'Journal d\'audit', aud_action:'Action', aud_collection:'Collection',
    aud_doc_id:'ID doc', aud_hash:'Hash', aud_by:'Par',
    aud_create:'Création', aud_update:'Modification', aud_delete:'Suppression',
    // Role labels
    role_admin:'Administrateur', role_user:'Utilisateur',
    // Misc
    col_ref:'Référence', col_date:'Date', col_supplier:'Fournisseur', col_amount:'Montant',
    col_status:'Statut', col_actions:'Actions', col_by:'Par', col_total_ht:'HT',
    col_timbre:'Timbre', col_total_ttc:'TTC', col_truck:'Immat. Camion', col_driver:'Chauffeur',
    col_user:'Utilisateur', col_source:'Source', col_note:'Note', col_type:'Type',
    // Clients
    nav_clients:'Clients', cli_title:'Clients', cli_new:'Nouveau Client', cli_name:'Nom',
    cli_phone:'Téléphone', cli_address:'Adresse', cli_contact:'Contact', col_client:'Client',
  },
  ar: {
    app_name:'نظام إدارة الموردين', app_by:'تطوير CHIKHAOUI ABDERRAHIME',
    login:'تسجيل الدخول', logout:'تسجيل الخروج', username:'اسم المستخدم', password:'كلمة المرور',
    login_error:'بيانات الدخول غير صحيحة', login_sub:'نظام الإدارة — دخول آمن',
    nav_dashboard:'لوحة التحكم', nav_brs:'وصولات الاستلام', nav_bls:'وصولات التسليم',
    nav_caisse:'صندوقي', nav_admin_caisse:'الصندوق الرئيسي', nav_suppliers:'الموردون', nav_clients:'الزبائن',
    nav_catalogue:'قاعدة البيانات', nav_stats:'الإحصائيات', nav_eval:'تقييم المستخدمين',
    nav_users:'المستخدمون', nav_settings:'الإعدادات', nav_audit:'سجل المراجعة',
    sec_documents:'الوثائق', sec_cash:'الخزينة', sec_refs:'المراجع', sec_analysis:'التحليل', sec_admin:'الإدارة',
    add:'إضافة', edit:'تعديل', delete:'حذف', save:'حفظ', cancel:'إلغاء',
    close:'إغلاق', confirm:'تأكيد', print:'طباعة', pdf:'PDF', search:'بحث...',
    yes:'نعم', no:'لا', all:'الكل', actions:'إجراءات', date:'التاريخ', amount:'المبلغ',
    user_col:'المستخدم', source:'المصدر', note:'ملاحظة', notes:'ملاحظات', ref:'المرجع',
    tags:'وسوم', total:'المجموع', status:'الحالة', supplier:'المورد', details:'التفاصيل',
    generate:'إنشاء', view:'عرض', loading:'جاري التحميل...', no_data:'لا توجد بيانات',
    locked:'مقفل', unlock_admin:'المسؤول فقط يمكنه التعديل',
    br_title:'وصولات الاستلام', br_new:'وصل استلام جديد', br_ref:'مرجع الوصل',
    br_num:'رقم الوصل', br_num_hint:'يُقترح تلقائياً — قابل للتعديل',
    br_num_exists:'هذا الرقم موجود مسبقاً!', br_num_ok:'الرقم متاح',
    br_supplier:'المورد', br_date:'تاريخ الاستلام', br_lines:'المواد المستلمة',
    br_designation:'التسمية', br_unit:'الوحدة', br_qty:'الكمية', br_unit_price:'سعر الوحدة',
    br_disc:'خصم %', br_line_total:'مجموع السطر', br_extra_fees:'رسوم إضافية',
    br_timbre:'الطابع الجبائي', br_timbre_auto:'(محسوب تلقائياً)', br_total_ht:'المجموع قبل الرسوم',
    br_total_ttc:'المجموع الشامل', br_notes:'ملاحظات وتعليقات', br_tags:'وسوم',
    br_add_line:'إضافة مادة', br_gen_bl:'إنشاء وصل تسليم', br_gen_bl_short:'وصل تسليم',
    br_lock_msg:'هذا الوصل مقفل (تم تأكيد التسليم).',
    br_preview_ref:'معاينة المرجع',
    bl_title:'وصولات التسليم', bl_new:'وصل تسليم جديد', bl_from_br:'إنشاء من وصل الاستلام',
    bl_truck:'رقم الشاحنة', bl_driver:'اسم السائق',
    bl_driver_hint:'سيتم ملء رقم الشاحنة تلقائياً إذا كان السائق معروفاً',
    bl_delivered:'تأكيد التسليم', bl_delivered_msg:'سيقفل هذا الإجراء وصل الاستلام والتسليم نهائياً. لا يمكن التراجع.',
    bl_linked_br:'وصل الاستلام المرتبط',
    st_open:'مفتوح', st_delivered:'تم التسليم', st_locked:'مقفل', st_pending:'معلق',
    caisse_title:'صندوقي — جلسة اليوم',
    caisse_morning_title:'بداية اليوم',
    caisse_morning_greeting:'صباح الخير!',
    caisse_morning_msg:'رصيد الصرف المُرحَّل من أمس هو:',
    caisse_morning_confirm:'تأكيد هذا المبلغ كنقطة بداية؟',
    caisse_start_btn:'بدء يومي',
    caisse_no_session:'لا توجد جلسة بدأت اليوم.',
    caisse_start_now:'ابدأ الآن',
    caisse_especes:'أوراق نقدية',
    caisse_monnaie:'قطع معدنية (صرف)',
    caisse_cloture:'إغلاق اليوم',
    caisse_cloture_msg:'أدخل المبالغ الفعلية في درجك',
    caisse_expected:'المبلغ المتوقع (وصولات الاستلام)',
    caisse_actual:'المبلغ الفعلي المُصرَّح به',
    caisse_ecart:'الفارق',
    caisse_br_total:'مجموع وصولات الاستلام اليوم',
    caisse_closed:'اليوم مغلق',
    caisse_reopen:'تعديل الإغلاق',
    caisse_especes_deposited:'الأوراق النقدية → الصندوق الرئيسي',
    adm_title:'الصندوق الرئيسي', adm_balance:'الرصيد الحالي',
    adm_inflows:'الإيرادات', adm_outflows:'المصروفات', adm_transactions:'المعاملات',
    adm_deposit:'إيداع يدوي', adm_withdrawal:'سحب / تحويل بنكي',
    adm_new_dep:'+ إيداع', adm_new_with:'- سحب',
    adm_confirm1:'هل أنت متأكد من إجراء هذا السحب؟',
    adm_confirm2:'التأكيد النهائي: هذه العملية لا يمكن التراجع عنها.',
    adm_immutable:'لا يمكن تعديل هذه العملية أو حذفها.',
    adm_correction_note:'لتصحيح خطأ، أنشئ إيداعاً جديداً بملاحظة "تصحيح".',
    adm_dest:'الوجهة / الغرض', adm_bank_ref:'المرجع البنكي',
    adm_from_cloture:'إغلاق يومي للمستخدم', adm_manual:'يدوي — المسؤول',
    sup_title:'الموردون', sup_new:'مورد جديد', sup_name:'الاسم',
    sup_phone:'الهاتف', sup_address:'العنوان', sup_contact:'جهة الاتصال',
    cli_title:'الزبائن', cli_new:'زبون جديد', cli_name:'الاسم',
    cli_phone:'الهاتف', cli_address:'العنوان', cli_contact:'جهة الاتصال', col_client:'الزبون',
    usr_title:'المستخدمون', usr_new:'مستخدم جديد', usr_name:'الاسم الكامل',
    usr_login:'معرف الدخول', usr_pass:'كلمة المرور', usr_role:'الدور',
    usr_active:'نشط', usr_inactive:'غير نشط', usr_sessions:'الجلسات',
    eval_title:'تقييم المستخدمين', eval_user:'المستخدم', eval_login:'وقت الدخول',
    eval_logout:'وقت الخروج', eval_hours:'ساعات العمل', eval_brs:'وصولات استلام',
    eval_deliveries:'التسليمات', eval_errors:'فوارق الصندوق', eval_date:'التاريخ',
    set_title:'الإعدادات', set_company:'معلومات الشركة', set_timbre:'الطابع الجبائي',
    set_logos:'الشعارات', set_users:'المستخدمون', set_data:'البيانات',
    set_logo_left:'الشعار الأيسر', set_logo_right:'الشعار الأيمن',
    set_name:'اسم الشركة', set_address:'العنوان', set_phone:'الهاتف',
    set_fax:'الفاكس', set_email:'البريد الإلكتروني', set_nif:'NIF', set_rc:'RC', set_nis:'NIS',
    set_timbre_slabs:'شرائح الطابع الجبائي', set_slab_min:'من (DA)', set_slab_max:'إلى (DA)',
    set_slab_rate:'نسبة %', set_slab_cap:'حد أقصى (DA)', set_add_slab:'إضافة شريحة',
    set_reset_slabs:'إعادة تعيين (الافتراضي القانوني)',
    set_export:'تصدير البيانات (JSON)', set_import:'استيراد البيانات',
    set_reset_all:'إعادة تعيين الكل', set_reset_confirm:'سيؤدي هذا إلى حذف جميع البيانات!',
    set_theme:'المظهر', set_theme_color:'اللون الرئيسي',
    set_theme_mode:'الوضع', set_light:'فاتح', set_dark:'داكن',
    stat_title:'الإحصائيات', stat_period:'الفترة',
    stat_week:'7 أيام', stat_month:'هذا الشهر', stat_year:'هذه السنة', stat_all:'الكل',
    stat_br_total:'إجمالي وصولات الاستلام', stat_bl_total:'إجمالي وصولات التسليم',
    stat_delivered:'تم التسليم', stat_caisse:'المبلغ الإجمالي المستلم',
    stat_per_supplier:'حسب المورد', stat_per_user:'حسب المستخدم',
    aud_title:'سجل المراجعة', aud_action:'الإجراء', aud_collection:'المجموعة',
    aud_doc_id:'معرف الوثيقة', aud_hash:'الرمز', aud_by:'بواسطة',
    aud_create:'إنشاء', aud_update:'تعديل', aud_delete:'حذف',
    role_admin:'مسؤول', role_user:'مستخدم',
    col_ref:'المرجع', col_date:'التاريخ', col_supplier:'المورد', col_amount:'المبلغ',
    col_status:'الحالة', col_actions:'إجراءات', col_by:'بواسطة', col_total_ht:'قبل الرسوم',
    col_timbre:'الطابع', col_total_ttc:'الشامل', col_truck:'رقم الشاحنة', col_driver:'السائق',
    col_user:'المستخدم', col_source:'المصدر', col_note:'ملاحظة', col_type:'النوع',
  },

  get(k) { return this[this._l]?.[k] || this.fr[k] || k; },
  current() { return this._l; },
  isRTL() { return this._l === 'ar'; },
  set(l) {
    this._l = l;
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', l === 'ar');
  }
};

// ─── DATABASE ──────────────────────────────────────────────────
const DB = {
  _cols: ['users','suppliers','clients','brs','bls','articles','drivers','sessions','caisse_admin','work_log','history','audit_log'],

  init() {
    this._cols.forEach(c => { if (!localStorage.getItem(c)) localStorage.setItem(c, '[]'); });
    if (!localStorage.getItem('settings')) this._resetSettings();
    if (!this.getAll('users').length) this._seed();
  },

  _seed() {
    this.rawSet('users', [
      { id:1, name:'Administrateur', username:'admin', password:'admin123', role:'admin', active:true, createdAt:new Date().toISOString() }
    ]);
  },

  _resetSettings() {
    const s = this._defaultSettings();
    localStorage.setItem('settings', JSON.stringify(s));
    return s;
  },

  _defaultSettings() {
    return {
      companyName: '',
      address: '',
      phone: '',  fax: '',  email: '',  nif: '',  rc: '',  nis: '',
      logoLeft: '',  logoRight: '',
      themeColor: '#0ea5e9',  themeMode: 'light',
      timbreSlabs: [
        { min:0,      max:99,      rate:0,    cap:null },
        { min:100,    max:100000,  rate:1,    cap:null },
        { min:100001, max:1000000, rate:0.5,  cap:null },
        { min:1000001,max:null,    rate:0.25, cap:10000 }
      ]
    };
  },

  getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('settings') || 'null');
      if (!s) return this._resetSettings();
      const def = this._defaultSettings();
      const merged = { ...def, ...s };
      if (!Array.isArray(merged.timbreSlabs) || !merged.timbreSlabs.length) merged.timbreSlabs = def.timbreSlabs;
      return merged;
    } catch { return this._resetSettings(); }
  },

  saveSettings(d) {
    const cur = this.getSettings();
    const upd = { ...cur, ...d };
    localStorage.setItem('settings', JSON.stringify(upd));
    return upd;
  },

  // CRUD
  getAll(col) { try { return JSON.parse(localStorage.getItem(col) || '[]'); } catch { return []; } },
  rawSet(col, data) { localStorage.setItem(col, JSON.stringify(data)); },
  getById(col, id) { return this.getAll(col).find(i => i.id === id) || null; },
  where(col, fn) { return this.getAll(col).filter(fn); },

  insert(col, data) {
    const items = this.getAll(col);
    const id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const u = Auth.getCurrentUser();
    const item = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: u?.id || null,
      createdByName: u?.name || 'Système',
      ...data
    };
    items.push(item);
    this.rawSet(col, items);
    this._audit('CREATE', col, id, null, item);
    this._history(col, id, 'CREATE', 'Création', null, item);
    return item;
  },

  update(col, id, data, note = 'Modification') {
    const items = this.getAll(col);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const old = { ...items[idx] };
    const u = Auth.getCurrentUser();
    items[idx] = {
      ...items[idx], ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: u?.id || null,
      updatedByName: u?.name || 'Système'
    };
    this.rawSet(col, items);
    this._audit('UPDATE', col, id, old, items[idx]);
    this._history(col, id, 'UPDATE', note, old, items[idx]);
    return items[idx];
  },

  delete(col, id) {
    const items = this.getAll(col);
    const old = items.find(i => i.id === id);
    this.rawSet(col, items.filter(i => i.id !== id));
    if (old) { this._audit('DELETE', col, id, old, null); this._history(col, id, 'DELETE', 'Suppression', old, null); }
    return true;
  },

  // ─── BR Numbering ─────────────────────────────────────────
  getNextBRNum() {
    const year = new Date().getFullYear();
    const brs = this.getAll('brs').filter(b => b.year === year);
    if (!brs.length) return 100;
    const nums = brs.map(b => parseInt(b.brNum) || 0).filter(n => n > 0);
    return nums.length ? Math.max(...nums) + 1 : 100;
  },
  isBRNumTaken(num, year, excludeId = null) {
    return this.getAll('brs').some(b => b.brNum == num && b.year == year && b.id !== excludeId);
  },
  buildBRRef(num, year, abbrev) {
    const n = String(num).padStart(3,'0');
    if (abbrev && abbrev.trim()) return `${n}/BR/${abbrev.trim().toUpperCase()}/${year}`;
    return `BR/${n}/${year}`;
  },
  buildBLRef(num, year, partNum, abbrev) {
    const n = String(num).padStart(3,'0');
    const base = abbrev && abbrev.trim()
      ? `${n}/BL/${abbrev.trim().toUpperCase()}/${year}`
      : `BL/${n}/${year}`;
    if (partNum) return `${base}/P${String(partNum).padStart(2,'0')}`;
    return base;
  },
  // Get next part number for a partial BL (for a given brId)
  getNextBLPartNum(brId) {
    const existing = this.getAll('bls').filter(b => b.brId === brId && b.partNum);
    if (!existing.length) return 1;
    return Math.max(...existing.map(b => Number(b.partNum)||0)) + 1;
  },


  // ─── Driver autocomplete ───────────────────────────────────
  getDriverIMM(name) {
    const d = this.getAll('drivers').find(d => d.name.toLowerCase() === (name || '').toLowerCase());
    return d ? d.imm : '';
  },
  saveDriver(name, imm) {
    if (!name || !imm) return;
    const drivers = this.getAll('drivers');
    const idx = drivers.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) { drivers[idx].imm = imm; this.rawSet('drivers', drivers); }
    else { this.insert('drivers', { name, imm }); }
  },

  // ─── Timbre calculation ────────────────────────────────────
  calcTimbre(amountHT) {
    const slabs = this.getSettings().timbreSlabs || [];
    const amt = Number(amountHT) || 0;
    for (const s of slabs) {
      const inRange = amt >= s.min && (s.max === null || amt <= s.max);
      if (inRange) {
        let t = amt * (s.rate / 100);
        if (s.cap !== null) t = Math.min(t, s.cap);
        return Math.round(t * 100) / 100;
      }
    }
    return 0;
  },

  // ─── Article catalog ───────────────────────────────────────
  searchArticles(q) {
    return this.getAll('articles')
      .filter(a => a.name.toLowerCase().includes((q||'').toLowerCase()))
      .slice(0, 10);
  },
  saveArticle(name, unit, price) {
    if (!name) return;
    const arts = this.getAll('articles');
    const idx = arts.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) { arts[idx] = { ...arts[idx], unit: unit || arts[idx].unit, price: price || arts[idx].price }; this.rawSet('articles', arts); }
    else { this.insert('articles', { name, unit: unit||'', price: Number(price)||0 }); }
  },

  // ─── Audit chain ───────────────────────────────────────────
  _fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24)) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  },
  _audit(action, col, id, oldData, newData) {
    const log = this.getAll('audit_log');
    const u = Auth.getCurrentUser();
    const prev = log.length ? (log[log.length-1].hash || '') : '';
    const ts = new Date().toISOString();
    const entry = { id: log.length+1, ts, userId: u?.id||null, userName: u?.name||'System', action, collection: col, docId: id, prevHash: prev };
    entry.hash = this._fnv(`${prev}|${ts}|${entry.userId}|${action}|${col}|${id}`);
    log.push(entry);
    localStorage.setItem('audit_log', JSON.stringify(log.slice(-5000)));
  },
  _history(col, id, action, note, oldData, newData) {
    const h = this.getAll('history');
    const u = Auth.getCurrentUser();
    h.push({ id: h.length+1, ts: new Date().toISOString(), col, docId: id, action, note, userId: u?.id||null, userName: u?.name||'System' });
    localStorage.setItem('history', JSON.stringify(h.slice(-3000)));
  },
  getHistory(col, id) {
    return this.getAll('history').filter(h => h.col === col && h.docId === id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
  },

  exportAll() {
    const d = {};
    this._cols.forEach(c => { d[c] = this.getAll(c); });
    d.settings = this.getSettings();
    d.exportedAt = new Date().toISOString();
    return JSON.stringify(d, null, 2);
  },
  importAll(json) {
    try {
      const d = JSON.parse(json);
      Object.keys(d).forEach(k => {
        if (k === 'settings') localStorage.setItem('settings', JSON.stringify(d[k]));
        else if (k !== 'exportedAt') localStorage.setItem(k, JSON.stringify(d[k]));
      });
      return true;
    } catch { return false; }
  },
  hardReset() {
    if (!confirm(T.get('set_reset_confirm'))) return;
    if (!confirm('CONFIRMATION FINALE — Toutes les données seront effacées.')) return;
    localStorage.clear(); this.init(); location.reload();
  }
};

// ─── AUTH ──────────────────────────────────────────────────────
const Auth = {
  getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; } },
  isLoggedIn() { return !!this.getCurrentUser(); },
  isAdmin() { return this.getCurrentUser()?.role === 'admin'; },

  login(username, password) {
    const u = DB.getAll('users').find(u => u.username===username && u.password===password && u.active!==false);
    if (!u) return false;
    localStorage.setItem('currentUser', JSON.stringify(u));
    // Log work start AFTER saving currentUser so DB.insert can read it
    WorkLog.logIn(u.id);
    return u;
  },

  logout() {
    const u = this.getCurrentUser();
    if (u) WorkLog.logOut(u.id);
    localStorage.removeItem('currentUser');
    location.reload();
  },

  canEdit(doc) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    if (doc?.status === 'delivered' || doc?.status === 'locked') return false;
    return true;
  },
  canDelete(doc) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    if (doc?.status === 'delivered' || doc?.status === 'locked') return false;
    return doc?.createdBy === u.id;
  }
};

// ─── UTILS ────────────────────────────────────────────────────
const Utils = {
  fmtDate(d) {
    if (!d) return '';
    try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; }
    catch { return String(d); }
  },
  fmtDateTime(d) {
    if (!d) return '';
    try { const dt = new Date(d); return `${this.fmtDate(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; }
    catch { return String(d); }
  },
  fmtCurrency(v) {
    const n = Number(v) || 0;
    const [int, dec] = n.toFixed(2).split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + ',' + dec + '\u00a0DA';
    return formatted; // Always LTR-safe — caller wraps in <bdi> or dir=ltr span as needed
  },
  fmtCurrencyHTML(v) {
    // Use this in HTML contexts to guarantee LTR display even in RTL mode
    const n = Number(v) || 0;
    const [int, dec] = n.toFixed(2).split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + ',' + dec + '\u00a0DA';
    return `<span dir="ltr" style="unicode-bidi:embed;display:inline-block">${formatted}</span>`;
  },
  /* Use LOCAL timezone — toISOString() is UTC which gives wrong date in GMT+1 */
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  todayKey() { return this.today(); },

  escHTML(s) {
    const d = document.createElement('div'); d.appendChild(document.createTextNode(String(s??'')));
    return d.innerHTML;
  },

  notify(msg, type='info', dur=4000) {
    const c = document.getElementById('notifContainer'); if (!c) return;
    const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    const el = document.createElement('div');
    el.className = `notif notif-${type==='error'?'error':type}`;
    el.style.cssText = 'display:flex;align-items:center;gap:10px';
    el.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i><span>${this.escHTML(msg)}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.style.animation='slideOut .35s ease forwards'; setTimeout(()=>el.remove(), 380); }, dur);
  },

  statusBadge(status) {
    const m = {
      open:      ['badge-primary', 'fa-circle-dot', T.get('st_open')],
      reception: ['badge-warning', 'fa-clock',      T.get('st_pending')],
      delivered: ['badge-success', 'fa-check-circle',T.get('st_delivered')],
      locked:    ['badge-danger',  'fa-lock',        T.get('st_locked')],
    };
    const [cls, icon, label] = m[status] || ['badge-secondary', 'fa-circle', status||''];
    return `<span class="badge ${cls}"><i class="fas ${icon}"></i> ${label}</span>`;
  },

  confirm2(msg1, msg2) { return confirm(msg1) && confirm(msg2); },

  debounce(fn, d=200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), d); }; },

  historyHTML(col, id) {
    const entries = DB.getHistory(col, id);
    if (!entries.length) return '';
    return `<div class="history-section">
      <h4><i class="fas fa-history"></i> Historique</h4>
      ${entries.map(e => `<div class="history-entry">
        <div class="history-dot"></div>
        <span class="h-time">${this.fmtDateTime(e.ts)}</span>
        <span class="h-desc">${this.escHTML(e.note)}</span>
        <span class="h-user">${this.escHTML(e.userName||'')}</span>
      </div>`).join('')}
    </div>`;
  }
};

// ─── WORK LOG ─────────────────────────────────────────────────
const WorkLog = {
  logIn(userId) {
    const today = Utils.today();
    const logs = DB.getAll('work_log');
    const existing = logs.find(l => l.userId === userId && l.date === today && !l.logoutTime);
    if (!existing) {
      // Use rawSet to avoid auth dependency issue during login timing
      const items = logs;
      const id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
      const entry = { id, userId, date: today, loginTime: new Date().toISOString(), logoutTime: null, createdAt: new Date().toISOString() };
      items.push(entry);
      DB.rawSet('work_log', items);
    }
  },
  logOut(userId) {
    const today = Utils.today();
    const logs = DB.getAll('work_log');
    const idx = logs.slice().reverse().findIndex(l => l.userId === userId && l.date === today && !l.logoutTime);
    if (idx >= 0) {
      const realIdx = logs.length - 1 - idx;
      logs[realIdx].logoutTime = new Date().toISOString();
      DB.rawSet('work_log', logs);
    }
  },
  getUserStats(userId) {
    const logs = DB.where('work_log', l => l.userId === userId);
    const brs = DB.where('brs', b => b.createdBy === userId);
    const bls = DB.where('bls', b => b.createdBy === userId && b.status === 'delivered');
    const sessions = DB.where('sessions', s => s.userId === userId && s.status === 'closed');
    const totalErrors = sessions.reduce((sum, s) => sum + Math.abs(s.ecart || 0), 0);
    return { logs, brs: brs.length, deliveries: bls.length, sessions, totalErrors };
  }
};

// ─── SESSION MANAGER ──────────────────────────────────────────
const SessionMgr = {
  getTodaySession(userId) {
    return DB.getAll('sessions').find(s => s.userId === userId && s.date === Utils.today()) || null;
  },
  getLastClosedSession(userId) {
    const today = Utils.today();
    return DB.getAll('sessions')
      .filter(s => s.userId === userId && s.date < today && s.status === 'closed')
      .sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
  },
  getDayBRTotal(userId, date) {
    return DB.getAll('brs')
      .filter(br => br.createdBy === userId && (br.date||'').slice(0,10) === date)
      .reduce((s,br) => s + (Number(br.totalTTC)||0), 0);
  },
  startSession(userId, startingMonnaie = 0) {
    const existing = this.getTodaySession(userId);
    if (existing) return existing;
    return DB.insert('sessions', {
      userId, date: Utils.today(),
      startingMonnaie: Number(startingMonnaie)||0,
      status: 'open',
      closedEspeces: null, closedMonnaie: null, ecart: null,
      closedAt: null
    });
  },
  closeSession(userId, especes, monnaie) {
    const session = this.getTodaySession(userId);
    if (!session) return null;
    const brTotal = this.getDayBRTotal(userId, session.date);
    const ecart = Number(especes) - brTotal;
    const updated = DB.update('sessions', session.id, {
      status: 'closed',
      closedEspeces: Number(especes),
      closedMonnaie: Number(monnaie),
      ecart: ecart,
      closedAt: new Date().toISOString()
    }, 'Clôture de journée');
    // Auto-deposit espèces to admin caisse
    const user = DB.getById('users', userId);
    DB.insert('caisse_admin', {
      type: 'deposit',
      source: 'user_cloture',
      userId,
      userName: user?.name || 'Utilisateur',
      sessionId: session.id,
      sessionDate: session.date,
      amount: Number(especes),
      note: `Clôture journée — ${user?.name||''} — ${session.date}`
    });
    return updated;
  },
  updateCloture(userId, especes, monnaie) {
    const session = this.getTodaySession(userId);
    if (!session) return null;
    const brTotal = this.getDayBRTotal(userId, session.date);
    const ecart = Number(especes) - brTotal;
    // Update the admin caisse deposit for today
    const caisseEntries = DB.getAll('caisse_admin');
    const dep = caisseEntries.find(e => e.sessionId === session.id && e.source === 'user_cloture');
    if (dep) { DB.update('caisse_admin', dep.id, { amount: Number(especes) }, 'Mise à jour clôture'); }
    return DB.update('sessions', session.id, {
      closedEspeces: Number(especes),
      closedMonnaie: Number(monnaie),
      ecart, closedAt: new Date().toISOString()
    }, 'Modification clôture');
  }
};
