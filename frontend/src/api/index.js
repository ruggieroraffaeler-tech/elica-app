import axios from 'axios';
import { registerOutboxHandler } from '../lib/offline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000, // 20 secondi (con rete scarsa 15 erano pochi)
  headers: {
    'Content-Type': 'application/json',
  },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE_STATUS = [408, 425, 429, 500, 502, 503, 504];

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestione errori: riprova automatica con rete instabile + logout su token non valido
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // 401 = token assente/scaduto/non valido.
    // 403 = token valido ma ruolo non autorizzato: può succedere con localStorage incoerente
    // oppure dopo cambio account. In entrambi i casi forziamo un nuovo login.
    // (skipAuthRedirect: usato dal login, dove 401 significa solo "password sbagliata")
    if ((status === 401 || status === 403) && !config.skipAuthRedirect) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Riprova automatica: solo letture (GET) o richieste segnate come sicure da ripetere,
    // solo per errori di rete/timeout/server temporaneamente non disponibile.
    const method = (config.method || 'get').toLowerCase();
    const maxRetries = config.retries ?? 2;
    const canRetry = method === 'get' || config.retryable;
    const retryableError = !error.response || RETRYABLE_STATUS.includes(status);
    config.__retryCount = config.__retryCount || 0;

    if (canRetry && retryableError && config.__retryCount < maxRetries && navigator.onLine !== false) {
      config.__retryCount += 1;
      // attesa crescente: ~1s, ~2s, ~4s
      await sleep(1000 * 2 ** (config.__retryCount - 1) + Math.random() * 400);
      return api(config);
    }

    return Promise.reject(error);
  }
);

const assertId = (id, label = 'id') => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error(`${label} mancante o non valido`);
  }
  return id;
};

// Auth
export const authAPI = {
  // Il login non viene ripetuto qui: LoginPage gestisce i tentativi mostrando messaggi all'utente
  login: (username, password) =>
    api.post('/auth/login', { username, password }, { timeout: 30000, retries: 0, skipAuthRedirect: true }),
  initAdmin: () => api.post('/auth/init-admin'),
  // Rinnova il token in background (nessun redirect se fallisce)
  refresh: () => api.post('/auth/refresh', null, { timeout: 15000, retries: 0, skipAuthRedirect: true }),
  // "Sveglia" il server (utile se l'hosting lo mette in pausa quando non è usato)
  ping: () => api.get('/health', { timeout: 60000, retries: 0 }),
};

