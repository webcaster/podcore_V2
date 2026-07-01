import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Play, Pause, Square, Scissors, MessageSquare, Trash2,
  Save, SkipBack, SkipForward, Volume2, VolumeX,
  Flag, Loader2, Clock, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { api } from '../lib/api';

interface Marker {
  id: string;
  type: 'cut' | 'comment' | 'start' | 'end' | 'chapter';
  time: number;
  label: string;
  color: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

interface TimedComment {
  id: string;
  content: string;
  text: string;
  time: number | null;
  userName?: string;
  displayName?: string;
  createdAt: string;
}

interface AudioEditorProps {
  asset: {
    id: string;
    name: string;
    filename: string;
    duration?: number;
    comments?: TimedComment[];
  };
  onClose: () => void;
  onSaved?: () => void;
}

const MARKER_TYPES = [
  { value: 'cut', label: 'Schnittmarke', color: '#ef4444', icon: '✂' },
  { value: 'chapter', label: 'Kapitel', color: '#3b82f6', icon: '📖' },
  { value: 'start', label: 'Start', color: '#22c55e', icon: '▶' },
  { value: 'end', label: 'Ende', color: '#f97316', icon: '⏹' },
  { value: 'comment', label: 'Anmerkung', color: '#a855f7', icon: '💬' },
];

function formatTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioEditor({ asset, onClose, onSaved }: AudioEditorProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(asset.duration || 0);
  const [volume, setVolume] = useState(0.8);
  const [zoom, setZoom] = useState(50);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [timedComments, setTimedComments] = useState<TimedComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [markerForm, setMarkerForm] = useState({ type: 'cut', label: '', time: 0 });
  const [commentForm, setCommentForm] = useState({ text: '', time: 0 });
  const [showMarkerList, setShowMarkerList] = useState(true);
  const [showCommentList, setShowCommentList] = useState(true);

  // Load markers and comments from server
  useEffect(() => {
    const loadData = async () => {
      try {
        // api.get gibt direkt data.data zurück (nicht das rohe Response-Objekt)
        const [markers, assetData] = await Promise.all([
          api.get<any[]>(`/media/${asset.id}/markers`),
          api.get<any>(`/media/${asset.id}`),
        ]);
        setMarkers(Array.isArray(markers) ? markers : []);
        const comments = (assetData?.comments || []).filter((c: any) => c.time != null);
        setTimedComments(comments);
      } catch (e) { /* ignore */ }
    };
    loadData();
  }, [asset.id]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f46e5',
      progressColor: '#7c3aed',
      cursorColor: '#a855f7',
      barWidth: 2,
      barRadius: 2,
      height: 100,
      normalize: true,
    });

    wsRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
      setIsLoading(false);
      setDuration(ws.getDuration());
    });

    ws.on('audioprocess', (t: number) => setCurrentTime(t));
    ws.on('seeking', (t: number) => setCurrentTime(t));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (err: any) => {
      setLoadError(`Fehler beim Laden: ${err?.message || err}`);
      setIsLoading(false);
    });

    const audioUrl = `/api/media/${asset.id}/stream`;
    ws.load(audioUrl);

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [asset.id]);

  // Sync volume
  useEffect(() => {
    if (wsRef.current && isReady) {
      wsRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, isReady]);

  // Sync zoom
  useEffect(() => {
    if (wsRef.current && isReady) {
      wsRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  const togglePlay = useCallback(() => {
    if (!wsRef.current || !isReady) return;
    wsRef.current.playPause();
  }, [isReady]);

  const stop = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.stop();
    setCurrentTime(0);
  }, []);

  const skipBack = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.skip(-10);
  }, []);

  const skipForward = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.skip(10);
  }, []);

  const seekToTime = useCallback((time: number) => {
    if (!wsRef.current || !isReady || duration === 0) return;
    wsRef.current.seekTo(time / duration);
  }, [isReady, duration]);

  const addMarker = async () => {
    const time = markerForm.time ?? currentTime;
    const typeInfo = MARKER_TYPES.find(t => t.value === markerForm.type) || MARKER_TYPES[0];
    try {
      // api.post gibt direkt data.data zurück
      const newMarker = await api.post<any>(`/media/${asset.id}/markers/add`, {
        type: markerForm.type,
        label: markerForm.label || typeInfo.label,
        time,
        color: typeInfo.color,
      });
      if (newMarker) {
        setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
        setShowMarkerForm(false);
        setMarkerForm({ type: 'cut', label: '', time: 0 });
      }
    } catch (e) { /* ignore */ }
  };

  const deleteMarker = async (markerId: string) => {
    try {
      await api.delete(`/media/${asset.id}/markers/${markerId}`);
      setMarkers(prev => prev.filter(m => m.id !== markerId));
    } catch (e) { /* ignore */ }
  };

  const addTimedComment = async () => {
    if (!commentForm.text.trim()) return;
    try {
      // api.post gibt direkt data.data zurück
      const newComment = await api.post<any>(`/media/${asset.id}/timed-comments`, {
        text: commentForm.text,
        time: commentForm.time ?? currentTime,
      });
      if (newComment) {
        setTimedComments(prev => [...prev, newComment].sort((a, b) => (a.time ?? 0) - (b.time ?? 0)));
        setShowCommentForm(false);
        setCommentForm({ text: '', time: 0 });
      }
    } catch (e) { /* ignore */ }
  };

  const deleteTimedComment = async (commentId: string) => {
    try {
      await api.delete(`/media/${asset.id}/comments/${commentId}`);
      setTimedComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { /* ignore */ }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      await api.post(`/media/${asset.id}/markers`, { markers });
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-obsidian-800 border border-obsidian-600 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-obsidian-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
              <Scissors size={16} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary text-sm">Audio-Editor</h2>
              <p className="text-xs text-text-muted truncate max-w-xs">{asset.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveAll}
              disabled={isSaving}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Speichern
            </button>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Waveform */}
          <div className="bg-obsidian-900 rounded-xl p-4 border border-obsidian-600">
            {isLoading && (
              <div className="flex items-center justify-center h-24 gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Audio wird geladen…</span>
              </div>
            )}
            {loadError && (
              <div className="flex items-center justify-center h-24 text-red-400 text-sm">
                {loadError}
              </div>
            )}
            <div ref={waveformRef} className={isLoading || loadError ? 'hidden' : ''} />

            {/* Marker-Nadeln über der Wellenform */}
            {isReady && duration > 0 && (
              <div className="relative h-4 mt-1">
                {markers.map(m => {
                  const pct = Math.min(100, Math.max(0, (m.time / duration) * 100));
                  const typeInfo = MARKER_TYPES.find(t => t.value === m.type);
                  return (
                    <button
                      key={m.id}
                      title={`${typeInfo?.label || m.type}: ${m.label} @ ${formatTime(m.time)}`}
                      onClick={() => seekToTime(m.time)}
                      className="absolute top-0 -translate-x-1/2 text-xs hover:scale-125 transition-transform"
                      style={{ left: `${pct}%`, color: m.color }}
                    >
                      {typeInfo?.icon || '|'}
                    </button>
                  );
                })}
                {timedComments.map(c => {
                  if (c.time == null) return null;
                  const pct = Math.min(100, Math.max(0, (c.time / duration) * 100));
                  return (
                    <button
                      key={c.id}
                      title={`Kommentar: ${c.content} @ ${formatTime(c.time)}`}
                      onClick={() => seekToTime(c.time!)}
                      className="absolute top-0 -translate-x-1/2 text-xs text-accent-purple hover:scale-125 transition-transform"
                      style={{ left: `${pct}%` }}
                    >
                      💬
                    </button>
                  );
                })}
              </div>
            )}

            {/* Zeitanzeige */}
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between bg-obsidian-900 rounded-xl p-3 border border-obsidian-600">
            <div className="flex items-center gap-2">
              <button onClick={stop} disabled={!isReady} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <Square size={16} />
              </button>
              <button onClick={skipBack} disabled={!isReady} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <SkipBack size={16} />
              </button>
              <button
                onClick={togglePlay}
                disabled={!isReady}
                className="w-10 h-10 rounded-full bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
              </button>
              <button onClick={skipForward} disabled={!isReady} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(p => !p)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                className="w-20 accent-accent-purple"
              />
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Zoom</span>
              <input
                type="range" min="10" max="500" step="10"
                value={zoom}
                onChange={e => setZoom(parseInt(e.target.value))}
                className="w-24 accent-accent-purple"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setMarkerForm(p => ({ ...p, time: currentTime })); setShowMarkerForm(true); }}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Scissors size={14} /> Schnittmarke setzen
            </button>
            <button
              onClick={() => { setCommentForm(p => ({ ...p, time: currentTime })); setShowCommentForm(true); }}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <MessageSquare size={14} /> Kommentar hinzufügen
            </button>
          </div>

          {/* Marker Form */}
          {showMarkerForm && (
            <div className="bg-obsidian-900 border border-obsidian-600 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Flag size={14} className="text-accent-purple" /> Neue Marke
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Typ</label>
                  <select value={markerForm.type} onChange={e => setMarkerForm(p => ({ ...p, type: e.target.value }))} className="select text-sm">
                    {MARKER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Bezeichnung</label>
                  <input
                    type="text"
                    value={markerForm.label}
                    onChange={e => setMarkerForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="z. B. Intro Ende"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs">Zeitpunkt (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={markerForm.time}
                    onChange={e => setMarkerForm(p => ({ ...p, time: parseFloat(e.target.value) || 0 }))}
                    className="input text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addMarker} className="btn-primary text-sm">Hinzufügen</button>
                <button onClick={() => setShowMarkerForm(false)} className="btn-secondary text-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {/* Timed Comment Form */}
          {showCommentForm && (
            <div className="bg-obsidian-900 border border-obsidian-600 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <MessageSquare size={14} className="text-accent-purple" /> Zeitbezogener Kommentar
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label text-xs">Kommentar</label>
                  <textarea
                    value={commentForm.text}
                    onChange={e => setCommentForm(p => ({ ...p, text: e.target.value }))}
                    placeholder="Anmerkung für die Produktion…"
                    className="textarea text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="label text-xs">Zeitpunkt (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={commentForm.time}
                    onChange={e => setCommentForm(p => ({ ...p, time: parseFloat(e.target.value) || 0 }))}
                    className="input text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addTimedComment} className="btn-primary text-sm">Hinzufügen</button>
                <button onClick={() => setShowCommentForm(false)} className="btn-secondary text-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {/* Marker List */}
          <div className="bg-obsidian-900 border border-obsidian-600 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowMarkerList(p => !p)}
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-text-primary hover:bg-obsidian-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Scissors size={14} className="text-accent-purple" />
                Schnittmarken ({markers.length})
              </span>
              {showMarkerList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMarkerList && (
              <div className="divide-y divide-obsidian-700">
                {markers.length === 0 ? (
                  <p className="text-xs text-text-muted p-3 text-center">Noch keine Marken gesetzt</p>
                ) : (
                  markers.sort((a, b) => a.time - b.time).map(m => {
                    const typeInfo = MARKER_TYPES.find(t => t.value === m.type);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-obsidian-800 transition-colors group">
                        <span className="text-lg" style={{ color: m.color }}>{typeInfo?.icon || '|'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text-primary truncate">{m.label || typeInfo?.label}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: m.color + '20', color: m.color }}>{typeInfo?.label}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                            <Clock size={10} />
                            <span>{formatTime(m.time)}</span>
                            {m.userName && <span>· {m.userName}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => seekToTime(m.time)}
                          className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => deleteMarker(m.id)}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Timed Comments List */}
          <div className="bg-obsidian-900 border border-obsidian-600 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCommentList(p => !p)}
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-text-primary hover:bg-obsidian-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageSquare size={14} className="text-accent-purple" />
                Zeitbezogene Kommentare ({timedComments.length})
              </span>
              {showCommentList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCommentList && (
              <div className="divide-y divide-obsidian-700">
                {timedComments.length === 0 ? (
                  <p className="text-xs text-text-muted p-3 text-center">Noch keine Kommentare</p>
                ) : (
                  timedComments.sort((a, b) => (a.time ?? 0) - (b.time ?? 0)).map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3 hover:bg-obsidian-800 transition-colors group">
                      <span className="text-accent-purple mt-0.5">💬</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{c.content || c.text}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                          {c.time != null && (
                            <>
                              <Clock size={10} />
                              <span>{formatTime(c.time)}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{c.displayName || c.userName || 'Unbekannt'}</span>
                          <span>·</span>
                          <span>{new Date(c.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                      {c.time != null && (
                        <button
                          onClick={() => seekToTime(c.time!)}
                          className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Play size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTimedComment(c.id)}
                        className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
