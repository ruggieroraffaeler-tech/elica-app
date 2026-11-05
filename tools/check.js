#!/usr/bin/env node
/* Controlla i contenuti prima di pubblicarli.
   Uso:  node tools/check.js
   Verifica: id univoci, campi obbligatori di ogni tipo di esercizio,
   blank (___) coerenti con le risposte, risposte presenti tra le opzioni. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core.js'), 'utf8'), ctx);
ctx.ELICA = ctx.window.ELICA;
const files = fs.readdirSync(path.join(root, 'content')).filter(f => f.endsWith('.js')).sort();
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, 'content', f), 'utf8'), ctx, { filename: f });

const errors = [], ids = new Set();
let lessons = 0, exercises = 0;
const err = (where, msg) => errors.push(`${where}: ${msg}`);
for (const c of ctx.ELICA.courses) {
  if (!c.id || !c.name || !Array.isArray(c.units)) err(c.id || '?', 'corso senza id, name o units');
  for (const u of c.units) for (const l of u.lessons) {
    lessons++;
    if (ids.has(l.id)) err(l.id, 'id lezione duplicato'); ids.add(l.id);
    if (!l.title || !Array.isArray(l.ex) || !l.ex.length) err(l.id, 'lezione senza titolo o esercizi');
    l.ex.forEach((e, i) => {
      exercises++;
      const w = `${l.id} #${i + 1} (${e.t})`;
      if (e.t !== 'info' && !e.why) err(w, 'manca la spiegazione "why"');
      switch (e.t) {
        case 'info': if (!e.title || !e.text) err(w, 'servono title e text'); break;
        case 'mc': if (!e.q || !Array.isArray(e.opts) || !(e.a >= 0 && e.a < e.opts.length)) err(w, 'servono q, opts e un indice a valido'); break;
        case 'fill': {
          const n = (e.code || '').split('___').length - 1;
          if (n !== (e.ans || []).length) err(w, `${n} spazi ___ ma ${(e.ans || []).length} risposte`);
          (e.ans || []).forEach(a => { if (!(e.bank || []).includes(a)) err(w, `la risposta "${a}" non è nel bank`); });
          break;
        }
        case 'order': if (!Array.isArray(e.lines) || e.lines.length < 2) err(w, 'servono almeno 2 righe'); break;
        case 'type': if (!Array.isArray(e.ans) || !e.ans.length) err(w, 'ans deve essere una lista'); break;
        case 'bug': if (!Array.isArray(e.lines) || !(e.bad >= 0 && e.bad < e.lines.length)) err(w, 'servono lines e un indice bad valido'); break;
        default: err(w, 'tipo sconosciuto');
      }
    });
  }
  if (c.req && !ids.has(c.req.lesson) && !ctx.ELICA.courses.some(x => x.units.some(u => u.lessons.some(l => l.id === c.req.lesson)))) err(c.id, `req punta a una lezione inesistente: ${c.req.lesson}`);
}
console.log(`${ctx.ELICA.courses.length} corsi, ${lessons} lezioni, ${exercises} esercizi`);
if (errors.length) { console.log('\nProblemi trovati:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Tutto a posto.');
