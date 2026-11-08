import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Search, Upload, Download, Plus, Trash2, Loader2, AlertTriangle, X, ExternalLink, Check, Database } from 'lucide-react';
import { adminAPI } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  FIELDS, FIELD_KEYS, fmt, fmt0, norm, parseNum, foodWarnings, parseCSV, guessMapping, rowsToFoods,
  foodsToCSV, IMPORT_TARGETS, CREA_CITATION,
} from '../lib/foods';

const CREA_URL = (code) => `https://www.alimentinutrizione.it/tabelle-nutrizionali/${code}`;

// ------------------------------------------------------------------ ricerca CREA
const CreaSearch = ({ foods, onAdded }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // {code, food|null, loading}
  const [adding, setAdding] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setError(''); return undefined; }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const r = await adminAPI.searchCrea(term);
        if (my === seq.current) setResults(r.data.results || []);
      } catch (e) {
        if (my === seq.current) { setResults([]); setError(e.response?.data?.detail || 'Ricerca CREA non riuscita'); }
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  const inDb = (r) => foods.some((f) => f.crea_code === r.code || norm(f.name) === norm(r.name));

  const open = async (r) => {
    setPreview({ code: r.code, name: r.name, food: null, loading: true });
    try {
      const res = await adminAPI.getCreaFood(r.code);
      setPreview({ code: r.code, name: r.name, food: res.data, loading: false });
    } catch (e) {
      setPreview({ code: r.code, name: r.name, food: null, loading: false, error: e.response?.data?.detail || 'Scheda non disponibile' });
    }
  };

  const add = async () => {
    if (!preview) return;
    setAdding(true);
    try {
      const res = await adminAPI.addFoodFromCrea(preview.code);
      onAdded(res.data);
      toast.success(`${res.data.name} aggiunto dal CREA`);
      setPreview(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Non riuscito');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card data-testid="crea-search">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Cerca nelle tabelle CREA</CardTitle>
        <p className="text-xs text-muted-foreground">Cerca sul sito ufficiale (alimentinutrizione.it): scegli l'alimento e lo aggiungo al tuo database con tutti i valori per 100 g.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. riso basmati, petto di pollo, ricotta…" className="pl-10" data-testid="crea-input" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {results.length > 0 && !preview && (
          <div className="max-h-64 overflow-y-auto divide-y rounded-lg border" data-testid="crea-results">
            {results.map((r) => (
              <button key={r.code} type="button" onClick={() => open(r)} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50">
                <span className="truncate">{r.name}</span>
                <span className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                  {inDb(r) && <span className="text-accent font-semibold flex items-center gap-1"><Check className="w-3 h-3" />già presente</span>}
                  {r.code}
                </span>
              </button>
            ))}
          </div>
        )}
        {q.trim().length >= 2 && !loading && !error && results.length === 0 && <p className="text-sm text-muted-foreground">Nessun alimento CREA con questo nome.</p>}
        {preview && (
          <div className="rounded-lg border p-3 space-y-3" data-testid="crea-preview">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{preview.food?.name || preview.name}</p>
                <a href={CREA_URL(preview.code)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline">
                  Scheda CREA {preview.code}<ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreview(null)} aria-label="Chiudi"><X className="w-4 h-4" /></Button>
            </div>
            {preview.loading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Leggo la scheda…</p>}
            {preview.error && <p className="text-sm text-destructive">{preview.error}</p>}
            {preview.food && (
              <>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{f.short}</p>
                      <p className="font-semibold">{preview.food[f.key] === null || preview.food[f.key] === undefined ? '—' : `${fmt(preview.food[f.key])}${f.unit === 'kcal' ? '' : ` ${f.unit}`}`}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={add} disabled={adding} className="w-full" data-testid="crea-add">
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Aggiungi al database
                </Button>
              </>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">{CREA_CITATION}. Gli alimenti presi da qui restano segnati con la fonte, come chiede il CREA.</p>
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ import CSV / Notion
const ImportPanel = ({ onClose, onDone }) => {
  const [parsed, setParsed] = useState(null); // {headers, rows, sep, fileName}
  const [mapping, setMapping] = useState([]);
  const [strip, setStrip] = useState(true);
  const [onDup, setOnDup] = useState('update');
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const fileRef = useRef(null);

  const load = (text, fileName) => {
    const { rows, sep } = parseCSV(text);
    if (rows.length < 2) { toast.error('Il file sembra vuoto: servono intestazioni e almeno una riga'); return; }
    const headers = rows[0].map((h) => String(h).trim());
    setParsed({ headers, rows: rows.slice(1), sep, fileName });
    setMapping(guessMapping(headers));
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) { toast.error('File Excel: salvalo come CSV (File → Salva con nome → CSV) e riprova'); return; }
    const r = new FileReader();
    r.onload = () => load(r.result, f.name);
    r.readAsText(f, 'utf-8');
  };

  const result = useMemo(() => (parsed ? rowsToFoods(parsed.rows, mapping, { stripCopySuffix: strip }) : null), [parsed, mapping, strip]);
  const warned = useMemo(() => (result ? result.foods.map((f) => ({ f, w: foodWarnings(f) })).filter((x) => x.w.length) : []), [result]);
  const hasName = mapping.includes('name');

  const doImport = async () => {
    if (!result?.foods.length) return;
    setBusy(true);
    try {
      const r = await adminAPI.importFoods(result.foods, onDup);
      const d = r.data;
      toast.success(`Importati: ${d.created} nuovi, ${d.updated} aggiornati${d.skipped ? `, ${d.skipped} saltati` : ''}`);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Importazione non riuscita');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="import-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" />Importa alimenti</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Chiudi"><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground">Da Notion: nel database <b>⋯ → Esporta → Markdown e CSV</b>, poi carica il file .csv (va bene anche quello nello ZIP). Excel: salva come CSV. Oppure incolla le righe copiate.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!parsed ? (
          <>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={onFile} data-testid="import-file" />
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-lg border-2 border-dashed py-8 text-sm text-muted-foreground hover:bg-muted/30">
              <Upload className="w-6 h-6 mx-auto mb-2" />Scegli il file CSV
            </button>
            <div className="space-y-2">
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="…oppure incolla qui le righe (con l'intestazione)"
                className="w-full rounded-md border bg-transparent p-2 text-sm" />
              <Button variant="outline" size="sm" disabled={!paste.trim()} onClick={() => load(paste, 'testo incollato')}>Leggi il testo incollato</Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm flex items-center justify-between gap-2">
              <span className="truncate"><b>{parsed.fileName}</b> · {parsed.rows.length} righe · separatore “{parsed.sep === '\t' ? 'tab' : parsed.sep}”</span>
              <Button variant="ghost" size="sm" onClick={() => setParsed(null)}>Cambia file</Button>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Colonne <span className="font-normal text-muted-foreground">(riconosciute in automatico: correggi se serve)</span></p>
              <div className="divide-y rounded-lg border">
                {parsed.headers.map((h, i) => (
                  <div key={`${h}-${i}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 text-sm">
                    <code className="truncate text-xs">{h || `(colonna ${i + 1})`}</code>
                    <span className={mapping[i] ? 'text-accent font-bold' : 'text-muted-foreground'}>{mapping[i] ? '→' : '·'}</span>
                    <select value={mapping[i] || ''} data-testid={`map-${i}`}
                      onChange={(e) => setMapping((m) => m.map((x, j) => (j === i ? e.target.value : x === e.target.value && e.target.value ? '' : x)))}
                      className="h-8 rounded-md border bg-background px-2 text-sm">
                      <option value="">— non importare —</option>
                      {IMPORT_TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {mapping.includes('sodium') && parsed.headers[mapping.indexOf('sodium')] && /sale/i.test(parsed.headers[mapping.indexOf('sodium')]) && (
                <p className="text-[11px] text-muted-foreground mt-1">“{parsed.headers[mapping.indexOf('sodium')]}” → Sodio (mg): i valori corrispondono al sodio delle tabelle CREA.</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} />Togli “(1)”, “(2)” in fondo ai nomi (copie di Notion)</label>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span>Alimenti già presenti:</span>
              <select value={onDup} onChange={(e) => setOnDup(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
                <option value="update">aggiorna i valori</option>
                <option value="skip">lasciali come sono</option>
              </select>
            </div>
            {!hasName && <p className="text-sm text-destructive">Scegli quale colonna è il nome dell'alimento.</p>}
            {hasName && result && (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead><tr className="text-muted-foreground bg-muted/30">
                      <th className="text-left p-1.5">Alimento</th>
                      {FIELDS.map((f) => <th key={f.key} className="text-right p-1.5">{f.short}</th>)}
                    </tr></thead>
                    <tbody>
                      {result.foods.slice(0, 6).map((f) => (
                        <tr key={f.name} className="border-t">
                          <td className="p-1.5 whitespace-nowrap">{f.name}</td>
                          {FIELD_KEYS.map((k) => <td key={k} className="p-1.5 text-right tabular-nums">{f[k] === null ? '—' : fmt(f[k])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm space-y-1" data-testid="import-summary">
                  <p><b className="text-accent">{result.foods.length} alimenti</b> pronti da importare
                    {result.empty.length > 0 && <span className="text-muted-foreground"> · {result.empty.length} righe senza valori saltate ({result.empty.slice(0, 5).join(', ')}{result.empty.length > 5 ? '…' : ''})</span>}</p>
                  {warned.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-amber-700 dark:text-amber-400 font-medium">⚠ {warned.length} alimenti con valori da controllare</summary>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {warned.map(({ f, w }) => <li key={f.name}><b>{f.name}</b>: {w.join(' · ')}</li>)}
                      </ul>
                      <p className="text-[11px] text-muted-foreground mt-1">Li importo lo stesso (i valori impossibili, oltre 100 g su 100 g, vengono lasciati vuoti): poi li correggi nella tabella, dove restano segnati con ⚠.</p>
                    </details>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
                  <Button onClick={doImport} disabled={busy || !result.foods.length} className="flex-[2]" data-testid="import-go">
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Importa {result.foods.length} alimenti
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ cella modificabile
const EditCell = ({ value, onSave, numeric, className = '', testid }) => {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState('');
  const start = () => { setV(value === null || value === undefined ? '' : numeric ? String(value).replace('.', ',') : String(value)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const next = numeric ? parseNum(v) : v.trim();
    const cur = value === undefined ? null : value;
    if ((numeric && next === cur) || (!numeric && next === (cur || ''))) return;
    onSave(numeric ? next : next);
  };
  if (editing) {
    return (
      <td className={`p-0 ${className}`}>
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} data-testid={testid ? `${testid}-input` : undefined}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false); }}
          inputMode={numeric ? 'decimal' : undefined}
          className={`w-full h-9 px-2 bg-background outline outline-2 outline-[hsl(var(--accent))] rounded ${numeric ? 'text-right' : ''}`} />
      </td>
    );
  }
  return (
    <td onClick={start} data-testid={testid} className={`px-2 py-2 cursor-text hover:bg-muted/50 ${numeric ? 'text-right tabular-nums' : ''} ${className}`}>
      {numeric ? (value === null || value === undefined ? <span className="text-muted-foreground/50">—</span> : fmt(value)) : (value || <span className="text-muted-foreground/40">…</span>)}
    </td>
  );
};

// ------------------------------------------------------------------ pagina
const FoodDatabase = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [newName, setNewName] = useState('');
  const [onlyWarn, setOnlyWarn] = useState(false);

  const load = async () => {
    try {
      const r = await adminAPI.getFoods();
      setFoods(r.data || []);
    } catch {
      toast.error('Impossibile caricare gli alimenti');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const warnMap = useMemo(() => Object.fromEntries(foods.map((f) => [f.id, foodWarnings(f)])), [foods]);
  const warnCount = Object.values(warnMap).filter((w) => w.length).length;
  const shown = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    return foods.filter((f) => (!words.length || words.every((w) => norm(f.name).includes(w))) && (!onlyWarn || warnMap[f.id]?.length));
  }, [foods, q, onlyWarn, warnMap]);

  const save = async (food, key, value) => {
    const prev = foods;
    setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, [key]: value } : f)));
    try {
      const r = await adminAPI.updateFood(food.id, { [key]: value });
      setFoods((list) => list.map((f) => (f.id === food.id ? r.data : f)));
    } catch (e) {
      setFoods(prev);
      toast.error(e.response?.data?.detail || 'Modifica non salvata');
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const r = await adminAPI.createFood({ name });
      setFoods((list) => [...list, r.data].sort((a, b) => norm(a.name).localeCompare(norm(b.name))));
      setNewName('');
      toast.success(`${name} aggiunto: ora inserisci i valori per 100 g`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Non riuscito');
    }
  };

  const remove = async (food) => {
    if (!window.confirm(`Eliminare "${food.name}" dal database? Le diete già fatte non cambiano.`)) return;
    try {
      await adminAPI.deleteFood(food.id);
      setFoods((list) => list.filter((f) => f.id !== food.id));
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  };

  const exportCsv = () => {
    const blob = new Blob([foodsToCSV(foods)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alimenti-lc-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-5" data-testid="food-database">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">🥗 Database alimenti</h2>
          <p className="text-sm text-muted-foreground">Valori per 100 g · tocca una cella per modificarla · <b className="text-foreground">{foods.length} alimenti</b></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!foods.length}><Download className="w-4 h-4 mr-2" />Esporta CSV</Button>
          <Button onClick={() => setShowImport(true)} data-testid="open-import"><Upload className="w-4 h-4 mr-2" />Importa da Notion / CSV</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] items-start">
        <div className="space-y-3 min-w-0">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nel tuo database…" className="pl-10" data-testid="food-search" />
            </div>
            {warnCount > 0 && (
              <Button variant={onlyWarn ? 'default' : 'outline'} onClick={() => setOnlyWarn((v) => !v)} data-testid="only-warn">
                <AlertTriangle className="w-4 h-4 mr-2" />{warnCount} da controllare
              </Button>
            )}
          </div>
          <Card className="overflow-hidden">
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="food-table">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b bg-muted/30">
                      <th className="text-left px-2 py-2 font-semibold min-w-[190px]">Alimento</th>
                      {FIELDS.map((f) => <th key={f.key} className="text-right px-2 py-2 font-semibold whitespace-nowrap">{f.short}</th>)}
                      <th className="text-left px-2 py-2 font-semibold min-w-[120px]">Note</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((f) => {
                      const w = warnMap[f.id] || [];
                      return (
                        <tr key={f.id} className="border-b last:border-0 group" data-testid={`food-row-${f.id}`}>
                          <EditCell value={f.name} onSave={(v) => save(f, 'name', v)} className="font-semibold min-w-[190px]" testid={`food-name-${f.id}`} />
                          {FIELD_KEYS.map((k) => <EditCell key={k} numeric value={f[k]} onSave={(v) => save(f, k, v)} testid={`food-${k}-${f.id}`} />)}
                          <EditCell value={f.notes} onSave={(v) => save(f, 'notes', v)} className="text-xs text-muted-foreground" />
                          <td className="px-1 whitespace-nowrap">
                            <div className="flex items-center gap-1 justify-end">
                              {f.source === 'CREA' && f.crea_code && (
                                <a href={CREA_URL(f.crea_code)} target="_blank" rel="noreferrer" title={`Fonte: CREA ${f.crea_code}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent">CREA</a>
                              )}
                              {w.length > 0 && <span title={w.join('\n')} className="text-amber-600 cursor-help" data-testid={`food-warn-${f.id}`}><AlertTriangle className="w-4 h-4" /></span>}
                              <button type="button" onClick={() => remove(f)} className="opacity-30 group-hover:opacity-100 p-1 text-destructive" aria-label={`Elimina ${f.name}`}><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={FIELDS.length + 3} className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-muted-foreground" />
                          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
                            placeholder="Nuovo alimento (scrivi il nome e premi Invio)" className="flex-1 h-8 bg-transparent outline-none text-sm" data-testid="food-new" />
                          {newName.trim() && <Button size="sm" onClick={create}>Aggiungi</Button>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {!shown.length && foods.length > 0 && <p className="text-sm text-muted-foreground text-center py-6">Nessun alimento trovato</p>}
                {!foods.length && <p className="text-sm text-muted-foreground text-center py-6">Il database è vuoto: importa il CSV da Notion o cerca sul CREA.</p>}
              </div>
            )}
          </Card>
          {warnCount > 0 && <p className="text-xs text-muted-foreground">⚠ = valori probabilmente sbagliati (es. zuccheri più alti dei carboidrati, calorie che non tornano con i macro). Passa il mouse sul simbolo per il dettaglio.</p>}
        </div>
        <div className="space-y-4">
          {showImport && <ImportPanel onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
          <CreaSearch foods={foods} onAdded={(food) => setFoods((list) => [...list.filter((f) => f.id !== food.id), food].sort((a, b) => norm(a.name).localeCompare(norm(b.name))))} />
        </div>
      </div>
    </div>
  );
};

export default FoodDatabase;
