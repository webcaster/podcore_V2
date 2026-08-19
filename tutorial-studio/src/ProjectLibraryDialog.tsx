import { Archive, Copy, FolderOpen, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { TutorialProject } from './types';

interface Props {
  projects: TutorialProject[];
  activeProjectId: string;
  query: string;
  showArchived: boolean;
  onQueryChange: (value: string) => void;
  onShowArchivedChange: (value: boolean) => void;
  onClose: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}

export default function ProjectLibraryDialog({ projects, activeProjectId, query, showArchived, onQueryChange, onShowArchivedChange, onClose, onCreate, onOpen, onDuplicate, onArchive, onRestore }: Props) {
  const filtered = projects.filter((project) => {
    const haystack = [project.title, project.applicationName, project.description, ...(project.audience || [])].join(' ').toLocaleLowerCase('de-DE');
    return (showArchived ? Boolean(project.archived) : !project.archived) && (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase('de-DE')));
  });

  return <div className="modal-backdrop"><section className="library-dialog" role="dialog" aria-modal="true" aria-label="Lokales Projektarchiv"><header><div><p className="eyebrow">Tutorial Studio</p><h2>Lokales Projektarchiv</h2><p>Jedes Tutorial bleibt lokal auf diesem Gerät gespeichert. Archive können jederzeit wiederhergestellt werden.</p></div><button className="icon-button" onClick={onClose} aria-label="Archiv schließen"><X size={18} /></button></header><div className="library-tools"><label className="library-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Projekte, Anwendungen oder Zielgruppen durchsuchen" /></label><div className="archive-switch"><button className={!showArchived ? 'active' : ''} onClick={() => onShowArchivedChange(false)}>Aktive ({projects.filter((project) => !project.archived).length})</button><button className={showArchived ? 'active' : ''} onClick={() => onShowArchivedChange(true)}>Archiv ({projects.filter((project) => project.archived).length})</button></div><button className="button primary" onClick={onCreate}><Plus size={16} />Neues Projekt</button></div><div className="project-grid">{filtered.map((project) => <article key={project.id} className={project.id === activeProjectId ? 'project-card active' : 'project-card'}><div className="project-card-top"><span>{project.archived ? <Archive size={16} /> : <FolderOpen size={16} />}</span>{project.id === activeProjectId && !project.archived && <small>Geöffnet</small>}</div><h3>{project.title || 'Unbenanntes Tutorial'}</h3><p>{project.applicationName || 'Keine Anwendung benannt'}</p><div className="project-meta"><span>{project.steps.length} Schritt{project.steps.length === 1 ? '' : 'e'}</span><span>{new Date(project.updatedAt).toLocaleDateString('de-DE')}</span></div><div className="project-card-actions">{project.archived ? <button className="button secondary" onClick={() => onRestore(project.id)}><RotateCcw size={15} />Wiederherstellen</button> : <><button className="button secondary" onClick={() => onOpen(project.id)}>Öffnen</button><button className="icon-button" onClick={() => onDuplicate(project.id)} title="Duplizieren"><Copy size={16} /></button><button className="icon-button danger" onClick={() => onArchive(project.id)} title="Archivieren"><Trash2 size={16} /></button></>}</div></article>)}{filtered.length === 0 && <div className="library-empty"><Archive size={32} /><h3>{showArchived ? 'Das Archiv ist leer.' : 'Keine passenden Projekte gefunden.'}</h3><p>{showArchived ? 'Archivierte Tutorials erscheinen hier und können wiederhergestellt werden.' : 'Erstelle ein neues Projekt oder passe die Suche an.'}</p></div>}</div></section></div>;
}
