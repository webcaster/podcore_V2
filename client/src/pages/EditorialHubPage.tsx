import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Calendar, Users, FileText, Plus, Search, Trash2,
  Edit2, Check, X, ArrowRight, Tag, Star, Clock, ChevronDown,
  Mic2, BookOpen, StickyNote, MessageSquare, Filter, Pin, PinOff
} from 'lucide-react';
import { editorialApi, episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

type HubTab = 'ideas' | 'plan' | 'interviews' | 'notes';

const IDEA_STATUS = [
  { value: 'neu', label: 'Neu', color: 'bg-accent-cyan/20 text-accent-cyan' },
  { value: 'bewertet', label: 'Bewertet', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'geplant', label: 'Geplant', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'abgelehnt', label: 'Abgelehnt', color: 'bg-accent-red/20 text-accent-red' },
  { value: 'umgesetzt', label: 'Umgesetzt', color: 'bg-accent-green/20 text-accent-green' },
];

const IDEA_PRIORITY = [
  { value: 'niedrig', label: 'Niedrig', color: 'text-text-muted' },
  { value: 'mittel', label: 'Mittel', color: 'text-accent-blue' },
  { value: 'hoch', label: 'Hoch', color: 'text-accent-orange' },
  { value: 'dringend', label: 'Dringend', color: 'text-accent-red' },
];

export default function EditorialHubPage() {
  const { can, showSuccess, showError } = useApp();
  const [activeTab, setActiveTab] = useState<HubTab>('ideas');

  const tabs = [
    { key: 'ideas' as HubTab, label: 'Ideenpool', icon: <Lightbulb size={16} />, permission: 'canViewIdeas' },
    { key: 'plan' as HubTab, label: 'Redaktionsplan', icon: <Calendar size={16} />, permission: 'canViewEditorialPlan' },
    { key: 'interviews' as HubTab, label: 'Interviews', icon: <Users size={16} />, permission: 'canViewInterviews' },
    { key: 'notes' as HubTab, label: 'Notizen', icon: <StickyNote size={16} />, permission: 'canViewNotes' },
  ].filter(t => can(t.permission));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <BookOpen size={24} className="text-accent-purple" />
          Redaktions-Hub
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Vorbereitung, Recherche und Ideensammlung für Podcast-Folgen
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-purple text-white shadow-glow-purple'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'ideas' && <IdeasTab />}
      {activeTab === 'plan' && <PlanTab />}
      {activeTab === 'interviews' && <InterviewsTab />}
      {activeTab === 'notes' && <NotesTab />}
    </div>
  );
}

// ============================================================
// IDEENPOOL TAB
// ============================================================

