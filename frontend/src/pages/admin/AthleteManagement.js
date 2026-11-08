import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Utensils, Activity, MessageSquare, Save, Trash2, Plus, X, Camera, Video, Play, Upload, FileText, Eye, EyeOff, Scale, ClipboardList, FlaskConical } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import VideoAnalyzer from '../../components/VideoAnalyzer';
import DietPlanEditor from '../../components/DietPlanEditor';
import VisitsAdmin from '../../components/VisitsAdmin';
import { DAY_TYPES, fieldsForDay, isRunningDay, runStats, formatTime } from '../../lib/trainingTypes';

const openPdfBase64 = (base64Data, filename = 'documento.pdf') => {
  try {
    const byteString = atob(base64Data.split(',')[1] || base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    alert('Impossibile aprire il PDF. Prova a scaricarlo.');
  }
};

// =====================================================================
//  PDF di archivio: programma + carichi dell'atleta + progressione
// =====================================================================
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const fmtNum = (n) => (n === null || n === undefined ? '—' : (Math.round(n * 10) / 10).toLocaleString('it-IT'));

/** Carico massimo e volume (kg × reps) di una settimana */
const weekStats = (load) => {
  if (!load || !Array.isArray(load.sets) || load.sets.length === 0) return null;
  let max = null;
  let volume = 0;
  let hasVolume = false;
  load.sets.forEach((s) => {
    const w = toNum(s.weight);
    const r = toNum(s.reps);
    if (w !== null) max = max === null ? w : Math.max(max, w);
    if (w !== null && r !== null) {
      volume += w * r;
      hasVolume = true;
    }
  });
  if (max === null && !hasVolume) return null;
  return { max, volume: hasVolume ? Math.round(volume) : null };
};

const deltaHtml = (from, to, unit) => {
  if (from === null || from === undefined || to === null || to === undefined) return '<span style="color:#999">—</span>';
  const d = to - from;
  const pct = from > 0 ? Math.round((d / from) * 100) : null;
  const sign = d > 0 ? '+' : '';
  const color = d > 0 ? '#15803d' : d < 0 ? '#b91c1c' : '#666';
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '=';
  return `<span style="color:${color};font-weight:bold;">${arrow} ${sign}${fmtNum(d)}${unit}${pct !== null ? ` (${sign}${pct}%)` : ''}</span>`;
};

/** Prima e ultima settimana con dati per un esercizio */
const progressionFor = (statsByWeek) => {
  const weeksWithData = Object.keys(statsByWeek).map(Number).filter((w) => statsByWeek[w]).sort((a, b) => a - b);
  if (weeksWithData.length === 0) return null;
  const firstWeek = weeksWithData[0];
  const lastWeek = weeksWithData[weeksWithData.length - 1];
  return { firstWeek, lastWeek, first: statsByWeek[firstWeek], last: statsByWeek[lastWeek], single: firstWeek === lastWeek };
};

/** Variazione del tempo medio nella corsa: tempo più basso = più veloce = verde */
const timeDeltaHtml = (from, to) => {
  if (from === null || from === undefined || to === null || to === undefined) return '<span style="color:#999">—</span>';
  const d = Math.round(to - from);
  if (d === 0) return '<span style="color:#666;font-weight:bold;">= stesso tempo</span>';
  const faster = d < 0;
  const color = faster ? '#15803d' : '#b91c1c';
  return `<span style="color:${color};font-weight:bold;">${faster ? '▲' : '▼'} ${faster ? '-' : '+'}${formatTime(Math.abs(d))} (${faster ? 'più veloce' : 'più lento'})</span>`;
};

const generateTrainingPdf = (training, athleteName, trainingLoads = [], legacyLoads = []) => {
  const numWeeks = training.num_weeks || 4;
  const days = training.days || [];
  const cell = 'border:1px solid #ddd;padding:3px 5px;font-size:10px;';

  // carichi indicizzati per esercizio e settimana
  const loadMap = {};
  trainingLoads.forEach((l) => {
    if (!l || !l.exercise_name) return;
    loadMap[l.exercise_name] = loadMap[l.exercise_name] || {};
    loadMap[l.exercise_name][l.week] = l;
  });

  // tipo di ogni esercizio (forza / corsa) in base al giorno in cui si trova
  const exerciseType = {};
  const programExercises = [];
  days.forEach((day) => (day.exercises || []).forEach((ex) => {
    if (!ex.name) return;
    if (!programExercises.includes(ex.name)) programExercises.push(ex.name);
    if (!exerciseType[ex.name]) exerciseType[ex.name] = isRunningDay(day) ? 'corsa' : 'forza';
  }));
  const extraExercises = Object.keys(loadMap).filter((n) => !programExercises.includes(n));
  // esercizi fuori programma: corsa se i set registrati hanno un tempo
  extraExercises.forEach((n) => {
    const anyTime = Object.values(loadMap[n]).some((l) => (l.sets || []).some((s) => s.tempo));
    exerciseType[n] = anyTime ? 'corsa' : 'forza';
  });
  const isRun = (name) => exerciseType[name] === 'corsa';

  const statsFor = (name) => {
    const fn = isRun(name) ? runStats : weekStats;
    const byWeek = {};
    for (let w = 1; w <= numWeeks; w++) byWeek[w] = fn(loadMap[name]?.[w]);
    // eventuali settimane oltre num_weeks
    Object.keys(loadMap[name] || {}).forEach((w) => {
      if (Number(w) > numWeeks) byWeek[Number(w)] = fn(loadMap[name][w]);
    });
    return byWeek;
  };

  const allNames = [...programExercises, ...extraExercises];
  const strengthNames = allNames.filter((n) => !isRun(n));
  const runningNames = allNames.filter((n) => isRun(n));
  const th = (h) => `<th style="background:#333;color:#fff;padding:4px 6px;font-size:10px;border:1px solid #555;">${h}</th>`;

  // ---------- Riepilogo progressione: forza ----------
  const strengthSummaryRow = (name) => {
    const prog = progressionFor(statsFor(name));
    if (!prog) {
      return `<tr><td style="${cell}font-size:11px;">${esc(name)}</td><td colspan="4" style="${cell}color:#999;text-align:center;">nessun carico inserito</td></tr>`;
    }
    const label = prog.single ? `solo W${prog.firstWeek}` : `W${prog.firstWeek} → W${prog.lastWeek}`;
    return `<tr>
      <td style="${cell}font-size:11px;"><strong>${esc(name)}</strong><br><span style="color:#888;">${label}</span></td>
      <td style="${cell}text-align:center;">${fmtNum(prog.first.max)}${prog.single ? '' : ` → ${fmtNum(prog.last.max)}`} kg</td>
      <td style="${cell}text-align:center;">${prog.single ? '—' : deltaHtml(prog.first.max, prog.last.max, ' kg')}</td>
      <td style="${cell}text-align:center;">${fmtNum(prog.first.volume)}${prog.single ? '' : ` → ${fmtNum(prog.last.volume)}`}</td>
      <td style="${cell}text-align:center;">${prog.single ? '—' : deltaHtml(prog.first.volume, prog.last.volume, '')}</td>
    </tr>`;
  };

  // ---------- Riepilogo progressione: corsa ----------
  const runningSummaryRow = (name) => {
    const prog = progressionFor(statsFor(name));
    if (!prog) {
      return `<tr><td style="${cell}font-size:11px;">${esc(name)}</td><td colspan="3" style="${cell}color:#999;text-align:center;">nessun tempo inserito</td></tr>`;
    }
    const label = prog.single ? `solo W${prog.firstWeek}` : `W${prog.firstWeek} → W${prog.lastWeek}`;
    return `<tr>
      <td style="${cell}font-size:11px;"><strong>${esc(name)}</strong><br><span style="color:#888;">${label}</span></td>
      <td style="${cell}text-align:center;">${formatTime(prog.first.avg)}${prog.single ? '' : ` → ${formatTime(prog.last.avg)}`}</td>
      <td style="${cell}text-align:center;">${formatTime(prog.first.best)}${prog.single ? '' : ` → ${formatTime(prog.last.best)}`}</td>
      <td style="${cell}text-align:center;">${prog.single ? '—' : timeDeltaHtml(prog.first.avg, prog.last.avg)}</td>
    </tr>`;
  };

  let summary = '';
  if (strengthNames.length > 0) {
    summary += '<div style="margin-bottom:24px;page-break-inside:avoid;">' +
      '<h2>📈 Riepilogo progressione carichi</h2>' +
      '<p>Confronto tra la prima e l\'ultima settimana in cui l\'atleta ha inserito il carico. Carico max = kg più alto della settimana · Volume = somma di kg × ripetizioni.</p>' +
      '<table style="border-collapse:collapse;width:100%;"><thead><tr>' +
      ['Esercizio', 'Carico max', 'Variazione max', 'Volume (kg×reps)', 'Variazione volume'].map(th).join('') +
      '</tr></thead><tbody>' + strengthNames.map(strengthSummaryRow).join('') + '</tbody></table></div>';
  }
  if (runningNames.length > 0) {
    summary += '<div style="margin-bottom:24px;page-break-inside:avoid;">' +
      '<h2>🏃 Riepilogo progressione corsa</h2>' +
      '<p>Tempo medio e miglior tempo delle ripetizioni, tra la prima e l\'ultima settimana in cui l\'atleta ha inserito i tempi.</p>' +
      '<table style="border-collapse:collapse;width:100%;"><thead><tr>' +
      ['Esercizio', 'Tempo medio', 'Miglior tempo', 'Variazione tempo medio'].map(th).join('') +
      '</tr></thead><tbody>' + runningNames.map(runningSummaryRow).join('') + '</tbody></table></div>';
  }

  // ---------- Dettaglio dati atleta per esercizio ----------
  const weekCell = (name, w) => {
    const load = loadMap[name]?.[w];
    const empty = `<td style="${cell}color:#bbb;text-align:center;">—</td>`;
    if (!load) return empty;
    const notes = load.notes ? `<div style="color:#777;font-style:italic;margin-top:2px;">💬 ${esc(load.notes)}</div>` : '';
    if (isRun(name)) {
      const st = runStats(load);
      if (!st) return empty;
      const timesTxt = (load.sets || []).filter((s) => s.tempo)
        .map((s, i) => `${i + 1}) ${esc(s.tempo)}`).join('<br>');
      return `<td style="${cell}vertical-align:top;">${timesTxt}` +
        `<div style="color:#555;margin-top:3px;border-top:1px dotted #ccc;padding-top:2px;">media <strong>${formatTime(st.avg)}</strong> · migliore ${formatTime(st.best)}</div>` +
        notes + '</td>';
    }
    const st = weekStats(load);
    if (!st) return empty;
    const setsTxt = (load.sets || [])
      .filter((s) => s.weight !== '' || s.reps !== '')
      .map((s) => `${esc(s.weight || '?')}×${esc(s.reps || '?')}`).join('<br>');
    return `<td style="${cell}vertical-align:top;">${setsTxt}` +
      `<div style="color:#555;margin-top:3px;border-top:1px dotted #ccc;padding-top:2px;">max <strong>${fmtNum(st.max)}</strong> · vol ${fmtNum(st.volume)}</div>` +
      notes + '</td>';
  };

  const loadsTable = (names) => {
    let head = `<th style="${cell}background:#f5f5f5;text-align:left;min-width:120px;">Esercizio</th>`;
    for (let w = 1; w <= numWeeks; w++) head += `<th style="${cell}background:#1e3a8a;color:#fff;text-align:center;">W${w}</th>`;
    head += `<th style="${cell}background:#15803d;color:#fff;text-align:center;">Progressione</th>`;
    const rows = names.map((name) => {
      const prog = progressionFor(statsFor(name));
      let cols = `<td style="${cell}font-size:11px;"><strong>${esc(name)}</strong></td>`;
      for (let w = 1; w <= numWeeks; w++) cols += weekCell(name, w);
      let progTxt;
      if (!prog) progTxt = '<span style="color:#999">—</span>';
      else if (prog.single) progTxt = `<span style="color:#888">solo W${prog.firstWeek}</span>`;
      else if (isRun(name)) progTxt = `Media: ${timeDeltaHtml(prog.first.avg, prog.last.avg)}`;
      else progTxt = `Max: ${deltaHtml(prog.first.max, prog.last.max, ' kg')}<br>Vol: ${deltaHtml(prog.first.volume, prog.last.volume, '')}`;
      return `<tr>${cols}<td style="${cell}vertical-align:top;">${progTxt}</td></tr>`;
    }).join('');
    return '<table style="border-collapse:collapse;width:100%;margin-top:6px;"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>';
  };

  let rows = '';
  days.forEach(day => {
    const fields = fieldsForDay(day);
    const running = isRunningDay(day);
    let weekHeaders = '<th style="border:1px solid #ddd;padding:4px 6px;text-align:left;min-width:150px;background:#f5f5f5;">Esercizio</th>';
    let subHeaders = '<th style="border:1px solid #ddd;"></th>';
    for (let wi = 0; wi < numWeeks; wi++) {
      weekHeaders += '<th colspan="' + fields.length + '" style="background:#333;color:#fff;padding:4px;text-align:center;border:1px solid #555;">W' + (wi+1) + '</th>';
      fields.forEach(f => {
        subHeaders += '<th style="background:#555;color:#fff;padding:2px 4px;font-size:9px;border:1px solid #666;">' + (f.full || f.label) + '</th>';
      });
    }
    let exRows = '';
    (day.exercises || []).forEach(ex => {
      let cols = '<td style="border:1px solid #ddd;padding:3px 6px;font-size:11px;">' + esc(ex.name) + '</td>';
      for (let wi = 0; wi < numWeeks; wi++) {
        const w = (ex.weeks && ex.weeks[wi]) ? ex.weeks[wi] : {};
        fields.forEach(f => {
          const isNote = f.key === 'note';
          cols += '<td style="border:1px solid #ddd;padding:3px 5px;font-size:10px;' + (isNote ? 'max-width:80px;' : 'text-align:center;') + '">' + esc(w[f.key]) + '</td>';
        });
      }
      exRows += '<tr>' + cols + '</tr>';
    });
    const dayExercises = (day.exercises || []).map((ex) => ex.name).filter(Boolean);
    rows += '<div style="margin-bottom:24px;">';
    rows += '<div style="font-weight:bold;font-size:13px;margin-bottom:6px;padding:5px 8px;background:#eee;border-radius:4px;">' + (running ? '🏃 ' : '') + esc(day.day) + (running ? ' <span style="font-weight:normal;color:#666;font-size:11px;">(corsa)</span>' : '') + '</div>';
    rows += '<p style="margin:0 0 4px;color:#333;font-weight:bold;">📋 Indicazioni del coach</p>';
    rows += '<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;">';
    rows += '<thead><tr>' + weekHeaders + '</tr><tr>' + subHeaders + '</tr></thead>';
    rows += '<tbody>' + exRows + '</tbody></table></div>';
    if (dayExercises.length > 0) {
      rows += '<p style="margin:10px 0 0;color:#333;font-weight:bold;">' + (running ? '⏱️ Tempi inseriti dall\'atleta (per ripetizione)' : '🏋️ Carichi inseriti dall\'atleta (kg × reps)') + '</p>';
      rows += '<div style="overflow-x:auto;">' + loadsTable(dayExercises) + '</div>';
    }
    rows += '</div>';
  });

  let extras = '';
  if (extraExercises.length > 0) {
    extras += '<div style="margin-bottom:24px;"><h2>Altri esercizi registrati</h2>' +
      '<p>Dati inseriti per esercizi che non sono (più) nel programma, ad esempio perché rinominati.</p>' +
      loadsTable(extraExercises) + '</div>';
  }
  if (legacyLoads.length > 0) {
    extras += '<div style="margin-bottom:24px;"><h2>Carichi registrati con la versione precedente dell\'app</h2><ul>' +
      legacyLoads.map((l) => `<li>${l.created_at ? new Date(l.created_at).toLocaleDateString('it-IT') + ' · ' : ''}<strong>${esc(l.exercise)}</strong>: ${fmtNum(l.weight)} kg × ${esc(l.reps)}${l.notes ? ` — <em>${esc(l.notes)}</em>` : ''}</li>`).join('') +
      '</ul></div>';
  }

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(training.program_name || 'Programma') + ' - ' + esc(athleteName) + '</title>' +
    '<style>body{font-family:Arial,sans-serif;margin:20px;color:#111;background:#fff;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;margin:0 0 6px;border-bottom:2px solid #333;padding-bottom:3px;}' +
    'p{color:#666;font-size:11px;margin:0 0 10px;}li{font-size:11px;margin-bottom:3px;}' +
    '.noprint{margin:0 0 16px;padding:8px 14px;border:0;border-radius:6px;background:#111;color:#fff;font-size:13px;cursor:pointer;}' +
    '@media print{body{margin:10px;}.noprint{display:none;}}</style>' +
    '</head><body>' +
    '<button class="noprint" onclick="window.print()">🖨️ Stampa / Salva come PDF</button>' +
    '<h1>' + esc(training.program_name || 'Programma Allenamento') + '</h1>' +
    '<p>Atleta: ' + esc(athleteName) + ' &nbsp;&middot;&nbsp; ' + numWeeks + ' settimane &nbsp;&middot;&nbsp; Archiviato il ' + new Date().toLocaleDateString('it-IT') + '</p>' +
    summary + rows + extras + '</body></html>';

  // Encode as base64 data URL
  const encoded = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(html)));
  return Promise.resolve(encoded);
};

