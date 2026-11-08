// =====================================================================
//  Stima delle misure antropometriche da foto (frontale + profilo)
//
//  Come funziona:
//  1. Un modello di riconoscimento della postura (MediaPipe Pose, gira nel browser,
//     le foto NON vengono inviate a nessun server) trova i punti del corpo
//     (spalle, anche, ginocchia...) e la sagoma della persona.
//  2. L'altezza reale dell'atleta trasforma i pixel in centimetri.
//  3. Per ogni misura si legge la larghezza della sagoma nella foto frontale e la
//     profondità nella foto di profilo, alla stessa altezza del corpo.
//  4. La circonferenza si stima come un'ellisse con quei due diametri.
//
//  Sono STIME: utili soprattutto per seguire l'andamento nel tempo con foto fatte
//  sempre allo stesso modo. Il metro resta il riferimento.
// =====================================================================

// Il modello è ospitato DENTRO l'app (cartella public/mediapipe/pose): nessun servizio esterno,
// le foto restano sul computer di chi fa l'analisi.
export const POSE_VERSION = '0.5.1675469404';
export const POSE_BASE = `${process.env.PUBLIC_URL || ''}/mediapipe/pose`;

// Indici dei punti del corpo (MediaPipe Pose)
const LM = {
  nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
};

export const ESTIMATE_FIELDS = [
  { key: 'collo', label: 'Collo' },
  { key: 'spalle', label: 'Spalle (larghezza)', isWidth: true },
  { key: 'torace', label: 'Torace' },
  { key: 'vita', label: 'Vita' },
  { key: 'fianchi', label: 'Fianchi' },
  { key: 'braccio_dx', label: 'Braccio dx' },
  { key: 'braccio_sx', label: 'Braccio sx' },
  { key: 'coscia_dx', label: 'Coscia dx' },
  { key: 'coscia_sx', label: 'Coscia sx' },
  { key: 'polpaccio_dx', label: 'Polpaccio dx' },
  { key: 'polpaccio_sx', label: 'Polpaccio sx' },
];

// Rapporto tipico profondità/larghezza, usato solo se manca la foto di profilo
const FALLBACK_DEPTH_RATIO = { collo: 0.95, torace: 0.72, vita: 0.75, fianchi: 0.78, coscia: 0.95, polpaccio: 1.0 };

const COLORS = {
  collo: '#a855f7', spalle: '#64748b', torace: '#3b82f6', vita: '#ef4444', fianchi: '#f97316',
  braccio: '#14b8a6', coscia: '#22c55e', polpaccio: '#eab308',
};

// ------------------------------------------------------------------ matematica

/** Circonferenza di un'ellisse (approssimazione di Ramanujan). a, b = diametri */
export const ellipseCircumference = (width, depth) => {
  const a = width / 2;
  const b = depth / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
};

const round1 = (n) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10) / 10);

const at = (mask, w, x, y) => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= w || yi * w + xi >= mask.length) return 0;
  return mask[yi * w + xi];
};

/** Tratti continui di sagoma su una riga: [[x0, x1], ...] */
const rowRuns = (mask, w, y) => {
  const runs = [];
  const yi = Math.round(y);
  if (yi < 0 || yi * w >= mask.length) return runs;
  let start = -1;
  const off = yi * w;
  for (let x = 0; x < w; x++) {
    const on = mask[off + x] === 1;
    if (on && start < 0) start = x;
    if (!on && start >= 0) { runs.push([start, x - 1]); start = -1; }
  }
  if (start >= 0) runs.push([start, w - 1]);
  return runs;
};

/** Tratto che contiene x (tollera piccoli buchi della sagoma) */
const runAt = (mask, w, y, x, tol = 3) => {
  const runs = rowRuns(mask, w, y);
  return runs.find(([a, b]) => x >= a - tol && x <= b + tol) || null;
};

const widestRun = (mask, w, y) => {
  const runs = rowRuns(mask, w, y);
  let best = null;
  runs.forEach((r) => { if (!best || r[1] - r[0] > best[1] - best[0]) best = r; });
  return best;
};

