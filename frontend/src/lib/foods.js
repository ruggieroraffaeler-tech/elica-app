// =====================================================================
//  Alimenti e calcoli della dieta (valori per 100 g)
// =====================================================================

export const FIELDS = [
  { key: 'kcal', label: 'Kcal', short: 'Kcal', unit: 'kcal', color: 'hsl(var(--foreground))' },
  { key: 'carbs', label: 'Carboidrati', short: 'Carbo', unit: 'g', color: '#16a34a' },
  { key: 'sugars', label: 'di cui zuccheri', short: 'Zucch.', unit: 'g', color: '#db2777' },
  { key: 'protein', label: 'Proteine', short: 'Prot.', unit: 'g', color: '#2563eb' },
  { key: 'fat', label: 'Grassi', short: 'Grassi', unit: 'g', color: '#d97706' },
  { key: 'saturated', label: 'di cui saturi', short: 'Saturi', unit: 'g', color: '#b45309' },
  { key: 'fiber', label: 'Fibre', short: 'Fibre', unit: 'g', color: '#78716c' },
  { key: 'sodium', label: 'Sodio (mg)', short: 'Sodio', unit: 'mg', color: '#64748b' },
];
export const FIELD_KEYS = FIELDS.map((f) => f.key);
export const MAIN_KEYS = ['kcal', 'carbs', 'sugars', 'protein', 'fat'];
export const MACRO_COLORS = { kcal: 'hsl(var(--foreground))', carbs: '#16a34a', sugars: '#db2777', protein: '#2563eb', fat: '#d97706', fiber: '#78716c', saturated: '#b45309', sodium: '#64748b' };
export const MACRO_LABEL = { carbs: 'carboidrati', protein: 'proteine', fat: 'grassi' };

/** numero da testo italiano/inglese: "12,5" "1.234,5" "tr" → 0; vuoto → null */
export const parseNum = (v) => {
  if (v === null || v === undefined || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().toLowerCase().replace(/ /g, ' ');
  if (!s || ['-', '--', 'n.d.', 'nd'].includes(s)) return null;
  if (['tr', 'tracce', 'traccia'].includes(s)) return 0;
  s = s.replace(/[^0-9,.-]/g, '');
  if (!s || s === '-' || s === '.' || s === ',') return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

export const fmt = (v, dec = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  return r.toLocaleString('it-IT', { maximumFractionDigits: dec });
};
export const fmt0 = (v) => fmt(v, 0);

export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();

/** valori di "grams" grammi di un alimento (per100 = valori per 100 g) */
export const valuesFor = (per100, grams) => {
  const q = (parseNum(grams) || 0) / 100;
  const out = {};
  FIELD_KEYS.forEach((k) => { out[k] = (parseNum(per100?.[k]) || 0) * q; });
  return out;
};
export const sumValues = (list) => {
  const out = {};
  FIELD_KEYS.forEach((k) => { out[k] = list.reduce((a, v) => a + (v?.[k] || 0), 0); });
  return out;
};
export const per100Of = (food) => {
  const out = {};
  FIELD_KEYS.forEach((k) => { out[k] = parseNum(food?.[k]); });
  return out;
};
export const kcalFromMacros = (d) => (parseNum(d?.protein) || 0) * 4 + (parseNum(d?.carbs) || 0) * 4 + (parseNum(d?.fat) || 0) * 9;

/** controlli sui valori: segnala dati probabilmente sbagliati */
export const foodWarnings = (f) => {
  const w = [];
  const k = parseNum(f.kcal); const c = parseNum(f.carbs); const z = parseNum(f.sugars); const p = parseNum(f.protein);
  const g = parseNum(f.fat); const s = parseNum(f.saturated); const fi = parseNum(f.fiber);
  ['carbs', 'sugars', 'protein', 'fat', 'saturated', 'fiber'].forEach((key) => {
    const v = parseNum(f[key]);
    if (v !== null && v > 100) w.push(`${FIELDS.find((x) => x.key === key).label}: ${fmt(v)} g su 100 g è impossibile`);
  });
  if (k !== null && k > 1000) w.push('Kcal oltre 1000 per 100 g: impossibile');
  if (c !== null && z !== null && z > c + 0.5) w.push('Zuccheri maggiori dei carboidrati');
  if (g !== null && s !== null && s > g + 0.5) w.push('Saturi maggiori dei grassi');
  if ((c || 0) + (p || 0) + (g || 0) + (fi || 0) > 100.5) w.push('Carboidrati + proteine + grassi + fibre superano 100 g');
  if (k && c !== null && p !== null && g !== null) {
    const exp = 4 * p + 4 * c + 9 * g + 2 * (fi || 0);
    if (Math.abs(exp - k) > 25 && Math.abs(exp - k) / Math.max(k, exp) > 0.2) w.push(`Kcal non coerenti con i macro (dai macro ~${fmt0(exp)} kcal)`);
  }
  return w;
};

// ------------------------------------------------------------------ CSV / Notion / Excel

/** legge un CSV (separatore , ; o tab, virgolette, BOM) → array di righe */
export const parseCSV = (text) => {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/).find((l) => l.trim()) || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of firstLine) { if (ch === '"') inQ = !inQ; else if (!inQ && ch in counts) counts[ch] += 1; }
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
  const rows = []; let row = []; let cell = ''; inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return { rows: rows.filter((r) => r.some((c) => String(c).trim() !== '')), sep };
};

