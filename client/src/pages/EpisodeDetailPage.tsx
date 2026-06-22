import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Mic2, Music, Megaphone,
  FileText, ChevronDown, ChevronUp, Calendar, Clock, Tag, Users, Loader2
} from 'lucide-react';
import { episodesApi } from '../lib/api';
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
  { value: 'idee', label: 'Idee' },
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'aufnahme', label: 'Aufnahme' },
  { value: 'produktion', label: 'Produktion' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'veroeffentlicht', label: 'Veröffentlicht' },
  { value: 'archiviert', label: 'Archiviert' },
];

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();
  const [episode, setEpisode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'meta' | 'blocks'>('script');

  // Form state
  const [form, setForm] = useState<any>({});
  const [blocks, setBlocks] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!id) return;
    episodesApi.get(id)
      .then(ep => {
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
      })
      .catch(err => showError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const markDirty = () => setIsDirty(true);

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/episodes" className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {episode.number ? `#${episode.number} — ` : ''}{episode.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${
                episode.status === 'veroeffentlicht' ? 'bg-accent-green/20 text-accent-green' :
                episode.status === 'produktion' ? 'bg-accent-blue/20 text-accent-blue' :
                episode.status === 'aufnahme' ? 'bg-accent-orange/20 text-accent-orange' :
                episode.status === 'geplant' ? 'bg-accent-purple/20 text-accent-purple' :
                'bg-surface-overlay text-text-muted'
              }`}>
                {STATUS_OPTIONS.find(s => s.value === episode.status)?.label || episode.status}
              </span>
              {isDirty && <span className="text-accent-orange text-xs">● Ungespeicherte Änderungen</span>}
            </div>
          </div>
        </div>
        {can('canEditEpisodes') && (
          <button onClick={handleSave} disabled={isSaving || !isDirty} className="btn-primary">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Speichern...' : 'Speichern'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-lg w-fit">
        {[
          { key: 'script', label: 'Script & Blöcke' },
          { key: 'meta', label: 'Metadaten' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-purple text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Script / Blocks */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'script' && (
            <>
              {/* Blocks */}
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
                  <div className="space-y-3">
                    {blocks.map((block, idx) => {
                      const bt = blockType(block.type);
                      return (
                        <div key={block.id} className="border border-surface-border rounded-xl overflow-hidden">
                          <div className={`flex items-center gap-3 px-4 py-3 ${bt.bg}`}>
                            <GripVertical size={14} className="text-text-muted cursor-grab" />
                            <span className={`text-xs font-bold uppercase tracking-wide ${bt.color}`}>{bt.label}</span>
                            <input
                              type="text"
                              value={block.title}
                              onChange={e => updateBlock(block.id, 'title', e.target.value)}
                              className="flex-1 bg-transparent text-text-primary text-sm font-medium focus:outline-none"
                              placeholder="Block-Titel..."
                              disabled={!can('canEditScript')}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={block.duration || ''}
                                onChange={e => updateBlock(block.id, 'duration', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-16 bg-black/20 text-text-secondary text-xs rounded px-2 py-1 text-center focus:outline-none"
                                placeholder="Sek."
                                disabled={!can('canEditScript')}
                              />
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
                          <textarea
                            value={block.content || ''}
                            onChange={e => updateBlock(block.id, 'content', e.target.value)}
                            className="w-full bg-obsidian-900 text-text-primary text-sm p-4 focus:outline-none resize-none min-h-[80px]"
                            placeholder="Script-Text, Notizen oder Anweisungen..."
                            disabled={!can('canEditScript')}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

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
                <label className="label">Beschreibung</label>
                <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} className="textarea" rows={4} disabled={!can('canEditEpisodes')} />
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
                <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} className="textarea" rows={3} disabled={!can('canEditEpisodes')} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Info */}
        <div className="space-y-4">
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
                  {blocks.reduce((s, b) => s + (b.duration || 0), 0)} Sek.
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
            </div>
          </div>

          {can('canEditEpisodes') && isDirty && (
            <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full justify-center">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Speichern...' : 'Änderungen speichern'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
