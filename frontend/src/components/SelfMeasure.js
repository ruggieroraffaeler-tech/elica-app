import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Wand2, Loader2, X, ShieldCheck, AlertTriangle, Send } from 'lucide-react';
import { athleteAPI } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { num, fmt, todayISO, buildVisitReport } from '../lib/visits';
import { ESTIMATE_FIELDS, fileToCanvas, analyzePhotos } from '../lib/bodyMeasure';
import { isOnline } from '../lib/offline';

// =====================================================================
//  Misurazione da casa: l'atleta fa le foto, le misure si calcolano SUL SUO TELEFONO.
//  Al coach arrivano solo i numeri; le foto solo se l'atleta attiva l'interruttore.
// =====================================================================

const TIPS = [
  'Abbigliamento aderente (intimo o top + pantaloncini), capelli raccolti',
  'Sfondo chiaro e uniforme, buona luce, niente controluce',
  'Telefono fermo all\'altezza della vita a 2,5–3 m: si devono vedere testa e piedi',
  'Fatti aiutare da qualcuno, oppure appoggia il telefono e usa il timer',
  'Frontale: braccia staccate dal corpo (posa ad "A"), piedi leggermente divaricati',
  'Profilo: girato di lato, braccia lungo i fianchi, piedi uniti',
  'Per confrontare nel tempo: stesse condizioni ogni volta (mattina, a digiuno)',
];

