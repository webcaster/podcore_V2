import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Lightbulb, Calendar, Users, FileText, Plus, Search, Trash2,
  Edit2, Check, X, ArrowRight, ArrowUp, ArrowDown, Tag, Star, Clock, ChevronDown,
  Mic2, BookOpen, StickyNote, MessageSquare, Filter, Pin, PinOff, Loader2,
  Globe, BookMarked, Video, FileImage, Newspaper, ExternalLink, Link2, Save, Eye,
  ListChecks, UserPlus, Download, ListOrdered, RotateCcw
} from 'lucide-react';
import { editorialApi, episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import PdfLayoutPicker from '../components/ui/PdfLayoutPicker';
import SeasonPlanningTab from '../components/editorial/SeasonPlanningTab';

type HubTab = 'ideas' | 'season-planning' | 'plan' | 'interviews' | 'notes' | 'research';

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

const INTERVIEW_PARTNER_STATUSES = [
  { value: 'offen', label: 'Offen', color: 'bg-surface-overlay text-text-muted' },
  { value: 'angefragt', label: 'Angefragt', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'bestaetigt', label: 'Bestätigt', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'terminiert', label: 'Terminiert', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'abgeschlossen', label: 'Abgeschlossen', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'abgesagt', label: 'Abgesagt', color: 'bg-accent-red/20 text-accent-red' },
];

export default function EditorialHubPage() {
  const { can, showSuccess, showError } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as HubTab | null;
  const [activeTab, setActiveTab] = useState<HubTab>(requestedTab || 'ideas');

  const tabs = [
    { key: 'ideas' as HubTab, label: 'Ideenpool', icon: <Lightbulb size={16} />, permission: 'canViewIdeas' },
    { key: 'season-planning' as HubTab, label: 'Staffelplanung', icon: <ListOrdered size={16} />, permission: 'canViewSeasonPlanning' },
    { key: 'research' as HubTab, label: 'Recherche', icon: <Globe size={16} />, permission: 'canViewIdeas' },
    { key: 'plan' as HubTab, label: 'Redaktionsplan', icon: <Calendar size={16} />, permission: 'canViewEditorialPlan' },
    { key: 'interviews' as HubTab, label: 'Interviews', icon: <Users size={16} />, permission: 'canViewInterviews' },
    { key: 'notes' as HubTab, label: 'Notizen', icon: <StickyNote size={16} />, permission: 'canViewNotes' },
  ].filter(t => can(t.permission));

  useEffect(() => {
    if (requestedTab && tabs.some(tab => tab.key === requestedTab)) setActiveTab(requestedTab);
    else if (!tabs.some(tab => tab.key === activeTab) && tabs[0]) setActiveTab(tabs[0].key);
  }, [requestedTab, can]);

  const selectTab = (tab: HubTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'season-planning') next.delete('seasonId');
    setSearchParams(next, { replace: true });
  };

  const updateSeasonContext = (seasonId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'season-planning');
    next.set('seasonId', seasonId);
    setSearchParams(next, { replace: true });
  };

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
            onClick={() => selectTab(tab.key)}
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
      {activeTab === 'season-planning' && <SeasonPlanningTab initialSeasonId={searchParams.get('seasonId')} onSeasonChange={updateSeasonContext} />}
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
  const [showTrash, setShowTrash] = useState(false);
  const [deletedIdeas, setDeletedIdeas] = useState<any[]>([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
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
    if (!confirm(`Idee "${title}" in den Papierkorb verschieben? Sie kann dort wiederhergestellt werden.`)) return;
    try {
      await editorialApi.deleteIdea(id);
      showSuccess('Idee in den Papierkorb verschoben');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const loadTrash = async () => {
    setIsTrashLoading(true);
    try {
      setDeletedIdeas(await editorialApi.listDeletedIdeas());
    } catch (err: any) { showError(err.message); }
    finally { setIsTrashLoading(false); }
  };

  const openTrash = async () => {
    setShowTrash(true);
    await loadTrash();
  };

  const handleRestore = async (idea: any) => {
    try {
      await editorialApi.restoreIdea(idea.id);
      showSuccess(`Idee "${idea.title}" wiederhergestellt`);
      await Promise.all([load(), loadTrash()]);
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
        {can('canEditIdeas') && (
          <button onClick={openTrash} className="btn-secondary whitespace-nowrap" title="Gelöschte Ideenmappen wiederherstellen">
            <Trash2 size={16} /><span>Papierkorb</span>
          </button>
        )}
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
                    <Link to={`/editorial/ideas/${idea.id}`} className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors" title="Detailansicht öffnen">
                      <Eye size={13} />
                    </Link>
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

      {/* Papierkorb für wiederherstellbare Ideenmappen */}
      <Modal isOpen={showTrash} onClose={() => setShowTrash(false)} title="Papierkorb – Ideenmappen" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Gelöschte Ideenmappen bleiben mit ihren verknüpften Inhalten erhalten und können jederzeit wiederhergestellt werden.
          </p>
          {isTrashLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-accent-purple" /></div>
          ) : deletedIdeas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border px-5 py-10 text-center">
              <Trash2 size={28} className="mx-auto mb-3 text-text-muted" />
              <p className="font-medium text-text-primary">Der Papierkorb ist leer</p>
              <p className="mt-1 text-sm text-text-muted">Hier erscheinen gelöschte Ideenmappen zur Wiederherstellung.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {deletedIdeas.map(idea => (
                <div key={idea.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/50 p-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-purple/15 text-accent-purple"><Lightbulb size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">{idea.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Gelöscht am {idea.deletedAt ? new Date(idea.deletedAt).toLocaleString('de-DE') : 'unbekannt'}
                    </p>
                  </div>
                  {can('canEditIdeas') && (
                    <button onClick={() => handleRestore(idea)} className="btn-secondary shrink-0 text-xs" title="Ideenmappe wiederherstellen">
                      <RotateCcw size={14} /> Wiederherstellen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
  const [interviewMode, setInterviewMode] = useState<'partners' | 'pool'>('partners');
  const [isLoading, setIsLoading] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '', guestIntro: '', status: 'offen' });
  const [questionForm, setQuestionForm] = useState({ question: '', category: '', notes: '' });
  const [sendForm, setSendForm] = useState({ subject: '', customMessage: '', episodeId: '' });
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfCustomMessage, setPdfCustomMessage] = useState('');

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

  const handleRequestQuestionApproval = async (question: any) => {
    if (!selectedPartner || question.approved || question.approvalStatus === 'angefragt') return;
    try {
      await editorialApi.requestQuestionApproval(question.id);
      showSuccess('Freigabe für die Interview-Frage angefordert');
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await editorialApi.deleteQuestion(id);
      loadQuestions(selectedPartner.id);
    } catch (err: any) { showError(err.message); }
  };

  const handleMoveQuestion = async (questionId: string, direction: -1 | 1) => {
    const currentIndex = questions.findIndex(question => question.id === questionId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= questions.length) return;
    const reordered = [...questions];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setQuestions(reordered);
    try {
      await editorialApi.reorderQuestions(reordered.map(question => question.id));
      showSuccess('Fragenreihenfolge aktualisiert');
    } catch (err: any) {
      showError(err.message);
      if (selectedPartner) loadQuestions(selectedPartner.id);
    }
  };

  const handleArchiveQuestionToPool = async (question: any) => {
    try {
      await editorialApi.archiveQuestionToPool(question.id);
      showSuccess('Frage in den allgemeinen Fragen-Pool übernommen');
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
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setInterviewMode('partners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            interviewMode === 'partners' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
          }`}
        >
          <Users size={15} /> Partner & Fragen
        </button>
        <button
          type="button"
          onClick={() => setInterviewMode('pool')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            interviewMode === 'pool' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
          }`}
        >
          <ListChecks size={15} /> Allgemeiner Fragen-Pool
        </button>
      </div>

      {interviewMode === 'pool' ? (
        <QuestionPoolPanel partners={partners} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Partners List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Interview-Partner</h3>
          {can('canEditInterviews') && (
            <button onClick={() => { setEditingPartner(null); setPartnerForm({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '', guestIntro: '', status: 'offen' }); setShowPartnerModal(true); }} className="btn-ghost p-2"><Plus size={16} /></button>
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
                  {(() => { const statusMeta = INTERVIEW_PARTNER_STATUSES.find(status => status.value === (partner.status || 'offen')) || INTERVIEW_PARTNER_STATUSES[0]; return <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusMeta.color}`}>{statusMeta.label}</span>; })()}
                </div>
                {can('canEditInterviews') && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setEditingPartner(partner); setPartnerForm({ name: partner.name, company: partner.company || '', role: partner.role || '', email: partner.email || '', phone: partner.phone || '', bio: partner.bio || '', notes: partner.notes || '', guestIntro: partner.guestIntro || '', status: partner.status || 'offen' }); setShowPartnerModal(true); }} className="p-1 text-text-muted hover:text-accent-blue"><Edit2 size={12} /></button>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!questions.length) return alert('Keine Fragen zum Übernehmen vorhanden.');
                        const topicName = window.prompt('Unter welchem Thema sollen diese Fragen im allgemeinen Pool gespeichert werden?', selectedPartner.name);
                        if (!topicName || !topicName.trim()) return;
                        try {
                          for (const q of questions) {
                            await editorialApi.createPoolQuestion({ question: q.question, notes: q.notes, category: topicName.trim() });
                          }
                          alert(`${questions.length} Fragen wurden in den Pool unter "${topicName.trim()}" kopiert.`);
                        } catch (err: any) { alert(err.message || 'Fehler beim Übernehmen'); }
                      }}
                      className="btn-secondary"
                      title="Alle Fragen in den allgemeinen Pool kopieren"
                    >
                      <BookMarked size={16} /><span>In Pool übernehmen</span>
                    </button>
                    <button
                      onClick={() => {
                        setPdfCustomMessage(selectedPartner.guestIntro || `Liebe/r ${selectedPartner.name},\n\nvielen Dank, dass Sie sich die Zeit nehmen, bei unserem Podcast als Gast dabei zu sein. Hier sind die Interview-Fragen zur Vorbereitung:`);
                        setShowPdfDialog(true);
                      }}
                      className="btn-secondary"
                      title="Fragen mit persönlichem Anschreiben als PDF exportieren"
                    >
                      <Download size={16} /><span>Persönliches PDF</span>
                    </button>
                    <button onClick={() => setShowQuestionModal(true)} className="btn-primary"><Plus size={16} /><span>Frage hinzufügen</span></button>
                  </div>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-text-muted text-sm">Noch keine Fragen für diesen Partner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, index) => (
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
                      <p className="text-[11px] font-semibold text-accent-purple mb-1">Frage {index + 1}</p>
                      <p className="text-sm text-text-primary">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {q.category && <span className="badge bg-surface-overlay text-text-muted text-xs">{q.category}</span>}
                        {q.approved ? (
                          <span className="badge bg-accent-green/20 text-accent-green text-xs">Freigegeben</span>
                        ) : q.approvalStatus === 'angefragt' ? (
                          <span className="badge bg-accent-orange/20 text-accent-orange text-xs">Freigabe angefragt</span>
                        ) : (
                          <span className="badge bg-surface-overlay text-text-muted text-xs">Noch offen</span>
                        )}
                      </div>
                      {q.notes && <p className="text-text-muted text-xs mt-1">{q.notes}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {can('canRequestApproval') && !q.approved && q.approvalStatus !== 'angefragt' && (
                        <button onClick={() => handleRequestQuestionApproval(q)} className="p-1 text-text-muted hover:text-accent-orange" title="Freigabe anfordern"><Clock size={12} /></button>
                      )}
                      {can('canEditInterviews') && <>
                        <button onClick={() => handleMoveQuestion(q.id, -1)} disabled={index === 0} className="p-1 text-text-muted hover:text-accent-purple disabled:opacity-30" title="Eine Position nach oben"><ArrowUp size={12} /></button>
                        <button onClick={() => handleMoveQuestion(q.id, 1)} disabled={index === questions.length - 1} className="p-1 text-text-muted hover:text-accent-purple disabled:opacity-30" title="Eine Position nach unten"><ArrowDown size={12} /></button>
                        <button onClick={() => handleArchiveQuestionToPool(q)} className="p-1 text-text-muted hover:text-accent-cyan" title="In allgemeinen Fragen-Pool übernehmen"><BookMarked size={12} /></button>
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
                      </>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
        </div>
      )}

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
            <label className="label">Interviewstatus</label>
            <select value={partnerForm.status} onChange={e => setPartnerForm(p => ({ ...p, status: e.target.value }))} className="input">
              {INTERVIEW_PARTNER_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
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

      {showPdfDialog && selectedPartner && (
        <Modal isOpen={showPdfDialog} onClose={() => setShowPdfDialog(false)} title="Interview-Fragen als PDF exportieren" size="lg">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">Erstelle ein persönliches Dokument mit Anschreiben und allen Fragen für <strong>{selectedPartner.name}</strong>.</p>
            <div>
              <label className="label">Persönliches Anschreiben</label>
              <textarea
                className="textarea w-full font-mono text-sm"
                rows={8}
                value={pdfCustomMessage}
                onChange={e => setPdfCustomMessage(e.target.value)}
                placeholder="Liebe/r Gast..."
              />
            </div>
            <div className="bg-surface-overlay rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-2 text-sm">Enthaltene Fragen ({questions.length}):</h4>
              <ol className="list-decimal list-inside text-sm text-text-secondary space-y-1">
                {questions.map((q: any) => <li key={q.id} className="line-clamp-1">{q.question}</li>)}
              </ol>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPdfDialog(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={async () => {
                  try {
                    const blob = await editorialApi.exportPartnerPdf(selectedPartner.id, pdfCustomMessage);
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = `Interview-Fragen-${selectedPartner.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                    document.body.appendChild(anchor);
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                    anchor.remove();
                    setShowPdfDialog(false);
                    showSuccess('Interview-PDF wurde erstellt');
                  } catch (err: any) { showError(err.message || 'Fehler beim PDF-Export'); }
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={16} /> PDF herunterladen
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function QuestionPoolPanel({ partners }: { partners: any[] }) {
  const { can, showSuccess, showError } = useApp();
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfLayoutId, setPdfLayoutId] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Allgemeiner Fragen-Pool');
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [partnerId, setPartnerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [collapsedTopics, setCollapsedTopics] = useState<string[]>([]);
  const [form, setForm] = useState({ question: '', category: 'Allgemein', notes: '', order: 0 });

  const loadPool = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listQuestionPool({ search: search || undefined });
      setQuestions(data);
      setSelectedIds(current => current.filter(id => data.some((question: any) => question.id === id)));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadPool, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  const categories = Array.from(new Set(questions.map(question => question.category || 'Allgemein')))
    .sort((a, b) => String(a).localeCompare(String(b), 'de'));
  const visibleQuestions = category
    ? questions.filter(question => (question.category || 'Allgemein') === category)
    : questions;
  const groupedQuestions = visibleQuestions.reduce<Record<string, any[]>>((groups, question) => {
    const key = question.category || 'Allgemein';
    if (!groups[key]) groups[key] = [];
    groups[key].push(question);
    return groups;
  }, {});

  const toggleTopic = (topic: string) => {
    setCollapsedTopics(current => current.includes(topic)
      ? current.filter(item => item !== topic)
      : [...current, topic]);
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setForm({ question: '', category: category || 'Allgemein', notes: '', order: 0 });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingQuestion) {
        await editorialApi.updatePoolQuestion(editingQuestion.id, form);
        showSuccess('Pool-Frage aktualisiert');
      } else {
        await editorialApi.createPoolQuestion(form);
        showSuccess('Frage zum allgemeinen Pool hinzugefügt');
      }
      setShowQuestionModal(false);
      resetQuestionForm();
      await loadPool();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Pool-Frage löschen? Bereits zugeordnete Kopien bei Interview-Partnern bleiben erhalten.')) return;
    try {
      await editorialApi.deletePoolQuestion(id);
      setSelectedIds(current => current.filter(selectedId => selectedId !== id));
      showSuccess('Pool-Frage gelöscht');
      await loadPool();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };

  const toggleVisible = () => {
    const visibleIds = visibleQuestions.map(question => question.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(current => allSelected
      ? current.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!partnerId || selectedIds.length === 0) return;
    setIsAssigning(true);
    try {
      const result = await editorialApi.assignPoolQuestions(partnerId, selectedIds);
      showSuccess(result.message || 'Fragen zugeordnet');
      setShowAssignModal(false);
      setPartnerId('');
      if (result.data?.assigned > 0) setSelectedIds([]);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!documentTitle.trim()) return;
    setIsExporting(true);
    try {
      const exportSelection = selectedIds.length > 0;
      const blob = await editorialApi.downloadQuestionPoolPdf({
        category: exportSelection ? undefined : category || undefined,
        search: exportSelection ? undefined : search || undefined,
        questionIds: exportSelection ? selectedIds : undefined,
        layoutId: pdfLayoutId || undefined,
        documentTitle: documentTitle.trim(),
      });
      const safeTitle = documentTitle.trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'Fragen-Pool';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      showSuccess(`${exportSelection ? selectedIds.length : visibleQuestions.length} ${exportSelection ? 'ausgewählte' : 'gefilterte'} Fragen als PDF exportiert`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2"><ListChecks size={18} className="text-accent-purple" /> Allgemeiner Fragen-Pool</h3>
            <p className="text-text-muted text-sm mt-1">Fragen ohne feste Person sammeln, nach Thema ordnen und später einem Interview-Partner zuweisen.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {visibleQuestions.length > 0 && (
              <button type="button" onClick={() => setShowExportModal(true)} className="btn-secondary text-sm">
                <Download size={15} /> {selectedIds.length > 0 ? `${selectedIds.length} ausgewählte als PDF` : 'PDF exportieren'}
              </button>
            )}
            {can('canEditInterviews') && selectedIds.length > 0 && (
              <button type="button" onClick={() => setShowAssignModal(true)} className="btn-secondary text-sm">
                <UserPlus size={15} /> {selectedIds.length} {selectedIds.length === 1 ? 'Frage' : 'Fragen'} zuordnen
              </button>
            )}
            {can('canEditInterviews') && (
              <button type="button" onClick={() => { resetQuestionForm(); setShowQuestionModal(true); }} className="btn-primary text-sm">
                <Plus size={15} /> Frage erstellen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="input pl-9" placeholder="Fragen, Themen oder Notizen durchsuchen..." />
        </div>
        <select value={category} onChange={event => setCategory(event.target.value)} className="input lg:w-64">
          <option value="">Alle Themen ({questions.length})</option>
          {categories.map(item => <option key={String(item)} value={String(item)}>{String(item)}</option>)}
        </select>
        {can('canEditInterviews') && visibleQuestions.length > 0 && (
          <button type="button" onClick={toggleVisible} className="btn-ghost text-sm whitespace-nowrap">
            <Check size={15} /> {visibleQuestions.every(question => selectedIds.includes(question.id)) ? 'Auswahl aufheben' : 'Sichtbare auswählen'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-accent-purple" /></div>
      ) : visibleQuestions.length === 0 ? (
        <div className="card text-center py-14">
          <MessageSquare size={38} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Keine Pool-Fragen gefunden</p>
          <p className="text-text-muted text-sm mt-1">Erstelle eine Frage ohne Interview-Partner oder passe den Filter an.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedQuestions).sort(([topicA], [topicB]) => topicA.localeCompare(topicB, 'de')).map(([topic, topicQuestions]) => {
            const isCollapsed = collapsedTopics.includes(topic);
            return (
            <section key={topic} className="space-y-2">
              <button type="button" onClick={() => toggleTopic(topic)} className="w-full flex items-center gap-2 px-1 py-1 text-left rounded hover:bg-surface-raised/60 transition-colors" aria-expanded={!isCollapsed}>
                <ChevronDown size={15} className={`text-accent-purple transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                <Tag size={14} className="text-accent-purple" />
                <h4 className="font-semibold text-text-primary">{topic}</h4>
                <span className="badge bg-surface-overlay text-text-muted">{topicQuestions.length}</span>
                <span className="ml-auto text-[11px] text-text-muted">{isCollapsed ? 'Ausklappen' : 'Einklappen'}</span>
              </button>
              {!isCollapsed && <div className="space-y-2">
                {topicQuestions.map(question => (
                  <div key={question.id} className={`card flex items-start gap-3 group transition-colors ${selectedIds.includes(question.id) ? 'border-accent-purple bg-accent-purple/5' : ''}`}>
                    {can('canEditInterviews') && (
                      <button
                        type="button"
                        onClick={() => toggleSelection(question.id)}
                        aria-label={selectedIds.includes(question.id) ? 'Frage abwählen' : 'Frage auswählen'}
                        className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${selectedIds.includes(question.id) ? 'bg-accent-purple border-accent-purple' : 'border-surface-border-light hover:border-accent-purple'}`}
                      >
                        {selectedIds.includes(question.id) && <Check size={12} className="text-white" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{question.question}</p>
                      {question.notes && <p className="text-text-muted text-xs mt-2 whitespace-pre-wrap">{question.notes}</p>}
                    </div>
                    {can('canEditInterviews') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(question);
                            setForm({ question: question.question, category: question.category || 'Allgemein', notes: question.notes || '', order: question.sort_order || 0 });
                            setShowQuestionModal(true);
                          }}
                          className="p-1 text-text-muted hover:text-accent-blue"
                          title="Pool-Frage bearbeiten"
                        ><Edit2 size={13} /></button>
                        <button type="button" onClick={() => handleDelete(question.id)} className="p-1 text-text-muted hover:text-accent-red" title="Pool-Frage löschen"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>}
            </section>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); resetQuestionForm(); }}
        title={editingQuestion ? 'Pool-Frage bearbeiten' : 'Frage für den allgemeinen Pool'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Frage *</label>
            <textarea value={form.question} onChange={event => setForm(current => ({ ...current, question: event.target.value }))} className="textarea" rows={4} required autoFocus placeholder="Interview-Frage..." />
          </div>
          <div>
            <label className="label">Thema *</label>
            <input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} className="input" required placeholder="z. B. Biografie, Fachthema, Ausblick" list="question-pool-topics" />
            <datalist id="question-pool-topics">{categories.map(item => <option key={String(item)} value={String(item)} />)}</datalist>
          </div>
          <div>
            <label className="label">Interne Notizen</label>
            <textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} className="textarea" rows={3} placeholder="Recherchehinweise, gewünschte Vertiefung..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowQuestionModal(false); resetQuestionForm(); }} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!form.question.trim() || !form.category.trim()} className="btn-primary">{editingQuestion ? 'Speichern' : 'Zum Pool hinzufügen'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showExportModal} onClose={() => !isExporting && setShowExportModal(false)} title="Fragen-Pool als PDF exportieren">
        <form onSubmit={handleExport} className="space-y-4">
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3 text-sm text-text-secondary">
            {selectedIds.length > 0
              ? `${selectedIds.length} ausgewählte ${selectedIds.length === 1 ? 'Frage wird' : 'Fragen werden'} thematisch sortiert exportiert.`
              : `${visibleQuestions.length} aktuell gefilterte ${visibleQuestions.length === 1 ? 'Frage wird' : 'Fragen werden'} thematisch sortiert exportiert.`}
          </div>
          <div>
            <label className="label">Dokumenttitel *</label>
            <input value={documentTitle} onChange={event => setDocumentTitle(event.target.value)} className="input" required maxLength={160} autoFocus placeholder="Allgemeiner Fragen-Pool" />
          </div>
          <div>
            <label className="label">PDF-Layout</label>
            <PdfLayoutPicker exportType="question_pool" value={pdfLayoutId} onChange={setPdfLayoutId} className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowExportModal(false)} disabled={isExporting} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isExporting || !documentTitle.trim()} className="btn-primary">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'PDF wird erstellt...' : 'PDF herunterladen'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setPartnerId(''); }} title="Pool-Fragen zuordnen">
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3 text-sm text-text-secondary">
            <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'ausgewählte Frage wird' : 'ausgewählte Fragen werden'} als bearbeitbare Kopie dem Interview-Partner zugeordnet. Der allgemeine Pool bleibt unverändert.
          </div>
          <div>
            <label className="label">Interview-Partner *</label>
            <select value={partnerId} onChange={event => setPartnerId(event.target.value)} className="input" required autoFocus>
              <option value="">Partner auswählen...</option>
              {partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}{partner.company ? ` · ${partner.company}` : ''}</option>)}
            </select>
            {partners.length === 0 && <p className="text-xs text-accent-orange mt-2">Lege zuerst unter „Partner & Fragen“ einen Interview-Partner an.</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAssignModal(false); setPartnerId(''); }} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!partnerId || isAssigning || selectedIds.length === 0} className="btn-primary">
              {isAssigning ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {isAssigning ? 'Zuordnung läuft...' : 'Fragen zuordnen'}
            </button>
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