const SYNONYMS = {
  name: ['alimento', 'alimenti', 'nome', 'name', 'food', 'descrizione', 'prodotto', 'nome alimento'],
  kcal: ['kcal', 'calorie', 'energia', 'energia kcal', 'cal', 'kcal 100g', 'calorie kcal', 'energy'],
  carbs: ['carboidrati', 'carbo', 'carboidrati disponibili', 'cho', 'carbs', 'carbohydrates', 'carboidrati g'],
  sugars: ['zuccheri', 'di cui zuccheri', 'zuccheri solubili', 'sugar', 'sugars', 'zuccheri g'],
  protein: ['proteine', 'prot', 'protein', 'proteins', 'proteine g'],
  fat: ['grassi', 'lipidi', 'fat', 'fats', 'grassi g', 'grassi totali'],
  saturated: ['saturi', 'grassi saturi', 'di cui saturi', 'acidi grassi saturi', 'saturated'],
  fiber: ['fibra', 'fibre', 'fibra totale', 'fibre totali', 'fiber', 'fibra alimentare'],
  sodium: ['sodio', 'sale', 'sale in mg', 'sodio mg', 'sodium', 'sale mg'],
  notes: ['note', 'notes', 'commento'],
};
export const IMPORT_TARGETS = [
  { key: 'name', label: 'Alimento' }, ...FIELDS.map((f) => ({ key: f.key, label: f.label })), { key: 'notes', label: 'Note' },
];

/** abbina le intestazioni del file ai campi dell'app */
export const guessMapping = (headers) => {
  const used = new Set();
  return headers.map((h) => {
    const n = norm(h).replace(/\b(per )?100 ?g\b/g, '').replace(/\s+/g, ' ').trim();
    let best = '';
    Object.entries(SYNONYMS).forEach(([key, list]) => {
      if (best || used.has(key)) return;
      if (list.includes(n)) best = key;
    });
    if (!best) {
      Object.entries(SYNONYMS).forEach(([key, list]) => {
        if (best || used.has(key)) return;
        if (list.some((s) => n.startsWith(s) || (s.length > 4 && n.includes(s)))) best = key;
      });
    }
    if (best) used.add(best);
    return best;
  });
};

/** righe + abbinamento → alimenti pronti da importare */
export const rowsToFoods = (rows, mapping, { stripCopySuffix = true } = {}) => {
  const out = []; const empty = [];
  rows.forEach((r) => {
    const f = {};
    mapping.forEach((key, i) => { if (key) f[key] = r[i]; });
    let name = String(f.name || '').replace(/\s+/g, ' ').trim();
    if (stripCopySuffix) name = name.replace(/\s*\(\d+\)\s*$/, '').trim();
    const food = { name };
    FIELD_KEYS.forEach((k) => { food[k] = parseNum(f[k]); });
    if (f.notes) food.notes = String(f.notes).trim();
    const hasValues = FIELD_KEYS.some((k) => food[k] !== null);
    if (!name) return;
    if (!hasValues) { empty.push(name); return; }
    out.push(food);
  });
  return { foods: out, empty };
};

export const foodsToCSV = (foods) => {
  const head = ['Alimento', ...FIELDS.map((f) => f.label), 'Note', 'Fonte'];
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [head.join(';')];
  foods.forEach((f) => lines.push([f.name, ...FIELD_KEYS.map((k) => (f[k] === null || f[k] === undefined ? '' : String(f[k]).replace('.', ','))), f.notes || '', f.source || ''].map(esc).join(';')));
  return '﻿' + lines.join('\r\n');
};

// ------------------------------------------------------------------ alternative ed equivalenze

/** macro principale di un alimento (quello che porta più calorie) */
export const dominantMacro = (f) => {
  const e = { carbs: (parseNum(f.carbs) || 0) * 4, protein: (parseNum(f.protein) || 0) * 4, fat: (parseNum(f.fat) || 0) * 9 };
  const best = Object.entries(e).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
};

