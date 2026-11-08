import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, changePassword } from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Users, Bell, Plus, LogOut, ChevronRight, Clock, User, PlayCircle, KeyRound, Trash2, Search, X, FlaskConical, HardDrive, ArrowLeft, Apple } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ExerciseLibrary from './ExerciseLibrary';
import FoodDatabase from '../../components/FoodDatabase';
import ThemeToggle from '../../components/ThemeToggle';
import StoragePanel from '../../components/StoragePanel';
import BrandLogo from '../../components/BrandLogo';


// Ricerca senza distinzione di maiuscole e accenti ("niccolo" trova "Niccolò")
const normalize = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const initials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

// Colore fisso per atleta (stesso nome = stesso colore), leggibile in modalità giorno e notte
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
];
const avatarColor = (key) => {
  let h = 0;
  for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [expiryNotifications, setExpiryNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ name: '', username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [search, setSearch] = useState('');
  // La scheda aperta sta nell'indirizzo (#beta, #storage, #exercises): così il tasto
  // "Indietro" del telefono riporta alla lista atleti invece di uscire dall'app.
  const location = useLocation();
  const SUB_TABS = ['foods', 'exercises', 'beta', 'storage'];
  const hashTab = (location.hash || '').replace('#', '');
  const tab = SUB_TABS.includes(hashTab) ? hashTab : 'athletes';
  const pendingTab = useRef(null);
  useEffect(() => { pendingTab.current = null; }, [location.key]);
  const setTab = (t) => {
    if (pendingTab.current === t) return; // stesso tocco arrivato due volte mentre cambia pagina
    pendingTab.current = t;
    // legge l'indirizzo attuale (non lo stato della schermata): il tocco su una scheda
    // può arrivare due volte di fila e non deve aggiungere due passi nella cronologia
    const cur = window.location.hash.replace('#', '');
    const current = SUB_TABS.includes(cur) ? cur : 'athletes';
    if (t === current) return;
    if (t === 'athletes') {
      if (window.history.state && window.history.state.usr && window.history.state.usr.fromTabs) navigate(-1);
      else navigate({ pathname: location.pathname, hash: '' }, { replace: true });
    } else {
      navigate({ pathname: location.pathname, hash: t }, { replace: current !== 'athletes', state: { fromTabs: true } });
    }
    window.scrollTo(0, 0);
  };
  const BackToAthletes = () => (
    <Button variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground" onClick={() => setTab('athletes')} data-testid="back-to-athletes">
      <ArrowLeft className="w-4 h-4 mr-1.5" />Torna agli atleti
    </Button>
  );
  const searchRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [athletesRes, notificationsRes] = await Promise.all([
        adminAPI.getAthletes(),
        adminAPI.getNotifications().catch(() => ({ data: [] }))
      ]);
      setAthletes(athletesRes.data || []);
      setNotifications(notificationsRes.data || []);
      adminAPI.getStorageStats().then(r => setStorageStats(r.data)).catch(() => {});
      adminAPI.getExpiryNotifications().then(r => setExpiryNotifications(r.data || [])).catch(() => {});
    } catch (error) {
      toast.error('Errore nel caricamento. Il server potrebbe essere in avvio, riprova tra 30 secondi.');
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAthlete = async (e) => {
    e.preventDefault();
    if (!newAthlete.name || !newAthlete.username || !newAthlete.password) {
      toast.error('Compila tutti i campi');
      return;
    }

    setCreating(true);
    try {
      await adminAPI.createAthlete(newAthlete);
      toast.success('Atleta creato con successo!');
      setNewAthlete({ name: '', username: '', password: '' });
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setCreating(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await adminAPI.markNotificationRead(notificationId);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await adminAPI.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (e) {
      console.error('Error deleting notification');
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await adminAPI.deleteAllNotifications();
      setNotifications([]);
    } catch (e) {
      console.error('Error deleting all notifications');
    }
  };

  const deleteExpiryNotification = async (id) => {
    try {
      await adminAPI.deleteExpiryNotification(id);
      setExpiryNotifications(expiryNotifications.filter(n => n.id !== id));
    } catch (e) { console.error('Error deleting expiry notification'); }
  };

  const deleteAllExpiryNotifications = async () => {
    try {
      await adminAPI.deleteAllExpiryNotifications();
      setExpiryNotifications([]);
    } catch (e) { console.error('Error deleting all expiry notifications'); }
  };

  // Atleti in ordine alfabetico, filtrati per nome o username
  const visibleAthletes = useMemo(() => {
    const q = normalize(search);
    return [...athletes]
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base' }))
      .filter((a) => !q || normalize(a.name).includes(q) || normalize(a.username).includes(q));
  }, [athletes, search]);

  // Tasto "/" = vai alla ricerca
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Funzioni beta: Visite attive solo per gli atleti scelti
  const [betaSearch, setBetaSearch] = useState('');
  const [betaSaving, setBetaSaving] = useState(null);
  const betaCount = athletes.filter((a) => a.beta_visits).length;
  const selfCount = athletes.filter((a) => a.beta_self_measure).length;
  const betaList = useMemo(() => {
    const q = normalize(betaSearch);
    return [...athletes]
      .sort((a, b) => (Number(!!b.beta_visits) + Number(!!b.beta_self_measure) - Number(!!a.beta_visits) - Number(!!a.beta_self_measure)) || String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base' }))
      .filter((a) => !q || normalize(a.name).includes(q) || normalize(a.username).includes(q));
  }, [athletes, betaSearch]);

  // feature: 'visits' | 'self_measure'
  const toggleBeta = async (athlete, feature = 'visits') => {
    const id = athlete.id || athlete.athlete_id;
    if (!id) return;
    const field = feature === 'visits' ? 'beta_visits' : 'beta_self_measure';
    const next = !athlete[field];
    setBetaSaving(id);
    try {
      const res = await adminAPI.setBeta(id, { [feature]: next });
      const flags = res.data || {};
      setAthletes((list) => list.map((a) => ((a.id || a.athlete_id) === id ? { ...a, ...flags } : a)));
      const msg = feature === 'visits'
        ? (next ? 'Visite attivate' : 'Visite disattivate')
        : (next ? '"Misurati da casa" attivata' : '"Misurati da casa" disattivata');
      toast.success(`${msg} per ${athlete.name}`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setBetaSaving(null);
    }
  };

  const openAthlete = (athlete) => {
    const id = athlete.id || athlete.athlete_id;
    if (!id) {
      toast.error('ID atleta mancante: impossibile aprire la scheda');
      return;
    }
    navigate(`/admin/athlete/${id}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length + expiryNotifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BrandLogo size={38} showName subtitle="Area coach" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="text-muted-foreground" />
              <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground">
                    <KeyRound className="w-5 h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Cambia Password</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cambia Password</DialogTitle>
                    <DialogDescription>Inserisci la password attuale e quella nuova.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Password attuale</Label>
                      <Input type="password" value={pwData.current_password} onChange={e => setPwData({...pwData, current_password: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nuova password</Label>
                      <Input type="password" value={pwData.new_password} onChange={e => setPwData({...pwData, new_password: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Conferma nuova password</Label>
                      <Input type="password" value={pwData.confirm_password} onChange={e => setPwData({...pwData, confirm_password: e.target.value})} />
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
                        toast.error(e.response?.data?.detail || 'Errore nel cambio password');
                      } finally { setChangingPw(false); }
                    }}>
                      {changingPw ? 'Aggiornamento...' : 'Aggiorna Password'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                data-testid="logout-btn"
                onClick={logout}
                className="text-muted-foreground"
              >
                <LogOut className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
            <TabsTrigger value="athletes" data-testid="tab-athletes" className="flex-1 sm:flex-none px-2 sm:px-3">
              <Users className="w-4 h-4 mr-1.5 sm:mr-2" />
              Atleti
            </TabsTrigger>
            <TabsTrigger value="foods" data-testid="tab-foods" className="flex-1 sm:flex-none px-2 sm:px-3">
              <Apple className="w-4 h-4 mr-1.5 sm:mr-2" />
              Alimenti
            </TabsTrigger>
            <TabsTrigger value="exercises" data-testid="tab-exercises" className="flex-1 sm:flex-none px-2 sm:px-3">
              <PlayCircle className="w-4 h-4 mr-1.5 sm:mr-2" />
              <span className="sm:hidden">Esercizi</span><span className="hidden sm:inline">Libreria Esercizi</span>
            </TabsTrigger>
            <TabsTrigger value="beta" data-testid="tab-beta" className="flex-1 sm:flex-none px-2 sm:px-3">
              <FlaskConical className="w-4 h-4 mr-1.5 sm:mr-2" />
              Beta
              {betaCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({betaCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="storage" data-testid="tab-storage" className="flex-1 sm:flex-none px-2 sm:px-3">
              <HardDrive className="w-4 h-4 mr-1.5 sm:mr-2" />
              Spazio
              {storageStats && storageStats.percent > 60 && <span className="ml-1.5 w-2 h-2 rounded-full bg-yellow-500 inline-block" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="athletes">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Athletes List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    I Tuoi Atleti
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({search ? `${visibleAthletes.length} di ${athletes.length}` : athletes.length})
                    </span>
                  </h2>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-athlete-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo Atleta
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuovo Atleta</DialogTitle>
                        <DialogDescription>Inserisci i dati del nuovo atleta</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateAthlete} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Atleta</Label>
                          <Input
                            id="name"
                            data-testid="new-athlete-name"
                            placeholder="Es. Mario Rossi"
                            value={newAthlete.name}
                            onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-username">Username</Label>
                          <Input
                            id="new-username"
                            data-testid="new-athlete-username"
                        placeholder="Es. mario.rossi"
                        value={newAthlete.username}
                        onChange={(e) => setNewAthlete({ ...newAthlete, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Password</Label>
                      <Input
                        id="new-password"
                        data-testid="new-athlete-password"
                        type="password"
                        placeholder="Scegli una password"
                        value={newAthlete.password}
                        onChange={(e) => setNewAthlete({ ...newAthlete, password: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="flex-1"
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        data-testid="create-athlete-submit"
                        className="flex-1"
                        disabled={creating}
                      >
                        {creating ? 'Creazione...' : 'Crea Atleta'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {athletes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && visibleAthletes.length === 1) openAthlete(visibleAthletes[0]);
                    if (e.key === 'Escape') setSearch('');
                  }}
                  placeholder="Cerca atleta per nome o username...  (tasto / )"
                  className="pl-10 pr-10 h-11 text-base"
                  data-testid="athlete-search"
                  autoComplete="off"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Cancella ricerca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {athletes.length === 0 ? (
              <Card>
                <CardContent className="empty-state py-12">
                  <User className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-lg font-medium mt-4">Nessun atleta</p>
                  <p className="text-muted-foreground">Crea il tuo primo atleta per iniziare</p>
                </CardContent>
              </Card>
            ) : visibleAthletes.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center space-y-2">
                  <Search className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="font-medium">Nessun atleta trovato per "{search}"</p>
                  <Button variant="outline" size="sm" onClick={() => setSearch('')}>Mostra tutti</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAthletes.map((athlete) => {
                  const id = athlete.id || athlete.athlete_id;
                  return (
                    <Card
                      key={id || athlete.username}
                      data-testid={`athlete-card-${id || athlete.username}`}
                      className={`card-hover ${id ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                      onClick={() => openAthlete(athlete)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${avatarColor(athlete.name || athlete.username)}`}>
                          {initials(athlete.name || athlete.username)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">
                            {athlete.name}
                            {(athlete.beta_visits || athlete.beta_self_measure) && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">beta</span>}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">@{athlete.username}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            {/* Storage indicator */}
            {storageStats && (
              <button type="button" onClick={() => setTab('storage')} data-testid="storage-indicator" className="w-full text-left mb-4 p-3 bg-muted/40 rounded-lg border hover:bg-muted/70 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">💾 Storage MongoDB Atlas</span>
                  <span className="text-xs font-medium">{storageStats.total_mb} MB / {storageStats.limit_mb} MB</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${storageStats.percent > 80 ? 'bg-red-500' : storageStats.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(storageStats.percent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {storageStats.percent}% utilizzato
                  {storageStats.percent > 80 && ' ⚠️ Quasi pieno!'}
                  {storageStats.percent > 60 && storageStats.percent <= 80 && ' — puoi liberare spazio'}
                  <span className="float-right underline-offset-2 hover:underline">Dettagli →</span>
                </p>
              </button>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </div>
                Notifiche
              </h2>
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={deleteAllNotifications} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Elimina tutte
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <div className="empty-state py-8">
                    <Bell className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm mt-2">Nessuna notifica</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        data-testid={`notification-${notification.id}`}
                        className={`p-4 transition-colors ${!notification.read ? 'bg-accent/5' : ''}`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.read ? 'bg-accent' : 'bg-muted'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {notification.athlete_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {notification.message || 'Ha completato la 3a settimana'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notification.created_at).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiry notifications - 4 week cycle */}
            <div className="flex items-center justify-between mt-6">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                📅 Cicli a 4 Settimane
              </h2>
              {expiryNotifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={deleteAllExpiryNotifications} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Elimina tutte
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {expiryNotifications.length === 0 ? (
                  <div className="empty-state py-8">
                    <span className="text-4xl opacity-30">📅</span>
                    <p className="text-sm mt-2">Nessun ciclo in scadenza</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {expiryNotifications.map((notification) => (
                      <div key={notification.id} className={`p-4 ${!notification.read ? 'bg-orange-500/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">⏰</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.athlete_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Sta per completare le 4 settimane di {notification.tipo === 'dieta' ? 'dieta' : 'macro/piano'} — contattalo per rinnovare!
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notification.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => deleteExpiryNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="storage">
            <BackToAthletes />
            {tab === 'storage' && <StoragePanel onStatsChange={setStorageStats} />}
          </TabsContent>

          <TabsContent value="foods">
            <BackToAthletes />
            {tab === 'foods' && <FoodDatabase />}
          </TabsContent>

          <TabsContent value="exercises">
            <BackToAthletes />
            <ExerciseLibrary />
          </TabsContent>

          <TabsContent value="beta">
            <BackToAthletes />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5" />Funzioni beta</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Funzioni nuove ancora in prova. Sono spente per tutti: attivale solo per gli atleti che scegli.
                  Le sezioni attuali (compreso Check) restano uguali per tutti.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 space-y-1 bg-muted/30">
                  <p className="font-semibold">📋 Visite <span className="text-xs font-normal text-muted-foreground">· attiva per {betaCount} {betaCount === 1 ? 'atleta' : 'atleti'}</span></p>
                  <p className="text-sm text-muted-foreground">
                    Scheda per ogni visita: data, peso, circonferenze, note, stima delle misure da foto e PDF.
                    Per gli atleti abilitati compare una nuova sezione "Visite" (per te nella loro pagina, per loro nell'app, in sola lettura).
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-1 bg-muted/30">
                  <p className="font-semibold">📸 Misurati da casa <span className="text-xs font-normal text-muted-foreground">· attiva per {selfCount} {selfCount === 1 ? 'atleta' : 'atleti'}</span></p>
                  <p className="text-sm text-muted-foreground">
                    L'atleta fa le foto e le misure vengono calcolate sul suo telefono: a te arrivano peso, misure e note
                    (le foto solo se lui sceglie di mandarle). Si trova dentro "Visite": attivandola si attivano anche le Visite.
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input value={betaSearch} onChange={(e) => setBetaSearch(e.target.value)} placeholder="Cerca atleta..." className="pl-10" data-testid="beta-search" />
                </div>
                {betaList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nessun atleta trovato</p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {betaList.map((a) => {
                      const id = a.id || a.athlete_id;
                      const on = !!a.beta_visits;
                      const onSelf = !!a.beta_self_measure;
                      const sw = (value, feature, label, tid) => (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={value}
                            aria-label={`${label} per ${a.name}`}
                            disabled={betaSaving === id}
                            onClick={() => toggleBeta(a, feature)}
                            data-testid={tid}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${value ? 'bg-violet-600' : 'bg-muted-foreground/30'}`}
                          >
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                          <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
                        </div>
                      );
                      return (
                        <div key={id || a.username} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${avatarColor(a.name || a.username)}`}>{initials(a.name || a.username)}</div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{a.name}</p>
                              <p className="text-xs text-muted-foreground truncate">@{a.username}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 flex-shrink-0">
                            {sw(on, 'visits', 'Visite', `beta-switch-${a.username}`)}
                            {sw(onSelf, 'self_measure', 'Da casa', `beta-self-switch-${a.username}`)}
                          </div>
                        </div>
                      );
                    })}
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

export default AdminDashboard;
