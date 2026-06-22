import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Mic2, Music, Megaphone,
  FileText, ChevronDown, ChevronUp, Calendar, Clock, Tag, Users, Loader2,
  Download, Settings, Wrench, Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Quote, Code,
  Lightbulb, BarChart3, Cpu, Mic, Volume2, Film, Info
} from 'lucide-react';
import { episodesApi, adminApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

const BLOCK_TYPES = [
  { value: 'intro', label: 'Intro', color: 'text-accent-cyan', bg: 'bg-accent-cyan/20' },
  { value: 'segment', label: 'Segment', color: 'text-accent-blue', bg: 'bg-accent-blue/20' },
  { value: 'interview', label: 'Interview', color: 'text-accent-purple', bg: 'bg-accent-purple/20' },
  { value: 'ad', label: 'Werbung', color: 'text-accent-orange', bg: 'bg-accent-orange/20' },
  { value: 'jingle', label: 'Jingle', color: 'text-accent-green', bg: 'bg-accent-green/20' },
  { value: 'outro', label: 'Outro', color: 'text-accent-red', bg: 'bg-accent-red/20' },
  { value: 'custom', label: 'Benutzerdefiniert', color: 'text-text-secondary', bg: 'bg-surface-overlay' },
];

const STATUS_OPTIONS = [
  { value: 'idee', label: 'Idee', color: 'bg-surface-overlay text-text-muted' },
  { value: 'entwurf', label: 'Entwurf', color: 'bg-surface-overlay text-text-muted' },
  { value: 'aufnahme', label: 'Aufnahme', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'produktion', label: 'Produktion', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'geplant', label: 'Geplant', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'veroeffentlicht', label: 'Veröffentlicht', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'archiviert', label: 'Archiviert', color: 'bg-surface-overlay text-text-muted' },
];

// ── Rich Text Toolbar ──────────────────────────────────────────────────────
function RichTextToolbar({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string, value?: string) => {
    targetRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const buttons = [
    { icon: <Bold size={13} />, cmd: 'bold', title: 'Fett (Strg+B)' },
    { icon: <Italic size={13} />, cmd: 'italic', title: 'Kursiv (Strg+I)' },
    { icon: <Underline size={13} />, cmd: 'underline', title: 'Unterstrichen (Strg+U)' },
    null,
    { icon: <Heading1 size={13} />, cmd: 'formatBlock', value: 'h2', title: 'Überschrift 1' },
    { icon: <Heading2 size={13} />, cmd: 'formatBlock', value: 'h3', title: 'Überschrift 2' },
    { icon: <Quote size={13} />, cmd: 'formatBlock', value: 'blockquote', title: 'Zitat' },
    { icon: <Code size={13} />, cmd: 'formatBlock', value: 'pre', title: 'Code-Block' },
    null,
    { icon: <List size={13} />, cmd: 'insertUnorderedList', title: 'Aufzählung' },
    { icon: <ListOrdered size={13} />, cmd: 'insertOrderedList', title: 'Nummerierte Liste' },
    null,
    { icon: <AlignLeft size={13} />, cmd: 'justifyLeft', title: 'Linksbündig' },
    { icon: <AlignCenter size={13} />, cmd: 'justifyCenter', title: 'Zentriert' },
    { icon: <AlignRight size={13} />, cmd: 'justifyRight', title: 'Rechtsbündig' },
  ];

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 bg-obsidian-800 border-b border-surface-border rounded-t-lg">
      {buttons.map((btn, i) =>
        btn === null ? (
          <div key={i} className="w-px h-4 bg-surface-border mx-1" />
        ) : (
          <button
            key={i}
            type="button"
            title={btn.title}
            onMouseDown={e => { e.preventDefault(); exec(btn.cmd, (btn as any).value); }}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            {btn.icon}
          </button>
        )
      )}
    </div>
  );
}

// ── Rich Text Editor ───────────────────────────────────────────────────────
function RichTextEditor({
  value, onChange, placeholder, disabled, minHeight = 120
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!isComposing.current && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden">
      {!disabled && <RichTextToolbar targetRef={editorRef} />}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={`w-full bg-obsidian-900 text-text-primary text-sm p-4 focus:outline-none prose-editor ${disabled ? 'opacity-60 cursor-default' : ''}`}
      />
    </div>
  );
}

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();
  const [episode, setEpisode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'meta' | 'production' | 'technical'>('script');

  // Form state
  const [form, setForm] = useState<any>({});
  const [blocks, setBlocks] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Production info
  const [productionInfo, setProductionInfo] = useState('');

  // Technical data fields
  const [technicalData, setTechnicalData] = useState<Record<string, string>>({
    sampleRate: '',
    bitrate: '',
    format: '',
    channels: '',
    microphone: '',
    interface: '',
    daw: '',
    recordingLocation: '',
    mixedBy: '',
    masteredBy: '',
    musicLicense: '',
    introOutroMusic: '',
    additionalNotes: '',
  });

  useEffect(() => {
    if (!id) return;
    // Load global technical defaults first, then override with episode-specific data
    Promise.all([
      episodesApi.get(id),
      adminApi.getSettings().catch(() => null),
    ]).then(([ep, settings]) => {
        setEpisode(ep);
        setForm({
          title: ep.title || '',
          subtitle: ep.subtitle || '',
          description: ep.description || '',
          status: ep.status || 'entwurf',
          number: ep.number || '',
          recordingDate: ep.recordingDate?.slice(0, 10) || '',
          publishDate: ep.publishDate?.slice(0, 10) || '',
          hosts: ep.hosts?.join(', ') || '',
          guests: ep.guests?.join(', ') || '',
          tags: ep.tags || [],
          notes: ep.notes || '',
        });
        setBlocks(ep.blocks || []);
        setProductionInfo(ep.productionInfo || '');
        // Merge: global defaults first, then episode-specific values override
        const globalTech = settings?.technicalDefaults || {};
        const episodeTech = (ep.technicalData && typeof ep.technicalData === 'object') ? ep.technicalData : {};
        setTechnicalData(prev => ({ ...prev, ...globalTech, ...episodeTech }));
      })
      .catch(err => showError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const markDirty = () => setIsDirty(true);

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
    markDirty();
  };

  const updateTechnical = (key: string, value: string) => {
    setTechnicalData(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await episodesApi.update(id, {
        ...form,
        number: form.number ? parseInt(form.number) : null,
        hosts: form.hosts ? form.hosts.split(',').map((h: string) => h.trim()).filter(Boolean) : [],
        guests: form.guests ? form.guests.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
        blocks,
        productionInfo,
        technicalData,
      });
      setEpisode(updated);
      setIsDirty(false);
      showSuccess('Episode gespeichert');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    // First save if dirty
    if (isDirty) await handleSave();
    setIsExporting(true);
    try {
      const token = document.cookie.match(/token=([^;]+)/)?.[1] ||
        localStorage.getItem('token') || '';
      const res = await fetch(`/api/episodes/${id}/export-pdf`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('PDF-Export fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `episode-${episode?.number || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('PDF exportiert');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const addBlock = (type: string) => {
    const newBlock = {
      id: Math.random().toString(36).slice(2),
      type,
      title: BLOCK_TYPES.find(b => b.value === type)?.label || type,
      content: '',
      duration: null,
      order: blocks.length,
    };
    setBlocks(prev => [...prev, newBlock]);
    markDirty();
  };

  const updateBlock = (blockId: string, key: string, value: any) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, [key]: value } : b));
    markDirty();
  };

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    markDirty();
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const newBlocks = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
      return newBlocks;
    });
    markDirty();
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim();
      if (!form.tags.includes(tag)) {
        updateForm('tags', [...form.tags, tag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateForm('tags', form.tags.filter((t: string) => t !== tag));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Episode nicht gefunden</p>
        <Link to="/episodes" className="btn-secondary mt-4 inline-flex">Zurück</Link>
      </div>
    );
  }

  const blockType = (type: string) => BLOCK_TYPES.find(b => b.value === type) || BLOCK_TYPES[6];
  const statusInfo = STATUS_OPTIONS.find(s => s.value === episode.status) || STATUS_OPTIONS[1];

  const TABS = [
    { key: 'script', label: 'Script & Blöcke', icon: <FileText size={14} /> },
    { key: 'meta', label: 'Metadaten', icon: <Info size={14} /> },
    { key: 'production', label: 'Produktion', icon: <Wrench size={14} /> },
    { key: 'technical', label: 'Technische Daten', icon: <Cpu size={14} /> },
  ];

  const TECHNICAL_FIELDS = [
    { key: 'sampleRate', label: 'Sample Rate', placeholder: 'z.B. 48000 Hz', icon: <BarChart3 size={14} /> },
    { key: 'bitrate', label: 'Bitrate', placeholder: 'z.B. 320 kbps', icon: <BarChart3 size={14} /> },
    { key: 'format', label: 'Format', placeholder: 'z.B. MP3, AAC, WAV', icon: <FileText size={14} /> },
    { key: 'channels', label: 'Kanäle', placeholder: 'z.B. Stereo, Mono', icon: <Volume2 size={14} /> },
    { key: 'microphone', label: 'Mikrofon', placeholder: 'z.B. Shure SM7B', icon: <Mic size={14} /> },
    { key: 'interface', label: 'Audio Interface', placeholder: 'z.B. Focusrite Scarlett 2i2', icon: <Cpu size={14} /> },
    { key: 'daw', label: 'DAW / Software', placeholder: 'z.B. Adobe Audition, Reaper', icon: <Settings size={14} /> },
    { key: 'recordingLocation', label: 'Aufnahmeort', placeholder: 'z.B. Studio A, Remote', icon: <Mic2 size={14} /> },
    { key: 'mixedBy', label: 'Abmischung', placeholder: 'Name des Cutters', icon: <Users size={14} /> },
    { key: 'masteredBy', label: 'Mastering', placeholder: 'Name des Mastering-Engineers', icon: <Users size={14} /> },
    { key: 'musicLicense', label: 'Musik-Lizenz', placeholder: 'z.B. Epidemic Sound, Royalty Free', icon: <Music size={14} /> },
    { key: 'introOutroMusic', label: 'Intro/Outro Musik', placeholder: 'Titel und Künstler', icon: <Music size={14} /> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/episodes" className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {episode.number ? `#${episode.number} — ` : ''}{episode.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {isDirty && <span className="text-accent-orange text-xs">● Ungespeicherte Änderungen</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can('canViewEpisodes') && (
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-secondary"
              title="Episode als PDF exportieren"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>PDF Export</span>
            </button>
          )}
          {can('canEditEpisodes') && (
            <button onClick={handleSave} disabled={isSaving || !isDirty} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Speichern...' : 'Speichern'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-purple text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Content */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── SCRIPT & BLOCKS TAB ─────────────────────────── */}
          {activeTab === 'script' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary">Episode-Blöcke</h2>
                {can('canEditScript') && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {BLOCK_TYPES.map(bt => (
                      <button
                        key={bt.value}
                        onClick={() => addBlock(bt.value)}
                        className={`text-xs px-2 py-1 rounded-md ${bt.bg} ${bt.color} hover:opacity-80 transition-opacity`}
                      >
                        + {bt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {blocks.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Noch keine Blöcke. Füge Blöcke hinzu um das Script zu strukturieren.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, idx) => {
                    const bt = blockType(block.type);
                    return (
                      <div key={block.id} className="border border-surface-border rounded-xl overflow-hidden">
                        {/* Block Header */}
                        <div className={`flex items-center gap-3 px-4 py-3 ${bt.bg}`}>
                          <GripVertical size={14} className="text-text-muted cursor-grab flex-shrink-0" />
                          <span className={`text-xs font-bold uppercase tracking-wide ${bt.color} flex-shrink-0`}>{bt.label}</span>
                          <input
                            type="text"
                            value={block.title}
                            onChange={e => updateBlock(block.id, 'title', e.target.value)}
                            className="flex-1 bg-transparent text-text-primary text-sm font-medium focus:outline-none"
                            placeholder="Block-Titel..."
                            disabled={!can('canEditScript')}
                          />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-text-muted" />
                              <input
                                type="number"
                                value={block.duration || ''}
                                onChange={e => updateBlock(block.id, 'duration', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-16 bg-black/20 text-text-secondary text-xs rounded px-2 py-1 text-center focus:outline-none"
                                placeholder="Sek."
                                disabled={!can('canEditScript')}
                              />
                            </div>
                            {can('canEditScript') && (
                              <>
                                <button onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30">
                                  <ChevronUp size={14} />
                                </button>
                                <button onClick={() => moveBlock(block.id, 'down')} disabled={idx === blocks.length - 1} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30">
                                  <ChevronDown size={14} />
                                </button>
                                <button onClick={() => removeBlock(block.id)} className="p-1 text-text-muted hover:text-accent-red">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Block Content — Rich Text Editor */}
                        <div className="bg-obsidian-900">
                          <RichTextEditor
                            value={block.content || ''}
                            onChange={html => updateBlock(block.id, 'content', html)}
                            placeholder="Script-Text, Notizen oder Anweisungen..."
                            disabled={!can('canEditScript')}
                            minHeight={80}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── META TAB ────────────────────────────────────── */}
          {activeTab === 'meta' && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-text-primary">Metadaten</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Titel *</label>
                  <input type="text" value={form.title} onChange={e => updateForm('title', e.target.value)} className="input" disabled={!can('canEditEpisodes')} />
                </div>
                <div>
                  <label className="label">Nummer</label>
                  <input type="number" value={form.number} onChange={e => updateForm('number', e.target.value)} className="input" disabled={!can('canEditEpisodes')} />
                </div>
              </div>

              <div>
                <label className="label">Untertitel</label>
                <input type="text" value={form.subtitle} onChange={e => updateForm('subtitle', e.target.value)} className="input" disabled={!can('canEditEpisodes')} />
              </div>

              <div>
                <label className="label">Beschreibung (Shownotes)</label>
                <RichTextEditor
                  value={form.description}
                  onChange={html => updateForm('description', html)}
                  placeholder="Beschreibung der Episode für die Shownotes..."
                  disabled={!can('canEditEpisodes')}
                  minHeight={120}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Aufnahmedatum</label>
                  <input type="date" value={form.recordingDate} onChange={e => updateForm('recordingDate', e.target.value)} className="input" disabled={!can('canEditEpisodes')} />
                </div>
                <div>
                  <label className="label">Veröffentlichungsdatum</label>
                  <input type="date" value={form.publishDate} onChange={e => updateForm('publishDate', e.target.value)} className="input" disabled={!can('canEditEpisodes')} />
                </div>
              </div>

              <div>
                <label className="label">Hosts (kommagetrennt)</label>
                <input type="text" value={form.hosts} onChange={e => updateForm('hosts', e.target.value)} className="input" placeholder="Max Mustermann, Jane Doe" disabled={!can('canEditEpisodes')} />
              </div>

              <div>
                <label className="label">Gäste (kommagetrennt)</label>
                <input type="text" value={form.guests} onChange={e => updateForm('guests', e.target.value)} className="input" placeholder="Gast 1, Gast 2" disabled={!can('canEditEpisodes')} />
              </div>

              <div>
                <label className="label">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags?.map((tag: string) => (
                    <span key={tag} className="badge bg-accent-purple/20 text-accent-purple flex items-center gap-1">
                      {tag}
                      {can('canEditEpisodes') && (
                        <button onClick={() => removeTag(tag)} className="hover:text-accent-red ml-1">×</button>
                      )}
                    </span>
                  ))}
                </div>
                {can('canEditEpisodes') && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    className="input"
                    placeholder="Tag eingeben und Enter drücken..."
                  />
                )}
              </div>

              <div>
                <label className="label">Interne Notizen</label>
                <RichTextEditor
                  value={form.notes}
                  onChange={html => updateForm('notes', html)}
                  placeholder="Interne Notizen (nicht öffentlich)..."
                  disabled={!can('canEditEpisodes')}
                  minHeight={80}
                />
              </div>
            </div>
          )}

          {/* ── PRODUCTION TAB ──────────────────────────────── */}
          {activeTab === 'production' && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={18} className="text-accent-orange" />
                <h2 className="font-semibold text-text-primary">Produktions-Informationen</h2>
              </div>
              <p className="text-text-secondary text-sm">
                Interne Informationen für das Produktionsteam — Anweisungen, Hinweise, Besonderheiten.
                Diese Informationen erscheinen im PDF-Export im Abschnitt "Produktions-Informationen".
              </p>

              <RichTextEditor
                value={productionInfo}
                onChange={html => { setProductionInfo(html); markDirty(); }}
                placeholder="Produktionshinweise, Anweisungen für den Cutter, besondere Anforderungen, Zeitmarken, Übergänge, Soundeffekte, Musikeinsätze..."
                disabled={!can('canEditEpisodes')}
                minHeight={300}
              />

              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-accent-orange flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-text-secondary">
                    <p className="font-medium text-accent-orange mb-1">Tipp: Strukturierte Produktionsnotizen</p>
                    <p>Nutze Überschriften (H2/H3) für verschiedene Abschnitte wie "Schnittanweisungen", "Musikeinsätze", "Übergänge" oder "Besonderheiten". Diese Struktur hilft dem Produktionsteam beim schnellen Überblick.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TECHNICAL DATA TAB ──────────────────────────── */}
          {activeTab === 'technical' && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={18} className="text-accent-cyan" />
                <h2 className="font-semibold text-text-primary">Technische Daten</h2>
              </div>
              <p className="text-text-secondary text-sm">
                Technische Spezifikationen der Aufnahme und Produktion. Diese Daten werden im PDF-Export dokumentiert.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TECHNICAL_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="label flex items-center gap-1.5">
                      <span className="text-text-muted">{field.icon}</span>
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={technicalData[field.key] || ''}
                      onChange={e => updateTechnical(field.key, e.target.value)}
                      className="input"
                      placeholder={field.placeholder}
                      disabled={!can('canEditEpisodes')}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="label">Weitere technische Notizen</label>
                <textarea
                  value={technicalData.additionalNotes || ''}
                  onChange={e => updateTechnical('additionalNotes', e.target.value)}
                  className="textarea"
                  rows={4}
                  placeholder="Weitere technische Informationen, Besonderheiten der Aufnahme..."
                  disabled={!can('canEditEpisodes')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Info Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Status</h3>
            <select
              value={form.status}
              onChange={e => updateForm('status', e.target.value)}
              className="select"
              disabled={!can('canEditEpisodes')}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Overview */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Übersicht</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Blöcke</span>
                <span className="text-text-primary">{blocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Gesamtdauer</span>
                <span className="text-text-primary">
                  {(() => {
                    const total = blocks.reduce((s, b) => s + (b.duration || 0), 0);
                    if (total >= 60) return `${Math.floor(total / 60)}m ${total % 60}s`;
                    return `${total}s`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Erstellt</span>
                <span className="text-text-primary">
                  {new Date(episode.createdAt).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Geändert</span>
                <span className="text-text-primary">
                  {new Date(episode.updatedAt).toLocaleDateString('de-DE')}
                </span>
              </div>
              {technicalData.format && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Format</span>
                  <span className="text-text-primary">{technicalData.format}</span>
                </div>
              )}
              {technicalData.microphone && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Mikrofon</span>
                  <span className="text-text-primary text-xs">{technicalData.microphone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card space-y-2">
            <h3 className="font-semibold text-text-primary mb-3">Aktionen</h3>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-secondary w-full justify-center"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>Als PDF exportieren</span>
            </button>
            {can('canEditEpisodes') && isDirty && (
              <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full justify-center">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Speichern...' : 'Änderungen speichern'}</span>
              </button>
            )}
          </div>

          {/* Tab Navigation Hints */}
          <div className="card bg-accent-purple/5 border border-accent-purple/20">
            <h3 className="font-semibold text-accent-purple mb-2 text-sm">Tabs</h3>
            <ul className="space-y-1 text-xs text-text-secondary">
              <li className="flex items-center gap-2"><FileText size={11} className="text-accent-purple" /> Script & Blöcke</li>
              <li className="flex items-center gap-2"><Info size={11} className="text-accent-blue" /> Metadaten & Shownotes</li>
              <li className="flex items-center gap-2"><Wrench size={11} className="text-accent-orange" /> Produktionsinfos für das Team</li>
              <li className="flex items-center gap-2"><Cpu size={11} className="text-accent-cyan" /> Technische Spezifikationen</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Prose editor styles */}
      <style>{`
        .prose-editor { line-height: 1.6; }
        .prose-editor h2 { font-size: 1.2em; font-weight: 700; margin: 0.8em 0 0.4em; color: #e2e8f0; }
        .prose-editor h3 { font-size: 1.05em; font-weight: 600; margin: 0.6em 0 0.3em; color: #cbd5e1; }
        .prose-editor blockquote { border-left: 3px solid #7c3aed; padding-left: 12px; margin: 8px 0; color: #94a3b8; font-style: italic; }
        .prose-editor pre { background: #0f172a; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 0.85em; color: #7dd3fc; overflow-x: auto; }
        .prose-editor ul, .prose-editor ol { padding-left: 20px; margin: 6px 0; }
        .prose-editor li { margin: 2px 0; }
        .prose-editor strong { color: #f1f5f9; }
        .prose-editor em { color: #94a3b8; }
        .prose-editor [data-placeholder]:empty:before { content: attr(data-placeholder); color: #475569; pointer-events: none; }
      `}</style>
    </div>
  );
}
