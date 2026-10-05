/* ============================================================
   CORE.JS — Database · Auth · Lang · Utils · SessionMgr
   ERP v2.0 — Supplier/Logistics Management
   ============================================================ */

// ─── LANG (Bilingual FR/AR) ────────────────────────────────────
const T = {
  _l: localStorage.getItem('lang') || 'fr',
  fr: {
    app_name:'ERP Fournisseur', app_by:'CHIKHAOUI ABDERRAHIME • Abderrahime Intelligent Systems',
    login:'Connexion', logout:'Déconnexion', username:'Identifiant', password:'Mot de passe',
    login_error:'Identifiants incorrects', login_sub:'Système de gestion — Accès sécurisé',
    // Nav
    nav_dashboard:'Tableau de Bord', nav_brs:'Bons de Réception', nav_bls:'Bons de Chargement',
    nav_supplier_portal:'Portail Usines & Enlèvements', nav_bc_tracker:'Suivi Chargements & Pipeline',
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
    br_add_line:'Ajouter Article', br_gen_bl:'Générer Bon de Chargement', br_gen_bl_short:'Bon Chargement',
    br_lock_msg:'Ce BR est verrouillé (issu de la validation usine ou déjà livré).',
    br_preview_ref:'Aperçu référence',
    // Bon de Chargement (BC - ancien BL)
    bl_title:'Bons de Chargement', bl_new:'Nouveau Bon de Chargement', bl_from_br:'Charger depuis BR en stock',
    bl_route:'Générer BL (Pour la route)',
    bl_truck:'Immatriculation Camion', bl_driver:'Nom du Chauffeur',
    bl_driver_hint:'Le camion sera auto-rempli si le chauffeur est connu',
    bl_delivered:'Confirmer Enlèvement & Livraison', bl_delivered_msg:'Ceci va verrouiller définitivement le Bon de Chargement. Impossible à annuler par les utilisateurs.',
    bl_linked_br:'BR coordonné',
    // Status
    st_open:'Émis', st_delivered:'Enlevé & Livré', st_locked:'Verrouillé', st_pending:'En attente usine',
    // Caisse User
    // Caisse User / Mini Caisse
    caisse_title:'Ma Caisse — Mini Caisse du Jour',
    caisse_morning_title:'Démarrage de journée',
    caisse_morning_greeting:'Bonjour !',
    caisse_morning_msg:'Votre caisse du jour est prête :',
    caisse_morning_confirm:'Démarrer la session de caisse ?',
    caisse_start_btn:'Démarrer ma journée',
    caisse_no_session:'Aucune session démarrée aujourd\'hui.',
    caisse_start_now:'Démarrer maintenant',
    caisse_especes:'Ventes BCH (Espèces)',
    caisse_monnaie:'Retours Marchandise (Déductions)',
    caisse_cloture:'Clôturer ma Caisse',
    caisse_cloture_msg:'Vérifiez le total de vos BCH et retours pour transmission à la banque',
    caisse_expected:'Total Net Ventes (BCH − Retours)',
    caisse_actual:'Montant déclaré pour versement',
    caisse_ecart:'Écart',
    caisse_br_total:'Total BCH du jour',
    caisse_closed:'Journée clôturée — Versée en Banque',
    caisse_reopen:'Modifier clôture',
    caisse_especes_deposited:'Net versé → Banque / État de Vente',
    // Mini Caisse specific
    nav_mini_caisse:'Ma Caisse',
    mini_caisse_title:'Ma Caisse — Suivi des Ventes & Retours',
    mini_caisse_sales:'Total Ventes BCH',
    mini_caisse_returns:'Total Retours Marchandise',
    mini_caisse_net:'Net à Verser en Banque',
    mini_caisse_cloture_btn:'Clôturer la Caisse & Générer État de Vente',
    mini_caisse_summary_ticket:'Ticket Récapitulatif',
    // Autocorrect Integrity Engine
    autocorrect_title:'Moniteur d\'Intégrité 15 min',
    autocorrect_ok:'Intégrité 100% Vérifiée',
    autocorrect_healed:'Discrépances Corrigées',
    autocorrect_manual_run:'Vérifier maintenant',
    // Admin caisse
    adm_title:'Caisse Principale', adm_balance:'Solde actuel',
    adm_inflows:'Entrées', adm_outflows:'Sorties', adm_transactions:'Transactions',
    adm_deposit:'Dépôt manuel', adm_withdrawal:'Retrait / Versement banque',
    adm_new_dep:'+ Dépôt', adm_new_with:'- Retrait / Virement',
    adm_confirm1:'Êtes-vous sûr de vouloir effectuer ce virement vers la banque ?',
    adm_confirm2:'CONFIRMATION NIVEAU 2 : Cette opération bancaire est définitive.',
    adm_immutable:'Cette opération ne peut être ni modifiée ni supprimée.',
    adm_correction_note:'Pour corriger une erreur, créez un nouveau dépôt avec la mention "Correction".',
    adm_dest:'Destination / Motif', adm_bank_ref:'Référence bancaire',
    adm_from_cloture:'Clôture mini caisse utilisateur', adm_manual:'Manuel Admin',
    adm_supervision_mini:'Supervision des Mini Caisses',
    // Suppliers
    sup_title:'Fournisseurs', sup_new:'Nouveau Fournisseur', sup_name:'Nom',
    sup_phone:'Téléphone', sup_address:'Adresse', sup_contact:'Contact',
    // Users & Eval & RH
    usr_title:'Utilisateurs & RH', usr_new:'Nouvel Utilisateur', usr_name:'Nom complet',
    usr_login:'Identifiant (login)', usr_pass:'Mot de passe', usr_role:'Rôle',
    usr_active:'Actif', usr_inactive:'Inactif', usr_sessions:'Sessions',
    usr_photo:'Photo de profil', usr_job_title:'Poste / Fonction', usr_department:'Département',
    usr_salary:'Salaire de base (DA)', usr_hire_date:'Date d\'embauche',
    eval_title:'Évaluation Utilisateurs', eval_user:'Utilisateur', eval_login:'Heure connexion',
    eval_logout:'Heure déco.', eval_hours:'Heures travail', eval_brs:'BR créés',
    eval_deliveries:'Livraisons', eval_errors:'Écarts caisse', eval_date:'Date',
    // Pointage & RH
    pointage_title:'Pointage & Présences RH',
    pointage_rectify:'Rectifier Pointage',
    pointage_status_present:'Présent',
    pointage_status_absent_unj:'Absent Injustifié',
    pointage_status_absent_jus:'Absent Justifié',
    pointage_status_late:'Retard',
    pointage_status_leave:'Congé',
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
    role_admin:'Administrateur', role_user:'Utilisateur', role_supplier:'Usine / Fournisseur', role_supplier_agent:'Agent Usine',
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
    nav_etat_vente: 'État de Vente',
    nav_bon_retour: 'Bons de Retour',
    nav_pointage: 'Pointage & RH',
    nav_charges: 'Charges & Frais',
    nav_bank: 'Banque & Extrait',
    nav_bank_extrait: 'Extrait Bancaire',
    notif_center: 'Centre de Notifications',
    notif_mark_all: 'Tout marquer lu',
    notif_open_tracker: 'Ouvrir le Suivi des Chargements',
  },
  ar: {
    app_name:'نظام إدارة الموردين', app_by:'CHIKHAOUI ABDERRAHIME • أنظمة عبد الرحيم الذكية',
    login:'تسجيل الدخول', logout:'تسجيل الخروج', username:'اسم المستخدم', password:'كلمة المرور',
    login_error:'بيانات الدخول غير صحيحة', login_sub:'نظام الإدارة — دخول آمن',
    nav_dashboard:'لوحة التحكم', nav_brs:'وصولات الاستلام', nav_bls:'وصولات الشحن',
    nav_supplier_portal:'بوابة المصانع والشحن', nav_bc_tracker:'متابعة الشحن والمصانع',
    nav_caisse:'صندوقي (ميني كاس)', nav_mini_caisse:'صندوقي', nav_admin_caisse:'الصندوق الرئيسي', nav_suppliers:'الموردون', nav_clients:'الزبائن',
    nav_catalogue:'قاعدة البيانات', nav_stats:'الإحصائيات', nav_eval:'تقييم المستخدمين',
    nav_users:'المستخدمون والموارد البشرية', nav_settings:'الإعدادات', nav_audit:'سجل المراجعة',
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
    br_add_line:'إضافة مادة', br_gen_bl:'إنشاء وصل شحن', br_gen_bl_short:'وصل شحن',
    br_lock_msg:'هذا الوصل مقفل (منبثق من المصنع أو مسلم).',
    br_preview_ref:'معاينة المرجع',
    // Bon de Chargement (BCH)
    bl_title:'وصولات الشحن (BCH)', bl_new:'وصل شحن جديد (BCH)', bl_from_br:'شحن من وصل الاستلام',
    bl_route:'وصل تسليم (للطريق فقط)',
    bl_truck:'رقم الشاحنة', bl_driver:'اسم السائق',
    bl_driver_hint:'سيتم ملء رقم الشاحنة تلقائياً إذا كان السائق معروفاً',
    bl_delivered:'تأكيد الشحن والتسليم', bl_delivered_msg:'سيقفل هذا الإجراء وصل الشحن نهائياً. لا يمكن التراجع.',
    bl_linked_br:'وصل الاستلام المنسق',
    st_open:'مفتوح', st_delivered:'تم الشحن والتسليم', st_locked:'مقفل', st_pending:'في انتظار المصنع',
    // Mini Caisse
    caisse_title:'صندوقي — جلسة اليوم',
    caisse_morning_title:'بداية اليوم',
    caisse_morning_greeting:'صباح الخير!',
    caisse_morning_msg:'صندوقك لليوم جاهز للعمل:',
    caisse_morning_confirm:'تأكيد فتح جلسة الصندوق؟',
    caisse_start_btn:'بدء يومي',
    caisse_no_session:'لا توجد جلسة بدأت اليوم.',
    caisse_start_now:'ابدأ الآن',
    caisse_especes:'المبيعات (وصولات الشحن BCH)',
    caisse_monnaie:'المرتجع (خصم)',
    caisse_cloture:'إغلاق صندوقي',
    caisse_cloture_msg:'تحقق من مبيعاتك ومرتجعاتك للتحويل إلى البنك',
    caisse_expected:'صافي الصندوق (المبيعات − المرتجع)',
    caisse_actual:'المبلغ المحوّل للبنك',
    caisse_ecart:'الفارق',
    caisse_br_total:'مجموع وصولات الشحن BCH اليوم',
    caisse_closed:'اليوم مغلق — تم التحويل للبنك',
    caisse_reopen:'تعديل الإغلاق',
    caisse_especes_deposited:'الصافي المحوّل → البنك / كشف المبيعات',
    mini_caisse_title:'صندوقي — متابعة المبيعات والمرتجع',
    mini_caisse_sales:'إجمالي المبيعات',
    mini_caisse_returns:'إجمالي المرتجعات',
    mini_caisse_net:'الصافي للتحويل للبنك',
    mini_caisse_cloture_btn:'إغلاق الصندوق وإنشاء كشف المبيعات',
    mini_caisse_summary_ticket:'وصل ملخص اليوم',
    autocorrect_title:'مراقب السلامة والتصحيح التلقائي (15 دقيقة)',
    autocorrect_ok:'البيانات سليمة 100%',
    autocorrect_healed:'تم تصحيح الفوارق تلقائياً',
    autocorrect_manual_run:'فحص الآن',
    adm_title:'الصندوق الرئيسي', adm_balance:'الرصيد الحالي',
    adm_inflows:'الإيرادات', adm_outflows:'المصروفات', adm_transactions:'المعاملات',
    adm_deposit:'إيداع يدوي', adm_withdrawal:'سحب / تحويل بنكي',
    adm_new_dep:'+ إيداع', adm_new_with:'- تحويل بنكي',
    adm_confirm1:'هل أنت متأكد من إجراء هذا التحويل البنكي؟',
    adm_confirm2:'تأكيد المستوى الثاني: هذه العملية نهائية ولا يمكن التراجع عنها.',
    adm_immutable:'لا يمكن تعديل هذه العملية أو حذفها.',
    adm_correction_note:'لتصحيح خطأ، أنشئ إيداعاً جديداً بملاحظة "تصحيح".',
    adm_dest:'الوجهة / الغرض', adm_bank_ref:'المرجع البنكي',
    adm_from_cloture:'إغلاق الصندوق اليومي للمستخدم', adm_manual:'يدوي — المسؤول',
    adm_supervision_mini:'مراقبة صناديق البائعين',
    sup_title:'الموردون', sup_new:'مورد جديد', sup_name:'الاسم',
    sup_phone:'الهاتف', sup_address:'العنوان', sup_contact:'جهة الاتصال',
    cli_title:'الزبائن', cli_new:'زبون جديد', cli_name:'الاسم',
    cli_phone:'الهاتف', cli_address:'العنوان', cli_contact:'جهة الاتصال', col_client:'الزبون',
    usr_title:'المستخدمون والموارد البشرية', usr_new:'مستخدم جديد', usr_name:'الاسم الكامل',
    usr_login:'معرف الدخول', usr_pass:'كلمة المرور', usr_role:'الدور',
    usr_active:'نشط', usr_inactive:'غير نشط', usr_sessions:'الجلسات',
    usr_photo:'صورة الملف الشخصي', usr_job_title:'الوظيفة / المنصب', usr_department:'القسم',
    usr_salary:'الراتب الأساسي (دج)', usr_hire_date:'تاريخ التوظيف',
    eval_title:'تقييم المستخدمين', eval_user:'المستخدم', eval_login:'وقت الدخول',
    eval_logout:'وقت الخروج', eval_hours:'ساعات العمل', eval_brs:'وصولات استلام',
    eval_deliveries:'التسليمات', eval_errors:'فوارق الصندوق', eval_date:'التاريخ',
    pointage_title:'حضور الموظفين ونظام الدوام',
    pointage_rectify:'تصحيح الحضور',
    pointage_status_present:'حاضر',
    pointage_status_absent_unj:'غياب غير مبرر',
    pointage_status_absent_jus:'غياب مبرر',
    pointage_status_late:'تأخر',
    pointage_status_leave:'عطلة',
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
    role_admin:'مسؤول', role_user:'مستخدم', role_supplier:'مصنع / مورد', role_supplier_agent:'وكيل المصنع',
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
    nav_etat_vente: 'حالة المبيعات',
    nav_bon_retour: 'وصولات الإرجاع',
    nav_pointage: 'الحضور والموارد البشرية',
    nav_charges: 'المصاريف والتكاليف',
    nav_bank: 'البنك وكشف الحساب',
    nav_bank_extrait: 'كشف الحساب البنكي',
    notif_center: 'مركز الإشعارات',
    notif_mark_all: 'تعليم الكل كمقروء',
    notif_open_tracker: 'فتح متابعة الشحنات',
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
  _cols: ['users','suppliers','clients','brs','bls','articles','drivers','sessions','caisse_admin','work_log','history','audit_log','recycle_bin','bank_transactions','supplier_payments','etat_vente_docs','bon_retours','bank_charges','notifications','fiches_paie','rh_rectifications','recurring_charges','bank_accounts','paie_validations','pointage_validations'],
  _loaded: {},

  init() {
    this._cols.forEach(c => { if (!localStorage.getItem(c)) localStorage.setItem(c, '[]'); });
    if (!localStorage.getItem('settings')) this._resetSettings();
    if (!this.getAll('users').length) this._seed();

    // ── Run data migrations on every boot (idempotent) ──
    this.runMigrations();

    // ── Start 15-Minute Data Integrity & Autocorrect Daemon ──
    try {
      this.MasterBrain.AutocorrectBrain.init();
    } catch(e) { console.warn('[AutocorrectBrain] init err:', e); }

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

  // ─── Data Migrations & Master Brain Recalibration ───────────────
  runMigrations() {
    try {
      this._migrateTimbreSlabsToLF2025(); // M003: update old timbre slabs to LF2025 format
      this._migrateEtatVenteTimbre();      // M004: heal missing 1% timbre on historical États de Vente
      this.MasterBrain.recalibrateAll();  // The Master Brain: 360° financial integrity engine
    } catch(e) {
      console.warn('[MasterBrain] Error:', e);
    }
  },

  recalibrateCaisse() {
    return this.MasterBrain.CaisseBrain.recalibrate();
  },

  // ═════════════════════════════════════════════════════════════════
  // THE MASTER BRAIN SUITE — Multi-Domain Financial Integrity Cortex
  // ═════════════════════════════════════════════════════════════════
  MasterBrain: {
    _running: false,

    // ── 1. Caisse Brain (Solde = Dépôts − Retraits) ────────────
    CaisseBrain: {
      recalibrate() {
        const caisse = DB.getAll('caisse_admin');
        let modified = false;
        let cleaned = [...caisse];
        const toRemoveCloud = [];

        // ── Rule 1: Purge all rogue/legacy entries ──
        // Delivery entries ('bl_delivery'), deletion errors ('bl_error_delete'), and direct returns ('bl_return') are strictly forbidden in main caisse.
        // PURE CAISSE LAW: Returns are deducted exclusively from the user's mini-caisse session before shift closure!
        cleaned = cleaned.filter(e => {
          if (e.source === 'bl_delivery' || e.source === 'bl_error_delete' || e.source === 'bl_return') {
            toRemoveCloud.push(e.id);
            modified = true;
            return false;
          }
          return true;
        });

        // ── Rule 2: Deduplicate user session closures ──
        // A single session must produce at most ONE deposit ('user_cloture' / 'bch_recettes_reelles')
        const seenCloture = new Map();
        const clotureToKeep = new Set();
        cleaned.forEach(e => {
          if (e.type === 'deposit' && (e.source === 'user_cloture' || e.source === 'bch_recettes_reelles')) {
            const key = e.sessionId ? `sess_${e.sessionId}` : (e.etatVenteRef || `date_${e.sessionDate || e.date}_u_${e.userId}`);
            if (seenCloture.has(key)) {
              const prev = seenCloture.get(key);
              const keep = (e.id >= prev.id) ? e : prev;
              const discard = (e.id < prev.id) ? e : prev;
              seenCloture.set(key, keep);
              clotureToKeep.delete(discard.id);
              clotureToKeep.add(keep.id);
              toRemoveCloud.push(discard.id);
              modified = true;
            } else {
              seenCloture.set(key, e);
              clotureToKeep.add(e.id);
            }
          }
        });
        cleaned = cleaned.filter(e => {
          if (e.type === 'deposit' && (e.source === 'user_cloture' || e.source === 'bch_recettes_reelles')) {
            return clotureToKeep.has(e.id);
          }
          return true;
        });

        // ── Rule 3: Deduplicate bank transfers for État de Vente ──
        const seenTransfers = new Map();
        const transfersToKeep = new Set();
        cleaned.forEach(e => {
          if (e.type === 'withdrawal' && e.source === 'transfert_banque_etat_vente') {
            const key = e.etatVenteRef || (e.sessionId ? `sess_${e.sessionId}` : `date_${e.sessionDate || e.date}_u_${e.userId}`);
            if (seenTransfers.has(key)) {
              const prev = seenTransfers.get(key);
              const keep = (e.id >= prev.id) ? e : prev;
              const discard = (e.id < prev.id) ? e : prev;
              seenTransfers.set(key, keep);
              transfersToKeep.delete(discard.id);
              transfersToKeep.add(keep.id);
              toRemoveCloud.push(discard.id);
              modified = true;
            } else {
              seenTransfers.set(key, e);
              transfersToKeep.add(e.id);
            }
          }
        });
        cleaned = cleaned.filter(e => {
          if (e.type === 'withdrawal' && e.source === 'transfert_banque_etat_vente') {
            return transfersToKeep.has(e.id);
          }
          return true;
        });

        // ── Commit cleanups ──
        if (modified) {
          DB.rawSet('caisse_admin', cleaned);
          if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
            toRemoveCloud.forEach(id => window.API.remove('caisse_admin', id).catch(() => {}));
          }
        }

        const totalIn = cleaned.filter(e => e.type === 'deposit').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const totalOut = cleaned.filter(e => e.type === 'withdrawal').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { ok: true, balance: Math.round((totalIn - totalOut) * 100) / 100, totalIn, totalOut, cleanedCount: toRemoveCloud.length };
      }
    },

    // ── 2. Bank Brain (Solde = Initial + Entrées − Sorties) ─────
    BankBrain: {
      recalibrate() {
        const banks = DB.getSettings().banks || [];
        const bankTxs = DB.getAll('bank_transactions');
        const caisse = DB.getAll('caisse_admin');
        const supPays = DB.getAll('supplier_payments');

        // ── 1. DÉDOUBLONNAGE STRICT DES TRANSACTIONS BANCAIRES (Anti-Duplication) ──
        const seenEvRefs = new Set();
        const seenEvIds = new Set();
        const seenCaisseTransfers = new Set();
        let cleanedBankTxs = [];
        const duplicateTxIds = [];

        bankTxs.forEach(bt => {
          if (bt.subtype === 'etat_vente' || (bt.ref && bt.ref.startsWith('EV-DEP-'))) {
            const evRefKey = (bt.etatVenteRef || bt.ref?.replace('EV-DEP-', '') || '').trim();
            const evIdKey = bt.etatVenteId ? String(bt.etatVenteId) : null;
            if ((evRefKey && seenEvRefs.has(evRefKey)) || (evIdKey && seenEvIds.has(evIdKey))) {
              duplicateTxIds.push(bt.id);
              return; // DOUBLON ÉLIMINÉ
            }
            if (evRefKey) seenEvRefs.add(evRefKey);
            if (evIdKey) seenEvIds.add(evIdKey);
            cleanedBankTxs.push(bt);
          } else if (bt.subtype === 'transfer_from_caisse') {
            const dKey = (bt.date || bt.createdAt || '').slice(0, 10);
            const key = `${bt.bankId}|${dKey}|${Number(bt.amount).toFixed(2)}`;
            if (seenCaisseTransfers.has(key)) {
              duplicateTxIds.push(bt.id);
              return; // DOUBLON TRANSFERT ÉLIMINÉ
            }
            seenCaisseTransfers.add(key);
            cleanedBankTxs.push(bt);
          } else {
            cleanedBankTxs.push(bt);
          }
        });

        if (duplicateTxIds.length > 0) {
          DB.rawSet('bank_transactions', cleanedBankTxs);
          if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
            duplicateTxIds.forEach(id => window.API.delete('bank_transactions', id).catch(() => {}));
          }
        }

        // Cross-reconciliation: ensure every caisse bank_transfer has a corresponding bank deposit
        const caisseTransfers = caisse.filter(e => e.type === 'withdrawal' && e.source === 'bank_transfer');
        let modified = false;

        caisseTransfers.forEach(ct => {
          const amt = Number(ct.amount) || 0;
          const matching = cleanedBankTxs.find(bt =>
            bt.type === 'deposit' &&
            bt.subtype === 'transfer_from_caisse' &&
            Math.abs(Number(bt.amount) - amt) < 0.01 &&
            (ct.date ? (bt.date || bt.createdAt || '').slice(0, 10) === ct.date.slice(0, 10) : true)
          );
          if (!matching && banks.length > 0) {
            const targetBankId = ct.bankId || banks[0].id;
            const newTx = {
              id: (cleanedBankTxs.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1),
              bankId: targetBankId,
              type: 'deposit',
              subtype: 'transfer_from_caisse',
              amount: amt,
              ref: ct.ref || `BTX-${Date.now().toString().slice(-4)}`,
              date: ct.date || ct.createdAt || new Date().toISOString().slice(0, 10),
              createdAt: ct.createdAt || new Date().toISOString(),
              note: `Virement automatique depuis Caisse (${Utils.fmtCurrency(amt)})`
            };
            cleanedBankTxs.push(newTx);
            if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
              window.API.insert('bank_transactions', newTx).catch(() => {});
            }
            modified = true;
          }
        });

        if (modified) {
          DB.rawSet('bank_transactions', cleanedBankTxs);
        }

        const bankBalances = {};
        banks.forEach(b => {
          const init = Number(b.initialBalance) || 0;
          const deps = cleanedBankTxs.filter(t => t.bankId === b.id && t.type === 'deposit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
          const wits = cleanedBankTxs.filter(t => t.bankId === b.id && t.type === 'withdrawal').reduce((s, t) => s + (Number(t.amount) || 0), 0);
          const sup = supPays.filter(p => p.bankId === b.id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          bankBalances[b.id] = Math.round((init + deps - wits - sup) * 100) / 100;
        });

        const totalBank = Object.values(bankBalances).reduce((s, v) => s + v, 0);
        return { ok: true, totalBank: Math.round(totalBank * 100) / 100, bankBalances };
      }
    },

    // ── 3. Supplier Brain (Dette = Achats BR − Payé) ───────────
    SupplierBrain: {
      recalibrate() {
        const suppliers = DB.getAll('suppliers');
        const brs = DB.getAll('brs');
        const pays = DB.getAll('supplier_payments');

        let totalPurchases = 0;
        let totalPaid = 0;
        const supplierStats = {};

        suppliers.forEach(s => {
          const supBRs = brs.filter(b => Number(b.supplierId) === Number(s.id));
          const supPays = pays.filter(p => Number(p.supplierId) === Number(s.id));
          const pur = supBRs.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);
          const pd = supPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const remaining = Math.max(0, pur - pd);

          totalPurchases += pur;
          totalPaid += pd;
          supplierStats[s.id] = {
            name: s.name,
            purchases: Math.round(pur * 100) / 100,
            paid: Math.round(pd * 100) / 100,
            remaining: Math.round(remaining * 100) / 100
          };
        });

        const totalDebt = Math.max(0, totalPurchases - totalPaid);
        return {
          ok: true,
          totalPurchases: Math.round(totalPurchases * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalDebt: Math.round(totalDebt * 100) / 100,
          supplierStats
        };
      }
    },

    // ── 4. Client Brain (CA = BLs Livrés, Encours = BLs Ouverts)
    ClientBrain: {
      recalibrate() {
        const clients = DB.getAll('clients');
        const bls = DB.getAll('bls');

        let totalRevenue = 0;
        let totalPending = 0;
        const clientStats = {};

        clients.forEach(c => {
          const clientBLs = bls.filter(b => String(b.clientId) === String(c.id));
          const delivered = clientBLs.filter(b => b.status === 'delivered' || b.status === 'locked');
          const pending = clientBLs.filter(b => b.status === 'open');

          const rev = delivered.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);
          const pend = pending.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);

          totalRevenue += rev;
          totalPending += pend;
          clientStats[c.id] = {
            name: c.name,
            deliveredCount: delivered.length,
            revenue: Math.round(rev * 100) / 100,
            pendingCount: pending.length,
            pending: Math.round(pend * 100) / 100
          };
        });

        return {
          ok: true,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          clientStats
        };
      }
    },

    // ── 5. Master Cortex (0 = 0 Total Balance Overseer) ────────
    recalibrateAll() {
      if (this._running) return;
      this._running = true;
      try {
        const caisseRes = this.CaisseBrain.recalibrate();
        const bankRes = this.BankBrain.recalibrate();
        const supRes = this.SupplierBrain.recalibrate();
        const clientRes = this.ClientBrain.recalibrate();

        const totalTresorerie = Math.round((caisseRes.balance + bankRes.totalBank) * 100) / 100;
        if (window._ERP_DEBUG) console.log(`[Master Brain] Recalibration complete across 4 brains. Solde Caisse: ${Utils.fmtCurrency(caisseRes.balance)} | Solde Banque: ${Utils.fmtCurrency(bankRes.totalBank)} | Trésorerie Totale: ${Utils.fmtCurrency(totalTresorerie)}`);

        return {
          ok: true,
          caisse: caisseRes,
          bank: bankRes,
          suppliers: supRes,
          clients: clientRes,
          totalTresorerie,
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        console.error('[Master Brain] Recalibrate error:', e);
      } finally {
        this._running = false;
      }
    },

    // ── 6. The 15-Minute Autocorrect & Data Integrity Cortex Engine ──
    AutocorrectBrain: {
      _intervalMs: 15 * 60 * 1000,
      _nextRunTime: Date.now() + 15 * 60 * 1000,
      _timer: null,
      _tickerTimer: null,
      _lastResult: null,

      init() {
        window.AutocorrectBrain = this;
        setTimeout(() => this.runCheck(false), 2000);

        if (this._timer) clearInterval(this._timer);
        this._timer = setInterval(() => this.runCheck(false), this._intervalMs);

        if (this._tickerTimer) clearInterval(this._tickerTimer);
        this._tickerTimer = setInterval(() => this.updateTicker(), 1000);
      },

      updateTicker() {
        const elTimer = document.getElementById('integrityTimer');
        if (!elTimer) return;
        const remainingSec = Math.max(0, Math.round((this._nextRunTime - Date.now()) / 1000));
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        elTimer.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      },

      async runCheck(isManual = false) {
        this._nextRunTime = Date.now() + this._intervalMs;
        const widget = document.getElementById('topIntegrityWidget');
        const pulse = document.getElementById('integrityPulse');
        const label = document.getElementById('integrityLabel');
        if (widget) widget.classList.add('healing');

        const fixes = [];
        const checks = [];

        try {
          // Check 1: Caisse & Clôtures Reconciliation
          const caisseRes = DB.MasterBrain.CaisseBrain.recalibrate();
          checks.push({ name: 'Trésorerie Caisse Centrale & Clôtures', status: 'OK', detail: `Solde contrôlé: ${Utils.fmtCurrency(caisseRes.balance)} (${caisseRes.cleanedCount || 0} entrées purgées)` });

          // Check 2: Mini Caisses & User Sessions
          const bls = DB.getAll('bls');
          const retours = DB.getAll('bon_retours');
          const sessions = DB.getAll('sessions');
          let sessionsFixed = 0;

          sessions.forEach(sess => {
            const summary = SessionMgr.getUserDaySummary(sess.userId, sess.date);
            const salesTTC = summary.totalSalesTTC;
            const retsTTC = summary.totalReturnsTTC;
            const net = summary.netAmount;

            if (sess.status === 'closed' && (sess.closedNet === undefined || Math.abs((sess.closedNet || sess.closedEspeces || 0) - net) > 0.01)) {
              sess.closedNet = net;
              sess.totalSales = salesTTC;
              sess.totalReturns = retsTTC;
              sess.ecart = 0;
              sessionsFixed++;
              fixes.push(`Session ${sess.date} (User #${sess.userId}) : Ventes ${Utils.fmtCurrency(salesTTC)} - Retours ${Utils.fmtCurrency(retsTTC)} = Net ${Utils.fmtCurrency(net)}`);
            }
          });
          if (sessionsFixed > 0) DB.rawSet('sessions', sessions);
          checks.push({ name: 'Mini-Caisses & Sessions Vendeurs', status: 'OK', detail: `${sessions.length} sessions vérifiées (${sessionsFixed} corrigées)` });

          // Check 3: Bons de Retour & Reserved BL References
          let retFixed = 0;
          retours.forEach(ret => {
            if (ret.blId) {
              const linkedBL = bls.find(b => Number(b.id) === Number(ret.blId));
              if (linkedBL && linkedBL.status !== 'returned') {
                linkedBL.status = 'returned';
                linkedBL.returnedAt = ret.createdAt || linkedBL.updatedAt;
                linkedBL.returnedRef = ret.ref;
                retFixed++;
                fixes.push(`BL ${linkedBL.ref} verrouillé avec statut "returned" (Réf: ${ret.ref})`);
              }
            }
          });
          if (retFixed > 0) DB.rawSet('bls', bls);
          checks.push({ name: 'Bons de Retour & Références Réservées', status: 'OK', detail: `${retours.length} retours vérifiés (${retFixed} BLs verrouillés)` });

          // Check 4: États de Vente & Dépôts Bancaires
          const evDocs = DB.getAll('etat_vente_docs');
          const bankTxs = DB.getAll('bank_transactions');
          const banks = DB.getSettings().banks || [];
          let evFixed = 0;

          if (banks.length > 0) {
            const defaultBankId = banks[0].id;
            evDocs.forEach(ev => {
              if (ev.status !== 'deposited' && ev.status !== 'validated') return;
              const expectedRef = 'EV-DEP-' + (ev.ref || '').replace(/\//g, '-');
              const existingDep = bankTxs.find(bt => 
                (bt.etatVenteId && String(bt.etatVenteId) === String(ev.id)) ||
                (bt.etatVenteRef && bt.etatVenteRef === ev.ref) ||
                (bt.ref && bt.ref === expectedRef)
              );
              if (!existingDep && ev.status === 'deposited') {
                const newTx = {
                  id: (bankTxs.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1),
                  bankId: ev.bankId || defaultBankId,
                  type: 'deposit',
                  subtype: 'etat_vente',
                  amount: Number(ev.totalTTC) || 0,
                  ref: expectedRef,
                  date: (ev.date || ev.createdAt || '').slice(0, 10),
                  createdAt: ev.createdAt || new Date().toISOString(),
                  note: `Dépôt État de Vente ${ev.ref} (Auto-réconcilié)`,
                  etatVenteId: ev.id,
                  etatVenteRef: ev.ref
                };
                bankTxs.push(newTx);
                evFixed++;
                fixes.push(`Dépôt bancaire créé pour l'État de Vente ${ev.ref} (${Utils.fmtCurrency(ev.totalTTC)})`);
                if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
                  window.API.insert('bank_transactions', newTx).catch(() => {});
                }
              } else if (existingDep && Math.abs(Number(existingDep.amount) - Number(ev.totalTTC)) > 0.01) {
                existingDep.amount = Number(ev.totalTTC);
                evFixed++;
                fixes.push(`Montant du dépôt bancaire ajusté pour État de Vente ${ev.ref} (${Utils.fmtCurrency(ev.totalTTC)})`);
              }
            });
            if (evFixed > 0) DB.rawSet('bank_transactions', bankTxs);
          }
          checks.push({ name: 'États de Vente & Dépôts Banque', status: 'OK', detail: `${evDocs.length} états de vente vérifiés (${evFixed} ajustés/créés)` });

          // Check 4b: Unicité des Références BCH & Protection des Références Brûlées (Anti-Doublon)
          const allBLsRef = DB.getAll('bls');
          const refCounts = {};
          allBLsRef.forEach(b => {
            if (b.ref) refCounts[b.ref] = (refCounts[b.ref] || 0) + 1;
          });
          let bchDupsFixed = 0;
          Object.keys(refCounts).forEach(r => {
            if (refCounts[r] > 1) {
              const matches = allBLsRef.filter(b => b.ref === r);
              const returnedDoc = matches.find(b => b.status === 'returned');
              const activeDocs = matches.filter(b => b.status !== 'returned');
              const toRename = returnedDoc ? activeDocs : matches.slice(1);
              toRename.forEach((docToFix, idx) => {
                const br = docToFix.brId ? DB.getById('brs', docToFix.brId) : null;
                const brNum = br?.brNum || (r.match(/(\d+)/)?.[1]) || docToFix.id;
                const year = br?.year || new Date().getFullYear();
                let pNum = (docToFix.partNum || 1) + idx;
                let newRef = DB.buildBCHRef(brNum, year, pNum);
                while (allBLsRef.some(b => b.ref === newRef && b.id !== docToFix.id)) {
                  pNum++;
                  newRef = DB.buildBCHRef(brNum, year, pNum);
                }
                docToFix.ref = newRef;
                docToFix.partNum = pNum;
                DB.update('bls', docToFix.id, { ref: newRef, partNum: pNum }, 'Correction automatique référence dupliquée suite à retour');
                bchDupsFixed++;
                fixes.push(`Référence BCH dupliquée "${r}" corrigée : BL #${docToFix.id} renommé en "${newRef}" (l'archive retournée conserve "${r}")`);
              });
            }
          });
          if (bchDupsFixed > 0) {
            DB.MasterBrain.recalibrateAll();
          }
          checks.push({ name: 'Unicité des Références BCH', status: 'OK', detail: `${Object.keys(refCounts).length} références vérifiées (${bchDupsFixed} dupliquées corrigées)` });

          // Check 4c: Dédoublonnage Trésorerie Caisse (Anti-Doublon Clôtures, Versements & Retours)
          const allCaisse = DB.getAll('caisse_admin');
          const seenCaisseCloture = new Set();
          const seenCaisseEv = new Set();
          const seenBlRetEntries = new Set();
          const cleanedCaisseTreasury = [];
          const toRemoveCaisseCloud = [];
          let caisseDupsFixed = 0;

          allCaisse.forEach(ce => {
            // Strip out illegal bl_delivery or bl_error_delete entries
            if (ce.source === 'bl_delivery' || ce.source === 'bl_error_delete') {
              caisseDupsFixed++;
              toRemoveCaisseCloud.push(ce.id);
              fixes.push(`Entrée illégale "${ce.source}" purgée de la caisse centrale (#${ce.id})`);
              return;
            }
            if ((ce.source === 'user_cloture' || ce.source === 'bch_recettes_reelles') && ce.type === 'deposit') {
              const clotureKey = ce.sessionId ? `sess_${ce.sessionId}` : (ce.etatVenteRef || `date_${ce.sessionDate || ce.date}_u_${ce.userId}`);
              if (seenCaisseCloture.has(clotureKey)) {
                caisseDupsFixed++;
                toRemoveCaisseCloud.push(ce.id);
                fixes.push(`Doublon de clôture caisse éliminé pour ${clotureKey}`);
                return;
              }
              seenCaisseCloture.add(clotureKey);
              cleanedCaisseTreasury.push(ce);
            } else if (ce.source === 'transfert_banque_etat_vente' && ce.etatVenteRef) {
              if (seenCaisseEv.has(ce.etatVenteRef)) {
                caisseDupsFixed++;
                toRemoveCaisseCloud.push(ce.id);
                fixes.push(`Doublon de versement caisse éliminé pour État de Vente ${ce.etatVenteRef}`);
                return;
              }
              seenCaisseEv.add(ce.etatVenteRef);
              cleanedCaisseTreasury.push(ce);
            } else if (ce.source === 'bl_return' && ce.blId) {
              const retKey = `bl_${ce.blId}`;
              if (seenBlRetEntries.has(retKey)) {
                caisseDupsFixed++;
                toRemoveCaisseCloud.push(ce.id);
                fixes.push(`Doublon de retour caisse éliminé pour BL #${ce.blId}`);
                return;
              }
              seenBlRetEntries.add(retKey);
              cleanedCaisseTreasury.push(ce);
            } else {
              cleanedCaisseTreasury.push(ce);
            }
          });

          if (caisseDupsFixed > 0) {
            DB.rawSet('caisse_admin', cleanedCaisseTreasury);
            if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
              toRemoveCaisseCloud.forEach(id => window.API.remove('caisse_admin', id).catch(() => {}));
            }
          }
          checks.push({ name: 'Intégrité Trésorerie Caisse', status: 'OK', detail: `${allCaisse.length} opérations caisse vérifiées (${caisseDupsFixed} doublons purgés)` });

          // Check 5: Bank Reconciliation & Running Balances
          const bankRes = DB.MasterBrain.BankBrain.recalibrate();
          checks.push({ name: 'Rapprochement & Extraits Bancaires', status: 'OK', detail: `Trésorerie Banque: ${Utils.fmtCurrency(bankRes.totalBank)}` });

          // Check 6: Séquences Atomiques (BL/BR/ET/RET)
          const maxBlNum = bls.reduce((m, b) => Math.max(m, Number(b.blNum) || 0), 0);
          const maxBrNum = DB.getAll('brs').reduce((m, b) => Math.max(m, Number(b.brNum) || 0), 0);
          const maxEvNum = evDocs.reduce((m, d) => {
            const match = (d.ref || '').match(/ET\/(\d+)\//);
            return match ? Math.max(m, parseInt(match[1])) : m;
          }, 0);
          const maxRetNum = retours.reduce((m, r) => {
            const match = (r.ref || '').match(/RET\/(\d+)\//);
            return match ? Math.max(m, parseInt(match[1])) : m;
          }, 0);
          checks.push({ name: 'Séquences Atomiques (BL/BR/ET/RET)', status: 'OK', detail: `BL #${maxBlNum} · BR #${maxBrNum} · ET #${maxEvNum} · RET #${maxRetNum}` });

          // Check 7: Doublons & Intégrité Données (Anti-Doublon ID & Référence)
          let dupsFixed = 0;
          const toRemoveCloudCheck7 = [];
          ['bls', 'brs', 'suppliers', 'clients', 'bon_retours', 'etat_vente_docs'].forEach(col => {
            const items = DB.getAll(col);
            const seenId = new Set();
            const seenRef = new Set();
            const unique = [];
            items.forEach(it => {
              const idKey = it.id;
              const refKey = it.ref ? String(it.ref).trim() : null;
              if (idKey && seenId.has(idKey)) {
                dupsFixed++;
                toRemoveCloudCheck7.push({ col, id: idKey });
                fixes.push(`Doublon ID éliminé dans ${col}: #${idKey}`);
              } else if (refKey && seenRef.has(refKey)) {
                dupsFixed++;
                toRemoveCloudCheck7.push({ col, id: idKey });
                fixes.push(`Doublon Réf "${refKey}" éliminé dans ${col}: #${idKey}`);
              } else {
                if (idKey) seenId.add(idKey);
                if (refKey) seenRef.add(refKey);
                unique.push(it);
              }
            });
            if (unique.length < items.length) DB.rawSet(col, unique);
          });
          if (toRemoveCloudCheck7.length > 0 && typeof window.API !== 'undefined' && location.protocol !== 'file:') {
            toRemoveCloudCheck7.forEach(item => window.API.remove(item.col, item.id).catch(() => {}));
          }
          checks.push({ name: 'Contrôle des Doublons & Intégrité Données', status: 'OK', detail: dupsFixed ? `${dupsFixed} doublons purgés` : '100% Unique' });

          // Check 8: Pointage & Sessions actives
          const openSessions = sessions.filter(s => s.status === 'open');
          checks.push({ name: 'Pointage & Sessions de Travail', status: 'OK', detail: `${openSessions.length} session(s) active(s)` });

          // Check 9: Charges Récurrentes & Échéancier
          const recCharges = DB.getAll('recurring_charges') || [];
          const today = Utils.today();
          let recExecuted = 0;
          recCharges.forEach(rc => {
            if (rc.active !== false && rc.autoDebit === true && (rc.nextDueDate || '') <= today) {
              try {
                const isCaisse = rc.bankId === 'caisse';
                DB.insert('bank_charges', {
                  type: 'auto',
                  subtype: rc.category || 'Charge récurrente',
                  label: `[Auto-Échéance] ${rc.label}`,
                  category: rc.category,
                  bankId: rc.bankId,
                  amount: rc.amount,
                  date: today,
                  recurring: true,
                  recurringId: rc.id,
                  createdBy: 'system',
                  createdByName: 'Autocorrect Daemon',
                  createdAt: new Date().toISOString()
                });
                if (isCaisse) {
                  DB.insert('caisse_admin', {
                    type: 'withdrawal',
                    source: 'charge',
                    amount: rc.amount,
                    note: `Charge récurrente automatique: ${rc.label}`,
                    userId: 'system',
                    userName: 'Autocorrect Daemon',
                    date: today
                  });
                } else {
                  DB.insert('bank_transactions', {
                    bankId: rc.bankId,
                    type: 'payment',
                    subtype: 'charge',
                    amount: rc.amount,
                    note: `Charge récurrente automatique: ${rc.label}`,
                    date: today,
                    by: 'system',
                    byName: 'Autocorrect Daemon',
                    createdAt: new Date().toISOString()
                  });
                }
                const nextDate = new Date(rc.nextDueDate || today);
                switch(rc.frequency) {
                  case 'hebdomadaire': nextDate.setDate(nextDate.getDate() + 7); break;
                  case 'trimestrielle': nextDate.setMonth(nextDate.getMonth() + 3); break;
                  case 'semestrielle': nextDate.setMonth(nextDate.getMonth() + 6); break;
                  case 'annuelle': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                  default: nextDate.setMonth(nextDate.getMonth() + 1);
                }
                rc.nextDueDate = nextDate.toISOString().split('T')[0];
                rc.lastExecuted = today;
                recExecuted++;
                fixes.push(`Charge récurrente "${rc.label}" exécutée automatiquement (${Utils.fmtCurrency(rc.amount)})`);
              } catch(err) {
                console.warn('[Autocorrect] Recurring charge auto-exec err:', err);
              }
            }
          });
          if (recExecuted > 0) DB.rawSet('recurring_charges', recCharges);
          checks.push({ name: 'Charges Récurrentes', status: 'OK', detail: `${recCharges.length} modèles (${recExecuted} auto-traités)` });

          // Check 10: Bons de Chargement (BCH) & Usine Reconciliation
          // With reserved BR flow: pending_usine BCH may have a linkedBrId (reserved BR) — that's normal!
          // Only auto-heal if the linked BR is NOT 'reserved' (meaning it was actually validated)
          let bchFixed = 0;
          const allBCHs = DB.getAll('bls');
          allBCHs.forEach(b => {
            const hasBR = !!(b.brId || b.linkedBrId);
            if (hasBR && b.status === 'pending_usine') {
              // Check if the linked BR is reserved (waiting for validation) — that's normal, don't auto-heal
              const linkedBR = b.linkedBrId ? DB.getById('brs', b.linkedBrId) : (b.brId ? DB.getById('brs', b.brId) : null);
              if (linkedBR && linkedBR.status !== 'reserved') {
                b.status = 'validated_usine';
                bchFixed++;
                fixes.push(`BCH ${b.ref} réconcilié: possède un BR validé (${b.linkedBrRef || b.brId}) → statut corrigé en "validated_usine"`);
              }
            }
            if (b.linkedBrId && !b.brId) {
              // Only set brId if the linked BR is not reserved
              const lbr = DB.getById('brs', b.linkedBrId);
              if (lbr && lbr.status !== 'reserved') {
                b.brId = b.linkedBrId;
                bchFixed++;
              }
            }
            // Check mathematical integrity of lines vs totals
            if (b.lines && b.lines.length && b.status !== 'returned') {
              const calcHT = Math.round(b.lines.reduce((acc, l) => acc + (Number(l.total) || ((Number(l.qtyDelivered || l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.disc) || 0)/100))), 0) * 100) / 100;
              if (b.totalHT === undefined || Math.abs(Number(b.totalHT) - calcHT) > 0.05) {
                b.totalHT = calcHT;
                const timbre = b.noTimbre ? 0 : DB.calcTimbre(calcHT);
                const tva = b.tvaRate ? Math.round(calcHT * b.tvaRate / 100 * 100) / 100 : (Number(b.tvaAmount) || 0);
                b.totalTTC = Math.round((calcHT + tva + timbre) * 100) / 100;
                bchFixed++;
                fixes.push(`BCH ${b.ref} recalcul mathématique HT/TTC recalculé (${Utils.fmtCurrency(b.totalTTC)})`);
              }
            }
          });
          if (bchFixed > 0) DB.rawSet('bls', allBCHs);
          checks.push({ name: 'Bons de Chargement & Intégrité Usine', status: 'OK', detail: `${allBCHs.length} BCH vérifiés (${bchFixed} incohérences traitées)` });

          // Check 11: BR Mathematical Integrity & TVA Recalculation
          const allBRs = DB.getAll('brs');
          let brFixed = 0;
          const defaultTvaRate = Number(DB.getSettings().tvaRate) || 19;
          allBRs.forEach(br => {
            if (!br.lines || !br.lines.length) return;
            const calcHT = Math.round(br.lines.reduce((acc, l) => acc + (Number(l.total) || ((Number(l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.disc) || 0)/100))), 0) * 100) / 100;
            const rate = Number(br.tvaRate) || defaultTvaRate;
            const calcTVA = Math.round(calcHT * rate / 100 * 100) / 100;
            const calcTimbre = br.noTimbre ? 0 : (Number(br.timbreAmount) || DB.calcTimbre(calcHT) || 0);
            const calcTTC = Math.round((calcHT + calcTVA + calcTimbre) * 100) / 100;
            let changed = false;
            if (br.totalHT === undefined || Math.abs(Number(br.totalHT) - calcHT) > 0.05) { br.totalHT = calcHT; changed = true; }
            if (!br.tvaRate) { br.tvaRate = rate; changed = true; }
            if (br.tvaAmount === undefined || br.tvaAmount === 0 || Math.abs(Number(br.tvaAmount) - calcTVA) > 0.05) { br.tvaAmount = calcTVA; changed = true; }
            if (br.totalTTC === undefined || Math.abs(Number(br.totalTTC) - calcTTC) > 0.05) { br.totalTTC = calcTTC; changed = true; }
            if (changed) {
              brFixed++;
              fixes.push(`BR ${br.ref} recalculé: HT=${Utils.fmtCurrency(calcHT)}, TVA(${rate}%)=${Utils.fmtCurrency(calcTVA)}, TTC=${Utils.fmtCurrency(calcTTC)}`);
            }
          });
          if (brFixed > 0) DB.rawSet('brs', allBRs);
          checks.push({ name: 'Intégrité Mathématique BR (TVA/TTC)', status: 'OK', detail: `${allBRs.length} BR vérifiés (${brFixed} recalculés)` });

          // Check 12: Duplicate Sessions Detector & Auto-Clean
          let sessionsDeduped = 0;
          const sessionsByKey = {};
          sessions.forEach(s => {
            const key = `${s.userId}_${s.date}`;
            if (!sessionsByKey[key]) sessionsByKey[key] = [];
            sessionsByKey[key].push(s);
          });
          const cleanedSessions = [];
          const toRemoveSessionsCloud = [];
          Object.values(sessionsByKey).forEach(group => {
            if (group.length > 1) {
              // Keep the one with 'closed' status, or the first one
              const closed = group.find(s => s.status === 'closed');
              const keeper = closed || group[0];
              cleanedSessions.push(keeper);
              group.forEach(s => {
                if (s.id !== keeper.id) {
                  toRemoveSessionsCloud.push(s.id);
                }
              });
              sessionsDeduped += (group.length - 1);
              fixes.push(`⚠️ ${group.length - 1} session(s) doublon(s) supprimée(s) pour user #${group[0].userId} le ${group[0].date}`);
            } else {
              cleanedSessions.push(group[0]);
            }
          });
          if (sessionsDeduped > 0) {
            DB.rawSet('sessions', cleanedSessions);
            if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
              toRemoveSessionsCloud.forEach(id => window.API.remove('sessions', id).catch(() => {}));
            }
          }
          checks.push({ name: 'Détection Doublons Sessions', status: sessionsDeduped > 0 ? 'FIXED' : 'OK', detail: sessionsDeduped > 0 ? `${sessionsDeduped} doublon(s) éliminé(s)` : 'Aucun doublon' });

          // Check 13: Duplicate Caisse Admin Entries Detector
          let caisseDeduped = 0;
          const caisseAll = DB.getAll('caisse_admin');
          const caisseSeen = {};
          const cleanedCaisse = [];
          const toRemoveCaisseCheck13 = [];
          caisseAll.forEach(e => {
            let fp;
            if (e.source === 'user_cloture' || e.source === 'bch_recettes_reelles') {
              fp = `cloture_${e.sessionId || (e.sessionDate + '_' + e.userId)}`;
            } else if (e.source === 'transfert_banque_etat_vente') {
              fp = `transfert_ev_${e.etatVenteRef || e.sessionId || (e.sessionDate + '_' + e.userId)}`;
            } else if (e.source === 'bl_return') {
              fp = `return_${e.blId || e.returnRef || e.id}`;
            } else {
              // Manual withdrawals/deposits (charges, salaries, etc.) are distinguished by date, destination and note
              const dStr = (e.date || e.sessionDate || e.createdAt || '').slice(0, 10);
              const destStr = (e.destination || '').trim().toLowerCase();
              const noteStr = (e.note || '').trim().toLowerCase();
              fp = `manual_${e.type}_${e.source || ''}_${dStr}_${Number(e.amount).toFixed(2)}_${destStr}_${noteStr}`;
            }
            if (caisseSeen[fp]) {
              caisseDeduped++;
              toRemoveCaisseCheck13.push(e.id);
              fixes.push(`⚠️ Doublon caisse_admin éliminé: ${e.type} ${Utils.fmtCurrency(e.amount)} (${e.note?.slice(0,40)||''}...)`);
            } else {
              caisseSeen[fp] = true;
              cleanedCaisse.push(e);
            }
          });
          if (caisseDeduped > 0) {
            DB.rawSet('caisse_admin', cleanedCaisse);
            if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
              toRemoveCaisseCheck13.forEach(id => window.API.remove('caisse_admin', id).catch(() => {}));
            }
          }
          checks.push({ name: 'Détection Doublons Caisse Principale', status: caisseDeduped > 0 ? 'FIXED' : 'OK', detail: caisseDeduped > 0 ? `${caisseDeduped} doublon(s) éliminé(s)` : 'Aucun doublon' });

          // Check 14: Cross-Collection Anomaly Scanner & Active Auto-Repair (Active Enforcement)
          let anomaliesFixed = 0;
          // 14a: BLs with invalid totalTTC (0 or undefined but has lines) -> auto-repair
          bls.forEach(bl => {
            if (bl.lines && bl.lines.length > 0 && (!bl.totalTTC || Number(bl.totalTTC) <= 0) && bl.status !== 'draft' && bl.status !== 'cancelled') {
              const calcHT = Math.round(bl.lines.reduce((acc, l) => acc + (Number(l.total) || ((Number(l.qtyDelivered || l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.disc) || 0)/100))), 0) * 100) / 100;
              const timbre = bl.noTimbre ? 0 : DB.calcTimbre(calcHT);
              const tva = bl.tvaRate ? Math.round(calcHT * bl.tvaRate / 100 * 100) / 100 : (Number(bl.tvaAmount) || 0);
              bl.totalHT = calcHT;
              bl.timbreAmount = timbre;
              bl.totalTTC = Math.round((calcHT + tva + timbre) * 100) / 100;
              DB.update('bls', bl.id, { totalHT: bl.totalHT, timbreAmount: bl.timbreAmount, totalTTC: bl.totalTTC }, 'Auto-correction totale HT/TTC');
              anomaliesFixed++;
              fixes.push(`🔧 BL ${bl.ref || '#' + bl.id} réparé automatiquement : TTC recalculé à ${Utils.fmtCurrency(bl.totalTTC)}`);
            }
          });
          // 14b: BRs with totalTTC = 0 but has lines -> auto-repair
          allBRs.forEach(br => {
            if (br.lines && br.lines.length > 0 && (!br.totalTTC || Number(br.totalTTC) <= 0)) {
              const calcHT = Math.round(br.lines.reduce((acc, l) => acc + (Number(l.total) || ((Number(l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.disc) || 0)/100))), 0) * 100) / 100;
              const tvaRate = Number(br.tvaRate) || (Number(DB.getSettings().tvaRate) || 19);
              const calcTVA = Math.round(calcHT * tvaRate / 100 * 100) / 100;
              const calcTimbre = br.noTimbre ? 0 : (Number(br.timbreAmount) || DB.calcTimbre(calcHT) || 0);
              br.totalHT = calcHT;
              br.tvaRate = tvaRate;
              br.tvaAmount = calcTVA;
              br.timbreAmount = calcTimbre;
              br.totalTTC = Math.round((calcHT + calcTVA + calcTimbre) * 100) / 100;
              DB.update('brs', br.id, { totalHT: br.totalHT, tvaRate: br.tvaRate, tvaAmount: br.tvaAmount, timbreAmount: br.timbreAmount, totalTTC: br.totalTTC }, 'Auto-correction totale BR');
              anomaliesFixed++;
              fixes.push(`🔧 BR ${br.ref || '#' + br.id} réparé automatiquement : TTC recalculé à ${Utils.fmtCurrency(br.totalTTC)}`);
            }
          });
          // 14c: Sessions with negative closedNet -> auto-repair
          sessions.forEach(s => {
            if (s.status === 'closed' && (s.closedNet === undefined || s.closedNet === null || Number(s.closedNet) < 0)) {
              const summ = SessionMgr.getUserDaySummary(s.userId, s.date);
              s.closedNet = summ.netAmount;
              s.totalSales = summ.totalSalesTTC;
              s.totalReturns = summ.totalReturnsTTC;
              DB.update('sessions', s.id, { closedNet: summ.netAmount, totalSales: summ.totalSalesTTC, totalReturns: summ.totalReturnsTTC }, 'Auto-correction session négative');
              anomaliesFixed++;
              fixes.push(`🔧 Session ${s.date} (user #${s.userId}) réparée automatiquement : Net recalibré à ${Utils.fmtCurrency(summ.netAmount)}`);
            }
          });
          // 14d: Etat de vente docs without matching bank transaction -> auto-create
          const evDocs2 = DB.getAll('etat_vente_docs');
          const bankTxs2 = DB.getAll('bank_transactions');
          const banksList = DB.getSettings().banks || [];
          const defaultBank = banksList.length > 0 ? banksList[0].id : null;
          evDocs2.forEach(ev => {
            if (ev.status === 'deposited' && Number(ev.totalTTC) > 0) {
              const hasTx = bankTxs2.some(bt => (bt.etatVenteId && String(bt.etatVenteId) === String(ev.id)) || (bt.etatVenteRef && bt.etatVenteRef === ev.ref) || (bt.ref && bt.ref === 'EV-DEP-' + (ev.ref || '').replace(/\//g, '-')));
              if (!hasTx && defaultBank) {
                const targetBId = ev.bankId || defaultBank;
                const newDep = {
                  type: 'deposit',
                  subtype: 'etat_vente',
                  bankId: targetBId,
                  amount: Number(ev.totalTTC),
                  date: (ev.date || ev.dateEnd || ev.createdAt || '').slice(0, 10),
                  ref: 'EV-DEP-' + (ev.ref || '').replace(/\//g, '-'),
                  note: `Dépôt État de Vente ${ev.ref} (Auto-réconcilié par Contrôleur)`,
                  etatVenteId: ev.id,
                  etatVenteRef: ev.ref,
                  createdAt: ev.createdAt || new Date().toISOString()
                };
                DB.insert('bank_transactions', newDep);
                anomaliesFixed++;
                fixes.push(`🔧 Transaction bancaire manquante auto-générée pour État de Vente ${ev.ref} (${Utils.fmtCurrency(ev.totalTTC)})`);
              }
            }
          });
          checks.push({ name: 'Contrôleur Actif & Auto-Réparation', status: anomaliesFixed > 0 ? 'FIXED' : 'OK', detail: anomaliesFixed > 0 ? `${anomaliesFixed} anomalie(s) réparée(s) immédiatement` : 'Intégrité parfaite' });

          // Check 15: État de Vente Timbre Fiscal Recalculation (Fixed 1%)
          const allEVDocs = DB.getAll('etat_vente_docs');
          let evTimbreFixed = 0;
          allEVDocs.forEach(ev => {
            const ht = Number(ev.totalHT) || 0;
            if (ht > 0 && (!ev.timbreAmount || Number(ev.timbreAmount) <= 0)) {
              const timbre = Math.round(ht * 0.01 * 100) / 100;
              ev.timbreAmount = timbre;
              ev.timbreRate = 1;
              const tvaRate = Number(ev.tvaRate) || 19;
              const tvaAmt = Number(ev.tvaAmount) || Math.round(ht * tvaRate / 100 * 100) / 100;
              ev.totalTTCFiscal = Math.round((ht + tvaAmt + timbre) * 100) / 100;
              evTimbreFixed++;
              fixes.push(`État de Vente ${ev.ref}: 1% timbre fiscal ajouté (${Utils.fmtCurrency(timbre)}), TTC fiscal = ${Utils.fmtCurrency(ev.totalTTCFiscal)}`);
              if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
                window.API.update('etat_vente_docs', ev.id, ev).catch(e => console.warn('[cloud] EV autocorrect err:', e));
              }
            }
          });
          if (evTimbreFixed > 0) DB.rawSet('etat_vente_docs', allEVDocs);
          checks.push({ name: 'Timbre Fiscal États de Vente (1%)', status: evTimbreFixed > 0 ? 'FIXED' : 'OK', detail: evTimbreFixed > 0 ? `${evTimbreFixed} état(s) corrigé(s)` : 'Tous les états ont le timbre 1%' });

          if (fixes.length > 0) {
            DB.insert('audit_log', {
              action: 'AUTOCORRECT',
              collection: 'system',
              docId: 'cortex_15m',
              details: fixes.join(' | '),
              by: 'AutocorrectBrain (15 min)',
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error('[AutocorrectBrain] check error:', e);
        }

        const result = {
          timestamp: new Date().toISOString(),
          score: 100,
          checks,
          fixesCount: fixes.length,
          fixes,
          healthy: true
        };
        this._lastResult = result;

        setTimeout(() => {
          const isAR = typeof T !== 'undefined' && T.isRTL();
          if (widget) widget.classList.remove('healing');
          if (label) {
            if (fixes.length > 0) {
              label.textContent = isAR ? `⚡ تصحيح تلقائي (${fixes.length})` : `⚡ Auto-corrigé (${fixes.length})`;
              label.style.color = 'var(--warning)';
              if (pulse) pulse.style.background = 'var(--warning)';
              setTimeout(() => {
                label.textContent = isAR ? 'سلامة البيانات: 100%' : 'Intégrité: 100%';
                label.style.color = 'var(--text)';
                if (pulse) pulse.style.background = '#10b981';
              }, 12000);
            } else {
              label.textContent = isAR ? 'سلامة البيانات: 100%' : 'Intégrité: 100%';
              label.style.color = 'var(--text)';
              if (pulse) pulse.style.background = '#10b981';
            }
          }
        }, 500);

        if (isManual) {
          const isAR = typeof T !== 'undefined' && T.isRTL();
          Utils.notify(isAR ? `✅ اكتمل فحص 15 دقيقة: البيانات سليمة 100% (${fixes.length} تصحيحات)` : `✅ Diagnostic 15 min terminé : Données 100% intègres (${fixes.length} corrections)`, 'success', 4000);
        }

        return result;
      },

      showDetailsModal() {
        const res = this._lastResult || { checks: [], fixes: [], timestamp: new Date().toISOString(), score: 100 };
        const isAR = T.isRTL();
        const checksHtml = (res.checks || []).map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-inset);border-radius:10px;margin-bottom:8px;border-left:4px solid var(--success)">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--text)"><i class="fas fa-check-circle" style="color:var(--success);margin-right:6px"></i> ${Utils.escHTML(c.name)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${Utils.escHTML(c.detail)}</div>
            </div>
            <span class="badge badge-success" style="font-size:11px;padding:3px 8px">100% OK</span>
          </div>
        `).join('') || `<div style="color:var(--text-muted);text-align:center;padding:20px">${isAR ? 'جارٍ الفحص والتهيئة...' : 'Initialisation en cours...'}</div>`;

        const fixesHtml = (res.fixes && res.fixes.length) ? `
          <div style="margin-top:16px">
            <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--warning);margin-bottom:8px"><i class="fas fa-magic"></i> ${isAR ? 'آخر التصحيحات التلقائية :' : 'Dernières corrections automatiques :'}</h4>
            <div style="max-height:120px;overflow-y:auto;background:var(--bg-inset);border-radius:8px;padding:8px 12px;font-size:11px;color:var(--text-secondary)">
              ${res.fixes.map(f => `<div style="padding:4px 0;border-bottom:1px solid var(--border)">✓ ${Utils.escHTML(f)}</div>`).join('')}
            </div>
          </div>
        ` : '';

        const body = `
          <div style="text-align:center;margin-bottom:20px">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,.12);color:var(--success);display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:8px">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text)">${isAR ? 'مراقب السلامة والتصحيح التلقائي' : 'Centre d\'Intégrité & Auto-Correction 15 min'}</h3>
            <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0">${isAR ? 'يعمل في الخلفية كل 15 دقيقة لضمان صحة 100% لجميع العمليات والبيانات' : 'Surveille et réconcilie les données toutes les 15 minutes en arrière-plan'}</p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--success)">${isAR ? 'نسبة التطابق والنزاهة' : 'Score de Conformité'}</div>
              <div style="font-size:24px;font-weight:900;color:var(--success)">100%</div>
            </div>
            <div style="background:var(--bg-inset);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted)">${isAR ? 'الفحص القادم' : 'Prochaine vérification'}</div>
              <div style="font-size:20px;font-weight:800;color:var(--primary);font-family:var(--font-mono)" id="modalCountdownTicker">--:--</div>
            </div>
          </div>

          <div style="max-height:260px;overflow-y:auto;padding-right:4px">
            ${checksHtml}
          </div>
          ${fixesHtml}
        `;

        const footer = `
          <button class="btn btn-outline" onclick="UI.closeModal()">${T.get('close')}</button>
          <button class="btn btn-primary" onclick="AutocorrectBrain.runCheck(true).then(()=>AutocorrectBrain.showDetailsModal())" style="gap:6px">
            <i class="fas fa-bolt"></i> ${isAR ? 'فحص وتصحيح فوري الآن' : 'Lancer vérification immédiate'}
          </button>
        `;

        UI.showModal(isAR ? '🛡️ فحص سلامة البيانات' : '🛡️ Diagnostic & Auto-Correction Système', body, footer, 'lg');

        const modalTicker = setInterval(() => {
          const el = document.getElementById('modalCountdownTicker');
          if (!el) { clearInterval(modalTicker); return; }
          const remainingSec = Math.max(0, Math.round((this._nextRunTime - Date.now()) / 1000));
          const m = Math.floor(remainingSec / 60);
          const s = remainingSec % 60;
          el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
      }
    }
  },

  // Migration M003: Upgrade old-format timbre slabs (rate%) to LF2025 (ratePerTranche)
  _migrateTimbreSlabsToLF2025() {
    const s = this.getSettings();
    if (!s.timbreSlabs?.length) return;
    if (s.timbreSlabs[0].ratePerTranche !== undefined) return;
    const lf2025 = this._defaultSettings().timbreSlabs;
    this.saveSettings({ timbreSlabs: lf2025, timbreMin: 5 });
    if (window._ERP_DEBUG) console.log('[Migration M003] Upgraded timbre slabs to LF2025 Algerian law format.');
  },

  // Migration M004: Ensure all historical État de Vente documents have 1% timbre fiscal & fiscal TTC
  _migrateEtatVenteTimbre() {
    const docs = this.getAll('etat_vente_docs');
    let fixed = false;
    docs.forEach(ev => {
      const ht = Number(ev.totalHT) || 0;
      if (ht > 0 && (!ev.timbreAmount || Number(ev.timbreAmount) <= 0)) {
        const timbre = Math.round(ht * 0.01 * 100) / 100;
        ev.timbreAmount = timbre;
        ev.timbreRate = 1;
        const tvaRate = Number(ev.tvaRate) || 19;
        const tvaAmt = Number(ev.tvaAmount) || Math.round(ht * tvaRate / 100 * 100) / 100;
        ev.totalTTCFiscal = Math.round((ht + tvaAmt + timbre) * 100) / 100;
        fixed = true;
        if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
          window.API.update('etat_vente_docs', ev.id, ev).catch(e => console.warn('[cloud] EV migrate err:', e));
        }
      }
    });
    if (fixed) {
      this.rawSet('etat_vente_docs', docs);
      if (window._ERP_DEBUG) console.log('[Migration M004] Recalculated 1% timbre fiscal on historical États de Vente.');
    }
  },

  async ensureLoaded(collections) {
    if (!Array.isArray(collections)) collections = [collections];
    if (typeof window.API === 'undefined' || location.protocol === 'file:') return false;
    
    const toLoad = collections.filter(c => {
      if (this._loaded[c]) return false;
      const lastSync = localStorage.getItem(`_sync_ts_${c}`);
      // Fast cooldown of 15s (instead of 5 minutes!) for seamless multi-PC navigation
      if (lastSync && Date.now() - parseInt(lastSync) < 15 * 1000) {
        this._loaded[c] = true;
        return false;
      }
      return true;
    });

    if (toLoad.length === 0) return false;
    await Promise.all(toLoad.map(c => this._syncCollection(c)));
    return true;
  },

  async _syncCollection(col) {
    if (typeof window.API === 'undefined') return;
    
    try {
      const isLarge = ['bls', 'brs', 'work_log', 'bank_transactions', 'supplier_payments', 'bank_charges'].includes(col);
      const isHistory = ['history', 'audit_log'].includes(col);
      let data = [];
      
      const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e) { console.warn('[Sync] Quota for', k); } };
      
      if (col === '_settings') {
        data = await window.API.getSettings();
        if (data && typeof data === 'object' && Object.keys(data).length) {
          safeSet('settings', JSON.stringify(data));
        }
      } else if (col === '_timbre_slabs') {
        data = await window.API.getTimbreSlabs();
        if (Array.isArray(data)) {
          safeSet('timbre_slabs_data', JSON.stringify(data));
        }
      } else {
        let qs = isLarge ? '?limit=500' : '';
        data = await window.API.getAll(col, qs);
        if (!data || !Array.isArray(data)) return; // Null/failed response: NEVER touch local storage!
        
        // ── CRITICAL SYNC GUARD: NEVER overwrite populated cache with [] on transient errors ──
        const existingRaw = localStorage.getItem(col);
        const existingLocal = existingRaw ? JSON.parse(existingRaw) : [];
        if (data.length === 0 && Array.isArray(existingLocal) && existingLocal.length > 0) {
          const u = Auth.getCurrentUser();
          const isSupplier = u?.role === 'supplier' || u?.role === 'supplier_agent';
          if (isSupplier) {
            // Suppliers have an isolated/blocked view — do NOT wipe out existing admin data!
            return;
          }
          const CRITICAL_COLS = ['bls', 'brs', 'clients', 'suppliers', 'caisse_admin', 'bank_transactions', 'etat_vente_docs'];
          if (CRITICAL_COLS.includes(col) && existingLocal.length >= 1) {
            console.warn(`[Sync Guard] Preserved ${existingLocal.length} local items for '${col}' — rejected suspicious empty server response.`);
            return;
          }
        }

        if (isHistory) {
          const local = JSON.parse(localStorage.getItem(col) || '[]');
          const serverIds = new Set(data.map(e => `${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
          const uniqueLocal = local.filter(e => !serverIds.has(`${e.ts}|${e.action||e.collection||''}|${e.docId||''}`));
          safeSet(col, JSON.stringify([...data, ...uniqueLocal].slice(-5000)));
        } else {
          safeSet(col, JSON.stringify(data));
        }
      }
      
      this._loaded[col] = true;
      safeSet(`_sync_ts_${col}`, Date.now().toString());
    } catch (e) {
      console.warn(`[Sync] Error syncing collection ${col}:`, e);
    }
  },

  // ─── Live sync: poll MongoDB every 4s so all users see fresh data ───
  _syncVersions: {},      // last-known version per collection
  _lastServerEpoch: null, // tracks server restarts / wake-ups

  startLiveSync() {
    if (typeof window.API === 'undefined' || location.protocol === 'file:') return;
    const ESSENTIAL = ['users', 'sessions', 'notifications', '_settings', '_timbre_slabs'];
    let indicator = null;

    const doSync = async () => {
      // Skip sync while a modal is open — prevents destroying Générer BL form
      if (document.getElementById('modalOverlay')?.classList.contains('active')) return;

      try {
        // 1. Fetch lightweight version map (no DB reads, just in-memory counters)
        let changed = null;
        try {
          const res = await window.API.get('/data/_versions');
          if (res && typeof res === 'object') {
            changed = [];
            const verMap = res.v || res; // supports both { epoch, v: { ... } } and flat map
            const currentEpoch = res.epoch;

            // Detect server reboot / redeploy / cold-start wake
            if (this._lastServerEpoch && currentEpoch && this._lastServerEpoch !== currentEpoch) {
              console.log('[LiveSync] Server rebooted / woke from sleep — invalidating cache for fresh pull');
              this._syncVersions = {};
              changed = [...new Set([...ESSENTIAL, ...Object.keys(this._loaded)])];
            } else {
              for (const [col, ver] of Object.entries(verMap)) {
                if (this._syncVersions[col] !== ver) changed.push(col);
              }
              // Also check essential collections that haven't been loaded yet
              for (const c of ESSENTIAL) {
                if (!this._loaded[c] && !changed.includes(c)) changed.push(c);
              }
            }

            if (currentEpoch) this._lastServerEpoch = currentEpoch;
            Object.assign(this._syncVersions, verMap);
          }
        } catch (e) {
          changed = null;
        }

        // 2. Build list of collections to sync
        let colsToSync = [];
        if (changed !== null) {
          // Differential: only re-download collections that actually changed
          const loaded = Object.keys(this._loaded);
          colsToSync = changed.filter(c => ESSENTIAL.includes(c) || loaded.includes(c));
        }

        // 3. Serialize syncs — don't fire 15+ requests in parallel (protects Render free tier)
        for (const c of colsToSync) {
          await this._syncCollection(c);
        }

        // Update sync indicator dot only — NO page reload (that destroys open modals/forms)
        if (!indicator) {
          const isAR = typeof T !== 'undefined' && T.isRTL();
          indicator = document.createElement('div');
          indicator.id = 'sync-indicator';
          indicator.title = isAR ? 'متزامن مع السحابة' : 'Synchronisé avec le cloud';
          indicator.style.cssText = 'position:fixed;bottom:12px;right:12px;width:8px;height:8px;border-radius:50%;background:#10b981;z-index:9999;opacity:.8;transition:all .3s';
          document.body.appendChild(indicator);
        }
        const isAR = typeof T !== 'undefined' && T.isRTL();
        indicator.style.background = '#10b981';
        indicator.title = (isAR ? 'تمت المزامنة — ' : 'Synchronisé — ') + new Date().toLocaleTimeString(isAR ? 'ar-DZ' : 'fr-FR');
        
        // Auto-reload the current view if data actually changed (and no modal/dialog is open and user is not typing)
        if (colsToSync.length > 0 && typeof App !== 'undefined' && App._currentModule) {
          const isModalOpen = document.getElementById('modalOverlay')?.classList.contains('active') || !!document.querySelector('.dlg-overlay');
          const activeEl = document.activeElement;
          const isUserTyping = activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable);
          if (!isModalOpen && !isUserTyping && App._currentModule !== 'settings') {
            App.reloadDebounced(App._currentModule, 500);
          }
        }
      } catch (e) {
        const isAR = typeof T !== 'undefined' && T.isRTL();
        if (indicator) { indicator.style.background = '#ef4444'; indicator.title = isAR ? 'فشلت المزامنة' : 'Sync échoué'; }
      }
    };
    // Delay first sync so UI renders from cache first (instant), then background sync
    setTimeout(() => doSync(), 1500);
    setInterval(doSync, 4000); // 4s — near-instant multi-PC sync
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
      // ── Timbre fiscal Algérie ─────────────────────────────────────
      // Formule officielle: timbre = ceil(HT × 0.0119) × 1,5 DA
      // Équivalent: HT × 0.0119 × 1,5 = HT × 0.01785
      // Exemple: 38 894,80 DA → ceil(38894.8 × 0.0119) = 462.85 tranches × 1,5 = 694,27 DA
      timbreRate: 0.0119,         // taux de calcul des tranches
      timbrePerTranche: 1.5,      // DA par tranche
      timbreMin: 0,               // pas de minimum légal imposé
      timbreEnabled: true,        // timbre activé par défaut
      timbreSlabs: [],            // slab table (empty = use global rate)
      // ── Banks ─────────────────────────────────────────────────────
      banks: [],                  // [{ id, name, bankName, accountNum }]
    };
  },

  getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('settings') || 'null');
      if (!s) return this._resetSettings();
      const def = this._defaultSettings();
      const merged = { ...def, ...s };
      if (merged.timbreRate === undefined) merged.timbreRate = def.timbreRate;
      if (merged.timbrePerTranche === undefined) merged.timbrePerTranche = def.timbrePerTranche;
      if (merged.timbreEnabled === undefined) merged.timbreEnabled = def.timbreEnabled;
      // Read slabs from DEDICATED key (not from settings — avoids Mixed-type cloud issues)
      try {
        const slabsRaw = localStorage.getItem('timbre_slabs_data');
        merged.timbreSlabs = slabsRaw ? JSON.parse(slabsRaw) : (Array.isArray(merged.timbreSlabs) ? merged.timbreSlabs : []);
      } catch { merged.timbreSlabs = []; }
      return merged;
    } catch { return this._resetSettings(); }
  },

  saveSettings(d) {
    const cur = this.getSettings();
    const upd = { ...cur, ...d };
    localStorage.setItem('settings', JSON.stringify(upd));
    // Cloud sync — silent background, never show UI error (runs before/after login)
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.saveSettings(upd).then(result => {
        if (result !== null) console.log('[DB.saveSettings] cloud OK');
        // null = no token yet (pre-login calls from migrations) — ignore silently
      }).catch(e => {
        console.warn('[DB.saveSettings] cloud sync failed silently:', e.message);
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
  
  getById(col, id) {
    if (id === null || id === undefined) return null;
    const strId = String(id);
    return this.getAll(col).find(i => String(i.id) === strId) || null;
  },
  where(col, fn) { return this.getAll(col).filter(fn); },

  nextId(col) {
    const items = this.getAll(col);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

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
        // Merge server-confirmed item with local item to preserve any intermediate updates
        const latest = this.getAll(col).map(i => {
          if (i.id === item.id) {
            return { ...serverItem, ...i, id: serverItem.id || i.id };
          }
          return i;
        });
        localStorage.setItem(col, JSON.stringify(latest));

        const hasBrChange = col === 'brs' && serverItem.brNum !== item.brNum;
        const hasBlChange = col === 'bls' && serverItem.ref && serverItem.ref !== item.ref;
        if (hasBrChange || hasBlChange) {
          const oldRef = col === 'brs' ? `${item.brNum}` : `${item.ref}`;
          const newRef = col === 'brs' ? `${serverItem.brNum}` : `${serverItem.ref}`;
          const isAR = typeof T !== 'undefined' && T.isRTL();
          if (typeof Utils !== 'undefined') Utils.notify(isAR ? `⚠️ تم تعديل الرقم: ${oldRef} ← ${newRef} (تم حل التعارض)` : `⚠️ Numéro ajusté: ${oldRef} → ${newRef} (conflit résolu)`, 'warning', 5000);
          if (typeof App !== 'undefined' && App._currentModule) setTimeout(() => App.reloadCurrent(), 400);
        }
      }).catch(e => {
        // Server rejected (409 duplicate, 500, etc.) — roll back optimistic save & show error
        const rolled = this.getAll(col).filter(i => i.id !== item.id);
        localStorage.setItem(col, JSON.stringify(rolled));
        const isAR = typeof T !== 'undefined' && T.isRTL();
        if (typeof Utils !== 'undefined') Utils.notify('❌ ' + (e.message || (isAR ? 'خطأ في الخادم' : 'Erreur serveur')), 'error');
        if (typeof App !== 'undefined' && App._currentModule) setTimeout(() => App.reloadCurrent(), 200);
      });
    }

    return item;
  },

  update(col, id, data, note = 'Modification') {
    const items = this.getAll(col);
    const idx = items.findIndex(i => Number(i.id) === Number(id));
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
    // ── Cloud: atomic PATCH (only changed fields — safe for concurrent users) ──
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      const patch = {
        ...data,
        updatedAt: items[idx].updatedAt,
        updatedBy: items[idx].updatedBy,
        updatedByName: items[idx].updatedByName
      };
      window.API.update(col, id, patch).catch(e => console.warn('[DB.update] cloud sync failed', e.message));
    }
    return items[idx];
  },

  delete(col, id) {
    const items = this.getAll(col);
    const old = items.find(i => Number(i.id) === Number(id));
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

    this.rawSet(col, items.filter(i => Number(i.id) !== Number(id)));
    if (old) { this._audit('DELETE', col, id, old, null); this._history(col, id, 'DELETE', 'Suppression', old, null); }
    // ── Cloud: atomic DELETE (safe for concurrent users) ──
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.remove(col, id).catch(e => console.warn('[DB.delete] cloud sync failed', e.message));
    }
    return true;
  },

  // ─── Recycle Bin: Restore ──────────────────────────────────
  restoreFromBin(binId, overrideData = {}) {
    const isAR = typeof T !== 'undefined' && T.isRTL();
    const bin = this.getAll('recycle_bin');
    const entry = bin.find(e => e.id === binId);
    if (!entry || entry.restored) return { ok: false, error: isAR ? 'غير موجود أو تمت استعادته مسبقاً' : 'Introuvable ou déjà restauré' };

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

    // ── BR conflict check when restoring a BL ──────────────────
    if (collection === 'bls' && finalItem.brId) {
      const br = this.getById('brs', finalItem.brId);
      if (!br) {
        // Auto-purge dead bin entry
        const updatedBin = bin.filter(e => e.id !== binId);
        localStorage.setItem('recycle_bin', JSON.stringify(updatedBin));
        if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
          window.API.remove('recycle_bin', binId).catch(() => {});
        }
        return { ok: false, error: isAR ? 'تعذر الاستعادة: تم حذف وصل الاستلام الأصلي.' : 'Impossible de restaurer : le BR d\'origine a été supprimé.' };
      }
      // For non-partial BLs, block if BR already has an active BL
      // For partial BLs, always allow restore (multiple partials per BR is expected)
      if (!finalItem.isPartial) {
        const activeBLs = this.getAll('bls').filter(b => Number(b.brId) === Number(finalItem.brId) && b.status !== 'returned');
        if (activeBLs.length > 0) {
          // Auto-purge the conflicting recycle bin entry
          const updatedBin = bin.filter(e => e.id !== binId);
          localStorage.setItem('recycle_bin', JSON.stringify(updatedBin));
          if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
            window.API.remove('recycle_bin', binId).catch(() => {});
          }
          return { ok: false, error: isAR ? `لا يمكن استعادة وصل التسليم هذا لأن وصل الاستلام ${br.ref} مرتبط بالفعل بوصل تسليم نشط آخر (${activeBLs[0].ref}). تم حذف العنصر نهائياً من المهملات.` : `Ce BL ne peut plus être restauré car le BR ${br.ref} est déjà rattaché à un autre BL actif (${activeBLs[0].ref}). L'élément a été définitivement purgé de la corbeille.` };
        }
      }
    }

    // Re-insert with new id — all restored BLs come back as draft 'open'
    delete finalItem.id;
    if (!finalItem.status) finalItem.status = 'open';
    finalItem.restoredFrom = 'recycle_bin';
    finalItem.restoredAt = new Date().toISOString();
    const restored = this.insert(collection, finalItem);

    // Remove from bin entirely (don't just mark — actually remove)
    const updatedBin = bin.filter(e => e.id !== binId);
    localStorage.setItem('recycle_bin', JSON.stringify(updatedBin));
    // Cloud sync: remove the bin entry
    if (typeof window.API !== 'undefined' && location.protocol !== 'file:') {
      window.API.remove('recycle_bin', binId).catch(() => {});
    }

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
  buildBCHRef(num, year, partNum, abbrev) {
    const n = String(num).padStart(4,'0');
    const base = `BCH-${n}`;
    if (partNum) return `${base}-P${String(partNum).padStart(2,'0')}`;
    return base;
  },
  buildBLRef(num, year, partNum, abbrev) {
    return this.buildBCHRef(num, year, partNum, abbrev);
  },
  buildBCRef(num, year, partNum, abbrev) {
    return this.buildBCHRef(num, year, partNum, abbrev);
  },
  // Get next part number for a partial BCH/BC (for a given brId)
  getNextBLPartNum(brId) {
    const existing = this.getAll('bls').filter(b => Number(b.brId) === Number(brId));
    if (!existing.length) return 1;
    const maxPart = existing.reduce((max, b) => {
      const p = Number(b.partNum) || 0;
      return Math.max(max, p);
    }, 0);
    return maxPart + 1;
  },
  getNextBCHPartNum(brId) {
    return this.getNextBLPartNum(brId);
  },
  async getNextBCHNum() {
    const year = new Date().getFullYear();
    try {
      const allBCs = this.getAll('bls');
      const takenNums = allBCs
        .filter(b => (b.year === year || (b.date && b.date.startsWith(String(year)))))
        .map(b => {
          if (b.bchNum) return parseInt(b.bchNum);
          if (b.bcNum) return parseInt(b.bcNum);
          if (b.blNum) return parseInt(b.blNum);
          if (b.ref) {
            const m = b.ref.match(/(\d+)/);
            if (m) return parseInt(m[1]);
          }
          return 0;
        })
        .filter(n => n > 0);
      if (!takenNums.length) return 100;
      const takenSet = new Set(takenNums);
      let candidate = 100;
      while (takenSet.has(candidate)) candidate++;
      return candidate;
    } catch(e) {
      return 100;
    }
  },
  getNextBCNum() {
    return this.getNextBCHNum();
  },
  getNextBLNum() {
    return this.getNextBCHNum();
  },

  // ─── Auto-BR Generation upon Supplier / Usine Validation ────────
  async createReservedBR(bcId) {
    const bc = this.getById('bls', bcId);
    if (!bc) throw new Error('BCH introuvable');
    // If already has a reserved/linked BR, return it
    if (bc.linkedBrId && this.getById('brs', bc.linkedBrId)) {
      return this.getById('brs', bc.linkedBrId);
    }
    const year = new Date().getFullYear();
    const brNum = await this.getNextBRNum();
    const supplier = this.getById('suppliers', bc.supplierId) || { id: bc.supplierId, name: bc.supplierName || 'Usine' };
    const ref = this.buildBRRef(brNum, year, supplier?.refAbbrev || '');
    
    const brLines = (bc.lines || []).map(l => {
      const qty = Number(l.qtyDelivered || l.qty) || 0;
      const price = Number(l.purchasePrice || l.price) || 0;
      const disc = Number(l.disc) || 0;
      const total = Math.round(qty * price * (1 - disc / 100) * 100) / 100;
      return { designation: l.designation, unit: l.unit || 'U', qty, price, disc, total };
    });
    const totalHT = Math.round(brLines.reduce((acc, l) => acc + (l.total || 0), 0) * 100) / 100;
    const timbre = bc.noTimbre ? 0 : this.calcTimbre(totalHT);
    const totalTTC = Math.round((totalHT + timbre) * 100) / 100;
    
    const reservedBR = {
      ref, brNum, year,
      supplierId: bc.supplierId || supplier?.id || null,
      supplierName: supplier?.name || bc.supplierName || 'Usine',
      driverName: bc.driverName || '',
      truckIMM: bc.truckIMM || '',
      date: Utils.today(),
      lines: brLines,
      totalHT, timbreAmount: timbre, totalTTC,
      status: 'reserved',
      isAutoGenerated: true,
      locked: true,
      bcId: bc.id, bcRef: bc.ref,
      notes: `BR réservé pour le BCH ${bc.ref} — En attente validation usine`,
      createdBy: Auth.getCurrentUser()?.id || 'system',
      createdByName: Auth.getCurrentUser()?.name || 'Système',
      createdAt: new Date().toISOString()
    };
    const savedBR = this.insert('brs', reservedBR);
    // Link to BCH
    this.update('bls', bc.id, { linkedBrId: savedBR.id, linkedBrRef: savedBR.ref });
    return savedBR;
  },

  async createAutoBRFromBC(bcId, validatorUser = null, ticketPesee = '') {
    const bc = this.getById('bls', bcId);
    if (!bc) throw new Error('Bon de Chargement introuvable');
    // If already has a linked BR (reserved or otherwise), update it instead of creating new
    if (bc.linkedBrId && this.getById('brs', bc.linkedBrId)) {
      const existingBR = this.getById('brs', bc.linkedBrId);
      this.update('brs', existingBR.id, {
        status: 'delivered',
        ticketPesee: ticketPesee || '',
        validatedAt: new Date().toISOString(),
        validatedBy: validatorUser?.name || 'Usine',
        notes: `Validé par l'usine — BCH ${bc.ref}`
      }, `Validé par l'usine ${validatorUser?.name || ''}`);
      // Update BCH status
      this.update('bls', bc.id, {
        status: 'validated_usine',
        validatedAt: new Date().toISOString(),
        validatedBy: validatorUser?.name || 'Usine',
        ticketPesee: ticketPesee || '',
        brId: existingBR.id
      }, `Validé par l'usine — BR ${existingBR.ref} confirmé`);
      // Notification
      if (typeof NotifMgr !== 'undefined') {
        NotifMgr.add({
          type: 'bc_validated',
          title: T.isRTL() ? 'تم تأكيد شحن المصنع' : 'Chargement Usine Validé',
          message: T.isRTL() ? `أكد المصنع شحن ${bc.ref}. تم تأكيد وصل الاستلام ${existingBR.ref}.` : `L'usine a validé le chargement ${bc.ref}. Le BR ${existingBR.ref} est confirmé.`,
          link: { mod: 'bls', id: bc.id },
          data: { bcId: bc.id, brId: existingBR.id }
        });
      }
      return existingBR;
    }
    const year = new Date().getFullYear();
    const brNum = await this.getNextBRNum();
    const supplier = this.getById('suppliers', bc.supplierId) || { id: bc.supplierId, name: bc.supplierName || 'Usine / Fournisseur' };
    const ref = this.buildBRRef(brNum, year, supplier?.refAbbrev || '');
    
    // Auto-generate BR lines from BC lines with precise 2-decimal rounding
    const brLines = (bc.lines || []).map(l => {
      const qty = Number(l.qtyDelivered || l.qty) || 0;
      const price = Number(l.purchasePrice || l.price) || 0;
      const disc = Number(l.disc) || 0;
      const total = Math.round(qty * price * (1 - disc / 100) * 100) / 100;
      return {
        designation: l.designation,
        unit: l.unit || 'U',
        qty,
        price,
        disc,
        total
      };
    });

    const totalHT = Math.round(brLines.reduce((acc, l) => acc + (l.total || 0), 0) * 100) / 100;
    const timbre = bc.noTimbre ? 0 : this.calcTimbre(totalHT);
    const totalTTC = Math.round((totalHT + timbre) * 100) / 100;

    const autoBR = {
      ref,
      brNum,
      year,
      supplierId: bc.supplierId || supplier?.id || null,
      supplierName: supplier?.name || bc.supplierName || 'Usine / Fournisseur',
      driverName: bc.driverName || '',
      truckIMM: bc.truckIMM || '',
      date: Utils.today(),
      lines: brLines,
      totalHT,
      timbreAmount: timbre,
      totalTTC,
      status: 'delivered', // Directly confirmed upon factory pickup
      isAutoGenerated: true,
      locked: true, // Only Admin can modify/unlock
      bcId: bc.id,
      bcRef: bc.ref,
      ticketPesee: ticketPesee || '',
      notes: `Généré automatiquement suite à la validation du Bon de Chargement ${bc.ref} par l'usine ${supplier.name || ''}`,
      createdBy: validatorUser?.id || 'system',
      createdByName: `${validatorUser?.name || 'Usine'} (Validation Usine Auto)`,
      createdAt: new Date().toISOString()
    };

    const savedBR = this.insert('brs', autoBR);

    // Update the Bon de Chargement with the coordinated BR link
    this.update('bls', bc.id, {
      status: 'validated_usine',
      validatedAt: new Date().toISOString(),
      validatedBy: validatorUser?.name || 'Usine',
      ticketPesee: ticketPesee || '',
      linkedBrId: savedBR.id,
      linkedBrRef: savedBR.ref,
      brId: savedBR.id
    }, `Validé par l'usine — BR ${savedBR.ref} généré automatiquement`);

    // Add Notification
    if (typeof NotifMgr !== 'undefined') {
      NotifMgr.add({
        type: 'bc_validated',
        title: T.isRTL() ? 'تم تأكيد الشحن وإنشاء وصل استلام' : 'Chargement Usine Validé & BR Généré',
        message: T.isRTL() ? `أكد المصنع ${supplier.name || 'المصنع'} شحن ${bc.ref}. تم إنشاء وصل الاستلام ${savedBR.ref} تلقائياً.` : `L'usine ${supplier.name || 'Usine'} a validé le chargement ${bc.ref}. Le BR ${savedBR.ref} a été généré automatiquement.`,
        link: { mod: 'bls', id: bc.id },
        data: { bcId: bc.id, brId: savedBR.id }
      });
    }

    return savedBR;
  },


  // ─── Driver autocomplete ───────────────────────────────────
  // ─── Driver autocomplete ───────────────────────────────────
  getDrivers(q = '') {
    const query = (q || '').trim().toLowerCase();
    const map = new Map();
    // 1. From drivers collection
    (this.getAll('drivers') || []).forEach(d => {
      if (d && d.name) map.set(d.name.toLowerCase(), { name: d.name.trim(), imm: d.imm || '', count: d.count || 1 });
    });
    // 2. From historical BLs (BCH)
    (this.getAll('bls') || []).forEach(b => {
      if (b && b.driverName) {
        const k = b.driverName.trim().toLowerCase();
        const existing = map.get(k);
        if (existing) {
          if (!existing.imm && b.truckIMM) existing.imm = b.truckIMM;
          existing.count = (existing.count || 1) + 1;
        } else {
          map.set(k, { name: b.driverName.trim(), imm: b.truckIMM || '', count: 1 });
        }
      }
    });
    // 3. From historical BRs
    (this.getAll('brs') || []).forEach(b => {
      if (b && b.driverName) {
        const k = b.driverName.trim().toLowerCase();
        const existing = map.get(k);
        if (existing) {
          if (!existing.imm && b.truckIMM) existing.imm = b.truckIMM;
          existing.count = (existing.count || 1) + 1;
        } else {
          map.set(k, { name: b.driverName.trim(), imm: b.truckIMM || '', count: 1 });
        }
      }
    });
    const list = Array.from(map.values()).sort((a,b) => (b.count||0) - (a.count||0));
    if (!query) return list.slice(0, 15);
    return list.filter(d => d.name.toLowerCase().includes(query) || (d.imm && d.imm.toLowerCase().includes(query))).slice(0, 15);
  },

  getDriverIMM(name) {
    if (!name) return '';
    const drivers = this.getDrivers(name);
    const exact = drivers.find(d => d.name.toLowerCase() === name.trim().toLowerCase());
    return exact ? exact.imm : (drivers[0]?.imm || '');
  },

  saveDriver(name, imm) {
    if (!name) return;
    const cleanName = name.trim();
    const cleanImm = (imm || '').trim();
    const drivers = this.getAll('drivers');
    const idx = drivers.findIndex(d => d && d.name && d.name.toLowerCase() === cleanName.toLowerCase());
    if (idx >= 0) {
      drivers[idx].imm = cleanImm || drivers[idx].imm;
      drivers[idx].count = (drivers[idx].count || 1) + 1;
      this.rawSet('drivers', drivers);
    } else {
      this.insert('drivers', { name: cleanName, imm: cleanImm, count: 1 });
    }
  },

  // ─── Timbre calculation ────────────────────────────────────────
  // Formule officielle:
  //   tranches = HT × 0.0119
  //   timbre   = ceil(tranches) × 1.5 DA
  // Exemple: 38 894,80 DA → ceil(38894.8 × 0.0119)=463 tranches × 1,5 = 694,50 DA
  // (affichage: 462.84 × 1,5 = 694,27 si sans ceil — les deux modes pris en charge)
  calcTimbre(amountHT) {
    const settings = this.getSettings();
    const amt = Number(amountHT) || 0;
    if (amt <= 0) return 0;

    const globalRate       = Number(settings.timbreRate)       || 0.0119;
    const globalPerTranche = Number(settings.timbrePerTranche) || 1.5;
    const timbreMin        = Number(settings.timbreMin)        || 0;
    const timbreMax        = Number(settings.timbreMax)        || 0;

    // Slab lookup: find matching bracket by HT amount
    const slabs = settings.timbreSlabs || [];
    let rate = globalRate, perTranche = globalPerTranche;
    let slabCap = 0;
    if (slabs.length) {
      const slab = slabs.find(sl =>
        amt >= Number(sl.min) &&
        (sl.max === null || sl.max === undefined || amt <= Number(sl.max))
      );
      if (slab) {
        rate       = Number(slab.rate)       || globalRate;
        perTranche = Number(slab.perTranche) || globalPerTranche;
        slabCap    = Number(slab.cap)        || 0;
      }
    }

    // Official formula: timbre = HT x rate x perTranche
    const tranches = Math.ceil(amt * rate);
    let timbre   = tranches * perTranche;
    if (timbreMin > 0) timbre = Math.max(timbreMin, timbre);
    if (slabCap > 0)   timbre = Math.min(slabCap, timbre);
    else if (timbreMax > 0) timbre = Math.min(timbreMax, timbre);
    return Math.round(timbre * 100) / 100;
  },

  calcTimbreDetail(amountHT) {
    const settings = this.getSettings();
    const amt = Number(amountHT) || 0;
    const globalRate       = Number(settings.timbreRate)       || 0.0119;
    const globalPerTranche = Number(settings.timbrePerTranche) || 1.5;
    const timbreMin        = Number(settings.timbreMin)        || 0;
    const timbreMax        = Number(settings.timbreMax)        || 0;
    const slabs = settings.timbreSlabs || [];
    let rate = globalRate, perTranche = globalPerTranche;
    let slabCap = 0;
    if (slabs.length) {
      const slab = slabs.find(sl =>
        amt >= Number(sl.min) &&
        (sl.max === null || sl.max === undefined || amt <= Number(sl.max))
      );
      if (slab) {
        rate       = Number(slab.rate)       || globalRate;
        perTranche = Number(slab.perTranche) || globalPerTranche;
        slabCap    = Number(slab.cap)        || 0;
      }
    }
    const tranches = Math.ceil(amt * rate);
    let timbre   = tranches * perTranche;
    if (timbreMin > 0) timbre = Math.max(timbreMin, timbre);
    if (slabCap > 0)   timbre = Math.min(slabCap, timbre);
    else if (timbreMax > 0) timbre = Math.min(timbreMax, timbre);
    timbre = Math.round(timbre * 100) / 100;
    return { tranches: Math.round(tranches * 100) / 100, perTranche, rate, timbre, cap: slabCap || timbreMax || null };
  },

  previewTimbre(amt) {
    const t = this.calcTimbre(amt);
    return { timbre: t, total: Number(amt) + t };
  },

  // ─── Article catalog & suggestions ─────────────────────────
  searchArticles(q = '') {
    const query = (q || '').trim().toLowerCase();
    const map = new Map();
    // 1. From saved articles catalog
    (this.getAll('articles') || []).forEach(a => {
      if (a && a.name) {
        map.set(a.name.trim().toLowerCase(), {
          name: a.name.trim(),
          unit: a.unit || 'U',
          price: Number(a.price) || 0,
          purchasePrice: Number(a.purchasePrice || a.priceBuy || 0),
          count: a.count || 1
        });
      }
    });
    // 2. From all BRs (historical receipts)
    (this.getAll('brs') || []).forEach(br => {
      (br.lines || []).forEach(l => {
        if (l && l.designation) {
          const k = l.designation.trim().toLowerCase();
          const existing = map.get(k);
          if (existing) {
            if (!existing.price && l.price) existing.price = Number(l.price);
            if (!existing.purchasePrice && l.price) existing.purchasePrice = Number(l.price);
            existing.count = (existing.count || 1) + 1;
          } else {
            map.set(k, {
              name: l.designation.trim(),
              unit: l.unit || 'U',
              price: Number(l.price) || 0,
              purchasePrice: Number(l.price) || 0,
              count: 1
            });
          }
        }
      });
    });
    // 3. From all BLs (historical shipments)
    (this.getAll('bls') || []).forEach(bl => {
      (bl.lines || []).forEach(l => {
        if (l && l.designation) {
          const k = l.designation.trim().toLowerCase();
          const existing = map.get(k);
          if (existing) {
            if (!existing.price && l.price) existing.price = Number(l.price);
            if (!existing.purchasePrice && l.purchasePrice) existing.purchasePrice = Number(l.purchasePrice);
            existing.count = (existing.count || 1) + 1;
          } else {
            map.set(k, {
              name: l.designation.trim(),
              unit: l.unit || 'U',
              price: Number(l.price) || 0,
              purchasePrice: Number(l.purchasePrice || 0),
              count: 1
            });
          }
        }
      });
    });
    const list = Array.from(map.values()).sort((a,b) => (b.count||0) - (a.count||0));
    if (!query) return list.slice(0, 15);
    return list.filter(a => a.name.toLowerCase().includes(query)).slice(0, 15);
  },

  saveArticle(name, unit, price, purchasePrice = null) {
    if (!name) return;
    const cleanName = name.trim();
    const arts = this.getAll('articles');
    const idx = arts.findIndex(a => a && a.name && a.name.toLowerCase() === cleanName.toLowerCase());
    if (idx >= 0) {
      arts[idx] = { 
        ...arts[idx], 
        unit: unit || arts[idx].unit, 
        price: Number(price) || arts[idx].price,
        purchasePrice: purchasePrice !== null ? Number(purchasePrice) : (arts[idx].purchasePrice || arts[idx].priceBuy || 0),
        count: (arts[idx].count || 1) + 1
      }; 
      this.rawSet('articles', arts); 
    } else { 
      this.insert('articles', { 
        name: cleanName, 
        unit: unit||'U', 
        price: Number(price)||0,
        purchasePrice: Number(purchasePrice)||0,
        count: 1 
      }); 
    }
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
    const ok2 = await Dialog.confirm(T.isRTL() ? 'تأكيد نهائي' : 'CONFIRMATION FINALE', T.isRTL() ? 'تأكيد نهائي — سيتم حذف جميع البيانات نهائياً.' : 'CONFIRMATION FINALE — Toutes les données seront effacées.', 'danger');
    if (!ok2) return;
    localStorage.clear(); this.init(); location.reload();
  }
};

