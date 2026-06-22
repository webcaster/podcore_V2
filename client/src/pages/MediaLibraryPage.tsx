import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Search, Play, Pause, Volume2, Download, Trash2, Edit2,
  MessageSquare, Plus, Music, Mic2, Clock, HardDrive, X, Check,
  Library, SkipBack, SkipForward
} from 'lucide-react';
import { mediaApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const ASSET_TYPES = [
  { value: 'intro', label: 'Intro', color: 'text-accent-cyan' },
  { value: 'outro', label: 'Outro', color: 'text-accent-red' },
  { value: 'jingle', label: 'Jingle', color: 'text-accent-green' },
  { value: 'segment', label: 'Segment', color: 'text-accent-blue' },
  { value: 'ad', label: 'Werbung', color: 'text-accent-orange' },
  { value: 'interview', label: 'Interview', color: 'text-accent-purple' },
  { value: 'sfx', label: 'SFX', color: 'text-accent-cyan' },
  { value: 'music', label: 'Musik', color: 'text-accent-green' },
  { value: 'other', label: 'Sonstiges', color: 'text-text-muted' },
];

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MediaLibraryPage() {
  const { can, showSuccess, showError } = useApp();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [playingAsset, setPlayingAsset] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', type: 'other', description: '', tags: [] as string[], tagInput: '' });
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'other', description: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio player
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await mediaApi.list({ type: typeFilter || undefined, search: search || undefined });
      // Backend returns paginated object { items: [...], total: N }
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setAssets(items);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  // Audio player controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [playingAsset]);

  const playAsset = (asset: any) => {
    if (playingAsset?.id === asset.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setPlayingAsset(asset);
      setIsPlaying(false);
      setCurrentTime(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = mediaApi.getStreamUrl(asset.filename);
          audioRef.current.volume = volume;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 50);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadForm.name || uploadFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('type', uploadForm.type);
      if (uploadForm.description) formData.append('description', uploadForm.description);

      await mediaApi.upload(formData);
      showSuccess('Asset hochgeladen');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadForm({ name: '', type: 'other', description: '' });
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsUploading(false); }
  };

  const handleDelete = async (asset: any) => {
    if (!confirm(`Asset "${asset.name}" löschen?`)) return;
    try {
      await mediaApi.delete(asset.id);
      showSuccess('Asset gelöscht');
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      if (playingAsset?.id === asset.id) { setPlayingAsset(null); setIsPlaying(false); }
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await mediaApi.update(selectedAsset.id, { name: editForm.name, type: editForm.type, description: editForm.description, tags: editForm.tags });
      showSuccess('Asset aktualisiert');
      setShowEditModal(false);
      load();
      // Refresh selected
      const updated = await mediaApi.get(selectedAsset.id);
      setSelectedAsset(updated);
    } catch (err: any) { showError(err.message); }
  };

  const handleAddComment = async () => {
    if (!selectedAsset || !commentText.trim()) return;
    setIsAddingComment(true);
    try {
      const comment = await mediaApi.addComment(selectedAsset.id, { content: commentText.trim(), timestamp: playingAsset?.id === selectedAsset.id ? Math.floor(currentTime) : undefined });
      setSelectedAsset((prev: any) => ({ ...prev, comments: [...(prev.comments || []), comment] }));
      setCommentText('');
      showSuccess('Kommentar hinzugefügt');
    } catch (err: any) { showError(err.message); }
    finally { setIsAddingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedAsset) return;
    try {
      await mediaApi.deleteComment(selectedAsset.id, commentId);
      setSelectedAsset((prev: any) => ({ ...prev, comments: prev.comments.filter((c: any) => c.id !== commentId) }));
    } catch (err: any) { showError(err.message); }
  };

  const typeInfo = (type: string) => ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[8];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3"><Library size={24} className="text-accent-blue" />Media Library</h1>
          <p className="text-text-secondary text-sm mt-1">{assets.length} Assets</p>
        </div>
        {can('canUploadMedia') && (
          <button onClick={() => setShowUploadModal(true)} className="btn-primary"><Upload size={16} /><span>Asset hochladen</span></button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Assets suchen..." className="input pl-9" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select w-40">
          <option value="">Alle Typen</option>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Now Playing Bar */}
      {playingAsset && (
        <div className="card bg-obsidian-800 border-accent-purple/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Music size={18} className="text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-medium text-sm truncate">{playingAsset.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-text-muted text-xs">{formatDuration(currentTime)}</span>
                <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="flex-1 h-1 accent-purple-500 cursor-pointer" />
                <span className="text-text-muted text-xs">{formatDuration(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }} className="text-text-muted hover:text-text-primary"><SkipBack size={16} /></button>
              <button onClick={() => playAsset(playingAsset)} className="w-9 h-9 bg-accent-purple rounded-full flex items-center justify-center text-white hover:bg-accent-purple-dark transition-colors">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }} className="text-text-muted hover:text-text-primary"><SkipForward size={16} /></button>
              <div className="flex items-center gap-1 ml-2">
                <Volume2 size={14} className="text-text-muted" />
                <input type="range" min={0} max={1} step={0.1} value={volume} onChange={handleVolumeChange} className="w-16 h-1 accent-purple-500 cursor-pointer" />
              </div>
              <button onClick={() => { setPlayingAsset(null); audioRef.current?.pause(); setIsPlaying(false); }} className="text-text-muted hover:text-text-primary ml-1"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : assets.length === 0 ? (
            <div className="card text-center py-16">
              <Library size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary font-medium">Keine Assets gefunden</p>
              {can('canUploadMedia') && (
                <button onClick={() => setShowUploadModal(true)} className="btn-primary mt-4 mx-auto"><Upload size={16} /><span>Asset hochladen</span></button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(asset => {
                const ti = typeInfo(asset.type);
                const isSelected = selectedAsset?.id === asset.id;
                const isCurrentlyPlaying = playingAsset?.id === asset.id && isPlaying;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(isSelected ? null : asset)}
                    className={`card flex items-center gap-4 cursor-pointer transition-all group ${isSelected ? 'border-accent-blue/50 bg-accent-blue/5' : 'hover:border-surface-border-light'}`}
                  >
                    {/* Play button */}
                    <button
                      onClick={e => { e.stopPropagation(); playAsset(asset); }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isCurrentlyPlaying ? 'bg-accent-purple text-white' : 'bg-surface-overlay text-text-muted hover:bg-accent-purple hover:text-white'}`}
                    >
                      {isCurrentlyPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary font-medium truncate">{asset.name}</p>
                        <span className={`badge bg-surface-overlay text-xs ${ti.color}`}>{ti.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-text-muted text-xs">
                        <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(asset.duration)}</span>
                        <span className="flex items-center gap-1"><HardDrive size={11} />{formatBytes(asset.filesize)}</span>
                        {asset.comments?.length > 0 && (
                          <span className="flex items-center gap-1"><MessageSquare size={11} />{asset.comments.length}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={mediaApi.getStreamUrl(asset.filename)} download={asset.filename} onClick={e => e.stopPropagation()} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                        <Download size={14} />
                      </a>
                      {can('canUploadMedia') && (
                        <button onClick={e => { e.stopPropagation(); setSelectedAsset(asset); setEditForm({ name: asset.name, type: asset.type, description: asset.description || '', tags: asset.tags || [], tagInput: '' }); setShowEditModal(true); }} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {can('canDeleteMedia') && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(asset); }} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedAsset ? (
            <div className="card space-y-4 sticky top-0">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-text-primary">{selectedAsset.name}</h3>
                <button onClick={() => setSelectedAsset(null)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Typ</span>
                  <span className={typeInfo(selectedAsset.type).color}>{typeInfo(selectedAsset.type).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Dauer</span>
                  <span className="text-text-primary">{formatDuration(selectedAsset.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Größe</span>
                  <span className="text-text-primary">{formatBytes(selectedAsset.filesize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Hochgeladen</span>
                  <span className="text-text-primary">{new Date(selectedAsset.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
              </div>

              {selectedAsset.description && (
                <p className="text-text-secondary text-sm">{selectedAsset.description}</p>
              )}

              {selectedAsset.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAsset.tags.map((tag: string) => (
                    <span key={tag} className="badge bg-surface-overlay text-text-muted text-xs">{tag}</span>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div className="border-t border-surface-border pt-4">
                <h4 className="font-medium text-text-primary text-sm mb-3 flex items-center gap-2">
                  <MessageSquare size={14} />
                  Kommentare ({selectedAsset.comments?.length || 0})
                </h4>

                <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
                  {selectedAsset.comments?.length === 0 ? (
                    <p className="text-text-muted text-xs text-center py-2">Noch keine Kommentare</p>
                  ) : (
                    selectedAsset.comments?.map((comment: any) => (
                      <div key={comment.id} className="bg-obsidian-800 rounded-lg p-3 group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-secondary text-xs font-medium">{comment.userName}</span>
                          <div className="flex items-center gap-2">
                            {comment.timestamp && (
                              <span className="text-text-muted text-xs font-mono">{formatDuration(comment.timestamp)}</span>
                            )}
                            {can('canCommentMedia') && (
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-text-primary text-xs">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {can('canCommentMedia') && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      placeholder="Kommentar..."
                      className="input text-sm flex-1"
                    />
                    <button onClick={handleAddComment} disabled={!commentText.trim() || isAddingComment} className="btn-primary px-3">
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-text-muted">
              <Music size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Asset auswählen für Details</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Asset hochladen">
        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploadFile ? 'border-accent-green/50 bg-accent-green/5' : 'border-surface-border hover:border-accent-purple/50 hover:bg-accent-purple/5'}`}
          >
            <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) { setUploadFile(file); setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^/.]+$/, '') })); }
            }} />
            {uploadFile ? (
              <div>
                <Check size={24} className="text-accent-green mx-auto mb-2" />
                <p className="text-text-primary font-medium">{uploadFile.name}</p>
                <p className="text-text-muted text-sm">{formatBytes(uploadFile.size)}</p>
              </div>
            ) : (
              <div>
                <Upload size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary">Datei auswählen oder hierher ziehen</p>
                <p className="text-text-muted text-xs mt-1">MP3, WAV, AAC, OGG, FLAC, M4A (max. 500 MB)</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Name</label>
            <input type="text" value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="Asset-Name" />
          </div>
          <div>
            <label className="label">Typ</label>
            <select value={uploadForm.type} onChange={e => setUploadForm(p => ({ ...p, type: e.target.value }))} className="select">
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!uploadFile || isUploading} className="btn-primary">
              {isUploading ? 'Hochladen...' : 'Hochladen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Asset bearbeiten">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Typ</label>
            <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} className="select">
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={2} />
          </div>
          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {editForm.tags.map(tag => (
                <span key={tag} className="badge bg-accent-purple/20 text-accent-purple flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setEditForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="hover:text-accent-red">×</button>
                </span>
              ))}
            </div>
            <input type="text" value={editForm.tagInput} onChange={e => setEditForm(p => ({ ...p, tagInput: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && editForm.tagInput.trim()) { e.preventDefault(); if (!editForm.tags.includes(editForm.tagInput.trim())) setEditForm(p => ({ ...p, tags: [...p.tags, p.tagInput.trim()], tagInput: '' })); else setEditForm(p => ({ ...p, tagInput: '' })); } }} className="input" placeholder="Tag eingeben und Enter drücken..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