const AthleteManagement = () => {
  const { athleteId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [athlete, setAthlete] = useState(null);
  const [savingBeta, setSavingBeta] = useState(false);
  const [activeTab, setActiveTab] = useState('diet');
  const [diet, setDiet] = useState({ pdf_data: null, pdfs: [], visible_to_athlete: true });
  const [newPdfName, setNewPdfName] = useState('');
  const [addingPdf, setAddingPdf] = useState(false);
  const [training, setTraining] = useState({ program_name: '', num_weeks: 4, days: [] });
  const [notes, setNotes] = useState({ content: '' });
  // Carichi della vecchia versione dell'app: non vengono più mostrati, servono solo per il PDF di archivio
  const [legacyLoads, setLegacyLoads] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [bodyChecks, setBodyChecks] = useState([]);
  const [deletingCheckId, setDeletingCheckId] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const pdfInputRef = React.useRef(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [comparing, setComparing] = useState(null);
  const [structuredDiet, setStructuredDiet] = useState({ giorni: [], visible_to_athlete: true });
  const [macros, setMacros] = useState({ kcal: '', proteine: '', carboidrati: '', grassi: '', note: '', data_inizio: '', visible_to_athlete: true });
  const [deletingStructured, setDeletingStructured] = useState(false);

  useEffect(() => {
    loadAthleteData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const [videosLoaded, setVideosLoaded] = useState(false);

  const loadVideosIfNeeded = () => {
    if (videosLoaded) return;
    setVideosLoaded(true);
    adminAPI.getAthleteVideos(athleteId).then(res => setVideos(res.data || [])).catch(() => {});
  };

  const loadAthleteData = async () => {
    try {
      const [detailRes, checksRes, historyRes] = await Promise.all([
        adminAPI.getAthleteDetail(athleteId),
        adminAPI.getAthleteChecks(athleteId).catch(() => ({ data: [] })),
        adminAPI.getTrainingHistory(athleteId).catch(() => ({ data: [] }))
      ]);
      setAthlete(detailRes.data.athlete);
      setDiet(detailRes.data.diet || { pdf_data: null, pdfs: [], visible_to_athlete: true });
      setTraining(detailRes.data.training || { program_name: '', num_weeks: 4, days: [] });
      setNotes(detailRes.data.notes || { content: '' });
      setLegacyLoads(detailRes.data.loads || []);
      setPhotos(detailRes.data.photos || []);
      setBodyChecks(checksRes.data || []);
      setTrainingHistory(historyRes.data || []);
      // Load structured diet
      adminAPI.getMacros(athleteId).then(res => {
        if (res.data && Object.keys(res.data).length > 0) setMacros(prev => ({ ...prev, ...res.data }));
      }).catch(() => {});
      adminAPI.getStructuredDiet(athleteId).then(res => {
        if (res.data && res.data.giorni) setStructuredDiet(res.data);
      }).catch(() => {});
    } catch (error) {
      toast.error('Errore nel caricamento dati atleta');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Seleziona un file PDF'); return; }
    if (!newPdfName.trim()) { toast.error('Inserisci un nome per il PDF'); return; }
    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const pdfData = event.target?.result;
        try {
          const currentPdfs = diet.pdfs || [];
          const updatedPdfs = [...currentPdfs, { name: newPdfName.trim(), pdf_data: pdfData }];
          await adminAPI.updateDiet(athleteId, {
            pdf_data: diet.pdf_data,
            pdfs: updatedPdfs,
            visible_to_athlete: diet.visible_to_athlete
          });
          setDiet({ ...diet, pdfs: updatedPdfs });
          setNewPdfName('');
          setAddingPdf(false);
          toast.success('PDF aggiunto!');
        } catch (error) {
          toast.error('Errore nel caricamento');
        } finally {
          setUploadingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Errore nella lettura del file');
      setUploadingPdf(false);
    }
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const deleteBodyCheck = async (check) => {
    const what = [check.weight && `${check.weight} kg`, check.height && `${check.height} cm`].filter(Boolean).join(', ');
    const day = new Date(check.created_at).toLocaleDateString('it-IT');
    if (!window.confirm(`Eliminare il check del ${day}${what ? ` (${what})` : ''}? Sparisce anche per l'atleta.`)) return;
    setDeletingCheckId(check.id);
    try {
      await adminAPI.deleteAthleteCheck(athleteId, check.id);
      setBodyChecks((list) => list.filter((c) => c.id !== check.id));
      toast.success('Check eliminato');
    } catch (e) {
      toast.error(`Check non eliminato: ${e.response?.data?.detail || (e.response ? `errore ${e.response.status}` : e.message || 'connessione assente')}`);
    } finally {
      setDeletingCheckId(null);
    }
  };

  const deletePdfByIndex = async (index) => {
    try {
      const updatedPdfs = (diet.pdfs || []).filter((_, i) => i !== index);
      await adminAPI.updateDiet(athleteId, {
        pdf_data: diet.pdf_data,
        pdfs: updatedPdfs,
        visible_to_athlete: diet.visible_to_athlete
      });
      setDiet({ ...diet, pdfs: updatedPdfs });
      toast.success('PDF rimosso');
    } catch (error) {
      toast.error('Errore nella rimozione');
    }
  };

  const toggleDietVisibility = async () => {
    const newVisible = !diet.visible_to_athlete;
    try {
      await adminAPI.toggleDietVisibility(athleteId, newVisible);
      setDiet({ ...diet, visible_to_athlete: newVisible });
      toast.success(newVisible ? "Dieta visibile all'atleta" : "Dieta nascosta all'atleta");
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  // Vecchia "dieta a tabella" (giorni → pasti → alimenti): nell'app dell'atleta ha la precedenza sui PDF,
  // quindi se resta salvata l'atleta non vede i PDF caricati. Qui si può eliminare.
  const deleteStructuredDiet = async () => {
    if (!window.confirm(`Eliminare la dieta a tabella di ${athlete?.name || 'questo atleta'}?\n\nL'atleta non la vedrà più e al suo posto vedrà i PDF della dieta. L'operazione non si può annullare.`)) return;
    setDeletingStructured(true);
    try {
      await adminAPI.updateStructuredDiet(athleteId, { giorni: [], visible_to_athlete: true, note_generali: null });
      setStructuredDiet({ giorni: [], visible_to_athlete: true });
      toast.success('Dieta a tabella eliminata');
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeletingStructured(false);
    }
  };

  const openVideoAnalyzer = async (video) => {
    try {
      const response = await adminAPI.getVideoAnnotations(video.id);
      setAnnotations(response.data);
      setSelectedVideo(video);
    } catch (error) {
      toast.error('Errore nel caricamento annotazioni');
    }
  };

  const handleSaveAnnotation = async (data) => {
    await adminAPI.createAnnotation(selectedVideo.id, data);
    const response = await adminAPI.getVideoAnnotations(selectedVideo.id);
    setAnnotations(response.data);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    await adminAPI.deleteAnnotation(annotationId);
    setAnnotations(annotations.filter(a => a.id !== annotationId));
  };

  const saveTraining = async () => {
    setSaving(true);
    try {
      await adminAPI.updateTraining(athleteId, training);
      toast.success('Allenamento salvato!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Archiviazione: il PDF contiene programma + carichi dell'atleta + progressione.
  // Dopo l'archiviazione i carichi vengono cancellati dal database (restano solo nel PDF).
  const archiveTraining = async () => {
    const ok = window.confirm(
      `Archiviare "${training.program_name}"?\n\n` +
      `Nello storico verrà salvato un PDF con il programma e i carichi inseriti dall'atleta, ` +
      `con la progressione da W1 a W${numWeeks}.\n\n` +
      `Dopo l'archiviazione i carichi verranno cancellati dal database e il nuovo programma partirà da zero.`
    );
    if (!ok) return;
    setArchiving(true);
    try {
      // Carichi aggiornati al momento esatto dell'archiviazione
      const loadsRes = await adminAPI.getAthleteTrainingLoads(athleteId);
      const pdfData = await generateTrainingPdf(training, athlete?.name || 'Atleta', loadsRes.data || [], legacyLoads);
      const res = await adminAPI.archiveTraining(athleteId, { pdf_data: pdfData });
      const n = res.data?.deleted_loads || 0;
      toast.success(n > 0 ? `Programma archiviato con ${n} carichi dell'atleta!` : 'Programma archiviato!');
      loadAthleteData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore: programma non archiviato (i carichi non sono stati toccati)');
    } finally {
      setArchiving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await adminAPI.updateNotes(athleteId, notes);
      toast.success('Note salvate!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Funzione beta "Misurati da casa" (dentro le Visite)
  const toggleSelfMeasure = async () => {
    const next = !athlete?.beta_self_measure;
    setSavingBeta(true);
    try {
      const res = await adminAPI.setBeta(athleteId, { self_measure: next });
      setAthlete((a) => ({ ...a, ...(res.data || { beta_self_measure: next }) }));
      toast.success(next ? `"Misurati da casa" attivata per ${athlete?.name}` : `"Misurati da casa" disattivata per ${athlete?.name}`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setSavingBeta(false);
    }
  };

  // Funzione beta "Visite": la attivi solo per gli atleti che scegli
  const betaVisits = !!athlete?.beta_visits;
  const toggleBetaVisits = async () => {
    const next = !betaVisits;
    setSavingBeta(true);
    try {
      await adminAPI.setBeta(athleteId, { visits: next });
      setAthlete((a) => ({ ...a, beta_visits: next, ...(next ? {} : { beta_self_measure: false }) }));
      if (!next && activeTab === 'visits') setActiveTab('diet');
      toast.success(next ? `Visite (beta) attivate per ${athlete?.name}` : `Visite (beta) disattivate per ${athlete?.name}`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setSavingBeta(false);
    }
  };

  const deleteAthlete = async () => {
    try {
      await adminAPI.deleteAthlete(athleteId);
      toast.success('Atleta eliminato');
      navigate('/admin');
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const deletePhoto = async (photoId) => {
    if (!window.confirm('Eliminare questa foto?')) return;
    try {
      await adminAPI.deleteAthletePhoto(athleteId, photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      if (previewPhoto?.id === photoId) setPreviewPhoto(null);
      toast.success('Foto eliminata');
    } catch { toast.error("Errore nell'eliminazione"); }
  };

  const toggleCompareSelect = (photo) => {
    setCompareSelection(prev => {
      const exists = prev.find(p => p.id === photo.id);
      if (exists) return prev.filter(p => p.id !== photo.id);
      if (prev.length >= 2) return [prev[1], photo];
      return [...prev, photo];
    });
  };

  const addTrainingDay = () => {
    setTraining({ ...training, days: [...training.days, { day: '', exercises: [] }] });
  };

  const updateTrainingDay = (index, field, value) => {
    const updated = [...training.days];
    updated[index] = { ...updated[index], [field]: value };
    setTraining({ ...training, days: updated });
  };

  const removeTrainingDay = (index) => {
    setTraining({ ...training, days: training.days.filter((_, i) => i !== index) });
  };

  const numWeeks = training.num_weeks || 4;
  const emptyWeek = (day) => Object.fromEntries(fieldsForDay(day).map((f) => [f.key, '']));
  const makeEmptyWeeks = (n, day) => Array.from({ length: n }, () => emptyWeek(day));

  const addExercise = (dayIndex) => {
    const updated = [...training.days];
    updated[dayIndex].exercises.push({ name: '', weeks: makeEmptyWeeks(numWeeks, updated[dayIndex]) });
    setTraining({ ...training, days: updated });
  };

  const updateExerciseName = (dayIndex, exIndex, value) => {
    const updated = [...training.days];
    updated[dayIndex].exercises[exIndex].name = value;
    setTraining({ ...training, days: updated });
  };

  const updateWeekField = (dayIndex, exIndex, weekIndex, field, value) => {
    const updated = [...training.days];
    const ex = updated[dayIndex].exercises[exIndex];
    if (!ex.weeks) ex.weeks = makeEmptyWeeks(numWeeks, updated[dayIndex]);
    while (ex.weeks.length < numWeeks) ex.weeks.push(emptyWeek(updated[dayIndex]));
    ex.weeks[weekIndex] = { ...ex.weeks[weekIndex], [field]: value };
    setTraining({ ...training, days: updated });
  };

  const removeExercise = (dayIndex, exIndex) => {
    const updated = [...training.days];
    updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, i) => i !== exIndex);
    setTraining({ ...training, days: updated });
  };

  const moveExercise = (dayIndex, exIndex, direction) => {
    const updated = [...training.days];
    const exs = [...updated[dayIndex].exercises];
    const newIndex = exIndex + direction;
    if (newIndex < 0 || newIndex >= exs.length) return;
    [exs[exIndex], exs[newIndex]] = [exs[newIndex], exs[exIndex]];
    updated[dayIndex].exercises = exs;
    setTraining({ ...training, days: updated });
  };

  const changeNumWeeks = (n) => {
    const updated = training.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => {
        const weeks = ex.weeks ? [...ex.weeks] : [];
        while (weeks.length < n) weeks.push(emptyWeek(day));
        return { ...ex, weeks: weeks.slice(0, n) };
      })
    }));
    setTraining({ ...training, num_weeks: n, days: updated });
  };

  // Copia una settimana SOLO per un esercizio: "next" = sulla settimana dopo, "rest" = su tutte le successive.
  // Utile per il powerlifting (ogni esercizio con le sue % e set/reps) e per la corsa.
  const copyExerciseWeek = (dayIndex, exIndex, sourceWeekIndex, mode) => {
    if (sourceWeekIndex >= numWeeks - 1) return;
    const targets = mode === 'next'
      ? [sourceWeekIndex + 1]
      : Array.from({ length: numWeeks - sourceWeekIndex - 1 }, (_, i) => sourceWeekIndex + 1 + i);
    let exName = '';
    const days = training.days.map((day, di) => {
      if (di !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) => {
          if (ei !== exIndex) return ex;
          exName = ex.name;
          const weeks = Array.from({ length: numWeeks }, (_, i) => ({ ...(ex.weeks?.[i] || {}) }));
          const source = { ...weeks[sourceWeekIndex] };
          targets.forEach((t) => { weeks[t] = { ...source }; });
          return { ...ex, weeks };
        }),
      };
    });
    setTraining({ ...training, days });
    const last = targets[targets.length - 1] + 1;
    toast.success(`${exName || 'Esercizio'}: W${sourceWeekIndex + 1} copiata su ${targets.length === 1 ? `W${last}` : `W${sourceWeekIndex + 2}–W${last}`}`);
  };

  // Tipo del giorno: Forza (set, reps, RPE, carico) o Corsa (ripetizioni, metri, km, tempo, zona).
  // I valori già inseriti non vengono cancellati: cambiando tipo restano salvati.
  const setDayType = (dayIndex, type) => {
    const days = training.days.map((day, di) => (di === dayIndex ? { ...day, type } : day));
    setTraining({ ...training, days });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" data-testid="back-btn" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{athlete?.name}</h1>
                <p className="text-sm text-muted-foreground">@{athlete?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <Button
              variant={betaVisits ? 'default' : 'outline'}
              size="sm"
              onClick={toggleBetaVisits}
              disabled={savingBeta}
              title={betaVisits ? 'Disattiva la sezione Visite (beta) per questo atleta' : 'Attiva la sezione Visite (beta) per questo atleta'}
              data-testid="toggle-beta-visits"
              aria-pressed={betaVisits}
            >
              <FlaskConical className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{betaVisits ? 'Visite beta: attive' : 'Attiva Visite beta'}</span>
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="delete-athlete-btn">
                  <Trash2 className="w-4 h-4 mr-2" />Elimina
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Conferma Eliminazione</DialogTitle></DialogHeader>
                <p className="text-muted-foreground">Sei sicuro di voler eliminare {athlete?.name}? Questa azione è irreversibile.</p>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
                  <Button variant="destructive" data-testid="confirm-delete-btn" onClick={deleteAthlete}>Elimina</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} className="space-y-6" onValueChange={(v) => { setActiveTab(v); if (v === 'videos') loadVideosIfNeeded(); }}>
          <TabsList className={`grid w-full ${betaVisits ? 'grid-cols-7' : 'grid-cols-6'} lg:w-auto lg:inline-flex`}>
            <TabsTrigger value="diet" data-testid="tab-diet">
              <Utensils className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Dieta</span>
            </TabsTrigger>
            <TabsTrigger value="training" data-testid="tab-training">
              <Activity className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Allenamento</span>
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <MessageSquare className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Note</span>
            </TabsTrigger>
            <TabsTrigger value="photos" data-testid="tab-photos">
              <Camera className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Foto</span>
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos">
              <Video className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Video</span>
            </TabsTrigger>
            <TabsTrigger value="checks">
              <Scale className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Check</span>
            </TabsTrigger>
            {betaVisits && (
              <TabsTrigger value="visits" data-testid="tab-visits">
                <ClipboardList className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Visite</span>
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">beta</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* DIET TAB */}
          <TabsContent value="diet" className="space-y-6">

            {/* PIANO ALIMENTARE: dieta completa (foglio di calcolo) o solo macro.
                Sostituisce il vecchio riquadro "Target Macro": i macro restano sincronizzati
                per l'app dell'atleta e per l'avviso dei 28 giorni. */}
            <DietPlanEditor
              athleteId={athleteId}
              athleteName={athlete?.name}
              onPdfSent={(pdf) => setDiet((d) => ({ ...d, pdfs: [...(d.pdfs || []), pdf] }))}
            />

            {/* VECCHIA DIETA A TABELLA (solo se presente) */}
            {structuredDiet?.giorni?.length > 0 && (
              <Card className="border-amber-300 dark:border-amber-700" data-testid="structured-diet-card">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Utensils className="w-5 h-5" />Dieta a tabella (vecchia versione)
                    </CardTitle>
                    <Button variant="destructive" size="sm" onClick={deleteStructuredDiet} disabled={deletingStructured} data-testid="delete-structured-diet">
                      <Trash2 className="w-4 h-4 mr-1" />{deletingStructured ? 'Elimino...' : 'Elimina tabella'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Questo atleta ha ancora una dieta a tabella salvata
                    ({structuredDiet.giorni.length} {structuredDiet.giorni.length === 1 ? 'giorno' : 'giorni'}:{' '}
                    {structuredDiet.giorni.map((g) => g.nome).filter(Boolean).slice(0, 4).join(', ')}
                    {structuredDiet.giorni.length > 4 ? '…' : ''}).
                    Nell'app dell'atleta compare <strong>al posto dei PDF</strong>: eliminala se ora usi i PDF.
                  </p>
                </CardHeader>
              </Card>
            )}

            {/* PDF DIETA CARD */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />PDF Dieta
                  </CardTitle>
                  <Button variant={diet.visible_to_athlete ? 'default' : 'outline'} size="sm"
                    onClick={toggleDietVisibility} data-testid="toggle-diet-visibility">
                    {diet.visible_to_athlete ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    {diet.visible_to_athlete ? 'Visibili' : 'Nascosti'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(diet.pdfs && diet.pdfs.length > 0) ? (
                  <div className="space-y-2">
                    {diet.pdfs.map((pdf, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                          <p className="font-medium">{pdf.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => { const l = document.createElement('a'); l.href = pdf.pdf_data; l.download = `${pdf.name}_${athlete?.name||'atleta'}.pdf`; l.click(); }}>Scarica</Button>
                          <Button variant="outline" size="sm" onClick={() => openPdfBase64(pdf.pdf_data, `${pdf.name}.pdf`)}>Apri</Button>
                          <Button variant="destructive" size="sm" onClick={() => deletePdfByIndex(index)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nessun PDF caricato</p>
                  </div>
                )}
                {addingPdf ? (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <p className="font-medium text-sm">Aggiungi PDF</p>
                    <Input placeholder="Nome PDF (es. Settimana 1...)" value={newPdfName} onChange={e => setNewPdfName(e.target.value)} />
                    <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                    <div className="flex gap-2">
                      <Button onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf || !newPdfName.trim()} className="flex-1">
                        {uploadingPdf ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"/>Caricamento...</> : <><Upload className="w-4 h-4 mr-2"/>Scegli PDF</>}
                      </Button>
                      <Button variant="outline" onClick={() => { setAddingPdf(false); setNewPdfName(''); }}>Annulla</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setAddingPdf(true)}>
                    <Upload className="w-4 h-4 mr-2" />Aggiungi PDF
                  </Button>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* TRAINING TAB */}
          <TabsContent value="training" className="space-y-6">
            {trainingHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="w-4 h-4" />Storico Programmi ({trainingHistory.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                      {showHistory ? 'Nascondi' : 'Mostra'}
                    </Button>
                  </div>
                </CardHeader>
                {showHistory && (
                  <CardContent className="space-y-2">
                    {trainingHistory.map((h) => (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                        <div>
                          <p className="font-medium">{h.program_name || 'Programma'}</p>
                          <p className="text-xs text-muted-foreground">
                            Archiviato il {new Date(h.archived_at).toLocaleDateString('it-IT')}
                            {h.num_weeks && ` · ${h.num_weeks} settimane`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {h.pdf_data && (
                            <Button size="sm" variant="outline" data-testid={`view-history-${h.id}`} onClick={() => {
                              const win = window.open('', '_blank');
                              try {
                                const html = decodeURIComponent(escape(atob(h.pdf_data.split(',')[1] || h.pdf_data.replace('data:text/html;base64,', ''))));
                                win.document.write(html);
                                win.document.close();
                              } catch {
                                win.document.write('<p>Errore apertura PDF.</p>');
                                win.document.close();
                              }
                            }}>
                              📄 Visualizza
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (window.confirm('Eliminare dallo storico?')) {
                              try { await adminAPI.deleteTrainingHistory(athleteId, h.id); setTrainingHistory(trainingHistory.filter(x => x.id !== h.id)); toast.success('Eliminato'); }
                              catch { toast.error('Errore'); }
                            }
                          }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />Programma Allenamento
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={archiving || !training.program_name} onClick={archiveTraining} data-testid="archive-training-btn">
                      {archiving ? 'Archiviando...' : '📦 Archivia e Concludi'}
                    </Button>
                    <Button onClick={saveTraining} disabled={saving} data-testid="save-training-btn">
                      <Save className="w-4 h-4 mr-2" />{saving ? 'Salvataggio...' : 'Salva'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  I carichi inseriti dall'atleta e la progressione W1 → W{numWeeks} li trovi nel PDF che si crea con "Archivia e Concludi".
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Nome Programma</Label>
                    <Input value={training.program_name} onChange={(e) => setTraining({ ...training, program_name: e.target.value })} placeholder="Es. Obiettivo: Forza" data-testid="training-name-input" />
                  </div>
                  <div className="w-36">
                    <Label>Numero Settimane</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button variant="outline" size="icon" onClick={() => changeNumWeeks(Math.max(1, numWeeks - 1))}>-</Button>
                      <span className="font-bold w-6 text-center">{numWeeks}</span>
                      <Button variant="outline" size="icon" onClick={() => changeNumWeeks(numWeeks + 1)}>+</Button>
                    </div>
                  </div>
                </div>

                {training.days.map((day, dayIndex) => {
                  const fields = fieldsForDay(day);
                  const running = isRunningDay(day);
                  return (
                  <div key={dayIndex} className="border rounded-md p-4 space-y-4" data-testid={`training-day-editor-${dayIndex}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <Input value={day.day} onChange={(e) => updateTrainingDay(dayIndex, 'day', e.target.value)} placeholder={running ? 'Es. Giorno C - Ripetute' : 'Es. Giorno A - Push'} className="max-w-xs font-semibold" />
                        {/* Tipo di giorno: cambia le colonne della tabella */}
                        <div className="inline-flex rounded-md border p-0.5 bg-muted/40" role="group" aria-label="Tipo di giorno">
                          {DAY_TYPES.map((t) => {
                            const active = (day.type || 'forza') === t.value;
                            return (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => setDayType(dayIndex, t.value)}
                                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                data-testid={`day-type-${dayIndex}-${t.value}`}
                                aria-pressed={active}
                              >
                                {t.emoji} {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeTrainingDay(dayIndex)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-2 border border-border min-w-[180px]">Esercizio</th>
                            {Array.from({ length: numWeeks }, (_, wi) => (
                              <th key={wi} colSpan={fields.length + (wi < numWeeks - 1 ? 1 : 0)} className="text-center p-1 border border-border bg-muted">
                                <span className="font-bold text-sm">W{wi + 1}</span>
                              </th>
                            ))}
                            <th className="p-2 border border-border w-8"></th>
                          </tr>
                          <tr className="bg-muted/30 text-xs text-muted-foreground">
                            <th className="p-1 border border-border"></th>
                            {Array.from({ length: numWeeks }, (_, wi) => (
                              <React.Fragment key={wi}>
                                {fields.map(f => (
                                  <th key={`${wi}-${f.key}`} className="p-1 border border-border font-medium" title={f.full || f.label}>{f.label}</th>
                                ))}
                                {wi < numWeeks - 1 && (
                                  <th className="p-1 border border-border font-medium w-7" title="Copia questa settimana (solo per questo esercizio)">⧉</th>
                                )}
                              </React.Fragment>
                            ))}
                            <th className="p-1 border border-border"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises.map((exercise, exIndex) => {
                            const weeks = exercise.weeks || makeEmptyWeeks(numWeeks, day);
                            return (
                              <tr key={exIndex} className="hover:bg-muted/20">
                                <td className="p-1 border border-border">
                                  <div className="flex items-center gap-1">
                                    <div className="flex flex-col flex-shrink-0">
                                      <button className="text-muted-foreground hover:text-foreground text-xs leading-none px-0.5" onClick={() => moveExercise(dayIndex, exIndex, -1)}>▲</button>
                                      <button className="text-muted-foreground hover:text-foreground text-xs leading-none px-0.5" onClick={() => moveExercise(dayIndex, exIndex, 1)}>▼</button>
                                    </div>
                                    <Input value={exercise.name} onChange={(e) => updateExerciseName(dayIndex, exIndex, e.target.value)} placeholder={running ? 'Es. Ripetute 400m' : 'Esercizio'} className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 flex-1" />
                                  </div>
                                </td>
                                {Array.from({ length: numWeeks }, (_, wi) => (
                                  <React.Fragment key={wi}>
                                    {fields.map(f => (
                                      <td key={`${wi}-${f.key}`} className="p-1 border border-border">
                                        <Input value={weeks[wi]?.[f.key] || ''} onChange={(e) => updateWeekField(dayIndex, exIndex, wi, f.key, e.target.value)} className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 min-w-[45px]" placeholder="—" />
                                      </td>
                                    ))}
                                    {wi < numWeeks - 1 && (
                                      <td className="p-0.5 border border-border align-middle">
                                        <div className="flex flex-col items-center gap-0.5">
                                          <button
                                            type="button"
                                            title={`Copia W${wi + 1} di "${exercise.name || 'questo esercizio'}" su W${wi + 2}`}
                                            onClick={() => copyExerciseWeek(dayIndex, exIndex, wi, 'next')}
                                            className="text-[11px] w-6 bg-primary/10 hover:bg-primary/20 text-primary rounded leading-4"
                                            data-testid={`copy-next-${dayIndex}-${exIndex}-${wi}`}
                                          >→</button>
                                          {wi < numWeeks - 2 && (
                                            <button
                                              type="button"
                                              title={`Copia W${wi + 1} di "${exercise.name || 'questo esercizio'}" su tutte le settimane successive (W${wi + 2}–W${numWeeks})`}
                                              onClick={() => copyExerciseWeek(dayIndex, exIndex, wi, 'rest')}
                                              className="text-[11px] w-6 bg-primary/10 hover:bg-primary/20 text-primary rounded leading-4"
                                              data-testid={`copy-rest-${dayIndex}-${exIndex}-${wi}`}
                                            >⇉</button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </React.Fragment>
                                ))}
                                <td className="p-1 border border-border text-center">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExercise(dayIndex, exIndex)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => addExercise(dayIndex)} className="text-muted-foreground">
                        <Plus className="w-4 h-4 mr-1" />Aggiungi esercizio
                      </Button>
                      {day.exercises.length > 0 && numWeeks > 1 && (
                        <p className="text-xs text-muted-foreground">
                          Copia per singolo esercizio: <strong>→</strong> sulla settimana dopo · <strong>⇉</strong> su tutte le successive
                        </p>
                      )}
                    </div>
                  </div>
                  );
                })}

                <Button variant="outline" onClick={addTrainingDay} className="w-full" data-testid="add-training-day-btn">
                  <Plus className="w-4 h-4 mr-2" />Aggiungi Giorno
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />Note e Messaggi
                  </CardTitle>
                  <Button onClick={saveNotes} disabled={saving} data-testid="save-notes-btn">
                    <Save className="w-4 h-4 mr-2" />{saving ? 'Salvataggio...' : 'Salva'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea value={notes.content} onChange={(e) => setNotes({ ...notes, content: e.target.value })} placeholder="Scrivi note, consigli o messaggi per l'atleta..." className="min-h-[300px]" data-testid="notes-textarea" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />Foto Check ({photos.length})
                  </CardTitle>
                  {photos.length >= 2 && (
                    <Button size="sm" variant={compareMode ? 'default' : 'outline'}
                      onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}>
                      {compareMode ? '✕ Annulla' : '🔍 Confronta'}
                    </Button>
                  )}
                </div>
                {compareMode && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">Seleziona 2 foto ({compareSelection.length}/2)</p>
                    {compareSelection.length === 2 && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => setComparing([...compareSelection])}>
                        Confronta →
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <div className="empty-state py-8">
                    <Camera className="w-12 h-12" />
                    <p className="mt-2">Nessuna foto condivisa</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className={`relative rounded-lg overflow-hidden border-2 ${compareSelection.find(p => p.id === photo.id) ? 'border-primary' : 'border-border'}`}>
                        {compareMode && compareSelection.find(p => p.id === photo.id) && (
                          <div className="absolute top-1 left-1 z-10 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {compareSelection.findIndex(p => p.id === photo.id) + 1}
                          </div>
                        )}
                        <img
                          src={photo.image_data}
                          alt="Check"
                          loading="lazy"
                          className="w-full aspect-square object-cover cursor-pointer"
                          onClick={() => compareMode ? toggleCompareSelect(photo) : setPreviewPhoto(photo)}
                        />
                        <div className="p-2 bg-card flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{new Date(photo.created_at).toLocaleDateString('it-IT')}</span>
                          {!compareMode && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewPhoto(photo)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePhoto(photo.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compare Modal */}
            {comparing && comparing.length === 2 && (
              <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-2" onClick={() => setComparing(null)}>
                <div className="flex items-center justify-between p-2">
                  <p className="text-white text-sm font-medium">🔍 Confronto foto — {athlete?.name}</p>
                  <Button variant="ghost" size="icon" className="text-white" onClick={() => setComparing(null)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2 min-h-0" onClick={e => e.stopPropagation()}>
                  {comparing.map((photo, i) => (
                    <div key={i} className="flex flex-col min-h-0">
                      <img src={photo.image_data} alt={`Foto ${i+1}`} className="flex-1 object-contain min-h-0 rounded" />
                      <p className="text-white text-xs text-center py-2">{new Date(photo.created_at).toLocaleDateString('it-IT')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Modal */}
            {previewPhoto && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setPreviewPhoto(null)}>
                  <X className="w-6 h-6" />
                </Button>
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <img src={previewPhoto.image_data} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 flex items-center justify-between rounded-b-lg">
                    <span>{new Date(previewPhoto.created_at).toLocaleDateString('it-IT')}</span>
                    <Button variant="destructive" size="sm" onClick={() => deletePhoto(previewPhoto.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />Elimina
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* VIDEOS TAB */}
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />Video Condivisi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videos.length === 0 ? (
                  <div className="empty-state py-8">
                    <Video className="w-12 h-12" />
                    <p className="mt-2">Nessun video condiviso</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <div key={video.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg" data-testid={`admin-video-${video.id}`}>
                        <div className="w-24 h-16 bg-black rounded flex items-center justify-center">
                          <Play className="w-6 h-6 text-white/70" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">{new Date(video.created_at).toLocaleDateString('it-IT')}</p>
                        </div>
                        <Button onClick={() => openVideoAnalyzer(video)} data-testid={`analyze-video-${video.id}`}>
                          <Play className="w-4 h-4 mr-2" />Analizza
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VISITE (funzione beta, visibile solo se attivata per questo atleta) */}
          {betaVisits && (
            <TabsContent value="visits" className="space-y-6">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">📸 Misurati da casa <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">beta</span></p>
                  <p className="text-xs text-muted-foreground">{athlete?.beta_self_measure ? "Attiva: l'atleta può inviarti le misure fatte con le foto dal suo telefono." : "Spenta: l'atleta vede le visite ma non può misurarsi da casa."}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!athlete?.beta_self_measure}
                  aria-label="Misurati da casa"
                  disabled={savingBeta}
                  onClick={toggleSelfMeasure}
                  data-testid="toggle-beta-self"
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${athlete?.beta_self_measure ? 'bg-violet-600' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${athlete?.beta_self_measure ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <VisitsAdmin athleteId={athleteId} athleteName={athlete?.name} />
            </TabsContent>
          )}

          {/* CHECKS TAB */}
          <TabsContent value="checks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />Body Check Atleta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {bodyChecks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scale className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nessun check registrato dall'atleta</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Ultimo Peso</p>
                        <p className="text-2xl font-bold">{bodyChecks[0]?.weight ? `${bodyChecks[0].weight} kg` : '—'}</p>
                        <p className="text-xs text-muted-foreground">{bodyChecks[0]?.created_at ? new Date(bodyChecks[0].created_at).toLocaleDateString('it-IT') : ''}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Ultima Altezza</p>
                        <p className="text-2xl font-bold">{bodyChecks[0]?.height ? `${bodyChecks[0].height} cm` : '—'}</p>
                        <p className="text-xs text-muted-foreground">{bodyChecks[0]?.created_at ? new Date(bodyChecks[0].created_at).toLocaleDateString('it-IT') : ''}</p>
                      </div>
                    </div>

                    {bodyChecks.filter(c => c.weight).length > 1 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Andamento Peso</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={[...bodyChecks].reverse().filter(c => c.weight).map(c => ({
                            data: new Date(c.created_at).toLocaleDateString('it-IT'),
                            peso: c.weight
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="peso" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Peso (kg)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Storico completo</p>
                      <div className="space-y-2">
                        {bodyChecks.map((check, i) => (
                          <div key={check.id || i} className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg text-sm" data-testid={`admin-check-${check.id}`}>
                            <span className="text-muted-foreground">{new Date(check.created_at).toLocaleDateString('it-IT')}</span>
                            <div className="flex items-center gap-4">
                              {check.weight && <span>⚖️ <strong>{check.weight} kg</strong></span>}
                              {check.height && <span>📏 <strong>{check.height} cm</strong></span>}
                              {check.id && (
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Elimina check"
                                  data-testid={`admin-check-delete-${check.id}`} disabled={deletingCheckId === check.id} onClick={() => deleteBodyCheck(check)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {selectedVideo && (
        <VideoAnalyzer
          videoData={selectedVideo.video_data}
          videoId={selectedVideo.id}
          annotations={annotations}
          onSaveAnnotation={handleSaveAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};

export default AthleteManagement;