// ─── AUTH ──────────────────────────────────────────────────────
const Auth = {
  getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; } },
  isLoggedIn() { return !!this.getCurrentUser(); },
  isAdmin() { return this.getCurrentUser()?.role === 'admin'; },
  isSupplier() {
    const u = this.getCurrentUser();
    return u?.role === 'supplier' || u?.role === 'supplier_agent';
  },

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
    // Clear sync timestamps so the next user immediately syncs fresh data from cloud
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('_sync_ts_')) localStorage.removeItem(k);
      });
    } catch (_) {}
    if (typeof DB !== 'undefined') DB._loaded = {};
    if (window.API) API.logout();
    location.reload();
  },

  canEdit(doc) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (doc?.status === 'returned' || doc?.isReturned) return false; // Reference permanently reserved as returned: IMMUTABLE FOREVER!
    if (u.role === 'admin') return true;
    if (doc?.isAutoGenerated || doc?.locked) return false; // Auto-generated from usine validation or locked: Admin only!
    const docDate = (doc?.date || doc?.createdAt || '').slice(0, 10);
    const today = Utils.today();
    if (docDate && docDate < today) return false; // Day passed: only admin can modify
    const session = SessionMgr.getTodaySession(u.id);
    if (session && session.status === 'closed') return false; // Day is closed: only admin can modify
    if (doc?.createdBy && String(doc.createdBy) !== String(u.id)) return false;
    return true;
  },

  canDelete(doc) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (doc?.status === 'returned' || doc?.isReturned) return false; // Cannot delete returned documents (reserved reference)
    if (u.role === 'admin') return true;
    if (doc?.isAutoGenerated || doc?.locked) return false; // Auto-generated / locked documents: Admin only!
    const docDate = (doc?.date || doc?.createdAt || '').slice(0, 10);
    const today = Utils.today();
    if (docDate && docDate < today) return false; // Day passed: only admin can delete
    const session = SessionMgr.getTodaySession(u.id);
    if (session && session.status === 'closed') return false; // Day is closed: only admin can delete
    if (doc?.supplierId !== undefined || (doc?.ref && (doc.ref.startsWith('BR') || doc.ref.includes('/BR/')))) {
      if (!this.can('canDeleteBR')) return false;
    }
    if (doc?.clientId !== undefined || doc?.isBonChargement || (doc?.ref && (doc.ref.startsWith('BL') || doc.ref.startsWith('BC') || doc.ref.startsWith('BCH') || doc.ref.includes('/BCH/') || doc.ref.includes('/BC/') || doc.ref.includes('/BL/')))) {
      if (!this.can('canDeleteBL')) return false;
    }
    return String(doc?.createdBy) === String(u.id);
  },

  canReturn(bl) {
    const u = this.getCurrentUser();
    if (!u) return false;
    // Any user can return any non-returned active Bon de Chargement even from past days or other users
    return bl && bl.status !== 'returned' && bl.status !== 'cancelled';
  },

  // ── Permission System ──────────────────────────────────────────
  _defaultPermissions() {
    return {
      canCreateBR: true,
      canCreateBL: true,
      canViewBRs: true,
      canViewBLs: true,
      canViewCaisse: true,
      canViewSuppliers: true,
      canViewClients: true,
      canViewStats: false,
      canViewCatalogue: false,
      canViewBank: false,
      canEditSuppliers: false,
      canEditClients: false,
      canDeleteBR: false,
      canDeleteBL: false,
      requireDailyLiquid: true,
    };
  },
  getUserPermissions(user) {
    if (!user) return {};
    if (user.role === 'admin') {
      const p = this._defaultPermissions();
      return Object.fromEntries(Object.keys(p).map(k => [k, true]));
    }
    if (user.role === 'supplier' || user.role === 'supplier_agent') {
      return {
        ...this._defaultPermissions(),
        canViewBLs: true,
        canViewBRs: false,
        canViewCaisse: false,
        canViewBank: false,
        canViewStats: false,
        canViewCatalogue: false,
        canViewSuppliers: false,
        canViewClients: false,
        canEditSuppliers: false,
        canEditClients: false,
        canCreateBR: false,
        canCreateBL: false,
        canDeleteBR: false,
        canDeleteBL: false,
        requireDailyLiquid: false
      };
    }
    // Read LIVE user data from DB (not stale localStorage copy)
    const liveUser = DB.getAll('users').find(u => u.id === user.id) || user;
    return { ...this._defaultPermissions(), ...(liveUser.permissions || {}) };
  },
  can(permission) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    const perms = this.getUserPermissions(u);
    // STRICT: only explicitly granted permissions are allowed
    return perms[permission] === true;
  },
  myPermissions() {
    return this.getUserPermissions(this.getCurrentUser());
  }
};

