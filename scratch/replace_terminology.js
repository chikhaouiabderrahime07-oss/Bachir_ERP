const fs = require('fs');
let code = fs.readFileSync('modules.js', 'utf8');

const replacements = [
  ['Ce bon de livraison a été retourné', 'Ce bon de chargement a été retourné'],
  ['تم إرجاع سند التسليم هذا وأرشفته', 'تم إرجاع سند الشحن هذا وأرشفته'],
  ['Ce Bon de Livraison est définitivement archivé', 'Ce Bon de Chargement est définitivement archivé'],
  ['سند التسليم هذا مؤرشف نهائياً كـ مرتجع', 'سند الشحن هذا مؤرشف نهائياً كـ مرتجع'],
  ['Ce bon de livraison a déjà été retourné', 'Ce bon de chargement a déjà été retourné'],
  ['تم إرجاع سند التسليم هذا مسبقاً', 'تم إرجاع سند الشحن هذا مسبقاً'],
  ["Aucun bon de livraison validé aujourd'hui", "Aucun bon de chargement aujourd'hui"],
  ['لا توجد وصولات تسليم اليوم', 'لا توجد وصولات شحن اليوم'],
  ['Bons de Livraison Inclus', 'Bons de Chargement Inclus (BCH)'],
  ['سندات التسليم المشمولة', 'سندات الشحن المشمولة'],
  ["II. Bons de Livraison Inclus dans l'État", "II. Bons de Chargement Inclus dans l'État"],
  ['ثانياً: سندات التسليم المدرجة في الكشف', 'ثانياً: سندات الشحن المدرجة في الكشف'],
  ['Aucun bon de livraison pour cette sélection', 'Aucun bon de chargement pour cette sélection'],
  ['لا يوجد أي سند تسليم ضمن هذا التحديد', 'لا يوجد أي سند شحن ضمن هذا التحديد'],
  ['Aucun bon de livraison ni retour', 'Aucun bon de chargement ni retour'],
  ['لا توجد سندات تسليم أو مرتجعات', 'لا توجد سندات شحن أو مرتجعات'],
  ['<option value="bls" ${collection===\'bls\'?\'selected\':\'\'}>Bons de Livraison</option>', '<option value="bls" ${collection===\'bls\'?\'selected\':\'\'}>Bons de Chargement (BCH)</option>'],
  ['ce client a des BL liés', 'ce client a des BCH liés'],
  ['هذا الزبون لديه وصولات تسليم مرتبطة', 'هذا الزبون لديه وصولات شحن مرتبطة']
];

let replaced = 0;
for (const [from, to] of replacements) {
  if (code.includes(from)) {
    code = code.split(from).join(to);
    replaced++;
  }
}
fs.writeFileSync('modules.js', code);
console.log('Successfully replaced', replaced, 'terminology instances in modules.js');
