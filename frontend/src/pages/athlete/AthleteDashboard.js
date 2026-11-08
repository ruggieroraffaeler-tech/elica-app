import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { athleteAPI, changePassword } from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Utensils, Activity, MessageSquare, Camera, LogOut, Bell, CheckCircle, Video, Scale, ChevronDown, ChevronUp, PlayCircle, KeyRound, FileText, RefreshCw, CloudOff, Cloud, Loader2, ClipboardList } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../../components/ThemeToggle';
import DietPlanAthlete from '../../components/DietPlanAthlete';
import BrandLogo from '../../components/BrandLogo';
import VisitsAthlete from '../../components/VisitsAthlete';
import { useOnlineStatus } from '../../components/NetworkStatus';
import {
  readCache,
  writeCache,
  readDraft,
  writeDraft,
  clearDraft,
  getOutbox,
  enqueue,
  flushOutbox,
  isInOutbox,
  isOnline,
  isNetworkError,
  subscribeOutbox,
  subscribeSync,
  subscribeItemSent,
  makeId,
  savePdfOffline,
  loadPdfOffline,
  compressImage,
  formatDateTime,
} from '../../lib/offline';
import { isRunningDay, RUNNING_FIELDS } from '../../lib/trainingTypes';
import { prepareVideoForUpload, formatMB } from '../../lib/media';

const PHOTO_PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Quando un salvataggio in coda arriva al server, aggiorniamo subito la cache locale
// (anche se in quel momento l'atleta è su un'altra pagina dell'app).
// ---------------------------------------------------------------------------
subscribeItemSent((item, response) => {
  if (item.type === 'training-load') {
    const p = item.payload;
    const current = readCache('trainingLoads')?.data || [];
    const existing = current.find((l) => l.exercise_name === p.exercise_name && l.week === p.week);
    const updated = {
      ...(existing || {}),
      id: response?.data?.id || existing?.id || item.id,
      exercise_name: p.exercise_name,
      week: p.week,
      sets: p.sets,
      notes: p.notes,
      created_at: existing?.created_at || new Date().toISOString(),
    };
    writeCache('trainingLoads', [updated, ...current.filter((l) => l !== existing)]);
  }
  if (item.type === 'body-check') {
    const p = item.payload;
    const current = readCache('checks')?.data || [];
    const saved = {
      id: response?.data?.id || item.id,
      weight: p.weight,
      height: p.height,
      client_id: p.client_id,
      created_at: response?.data?.created_at || p.created_at,
    };
    writeCache('checks', [saved, ...current.filter((c) => c.id !== saved.id && c.client_id !== p.client_id)]);
  }
});