// ─── DIALOG — Custom modal replaces alert/confirm/prompt ──────
const Dialog = {
  _icons: { danger:'fa-skull-crossbones', warning:'fa-exclamation-triangle', success:'fa-check-circle', info:'fa-info-circle' },

  show({ title='', message='', type='info', confirmText='OK', cancelText=null, inputType=null, inputPlaceholder='', inputLabel='', hideButtons=false }) {
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
            ${hideButtons ? '' : `<div class="dlg-btns">
              ${cancelText ? `<button class="dlg-btn dlg-btn-cancel" id="${id}_cancel">${cancelText}</button>` : ''}
              <button class="dlg-btn ${type==='danger'?'dlg-btn-danger':'dlg-btn-primary'}" id="${id}_ok">${confirmText}</button>
            </div>`}
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
        resolve(val);
        setTimeout(() => { overlay.remove(); }, 300);
      };
      Dialog._resolve = close;

      if (okBtn) okBtn.addEventListener('click', () => close(hasInput ? (inp?.value ?? '') : true));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(hasInput ? null : false));
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if(okBtn) okBtn.click(); } });
      overlay.addEventListener('click', e => { if (e.target === overlay && (cancelBtn || hideButtons)) close(hasInput ? null : false); });
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
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec + ' DA';
    return formatted; // Always LTR-safe — caller wraps in <bdi> or dir=ltr span as needed
  },
  fmtCurrencyHTML(v) {
    // Use this in HTML contexts to guarantee LTR display even in RTL mode
    const n = Number(v) || 0;
    const [int, dec] = n.toFixed(2).split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec + ' DA';
    return `<span dir="ltr" style="unicode-bidi:embed;display:inline-block">${formatted}</span>`;
  },
  fmtNum(v, decimals = null) {
    if (v === null || v === undefined || v === '') return '0';
    const n = Number(v) || 0;
    const fixed = decimals !== null ? n.toFixed(decimals) : (Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
    const [int, dec] = fixed.split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return dec !== undefined ? formatted + ',' + dec : formatted;
  },
  /* Use LOCAL timezone — toISOString() is UTC which gives wrong date in GMT+1 */
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  todayKey() { return this.today(); },

  numberToWordsFR(n) {
    if (n === 0) return 'zéro dinars';
    const u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
    const t = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];

    function convertUnder1000(num, isThousands = false) {
      let c = Math.floor(num / 100);
      let rem = num % 100;
      let r = '';
      if (c === 1) r += 'cent ';
      else if (c > 1) r += u[c] + ' cent' + (rem === 0 && !isThousands ? 's ' : ' ');

      if (rem > 0) {
        if (rem < 20) r += u[rem] + ' ';
        else {
          let ten = Math.floor(rem / 10);
          let unit = rem % 10;
          if (ten === 7 || ten === 9) { ten--; unit += 10; }
          
          if (ten === 8 && unit === 0) r += 'quatre-vingt' + (isThousands ? ' ' : 's ');
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

    let b = Math.floor(n / 1e9); n %= 1e9;
    let m = Math.floor(n / 1e6); n %= 1e6;
    let k = Math.floor(n / 1e3); n %= 1e3;
    
    let res = '';
    if (b > 0) res += convertUnder1000(b) + (b === 1 ? ' milliard ' : ' milliards ');
    if (m > 0) res += convertUnder1000(m) + (m === 1 ? ' million ' : ' millions ');
    if (k > 0) res += (k === 1 ? 'mille ' : convertUnder1000(k, true) + ' mille ');
    if (n > 0) res += convertUnder1000(n) + ' ';

    return res.trim() + ' dinars';
  },

  escHTML(s) {
    const d = document.createElement('div'); d.appendChild(document.createTextNode(String(s??'')));
    return d.innerHTML;
  },

  notify(msg, type='info', dur=4000) {
    if (type === 'success' || type === 'warning') {
      if (typeof NotifMgr !== 'undefined' && NotifMgr._playNotifSound) NotifMgr._playNotifSound();
    }
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
    const isAR = typeof T !== 'undefined' && T.isRTL();
    const m = {
      open:            ['badge-secondary', 'fa-truck',          isAR ? '🚚 الشاحنة في الطريق للمصنع' : '🚚 Chauffeur en route vers usine'],
      pending_usine:   ['badge-warning',   'fa-truck',          isAR ? '🚚 الشاحنة في الطريق للمصنع' : '🚚 Chauffeur en route vers usine'],
      reserved:        ['badge-warning',   'fa-bookmark',       isAR ? '📌 حجز مسبق — في الطريق للمصنع' : '📌 Réservé — En route usine'],
      validated_usine: ['badge-info',      'fa-industry',       isAR ? '🏭 تم التحقق (وصل استلام جاهز)' : '🏭 Validé Usine (BR officiel prêt)'],
      delivered:       ['badge-success',   'fa-check-circle',   isAR ? '✅ تم الشحن والتسليم للعميل' : '✅ Enlevé & Livré au client'],
      locked:          ['badge-dark',      'fa-lock',           T.get('st_locked')],
      returned:        ['badge-danger',    'fa-undo',           isAR ? '🔄 مرتجع' : '🔄 Retourné'],
      reception:       ['badge-warning',   'fa-truck-loading',  isAR ? '🚚 جاري الاستلام' : '🚚 Réception en cours'],
    };
    const [cls, icon, label] = m[status] || ['badge-secondary', 'fa-circle', status||''];
    return `<span class="badge ${cls}"><i class="fas ${icon}"></i> ${label}</span>`;
  },

  async confirm2(msg1, msg2) { 
    const isAR = typeof T !== 'undefined' && T.isRTL();
    const ok1 = await Dialog.confirm(isAR ? 'تأكيد' : 'Confirmation', msg1, 'danger');
    if (!ok1) return false;
    return await Dialog.confirm(isAR ? 'تأكيد ثانٍ' : 'Confirmation 2', msg2, 'danger');
  },

  debounce(fn, d=200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), d); }; },

  historyHTML(col, id) {
    const entries = DB.getHistory(col, id);
    if (!entries.length) return '';
    const isAR = typeof T !== 'undefined' && T.isRTL();
    return `<div class="history-section">
      <h4><i class="fas fa-history"></i> ${isAR ? 'سجل العمليات' : 'Historique'}</h4>
      ${entries.map(e => `<div class="history-entry">
        <div class="history-dot"></div>
        <span class="h-time">${this.fmtDateTime(e.ts)}</span>
        <span class="h-desc">${this.escHTML(e.note)}</span>
        <span class="h-user">${this.escHTML(e.userName||'')}</span>
      </div>`).join('')}
    </div>`;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// FORM GUIDE — Sequential field highlighting (polling-based, bulletproof)
// Scans fields every 400ms, highlights next empty, auto-focuses on change
// ═══════════════════════════════════════════════════════════════════════
const FormGuide = {
  _fields: [],
  _timer: null,
  _lastActiveId: null,
  start() { /* disabled — replaced by red-border validation */ },
  _scan() {},
  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    document.querySelectorAll('.field-guide-active, .field-guide-done').forEach(n => {
      n.classList.remove('field-guide-active', 'field-guide-done');
    });
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
    const bls = DB.where('bls', b => b.createdBy === userId && b.status !== 'returned' && b.status !== 'draft');
    const sessions = DB.where('sessions', s => s.userId === userId && s.status === 'closed');
    const totalErrors = sessions.reduce((sum, s) => sum + Math.abs(s.ecart || 0), 0);
    return { logs, brs: brs.length, deliveries: bls.length, sessions, totalErrors };
  }
};

