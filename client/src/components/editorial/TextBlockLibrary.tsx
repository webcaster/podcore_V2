import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Check, Clipboard, Edit3, Filter, Globe2, Heart, Loader2,
  Plus, Save, Search, Tags, Trash2, X,
} from 'lucide-react';
import { EditorialTextBlock, editorialApi } from '../../lib/api';

const TYPES: Array<{ value: EditorialTextBlock['type'] | 'all'; label: string }> = [
  { value: 'all', label: 'Alle Typen' },
  { value: 'intro', label: 'Intro' },
  { value: 'outro', label: 'Outro' },
  { value: 'teaser', label: 'Teaser' },
  { value: 'description', label: 'Beschreibung' },
  { value: 'show-notes', label: 'Show Notes' },
  { value: 'cta', label: 'Call-to-Action' },
  { value: 'sponsor', label: 'Sponsoring' },
  { value: 'transition', label: 'Übergang' },
  { value: 'question', label: 'Frage' },
  { value: 'custom', label: 'Freier Baustein' },
];

type FormState = {
  id?: string;
  title: string;
  type: EditorialTextBlock['type'];
  content: string;
  tags: string;
  scope: 'global' | 'idea';
  isFavorite: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  type: 'custom',
  content: '',
  tags: '',
  scope: 'idea',
  isFavorite: false,
};

type Props = {
  ideaId: string;
  canEdit: boolean;
  notify: (type: 'success' | 'error', message: string) => void;
  onUse?: (block: EditorialTextBlock) => void;
};