// Admin - Athletes
export const adminAPI = {
  getAthletes: () => api.get('/admin/athletes'),
  createAthlete: (data) => api.post('/admin/athletes', data),
  getAthleteDetail: (id) => api.get(`/admin/athletes/${assertId(id, 'athleteId')}`, { timeout: 60000 }),
  updateAthlete: (id, data) => api.put(`/admin/athletes/${assertId(id, 'athleteId')}`, data),
  deleteAthlete: (id) => api.delete(`/admin/athletes/${assertId(id, 'athleteId')}`),
  updateDiet: (athleteId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet`, data, { timeout: 120000 }),
  toggleDietVisibility: (athleteId, visible) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/visibility?visible=${visible}`),
  updateTraining: (athleteId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training`, data, { retryable: true }),
  updateNotes: (athleteId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/notes`, data, { retryable: true }),
  getNotifications: () => api.get('/admin/notifications'),
  markNotificationRead: (id) => api.put(`/admin/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
  deleteAthletePhoto: (athleteId, photoId) => api.delete(`/admin/athletes/${athleteId}/photos/${photoId}`),
  deleteAllNotifications: () => api.delete('/admin/notifications'),
  getExpiryNotifications: () => api.get('/admin/expiry-notifications'),
  markExpiryNotificationRead: (id) => api.put(`/admin/expiry-notifications/${id}/read`),
  deleteExpiryNotification: (id) => api.delete(`/admin/expiry-notifications/${id}`),
  deleteAllExpiryNotifications: () => api.delete('/admin/expiry-notifications'),
  // Videos
  getAthleteVideos: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/videos`, { timeout: 120000 }),
  getVideoAnnotations: (videoId) => api.get(`/admin/videos/${videoId}/annotations`),
  createAnnotation: (videoId, data) => api.post(`/admin/videos/${videoId}/annotations`, data),
  deleteAnnotation: (annotationId) => api.delete(`/admin/annotations/${annotationId}`),
  // Training Loads
  getAthleteTrainingLoads: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training-loads`),
  archiveTraining: (athleteId, data) => api.post(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training/archive`, data || {}),
  getTrainingHistory: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training/history`),
  deleteTrainingHistory: (athleteId, historyId) => api.delete(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training/history/${assertId(historyId, 'historyId')}`),
  restoreTraining: (athleteId, historyId) => api.post(`/admin/athletes/${assertId(athleteId, 'athleteId')}/training/restore/${assertId(historyId, 'historyId')}`),
  // Body Checks (vecchio sistema, sostituito dalle Visite)
  getAthleteChecks: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/checks`),
  deleteAthleteCheck: (athleteId, checkId) => api.delete(`/admin/athletes/${assertId(athleteId, 'athleteId')}/checks/${assertId(checkId, 'checkId')}`),
  // Visite (funzione beta)
  setBeta: (athleteId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/beta`, data),
  importChecksToVisits: (athleteId) => api.post(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits/import-checks`),
  getVisits: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits`),
  createVisit: (athleteId, data) => api.post(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits`, data, { timeout: 120000 }),
  updateVisit: (athleteId, visitId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits/${assertId(visitId, 'visitId')}`, data, { timeout: 120000 }),
  deleteVisit: (athleteId, visitId) => api.delete(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits/${assertId(visitId, 'visitId')}`),
  getVisitReport: (athleteId, visitId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/visits/${assertId(visitId, 'visitId')}/report`, { timeout: 120000 }),
  // Structured Diet
  getStructuredDiet: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/structured`),
  updateStructuredDiet: (athleteId, data) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/structured`, data, { retryable: true }),
  // Storage Stats
  getStorageStats: () => api.get('/admin/storage-stats'),
  // Spazio database: niente viene eliminato in automatico
  getStorageOverview: () => api.get('/admin/storage/overview', { timeout: 120000 }),
  compressPhotos: (limit = 15) => api.post('/admin/storage/compress-photos', { limit }, { timeout: 180000 }),
  getVideoFile: (videoId) => api.get(`/admin/videos/${assertId(videoId, 'videoId')}/file`, { timeout: 300000 }),
  deleteVideoAdmin: (videoId) => api.delete(`/admin/videos/${assertId(videoId, 'videoId')}`),
  clearLegacyDietPdf: () => api.post('/admin/storage/clear-legacy-diet-pdf'),
  // Database alimenti (valori per 100 g) e ricerca CREA
  getFoods: () => api.get('/admin/foods'),
  createFood: (data) => api.post('/admin/foods', data),
  updateFood: (foodId, data) => api.put(`/admin/foods/${assertId(foodId, 'foodId')}`, data),
  deleteFood: (foodId) => api.delete(`/admin/foods/${assertId(foodId, 'foodId')}`),
  importFoods: (items, onDuplicate = 'update') => api.post('/admin/foods/import', { items, on_duplicate: onDuplicate }, { timeout: 120000 }),
  searchCrea: (q) => api.get('/admin/crea/search', { params: { q }, timeout: 45000 }),
  getCreaFood: (code) => api.get(`/admin/crea/food/${encodeURIComponent(code)}`, { timeout: 30000 }),
  addFoodFromCrea: (code) => api.post('/admin/foods/from-crea', { code }, { timeout: 30000 }),
  // Piano alimentare (dieta completa o solo macro) + PDF per l'atleta
  getDietPlan: (athleteId) => api.get(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/plan`),
  saveDietPlan: (athleteId, plan) => api.put(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/plan`, plan),
  dietPlanPdf: (athleteId, send = false, name = null) => api.post(`/admin/athletes/${assertId(athleteId, 'athleteId')}/diet/plan/pdf`, { send, name }, { timeout: 90000 }),
  // Macros
  getMacros: (athleteId) => api.get(`/admin/athletes/${athleteId}/macros`),
  updateMacros: (athleteId, data) => api.put(`/admin/athletes/${athleteId}/macros`, data, { retryable: true }),
  // Exercise Video Library
  getExerciseVideos: (q) => api.get('/admin/exercise-videos', { params: q ? { q } : {} }),
  createExerciseVideo: (data) => api.post('/admin/exercise-videos', data),
  deleteExerciseVideo: (id) => api.delete(`/admin/exercise-videos/${id}`),
};