const runWidth = (r) => (r ? r[1] - r[0] + 1 : 0);
const median = (arr) => {
  const s = arr.filter((v) => v > 0).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Larghezza mediana su 5 righe vicine (più stabile) */
const stableWidthAt = (mask, w, y, xFn) => {
  const vals = [];
  for (let dy = -2; dy <= 2; dy++) {
    const yy = y + dy;
    const r = xFn ? runAt(mask, w, yy, xFn(yy)) : widestRun(mask, w, yy);
    vals.push(runWidth(r));
  }
  return median(vals);
};

/** Cerca la riga con larghezza minima/massima in un intervallo */
const searchRows = (mask, w, y0, y1, xFn, mode, filter) => {
  let best = null;
  const from = Math.round(Math.min(y0, y1));
  const to = Math.round(Math.max(y0, y1));
  for (let y = from; y <= to; y++) {
    const x = xFn(y);
    const r = runAt(mask, w, y, x);
    if (!r) continue;
    if (filter && !filter(y, r)) continue;
    const width = stableWidthAt(mask, w, y, xFn);
    if (!width) continue;
    if (!best || (mode === 'min' ? width < best.width : width > best.width)) best = { y, width, run: r };
  }
  return best;
};

/** Prima e ultima riga occupate dalla sagoma (testa e piedi) nella fascia di colonne del corpo */
const verticalBounds = (mask, w, h, xMin, xMax) => {
  const x0 = Math.max(0, Math.floor(xMin));
  const x1 = Math.min(w - 1, Math.ceil(xMax));
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    let count = 0;
    for (let x = x0; x <= x1; x++) if (mask[y * w + x]) count++;
    if (count >= 2) { if (top < 0) top = y; bottom = y; }
  }
  return { top, bottom };
};

const lerp = (a, b, t) => a + (b - a) * t;
const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/** Larghezza di un segmento corporeo inclinato (braccio): misura perpendicolare alla direzione del segmento */
const perpendicularWidth = (mask, w, p, q, t) => {
  const cx = lerp(p.x, q.x, t);
  const cy = lerp(p.y, q.y, t);
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // parti da un punto dentro la sagoma vicino al centro del segmento
  let sx = cx;
  let sy = cy;
  if (!at(mask, w, sx, sy)) {
    let found = false;
    for (let s = 1; s < len * 0.25 && !found; s++) {
      for (const sign of [1, -1]) {
        if (at(mask, w, cx + nx * s * sign, cy + ny * s * sign)) { sx = cx + nx * s * sign; sy = cy + ny * s * sign; found = true; break; }
      }
    }
    if (!found) return null;
  }
  let a = 0;
  while (at(mask, w, sx + nx * (a + 1), sy + ny * (a + 1)) && a < len * 2) a++;
  let b = 0;
  while (at(mask, w, sx - nx * (b + 1), sy - ny * (b + 1)) && b < len * 2) b++;
  return {
    width: a + b + 1,
    p1: { x: sx + nx * a, y: sy + ny * a },
    p2: { x: sx - nx * b, y: sy - ny * b },
  };
};

// ------------------------------------------------------------------ misure

/**
 * Calcola le misure a partire dai dati già estratti.
 * front/side = { mask: Uint8Array (1 = persona), w, h, lm: [{x, y, v}] in pixel }
 * side può essere null (solo foto frontale: circonferenze meno affidabili).
 * Funzione "pura": niente browser, testabile.
 */