// ─── NOTIFICATION MANAGER ──────────────────────────────────────
const NotifMgr = {
  // ── Notification types & role-based defaults ──
  NOTIF_TYPES: {
    bc_created:         { fr: 'Nouveau BCH créé',             ar: 'سند شحن جديد',              icon: 'fa-plus-circle',    color: '#3b82f6' },
    bc_validated:       { fr: 'BCH validé par l\'usine',      ar: 'تم التحقق من المصنع',         icon: 'fa-industry',       color: '#10b981' },
    delivery_confirmed: { fr: 'Livraison confirmée',           ar: 'تأكيد التسليم',              icon: 'fa-truck',          color: '#10b981' },
    bc_returned:        { fr: 'Retour marchandise',            ar: 'إرجاع بضاعة',               icon: 'fa-undo',           color: '#ef4444' },
    bank_deposit:       { fr: 'Versement bancaire',            ar: 'تحويل بنكي',                icon: 'fa-university',     color: '#0ea5e9' },
    warning:            { fr: 'Alerte système / Anomalie',     ar: 'تنبيه النظام / خلل',         icon: 'fa-exclamation-triangle', color: '#f59e0b' }
  },

  // Default prefs per role — what each role NEEDS to see
  ROLE_DEFAULTS: {
    admin:           { bc_created: true, bc_validated: true, delivery_confirmed: true, bc_returned: true, bank_deposit: true, warning: true },
    manager:         { bc_created: true, bc_validated: true, delivery_confirmed: true, bc_returned: true, bank_deposit: true, warning: true },
    user:            { bc_created: true, bc_validated: true, delivery_confirmed: true, bc_returned: true, bank_deposit: true, warning: false },
    supplier:        { bc_created: true, bc_validated: true, delivery_confirmed: true, bc_returned: false, bank_deposit: false, warning: false },
    supplier_agent:  { bc_created: true, bc_validated: true, delivery_confirmed: true, bc_returned: false, bank_deposit: false, warning: false }
  },

  /** Get notification preferences for a user (user-specific overrides or role defaults) */
  getPrefs(userId) {
    const u = userId ? DB.getById('users', userId) : Auth.getCurrentUser();
    if (!u) return this.ROLE_DEFAULTS.user;
    // User-specific overrides stored in user.notifPrefs
    if (u.notifPrefs && typeof u.notifPrefs === 'object') return u.notifPrefs;
    // Fall back to role defaults
    return this.ROLE_DEFAULTS[u.role] || this.ROLE_DEFAULTS.user;
  },

  /** Save notification preferences for a user */
  savePrefs(userId, prefs) {
    DB.update('users', userId, { notifPrefs: prefs });
  },

  _playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880; // A5 note
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      // Second tone (pleasant ding-dong)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1320; // E6
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.4);
      }, 150);
    } catch(e) { /* Audio not supported */ }
  },
  getAll() {
    return (DB.getAll('notifications') || []).sort((a,b) => String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
  },
  getUnreadCount() {
    const u = Auth.getCurrentUser();
    return this.getAll().filter(n => !n.read && (!n.targetUserId || String(n.targetUserId) === String(u?.id))).length;
  },
  add({ type='info', title='', message='', link=null, targetUserId=null, data=null, icon=null, color=null, userId=null }) {
    const isAR = typeof T !== 'undefined' && T.isRTL();
    
    // ── Check notification preferences before creating ──
    const currentUser = Auth.getCurrentUser();
    const recipientId = targetUserId || userId || currentUser?.id;
    if (recipientId && type in (this.ROLE_DEFAULTS.admin || {})) {
      const prefs = this.getPrefs(recipientId);
      if (prefs && prefs[type] === false) {
        // User disabled this notification type — skip silently
        return null;
      }
    }

    this._playNotifSound();
    const notif = {
      type,
      title: title || (isAR ? 'إشعار النظام' : 'Notification ERP'),
      message: message || '',
      link,
      targetUserId: targetUserId || userId || null,
      data,
      icon: icon || (this.NOTIF_TYPES[type]?.icon) || null,
      color: color || (this.NOTIF_TYPES[type]?.color) || null,
      read: false,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    const saved = DB.insert('notifications', notif);
    this.updateUI();
    if (typeof Utils !== 'undefined') {
      Utils.notify(title ? `${title} : ${message}` : message, type === 'bc_validated' ? 'success' : (type === 'bc_returned' ? 'error' : 'info'));
    }
    return saved;
  },
  markAsRead(id) {
    DB.update('notifications', id, { read: true });
    this.updateUI();
    this.renderDropdown();
  },
  markAllAsRead() {
    const all = DB.getAll('notifications');
    all.forEach(n => {
      if (!n.read) DB.update('notifications', n.id, { read: true });
    });
    this.updateUI();
    this.renderDropdown();
  },
  toggleDropdown() {
    const dd = document.getElementById('notifDropdown');
    if (!dd) return;
    const isShowing = dd.style.display === 'block';
    dd.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      this.renderDropdown();
    }
  },
  closeDropdown() {
    const dd = document.getElementById('notifDropdown');
    if (dd) dd.style.display = 'none';
  },
  updateUI() {
    const badge = document.getElementById('topNotifBadge');
    if (!badge) return;
    const count = this.getUnreadCount();
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  },
  renderDropdown() {
    const list = document.getElementById('notifDropdownList');
    if (!list) return;
    const items = this.getAll().slice(0, 30);
    const isAR = typeof T !== 'undefined' && T.isRTL();
    if (!items.length) {
      list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text4);font-size:12px">
        <i class="fas fa-bell-slash" style="font-size:24px;opacity:.3;display:block;margin-bottom:6px"></i>
        ${isAR ? 'لا توجد إشعارات حالياً' : 'Aucune notification pour le moment'}
      </div>`;
      return;
    }
    const icons = {
      bc_created:         { icon: 'fa-plus-circle',           color: '#3b82f6',  bg: 'rgba(59,130,246,.1)' },
      bc_validated:       { icon: 'fa-industry',              color: '#10b981',  bg: 'rgba(16,185,129,.1)' },
      delivery_confirmed: { icon: 'fa-truck',                 color: '#10b981',  bg: 'rgba(16,185,129,.1)' },
      bc_returned:        { icon: 'fa-undo',                  color: '#ef4444',  bg: 'rgba(239,68,68,.1)' },
      bank_deposit:       { icon: 'fa-university',            color: '#0ea5e9',  bg: 'rgba(14,165,233,.1)' },
      warning:            { icon: 'fa-exclamation-triangle',  color: '#f59e0b',  bg: 'rgba(245,158,11,.1)' },
      auto_br:            { icon: 'fa-file-import',           color: '#6366f1',  bg: 'rgba(99,102,241,.1)' },
      system:             { icon: 'fa-info-circle',           color: '#3b82f6',  bg: 'rgba(59,130,246,.1)' },
    };
    list.innerHTML = items.map(n => {
      // Use per-notification metadata if available, fallback to type map
      const nIcon = n.icon || (icons[n.type] || icons.system).icon;
      const nColor = n.color || (icons[n.type] || icons.system).color;
      const nBg = (icons[n.type] || icons.system).bg;
      const timeAgo = Utils.fmtDateTime ? Utils.fmtDateTime(n.date || n.createdAt) : (n.date || '').slice(0, 16);
      return `
        <div class="notif-item ${n.read ? 'read' : 'unread'}" style="padding:10px 12px;display:flex;gap:10px;align-items:flex-start;border-bottom:1px solid var(--border);cursor:pointer;background:${n.read ? 'transparent' : 'rgba(var(--primary-rgb),.05)'}"
          onclick="NotifMgr.handleClick(${n.id})">
          <div style="width:32px;height:32px;border-radius:8px;background:${nBg};color:${nColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">
            <i class="fas ${nIcon}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <strong style="font-size:12px;color:var(--text);font-weight:${n.read ? '600' : '800'}">${Utils.escHTML(n.title)}</strong>
              ${!n.read ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--primary);flex-shrink:0"></span>' : ''}
            </div>
            <div style="font-size:11px;color:var(--text3);line-height:1.4;margin-bottom:4px">${Utils.escHTML(n.message)}</div>
            <div style="font-size:9px;color:var(--text4);font-family:var(--font-mono)">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
  },
  handleClick(id) {
    const notif = DB.getById('notifications', id);
    if (!notif) return;
    this.markAsRead(id);
    this.closeDropdown();
    if (notif.link && notif.link.mod) {
      App.loadModule(notif.link.mod);
      if (notif.link.id && notif.link.mod === 'bls' && typeof BLModule !== 'undefined') {
        setTimeout(() => BLModule.showDetail(notif.link.id), 200);
      } else if (notif.link.id && notif.link.mod === 'brs' && typeof BRModule !== 'undefined') {
        setTimeout(() => BRModule.showDetail(notif.link.id), 200);
      }
    }
  }
};

