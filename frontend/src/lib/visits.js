// =====================================================================
//  Visite: campi, calcoli (BMI, rapporti, % grasso stimata) e PDF della visita
// =====================================================================

export const CIRC_FIELDS = [
  { key: 'collo', label: 'Collo' },
  { key: 'torace', label: 'Torace' },
  { key: 'vita', label: 'Vita' },
  { key: 'addome', label: 'Addome (ombelico)' },
  { key: 'fianchi', label: 'Fianchi' },
  { key: 'braccio_dx', label: 'Braccio dx' },
  { key: 'braccio_sx', label: 'Braccio sx' },
  { key: 'coscia_dx', label: 'Coscia dx' },
  { key: 'coscia_sx', label: 'Coscia sx' },
  { key: 'polpaccio_dx', label: 'Polpaccio dx' },
  { key: 'polpaccio_sx', label: 'Polpaccio sx' },
];

export const CHART_MEASURES = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  ...CIRC_FIELDS.map((f) => ({ key: f.key, label: f.label, unit: 'cm' })),
];

export const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const fmt = (n, digits = 1) => (n === null || n === undefined ? '—' : (Math.round(n * 10 ** digits) / 10 ** digits).toLocaleString('it-IT'));

export const formatDate = (d) => {
  if (!d) return '';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return day && m && y ? `${day}/${m}/${y}` : String(d);
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Valore di una misura in una visita: metro se presente, altrimenti stima da foto */
export const measureValue = (visit, key) => {
  if (!visit) return null;
  if (key === 'weight') return num(visit.weight);
  return num(visit.circumferences?.[key]) ?? null;
};

export const bmi = (weight, height) => {
  const w = num(weight);
  const h = num(height);
  return w && h ? w / ((h / 100) ** 2) : null;
};

/** % grasso stimata con la formula della Marina USA (solo circonferenze + altezza) */
export const navyBodyFat = ({ sex, height, neck, waist, hips }) => {
  const h = num(height);
  const n = num(neck);
  const w = num(waist);
  const hp = num(hips);
  if (!h || !n || !w) return null;
  let bf = null;
  if (sex === 'M' && w > n) bf = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
  if (sex === 'F' && hp && w + hp > n) bf = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) - 450;
  return bf !== null && bf > 2 && bf < 60 ? bf : null;
};

/** Indici calcolati di una visita (usa il metro; se manca, la stima da foto) */
export const visitIndexes = (v) => {
  const c = v?.circumferences || {};
  const e = v?.photo_estimates || {};
  const pick = (k) => num(c[k]) ?? num(e[k]);
  const waist = pick('vita');
  const hips = pick('fianchi');
  const h = num(v?.height);
  const waistForNavy = v?.sex === 'M' ? (pick('addome') ?? waist) : waist;
  return {
    bmi: bmi(v?.weight, v?.height),
    whr: waist && hips ? waist / hips : null,
    whtr: waist && h ? waist / h : null,
    bodyFat: navyBodyFat({ sex: v?.sex, height: h, neck: pick('collo'), waist: waistForNavy, hips }),
    fromPhotos: !num(c.vita) && !!num(e.vita),
  };
};

// ------------------------------------------------------------------ PDF della visita

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const deltaSpan = (cur, prev, unit, lowerIsGood = null) => {
  if (cur === null || prev === null || cur === undefined || prev === undefined) return '<span style="color:#999">—</span>';
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return '<span style="color:#666">=</span>';
  const sign = d > 0 ? '+' : '';
  let color = '#334155';
  if (lowerIsGood !== null) color = (d < 0) === lowerIsGood ? '#15803d' : '#b91c1c';
  return `<span style="color:${color};font-weight:bold;">${sign}${fmt(d)}${unit}</span>`;
};

