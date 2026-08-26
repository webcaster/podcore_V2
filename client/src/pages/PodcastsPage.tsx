import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, ExternalLink, Mic2, Plus, Radio, Save, Trash2, X } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

type Podcast = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  host: string;
  category: string;
  language: string;
  website: string;
  feedUrl: string;
  color: string;
  active: boolean;
};

const DEFAULT_COLOR = '#7c3aed';
const createId = () => `podcast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptyPodcast = (): Podcast => ({
  id: createId(), name: '', subtitle: '', description: '', host: '', category: '', language: 'de',
  website: '', feedUrl: '', color: DEFAULT_COLOR, active: false,
});

function normalizePodcast(value: Partial<Podcast>, index: number): Podcast {
  return {
    ...emptyPodcast(), ...value,
    id: value.id || `podcast-${index + 1}`,
    name: value.name || `Podcast ${index + 1}`,
    active: value.active === true,
  };
}

export default function PodcastsPage() {
  const { user, showSuccess, showError } = useApp();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [activeId, setActiveId] = useState('');
  const [editing, setEditing] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.permissions?.canManageSettings === true;
  const activePodcast = useMemo(() => podcasts.find(p => p.id === activeId) || podcasts.find(p => p.active), [podcasts, activeId]);

  useEffect(() => {
    let mounted = true;
    adminApi.getSettings().then(settings => {
      if (!mounted) return;
      const stored = Array.isArray(settings?.podcasts) ? settings.podcasts : [];
      const normalized: Podcast[] = stored.map((value: Partial<Podcast>, index: number) => normalizePodcast(value, index));
      const storedActive = settings?.activePodcastId || normalized.find(p => p.active)?.id || normalized[0]?.id || '';
      setPodcasts(normalized.map(p => ({ ...p, active: p.id === storedActive })));
      setActiveId(storedActive);
    }).catch(err => showError(err.message || 'Podcasts konnten nicht geladen werden.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [showError]);

  const persist = async (next: Podcast[], nextActiveId: string) => {
    setSaving(true);
    try {
      const clean = next.map(p => ({ ...p, active: p.id === nextActiveId }));
      await adminApi.updateSettings({ podcasts: clean, activePodcastId: nextActiveId });
      try { nextActiveId ? window.localStorage.setItem('podcore-active-podcast-id', nextActiveId) : window.localStorage.removeItem('podcore-active-podcast-id'); } catch (_) {}
      setPodcasts(clean);
      setActiveId(nextActiveId);
      showSuccess('Podcast-Verwaltung wurde gespeichert.');
    } catch (err: any) {
      showError(err.message || 'Änderungen konnten nicht gespeichert werden.');
      throw err;
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!editing?.name.trim()) { showError('Bitte einen Podcast-Namen eintragen.'); return; }
    const exists = podcasts.some(p => p.id === editing.id);
    const next = exists ? podcasts.map(p => p.id === editing.id ? editing : p) : [...podcasts, editing];
    const nextActiveId = activeId || editing.id;
    await persist(next, nextActiveId);
    setEditing(null);
  };

  const handleActivate = async (id: string) => {
    if (id === activeId) return;
    await persist(podcasts, id);
  };

  const handleDelete = async (id: string) => {
    const podcast = podcasts.find(p => p.id === id);
    if (!podcast || !window.confirm(`„${podcast.name}“ wirklich aus der Podcast-Liste entfernen?`)) return;
    const next = podcasts.filter(p => p.id !== id);
    const nextActiveId = id === activeId ? (next[0]?.id || '') : activeId;
    await persist(next, nextActiveId);
    if (editing?.id === id) setEditing(null);
  };

  if (!canManage) return <div className="p-8 text-text-secondary">Für diese Add-on-Verwaltung fehlen die erforderlichen Berechtigungen.</div>;

  return (
    <main className="container py-8 space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 text-accent-purple mb-2"><Radio size={22} /><span className="text-xs uppercase tracking-[0.2em] font-semibold">Add-on</span></div>
          <h1 className="text-3xl font-semibold text-text-primary">Mehrere Podcasts verwalten</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">Lege mehrere Podcast-Profile an und wähle aus, welches Profil aktuell im Arbeitsbereich verwendet wird.</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 self-start" onClick={() => setEditing(emptyPodcast())}><Plus size={17} /> Podcast hinzufügen</button>
      </header>

      {activePodcast && <section className="rounded-2xl border border-accent-purple/30 bg-accent-purple/10 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: activePodcast.color }} /><div><p className="text-xs uppercase tracking-wider text-accent-purple">Aktiver Podcast</p><p className="font-semibold text-text-primary">{activePodcast.name}</p></div></div>
        <p className="text-sm text-text-secondary">Neue Inhalte und Podcast-Einstellungen können dem aktiven Profil zugeordnet werden.</p>
      </section>}

      {loading ? <div className="rounded-2xl border border-border bg-surface p-10 text-center text-text-secondary">Podcast-Profile werden geladen …</div> : podcasts.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center"><Mic2 className="mx-auto mb-3 text-accent-purple" size={34} /><h2 className="text-lg font-semibold text-text-primary">Noch kein weiteres Podcast-Profil</h2><p className="mt-2 text-text-secondary">Erstelle dein erstes Profil, ohne die bisherigen globalen Einstellungen zu verlieren.</p><button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={() => setEditing(emptyPodcast())}><Plus size={17} /> Erstes Profil anlegen</button></div> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{podcasts.map(podcast => <article key={podcast.id} className={`rounded-2xl border bg-surface p-5 transition ${podcast.id === activeId ? 'border-accent-purple shadow-lg shadow-accent-purple/10' : 'border-border'}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: podcast.color }}><Mic2 size={20} /></span><div><h2 className="font-semibold text-text-primary">{podcast.name}</h2><p className="text-sm text-text-secondary">{podcast.subtitle || podcast.category || 'Podcast-Profil'}</p></div></div>{podcast.id === activeId && <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/15 px-2 py-1 text-xs font-medium text-accent-purple"><Check size={13} /> Aktiv</span>}</div>
        <p className="mt-4 min-h-12 text-sm text-text-secondary">{podcast.description || 'Keine Beschreibung hinterlegt.'}</p>
        <div className="mt-4 space-y-1 text-xs text-text-secondary"><p><span className="font-medium text-text-primary">Host:</span> {podcast.host || '—'}</p><p><span className="font-medium text-text-primary">Sprache:</span> {podcast.language.toUpperCase()}</p>{podcast.feedUrl && <a href={podcast.feedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-purple hover:underline">RSS-Feed öffnen <ExternalLink size={12} /></a>}</div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{podcast.id !== activeId && <button className="btn-secondary inline-flex items-center gap-1.5 text-sm" disabled={saving} onClick={() => handleActivate(podcast.id)}><Check size={15} /> Aktiv setzen</button>}<button className="btn-secondary inline-flex items-center gap-1.5 text-sm" onClick={() => setEditing(podcast)}><Edit3 size={15} /> Bearbeiten</button><button className="btn-secondary inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300" onClick={() => handleDelete(podcast.id)}><Trash2 size={15} /> Löschen</button></div>
      </article>)}</section>}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold text-text-primary">{podcasts.some(p => p.id === editing.id) ? 'Podcast bearbeiten' : 'Podcast hinzufügen'}</h2><p className="mt-1 text-sm text-text-secondary">Die Felder können später jederzeit angepasst werden.</p></div><button className="text-text-secondary hover:text-text-primary" onClick={() => setEditing(null)} aria-label="Dialog schließen"><X size={20} /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2">{([['name','Name'],['subtitle','Untertitel'],['host','Host / Redaktion'],['category','Kategorie'],['language','Sprache'],['website','Website'],['feedUrl','RSS-Feed-URL']] as const).map(([key,label]) => <label key={key} className={key === 'website' || key === 'feedUrl' ? 'md:col-span-2' : ''}><span className="mb-1 block text-sm font-medium text-text-primary">{label}{key === 'name' && ' *'}</span><input className="input w-full" value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} placeholder={label} /></label>)}<label className="md:col-span-2"><span className="mb-1 block text-sm font-medium text-text-primary">Beschreibung</span><textarea className="input min-h-24 w-full" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></label><label className="flex items-center gap-3"><span className="text-sm font-medium text-text-primary">Akzentfarbe</span><input type="color" className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} /></label></div><div className="mt-6 flex justify-end gap-3 border-t border-border pt-5"><button className="btn-secondary inline-flex items-center gap-2" onClick={() => setEditing(null)}><X size={16} /> Abbrechen</button><button className="btn-primary inline-flex items-center gap-2" disabled={saving} onClick={handleSave}><Save size={16} /> {saving ? 'Speichert …' : 'Speichern'}</button></div></div></div>}
    </main>
  );
}
