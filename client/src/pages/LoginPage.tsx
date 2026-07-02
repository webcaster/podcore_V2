import React, { useState, useEffect } from 'react';
import { Headphones, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import { authApi } from '../lib/api';

// Injected at build time by vite.config.ts
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.11.3';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState<boolean | null>(null);

  useEffect(() => {
    authApi.getSetupStatus()
      .then((data: any) => setIsFirstSetup(data?.isFirstSetup ?? true))
      .catch(() => setIsFirstSetup(false)); // On error, hide hint (safer default)
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-purple rounded-2xl mb-4 shadow-glow-purple">
            <Headphones size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">PodCore</h1>
          <p className="text-text-secondary mt-1">Podcast Management System</p>
          <p className="text-text-muted text-xs mt-1">v{APP_VERSION}</p>
        </div>

        {/* Login Form */}
        <div className="card-raised p-8 shadow-card">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Anmelden</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="Benutzername eingeben"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Passwort eingeben"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-4 py-3 text-accent-red text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Anmelden...</span>
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          {isFirstSetup === true && (
            <div className="mt-6 pt-6 border-t border-surface-border">
              <p className="text-text-muted text-xs text-center">
                Erstanmeldung — Standard-Zugangsdaten:{' '}
                <span className="text-text-secondary font-mono">admin / admin123</span>
              </p>
              <p className="text-text-muted text-xs text-center mt-1">
                Bitte Passwort nach der ersten Anmeldung ändern.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          PodCore läuft lokal auf Ihrem System — keine Cloud-Abhängigkeiten
        </p>
      </div>
    </div>
  );
}
