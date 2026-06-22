import { useState, useEffect } from 'react';
import {
  BarChart2, TrendingUp, Download, Play, Users, Plus,
  Edit2, Trash2, Save, X, Loader2, Calendar, Mic,
  ChevronUp, ChevronDown, Info, RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

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

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-accent-purple' }: any) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-text-muted text-sm">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-text-secondary text-xs mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-current/10 ${color}`}>
        <Icon size={20} className={color} />
      </div>
    </div>
  </div>
);

export default function StatsPage() {
  const { can, showSuccess, showError } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'entries' | 'episodes'>('overview');

  const [form, setForm] = useState({
    episodeId: '', date: new Date().toISOString().split('T')[0],
    downloads: '', plays: '', uniqueListeners: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [ov, ent, eps] = await Promise.all([
        api('GET', '/stats/overview'),
        api('GET', '/stats?limit=100'),
        api('GET', '/episodes?limit=500').then((d: any) => d.items || d),
      ]);
      setOverview(ov);
      setEntries(ent.items || []);
      setEpisodes(eps || []);
    } catch (e: any) { showError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditEntry(null);
    setForm({ episodeId: '', date: new Date().toISOString().split('T')[0], downloads: '', plays: '', uniqueListeners: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (entry: any) => {
    setEditEntry(entry);
    setForm({
      episodeId: entry.episode_id || '',
      date: entry.date,
      downloads: String(entry.downloads || ''),
      plays: String(entry.plays || ''),
      uniqueListeners: String(entry.unique_listeners || ''),
      notes: entry.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date) { showError('Datum ist erforderlich'); return; }
    try {
      const payload = {
        episodeId: form.episodeId || null,
        date: form.date,
        downloads: Number(form.downloads) || 0,
        plays: Number(form.plays) || 0,
        uniqueListeners: Number(form.uniqueListeners) || 0,
        notes: form.notes || null,
      };
      if (editEntry) {
        await api('PUT', `/stats/${editEntry.id}`, payload);
        showSuccess('Eintrag aktualisiert');
      } else {
        await api('POST', '/stats', payload);
        showSuccess('Statistik-Eintrag hinzugefügt');
      }
      setShowModal(false);
      load();
    } catch (e: any) { showError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    try {
      await api('DELETE', `/stats/${id}`);
      showSuccess('Eintrag gelöscht');
      load();
    } catch (e: any) { showError(e.message); }
  };

  const handleArchive = async (episodeId: string, archive: boolean) => {
    try {
      await api('POST', `/stats/archive/${episodeId}`, { archive });
      showSuccess(archive ? 'Episode archiviert' : 'Episode wiederhergestellt');
      load();
    } catch (e: any) { showError(e.message); }
  };

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-accent-purple" />
    </div>
  );

  const ep = overview?.episodes || {};
  const totals = overview?.totals || {};
  const trend = overview?.monthlyTrend || [];
  const topEps = overview?.topEpisodes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <BarChart2 size={28} className="text-accent-purple" /> Podcast-Statistiken
          </h1>
          <p className="text-text-secondary mt-1">Manuelle Statistiken und Auswertungen</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Aktualisieren
          </button>
          {can('canEditEpisodes') && (
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={16} /> Daten eintragen
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/20">
        <Info size={16} className="text-accent-blue mt-0.5 flex-shrink-0" />
        <p className="text-text-secondary text-sm">
          Hier kannst du Statistiken manuell eintragen — z.B. aus deinem Hosting-Anbieter oder anderen Quellen.
          Wenn du Podigee nutzt, findest du automatische Statistiken unter <strong className="text-text-primary">Podigee Analytics</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-raised p-1 rounded-xl w-fit">
        {(['overview', 'entries', 'episodes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {tab === 'overview' ? 'Übersicht' : tab === 'entries' ? 'Einträge' : 'Folgen'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Download} label="Downloads gesamt" value={formatNum(totals.downloads || 0)} color="text-accent-purple" />
            <StatCard icon={Play} label="Plays gesamt" value={formatNum(totals.plays || 0)} color="text-accent-blue" />
          <StatCard icon={Users} label="Max. Unique Listeners" value={formatNum(totals.maxUniqueListeners || 0)} color="text-accent-green" />
            <StatCard icon={TrendingUp} label="Ø Downloads/Folge" value={formatNum(totals.avgDownloadsPerEpisode || 0)} color="text-accent-orange" />
          </div>

          {/* Episode Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Mic} label="Folgen gesamt" value={ep.total_episodes || 0} color="text-text-primary" />
            <StatCard icon={Mic} label="Veröffentlicht" value={ep.published || 0} color="text-accent-green" />
            <StatCard icon={Mic} label="Aufgenommen" value={ep.recorded || 0} color="text-accent-blue" />
            <StatCard icon={Mic} label="Entwürfe" value={ep.drafts || 0} color="text-text-muted" />
          </div>

          {/* Monthly Trend */}
          {trend.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-accent-purple" /> Monatlicher Trend (Downloads)
              </h3>
              <div className="flex items-end gap-1 h-32">
                {trend.map((m: any) => {
                  const maxVal = Math.max(...trend.map((t: any) => t.downloads || 0), 1);
                  const height = Math.max(4, ((m.downloads || 0) / maxVal) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-text-muted text-xs">{m.downloads || 0}</span>
                      <div
                        className="w-full bg-accent-purple/70 rounded-t-sm hover:bg-accent-purple transition-colors"
                        style={{ height: `${height}%` }}
                        title={`${m.month}: ${m.downloads} Downloads`}
                      />
                      <span className="text-text-muted text-xs">{m.month?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Episodes */}
          {topEps.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-accent-purple" /> Top Folgen nach Downloads
              </h3>
              <div className="space-y-3">
                {topEps.filter((e: any) => e.total_downloads > 0).slice(0, 10).map((ep: any, i: number) => {
                  const maxDl = Math.max(...topEps.map((e: any) => e.total_downloads), 1);
                  const pct = (ep.total_downloads / maxDl) * 100;
                  return (
                    <div key={ep.id} className="flex items-center gap-3">
                      <span className="text-text-muted text-sm w-5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-primary text-sm truncate">
                            {ep.number ? `#${ep.number} ` : ''}{ep.title}
                          </span>
                          <span className="text-text-secondary text-sm ml-2 flex-shrink-0">{ep.total_downloads}</span>
                        </div>
                        <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                          <div className="h-full bg-accent-purple rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {topEps.every((e: any) => e.total_downloads === 0) && (
                  <p className="text-text-muted text-sm text-center py-4">Noch keine Download-Daten eingetragen</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Entries Tab ── */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={15} /> Eintrag hinzufügen
            </button>
          </div>
          {entries.length === 0 ? (
            <div className="card text-center py-12">
              <BarChart2 size={40} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary">Noch keine Statistik-Einträge. Füge Daten manuell hinzu.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Datum</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Folge</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Downloads</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Plays</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Unique</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: any) => (
                    <tr key={entry.id} className="border-b border-border-subtle hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(entry.date).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-text-primary">
                        {entry.episode_title
                          ? <span>{entry.episode_number ? `#${entry.episode_number} ` : ''}{entry.episode_title}</span>
                          : <span className="text-text-muted italic">Gesamt</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-accent-purple font-medium">{entry.downloads?.toLocaleString('de-DE') || 0}</td>
                      <td className="px-4 py-3 text-right text-accent-blue">{entry.plays?.toLocaleString('de-DE') || 0}</td>
                      <td className="px-4 py-3 text-right text-accent-green">{entry.unique_listeners?.toLocaleString('de-DE') || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(entry)} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Episodes Tab (Archive) ── */}
      {activeTab === 'episodes' && (
        <div className="space-y-3">
          <p className="text-text-secondary text-sm">Fertige Folgen können hier archiviert werden. Archivierte Folgen sind im Archiv-Bereich zu finden.</p>
          {episodes.filter((e: any) => !e.is_archived && e.status === 'veroeffentlicht').map((ep: any) => (
            <div key={ep.id} className="card flex items-center justify-between gap-4">
              <div>
                <span className="text-text-primary font-medium">{ep.number ? `#${ep.number} ` : ''}{ep.title}</span>
                {ep.publish_date && (
                  <span className="text-text-muted text-xs ml-2">
                    {new Date(ep.publish_date).toLocaleDateString('de-DE')}
                  </span>
                )}
              </div>
              {can('canEditEpisodes') && (
                <button
                  onClick={() => handleArchive(ep.id, true)}
                  className="btn-ghost text-sm flex items-center gap-1.5 text-text-muted hover:text-accent-orange"
                >
                  <Download size={13} /> Archivieren
                </button>
              )}
            </div>
          ))}
          {episodes.filter((e: any) => !e.is_archived && e.status === 'veroeffentlicht').length === 0 && (
            <div className="card text-center py-12">
              <p className="text-text-muted">Keine veröffentlichten Folgen zum Archivieren</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editEntry ? 'Eintrag bearbeiten' : 'Statistik eintragen'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Folge (optional)</label>
              <select className="input w-full" value={form.episodeId} onChange={e => setForm(f => ({ ...f, episodeId: e.target.value }))}>
                <option value="">Gesamt (kein Folgen-Bezug)</option>
                {episodes.map((ep: any) => (
                  <option key={ep.id} value={ep.id}>{ep.number ? `#${ep.number} ` : ''}{ep.title}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Datum *</label>
              <input type="date" className="input w-full" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Downloads</label>
              <input type="number" className="input w-full" placeholder="0" value={form.downloads} onChange={e => setForm(f => ({ ...f, downloads: e.target.value }))} min="0" />
            </div>
            <div>
              <label className="label">Plays</label>
              <input type="number" className="input w-full" placeholder="0" value={form.plays} onChange={e => setForm(f => ({ ...f, plays: e.target.value }))} min="0" />
            </div>
            <div>
              <label className="label">Unique Listeners</label>
              <input type="number" className="input w-full" placeholder="0" value={form.uniqueListeners} onChange={e => setForm(f => ({ ...f, uniqueListeners: e.target.value }))} min="0" />
            </div>
            <div>
              <label className="label">Notiz</label>
              <input className="input w-full" placeholder="z.B. Quelle: Podigee" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Abbrechen</button>
            <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
              <Save size={15} /> {editEntry ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
