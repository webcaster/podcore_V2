import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Play, Pause, Square, Scissors, MessageSquare, Trash2,
  Save, SkipBack, SkipForward, Volume2, VolumeX,
  Flag, Loader2, Clock, ChevronDown, ChevronUp, X, Repeat, Copy, Download, AlertCircle
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
  embedded?: boolean;
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

export default function AudioEditor({ asset, onClose, onSaved, embedded = false }: AudioEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(asset.duration || 0);
  const [volume, setVolume] = useState(0.8);
  const [zoom, setZoom] = useState(50);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loopRef = useRef(false);
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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const actionPendingRef = useRef(false);
  const dataLoadVersionRef = useRef(0);
  const formWasOpenRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [markerSearch, setMarkerSearch] = useState('');
  const [markerTypeFilter, setMarkerTypeFilter] = useState('all');

  const loadData = useCallback(async () => {
    const loadVersion = ++dataLoadVersionRef.current;
    setIsDataLoading(true);
    setDataError(null);
    try {
      // Beide Listen müssen geladen sein, bevor die gesamte Markenliste gespeichert wird.
      const [loadedMarkers, assetData] = await Promise.all([
        api.get<Marker[]>(`/media/${asset.id}/markers`),
        api.get<{ comments?: TimedComment[] }>(`/media/${asset.id}`),
      ]);
      if (loadVersion !== dataLoadVersionRef.current) return;
      setMarkers(Array.isArray(loadedMarkers) ? loadedMarkers : []);
      setTimedComments((assetData?.comments || []).filter(c => c.time != null));
    } catch (error) {
      if (loadVersion === dataLoadVersionRef.current) {
        setDataError(error instanceof Error ? error.message : 'Marken und Kommentare konnten nicht geladen werden.');
      }
    } finally {
      if (loadVersion === dataLoadVersionRef.current) setIsDataLoading(false);
    }
  }, [asset.id]);

  // Load markers and comments from server
  useEffect(() => {
    setMarkers([]);
    setTimedComments([]);
    setShowMarkerForm(false);
    setShowCommentForm(false);
    setSaveError(null);
    setStatusMessage('');
    setMarkerSearch('');
    setMarkerTypeFilter('all');
    loadData();
    return () => { dataLoadVersionRef.current += 1; };
  }, [loadData]);

  // Keep keyboard focus inside the editor and return it to its opener on close.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    editorRef.current?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  useEffect(() => {
    const formIsOpen = showMarkerForm || showCommentForm;
    if (formWasOpenRef.current && !formIsOpen) editorRef.current?.focus({ preventScroll: true });
    formWasOpenRef.current = formIsOpen;
  }, [showMarkerForm, showCommentForm]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;
    setIsReady(false);
    setIsPlaying(false);
    setIsLoading(true);
    setLoadError(null);
    setCurrentTime(0);
    setDuration(asset.duration || 0);
    let disposed = false;

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
    ws.on('finish', () => {
      if (loopRef.current) {
        ws.seekTo(0);
        ws.play();
      } else {
        setIsPlaying(false);
      }
    });
    ws.on('error', (err: any) => {
      setLoadError(`Fehler beim Laden: ${err?.message || err}`);
      setIsLoading(false);
    });

    const audioUrl = `/api/media/${asset.id}/stream`;
    void ws.load(audioUrl).catch(error => {
      if (disposed || error?.name === 'AbortError') return;
      setLoadError(`Fehler beim Laden: ${error?.message || error}`);
      setIsLoading(false);
    });

    return () => {
      disposed = true;
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

  // Sync playback rate and keep the loop state available to WaveSurfer events.
  useEffect(() => {
    loopRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    if (wsRef.current && isReady) {
      wsRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);

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
    if (!wsRef.current || !isReady || duration === 0 || !Number.isFinite(time)) return;
    wsRef.current.seekTo(Math.min(1, Math.max(0, time / duration)));
  }, [isReady, duration]);

  const openMarkerForm = () => {
    setMarkerForm(p => ({ ...p, time: currentTime }));
    setShowMarkerForm(true);
    setShowCommentForm(false);
    setSaveError(null);
  };

  const openCommentForm = () => {
    setCommentForm(p => ({ ...p, time: currentTime }));
    setShowCommentForm(true);
    setShowMarkerForm(false);
    setSaveError(null);
  };

  const validTime = (time: number) => Number.isFinite(time) && time >= 0 && (duration <= 0 || time <= duration);
  const timeHelp = duration > 0 ? `0 bis ${formatTime(duration)} (${duration.toFixed(1)} s)` : 'Ab 0 Sekunden';
  const dataBusy = isDataLoading || isSaving || pendingAction !== null;
  const canChangeData = !dataBusy && !dataError;

  // A shared lock also prevents rapid repeated clicks before React updates the buttons.
  const runDataAction = async (key: string, action: () => Promise<void>, success: string) => {
    if (!canChangeData || actionPendingRef.current) return;
    actionPendingRef.current = true;
    setPendingAction(key);
    setSaveError(null);
    setStatusMessage('');
    try {
      await action();
      setStatusMessage(success);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      actionPendingRef.current = false;
      setPendingAction(null);
    }
  };

  const addMarker = async () => {
    const time = markerForm.time ?? currentTime;
    if (!validTime(time)) {
      setSaveError(`Bitte einen gültigen Zeitpunkt eingeben: ${timeHelp}.`);
      return;
    }
    const typeInfo = MARKER_TYPES.find(t => t.value === markerForm.type) || MARKER_TYPES[0];
    await runDataAction('add-marker', async () => {
      // api.post gibt direkt data.data zurück
      const newMarker = await api.post<any>(`/media/${asset.id}/markers/add`, {
        type: markerForm.type,
        label: markerForm.label.trim() || typeInfo.label,
        time,
        color: typeInfo.color,
      });
      if (!newMarker) throw new Error('Die Marke wurde vom Server nicht bestätigt.');
      setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
      setShowMarkerForm(false);
      setMarkerForm({ type: 'cut', label: '', time: 0 });
    }, 'Marke gespeichert.');
  };

  const deleteMarker = async (marker: Marker) => {
    if (!canChangeData || !window.confirm(`Marke „${marker.label || marker.type}“ bei ${formatTime(marker.time)} wirklich löschen?`)) return;
    await runDataAction(`delete-marker-${marker.id}`, async () => {
      await api.delete(`/media/${asset.id}/markers/${marker.id}`);
      setMarkers(prev => prev.filter(m => m.id !== marker.id));
    }, 'Marke gelöscht.');
  };

  const addTimedComment = async () => {
    if (!commentForm.text.trim()) return;
    if (!validTime(commentForm.time)) {
      setSaveError(`Bitte einen gültigen Zeitpunkt eingeben: ${timeHelp}.`);
      return;
    }
    await runDataAction('add-comment', async () => {
      // api.post gibt direkt data.data zurück
      const newComment = await api.post<any>(`/media/${asset.id}/timed-comments`, {
        text: commentForm.text.trim(),
        time: commentForm.time ?? currentTime,
      });
      if (!newComment) throw new Error('Der Kommentar wurde vom Server nicht bestätigt.');
      setTimedComments(prev => [...prev, newComment].sort((a, b) => (a.time ?? 0) - (b.time ?? 0)));
      setShowCommentForm(false);
      setCommentForm({ text: '', time: 0 });
    }, 'Kommentar gespeichert.');
  };

  const deleteTimedComment = async (comment: TimedComment) => {
    if (!canChangeData || !window.confirm(`Kommentar bei ${formatTime(comment.time ?? 0)} wirklich löschen?`)) return;
    await runDataAction(`delete-comment-${comment.id}`, async () => {
      await api.delete(`/media/${asset.id}/comments/${comment.id}`);
      setTimedComments(prev => prev.filter(c => c.id !== comment.id));
    }, 'Kommentar gelöscht.');
  };

  const saveAll = async () => {
    if (!canChangeData || actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    setStatusMessage('');
    try {
      await api.post(`/media/${asset.id}/markers`, { markers });
      setStatusMessage('Markenliste gespeichert.');
      onSaved?.();
    } catch (e: any) {
      setSaveError(e?.message || 'Die Marker konnten nicht gespeichert werden.');
    } finally {
      actionPendingRef.current = false;
      setIsSaving(false);
    }
  };

  const copyCurrentTime = async () => {
    const value = formatTime(currentTime);
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand('copy')) throw new Error('Kopieren nicht verfügbar');
      } catch {
        setSaveError('Der Timecode konnte nicht kopiert werden. Bitte manuell übernehmen.');
        return;
      } finally {
        textarea.remove();
        editorRef.current?.focus();
      }
    }
    setStatusMessage(`Timecode ${value} kopiert.`);
  };

  const exportEditDecisionList = () => {
    const payload = {
      format: 'podcore-audio-edit-list',
      version: 1,
      asset: { id: asset.id, name: asset.name, filename: asset.filename, duration },
      markers: [...markers].sort((a, b) => a.time - b.time),
      timedComments: [...timedComments].sort((a, b) => (a.time ?? 0) - (b.time ?? 0)),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${asset.name.replace(/[^a-z0-9_-]+/gi, '_')}_Schnittplan.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const getCutListEntries = () => [
    ...markers.map(marker => ({
      time: marker.time,
      end: marker.time,
      type: MARKER_TYPES.find(item => item.value === marker.type)?.label || marker.type,
      label: marker.label || MARKER_TYPES.find(item => item.value === marker.type)?.label || marker.type,
      description: marker.userName ? `Erstellt von ${marker.userName}` : '',
    })),
    ...timedComments.filter(comment => comment.time != null).map(comment => ({
      time: comment.time || 0,
      end: comment.time || 0,
      type: 'Kommentar',
      label: comment.content || comment.text || 'Kommentar',
      description: [comment.displayName || comment.userName, comment.createdAt ? new Date(comment.createdAt).toLocaleString('de-DE') : ''].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => a.time - b.time);

  const formatAuditionTime = (seconds: number) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);
    const milliseconds = Math.round((safe - Math.floor(safe)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  };

  const escapeCsv = (value: string) => `"${String(value || '').replace(/"/g, '""')}"`;

  const exportAuditionMarkers = () => {
    const entries = getCutListEntries();
    const csv = [
      'Name,Start,Duration,Type,Description',
      ...entries.map(entry => [
        escapeCsv(entry.label),
        escapeCsv(formatAuditionTime(entry.time)),
        escapeCsv(formatAuditionTime(Math.max(0, entry.end - entry.time))),
        escapeCsv('Cue'),
        escapeCsv(`[${entry.type}] ${entry.description}`.trim()),
      ].join(',')),
    ].join('\r\n');
    downloadTextFile(`\uFEFF${csv}`, `${asset.name.replace(/[^a-z0-9_-]+/gi, '_')}_Audition-Marker.csv`, 'text/csv;charset=utf-8');
  };

  const exportCutListPdf = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const width = 210 - margin * 2;
      let y = margin;
      const addPageIfNeeded = (height: number) => {
        if (y + height > 280) {
          doc.addPage();
          y = margin;
        }
      };
      const entries = getCutListEntries();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(45, 35, 70);
      doc.text('PodCore Schnittliste', margin, y);
      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(85, 85, 95);
      doc.text(asset.name, margin, y);
      y += 6;
      doc.text(`Datei: ${asset.filename} · Dauer: ${formatTime(duration)} · Export: ${new Date().toLocaleString('de-DE')}`, margin, y, { maxWidth: width });
      y += 9;
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.6);
      doc.line(margin, y, margin + width, y);
      y += 7;

      if (entries.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(90, 90, 100);
        doc.text('Es sind noch keine Marker oder zeitbezogenen Kommentare vorhanden.', margin, y);
      } else {
        entries.forEach((entry, index) => {
          const description = [entry.type, entry.description].filter(Boolean).join(' · ');
          const titleLines = doc.splitTextToSize(entry.label, width - 31);
          const descriptionLines = description ? doc.splitTextToSize(description, width - 31) : [];
          const rowHeight = Math.max(15, 8 + titleLines.length * 4.5 + descriptionLines.length * 3.8);
          addPageIfNeeded(rowHeight + 3);
          doc.setFillColor(index % 2 === 0 ? 248 : 245, index % 2 === 0 ? 246 : 241, 255);
          doc.roundedRect(margin, y, width, rowHeight, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(91, 33, 182);
          doc.text(formatTime(entry.time), margin + 4, y + 7);
          doc.setTextColor(35, 35, 45);
          doc.text(titleLines, margin + 29, y + 6);
          if (descriptionLines.length) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(95, 95, 105);
            doc.text(descriptionLines, margin + 29, y + 7 + titleLines.length * 4.5);
          }
          y += rowHeight + 3;
        });
      }

      doc.save(`${asset.name.replace(/[^a-z0-9_-]+/gi, '_')}_Schnittliste.pdf`);
    } catch (error) {
      console.error('PDF-Schnittliste konnte nicht erstellt werden:', error);
      setSaveError('Die PDF-Schnittliste konnte nicht erstellt werden.');
    }
  };

  const visibleMarkers = [...markers]
    .sort((a, b) => a.time - b.time)
    .filter(marker => {
      const typeInfo = MARKER_TYPES.find(type => type.value === marker.type);
      return (markerTypeFilter === 'all' || marker.type === markerTypeFilter)
        && `${marker.label} ${typeInfo?.label || marker.type} ${marker.userName || ''}`.toLocaleLowerCase('de-DE').includes(markerSearch.trim().toLocaleLowerCase('de-DE'));
    });

  const requestClose = () => {
    if (isSaving || pendingAction) return;
    const hasDraft = markerForm.label.trim() || commentForm.text.trim();
    if (hasDraft && !window.confirm('Den Editor schließen und den noch nicht hinzugefügten Entwurf verwerfen?')) return;
    onClose();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && !embedded) {
      const focusable = Array.from(editorRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]'
      ) || []).filter(element => element.tabIndex !== -1 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === editorRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && !showMarkerForm && !showCommentForm) {
      event.preventDefault();
      requestClose();
      return;
    }
    // Do not hijack typing, sliders, selects or native button shortcuts.
    if ((event.target as HTMLElement).closest('input, textarea, select, button, summary, a, [contenteditable="true"]')) return;
    if (!isReady) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); skipBack(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); skipForward(); }
    if (!showMarkerForm && !showCommentForm && canChangeData) {
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); openMarkerForm(); }
      if (event.key.toLowerCase() === 'c') { event.preventDefault(); openCommentForm(); }
    }
  };

  return (
    <div
      ref={editorRef}
      role={embedded ? 'region' : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-labelledby={`audio-editor-title-${asset.id}`}
      aria-describedby={`audio-editor-help-${asset.id}`}
      tabIndex={-1}
      onKeyDown={handleEditorKeyDown}
      className={embedded ? 'audio-workspace' : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}
    >
      <div className={embedded ? 'bg-obsidian-800 border border-surface-border rounded-2xl w-full' : 'bg-obsidian-800 border border-obsidian-600 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl'}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-obsidian-600">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
              <Scissors size={16} className="text-accent-purple" />
            </div>
            <div className="min-w-0">
              <h2 id={`audio-editor-title-${asset.id}`} className="font-semibold text-text-primary text-sm">Audio-Editor</h2>
              <p className="text-xs text-text-muted truncate max-w-xs" title={asset.name}>{asset.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={saveAll}
              disabled={!canChangeData}
              className="btn-primary text-sm flex items-center gap-1.5"
              title="Gesamte Markenliste auf dem Server speichern"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Speichert…' : 'Speichern'}
            </button>
            <button onClick={requestClose} disabled={isSaving || pendingAction !== null} aria-label="Audio-Editor schließen" title="Audio-Editor schließen" className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg transition-colors disabled:opacity-40">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div id={`audio-editor-help-${asset.id}`} className="rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-3 text-xs text-text-muted space-y-1.5">
            <p className="text-text-primary font-medium">1. Anhören · 2. Marken oder Kommentare setzen · 3. Schnittliste exportieren</p>
            <p>Die Audiodatei bleibt unverändert. Marken und Kommentare werden beim Hinzufügen direkt gespeichert. Ein Klick auf einen Timecode springt zur Stelle, ohne die Wiedergabe zu starten.</p>
            <details>
              <summary className="cursor-pointer text-accent-purple">Tastatur &amp; Bedienhilfe</summary>
              <p className="mt-2">Außerhalb von Eingabefeldern und Schaltflächen: Leertaste = Wiedergabe/Pause, ← / → = 10 Sekunden zurück/vor, M = Marke, C = Kommentar. Tab navigiert durch die Werkzeuge; Enter aktiviert eine Schaltfläche. Escape schließt den Editor, wenn kein Formular geöffnet ist.</p>
            </details>
          </div>
          {dataError && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-2">
              <p>Marken und Kommentare konnten nicht geladen werden: {dataError}</p>
              <p>Speichern und Export sind gesperrt, damit keine unvollständige Schnittliste verwendet wird.</p>
              <button onClick={loadData} disabled={isDataLoading} className="btn-secondary text-xs">Erneut laden</button>
            </div>
          )}
          <p role="status" aria-live="polite" className="text-xs text-text-muted">{pendingAction ? 'Änderung wird gespeichert…' : isDataLoading ? 'Marken und Kommentare werden geladen…' : statusMessage}</p>
          {/* Waveform */}
          <div className="bg-obsidian-900 rounded-xl p-4 border border-obsidian-600">
            {saveError && (
              <div role="alert" className="flex items-center gap-2 mb-3 p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
                <AlertCircle size={14} />
                <span className="flex-1">{saveError}</span>
                <button onClick={() => setSaveError(null)} aria-label="Meldung schließen"><X size={13} /></button>
              </div>
            )}
            {isLoading && (
              <div className="flex items-center justify-center h-24 gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Audio wird geladen…</span>
              </div>
            )}
            {loadError && (
              <div role="alert" className="flex items-center justify-center h-24 text-red-400 text-sm">
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
                      aria-label={`Zu ${m.label || typeInfo?.label} bei ${formatTime(m.time)} springen`}
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
                      title={`Kommentar: ${c.content || c.text} @ ${formatTime(c.time)}`}
                      aria-label={`Zum Kommentar bei ${formatTime(c.time)} springen`}
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
            <div className="flex items-center justify-between text-xs text-text-muted mt-2">
              <button
                type="button"
                onClick={copyCurrentTime}
                className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
                title="Aktuellen Timecode kopieren"
                aria-label={`Aktuellen Timecode ${formatTime(currentTime)} kopieren`}
              >
                <span>{formatTime(currentTime)}</span><Copy size={11} />
              </button>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-obsidian-900 rounded-xl p-3 border border-obsidian-600">
            <div role="group" aria-label="Wiedergabe" className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Anhören</span>
              <button onClick={stop} disabled={!isReady} aria-label="Stoppen und zum Anfang springen" title="Stoppen und zum Anfang springen" className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <Square size={16} />
              </button>
              <button onClick={skipBack} disabled={!isReady} aria-label="10 Sekunden zurück" title="10 Sekunden zurück (←)" className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <SkipBack size={16} />
              </button>
              <button
                onClick={togglePlay}
                disabled={!isReady}
                aria-label={isPlaying ? 'Wiedergabe pausieren' : 'Wiedergabe starten'}
                title={isPlaying ? 'Pause (Leertaste)' : 'Wiedergabe (Leertaste)'}
                className="w-10 h-10 rounded-full bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
              </button>
              <button onClick={skipForward} disabled={!isReady} aria-label="10 Sekunden vor" title="10 Sekunden vor (→)" className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-obsidian-700 disabled:opacity-40 transition-colors">
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume */}
            <div role="group" aria-label="Lautstärke" className="flex items-center gap-2">
              <button onClick={() => setIsMuted(p => !p)} aria-label={isMuted ? 'Ton einschalten' : 'Stummschalten'} title={isMuted ? 'Ton einschalten' : 'Stummschalten'} aria-pressed={isMuted} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05"
                aria-label="Lautstärke"
                aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)} Prozent`}
                value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                className="w-20 accent-accent-purple"
              />
            </div>

            {/* Wiedergabe */}
            <div className="flex items-center gap-2">
              <label htmlFor={`audio-speed-${asset.id}`} className="text-xs text-text-muted">Tempo</label>
              <select
                id={`audio-speed-${asset.id}`}
                value={playbackRate}
                onChange={e => setPlaybackRate(parseFloat(e.target.value))}
                className="input text-xs py-1 px-2 w-20"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
              </select>
              <button
                type="button"
                onClick={() => setIsLooping(p => !p)}
                className={`p-1.5 rounded-lg transition-colors ${isLooping ? 'text-accent-purple bg-accent-purple/15' : 'text-text-muted hover:text-text-primary hover:bg-obsidian-700'}`}
                title={isLooping ? 'Loop deaktivieren' : 'Loop aktivieren'}
                aria-label="Gesamte Audiodatei wiederholen"
                aria-pressed={isLooping}
              >
                <Repeat size={15} />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <label htmlFor={`audio-zoom-${asset.id}`} className="text-xs text-text-muted">Zoom</label>
              <input
                id={`audio-zoom-${asset.id}`}
                type="range" min="10" max="500" step="10"
                value={zoom}
                onChange={e => setZoom(parseInt(e.target.value))}
                className="w-24 accent-accent-purple"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div role="group" aria-label="Markieren und kommentieren" className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openMarkerForm}
              disabled={!isReady || !canChangeData}
              title="Marke am aktuellen Zeitpunkt hinzufügen (M)"
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Scissors size={14} /> Marke setzen
            </button>
            <button
              onClick={openCommentForm}
              disabled={!isReady || !canChangeData}
              title="Kommentar am aktuellen Zeitpunkt hinzufügen (C)"
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <MessageSquare size={14} /> Kommentar hinzufügen
            </button>
            <span className="text-xs text-text-muted">bei {formatTime(currentTime)} · Typ und Zeitpunkt im Formular anpassbar</span>
          </div>

          {/* Marker Form */}
          {showMarkerForm && (
            <form onSubmit={event => { event.preventDefault(); addMarker(); }} className="bg-obsidian-900 border border-obsidian-600 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Flag size={14} className="text-accent-purple" /> Neue Marke
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={`marker-type-${asset.id}`} className="label text-xs">Typ</label>
                  <select id={`marker-type-${asset.id}`} disabled={dataBusy} value={markerForm.type} onChange={e => setMarkerForm(p => ({ ...p, type: e.target.value }))} className="select text-sm">
                    {MARKER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`marker-label-${asset.id}`} className="label text-xs">Bezeichnung (optional)</label>
                  <input
                    id={`marker-label-${asset.id}`}
                    autoFocus
                    disabled={dataBusy}
                    type="text"
                    value={markerForm.label}
                    onChange={e => setMarkerForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="z. B. Intro Ende"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`marker-time-${asset.id}`} className="label text-xs">Zeitpunkt (Sekunden)</label>
                  <input
                    id={`marker-time-${asset.id}`}
                    disabled={dataBusy}
                    required
                    min="0"
                    max={duration > 0 ? duration : undefined}
                    aria-invalid={!validTime(markerForm.time)}
                    aria-describedby={`marker-time-help-${asset.id}`}
                    type="number"
                    step="any"
                    value={Number.isFinite(markerForm.time) ? markerForm.time : ''}
                    onChange={e => setMarkerForm(p => ({ ...p, time: e.target.valueAsNumber }))}
                    className="input text-sm"
                  />
                  <p id={`marker-time-help-${asset.id}`} className="text-xs text-text-muted mt-1">{timeHelp}</p>
                  <button type="button" disabled={!isReady || dataBusy} onClick={() => setMarkerForm(p => ({ ...p, time: currentTime }))} className="text-xs text-accent-purple mt-1 hover:underline">Aktuelle Position übernehmen</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={!canChangeData || !validTime(markerForm.time)} className="btn-primary text-sm">{pendingAction === 'add-marker' ? 'Speichert…' : 'Marke hinzufügen'}</button>
                <button type="button" disabled={dataBusy} onClick={() => { setShowMarkerForm(false); setMarkerForm({ type: 'cut', label: '', time: 0 }); editorRef.current?.focus(); }} className="btn-secondary text-sm">Abbrechen</button>
              </div>
            </form>
          )}

          {/* Timed Comment Form */}
          {showCommentForm && (
            <form onSubmit={event => { event.preventDefault(); addTimedComment(); }} className="bg-obsidian-900 border border-obsidian-600 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <MessageSquare size={14} className="text-accent-purple" /> Zeitbezogener Kommentar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor={`comment-text-${asset.id}`} className="label text-xs">Kommentar</label>
                  <textarea
                    id={`comment-text-${asset.id}`}
                    autoFocus
                    required
                    disabled={dataBusy}
                    value={commentForm.text}
                    onChange={e => setCommentForm(p => ({ ...p, text: e.target.value }))}
                    placeholder="Anmerkung für die Produktion…"
                    className="textarea text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label htmlFor={`comment-time-${asset.id}`} className="label text-xs">Zeitpunkt (Sekunden)</label>
                  <input
                    id={`comment-time-${asset.id}`}
                    disabled={dataBusy}
                    required
                    min="0"
                    max={duration > 0 ? duration : undefined}
                    aria-invalid={!validTime(commentForm.time)}
                    aria-describedby={`comment-time-help-${asset.id}`}
                    type="number"
                    step="any"
                    value={Number.isFinite(commentForm.time) ? commentForm.time : ''}
                    onChange={e => setCommentForm(p => ({ ...p, time: e.target.valueAsNumber }))}
                    className="input text-sm"
                  />
                  <p id={`comment-time-help-${asset.id}`} className="text-xs text-text-muted mt-1">{timeHelp}</p>
                  <button type="button" disabled={!isReady || dataBusy} onClick={() => setCommentForm(p => ({ ...p, time: currentTime }))} className="text-xs text-accent-purple mt-1 hover:underline">Aktuelle Position übernehmen</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={!canChangeData || !commentForm.text.trim() || !validTime(commentForm.time)} className="btn-primary text-sm">{pendingAction === 'add-comment' ? 'Speichert…' : 'Kommentar hinzufügen'}</button>
                <button type="button" disabled={dataBusy} onClick={() => { setShowCommentForm(false); setCommentForm({ text: '', time: 0 }); editorRef.current?.focus(); }} className="btn-secondary text-sm">Abbrechen</button>
              </div>
            </form>
          )}

          {/* Marker List */}
          <div className="bg-obsidian-900 border border-obsidian-600 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowMarkerList(p => !p)}
              aria-expanded={showMarkerList}
              aria-controls={`marker-list-${asset.id}`}
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-text-primary hover:bg-obsidian-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Scissors size={14} className="text-accent-purple" />
                Marken &amp; Schnittliste ({markers.length})
              </span>
              {showMarkerList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMarkerList && (
              <div id={`marker-list-${asset.id}`} className="divide-y divide-obsidian-700">
                {markers.length > 0 && (
                  <div className="p-3 space-y-2">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`marker-search-${asset.id}`} className="label text-xs">Marken suchen</label>
                        <input id={`marker-search-${asset.id}`} type="search" value={markerSearch} onChange={event => setMarkerSearch(event.target.value)} placeholder="Bezeichnung oder Person…" className="input text-sm" />
                      </div>
                      <div>
                        <label htmlFor={`marker-filter-${asset.id}`} className="label text-xs">Typ filtern</label>
                        <select id={`marker-filter-${asset.id}`} value={markerTypeFilter} onChange={event => setMarkerTypeFilter(event.target.value)} className="select text-sm">
                          <option value="all">Alle Typen</option>
                          {MARKER_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted">{visibleMarkers.length} von {markers.length} Marken · chronologisch · Exporte enthalten immer alle Einträge</p>
                  </div>
                )}
                {isDataLoading ? (
                  <p className="text-xs text-text-muted p-3 text-center">Marken werden geladen…</p>
                ) : dataError ? (
                  <p className="text-xs text-text-muted p-3 text-center">Liste nicht verfügbar. Bitte oben erneut laden.</p>
                ) : markers.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-text-muted">Noch keine Marken. Wähle eine Stelle in der Wellenform und setze eine Schnittmarke, ein Kapitel oder eine Start-/Endmarke.</p>
                    <button onClick={openMarkerForm} disabled={!isReady || !canChangeData} className="btn-secondary text-xs">Erste Marke setzen</button>
                  </div>
                ) : visibleMarkers.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-text-muted">Keine Marken für diese Suche oder diesen Typ.</p>
                    <button onClick={() => { setMarkerSearch(''); setMarkerTypeFilter('all'); }} className="btn-secondary text-xs">Filter zurücksetzen</button>
                  </div>
                ) : (
                  visibleMarkers.map(m => {
                    const typeInfo = MARKER_TYPES.find(t => t.value === m.type);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-obsidian-800 transition-colors group">
                        <span className="text-lg" style={{ color: m.color }}>{typeInfo?.icon || '|'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-text-primary break-words">{m.label || typeInfo?.label}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: m.color + '20', color: m.color }}>{typeInfo?.label}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                            <Clock size={10} />
                            <button onClick={() => seekToTime(m.time)} disabled={!isReady} aria-label={`Zur Marke ${m.label || typeInfo?.label} bei ${formatTime(m.time)} springen`} title="Zur Stelle springen, ohne Wiedergabe zu starten" className="text-accent-purple hover:underline disabled:opacity-40">{formatTime(m.time)}</button>
                            {m.userName && <span>· {m.userName}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => seekToTime(m.time)}
                          disabled={!isReady}
                          aria-label={`Zur Marke ${m.label || typeInfo?.label} springen`}
                          title="Zur Stelle springen"
                          className="p-2 shrink-0 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg disabled:opacity-40 transition-colors"
                        >
                          <SkipForward size={14} />
                        </button>
                        <button
                          onClick={() => deleteMarker(m)}
                          disabled={!canChangeData}
                          aria-label={`Marke ${m.label || typeInfo?.label} löschen`}
                          title="Marke löschen (mit Bestätigung)"
                          className="p-2 shrink-0 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg disabled:opacity-40 transition-colors"
                        >
                          {pendingAction === `delete-marker-${m.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
              aria-expanded={showCommentList}
              aria-controls={`comment-list-${asset.id}`}
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-text-primary hover:bg-obsidian-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageSquare size={14} className="text-accent-purple" />
                Zeitbezogene Kommentare ({timedComments.length})
              </span>
              {showCommentList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCommentList && (
              <div id={`comment-list-${asset.id}`} className="divide-y divide-obsidian-700">
                {isDataLoading ? (
                  <p className="text-xs text-text-muted p-3 text-center">Kommentare werden geladen…</p>
                ) : dataError ? (
                  <p className="text-xs text-text-muted p-3 text-center">Liste nicht verfügbar. Bitte oben erneut laden.</p>
                ) : timedComments.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-text-muted">Noch keine Kommentare. Halte Hinweise für die Produktion direkt an der passenden Audiostelle fest.</p>
                    <button onClick={openCommentForm} disabled={!isReady || !canChangeData} className="btn-secondary text-xs">Ersten Kommentar hinzufügen</button>
                  </div>
                ) : (
                  [...timedComments].sort((a, b) => (a.time ?? 0) - (b.time ?? 0)).map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3 hover:bg-obsidian-800 transition-colors group">
                      <span className="text-accent-purple mt-0.5">💬</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary break-words whitespace-pre-wrap">{c.content || c.text}</p>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted mt-1">
                          {c.time != null && (
                            <>
                              <Clock size={10} />
                              <button onClick={() => seekToTime(c.time!)} disabled={!isReady} aria-label={`Zum Kommentar bei ${formatTime(c.time)} springen`} title="Zur Stelle springen, ohne Wiedergabe zu starten" className="text-accent-purple hover:underline disabled:opacity-40">{formatTime(c.time)}</button>
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
                          disabled={!isReady}
                          aria-label={`Zum Kommentar bei ${formatTime(c.time)} springen`}
                          title="Zur Stelle springen"
                          className="p-2 shrink-0 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg disabled:opacity-40 transition-colors"
                        >
                          <SkipForward size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTimedComment(c)}
                        disabled={!canChangeData}
                        aria-label={`Kommentar bei ${formatTime(c.time ?? 0)} löschen`}
                        title="Kommentar löschen (mit Bestätigung)"
                        className="p-2 shrink-0 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        {pendingAction === `delete-comment-${c.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <section aria-labelledby={`audio-export-title-${asset.id}`} className="bg-obsidian-900 border border-obsidian-600 rounded-xl p-4 space-y-3">
            <div>
              <h3 id={`audio-export-title-${asset.id}`} className="text-sm font-semibold text-text-primary">Schnittliste exportieren</h3>
              <p className="text-xs text-text-muted mt-1">Alle {markers.length} Marken und {timedComments.length} Kommentare, chronologisch. Es wird keine bearbeitete Audiodatei erzeugt.</p>
            </div>
            <div role="group" aria-label="Exportformat wählen" className="flex flex-wrap gap-2">
              <button onClick={exportCutListPdf} disabled={dataBusy || !!dataError} className="btn-secondary text-sm flex items-center gap-1.5" title="Marker und Kommentare als lesbare PDF-Schnittliste exportieren">
                <Download size={14} /> Schnittliste (PDF)
              </button>
              <button onClick={exportAuditionMarkers} disabled={dataBusy || !!dataError} className="btn-secondary text-sm flex items-center gap-1.5" title="In Adobe Audition über Datei → Importieren → Marker aus Datei importieren">
                <Download size={14} /> Audition-Marker (CSV)
              </button>
              <button onClick={exportEditDecisionList} disabled={dataBusy || !!dataError} className="btn-secondary text-sm flex items-center gap-1.5" title="Alle Marker und Kommentare als strukturierten JSON-Schnittplan exportieren">
                <Download size={14} /> Schnittplan (JSON)
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
