import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Calendar, Users, FileText, Plus, Search, Trash2,
  Edit2, Check, X, ArrowRight, Tag, Star, Clock, ChevronDown,
  Mic2, BookOpen, StickyNote, MessageSquare, Filter, Pin, PinOff, Loader2,
  Globe, BookMarked, Video, FileImage, Newspaper, ExternalLink, Link2, Save
} from 'lucide-react';
import { editorialApi, episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

type HubTab = 'ideas' | 'plan' | 'interviews' | 'notes' | 'research';

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
    { key: 'research' as HubTab, label: 'Recherche', icon: <Globe size={16} />, permission: 'canViewIdeas' },
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
      {activeTab === 'research' && <ResearchTab />}
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '', guestIntro: '' });
  const [questionForm, setQuestionForm] = useState({ question: '', category: '', notes: '' });
  const [sendForm, setSendForm] = useState({ subject: '', customMessage: '', episodeId: '' });

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

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    try {
      if (editingQuestion) {
        await editorialApi.updateQuestion(editingQuestion.id, questionForm);
        showSuccess('Frage aktualisiert');
      } else {
        await editorialApi.createQuestion({ ...questionForm, partnerId: selectedPartner.id, order: questions.length });
        showSuccess('Frage hinzugefügt');
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setQuestionForm({ question: '', category: '', notes: '' });
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleApproveQuestion = async (q: any) => {
    try {
      if (q.approved) {
        await editorialApi.revokeQuestion(q.id);
        showSuccess('Freigabe zurückgezogen');
      } else {
        await editorialApi.approveQuestion(q.id);
        showSuccess('Frage freigegeben');
      }
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await editorialApi.deleteQuestion(id);
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleOpenSummary = () => {
    if (!selectedPartner) return;
    const url = editorialApi.sendSummaryUrl(selectedPartner.id);
    window.open(url, '_blank');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/editorial/interviews/partners/${selectedPartner.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...sendForm, customMessage: sendForm.customMessage || selectedPartner.guestIntro }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showSuccess(data.message || 'E-Mail gesendet');
      setShowSendModal(false);
    } catch (err: any) { showError(err.message); }
    finally { setIsSending(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Partners List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Interview-Partner</h3>
          {can('canEditInterviews') && (
            <button onClick={() => { setEditingPartner(null); setPartnerForm({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '', guestIntro: '' }); setShowPartnerModal(true); }} className="btn-ghost p-2"><Plus size={16} /></button>
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
                    <button onClick={e => { e.stopPropagation(); setEditingPartner(partner); setPartnerForm({ name: partner.name, company: partner.company || '', role: partner.role || '', email: partner.email || '', phone: partner.phone || '', bio: partner.bio || '', notes: partner.notes || '', guestIntro: partner.guestIntro || '' }); setShowPartnerModal(true); }} className="p-1 text-text-muted hover:text-accent-blue"><Edit2 size={12} /></button>
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
                <p className="text-text-muted text-xs">
                  {questions.filter(q => q.approved).length}/{questions.length} freigegeben
                </p>
              </div>
              <div className="flex items-center gap-2">
                {can('canViewInterviews') && (
                  <button
                    onClick={handleOpenSummary}
                    className="btn-ghost text-xs flex items-center gap-1.5"
                    title="Zusammenfassung für Gast öffnen (druckbar/PDF)"
                  >
                    <FileText size={14} /><span>Zusammenfassung</span>
                  </button>
                )}
                {can('canEditInterviews') && selectedPartner?.email && (
                  <button
                    onClick={() => { setSendForm({ subject: `Interview-Fragen für Ihren Podcast-Auftritt`, customMessage: '', episodeId: '' }); setShowSendModal(true); }}
                    className="btn-ghost text-xs flex items-center gap-1.5 text-accent-blue"
                    title="Fragen per E-Mail senden"
                  >
                    <MessageSquare size={14} /><span>Per E-Mail senden</span>
                  </button>
                )}
                {can('canEditInterviews') && (
                  <button onClick={() => setShowQuestionModal(true)} className="btn-primary"><Plus size={16} /><span>Frage hinzufügen</span></button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-text-muted text-sm">Noch keine Fragen für diesen Partner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className={`card flex items-start gap-3 group ${q.approved ? 'border-accent-green/40 bg-accent-green/5' : ''}`}>
                    {/* Approve toggle - only for users with canApproveInterviewQuestions */}
                    {can('canApproveInterviewQuestions') ? (
                      <button
                        onClick={() => handleApproveQuestion(q)}
                        title={q.approved ? 'Freigabe zurückziehen' : 'Frage freigeben'}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          q.approved ? 'bg-accent-green border-accent-green' : 'border-surface-border-light hover:border-accent-green'
                        }`}
                      >
                        {q.approved && <Check size={10} className="text-white" />}
                      </button>
                    ) : (
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        q.approved ? 'bg-accent-green border-accent-green' : 'border-surface-border-light'
                      }`}>
                        {q.approved && <Check size={10} className="text-white" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {q.category && <span className="badge bg-surface-overlay text-text-muted text-xs">{q.category}</span>}
                        {q.approved && (
                          <span className="badge bg-accent-green/20 text-accent-green text-xs">Freigegeben</span>
                        )}
                      </div>
                      {q.notes && <p className="text-text-muted text-xs mt-1">{q.notes}</p>}
                    </div>
                    {can('canEditInterviews') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setQuestionForm({ question: q.question, category: q.category || '', notes: q.notes || '' });
                            setShowQuestionModal(true);
                          }}
                          className="p-1 text-text-muted hover:text-accent-blue"
                          title="Frage bearbeiten"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-text-muted hover:text-accent-red" title="Frage löschen"><Trash2 size={12} /></button>
                      </div>
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
            <label className="label">Persönlicher Begleittext für den Gast</label>
            <textarea
              value={partnerForm.guestIntro}
              onChange={e => setPartnerForm(p => ({ ...p, guestIntro: e.target.value }))}
              className="textarea"
              rows={3}
              placeholder="Individuelle Einleitung für den Gast, z.B. 'Liebe/r [Name], vielen Dank für Ihre Zeit...' — wird beim E-Mail-Versand als Standard-Nachricht vorausgefüllt."
            />
          </div>
          <div>
            <label className="label">Notizen (intern)</label>
            <textarea value={partnerForm.notes} onChange={e => setPartnerForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPartnerModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!partnerForm.name} className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>

      {/* Send Summary Modal */}
      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)} title={`Fragen senden an ${selectedPartner?.name}`}>
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-3 text-sm text-text-secondary">
            <p className="font-medium text-accent-blue mb-1">E-Mail an: {selectedPartner?.email}</p>
            <p>Es werden nur <strong>freigegebene Fragen</strong> ({questions.filter(q => q.approved).length} von {questions.length}) versendet. SMTP muss in den Einstellungen konfiguriert sein.</p>
          </div>
          <div>
            <label className="label">Betreff</label>
            <input type="text" value={sendForm.subject} onChange={e => setSendForm(p => ({ ...p, subject: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">Persönlicher Begleittext</label>
            <textarea
              value={sendForm.customMessage}
              onChange={e => setSendForm(p => ({ ...p, customMessage: e.target.value }))}
              className="textarea"
              rows={4}
              placeholder="Individuelle Einleitung für den Gast..."
            />
            {selectedPartner?.guestIntro && sendForm.customMessage === '' && (
              <p className="text-xs text-text-muted mt-1">
                Tipp: Gespeicherter Begleittext wird automatisch verwendet, wenn dieses Feld leer bleibt.
              </p>
            )}
          </div>
          <div className="bg-obsidian-800 rounded-lg p-3 text-xs text-text-muted">
            <p className="font-medium text-text-secondary mb-1">Tipp: Zusammenfassung ohne SMTP</p>
            <p>Klicke auf "Zusammenfassung" um eine druckbare HTML-Seite zu öffnen, die du als PDF speichern oder per E-Mail-Client weiterleiten kannst — ohne SMTP-Konfiguration.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowSendModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isSending} className="btn-primary">
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
              <span>{isSending ? 'Senden...' : 'E-Mail senden'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Question Modal */}
      <Modal isOpen={showQuestionModal} onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); setQuestionForm({ question: '', category: '', notes: '' }); }} title={editingQuestion ? 'Frage bearbeiten' : 'Frage hinzufügen'}>
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div>
            <label className="label">Frage *</label>
            <textarea value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} className="textarea" rows={3} required autoFocus placeholder="Interview-Frage..." />
          </div>
          <div>
            <label className="label">Kategorie</label>
            <input type="text" value={questionForm.category} onChange={e => setQuestionForm(p => ({ ...p, category: e.target.value }))} className="input" placeholder="z.B. Einstieg, Fachthema, Abschluss..." />
          </div>
          <div>
            <label className="label">Notizen (intern)</label>
            <textarea value={questionForm.notes} onChange={e => setQuestionForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} placeholder="Hintergrundinformationen, Recherche..." />
          </div>
          {editingQuestion?.approved && (
            <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-3 text-sm text-accent-orange">
              ⚠️ Diese Frage ist bereits freigegeben. Nach dem Speichern bleibt die Freigabe erhalten.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowQuestionModal(false); setEditingQuestion(null); setQuestionForm({ question: '', category: '', notes: '' }); }} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!questionForm.question} className="btn-primary">{editingQuestion ? 'Speichern' : 'Frage hinzufügen'}</button>
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

// ============================================================
// RECHERCHE TAB
// ============================================================

const RESEARCH_TYPES = [
  { value: 'link', label: 'Website / Link', icon: <Globe size={14} />, color: 'text-accent-blue' },
  { value: 'artikel', label: 'Artikel', icon: <Newspaper size={14} />, color: 'text-accent-cyan' },
  { value: 'buch', label: 'Buch', icon: <BookMarked size={14} />, color: 'text-accent-purple' },
  { value: 'video', label: 'Video', icon: <Video size={14} />, color: 'text-accent-red' },
  { value: 'pdf', label: 'PDF / Dokument', icon: <FileImage size={14} />, color: 'text-accent-orange' },
  { value: 'notiz', label: 'Notiz / Idee', icon: <StickyNote size={14} />, color: 'text-accent-green' },
];

const RESEARCH_STATUS = [
  { value: 'unread', label: 'Ungelesen', color: 'bg-surface-overlay text-text-muted' },
  { value: 'reading', label: 'In Bearbeitung', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'done', label: 'Gelesen', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'important', label: 'Wichtig', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'archived', label: 'Archiviert', color: 'bg-surface-raised text-text-muted' },
];

function ResearchTab() {
  const { can, showSuccess, showError } = useApp();
  const [sources, setSources] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIdea, setFilterIdea] = useState('');
  const [filterEpisode, setFilterEpisode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSource, setEditSource] = useState<any>(null);
  const [viewSource, setViewSource] = useState<any>(null);

  const [form, setForm] = useState({
    title: '', url: '', type: 'link', description: '', content: '',
    tags: '', relatedIdeaId: '', relatedEpisodeId: '', status: 'unread',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterIdea) params.ideaId = filterIdea;
      if (filterEpisode) params.episodeId = filterEpisode;
      const [srcRes, ideaRes, epRes] = await Promise.all([
        editorialApi.listResearch(params),
        editorialApi.listIdeas({}),
        episodesApi.list({ pageSize: 500 }),
      ]);
      setSources(srcRes || []);
      setIdeas(ideaRes || []);
      setEpisodes(epRes?.items || epRes || []);
    } catch (e) { showError('Fehler beim Laden der Recherche-Quellen'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterType, filterStatus, filterIdea, filterEpisode]);

  const openCreate = () => {
    setEditSource(null);
    setForm({ title: '', url: '', type: 'link', description: '', content: '', tags: '', relatedIdeaId: '', relatedEpisodeId: '', status: 'unread' });
    setShowModal(true);
  };

  const openEdit = (src: any) => {
    setEditSource(src);
    setForm({
      title: src.title, url: src.url || '', type: src.type, description: src.description || '',
      content: src.content || '', tags: (src.tags || []).join(', '),
      relatedIdeaId: src.related_idea_id || '', relatedEpisodeId: src.related_episode_id || '',
      status: src.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showError('Titel ist erforderlich'); return; }
    try {
      const data = {
        title: form.title, url: form.url || null, type: form.type,
        description: form.description || null, content: form.content || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        relatedIdeaId: form.relatedIdeaId || null, relatedEpisodeId: form.relatedEpisodeId || null,
        status: form.status,
      };
      if (editSource) {
        await editorialApi.updateResearch(editSource.id, data);
        showSuccess('Quelle aktualisiert');
      } else {
        await editorialApi.createResearch(data);
        showSuccess('Quelle hinzugefügt');
      }
      setShowModal(false);
      load();
    } catch (e) { showError('Fehler beim Speichern'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Quelle wirklich löschen?')) return;
    try {
      await editorialApi.deleteResearch(id);
      showSuccess('Quelle gelöscht');
      load();
    } catch (e) { showError('Fehler beim Löschen'); }
  };

  const handleStatusChange = async (src: any, newStatus: string) => {
    try {
      await editorialApi.updateResearch(src.id, { status: newStatus });
      load();
    } catch (e) { showError('Fehler beim Aktualisieren'); }
  };

  const getTypeInfo = (type: string) => RESEARCH_TYPES.find(t => t.value === type) || RESEARCH_TYPES[0];
  const getStatusInfo = (status: string) => RESEARCH_STATUS.find(s => s.value === status) || RESEARCH_STATUS[0];

  const stats = {
    total: sources.length,
    unread: sources.filter(s => s.status === 'unread').length,
    important: sources.filter(s => s.status === 'important').length,
    done: sources.filter(s => s.status === 'done').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gesamt', value: stats.total, color: 'text-text-primary' },
          { label: 'Ungelesen', value: stats.unread, color: 'text-accent-blue' },
          { label: 'Wichtig', value: stats.important, color: 'text-accent-orange' },
          { label: 'Gelesen', value: stats.done, color: 'text-accent-green' },
        ].map(stat => (
          <div key={stat.label} className="card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-text-muted text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9 w-full text-sm"
            placeholder="Quellen durchsuchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Alle Typen</option>
          {RESEARCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle Status</option>
          {RESEARCH_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input text-sm" value={filterIdea} onChange={e => setFilterIdea(e.target.value)}>
          <option value="">Alle Ideen</option>
          {ideas.map((i: any) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </select>
        <select className="input text-sm" value={filterEpisode} onChange={e => setFilterEpisode(e.target.value)}>
          <option value="">Alle Folgen</option>
          {episodes.map((e: any) => <option key={e.id} value={e.id}>#{e.number} {e.title}</option>)}
        </select>
        {can('canCreateIdeas') && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openCreate}>
            <Plus size={15} /> Quelle hinzufügen
          </button>
        )}
      </div>

      {/* Sources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent-purple" />
        </div>
      ) : sources.length === 0 ? (
        <div className="card text-center py-12">
          <Globe size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">Noch keine Recherche-Quellen vorhanden</p>
          <p className="text-text-muted text-sm mt-1">Füge Links, Bücher, Videos und andere Quellen für deine Folgen hinzu</p>
          {can('canCreateIdeas') && (
            <button className="btn-primary mt-4 text-sm" onClick={openCreate}>Erste Quelle hinzufügen</button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {sources.map((src: any) => {
            const typeInfo = getTypeInfo(src.type);
            const statusInfo = getStatusInfo(src.status);
            const relatedIdea = ideas.find((i: any) => i.id === src.related_idea_id);
            const relatedEp = episodes.find((e: any) => e.id === src.related_episode_id);
            return (
              <div key={src.id} className="card hover:border-accent-purple/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 ${typeInfo.color}`}>{typeInfo.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">{src.title}</h3>
                        {src.url && (
                          <a href={src.url} target="_blank" rel="noopener noreferrer"
                            className="text-accent-blue text-xs hover:underline flex items-center gap-1 mt-0.5 truncate">
                            <Link2 size={11} /> {src.url}
                          </a>
                        )}
                        {src.description && <p className="text-text-secondary text-sm mt-1 line-clamp-2">{src.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={src.status}
                          onChange={e => handleStatusChange(src, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-lg border-0 cursor-pointer ${statusInfo.color}`}
                          style={{ background: 'transparent' }}
                        >
                          {RESEARCH_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewSource(src)} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg" title="Details">
                            <FileText size={13} />
                          </button>
                          {can('canEditIdeas') && (
                            <button onClick={() => openEdit(src)} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg">
                              <Edit2 size={13} />
                            </button>
                          )}
                          {can('canDeleteIdeas') && (
                            <button onClick={() => handleDelete(src.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-surface-overlay ${typeInfo.color}`}>{typeInfo.label}</span>
                      {relatedIdea && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">Idee: {relatedIdea.title}</span>}
                      {relatedEp && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">Folge #{relatedEp.number}: {relatedEp.title}</span>}
                      {(src.tags || []).map((tag: string) => <span key={tag} className="badge text-xs">{tag}</span>)}
                      <span className="text-text-muted text-xs ml-auto">{new Date(src.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSource ? 'Quelle bearbeiten' : 'Neue Quelle hinzufügen'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Titel *</label>
              <input className="input w-full" placeholder="Titel der Quelle" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input w-full" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {RESEARCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {RESEARCH_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">URL / Link</label>
              <input className="input w-full" placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Kurzbeschreibung</label>
              <input className="input w-full" placeholder="Worum geht es?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notizen / Inhalt</label>
              <textarea className="input w-full resize-none" rows={4} placeholder="Wichtige Erkenntnisse, Zitate, Zusammenfassung..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div>
              <label className="label">Verknüpfte Idee</label>
              <select className="input w-full" value={form.relatedIdeaId} onChange={e => setForm(f => ({ ...f, relatedIdeaId: e.target.value }))}>
                <option value="">Keine</option>
                {ideas.map((i: any) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Verknüpfte Folge</label>
              <select className="input w-full" value={form.relatedEpisodeId} onChange={e => setForm(f => ({ ...f, relatedEpisodeId: e.target.value }))}>
                <option value="">Keine</option>
                {episodes.map((e: any) => <option key={e.id} value={e.id}>#{e.number} {e.title}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Tags (kommagetrennt)</label>
              <input className="input w-full" placeholder="tag1, tag2, tag3" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Abbrechen</button>
            <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
              <Save size={15} /> {editSource ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail View Modal */}
      {viewSource && (
        <Modal isOpen={!!viewSource} onClose={() => setViewSource(null)} title={viewSource.title} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded-full bg-surface-overlay ${getTypeInfo(viewSource.type).color}`}>
                {getTypeInfo(viewSource.type).label}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusInfo(viewSource.status).color}`}>
                {getStatusInfo(viewSource.status).label}
              </span>
            </div>
            {viewSource.url && (
              <a href={viewSource.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent-blue hover:underline text-sm">
                <ExternalLink size={14} /> {viewSource.url}
              </a>
            )}
            {viewSource.description && (
              <div>
                <p className="text-text-muted text-xs mb-1">Beschreibung</p>
                <p className="text-text-secondary text-sm">{viewSource.description}</p>
              </div>
            )}
            {viewSource.content && (
              <div>
                <p className="text-text-muted text-xs mb-1">Notizen</p>
                <div className="bg-surface-raised rounded-xl p-4 text-text-secondary text-sm whitespace-pre-wrap">{viewSource.content}</div>
              </div>
            )}
            {(viewSource.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewSource.tags.map((tag: string) => <span key={tag} className="badge">{tag}</span>)}
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-text-muted text-xs">Hinzugefügt: {new Date(viewSource.created_at).toLocaleDateString('de-DE')}</span>
              <div className="flex gap-2">
                {can('canEditIdeas') && (
                  <button className="btn-ghost text-sm" onClick={() => { setViewSource(null); openEdit(viewSource); }}>
                    <Edit2 size={13} className="mr-1" /> Bearbeiten
                  </button>
                )}
                <button className="btn-ghost text-sm" onClick={() => setViewSource(null)}>Schließen</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