export default function TextBlockLibrary({ ideaId, canEdit, notify, onUse }: Props) {
  const [blocks, setBlocks] = useState<EditorialTextBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'global' | 'idea'>('all');
  const [type, setType] = useState<EditorialTextBlock['type'] | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.listTextBlocks({
        ideaId,
        scope,
        type: type === 'all' ? undefined : type,
        search: search.trim() || undefined,
      });
      setBlocks(data);
    } catch (error: any) {
      notify('error', error.message || 'Textbausteine konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [ideaId, scope, type, search]);

  const grouped = useMemo(() => ({
    favorites: blocks.filter((block) => block.isFavorite),
    others: blocks.filter((block) => !block.isFavorite),
  }), [blocks]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const edit = (block: EditorialTextBlock) => {
    setForm({
      id: block.id,
      title: block.title,
      type: block.type,
      content: block.content,
      tags: block.tags.join(', '),
      scope: block.ideaId ? 'idea' : 'global',
      isFavorite: block.isFavorite,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim() || isSaving) return;
    setIsSaving(true);
    const payload = {
      ideaId: form.scope === 'idea' ? ideaId : null,
      title: form.title.trim(),
      type: form.type,
      content: form.content,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      isFavorite: form.isFavorite,
    };
    try {
      if (form.id) await editorialApi.updateTextBlock(form.id, payload);
      else await editorialApi.createTextBlock(payload);
      notify('success', form.id ? 'Textbaustein aktualisiert' : 'Textbaustein erstellt');
      resetForm();
      await load();
    } catch (error: any) {
      notify('error', error.message || 'Textbaustein konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = async (block: EditorialTextBlock) => {
    try {
      await editorialApi.updateTextBlock(block.id, { isFavorite: !block.isFavorite });
      setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, isFavorite: !item.isFavorite } : item));
    } catch (error: any) {
      notify('error', error.message || 'Favorit konnte nicht geändert werden');
    }
  };

  const remove = async (block: EditorialTextBlock) => {
    if (!window.confirm(`Textbaustein „${block.title}“ wirklich löschen?`)) return;
    try {
      await editorialApi.deleteTextBlock(block.id);
      setBlocks((current) => current.filter((item) => item.id !== block.id));
      notify('success', 'Textbaustein gelöscht');
    } catch (error: any) {
      notify('error', error.message || 'Textbaustein konnte nicht gelöscht werden');
    }
  };

  const copy = async (block: EditorialTextBlock) => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopiedId(block.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      notify('error', 'Text konnte nicht in die Zwischenablage kopiert werden');
    }
  };

  const inputClass = 'w-full rounded-xl border border-obsidian-600 bg-obsidian-900/60 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent-blue disabled:opacity-60';

  const renderBlock = (block: EditorialTextBlock) => (
    <article key={block.id} className="rounded-2xl border border-obsidian-600 bg-obsidian-900/40 p-4 transition hover:border-obsidian-500">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-text-primary">{block.title}</h4>
            <span className="rounded-full bg-accent-blue/10 px-2 py-0.5 text-[11px] font-semibold text-accent-blue">{TYPES.find((item) => item.value === block.type)?.label || block.type}</span>
            <span className="flex items-center gap-1 rounded-full bg-obsidian-700 px-2 py-0.5 text-[11px] text-text-muted">{block.ideaId ? <BookOpen className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}{block.ideaId ? 'Diese Idee' : 'Global'}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{block.content}</p>
          {!!block.tags.length && <div className="mt-3 flex flex-wrap gap-1.5">{block.tags.map((tag) => <span key={tag} className="rounded-md bg-obsidian-700 px-2 py-1 text-[11px] text-text-muted">#{tag}</span>)}</div>}
        </div>
        <button type="button" onClick={() => toggleFavorite(block)} className={`shrink-0 rounded-lg p-1.5 transition ${block.isFavorite ? 'text-red-400' : 'text-text-muted hover:text-red-400'}`} aria-label="Favorit umschalten"><Heart className={`h-4 w-4 ${block.isFavorite ? 'fill-current' : ''}`} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-obsidian-700 pt-3">
        {onUse && <button type="button" onClick={() => onUse(block)} className="rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-blue/80">Im Entwurf verwenden</button>}
        <button type="button" onClick={() => copy(block)} className="flex items-center gap-1.5 rounded-lg bg-obsidian-700 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">{copiedId === block.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Clipboard className="h-3.5 w-3.5" />}{copiedId === block.id ? 'Kopiert' : 'Kopieren'}</button>
        {canEdit && <button type="button" onClick={() => edit(block)} className="flex items-center gap-1.5 rounded-lg bg-obsidian-700 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"><Edit3 className="h-3.5 w-3.5" />Bearbeiten</button>}
        {canEdit && <button type="button" onClick={() => remove(block)} className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" />Löschen</button>}
      </div>
    </article>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-obsidian-600 bg-obsidian-800/60 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2"><BookOpen className="h-5 w-5 text-cyan-400" /><h3 className="font-semibold text-text-primary">Textbaustein-Bibliothek</h3></div>
          <p className="text-sm text-text-muted">Wiederverwendbare Intros, Beschreibungen, Fragen und Übergänge zentral verwalten. Globale Bausteine stehen in jedem Episoden-Editor bereit.</p>
        </div>
        {canEdit && <button type="button" onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-blue/80"><Plus className="h-4 w-4" />Baustein erstellen</button>}
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-9`} placeholder="Titel, Inhalt oder Tag suchen …" /></label>
        <label className="relative"><Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={`${inputClass} min-w-44 pl-9`}>{TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)} className={`${inputClass} min-w-40`}><option value="all">Global + Idee</option><option value="global">Nur global</option><option value="idea">Nur diese Idee</option></select>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-accent-blue/30 bg-accent-blue/5 p-4">
          <div className="mb-4 flex items-center justify-between"><h4 className="font-semibold text-text-primary">{form.id ? 'Textbaustein bearbeiten' : 'Neuen Textbaustein erstellen'}</h4><button type="button" onClick={resetForm} className="text-text-muted hover:text-text-primary"><X className="h-5 w-5" /></button></div>
          <div className="grid gap-3 md:grid-cols-2">
            <label><span className="mb-1 block text-xs font-semibold text-text-muted">Name</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="z. B. Standard-Intro Experteninterview" /></label>
            <label><span className="mb-1 block text-xs font-semibold text-text-muted">Typ</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as EditorialTextBlock['type'] })} className={inputClass}>{TYPES.filter((item) => item.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="md:col-span-2"><span className="mb-1 block text-xs font-semibold text-text-muted">Inhalt</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={7} className={inputClass} placeholder="Textbaustein formulieren …" /></label>
            <label><span className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-muted"><Tags className="h-3.5 w-3.5" />Tags, durch Kommas getrennt</span><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className={inputClass} placeholder="interview, standard, deutsch" /></label>
            <label><span className="mb-1 block text-xs font-semibold text-text-muted">Gültigkeitsbereich</span><select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as FormState['scope'] })} className={inputClass}><option value="idea">Nur diese Idee</option><option value="global">Global für alle Episoden</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={form.isFavorite} onChange={(event) => setForm({ ...form, isFavorite: event.target.checked })} className="h-4 w-4 rounded border-obsidian-500 bg-obsidian-900" />Als Favorit hervorheben</label>
            <button type="button" onClick={save} disabled={!form.title.trim() || !form.content.trim() || isSaving} className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-blue/80 disabled:opacity-40">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{form.id ? 'Änderungen speichern' : 'Baustein speichern'}</button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex min-h-32 items-center justify-center text-sm text-text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Bibliothek wird geladen …</div> : !blocks.length ? <div className="rounded-xl border border-dashed border-obsidian-600 py-10 text-center text-sm text-text-muted">Keine passenden Textbausteine gefunden.</div> : (
        <div className="space-y-4">
          {!!grouped.favorites.length && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Favoriten</p><div className="grid gap-3 xl:grid-cols-2">{grouped.favorites.map(renderBlock)}</div></div>}
          {!!grouped.others.length && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Weitere Bausteine</p><div className="grid gap-3 xl:grid-cols-2">{grouped.others.map(renderBlock)}</div></div>}
        </div>
      )}
    </section>
  );
}
