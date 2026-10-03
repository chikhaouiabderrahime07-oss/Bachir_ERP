const fs = require('fs');
let c = fs.readFileSync('modules.js', 'utf8');
// Fix the broken line - replace the French string with double-quoted version
const bad = `\'"En cours — Chauffeur en route vers l'usine"`;
const good = `"En cours \\u2014 Chauffeur en route vers l\\u0027usine"`;
c = c.replace(bad, good);
fs.writeFileSync('modules.js', c, 'utf8');
console.log('Fixed');