/** stessa "impronta" di valori: lo stesso alimento salvato con due nomi (es. copiato dal CREA) */
export const valueKey = (f) => ['kcal', 'carbs', 'protein', 'fat'].map((k) => Math.round((parseNum(f?.[k]) || 0) * 10)).join('|');

/** tiene solo il primo alimento per ogni impronta di valori */
export const uniqueByValues = (list, get = (x) => x, skip = new Set()) => {
  const seen = new Set(skip);
  return list.filter((x) => { const k = valueKey(get(x)); if (seen.has(k)) return false; seen.add(k); return true; });
};

const roundG = (g) => (g < 20 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5);

/** grammi di un alimento per coprire "amount" g di un macro */
export const gramsForMacro = (food, macro, amount) => {
  const per = parseNum(food?.[macro]);
  if (!per || per <= 0) return null;
  return roundG((parseNum(amount) || 0) / per * 100);
};

/**
 * Alternative a pari macro principale: stessi grammi di carboidrati/proteine/grassi,
 * ordinate per somiglianza di calorie, altri macro e zuccheri.
 */
export const alternativesFor = (item, foods, n = 5) => {
  const per = item.per100 || item;
  const macro = dominantMacro(per);
  if (!macro) return [];
  const grams = parseNum(item.grams) || 100;
  const base = valuesFor(per, grams);
  const target = base[macro];
  if (!target) return [];
  const selfKey = norm(item.name);
  const cands = foods.filter((f) => norm(f.name) !== selfKey && dominantMacro(f) === macro && parseNum(f[macro]) > 0);
  return uniqueByValues(cands, (f) => f, new Set([valueKey(per)]))
    .map((f) => {
      const g = gramsForMacro(f, macro, target);
      const v = valuesFor(per100Of(f), g);
      const err = Math.abs(v.kcal - base.kcal) / Math.max(base.kcal, 1)
        + (macro !== 'protein' ? Math.abs(v.protein - base.protein) / 25 : 0)
        + (macro !== 'fat' ? Math.abs(v.fat - base.fat) / 10 : 0)
        + (macro !== 'carbs' ? Math.abs(v.carbs - base.carbs) / 30 : 0)
        + Math.abs(v.sugars - base.sugars) / 8
        + (g > 600 ? 1 : 0);
      return { id: f.id, name: f.name, grams: g, source: f.source, ...v, dk: v.kcal - base.kcal, err };
    })
    .sort((a, b) => a.err - b.err)
    .slice(0, n);
};

export const altToSaved = (a) => ({
  name: a.name, grams: a.grams, source: a.source || null, kcal: Math.round(a.kcal), carbs: +a.carbs.toFixed(1), sugars: +a.sugars.toFixed(1),
  protein: +a.protein.toFixed(1), fat: +a.fat.toFixed(1),
});

/** ricerca nel database (nome senza accenti, tutte le parole) */
export const searchFoods = (foods, q, limit = 8) => {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  return foods
    .map((f) => ({ f, n: norm(f.name) }))
    .filter(({ n }) => words.every((w) => n.includes(w)))
    .sort((a, b) => (Number(!a.n.startsWith(words[0])) - Number(!b.n.startsWith(words[0]))) || a.n.length - b.n.length)
    .slice(0, limit)
    .map(({ f }) => f);
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const DEFAULT_MEALS = ['Colazione', 'Spuntino', 'Pranzo', 'Merenda', 'Cena'];
export const newDay = (name = 'Giorno') => ({ id: uid(), name, targets: {}, meals: DEFAULT_MEALS.map((m) => ({ id: uid(), name: m, items: [] })) });
export const emptyPlan = () => ({
  mode: 'dieta', start_date: null, notes: '', show_food_macros: false,
  days: [newDay('Giorno di allenamento')],
  macro: {
    days: [{ id: uid(), name: 'Giorno di allenamento' }, { id: uid(), name: 'Giorno di riposo' }],
    split: [{ meal: 'Colazione', pct: 25 }, { meal: 'Spuntino', pct: 10 }, { meal: 'Pranzo', pct: 30 }, { meal: 'Merenda', pct: 10 }, { meal: 'Cena', pct: 25 }],
    equivalents: [{ macro: 'carbs', amount: 30, items: [] }, { macro: 'protein', amount: 25, items: [] }, { macro: 'fat', amount: 10, items: [] }],
  },
});
export const CREA_CITATION = 'Valori nutrizionali: CREA - Centro di ricerca Alimenti e Nutrizione, www.alimentinutrizione.it';
