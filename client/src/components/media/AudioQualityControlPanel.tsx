import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardCheck, Download, Headphones, Link2, Save } from 'lucide-react';
import { episodeWorkflowApi, mediaApi } from '../../lib/api';

type CheckState = Record<string, boolean>;

type AudioQualityData = {
  episodeId: string;
  version: string;
  assignee: string;
  checks: CheckState;
  notes: string;
  approvedAt: string;
};

const QUALITY_KEY = 'podcore_audio_quality_v1';

const CHECKS = [
  ['edit', 'Schnitt und Regieanweisungen umgesetzt'],
  ['noise', 'Störgeräusche, Schnitte und Übergänge geprüft'],
  ['loudness', 'Lautheit und Klangbild geprüft'],
  ['chapters', 'Kapitel, Marker und Zeitangaben geprüft'],
  ['music', 'Intro, Outro und Musikrechte geprüft'],
  ['finalFile', 'Finale Audiodatei und Version bestätigt'],
] as const;

const defaultQuality = (): AudioQualityData => ({ episodeId: '', version: '', assignee: '', checks: {}, notes: '', approvedAt: '' });

function getMetadata(asset: any): unknown[] {
  const metadata = asset?.customMetadata ?? asset?.custom_metadata ?? [];
  return Array.isArray(metadata) ? metadata : [];
}

function parseQuality(metadata: unknown): AudioQualityData {
  const entries = Array.isArray(metadata) ? metadata : [];
  const entry = entries.find((item: any) => item?.key === QUALITY_KEY);
  if (!entry?.value) return defaultQuality();
  try {
    const parsed = typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
    return { ...defaultQuality(), ...parsed, checks: parsed?.checks || {} };
  } catch { return defaultQuality(); }
}

function metadataWithQuality(metadata: unknown, quality: AudioQualityData) {
  const entries = Array.isArray(metadata) ? metadata.filter((item: any) => item?.key !== QUALITY_KEY) : [];
  return [...entries, { key: QUALITY_KEY, value: JSON.stringify(quality) }];
}

