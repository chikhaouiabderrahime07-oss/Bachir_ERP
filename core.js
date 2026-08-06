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
    // Recycle bin
    nav_recycle:'Corbeille', rb_title:'Corbeille — Historique des suppressions',
    rb_collection:'Collection', rb_item:'Elément', rb_deleted_at:'Supprimé le', rb_deleted_by:'Par',
    rb_restore:'Restaurer', rb_empty:'La corbeille est vide',
    rb_ref_taken:'Référence prise — nouveau numéro:', rb_restored:'Elément restauré !',
    rb_already:'Déjà restauré', rb_confirm_restore:'Confirmer la restauration de cet élément ?',
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
    // Recycle bin
    nav_recycle:'سلة المحذوفات', rb_title:'سلة المحذوفات — سجل الحذف',
    rb_collection:'المجموعة', rb_item:'العنصر', rb_deleted_at:'حُذف بتاريخ', rb_deleted_by:'بواسطة',
    rb_restore:'استعادة', rb_empty:'سلة المحذوفات فارغة',
    rb_ref_taken:'المرجع مستخدم — رقم جديد:', rb_restored:'تمت استعادة العنصر!',
    rb_already:'تمت الاستعادة مسبقاً', rb_confirm_restore:'تأكيد استعادة هذا العنصر؟',
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
  _cols: ['users','suppliers','clients','brs','bls','articles','drivers','sessions','caisse_admin','work_log','history','audit_log','recycle_bin'],

  init() {
    this._cols.forEach(c => { if (!localStorage.getItem(c)) localStorage.setItem(c, '[]'); });
    if (!localStorage.getItem('settings')) this._resetSettings();
    if (!this.getAll('users').length) this._seed();

    // ── Run data migrations on every boot (idempotent) ──
    this.runMigrations();

    // Cloud mode: if localStorage appears empty or cleared, restore from MongoDB
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      const hasData = this._cols.some(c => this.getAll(c).length > 0);
      if (!hasData) {
        // Silently restore in background — login will also do a full sync
        window.API.syncCloudToLocal().then(() => {
          // If we now have users, reload the page so the login screen picks them up
          if (this.getAll('users').length > 1) location.reload();
        }).catch(() => {});
      }
    }
  },

  // ─── Data Migrations (run on every boot, fully idempotent) ──────
  // Each migration checks before acting — safe to run multiple times.
  runMigrations() {
    try {
      this._migrateBLDeliveryCaisseEntries();   // M001: backfill missing caisse entries
      this._migrateCleanOrphanCaisse();          // M002: remove caisse entries for deleted BLs
      this._migrateTimbreSlabsToLF2025();        // M003: update old timbre slabs to LF2025 format
      // Add future migrations here as _migrateXxx()
    } catch(e) {
      console.warn('[Migration] Error:', e);
    }
  },


  // Migration M001: Backfill caisse_admin entries for ALL delivered BLs
  // that were confirmed before the new caisse-on-delivery flow was added.
  // Rule: cash goes to BL creator (bl.createdBy), amount from BR (br.totalTTC).
  _migrateBLDeliveryCaisseEntries() {
    const deliveredBLs = this.getAll('bls').filter(bl => bl.status === 'delivered');
    const existingEntries = this.getAll('caisse_admin');
    let added = 0;

    for (const bl of deliveredBLs) {
      // Skip if already has a caisse entry for this BL
      const alreadyExists = existingEntries.some(e => e.blId === bl.id && e.source === 'bl_delivery');
      if (alreadyExists) continue;

      const br = this.getById('brs', bl.brId);
      const amount = Number(br?.totalTTC || bl.totalTTC || 0);
      if (!amount) continue;

      // BL creator gets the cash
      const blCreatorId = bl.createdBy;
      if (!blCreatorId) continue;
      const blCreator = this.getById('users', blCreatorId);

      // Use deliveredAt date for sessionDate so it lands in the right day's caisse
      const sessionDate = (bl.deliveredAt || bl.date || '').slice(0, 10) || Utils.today();

      this.insert('caisse_admin', {
        type: 'deposit',
        source: 'bl_delivery',
        blId: bl.id,
        blRef: bl.ref,
        brRef: br?.ref,
        brCreatedBy: br?.createdBy,
        brCreatedByName: br?.createdByName,
        userId: blCreatorId,
        userName: blCreator?.name || blCreator?.username || 'Utilisateur',
        deliveredBy: bl.deliveredBy || blCreatorId,
        deliveredByName: bl.deliveredByName || blCreator?.name || '—',
        sessionDate,
        amount,
        note: `[MIGRATION] BL ${bl.ref} (BR ${br?.ref || '?'}) — créé par ${blCreator?.name || '?'}, livré le ${sessionDate}`,
        // Use deliveredAt as createdAt so it sorts correctly in history
        createdAt: bl.deliveredAt || new Date().toISOString()
      });
      added++;
    }

    if (added > 0) {
      console.log(`[Migration M001] Backfilled ${added} caisse_admin entries for delivered BLs.`);
    }
  },

  // Migration M002: Remove caisse_admin bl_delivery entries for BLs that no longer exist
  // This handles the case where an admin deleted a delivered BL but the caisse entry stayed.
  _migrateCleanOrphanCaisse() {
    const allBLIds = new Set(this.getAll('bls').map(bl => bl.id));
    const caisse = this.getAll('caisse_admin');
    const orphans = caisse.filter(e => e.source === 'bl_delivery' && e.blId && !allBLIds.has(e.blId));
    if (!orphans.length) return;
    const cleanedCaisse = caisse.filter(e => !(e.source === 'bl_delivery' && e.blId && !allBLIds.has(e.blId)));
    this.rawSet('caisse_admin', cleanedCaisse);
    console.log(`[Migration M002] Removed ${orphans.length} orphan caisse entries for deleted BLs.`);
  },

  // Migration M003: Upgrade old-format timbre slabs (rate%) to LF2025 (ratePerTranche)
  // Runs once if settings still have old `rate` field without `ratePerTranche`.
  _migrateTimbreSlabsToLF2025() {
    const s = this.getSettings();
    if (!s.timbreSlabs?.length) return;
    // Check if already migrated (new format has ratePerTranche)
    if (s.timbreSlabs[0].ratePerTranche !== undefined) return;
    // Replace with correct LF2025 slabs
    const lf2025 = this._defaultSettings().timbreSlabs;
    this.saveSettings({ timbreSlabs: lf2025, timbreMin: 5 });
    console.log('[Migration M003] Upgraded timbre slabs to LF2025 Algerian law format.');
  },


  // ─── Live sync: poll MongoDB every 60s so all users see fresh data ───
  startLiveSync() {
    if (typeof window.API === 'undefined' || location.protocol === 'file:') return;
    const COLS = [
      'brs','bls','suppliers','clients','caisse_admin','sessions','history',
      // Reference data (shared across users — must stay synced)
      'users','articles','drivers',
      // Extra
      'work_log','recycle_bin'
    ];
    const MERGE_COLS = new Set(['history']);
    let indicator = null;

    setInterval(async () => {
      // Skip sync while a modal is open — prevents destroying Générer BL form
      if (document.getElementById('modalOverlay')?.classList.contains('active')) return;

      try {
        const results = await Promise.allSettled(
          COLS.map(col => window.API.getAll(col).then(data => ({ col, data })))
        );
        for (const r of results) {
          if (r.status !== 'fulfilled' || !r.value?.data || !Array.isArray(r.value.data)) continue;
          const { col, data } = r.value;
          if (MERGE_COLS.has(col)) {
            const local = JSON.parse(localStorage.getItem(col) || '[]');
            const serverIds = new Set(data.map(e => `${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
            const uniqueLocal = local.filter(e => !serverIds.has(`${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
            localStorage.setItem(col, JSON.stringify([...data, ...uniqueLocal].slice(-5000)));
          } else {
            localStorage.setItem(col, JSON.stringify(data));
          }
        }
        // Update sync indicator dot only — NO page reload (that destroys open modals/forms)
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.id = 'sync-indicator';
          indicator.title = 'Synchronisé avec le cloud';
          indicator.style.cssText = 'position:fixed;bottom:12px;right:12px;width:8px;height:8px;border-radius:50%;background:#10b981;z-index:9999;opacity:.8;transition:all .3s';
          document.body.appendChild(indicator);
        }
        indicator.style.background = '#10b981';
        indicator.title = 'Synchronisé — ' + new Date().toLocaleTimeString('fr-FR');
        // Re-run migrations after sync in case new delivered BLs came in from other users
        this.runMigrations();
      } catch (e) {
        if (indicator) { indicator.style.background = '#ef4444'; indicator.title = 'Sync échoué'; }
      }
    }, 60000);
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
      // ── Timbre fiscal Algérie — Loi de Finances 2025 ──────────────
      // Méthode: ceil(montant / 100) × taux_par_tranche
      // Chaque tranche = 100 DA ou fraction de tranche (arrondi supérieur)
      // Minimum légal: 5 DA si timbre > 0
      // Source: Code du timbre, art. 258 et suiv. (LF 2025)
      timbreSlabs: [
        { min:0,     max:299,    ratePerTranche:0,   label:'Exonéré (< 300 DA)' },
        { min:300,   max:30000,  ratePerTranche:1,   label:'1 DA / tranche de 100 DA' },
        { min:30001, max:100000, ratePerTranche:1.5, label:'1,5 DA / tranche de 100 DA' },
        { min:100001,max:null,   ratePerTranche:2,   label:'2 DA / tranche de 100 DA' }
      ],
      timbreMin: 5
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
    // Cloud sync settings
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.saveSettings(upd).catch(e => {
        console.warn('[DB.saveSettings] cloud sync failed', e.message);
      });
    }
    return upd;
  },

  // CRUD
  getAll(col) { try { return JSON.parse(localStorage.getItem(col) || '[]'); } catch { return []; } },
  
  // rawSet: write to localStorage ONLY (fast local cache)
  // Individual insert/update/delete methods handle cloud sync atomically
  rawSet(col, data) {
    localStorage.setItem(col, JSON.stringify(data));
  },
  
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

    // ── Cloud: send to server, which assigns the REAL unique ID/brNum/blNum ──
    // On error (409 duplicate etc.) → roll back optimistic localStorage save.
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.insert(col, item).then(serverItem => {
        if (!serverItem) {
          // null = 401/token expired — roll back
          const rolled = this.getAll(col).filter(i => i.id !== item.id);
          localStorage.setItem(col, JSON.stringify(rolled));
          if (typeof App !== 'undefined' && App._currentModule) setTimeout(() => App.reloadCurrent(), 100);
          return;
        }
        // Replace optimistic local item with server-confirmed item (may have different id/brNum/blNum)
        const latest = this.getAll(col).map(i => i.id === item.id ? serverItem : i);
        localStorage.setItem(col, JSON.stringify(latest));

        const hasBrChange = col === 'brs' && serverItem.brNum !== item.brNum;
        const hasBlChange = col === 'bls' && serverItem.ref && serverItem.ref !== item.ref;
        if (hasBrChange || hasBlChange) {
          const oldRef = col === 'brs' ? `${item.brNum}` : `${item.ref}`;
          const newRef = col === 'brs' ? `${serverItem.brNum}` : `${serverItem.ref}`;
          if (typeof Utils !== 'undefined') Utils.notify(`⚠️ Numéro ajusté: ${oldRef} → ${newRef} (conflit résolu)`, 'warning', 5000);
          if (typeof App !== 'undefined' && App._currentModule) setTimeout(() => App.reloadCurrent(), 400);
        }
      }).catch(e => {
        // Server rejected (409 duplicate, 500, etc.) — roll back optimistic save & show error
        const rolled = this.getAll(col).filter(i => i.id !== item.id);
        localStorage.setItem(col, JSON.stringify(rolled));
        if (typeof Utils !== 'undefined') Utils.notify('❌ ' + (e.message || 'Erreur serveur'), 'error');
        if (typeof App !== 'undefined' && App._currentModule) setTimeout(() => App.reloadCurrent(), 200);
      });
    }

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
    // ── Cloud: atomic UPDATE (safe for concurrent users) ──
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.update(col, id, items[idx]).catch(e => console.warn('[DB.update] cloud sync failed', e.message));
    }
    return items[idx];
  },

  delete(col, id) {
    const items = this.getAll(col);
    const old = items.find(i => i.id === id);
    if (!old) return false;

    // ── Save to Recycle Bin before deleting ──
    const u = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const recyclable = ['brs','bls','suppliers','clients','articles','drivers','users'];
    if (recyclable.includes(col)) {
      const bin = this.getAll('recycle_bin');
      const maxId = bin.reduce((m,e) => Math.max(m, e.id||0), 0);
      bin.push({
        id: maxId + 1,
        collection: col,
        item: { ...old },
        deletedAt: new Date().toISOString(),
        deletedBy: u?.id,
        deletedByName: u?.name || u?.username || 'Système',
        restored: false
      });
      localStorage.setItem('recycle_bin', JSON.stringify(bin));
      // Cloud sync recycle bin entry
      if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
        window.API.insert('recycle_bin', bin[bin.length-1]).catch(() => {});
      }
    }

    this.rawSet(col, items.filter(i => i.id !== id));
    if (old) { this._audit('DELETE', col, id, old, null); this._history(col, id, 'DELETE', 'Suppression', old, null); }
    // ── Cloud: atomic DELETE (safe for concurrent users) ──
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.remove(col, id).catch(e => console.warn('[DB.delete] cloud sync failed', e.message));
    }
    return true;
  },

  // ─── Recycle Bin: Restore ──────────────────────────────────
  restoreFromBin(binId, overrideData = {}) {
    const bin = this.getAll('recycle_bin');
    const entry = bin.find(e => e.id === binId);
    if (!entry || entry.restored) return { ok: false, error: 'Introuvable ou déjà restauré' };

    const { collection, item } = entry;
    const existing = this.getAll(collection);

    // Check if ref/num conflicts
    let finalItem = { ...item, ...overrideData };
    let refWarning = null;

    if (collection === 'brs' || collection === 'bls') {
      const refField = 'ref';
      const existingRefs = existing.map(e => e[refField]);
      if (existingRefs.includes(finalItem.ref)) {
        // Auto-assign new number
        const nums = existing.map(e => Number(e.brNum || e.partNum || 0));
        const newNum = (Math.max(0, ...nums) + 1);
        const oldRef = finalItem.ref;
        if (collection === 'brs') {
          finalItem.brNum = newNum;
          finalItem.ref = this.buildBRRef(newNum, finalItem.year || new Date().getFullYear(),
            this.getById('suppliers', finalItem.supplierId)?.abbrev || '');
        } else {
          finalItem.partNum = newNum;
          finalItem.ref = finalItem.ref.replace(/\d+/, newNum);
        }
        refWarning = { oldRef, newRef: finalItem.ref };
      }
    }

    // Re-insert with new id
    delete finalItem.id;
    finalItem.status = finalItem.status === 'delivered' ? 'open' : (finalItem.status || 'open');
    finalItem.restoredFrom = 'recycle_bin';
    finalItem.restoredAt = new Date().toISOString();
    const restored = this.insert(collection, finalItem);

    // Mark as restored in bin
    const updatedBin = bin.map(e => e.id === binId ? { ...e, restored: true, restoredAt: new Date().toISOString() } : e);
    localStorage.setItem('recycle_bin', JSON.stringify(updatedBin));

    return { ok: true, item: restored, refWarning };
  },

  // ─── BR Numbering ─────────────────────────────────────────
  // Returns the lowest available (gap-filling) BR number for the year.
  // Asks server for the real list to avoid stale localStorage.
  async getNextBRNum() {
    const year = new Date().getFullYear();
    try {
      let takenNums;
      if (window.API) {
        const serverBrs = await API.getAll('brs').catch(() => null);
        takenNums = (serverBrs || this.getAll('brs'))
          .filter(b => b.year === year)
          .map(b => parseInt(b.brNum) || 0)
          .filter(n => n > 0);
      } else {
        takenNums = this.getAll('brs').filter(b => b.year === year).map(b => parseInt(b.brNum) || 0).filter(n => n > 0);
      }
      if (!takenNums.length) return 100;
      const takenSet = new Set(takenNums);
      // Find lowest gap starting from 100
      let candidate = 100;
      while (takenSet.has(candidate)) candidate++;
      return candidate;
    } catch (e) {
      const brs = this.getAll('brs').filter(b => b.year === year);
      if (!brs.length) return 100;
      const nums = brs.map(b => parseInt(b.brNum) || 0).filter(n => n > 0);
      if (!nums.length) return 100;
      const takenSet = new Set(nums);
      let candidate = 100;
      while (takenSet.has(candidate)) candidate++;
      return candidate;
    }
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

  // ─── Timbre calculation — Algérie LF2025 ──────────────────
  // Méthode légale: nombre de tranches de 100 DA (arrondi supérieur) × taux
  // Exemple: 10 000 DA → ceil(10000/100)=100 tranches × 1 DA = 100 DA
  // Exemple: 50 000 DA → ceil(50000/100)=500 tranches × 1,5 DA = 750 DA
  // Exemple: 200 000 DA → ceil(200000/100)=2000 tranches × 2 DA = 4 000 DA
  calcTimbre(amountHT) {
    const settings = this.getSettings();
    const slabs = settings.timbreSlabs || [];
    const timbreMin = Number(settings.timbreMin) || 5;
    const amt = Number(amountHT) || 0;

    for (const s of slabs) {
      const inRange = amt >= s.min && (s.max === null || amt <= s.max);
      if (!inRange) continue;

      // Legacy support: old slabs had `rate` (%), new slabs have `ratePerTranche`
      if (s.ratePerTranche !== undefined) {
        // Algerian ceiling-tranche method
        if (s.ratePerTranche === 0) return 0; // exonéré
        const tranches = Math.ceil(amt / 100);
        const t = tranches * s.ratePerTranche;
        // Apply legal minimum (5 DA)
        const result = Math.max(timbreMin, t);
        return Math.round(result * 100) / 100;
      } else {
        // Legacy percentage method (backwards compat)
        let t = amt * (s.rate / 100);
        if (s.cap !== null) t = Math.min(t, s.cap);
        return Math.round(t * 100) / 100;
      }
    }
    return 0;
  },

  // Preview timbre for a given amount (used in settings UI)
  previewTimbre(amt) {
    const t = this.calcTimbre(amt);
    return { timbre: t, total: Number(amt) + t };
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
    // Push to server so audit persists across sessions
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.insert('audit_log', entry).catch(e => console.warn('[audit] cloud push failed', e.message));
    }
  },
  _history(col, id, action, note, oldData, newData) {
    const h = this.getAll('history');
    const u = Auth.getCurrentUser();
    const entry = { id: h.length+1, ts: new Date().toISOString(), col, docId: id, action, note, userId: u?.id||null, userName: u?.name||'System' };
    h.push(entry);
    localStorage.setItem('history', JSON.stringify(h.slice(-3000)));
    // Push to server so history persists across sessions
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.insert('history', entry).catch(e => console.warn('[history] cloud push failed', e.message));
    }
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
  async hardReset() {
    const ok1 = await Dialog.confirm(T.isRTL() ? 'تأكيد' : 'Confirmation', T.get('set_reset_confirm'), 'danger');
    if (!ok1) return;
    const ok2 = await Dialog.confirm(T.isRTL() ? 'تأكيد نهائي' : 'CONFIRMATION FINALE', 'CONFIRMATION FINALE — Toutes les données seront effacées.', 'danger');
    if (!ok2) return;
    localStorage.clear(); this.init(); location.reload();
  }
};

