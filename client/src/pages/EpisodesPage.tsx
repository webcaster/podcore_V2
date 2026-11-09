import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Mic2, Calendar, Clock, Copy, Trash2, ChevronRight, CheckSquare, LayoutList, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'idee', label: 'Idee' },
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'aufnahme', label: 'Aufnahme' },
  { value: 'produktion', label: 'Produktion' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'veroeffentlicht', label: 'Veröffentlicht' },
  { value: 'archiviert', label: 'Archiviert' },
];

const STATUS_BADGE: Record<string, string> = {
  idee: 'bg-accent-cyan/20 text-accent-cyan',
  entwurf: 'bg-surface-overlay text-text-muted',
  aufnahme: 'bg-accent-orange/20 text-accent-orange',
  produktion: 'bg-accent-blue/20 text-accent-blue',
  geplant: 'bg-accent-purple/20 text-accent-purple',
  veroeffentlicht: 'bg-accent-green/20 text-accent-green',
  archiviert: 'bg-surface-overlay/50 text-text-muted',
};

const EMPTY_FILTERS = { search: '', status: '' };
const EMPTY_EPISODE = { title: '', number: '', status: 'entwurf', description: '' };

export default function EpisodesPage() {
  const { can, showSuccess, showError } = useApp();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEpisode, setNewEpisode] = useState(EMPTY_EPISODE);
  const [isCreating, setIsCreating] = useState(false);
  const requestId = useRef(0);
  const createInFlight = useRef(false);
  const hasActiveFilters = Boolean(appliedFilters.search || appliedFilters.status);
  const hasFilterChanges = search.trim() !== appliedFilters.search || statusFilter !== appliedFilters.status;
  const canResetFilters = Boolean(search || statusFilter || hasActiveFilters);

  const loadEpisodes = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await episodesApi.list({
        status: appliedFilters.status || undefined,
        search: appliedFilters.search || undefined,
        pageSize: 50,
      });
      // Eine ältere Antwort darf neuere Suchergebnisse nicht überschreiben.
      if (currentRequest !== requestId.current) return;
      setEpisodes(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (currentRequest !== requestId.current) return;
      const message = err.message || 'Episoden konnten nicht geladen werden.';
      setLoadError(message);
      showError(message);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [appliedFilters, showError]);

  useEffect(() => {
    void loadEpisodes();
    return () => { requestId.current += 1; };
  }, [loadEpisodes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextFilters = { search: search.trim(), status: statusFilter };
    setSearch(nextFilters.search);
    if (nextFilters.search === appliedFilters.search && nextFilters.status === appliedFilters.status) {
      void loadEpisodes();
    } else {
      setAppliedFilters(nextFilters);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createInFlight.current || !can('canCreateEpisodes')) return;
    const title = newEpisode.title.trim();
    if (!title) {
      showError('Bitte gib einen Titel für die Episode ein.');
      return;
    }
    const number = newEpisode.number ? Number(newEpisode.number) : undefined;
    if (number !== undefined && (!Number.isSafeInteger(number) || number < 1)) {
      showError('Die Episodennummer muss eine ganze Zahl ab 1 sein.');
      return;
    }
    createInFlight.current = true;
    setIsCreating(true);
    try {
      const ep = await episodesApi.create({
        title,
        number,
        status: newEpisode.status,
        description: newEpisode.description || undefined,
      });
      showSuccess('Episode erstellt – du kannst jetzt das Skript vorbereiten.');
      setShowCreateModal(false);
      setNewEpisode(EMPTY_EPISODE);
      navigate(`/episodes/${ep.id}?tab=script`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      createInFlight.current = false;
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const ep = await episodesApi.duplicate(id);
      showSuccess('Episode dupliziert');
      navigate(`/episodes/${ep.id}?tab=script`);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Episode "${title}" wirklich löschen?`)) return;
    try {
      await episodesApi.delete(id);
      showSuccess('Episode gelöscht');
      void loadEpisodes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div data-tutorial-id="page-episodes" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div data-tutorial-id="episodes-header" className="page-header">
        <div>
          <h1 className="page-title">Episoden</h1>
          <p className="text-text-secondary text-sm mt-1">Vom Entwurf zum fertigen Skript: Episode öffnen und den nächsten Schritt auswählen.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can('canManageTrash') && (
            <Link to="/admin?tab=trash&type=episode" className="btn-secondary flex items-center gap-2" title="Papierkorb öffnen" aria-label="Papierkorb öffnen">
              <Trash2 size={16} />
              <span className="hidden sm:inline">Papierkorb</span>
            </Link>
          )}
          <Link to="/episodes/schedule" className="btn-secondary flex items-center gap-2" title="Planungsübersicht öffnen" aria-label="Planungsübersicht öffnen">
            <LayoutList size={16} />
            <span className="hidden sm:inline">Planungsübersicht</span>
          </Link>
          {can('canCreateEpisodes') && (
            <button data-tutorial-id="btn-create-episode" onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Neue Episode</span>
            </button>
          )}
        </div>
      </div>

      {/* Suche wird bewusst erst mit Enter oder der Aktion angewendet. */}
      <form onSubmit={handleSearch} className="card space-y-3" aria-label="Episoden suchen und filtern">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="episodes-search" className="label">Suche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <input
                id="episodes-search"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchbegriff eingeben…"
                className="input pl-9"
                aria-describedby="episodes-filter-hint"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <label htmlFor="episodes-status" className="label">Status</label>
            <select
              id="episodes-status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="select w-full"
              aria-describedby="episodes-filter-hint"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="submit" className="btn-primary">
              <Filter size={16} /> Suchen & filtern
            </button>
            {canResetFilters && (
              <button type="button" onClick={resetFilters} className="btn-secondary">
                <RotateCcw size={16} /> Zurücksetzen
              </button>
            )}
          </div>
        </div>
        <p id="episodes-filter-hint" className="text-xs text-text-muted">
          {hasFilterChanges ? 'Auswahl geändert. Mit „Suchen & filtern“ oder Enter anwenden.' : 'Suchbegriff und Status lassen sich kombinieren. Mit Enter oder „Suchen & filtern“ anwenden.'}
        </p>
        {hasActiveFilters && (
          <div className="flex gap-2 flex-wrap text-xs" aria-label="Angewendete Filter">
            {appliedFilters.search && <span className="badge bg-surface-overlay text-text-secondary">Suche: {appliedFilters.search}</span>}
            {appliedFilters.status && <span className="badge bg-surface-overlay text-text-secondary">Status: {STATUS_OPTIONS.find(option => option.value === appliedFilters.status)?.label}</span>}
          </div>
        )}
      </form>

      {/* Episodes List */}
      <section aria-label="Episodenliste" aria-busy={isLoading} className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20" role="status">
            <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-text-secondary">Episoden werden geladen…</span>
          </div>
        ) : loadError ? (
          <div className="card text-center py-12" role="alert">
            <AlertTriangle size={32} className="text-accent-orange mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-text-primary font-medium">Episoden konnten nicht geladen werden</h2>
            <p className="text-text-secondary text-sm mt-2">{loadError}</p>
            <button type="button" onClick={() => void loadEpisodes()} className="btn-secondary mt-4 mx-auto">
              <RotateCcw size={16} /> Erneut versuchen
            </button>
          </div>
        ) : episodes.length === 0 ? (
          <div className="card text-center py-12">
            {hasActiveFilters ? <Search size={40} className="text-text-muted mx-auto mb-4" aria-hidden="true" /> : <Mic2 size={40} className="text-text-muted mx-auto mb-4" aria-hidden="true" />}
            <h2 className="text-text-primary font-medium">{hasActiveFilters ? 'Keine passenden Episoden' : 'Hier beginnt deine nächste Episode'}</h2>
            <p className="text-text-secondary text-sm mt-2 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Versuche einen anderen Suchbegriff oder setze die Filter zurück, um alle Episoden zu sehen.'
                : can('canCreateEpisodes')
                  ? 'Starte mit einem Titel als Entwurf. Danach kannst du das Skript vorbereiten und den Produktionsablauf prüfen.'
                  : 'Noch keine Episoden vorhanden. Bitte ein Teammitglied mit Erstellungsrechten, einen Entwurf anzulegen.'}
            </p>
            {hasActiveFilters ? (
              <button type="button" onClick={resetFilters} className="btn-secondary mt-4 mx-auto">
                <RotateCcw size={16} /> Alle Episoden anzeigen
              </button>
            ) : can('canCreateEpisodes') && (
              <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={16} /> Erste Episode als Entwurf anlegen
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-text-muted text-sm" role="status">
              {total} {hasActiveFilters ? 'Treffer' : `Episode${total !== 1 ? 'n' : ''} gesamt`}
              {total > episodes.length && ` · ${episodes.length} werden angezeigt – grenze die Auswahl mit Suche oder Status ein.`}
            </p>
            <div className="space-y-3">
              {episodes.map(ep => (
                <article key={ep.id} className="card hover:border-accent-purple/50 transition-all">
                  <Link to={`/episodes/${ep.id}?tab=script`} className="flex items-start sm:items-center gap-4 group rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-purple">
                    <div className="w-12 h-12 bg-obsidian-800 rounded-lg flex items-center justify-center text-text-muted text-sm font-mono flex-shrink-0">
                      {ep.number ? `#${ep.number}` : <Mic2 size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-text-primary font-medium break-words min-w-0 group-hover:text-accent-purple transition-colors">
                          {ep.title}
                        </h3>
                        <span className={`badge ${STATUS_BADGE[ep.status] || 'bg-surface-overlay text-text-muted'}`}>
                          {STATUS_OPTIONS.find(s => s.value === ep.status)?.label || ep.status}
                        </span>
                        {ep.scriptReady && (
                          <span className="badge bg-accent-green/20 text-accent-green flex items-center gap-1" title="Skript fertig">
                            <CheckSquare size={10} /> Skript fertig
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-text-muted text-xs">
                        {ep.plannedDate && !['aufnahme', 'produktion', 'geplant', 'veroeffentlicht'].includes(ep.status) && (
                          <span className="flex items-center gap-1 text-accent-purple/80" title="Vorplanungs-Datum">
                            <Calendar size={12} />
                            Vorplanung: {new Date(ep.plannedDate).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {ep.recordingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Aufnahme: {new Date(ep.recordingDate).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {ep.publishDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Veröffentlichung: {new Date(ep.publishDate).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {ep.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatDuration(ep.duration)}
                          </span>
                        )}
                        {ep.tags?.length > 0 && (
                          <span className="text-text-muted break-words">{ep.tags.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1 sm:mt-0" aria-hidden="true" />
                  </Link>

                  {/* Separate Links und Buttons: keine interaktiven Elemente innerhalb eines Links. */}
                  <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-surface-border">
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/episodes/${ep.id}?tab=script`} className="btn-secondary text-xs" aria-label={`${can('canEditEpisodes') ? 'Skript bearbeiten' : 'Skript ansehen'}: ${ep.title}`}>
                        <FileText size={14} /> {can('canEditEpisodes') ? 'Skript bearbeiten' : 'Skript ansehen'}
                      </Link>
                      <Link to={`/episodes/${ep.id}?tab=workflow`} className="btn-secondary text-xs" aria-label={`Produktionsablauf prüfen: ${ep.title}`}>
                        <CheckSquare size={14} /> Ablauf prüfen
                      </Link>
                    </div>
                    <div className="flex items-center gap-1">
                      {can('canCreateEpisodes') && (
                        <button type="button" onClick={() => void handleDuplicate(ep.id)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors" title="Duplizieren" aria-label={`Episode duplizieren: ${ep.title}`}>
                          <Copy size={16} />
                        </button>
                      )}
                      {can('canDeleteEpisodes') && (
                        <button type="button" onClick={() => void handleDelete(ep.id, ep.title)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors" title="Löschen" aria-label={`Episode löschen: ${ep.title}`}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { if (!createInFlight.current) setShowCreateModal(false); }}
        title="Neue Episode anlegen"
      >
        <form onSubmit={handleCreate} className="space-y-4" aria-busy={isCreating}>
          <p className="text-sm text-text-secondary">Ein Titel genügt. Standardmäßig wird ein Entwurf angelegt und anschließend das Skript geöffnet. Weitere Angaben kannst du später ergänzen.</p>
          <fieldset disabled={isCreating} className="space-y-4">
            <div>
              <label htmlFor="new-episode-title" className="label">Titel <span className="text-text-muted">(erforderlich)</span></label>
              <input
                id="new-episode-title"
                type="text"
                value={newEpisode.title}
                onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))}
                className="input"
                placeholder="Worum geht es in dieser Episode?"
                required
                autoFocus
              />
            </div>
            <details className="rounded-lg border border-surface-border p-3">
              <summary className="text-sm text-text-secondary cursor-pointer">Weitere Angaben (optional)</summary>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-episode-number" className="label">Episodennummer</label>
                    <input
                      id="new-episode-number"
                      type="number"
                      value={newEpisode.number}
                      onChange={e => setNewEpisode(p => ({ ...p, number: e.target.value }))}
                      className="input"
                      placeholder="z. B. 42"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-episode-status" className="label">Startstatus</label>
                    <select
                      id="new-episode-status"
                      value={newEpisode.status}
                      onChange={e => setNewEpisode(p => ({ ...p, status: e.target.value }))}
                      className="select"
                      aria-describedby="new-episode-status-hint"
                    >
                      {STATUS_OPTIONS.filter(s => s.value).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p id="new-episode-status-hint" className="text-xs text-text-muted">Für neue Inhalte ist „Entwurf“ empfohlen. Bestehende Inhalte kannst du mit ihrem aktuellen Status anlegen.</p>
                <div>
                  <label htmlFor="new-episode-description" className="label">Kurzbeschreibung</label>
                  <textarea
                    id="new-episode-description"
                    value={newEpisode.description}
                    onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))}
                    className="textarea"
                    rows={3}
                    placeholder="Thema und Ziel der Episode…"
                  />
                </div>
              </div>
            </details>
            <div className="rounded-lg bg-surface-overlay p-3 text-sm text-text-secondary" role="status">
              {newEpisode.status === 'entwurf'
                ? 'Nächster Schritt: Skript vorbereiten. Die Episode bleibt zunächst ein Entwurf.'
                : `Die Episode wird mit dem Status „${STATUS_OPTIONS.find(option => option.value === newEpisode.status)?.label}“ angelegt. Anschließend öffnet sich das Skript.`}
            </div>
            <div className="flex justify-end gap-3 flex-wrap pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Abbrechen</button>
              <button type="submit" disabled={isCreating || !newEpisode.title.trim()} className="btn-primary">
                {isCreating ? 'Wird angelegt…' : newEpisode.status === 'entwurf' ? 'Entwurf anlegen & Skript öffnen' : 'Episode anlegen & Skript öffnen'}
              </button>
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}
