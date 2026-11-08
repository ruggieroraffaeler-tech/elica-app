import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Save, Trash2, FileText, Pencil, Camera, Wand2, X, Loader2, AlertTriangle, Scale, ShieldCheck, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminAPI } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  CIRC_FIELDS, CHART_MEASURES, num, fmt, formatDate, todayISO, measureValue, visitIndexes,
  buildVisitReport, extractReportPhotos, openReport,
} from '../lib/visits';
import { ESTIMATE_FIELDS, fileToCanvas, analyzePhotos, canvasToJpeg } from '../lib/bodyMeasure';

// altezza e sesso: dall'ultima visita che li contiene
const emptyForm = (history = []) => {
  const withHeight = history.find((v) => num(v.height));
  const withSex = history.find((v) => v.sex);
  return {
  date: todayISO(),
  weight: '',
  height: withHeight ? String(num(withHeight.height)) : '',
  sex: withSex?.sex || '',
  circumferences: {},
  notes: '',
  };
};

const POSE_TIPS = [
  'Abbigliamento aderente (intimo o top + pantaloncini), capelli raccolti dietro',
  'Sfondo uniforme e chiaro, buona luce, niente controluce',
  'Telefono fermo all\'altezza della vita, a circa 2,5–3 m, persona intera (testa e piedi)',
  'Frontale: braccia staccate dal corpo (posa ad "A"), piedi leggermente divaricati',
  'Profilo: girato di lato, braccia lungo i fianchi, piedi uniti',
];

