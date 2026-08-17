import React, { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, Download, FileJson, Globe, Loader2, ShieldCheck, Upload, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { tutorialsApi, TutorialImportResult } from '../lib/api';

const DEFAULT_URL = 'https://podcore.de/wp-json/app-tutorials/v1/catalog';

export default function TutorialImportPage() {
  const navigate = useNavigate();
  const { can } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<TutorialImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!can('canImportTutorials')) {
    return (
      <div className="page-container max-w-2xl">
        <div className="card text-center py-14">
          <ShieldCheck size={42} className="mx-auto mb-4 text-accent-red" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Import nicht freigegeben</h1>
          <p className="text-text-muted mb-5">Für den Tutorial-Import muss dir ein Administrator die Berechtigung „Tutorials importieren“ geben.</p>
          <button onClick={() => navigate('/wiki')} className="btn-secondary">Zum Wiki</button>
        </div>
      </div>
    );
  }

  const runImport = async (operation: () => Promise<TutorialImportResult>) => {
    setError(null);
    setResult(null);
    setIsImporting(true);
    try {
      const data = await operation();
      setResult(data);
      window.dispatchEvent(new Event('podcore-tutorials-updated'));
    } catch (err: any) {
      setError(err?.message || 'Tutorial konnte nicht importiert werden.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Die JSON-Datei darf höchstens 50 MB groß sein.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        void runImport(() => tutorialsApi.importJson(payload));
      } catch {
        setError('Die Datei enthält kein gültiges JSON.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => setError('Die Datei konnte nicht gelesen werden.');
    reader.readAsText(file);
  };

  return (
    <div className="page-container max-w-5xl space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/wiki')} className="text-text-muted hover:text-text-primary text-sm flex items-center gap-1 mb-3">
            <ArrowLeft size={14} /> Zurück zum Wiki
          </button>
          <h1 className="page-title flex items-center gap-3"><Download className="text-accent-purple" /> Tutorials importieren</h1>
          <p className="page-subtitle">Tutorials von podcore.de laden oder eine gespeicherte JSON-Datei manuell übernehmen.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card space-y-5">
          <div>
            <h2 className="section-title flex items-center gap-2"><Globe size={17} className="text-accent-blue" /> Von der Webseite laden</h2>
            <p className="text-text-muted text-sm mt-1">PodCore lädt den Katalog serverseitig. Dadurch ist kein WordPress-CORS-Zugriff im Browser erforderlich.</p>
          </div>
          <label className="label" htmlFor="tutorial-import-url">Tutorial- oder Katalog-URL</label>
          <input id="tutorial-import-url" type="url" value={url} onChange={event => setUrl(event.target.value)} className="input w-full text-sm" placeholder={DEFAULT_URL} />
          <button
            onClick={() => void runImport(() => tutorialsApi.importUrl(url))}
            disabled={isImporting || !url.trim()}
            className="btn-primary w-full flex justify-center items-center gap-2"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            {isImporting ? 'Tutorial wird geladen …' : 'Website-Tutorial laden'}
          </button>
          <p className="text-xs text-text-muted">Die Standardadresse verwendet den PodCore-Katalog mit Versions- und Importhinweisen. Eine einzelne Tutorial-JSON-URL ist ebenfalls möglich.</p>
        </section>

        <section className="card space-y-5">
          <div>
            <h2 className="section-title flex items-center gap-2"><FileJson size={17} className="text-accent-purple" /> JSON-Datei importieren</h2>
            <p className="text-text-muted text-sm mt-1">Nutze den Download aus dem WordPress-Wiki oder eine Datei, die dir ein Administrator bereitgestellt hat.</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full min-h-32 border-2 border-dashed border-surface-border hover:border-accent-purple/60 rounded-xl flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            {isImporting ? <Loader2 size={24} className="animate-spin text-accent-purple" /> : <Upload size={24} className="text-accent-purple" />}
            <span className="font-medium">JSON-Datei auswählen</span>
            <span className="text-xs text-text-muted">Maximal 50 MB</span>
          </button>
          <p className="text-xs text-text-muted">Unterstützt einzelne Tutorials, eine Liste oder den WordPress-Katalog mit <code>items</code>.</p>
        </section>
      </div>

      <section className="card border-accent-green/20 bg-accent-green/5">
        <div className="flex items-start gap-3">
          <WifiOff size={20} className="text-accent-green mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-text-primary">Für Offline-Nutzung vorbereitet</h2>
            <p className="text-sm text-text-secondary mt-1">Beim Import werden externe Screenshots lokal in der PodCore-Datenbank gespeichert. Nach erfolgreichem Import bleiben Tutorial-Schritte, Bilder, Rollen und Fortschritt auch ohne Internetzugriff verfügbar.</p>
          </div>
        </div>
      </section>

      {error && <div className="card border-accent-red/30 bg-accent-red/10 text-accent-red text-sm">{error}</div>}
      {result && (
        <section className="card border-accent-green/30">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-accent-green mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-text-primary">Import abgeschlossen</h2>
              <p className="text-sm text-text-secondary mt-1">{result.count} Tutorial(s) wurden lokal gespeichert und sind offline verfügbar.</p>
              {result.skipped?.length > 0 && <p className="text-xs text-accent-orange mt-2">{result.skipped.length} Eintrag/Einträge wurden wegen fehlendem Titel oder steps-Array übersprungen.</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => navigate('/wiki')} className="btn-primary text-sm">Zum Wiki</button>
                <button onClick={() => navigate('/admin/tutorials')} className="btn-secondary text-sm">Tutorials anzeigen</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
