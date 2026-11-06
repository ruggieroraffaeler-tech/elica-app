/* Elica — motore dell'app.
   Stato e salvataggi, percorso, sessione del giorno, lezioni, ripasso,
   Lab Python, profilo, backup e sincronizzazione con GitHub Gist.
   I contenuti stanno in content/*.js: qui non serve toccare nulla per aggiungere lezioni. */
(function () {
'use strict';

const E = window.ELICA;
const COURSES = E.courses.slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const APP_VERSION = E.APP_VERSION || '0.0.0';
const CHANGELOG = E.CHANGELOG || [];
const PORTABLE = !!E.PORTABLE;

/* ---------- utilità ---------- */
const $ = s => document.querySelector(s);
const escH = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => escH(s).replace(/"/g, '&quot;');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick1 = a => a[Math.floor(Math.random() * a.length)];
const norm = x => String(x).replace(/\s+/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const vcmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const buzz = () => { try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} };
const RX = /(#[^\n]*)|("[^"\n]*"|'[^'\n]*')|\b(def|return|for|in|if|elif|else|while|import|from|as|True|False|None|TRUE|FALSE|and|or|not|class|try|except|raise|pass|with|match|case|break|continue|assert|lambda|self|library|function|print|len|range|do|done|then|fi|git|grep|cut|sort|uniq|head|tail|cd|ls|pwd|wc|echo|awk|sed|zcat|samtools|bwa|diamond|tblastn|makeblastdb|datasets|conda|mkdir|unzip)\b|\b(\d+(?:\.\d+)?)\b/g;
const hl = code => escH(code).replace(RX, (m, c, s, k, n) => c ? `<span class="c">${c}</span>` : s ? `<span class="s1">${s}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`);

/* ---------- icone ---------- */
const I = {
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.2 3 5 4.6 7.2A7 7 0 1 1 6 10.5c.9 1.3 2 2 3 2.1C8.6 8.6 10 4.6 12 2z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4 14h7l-1.5 8L19 10h-7z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.2-8-11.2A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.8C20 15.8 12 21 12 21z"/></svg>',
  path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="5" r="2.2"/><circle cx="18" cy="12" r="2.2"/><circle cx="6" cy="19" r="2.2"/><path d="M8 6.2 16 10.8M16 13.2 8 17.8"/></svg>',
  lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 19a1.4 1.4 0 0 0 1.2 2h12.6a1.4 1.4 0 0 0 1.2-2L14 9V3"/><path d="M7 15h10"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 3.5v5h5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  helix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"/><path d="M9 5.5h6M9 18.5h6" stroke-width="1.5"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/></svg>'
};

/* ---------- indice dei contenuti ----------
   Ogni esercizio riceve una chiave stabile (id lezione + impronta del contenuto),
   così errori e ripassi restano validi anche se in futuro si aggiungono esercizi. */
const LIDX = {}, XIDX = {};
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
COURSES.forEach(c => c.units.forEach(u => u.lessons.forEach(l => {
  LIDX[l.id] = { c, u, l };
  l.ex.forEach((ex, i) => {
    let k = l.id + ':' + hash(JSON.stringify([ex.t, ex.q || ex.title || '', ex.code || '', ex.lines || ex.opts || '']));
    if (XIDX[k]) k += '.' + i;
    ex.k = k; XIDX[k] = { c, l, ex, i };
  });
})));
const allLessons = c => c ? c.units.flatMap(u => u.lessons) : [];
const course = id => COURSES.find(c => c.id === id);
const isQ = ex => ex.t !== 'info';
const courseDone = id => { const c = course(id); return !!c && allLessons(c).every(l => S.done[l.id]); };

/* ---------- stato ---------- */
const DEV = (() => { try { let d = localStorage.getItem('elica-device'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('elica-device', d); } return d; } catch (e) { return 'local'; } })();
const KEY = 'elica-v1', SYNC_KEY = 'elica-sync', SCHEMA = 3, HMAX = 5, HREGEN = 20 * 60 * 1000;
const SRS = [1, 2, 4, 8, 16, 32, 64], GOALS = [10, 20, 30, 50];
const dayNum = (t = Date.now()) => { const d = new Date(t); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5); };
const today = () => dayNum();
const legacyDay = s => { if (typeof s === 'number') return s; const m = String(s || '').match(/^(\d+)-(\d+)-(\d+)$/); return m ? dayNum(new Date(+m[1], +m[2] - 1, +m[3]).getTime()) : 0; };
const fresh = () => ({ v: SCHEMA, xp: 0, hearts: HMAX, hTs: Date.now(), streak: 0, last: 0, day: 0, dayXp: 0, xpd: {}, goal: 20, sessLen: 'short', course: COURSES[0].id, tab: 'path', done: {}, badges: [], err: {}, clr: {}, srs: {}, tried: [], seen: APP_VERSION, sessions: {}, peek: {}, created: Date.now(), upd: Date.now() });

function migrate(o) {
  if (!o || typeof o !== 'object') return fresh();
  const s = Object.assign(fresh(), o);
  if (!o.v || o.v < 3) {               // v1/v2: errori salvati come "lezione#indice"
    const err = {};
    Object.entries(o.err || {}).forEach(([k, v]) => {
      const m = k.match(/^(.+)#(\d+)$/);
      const ex = m && LIDX[m[1]] && LIDX[m[1]].l.ex[+m[2]];
      if (ex) err[ex.k] = v; else if (XIDX[k]) err[k] = v;
    });
    s.err = err; s.last = legacyDay(o.last); s.day = legacyDay(o.day);
    s.seen = o.xp ? '' : APP_VERSION; s.goal = o.goal || 30;
  }
  ['done', 'err', 'clr', 'srs', 'sessions', 'peek', 'xpd'].forEach(k => { if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {}; });
  ['badges', 'tried'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  // XP come somma dei contatori di ogni dispositivo: così la sincronizzazione non perde punti
  if (!Object.keys(s.xpd).length && s.xp) s.xpd[DEV] = s.xp;
  s.xp = Object.values(s.xpd).reduce((a, b) => a + b, 0);
  if (!course(s.course)) s.course = COURSES[0].id;
  if (!['path', 'rev', 'lab', 'me'].includes(s.tab)) s.tab = 'path';
  if (!['short', 'long'].includes(s.sessLen)) s.sessLen = 'short';
  s.v = SCHEMA;
  return s;
}
let S;
try { S = migrate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { S = fresh(); }
function save(touch = true) { if (touch) S.upd = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
save(false);

function tick() {
  if (S.hearts >= HMAX) { S.hTs = Date.now(); return; }
  const n = Math.floor((Date.now() - S.hTs) / HREGEN);
  if (n > 0) { S.hearts = Math.min(HMAX, S.hearts + n); S.hTs += n * HREGEN; if (S.hearts >= HMAX) S.hTs = Date.now(); save(); }
}
const streakNow = () => (S.last === today() || S.last === today() - 1) ? S.streak : 0;
const dayXp = () => S.day === today() ? S.dayXp : 0;
function addXp(n) { if (S.day !== today()) { S.day = today(); S.dayXp = 0; } S.dayXp += n; S.xpd[DEV] = (S.xpd[DEV] || 0) + n; S.xp = Object.values(S.xpd).reduce((a, b) => a + b, 0); }
function bumpStreak() { if (S.last !== today()) { S.streak = S.last === today() - 1 ? S.streak + 1 : 1; S.last = today(); } }
const locked = c => !!(c && c.req && !S.done[c.req.lesson] && !S.peek[c.id]);
const nextLesson = c => allLessons(c).find(l => !S.done[l.id]);

/* errori e ripasso programmato */
function errItems() {
  return Object.entries(S.err).map(([k, v]) => XIDX[k] ? { k, n: v.n, ts: v.ts, ...XIDX[k] } : null).filter(Boolean)
    .sort((a, b) => b.n - a.n || a.ts - b.ts);
}
const errCount = () => errItems().length;
function noteErr(k) { const v = S.err[k] || { n: 0, ts: Date.now() }; v.n++; v.ts = Date.now(); S.err[k] = v; }
function clearErr(k) { if (S.err[k]) { delete S.err[k]; S.clr[k] = Date.now(); return true; } return false; }
function srsHit(k) { const v = S.srs[k] || { b: -1 }; v.b = Math.min(v.b + 1, SRS.length - 1); v.due = today() + SRS[v.b]; v.t = Date.now(); S.srs[k] = v; }
function srsMiss(k) { S.srs[k] = { b: 0, due: today() + 1, t: Date.now() }; }
const dueKeys = () => Object.entries(S.srs).filter(([k, v]) => XIDX[k] && v.due <= today() && !S.err[k])
  .sort((a, b) => a[1].due - b[1].due || a[1].b - b[1].b).map(([k]) => k);
const dueSoon = () => Object.entries(S.srs).filter(([k, v]) => XIDX[k] && v.due > today() && v.due <= today() + 7).length;

/* ---------- traguardi ---------- */
const BADGES = [
  { id: 'first', ic: '01', name: 'Prima lezione' },
  { id: 'daily', ic: 'D1', name: 'Prima sessione del giorno' },
  { id: 'perfect', ic: '100', name: 'Lezione senza errori' },
  { id: 'streak3', ic: '3d', name: '3 giorni di fila' },
  { id: 'streak7', ic: '7d', name: '7 giorni di fila' },
  { id: 'streak30', ic: '30d', name: '30 giorni di fila' },
  { id: 'daily7', ic: 'D7', name: '7 sessioni completate' },
  { id: 'xp500', ic: '500', name: '500 XP' },
  { id: 'xp2000', ic: '2k', name: '2000 XP' },
  { id: 'gym', ic: 'if', name: 'Palestra completata' },
  { id: 'cs50', ic: 'P', name: '10 settimane CS50P' },
  { id: 'bio', ic: 'ATG', name: 'Python × Bio completato' },
  { id: 'git', ic: 'git', name: 'Git completato' },
  { id: 'unlock', ic: 'go', name: 'Progetto sbloccato' },
  { id: 'proj', ic: 'v1', name: 'Pipeline completata' },
  { id: 'poly', ic: '4', name: 'Python, R, Bash e Git provati' },
  { id: 'lab', ic: '>_', name: 'Codice eseguito nel Lab' },
  { id: 'review', ic: '↺', name: 'Primo ripasso errori' },
  { id: 'clean', ic: '0', name: 'Nessun errore da ripassare' },
  { id: 'sync', ic: 'gh', name: 'Sincronizzato con GitHub' },
  { id: 'all', ic: '∞', name: 'Tutti i corsi completati' }
];
function award(ctx = {}) {
  const nb = [], add = id => { if (!S.badges.includes(id)) { S.badges.push(id); const b = BADGES.find(x => x.id === id); if (b) nb.push(b); } };
  if (Object.keys(S.done).length) add('first');
  if (ctx.perfect) add('perfect');
  if (ctx.session) add('daily');
  if (Object.values(S.sessions).reduce((a, b) => a + b, 0) >= 7) add('daily7');
  if (S.streak >= 3) add('streak3'); if (S.streak >= 7) add('streak7'); if (S.streak >= 30) add('streak30');
  if (S.xp >= 500) add('xp500'); if (S.xp >= 2000) add('xp2000');
  if (courseDone('gym')) add('gym'); if (courseDone('py')) add('cs50'); if (courseDone('bio')) add('bio');
  if (courseDone('git')) add('git'); if (courseDone('proj')) add('proj');
  if (S.done.p6b) add('unlock');
  if (['py', 'r', 'sh', 'git'].every(id => allLessons(course(id)).some(l => S.done[l.id]))) add('poly');
  if (COURSES.every(c => courseDone(c.id))) add('all');
  if (S.tried.includes('lab')) add('lab');
  if (S.tried.includes('sync')) add('sync');
  if (ctx.review) add('review');
  if (S.badges.includes('review') && errCount() === 0) add('clean');
  return nb;
}

/* ---------- sessione del giorno ---------- */
function sessionPlan() {
  const long = S.sessLen === 'long';
  const errs = errItems().slice(0, long ? 4 : 3).map(e => e.k);
  const due = dueKeys().filter(k => !errs.includes(k)).slice(0, long ? 5 : 3);
  let c = course(S.course);
  if (!c || locked(c) || !nextLesson(c)) c = COURSES.find(x => !locked(x) && nextLesson(x));
  const nl = c ? nextLesson(c) : null;
  let extra = [];
  if (!nl) {
    const pool = [];
    COURSES.forEach(cc => allLessons(cc).forEach(l => { if (S.done[l.id]) l.ex.forEach(ex => { if (isQ(ex) && !errs.includes(ex.k) && !due.includes(ex.k)) pool.push(ex.k); }); }));
    extra = shuffle(pool).slice(0, long ? 10 : 7);
  }
  const n = errs.length + due.length + extra.length + (nl ? nl.ex.length : 0);
  return { errs, due, c, nl, extra, mins: Math.max(5, Math.round(n * 0.8) + 1) };
}

/* ---------- pagine ---------- */
function statsHTML() {
  tick(); const st = streakNow();
  return `<div class="stats"><span class="stat ${st ? '' : 'off'}" title="Giorni di fila">${I.flame}${st}</span><span class="stat" title="XP">${I.bolt}${S.xp}</span><span class="stat ${S.hearts ? '' : 'off'}" title="Vite"><span class="h">${I.heart}</span>${S.hearts}</span></div>`;
}
function render() {
  const app = $('#app');
  const top = `<div class="top"><div class="brand">${I.helix}elica</div>${statsHTML()}</div>`;
  const page = { path: pathHTML, rev: reviewHTML, lab: labHTML, me: profileHTML }[S.tab] || pathHTML;
  app.innerHTML = top + page();
  const ec = errCount() + dueKeys().length;
  $('#nav').innerHTML = `<div class="side-brand">${I.helix}elica</div>` + [['path', 'Percorso', I.path], ['rev', 'Ripasso', I.redo], ['lab', 'Lab', I.lab], ['me', 'Profilo', I.user]]
    .map(([id, l, ic]) => `<button class="nb ${S.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${ic}<span>${l}</span>${id === 'rev' && ec ? `<span class="cnt">${ec}</span>` : ''}</button>`).join('');
  if (S.tab === 'lab') bindLab();
  if (S.tab === 'me') bindProfile();
}

function sessCard() {
  const p = sessionPlan(), doneToday = !!S.sessions[today()];
  const li = [];
  if (p.errs.length) li.push([p.errs.length, p.errs.length === 1 ? 'errore da ripassare' : 'errori da ripassare']);
  if (p.nl) li.push(['+', `Nuova lezione: ${p.nl.title} · ${p.c.name}`]);
  if (p.due.length) li.push([p.due.length, p.due.length === 1 ? 'ripasso programmato' : 'ripassi programmati']);
  if (p.extra.length) li.push([p.extra.length, 'esercizi misti di ripasso']);
  return `<div class="sess ${doneToday ? 'done' : ''}"><div class="helix">${I.helix}</div>
    <div class="k">${doneToday ? 'Fatta oggi' : 'Sessione di oggi'} · circa ${p.mins} min</div>
    <h2>${doneToday ? 'Ottimo lavoro. Ancora un giro?' : 'Il tuo allenamento quotidiano'}</h2>
    <ul>${li.map(([n, t]) => `<li><i>${n}</i>${escH(t)}</li>`).join('')}</ul>
    <button class="btn" data-act="session">${doneToday ? 'Fai un’altra sessione' : 'Inizia'}</button></div>`;
}
function pathHTML() {
  const c = course(S.course), lk = locked(c), dx = dayXp();
  let h = `<div class="chips">${COURSES.map(x => `<button class="chip ${x.id === S.course ? 'on' : ''} ${locked(x) ? 'lk' : ''}" data-act="course" data-id="${x.id}">${locked(x) ? I.lock : ''}${escH(x.name)}</button>`).join('')}</div>
  <div class="grid2">${sessCard()}
  <div class="card"><div class="goal-row"><span>Obiettivo di oggi</span><b>${Math.min(dx, S.goal)}/${S.goal} XP</b></div><div class="bar"><i style="width:${Math.min(100, dx / S.goal * 100)}%"></i></div>
   <div class="goal-row" style="margin-top:16px"><span>Giorni di fila</span><b>${streakNow()}</b></div>
   <div class="goal-row" style="margin-top:6px"><span>Errori da ripassare</span><b>${errCount()}</b></div>
   <div class="goal-row" style="margin-top:6px"><span>Ripassi in scadenza</span><b>${dueKeys().length}</b></div></div></div>
  <div class="chead" style="margin-top:26px"><h1>${escH(c.name)}</h1><p>${escH(c.tag)}</p></div>`;
  if (c.req && !S.done[c.req.lesson]) {
    const r = LIDX[c.req.lesson];
    const need = r ? allLessons(r.c).slice(0, allLessons(r.c).indexOf(r.l) + 1) : [];
    const d = need.filter(l => S.done[l.id]).length;
    h += `<div class="lockp"><b>${I.lock}${S.peek[c.id] ? 'In anteprima' : 'Bloccato'}</b><p>Si sblocca completando ${escH(c.req.label)}. ${need.length - d ? `Mancano ${need.length - d} lezioni.` : ''}</p><div class="bar"><i style="width:${need.length ? d / need.length * 100 : 0}%"></i></div>
      ${S.peek[c.id] ? '' : `<button class="linkb" data-act="peek" data-id="${c.id}">Voglio dare un’occhiata lo stesso</button>`}</div>`;
  }
  const ls = allLessons(c), firstOpen = ls.findIndex(l => !S.done[l.id]);
  let idx = 0;
  c.units.forEach((u, ui) => {
    const ud = u.lessons.filter(l => S.done[l.id]).length;
    h += `<div class="unit"><div class="unit-t">${u.title.startsWith('Settimana') ? escH(u.title) : `Unità ${ui + 1} · ${escH(u.title)}`} · ${ud}/${u.lessons.length}</div><div class="path">`;
    u.lessons.forEach(l => {
      const i = idx++, done = !!S.done[l.id], cur = !lk && i === firstOpen, lock = lk || (!done && !cur);
      const canRead = !lock && l.ex.some(e => e.t === 'info');
      h += `<div class="lrow"><button class="les ${done && !lk ? 'done' : cur ? 'cur' : 'lock'}" ${lock ? 'disabled' : ''} data-act="lesson" data-id="${l.id}">
        <span class="dot">${done && !lk ? I.check : lock ? I.lock : String(i + 1).padStart(2, '0')}</span>
        <span><div class="t">${escH(l.title)}</div><div class="s">${escH(l.sub)}${done ? ' · ripassa' : ''}</div></span>
        ${cur ? '<span class="go">Inizia</span>' : ''}</button>${canRead ? `<button class="thb" data-act="theory" data-id="${l.id}" title="Rileggi la teoria" aria-label="Rileggi la teoria di ${escA(l.title)}">${I.book}</button>` : ''}</div>`;
    });
    h += '</div></div>';
  });
  if (!lk && firstOpen === -1) h += `<div class="card"><b>Corso completato.</b><div class="note" style="margin-top:4px">Ripassa le lezioni per ricaricare le vite, o passa a un altro corso.</div></div>`;
  return h;
}

function reviewHTML() {
  const it = errItems(), due = dueKeys();
  let h = `<div class="h1">Ripasso</div><div class="sub">Gli esercizi sbagliati restano qui finché non li indovini al primo tentativo. Quelli giusti tornano a intervalli crescenti (1, 2, 4, 8… giorni) per fissarli nella memoria. Il ripasso non consuma vite.</div>
  <div class="grid2"><div class="card"><div class="goal-row"><span>Errori da ripassare</span><b>${it.length}</b></div>
    ${it.length ? `<button class="btn acc" style="margin-top:14px" data-act="review-err">Ripassa ${Math.min(10, it.length)} errori</button>` : `<div class="note">Nessun errore in sospeso.</div>`}</div>
  <div class="card"><div class="goal-row"><span>Ripassi in scadenza oggi</span><b>${due.length}</b></div><div class="goal-row" style="margin-top:6px"><span>Nei prossimi 7 giorni</span><b>${dueSoon()}</b></div>
    ${due.length ? `<button class="btn" style="margin-top:14px" data-act="review-due">Ripassa ora</button>` : ''}</div></div>`;
  if (!it.length) return h + `<div class="empty"><div class="bi">${I.check}</div><b style="color:var(--ink)">Nessun errore da ripassare</b><div style="margin-top:4px;font-size:14px">Gli esercizi sbagliati nelle lezioni compariranno qui.</div></div>`;
  const groups = {};
  it.forEach(e => (groups[e.c.id] = groups[e.c.id] || []).push(e));
  COURSES.forEach(c => {
    const g = groups[c.id]; if (!g) return;
    h += `<div class="sect">${escH(c.name)} · ${g.length}</div>` + g.map(e => `<div class="err-i"><div class="m"><span>${escH(e.l.title)}</span><span class="mono">${e.n}× sbagliato</span></div><div class="x">${escH(e.ex.q || '')}</div>${e.ex.code ? `<div class="cd">${escH(e.ex.code.split('\n')[0])}</div>` : e.ex.lines ? `<div class="cd">${escH(e.ex.lines[0])}</div>` : ''}</div>`).join('');
  });
  return h;
}

/* ---------- lezione ---------- */
let L = null;
const LB = $('#lbody'), LF = $('#lfoot'), BTN = $('#lbtn'), FB = $('#fb');
const cur = () => L && L.items && L.items[L.queue[L.pos]];

function begin(cfg) {
  L = Object.assign({ queue: cfg.items.map((_, i) => i), pos: 0, ok: 0, mistakes: 0, failed: new Set(), cleared: 0, reviewed: 0, phase: 'ask', state: null }, cfg);
  openLesson();
  if (cfg.intro) showIntro(); else showEx();
}
function startLesson(lid) {
  tick();
  const r = LIDX[lid]; if (!r || locked(r.c)) return;
  const isNew = !S.done[lid];
  if (isNew && S.hearts <= 0) { L = { phase: 'nohearts', costs: true }; openLesson(); noHearts(); return; }
  begin({ mode: 'lesson', items: r.l.ex.map(ex => ({ ex, k: ex.k, src: 'new' })), costs: isNew, isNew, lessonId: lid });
}
function startReview(kind) {
  const keys = kind === 'due' ? dueKeys().slice(0, 12) : errItems().slice(0, 10).map(e => e.k);
  if (!keys.length) return;
  begin({ mode: 'review', kind, items: keys.map(k => ({ ex: XIDX[k].ex, k, src: kind })), costs: false });
}
function startSession() {
  const p = sessionPlan(), X = k => ({ ex: XIDX[k].ex, k });
  const items = [
    ...p.errs.map(k => ({ ...X(k), src: 'err' })),
    ...(p.nl ? p.nl.ex.map(ex => ({ ex, k: ex.k, src: 'new' })) : []),
    ...p.due.map(k => ({ ...X(k), src: 'due' })),
    ...p.extra.map(k => ({ ...X(k), src: 'due' }))
  ];
  if (!items.length) return;
  begin({ mode: 'session', items, costs: false, newLessonId: p.nl && !S.done[p.nl.id] ? p.nl.id : null, plan: p, intro: true });
}
function openLesson() { $('#lesson').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeLesson() { $('#lesson').classList.add('hidden'); document.body.style.overflow = ''; L = null; render(); maybeSync(); }
function hud() {
  $('#lprog').style.width = (L && L.items ? L.ok / L.items.length * 100 : 0) + '%';
  $('#lhearts').innerHTML = L && L.costs ? `<span class="h">${I.heart}</span>${S.hearts}` : `<span style="font-size:12px;color:var(--mute)">${L && L.mode === 'session' ? 'sessione' : 'ripasso'}</span>`;
}
function setFoot(cls, label, dis) { LF.className = 'l-foot' + (cls ? ' ' + cls : ''); BTN.textContent = label; BTN.disabled = !!dis; }

function showIntro() {
  const p = L.plan; L.phase = 'intro'; hud();
  const rows = [];
  if (p.errs.length) rows.push(['!', `${p.errs.length} ${p.errs.length === 1 ? 'errore' : 'errori'} da ripassare`, 'Per scaldarti']);
  if (p.nl) rows.push(['+', p.nl.title, `${p.c.name} · lezione nuova`]);
  if (p.due.length) rows.push(['↺', `${p.due.length} ripassi programmati`, 'Per fissare quello che sai']);
  if (p.extra.length) rows.push(['↺', `${p.extra.length} esercizi misti`, 'Dalle lezioni già fatte']);
  LB.innerHTML = `<div class="center pop"><div class="kind">Sessione di oggi · circa ${p.mins} min</div><div class="q">Ecco il programma</div>
    <div class="plan">${rows.map(r => `<div><span class="bi">${escH(r[0])}</span><span><b>${escH(r[1])}</b><small>${escH(r[2])}</small></span></div>`).join('')}</div>
    <div class="note">Le sessioni non consumano vite.</div></div>`;
  FB.innerHTML = ''; setFoot('', 'Inizia');
}

function showEx() {
  const it = cur(), ex = it.ex; L.phase = 'ask'; FB.innerHTML = ''; hud();
  const kinds = { info: 'Teoria', mc: 'Scegli', fill: 'Completa il codice', order: 'Riordina le righe', type: 'Scrivi la risposta', bug: 'Trova il bug' };
  const origin = it.src !== 'new' ? ` · ${escH(XIDX[it.k] ? XIDX[it.k].l.title : '')}` : '';
  const tag = it.src === 'err' ? '<span class="tag err">Errore</span>' : it.src === 'due' ? '<span class="tag">Ripasso</span>' : '';
  let h = `<div class="pop"><div class="kind">${tag}<span>${kinds[ex.t] || ''}${origin}</span></div><div class="q">${escH(ex.t === 'info' ? ex.title : ex.q)}</div>`;
  if (ex.t === 'info') { h += infoBody(ex); setFoot('', 'Continua'); }
  if (ex.t === 'mc') {
    L.state = { sel: null, order: shuffle(ex.opts.map((_, i) => i)) };
    if (ex.code) h += `<pre class="code">${hl(ex.code)}</pre>`;
    h += `<div class="opts">${L.state.order.map((i, n) => `<button class="opt ${ex.mono ? 'mono' : ''}" data-i="${i}"><span class="kb">${n + 1}</span><span>${escH(ex.opts[i])}</span></button>`).join('')}</div>`;
    setFoot('', 'Verifica', true);
  }
  if (ex.t === 'fill') {
    L.state = { fill: ex.ans.map(() => null), bank: shuffle(ex.bank.map((_, i) => i)) };
    h += `<pre class="code" id="fcode"></pre><div class="bank" id="bank"></div>`;
    setFoot('', 'Verifica', true);
  }
  if (ex.t === 'order') {
    L.state = { seq: [], pool: shuffle(ex.lines.map((_, i) => i)) };
    if (ex.lines.length > 1 && L.state.pool.every((v, i) => v === i)) L.state.pool.reverse();
    h += `<div class="ans-area" id="area"></div><div class="pool" id="pool"></div>`;
    setFoot('', 'Verifica', true);
  }
  if (ex.t === 'type') {
    if (ex.code) h += `<pre class="code">${hl(ex.code)}</pre>`;
    h += `<input class="inp" id="tin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Scrivi qui" enterkeyhint="done"><div class="hint">Spazi e a capo non contano.</div>`;
    setFoot('', 'Verifica', true);
  }
  if (ex.t === 'bug') {
    L.state = { sel: null };
    h += `<div class="buglines">${ex.lines.map((ln, i) => `<button class="bl" data-i="${i}"><span class="no">${i + 1}</span><span>${hl(ln) || ' '}</span></button>`).join('')}</div><div class="hint">Tocca la riga che contiene l’errore.</div>`;
    setFoot('', 'Verifica', true);
  }
  LB.innerHTML = h + '</div>'; LB.scrollTop = 0;
  if (ex.t === 'mc') LB.querySelectorAll('.opt').forEach(b => b.onclick = () => { if (L.phase !== 'ask') return; LB.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); L.state.sel = +b.dataset.i; setFoot('', 'Verifica', false); });
  if (ex.t === 'bug') LB.querySelectorAll('.bl').forEach(b => b.onclick = () => { if (L.phase !== 'ask') return; LB.querySelectorAll('.bl').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); L.state.sel = +b.dataset.i; setFoot('', 'Verifica', false); });
  if (ex.t === 'fill') drawFill(ex);
  if (ex.t === 'order') drawOrder(ex);
  if (ex.t === 'type') {
    const tin = $('#tin');
    tin.oninput = () => setFoot('', 'Verifica', !tin.value.trim());
    tin.onkeydown = e => { if (e.key === 'Enter' && tin.value.trim()) { e.preventDefault(); e.stopPropagation(); tin.blur(); BTN.click(); } };
    if (matchMedia('(min-width:900px)').matches) setTimeout(() => tin.focus(), 50);
  }
}
/* testo con `codice` in linea e paragrafi separati da una riga vuota */
const rich = s => escH(s).split(/(`[^`]+`)/).map(p => p.startsWith('`') && p.endsWith('`') && p.length > 1
  ? `<code>${p.slice(1, -1)}</code>` : p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>')).join('');
function infoBody(ex) {
  let h = String(ex.text || '').split(/\n\s*\n/).map(p => `<p>${rich(p)}</p>`).join('');
  h = `<div class="txt">${h}</div>`;
  if (ex.points) h += `<ul class="pts">${ex.points.map(p => `<li>${rich(p)}</li>`).join('')}</ul>`;
  if (ex.code) h += `<pre class="code">${hl(ex.code)}</pre>`;
  if (ex.note) h += `<div class="box warn"><b>Attenzione</b>${rich(ex.note)}</div>`;
  if (ex.cpp) h += `<div class="box cpp"><b>Se vieni dal C++</b>${rich(ex.cpp)}</div>`;
  return h;
}
function openTheory(lid) {
  const r = LIDX[lid]; if (!r) return;
  const cards = r.l.ex.filter(e => e.t === 'info');
  openModal(`<div class="kind">Teoria · ${escH(r.c.name)}</div><h2>${escH(r.l.title)}</h2>
    ${cards.map(e => `<div class="thcard"><h3>${escH(e.title)}</h3>${infoBody(e)}</div>`).join('')}
    <button class="btn" data-act="modal-close">Chiudi</button>`);
  $('#modal .sheet').scrollTop = 0;
}
function drawFill(ex) {
  const st = L.state, parts = ex.code.split('___'), next = st.fill.indexOf(null);
  let h = '';
  parts.forEach((p, i) => { h += hl(p); if (i < parts.length - 1) { const v = st.fill[i]; h += `<span class="blank ${v !== null ? 'f' : ''} ${i === next ? 'next' : ''}" data-b="${i}">${v !== null ? escH(ex.bank[v]) : '&nbsp;'}</span>`; } });
  const fc = $('#fcode'); fc.innerHTML = h;
  fc.querySelectorAll('.blank').forEach(b => b.onclick = () => { if (L.phase !== 'ask') return; st.fill[+b.dataset.b] = null; drawFill(ex); });
  const bank = $('#bank');
  bank.innerHTML = st.bank.map(i => `<button class="tok ${st.fill.includes(i) ? 'used' : ''}" data-t="${i}">${escH(ex.bank[i])}</button>`).join('');
  bank.querySelectorAll('.tok').forEach(b => b.onclick = () => { if (L.phase !== 'ask') return; const k = st.fill.indexOf(null); if (k < 0 || st.fill.includes(+b.dataset.t)) return; st.fill[k] = +b.dataset.t; drawFill(ex); });
  setFoot('', 'Verifica', st.fill.includes(null));
}
function drawOrder(ex) {
  const st = L.state, area = $('#area'), pool = $('#pool');
  area.innerHTML = st.seq.length ? st.seq.map((i, k) => `<button class="ln" data-k="${k}">${escH(ex.lines[i])}</button>`).join('') : '<div class="ph">Tocca le righe nell’ordine giusto</div>';
  pool.innerHTML = st.pool.map(i => `<button class="ln ${st.seq.includes(i) ? 'used' : ''}" data-i="${i}">${escH(ex.lines[i])}</button>`).join('');
  area.querySelectorAll('.ln').forEach(b => b.onclick = () => { if (L.phase !== 'ask') return; st.seq.splice(+b.dataset.k, 1); drawOrder(ex); });
  pool.querySelectorAll('.ln').forEach(b => b.onclick = () => { if (L.phase !== 'ask' || st.seq.includes(+b.dataset.i)) return; st.seq.push(+b.dataset.i); drawOrder(ex); });
  setFoot('', 'Verifica', st.seq.length !== ex.lines.length);
}

function onMain() {
  if (!L) return;
  if (L.phase === 'intro') { showEx(); return; }
  if (L.phase === 'end' || L.phase === 'nohearts') { closeLesson(); return; }
  if (L.dead && L.phase === 'fb') { noHearts(); return; }
  const it = cur();
  if (L.phase === 'fb' || it.ex.t === 'info') {
    if (it.ex.t === 'info' && L.phase === 'ask') L.ok++;
    L.pos++;
    if (L.pos >= L.queue.length) finish(); else showEx();
    return;
  }
  check();
}
BTN.onclick = onMain;
$('#lx').onclick = closeLesson;

function check() {
  const it = cur(), ex = it.ex, qi = L.queue[L.pos];
  let right = false, sol = '';
  if (ex.t === 'mc') { right = L.state.sel === ex.a; sol = `Risposta corretta: <code>${escH(ex.opts[ex.a])}</code>`; LB.querySelectorAll('.opt').forEach(b => { if (+b.dataset.i === ex.a) b.classList.add('right'); }); }
  if (ex.t === 'fill') { right = L.state.fill.every((v, i) => ex.bank[v] === ex.ans[i]); sol = 'Soluzione: ' + ex.ans.map(a => `<code>${escH(a)}</code>`).join(' '); }
  if (ex.t === 'order') { right = L.state.seq.every((v, i) => ex.lines[v] === ex.lines[i]); }
  if (ex.t === 'type') { const tin = $('#tin'); right = ex.ans.some(a => norm(a) === norm(tin.value)); tin.disabled = true; sol = `Risposta corretta: <code>${escH(ex.ans[0])}</code>`; }
  if (ex.t === 'bug') { right = L.state.sel === ex.bad; sol = `La riga sbagliata è la ${ex.bad + 1}.`; LB.querySelectorAll('.bl').forEach(b => { const i = +b.dataset.i; if (i === ex.bad) b.classList.add('right'); else if (i === L.state.sel) b.classList.add('wrong'); }); }
  L.phase = 'fb';
  if (right) {
    L.ok++;
    if (!L.failed.has(qi)) { if (clearErr(it.k)) L.cleared++; srsHit(it.k); }
    if (it.src !== 'new') L.reviewed++;
    FB.innerHTML = `<h3>${pick1(['Esatto', 'Perfetto', 'Ottimo', 'Giusto', 'Proprio così'])}</h3><p>${escH(ex.why)}</p>`;
    setFoot('ok', 'Continua');
  } else {
    L.mistakes++; buzz(); LB.firstElementChild.classList.add('shake');
    L.failed.add(qi); noteErr(it.k); srsMiss(it.k);
    if (L.costs) { S.hearts = Math.max(0, S.hearts - 1); if (S.hearts === HMAX - 1) S.hTs = Date.now(); if (S.hearts <= 0) L.dead = true; }
    L.queue.push(qi);
    const lid = XIDX[it.k] && XIDX[it.k].l.id, hasTh = lid && LIDX[lid].l.ex.some(e => e.t === 'info');
    FB.innerHTML = `<h3>Non proprio</h3><p>${ex.t === 'order' ? '' : sol + '<br>'}${escH(ex.why)}</p>${hasTh ? `<button class="fblink" data-act="theory" data-id="${lid}">${I.book}Rileggi la teoria</button>` : ''}`;
    setFoot('ko', 'Continua');
  }
  save(); hud();
}
function noHearts() {
  tick(); L.phase = 'nohearts'; hud();
  const mins = Math.max(1, Math.ceil((HREGEN - (Date.now() - S.hTs)) / 60000));
  LB.innerHTML = `<div class="center pop"><div style="color:var(--bad);width:56px;height:56px;margin-bottom:18px">${I.heart}</div><div class="h1">Vite finite</div>
    <div class="sub">Una nuova vita tra ${mins} min. Intanto puoi fare la sessione di oggi o ripassare: non consumano vite e te ne restituiscono una.</div>
    <button class="btn acc" data-act="session">Fai la sessione di oggi</button></div>`;
  FB.innerHTML = ''; setFoot('', 'Torna al percorso');
  $('#lprog').style.width = '0%';
}
function finish() {
  const ctx = {}, notes = [];
  let gained = 0;
  if (L.mode === 'lesson') {
    if (L.isNew) { gained = 10 + (L.mistakes === 0 ? 5 : 0); S.done[L.lessonId] = Date.now(); ctx.perfect = L.mistakes === 0; }
    else { gained = 5; S.hearts = Math.min(HMAX, S.hearts + 1); notes.push('+1 vita per il ripasso'); }
  } else if (L.mode === 'review') {
    gained = 5 + 2 * L.cleared; S.hearts = Math.min(HMAX, S.hearts + 1); ctx.review = L.kind === 'err';
    if (L.kind === 'err') notes.push(`${L.cleared} ${L.cleared === 1 ? 'errore eliminato' : 'errori eliminati'} · ${errCount()} ancora da ripassare`);
    notes.push('+1 vita');
  } else {
    const newDone = L.newLessonId && !S.done[L.newLessonId];
    gained = 5 + (newDone ? 10 : 0) + 2 * L.reviewed;
    if (newDone) { S.done[L.newLessonId] = Date.now(); notes.push(`Lezione “${LIDX[L.newLessonId].l.title}” completata`); }
    S.sessions[today()] = (S.sessions[today()] || 0) + 1; S.hearts = Math.min(HMAX, S.hearts + 1); ctx.session = true;
    notes.push('+1 vita');
  }
  addXp(gained); bumpStreak();
  const nb = award(ctx); save(); persistStorage();
  const tot = L.items.filter(i => isQ(i.ex)).length, acc = tot ? Math.round(tot / (tot + L.mistakes) * 100) : 100;
  const title = { lesson: L.isNew ? 'Lezione completata' : 'Ripasso completato', review: 'Ripasso completato', session: 'Sessione di oggi completata' }[L.mode];
  L.phase = 'end'; $('#lprog').style.width = '100%';
  LB.innerHTML = `<div class="center pop"><div class="kind">${title}</div><div class="big">+${gained} XP</div>
    <div class="sumgrid"><div class="sum"><b>${acc}%</b><span>precisione</span></div><div class="sum"><b>${S.streak}</b><span>giorni di fila</span></div><div class="sum"><b>${Math.min(S.dayXp, S.goal)}/${S.goal}</b><span>obiettivo</span></div></div>
    ${notes.length ? `<div class="note" style="margin:-14px 0 16px">${notes.map(escH).join(' · ')}</div>` : ''}
    ${nb.map(b => `<div class="newbadge"><div class="bi">${escH(b.ic)}</div><div><div style="font-size:12px;opacity:.7">Nuovo traguardo</div><b>${escH(b.name)}</b></div></div>`).join('')}</div>`;
  FB.innerHTML = ''; setFoot('', 'Continua');
}

/* tastiera (PC e iPad con tastiera) */
document.addEventListener('keydown', e => {
  if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') closeModal(); return; }
  if (!L || $('#lesson').classList.contains('hidden')) return;
  if (e.key === 'Escape') { closeLesson(); return; }
  const tg = (e.target.tagName || '').toLowerCase(), inInput = tg === 'input' || tg === 'textarea';
  if (e.key === 'Enter' && !inInput) { if (!BTN.disabled) { e.preventDefault(); BTN.click(); } return; }
  if (inInput || L.phase !== 'ask' || e.metaKey || e.ctrlKey) return;
  const n = parseInt(e.key, 10), it = cur(); if (!n || !it) return;
  const sel = { mc: '.opt', fill: '.tok:not(.used)', order: '.pool .ln:not(.used)', bug: '.bl' }[it.ex.t];
  const els = sel ? LB.querySelectorAll(sel) : [];
  if (els[n - 1]) { e.preventDefault(); els[n - 1].click(); }
});

/* ---------- Lab: Python vero con Pyodide ---------- */
const SNIPPETS = [
  { name: 'GC%', code: `seq = "ATGCGCGATTACAGGCC"\ngc = (seq.count("G") + seq.count("C")) / len(seq)\nprint(f"GC: {gc:.1%}")` },
  { name: 'Validatore', code: `def id_valido(s):\n    if not 5 <= len(s) <= 10:\n        return False\n    if not (s[:3].isalpha() and s[:3].isupper()):\n        return False\n    if s[3] != "-":\n        return False\n    numeri = s[4:]\n    if not numeri.isdigit():\n        return False\n    if numeri[0] == "0":\n        return False\n    return True\n\nfor prova in ["HSR-1024", "HSR-0024", "HS-1024", "abc-123", "ABC-1"]:\n    print(prova, id_valido(prova))` },
  { name: 'Flag', code: `def lettere_poi_numeri(s):\n    visto_numero = False\n    for c in s:\n        if c.isdigit():\n            visto_numero = True\n        elif visto_numero:\n            return False\n    return True\n\nfor s in ["ABC12", "AB1C2", "12AB", "ABC"]:\n    print(s, lettere_poi_numeri(s))` },
  { name: 'Rev. comp.', code: `comp = {"A": "T", "T": "A", "C": "G", "G": "C"}\n\ndef revcomp(seq):\n    return "".join(comp[b] for b in reversed(seq.upper()))\n\nprint(revcomp("ATGCGTAA"))` },
  { name: 'Traduzione', code: `basi = "TCAG"\naa = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG"\ntabella = {a + b + c: aa[16*i + 4*j + k]\n           for i, a in enumerate(basi)\n           for j, b in enumerate(basi)\n           for k, c in enumerate(basi)}\n\ndna = "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG"\nprot = "".join(tabella[dna[i:i+3]] for i in range(0, len(dna) - 2, 3))\nprint(prot)` },
  { name: 'FASTA', code: `testo = """>gene1 umano\nATGCGT\nAACGTT\n>gene2 topo\nGGGCCCAT"""\n\nseqs = {}\nfor riga in testo.splitlines():\n    if riga.startswith(">"):\n        nome = riga[1:].split()[0]\n        seqs[nome] = ""\n    else:\n        seqs[nome] += riga.strip()\n\nfor nome, s in seqs.items():\n    print(nome, len(s), "bp")` },
  { name: 'Insiemi', code: `# il cuore della pipeline: proteine senza match\ntutte_A = {"p1", "p2", "p3", "p4", "p5"}\ncon_match = {"p1", "p3", "p4"}\ncandidate = tutte_A - con_match\nprint("candidate:", sorted(candidate))\n\n# ricerche a cascata\nrimaste = candidate\nfor nome, trovate in [("diamond sensibile", {"p2"}), ("tblastn", set())]:\n    rimaste = rimaste - trovate\n    print(nome, "->", sorted(rimaste))` },
  { name: 'Eccezioni', code: `def gc(seq):\n    if not seq:\n        raise ValueError("sequenza vuota")\n    return (seq.count("G") + seq.count("C")) / len(seq)\n\nfor s in ["GGCA", ""]:\n    try:\n        print(s, gc(s))\n    except ValueError as e:\n        print("errore:", e)` },
  { name: 'Classi', code: `class Sequenza:\n    def __init__(self, nome, seq):\n        self.nome = nome\n        self.seq = seq.upper()\n\n    def gc(self):\n        return (self.seq.count("G") + self.seq.count("C")) / len(self.seq)\n\n    def __str__(self):\n        return f"{self.nome} ({len(self.seq)} bp, GC {self.gc():.0%})"\n\nprint(Sequenza("gene1", "atgcgcgatt"))` }
];
let py = null, pyLoading = null, labCode = null;
function labHTML() {
  if (labCode === null) labCode = SNIPPETS[0].code;
  return `<div class="h1">Lab</div><div class="sub">Python vero, eseguito sul tuo dispositivo. Parti da un esempio o scrivi il tuo codice.</div>
  <div class="chips">${SNIPPETS.map((s, i) => `<button class="chip" data-s="${i}">${escH(s.name)}</button>`).join('')}</div>
  <div class="editor"><textarea id="ed" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off"></textarea>
  <div class="keys">${['⇥', ':', '(', ')', '[', ']', '{', '}', '"', '=', '#', '.', ',', '_', '+', '-'].map(k => `<button data-k="${escA(k)}">${escH(k)}</button>`).join('')}</div></div>
  <div class="row"><button class="btn" id="run">Esegui</button><button class="btn ghost" id="clr" style="flex:0 0 110px;min-width:0">Pulisci</button></div>
  <div class="out" id="out"><span class="ph">L’output apparirà qui.</span></div>
  <div class="note">Il primo avvio scarica l’interprete Python (circa 10 MB) e richiede internet. Nell’app installata resta poi disponibile offline. Su PC: Ctrl/⌘ + Invio per eseguire.</div>`;
}
function bindLab() {
  const ed = $('#ed'); ed.value = labCode; ed.oninput = () => labCode = ed.value;
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { labCode = ed.value = SNIPPETS[+b.dataset.s].code; $('#out').className = 'out'; $('#out').innerHTML = '<span class="ph">L’output apparirà qui.</span>'; });
  document.querySelectorAll('[data-k]').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => { const t = b.dataset.k === '⇥' ? '    ' : b.dataset.k; ed.setRangeText(t, ed.selectionStart, ed.selectionEnd, 'end'); labCode = ed.value; ed.focus(); }; });
  ed.onkeydown = e => {
    if (e.key === 'Tab') { e.preventDefault(); ed.setRangeText('    ', ed.selectionStart, ed.selectionEnd, 'end'); labCode = ed.value; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runLab(); }
  };
  $('#clr').onclick = () => { labCode = ed.value = ''; ed.focus(); };
  $('#run').onclick = runLab;
}
function loadPy() {
  if (pyLoading) return pyLoading;
  const base = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  pyLoading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = base + 'pyodide.js';
    s.onload = async () => { try { py = await window.loadPyodide({ indexURL: base }); res(py); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error('download')); document.head.appendChild(s);
  });
  pyLoading.catch(() => { pyLoading = null; });
  return pyLoading;
}
async function runLab() {
  const out = $('#out'), run = $('#run'); if (!out) return;
  out.className = 'out';
  if (!py) { out.innerHTML = '<span class="ph">Avvio Python…</span>'; run.disabled = true; }
  try { await loadPy(); } catch (e) { out.className = 'out err'; out.textContent = 'Non riesco a scaricare Python. Controlla la connessione e riprova.'; run.disabled = false; return; }
  run.disabled = true; const lines = [];
  py.setStdout({ batched: s => lines.push(s) }); py.setStderr({ batched: s => lines.push(s) });
  try { await py.runPythonAsync(labCode); out.textContent = lines.join('\n') || '(nessun output)'; }
  catch (e) { out.className = 'out err'; const m = String(e.message || e).trim().split('\n'); out.textContent = (lines.length ? lines.join('\n') + '\n' : '') + m.slice(-2).join('\n'); }
  run.disabled = false;
  if (!S.tried.includes('lab')) { S.tried.push('lab'); award(); save(); }
}

/* ---------- backup ---------- */
const b64e = s => btoa(unescape(encodeURIComponent(s)));
const b64d = s => decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));
const exportJSON = () => JSON.stringify({ app: 'elica', schema: SCHEMA, version: APP_VERSION, exported: new Date().toISOString(), state: S });
function parseBackup(txt) {
  txt = String(txt || '').trim(); if (!txt) return null;
  let o = null;
  try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(b64d(txt)); } catch (e2) { return null; } }
  return o && o.app === 'elica' && o.state ? o : null;
}
function downloadBackup() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `elica-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('Backup scaricato');
}
function copyCode() {
  const code = b64e(exportJSON());
  const fallback = () => { const t = $('#codeout'); if (t) { t.classList.remove('hidden'); t.value = code; t.select(); } toast('Seleziona e copia il codice qui sotto'); };
  try { navigator.clipboard.writeText(code).then(() => toast('Codice copiato: incollalo sull’altro dispositivo'), fallback); } catch (e) { fallback(); }
}

/* ---------- sincronizzazione con GitHub Gist ----------
   Nessun server: i progressi stanno in un Gist segreto del tuo account GitHub.
   Attenzione: i Gist segreti non compaiono nelle ricerche, ma chi ha il link può aprirli.
   Il token (permesso "gist") resta solo in questo dispositivo e non finisce nei backup. */
const GIST_FILE = 'elica-progressi.json';
let SY; try { SY = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}') || {}; } catch (e) { SY = {}; }
const saveSY = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); } catch (e) {} };
let syncing = false, syncTimer = null;

function mergeStates(a, b) {            // unisce i progressi di due dispositivi
  const newer = (a.upd || 0) >= (b.upd || 0) ? a : b, older = newer === a ? b : a;
  const m = migrate(JSON.parse(JSON.stringify(newer)));
  const o = migrate(JSON.parse(JSON.stringify(older)));
  for (const [d, n] of Object.entries(o.xpd)) m.xpd[d] = Math.max(m.xpd[d] || 0, n);
  m.xp = Object.values(m.xpd).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(o.done)) if (!m.done[k] || (typeof v === 'number' && typeof m.done[k] === 'number' && v < m.done[k])) m.done[k] = v;
  m.badges = [...new Set([...m.badges, ...o.badges])];
  m.tried = [...new Set([...m.tried, ...o.tried])];
  for (const [d, n] of Object.entries(o.sessions)) m.sessions[d] = Math.max(m.sessions[d] || 0, n);
  for (const [k, v] of Object.entries(o.peek)) m.peek[k] = v;
  for (const [k, t] of Object.entries(o.clr)) m.clr[k] = Math.max(m.clr[k] || 0, t);
  const err = {};
  new Set([...Object.keys(m.err), ...Object.keys(o.err)]).forEach(k => {
    const x = m.err[k], y = o.err[k], e = !x ? y : !y ? x : (x.ts >= y.ts ? { ...x, n: Math.max(x.n, y.n) } : { ...y, n: Math.max(x.n, y.n) });
    if (!(m.clr[k] > e.ts)) err[k] = e;
  });
  m.err = err;
  for (const [k, v] of Object.entries(o.srs)) if (!m.srs[k] || (v.t || 0) > (m.srs[k].t || 0)) m.srs[k] = v;
  if (o.last > m.last || (o.last === m.last && o.streak > m.streak)) { m.last = o.last; m.streak = o.streak; }
  if (o.day > m.day) { m.day = o.day; m.dayXp = o.dayXp; } else if (o.day === m.day) m.dayXp = Math.max(m.dayXp, o.dayXp);
  m.upd = Math.max(a.upd || 0, b.upd || 0);
  return m;
}
async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, Object.assign({}, opts, { headers: Object.assign({ 'Authorization': 'Bearer ' + SY.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opts.body ? { 'Content-Type': 'application/json' } : {}) }));
  if (!r.ok) {
    const msg = r.status === 401 ? 'token non valido o scaduto' : r.status === 403 ? 'accesso negato: serve il permesso “gist” (o riprova più tardi)' : r.status === 404 ? 'Gist non trovato' : 'GitHub ha risposto ' + r.status;
    const err = new Error(msg); err.status = r.status; throw err;
  }
  return r.json();
}
async function findGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const g = list.find(x => x.files && x.files[GIST_FILE]);
    if (g) return g.id;
    if (list.length < 100) break;
  }
  return null;
}
async function syncNow(silent) {
  if (!SY.token || syncing || !navigator.onLine) return;
  syncing = true; setSyncLabel('Sincronizzazione…');
  try {
    if (!SY.gist) SY.gist = await findGist();
    let merged = S, g = null;
    if (SY.gist) {
      try { g = await gh('/gists/' + SY.gist); }
      catch (e) { if (e.status === 404) { SY.gist = await findGist(); if (SY.gist) g = await gh('/gists/' + SY.gist); } else throw e; }
    }
    if (g) {
      const f = g.files && g.files[GIST_FILE];
      let txt = f ? f.content : '';
      if (f && f.truncated && f.raw_url) txt = await (await fetch(f.raw_url)).text();
      const remote = parseBackup(txt);
      if (remote) merged = mergeStates(S, remote.state);
      S = merged; S.tab = S.tab || 'path';
      await gh('/gists/' + SY.gist, { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content: exportJSON() } } }) });
    } else {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Elica: progressi (sincronizzazione)', public: false, files: { [GIST_FILE]: { content: exportJSON() } } }) });
      SY.gist = g.id;
    }
    if (!S.tried.includes('sync')) S.tried.push('sync');
    award(); save(false);
    SY.lastSync = Date.now(); SY.error = ''; saveSY();
    if (!silent) toast('Progressi sincronizzati');
    if (!L) render();
  } catch (e) {
    SY.error = e.message || 'Errore di rete'; saveSY();
    if (!silent) toast('Sincronizzazione non riuscita: ' + SY.error);
    setSyncLabel('Errore: ' + SY.error);
  } finally { syncing = false; }
}
function maybeSync() { if (!SY.token) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(true), 1500); }
function setSyncLabel(t) { const el = $('#synclbl'); if (el) el.textContent = t; }
const fmtTime = t => t ? new Date(t).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai';

/* ---------- profilo ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (S.tab === 'me' && !L) render(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installHTML() {
  if (standalone()) return `<div class="note" style="margin:0">L’app è installata su questo dispositivo.</div>`;
  if (location.protocol === 'file:' || PORTABLE) return `<div class="note" style="margin:0">Stai usando la versione file: funziona, ma per installarla su iPad e telefono pubblica la cartella dell’app con GitHub Pages (istruzioni nel README).</div>`;
  return `${deferredInstall ? `<button class="btn acc sm" data-act="install" style="margin-bottom:10px">Installa Elica</button>` : ''}
    <div class="note" style="margin:0"><b>iPhone e iPad:</b> in Safari tocca Condividi → “Aggiungi alla schermata Home”.<br><b>Android:</b> menu di Chrome → “Installa app”.<br><b>PC e Mac:</b> in Chrome o Edge, icona “Installa” nella barra degli indirizzi.</div>`;
}
function profileHTML() {
  const lvl = Math.floor(S.xp / 100) + 1, inLvl = S.xp % 100;
  const sessTot = Object.values(S.sessions).reduce((a, b) => a + b, 0);
  let h = `<div class="h1">Profilo</div><div class="sub">I progressi sono salvati su questo dispositivo. Con backup o sincronizzazione li porti anche sugli altri.</div>
  <div class="grid2"><div class="card"><div class="lvl"><div><div class="note" style="margin:0">Livello</div><div class="big">${lvl}</div></div><div class="mono" style="font-size:14px;color:var(--mute)">${inLvl}/100 XP</div></div><div class="bar"><i style="width:${inLvl}%"></i></div></div>
  <div class="sumgrid four" style="margin:0"><div class="sum"><b>${streakNow()}</b><span>giorni di fila</span></div><div class="sum"><b>${S.xp}</b><span>XP totali</span></div><div class="sum"><b>${Object.keys(S.done).filter(k => LIDX[k]).length}</b><span>lezioni</span></div><div class="sum"><b>${sessTot}</b><span>sessioni</span></div></div></div>
  <div class="sect">Corsi</div><div class="card">`;
  COURSES.forEach(c => { const ls = allLessons(c), d = ls.filter(l => S.done[l.id]).length; h += `<div class="prow"><div class="goal-row"><span>${escH(c.name)}</span><b>${d}/${ls.length}</b></div><div class="bar"><i style="width:${ls.length ? d / ls.length * 100 : 0}%"></i></div></div>`; });
  h += `</div><div class="sect">Traguardi · ${S.badges.filter(b => BADGES.some(x => x.id === b)).length}/${BADGES.length}</div><div class="badges">${BADGES.map(b => `<div class="badge ${S.badges.includes(b.id) ? '' : 'off'}"><div class="bi">${escH(b.ic)}</div>${escH(b.name)}</div>`).join('')}</div>
  <div class="sect">Impostazioni</div><div class="card">
    <div class="set-row"><div class="lbl">Obiettivo giornaliero</div><div class="seg">${GOALS.map(g => `<button class="${S.goal === g ? 'on' : ''}" data-act="goal" data-id="${g}">${g} XP</button>`).join('')}</div></div>
    <div class="set-row"><div class="lbl">Durata della sessione<small>Quanti ripassi mettere nella sessione del giorno</small></div><div class="seg"><button class="${S.sessLen === 'short' ? 'on' : ''}" data-act="sesslen" data-id="short">Breve · ~10 min</button><button class="${S.sessLen === 'long' ? 'on' : ''}" data-act="sesslen" data-id="long">Lunga · ~15 min</button></div></div>
  </div>
  <div class="sect">Sincronizzazione tra dispositivi</div><div class="card">${syncHTML()}</div>
  <div class="sect">Backup manuale</div><div class="card">
    <div class="note" style="margin:0 0 12px">Scarica un file (o copia un codice) e aprilo sull’altro dispositivo con “Ripristina”. Il ripristino unisce i progressi, non li cancella.</div>
    <div class="row"><button class="btn" data-act="export">Scarica backup</button><button class="btn ghost" data-act="copy">Copia codice</button></div>
    <textarea id="codeout" class="paste hidden" readonly></textarea>
    <button class="linkb" data-act="import-open">Ripristina da file o codice</button>
    <div id="imp" class="hidden" style="margin-top:12px"><input type="file" id="impfile" accept=".json,application/json"><textarea id="imptxt" class="paste" placeholder="…oppure incolla qui il codice"></textarea><button class="btn sm" data-act="import">Ripristina e unisci</button></div>
  </div>
  <div class="sect">Installa l’app</div><div class="card">${installHTML()}</div>
  <div class="foot-ver"><span>Elica v${escH(APP_VERSION)}</span><button class="linkb" style="margin:0" data-act="news">Novità</button><button class="linkb" style="margin:0" data-act="reset">Azzera tutti i progressi</button></div>`;
  return h;
}
function syncHTML() {
  if (location.protocol === 'file:' && !SY.token) return `<div class="note" style="margin:0">La sincronizzazione automatica funziona nell’app pubblicata o installata. Qui puoi usare il backup manuale.</div>` + syncForm();
  if (!SY.token) return `<div class="note" style="margin:0 0 12px">I progressi vengono salvati in un <b>Gist segreto</b> del tuo account GitHub e uniti tra i dispositivi, senza server né database. “Segreto” vuol dire non elencato: non compare nelle ricerche né sul tuo profilo, ma chi avesse il link potrebbe aprirlo. Contiene solo XP e lezioni fatte, mai il token. Ti serve un token con il solo permesso <b>gist</b>: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → spunta “gist”. Usa lo stesso token su ogni dispositivo.</div>` + syncForm();
  return `<div class="goal-row"><span>${I.cloud.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}Collegato a GitHub</span><b id="synclbl">${SY.error ? 'Errore: ' + escH(SY.error) : 'Ultima: ' + fmtTime(SY.lastSync)}</b></div>
    <div class="note">Si sincronizza da sola all’apertura e alla fine di ogni lezione. Il token resta solo su questo dispositivo.</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="sync">Sincronizza ora</button><button class="btn ghost" data-act="sync-off">Scollega</button></div>`;
}
const syncForm = () => `<input class="inp" id="tok" type="password" autocomplete="off" placeholder="Token GitHub (ghp_…)" style="margin:12px 0 10px;font-size:14px"><button class="btn sm" data-act="sync-on">Collega e sincronizza</button>`;
function bindProfile() {
  const f = $('#impfile');
  if (f) f.onchange = () => { const file = f.files && f.files[0]; if (!file) return; file.text().then(t => { $('#imptxt').value = t; toast('File caricato: tocca “Ripristina e unisci”'); }); };
}
function doImport() {
  const o = parseBackup($('#imptxt') && $('#imptxt').value);
  if (!o) { toast('Backup non valido'); return; }
  S = mergeStates(S, o.state); S.seen = APP_VERSION; save(); render(); toast('Progressi ripristinati'); maybeSync();
}

/* ---------- finestre, avvisi, novità ---------- */
function toast(msg, action, fn, ms = 3200) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${escH(msg)}</span>${action ? `<button class="btn sm">${escH(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.remove(); fn && fn(); };
  document.body.appendChild(t);
  if (!action) setTimeout(() => t.remove(), ms);
}
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); if (S.seen !== APP_VERSION) { S.seen = APP_VERSION; save(false); } }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-act="modal-close"]')) closeModal(); });
function showNews(all) {
  const list = CHANGELOG.filter(c => all || !S.seen || vcmp(c.v, S.seen) > 0);
  if (!list.length) return;
  openModal(`<div class="kind">Novità</div><h2>${all ? 'Cosa è cambiato' : 'Elica si è aggiornata'}</h2>
    ${list.map(c => `<div class="cl"><h4>v${escH(c.v)} · ${escH(c.date)}</h4><ul>${c.items.map(i => `<li>${escH(i)}</li>`).join('')}</ul></div>`).join('')}
    <button class="btn" data-act="modal-close">Continua</button>`);
}
function twoTap(btn, fn) {
  if (!btn.classList.contains('arm')) { const old = btn.textContent; btn.classList.add('arm'); btn.textContent = 'Tocca di nuovo per confermare'; setTimeout(() => { if (btn.isConnected) { btn.classList.remove('arm'); btn.textContent = old; } }, 3500); return; }
  fn();
}
function persistStorage() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {} }

