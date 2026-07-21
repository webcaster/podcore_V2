import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive, Search, RotateCcw, ExternalLink, Calendar,
  Clock, Mic, Loader2, Filter, ChevronDown, Download
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const api = async (method: string, path: string, body?: any) => {
  const token = localStorage.getItem('podcore_token');
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Fehler');
  return data.data;
};

const formatDuration = (seconds: number) => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function ArchivePage() {
  const { can, showSuccess, showError } = useApp();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('archive_date');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/episodes?archived=true&limit=500');
      const items = data.items || data || [];
      setEpisodes(items.filter((e: any) => e.is_archived));
    } catch (e: any) { showError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: string) => {
    try {
      await api('POST', `/stats/archive/${id}`, { archive: false });
      showSuccess('Episode aus dem Archiv wiederhergestellt');
      load();
    } catch (e: any) { showError(e.message); }
  };

  const filtered = episodes
    .filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'archive_date') return new Date(b.archive_date || b.updated_at).getTime() - new Date(a.archive_date || a.updated_at).getTime();
      if (sortBy === 'number') return (b.number || 0) - (a.number || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-accent-purple" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Archive size={28} className="text-text-muted" /> Archiv
          </h1>
          <p className="text-text-secondary mt-1">Abgeschlossene und archivierte Folgen</p>
        </div>
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Archive size={14} />
          <span>{episodes.length} archivierte Folge{episodes.length !== 1 ? 'n' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input w-full pl-9"
            placeholder="Archiv durchsuchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select className="input text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="archive_date">Archiviert am</option>
            <option value="number">Folgen-Nummer</option>
            <option value="title">Titel</option>
          </select>
        </div>
      </div>

      {/* Episodes */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Archive size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {search ? 'Keine Ergebnisse' : 'Archiv ist leer'}
          </h3>
          <p className="text-text-secondary">
            {search ? 'Keine archivierten Folgen gefunden.' : 'Fertige Folgen können aus der Episoden-Übersicht archiviert werden.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ep: any) => (
            <div key={ep.id} className="card hover:border-border-default transition-all opacity-80 hover:opacity-100">
              <div className="flex items-start gap-4">
                {/* Number */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-overlay flex items-center justify-center">
                  <span className="text-text-muted font-bold">
                    {ep.number ? `#${ep.number}` : <Archive size={18} />}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary">{ep.title}</h3>
                  {ep.subtitle && <p className="text-text-secondary text-sm mt-0.5 line-clamp-1">{ep.subtitle}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    {ep.archive_date && (
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <Archive size={11} />
                        Archiviert {new Date(ep.archive_date).toLocaleDateString('de-DE')}
                      </span>
                    )}
                    {ep.publish_date && (
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <Calendar size={11} />
                        Veröffentlicht {new Date(ep.publish_date).toLocaleDateString('de-DE')}
                      </span>
                    )}
                    {ep.duration && (
                      <span className="flex items-center gap-1.5 text-text-muted text-xs">
                        <Clock size={11} />
                        {formatDuration(ep.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('podcore_token');
                        const res = await fetch(`/api/episodes/${ep.id}/export-archive`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        if (!res.ok) throw new Error('Export fehlgeschlagen');
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `PodCore-Archivmappe-Folge-${ep.number || ''}-${ep.title.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (e: any) { showError('Fehler beim Archiv-Export'); }
                    }}
                    className="p-2 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors"
                    title="Archivmappe als ZIP herunterladen"
                  >
                    <Download size={15} />
                  </button>
                  <Link
                    to={`/episodes/${ep.id}`}
                    className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                    title="Öffnen"
                  >
                    <ExternalLink size={15} />
                  </Link>
                  {can('canEditEpisodes') && (
                    <button
                      onClick={() => handleRestore(ep.id)}
                      className="p-2 text-text-muted hover:text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors"
                      title="Aus Archiv wiederherstellen"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