export default function AudioQualityControlPanel({ asset, episodes, disabled, onSaved, onNotify, onError }: {
  asset: any;
  episodes: any[];
  disabled: boolean;
  onSaved: (asset: any) => void;
  onNotify?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [data, setData] = useState<AudioQualityData>(() => parseQuality(getMetadata(asset)));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setData(parseQuality(getMetadata(asset))); }, [asset?.id, asset?.customMetadata, asset?.custom_metadata]);

  const checks = useMemo(() => Object.fromEntries(CHECKS.map(([key]) => [key, Boolean(data.checks[key])])), [data.checks]);
  const completed = Object.values(checks).filter(Boolean).length;
  const complete = completed === CHECKS.length;

  const update = (changes: Partial<AudioQualityData>) => setData(current => ({ ...current, ...changes }));

  const save = async () => {
    setIsSaving(true);
    try {
      const next = { ...data, approvedAt: complete ? (data.approvedAt || new Date().toISOString()) : '' };
      const updated = await mediaApi.saveAudioQuality(asset.id, next);
      if (next.episodeId) {
        const linkedAssets = await episodeWorkflowApi.getMedia(next.episodeId);
        const isLinked = Array.isArray(linkedAssets) && linkedAssets.some((item: any) => item?.id === asset.id || item?.assetId === asset.id);
        if (!isLinked) await episodeWorkflowApi.linkMedia(next.episodeId, asset.id, 'master');
      }
      onSaved(updated);
      onNotify?.(complete ? 'Audio-Abnahme gespeichert und vollständig bestätigt' : 'Audio-Abnahme als Zwischenstand gespeichert');
    } catch (error: any) {
      onError?.(error?.message || 'Audio-Abnahme konnte nicht gespeichert werden');
    } finally { setIsSaving(false); }
  };

  const exportQuality = () => {
    const linkedEpisode = episodes.find((episode: any) => episode.id === data.episodeId);
    const payload = { format: 'PodCore Audio-Abnahme', generatedAt: new Date().toISOString(), asset: { id: asset.id, name: asset.name, filename: asset.filename, duration: asset.duration }, episode: linkedEpisode ? { id: linkedEpisode.id, number: linkedEpisode.number, title: linkedEpisode.title } : null, quality: { ...data, complete } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `PodCore-Audio-Abnahme-${String(asset.name || 'Audio').replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-+|-+$/g, '')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.('Audio-Abnahme exportiert');
  };

  return <div className="space-y-5">
    <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 className="flex items-center gap-2 font-semibold text-text-primary"><ClipboardCheck size={18} className="text-accent-cyan" /> Audio-Abnahme</h2><p className="mt-1 text-xs text-text-muted">Die Qualitätskontrolle wird direkt mit der Audiodatei gespeichert und kann mit einer Episode verknüpft werden.</p></div>
        <div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${complete ? 'bg-accent-green/15 text-accent-green' : 'bg-obsidian-800 text-text-secondary'}`}>{completed}/{CHECKS.length} bestätigt</span><button type="button" onClick={exportQuality} className="btn-secondary text-xs"><Download size={14} /> Export</button></div>
      </div>
    </div>

    <section className="card space-y-4">
      <div className="flex items-center gap-2"><Headphones size={18} className="text-accent-cyan" /><h3 className="font-semibold text-text-primary">Datei und Episode</h3></div>
      <div className="rounded-lg border border-surface-border bg-obsidian-900 p-3 text-sm"><span className="text-text-muted">Audiodatei: </span><span className="font-medium text-text-primary">{asset.name}</span></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Zugeordnete Episode</label><select value={data.episodeId} disabled={disabled || isSaving} onChange={event => update({ episodeId: event.target.value })} className="input"><option value="">Noch keiner Episode zuordnen</option>{episodes.map((episode: any) => <option key={episode.id} value={episode.id}>{episode.number ? `Folge ${episode.number} · ` : ''}{episode.title || 'Unbenannte Episode'}</option>)}</select></div>
        <div><label className="label">Finale Audio-Version</label><input value={data.version} disabled={disabled || isSaving} onChange={event => update({ version: event.target.value })} className="input" placeholder="z.B. Master v03 / final" /></div>
      </div>
      <div><label className="label">Schnitt / Abnahme durch</label><input value={data.assignee} disabled={disabled || isSaving} onChange={event => update({ assignee: event.target.value })} className="input" placeholder="Name oder Rolle" /></div>
      {data.episodeId && <p className="flex items-center gap-1.5 text-xs text-text-muted"><Link2 size={13} /> Beim Speichern wird diese Datei mit der ausgewählten Episode als Master-Audio verknüpft.</p>}
    </section>

    <section className="card space-y-3">
      <h3 className="font-semibold text-text-primary">Qualitätskontrolle</h3>
      {CHECKS.map(([key, label]) => {
        const checked = Boolean(data.checks[key]);
        return <label key={key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-accent-green/35 bg-accent-green/5 text-text-primary' : 'border-surface-border bg-obsidian-900 text-text-secondary'}`}><input type="checkbox" checked={checked} disabled={disabled || isSaving} onChange={event => update({ checks: { ...data.checks, [key]: event.target.checked } })} className="mt-0.5 accent-accent-green" /><span className="flex-1">{label}</span>{checked ? <CheckCircle2 size={16} className="shrink-0 text-accent-green" /> : <Circle size={16} className="shrink-0 text-text-muted" />}</label>;
      })}
      <div><label className="label">Abnahmenotiz</label><textarea value={data.notes} disabled={disabled || isSaving} onChange={event => update({ notes: event.target.value })} rows={4} className="input" placeholder="Offene Punkte, Korrekturen oder Hinweise zur finalen Datei …" /></div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-obsidian-800 p-3"><p className="text-xs text-text-muted">{complete ? `Vollständig bestätigt${data.approvedAt ? ` am ${new Date(data.approvedAt).toLocaleString('de-DE')}` : ''}.` : 'Die Audio-Abnahme ist noch nicht vollständig bestätigt.'}</p><button type="button" onClick={save} disabled={disabled || isSaving} className="btn-primary text-sm"><Save size={15} /> {isSaving ? 'Speichert …' : 'Audio-Abnahme speichern'}</button></div>
  </div>;
}