const dataUrlToBlobUrl = (base64Data) => {
  const byteString = atob(base64Data.split(',')[1] || base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};

const downloadPdfBase64 = (base64Data, filename = 'documento.pdf') => {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  link.click();
};

// ExerciseLoadRow component
// Le modifiche vengono salvate come "bozza" sul telefono mentre si scrive:
// se l'app si chiude o cade la rete non si perde nulla.
// running = giorno di corsa: invece di kg × reps l'atleta inserisce il tempo di ogni ripetizione
const ExerciseLoadRow = ({ exercise, existingLoad, week, saving, onSave, running = false }) => {
  const draftKey = `${exercise.name}|${week}`;
  const [sets, setSets] = useState([]);
  const [notes, setNotes] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const suggestedSets = parseInt(exercise.sets) || 3;
  const suggestedReps = exercise.reps || '';
  const emptySet = () => (running ? { tempo: '' } : { weight: '', reps: suggestedReps });

  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft && Array.isArray(draft.sets) && draft.sets.length > 0) {
      setSets(draft.sets);
      setNotes(draft.notes || '');
      setHasDraft(true);
      return;
    }
    setHasDraft(false);
    if (existingLoad && existingLoad.sets && existingLoad.sets.length > 0) {
      setSets(existingLoad.sets);
      setNotes(existingLoad.notes || '');
    } else {
      setSets(Array.from({ length: suggestedSets }, () => (running ? { tempo: '' } : { weight: '', reps: suggestedReps })));
      setNotes('');
    }
  }, [existingLoad, draftKey, suggestedSets, suggestedReps, running]);

  const persistDraft = (nextSets, nextNotes) => {
    writeDraft(draftKey, { sets: nextSets, notes: nextNotes, at: Date.now() });
    setHasDraft(true);
  };

  const updateSet = (index, field, value) => {
    const updated = sets.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setSets(updated);
    persistDraft(updated, notes);
  };

  const addSet = () => {
    const updated = [...sets, emptySet()];
    setSets(updated);
    persistDraft(updated, notes);
  };

  const removeSet = (index) => {
    if (sets.length <= 1) return;
    const updated = sets.filter((_, i) => i !== index);
    setSets(updated);
    persistDraft(updated, notes);
  };

  const updateNotes = (value) => {
    setNotes(value);
    persistDraft(sets, value);
  };

  const handleSave = () => {
    clearDraft(draftKey);
    setHasDraft(false);
    onSave(sets, notes);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{running ? 'I tuoi tempi:' : 'Il tuo carico:'}</p>
      <div className="space-y-1.5">
        {sets.map((set, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 flex-shrink-0">{running ? `Rip ${idx + 1}` : `Set ${idx + 1}`}</span>
            {running ? (
              <Input
                type="text"
                inputMode="text"
                placeholder="tempo es. 1:32"
                value={set.tempo || ''}
                onChange={(e) => updateSet(idx, 'tempo', e.target.value)}
                className="w-36 h-8 text-sm"
                data-testid={`run-time-${exercise.name}-${idx}`}
              />
            ) : (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={set.weight}
                  onChange={(e) => updateSet(idx, 'weight', e.target.value)}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-muted-foreground text-xs">×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={set.reps}
                  onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                  className="w-20 h-8 text-sm"
                />
              </>
            )}
            <button
              onClick={() => removeSet(idx)}
              className="text-muted-foreground hover:text-destructive text-xs ml-auto"
              title={running ? 'Rimuovi ripetizione' : 'Rimuovi set'}
            >✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={addSet} className="text-xs text-primary hover:underline">{running ? '+ Aggiungi ripetizione' : '+ Aggiungi set'}</button>
      </div>
      <Input
        placeholder={running ? 'Note (es. sensazioni, vento, FC media...)' : 'Note (es. mi sentivo affaticato, ho aumentato il peso...)'}
        value={notes}
        onChange={e => updateNotes(e.target.value)}
        className="h-8 text-xs"
      />
      {existingLoad?._pending && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1" data-testid={`pending-load-${exercise.name}`}>
          <CloudOff className="w-3.5 h-3.5" /> Salvato sul telefono · verrà inviato appena c'è rete
        </p>
      )}
      {hasDraft && (
        <p className="text-xs text-muted-foreground">✏️ Modifiche non ancora salvate (sono conservate sul telefono)</p>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="w-full"
        data-testid={`save-load-${exercise.name}`}
      >
        {saving ? 'Salvataggio...' : running ? (existingLoad ? 'Aggiorna tempi' : 'Salva tempi') : existingLoad ? 'Aggiorna carico' : 'Salva carico'}
      </Button>
    </div>
  );
};

const exportMacroPdf = (athleteName, macros, diet) => {
  const win = window.open('', '_blank');

  let macroSection = '';
  if (macros) {
    macroSection = '<h2>Target Macro Giornalieri</h2>' +
      '<div class="macro-grid">' +
      '<div class="macro-box" style="border-color:#f97316"><div class="macro-val" style="color:#f97316">' + Math.round(macros.kcal || 0) + '</div><div class="macro-unit">kcal</div><div class="macro-label">Calorie</div></div>' +
      '<div class="macro-box" style="border-color:#3b82f6"><div class="macro-val" style="color:#3b82f6">' + Math.round(macros.proteine || 0) + '</div><div class="macro-unit">g</div><div class="macro-label">Proteine</div></div>' +
      '<div class="macro-box" style="border-color:#22c55e"><div class="macro-val" style="color:#22c55e">' + Math.round(macros.carboidrati || 0) + '</div><div class="macro-unit">g</div><div class="macro-label">Carboidrati</div></div>' +
      '<div class="macro-box" style="border-color:#eab308"><div class="macro-val" style="color:#eab308">' + Math.round(macros.grassi || 0) + '</div><div class="macro-unit">g</div><div class="macro-label">Grassi</div></div>' +
      '</div>';
    if (macros.data_inizio) macroSection += '<p style="color:#666;font-size:11px;">Dal ' + new Date(macros.data_inizio).toLocaleDateString('it-IT') + '</p>';
    if (macros.note) macroSection += '<div class="note">' + macros.note + '</div>';
  }

  let dietSection = '';
  if (diet && diet.pdfs && diet.pdfs.length > 0) {
    dietSection = '<h2>PDF Dieta allegati</h2><ul>' + diet.pdfs.map(function(p) { return '<li>' + p.name + '</li>'; }).join('') + '</ul>';
  }

  const html = '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Piano Nutrizionale - ' + athleteName + '</title>' +
    '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:30px;max-width:800px;}' +
    'h1{font-size:20px;margin-bottom:4px;}h2{font-size:15px;margin:20px 0 8px;border-bottom:2px solid #333;padding-bottom:4px;}' +
    '.macro-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}' +
    '.macro-box{border:2px solid #ddd;border-radius:8px;padding:12px;text-align:center;}' +
    '.macro-val{font-size:28px;font-weight:bold;}.macro-unit{font-size:11px;color:#666;}' +
    '.macro-label{font-size:11px;color:#666;margin-top:4px;}.note{background:#f5f5f5;padding:10px;border-radius:6px;margin:10px 0;font-style:italic;}' +
    '@media print{body{margin:15px;}}</style></head><body>' +
    '<h1>Piano Nutrizionale</h1>' +
    '<p style="color:#666;font-size:11px;">Atleta: <strong>' + athleteName + '</strong> &middot; Generato il ' + new Date().toLocaleDateString('it-IT') + '</p>' +
    macroSection + dietSection +
    '<script>window.onload=function(){window.print();}</' + 'script></body></html>';

  win.document.write(html);
  win.document.close();
};


// Rest Timer - independent recovery timer
const RestTimer = () => {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = React.useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-muted/40 hover:bg-muted/60 rounded-lg text-sm text-muted-foreground transition-colors"
      >
        ⏱️ Timer recupero
      </button>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">⏱️ Timer recupero</span>
        <button onClick={() => { setOpen(false); setRunning(false); setSeconds(0); }} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <p className="text-3xl font-bold text-center font-mono tracking-wider">{fmt(seconds)}</p>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" variant={running ? 'outline' : 'default'} onClick={() => setRunning(!running)}>
          {running ? '⏸ Pausa' : seconds > 0 ? '▶ Riprendi' : '▶ Avvia'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setSeconds(0); setRunning(false); }}>
          ↺ Azzera
        </Button>
      </div>
    </div>
  );
};

// Invia subito un elemento della coda. Ritorna 'sent' | 'queued' | 'error'
const sendQueuedItem = async (item) => {
  const dropped = new Set();
  const r1 = await flushOutbox();
  (r1.droppedIds || []).forEach((id) => dropped.add(id));
  // Se un invio automatico era già in corso, il nuovo elemento potrebbe non essere stato incluso
  if (isInOutbox(item.id) && isOnline() && r1.failed === 0) {
    const r2 = await flushOutbox();
    (r2.droppedIds || []).forEach((id) => dropped.add(id));
  }
  if (dropped.has(item.id)) return 'error';
  return isInOutbox(item.id) ? 'queued' : 'sent';
};

const isGoodConnection = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (!c) return true;
  if (c.saveData) return false;
  return !['slow-2g', '2g', '3g'].includes(c.effectiveType);
};

