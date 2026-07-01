import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Search, Play, Pause, Volume2, Download, Trash2, Edit2,
  MessageSquare, Plus, Music, Mic2, Clock, HardDrive, X, Check,
  Library, SkipBack, SkipForward, Folder, FolderPlus, ChevronRight,
  Scissors, Save, RotateCcw, Grid, List
} from 'lucide-react';
import { mediaApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import AudioEditor from '../components/AudioEditor';

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

// Audio-fähige Typen (alle außer rein visuelle Assets)
const AUDIO_TYPES = ['intro', 'outro', 'jingle', 'segment', 'ad', 'interview', 'sfx', 'music', 'other'];

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
  const [activeTab, setActiveTab] = useState<'library' | 'editor'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [playingAsset, setPlayingAsset] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Audio-Editor Tab State
  const [editorAsset, setEditorAsset] = useState<any>(null);
  const [editorSearch, setEditorSearch] = useState('');
  const [editorAssets, setEditorAssets] = useState<any[]>([]);
  const [isLoadingEditorAssets, setIsLoadingEditorAssets] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '', type: 'other', description: '', tags: [] as string[], tagInput: '', folderId: '',
    // Metadaten
    artist: '', album: '', year: '', genre: '', bpm: '', bitrate: '', sampleRate: '',
    channels: '', language: '', copyright: '', license: '', mood: '', energy: '',
    notes: '', sourceUrl: '', recordingDate: '', location: '',
    customMetadata: [] as { key: string; value: string }[],
    customMetaKey: '', customMetaValue: '',
  });
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'other', description: '', folderId: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio player
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Editor state (v2.9.8)
  const [, setTrimStart] = useState(0);
  const [, setTrimEnd] = useState(0);

  const load = async () => {
    setIsLoading(true);
    try {
      const [assetsData, foldersData] = await Promise.all([
        mediaApi.list({ type: typeFilter || undefined, search: search || undefined, folderId: currentFolderId }),
        mediaApi.listFolders({ parentId: currentFolderId })
      ]);
      setAssets(Array.isArray(assetsData) ? assetsData : (assetsData as any)?.items || []);
      setFolders(foldersData);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadEditorAssets = async (searchTerm?: string) => {
    setIsLoadingEditorAssets(true);
    try {
      const data = await mediaApi.list({ search: searchTerm || undefined });
      const all = Array.isArray(data) ? data : (data as any)?.items || [];
      setEditorAssets(all);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoadingEditorAssets(false); }
  };

  useEffect(() => { load(); }, [typeFilter, currentFolderId]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    if (activeTab === 'editor' && editorAssets.length === 0) {
      loadEditorAssets();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'editor') {
      const t = setTimeout(() => loadEditorAssets(editorSearch), 300);
      return () => clearTimeout(t);
    }
  }, [editorSearch]);

  // Audio player controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      setDuration(audio.duration);
    };
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
      formData.append('folderId', currentFolderId === 'root' ? '' : currentFolderId);
      if (uploadForm.description) formData.append('description', uploadForm.description);

      await mediaApi.upload(formData);
      showSuccess('Asset hochgeladen');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadForm({ name: '', type: 'other', description: '', folderId: '' });
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsUploading(false); }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await mediaApi.createFolder({ name: newFolderName.trim(), parentId: currentFolderId === 'root' ? null : currentFolderId });
      showSuccess('Ordner erstellt');
      setNewFolderName('');
      setShowFolderModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Ordner "${name}" löschen? Enthaltene Dateien werden in das Hauptverzeichnis verschoben.`)) return;
    try {
      await mediaApi.deleteFolder(id);
      showSuccess('Ordner gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const navigateToFolder = (folder: any) => {
    if (folder === 'root') {
      setCurrentFolderId('root');
      setFolderPath([]);
    } else {
      setCurrentFolderId(folder.id);
      setFolderPath(prev => [...prev, folder]);
    }
  };

  const navigateBack = () => {
    if (folderPath.length === 0) return;
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : 'root');
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
      await mediaApi.update(selectedAsset.id, {
        name: editForm.name,
        type: editForm.type,
        description: editForm.description,
        tags: editForm.tags,
        folderId: editForm.folderId,
        // Metadaten
        artist: editForm.artist || null,
        album: editForm.album || null,
        year: editForm.year ? parseInt(editForm.year) : null,
        genre: editForm.genre || null,
        bpm: editForm.bpm ? parseInt(editForm.bpm) : null,
        bitrate: editForm.bitrate ? parseInt(editForm.bitrate) : null,
        sampleRate: editForm.sampleRate ? parseInt(editForm.sampleRate) : null,
        channels: editForm.channels ? parseInt(editForm.channels) : null,
        language: editForm.language || null,
        copyright: editForm.copyright || null,
        license: editForm.license || null,
        mood: editForm.mood || null,
        energy: editForm.energy || null,
        notes: editForm.notes || null,
        sourceUrl: editForm.sourceUrl || null,
        recordingDate: editForm.recordingDate || null,
        location: editForm.location || null,
        customMetadata: editForm.customMetadata.length > 0 ? editForm.customMetadata : null,
      });
      showSuccess('Asset aktualisiert');
      setShowEditModal(false);
      load();
      const updated = await mediaApi.get(selectedAsset.id);
      setSelectedAsset(updated);
    } catch (err: any) { showError(err.message); }
  };

  const handleAddComment = async () => {
    if (!selectedAsset || !commentText.trim()) return;
    setIsAddingComment(true);
    try {
      const comment = await mediaApi.addComment(selectedAsset.id, {
        content: commentText.trim(),
        timestamp: playingAsset?.id === selectedAsset.id ? Math.floor(currentTime) : undefined
      });
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

  const openInEditor = (asset: any) => {
    setEditorAsset(asset);
    setActiveTab('editor');
  };

  const typeInfo = (type: string) => ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[8];

  return (
    <div className="space-y-6 animate-fade-in">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3"><Library size={24} className="text-accent-blue" />Media Library</h1>
          {activeTab === 'library' && (
            <div className="flex items-center gap-2 mt-1 text-sm">
              <button onClick={() => navigateToFolder('root')} className="text-text-muted hover:text-text-primary">Media</button>
              {folderPath.map((f, i) => (
                <React.Fragment key={f.id}>
                  <ChevronRight size={14} className="text-text-muted" />
                  <button onClick={() => {
                    const newPath = folderPath.slice(0, i + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(f.id);
                  }} className="text-text-muted hover:text-text-primary">{f.name}</button>
                </React.Fragment>
              ))}
            </div>
          )}
          {activeTab === 'editor' && editorAsset && (
            <p className="text-text-muted text-sm mt-1">
              Bearbeite: <span className="text-text-primary font-medium">{editorAsset.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {activeTab === 'library' && (
            <>
              <button onClick={() => setShowFolderModal(true)} className="btn-secondary"><FolderPlus size={16} /><span>Ordner</span></button>
              {can('canUploadMedia') && (
                <button onClick={() => setShowUploadModal(true)} className="btn-primary"><Upload size={16} /><span>Asset hochladen</span></button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Grid size={15} /> Bibliothek
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'editor' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Scissors size={15} /> Audio-Editor
        </button>
      </div>

      {/* ── TAB: BIBLIOTHEK ─────────────────────────────────────────────── */}
      {activeTab === 'library' && (
        <>
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
            {/* Assets & Folders List */}
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
              ) : (assets.length === 0 && folders.length === 0) ? (
                <div className="card text-center py-16">
                  <Library size={40} className="text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary font-medium">Dieser Ordner ist leer</p>
                  {can('canUploadMedia') && (
                    <button onClick={() => setShowUploadModal(true)} className="btn-primary mt-4 mx-auto"><Upload size={16} /><span>Asset hochladen</span></button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Folders */}
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => navigateToFolder(folder)}
                      className="card flex items-center gap-4 cursor-pointer hover:border-surface-border-light group py-3"
                    >
                      <div className="w-10 h-10 bg-accent-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Folder size={18} className="text-accent-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium truncate">{folder.name}</p>
                        <p className="text-text-muted text-xs">Ordner</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Assets */}
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
                        <button
                          onClick={e => { e.stopPropagation(); playAsset(asset); }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isCurrentlyPlaying ? 'bg-accent-purple text-white' : 'bg-surface-overlay text-text-muted hover:bg-accent-purple hover:text-white'}`}
                        >
                          {isCurrentlyPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>

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

                        <div className="flex items-center gap-1">
                          {/* Audio-Editor öffnen – für alle Assets mit Audiodatei */}
                          <button
                            onClick={e => { e.stopPropagation(); openInEditor(asset); }}
                            className="p-2 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors"
                            title="Im Audio-Editor öffnen"
                          >
                            <Scissors size={14} />
                          </button>
                          <a href={mediaApi.getStreamUrl(asset.filename)} download={asset.filename} onClick={e => e.stopPropagation()} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                            <Download size={14} />
                          </a>
                          {can('canUploadMedia') && (
                            <button onClick={e => { e.stopPropagation(); setSelectedAsset(asset); setEditForm({
                              name: asset.name, type: asset.type, description: asset.description || '',
                              tags: asset.tags || [], tagInput: '', folderId: asset.folderId || '',
                              artist: asset.artist || '', album: asset.album || '',
                              year: asset.year ? String(asset.year) : '', genre: asset.genre || '',
                              bpm: asset.bpm ? String(asset.bpm) : '', bitrate: asset.bitrate ? String(asset.bitrate) : '',
                              sampleRate: asset.sampleRate ? String(asset.sampleRate) : '',
                              channels: asset.channels ? String(asset.channels) : '',
                              language: asset.language || '', copyright: asset.copyright || '',
                              license: asset.license || '', mood: asset.mood || '', energy: asset.energy || '',
                              notes: asset.notes || '', sourceUrl: asset.sourceUrl || '',
                              recordingDate: asset.recordingDate || '', location: asset.location || '',
                              customMetadata: asset.customMetadata || [],
                              customMetaKey: '', customMetaValue: '',
                            }); setShowEditModal(true); }} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
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

                  {/* Metadaten-Anzeige im Detail-Panel */}
                  {(selectedAsset.artist || selectedAsset.album || selectedAsset.genre || selectedAsset.year ||
                    selectedAsset.bpm || selectedAsset.language || selectedAsset.copyright ||
                    selectedAsset.license || selectedAsset.mood || selectedAsset.energy ||
                    selectedAsset.recordingDate || selectedAsset.location || selectedAsset.notes ||
                    selectedAsset.sourceUrl || (selectedAsset.customMetadata?.length > 0)) && (
                    <div className="border-t border-surface-border pt-3">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Metadaten</p>
                      <div className="space-y-1.5 text-xs">
                        {selectedAsset.artist && <div className="flex justify-between"><span className="text-text-muted">Künstler</span><span className="text-text-primary truncate ml-2">{selectedAsset.artist}</span></div>}
                        {selectedAsset.album && <div className="flex justify-between"><span className="text-text-muted">Album</span><span className="text-text-primary truncate ml-2">{selectedAsset.album}</span></div>}
                        {selectedAsset.genre && <div className="flex justify-between"><span className="text-text-muted">Genre</span><span className="text-text-primary">{selectedAsset.genre}</span></div>}
                        {selectedAsset.year && <div className="flex justify-between"><span className="text-text-muted">Jahr</span><span className="text-text-primary">{selectedAsset.year}</span></div>}
                        {selectedAsset.bpm && <div className="flex justify-between"><span className="text-text-muted">BPM</span><span className="text-text-primary">{selectedAsset.bpm}</span></div>}
                        {selectedAsset.language && <div className="flex justify-between"><span className="text-text-muted">Sprache</span><span className="text-text-primary">{selectedAsset.language}</span></div>}
                        {selectedAsset.mood && <div className="flex justify-between"><span className="text-text-muted">Stimmung</span><span className="text-text-primary capitalize">{selectedAsset.mood}</span></div>}
                        {selectedAsset.energy && <div className="flex justify-between"><span className="text-text-muted">Energie</span><span className="text-text-primary capitalize">{selectedAsset.energy}</span></div>}
                        {selectedAsset.license && <div className="flex justify-between"><span className="text-text-muted">Lizenz</span><span className="text-text-primary">{selectedAsset.license}</span></div>}
                        {selectedAsset.copyright && <div className="flex justify-between"><span className="text-text-muted">Copyright</span><span className="text-text-primary truncate ml-2">{selectedAsset.copyright}</span></div>}
                        {selectedAsset.recordingDate && <div className="flex justify-between"><span className="text-text-muted">Aufnahme</span><span className="text-text-primary">{new Date(selectedAsset.recordingDate).toLocaleDateString('de-DE')}</span></div>}
                        {selectedAsset.location && <div className="flex justify-between"><span className="text-text-muted">Ort</span><span className="text-text-primary truncate ml-2">{selectedAsset.location}</span></div>}
                        {selectedAsset.bitrate && <div className="flex justify-between"><span className="text-text-muted">Bitrate</span><span className="text-text-primary">{selectedAsset.bitrate} kbps</span></div>}
                        {selectedAsset.sampleRate && <div className="flex justify-between"><span className="text-text-muted">Sample Rate</span><span className="text-text-primary">{selectedAsset.sampleRate} Hz</span></div>}
                        {selectedAsset.channels && <div className="flex justify-between"><span className="text-text-muted">Kanäle</span><span className="text-text-primary">{selectedAsset.channels === 1 ? 'Mono' : selectedAsset.channels === 2 ? 'Stereo' : `${selectedAsset.channels} ch`}</span></div>}
                        {selectedAsset.notes && (
                          <div className="pt-1">
                            <p className="text-text-muted mb-1">Notizen</p>
                            <p className="text-text-secondary bg-obsidian-800 p-2 rounded text-xs">{selectedAsset.notes}</p>
                          </div>
                        )}
                        {selectedAsset.sourceUrl && (
                          <div className="flex justify-between items-center">
                            <span className="text-text-muted">Quelle</span>
                            <a href={selectedAsset.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline truncate ml-2 max-w-[120px]">Link</a>
                          </div>
                        )}
                        {selectedAsset.customMetadata?.map((m: any, i: number) => (
                          <div key={i} className="flex justify-between"><span className="text-text-muted">{m.key}</span><span className="text-text-primary truncate ml-2">{m.value}</span></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio-Editor-Button im Detail-Panel */}
                  <button
                    onClick={() => openInEditor(selectedAsset)}
                    className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Scissors size={14} /> Im Audio-Editor öffnen
                  </button>

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
                              <span className="text-text-secondary text-xs font-medium">{comment.userName || comment.displayName || comment.username || 'Unbekannt'}</span>
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
                            <p className="text-text-primary text-xs">{comment.content || comment.text}</p>
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
        </>
      )}

      {/* ── TAB: AUDIO-EDITOR ──────────────────────────────────────────── */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {editorAsset ? (
            /* Vollständiger Audio-Editor für das gewählte Asset */
            <div className="space-y-3">
              {/* Asset-Wechsel-Leiste */}
              <div className="flex items-center gap-3 p-3 bg-obsidian-800 rounded-xl border border-surface-border">
                <div className="w-8 h-8 bg-accent-purple/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scissors size={15} className="text-accent-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{editorAsset.name}</p>
                  <p className="text-[10px] text-text-muted uppercase">{typeInfo(editorAsset.type).label} · {formatDuration(editorAsset.duration)}</p>
                </div>
                <button
                  onClick={() => setEditorAsset(null)}
                  className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                  title="Anderes Asset wählen"
                >
                  <RotateCcw size={12} /> Wechseln
                </button>
              </div>

              {/* AudioEditor-Komponente (inline, ohne Modal-Wrapper) */}
              <AudioEditorInline
                asset={editorAsset}
                onSaved={() => { showSuccess('Änderungen gespeichert'); load(); }}
              />
            </div>
          ) : (
            /* Asset-Auswahl für den Editor */
            <div className="space-y-4">
              <div className="card">
                <div className="mb-4">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
                    <Scissors size={16} className="text-accent-purple" /> Audio-Editor
                  </h2>
                  <p className="text-sm text-text-muted">
                    Wähle eine Audio-Datei aus der Bibliothek, um Schnittmarken zu setzen, Kapitel zu definieren und Notizen für den Schnitt zu hinterlegen.
                    Ideal für die Vorplanung von Interviews und komplexen Episoden.
                  </p>
                </div>

                {/* Suchfeld */}
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={editorSearch}
                    onChange={e => setEditorSearch(e.target.value)}
                    placeholder="Audio-Datei suchen..."
                    className="input pl-9 text-sm"
                  />
                </div>

                {/* Asset-Liste */}
                {isLoadingEditorAssets ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : editorAssets.length === 0 ? (
                  <div className="text-center py-10 text-text-muted">
                    <Music size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Keine Audio-Dateien gefunden</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {editorAssets.map(asset => {
                      const ti = typeInfo(asset.type);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => setEditorAsset(asset)}
                          className="w-full flex items-center gap-3 p-3 bg-obsidian-800 hover:bg-obsidian-700 rounded-xl border border-surface-border hover:border-accent-purple/40 transition-all text-left group"
                        >
                          <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent-purple/20 transition-colors">
                            <Music size={16} className="text-text-muted group-hover:text-accent-purple transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{asset.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-text-muted text-xs">
                              <span className={ti.color}>{ti.label}</span>
                              <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(asset.duration)}</span>
                              <span className="flex items-center gap-1"><HardDrive size={10} /> {formatBytes(asset.filesize)}</span>
                              {(asset.markers?.length > 0 || asset.markerCount > 0) && (
                                <span className="flex items-center gap-1 text-accent-orange">
                                  <Scissors size={10} /> {asset.markers?.length || asset.markerCount} Marker
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-accent-purple font-medium flex items-center gap-1">
                              <Scissors size={12} /> Öffnen
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hinweis-Karte */}
              <div className="card bg-accent-purple/5 border-accent-purple/20">
                <h3 className="text-sm font-semibold text-accent-purple mb-2 flex items-center gap-2">
                  <Scissors size={14} /> Marker-Typen im Audio-Editor
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: '✂', label: 'Schnittmarke', desc: 'Markiert Schnittpunkte', color: 'text-red-400' },
                    { icon: '📖', label: 'Kapitel', desc: 'Kapitel-Beginn', color: 'text-accent-blue' },
                    { icon: '▶', label: 'Start', desc: 'Nutzbare Startposition', color: 'text-accent-green' },
                    { icon: '⏹', label: 'Ende', desc: 'Nutzbare Endposition', color: 'text-accent-orange' },
                    { icon: '💬', label: 'Anmerkung', desc: 'Notiz für Produktion', color: 'text-accent-purple' },
                  ].map(m => (
                    <div key={m.label} className="flex items-start gap-2 p-2 bg-obsidian-800 rounded-lg">
                      <span className={`text-base ${m.color}`}>{m.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-text-primary">{m.label}</p>
                        <p className="text-[10px] text-text-muted">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Folder Modal */}
      <Modal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} title="Neuen Ordner erstellen">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="label">Ordnername</label>
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="input" placeholder="z.B. Interviews 2024" autoFocus />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowFolderModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!newFolderName.trim()} className="btn-primary">Erstellen</button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Asset hochladen">
        <form onSubmit={handleUpload} className="space-y-4">
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
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Asset bearbeiten" size="lg">
        <AssetEditForm
          editForm={editForm}
          setEditForm={setEditForm}
          onSubmit={handleEditSave}
          onClose={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}

// ── AssetEditForm-Komponente (mit eigenem Tab-State) ──────────────────────────
function AssetEditForm({ editForm, setEditForm, onSubmit, onClose }: {
  editForm: any;
  setEditForm: (fn: (p: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const [metaTab, setMetaTab] = useState<'basis' | 'audio' | 'rechte' | 'custom'>('basis');
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="flex gap-1 mb-4 bg-obsidian-800 p-1 rounded-lg">
        {(['basis', 'audio', 'rechte', 'custom'] as const).map(t => (
          <button key={t} type="button" onClick={() => setMetaTab(t)}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
              metaTab === t ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}>
            {t === 'basis' ? 'Basis' : t === 'audio' ? 'Audio-Info' : t === 'rechte' ? 'Rechte & Lizenz' : 'Eigene Felder'}
          </button>
        ))}
      </div>

                {/* Basis-Tab */}
                {metaTab === 'basis' && (
                  <div className="space-y-3">
                    <div>
                      <label className="label">Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Typ</label>
                        <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} className="select">
                          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Sprache</label>
                        <input type="text" value={editForm.language} onChange={e => setEditForm(p => ({ ...p, language: e.target.value }))} className="input" placeholder="z.B. de, en" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Beschreibung</label>
                      <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={2} />
                    </div>
                    <div>
                      <label className="label">Notizen (intern)</label>
                      <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} placeholder="Interne Produktionsnotizen..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Aufnahmedatum</label>
                        <input type="date" value={editForm.recordingDate} onChange={e => setEditForm(p => ({ ...p, recordingDate: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">Aufnahmeort</label>
                        <input type="text" value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className="input" placeholder="Studio, Ort..." />
                      </div>
                    </div>
                    <div>
                      <label className="label">Quelle / URL</label>
                      <input type="url" value={editForm.sourceUrl} onChange={e => setEditForm(p => ({ ...p, sourceUrl: e.target.value }))} className="input" placeholder="https://..." />
                    </div>
                    {/* Tags */}
                    <div>
                      <label className="label">Tags</label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {editForm.tags.map((tag, i) => (
                          <span key={i} className="badge bg-surface-overlay text-text-muted text-xs flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => setEditForm(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))} className="hover:text-accent-red"><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={editForm.tagInput}
                        onChange={e => setEditForm(p => ({ ...p, tagInput: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const t = editForm.tagInput.trim();
                            if (t && !editForm.tags.includes(t)) setEditForm(p => ({ ...p, tags: [...p.tags, t], tagInput: '' }));
                          }
                        }}
                        className="input text-sm"
                        placeholder="Tag eingeben und Enter drücken..."
                      />
                    </div>
                  </div>
                )}

                {/* Audio-Info-Tab */}
                {metaTab === 'audio' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Künstler / Sprecher</label>
                        <input type="text" value={editForm.artist} onChange={e => setEditForm(p => ({ ...p, artist: e.target.value }))} className="input" placeholder="Name..." />
                      </div>
                      <div>
                        <label className="label">Album / Projekt</label>
                        <input type="text" value={editForm.album} onChange={e => setEditForm(p => ({ ...p, album: e.target.value }))} className="input" placeholder="Album..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Genre</label>
                        <input type="text" value={editForm.genre} onChange={e => setEditForm(p => ({ ...p, genre: e.target.value }))} className="input" placeholder="z.B. Podcast, Jingle" />
                      </div>
                      <div>
                        <label className="label">Jahr</label>
                        <input type="number" value={editForm.year} onChange={e => setEditForm(p => ({ ...p, year: e.target.value }))} className="input" placeholder="2024" min="1900" max="2099" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">BPM</label>
                        <input type="number" value={editForm.bpm} onChange={e => setEditForm(p => ({ ...p, bpm: e.target.value }))} className="input" placeholder="120" min="1" max="999" />
                      </div>
                      <div>
                        <label className="label">Bitrate (kbps)</label>
                        <input type="number" value={editForm.bitrate} onChange={e => setEditForm(p => ({ ...p, bitrate: e.target.value }))} className="input" placeholder="320" />
                      </div>
                      <div>
                        <label className="label">Sample Rate (Hz)</label>
                        <input type="number" value={editForm.sampleRate} onChange={e => setEditForm(p => ({ ...p, sampleRate: e.target.value }))} className="input" placeholder="44100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Kanäle</label>
                        <select value={editForm.channels} onChange={e => setEditForm(p => ({ ...p, channels: e.target.value }))} className="select">
                          <option value="">—</option>
                          <option value="1">1 (Mono)</option>
                          <option value="2">2 (Stereo)</option>
                          <option value="6">6 (5.1 Surround)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Stimmung / Mood</label>
                        <select value={editForm.mood} onChange={e => setEditForm(p => ({ ...p, mood: e.target.value }))} className="select">
                          <option value="">—</option>
                          <option value="energetic">Energetisch</option>
                          <option value="calm">Ruhig</option>
                          <option value="dramatic">Dramatisch</option>
                          <option value="uplifting">Aufbauend</option>
                          <option value="dark">Dunkel</option>
                          <option value="neutral">Neutral</option>
                          <option value="funny">Humorvoll</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Energie-Level</label>
                      <select value={editForm.energy} onChange={e => setEditForm(p => ({ ...p, energy: e.target.value }))} className="select">
                        <option value="">—</option>
                        <option value="low">Niedrig</option>
                        <option value="medium">Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="very-high">Sehr hoch</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Rechte & Lizenz-Tab */}
                {metaTab === 'rechte' && (
                  <div className="space-y-3">
                    <div>
                      <label className="label">Copyright</label>
                      <input type="text" value={editForm.copyright} onChange={e => setEditForm(p => ({ ...p, copyright: e.target.value }))} className="input" placeholder="© 2024 Mein Podcast" />
                    </div>
                    <div>
                      <label className="label">Lizenz</label>
                      <select value={editForm.license} onChange={e => setEditForm(p => ({ ...p, license: e.target.value }))} className="select">
                        <option value="">—</option>
                        <option value="all-rights-reserved">Alle Rechte vorbehalten</option>
                        <option value="cc-by">CC BY 4.0</option>
                        <option value="cc-by-sa">CC BY-SA 4.0</option>
                        <option value="cc-by-nc">CC BY-NC 4.0</option>
                        <option value="cc-by-nc-sa">CC BY-NC-SA 4.0</option>
                        <option value="cc0">CC0 (Public Domain)</option>
                        <option value="royalty-free">Royalty Free</option>
                        <option value="licensed">Lizenziert</option>
                        <option value="custom">Eigene Lizenz</option>
                      </select>
                    </div>
                    <div className="p-3 bg-obsidian-800 rounded-lg border border-surface-border">
                      <p className="text-xs text-text-muted">
                        Die Lizenz-Information wird im Asset gespeichert und kann bei der Produktion und im Export berücksichtigt werden.
                      </p>
                    </div>
                  </div>
                )}

                {/* Eigene Felder-Tab */}
                {metaTab === 'custom' && (
                  <div className="space-y-3">
                    <p className="text-xs text-text-muted">Füge beliebige eigene Schlüssel-Wert-Paare hinzu.</p>
                    {editForm.customMetadata.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.key}
                          onChange={e => setEditForm(p => ({ ...p, customMetadata: p.customMetadata.map((m, j) => j === i ? { ...m, key: e.target.value } : m) }))}
                          className="input text-sm flex-1"
                          placeholder="Schlüssel"
                        />
                        <input
                          type="text"
                          value={item.value}
                          onChange={e => setEditForm(p => ({ ...p, customMetadata: p.customMetadata.map((m, j) => j === i ? { ...m, value: e.target.value } : m) }))}
                          className="input text-sm flex-1"
                          placeholder="Wert"
                        />
                        <button type="button" onClick={() => setEditForm(p => ({ ...p, customMetadata: p.customMetadata.filter((_, j) => j !== i) }))} className="p-2 text-text-muted hover:text-accent-red">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, customMetadata: [...p.customMetadata, { key: '', value: '' }] }))}
                      className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={14} /> Feld hinzufügen
                    </button>
                  </div>
                )}

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-border">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" className="btn-primary flex items-center gap-2"><Save size={14} /> Speichern</button>
      </div>
    </form>
  );
}

// ── Inline Audio-Editor (ohne Modal-Wrapper) ──────────────────────────────────
// Wrapper-Komponente, die den AudioEditor ohne den Fixed-Overlay rendert
function AudioEditorInline({ asset, onSaved }: { asset: any; onSaved?: () => void }) {
  // Wir nutzen den bestehenden AudioEditor, aber rendern ihn in einem Container
  // statt im Fixed-Overlay. Dafür wrappen wir ihn in einen relativen Container.
  return (
    <div className="relative">
      <AudioEditorEmbedded asset={asset} onSaved={onSaved} />
    </div>
  );
}

// Eingebettete Version des AudioEditors (ohne Fixed-Overlay und ohne Close-Button)
import WaveSurfer from 'wavesurfer.js';
import {
  Play as PlayIcon, Pause as PauseIcon, Scissors as ScissorsIcon,
  MessageSquare as MsgIcon, Trash2 as TrashIcon, Save as SaveIcon,
  SkipBack as SkipBackIcon, SkipForward as SkipFwdIcon,
  Volume2 as VolIcon, VolumeX as VolXIcon,
  Flag as FlagIcon, Loader2 as LoaderIcon, Clock as ClockIcon,
  ChevronDown as ChevDownIcon, ChevronUp as ChevUpIcon,
  Download as DownloadIcon, FileText as FileTextIcon
} from 'lucide-react';
import { api, mediaApi as mApi } from '../lib/api';

interface MarkerE {
  id: string;
  type: 'cut' | 'comment' | 'start' | 'end' | 'chapter';
  time: number;
  label: string;
  color: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

interface TimedCommentE {
  id: string;
  content: string;
  text: string;
  time: number | null;
  userName?: string;
  displayName?: string;
  createdAt: string;
}

const MARKER_TYPES_E = [
  { value: 'cut', label: 'Schnittmarke', color: '#ef4444', icon: '✂' },
  { value: 'chapter', label: 'Kapitel', color: '#3b82f6', icon: '📖' },
  { value: 'start', label: 'Start', color: '#22c55e', icon: '▶' },
  { value: 'end', label: 'Ende', color: '#f97316', icon: '⏹' },
  { value: 'comment', label: 'Anmerkung', color: '#a855f7', icon: '💬' },
];

function fmtTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function AudioEditorEmbedded({ asset, onSaved }: { asset: any; onSaved?: () => void }) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(asset.duration || 0);
  const [volume, setVolume] = useState(0.8);
  const [zoom, setZoom] = useState(50);
  const [markers, setMarkers] = useState<MarkerE[]>([]);
  const [timedComments, setTimedComments] = useState<TimedCommentE[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [markerForm, setMarkerForm] = useState({ type: 'cut', label: '', time: 0 });
  const [commentForm, setCommentForm] = useState({ text: '', time: 0 });
  const [showMarkerList, setShowMarkerList] = useState(true);
  const [showCommentList, setShowCommentList] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [mkrs, assetData] = await Promise.all([
          api.get<any[]>(`/media/${asset.id}/markers`),
          api.get<any>(`/media/${asset.id}`),
        ]);
        setMarkers(Array.isArray(mkrs) ? mkrs : []);
        const comments = (assetData?.comments || []).filter((c: any) => c.time != null);
        setTimedComments(comments);
      } catch (e) { /* ignore */ }
    };
    loadData();
  }, [asset.id]);

  useEffect(() => {
    if (!waveformRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f46e5',
      progressColor: '#7c3aed',
      cursorColor: '#a855f7',
      barWidth: 2,
      barGap: 1,
      height: 80,
      normalize: true,
    });
    wsRef.current = ws;
    const url = mApi.getStreamUrl(asset.filename);
    ws.load(url);
    ws.on('ready', () => { setIsReady(true); setIsLoading(false); setDuration(ws.getDuration()); });
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('error', (e: any) => { setLoadError(`Fehler beim Laden: ${e}`); setIsLoading(false); });
    return () => { ws.destroy(); };
  }, [asset.id, asset.filename]);

  const seekToTime = (t: number) => { wsRef.current?.seekTo(t / (wsRef.current.getDuration() || 1)); };

  const addMarker = async () => {
    const t = markerForm.time ?? currentTime;
    const typeInfo = MARKER_TYPES_E.find(m => m.value === markerForm.type);
    try {
      const saved = await api.post<any>(`/media/${asset.id}/markers/add`, {
        type: markerForm.type, label: markerForm.label || typeInfo?.label || markerForm.type,
        time: t, color: typeInfo?.color || '#ef4444',
      });
      setMarkers(prev => [...prev, saved].sort((a, b) => a.time - b.time));
      setShowMarkerForm(false);
      setMarkerForm({ type: 'cut', label: '', time: 0 });
    } catch (e) { /* ignore */ }
  };

  const deleteMarker = async (id: string) => {
    try {
      await api.delete(`/media/${asset.id}/markers/${id}`);
      setMarkers(prev => prev.filter(m => m.id !== id));
    } catch (e) { /* ignore */ }
  };

  const addTimedComment = async () => {
    const t = commentForm.time ?? currentTime;
    try {
      const saved = await api.post<any>(`/media/${asset.id}/timed-comments`, { text: commentForm.text, time: t });
      setTimedComments(prev => [...prev, saved]);
      setShowCommentForm(false);
      setCommentForm({ text: '', time: 0 });
    } catch (e) { /* ignore */ }
  };

  const deleteTimedComment = async (id: string) => {
    try {
      await api.delete(`/media/${asset.id}/timed-comments/${id}`);
      setTimedComments(prev => prev.filter(c => c.id !== id));
    } catch (e) { /* ignore */ }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      await api.post(`/media/${asset.id}/markers`, { markers });
      onSaved?.();
    } catch (e) { /* ignore */ }
    finally { setIsSaving(false); }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  // Hilfsfunktion: Sekunden → HH:MM:SS:FF (25fps)
  const toTimecode = (sec: number, fps = 25) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * fps);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
  };

  const downloadFile = (content: string, filename: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportEDL = () => {
    // CMX 3600 EDL Format (kompatibel mit Premiere, Resolve, Avid)
    const title = asset.name.replace(/[^a-zA-Z0-9_\- ]/g, '').substring(0, 32);
    let edl = `TITLE: ${title}\nFCM: NON-DROP FRAME\n\n`;
    const allPoints = [
      ...markers.map(m => ({ time: m.time, label: m.label, type: m.type })),
      ...timedComments.filter(c => c.time != null).map(c => ({ time: c.time!, label: c.content || c.text, type: 'comment' }))
    ].sort((a, b) => a.time - b.time);
    allPoints.forEach((pt, i) => {
      const tc = toTimecode(pt.time);
      const tcEnd = toTimecode(pt.time + 1);
      edl += `${String(i + 1).padStart(3, '0')}  AX       V     C        ${tc} ${tcEnd} ${tc} ${tcEnd}\n`;
      edl += `* FROM CLIP NAME: ${pt.label || pt.type}\n`;
      edl += `* COMMENT: [${pt.type.toUpperCase()}] ${pt.label}\n\n`;
    });
    downloadFile(edl, `${title}_markers.edl`);
    setShowExportMenu(false);
  };

  const exportReaper = () => {
    // Reaper Marker Format (.txt)
    const allPoints = [
      ...markers.map(m => ({ time: m.time, label: `[${m.type.toUpperCase()}] ${m.label}`, color: m.color })),
      ...timedComments.filter(c => c.time != null).map(c => ({ time: c.time!, label: `[COMMENT] ${c.content || c.text}`, color: '#a855f7' }))
    ].sort((a, b) => a.time - b.time);
    let txt = `# Reaper Marker Export – ${asset.name}\n# Generated by PodCore\n# Format: MARKER <index> <position_seconds> <name>\n\n`;
    allPoints.forEach((pt, i) => {
      txt += `MARKER ${i + 1} ${pt.time.toFixed(6)} "${pt.label}"\n`;
    });
    downloadFile(txt, `${asset.name.replace(/[^a-zA-Z0-9_\- ]/g, '_')}_reaper.txt`);
    setShowExportMenu(false);
  };

  const exportAudacity = () => {
    // Audacity Label Track Format (TSV)
    const allPoints = [
      ...markers.map(m => ({ time: m.time, label: `[${m.type}] ${m.label}` })),
      ...timedComments.filter(c => c.time != null).map(c => ({ time: c.time!, label: c.content || c.text }))
    ].sort((a, b) => a.time - b.time);
    let tsv = '';
    allPoints.forEach(pt => {
      // Audacity: start\tend\tlabel (für Punkt-Marker: start = end)
      tsv += `${pt.time.toFixed(6)}\t${pt.time.toFixed(6)}\t${pt.label}\n`;
    });
    downloadFile(tsv, `${asset.name.replace(/[^a-zA-Z0-9_\- ]/g, '_')}_audacity.txt`);
    setShowExportMenu(false);
  };

  const exportCSV = () => {
    const allPoints = [
      ...markers.map(m => ({ time: m.time, type: m.type, label: m.label, source: 'marker', color: m.color })),
      ...timedComments.filter(c => c.time != null).map(c => ({ time: c.time!, type: 'comment', label: c.content || c.text, source: 'comment', color: '#a855f7' }))
    ].sort((a, b) => a.time - b.time);
    let csv = 'Timecode,Sekunden,Typ,Bezeichnung,Quelle\n';
    allPoints.forEach(pt => {
      const tc = toTimecode(pt.time);
      csv += `"${tc}",${pt.time.toFixed(3)},"${pt.type}","${(pt.label || '').replace(/"/g, '""')}","${pt.source}"\n`;
    });
    downloadFile(csv, `${asset.name.replace(/[^a-zA-Z0-9_\- ]/g, '_')}_markers.csv`, 'text/csv');
    setShowExportMenu(false);
  };

  const exportFCPXML = () => {
    // Final Cut Pro X XML (FCPXML) – Marker-Export
    const title = asset.name.replace(/[&<>"']/g, '_');
    const allMarkers = [
      ...markers.map(m => ({ time: m.time, label: m.label || m.type, type: m.type })),
      ...timedComments.filter(c => c.time != null).map(c => ({ time: c.time!, label: c.content || c.text, type: 'comment' }))
    ].sort((a, b) => a.time - b.time);
    const dur = duration || 0;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<!DOCTYPE fcpxml>\n<fcpxml version="1.10">\n`;
    xml += `  <resources>\n    <format id="r1" name="FFVideoFormat1080p25" frameDuration="100/2500s"/>\n  </resources>\n`;
    xml += `  <library>\n    <event name="PodCore Export">\n      <project name="${title}">\n`;
    xml += `        <sequence format="r1" duration="${Math.round(dur * 2500)}/2500s">\n          <spine>\n`;
    xml += `            <asset-clip name="${title}" duration="${Math.round(dur * 2500)}/2500s" start="0s">\n`;
    allMarkers.forEach(m => {
      const startVal = `${Math.round(m.time * 2500)}/2500s`;
      xml += `              <marker start="${startVal}" duration="1/2500s" value="[${m.type.toUpperCase()}] ${m.label.replace(/[&<>"']/g, '_')}"/>\n`;
    });
    xml += `            </asset-clip>\n          </spine>\n        </sequence>\n      </project>\n    </event>\n  </library>\n</fcpxml>\n`;
    downloadFile(xml, `${title}_markers.fcpxml`, 'application/xml');
    setShowExportMenu(false);
  };

  return (
    <div className="card space-y-4">
      {/* Header: Titel + Aktions-Buttons */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <ScissorsIcon size={15} className="text-accent-purple" /> Schnittplanung & Marker
        </h3>
        <div className="flex items-center gap-2">
          {/* DAW-Export-Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(p => !p)}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="Marker für DAW exportieren"
            >
              <DownloadIcon size={14} /> DAW-Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-obsidian-800 border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-surface-border">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Format wählen</p>
                </div>
                <button onClick={exportEDL} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-obsidian-700 transition-colors text-left">
                  <FileTextIcon size={14} className="text-accent-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">EDL (CMX 3600)</p>
                    <p className="text-xs text-text-muted">Premiere, DaVinci Resolve, Avid</p>
                  </div>
                </button>
                <button onClick={exportFCPXML} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-obsidian-700 transition-colors text-left">
                  <FileTextIcon size={14} className="text-accent-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">FCPXML</p>
                    <p className="text-xs text-text-muted">Final Cut Pro X</p>
                  </div>
                </button>
                <button onClick={exportReaper} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-obsidian-700 transition-colors text-left">
                  <FileTextIcon size={14} className="text-accent-orange mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">Reaper Markers</p>
                    <p className="text-xs text-text-muted">Cockos Reaper (.txt)</p>
                  </div>
                </button>
                <button onClick={exportAudacity} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-obsidian-700 transition-colors text-left">
                  <FileTextIcon size={14} className="text-accent-cyan mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">Audacity Labels</p>
                    <p className="text-xs text-text-muted">Audacity Label Track (.txt)</p>
                  </div>
                </button>
                <button onClick={exportCSV} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-obsidian-700 transition-colors text-left border-t border-surface-border">
                  <FileTextIcon size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">CSV</p>
                    <p className="text-xs text-text-muted">Universell (Excel, Numbers)</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button onClick={saveAll} disabled={isSaving} className="btn-primary text-sm flex items-center gap-1.5">
            {isSaving ? <LoaderIcon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
            Speichern
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="bg-obsidian-900 rounded-xl p-4 border border-obsidian-600">
        {isLoading && (
          <div className="flex items-center justify-center h-24 gap-2 text-text-muted">
            <LoaderIcon size={18} className="animate-spin" />
            <span className="text-sm">Audio wird geladen…</span>
          </div>
        )}
        {loadError && (
          <div className="flex items-center justify-center h-24 text-red-400 text-sm">{loadError}</div>
        )}
        <div ref={waveformRef} className={isLoading || loadError ? 'hidden' : ''} />

        {isReady && duration > 0 && (
          <div className="relative h-4 mt-1">
            {markers.map(m => {
              const pct = Math.min(100, Math.max(0, (m.time / duration) * 100));
              const typeInfo = MARKER_TYPES_E.find(t => t.value === m.type);
              return (
                <button key={m.id} title={`${typeInfo?.label || m.type}: ${m.label} @ ${fmtTime(m.time)}`}
                  onClick={() => seekToTime(m.time)}
                  className="absolute top-0 -translate-x-1/2 text-xs hover:scale-125 transition-transform"
                  style={{ left: `${pct}%`, color: m.color }}>
                  {typeInfo?.icon || '●'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transport-Steuerung */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => wsRef.current?.skip(-10)} className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg transition-colors" title="-10s">
            <SkipBackIcon size={16} />
          </button>
          <button onClick={() => wsRef.current?.playPause()} className="w-10 h-10 bg-accent-purple rounded-full flex items-center justify-center text-white hover:bg-accent-purple/80 transition-colors">
            {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <button onClick={() => wsRef.current?.skip(10)} className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg transition-colors" title="+10s">
            <SkipFwdIcon size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm text-text-muted font-mono">
          <ClockIcon size={13} />
          <span>{fmtTime(currentTime)}</span>
          <span className="opacity-50">/</span>
          <span>{fmtTime(duration)}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => { const m = !isMuted; setIsMuted(m); wsRef.current?.setMuted(m); }} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
            {isMuted ? <VolXIcon size={15} /> : <VolIcon size={15} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); wsRef.current?.setVolume(v); }} className="w-20 h-1 cursor-pointer" />
          <span className="text-xs text-text-muted w-8">Zoom</span>
          <input type="range" min={10} max={200} value={zoom} onChange={e => { const z = parseInt(e.target.value); setZoom(z); wsRef.current?.zoom(z); }} className="w-20 h-1 cursor-pointer" />
        </div>
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setMarkerForm(f => ({ ...f, time: currentTime })); setShowMarkerForm(!showMarkerForm); setShowCommentForm(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showMarkerForm ? 'bg-accent-orange/20 border-accent-orange/50 text-accent-orange' : 'border-surface-border text-text-muted hover:text-text-primary hover:border-accent-orange/40'}`}>
          <ScissorsIcon size={13} /> Marker setzen @ {fmtTime(currentTime)}
        </button>
        <button onClick={() => { setCommentForm(f => ({ ...f, time: currentTime })); setShowCommentForm(!showCommentForm); setShowMarkerForm(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showCommentForm ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple' : 'border-surface-border text-text-muted hover:text-text-primary hover:border-accent-purple/40'}`}>
          <MsgIcon size={13} /> Anmerkung @ {fmtTime(currentTime)}
        </button>
      </div>

      {/* Marker-Formular */}
      {showMarkerForm && (
        <div className="p-3 bg-obsidian-900 rounded-xl border border-accent-orange/30 space-y-3">
          <p className="text-xs font-semibold text-accent-orange">Neuer Marker</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-text-muted uppercase mb-1 block">Typ</label>
              <select value={markerForm.type} onChange={e => setMarkerForm(f => ({ ...f, type: e.target.value as any }))} className="input text-xs py-1">
                {MARKER_TYPES_E.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted uppercase mb-1 block">Zeit (s)</label>
              <input type="number" value={markerForm.time} onChange={e => setMarkerForm(f => ({ ...f, time: parseFloat(e.target.value) || 0 }))} className="input text-xs py-1" step="0.1" min="0" max={duration} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-muted uppercase mb-1 block">Beschriftung</label>
            <input type="text" value={markerForm.label} onChange={e => setMarkerForm(f => ({ ...f, label: e.target.value }))} className="input text-xs py-1" placeholder="z.B. Intro-Ende, Werbung raus..." />
          </div>
          <div className="flex gap-2">
            <button onClick={addMarker} className="btn-primary text-xs py-1 flex-1">Marker hinzufügen</button>
            <button onClick={() => setShowMarkerForm(false)} className="btn-ghost text-xs py-1">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Kommentar-Formular */}
      {showCommentForm && (
        <div className="p-3 bg-obsidian-900 rounded-xl border border-accent-purple/30 space-y-3">
          <p className="text-xs font-semibold text-accent-purple">Neue Anmerkung</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-text-muted uppercase mb-1 block">Anmerkung</label>
              <input type="text" value={commentForm.text} onChange={e => setCommentForm(f => ({ ...f, text: e.target.value }))} className="input text-xs py-1" placeholder="z.B. Hier Pause kürzen..." />
            </div>
            <div>
              <label className="text-[10px] text-text-muted uppercase mb-1 block">Zeit (s)</label>
              <input type="number" value={commentForm.time} onChange={e => setCommentForm(f => ({ ...f, time: parseFloat(e.target.value) || 0 }))} className="input text-xs py-1" step="0.1" min="0" max={duration} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTimedComment} disabled={!commentForm.text.trim()} className="btn-primary text-xs py-1 flex-1 disabled:opacity-50">Anmerkung hinzufügen</button>
            <button onClick={() => setShowCommentForm(false)} className="btn-ghost text-xs py-1">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Marker-Liste */}
      <div>
        <button onClick={() => setShowMarkerList(v => !v)} className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2 w-full hover:text-accent-orange transition-colors">
          {showMarkerList ? <ChevUpIcon size={14} /> : <ChevDownIcon size={14} />}
          Schnittmarken ({markers.length})
        </button>
        {showMarkerList && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {markers.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Noch keine Marker gesetzt.</p>
            ) : (
              markers.sort((a, b) => a.time - b.time).map(m => {
                const ti = MARKER_TYPES_E.find(t => t.value === m.type);
                return (
                  <div key={m.id} className="flex items-center gap-2 p-2 bg-obsidian-800 rounded-lg border border-surface-border group">
                    <span className="text-sm w-5 text-center flex-shrink-0" style={{ color: m.color }}>{ti?.icon || '●'}</span>
                    <button onClick={() => seekToTime(m.time)} className="text-xs font-mono text-accent-blue hover:underline w-12 flex-shrink-0">{fmtTime(m.time)}</button>
                    <span className="text-xs text-text-muted flex-shrink-0">{ti?.label}</span>
                    <span className="text-xs text-text-primary flex-1 truncate">{m.label}</span>
                    {m.userName && <span className="text-[10px] text-text-muted hidden group-hover:block">{m.userName}</span>}
                    <button onClick={() => deleteMarker(m.id)} className="p-1 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all rounded">
                      <TrashIcon size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Zeitkommentare */}
      <div>
        <button onClick={() => setShowCommentList(v => !v)} className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2 w-full hover:text-accent-purple transition-colors">
          {showCommentList ? <ChevUpIcon size={14} /> : <ChevDownIcon size={14} />}
          Anmerkungen ({timedComments.length})
        </button>
        {showCommentList && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {timedComments.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Noch keine Anmerkungen.</p>
            ) : (
              timedComments.filter(c => c.time != null).sort((a, b) => (a.time || 0) - (b.time || 0)).map(c => (
                <div key={c.id} className="flex items-start gap-2 p-2 bg-obsidian-800 rounded-lg border border-surface-border group">
                  <button onClick={() => seekToTime(c.time || 0)} className="text-xs font-mono text-accent-purple hover:underline w-12 flex-shrink-0 mt-0.5">{fmtTime(c.time || 0)}</button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary">{c.content || c.text}</p>
                    {(c.userName || c.displayName) && <p className="text-[10px] text-text-muted mt-0.5">{c.userName || c.displayName}</p>}
                  </div>
                  <button onClick={() => deleteTimedComment(c.id)} className="p-1 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all rounded flex-shrink-0">
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
