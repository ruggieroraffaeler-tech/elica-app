import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { athleteAPI } from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Video, Upload, Trash2, Eye, EyeOff, ArrowLeft, Play, MessageSquare, Scale, Camera, Home, PlayCircle } from 'lucide-react';
import VideoViewer from '../../components/VideoViewer';
import { prepareVideoForUpload, formatMB } from '../../lib/media';

const AthleteVideos = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null); // { phase: 'compress' | 'upload', value: 0..1 }
  const [visibleToCoach, setVisibleToCoach] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await athleteAPI.getVideos();
      setVideos(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Seleziona un video valido');
      return;
    }

    if (!videoTitle.trim()) {
      toast.error('Inserisci un titolo per il video');
      return;
    }

    setUploading(true);
    setProgress({ phase: 'compress', value: 0 });
    try {
      // Il video viene compresso sul telefono (720p, senza audio): occupa fino a 10 volte meno spazio
      const prepared = await prepareVideoForUpload(file, {
        onProgress: (v) => setProgress({ phase: 'compress', value: v }),
      });
      setProgress({ phase: 'upload', value: 0 });
      await athleteAPI.uploadVideo({
        video_data: prepared.dataUrl,
        title: videoTitle,
        visible_to_coach: visibleToCoach
      });
      toast.success(prepared.compressed
        ? `Video caricato! (${formatMB(prepared.originalSize)} → ${formatMB(prepared.finalSize)})`
        : 'Video caricato!');
      setVideoTitle('');
      loadVideos();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Errore nel caricamento');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const toggleVisibility = async (videoId, currentVisible) => {
    try {
      await athleteAPI.toggleVideoVisibility(videoId, !currentVisible);
      setVideos(videos.map(v =>
        v.id === videoId ? { ...v, visible_to_coach: !currentVisible } : v
      ));
      toast.success(currentVisible ? 'Video nascosto al coach' : 'Video visibile al coach');
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const deleteVideo = async (videoId) => {
    try {
      await athleteAPI.deleteVideo(videoId);
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success('Video eliminato');
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const viewAnnotations = async (video) => {
    try {
      const response = await athleteAPI.getVideoAnnotations(video.id);
      setAnnotations(response.data);
      setSelectedVideo(video);
    } catch (error) {
      toast.error('Errore nel caricamento annotazioni');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/athlete')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold tracking-tight">I Tuoi Video</h1>
                <p className="text-sm text-muted-foreground">Carica video per l'analisi</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Carica un nuovo video</h3>
              <p className="text-sm text-muted-foreground mb-4">
                MP4, MOV, WebM · massimo 3 minuti (meglio 15–60 secondi).<br />
                Il video viene ridotto in automatico sul telefono prima dell'invio.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Titolo del video (es. Squat laterale)"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                data-testid="video-title-input"
              />

              <div className="flex items-center justify-center gap-3">
                <Switch
                  id="video-visible"
                  checked={visibleToCoach}
                  onCheckedChange={setVisibleToCoach}
                  data-testid="video-visibility-switch"
                />
                <Label htmlFor="video-visible" className="text-sm">
                  {visibleToCoach ? 'Visibile al coach' : 'Privato'}
                </Label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="video-file-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !videoTitle.trim()}
                className="w-full"
                data-testid="upload-video-btn"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    {progress?.phase === 'compress' ? `Riduco il video... ${Math.round((progress.value || 0) * 100)}%` : 'Invio in corso...'}
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Seleziona Video
                  </>
                )}
              </Button>
              {uploading && progress?.phase === 'compress' && (
                <div className="space-y-1" data-testid="video-compress-progress">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress.value || 0) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Tieni l'app aperta finché non finisce: ci mette circa quanto dura il video.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Videos List */}
        {videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Nessun video</p>
              <p className="text-muted-foreground">Carica il tuo primo video</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">I Tuoi Video ({videos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  data-testid={`video-item-${video.id}`}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div className="w-20 h-14 bg-black rounded flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{video.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('it-IT')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {video.visible_to_coach ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Visibile
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Privato
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewAnnotations(video)}
                      title="Vedi feedback coach"
                      data-testid={`view-annotations-${video.id}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(video.id, video.visible_to_coach)}
                      data-testid={`toggle-video-visibility-${video.id}`}
                    >
                      {video.visible_to_coach ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVideo(video.id)}
                      data-testid={`delete-video-${video.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Video Viewer with Annotations */}
        {selectedVideo && (
          <VideoViewer
            videoData={selectedVideo.video_data}
            annotations={annotations}
            onClose={() => { setSelectedVideo(null); setAnnotations([]); }}
          />
        )}
      </main>

      {/* Bottom Navigation - hidden when viewing video */}
      {!selectedVideo && <nav className="bottom-nav" style={{ marginBottom: '40px' }}>
        <button className="bottom-nav-link" onClick={() => navigate('/athlete')}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button className="bottom-nav-link" onClick={() => navigate('/athlete/exercises')}>
          <PlayCircle className="w-5 h-5" />
          <span>Esercizi</span>
        </button>
        <button className="bottom-nav-link" onClick={() => navigate('/athlete/checks')}>
          <Scale className="w-5 h-5" />
          <span>Check</span>
        </button>
        <button className="bottom-nav-link" onClick={() => navigate('/athlete/photos')}>
          <Camera className="w-5 h-5" />
          <span>Foto</span>
        </button>
        <button className="bottom-nav-link active" onClick={() => navigate('/athlete/videos')}>
          <Video className="w-5 h-5" />
          <span>Video</span>
        </button>
      </nav>}
    </div>
  );
};

export default AthleteVideos;
