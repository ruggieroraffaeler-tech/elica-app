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

const errors = [], ids = new Set(), heavy = [];
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
        case 'code': {
          if (l.kind !== 'sfida') err(w, 'gli esercizi di codice vanno in una lezione kind: "sfida"');
          if (!e.q || typeof e.starter !== 'string' || !e.solution) err(w, 'servono q, starter e solution');
          if (!Array.isArray(e.hints) || !e.hints.length) err(w, 'servono dei suggerimenti (hints)');
          if (e.mode === 'func') {
            if (!e.func) err(w, 'manca func');
            if (!(e.tests || []).length || e.tests.some(t => !t.call || (t.expect === undefined && !t.raises))) err(w, 'ogni test serve call e expect (o raises)');
          } else if (e.mode === 'io') {
            if (!(e.tests || []).length || e.tests.some(t => typeof t.out !== 'string')) err(w, 'ogni test serve out');
          } else if (e.mode === 'tests') {
            if (!e.module || !e.impl || !(e.mutants || []).length || e.mutants.some(m => !m.desc || !m.code)) err(w, 'servono module, impl e mutants con desc e code');
          } else err(w, 'mode deve essere func, io o tests');
          heavy.push({ where: w, ex: e });
          break;
        }
        case 'task':
          if (l.kind !== 'sfida') err(w, 'le missioni vanno in una lezione kind: "sfida"');
          if (!e.q || !Array.isArray(e.ans) || !e.ans.length || !e.solution) err(w, 'servono q, ans (lista) e solution');
          break;
        default: err(w, 'tipo sconosciuto');
      }
    });
    if (l.kind === 'sfida' && !l.ex.some(e => e.t === 'code' || e.t === 'task')) err(l.id, 'una sfida deve contenere almeno un esercizio code o task');
  }
  if (c.req && !ids.has(c.req.lesson) && !ctx.ELICA.courses.some(x => x.units.some(u => u.lessons.some(l => l.id === c.req.lesson)))) err(c.id, `req punta a una lezione inesistente: ${c.req.lesson}`);
}
console.log(`${ctx.ELICA.courses.length} corsi, ${lessons} lezioni, ${exercises} esercizi`);
// Sfide di codice: con Python 3 installato, esegue il correttore vero (tools/harness.py) su
// soluzione e codice iniziale. La soluzione deve superare tutto, il codice iniziale no.
const { spawnSync } = require('child_process');
if (heavy.length && !process.argv.includes('--no-python')) {
  const py = spawnSync('python3', ['-I', path.join(__dirname, 'check_sfide.py'), path.join(__dirname, 'harness.py')],
    { input: JSON.stringify(heavy), encoding: 'utf8', timeout: 120000 });
  if (py.error || py.status === null) console.log('(Python 3 non disponibile: sfide non eseguite)');
  else {
    const res = JSON.parse(py.stdout || '[]');
    res.forEach(r => r.problems.forEach(p => err(r.where, p)));
    console.log(`${res.length} sfide di codice eseguite con il correttore${py.stderr ? '\n' + py.stderr : ''}`);
  }
}
if (errors.length) { console.log('\nProblemi trovati:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Tutto a posto.');
