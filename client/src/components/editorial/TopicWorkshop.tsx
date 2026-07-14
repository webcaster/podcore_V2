import React, { useEffect, useMemo, useState } from 'react';
import { Check, FilePenLine, Lightbulb, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { EditorialTextBlock, editorialApi, TopicWorkshopDraft } from '../../lib/api';
import TextBlockLibrary from './TextBlockLibrary';

const EMPTY_DRAFT: TopicWorkshopDraft = {
  angle: '',
  guidingQuestion: '',
  coreThesis: '',
  audienceValue: '',
  workingTitles: [],
  teaser: '',
  episodeDescription: '',
  showNotes: '',
  callToAction: '',
  body: '',
  status: 'draft',
};

type Props = {
  ideaId: string;
  idea: any;
  canEdit: boolean;
  onSaved?: (draft: TopicWorkshopDraft) => void;
  notify: (type: 'success' | 'error', message: string) => void;
};

const STATUS_OPTIONS: Array<{ value: TopicWorkshopDraft['status']; label: string }> = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'review', label: 'In Abstimmung' },
  { value: 'ready', label: 'Bereit für Episode' },
];

export default function TopicWorkshop({ ideaId, idea, canEdit, onSaved, notify }: Props) {
  const [draft, setDraft] = useState<TopicWorkshopDraft>(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    editorialApi.getTopicWorkshop(ideaId)
      .then((data) => {
        if (!active) return;
        setDraft(data || {
          ...EMPTY_DRAFT,
          workingTitles: idea?.title ? [idea.title] : [],
          episodeDescription: idea?.description || '',
          audienceValue: idea?.targetAudience ? `Nutzen für ${idea.targetAudience}` : '',
        });
        setIsDirty(false);
      })
      .catch((error: Error) => notify('error', error.message))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [ideaId]);

  const completion = useMemo(() => {
    const fields = [draft.angle, draft.guidingQuestion, draft.coreThesis, draft.audienceValue, draft.teaser, draft.episodeDescription];
    const completed = fields.filter((value) => value.trim()).length + (draft.workingTitles.length ? 1 : 0);
    return Math.round((completed / 7) * 100);
  }, [draft]);

  const update = <K extends keyof TopicWorkshopDraft>(key: K, value: TopicWorkshopDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const addWorkingTitle = () => {
    const title = newTitle.trim();
    if (!title || draft.workingTitles.includes(title)) return;
    update('workingTitles', [...draft.workingTitles, title]);
    setNewTitle('');
  };

  const useTextBlock = (block: EditorialTextBlock) => {
    const field: keyof Pick<TopicWorkshopDraft, 'teaser' | 'episodeDescription' | 'showNotes' | 'callToAction' | 'body'> =
      block.type === 'teaser' ? 'teaser' :
      block.type === 'description' ? 'episodeDescription' :
      block.type === 'show-notes' ? 'showNotes' :
      block.type === 'cta' ? 'callToAction' : 'body';
    const currentValue = String(draft[field] || '').trim();
    update(field, `${currentValue}${currentValue ? '\n\n' : ''}${block.content}` as never);
    notify('success', `„${block.title}“ wurde in den Entwurf übernommen`);
  };

  const save = async () => {
    if (!canEdit || isSaving) return;
    setIsSaving(true);
    try {
      const saved = await editorialApi.saveTopicWorkshop(ideaId, draft);
      setDraft(saved);
      setIsDirty(false);
      onSaved?.(saved);
      notify('success', 'Themenentwurf gespeichert');
    } catch (error: any) {
      notify('error', error.message || 'Themenentwurf konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && isDirty) {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draft, isDirty, canEdit, isSaving]);

  if (isLoading) {
    return <div className="flex min-h-64 items-center justify-center text-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Themenwerkstatt wird geladen …</div>;
  }

  const inputClass = 'w-full rounded-xl border border-obsidian-600 bg-obsidian-800 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent-blue disabled:opacity-60';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-accent-blue/20 bg-gradient-to-br from-accent-blue/10 to-obsidian-800 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-accent-blue"><Lightbulb className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Themenfindung</span></div>
            <h2 className="text-xl font-semibold text-text-primary">Vom Themenimpuls zum belastbaren Episodenkonzept</h2>
            <p className="mt-1 max-w-3xl text-sm text-text-muted">Schärfe Perspektive und Nutzen, sammle Arbeitstitel und formuliere zentrale Texte vor. Die Inhalte stehen danach im Episoden-Editor zur gezielten Übernahme bereit.</p>
          </div>
          <div className="flex min-w-44 items-center gap-3 rounded-xl bg-obsidian-900/60 px-3 py-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-obsidian-600"><div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${completion}%` }} /></div>
            <span className="text-xs font-semibold text-text-secondary">{completion}%</span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-obsidian-600 bg-obsidian-800/60 p-5">
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-400" /><h3 className="font-semibold text-text-primary">Themenschärfung</h3></div>
          <label><span className={labelClass}>Perspektive / redaktioneller Winkel</span><textarea disabled={!canEdit} value={draft.angle} onChange={(e) => update('angle', e.target.value)} rows={3} className={inputClass} placeholder="Aus welcher Perspektive erzählen wir das Thema?" /></label>
          <label><span className={labelClass}>Zentrale Leitfrage</span><textarea disabled={!canEdit} value={draft.guidingQuestion} onChange={(e) => update('guidingQuestion', e.target.value)} rows={2} className={inputClass} placeholder="Welche Frage soll die Episode beantworten?" /></label>
          <label><span className={labelClass}>Kernaussage</span><textarea disabled={!canEdit} value={draft.coreThesis} onChange={(e) => update('coreThesis', e.target.value)} rows={3} className={inputClass} placeholder="Was soll nach der Episode hängen bleiben?" /></label>
          <label><span className={labelClass}>Nutzen für die Zielgruppe</span><textarea disabled={!canEdit} value={draft.audienceValue} onChange={(e) => update('audienceValue', e.target.value)} rows={3} className={inputClass} placeholder="Welches Wissen, welche Orientierung oder Inspiration gewinnt das Publikum?" /></label>
        </section>

        <section className="space-y-4 rounded-2xl border border-obsidian-600 bg-obsidian-800/60 p-5">
          <div className="flex items-center gap-2"><FilePenLine className="h-5 w-5 text-purple-400" /><h3 className="font-semibold text-text-primary">Arbeitstitel</h3></div>
          <div className="flex gap-2">
            <input disabled={!canEdit} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWorkingTitle(); } }} className={inputClass} placeholder="Neuen Arbeitstitel ergänzen" />
            <button type="button" disabled={!canEdit || !newTitle.trim()} onClick={addWorkingTitle} className="rounded-xl bg-accent-blue px-3 text-white transition hover:bg-accent-blue/80 disabled:opacity-40" aria-label="Arbeitstitel hinzufügen"><Plus className="h-5 w-5" /></button>
          </div>
          <div className="space-y-2">
            {draft.workingTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="flex items-center gap-2 rounded-xl border border-obsidian-600 bg-obsidian-900/40 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-xs font-bold text-accent-blue">{index + 1}</span>
                <input disabled={!canEdit} value={title} onChange={(e) => update('workingTitles', draft.workingTitles.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none" />
                {canEdit && <button type="button" onClick={() => update('workingTitles', draft.workingTitles.filter((_, itemIndex) => itemIndex !== index))} className="text-text-muted transition hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            {!draft.workingTitles.length && <p className="rounded-xl border border-dashed border-obsidian-600 px-3 py-8 text-center text-sm text-text-muted">Noch keine Arbeitstitel erfasst.</p>}
          </div>
          <label><span className={labelClass}>Freier Konzeptentwurf</span><textarea disabled={!canEdit} value={draft.body} onChange={(e) => update('body', e.target.value)} rows={9} className={inputClass} placeholder="Gedanken, Storyline, Spannungsbogen und mögliche Kapitel frei vorformulieren …" /></label>
        </section>
      </div>

      <section className="rounded-2xl border border-obsidian-600 bg-obsidian-800/60 p-5">
        <div className="mb-4 flex items-center gap-2"><FilePenLine className="h-5 w-5 text-green-400" /><h3 className="font-semibold text-text-primary">Texte vorformulieren</h3></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label><span className={labelClass}>Teaser</span><textarea disabled={!canEdit} value={draft.teaser} onChange={(e) => update('teaser', e.target.value)} rows={5} className={inputClass} placeholder="Kurzer aufmerksamkeitsstarker Teaser …" /></label>
          <label><span className={labelClass}>Episodenbeschreibung</span><textarea disabled={!canEdit} value={draft.episodeDescription} onChange={(e) => update('episodeDescription', e.target.value)} rows={5} className={inputClass} placeholder="Beschreibung für den Feed …" /></label>
          <label><span className={labelClass}>Show Notes</span><textarea disabled={!canEdit} value={draft.showNotes} onChange={(e) => update('showNotes', e.target.value)} rows={7} className={inputClass} placeholder="Strukturierte Show Notes, Links und Quellen …" /></label>
          <label><span className={labelClass}>Call-to-Action</span><textarea disabled={!canEdit} value={draft.callToAction} onChange={(e) => update('callToAction', e.target.value)} rows={7} className={inputClass} placeholder="Gewünschte Handlung des Publikums …" /></label>
        </div>
      </section>

      <TextBlockLibrary ideaId={ideaId} canEdit={canEdit} notify={notify} onUse={useTextBlock} />

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-obsidian-600 bg-obsidian-900/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select disabled={!canEdit} value={draft.status} onChange={(e) => update('status', e.target.value as TopicWorkshopDraft['status'])} className="rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 text-sm text-text-primary">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <span className={`flex items-center gap-1 text-xs ${isDirty ? 'text-yellow-400' : 'text-green-400'}`}>{isDirty ? 'Nicht gespeicherte Änderungen' : <><Check className="h-3.5 w-3.5" /> Gespeichert</>}</span>
        </div>
        {canEdit && <button type="button" onClick={save} disabled={!isDirty || isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/80 disabled:opacity-40">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Entwurf speichern <span className="text-white/60">Strg+S</span></button>}
      </div>
    </div>
  );
}
