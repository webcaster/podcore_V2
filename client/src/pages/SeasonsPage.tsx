import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, Plus, Edit2, Trash2, ChevronRight, Calendar, Mic,
  CheckCircle, Clock, Archive, X, Save, Loader2, PlayCircle,
  List, ArrowRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

// ─── API helpers ──────────────────────────────────────────────────────────────
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aktiv: { label: 'Aktiv', color: 'text-accent-green bg-accent-green/10' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'text-accent-blue bg-accent-blue/10' },
  geplant: { label: 'Geplant', color: 'text-accent-orange bg-accent-orange/10' },
};

export default function SeasonsPage() {
  const { can, showSuccess, showError } = useApp();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSeason, setEditSeason] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEpisodes, setSelectedEpisodes] = useState<string[]>([]);

  const [form, setForm] = useState({
    number: '', title: '', description: '', start_date: '', end_date: '', status: 'aktiv',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [seasonsData, episodesData] = await Promise.all([
        api('GET', '/seasons'),
        api('GET', '/episodes?limit=500').then((d: any) => d.items || d),
      ]);
      setSeasons(seasonsData || []);
      setEpisodes(episodesData || []);
    } catch (e: any) { showError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditSeason(null);
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.number)) + 1 : 1;
    setForm({ number: String(nextNum), title: '', description: '', start_date: '', end_date: '', status: 'aktiv' });
    setShowModal(true);
  };

  const openEdit = (season: any) => {
    setEditSeason(season);
    setForm({
      number: String(season.number),
      title: season.title,
      description: season.description || '',
      start_date: season.start_date ? season.start_date.split('T')[0] : '',
      end_date: season.end_date ? season.end_date.split('T')[0] : '',
      status: season.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.number) { showError('Nummer und Titel sind erforderlich'); return; }
    try {
      if (editSeason) {
        await api('PUT', `/seasons/${editSeason.id}`, { ...form, number: Number(form.number) });
        showSuccess('Staffel aktualisiert');
      } else {
        await api('POST', '/seasons', { ...form, number: Number(form.number) });
        showSuccess('Staffel erstellt');
      }
      setShowModal(false);
      load();
    } catch (e: any) { showError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Staffel wirklich löschen? Episoden werden nicht gelöscht, nur die Zuordnung entfernt.')) return;
    try {
      await api('DELETE', `/seasons/${id}`);
      showSuccess('Staffel gelöscht');
      if (selectedSeason?.id === id) setSelectedSeason(null);
      load();
    } catch (e: any) { showError(e.message); }
  };

  const openAssign = async (season: any) => {
    try {
      const detail = await api('GET', `/seasons/${season.id}`);
      setSelectedSeason(detail);
      setSelectedEpisodes(detail.episodes?.map((e: any) => e.id) || []);
      setShowAssignModal(true);
    } catch (e: any) { showError(e.message); }
  };

  const handleAssign = async () => {
    if (!selectedSeason) return;
    try {
      // Remove all current assignments first
      for (const ep of selectedSeason.episodes || []) {
        await api('DELETE', `/seasons/${selectedSeason.id}/episodes/${ep.id}`);
      }
      // Add new assignments
      if (selectedEpisodes.length > 0) {
        await api('POST', `/seasons/${selectedSeason.id}/episodes`, { episodeIds: selectedEpisodes });
      }
      showSuccess('Folgen-Zuordnung gespeichert');
      setShowAssignModal(false);
      load();
    } catch (e: any) { showError(e.message); }
  };

  const toggleEpisode = (id: string) => {
    setSelectedEpisodes(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const unassignedEpisodes = episodes.filter((e: any) =>
    !e.season_id || e.season_id === selectedSeason?.id
  );

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
            <Layers size={28} className="text-accent-purple" /> Staffeln
          </h1>
          <p className="text-text-secondary mt-1">Organisiere deine Folgen in Staffeln</p>
        </div>
        {can('canCreateEpisodes') && (
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={16} /> Neue Staffel
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent-purple">{seasons.length}</p>
          <p className="text-text-muted text-sm mt-1">Staffeln</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent-blue">{seasons.reduce((a, s) => a + (s.episode_count || 0), 0)}</p>
          <p className="text-text-muted text-sm mt-1">Zugeordnete Folgen</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent-green">{episodes.filter((e: any) => !e.season_id).length}</p>
          <p className="text-text-muted text-sm mt-1">Nicht zugeordnet</p>
        </div>
      </div>

      {/* Seasons Grid */}
      {seasons.length === 0 ? (
        <div className="card text-center py-16">
          <Layers size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Noch keine Staffeln</h3>
          <p className="text-text-secondary mb-6">Erstelle Staffeln um deine Folgen zu organisieren</p>
          {can('canCreateEpisodes') && (
            <button className="btn-primary" onClick={openCreate}>Erste Staffel erstellen</button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {seasons.map((season: any) => {
            const statusInfo = STATUS_LABELS[season.status] || STATUS_LABELS.aktiv;
            return (
              <div key={season.id} className="card hover:border-accent-purple/30 transition-all">
                <div className="flex items-start gap-4">
                  {/* Season Number Badge */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent-purple/10 flex flex-col items-center justify-center">
                    <span className="text-accent-purple text-xs font-medium">S</span>
                    <span className="text-accent-purple text-xl font-bold leading-none">{season.number}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-text-primary text-lg">{season.title}</h3>
                        {season.description && (
                          <p className="text-text-secondary text-sm mt-0.5 line-clamp-2">{season.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <span className="flex items-center gap-1.5 text-text-secondary text-sm">
                        <Mic size={13} className="text-accent-purple" />
                        <strong className="text-text-primary">{season.episode_count || 0}</strong> Folgen
                      </span>
                      {season.start_date && (
                        <span className="flex items-center gap-1.5 text-text-muted text-sm">
                          <Calendar size={13} />
                          {new Date(season.start_date).toLocaleDateString('de-DE')}
                          {season.end_date && <> – {new Date(season.end_date).toLocaleDateString('de-DE')}</>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openAssign(season)}
                      className="btn-ghost text-sm flex items-center gap-1.5"
                      title="Folgen zuordnen"
                    >
                      <List size={14} /> Folgen
                    </button>
                    {can('canEditEpisodes') && (
                      <button onClick={() => openEdit(season)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg">
                        <Edit2 size={15} />
                      </button>
                    )}
                    {can('canDeleteEpisodes') && (
                      <button onClick={() => handleDelete(season.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Episodes preview */}
                {season.episode_count > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-muted text-xs font-medium">FOLGEN IN DIESER STAFFEL</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* We show episode count as pills since we don't have episode details here */}
                      <span className="text-text-secondary text-sm">
                        {season.episode_count} Folge{season.episode_count !== 1 ? 'n' : ''} zugeordnet
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned Episodes */}
      {episodes.filter((e: any) => !e.season_id).length > 0 && (
        <div className="card border-dashed border-border-subtle">
          <h3 className="font-medium text-text-secondary mb-3 flex items-center gap-2">
            <List size={16} /> Nicht zugeordnete Folgen ({episodes.filter((e: any) => !e.season_id).length})
          </h3>
          <div className="grid gap-2">
            {episodes.filter((e: any) => !e.season_id).slice(0, 5).map((ep: any) => (
              <div key={ep.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-raised">
                <span className="text-text-secondary text-sm">
                  {ep.number ? `#${ep.number} ` : ''}{ep.title}
                </span>
                <Link to={`/episodes/${ep.id}`} className="text-accent-purple text-xs hover:underline flex items-center gap-1">
                  Öffnen <ArrowRight size={11} />
                </Link>
              </div>
            ))}
            {episodes.filter((e: any) => !e.season_id).length > 5 && (
              <p className="text-text-muted text-xs text-center pt-1">
                +{episodes.filter((e: any) => !e.season_id).length - 5} weitere
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSeason ? 'Staffel bearbeiten' : 'Neue Staffel'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Staffel-Nummer *</label>
              <input type="number" className="input w-full" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} min="1" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="geplant">Geplant</option>
                <option value="aktiv">Aktiv</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Titel *</label>
              <input className="input w-full" placeholder="z.B. Staffel 1: Die Anfänge" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Beschreibung</label>
              <textarea className="input w-full resize-none" rows={3} placeholder="Worum geht es in dieser Staffel?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Startdatum</label>
              <input type="date" className="input w-full" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Enddatum</label>
              <input type="date" className="input w-full" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Abbrechen</button>
            <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
              <Save size={15} /> {editSeason ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Episodes Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Folgen zuordnen: ${selectedSeason?.title}`} size="lg">
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">Wähle die Folgen aus, die zu dieser Staffel gehören:</p>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {unassignedEpisodes.length === 0 ? (
              <p className="text-text-muted text-center py-8">Keine Folgen verfügbar</p>
            ) : (
              unassignedEpisodes.map((ep: any) => (
                <label key={ep.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-raised cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedEpisodes.includes(ep.id)}
                    onChange={() => toggleEpisode(ep.id)}
                    className="w-4 h-4 accent-accent-purple"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary text-sm font-medium">
                      {ep.number ? `#${ep.number} ` : ''}{ep.title}
                    </span>
                    {ep.season_id && ep.season_id !== selectedSeason?.id && (
                      <span className="text-accent-orange text-xs ml-2">(andere Staffel)</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ep.status === 'veroeffentlicht' ? 'bg-accent-green/10 text-accent-green' :
                    ep.status === 'aufgenommen' ? 'bg-accent-blue/10 text-accent-blue' :
                    'bg-surface-overlay text-text-muted'
                  }`}>{ep.status}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-text-muted text-sm">{selectedEpisodes.length} Folge(n) ausgewählt</span>
            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setShowAssignModal(false)}>Abbrechen</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleAssign}>
                <Save size={15} /> Zuordnung speichern
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