// Athlete
export const athleteAPI = {
  getProfile: () => api.get('/athlete/profile'),
  // Versione leggera: scheda + note + dieta strutturata, senza i PDF (scaricati solo quando servono)
  getProfileLight: () => api.get('/athlete/profile', { params: { light: true } }),
  getDietPdf: (index) => api.get(`/athlete/diet/pdfs/${index}`, { timeout: 120000 }),
  getLoads: () => api.get('/athlete/loads'),
  createLoad: (data) => api.post('/athlete/loads', data),
  deleteLoad: (id) => api.delete(`/athlete/loads/${id}`),
  getPhotos: (params) => api.get('/athlete/photos', { params: params || {}, timeout: 60000 }),
  uploadPhoto: (data) => api.post('/athlete/photos', data, { timeout: 120000 }),
  togglePhotoVisibility: (id, visible) => api.put(`/athlete/photos/${id}/visibility?visible=${visible}`),
  deletePhoto: (id) => api.delete(`/athlete/photos/${id}`),
  sendWeekNotification: () => api.post('/athlete/week-notification'),
  // Videos
  // params { light: true } -> solo titolo/data, senza il video (molto più leggero)
  getVideos: (params) => api.get('/athlete/videos', { params: params || {}, timeout: 120000 }),
  uploadVideo: (data) => api.post('/athlete/videos', data, { timeout: 300000 }),
  toggleVideoVisibility: (id, visible) => api.put(`/athlete/videos/${id}/visibility?visible=${visible}`),
  deleteVideo: (id) => api.delete(`/athlete/videos/${id}`),
  getVideoAnnotations: (videoId) => api.get(`/athlete/videos/${videoId}/annotations`),
  // Body Checks
  getChecks: () => api.get('/athlete/checks'),
  // retries: 0 -> i tentativi li gestisce la coda offline (con client_id non si creano doppioni)
  createCheck: (data) => api.post('/athlete/checks', data, { retries: 0 }),
  deleteCheck: (id) => api.delete(`/athlete/checks/${id}`),
  updateCheckDate: (id, date) => api.put(`/athlete/checks/${id}/date`, { created_at: date }, { retryable: true }),
  // Training Loads
  getTrainingLoads: () => api.get('/athlete/training-loads'),
  createTrainingLoad: (data) => api.post('/athlete/training-loads', data, { retries: 0 }),
  deleteTrainingLoad: (id) => api.delete(`/athlete/training-loads/${id}`),
  // Exercise Video Library
  getExerciseVideos: (q) => api.get('/athlete/exercise-videos', { params: q ? { q } : {} }),
  getMacros: () => api.get('/athlete/macros'),
  // database alimenti del coach (sola lettura) per il calcolatore delle porzioni
  getFoods: () => api.get('/athlete/foods', { timeout: 45000 }),
  // Visite (sola lettura)
  getVisits: () => api.get('/athlete/visits'),
  getVisitReport: (visitId) => api.get(`/athlete/visits/${assertId(visitId, 'visitId')}/report`, { timeout: 120000 }),
  // misurazione da casa: arrivano solo i numeri (le foto solo se l'atleta lo sceglie)
  sendSelfMeasure: (data) => api.post('/athlete/visits/self', data, { timeout: 120000 }),
  deleteSelfMeasure: (visitId) => api.delete(`/athlete/visits/${assertId(visitId, 'visitId')}`),
};

// Salvataggi che possono partire anche senza rete: finiscono in coda e vengono
// inviati in automatico appena torna la connessione (vedi lib/offline.js)
registerOutboxHandler('training-load', (payload) => athleteAPI.createTrainingLoad(payload));
registerOutboxHandler('body-check', (payload) => athleteAPI.createCheck(payload));

// Auth
export const changePassword = (data) => api.put('/auth/change-password', data);

export default api;