/** Piccolo grafico SVG (dentro il PDF, nessuna libreria) */
const svgChart = (points, label, unit, color) => {
  if (points.length < 2) return '';
  const W = 320;
  const H = 130;
  const pl = 36;
  const pr = 12;
  const pt = 22;
  const pb = 26;
  const vals = points.map((p) => p.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;
  const x = (i) => pl + (i * (W - pl - pr)) / (points.length - 1);
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3" fill="${color}"/>`).join('');
  const lastI = points.length - 1;
  const labels = [0, lastI].map((i) => `<text x="${x(i).toFixed(1)}" y="${(y(points[i].v) - 7).toFixed(1)}" font-size="10" text-anchor="middle" fill="#111">${fmt(points[i].v)}</text>`).join('');
  const dates = [0, lastI].map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="9" text-anchor="${i ? 'end' : 'start'}" fill="#666">${esc(formatDate(points[i].d))}</text>`).join('');
  return `<div style="display:inline-block;margin:0 12px 12px 0;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;">
    <div style="font-size:11px;font-weight:bold;color:#333;">${esc(label)} (${unit})</div>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}" stroke="#e2e8f0"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>${dots}${labels}${dates}
    </svg></div>`;
};

/**
 * Crea il "PDF" della visita: una pagina HTML stampabile (Salva come PDF) con dentro le foto.
 * visit = visita corrente; history = tutte le visite dell'atleta (qualsiasi ordine); photos = { front, side } data URL
 */
export const buildVisitReport = ({ visit, history = [], athleteName, photos = {}, photoWarnings = [] }) => {
  const sorted = [...history.filter((h) => h.id !== visit.id), visit]
    .filter((h) => h.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const idx = sorted.findIndex((h) => h === visit);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const upTo = sorted.slice(0, idx + 1);
  const ix = visitIndexes(visit);
  const c = visit.circumferences || {};
  const e = visit.photo_estimates || {};
  const pc = prev?.circumferences || {};

  const card = (title, value, sub = '') => `<div style="flex:1 1 130px;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;">
      <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.04em;">${title}</div>
      <div style="font-size:20px;font-weight:bold;margin-top:2px;">${value}</div>
      ${sub ? `<div style="font-size:10px;color:#666;margin-top:2px;">${sub}</div>` : ''}</div>`;

  const cards = [
    card('Peso', num(visit.weight) ? `${fmt(num(visit.weight))} kg` : '—', prev ? `vs ${esc(formatDate(prev.date))}: ${deltaSpan(num(visit.weight), num(prev.weight), ' kg')}` : 'prima visita'),
    card('Altezza', num(visit.height) ? `${fmt(num(visit.height), 0)} cm` : '—'),
    card('BMI', ix.bmi ? fmt(ix.bmi) : '—'),
    card('Vita / fianchi', ix.whr ? fmt(ix.whr, 2) : '—'),
    card('Vita / altezza', ix.whtr ? fmt(ix.whtr, 2) : '—', ix.whtr ? (ix.whtr < 0.5 ? 'nella norma (&lt; 0,50)' : 'sopra 0,50') : ''),
    ix.bodyFat ? card('% grasso stimata', `${fmt(ix.bodyFat)}%`, `formula US Navy${ix.fromPhotos ? ', da foto' : ''}`) : '',
  ].join('');

  const rows = [
    ...CIRC_FIELDS.map((f) => ({ ...f, tape: num(c[f.key]), prevTape: num(pc[f.key]), est: num(e[f.key]) })),
    { key: 'spalle', label: 'Spalle (larghezza)', tape: null, prevTape: null, est: num(e.spalle) },
  ].filter((r) => r.tape !== null || r.est !== null);

  const td = 'border:1px solid #e2e8f0;padding:5px 8px;font-size:12px;';
  const table = rows.length === 0 ? '<p>Nessuna misura inserita.</p>' :
    `<table style="border-collapse:collapse;width:100%;"><thead><tr>
      <th style="${td}background:#0f172a;color:#fff;text-align:left;">Misura</th>
      <th style="${td}background:#0f172a;color:#fff;">Metro (cm)</th>
      <th style="${td}background:#0f172a;color:#fff;">${prev ? `Variazione vs ${esc(formatDate(prev.date))}` : 'Variazione'}</th>
      <th style="${td}background:#334155;color:#fff;">Stima da foto (cm)</th>
    </tr></thead><tbody>${rows.map((r) => `<tr>
      <td style="${td}"><strong>${esc(r.label)}</strong></td>
      <td style="${td}text-align:center;">${r.tape !== null ? fmt(r.tape) : '—'}</td>
      <td style="${td}text-align:center;">${r.tape !== null && r.prevTape !== null ? deltaSpan(r.tape, r.prevTape, ' cm') : '<span style="color:#999">—</span>'}</td>
      <td style="${td}text-align:center;color:#475569;">${r.est !== null ? fmt(r.est) : '—'}</td>
    </tr>`).join('')}</tbody></table>`;

  const series = (key, getter) => upTo.map((h) => ({ d: h.date, v: getter(h, key) })).filter((p) => p.v !== null);
  const charts = [
    svgChart(series('weight', (h) => num(h.weight)), 'Peso', 'kg', '#2563eb'),
    svgChart(series('vita', (h) => num(h.circumferences?.vita)), 'Vita', 'cm', '#dc2626'),
    svgChart(series('fianchi', (h) => num(h.circumferences?.fianchi)), 'Fianchi', 'cm', '#ea580c'),
  ].join('');

  const photoBlock = (photos.front || photos.side) ? `
    <h2>📸 Foto ${visit.source === 'athlete' ? 'inviate dall\'atleta' : 'della visita'}</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${photos.front ? `<img data-lc-photo="front" src="${photos.front}" style="max-width:48%;max-height:520px;border-radius:8px;border:1px solid #e2e8f0;">` : ''}
      ${photos.side ? `<img data-lc-photo="side" src="${photos.side}" style="max-width:48%;max-height:520px;border-radius:8px;border:1px solid #e2e8f0;">` : ''}
    </div>
    ${photoWarnings.length ? `<ul style="color:#92400e;font-size:11px;">${photoWarnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}` : '';

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${visit.source === 'athlete' ? 'Misurazione da casa' : 'Visita'} ${esc(formatDate(visit.date))} - ${esc(athleteName)}</title>
<style>body{font-family:Arial,sans-serif;margin:20px;color:#111;background:#fff;max-width:900px;}
h1{font-size:20px;margin:0 0 2px;}h2{font-size:14px;margin:22px 0 8px;border-bottom:2px solid #0f172a;padding-bottom:3px;}
p{font-size:12px;color:#444;margin:0 0 8px;}
.noprint{margin:0 0 16px;padding:8px 14px;border:0;border-radius:6px;background:#111;color:#fff;font-size:13px;cursor:pointer;}
@media print{body{margin:10px;}.noprint{display:none;}h2{page-break-after:avoid;}img{page-break-inside:avoid;}}</style></head><body>
<button class="noprint" onclick="window.print()">🖨️ Stampa / Salva come PDF</button>
<h1>${visit.source === 'athlete' ? 'Misurazione da casa del' : 'Visita del'} ${esc(formatDate(visit.date))}</h1>${visit.source === 'athlete' ? '<p style="color:#15803d;">Fatta dall\'atleta con le foto: misure calcolate sul suo telefono.</p>' : ''}
<p>Atleta: <strong>${esc(athleteName)}</strong> &middot; visita n° ${idx + 1} di ${sorted.length} &middot; LC Performance</p>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${cards}</div>
<h2>📏 Circonferenze</h2>${table}
${rows.some((r) => r.est !== null) ? '<p style="font-size:10px;color:#666;margin-top:6px;">Stima da foto: calcolata dalla sagoma nelle foto frontale e di profilo, usando l\'altezza come riferimento. È una stima (errore di qualche cm): il valore di riferimento è quello col metro. Utile per seguire l\'andamento con foto sempre fatte allo stesso modo.</p>' : ''}
${visit.notes ? `<h2>📝 ${visit.source === 'athlete' ? 'Note dell\'atleta' : 'Cosa è emerso dalla visita'}</h2><div style="font-size:13px;white-space:pre-wrap;line-height:1.5;">${esc(visit.notes)}</div>` : ''}
${charts ? `<h2>📈 Andamento</h2><div>${charts}</div>` : ''}
${photoBlock}
</body></html>`;
  return 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(html)));
};

/** Decodifica il report (data URL base64 → HTML) */
export const decodeReport = (dataUrl) => {
  const b64 = String(dataUrl).split(',')[1] || '';
  return decodeURIComponent(escape(atob(b64)));
};

/** Recupera le foto già salvate in un report (per non perderle quando si modifica la visita) */
export const extractReportPhotos = (dataUrl) => {
  try {
    const html = decodeReport(dataUrl);
    const out = {};
    const re = /<img data-lc-photo="(front|side)" src="(data:image\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html))) out[m[1]] = m[2];
    return out;
  } catch {
    return {};
  }
};

/** Apre il report in una finestra (passare una finestra già aperta al tocco, per i telefoni) */
export const openReport = (dataUrl, win) => {
  const html = decodeReport(dataUrl);
  const w = win || window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
};
