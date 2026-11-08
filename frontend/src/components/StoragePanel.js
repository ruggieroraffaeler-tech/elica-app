import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { HardDrive, Image as ImageIcon, Video, FileText, RefreshCw, Download, Trash2, Lock, ShieldCheck } from 'lucide-react';

// =====================================================================
//  Spazio database (MongoDB Atlas gratuito = 512 MB)
//  Regola: NIENTE viene eliminato in automatico. Ogni azione la decide il coach,
//  con conferma. I video privati degli atleti non si possono toccare da qui.
// =====================================================================

const fmt = (mb) => `${Number(mb || 0).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const barColor = (p) => (p > 80 ? 'bg-red-500' : p > 60 ? 'bg-yellow-500' : 'bg-green-500');

const StoragePanel = ({ onStatsChange }) => {
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // 'photos' | 'legacy' | <videoId>
  const [busy, setBusy] = useState(null);
  const [photoProgress, setPhotoProgress] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([adminAPI.getStorageStats(), adminAPI.getStorageOverview()]);
      setStats(s.data);
      setOverview(o.data);
      onStatsChange && onStatsChange(s.data);
    } catch {
      toast.error('Impossibile leggere lo spazio. Riprova tra poco.');
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => { load(); }, [load]);

  const compressPhotos = async () => {
    setConfirm(null);
    setBusy('photos');
    let done = 0;
    let saved = 0;
    let remaining = overview?.photos?.count || 0;
    setPhotoProgress({ done, saved, remaining });
    try {
      for (let i = 0; i < 200 && remaining > 0; i++) {
        const r = await adminAPI.compressPhotos(10);
        done += r.data.processed;
        saved += r.data.saved_mb;
        remaining = r.data.remaining;
        setPhotoProgress({ done, saved, remaining });
        if (!r.data.processed) break;
      }
      toast.success(`Foto alleggerite: ${done} · spazio recuperato ${fmt(saved)}`);
    } catch {
      toast.error('Interrotto: le foto già fatte restano alleggerite. Puoi riprendere quando vuoi.');
    } finally {
      setBusy(null);
      load();
    }
  };

  const downloadVideo = async (v) => {
    setBusy(`dl-${v.id}`);
    try {
      const r = await adminAPI.getVideoFile(v.id);
      const data = r.data.video_data || '';
      const ext = data.startsWith('data:video/webm') ? 'webm' : data.startsWith('data:video/quicktime') ? 'mov' : 'mp4';
      const a = document.createElement('a');
      a.href = data;
      a.download = `${v.athlete} - ${v.title || 'video'}.${ext}`.replace(/[\\/:*?"<>|]/g, '_');
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error('Download non riuscito');
    } finally {
      setBusy(null);
    }
  };

  const deleteVideo = async (v) => {
    setConfirm(null);
    setBusy(v.id);
    try {
      await adminAPI.deleteVideoAdmin(v.id);
      toast.success(`Video eliminato: ${v.title}`);
      load();
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setBusy(null);
    }
  };

  const clearLegacy = async () => {
    setConfirm(null);
    setBusy('legacy');
    try {
      const r = await adminAPI.clearLegacyDietPdf();
      toast.success(`Vecchio PDF dieta rimosso (${r.data.cleared})`);
      load();
    } catch {
      toast.error('Errore');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!stats) {
    return (
      <Card><CardContent className="py-10 text-center space-y-3">
        <p className="text-muted-foreground">Dati sullo spazio non disponibili.</p>
        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Riprova</Button>
      </CardContent></Card>
    );
  }

  const maxSection = Math.max(...(stats.sections || []).map((s) => s.mb), 0.01);
  const photos = overview?.photos || { count: 0, mb: 0, estimated_saving_mb: 0 };
  const visibleVideos = overview?.videos?.visible || [];
  const privateVideos = overview?.videos?.private || [];
  const legacy = overview?.legacy_diet_pdf || { count: 0, mb: 0, athletes: [] };

  return (
    <div className="space-y-6" data-testid="storage-panel">
      {/* Totale */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><HardDrive className="w-5 h-5" />Spazio database</CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Aggiorna
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-bold tabular-nums" data-testid="storage-total">{fmt(stats.total_mb)}</span>
              <span className="text-sm text-muted-foreground">su {fmt(stats.limit_mb)} gratuiti · {String(stats.percent).replace('.', ',')}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all ${barColor(stats.percent)}`} style={{ width: `${Math.min(stats.percent, 100)}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {(stats.sections || []).filter((s) => s.mb >= 0.01).map((s) => (
              <div key={s.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{s.label}</span>
                <div className="bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-primary/70 rounded-full" style={{ width: `${Math.max(2, (s.mb / maxSection) * 100)}%` }} />
                </div>
                <span className="tabular-nums text-muted-foreground text-right w-20">{fmt(s.mb)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 rounded-lg bg-muted/40 border p-3 text-sm">
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <p className="text-muted-foreground">
              Da questo aggiornamento foto e video nuovi vengono ridotti <b>sul telefono</b> prima dell'invio
              (foto ~300 KB, video max ~9 MB). Nulla viene eliminato in automatico: qui sotto decidi tu.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Foto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="w-4 h-4" />Foto pesanti già caricate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {photos.count === 0 && busy !== 'photos' ? (
            <p className="text-sm text-muted-foreground" data-testid="photos-ok">
              Tutte le foto sono già leggere. ✓
              {photoProgress && photoProgress.done > 0 && ` (alleggerite ora: ${photoProgress.done}, recuperati ${fmt(photoProgress.saved)})`}
            </p>
          ) : (
            <>
              <p className="text-sm">
                <b>{photos.count}</b> foto occupano <b>{fmt(photos.mb)}</b>. Alleggerendole recuperi circa <b>{fmt(photos.estimated_saving_mb)}</b>.
              </p>
              <p className="text-xs text-muted-foreground">
                Le foto <b>restano tutte</b>: vengono salvate a 1600 pixel (più che sufficienti per un check fisico), con lo stesso aspetto a schermo.
                Le foto illeggibili vengono lasciate com'erano.
              </p>
              {photoProgress && (
                <p className="text-sm text-muted-foreground" data-testid="photos-progress">
                  {busy === 'photos' ? 'In corso… ' : ''}{photoProgress.done} fatte · {fmt(photoProgress.saved)} recuperati
                  {photoProgress.remaining > 0 ? ` · ne restano ${photoProgress.remaining}` : ''}
                </p>
              )}
              {photos.count > 0 && (confirm === 'photos' ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <span className="text-sm flex-1 min-w-[12rem]">Alleggerisco {photos.count} foto? Ci può volere qualche minuto: tieni aperta la pagina.</span>
                  <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>Annulla</Button>
                  <Button size="sm" onClick={compressPhotos} data-testid="confirm-compress-photos">Conferma</Button>
                </div>
              ) : (
                <Button onClick={() => setConfirm('photos')} disabled={!!busy} data-testid="compress-photos-btn">
                  {busy === 'photos' ? 'Alleggerimento in corso…' : `Alleggerisci ${photos.count} foto`}
                </Button>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Video */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Video className="w-4 h-4" />Video condivisi con te</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dal più pesante. Elimina solo quelli che non ti servono più (puoi scaricarli prima): spariscono anche per l'atleta, insieme alle tue annotazioni.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun video condiviso.</p>
          ) : (
            <>
              <p className="text-sm">{visibleVideos.length} video · <b>{fmt(overview.videos.visible_mb)}</b></p>
              <div className="divide-y rounded-lg border">
                {visibleVideos.map((v) => (
                  <div key={v.id} className="px-3 py-2.5" data-testid={`storage-video-${v.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.title || 'Senza titolo'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.athlete} · {fmtDate(v.created_at)}{v.annotations ? ` · ${v.annotations} annotazioni` : ''}
                        </p>
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">{fmt(v.mb)}</span>
                      <Button variant="ghost" size="icon" title="Scarica" disabled={!!busy} onClick={() => downloadVideo(v)}>
                        {busy === `dl-${v.id}` ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /> : <Download className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Elimina" disabled={!!busy} onClick={() => setConfirm(v.id)} data-testid={`storage-delete-video-${v.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {confirm === v.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-destructive/5 border border-destructive/30 p-2">
                        <span className="text-xs flex-1 min-w-[12rem]">Eliminare definitivamente “{v.title}” di {v.athlete}? Non si può annullare.</span>
                        <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>Annulla</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteVideo(v)} data-testid={`confirm-delete-video-${v.id}`}>Elimina</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {privateVideos.length > 0 && (
            <div className="flex gap-2 rounded-lg bg-muted/40 border p-3 text-sm mt-3" data-testid="private-videos">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="text-muted-foreground">
                <p>Video <b>privati</b> degli atleti (non li vedi e non puoi eliminarli; può farlo solo l'atleta):</p>
                <p className="mt-1">{privateVideos.map((p) => `${p.athlete}: ${p.count} (${fmt(p.mb)})`).join(' · ')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vecchio PDF dieta */}
      {legacy.count > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4" />Vecchio PDF dieta nascosto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {legacy.count} {legacy.count === 1 ? 'atleta ha' : 'atleti hanno'} ancora salvato il PDF dieta della <b>vecchia versione</b> dell'app ({fmt(legacy.mb)}):
              non è più visibile da nessuna parte. I PDF dieta attuali non vengono toccati.
            </p>
            <p className="text-xs text-muted-foreground">{legacy.athletes.join(', ')}</p>
            {confirm === 'legacy' ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="text-sm flex-1 min-w-[12rem]">Rimuovo i vecchi PDF nascosti?</span>
                <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>Annulla</Button>
                <Button size="sm" onClick={clearLegacy} data-testid="confirm-clear-legacy">Conferma</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirm('legacy')} disabled={!!busy} data-testid="clear-legacy-btn">Rimuovi vecchio PDF nascosto</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StoragePanel;