/* ---------- azioni ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const id = t.dataset.id;
  switch (t.dataset.act) {
    case 'tab': S.tab = id; save(false); render(); window.scrollTo(0, 0); break;
    case 'course': S.course = id; save(false); render(); break;
    case 'lesson': startLesson(id); break;
    case 'session': startSession(); break;
    case 'review-err': startReview('err'); break;
    case 'review-due': startReview('due'); break;
    case 'peek': S.peek[id] = 1; save(); render(); break;
    case 'goal': S.goal = +id; save(); render(); break;
    case 'sesslen': S.sessLen = id; save(); render(); break;
    case 'news': showNews(true); break;
    case 'theory': openTheory(id); break;
    case 'export': downloadBackup(); break;
    case 'copy': copyCode(); break;
    case 'import-open': $('#imp').classList.toggle('hidden'); break;
    case 'import': doImport(); break;
    case 'reset': twoTap(t, () => { S = fresh(); save(); render(); toast('Progressi azzerati'); }); break;
    case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; render(); }); } break;
    case 'sync-on': { const v = ($('#tok').value || '').trim(); if (!v) { toast('Incolla prima il token'); return; } SY = { token: v }; saveSY(); render(); syncNow(false); break; }
    case 'sync': syncNow(false); break;
    case 'sync-off': twoTap(t, () => { SY = {}; saveSY(); render(); toast('Sincronizzazione scollegata da questo dispositivo'); }); break;
  }
});

/* ---------- aggiornamenti dell'app (service worker) ---------- */
if (!PORTABLE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const ask = w => toast('È disponibile una nuova versione', 'Aggiorna', () => w.postMessage('skip'));
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false; const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
}

/* ---------- avvio ---------- */
E._debug = () => ({ L, S, XIDX });   // usato dai test automatici
render();
if (S.seen !== APP_VERSION) {
  if (S.xp > 0) showNews(false); else { S.seen = APP_VERSION; save(false); }
}
if (SY.token) syncNow(true);
window.addEventListener('online', () => maybeSync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !L) { tick(); render(); } });
setInterval(() => { if (!L && S.tab === 'path') { const before = S.hearts; tick(); if (S.hearts !== before) render(); } }, 60000);
})();
