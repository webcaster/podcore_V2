import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AtSign, CheckCircle, CornerDownRight, Loader2, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { episodeWorkflowApi } from '../../lib/api';

interface CommentThreadProps {
  episodeId: string;
  fieldKey?: string;
  fieldOptions?: Array<{ value: string; label: string }>;
}

export default function CommentThread({ episodeId, fieldKey = 'general', fieldOptions = [] }: CommentThreadProps) {
  const [selectedField, setSelectedField] = useState(fieldKey);
  const [comments, setComments] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [thread, members] = await Promise.all([
        episodeWorkflowApi.listComments(episodeId, selectedField),
        episodeWorkflowApi.getTeam(),
      ]);
      setComments(thread);
      setTeam(members);
    } catch (requestError: any) {
      setError(requestError?.message || 'Kommentare konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [episodeId, selectedField]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelectedField(fieldKey); }, [fieldKey]);
  useEffect(() => {
    const onRealtime = (raw: Event) => {
      const event = (raw as CustomEvent).detail;
      if (event?.episodeId === episodeId && String(event?.type || '').startsWith('episode.comment.')) void load();
    };
    window.addEventListener('podcore:realtime', onRealtime);
    return () => window.removeEventListener('podcore:realtime', onRealtime);
  }, [episodeId, load]);

  const roots = useMemo(() => comments.filter(comment => !comment.parentId), [comments]);
  const repliesFor = (id: string) => comments.filter(comment => comment.parentId === id);

  const mention = (member: any) => {
    const token = `@${member.username} `;
    setDraft(previous => previous.includes(`@${member.username}`) ? previous : `${previous}${previous && !previous.endsWith(' ') ? ' ' : ''}${token}`);
  };

  const submit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await episodeWorkflowApi.createComment(episodeId, { fieldKey: selectedField, parentId: replyTo?.id, content: draft.trim() });
      setComments(previous => [...previous, created]);
      setDraft('');
      setReplyTo(null);
    } catch (requestError: any) {
      setError(requestError?.message || 'Kommentar konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleResolved = async (comment: any) => {
    try {
      await episodeWorkflowApi.resolveComment(episodeId, comment.id, !comment.isResolved);
      setComments(previous => previous.map(item => item.id === comment.id ? { ...item, isResolved: !comment.isResolved } : item));
    } catch (requestError: any) {
      setError(requestError?.message || 'Status konnte nicht aktualisiert werden.');
    }
  };

  const renderComment = (comment: any, nested = false) => (
    <article key={comment.id} className={`${nested ? 'ml-6 border-l-2 border-surface-border pl-3' : ''} ${comment.isResolved ? 'opacity-65' : ''}`}>
      <div className="rounded-lg border border-surface-border bg-obsidian-900/65 p-3">
        <div className="flex items-start justify-between gap-2"><div><span className="text-xs font-medium text-text-primary">{comment.authorName}</span><span className="ml-2 text-[10px] text-text-muted">{new Date(comment.createdAt).toLocaleString('de-DE')}</span></div>{comment.isResolved && <span className="badge bg-accent-green/10 text-accent-green">Gelöst</span>}</div>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{comment.content}</p>
        {!nested && <div className="mt-2 flex items-center gap-3"><button type="button" onClick={() => { setReplyTo(comment); setDraft(''); }} className="flex items-center gap-1 text-[10px] text-accent-blue hover:underline"><CornerDownRight size={11} /> Antworten</button><button type="button" onClick={() => void toggleResolved(comment)} className="flex items-center gap-1 text-[10px] text-accent-green hover:underline"><CheckCircle size={11} /> {comment.isResolved ? 'Wieder öffnen' : 'Als gelöst markieren'}</button></div>}
      </div>
      {repliesFor(comment.id).map(reply => renderComment(reply, true))}
    </article>
  );

  return (
    <section className="card space-y-4" aria-label="Feldbezogene Kommentare">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-text-primary"><MessageSquare size={16} className="text-accent-blue" /> Kommentare & Feedback</h3><p className="mt-1 text-xs text-text-muted">Diskussionen sind direkt einem Editorfeld zugeordnet.</p></div><button type="button" onClick={() => void load()} className="btn-ghost p-2" title="Kommentare aktualisieren"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button></div>

      {fieldOptions.length > 0 && <select value={selectedField} onChange={event => { setSelectedField(event.target.value); setReplyTo(null); }} className="input text-xs" aria-label="Kommentiertes Feld">{fieldOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
      {error && <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">{error}</div>}

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">{loading ? <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted"><Loader2 size={14} className="animate-spin" /> Threads werden geladen…</div> : roots.length === 0 ? <div className="py-8 text-center text-xs text-text-muted">Noch keine Diskussion für dieses Feld.</div> : roots.map(comment => renderComment(comment))}</div>

      <div className="rounded-lg border border-surface-border bg-obsidian-900/60 p-3">
        {replyTo && <div className="mb-2 flex items-center justify-between text-[10px] text-accent-blue"><span>Antwort an {replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-primary">Abbrechen</button></div>}
        <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={3} className="input resize-y text-xs" placeholder="Feedback schreiben; @name erwähnt ein Teammitglied…" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void submit(); } }} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex max-w-full items-center gap-1 overflow-x-auto"><AtSign size={12} className="shrink-0 text-text-muted" />{team.slice(0, 8).map(member => <button key={member.id} type="button" onClick={() => mention(member)} className="whitespace-nowrap rounded-full bg-surface-overlay px-2 py-1 text-[10px] text-text-muted hover:text-accent-blue">{member.displayName || member.username}</button>)}</div><button type="button" onClick={() => void submit()} disabled={submitting || !draft.trim()} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-50">{submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Senden</button></div>
      </div>
    </section>
  );
}
