import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Scale, FileText, Loader2, RefreshCw, Camera, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { athleteAPI } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { readCache, writeCache, isOnline, savePdfOffline, loadPdfOffline, formatDateTime } from '../lib/offline';
import { CIRC_FIELDS, CHART_MEASURES, num, fmt, formatDate, measureValue, visitIndexes, openReport } from '../lib/visits';
import { ESTIMATE_FIELDS } from '../lib/bodyMeasure';
import SelfMeasure from './SelfMeasure';

/** Visite dell'atleta (le inserisce il coach) + misurazioni da casa fatte dall'atleta con le foto.
 *  Funziona anche offline con i dati salvati. */
const VisitsAthlete = ({ athleteName, selfMeasure = false }) => {
  const cached = readCache('visits');
  const [visits, setVisits] = useState(() => cached?.data || []);
  const [savedAt, setSavedAt] = useState(() => cached?.savedAt || null);
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [chartKey, setChartKey] = useState('weight');
  const [openingId, setOpeningId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [measuring, setMeasuring] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async (manual = false) => {
    setRefreshing(true);
    try {
      const res = await athleteAPI.getVisits();
      const data = res.data || [];
      setVisits(data);
      writeCache('visits', data);
      setSavedAt(Date.now());
      setEnabled(true);
    } catch (e) {
      if (e?.response?.status === 403) {
        setEnabled(false);
        // sezione disattivata dal coach: non mostro dati vecchi
        setVisits([]);
        writeCache('visits', []);
      } else if (manual) toast.error('Rete debole: visite non aggiornate, vedi quelle salvate sul telefono.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...visits].sort((a, b) => String(b.date).localeCompare(String(a.date))), [visits]);
  const last = sorted[0];
  const first = sorted[sorted.length - 1];

  const availableMeasures = CHART_MEASURES.filter((m) => sorted.some((v) => measureValue(v, m.key) !== null));
  const chartData = useMemo(() => [...sorted].reverse()
    .map((v) => ({ data: formatDate(v.date).slice(0, 5), valore: measureValue(v, chartKey) }))
    .filter((p) => p.valore !== null), [sorted, chartKey]);
  const chartMeasure = CHART_MEASURES.find((m) => m.key === chartKey);

  const openPdf = async (v) => {
    const key = `visit|${v.id}|${v.updated_at || ''}`;
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font-family:sans-serif;padding:16px">Caricamento PDF...</p>');
    setOpeningId(v.id);
    try {
      let data = await loadPdfOffline(key);
      if (!data && isOnline()) {
        const res = await athleteAPI.getVisitReport(v.id);
        data = res.data?.report_data;
        if (data) savePdfOffline(key, data);
      }
      if (!data) throw new Error('offline');
      openReport(data, win);
    } catch {
      if (win) win.close();
      toast.error('PDF non disponibile senza rete. Aprilo una volta con la connessione: poi resterà salvato sul telefono.');
    } finally {
      setOpeningId(null);
    }
  };

  const removeSelf = async (v) => {
    if (!window.confirm(`Eliminare la misurazione da casa del ${formatDate(v.date)}?`)) return;
    setDeletingId(v.id);
    try {
      await athleteAPI.deleteSelfMeasure(v.id);
      const next = visits.filter((x) => x.id !== v.id);
      setVisits(next);
      writeCache('visits', next);
      toast.success('Misurazione eliminata');
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (measuring) {
    return (
      <SelfMeasure
        athleteName={athleteName}
        history={sorted}
        onCancel={() => setMeasuring(false)}
        onDone={() => { setMeasuring(false); load(true); }}
      />
    );
  }

  const weightDelta = last && first && last !== first && num(last.weight) && num(first.weight) ? num(last.weight) - num(first.weight) : null;
  const lastIx = visitIndexes(last);

  return (
    <div className="space-y-4" data-testid="athlete-visits">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{savedAt ? `Aggiornate ${formatDateTime(savedAt)}` : ''}</span>
        <button onClick={() => load(true)} disabled={refreshing} className="p-1 rounded hover:bg-muted" aria-label="Aggiorna">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {enabled && selfMeasure && (
        <Button className="w-full" variant="outline" onClick={() => setMeasuring(true)} data-testid="self-measure-btn">
          <Camera className="w-4 h-4 mr-2" />Misurati da casa con le foto
        </Button>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">Nessuna visita ancora</p>
            <p className="text-sm text-muted-foreground">Qui troverai peso, misure e note delle visite con il coach e delle misurazioni che fai da casa.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Ultimo peso</p>
                  <p className="text-xl font-bold">{last.weight ? `${fmt(last.weight)}` : '—'}<span className="text-xs font-normal"> kg</span></p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Dall'inizio</p>
                  <p className="text-xl font-bold">{weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${fmt(weightDelta)}` : '—'}<span className="text-xs font-normal"> kg</span></p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Vita</p>
                  <p className="text-xl font-bold">{measureValue(last, 'vita') ? fmt(measureValue(last, 'vita')) : num(last.photo_estimates?.vita) ? `~${fmt(num(last.photo_estimates.vita))}` : '—'}<span className="text-xs font-normal"> cm</span></p>
                </div>
              </div>
              {(lastIx.bmi || lastIx.bodyFat) && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {lastIx.bmi ? `BMI ${fmt(lastIx.bmi)}` : ''}{lastIx.bmi && lastIx.bodyFat ? ' · ' : ''}{lastIx.bodyFat ? `% grasso stimata ${fmt(lastIx.bodyFat)}%` : ''}
                </p>
              )}
            </CardContent>
          </Card>

          {chartData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">📈 Andamento</CardTitle>
                  <select value={chartKey} onChange={(e) => setChartKey(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                    {availableMeasures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip formatter={(val) => [`${fmt(val)} ${chartMeasure?.unit || ''}`, chartMeasure?.label]} />
                    <Line type="monotone" dataKey="valore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Le tue visite ({sorted.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sorted.map((v, i) => {
                const prev = sorted[i + 1];
                const dW = prev && num(v.weight) && num(prev.weight) ? num(v.weight) - num(prev.weight) : null;
                const circs = CIRC_FIELDS.filter((f) => num(v.circumferences?.[f.key]));
                const self = v.source === 'athlete';
                // misurazione da casa senza metro: mostro le stime da foto
                const ests = circs.length === 0 ? ESTIMATE_FIELDS.filter((f) => num(v.photo_estimates?.[f.key])) : [];
                const open = expanded === v.id;
                return (
                  <div key={v.id} className="p-3 bg-muted/30 rounded-lg border space-y-2" data-testid={`athlete-visit-${v.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button className="text-left min-w-0" onClick={() => setExpanded(open ? null : v.id)}>
                        <p className="font-semibold">{formatDate(v.date)}{self && <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">📸 da casa</span>}</p>
                        <p className="text-sm">
                          {v.weight ? <>⚖️ <strong>{fmt(v.weight)} kg</strong></> : '—'}
                          {dW !== null && <span className={`ml-1 text-xs ${dW < 0 ? 'text-emerald-600' : dW > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>({dW > 0 ? '+' : ''}{fmt(dW)})</span>}
                          {circs.length > 0 && <span className="text-xs text-muted-foreground"> · {circs.length} misure {open ? '▲' : '▼'}</span>}
                          {ests.length > 0 && <span className="text-xs text-muted-foreground"> · {ests.length} misure da foto {open ? '▲' : '▼'}</span>}
                        </p>
                      </button>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {v.has_report && (
                          <Button size="sm" variant="outline" onClick={() => openPdf(v)} disabled={openingId === v.id} data-testid={`athlete-visit-pdf-${v.id}`}>
                            {openingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-1" />PDF</>}
                          </Button>
                        )}
                        {self && (
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive px-2" onClick={() => removeSelf(v)} disabled={deletingId === v.id} aria-label="Elimina" data-testid={`self-delete-${v.id}`}>
                            {deletingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    {open && circs.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {circs.map((f) => {
                          const pv = num(prev?.circumferences?.[f.key]);
                          const d = pv ? num(v.circumferences[f.key]) - pv : null;
                          return (
                            <div key={f.key} className="flex justify-between">
                              <span className="text-muted-foreground">{f.label}</span>
                              <span><strong>{fmt(v.circumferences[f.key])}</strong>{d !== null && Math.abs(d) >= 0.05 && <span className="text-xs text-muted-foreground ml-1">({d > 0 ? '+' : ''}{fmt(d)})</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {open && ests.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {ests.map((f) => (
                          <div key={f.key} className="flex justify-between">
                            <span className="text-muted-foreground">{f.label}</span>
                            <span><strong>~{fmt(v.photo_estimates[f.key])}</strong></span>
                          </div>
                        ))}
                        <p className="col-span-2 text-[11px] text-muted-foreground">Stime da foto (cm): utili per l'andamento, il riferimento resta il metro.</p>
                      </div>
                    )}
                    {v.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">📝 {v.notes}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default VisitsAthlete;
