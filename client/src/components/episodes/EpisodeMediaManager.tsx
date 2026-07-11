import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, FileAudio, Link2, Loader2, RefreshCw, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { episodeWorkflowApi, mediaApi } from '../../lib/api';

interface EpisodeMediaManagerProps {
  episodeId: string;
  onAnalyze?: (asset: any) => void;
}

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'mp4', 'webm', 'm4b'];

function formatBytes(value?: number) {
  if (!value) return '–';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(value?: number) {
  if (!value) return 'Dauer unbekannt';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.round(value % 60);
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(hours ? 2 : 1, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function EpisodeMediaManager({ episodeId, onAnalyze }: EpisodeMediaManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string[]>([]);
  const [analysisByAsset, setAnalysisByAsset] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await episodeWorkflowApi.getMedia(episodeId));
    } catch (requestError: any) {
      setError(requestError?.message || 'Verknüpfte Medien konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onRealtime = (raw: Event) => {
      const event = (raw as CustomEvent).detail;
      if (event?.episodeId !== episodeId || !event?.payload?.jobId) return;
      if (event.type === 'episode.audio-analysis.completed' || event.type === 'episode.audio-analysis.failed') {
        setAnalysisByAsset(previous => {
          const assetId = Object.keys(previous).find(key => previous[key]?.jobId === event.payload.jobId);
          if (!assetId) return previous;
          const next = { ...previous, [assetId]: { ...previous[assetId], status: event.type.endsWith('completed') ? 'completed' : 'failed', progress: 100, result: event.type.endsWith('completed') ? event.payload : null, error: event.payload.error } };
          return next;
        });
        if (event.type === 'episode.audio-analysis.completed') onAnalyze?.(event.payload);
      }
    };
    window.addEventListener('podcore:realtime', onRealtime);
    return () => window.removeEventListener('podcore:realtime', onRealtime);
  }, [episodeId, onAnalyze]);

  const pollAnalysis = async (assetId: string, jobId: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 1200));
      try {
        const job = await episodeWorkflowApi.getAudioJob(episodeId, jobId);
        setAnalysisByAsset(previous => ({ ...previous, [assetId]: { ...job, jobId } }));
        if (job.status === 'completed' || job.status === 'failed') {
          if (job.status === 'completed') onAnalyze?.(job.result);
          return;
        }
      } catch (requestError: any) {
        if (attempt === 29) setError(requestError?.message || 'Analysestatus konnte nicht geladen werden.');
      }
    }
    setAnalysisByAsset(previous => ({ ...previous, [assetId]: { ...previous[assetId], status: 'timeout', error: 'Die Analyse läuft weiter. Bitte später erneut laden.' } }));
  };

  const analyze = async (asset: any) => {
    setError(null);
    setAnalysisByAsset(previous => ({ ...previous, [asset.id]: { status: 'queued', progress: 0 } }));
    try {
      const job = await episodeWorkflowApi.analyzeAudio(episodeId, asset.id);
      setAnalysisByAsset(previous => ({ ...previous, [asset.id]: { ...job, jobId: job.jobId || job.id } }));
      void pollAnalysis(asset.id, job.jobId || job.id);
    } catch (requestError: any) {
      const message = requestError?.message || 'Audioanalyse konnte nicht gestartet werden.';
      setAnalysisByAsset(previous => ({ ...previous, [asset.id]: { status: 'failed', error: message } }));
      setError(message);
    }
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const invalid = files.find(file => !ALLOWED_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() || ''));
    if (invalid) {
      setError(`${invalid.name}: Dieser Dateityp wird nicht unterstützt.`);
      return;
    }
    setUploading(files.map(file => file.name));
    setError(null);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, ''));
        formData.append('type', file.type.startsWith('video/') ? 'video' : 'audio');
        formData.append('tags', JSON.stringify(['episode-upload', `episode:${episodeId}`]));
        const asset = await mediaApi.upload(formData);
        await episodeWorkflowApi.linkMedia(episodeId, asset.id, 'source');
      } catch (requestError: any) {
        setError(`${file.name}: ${requestError?.message || 'Upload fehlgeschlagen.'}`);
      } finally {
        setUploading(previous => previous.filter(name => name !== file.name));
      }
    }
    await load();
  };

  const unlink = async (assetId: string) => {
    try {
      await episodeWorkflowApi.unlinkMedia(episodeId, assetId);
      setAssets(previous => previous.filter(asset => asset.id !== assetId));
    } catch (requestError: any) {
      setError(requestError?.message || 'Medienverknüpfung konnte nicht entfernt werden.');
    }
  };

  return (
    <section className="card space-y-4" aria-label="Medienverwaltung">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 font-semibold text-text-primary"><AudioLines size={16} className="text-accent-blue" /> Medien & Audioquellen</h3><p className="mt-1 text-xs text-text-muted">Uploads werden zentral in der Medienbibliothek gespeichert und direkt mit dieser Episode verknüpft.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-ghost p-2" title="Medien neu laden"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { event.preventDefault(); setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files); }} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-accent-blue bg-accent-blue/10' : 'border-surface-border bg-obsidian-900/60 hover:border-accent-blue/50'}`}>
        <UploadCloud size={28} className="mb-2 text-accent-blue" />
        <span className="text-sm font-medium text-text-primary">Audio hier ablegen oder auswählen</span>
        <span className="mt-1 text-xs text-text-muted">MP3, WAV, AAC, OGG, FLAC, M4A, MP4, WebM oder M4B · maximal 1 GB</span>
      </button>
      <input ref={inputRef} type="file" multiple accept={ALLOWED_EXTENSIONS.map(extension => `.${extension}`).join(',')} className="hidden" onChange={event => { if (event.target.files) void uploadFiles(event.target.files); event.currentTarget.value = ''; }} />

      {error && <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">{error}</div>}
      {uploading.map(name => <div key={name} className="flex items-center gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3 text-xs text-accent-blue"><Loader2 size={14} className="animate-spin" /> {name} wird hochgeladen und analysiert…</div>)}

      <div className="space-y-2">
        {loading ? <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted"><Loader2 size={14} className="animate-spin" /> Medien werden geladen…</div> : assets.length === 0 ? <div className="py-6 text-center text-xs text-text-muted">Noch keine Medien mit dieser Episode verknüpft.</div> : assets.map(asset => {
          const analysis = analysisByAsset[asset.id];
          const running = analysis && ['queued', 'processing'].includes(analysis.status);
          const result = typeof analysis?.result === 'string' ? (() => { try { return JSON.parse(analysis.result); } catch { return null; } })() : analysis?.result;
          return (
          <article key={asset.id} className="rounded-lg border border-surface-border bg-obsidian-900/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><div className="rounded-lg bg-accent-blue/10 p-2 text-accent-blue"><FileAudio size={18} /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-text-primary">{asset.name}</p><p className="text-[10px] text-text-muted">{formatDuration(asset.duration)} · {formatBytes(asset.filesize)} · <span className="inline-flex items-center gap-1"><Link2 size={9} /> {asset.relationType || 'source'}</span></p></div></div>
              <div className="flex items-center gap-1"><button type="button" onClick={() => void analyze(asset)} disabled={running} className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs text-accent-purple disabled:opacity-50" title="ID3-/Kapitelmarker lesen und Interviewfragen automatisch zuordnen">{running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {running ? `${analysis.progress || 0} %` : 'Zeitstempel'}</button><button type="button" onClick={() => void unlink(asset.id)} className="btn-ghost p-2 text-text-muted hover:text-accent-red" title="Verknüpfung entfernen"><Trash2 size={14} /></button></div>
            </div>
            {asset.filename && asset.type !== 'video' && <audio controls preload="metadata" className="mt-3 h-9 w-full" src={mediaApi.getStreamUrl(asset.filename)} />}
            {analysis?.status === 'completed' && <div className="mt-3 rounded-lg border border-accent-green/25 bg-accent-green/5 p-3"><p className="text-xs font-medium text-accent-green">Zeitstempel zugeordnet · Quelle: {result?.source || analysis.source || 'Audiometadaten'}</p><p className="mt-1 text-[10px] text-text-muted">{result?.markersFound || 0} eingebettete Marker · {result?.mapped?.length || 0} Interviewfragen</p>{result?.mapped?.length > 0 && <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{result.mapped.map((item: any) => <div key={item.questionId} className="flex gap-2 text-[10px] text-text-secondary"><span className="shrink-0 font-mono text-accent-cyan">{item.timestampSeconds == null ? '--:--' : `${Math.floor(item.timestampSeconds / 60)}:${String(item.timestampSeconds % 60).padStart(2, '0')}`}</span><span className="truncate">{item.question}</span></div>)}</div>}</div>}
            {analysis && ['failed', 'timeout'].includes(analysis.status) && <div className="mt-3 rounded-lg border border-accent-amber/25 bg-accent-amber/5 p-2 text-xs text-accent-amber">{analysis.error || 'Analyse konnte nicht abgeschlossen werden.'}</div>}
          </article>
        );})}
      </div>
    </section>
  );
}