export const measureFromData = (front, side, heightCm) => {
  const warnings = [];
  if (!front || !front.lm || front.lm.length < 29) throw new Error('Nella foto frontale non trovo la persona. Usa una foto a figura intera, ben illuminata.');
  if (!heightCm || heightCm < 100 || heightCm > 230) throw new Error("Inserisci l'altezza dell'atleta (cm): serve per convertire la foto in centimetri.");

  const { mask, w, h, lm } = front;
  const P = (i) => lm[i];
  const vis = (i) => (lm[i]?.v ?? 1);

  const keyPoints = [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle];
  if (keyPoints.some((i) => vis(i) < 0.3)) warnings.push('Alcune parti del corpo non sono ben visibili: controlla che la persona sia intera e frontale.');

  const xs = lm.filter((p) => p).map((p) => p.x);
  const span = Math.max(...xs) - Math.min(...xs);
  const { top, bottom } = verticalBounds(mask, w, h, Math.min(...xs) - span * 0.6, Math.max(...xs) + span * 0.6);
  if (top < 0 || bottom - top < h * 0.3) throw new Error('La sagoma della persona non è chiara. Usa uno sfondo uniforme e abbigliamento aderente.');
  if (top <= 1 || bottom >= h - 2) warnings.push('La persona tocca il bordo della foto: testa e piedi devono essere interamente visibili.');

  const bodyPx = bottom - top;
  const cmPerPx = heightCm / bodyPx;

  const sh = mid(P(LM.lShoulder), P(LM.rShoulder));
  const hip = mid(P(LM.lHip), P(LM.rHip));
  const knee = mid(P(LM.lKnee), P(LM.rKnee));
  const nose = P(LM.nose);
  const T = hip.y - sh.y;
  if (T <= bodyPx * 0.1) throw new Error('Postura non riconosciuta: serve una foto frontale in piedi.');

  // asse centrale del busto (da metà spalle a metà anche)
  const centerX = (y) => {
    if (y <= sh.y) return sh.x;
    if (y >= hip.y) return hip.x;
    return lerp(sh.x, hip.x, (y - sh.y) / T);
  };

  // mani appoggiate ai fianchi = larghezza falsata
  const wrists = [P(LM.lWrist), P(LM.rWrist)];
  const handTouches = (y, run) => wrists.some((wr) => wr && Math.abs(wr.y - y) < bodyPx * 0.05 && wr.x >= run[0] - 2 && wr.x <= run[1] + 2);
  let handsWarned = false;
  const torsoFilter = (y, run) => {
    if (handTouches(y, run)) {
      if (!handsWarned) { warnings.push('Le mani sembrano toccare il corpo: le braccia devono essere leggermente aperte (posa ad "A").'); handsWarned = true; }
      return false;
    }
    return true;
  };

  const levels = {}; // y nella foto frontale
  const widths = {}; // pixel
  const lines = []; // linee da disegnare sulla foto frontale

  // Collo: punto più stretto tra mento e spalle
  // (si parte da metà tra naso e spalle: più in alto c'è la mandibola)
  const neckFilter = (y, r) => runWidth(r) > bodyPx * 0.035;
  const neck = searchRows(mask, w, nose.y + (sh.y - nose.y) * 0.55, sh.y - (sh.y - nose.y) * 0.1, centerX, 'min', neckFilter);
  if (neck) { levels.collo = neck.y; widths.collo = neck.width; lines.push({ key: 'collo', y: neck.y, x0: neck.run[0], x1: neck.run[1] }); }

  // Spalle (deltoidi): punto più largo all'altezza delle spalle
  const shoulders = searchRows(mask, w, sh.y - T * 0.03, sh.y + T * 0.06, centerX, 'max');
  if (shoulders) { widths.spalle = shoulders.width; lines.push({ key: 'spalle', y: shoulders.y, x0: shoulders.run[0], x1: shoulders.run[1] }); }

  // Braccia: larghezza perpendicolare al braccio, in più punti tra spalla e gomito.
  // Vicino alla spalla il braccio può "fondersi" col busto: scarto i valori anomali.
  const armMeasure = (shI, elI, key) => {
    if (vis(shI) < 0.3 || vis(elI) < 0.3) return;
    const samples = [];
    for (let t = 0.45; t <= 0.8; t += 0.05) {
      const r = perpendicularWidth(mask, w, P(shI), P(elI), t);
      if (r && r.width < bodyPx * 0.09) samples.push(r);
    }
    if (!samples.length) return;
    const minW = Math.min(...samples.map((r) => r.width));
    const valid = samples.filter((r) => r.width <= minW * 1.35);
    const best = valid.reduce((m, r) => (r.width > m.width ? r : m), valid[0]);
    widths[key] = best.width;
    lines.push({ key, p1: best.p1, p2: best.p2 });
  };
  armMeasure(LM.rShoulder, LM.rElbow, 'braccio_dx');
  armMeasure(LM.lShoulder, LM.lElbow, 'braccio_sx');
  if (!widths.braccio_dx || !widths.braccio_sx) warnings.push('Braccia: per misurarle devono essere staccate dal busto (posa ad "A").');

  // Toglie dal tratto del busto un braccio eventualmente attaccato (all'altezza delle ascelle)
  const armHalf = ((widths.braccio_dx || 0) + (widths.braccio_sx || 0)) / ((widths.braccio_dx ? 1 : 0) + (widths.braccio_sx ? 1 : 0) || 1) / 2 || bodyPx * 0.025;
  const trimArms = (y, run) => {
    let [x0, x1] = run;
    let trimmed = false;
    [[LM.rShoulder, LM.rElbow], [LM.lShoulder, LM.lElbow]].forEach(([a1, b1]) => {
      const A1 = P(a1);
      const B1 = P(b1);
      if (y < A1.y || y > B1.y) return;
      const ax = lerp(A1.x, B1.x, (y - A1.y) / ((B1.y - A1.y) || 1));
      if (ax > x0 && ax < x1) {
        if (ax < centerX(y)) x0 = Math.max(x0, ax + armHalf); else x1 = Math.min(x1, ax - armHalf);
        trimmed = true;
      }
    });
    return { run: [x0, x1], trimmed };
  };

  // Torace: livello fisso sotto le ascelle (le braccia attaccate vengono escluse)
  const chestY = sh.y + T * 0.3;
  const chestRun = runAt(mask, w, chestY, centerX(chestY));
  if (chestRun) {
    const vals = [];
    let anyTrim = false;
    let lastRun = chestRun;
    for (let dy = -2; dy <= 2; dy++) {
      const r = runAt(mask, w, chestY + dy, centerX(chestY + dy));
      if (!r) continue;
      const t2 = trimArms(chestY + dy, r);
      anyTrim = anyTrim || t2.trimmed;
      vals.push(runWidth(t2.run));
      if (dy === 0) lastRun = t2.run;
    }
    levels.torace = chestY;
    widths.torace = median(vals);
    lines.push({ key: 'torace', y: chestY, x0: lastRun[0], x1: lastRun[1] });
    if (anyTrim) warnings.push('Torace: le braccia toccano il busto all\'altezza del petto, misura corretta in automatico (meno precisa).');
  }

  // Vita: punto più stretto del busto
  const waist = searchRows(mask, w, sh.y + T * 0.5, sh.y + T * 0.92, centerX, 'min', torsoFilter);
  if (waist) { levels.vita = waist.y; widths.vita = waist.width; lines.push({ key: 'vita', y: waist.y, x0: waist.run[0], x1: waist.run[1] }); }

  // Fianchi: punto più largo tra anca e inizio coscia
  const hipsSearch = searchRows(mask, w, hip.y - T * 0.12, hip.y + (knee.y - hip.y) * 0.4, centerX, 'max', torsoFilter);
  if (hipsSearch) { levels.fianchi = hipsSearch.y; widths.fianchi = hipsSearch.width; lines.push({ key: 'fianchi', y: hipsSearch.y, x0: hipsSearch.run[0], x1: hipsSearch.run[1] }); }

  // Gambe: coscia (parte alta) e polpaccio (punto più largo)
  // In foto frontale la gamba destra dell'atleta è a sinistra nell'immagine: usiamo i punti del modello, non la posizione.
  let legsTouchWarned = false;
  // startI/endI = segmento della gamba (anca→ginocchio o ginocchio→caviglia); oStart/oEnd = stesso segmento dell'altra gamba
  const legMeasure = (key, startI, endI, oStartI, oEndI, from, to) => {
    const A = P(startI);
    const B = P(endI);
    const OA = P(oStartI);
    const OB = P(oEndI);
    const segX = (p, q, y) => lerp(p.x, q.x, (y - p.y) / ((q.y - p.y) || 1));
    let separated = null; // righe in cui la gamba è staccata dall'altra (misura affidabile)
    let merged = null; // righe con gambe a contatto (si divide a metà)
    for (let y = Math.round(lerp(A.y, B.y, from)); y <= Math.round(lerp(A.y, B.y, to)); y++) {
      const x = segX(A, B, y);
      const r = runAt(mask, w, y, x);
      if (!r) continue;
      const otherX = segX(OA, OB, y);
      if (otherX >= r[0] && otherX <= r[1]) {
        const split = (x + otherX) / 2;
        const cand = x < otherX ? { y, width: split - r[0], x0: r[0] } : { y, width: r[1] - split, x0: split };
        if (!merged || cand.width > merged.width) merged = cand;
      } else {
        const cand = { y, width: runWidth(r), x0: r[0] };
        if (!separated || cand.width > separated.width) separated = cand;
      }
    }
    const best = separated || merged;
    if (!separated && merged && !legsTouchWarned) {
      warnings.push("Le gambe si toccano: per cosce e polpacci tieni i piedi un po' divaricati nella foto frontale.");
      legsTouchWarned = true;
    }
    if (best) {
      levels[key] = best.y;
      widths[key] = best.width;
      lines.push({ key, y: best.y, x0: best.x0, x1: best.x0 + best.width - 1 });
    }
  };
  // dx = destra dell'atleta (punti "right" del modello): nella foto frontale appare a sinistra
  legMeasure('coscia_dx', LM.rHip, LM.rKnee, LM.lHip, LM.lKnee, 0.22, 0.5);
  legMeasure('coscia_sx', LM.lHip, LM.lKnee, LM.rHip, LM.rKnee, 0.22, 0.5);
  legMeasure('polpaccio_dx', LM.rKnee, LM.rAnkle, LM.lKnee, LM.lAnkle, 0.15, 0.55);
  legMeasure('polpaccio_sx', LM.lKnee, LM.lAnkle, LM.rKnee, LM.rAnkle, 0.15, 0.55);

  // ------------------------------ profilo
  const depths = {};
  const sideLines = [];
  let sideScale = null;
  if (side && side.mask) {
    const sb = verticalBounds(side.mask, side.w, side.h, 0, side.w - 1);
    if (sb.top < 0 || sb.bottom - sb.top < side.h * 0.3) {
      warnings.push('Foto di profilo: sagoma non chiara, uso solo la foto frontale.');
    } else {
      if (sb.top <= 1 || sb.bottom >= side.h - 2) warnings.push('Foto di profilo: la persona tocca il bordo della foto.');
      const sideBody = sb.bottom - sb.top;
      sideScale = heightCm / sideBody;
      const toSideY = (yFront) => sb.top + ((yFront - top) / bodyPx) * sideBody;
      const depthAt = (key, yFront) => {
        if (yFront === undefined) return;
        const ys = toSideY(yFront);
        const d = stableWidthAt(side.mask, side.w, ys, null);
        const r = widestRun(side.mask, side.w, ys);
        if (d && r) { depths[key] = d; sideLines.push({ key, y: ys, x0: r[0], x1: r[0] + d - 1 }); }
      };
      ['collo', 'torace', 'vita', 'fianchi'].forEach((k) => depthAt(k, levels[k]));
      const avgLevel = (a, b) => (levels[a] !== undefined && levels[b] !== undefined ? (levels[a] + levels[b]) / 2 : levels[a] ?? levels[b]);
      depthAt('coscia', avgLevel('coscia_dx', 'coscia_sx'));
      depthAt('polpaccio', avgLevel('polpaccio_dx', 'polpaccio_sx'));
    }
  } else {
    warnings.push('Manca la foto di profilo: le circonferenze sono stimate con proporzioni medie (meno precise).');
  }

  // ------------------------------ circonferenze in cm
  const est = {};
  const notes = {};
  const circ = (key, depthKey) => {
    const wPx = widths[key];
    if (!wPx) return null;
    const widthCm = wPx * cmPerPx;
    const dPx = depths[depthKey];
    let depthCm;
    if (dPx && sideScale) depthCm = dPx * sideScale;
    else { depthCm = widthCm * FALLBACK_DEPTH_RATIO[depthKey]; notes[key] = 'senza profilo'; }
    return round1(ellipseCircumference(widthCm, depthCm));
  };
  est.collo = circ('collo', 'collo');
  est.torace = circ('torace', 'torace');
  est.vita = circ('vita', 'vita');
  est.fianchi = circ('fianchi', 'fianchi');
  est.coscia_dx = circ('coscia_dx', 'coscia');
  est.coscia_sx = circ('coscia_sx', 'coscia');
  est.polpaccio_dx = circ('polpaccio_dx', 'polpaccio');
  est.polpaccio_sx = circ('polpaccio_sx', 'polpaccio');
  // braccio: sezione quasi circolare, basta la larghezza
  est.braccio_dx = widths.braccio_dx ? round1(Math.PI * widths.braccio_dx * cmPerPx) : null;
  est.braccio_sx = widths.braccio_sx ? round1(Math.PI * widths.braccio_sx * cmPerPx) : null;
  est.spalle = widths.spalle ? round1(widths.spalle * cmPerPx) : null;

  // controllo di plausibilità: valori fuori scala = errore della sagoma
  const LIMITS = { collo: [25, 60], torace: [60, 160], vita: [50, 160], fianchi: [65, 170], coscia: [35, 90], polpaccio: [25, 60], braccio: [18, 60], spalle: [28, 70] };
  Object.keys(est).forEach((k) => {
    const base = k.replace(/_(dx|sx)$/, '');
    const lim = LIMITS[base];
    if (est[k] !== null && lim && (est[k] < lim[0] || est[k] > lim[1])) {
      warnings.push(`${k.replace('_', ' ')}: valore anomalo (${est[k]} cm), scartato. Controlla la posa e lo sfondo.`);
      est[k] = null;
    }
  });

  return { estimates: est, notes, warnings, lines, sideLines, bounds: { top, bottom }, cmPerPx };
};