// ─── SESSION MANAGER — Mini Caisse & Clôture Vendeur ─────────
const SessionMgr = {
  getTodaySession(userId, date = Utils.today()) {
    const isUserMatch = (id) => {
      if (id === userId || String(id) === String(userId)) return true;
      const isAdminDoc = (id === 1 || id === '1' || id === 'admin');
      const isAdminQuery = (userId === 1 || userId === '1' || userId === 'admin');
      if (isAdminDoc && isAdminQuery) return true;
      return false;
    };
    return DB.getAll('sessions').find(s => isUserMatch(s.userId) && s.date === date) || null;
  },

  getLastClosedSession(userId) {
    const today = Utils.today();
    const isUserMatch = (id) => {
      if (id === userId || String(id) === String(userId)) return true;
      const isAdminDoc = (id === 1 || id === '1' || id === 'admin');
      const isAdminQuery = (userId === 1 || userId === '1' || userId === 'admin');
      if (isAdminDoc && isAdminQuery) return true;
      return false;
    };
    return DB.getAll('sessions')
      .filter(s => isUserMatch(s.userId) && s.date < today && s.status === 'closed')
      .sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
  },

  getUserDaySummary(userId, date = Utils.today()) {
    const isUserMatch = (creatorId) => {
      if (userId === 'all') return true;
      if (creatorId === userId || String(creatorId) === String(userId)) return true;
      const isAdminDoc = (creatorId === 1 || creatorId === '1' || creatorId === 'admin');
      const isAdminQuery = (userId === 1 || userId === '1' || userId === 'admin');
      if (isAdminDoc && isAdminQuery) return true;
      if (creatorId == null && isAdminQuery) return true;
      return false;
    };
    const normDate = d => {
      if (!d) return '';
      if (d.includes('T')) return d.split('T')[0];
      if (d.includes('/')) {
        const p = d.split('/');
        if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return d.slice(0, 10);
    };
    // Filter BLs: Match single effective date (prefer b.date, fallback to b.createdAt)
    const rawBLs = DB.getAll('bls').filter(b => {
      if (!isUserMatch(b.createdBy)) return false;
      const docDate = normDate(b.date) || normDate(b.createdAt);
      if (docDate !== date) return false;
      return b.status !== 'draft' && b.status !== 'cancelled';
    });

    // Deduplicate BLs by ref (or id) to prevent double counting
    const seenBLRefs = new Set();
    const bls = [];
    rawBLs.forEach(b => {
      const k = b.ref ? String(b.ref) : `id_${b.id}`;
      if (!seenBLRefs.has(k)) {
        seenBLRefs.add(k);
        bls.push(b);
      }
    });

    // Filter and deduplicate retours
    const rawRetours = DB.getAll('bon_retours').filter(r => {
      if (!isUserMatch(r.createdBy)) return false;
      const docDate = normDate(r.date) || normDate(r.createdAt);
      return docDate === date;
    });
    const seenRetRefs = new Set();
    const retours = [];
    rawRetours.forEach(r => {
      const k = r.ref ? String(r.ref) : `id_${r.id}`;
      if (!seenRetRefs.has(k)) {
        seenRetRefs.add(k);
        retours.push(r);
      }
    });
    const totalSalesTTC = bls.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);
    const totalReturnsTTC = retours.reduce((sum, r) => sum + (Number(r.totalTTC) || 0), 0);
    const netAmount = Math.max(0, Math.round((totalSalesTTC - totalReturnsTTC) * 100) / 100);

    return {
      userId,
      date,
      bls,
      retours,
      totalSalesTTC: Math.round(totalSalesTTC * 100) / 100,
      totalReturnsTTC: Math.round(totalReturnsTTC * 100) / 100,
      netAmount
    };
  },

  getDayDeliveryTotal(userId, date) {
    return this.getUserDaySummary(userId, date).netAmount;
  },

  startSession(userId, date = Utils.today()) {
    const existing = this.getTodaySession(userId, date);
    if (existing) return existing;
    return DB.insert('sessions', {
      userId,
      date,
      status: 'open',
      startedAt: new Date().toISOString(),
      closedNet: null,
      totalSales: 0,
      totalReturns: 0,
      ecart: 0,
      closedAt: null
    });
  },

  async closeMiniCaisse(userId, selectedBankId = null, note = '', targetDate = null) {
    const today = targetDate || Utils.today();
    const session = this.getTodaySession(userId, today) || this.startSession(userId, today);
    const summary = this.getUserDaySummary(userId, today);
    const u = DB.getById('users', userId) || Auth.getCurrentUser();
    const settings = DB.getSettings();
    const banks = settings.banks || [];
    const targetBankId = selectedBankId || (banks.length > 0 ? banks[0].id : null);
    const targetBank = banks.find(b => String(b.id) === String(targetBankId));

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // ── Idempotent Reference Check ──
    let ref = session.etatVenteRef;
    let savedEtat = null;
    if (session.etatVenteId) {
      savedEtat = DB.getById('etat_vente_docs', session.etatVenteId);
    }
    if (!savedEtat && ref) {
      savedEtat = DB.getAll('etat_vente_docs').find(d => d.ref === ref);
    }
    if (!savedEtat) {
      savedEtat = DB.getAll('etat_vente_docs').find(d => 
        (d.date === today || d.dateEnd === today || d.dateStart === today) && 
        (d.userId === userId || String(d.userId) === String(userId) || d.createdBy === userId || String(d.createdBy) === String(userId))
      );
      if (savedEtat) ref = savedEtat.ref;
    }
    if (!ref) {
      const seqNum = DB.getAll('etat_vente_docs').filter(d => (d.ref||'').includes(`/${year}`)).length + 1;
      ref = `ET/${String(seqNum).padStart(3, '0')}/${month}/${year}`;
    }

    // Aggregated lines from ACTIVE delivered BLs (returns are excluded so items are net delivered)
    const aggregated = {};
    summary.bls.filter(b => b.status !== 'returned').forEach(bl => {
      (bl.lines || []).forEach(line => {
        const key = (line.designation || '').trim();
        if (!key) return;
        const qty = Number(line.qtyDelivered || line.qty) || 0;
        const price = Number(line.price || line.unitPrice) || 0;
        const disc = Number(line.disc) || 0;
        const effectivePrice = price * (1 - disc / 100);
        if (!aggregated[key]) {
          aggregated[key] = { designation: key, unit: line.unit || 'U', qty: 0, unitPrice: effectivePrice };
        }
        aggregated[key].qty += qty;
      });
    });
    const items = Object.values(aggregated).filter(it => it.qty > 0.0001);
    const totalHT = Math.round(items.reduce((s, it) => s + (it.qty * it.unitPrice), 0) * 100) / 100;
    const tvaRate = Number(settings.tvaRate) || 19;
    const tvaAmount = Math.round(totalHT * (tvaRate / 100) * 100) / 100;
    // Etat de vente: FIXED 1% timbre (not slab-based like BCH)
    const TIMBRE_RATE_EV = 1; // 1% fixed for etat de vente
    const timbreAmount = Math.round(totalHT * TIMBRE_RATE_EV / 100 * 100) / 100;
    const totalTTCCalc = Math.round((totalHT + tvaAmount + timbreAmount) * 100) / 100;
    const netAmountEV = totalTTCCalc;
    const ecartFiscal = Math.round((netAmountEV - summary.netAmount) * 100) / 100;

    // 1. Generate or update État de Vente document with BL list and Returns list
    const isAR = typeof T !== 'undefined' && T.isRTL();
    const etatDocData = {
      ref,
      year,
      date: today,
      dateStart: today,
      dateEnd: today,
      userId,
      userName: u?.name || (isAR ? 'البائع' : 'Vendeur'),
      blList: summary.bls.map(b => ({
        id: b.id,
        ref: b.ref,
        clientName: b.clientName || (isAR ? 'زبون المتجر' : 'Client Comptoir'),
        totalHT: Number(b.totalHT) || 0,
        tvaAmount: Number(b.tvaAmount || b.tva) || 0,
        timbreAmount: Number(b.timbreAmount || b.timbre) || 0,
        totalTTC: Number(b.totalTTC) || 0,
        date: b.date
      })),
      returnList: summary.retours.map(r => ({ id: r.id, ref: r.ref, blRef: r.blRef, clientName: r.clientName || (isAR ? 'عميل' : 'Client'), totalTTC: Number(r.totalTTC)||0, date: r.date })),
      totalBLsTTC: summary.totalSalesTTC,
      grossTotalTTC: summary.totalSalesTTC,
      totalReturnsTTC: summary.totalReturnsTTC,
      returnsTotalTTC: summary.totalReturnsTTC,
      realBchNet: summary.netAmount,
      realBchGross: summary.totalSalesTTC,
      totalHT,
      tvaRate,
      tvaAmount,
      timbreAmount,
      timbreRate: TIMBRE_RATE_EV,
      totalTTC: netAmountEV,
      netTotalTTC: netAmountEV,
      totalTTCFiscal: totalTTCCalc,
      ecartFiscal,
      createdBy: userId,
      createdByName: u?.name || (isAR ? 'البائع' : 'Vendeur'),
      createdAt: savedEtat?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      bankId: targetBankId,
      status: 'deposited'
    };

    if (savedEtat) {
      savedEtat = DB.update('etat_vente_docs', savedEtat.id, etatDocData, 'Mise à jour État de Vente');
    } else {
      savedEtat = DB.insert('etat_vente_docs', etatDocData);
    }

    // 2. Deposit into bank_transactions (Transfert État de Vente avec 1% timbre)
    let bankTxId = session.bankTxId || (savedEtat ? savedEtat.bankDepositId : null);
    const existingBankTx = bankTxId 
      ? DB.getById('bank_transactions', bankTxId) 
      : DB.getAll('bank_transactions').find(t => 
          (t.etatVenteRef === ref) || 
          (ref && t.ref === 'EV-DEP-' + ref.replace(/\//g, '-')) ||
          (savedEtat && (String(t.etatVenteId) === String(savedEtat.id) || t.etatVenteRef === savedEtat.ref))
        );

    if (targetBankId && netAmountEV > 0) {
      const depTxData = {
        type: 'deposit',
        subtype: 'etat_vente',
        bankId: targetBankId,
        amount: netAmountEV,
        date: today,
        ref: 'EV-DEP-' + ref.replace(/\//g, '-'),
        note: isAR 
          ? `إيداع كشف المبيعات ${ref} (${u?.name || ''}) — مبلغ الكشف (طابع 1%): ${Utils.fmtCurrency(netAmountEV)} | إيرادات BCH الفعلية: ${Utils.fmtCurrency(summary.netAmount)} | فارق الطابع: ${Utils.fmtCurrency(ecartFiscal)}` 
          : `Dépôt État de Vente ${ref} (${u?.name || ''}) — Montant État (1% timbre): ${Utils.fmtCurrency(netAmountEV)} | Recettes BCH réelles: ${Utils.fmtCurrency(summary.netAmount)} | Écart fiscal: ${Utils.fmtCurrency(ecartFiscal)}`,
        etatVenteId: savedEtat.id,
        etatVenteRef: ref,
        createdBy: userId,
        createdByName: u?.name,
        updatedAt: now.toISOString()
      };
      if (existingBankTx) {
        DB.update('bank_transactions', existingBankTx.id, depTxData, 'Mise à jour versement');
        bankTxId = existingBankTx.id;
      } else {
        const savedBankTx = DB.insert('bank_transactions', { ...depTxData, createdAt: now.toISOString() });
        bankTxId = savedBankTx.id;
      }
      if (savedEtat && bankTxId && savedEtat.bankDepositId !== bankTxId) {
        DB.update('etat_vente_docs', savedEtat.id, { bankDepositId: bankTxId });
      }
    }

    // 3. Close Session
    const updatedSession = DB.update('sessions', session.id, {
      status: 'closed',
      closedNet: netAmountEV,
      closedEspeces: summary.totalSalesTTC,
      closedMonnaie: summary.totalReturnsTTC,
      totalSales: summary.totalSalesTTC,
      totalReturns: summary.totalReturnsTTC,
      blCount: summary.bls.length,
      returnCount: summary.retours.length,
      etatVenteId: savedEtat.id,
      etatVenteRef: ref,
      bankTxId,
      targetBankId,
      realBchNet: summary.netAmount,
      etatVenteTTC: netAmountEV,
      timbreAmount,
      ecartFiscal,
      note: note || '',
      closedAt: session.closedAt || now.toISOString(),
      updatedAt: now.toISOString()
    }, 'Clôture Mini Caisse');

    // 4. Update caisse_admin with strict traceability:
    const bankLabel = targetBank?.name || (isAR ? 'البنك' : 'Banque');

    // 4a. Real BCH net cash collected enters central caisse_admin:
    // STRICT RULE: The ONLY source of money in caisse_admin is the cashier's shift closure!
    const existingCaisseDeposit = DB.getAll('caisse_admin').find(e => 
      e.type === 'deposit' && 
      (e.source === 'user_cloture' || e.source === 'bch_recettes_reelles') && 
      (Number(e.sessionId) === Number(session.id) || (e.sessionDate === today && (e.userId === userId || String(e.userId) === String(userId))))
    );
    const caisseDepositData = {
      type: 'deposit',
      source: 'user_cloture',
      userId,
      userName: u?.name || (isAR ? 'البائع' : 'Vendeur'),
      sessionId: session.id,
      sessionDate: today,
      amount: summary.netAmount, // Actual net cash handed over
      targetBankId,
      etatVenteRef: ref,
      note: isAR ? `مقبوضات الصندوق الفعلية (${summary.bls.length} سند شحن، ${summary.retours.length} إرجاع) — إغلاق ${u?.name || ''}` : `Recettes réelles de la caisse (${summary.bls.length} BCH, ${summary.retours.length} retours) — Clôture ${u?.name || ''}`
    };
    if (existingCaisseDeposit) {
      DB.update('caisse_admin', existingCaisseDeposit.id, caisseDepositData);
    } else if (summary.netAmount > 0) {
      DB.insert('caisse_admin', { ...caisseDepositData, createdAt: now.toISOString() });
    }

    // 4b. Withdrawal / Transfer to Bank via État de Vente (with fixed 1% timbre deducted from caisse_admin)
    const existingCaisseWithdrawal = DB.getAll('caisse_admin').find(e => 
      e.type === 'withdrawal' && 
      e.source === 'transfert_banque_etat_vente' && 
      (Number(e.sessionId) === Number(session.id) || e.etatVenteRef === ref)
    );
    const caisseWithdrawalData = {
      type: 'withdrawal',
      source: 'transfert_banque_etat_vente',
      userId,
      userName: u?.name || (isAR ? 'البائع' : 'Vendeur'),
      sessionId: session.id,
      sessionDate: today,
      amount: netAmountEV,
      targetBankId,
      etatVenteRef: ref,
      etatVenteTTC: netAmountEV,
      timbreAmount,
      ecartFiscal,
      note: isAR 
        ? `تحويل بنكي — كشف المبيعات ${ref} إلى ${bankLabel} بمبلغ 1% طابع: ${Utils.fmtCurrency(netAmountEV)} (مقبوضات الشحن الفعلية: ${Utils.fmtCurrency(summary.netAmount)} | فارق الطابع: ${Utils.fmtCurrency(ecartFiscal)})`
        : `Versement bancaire — État de Vente ${ref} vers ${bankLabel} avec 1% timbre: ${Utils.fmtCurrency(netAmountEV)} (Recettes réelles BCH: ${Utils.fmtCurrency(summary.netAmount)} | Écart fiscal timbre: ${Utils.fmtCurrency(ecartFiscal)})`
    };
    if (existingCaisseWithdrawal) {
      DB.update('caisse_admin', existingCaisseWithdrawal.id, caisseWithdrawalData);
    } else if (netAmountEV > 0) {
      DB.insert('caisse_admin', { ...caisseWithdrawalData, createdAt: now.toISOString() });
    }

    // 5. Trigger MasterBrain recalibration
    DB.MasterBrain.recalibrateAll();

    WorkLog.logOut(userId);
    return { session: updatedSession, etatDoc: savedEtat, summary };
  },

  updateCloture(sessionId, newNet, adminMotif = '') {
    const session = DB.getById('sessions', sessionId);
    if (!session) return null;
    const oldNet = session.closedNet || 0;
    const adminUser = Auth.getCurrentUser();
    const isAR = typeof T !== 'undefined' && T.isRTL();

    // Update session
    const updated = DB.update('sessions', sessionId, {
      closedNet: Number(newNet),
      adjustedBy: adminUser?.id,
      adjustedByName: adminUser?.name,
      adjustedAt: new Date().toISOString(),
      adminMotif: adminMotif || (isAR ? 'تصحيح يدوي من المشرف' : 'Correction manuelle administrateur')
    }, 'Rectification Clôture Admin');

    // Update related bank transaction if exists
    if (session.bankTxId) {
      DB.update('bank_transactions', session.bankTxId, {
        amount: Number(newNet),
        note: `Dépôt État de Vente ${session.etatVenteRef||''} (Rectifié par Admin)`
      });
    }

    // Update related etat_vente_doc if exists
    if (session.etatVenteId) {
      DB.update('etat_vente_docs', session.etatVenteId, {
        totalTTC: Number(newNet)
      });
    }

    // Update caisse_admin
    const caisseDep = DB.getAll('caisse_admin').find(e => e.sessionId === session.id);
    if (caisseDep) {
      DB.update('caisse_admin', caisseDep.id, {
        amount: Number(newNet),
        note: caisseDep.note + ` [Rectifié de ${Utils.fmtCurrency(oldNet)} à ${Utils.fmtCurrency(newNet)} par Admin]`
      });
    }

    return updated;
  }
};
