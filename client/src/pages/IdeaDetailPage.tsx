import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, Trash2, Plus, X, Check, ChevronDown, ChevronUp,
  FileText, Search, Users, StickyNote, CheckSquare, Rocket, Upload,
  Download, ExternalLink, Link2, BookOpen, Tag, Calendar, Clock,
  User, AlertCircle, Loader2, RefreshCw, Play, Mic, List, Globe,
} from 'lucide-react';
import { editorialApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

type IdeaTab = 'overview' | 'research' | 'interview' | 'notes' | 'checklist' | 'episode';

const STATUS_LABELS: Record<string, string> = {
  neu: 'Neu', in_bearbeitung: 'In Bearbeitung', bereit: 'Bereit', archiviert: 'Archiviert',
};
const STATUS_COLORS: Record<string, string> = {
  neu: 'bg-accent-blue/20 text-accent-blue', in_bearbeitung: 'bg-yellow-500/20 text-yellow-400',
  bereit: 'bg-green-500/20 text-green-400', archiviert: 'bg-obsidian-600 text-text-muted',
};
const PRIORITY_LABELS: Record<string, string> = { hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' };
const PRIORITY_COLORS: Record<string, string> = {
  hoch: 'bg-red-500/20 text-red-400', mittel: 'bg-yellow-500/20 text-yellow-400', niedrig: 'bg-green-500/20 text-green-400',
};

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, addToast } = useApp();
  const showError = (msg: string) => addToast('error', msg);
  const showSuccess = (msg: string) => addToast('success', msg);

  const [idea, setIdea] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<IdeaTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Overview edit form
  const [form, setForm] = useState({
    title: '', description: '', status: 'neu', priority: 'mittel',
    targetAudience: '', episodeFormat: '', targetDuration: '', targetDate: '', tags: [] as string[], tagInput: '',
  });

  // Research
  const [research, setResearch] = useState<any[]>([]);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [editingResearch, setEditingResearch] = useState<any>(null);
  const [researchForm, setResearchForm] = useState({ title: '', url: '', type: 'link', description: '', content: '' });

  // Uploads
  const [uploads, setUploads] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interview partners
  const [partners, setPartners] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '' });
  const [questionForm, setQuestionForm] = useState({ question: '', category: '', notes: '', partnerId: '' });
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [noteContent, setNoteContent] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<any[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Episode creation
  const [episodeForm, setEpisodeForm] = useState({ title: '', description: '' });
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);

  const loadIdea = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await editorialApi.getIdea(id);
      setIdea(data);
      setForm({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'neu',
        priority: data.priority || 'mittel',
        targetAudience: data.targetAudience || '',
        episodeFormat: data.episodeFormat || '',
        targetDuration: data.targetDuration ? String(data.targetDuration) : '',
        targetDate: data.targetDate ? data.targetDate.slice(0, 10) : '',
        tags: data.tags || [],
        tagInput: '',
      });
      setEpisodeForm({ title: data.title || '', description: data.description || '' });
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadResearch = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listResearch({ ideaId: id });
      setResearch(data);
    } catch (_) {}
  };

  const loadUploads = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listIdeaUploads(id);
      setUploads(data);
    } catch (_) {}
  };

  const loadPartners = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listPartners({ ideaId: id });
      setPartners(data);
    } catch (_) {}
  };

  const loadQuestions = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listQuestions({ ideaId: id });
      setQuestions(data);
    } catch (_) {}
  };

  const loadNotes = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listIdeaNotes(id);
      setNotes(data);
    } catch (_) {}
  };

  const loadChecklist = async () => {
    if (!id) return;
    try {
      const data = await editorialApi.listIdeaChecklist(id);
      setChecklist(data);
    } catch (_) {}
  };

  useEffect(() => {
    loadIdea();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'research') { loadResearch(); loadUploads(); }
    else if (activeTab === 'interview') { loadPartners(); loadQuestions(); }
    else if (activeTab === 'notes') loadNotes();
    else if (activeTab === 'checklist') loadChecklist();
  }, [activeTab, id]);

  const handleSaveOverview = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await editorialApi.patchIdea(id, {
        title: form.title, description: form.description || null,
        status: form.status, priority: form.priority,
        targetAudience: form.targetAudience || null,
        episodeFormat: form.episodeFormat || null,
        targetDuration: form.targetDuration ? parseInt(form.targetDuration) : null,
        targetDate: form.targetDate || null,
        tags: form.tags,
      });
      showSuccess('Idee gespeichert');
      setIsEditing(false);
      loadIdea();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  // Research handlers
  const handleSaveResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingResearch) {
        await editorialApi.updateResearch(editingResearch.id, { ...researchForm, relatedIdeaId: id });
        showSuccess('Quelle aktualisiert');
      } else {
        await editorialApi.createResearch({ ...researchForm, relatedIdeaId: id });
        showSuccess('Quelle hinzugefügt');
      }
      setShowResearchModal(false);
      setEditingResearch(null);
      setResearchForm({ title: '', url: '', type: 'link', description: '', content: '' });
      loadResearch();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteResearch = async (resId: string) => {
    if (!confirm('Quelle löschen?')) return;
    try {
      await editorialApi.deleteResearch(resId);
      showSuccess('Quelle gelöscht');
      loadResearch();
    } catch (err: any) { showError(err.message); }
  };

  // Upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setIsUploading(true);
    try {
      await editorialApi.uploadIdeaFile(id, file);
      showSuccess('Datei hochgeladen');
      loadUploads();
    } catch (err: any) { showError(err.message); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Datei löschen?')) return;
    try {
      await editorialApi.deleteIdeaUpload(id!, uploadId);
      showSuccess('Datei gelöscht');
      loadUploads();
    } catch (err: any) { showError(err.message); }
  };

  // Partner handlers
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await editorialApi.updatePartner(editingPartner.id, { ...partnerForm, ideaId: id });
        showSuccess('Partner aktualisiert');
      } else {
        await editorialApi.createPartner({ ...partnerForm, ideaId: id });
        showSuccess('Partner hinzugefügt');
      }
      setShowPartnerModal(false);
      setEditingPartner(null);
      setPartnerForm({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '' });
      loadPartners();
    } catch (err: any) { showError(err.message); }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await editorialApi.updateQuestion(editingQuestion.id, { ...questionForm, ideaId: id });
        showSuccess('Frage aktualisiert');
      } else {
        await editorialApi.createQuestion({ ...questionForm, ideaId: id, partnerId: questionForm.partnerId || null });
        showSuccess('Frage hinzugefügt');
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setQuestionForm({ question: '', category: '', notes: '', partnerId: '' });
      loadQuestions();
    } catch (err: any) { showError(err.message); }
  };

  const handleApproveQuestion = async (qId: string, approved: boolean) => {
    try {
      if (approved) await editorialApi.approveQuestion(qId);
      else await editorialApi.revokeQuestion(qId);
      loadQuestions();
    } catch (err: any) { showError(err.message); }
  };

  // Note handlers
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        await editorialApi.updateIdeaNote(id!, editingNote.id, noteContent);
        showSuccess('Notiz aktualisiert');
      } else {
        await editorialApi.createIdeaNote(id!, noteContent);
        showSuccess('Notiz erstellt');
      }
      setShowNoteModal(false);
      setEditingNote(null);
      setNoteContent('');
      loadNotes();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Notiz löschen?')) return;
    try {
      await editorialApi.deleteIdeaNote(id!, noteId);
      loadNotes();
    } catch (err: any) { showError(err.message); }
  };

  // Checklist handlers
  const handleAddCheckItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim() || !id) return;
    try {
      await editorialApi.createChecklistItem(id, newCheckItem.trim());
      setNewCheckItem('');
      loadChecklist();
    } catch (err: any) { showError(err.message); }
  };

  const handleToggleCheckItem = async (item: any) => {
    try {
      await editorialApi.updateChecklistItem(id!, item.id, { isDone: !item.isDone });
      loadChecklist();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteCheckItem = async (itemId: string) => {
    try {
      await editorialApi.deleteChecklistItem(id!, itemId);
      loadChecklist();
    } catch (err: any) { showError(err.message); }
  };

  // Create episode from idea
  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsCreatingEpisode(true);
    try {
      const result = await editorialApi.createEpisodeFromIdea(id, episodeForm);
      showSuccess('Episode erstellt!');
      navigate(`/episodes/${result.episodeId || result.id}`);
    } catch (err: any) { showError(err.message); }
    finally { setIsCreatingEpisode(false); }
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

  const TABS: { key: IdeaTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Übersicht', icon: <FileText size={15} /> },
    { key: 'research', label: 'Recherche', icon: <Search size={15} /> },
    { key: 'interview', label: 'Interview', icon: <Mic size={15} /> },
    { key: 'notes', label: 'Notizen', icon: <StickyNote size={15} /> },
    { key: 'checklist', label: 'Checkliste', icon: <CheckSquare size={15} /> },
    { key: 'episode', label: 'Episode erstellen', icon: <Rocket size={15} /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="text-text-muted mx-auto mb-4" />
        <p className="text-text-secondary">Idee nicht gefunden</p>
        <Link to="/editorial" className="btn-primary mt-4 inline-flex">Zurück</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/editorial" className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg mt-0.5 flex-shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status] || 'bg-obsidian-600 text-text-muted'}`}>
                {STATUS_LABELS[idea.status] || idea.status}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[idea.priority] || 'bg-obsidian-600 text-text-muted'}`}>
                {PRIORITY_LABELS[idea.priority] || idea.priority}
              </span>
              {idea.episodeId && (
                <Link to={`/episodes/${idea.episodeId}`} className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple flex items-center gap-1">
                  <Play size={10} /> Episode verknüpft
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text-primary mt-1 truncate">{idea.title}</h1>
            {idea.description && <p className="text-text-secondary text-sm mt-1 line-clamp-2">{idea.description}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => editorialApi.downloadIdeaPdf(id!)} className="btn-secondary text-sm">
            <Download size={14} /><span>PDF exportieren</span>
          </button>
          {can('canEditIdeas') && (
            <>
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">Abbrechen</button>
                  <button onClick={handleSaveOverview} disabled={isSaving} className="btn-primary text-sm">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Speichern</span>
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
                  <Edit2 size={14} /><span>Bearbeiten</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-obsidian-700">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-accent-purple text-accent-purple'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {isEditing ? (
              <div className="card space-y-4">
                <h3 className="font-semibold text-text-primary">Idee bearbeiten</h3>
                <div>
                  <label className="label">Titel *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Beschreibung</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input">
                      <option value="neu">Neu</option>
                      <option value="in_bearbeitung">In Bearbeitung</option>
                      <option value="bereit">Bereit</option>
                      <option value="archiviert">Archiviert</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Priorität</label>
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="input">
                      <option value="hoch">Hoch</option>
                      <option value="mittel">Mittel</option>
                      <option value="niedrig">Niedrig</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Zielgruppe</label>
                  <input value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} className="input" placeholder="z.B. Einsteiger, Fortgeschrittene..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Format</label>
                    <select value={form.episodeFormat} onChange={e => setForm(p => ({ ...p, episodeFormat: e.target.value }))} className="input">
                      <option value="">Kein Format</option>
                      <option value="interview">Interview</option>
                      <option value="solo">Solo</option>
                      <option value="panel">Panel / Runde</option>
                      <option value="storytelling">Storytelling</option>
                      <option value="news">News / Aktuelles</option>
                      <option value="tutorial">Tutorial</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Zieldauer (Min.)</label>
                    <input type="number" value={form.targetDuration} onChange={e => setForm(p => ({ ...p, targetDuration: e.target.value }))} className="input" placeholder="45" />
                  </div>
                </div>
                <div>
                  <label className="label">Zieldatum</label>
                  <input type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Tags (Enter zum Hinzufügen)</label>
                  <input value={form.tagInput} onChange={e => setForm(p => ({ ...p, tagInput: e.target.value }))} onKeyDown={addTag} className="input" placeholder="Tag eingeben..." />
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full">
                          {tag}<button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card space-y-4">
                <h3 className="font-semibold text-text-primary">Beschreibung</h3>
                {idea.description ? (
                  <p className="text-text-secondary whitespace-pre-wrap">{idea.description}</p>
                ) : (
                  <p className="text-text-muted italic text-sm">Keine Beschreibung vorhanden</p>
                )}
                {idea.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-obsidian-700">
                    {idea.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <div className="card space-y-3">
              <h3 className="font-semibold text-text-primary text-sm">Details</h3>
              {idea.targetAudience && (
                <div className="flex items-start gap-2">
                  <Users size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs text-text-muted">Zielgruppe</p><p className="text-sm text-text-primary">{idea.targetAudience}</p></div>
                </div>
              )}
              {idea.episodeFormat && (
                <div className="flex items-start gap-2">
                  <Mic size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs text-text-muted">Format</p><p className="text-sm text-text-primary capitalize">{idea.episodeFormat}</p></div>
                </div>
              )}
              {idea.targetDuration && (
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs text-text-muted">Zieldauer</p><p className="text-sm text-text-primary">{idea.targetDuration} Min.</p></div>
                </div>
              )}
              {idea.targetDate && (
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs text-text-muted">Zieldatum</p><p className="text-sm text-text-primary">{new Date(idea.targetDate).toLocaleDateString('de-DE')}</p></div>
                </div>
              )}
              {idea.assignedTo && (
                <div className="flex items-start gap-2">
                  <User size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs text-text-muted">Zuständig</p><p className="text-sm text-text-primary">{idea.assignedTo}</p></div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-text-muted">Erstellt</p><p className="text-sm text-text-primary">{new Date(idea.createdAt).toLocaleDateString('de-DE')}</p></div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="card">
              <h3 className="font-semibold text-text-primary text-sm mb-3">Fortschritt</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { label: 'Quellen', count: research.length, icon: <BookOpen size={14} /> },
                  { label: 'Dateien', count: uploads.length, icon: <Upload size={14} /> },
                  { label: 'Partner', count: partners.length, icon: <Users size={14} /> },
                  { label: 'Fragen', count: questions.length, icon: <List size={14} /> },
                  { label: 'Notizen', count: notes.length, icon: <StickyNote size={14} /> },
                  { label: 'Aufgaben', count: checklist.filter(c => c.isDone).length + '/' + checklist.length, icon: <CheckSquare size={14} /> },
                ].map(stat => (
                  <div key={stat.label} className="bg-obsidian-800 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1 text-text-muted mb-1">{stat.icon}</div>
                    <p className="text-lg font-bold text-text-primary">{stat.count}</p>
                    <p className="text-xs text-text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESEARCH TAB */}
      {activeTab === 'research' && (
        <div className="space-y-6">
          {/* Research Sources */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2"><BookOpen size={16} /> Quellen & Links ({research.length})</h3>
              {can('canEditIdeas') && (
                <button onClick={() => { setEditingResearch(null); setResearchForm({ title: '', url: '', type: 'link', description: '', content: '' }); setShowResearchModal(true); }} className="btn-primary text-sm">
                  <Plus size={14} /><span>Quelle hinzufügen</span>
                </button>
              )}
            </div>
            {research.length === 0 ? (
              <div className="card text-center py-10">
                <Globe size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">Noch keine Quellen</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {research.map(src => (
                  <div key={src.id} className="card group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-obsidian-700 text-text-muted px-1.5 py-0.5 rounded">{src.type}</span>
                          {src.status && <span className="text-xs text-text-muted">{src.status}</span>}
                        </div>
                        <p className="font-medium text-text-primary text-sm truncate">{src.title}</p>
                        {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-blue hover:underline flex items-center gap-1 mt-0.5 truncate"><ExternalLink size={10} />{src.url}</a>}
                        {src.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{src.description}</p>}
                      </div>
                      {can('canEditIdeas') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => { setEditingResearch(src); setResearchForm({ title: src.title, url: src.url || '', type: src.type, description: src.description || '', content: src.content || '' }); setShowResearchModal(true); }} className="p-1 text-text-muted hover:text-accent-blue"><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteResearch(src.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Uploads */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2"><Upload size={16} /> Dateien ({uploads.length})</h3>
              {can('canEditIdeas') && (
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="btn-primary text-sm">
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>Datei hochladen</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
            {uploads.length === 0 ? (
              <div className="card text-center py-10">
                <Upload size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">Noch keine Dateien</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploads.map(upload => (
                  <div key={upload.id} className="card flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-obsidian-700 rounded flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{upload.originalName}</p>
                        <p className="text-xs text-text-muted">{upload.filesize ? `${(upload.filesize / 1024).toFixed(1)} KB` : ''} · {new Date(upload.createdAt).toLocaleDateString('de-DE')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <a href={`/api/editorial/ideas/${id}/uploads/${upload.id}/download`} className="p-1.5 text-text-muted hover:text-accent-blue"><Download size={14} /></a>
                      {can('canEditIdeas') && (
                        <button onClick={() => handleDeleteUpload(upload.id)} className="p-1.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERVIEW TAB */}
      {activeTab === 'interview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Partners */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2"><Users size={16} /> Interview-Partner ({partners.length})</h3>
              {can('canEditInterviews') && (
                <button onClick={() => { setEditingPartner(null); setPartnerForm({ name: '', company: '', role: '', email: '', phone: '', bio: '', notes: '' }); setShowPartnerModal(true); }} className="btn-primary text-sm">
                  <Plus size={14} /><span>Partner</span>
                </button>
              )}
            </div>
            {partners.length === 0 ? (
              <div className="card text-center py-10">
                <Users size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">Noch keine Partner</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map(partner => (
                  <div key={partner.id} className={`card cursor-pointer border-2 transition-colors ${selectedPartnerId === partner.id ? 'border-accent-purple' : 'border-transparent'}`} onClick={() => setSelectedPartnerId(selectedPartnerId === partner.id ? null : partner.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{partner.name}</p>
                        {partner.company && <p className="text-xs text-text-muted">{partner.company}{partner.role ? ` · ${partner.role}` : ''}</p>}
                        {partner.email && <p className="text-xs text-accent-blue">{partner.email}</p>}
                      </div>
                      {can('canEditInterviews') && (
                        <button onClick={e => { e.stopPropagation(); setEditingPartner(partner); setPartnerForm({ name: partner.name, company: partner.company || '', role: partner.role || '', email: partner.email || '', phone: partner.phone || '', bio: partner.bio || '', notes: partner.notes || '' }); setShowPartnerModal(true); }} className="p-1 text-text-muted hover:text-accent-blue">
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2"><List size={16} /> Fragen ({questions.length})</h3>
              {can('canEditInterviews') && (
                <button onClick={() => { setEditingQuestion(null); setQuestionForm({ question: '', category: '', notes: '', partnerId: '' }); setShowQuestionModal(true); }} className="btn-primary text-sm">
                  <Plus size={14} /><span>Frage</span>
                </button>
              )}
            </div>
            {questions.length === 0 ? (
              <div className="card text-center py-10">
                <List size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">Noch keine Fragen</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="card group">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-text-muted font-mono mt-0.5 flex-shrink-0 w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{q.question}</p>
                        {q.category && <span className="text-xs text-text-muted">{q.category}</span>}
                        {q.notes && <p className="text-xs text-text-muted mt-1 italic">{q.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {q.approved ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Freigegeben</span>
                        ) : (
                          <span className="text-xs bg-obsidian-600 text-text-muted px-1.5 py-0.5 rounded-full">Entwurf</span>
                        )}
                        {can('canEditInterviews') && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => { setEditingQuestion(q); setQuestionForm({ question: q.question, category: q.category || '', notes: q.notes || '', partnerId: q.partnerId || '' }); setShowQuestionModal(true); }} className="p-1 text-text-muted hover:text-accent-blue"><Edit2 size={12} /></button>
                          </div>
                        )}
                        {can('canApproveInterviewQuestions') && (
                          <button onClick={() => handleApproveQuestion(q.id, !q.approved)} className={`p-1 ${q.approved ? 'text-green-400 hover:text-text-muted' : 'text-text-muted hover:text-green-400'}`}>
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2"><StickyNote size={16} /> Notizen ({notes.length})</h3>
            {can('canEditIdeas') && (
              <button onClick={() => { setEditingNote(null); setNoteContent(''); setShowNoteModal(true); }} className="btn-primary text-sm">
                <Plus size={14} /><span>Notiz</span>
              </button>
            )}
          </div>
          {notes.length === 0 ? (
            <div className="card text-center py-16">
              <StickyNote size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">Noch keine Notizen</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {notes.map(note => (
                <div key={note.id} className="card group relative">
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-text-muted mt-3">{new Date(note.createdAt).toLocaleDateString('de-DE')}</p>
                  {can('canEditIdeas') && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingNote(note); setNoteContent(note.content); setShowNoteModal(true); }} className="p-1 text-text-muted hover:text-accent-blue bg-obsidian-800 rounded"><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-text-muted hover:text-red-400 bg-obsidian-800 rounded"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECKLIST TAB */}
      {activeTab === 'checklist' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <CheckSquare size={16} /> Checkliste
              {checklist.length > 0 && (
                <span className="text-xs text-text-muted">({checklist.filter(c => c.isDone).length}/{checklist.length} erledigt)</span>
              )}
            </h3>
          </div>
          {can('canEditIdeas') && (
            <form onSubmit={handleAddCheckItem} className="flex gap-2 mb-4">
              <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} className="input flex-1" placeholder="Neue Aufgabe hinzufügen..." />
              <button type="submit" className="btn-primary"><Plus size={16} /></button>
            </form>
          )}
          {checklist.length === 0 ? (
            <div className="card text-center py-16">
              <CheckSquare size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">Noch keine Aufgaben</p>
            </div>
          ) : (
            <div className="space-y-2">
              {checklist.map(item => (
                <div key={item.id} className="card flex items-center gap-3 group">
                  <button onClick={() => handleToggleCheckItem(item)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.isDone ? 'bg-accent-purple border-accent-purple' : 'border-obsidian-500 hover:border-accent-purple'}`}>
                    {item.isDone && <Check size={12} className="text-white" />}
                  </button>
                  <span className={`flex-1 text-sm ${item.isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.title}</span>
                  {can('canEditIdeas') && (
                    <button onClick={() => handleDeleteCheckItem(item.id)} className="p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EPISODE CREATION TAB */}
      {activeTab === 'episode' && (
        <div className="max-w-2xl">
          {idea.episodeId ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-accent-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play size={32} className="text-accent-purple" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Episode bereits erstellt</h3>
              <p className="text-text-secondary mb-6">Diese Idee wurde bereits in eine Episode umgewandelt.</p>
              <Link to={`/episodes/${idea.episodeId}`} className="btn-primary mx-auto inline-flex">
                <Play size={16} /><span>Zur Episode</span>
              </Link>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-full flex items-center justify-center">
                  <Rocket size={20} className="text-accent-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Episode aus Idee erstellen</h3>
                  <p className="text-sm text-text-secondary">Alle gesammelten Infos werden in die neue Episode übertragen</p>
                </div>
              </div>

              <div className="bg-obsidian-800 rounded-lg p-4 mb-6 space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Was wird übertragen:</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
                  <div className="flex items-center gap-2"><Check size={13} className="text-green-400" /> Titel & Beschreibung</div>
                  <div className="flex items-center gap-2"><Check size={13} className="text-green-400" /> Notizen als Show Notes</div>
                  <div className="flex items-center gap-2"><Check size={13} className="text-green-400" /> Quellen-Links</div>
                  <div className="flex items-center gap-2"><Check size={13} className="text-green-400" /> Status: Entwurf</div>
                </div>
              </div>

              <form onSubmit={handleCreateEpisode} className="space-y-4">
                <div>
                  <label className="label">Episoden-Titel *</label>
                  <input value={episodeForm.title} onChange={e => setEpisodeForm(p => ({ ...p, title: e.target.value }))} className="input" required />
                </div>
                <div>
                  <label className="label">Kurzbeschreibung</label>
                  <textarea value={episodeForm.description} onChange={e => setEpisodeForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={3} />
                </div>
                <button type="submit" disabled={isCreatingEpisode || !can('canCreateEpisodes')} className="btn-primary w-full justify-center">
                  {isCreatingEpisode ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                  <span>Episode erstellen</span>
                </button>
                {!can('canCreateEpisodes') && <p className="text-xs text-text-muted text-center">Keine Berechtigung zum Erstellen von Episoden</p>}
              </form>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}

      {/* Research Modal */}
      {showResearchModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-obsidian-700">
              <h3 className="font-semibold text-text-primary">{editingResearch ? 'Quelle bearbeiten' : 'Quelle hinzufügen'}</h3>
              <button onClick={() => setShowResearchModal(false)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveResearch} className="p-5 space-y-4">
              <div>
                <label className="label">Titel *</label>
                <input value={researchForm.title} onChange={e => setResearchForm(p => ({ ...p, title: e.target.value }))} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Typ</label>
                  <select value={researchForm.type} onChange={e => setResearchForm(p => ({ ...p, type: e.target.value }))} className="input">
                    <option value="link">Link</option>
                    <option value="buch">Buch</option>
                    <option value="artikel">Artikel</option>
                    <option value="studie">Studie</option>
                    <option value="video">Video</option>
                    <option value="podcast">Podcast</option>
                    <option value="sonstiges">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="label">URL</label>
                  <input value={researchForm.url} onChange={e => setResearchForm(p => ({ ...p, url: e.target.value }))} className="input" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="label">Beschreibung</label>
                <textarea value={researchForm.description} onChange={e => setResearchForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={2} />
              </div>
              <div>
                <label className="label">Inhalt / Notizen</label>
                <textarea value={researchForm.content} onChange={e => setResearchForm(p => ({ ...p, content: e.target.value }))} className="textarea" rows={3} placeholder="Wichtige Punkte, Zitate..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowResearchModal(false)} className="btn-secondary">Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-obsidian-700">
              <h3 className="font-semibold text-text-primary">{editingPartner ? 'Partner bearbeiten' : 'Partner hinzufügen'}</h3>
              <button onClick={() => setShowPartnerModal(false)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePartner} className="p-5 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input value={partnerForm.name} onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Unternehmen</label>
                  <input value={partnerForm.company} onChange={e => setPartnerForm(p => ({ ...p, company: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Rolle / Titel</label>
                  <input value={partnerForm.role} onChange={e => setPartnerForm(p => ({ ...p, role: e.target.value }))} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">E-Mail</label>
                  <input type="email" value={partnerForm.email} onChange={e => setPartnerForm(p => ({ ...p, email: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input value={partnerForm.phone} onChange={e => setPartnerForm(p => ({ ...p, phone: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Bio / Hintergrund</label>
                <textarea value={partnerForm.bio} onChange={e => setPartnerForm(p => ({ ...p, bio: e.target.value }))} className="textarea" rows={2} />
              </div>
              <div>
                <label className="label">Interne Notizen</label>
                <textarea value={partnerForm.notes} onChange={e => setPartnerForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowPartnerModal(false)} className="btn-secondary">Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-obsidian-700">
              <h3 className="font-semibold text-text-primary">{editingQuestion ? 'Frage bearbeiten' : 'Frage hinzufügen'}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveQuestion} className="p-5 space-y-4">
              <div>
                <label className="label">Frage *</label>
                <textarea value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} className="textarea" rows={3} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kategorie</label>
                  <input value={questionForm.category} onChange={e => setQuestionForm(p => ({ ...p, category: e.target.value }))} className="input" placeholder="z.B. Einstieg, Vertiefung..." />
                </div>
                <div>
                  <label className="label">Partner</label>
                  <select value={questionForm.partnerId} onChange={e => setQuestionForm(p => ({ ...p, partnerId: e.target.value }))} className="input">
                    <option value="">Kein Partner</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Hintergrundinfos</label>
                <textarea value={questionForm.notes} onChange={e => setQuestionForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="btn-secondary">Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-obsidian-700">
              <h3 className="font-semibold text-text-primary">{editingNote ? 'Notiz bearbeiten' : 'Neue Notiz'}</h3>
              <button onClick={() => setShowNoteModal(false)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveNote} className="p-5 space-y-4">
              <div>
                <label className="label">Inhalt *</label>
                <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} className="textarea" rows={6} required autoFocus />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowNoteModal(false)} className="btn-secondary">Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