// ------------------------------------------------------------------ browser

let posePromise = null;

const loadScript = (src) => new Promise((resolve, reject) => {
  if (window.Pose) { resolve(); return; }
  const s = document.createElement('script');
  s.src = src;
  s.crossOrigin = 'anonymous';
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('Impossibile caricare il riconoscimento del corpo. Controlla la connessione.'));
  document.head.appendChild(s);
});

/** Carica il modello (solo la prima volta, circa 15 MB, poi resta in cache nel browser) */
export const getPose = () => {
  const base = window.__LC_POSE_BASE__ || POSE_BASE;
  if (!posePromise) {
    posePromise = (async () => {
      await loadScript(`${base}/pose.js`);
      const pose = new window.Pose({ locateFile: (f) => `${base}/${f}` });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: false,
        enableSegmentation: true,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      await pose.initialize();
      return pose;
    })().catch((e) => { posePromise = null; throw e; });
  }
  return posePromise;
};

/** Carica un file immagine in un canvas ridimensionato (lato lungo max `maxSide`) */
export const fileToCanvas = (file, maxSide = 1280) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    resolve(c);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    const heic = /\.(heic|heif)$/i.test(file.name || '') || /hei[cf]/i.test(file.type || '');
    reject(new Error(heic
      ? 'Foto in formato HEIC (iPhone): il browser non la legge. Convertila in JPG, oppure sull\'iPhone: Impostazioni › Fotocamera › Formati › "Più compatibile".'
      : 'Immagine non leggibile: usa una foto JPG o PNG.'));
  };
  img.src = url;
});

