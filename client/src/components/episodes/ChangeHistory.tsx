import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, History, Loader2, RefreshCw, RotateCcw, UserRound } from 'lucide-react';
import { episodeWorkflowApi } from '../../lib/api';

interface ChangeHistoryProps {
  episodeId: string;
  onRollback?: (episode: any) => void;
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Titel', subtitle: 'Untertitel', description: 'Beschreibung', status: 'Status',
  publishDate: 'Veröffentlichung', duration: 'Laufzeit', category: 'Kategorie', tags: 'Tags',
  hosts: 'Hosts', guests: 'Gäste', blocks: 'Script-Blöcke', technicalData: 'Technische Daten',
};

export default function ChangeHistory({ episodeId, onRollback }: ChangeHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const revisions = await episodeWorkflowApi.getHistory(episodeId);
      setHistory(revisions);
      setSelectedId(previous => previous && revisions.some((item: any) => item.id === previous) ? previous : revisions[0]?.id || null);
    } catch (requestError: any) {
      setError(requestError?.message || 'Änderungsverlauf konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onRealtime = (raw: Event) => {
      const event = (raw as CustomEvent).detail;
      if (event?.episodeId !== episodeId) return;
      if (event?.type === 'episode.field.updated' || event?.type === 'episode.rollback.completed') void load();
    };
    window.addEventListener('podcore:realtime', onRealtime);
    return () => window.removeEventListener('podcore:realtime', onRealtime);
  }, [episodeId, load]);

  const selectedIndex = history.findIndex(item => item.id === selectedId);
  const selected = selectedIndex >= 0 ? history[selectedIndex] : null;
  const previous = selectedIndex >= 0 ? history[selectedIndex + 1] : null;
  const diffFields = useMemo(() => {
    if (!selected) return [];
    const fields = new Set<string>(selected.changedFields || []);
    if (previous) {
      Object.keys(selected.snapshot || {}).forEach(field => {
        if (JSON.stringify(selected.snapshot?.[field]) !== JSON.stringify(previous.snapshot?.[field])) fields.add(field);
      });
    }
    return Array.from(fields).filter(field => !['id', 'ideaId', 'updatedAt'].includes(field));
  }, [selected, previous]);

  const rollback = async (revision: any) => {
    if (!window.confirm(`Revision ${revision.revisionNumber} wirklich wiederherstellen? Der aktuelle Stand bleibt im Audit-Log erhalten.`)) return;
    setRollingBack(revision.id);
    setError(null);
    try {
      const result = await episodeWorkflowApi.rollback(episodeId, revision.id);
      onRollback?.(result.episode);
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || 'Rollback konnte nicht ausgeführt werden.');
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <section className="card space-y-4" aria-label="Änderungsverlauf">
      <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-text-primary"><History size={16} className="text-accent-purple" /> Versionsverlauf</h3><p className="mt-1 text-xs text-text-muted">Jeder Auto-Save, Statuswechsel und Rollback wird nachvollziehbar protokolliert.</p></div><button type="button" onClick={() => void load()} className="btn-ghost p-2" title="Verlauf aktualisieren"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button></div>
      {error && <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">{error}</div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted"><Loader2 size={14} className="animate-spin" /> Revisionen werden geladen…</div> : history.length === 0 ? <div className="py-8 text-center text-xs text-text-muted">Noch keine Revisionen vorhanden. Der Verlauf beginnt mit dem nächsten Auto-Save.</div> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">{history.map(revision => <button type="button" key={revision.id} onClick={() => setSelectedId(revision.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === revision.id ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border bg-obsidian-900/50 hover:border-accent-purple/40'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-text-primary">Revision {revision.revisionNumber}</span><ChevronDown size={12} className={`text-text-muted transition-transform ${selectedId === revision.id ? 'rotate-180' : ''}`} /></div><div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted"><UserRound size={10} /> {revision.changedByName || 'System'}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted"><Clock3 size={10} /> {new Date(revision.createdAt).toLocaleString('de-DE')}</div><div className="mt-2 flex flex-wrap gap-1">{(revision.changedFields || []).slice(0, 4).map((field: string) => <span key={field} className="rounded bg-surface-overlay px-1.5 py-0.5 text-[9px] text-text-muted">{FIELD_LABELS[field] || field}</span>)}</div></button>)}</div>
          {selected && <div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-medium text-text-primary">{selected.changeType || 'Änderung'}</p><p className="text-[10px] text-text-muted">Vergleich mit {previous ? `Revision ${previous.revisionNumber}` : 'Ausgangsstand'}</p></div><button type="button" onClick={() => void rollback(selected)} disabled={!!rollingBack} className="btn-ghost flex items-center gap-1 border border-accent-amber/30 px-2 py-1.5 text-xs text-accent-amber disabled:opacity-50">{rollingBack === selected.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Wiederherstellen</button></div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{diffFields.length === 0 ? <p className="py-8 text-center text-xs text-text-muted">Kein Feld-Diff verfügbar.</p> : diffFields.map(field => { const before = formatValue(previous?.snapshot?.[field]); const after = formatValue(selected.snapshot?.[field]); return <div key={field} className="overflow-hidden rounded-lg border border-surface-border"><div className="bg-surface-overlay px-3 py-1.5 text-[10px] font-semibold text-text-primary">{FIELD_LABELS[field] || field}</div><div className="grid gap-px bg-surface-border md:grid-cols-2"><pre className="max-h-36 overflow-auto whitespace-pre-wrap bg-accent-red/5 p-3 text-[10px] text-text-secondary"><span className="mb-1 block font-semibold text-accent-red">− Vorher</span>{before}</pre><pre className="max-h-36 overflow-auto whitespace-pre-wrap bg-accent-green/5 p-3 text-[10px] text-text-secondary"><span className="mb-1 block font-semibold text-accent-green">+ Nachher</span>{after}</pre></div></div>; })}</div>
            <div className="flex items-start gap-2 rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-2 text-[10px] text-text-muted"><AlertTriangle size={12} className="mt-0.5 shrink-0 text-accent-amber" /> Rollbacks überschreiben keine Historie, sondern erzeugen eine neue, vollständig auditierbare Revision.</div>
          </div>}
        </div>
      )}
    </section>
  );
}
