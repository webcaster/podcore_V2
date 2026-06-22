import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Mic2, Calendar, Clock, Copy, Trash2, ChevronRight } from 'lucide-react';
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

export default function EpisodesPage() {
  const { can, showSuccess, showError } = useApp();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEpisode, setNewEpisode] = useState({ title: '', number: '', status: 'entwurf', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  const loadEpisodes = async () => {
    setIsLoading(true);
    try {
      const data = await episodesApi.list({ status: statusFilter || undefined, search: search || undefined, pageSize: 50 });
      setEpisodes(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadEpisodes(); }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadEpisodes(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const ep = await episodesApi.create({
        title: newEpisode.title,
        number: newEpisode.number ? parseInt(newEpisode.number) : undefined,
        status: newEpisode.status,
        description: newEpisode.description || undefined,
      });
      showSuccess('Episode erstellt');
      setShowCreateModal(false);
      setNewEpisode({ title: '', number: '', status: 'entwurf', description: '' });
      navigate(`/episodes/${ep.id}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const ep = await episodesApi.duplicate(id);
      showSuccess('Episode dupliziert');
      navigate(`/episodes/${ep.id}`);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Episode "${title}" wirklich löschen?`)) return;
    try {
      await episodesApi.delete(id);
      showSuccess('Episode gelöscht');
      loadEpisodes();
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Episoden</h1>
          <p className="text-text-secondary text-sm mt-1">{total} Episode{total !== 1 ? 'n' : ''} gesamt</p>
        </div>
        {can('canCreateEpisodes') && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={16} />
            <span>Neue Episode</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Episoden suchen..."
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="select w-full sm:w-48"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Episodes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="card text-center py-16">
          <Mic2 size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Keine Episoden gefunden</p>
          {can('canCreateEpisodes') && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={16} />
              <span>Erste Episode erstellen</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {episodes.map(ep => (
            <Link
              key={ep.id}
              to={`/episodes/${ep.id}`}
              className="card flex items-center gap-4 hover:border-accent-purple/50 transition-all group"
            >
              {/* Episode Number */}
              <div className="w-12 h-12 bg-obsidian-800 rounded-lg flex items-center justify-center text-text-muted text-sm font-mono flex-shrink-0">
                {ep.number ? `#${ep.number}` : <Mic2 size={16} />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-text-primary font-medium truncate group-hover:text-accent-purple transition-colors">
                    {ep.title}
                  </h3>
                  <span className={`badge ${STATUS_BADGE[ep.status] || 'bg-surface-overlay text-text-muted'}`}>
                    {STATUS_OPTIONS.find(s => s.value === ep.status)?.label || ep.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-text-muted text-xs">
                  {ep.recordingDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Aufnahme: {new Date(ep.recordingDate).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {ep.publishDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Veröffentl.: {new Date(ep.publishDate).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {ep.duration && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(ep.duration)}
                    </span>
                  )}
                  {ep.tags?.length > 0 && (
                    <span className="text-text-muted">{ep.tags.slice(0, 3).join(', ')}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {can('canCreateEpisodes') && (
                  <button
                    onClick={(e) => handleDuplicate(ep.id, e)}
                    className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                    title="Duplizieren"
                  >
                    <Copy size={14} />
                  </button>
                )}
                {can('canDeleteEpisodes') && (
                  <button
                    onClick={(e) => handleDelete(ep.id, ep.title, e)}
                    className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronRight size={16} className="text-text-muted ml-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neue Episode erstellen"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Titel *</label>
              <input
                type="text"
                value={newEpisode.title}
                onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))}
                className="input"
                placeholder="Episode Titel"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Nummer</label>
              <input
                type="number"
                value={newEpisode.number}
                onChange={e => setNewEpisode(p => ({ ...p, number: e.target.value }))}
                className="input"
                placeholder="z.B. 42"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={newEpisode.status}
              onChange={e => setNewEpisode(p => ({ ...p, status: e.target.value }))}
              className="select"
            >
              {STATUS_OPTIONS.filter(s => s.value).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea
              value={newEpisode.description}
              onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))}
              className="textarea"
              rows={3}
              placeholder="Kurze Beschreibung..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={isCreating || !newEpisode.title} className="btn-primary">
              {isCreating ? 'Erstelle...' : 'Episode erstellen'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