/** Esegue il modello su un canvas: restituisce sagoma (0/1) e punti del corpo in pixel */
export const analyzeCanvas = async (canvas) => {
  const pose = await getPose();
  const { width: w, height: h } = canvas;
  const result = await new Promise((resolve, reject) => {
    pose.onResults((r) => {
      try {
        let mask = null;
        if (r.segmentationMask) {
          const mc = document.createElement('canvas');
          mc.width = w;
          mc.height = h;
          const ctx = mc.getContext('2d');
          ctx.drawImage(r.segmentationMask, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          mask = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) {
            // la sagoma è nei canali colore/alpha: consideriamo "persona" sopra il 50%
            const v = Math.max(data[i * 4], data[i * 4 + 3] < 255 ? data[i * 4 + 3] : 0);
            mask[i] = v > 127 ? 1 : 0;
          }
        }
        const lm = r.poseLandmarks
          ? r.poseLandmarks.map((p) => ({ x: p.x * w, y: p.y * h, v: p.visibility ?? 1 }))
          : null;
        resolve({ mask, lm, w, h });
      } catch (e) { reject(e); }
    });
    if (pose.reset) pose.reset();
    pose.send({ image: canvas }).catch(reject);
  });
  return result;
};

const labelFor = (key) => {
  const f = ESTIMATE_FIELDS.find((x) => x.key === key);
  return f ? f.label : key;
};

