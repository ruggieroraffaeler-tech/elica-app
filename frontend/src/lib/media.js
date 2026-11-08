// =====================================================================
//  Compressione di foto e video PRIMA dell'invio (spazio database + rete scarsa)
//
//  Video: viene "riregistrato" nel telefono a max 720p, senza audio, con una qualità
//  scelta per stare sotto ~9 MB. Richiede di riprodurre il video una volta (un video
//  da 30 secondi richiede circa 30 secondi). Se il telefono non lo supporta si usa
//  l'originale, purché non superi il limite del server.
// =====================================================================
export { compressImage } from './offline';

export const VIDEO_TARGET_BYTES = 9 * 1024 * 1024; // obiettivo dopo compressione
export const VIDEO_UPLOAD_LIMIT_BYTES = 11 * 1024 * 1024; // limite reale del server (documento MongoDB 16 MB)
export const VIDEO_MAX_SECONDS = 180;

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export const formatMB = (bytes) => `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;

/** true se il browser può ricomprimere i video */
export const canCompressVideo = () => {
  try {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return false;
    const c = document.createElement('canvas');
    if (typeof c.captureStream !== 'function') return false;
    return MIME_CANDIDATES.some((m) => window.MediaRecorder.isTypeSupported(m));
  } catch {
    return false;
  }
};

const pickMime = () => MIME_CANDIDATES.find((m) => window.MediaRecorder.isTypeSupported(m)) || '';

const loadVideo = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.preload = 'auto';
  v.src = url;
  const fail = () => { URL.revokeObjectURL(url); reject(new Error('Video non leggibile da questo telefono.')); };
  v.onerror = fail;
  v.onloadedmetadata = () => {
    if (!v.videoWidth || !v.videoHeight) { fail(); return; }
    resolve({ video: v, url });
  };
});

/**
 * Ricomprime un video. onProgress(0..1). Ritorna un File/Blob (o l'originale se non conviene).
 * Lancia un errore solo se il video è troppo lungo o illeggibile.
 */
export const compressVideo = async (file, { onProgress } = {}) => {
  const { video, url } = await loadVideo(file);
  try {
    const duration = video.duration;
    if (Number.isFinite(duration) && duration > VIDEO_MAX_SECONDS) {
      throw new Error(`Il video dura ${Math.round(duration)} secondi: il massimo è ${VIDEO_MAX_SECONDS / 60} minuti. Taglialo prima di caricarlo.`);
    }
    if (!canCompressVideo()) return file;

    // bitrate per stare sotto l'obiettivo (min 0,5 Mbps, max 2,5 Mbps)
    const secs = Number.isFinite(duration) && duration > 0 ? duration : 60;
    const bitrate = Math.max(500_000, Math.min(2_500_000, Math.floor((VIDEO_TARGET_BYTES * 8 * 0.9) / secs)));
    // risoluzione: 720p se la qualità lo permette, altrimenti 540p
    const maxSide = bitrate >= 1_200_000 ? 1280 : 960;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    const h = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    const stream = canvas.captureStream(30);
    const mimeType = pickMime();
    const recorder = new window.MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.drawImage(video, 0, 0, w, h);
      if (onProgress && Number.isFinite(duration) && duration > 0) onProgress(Math.min(0.99, video.currentTime / duration));
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };

    recorder.start(1000);
    video.currentTime = 0;
    await video.play();
    draw();
    await new Promise((resolve, reject) => {
      video.onended = resolve;
      video.onerror = () => reject(new Error('Errore durante la compressione del video.'));
      // sicurezza: se il telefono mette in pausa il video (app in background) riprende
      video.onpause = () => { if (!video.ended) video.play().catch(() => {}); };
    });
    running = false;
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    if (onProgress) onProgress(1);

    const type = (mimeType || 'video/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    if (!blob.size || blob.size >= file.size) return file; // non conviene: tengo l'originale
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const name = (file.name || 'video').replace(/\.[^.]+$/, '') + `-compresso.${ext}`;
    try {
      return new File([blob], name, { type });
    } catch {
      blob.name = name;
      return blob;
    }
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
};

export const readAsDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Impossibile leggere il file'));
  r.readAsDataURL(blob);
});

/**
 * Prepara un video per l'invio: comprime se serve e controlla il limite.
 * Ritorna { dataUrl, originalSize, finalSize, compressed }.
 */
export const prepareVideoForUpload = async (file, { onProgress } = {}) => {
  let out = file;
  try {
    out = await compressVideo(file, { onProgress });
  } catch (e) {
    // video troppo lungo o illeggibile: messaggio chiaro all'utente
    if (/dura|leggibile/i.test(e.message)) throw e;
    out = file; // compressione non riuscita: provo con l'originale
  }
  if (out.size > VIDEO_UPLOAD_LIMIT_BYTES) {
    throw new Error(`Video troppo grande (${formatMB(out.size)}): il limite è ${formatMB(VIDEO_UPLOAD_LIMIT_BYTES)}. Registra un video più corto (meglio 15–60 secondi).`);
  }
  return { dataUrl: await readAsDataURL(out), originalSize: file.size, finalSize: out.size, compressed: out !== file };
};