function IdeasTab() {
  const { can, showSuccess, showError } = useApp();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferIdea, setTransferIdea] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', status: 'neu', priority: 'mittel', tags: [] as string[], tagInput: '' });

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listIdeas({ status: statusFilter || undefined, search: search || undefined });
      setIdeas(data);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const openCreate = () => {
    setEditingIdea(null);
    setForm({ title: '', description: '', status: 'neu', priority: 'mittel', tags: [], tagInput: '' });
    setShowModal(true);
  };

  const openEdit = (idea: any) => {
    setEditingIdea(idea);
    setForm({ title: idea.title, description: idea.description || '', status: idea.status, priority: idea.priority, tags: idea.tags || [], tagInput: '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: form.title, description: form.description || undefined, status: form.status, priority: form.priority, tags: form.tags };
      if (editingIdea) {
        await editorialApi.updateIdea(editingIdea.id, payload);
        showSuccess('Idee aktualisiert');
      } else {
        await editorialApi.createIdea(payload);
        showSuccess('Idee erstellt');
      }
      setShowModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Idee "${title}" löschen?`)) return;
    try {
      await editorialApi.deleteIdea(id);
      showSuccess('Idee gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await editorialApi.updateIdea(id, { status });
      load();
    } catch (err: any) { showError(err.message); }
  };

  const openTransfer = async (idea: any) => {
    setTransferIdea(idea);
    try {
      const data = await episodesApi.list({ pageSize: 100 });
      setEpisodes(data.items || []);
    } catch {}
    setShowTransferModal(true);
  };

  const handleTransfer = async (episodeId: string | 'new') => {
    if (!transferIdea) return;
    try {
      if (episodeId === 'new') {
        // Create new episode from idea
        const ep = await episodesApi.create({
          title: transferIdea.title,
          description: transferIdea.description,
          status: 'entwurf',
          tags: transferIdea.tags,
        });
        await editorialApi.updateIdea(transferIdea.id, { status: 'geplant', episodeId: ep.id });
        showSuccess(`Episode "${ep.title}" aus Idee erstellt`);
      } else {
        await editorialApi.updateIdea(transferIdea.id, { status: 'geplant', episodeId });
        showSuccess('Idee mit Episode verknüpft');
      }
      setShowTransferModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && form.tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(form.tagInput.trim())) {
        setForm(p => ({ ...p, tags: [...p.tags, p.tagInput.trim()], tagInput: '' }));
      } else {
        setForm(p => ({ ...p, tagInput: '' }));
      }
    }
  };

  const filtered = ideas.filter(i =>
    (!priorityFilter || i.priority === priorityFilter)
  );

  const statusInfo = (val: string) => IDEA_STATUS.find(s => s.value === val) || IDEA_STATUS[0];
  const priorityInfo = (val: string) => IDEA_PRIORITY.find(p => p.value === val) || IDEA_PRIORITY[1];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ideen suchen..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-full sm:w-40">
          <option value="">Alle Status</option>
          {IDEA_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="select w-full sm:w-40">
          <option value="">Alle Prioritäten</option>
          {IDEA_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {can('canCreateIdeas') && (
          <button onClick={openCreate} className="btn-primary whitespace-nowrap">
            <Plus size={16} /><span>Neue Idee</span>
          </button>
        )}
      </div>

      {/* Ideas Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Lightbulb size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Keine Ideen gefunden</p>
          <p className="text-text-muted text-sm mt-1">Sammle hier Ideen für zukünftige Podcast-Folgen</p>
          {can('canCreateIdeas') && (
            <button onClick={openCreate} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Erste Idee hinzufügen</span></button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(idea => {
            const si = statusInfo(idea.status);
            const pi = priorityInfo(idea.priority);
            return (
              <div key={idea.id} className="card hover:border-surface-border-light transition-all group flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-text-primary font-semibold leading-tight flex-1">{idea.title}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {can('canEditIdeas') && (
                      <button onClick={() => openEdit(idea)} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                    )}
                    {can('canDeleteIdeas') && (
                      <button onClick={() => handleDelete(idea.id, idea.title)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {idea.description && (
                  <p className="text-text-secondary text-sm leading-relaxed mb-3 flex-1">{idea.description}</p>
                )}

                {/* Tags */}
                {idea.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {idea.tags.map((tag: string) => (
                      <span key={tag} className="badge bg-surface-overlay text-text-muted text-xs">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                    <span className={`text-xs font-medium ${pi.color}`}>{pi.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {can('canEditIdeas') && idea.status !== 'umgesetzt' && idea.status !== 'abgelehnt' && (
                      <div className="relative group/status">
                        <select
                          value={idea.status}
                          onChange={e => handleStatusChange(idea.id, e.target.value)}
                          className="text-xs bg-transparent border border-surface-border rounded-lg px-2 py-1 text-text-muted cursor-pointer focus:outline-none hover:border-surface-border-light"
                        >
                          {IDEA_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    )}
                    {can('canCreateEpisodes') && idea.status !== 'umgesetzt' && idea.status !== 'abgelehnt' && (
                      <button
                        onClick={() => openTransfer(idea)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-accent-purple/20 text-accent-purple rounded-lg hover:bg-accent-purple/30 transition-colors"
                        title="Als Episode übernehmen"
                      >
                        <Mic2 size={12} />
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked episode indicator */}
                {idea.episodeId && (
                  <div className="mt-2 text-xs text-accent-green flex items-center gap-1">
                    <Check size={12} />
                    <span>Mit Episode verknüpft</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingIdea ? 'Idee bearbeiten' : 'Neue Idee'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="Ideen-Titel" required autoFocus />
          </div>
          <div>
            <label className="label">Beschreibung / Recherche-Notizen</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={5} placeholder="Beschreibung, Recherche-Links, Themen, Quellen..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="select">
                {IDEA_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priorität</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="select">
                {IDEA_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="badge bg-accent-purple/20 text-accent-purple flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="hover:text-accent-red">×</button>
                </span>
              ))}
            </div>
            <input type="text" value={form.tagInput} onChange={e => setForm(p => ({ ...p, tagInput: e.target.value }))} onKeyDown={addTag} className="input" placeholder="Tag eingeben und Enter drücken..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!form.title} className="btn-primary">{editingIdea ? 'Speichern' : 'Idee erstellen'}</button>
          </div>
        </form>
      </Modal>

      {/* Transfer to Episode Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Idee als Episode übernehmen" size="lg">
        {transferIdea && (
          <div className="space-y-4">
            <div className="card-raised p-4">
              <p className="text-text-muted text-xs mb-1">Idee</p>
              <p className="text-text-primary font-semibold">{transferIdea.title}</p>
              {transferIdea.description && <p className="text-text-secondary text-sm mt-1">{transferIdea.description}</p>}
            </div>

            <p className="text-text-secondary text-sm">Wähle eine bestehende Episode oder erstelle eine neue:</p>

            {/* Create new episode */}
            <button
              onClick={() => handleTransfer('new')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-accent-purple/50 hover:border-accent-purple hover:bg-accent-purple/5 transition-all text-left"
            >
              <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus size={20} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-text-primary font-medium">Neue Episode erstellen</p>
                <p className="text-text-muted text-xs">Erstellt eine neue Episode mit den Daten dieser Idee</p>
              </div>
            </button>

            {/* Existing episodes */}
            {episodes.filter(ep => ep.status !== 'veroeffentlicht' && ep.status !== 'archiviert').length > 0 && (
              <div>
                <p className="text-text-muted text-xs mb-2">Oder mit bestehender Episode verknüpfen:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {episodes
                    .filter(ep => ep.status !== 'veroeffentlicht' && ep.status !== 'archiviert')
                    .map(ep => (
                      <button
                        key={ep.id}
                        onClick={() => handleTransfer(ep.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised border border-surface-border hover:border-accent-purple/50 transition-all text-left"
                      >
                        <div className="w-8 h-8 bg-obsidian-800 rounded-lg flex items-center justify-center text-text-muted text-xs font-mono flex-shrink-0">
                          {ep.number ? `#${ep.number}` : <Mic2 size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{ep.title}</p>
                          <p className="text-text-muted text-xs capitalize">{ep.status}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// REDAKTIONSPLAN TAB
// ============================================================

function PlanTab() {
  const { can, showSuccess, showError } = useApp();
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [form, setForm] = useState({ title: '', plannedDate: '', status: 'entwurf', assignedTo: '', notes: '' });

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listPlan({ month: viewMonth, year: viewYear });
      setEntries(data);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [viewMonth, viewYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEntry) {
        await editorialApi.updatePlanEntry(editingEntry.id, form);
        showSuccess('Eintrag aktualisiert');
      } else {
        await editorialApi.createPlanEntry(form);
        showSuccess('Eintrag erstellt');
      }
      setShowModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    try {
      await editorialApi.deletePlanEntry(id);
      showSuccess('Eintrag gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const openCreate = () => {
    setEditingEntry(null);
    setForm({ title: '', plannedDate: `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`, status: 'entwurf', assignedTo: '', notes: '' });
    setShowModal(true);
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="btn-ghost p-2">‹</button>
          <span className="text-text-primary font-semibold w-40 text-center">{monthName}</span>
          <button onClick={() => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="btn-ghost p-2">›</button>
        </div>
        {can('canEditEditorialPlan') && (
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /><span>Neuer Eintrag</span></button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Keine Einträge für {monthName}</p>
          {can('canEditEditorialPlan') && (
            <button onClick={openCreate} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Eintrag hinzufügen</span></button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="card flex items-center gap-4 group">
              <div className="text-center w-12 flex-shrink-0">
                <p className="text-text-muted text-xs">{new Date(entry.plannedDate).toLocaleString('de-DE', { weekday: 'short' })}</p>
                <p className="text-text-primary font-bold text-lg leading-tight">{new Date(entry.plannedDate).getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium">{entry.title}</p>
                {entry.assignedTo && <p className="text-text-muted text-xs mt-0.5">Zugewiesen: {entry.assignedTo}</p>}
                {entry.notes && <p className="text-text-secondary text-xs mt-1">{entry.notes}</p>}
              </div>
              <span className={`badge ${
                entry.status === 'veroeffentlicht' ? 'bg-accent-green/20 text-accent-green' :
                entry.status === 'geplant' ? 'bg-accent-purple/20 text-accent-purple' :
                'bg-surface-overlay text-text-muted'
              }`}>{entry.status}</span>
              {can('canEditEditorialPlan') && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingEntry(entry); setForm({ title: entry.title, plannedDate: entry.plannedDate?.slice(0, 10) || '', status: entry.status, assignedTo: entry.assignedTo || '', notes: entry.notes || '' }); setShowModal(true); }} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEntry ? 'Eintrag bearbeiten' : 'Neuer Redaktionsplan-Eintrag'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Geplantes Datum *</label>
              <input type="date" value={form.plannedDate} onChange={e => setForm(p => ({ ...p, plannedDate: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="select">
                <option value="entwurf">Entwurf</option>
                <option value="geplant">Geplant</option>
                <option value="aufnahme">Aufnahme</option>
                <option value="veroeffentlicht">Veröffentlicht</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Zugewiesen an</label>
            <input type="text" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className="input" placeholder="Name..." />
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!form.title || !form.plannedDate} className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// INTERVIEWS TAB
// ============================================================

function InterviewsTab() {
  const { can, showSuccess, showError } = useApp();
  const [partners, setPartners] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '' });
  const [questionForm, setQuestionForm] = useState({ question: '', category: '', notes: '' });

  const loadPartners = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listPartners();
      setPartners(data);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadQuestions = async (partnerId: string) => {
    try {
      const data = await editorialApi.listQuestions({ partnerId });
      setQuestions(data);
    } catch (err: any) { showError(err.message); }
  };

  useEffect(() => { loadPartners(); }, []);
  useEffect(() => { if (selectedPartner) loadQuestions(selectedPartner.id); }, [selectedPartner]);

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await editorialApi.updatePartner(editingPartner.id, partnerForm);
        showSuccess('Partner aktualisiert');
      } else {
        await editorialApi.createPartner(partnerForm);
        showSuccess('Partner erstellt');
      }
      setShowPartnerModal(false);
      loadPartners();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Partner und alle Fragen löschen?')) return;
    try {
      await editorialApi.deletePartner(id);
      showSuccess('Partner gelöscht');
      if (selectedPartner?.id === id) setSelectedPartner(null);
      loadPartners();
    } catch (err: any) { showError(err.message); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    try {
      await editorialApi.createQuestion({ ...questionForm, partnerId: selectedPartner.id, order: questions.length });
      showSuccess('Frage hinzugefügt');
      setShowQuestionModal(false);
      setQuestionForm({ question: '', category: '', notes: '' });
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleToggleAnswered = async (q: any) => {
    try {
      await editorialApi.updateQuestion(q.id, { answered: !q.answered });
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await editorialApi.deleteQuestion(id);
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Partners List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Interview-Partner</h3>
          {can('canEditInterviews') && (
            <button onClick={() => { setEditingPartner(null); setPartnerForm({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '' }); setShowPartnerModal(true); }} className="btn-ghost p-2"><Plus size={16} /></button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
        ) : partners.length === 0 ? (
          <div className="card text-center py-8">
            <Users size={32} className="text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">Keine Partner</p>
          </div>
        ) : (
          partners.map(partner => (
            <div
              key={partner.id}
              onClick={() => setSelectedPartner(partner)}
              className={`card cursor-pointer transition-all group ${selectedPartner?.id === partner.id ? 'border-accent-purple bg-accent-purple/5' : 'hover:border-surface-border-light'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-primary font-medium">{partner.name}</p>
                  {partner.company && <p className="text-text-muted text-xs">{partner.company}{partner.role ? ` · ${partner.role}` : ''}</p>}
                </div>
                {can('canEditInterviews') && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setEditingPartner(partner); setPartnerForm({ name: partner.name, company: partner.company || '', role: partner.role || '', email: partner.email || '', phone: partner.phone || '', bio: partner.bio || '', notes: partner.notes || '' }); setShowPartnerModal(true); }} className="p-1 text-text-muted hover:text-accent-blue"><Edit2 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeletePartner(partner.id); }} className="p-1 text-text-muted hover:text-accent-red"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Questions */}
      <div className="lg:col-span-2 space-y-3">
        {!selectedPartner ? (
          <div className="card text-center py-16">
            <MessageSquare size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary font-medium">Partner auswählen</p>
            <p className="text-text-muted text-sm mt-1">Wähle einen Interview-Partner um Fragen zu verwalten</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">Fragen für {selectedPartner.name}</h3>
                <p className="text-text-muted text-xs">{questions.filter(q => q.answered).length}/{questions.length} beantwortet</p>
              </div>
              {can('canEditInterviews') && (
                <button onClick={() => setShowQuestionModal(true)} className="btn-primary"><Plus size={16} /><span>Frage hinzufügen</span></button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-text-muted text-sm">Noch keine Fragen für diesen Partner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className={`card flex items-start gap-3 group ${q.answered ? 'opacity-60' : ''}`}>
                    <button onClick={() => handleToggleAnswered(q)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${q.answered ? 'bg-accent-green border-accent-green' : 'border-surface-border-light hover:border-accent-green'}`}>
                      {q.answered && <Check size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${q.answered ? 'line-through text-text-muted' : 'text-text-primary'}`}>{q.question}</p>
                      {q.category && <span className="badge bg-surface-overlay text-text-muted text-xs mt-1">{q.category}</span>}
                      {q.notes && <p className="text-text-muted text-xs mt-1">{q.notes}</p>}
                    </div>
                    {can('canEditInterviews') && (
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><Trash2 size={12} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Partner Modal */}
      <Modal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} title={editingPartner ? 'Partner bearbeiten' : 'Neuer Interview-Partner'}>
        <form onSubmit={handleSavePartner} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input type="text" value={partnerForm.name} onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))} className="input" required autoFocus />
            </div>
            <div>
              <label className="label">Unternehmen</label>
              <input type="text" value={partnerForm.company} onChange={e => setPartnerForm(p => ({ ...p, company: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rolle / Position</label>
              <input type="text" value={partnerForm.role} onChange={e => setPartnerForm(p => ({ ...p, role: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input type="email" value={partnerForm.email} onChange={e => setPartnerForm(p => ({ ...p, email: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Biografie / Hintergrund</label>
            <textarea value={partnerForm.bio} onChange={e => setPartnerForm(p => ({ ...p, bio: e.target.value }))} className="textarea" rows={3} placeholder="Kurze Biografie, Expertise, Themen..." />
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea value={partnerForm.notes} onChange={e => setPartnerForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPartnerModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!partnerForm.name} className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>

      {/* Question Modal */}
      <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title="Frage hinzufügen">
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div>
            <label className="label">Frage *</label>
            <textarea value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} className="textarea" rows={3} required autoFocus placeholder="Interview-Frage..." />
          </div>
          <div>
            <label className="label">Kategorie</label>
            <input type="text" value={questionForm.category} onChange={e => setQuestionForm(p => ({ ...p, category: e.target.value }))} className="input" placeholder="z.B. Einstieg, Fachthema, Abschluss..." />
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea value={questionForm.notes} onChange={e => setQuestionForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} placeholder="Hintergrundinformationen, Recherche..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowQuestionModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!questionForm.question} className="btn-primary">Frage hinzufügen</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// NOTIZEN TAB
// ============================================================

function NotesTab() {
  const { can, showSuccess, showError } = useApp();
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', category: '', isPinned: false, tags: [] as string[], tagInput: '' });

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listNotes({ search: search || undefined });
      setNotes(data);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: form.title, content: form.content, category: form.category || undefined, isPinned: form.isPinned, tags: form.tags };
      if (editingNote) {
        await editorialApi.updateNote(editingNote.id, payload);
        showSuccess('Notiz aktualisiert');
      } else {
        await editorialApi.createNote(payload);
        showSuccess('Notiz erstellt');
      }
      setShowModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Notiz löschen?')) return;
    try {
      await editorialApi.deleteNote(id);
      showSuccess('Notiz gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleTogglePin = async (note: any) => {
    try {
      await editorialApi.updateNote(note.id, { isPinned: !note.isPinned });
      load();
    } catch (err: any) { showError(err.message); }
  };

  const openCreate = () => {
    setEditingNote(null);
    setForm({ title: '', content: '', category: '', isPinned: false, tags: [], tagInput: '' });
    setShowModal(true);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && form.tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(form.tagInput.trim())) {
        setForm(p => ({ ...p, tags: [...p.tags, p.tagInput.trim()], tagInput: '' }));
      } else {
        setForm(p => ({ ...p, tagInput: '' }));
      }
    }
  };

  const pinned = notes.filter(n => n.isPinned);
  const unpinned = notes.filter(n => !n.isPinned);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Notizen suchen..." className="input pl-9" />
        </div>
        {can('canEditNotes') && (
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /><span>Neue Notiz</span></button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : notes.length === 0 ? (
        <div className="card text-center py-16">
          <StickyNote size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Keine Notizen</p>
          {can('canEditNotes') && (
            <button onClick={openCreate} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Erste Notiz erstellen</span></button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-1"><Pin size={12} /> Angeheftet</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pinned.map(note => <NoteCard key={note.id} note={note} can={can} onEdit={() => { setEditingNote(note); setForm({ title: note.title, content: note.content, category: note.category || '', isPinned: note.isPinned, tags: note.tags || [], tagInput: '' }); setShowModal(true); }} onDelete={() => handleDelete(note.id)} onTogglePin={() => handleTogglePin(note)} />)}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">Alle Notizen</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {unpinned.map(note => <NoteCard key={note.id} note={note} can={can} onEdit={() => { setEditingNote(note); setForm({ title: note.title, content: note.content, category: note.category || '', isPinned: note.isPinned, tags: note.tags || [], tagInput: '' }); setShowModal(true); }} onDelete={() => handleDelete(note.id)} onTogglePin={() => handleTogglePin(note)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingNote ? 'Notiz bearbeiten' : 'Neue Notiz'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Titel *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" required autoFocus />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input" placeholder="z.B. Recherche" />
            </div>
          </div>
          <div>
            <label className="label">Inhalt *</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="textarea" rows={8} required placeholder="Notiz-Inhalt, Recherche-Ergebnisse, Checklisten..." />
          </div>
          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="badge bg-accent-purple/20 text-accent-purple flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="hover:text-accent-red">×</button>
                </span>
              ))}
            </div>
            <input type="text" value={form.tagInput} onChange={e => setForm(p => ({ ...p, tagInput: e.target.value }))} onKeyDown={addTag} className="input" placeholder="Tag eingeben und Enter drücken..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pinned" checked={form.isPinned} onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} className="rounded" />
            <label htmlFor="pinned" className="text-text-secondary text-sm cursor-pointer">Notiz anheften</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!form.title || !form.content} className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NoteCard({ note, can, onEdit, onDelete, onTogglePin }: any) {
  return (
    <div className={`card flex flex-col group hover:border-surface-border-light transition-all ${note.isPinned ? 'border-accent-orange/30' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-semibold truncate">{note.title}</h3>
          {note.category && <span className="badge bg-surface-overlay text-text-muted text-xs mt-1">{note.category}</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onTogglePin} className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? 'text-accent-orange' : 'text-text-muted hover:text-accent-orange'}`}>
            {note.isPinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>
          {can('canEditNotes') && (
            <>
              <button onClick={onEdit} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"><Edit2 size={13} /></button>
              <button onClick={onDelete} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </div>
      <p className="text-text-secondary text-sm leading-relaxed flex-1 line-clamp-4">{note.content}</p>
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.map((tag: string) => <span key={tag} className="badge bg-surface-overlay text-text-muted text-xs">{tag}</span>)}
        </div>
      )}
      <p className="text-text-muted text-xs mt-3">{new Date(note.updatedAt).toLocaleDateString('de-DE')}</p>
    </div>
  );
}
