import { useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, X, RefreshCw } from 'lucide-react';
import { licenseApi, LicenseStatus } from '../../lib/api';
import { useApp, useAuth } from '../../contexts/AppContext';

const DISMISS_KEY = 'podcore-license-warning-dismissed';

export default function LicenseStatusBanner() {
  const { isAuthenticated } = useAuth();
  const { can } = useApp();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const load = async () => {
      try {
        const current = await licenseApi.getStatus();
        if (!cancelled) setStatus(current);
        if (current.status === 'active' && can('canManageSettings')) {
          try {
            const validated = await licenseApi.validate();
            if (!cancelled) setStatus(validated);
          } catch {
            // Die Statusanzeige bleibt auf dem zuletzt bekannten Wert.
          }
        }
      } catch {
        // Nicht eingeloggte oder gerade ablaufende Sessions erzeugen keinen Banner.
      }
    };

    load();
    const timer = window.setInterval(load, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, can]);

  if (!isAuthenticated || !status || !status.configured || status.status === 'active' || dismissed) return null;

  const isOffline = status.status === 'offline' || status.realStatus === 'offline';
  const isGrace = status.isGracePeriod;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const current = status.activationTokenMasked ? await licenseApi.validate() : await licenseApi.getStatus();
      setStatus(current);
    } catch {
      // Der bereits angezeigte Fehler bleibt sichtbar.
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`fixed bottom-5 right-5 z-[80] w-[min(420px,calc(100vw-2rem))] rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
      isGrace ? 'border-accent-purple/30 bg-obsidian-900/90' : 'border-amber-500/30 bg-obsidian-900/95'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ${isGrace ? 'bg-accent-purple/15 text-accent-purple' : 'bg-amber-500/15 text-amber-300'}`}>
          {isGrace ? <KeyRound size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            {isGrace ? 'Eingeschränkter Offline-Modus' : (isOffline ? 'Lizenzserver momentan nicht erreichbar' : 'PodCore-Lizenz benötigt Aufmerksamkeit')}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {isGrace 
              ? `PodCore ist offline. Die Lizenz ist noch für ${status.gracePeriodDaysRemaining} Tage lokal gültig, bevor eine erneute Online-Prüfung erforderlich ist.`
              : (isOffline ? 'Die letzte Lizenzprüfung konnte nicht durchgeführt werden. Prüfe die Verbindung später erneut.' : 'Die PodCore-Installation ist aktuell nicht als aktiv bestätigt.')
            }
          </p>
          {!isGrace && status.lastError && <p className="mt-2 break-words text-xs text-amber-200">{status.lastError}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={refresh} disabled={isRefreshing} className="btn-secondary px-3 py-1.5 text-xs">
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} /> {isGrace ? 'Verbindung prüfen' : 'Erneut prüfen'}
            </button>
            <a href="/settings?tab=license" className="btn-primary px-3 py-1.5 text-xs">Lizenzierung öffnen</a>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Lizenzhinweis schließen" className="text-text-muted transition-colors hover:text-text-primary"><X size={16} /></button>
      </div>
    </div>
  );
}