/** Sezione "Visite" nella pagina admin dell'atleta */
const VisitsAdmin = ({ athleteId, athleteName }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | { id?: string }
  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [chartKey, setChartKey] = useState('weight');
  const [openingId, setOpeningId] = useState(null);
  const [importing, setImporting] = useState(false);

  // foto e stime
  const [frontFile, setFrontFile] = useState(null);
  const [sideFile, setSideFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [sidePreview, setSidePreview] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState({});
  const [analysis, setAnalysis] = useState(null); // { estimates, warnings, frontImage, sideImage }
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const frontRef = useRef(null);
  const sideRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getVisits(athleteId);
      setVisits(res.data || []);
    } catch {
      toast.error('Errore nel caricamento delle visite');
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  // anteprime foto
  useEffect(() => {
    if (!frontFile) { setFrontPreview(null); return undefined; }
    const u = URL.createObjectURL(frontFile);
    setFrontPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [frontFile]);
  useEffect(() => {
    if (!sideFile) { setSidePreview(null); return undefined; }
    const u = URL.createObjectURL(sideFile);
    setSidePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [sideFile]);

  const sorted = useMemo(() => [...visits].sort((a, b) => String(b.date).localeCompare(String(a.date))), [visits]);
  const last = sorted[0];

  const resetPhotos = () => {
    setFrontFile(null); setSideFile(null); setAnalysis(null); setAnalysisError(''); setExistingPhotos({});
    if (frontRef.current) frontRef.current.value = '';
    if (sideRef.current) sideRef.current.value = '';
  };

  const startNew = () => {
    resetPhotos();
    setForm(emptyForm(sorted));
    setEditing({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = async (v) => {
    resetPhotos();
    setForm({
      date: v.date,
      weight: v.weight ? String(v.weight) : '',
      height: v.height ? String(v.height) : '',
      sex: v.sex || '',
      circumferences: Object.fromEntries(Object.entries(v.circumferences || {}).map(([k, val]) => [k, String(val)])),
      notes: v.notes || '',
      photo_estimates: v.photo_estimates || {},
      source: v.source || null,
    });
    setEditing({ id: v.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (v.has_report) {
      try {
        const res = await adminAPI.getVisitReport(athleteId, v.id);
        setExistingPhotos(extractReportPhotos(res.data.report_data));
      } catch { /* le foto vecchie non sono indispensabili */ }
    }
  };

  const setCirc = (key, value) => setForm((f) => ({ ...f, circumferences: { ...f.circumferences, [key]: value } }));

  const prevOf = (date, excludeId) => sorted.find((v) => v.id !== excludeId && String(v.date) < String(date));

  const runAnalysis = async () => {
    const h = num(form.height);
    if (!frontFile) { toast.error('Carica almeno la foto frontale'); return; }
    if (!h) { toast.error("Inserisci l'altezza: serve per convertire la foto in centimetri"); return; }
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const fc = await fileToCanvas(frontFile);
      const sc = sideFile ? await fileToCanvas(sideFile) : null;
      const r = await analyzePhotos(fc, sc, h);
      setAnalysis(r);
      const found = Object.values(r.estimates).filter((x) => x !== null).length;
      toast.success(`Stima completata: ${found} misure`);
    } catch (e) {
      setAnalysis(null);
      setAnalysisError(e?.message || 'Analisi non riuscita');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyEstimates = () => {
    if (!analysis) return;
    let n = 0;
    const circ = { ...form.circumferences };
    CIRC_FIELDS.forEach((f) => {
      const est = analysis.estimates[f.key];
      if (est && !num(circ[f.key])) { circ[f.key] = String(est); n++; }
    });
    setForm((f) => ({ ...f, circumferences: circ }));
    toast.success(n ? `${n} stime copiate nei campi vuoti` : 'Nessun campo vuoto da riempire');
  };

  const save = async () => {
    if (!form.date) { toast.error('Inserisci la data della visita'); return; }
    setSaving(true);
    try {
      // foto per il PDF: nuove (annotate se analizzate) oppure quelle già salvate
      let photos = { ...existingPhotos };
      if (analysis) {
        if (analysis.frontImage) photos.front = analysis.frontImage;
        if (analysis.sideImage) photos.side = analysis.sideImage;
      }
      if (frontFile && !analysis) photos.front = canvasToJpeg(await fileToCanvas(frontFile));
      if (sideFile && !(analysis && analysis.sideImage)) photos.side = canvasToJpeg(await fileToCanvas(sideFile));

      const estimates = analysis ? analysis.estimates : (form.photo_estimates || {});
      const visit = {
        id: editing?.id || '__new__',
        date: form.date,
        weight: num(form.weight),
        height: num(form.height),
        sex: form.sex || null,
        circumferences: Object.fromEntries(Object.entries(form.circumferences).map(([k, v]) => [k, num(v)]).filter(([, v]) => v !== null)),
        photo_estimates: Object.fromEntries(Object.entries(estimates || {}).filter(([, v]) => v !== null && v !== undefined)),
        notes: form.notes.trim(),
        source: form.source || undefined,
      };
      const report = buildVisitReport({
        visit,
        history: visits,
        athleteName: athleteName || 'Atleta',
        photos,
        photoWarnings: analysis?.warnings || [],
      });
      const payload = { ...visit, report_data: report };
      delete payload.id;
      if (editing?.id) await adminAPI.updateVisit(athleteId, editing.id, payload);
      else await adminAPI.createVisit(athleteId, payload);
      toast.success('Visita salvata e PDF creato!');
      setEditing(null);
      resetPhotos();
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Errore nel salvataggio della visita');
    } finally {
      setSaving(false);
    }
  };

  // Copia nelle Visite i check di peso/altezza già inseriti dall'atleta (i check restano dove sono)
  const importChecks = async () => {
    setImporting(true);
    try {
      const res = await adminAPI.importChecksToVisits(athleteId);
      const n = res.data?.imported || 0;
      toast.success(n ? `${n} check copiati nelle visite` : 'Nessun nuovo check da copiare');
      if (n) await load();
    } catch {
      toast.error('Errore nella copia dei check');
    } finally {
      setImporting(false);
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`Eliminare la visita del ${formatDate(v.date)}? Verrà eliminato anche il suo PDF.`)) return;
    try {
      await adminAPI.deleteVisit(athleteId, v.id);
      setVisits((list) => list.filter((x) => x.id !== v.id));
      toast.success('Visita eliminata');
    } catch (e) {
      // mostro il motivo vero (es. connessione, database pieno) invece di un errore generico
      toast.error(`Visita non eliminata: ${e.response?.data?.detail || (e.response ? `errore ${e.response.status}` : e.message || 'connessione assente')}`);
    }
  };

  const openPdf = async (v) => {
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font-family:sans-serif;padding:16px">Caricamento PDF...</p>');
    setOpeningId(v.id);
    try {
      const res = await adminAPI.getVisitReport(athleteId, v.id);
      openReport(res.data.report_data, win);
    } catch {
      if (win) win.close();
      toast.error('PDF non disponibile');
    } finally {
      setOpeningId(null);
    }
  };

  const chartData = useMemo(() => [...sorted].reverse()
    .map((v) => ({ data: formatDate(v.date).slice(0, 5) + '/' + String(v.date).slice(2, 4), valore: measureValue(v, chartKey) }))
    .filter((p) => p.valore !== null), [sorted, chartKey]);
  const chartMeasure = CHART_MEASURES.find((m) => m.key === chartKey);
  const availableMeasures = CHART_MEASURES.filter((m) => sorted.some((v) => measureValue(v, m.key) !== null));

  // ------------------------------------------------------------------ EDITOR
  if (editing) {
    const prev = prevOf(form.date, editing.id);
    const fv = { ...form, circumferences: form.circumferences, photo_estimates: analysis?.estimates || form.photo_estimates };
    const ix = visitIndexes({ ...fv, weight: num(form.weight), height: num(form.height) });
    const hasOldPhotos = !!(existingPhotos.front || existingPhotos.side);
    return (
      <Card data-testid="visit-editor">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />{editing.id ? `Modifica visita del ${formatDate(form.date)}` : 'Nuova visita'}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditing(null); resetPhotos(); }} disabled={saving}>Annulla</Button>
              <Button onClick={save} disabled={saving} data-testid="save-visit-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? 'Salvataggio...' : 'Salva visita e crea PDF'}
              </Button>
            </div>
          </div>
          {prev && <p className="text-xs text-muted-foreground mt-1">Visita precedente: {formatDate(prev.date)}{prev.weight ? ` · ${fmt(prev.weight)} kg` : ''}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dati generali */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Data visita</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="visit-date" />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" inputMode="decimal" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder={prev?.weight ? `prec. ${fmt(prev.weight)}` : 'es. 75.5'} data-testid="visit-weight" />
            </div>
            <div>
              <Label>Altezza (cm)</Label>
              <Input type="number" inputMode="decimal" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="es. 178" data-testid="visit-height" />
            </div>
            <div>
              <Label>Sesso <span className="text-muted-foreground font-normal">(per % grasso)</span></Label>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                data-testid="visit-sex"
              >
                <option value="">—</option>
                <option value="M">Uomo</option>
                <option value="F">Donna</option>
              </select>
            </div>
          </div>

          {/* Indici calcolati */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              ['BMI', ix.bmi ? fmt(ix.bmi) : null],
              ['Vita/fianchi', ix.whr ? fmt(ix.whr, 2) : null],
              ['Vita/altezza', ix.whtr ? fmt(ix.whtr, 2) : null],
              ['% grasso (US Navy)', ix.bodyFat ? `${fmt(ix.bodyFat)}%` : null],
            ].map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {k}: <strong className="text-foreground">{v ?? '—'}</strong>
              </span>
            ))}
          </div>

          {/* Circonferenze */}
          <div>
            <h3 className="font-semibold mb-2">📏 Circonferenze col metro (cm)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CIRC_FIELDS.map((f) => {
                const pv = num(prev?.circumferences?.[f.key]);
                const est = analysis?.estimates?.[f.key];
                return (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={form.circumferences[f.key] || ''}
                      onChange={(e) => setCirc(f.key, e.target.value)}
                      placeholder={pv ? `prec. ${fmt(pv)}` : '—'}
                      data-testid={`circ-${f.key}`}
                    />
                    {est ? <p className="text-[11px] text-muted-foreground mt-0.5">foto: {fmt(est)}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="font-semibold">📝 Cosa è emerso dalla visita</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Es. buona aderenza alla dieta, fame serale, sonno 6h, dolore spalla dx in panca, obiettivi del prossimo mese..."
              className="min-h-[140px] mt-1"
              data-testid="visit-notes"
            />
          </div>

          {/* Foto e stima */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4" />Foto e stima delle misure</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />Analisi sul tuo dispositivo: le foto non vengono inviate a servizi esterni
              </span>
            </div>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
              {POSE_TIPS.map((t) => <li key={t}>{t}</li>)}
            </ul>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Frontale', frontFile, setFrontFile, frontRef, frontPreview, existingPhotos.front, 'photo-front'],
                ['Profilo', sideFile, setSideFile, sideRef, sidePreview, existingPhotos.side, 'photo-side'],
              ].map(([label, file, setFile, ref, preview, old, tid]) => (
                <div key={label} className="space-y-2">
                  <input ref={ref} type="file" accept="image/*" className="hidden" data-testid={tid}
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setAnalysis(null); }} />
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="w-full aspect-[3/4] rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-background hover:bg-muted/40 transition-colors"
                  >
                    {preview || old ? (
                      <img src={preview || old} alt={label} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-sm text-muted-foreground flex flex-col items-center gap-1"><Camera className="w-6 h-6" />Foto {label.toLowerCase()}</span>
                    )}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{file ? file.name : old ? 'già salvata nel PDF' : label}</span>
                    {file && <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setFile(null); setAnalysis(null); if (ref.current) ref.current.value = ''; }}><X className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={runAnalysis} disabled={analyzing || !frontFile} data-testid="analyze-photos-btn">
                {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                {analyzing ? 'Analisi in corso... (la prima volta scarica il modello)' : 'Stima misure dalle foto'}
              </Button>
              {analysis && (
                <Button variant="outline" onClick={copyEstimates} data-testid="copy-estimates-btn">Copia stime nei campi vuoti</Button>
              )}
            </div>
            {hasOldPhotos && !frontFile && !sideFile && (
              <p className="text-xs text-muted-foreground">Le foto già presenti nel PDF di questa visita verranno mantenute.</p>
            )}
            {analysisError && (
              <p className="text-sm text-destructive flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{analysisError}</p>
            )}

            {analysis && (
              <div className="space-y-3" data-testid="analysis-result">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ESTIMATE_FIELDS.map((f) => (
                    <div key={f.key} className="rounded-md border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{f.label}</p>
                      <p className="font-semibold">{analysis.estimates[f.key] ? `${fmt(analysis.estimates[f.key])} cm` : '—'}</p>
                    </div>
                  ))}
                </div>
                {analysis.warnings.length > 0 && (
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                    {analysis.warnings.map((w) => <li key={w} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{w}</li>)}
                  </ul>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {analysis.frontImage && <img src={analysis.frontImage} alt="Analisi frontale" className="w-full rounded-md border" />}
                  {analysis.sideImage && <img src={analysis.sideImage} alt="Analisi profilo" className="w-full rounded-md border" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sono stime (errore di qualche cm, maggiore con abiti larghi o posa scorretta): il riferimento resta il metro. Le foto annotate finiscono solo nel PDF della visita.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditing(null); resetPhotos(); }} disabled={saving}>Annulla</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Salvataggio...' : 'Salva visita e crea PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------------ ELENCO
  const first = sorted[sorted.length - 1];
  const weightDelta = last && first && last !== first && num(last.weight) && num(first.weight) ? num(last.weight) - num(first.weight) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5" />Visite ({sorted.length})</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={importChecks} disabled={importing} data-testid="import-checks-btn" title="Copia nelle visite peso e altezza dei check già inseriti dall'atleta (i check non vengono toccati)">
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Importa i check
              </Button>
              <Button onClick={startNew} data-testid="new-visit-btn"><Plus className="w-4 h-4 mr-2" />Nuova visita</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nessuna visita registrata</p>
              <p className="text-sm">Crea la prima visita con peso, misure e note, oppure importa i check già inseriti dall'atleta.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ultimo peso</p>
                  <p className="text-2xl font-bold">{last?.weight ? `${fmt(last.weight)} kg` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(last?.date)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Dalla prima visita</p>
                  <p className="text-2xl font-bold">{weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${fmt(weightDelta)} kg` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{first && first !== last ? formatDate(first.date) : ''}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Vita</p>
                  <p className="text-2xl font-bold">{measureValue(last, 'vita') ? `${fmt(measureValue(last, 'vita'))} cm` : '—'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">BMI</p>
                  <p className="text-2xl font-bold">{visitIndexes(last).bmi ? fmt(visitIndexes(last).bmi) : '—'}</p>
                </div>
              </div>

              {availableMeasures.length > 0 && chartData.length > 1 && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium">📈 Andamento</p>
                    <select value={chartKey} onChange={(e) => setChartKey(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                      {availableMeasures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v) => [`${fmt(v)} ${chartMeasure?.unit || ''}`, chartMeasure?.label]} />
                      <Line type="monotone" dataKey="valore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-2">
                {sorted.map((v, i) => {
                  const prev = sorted[i + 1];
                  const dW = prev && num(v.weight) && num(prev.weight) ? num(v.weight) - num(prev.weight) : null;
                  const circs = CIRC_FIELDS.filter((f) => num(v.circumferences?.[f.key])).slice(0, 4);
                  const ests = circs.length === 0 ? ESTIMATE_FIELDS.filter((f) => num(v.photo_estimates?.[f.key])).slice(0, 4) : [];
                  return (
                    <div key={v.id} className="p-3 bg-muted/30 rounded-lg border" data-testid={`visit-row-${v.id}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold">{formatDate(v.date)}{v.legacy_check_id && <span className="ml-2 text-xs font-normal text-muted-foreground">(importata dai check)</span>}{v.source === 'athlete' && <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent" data-testid={`self-badge-${v.id}`}>📸 da casa, inserita dall'atleta</span>}</p>
                          <div className="flex gap-3 text-sm flex-wrap">
                            {v.weight ? <span>⚖️ <strong>{fmt(v.weight)} kg</strong>{dW !== null && <span className={`ml-1 text-xs ${dW < 0 ? 'text-emerald-600' : dW > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>({dW > 0 ? '+' : ''}{fmt(dW)})</span>}</span> : null}
                            {circs.map((f) => <span key={f.key} className="text-muted-foreground">{f.label}: <strong className="text-foreground">{fmt(v.circumferences[f.key])}</strong></span>)}
                            {ests.map((f) => <span key={f.key} className="text-muted-foreground">{f.label}: <strong className="text-foreground">~{fmt(v.photo_estimates[f.key])}</strong></span>)}
                          </div>
                          {v.notes && <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">📝 {v.notes}</p>}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {v.has_report && (
                            <Button size="sm" variant="outline" onClick={() => openPdf(v)} disabled={openingId === v.id} data-testid={`visit-pdf-${v.id}`}>
                              {openingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-1" />PDF</>}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => startEdit(v)} data-testid={`visit-edit-${v.id}`}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => remove(v)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitsAdmin;
