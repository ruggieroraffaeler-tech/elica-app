import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { isNetworkError } from '../lib/offline';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { toast } from 'sonner';
import { LogIn, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../components/NetworkStatus';

const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [serverWaking, setServerWaking] = useState(false);
  const { login } = useAuth();
  const online = useOnlineStatus();
  const mounted = useRef(true);

  // Appena si apre la pagina "svegliamo" il server: se l'hosting lo aveva messo in pausa,
  // quando l'atleta preme "Accedi" sarà già pronto.
  useEffect(() => {
    mounted.current = true;
    const slowTimer = setTimeout(() => mounted.current && setServerWaking(true), 4000);
    authAPI
      .ping()
      .catch(() => {})
      .finally(() => {
        clearTimeout(slowTimer);
        if (mounted.current) setServerWaking(false);
      });
    return () => {
      mounted.current = false;
      clearTimeout(slowTimer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = username.trim();
    if (!user || !password) {
      toast.error('Inserisci username e password');
      return;
    }
    if (navigator.onLine === false) {
      toast.error('Sei offline. Collegati a internet (anche debole) per accedere la prima volta.');
      return;
    }

    setLoading(true);
    setStatusMsg('');
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await authAPI.login(user, password);
          login(response.data.token, response.data.user);
          toast.success('Accesso effettuato!');
          return;
        } catch (error) {
          // Credenziali sbagliate o altri errori "veri": inutile riprovare
          if (!isNetworkError(error)) {
            toast.error(error.response?.data?.detail || 'Credenziali non valide');
            return;
          }
          if (attempt < MAX_ATTEMPTS) {
            setStatusMsg(`Connessione lenta, nuovo tentativo ${attempt + 1} di ${MAX_ATTEMPTS}...`);
            await sleep(1500 * attempt);
          }
        }
      }
      toast.error('Impossibile collegarsi al server. La rete è molto debole: riprova tra qualche secondo o spostati dove c\'è più segnale.');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setStatusMsg('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-none animate-fade-in border bg-card rounded-2xl">
        <CardHeader className="text-center space-y-4 pt-8 pb-2">
          <div className="mx-auto">
            {/* logo chiaro o scuro in base al tema */}
            <img src="/logo-light.png" alt="LC Performance" width="144" height="144"
              className="w-36 h-36 mx-auto rounded-[28px] block dark:hidden" />
            <img src="/logo-dark.png" alt="LC Performance" width="144" height="144"
              className="w-36 h-36 mx-auto rounded-[28px] hidden dark:block" />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground/80">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                placeholder="Inserisci username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Inserisci password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                  Accesso in corso...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Accedi
                </span>
              )}
            </Button>

            {statusMsg && (
              <p className="text-center text-sm text-amber-600 dark:text-amber-400" data-testid="login-status">{statusMsg}</p>
            )}
            {!statusMsg && serverWaking && !loading && (
              <p className="text-center text-xs text-muted-foreground">Connessione al server in corso, può richiedere qualche secondo...</p>
            )}
            {!online && (
              <p className="text-center text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" /> Nessuna connessione
              </p>
            )}
          </form>

        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
