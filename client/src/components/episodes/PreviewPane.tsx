import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, Eye, FileText, Radio, Tag } from 'lucide-react';

type PreviewPaneProps = {
  episode: Record<string, any>;
  blocks?: any[];
  showNotes?: string;
  totalDuration?: number;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: 'Entwurf',
  'in-bearbeitung': 'In Bearbeitung',
  review: 'Review',
  freigegeben: 'Freigegeben',
  geplant: 'Geplant',
  veröffentlicht: 'Veröffentlicht',
  archiviert: 'Archiviert',
  idee: 'Idee',
  aufnahme: 'Aufnahme',
  produktion: 'Produktion',
  veroeffentlicht: 'Veröffentlicht',
};

function formatDuration(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return `${hours ? `${hours}:` : ''}${hours && minutes < 10 ? '0' : ''}${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key} className="rounded bg-obsidian-950 px-1 py-0.5 text-accent-cyan">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noreferrer" className="text-accent-blue underline">{link[1]}</a>;
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function MarkdownPreview({ value }: { value: string }) {
  const lines = String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n');
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    nodes.push(<ul key={`list-${nodes.length}`} className="my-2 list-disc space-y-1 pl-5">{items.map((item, index) => <li key={index}>{renderInline(item, `li-${nodes.length}-${index}`)}</li>)}</ul>);
  };

  lines.forEach((line, index) => {
    if (/^[-*]\s+/.test(line)) { list.push(line.replace(/^[-*]\s+/, '')); return; }
    flushList();
    if (!line.trim()) { nodes.push(<div key={`space-${index}`} className="h-2" />); return; }
    if (line.startsWith('### ')) nodes.push(<h4 key={index} className="mt-4 text-sm font-semibold text-text-primary">{renderInline(line.slice(4), `h3-${index}`)}</h4>);
    else if (line.startsWith('## ')) nodes.push(<h3 key={index} className="mt-5 text-base font-semibold text-text-primary">{renderInline(line.slice(3), `h2-${index}`)}</h3>);
    else if (line.startsWith('# ')) nodes.push(<h2 key={index} className="mt-5 text-lg font-bold text-text-primary">{renderInline(line.slice(2), `h1-${index}`)}</h2>);
    else if (line.startsWith('> ')) nodes.push(<blockquote key={index} className="my-2 border-l-2 border-accent-purple pl-3 italic text-text-secondary">{renderInline(line.slice(2), `quote-${index}`)}</blockquote>);
    else nodes.push(<p key={index} className="leading-6 text-text-secondary">{renderInline(line, `p-${index}`)}</p>);
  });
  flushList();
  return <>{nodes}</>;
}

export default function PreviewPane({ episode, blocks = [], showNotes = '', totalDuration = 0, className = '' }: PreviewPaneProps) {
  const tags = Array.isArray(episode.tags) ? episode.tags : [];
  const estimatedDuration = useMemo(() => totalDuration || blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0), [totalDuration, blocks]);
  const description = episode.description || showNotes || '';

  return (
    <aside className={`card sticky top-4 overflow-hidden ${className}`} aria-label="Live-Vorschau">
      <div className="-mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-surface-border bg-obsidian-800 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Eye size={15} className="text-accent-cyan" /> Live-Vorschau</div>
        <span className="flex items-center gap-1 text-[10px] text-accent-green"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> Echtzeit</span>
      </div>

      <div className="space-y-5">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Radio size={12} /> {episode.number ? `Episode #${episode.number}` : 'Neue Episode'}
          </div>
          <h2 className="text-xl font-bold leading-tight text-text-primary">{episode.title || 'Unbenannte Episode'}</h2>
          {episode.subtitle && <p className="text-sm text-text-secondary">{episode.subtitle}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-accent-purple/20 text-accent-purple">{STATUS_LABELS[episode.status] || episode.status || 'Entwurf'}</span>
            <span className="flex items-center gap-1 text-xs text-text-muted"><Clock3 size={12} /> {formatDuration(estimatedDuration)}</span>
            {(episode.publishDate || episode.plannedDate) && <span className="text-xs text-text-muted">{new Date(episode.publishDate || episode.plannedDate).toLocaleDateString('de-DE')}</span>}
          </div>
        </header>

        {tags.length > 0 && <div className="flex flex-wrap gap-1.5"><Tag size={13} className="mt-1 text-text-muted" />{tags.map((tag: string) => <span key={tag} className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-text-secondary">{tag}</span>)}</div>}

        <section className="border-t border-surface-border pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"><FileText size={13} /> Beschreibung</h3>
          {description ? <div className="text-sm"><MarkdownPreview value={description} /></div> : <p className="text-sm italic text-text-muted">Die Markdown-Beschreibung erscheint hier während der Eingabe.</p>}
        </section>

        {blocks.length > 0 && <section className="border-t border-surface-border pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Ablauf</h3>
          <ol className="space-y-2">
            {blocks.map((block, index) => <li key={block.id || index} className="flex items-start gap-2 rounded-lg bg-obsidian-800/70 p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-[10px] font-bold text-accent-purple">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-text-primary">{block.title || block.type}</p><p className="text-[10px] text-text-muted">{formatDuration(Number(block.duration || 0))}</p></div>
              {block.assetName && <CheckCircle2 size={13} className="text-accent-green" />}
            </li>)}
          </ol>
        </section>}
      </div>
    </aside>
  );
}