/** Disegna la foto con sagoma e linee di misura; restituisce un JPEG compresso (per il PDF) */
export const drawAnnotated = (canvas, data, lines, estimates, { maxHeight = 900, title } = {}) => {
  const scale = Math.min(1, maxHeight / canvas.height);
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext('2d');
  ctx.drawImage(canvas, 0, 0, out.width, out.height);

  // contorno della sagoma (leggero)
  if (data && data.mask) {
    const tint = document.createElement('canvas');
    tint.width = data.w;
    tint.height = data.h;
    const tctx = tint.getContext('2d');
    const img = tctx.createImageData(data.w, data.h);
    for (let i = 0; i < data.w * data.h; i++) {
      if (data.mask[i]) { img.data[i * 4] = 59; img.data[i * 4 + 1] = 130; img.data[i * 4 + 2] = 246; img.data[i * 4 + 3] = 70; }
    }
    tctx.putImageData(img, 0, 0);
    ctx.drawImage(tint, 0, 0, out.width, out.height);
  }

  const lw = Math.max(2, out.width / 300);
  const fs = Math.max(11, Math.round(out.width / 40));
  ctx.font = `bold ${fs}px Arial, sans-serif`;
  ctx.lineWidth = lw;
  const placed = []; // etichette già disegnate: evito sovrapposizioni
  (lines || []).forEach((l) => {
    const color = COLORS[l.key.replace(/_(dx|sx)$/, '')] || '#ef4444';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    let lx;
    let ly;
    if (l.p1) {
      ctx.moveTo(l.p1.x * scale, l.p1.y * scale);
      ctx.lineTo(l.p2.x * scale, l.p2.y * scale);
      lx = Math.max(l.p1.x, l.p2.x) * scale + 4;
      ly = ((l.p1.y + l.p2.y) / 2) * scale;
    } else {
      ctx.moveTo(l.x0 * scale, l.y * scale);
      ctx.lineTo(l.x1 * scale, l.y * scale);
      lx = l.x1 * scale + 6;
      ly = l.y * scale;
    }
    ctx.stroke();
    const base = l.key.replace(/_(dx|sx)$/, '');
    const value = estimates ? (estimates[l.key] ?? estimates[base]) : null;
    const text = `${labelFor(l.key)}${value ? ` ${value}` : ''}`;
    const tw = ctx.measureText(text).width;
    if (lx + tw > out.width - 2) lx = Math.max(2, out.width - tw - 4);
    const boxH = fs * 1.2;
    const overlaps = (yy) => placed.some((b) => lx < b.x + b.w + 4 && lx + tw + 6 > b.x && Math.abs(yy - b.y) < boxH);
    for (let i = 0; i < 12 && overlaps(ly); i++) ly += boxH * 0.55;
    placed.push({ x: lx, y: ly, w: tw + 6 });
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(lx - 3, ly - fs * 0.85, tw + 6, fs * 1.15);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, lx, ly + fs * 0.1);
  });
  if (title) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const tw = ctx.measureText(title).width;
    ctx.fillRect(4, 4, tw + 12, fs * 1.5);
    ctx.fillStyle = '#fff';
    ctx.fillText(title, 10, 4 + fs * 1.1);
  }
  return out.toDataURL('image/jpeg', 0.78);
};