// ─── AUTH ──────────────────────────────────────────────────────
const Auth = {
  getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; } },
  isLoggedIn() { return !!this.getCurrentUser(); },
  isAdmin() { return this.getCurrentUser()?.role === 'admin'; },

  login(username, password, forceBypass = false) {
    const u = DB.getAll('users').find(u => u.username===username && u.password===password && u.active!==false);
    if (!u && !forceBypass) return false;
    
    // If forced bypass but user not found (first login on new client), create a temporary session user
    const finalUser = u || { id: 'admin', username, role: 'admin', name: username };
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    // Log work start AFTER saving currentUser so DB.insert can read it
    if (u) WorkLog.logIn(u.id);
    return finalUser;
  },

  logout() {
    const u = this.getCurrentUser();
    if (u) WorkLog.logOut(u.id);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('_erp_token');
    if (window.API) API.logout();
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

// ─── DIALOG — Custom modal replaces alert/confirm/prompt ──────
const Dialog = {
  _icons: { danger:'fa-skull-crossbones', warning:'fa-exclamation-triangle', success:'fa-check-circle', info:'fa-info-circle' },

  show({ title='', message='', type='info', confirmText='OK', cancelText=null, inputType=null, inputPlaceholder='', inputLabel='' }) {
    return new Promise(resolve => {
      const id = 'dlg_' + Date.now();
      const hasInput = !!inputType;
      const icon = this._icons[type] || 'fa-info-circle';
      const html = `
        <div class="dlg-overlay" id="${id}">
          <div class="dlg-box dlg-${type}">
            <div class="dlg-icon-wrap"><i class="fas ${icon}"></i></div>
            <div class="dlg-title">${title}</div>
            <div class="dlg-msg">${message}</div>
            ${hasInput ? `
              ${inputLabel ? `<div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">${inputLabel}</div>` : ''}
              <input class="dlg-input" id="${id}_inp" type="${inputType}" placeholder="${inputPlaceholder}" autocomplete="off">
            ` : ''}
            <div class="dlg-btns">
              ${cancelText ? `<button class="dlg-btn dlg-btn-cancel" id="${id}_cancel">${cancelText}</button>` : ''}
              <button class="dlg-btn ${type==='danger'?'dlg-btn-danger':'dlg-btn-primary'}" id="${id}_ok">${confirmText}</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const overlay = document.getElementById(id);
      const inp = document.getElementById(id + '_inp');
      const okBtn = document.getElementById(id + '_ok');
      const cancelBtn = document.getElementById(id + '_cancel');

      requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('dlg-open')); });
      if (inp) setTimeout(() => inp.focus(), 120);

      const close = (val) => {
        overlay.classList.remove('dlg-open');
        setTimeout(() => { overlay.remove(); resolve(val); }, 260);
      };

      okBtn.addEventListener('click', () => close(hasInput ? (inp?.value ?? '') : true));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(hasInput ? null : false));
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); } });
      overlay.addEventListener('click', e => { if (e.target === overlay && cancelBtn) close(hasInput ? null : false); });
    });
  },

  confirm(title, message, type = 'warning') {
    return this.show({ title, message, type, confirmText: T?.isRTL() ? 'تأكيد' : 'Confirmer', cancelText: T?.isRTL() ? 'إلغاء' : 'Annuler' });
  },
  alert(title, message, type = 'info') {
    return this.show({ title, message, type, confirmText: 'OK' });
  },
  prompt(title, message, { placeholder = '', inputType = 'text', label = '' } = {}) {
    return this.show({ title, message, type: 'info', confirmText: 'OK', cancelText: T?.isRTL() ? 'إلغاء' : 'Annuler', inputType, inputPlaceholder: placeholder, inputLabel: label });
  },
  promptPassword(title, message, { placeholder = '••••••••', label = '' } = {}) {
    return this.show({ title, message, type: 'warning', confirmText: T?.isRTL() ? 'تأكيد' : 'Confirmer', cancelText: T?.isRTL() ? 'إلغاء' : 'Annuler', inputType: 'password', inputPlaceholder: placeholder, inputLabel: label });
  },
};
window.Dialog = Dialog;

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

  async confirm2(msg1, msg2) { 
    const ok1 = await Dialog.confirm('Confirmation', msg1, 'danger');
    if (!ok1) return false;
    return await Dialog.confirm('Confirmation 2', msg2, 'danger');
  },

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
    // Sum of BRs created by this user on this date (for display/info only)
    return DB.getAll('brs')
      .filter(br => br.createdBy === userId && (br.date||'').slice(0,10) === date)
      .reduce((s,br) => s + (Number(br.totalTTC)||0), 0);
  },
  getDayDeliveryTotal(userId, date) {
    // Sum of confirmed BL deliveries that belong to this user's caisse
    // (BLs created by this user, amount from BR)
    return DB.getAll('caisse_admin')
      .filter(e => e.source === 'bl_delivery' && e.userId === userId && e.sessionDate === date)
      .reduce((s,e) => s + (Number(e.amount)||0), 0);
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
    // Expected = sum of delivered BLs that belong to this user's caisse
    const deliveryTotal = this.getDayDeliveryTotal(userId, session.date);
    const ecart = Number(especes) - deliveryTotal;
    const updated = DB.update('sessions', session.id, {
      status: 'closed',
      closedEspeces: Number(especes),
      closedMonnaie: Number(monnaie),
      ecart: ecart,
      closedAt: new Date().toISOString()
    }, 'Clôture de journée');
    // Only create a deposit entry if no bl_delivery entries exist for today
    // (to avoid double-counting when deliveries were already recorded)
    const user = DB.getById('users', userId);
    const todayDeliveries = DB.getAll('caisse_admin').filter(e =>
      e.source === 'bl_delivery' && e.userId === userId && e.sessionDate === session.date
    );
    const alreadyCounted = todayDeliveries.reduce((s,e) => s + (Number(e.amount)||0), 0);
    const alreadyHasCloture = DB.getAll('caisse_admin').some(e =>
      e.sessionId === session.id && e.source === 'user_cloture'
    );
    if (!alreadyHasCloture) {
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
    }
    return updated;
  },

  updateCloture(userId, especes, monnaie) {
    const session = this.getTodaySession(userId);
    if (!session) return null;
    const deliveryTotal = this.getDayDeliveryTotal(userId, session.date);
    const ecart = Number(especes) - deliveryTotal;
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
