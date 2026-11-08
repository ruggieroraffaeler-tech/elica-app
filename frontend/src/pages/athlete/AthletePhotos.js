import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { athleteAPI } from '../../api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, Eye, EyeOff, ArrowLeft, X, Scale, Video, Home, PlayCircle } from 'lucide-react';
import { compressImage } from '../../lib/media';

const AthletePhotos = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [visibleToCoach, setVisibleToCoach] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [comparing, setComparing] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const response = await athleteAPI.getPhotos();
      setPhotos(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un\'immagine valida');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error('L\'immagine è troppo grande (max 30MB)');
      return;
    }

    setUploading(true);
    try {
      // La foto viene ridotta sul telefono (max 1600 px): da 3-8 MB a circa 300 KB
      const imageData = await compressImage(file);
      await athleteAPI.uploadPhoto({
        image_data: imageData,
        visible_to_coach: visibleToCoach
      });
      toast.success('Foto caricata!');
      loadPhotos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel caricamento');
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async (photoId, currentVisible) => {
    try {
      await athleteAPI.togglePhotoVisibility(photoId, !currentVisible);
      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, visible_to_coach: !currentVisible } : p
      ));
      toast.success(currentVisible ? 'Foto nascosta al coach' : 'Foto visibile al coach');
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      await athleteAPI.deletePhoto(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Foto eliminata');
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const toggleCompareSelect = (photo) => {
    setCompareSelection(prev => {
      const exists = prev.find(p => p.id === photo.id);
      if (exists) return prev.filter(p => p.id !== photo.id);
      if (prev.length >= 2) return [prev[1], photo]; // keep last + new
      return [...prev, photo];
    });
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
                <h1 className="text-lg font-bold tracking-tight">Foto Check</h1>
                <p className="text-sm text-muted-foreground">Documenta i tuoi progressi</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Carica una nuova foto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supportati: JPG, PNG · la foto viene ridotta in automatico
              </p>

              <div className="flex items-center gap-3 mb-4">
                <Switch
                  id="visible"
                  checked={visibleToCoach}
                  onCheckedChange={setVisibleToCoach}
                  data-testid="visibility-switch"
                />
                <Label htmlFor="visible" className="text-sm">
                  {visibleToCoach ? 'Visibile al coach' : 'Privata'}
                </Label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="photo-file-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="upload-photo-btn"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Seleziona Foto
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <Card>
            <CardContent className="empty-state py-12">
              <Camera className="w-16 h-16 text-muted-foreground/30" />
              <p className="text-lg font-medium mt-4">Nessuna foto</p>
              <p className="text-muted-foreground">Carica la tua prima foto check</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Le Tue Foto ({photos.length})</CardTitle>
                {photos.length >= 2 && (
                  <Button
                    size="sm"
                    variant={compareMode ? 'default' : 'outline'}
                    onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}
                  >
                    {compareMode ? '✕ Annulla' : '🔍 Confronta'}
                  </Button>
                )}
              </div>
              {compareMode && (
                <p className="text-xs text-muted-foreground">
                  Seleziona 2 foto da confrontare ({compareSelection.length}/2)
                  {compareSelection.length === 2 && (
                    <Button size="sm" className="ml-2 h-7" onClick={() => setComparing([...compareSelection])}>
                      Confronta →
                    </Button>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} data-testid={`photo-item-${photo.id}`} className={`rounded-lg overflow-hidden border-2 relative ${compareSelection.find(p => p.id === photo.id) ? 'border-primary' : 'border-border'}`}>
                    {compareMode && compareSelection.find(p => p.id === photo.id) && (
                      <div className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {compareSelection.findIndex(p => p.id === photo.id) + 1}
                      </div>
                    )}
                    <img
                      src={photo.image_data}
                      alt="Check"
                      loading="lazy"
                      onClick={() => compareMode ? toggleCompareSelect(photo) : setPreviewImage(photo.image_data)}
                      className="w-full aspect-square object-cover cursor-pointer"
                    />
                    <div className="p-2 bg-card flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{new Date(photo.created_at).toLocaleDateString('it-IT')}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          data-testid={`toggle-visibility-${photo.id}`}
                          onClick={() => toggleVisibility(photo.id, photo.visible_to_coach)}>
                          {photo.visible_to_coach ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          data-testid={`delete-photo-${photo.id}`}
                          onClick={() => deletePhoto(photo.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compare Modal */}
        {comparing && comparing.length === 2 && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-2" onClick={() => setComparing(null)}>
            <div className="flex items-center justify-between p-2">
              <p className="text-white text-sm font-medium">Confronto foto</p>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setComparing(null)}>
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 min-h-0" onClick={e => e.stopPropagation()}>
              {comparing.map((photo, i) => (
                <div key={i} className="flex flex-col min-h-0">
                  <img src={photo.image_data} alt={`Foto ${i+1}`} className="flex-1 object-contain min-h-0 rounded" />
                  <p className="text-white text-xs text-center py-2">
                    {new Date(photo.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="bottom-nav-link" data-testid="nav-home" onClick={() => navigate('/athlete')}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button className="bottom-nav-link" onClick={() => navigate('/athlete/exercises')}>
          <PlayCircle className="w-5 h-5" />
          <span>Esercizi</span>
        </button>
        <button className="bottom-nav-link" data-testid="nav-checks" onClick={() => navigate('/athlete/checks')}>
          <Scale className="w-5 h-5" />
          <span>Check</span>
        </button>
        <button className="bottom-nav-link active" data-testid="nav-photos" onClick={() => navigate('/athlete/photos')}>
          <Camera className="w-5 h-5" />
          <span>Foto</span>
        </button>
        <button className="bottom-nav-link" data-testid="nav-videos" onClick={() => navigate('/athlete/videos')}>
          <Video className="w-5 h-5" />
          <span>Video</span>
        </button>
      </nav>
    </div>
  );
};

export default AthletePhotos;