const AthleteDashboard = () => {
  const { logout } = useAuth();
  const online = useOnlineStatus();

  // I dati partono dalla copia salvata sul telefono: l'app si apre subito anche senza rete
  const [profile, setProfile] = useState(() => readCache('profile')?.data || null);
  const [lastSync, setLastSync] = useState(() => readCache('profile')?.savedAt || null);
  const [loading, setLoading] = useState(() => !readCache('profile'));
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const hasProfileRef = useRef(!!readCache('profile'));

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [expandedDay, setExpandedDay] = useState(() => {
    const v = readCache('ui_expandedDay')?.data;
    return v === undefined ? 0 : v;
  });
  const [selectedWeek, setSelectedWeek] = useState(() => readCache('ui_selectedWeek')?.data || 1);
  const [serverLoads, setServerLoads] = useState(() => readCache('trainingLoads')?.data || []);
  const [serverChecks, setServerChecks] = useState(() => readCache('checks')?.data || []);
  const [outbox, setOutbox] = useState(() => getOutbox());
  const [savingLoad, setSavingLoad] = useState(null);
  const [newCheck, setNewCheck] = useState({ weight: '', height: '' });
  const [editingCheck, setEditingCheck] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [savingCheck, setSavingCheck] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [videos, setVideos] = useState([]);
  const [exerciseVideos, setExerciseVideos] = useState(() => readCache('exerciseVideos')?.data || []);
  const [macros, setMacros] = useState(() => {
    const m = readCache('macros')?.data;
    return m && m.kcal ? m : null;
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [weekNotifSent, setWeekNotifSent] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(() => {
    return !localStorage.getItem('update_banner_v3_seen');
  });
  const photoInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);
  const pdfMemo = useRef({});
  const mediaLoadedRef = useRef(false);
  const exercisesLoadedRef = useRef(false);

  // ------------------------------------------------------------------ coda offline
  useEffect(() => subscribeOutbox(setOutbox), []);

  useEffect(() => subscribeItemSent(() => {
    setServerLoads(readCache('trainingLoads')?.data || []);
    setServerChecks(readCache('checks')?.data || []);
  }), []);

  const refreshLoads = useCallback(async () => {
    try {
      const res = await athleteAPI.getTrainingLoads();
      const data = res.data || [];
      setServerLoads(data);
      writeCache('trainingLoads', data);
    } catch { /* restano i dati salvati */ }
  }, []);

  const refreshChecks = useCallback(async () => {
    try {
      const res = await athleteAPI.getChecks();
      const data = res.data || [];
      setServerChecks(data);
      writeCache('checks', data);
    } catch { /* restano i dati salvati */ }
  }, []);

  // Dopo un invio riuscito ricarichiamo i dati "ufficiali" dal server
  useEffect(() => subscribeSync((result) => {
    if (result.sent > 0) {
      refreshLoads();
      refreshChecks();
    }
  }), [refreshLoads, refreshChecks]);

  // ------------------------------------------------------------------ PDF dieta
  const pdfKey = (pdf, index) => `${pdf.index ?? index}|${pdf.name}`;

  const getPdfData = useCallback(async (pdf, index, { silent = false } = {}) => {
    if (pdf.pdf_data) return pdf.pdf_data; // backend vecchio: il PDF è già incluso
    const key = pdfKey(pdf, index);
    if (pdfMemo.current[key]) return pdfMemo.current[key];
    if (isOnline()) {
      try {
        const res = await athleteAPI.getDietPdf(pdf.index ?? index);
        const data = res.data?.pdf_data;
        if (data) {
          pdfMemo.current[key] = data;
          savePdfOffline(key, data);
          return data;
        }
      } catch { /* proviamo la copia sul telefono */ }
    }
    const offlineCopy = await loadPdfOffline(key);
    if (offlineCopy) {
      pdfMemo.current[key] = offlineCopy;
      if (!silent) toast('Aperta la copia salvata sul telefono');
      return offlineCopy;
    }
    throw new Error('pdf-non-disponibile');
  }, []);

  // Con buona connessione salviamo i PDF della dieta sul telefono in background,
  // così sono disponibili anche in palestra senza rete.
  const prefetchPdfs = useCallback(async (diet) => {
    if (!diet?.pdfs?.length || !isGoodConnection()) return;
    for (let i = 0; i < diet.pdfs.length; i++) {
      const pdf = diet.pdfs[i];
      if (pdf.pdf_data) continue;
      const key = pdfKey(pdf, i);
      if (await loadPdfOffline(key)) continue;
      try { await getPdfData(pdf, i, { silent: true }); } catch { break; }
    }
  }, [getPdfData]);

  // ------------------------------------------------------------------ caricamento dati
  // Ordine pensato per la rete scarsa: prima la scheda (leggera), poi il resto un po' alla volta.
  const loadAll = useCallback(async ({ manual = false } = {}) => {
    setRefreshing(true);
    let freshProfile = null;
    try {
      const res = await athleteAPI.getProfileLight();
      freshProfile = res.data;
      setProfile(freshProfile);
      writeCache('profile', freshProfile);
      setLastSync(Date.now());
      hasProfileRef.current = true;
      setLoadFailed(false);
    } catch (error) {
      if (!hasProfileRef.current) setLoadFailed(true);
      if (manual || !hasProfileRef.current) {
        toast.error(isNetworkError(error)
          ? 'Rete troppo debole per aggiornare. Riprova tra poco.'
          : 'Errore nel caricamento. Riprova tra qualche secondo.');
      }
    } finally {
      setLoading(false);
    }

    if (freshProfile) {
      await refreshLoads();
      await Promise.all([
        refreshChecks(),
        athleteAPI.getMacros()
          .then((r) => {
            const m = r.data || {};
            writeCache('macros', m);
            setMacros(m.kcal ? m : null);
          })
          .catch(() => {}),
      ]);
      prefetchPdfs(freshProfile.diet);
    }
    setRefreshing(false);
  }, [refreshLoads, refreshChecks, prefetchPdfs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Quando torna la connessione aggiorniamo da soli
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) loadAll();
    wasOnline.current = online;
  }, [online, loadAll]);

  // Ricordiamo settimana e giorno aperti
  useEffect(() => { writeCache('ui_selectedWeek', selectedWeek); }, [selectedWeek]);
  useEffect(() => { writeCache('ui_expandedDay', expandedDay); }, [expandedDay]);

  // Lazy load heavy media only when tab is opened
  const loadMedia = async () => {
    setLoadingMedia(true);
    setMediaError(false);
    try {
      const [photosRes, videosRes] = await Promise.all([
        athleteAPI.getPhotos({ limit: PHOTO_PAGE_SIZE, skip: 0 }),
        athleteAPI.getVideos({ light: true }).catch(() => ({ data: [] })),
      ]);
      const list = photosRes.data || [];
      setPhotos(list);
      setHasMorePhotos(list.length === PHOTO_PAGE_SIZE);
      setVideos(videosRes.data || []);
      mediaLoadedRef.current = true;
    } catch {
      setMediaError(true);
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadMediaIfNeeded = () => {
    if (mediaLoadedRef.current || loadingMedia) return;
    loadMedia();
  };

  const loadMorePhotos = async () => {
    setLoadingMedia(true);
    try {
      const res = await athleteAPI.getPhotos({ limit: PHOTO_PAGE_SIZE, skip: photos.length });
      const more = res.data || [];
      setPhotos((prev) => [...prev, ...more]);
      setHasMorePhotos(more.length === PHOTO_PAGE_SIZE);
    } catch {
      toast.error('Rete debole: foto non caricate, riprova.');
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadExercisesIfNeeded = () => {
    if (exercisesLoadedRef.current) return;
    exercisesLoadedRef.current = true;
    athleteAPI.getExerciseVideos()
      .then((res) => {
        const data = res.data || [];
        setExerciseVideos(data);
        writeCache('exerciseVideos', data);
      })
      .catch(() => { exercisesLoadedRef.current = false; });
  };

  const { athlete, diet, training, notes } = profile || {};
  // Funzione beta: la sezione Visite compare solo se il coach l'ha attivata per questo atleta
  const betaVisits = !!athlete?.beta_visits;

  // Carichi mostrati = quelli del server + quelli salvati sul telefono non ancora inviati
  const trainingLoads = useMemo(() => {
    const map = new Map();
    serverLoads.forEach((l) => map.set(`${l.exercise_name}|${l.week}`, l));
    outbox
      .filter((i) => i.type === 'training-load')
      .forEach((i) => map.set(`${i.payload.exercise_name}|${i.payload.week}`, { ...i.payload, id: i.id, _pending: true }));
    return Array.from(map.values());
  }, [serverLoads, outbox]);

  const checks = useMemo(() => {
    const pending = outbox
      .filter((i) => i.type === 'body-check')
      .map((i) => ({ ...i.payload, id: i.id, _pending: true }));
    const pendingIds = new Set(pending.map((p) => p.client_id));
    return [...pending, ...serverChecks.filter((c) => !c.client_id || !pendingIds.has(c.client_id))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [serverChecks, outbox]);

  const pendingCount = outbox.length;

  const getLoadForExercise = (exerciseName, week) => {
    return trainingLoads.find(l => l.exercise_name === exerciseName && l.week === week);
  };

  const saveExerciseLoad = async (exerciseName, week, sets, notes, running = false) => {
    const key = `${exerciseName}-${week}`;
    setSavingLoad(key);
    // Prima si salva sul telefono (non si perde mai), poi si prova a inviare
    const item = enqueue(
      'training-load',
      { exercise_name: exerciseName, week, sets, notes: notes || null },
      `load|${exerciseName}|${week}`
    );
    try {
      const outcome = await sendQueuedItem(item);
      if (outcome === 'sent') {
        toast.success(running ? 'Tempi salvati!' : 'Carico salvato!');
      } else if (outcome === 'queued') {
        toast(running ? '📶 Tempi salvati sul telefono' : '📶 Carico salvato sul telefono', {
          description: 'La rete è assente o debole: verrà inviato al coach in automatico appena torna la connessione.',
        });
      } else {
        toast.error('Errore nel salvataggio. Controlla i valori inseriti.');
      }
    } finally {
      setSavingLoad(null);
    }
  };

  const saveCheckDate = async (checkId) => {
    if (!editDate) return;
    try {
      await athleteAPI.updateCheckDate(checkId, editDate);
      await refreshChecks();
      setEditingCheck(null);
      setEditDate('');
      toast.success('Data aggiornata!');
    } catch (error) {
      toast.error(isNetworkError(error) ? 'Serve la connessione per modificare la data. Riprova tra poco.' : 'Errore nella modifica della data');
    }
  };

  const saveCheck = async () => {
    if (!newCheck.weight && !newCheck.height) return;
    const weight = parseFloat(newCheck.weight);
    if (!weight) {
      toast.error('Inserisci il peso');
      return;
    }
    setSavingCheck(true);
    const payload = {
      weight,
      height: parseFloat(newCheck.height) || null,
      client_id: makeId(), // evita doppioni se l'invio viene ripetuto
      created_at: new Date().toISOString(), // data reale, anche se inviato più tardi
    };
    const item = enqueue('body-check', payload, `check|${payload.client_id}`);
    setNewCheck({ weight: '', height: '' });
    try {
      const outcome = await sendQueuedItem(item);
      if (outcome === 'sent') toast.success('Check salvato!');
      else if (outcome === 'queued') toast('📶 Check salvato sul telefono', { description: 'Verrà inviato appena torna la connessione.' });
      else toast.error('Errore nel salvataggio');
    } finally {
      setSavingCheck(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (!file) return;
    if (!isOnline()) {
      toast.error('Serve la connessione per caricare le foto.');
      return;
    }
    setUploadingPhoto(true);
    try {
      // Foto ridotta prima dell'invio: molto più veloce con rete scarsa
      const imageData = await compressImage(file);
      await athleteAPI.uploadPhoto({ image_data: imageData, visible_to_coach: true });
      const photosRes = await athleteAPI.getPhotos({ limit: PHOTO_PAGE_SIZE, skip: 0 });
      const list = photosRes.data || [];
      setPhotos(list);
      setHasMorePhotos(list.length === PHOTO_PAGE_SIZE);
      toast.success('Foto caricata!');
    } catch (error) {
      toast.error(isNetworkError(error) ? 'Rete troppo debole: foto non caricata. Riprova con più segnale.' : 'Errore nel caricamento');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (!file || !newVideoTitle.trim()) { toast.error('Inserisci un titolo'); return; }
    if (!isOnline()) { toast.error('Serve la connessione per caricare i video.'); return; }
    setUploadingVideo(true);
    setVideoProgress(0);
    try {
      // Il video viene ridotto sul telefono (720p, senza audio) prima dell'invio:
      // occupa molto meno spazio e parte anche con rete scarsa
      const prepared = await prepareVideoForUpload(file, { onProgress: (v) => setVideoProgress(v) });
      setVideoProgress(null);
      await athleteAPI.uploadVideo({ title: newVideoTitle.trim(), video_data: prepared.dataUrl, visible_to_coach: true });
      const videosRes = await athleteAPI.getVideos({ light: true });
      setVideos(videosRes.data || []);
      setNewVideoTitle('');
      toast.success(prepared.compressed
        ? `Video caricato! (${formatMB(prepared.originalSize)} → ${formatMB(prepared.finalSize)})`
        : 'Video caricato!');
    } catch (error) {
      if (isNetworkError(error)) toast.error('Rete troppo debole: video non caricato. Riprova con il Wi-Fi.');
      else toast.error(error.response?.data?.detail || error.message || 'Errore nel caricamento');
    } finally {
      setUploadingVideo(false);
      setVideoProgress(null);
    }
  };

  const sendWeekNotification = async () => {
    try {
      await athleteAPI.sendWeekNotification();
      setWeekNotifSent(true);
      toast.success('Notifica inviata al coach!');
    } catch (error) {
      toast.error(isNetworkError(error) ? 'Nessuna connessione: riprova quando hai rete.' : 'Errore');
    }
  };

  const handleOpenPdf = async (pdf, index) => {
    // La finestra va aperta subito (al tocco), altrimenti il telefono la blocca
    const win = pdf.pdf_data || pdfMemo.current[pdfKey(pdf, index)] ? null : window.open('', '_blank');
    if (win) {
      try { win.document.write('<p style="font-family:sans-serif;padding:16px">Caricamento PDF...</p>'); } catch { /* ignore */ }
    }
    setOpeningPdf(index);
    try {
      const data = await getPdfData(pdf, index);
      const url = dataUrlToBlobUrl(data);
      if (win) win.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (win) win.close();
      toast.error('PDF non disponibile senza rete. Aprilo una volta con la connessione: poi resterà salvato sul telefono.');
    } finally {
      setOpeningPdf(null);
    }
  };

  const handleDownloadPdf = async (pdf, index) => {
    setOpeningPdf(index);
    try {
      const data = await getPdfData(pdf, index);
      downloadPdfBase64(data, `${pdf.name}.pdf`);
    } catch {
      toast.error('PDF non disponibile senza rete.');
    } finally {
      setOpeningPdf(null);
    }
  };

  const handleLogout = () => {
    if (pendingCount > 0 && !window.confirm(`Hai ${pendingCount} dati non ancora inviati al coach. Restano salvati sul telefono e verranno inviati al prossimo accesso. Vuoi uscire?`)) {
      return;
    }
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Carico la tua scheda...</p>
      </div>
    );
  }

  if (!profile && loadFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <CloudOff className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Non riesco a scaricare la scheda</p>
            <p className="text-sm text-muted-foreground">La rete è assente o molto debole. Appena la scheda viene scaricata una volta, resta salvata sul telefono e potrai vederla anche offline.</p>
            <Button className="w-full" onClick={() => loadAll({ manual: true })} disabled={refreshing}>
              {refreshing ? 'Riprovo...' : 'Riprova'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={logout}>Esci</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size={38} />
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">Ciao, {athlete?.name}</h1>
                <p className="text-sm text-muted-foreground truncate">Il tuo programma</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setPwDialogOpen(true)} title="Cambia Password">
                <KeyRound className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="logout-btn" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>Inserisci la password attuale e quella nuova.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Password attuale</Label>
              <Input type="password" value={pwData.current_password} onChange={e => setPwData({ ...pwData, current_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nuova password</Label>
              <Input type="password" value={pwData.new_password} onChange={e => setPwData({ ...pwData, new_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Conferma nuova password</Label>
              <Input type="password" value={pwData.confirm_password} onChange={e => setPwData({ ...pwData, confirm_password: e.target.value })} />
            </div>
            <Button className="w-full" disabled={changingPw} onClick={async () => {
              if (pwData.new_password !== pwData.confirm_password) { toast.error('Le password non coincidono'); return; }
              if (pwData.new_password.length < 6) { toast.error('La password deve essere di almeno 6 caratteri'); return; }
              setChangingPw(true);
              try {
                await changePassword({ current_password: pwData.current_password, new_password: pwData.new_password });
                toast.success('Password aggiornata!');
                setPwDialogOpen(false);
                setPwData({ current_password: '', new_password: '', confirm_password: '' });
              } catch (e) {
                toast.error(e.response?.data?.detail || (isNetworkError(e) ? 'Serve la connessione per cambiare password' : 'Errore nel cambio password'));
              } finally { setChangingPw(false); }
            }}>
              {changingPw ? 'Aggiornamento...' : 'Aggiorna Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Stato sincronizzazione */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground" data-testid="sync-status">
          <div className="flex items-center gap-1.5 min-w-0">
            {refreshing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /><span className="truncate">Aggiornamento in corso...</span></>
            ) : online ? (
              <><Cloud className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{lastSync ? `Aggiornato ${formatDateTime(lastSync)}` : 'Online'}</span></>
            ) : (
              <><CloudOff className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">Offline · {lastSync ? formatDateTime(lastSync) : 'dati sul telefono'}</span></>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pendingCount > 0 && (
              <button
                className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
                onClick={async () => {
                  const r = await flushOutbox();
                  if (r.sent > 0 && getOutbox().length === 0) toast.success('Tutto inviato al coach!');
                  else if (getOutbox().length > 0) toast('Ancora nessuna rete: riproverò in automatico.');
                }}
                data-testid="pending-sync-btn"
              >
                ⏳ {pendingCount} da inviare · Invia ora
              </button>
            )}
            <button
              onClick={() => loadAll({ manual: true })}
              disabled={refreshing}
              className="p-1 rounded hover:bg-muted disabled:opacity-50"
              title="Aggiorna"
              aria-label="Aggiorna"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Update Banner */}
        {showUpdateBanner && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">🆕 Novità nell'app!</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>🌙 <strong>Modalità giorno/notte</strong>: tocca l'icona sole/luna in alto</li>
                    <li>📶 <strong>Funziona con poca rete</strong>: la scheda resta salvata sul telefono</li>
                    <li>💾 <strong>Carichi salvati anche offline</strong>: vengono inviati da soli quando torna la rete</li>
                    <li>⚡ <strong>Apertura più veloce</strong>, anche in palestra</li>
                  </ul>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground flex-shrink-0 text-xs"
                  onClick={() => { setShowUpdateBanner(false); localStorage.setItem('update_banner_v3_seen', '1'); }}
                >✕</button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week 3 notification */}
        {!weekNotifSent && (
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-accent flex-shrink-0" />
                  <p className="text-sm">Hai completato la 3a settimana? Avvisa il coach!</p>
                </div>
                <Button size="sm" onClick={sendWeekNotification}>
                  <CheckCircle className="w-4 h-4 mr-1" />Avvisa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="diet" onValueChange={(v) => {
          if (v === 'media') loadMediaIfNeeded();
          if (v === 'exercises') loadExercisesIfNeeded();
        }}>
          <TabsList className={`grid w-full ${betaVisits ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="diet"><Utensils className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="training" data-testid="athlete-tab-training"><Activity className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="notes"><MessageSquare className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="body"><Scale className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="media"><Camera className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="exercises"><PlayCircle className="w-4 h-4" /></TabsTrigger>
            {betaVisits && <TabsTrigger value="visits" data-testid="athlete-tab-visits" aria-label="Visite"><ClipboardList className="w-4 h-4" /></TabsTrigger>}
          </TabsList>

          {/* DIET TAB */}
          <TabsContent value="diet">
            <div className="space-y-4">
              {/* Piano alimentare (dieta completa o solo macro) con alternative e calcolatore */}
              {diet?.visible_to_athlete && diet?.plan?.mode && <DietPlanAthlete plan={diet.plan} />}
              {/* Macros card (se il coach usa il nuovo "solo macro", lo mostra già il piano) */}
              {macros && diet?.plan?.mode !== 'macro' && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">🎯 I Tuoi Macro Giornalieri</CardTitle>
                        {macros.data_inizio && <p className="text-xs text-muted-foreground mt-0.5">Dal {new Date(macros.data_inizio).toLocaleDateString('it-IT')}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => exportMacroPdf(athlete?.name || 'Atleta', macros, diet)}>
                        📄 Esporta PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Donut chart + valori */}
                    {(() => {
                      const p = (macros.proteine || 0) * 4;
                      const c = (macros.carboidrati || 0) * 4;
                      const g = (macros.grassi || 0) * 9;
                      const tot = p + c + g || 1;
                      const pDeg = p/tot*360; const cDeg = c/tot*360; const gDeg = g/tot*360;
                      const toRad = d => d * Math.PI / 180;
                      const arc = (startDeg, spanDeg, r, cx, cy) => {
                        if (spanDeg === 0) return '';
                        const x1 = cx + r * Math.cos(toRad(startDeg - 90));
                        const y1 = cy + r * Math.sin(toRad(startDeg - 90));
                        const x2 = cx + r * Math.cos(toRad(startDeg + spanDeg - 90));
                        const y2 = cy + r * Math.sin(toRad(startDeg + spanDeg - 90));
                        return `M40,40 L${x1},${y1} A${r},${r},0,${spanDeg>180?1:0},1,${x2},${y2} Z`;
                      };
                      return (
                        <div className="flex items-center gap-4">
                          <svg width="100" height="100" viewBox="0 0 80 80" className="flex-shrink-0">
                            {p > 0 && <path d={arc(0, pDeg, 30, 40, 40)} fill="#3b82f6" />}
                            {c > 0 && <path d={arc(pDeg, cDeg, 30, 40, 40)} fill="#22c55e" />}
                            {g > 0 && <path d={arc(pDeg+cDeg, gDeg, 30, 40, 40)} fill="#eab308" />}
                            <circle cx="40" cy="40" r="18" fill="hsl(var(--card))" />
                            <text x="40" y="38" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">{Math.round(macros.kcal || 0)}</text>
                            <text x="40" y="48" textAnchor="middle" fontSize="7" fill="gray">kcal</text>
                          </svg>
                          <div className="flex-1 space-y-2">
                            {[
                              { key: 'proteine', label: 'Proteine', color: 'bg-blue-500', pct: Math.round(p/tot*100) },
                              { key: 'carboidrati', label: 'Carboidrati', color: 'bg-green-500', pct: Math.round(c/tot*100) },
                              { key: 'grassi', label: 'Grassi', color: 'bg-yellow-500', pct: Math.round(g/tot*100) },
                            ].map(({ key, label, color, pct }) => (
                              <div key={key}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${color} inline-block`}/>{label}</span>
                                  <span className="font-medium">{Math.round(macros[key] || 0)}g <span className="text-muted-foreground">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {macros.note && <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">📝 {macros.note}</p>}
                  </CardContent>
                </Card>
              )}
              {!diet || !diet.visible_to_athlete ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="empty-state">
                      <Utensils className="w-12 h-12" />
                      <p className="mt-2">{diet && !diet.visible_to_athlete ? 'Piano alimentare non ancora disponibile' : 'Nessun piano alimentare assegnato'}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : diet.structured && diet.structured.giorni && diet.structured.giorni.length > 0 ? (
                <>
                  {diet.structured.giorni.map((g, gi) => {
                    const allFoods = g.pasti.flatMap(p => p.alimenti);
                    const totDay = allFoods.reduce((acc, f) => ({
                      calorie: acc.calorie + (f.calorie || 0),
                      proteine: acc.proteine + (f.proteine || 0),
                      carboidrati: acc.carboidrati + (f.carboidrati || 0),
                      grassi: acc.grassi + (f.grassi || 0),
                    }), { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 });
                    return (
                      <Card key={gi}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-base">{g.nome}</CardTitle>
                            <div className="flex gap-1 flex-wrap text-xs">
                              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">Kcal: {Math.round(totDay.calorie)}</span>
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">P: {Math.round(totDay.proteine)}g</span>
                              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">C: {Math.round(totDay.carboidrati)}g</span>
                              <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">G: {Math.round(totDay.grassi)}g</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {g.pasti.map((pasto, pi) => {
                            const totPasto = pasto.alimenti.reduce((acc, f) => ({
                              calorie: acc.calorie + (f.calorie || 0),
                              proteine: acc.proteine + (f.proteine || 0),
                              carboidrati: acc.carboidrati + (f.carboidrati || 0),
                              grassi: acc.grassi + (f.grassi || 0),
                            }), { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 });
                            return (
                              <div key={pi} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/40 px-3 py-1.5 flex items-center justify-between">
                                  <span className="font-semibold text-sm">{pasto.pasto}</span>
                                  <span className="text-xs text-muted-foreground">{Math.round(totPasto.calorie)} kcal · P:{Math.round(totPasto.proteine)} C:{Math.round(totPasto.carboidrati)} G:{Math.round(totPasto.grassi)}</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground bg-muted/20">
                                        <th className="text-left p-1.5 min-w-[120px]">Alimento</th>
                                        <th className="p-1.5 w-12 text-center">g</th>
                                        <th className="p-1.5 w-14 text-center">Kcal</th>
                                        <th className="p-1.5 w-10 text-center">P</th>
                                        <th className="p-1.5 w-10 text-center">C</th>
                                        <th className="p-1.5 w-10 text-center">G</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pasto.alimenti.map((f, fi) => (
                                        <tr key={fi} className="border-t border-border/40">
                                          <td className="p-1.5">{f.alimento}</td>
                                          <td className="p-1.5 text-center">{f.quantita || '—'}</td>
                                          <td className="p-1.5 text-center">{f.calorie ? Math.round(f.calorie) : '—'}</td>
                                          <td className="p-1.5 text-center">{f.proteine ? Math.round(f.proteine) : '—'}</td>
                                          <td className="p-1.5 text-center">{f.carboidrati ? Math.round(f.carboidrati) : '—'}</td>
                                          <td className="p-1.5 text-center">{f.grassi ? Math.round(f.grassi) : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {pasto.alimenti.some(f => f.note) && (
                                  <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border/40">
                                    {pasto.alimenti.filter(f => f.note).map((f, i) => (
                                      <span key={i}>💬 {f.alimento}: {f.note} </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              ) : (diet.pdfs && diet.pdfs.length > 0) ? (
                <div className="space-y-3">
                  {diet.pdfs.map((pdf, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <p className="font-medium truncate">{pdf.name}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleOpenPdf(pdf, index)} disabled={openingPdf === index}>
                          {openingPdf === index ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apri'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(pdf, index)} disabled={openingPdf === index}>Scarica</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="empty-state">
                      <Utensils className="w-12 h-12" />
                      <p className="mt-2">Nessun piano alimentare assegnato</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TRAINING TAB */}
          <TabsContent value="training">
            <div className="space-y-4">
              <RestTimer />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="w-5 h-5" />
                    {training?.program_name || 'Programma Allenamento'}
                  </CardTitle>
                  {training?.num_weeks && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">Settimana attiva:</span>
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: training.num_weeks }, (_, i) => i + 1).map(w => (
                          <Button key={w} size="sm" variant={selectedWeek === w ? 'default' : 'outline'} onClick={() => setSelectedWeek(w)} className="w-9 h-9">{w}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {!training || training.days?.length === 0 ? (
                <Card>
                  <CardContent>
                    <div className="empty-state py-8">
                      <Activity className="w-12 h-12" />
                      <p className="mt-2">Nessun programma assegnato</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                training.days?.map((day, dayIndex) => {
                  const wi = selectedWeek - 1;
                  const running = isRunningDay(day);
                  return (
                    <Card key={dayIndex}>
                      <CardHeader className="pb-2">
                        <button className="w-full flex items-center justify-between" onClick={() => setExpandedDay(expandedDay === dayIndex ? null : dayIndex)} data-testid={`training-day-${dayIndex}`}>
                          <CardTitle className="text-base flex items-center gap-2">
                            {day.day}
                            {isRunningDay(day) && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">🏃 Corsa</span>}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{day.exercises.length} esercizi</span>
                            {expandedDay === dayIndex ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>
                      </CardHeader>
                      {expandedDay === dayIndex && (
                        <CardContent className="space-y-3">
                          {day.exercises.map((exercise, exIndex) => {
                            const weeks = exercise.weeks || [];
                            const weekData = weeks[wi] || {};
                            const existingLoad = getLoadForExercise(exercise.name, selectedWeek);
                            return (
                              <div key={exIndex} className="border rounded-lg p-3 space-y-2" data-testid={`exercise-load-${exercise.name}`}>
                                <p className="font-semibold">{exercise.name}</p>
                                {running ? (
                                  RUNNING_FIELDS.some((f) => weekData[f.key]) && (
                                    <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Indicazioni Coach — W{selectedWeek}</p>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        {RUNNING_FIELDS.filter((f) => f.key !== 'note' && weekData[f.key]).map((f) => (
                                          <div key={f.key} className="flex justify-between"><span className="text-muted-foreground">{f.full || f.label}</span><strong>{weekData[f.key]}</strong></div>
                                        ))}
                                      </div>
                                      {weekData.note && <p className="text-xs text-muted-foreground border-t pt-1 italic">💬 {weekData.note}</p>}
                                    </div>
                                  )
                                ) : (weekData.sets || weekData.reps || weekData.rpe || weekData.carico || weekData.note) && (
                                  <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Indicazioni Coach — W{selectedWeek}</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      {weekData.sets && <div className="flex justify-between"><span className="text-muted-foreground">Serie</span><strong>{weekData.sets}</strong></div>}
                                      {weekData.reps && <div className="flex justify-between"><span className="text-muted-foreground">Reps</span><strong>{weekData.reps}</strong></div>}
                                      {weekData.rpe && <div className="flex justify-between"><span className="text-muted-foreground">RPE</span><strong>{weekData.rpe}</strong></div>}
                                      {weekData.carico && (
                                        <div className="flex justify-between col-span-2 border-t pt-1 mt-1">
                                          <span className="text-muted-foreground">⚖️ Carico consigliato</span>
                                          <strong className="text-primary">{weekData.carico}</strong>
                                        </div>
                                      )}
                                    </div>
                                    {weekData.note && <p className="text-xs text-muted-foreground border-t pt-1 italic">💬 {weekData.note}</p>}
                                  </div>
                                )}
                                <ExerciseLoadRow
                                  running={running}
                                  exercise={running
                                    ? { ...exercise, sets: parseInt(weekData.ripetizioni) || 1, reps: '' }
                                    : { ...exercise, sets: parseInt(weekData.sets) || exercise.sets || 3, reps: weekData.reps || exercise.reps || '' }}
                                  existingLoad={existingLoad}
                                  week={selectedWeek}
                                  saving={savingLoad === `${exercise.name}-${selectedWeek}`}
                                  onSave={(sets, notes) => saveExerciseLoad(exercise.name, selectedWeek, sets, notes, running)}
                                />
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />Note dal Coach
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notes?.content ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{notes.content}</div>
                ) : (
                  <div className="empty-state py-8">
                    <MessageSquare className="w-12 h-12" />
                    <p className="mt-2">Nessuna nota dal coach</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BODY CHECK TAB */}
          <TabsContent value="body">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />Inserisci Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Peso (kg)</Label>
                      <Input type="number" inputMode="decimal" placeholder="es. 75.5" value={newCheck.weight} onChange={e => setNewCheck({ ...newCheck, weight: e.target.value })} />
                    </div>
                    <div>
                      <Label>Altezza (cm)</Label>
                      <Input type="number" inputMode="decimal" placeholder="es. 178" value={newCheck.height} onChange={e => setNewCheck({ ...newCheck, height: e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={saveCheck} disabled={savingCheck}>
                    {savingCheck ? 'Salvataggio...' : 'Salva Check'}
                  </Button>
                </CardContent>
              </Card>

              {checks.length > 0 && (
                <>
                  {/* Ultimi valori */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Ultimo Peso</p>
                          <p className="text-2xl font-bold">{checks[0]?.weight ? checks[0].weight + ' kg' : '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Ultima Altezza</p>
                          <p className="text-2xl font-bold">{checks[0]?.height ? checks[0].height + ' cm' : '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Grafico andamento peso */}
                  {checks.filter(c => c.weight).length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">📈 Andamento Peso</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={[...checks].reverse().filter(c => c.weight).map(c => ({
                            data: new Date(c.created_at).toLocaleDateString('it-IT'),
                            peso: c.weight
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="peso" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Peso (kg)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Storico */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Storico</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checks.map((check, i) => (
                        <div key={check.id || i} className="p-3 bg-muted/30 rounded-lg text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">{new Date(check.created_at).toLocaleDateString('it-IT')}</span>
                              {check._pending ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400" title="Verrà inviato appena c'è rete">⏳ da inviare</span>
                              ) : check.id && (
                                <button
                                  onClick={() => {
                                    setEditingCheck(check.id);
                                    setEditDate(check.created_at?.slice(0, 10) || '');
                                  }}
                                  className="text-muted-foreground hover:text-foreground text-xs"
                                  title="Modifica data"
                                >✏️</button>
                              )}
                            </div>
                            <div className="flex gap-4">
                              {check.weight && <span>⚖️ <strong>{check.weight} kg</strong></span>}
                              {check.height && <span>📏 <strong>{check.height} cm</strong></span>}
                            </div>
                          </div>
                          {editingCheck === check.id && (
                            <div className="flex gap-2 items-center">
                              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-8 text-xs flex-1" />
                              <Button size="sm" className="h-8" onClick={() => saveCheckDate(check.id)}>Salva</Button>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditingCheck(null); setEditDate(''); }}>Annulla</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* MEDIA TAB */}
          <TabsContent value="media">
            <div className="space-y-4">
              {mediaError && (
                <Card>
                  <CardContent className="py-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Foto e video non caricati: la rete è debole.</p>
                    <Button size="sm" variant="outline" onClick={loadMedia} disabled={loadingMedia}>Riprova</Button>
                  </CardContent>
                </Card>
              )}
              {/* Photos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Camera className="w-4 h-4" />Foto
                    </CardTitle>
                    <div>
                      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      <Button size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                        {uploadingPhoto ? 'Caricamento...' : '+ Foto'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingMedia && photos.length === 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : photos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Nessuna foto</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative aspect-square rounded overflow-hidden bg-muted">
                            <img src={photo.image_data} alt="Check" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      {hasMorePhotos && (
                        <Button variant="outline" size="sm" className="w-full" onClick={loadMorePhotos} disabled={loadingMedia}>
                          {loadingMedia ? 'Caricamento...' : 'Mostra altre foto'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="w-4 h-4" />Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Titolo video..." value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} />
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    <Button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo || !newVideoTitle.trim()}>
                      {uploadingVideo ? '...' : 'Carica'}
                    </Button>
                  </div>
                  {uploadingVideo && (
                    <div className="space-y-1" data-testid="video-compress-progress">
                      {videoProgress !== null && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(videoProgress * 100)}%` }} />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {videoProgress !== null
                          ? `Riduco il video (${Math.round(videoProgress * 100)}%): tieni l'app aperta...`
                          : "Invio del video in corso: non chiudere l'app..."}
                      </p>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Max 3 minuti (meglio 15–60 secondi): il video viene ridotto in automatico.</p>
                  {videos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">{loadingMedia ? 'Caricamento...' : 'Nessun video'}</p>
                  ) : (
                    <div className="space-y-2">
                      {videos.map((video) => (
                        <div key={video.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Video className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm font-medium flex-1">{video.title}</p>
                          <span className="text-xs text-muted-foreground">{new Date(video.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VISITE (funzione beta, sola lettura) */}
          {betaVisits && (
            <TabsContent value="visits">
              <VisitsAthlete athleteName={athlete?.name} selfMeasure={!!athlete?.beta_self_measure} />
            </TabsContent>
          )}

          {/* EXERCISES TAB */}
          <TabsContent value="exercises">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />Libreria Esercizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exerciseVideos.length === 0 ? (
                  <div className="empty-state py-8">
                    <PlayCircle className="w-12 h-12" />
                    <p className="mt-2">Nessun esercizio disponibile</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exerciseVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{video.name}</p>
                          {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
                        </div>
                        {(video.youtube_url || video.video_url) && (
                          <Button size="sm" variant="outline" onClick={() => window.open(video.youtube_url || video.video_url, '_blank')}>
                            Guarda
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AthleteDashboard;