/** Foto semplice compressa (quando non si fa l'analisi) */
export const canvasToJpeg = (canvas, maxHeight = 900, quality = 0.78) => {
  const scale = Math.min(1, maxHeight / canvas.height);
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', quality);
};

/**
 * Analisi completa: foto frontale (obbligatoria) + profilo (consigliata).
 * Restituisce stime, avvisi e le due foto annotate pronte per il PDF.
 */
export const analyzePhotos = async (frontCanvas, sideCanvas, heightCm) => {
  const front = await analyzeCanvas(frontCanvas);
  if (!front.lm) throw new Error('Nella foto frontale non trovo la persona. Usa una foto a figura intera, ben illuminata.');
  if (!front.mask) throw new Error('Non riesco a ricavare la sagoma dalla foto frontale.');
  let side = null;
  if (sideCanvas) {
    side = await analyzeCanvas(sideCanvas);
    if (!side.mask) side = null;
  }
  const result = measureFromData(front, side, heightCm);
  const frontImage = drawAnnotated(frontCanvas, front, result.lines, result.estimates, { title: 'Frontale' });
  const sideEst = {};
  ['collo', 'torace', 'vita', 'fianchi'].forEach((k) => { sideEst[k] = result.estimates[k]; });
  const sideImage = sideCanvas
    ? drawAnnotated(sideCanvas, side, result.sideLines, sideEst, { title: 'Profilo' })
    : null;
  return { ...result, frontImage, sideImage };
};