const SelfMeasure = ({ athleteName, history = [], onDone, onCancel }) => {
  const lastWithHeight = history.find((v) => num(v.height));
  const lastWithSex = history.find((v) => v.sex);
  const [height, setHeight] = useState(lastWithHeight ? String(num(lastWithHeight.height)) : '');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState(lastWithSex?.sex || '');
  const [notes, setNotes] = useState('');
  const [sendPhotos, setSendPhotos] = useState(false);
  const [frontFile, setFrontFile] = useState(null);
  const [sideFile, setSideFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [sidePreview, setSidePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const frontRef = useRef(null);
  const sideRef = useRef(null);

  useEffect(() => {
    if (!frontFile) { setFrontPreview(null); return undefined; }
    const u = URL.createObjectURL(frontFile); setFrontPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [frontFile]);
  useEffect(() => {
    if (!sideFile) { setSidePreview(null); return undefined; }
    const u = URL.createObjectURL(sideFile); setSidePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [sideFile]);

  const pick = (setFile) => (e) => {
    const f = e.target.files?.[0] || null;
    if (f && /heic|heif/i.test(f.type + f.name) && !/jpe?g|png/i.test(f.type)) {
      toast.error('Foto in formato HEIC: su iPhone vai in Impostazioni → Fotocamera → Formati → "Più compatibile", oppure fai uno screenshot della foto.');
    }
    setFile(f);
    setAnalysis(null);
    setError('');
  };

  const run = async () => {
    const h = num(height);
    if (!h || h < 100 || h > 230) { toast.error('Inserisci la tua altezza in cm: serve per calcolare le misure'); return; }
    if (!frontFile) { toast.error('Carica almeno la foto frontale'); return; }
    setAnalyzing(true);
    setError('');
    try {
      const fc = await fileToCanvas(frontFile);
      const sc = sideFile ? await fileToCanvas(sideFile) : null;
      const r = await analyzePhotos(fc, sc, h);
      const found = Object.values(r.estimates).filter((x) => x !== null && x !== undefined).length;
      if (!found) throw new Error('Non riesco a ricavare le misure: rifai la foto seguendo i consigli.');
      setAnalysis(r);
    } catch (e) {
      setAnalysis(null);
      const msg = e?.message || '';
      setError(/fetch|load|script|network/i.test(msg)
        ? 'Non riesco a scaricare lo strumento di misura: serve la connessione la prima volta (circa 20 MB, meglio con il Wi-Fi).'
        : msg || 'Analisi non riuscita');
    } finally {
      setAnalyzing(false);
    }
  };

  const send = async () => {
    if (!analysis) return;
    if (!isOnline()) { toast.error('Sei offline: collegati a internet per inviare le misure al coach. Le misure restano qui finché non chiudi.'); return; }
    setSaving(true);
    try {
      const estimates = Object.fromEntries(Object.entries(analysis.estimates).filter(([, v]) => v !== null && v !== undefined));
      const visit = {
        id: '__self__',
        date: todayISO(),
        weight: num(weight),
        height: num(height),
        sex: sex || null,
        circumferences: {},
        photo_estimates: estimates,
        notes: notes.trim(),
        source: 'athlete',
      };
      const photos = sendPhotos ? { front: analysis.frontImage, side: analysis.sideImage || undefined } : {};
      const report = buildVisitReport({
        visit,
        history: history.filter((v) => !(v.source === 'athlete' && v.date === visit.date)),
        athleteName: athleteName || 'Atleta',
        photos,
        photoWarnings: sendPhotos ? analysis.warnings || [] : [],
      });
      await athleteAPI.sendSelfMeasure({
        weight: visit.weight, height: visit.height, sex: visit.sex,
        photo_estimates: estimates, notes: visit.notes, report_data: report,
      });
      toast.success(sendPhotos ? 'Misure e foto inviate al coach!' : 'Misure inviate al coach! Le foto sono rimaste sul tuo telefono.');
      onDone && onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Invio non riuscito: riprova tra poco (le misure restano qui).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="self-measure">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" />Misurati da casa</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving || analyzing}>Annulla</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-xs" data-testid="self-privacy">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-green-600" />
          <p className="text-muted-foreground">
            Le foto <b className="text-foreground">restano sul tuo telefono</b>: le misure vengono calcolate qui, senza servizi esterni.
            Al coach arrivano solo i numeri. Le foto gli arrivano solo se attivi l'interruttore in fondo.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Altezza (cm) *</Label>
            <Input type="number" inputMode="decimal" value={height} onChange={(e) => { setHeight(e.target.value); setAnalysis(null); }} placeholder="es. 175" data-testid="self-height" />
          </div>
          <div>
            <Label className="text-xs">Peso (kg)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="facolt." data-testid="self-weight" />
          </div>
          <div>
            <Label className="text-xs">Sesso</Label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" data-testid="self-sex">
              <option value="">—</option>
              <option value="M">Uomo</option>
              <option value="F">Donna</option>
            </select>
          </div>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Come fare le foto (importante)</summary>
          <ul className="list-disc pl-5 mt-2 space-y-0.5">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>

        <div className="grid grid-cols-2 gap-3">
          {[
            ['Frontale', frontFile, setFrontFile, frontRef, frontPreview, 'self-photo-front'],
            ['Profilo', sideFile, setSideFile, sideRef, sidePreview, 'self-photo-side'],
          ].map(([label, file, setFile, ref, preview, tid]) => (
            <div key={label} className="space-y-1">
              <input ref={ref} type="file" accept="image/*" className="hidden" data-testid={tid} onChange={pick(setFile)} />
              <button type="button" onClick={() => ref.current?.click()}
                className="w-full aspect-[3/4] rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-background">
                {preview
                  ? <img src={preview} alt={label} className="w-full h-full object-contain" />
                  : <span className="text-sm text-muted-foreground flex flex-col items-center gap-1"><Camera className="w-6 h-6" />{label}{label === 'Profilo' ? ' (consigliata)' : ''}</span>}
              </button>
              {file && (
                <button type="button" className="text-xs text-muted-foreground flex items-center gap-1"
                  onClick={() => { setFile(null); setAnalysis(null); if (ref.current) ref.current.value = ''; }}>
                  <X className="w-3 h-3" />Togli foto
                </button>
              )}
            </div>
          ))}
        </div>

        {!analysis && (
          <Button className="w-full" onClick={run} disabled={analyzing || !frontFile} data-testid="self-analyze">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {analyzing ? 'Calcolo sul telefono…' : 'Calcola le misure'}
          </Button>
        )}
        {analyzing && <p className="text-[11px] text-muted-foreground text-center">La prima volta scarica lo strumento di misura (circa 20 MB, meglio con il Wi-Fi), poi resta sul telefono.</p>}
        {error && <p className="text-sm text-destructive flex gap-1.5"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</p>}

        {analysis && (
          <div className="space-y-3" data-testid="self-result">
            <div className="grid grid-cols-2 gap-2">
              {ESTIMATE_FIELDS.filter((f) => analysis.estimates[f.key]).map((f) => (
                <div key={f.key} className="rounded-md border bg-background px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">{f.label}</p>
                  <p className="font-semibold">{fmt(analysis.estimates[f.key])} cm</p>
                </div>
              ))}
            </div>
            {analysis.warnings?.length > 0 && (
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                {analysis.warnings.map((w) => <li key={w} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{w}</li>)}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              {analysis.frontImage && <img src={analysis.frontImage} alt="Analisi frontale" className="w-full rounded-md border" />}
              {analysis.sideImage && <img src={analysis.sideImage} alt="Analisi profilo" className="w-full rounded-md border" />}
            </div>
            <p className="text-[11px] text-muted-foreground">Sono stime (errore di qualche cm): servono soprattutto a vedere l'andamento nel tempo. Se qualcosa non torna, rifai le foto.</p>

            <div>
              <Label className="text-xs">Note per il coach (facoltative)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Es. come ti senti, fame, sonno, allenamenti..." className="min-h-[70px] mt-1" data-testid="self-notes" />
            </div>

            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <Switch checked={sendPhotos} onCheckedChange={setSendPhotos} data-testid="self-send-photos" />
              <span className="text-sm">
                Invia anche le foto al coach
                <span className="block text-xs text-muted-foreground">
                  {sendPhotos ? 'Il coach vedrà le due foto con le linee di misura, dentro il PDF.' : 'Spento: le foto non lasciano il tuo telefono.'}
                </span>
              </span>
            </label>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setAnalysis(null); }} disabled={saving}>Rifai</Button>
              <Button className="flex-1" onClick={send} disabled={saving} data-testid="self-send">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {saving ? 'Invio…' : 'Invia al coach'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SelfMeasure;
