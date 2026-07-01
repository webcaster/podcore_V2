import React, { useState } from 'react';
import Modal from './Modal';
import { CheckCircle, Circle, Users, FileText, Tag, BookOpen, Layers } from 'lucide-react';

interface IdeaImportModalProps {
  idea: any;
  onClose: () => void;
  onApply: (idea: any, options: {
    title: boolean;
    description: boolean;
    tags: boolean;
    notes: boolean;
    guests: boolean;
    blocks: boolean;
  }) => void;
}

export default function IdeaImportModal({ idea, onClose, onApply }: IdeaImportModalProps) {
  const [options, setOptions] = useState({
    title: true,
    description: true,
    tags: true,
    notes: true,
    guests: true,
    blocks: (idea.interviewPartners?.length > 0),
  });

  const toggle = (key: keyof typeof options) =>
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  const hasPartners = idea.interviewPartners?.length > 0;
  const hasNotes = (idea.notes?.length > 0) || (idea.checklists?.length > 0) || (idea.interviewQuestions?.length > 0);
  const hasTags = idea.tags?.length > 0;

  return (
    <Modal isOpen onClose={onClose} title="Idee in Episode übernehmen" size="lg">
      <div className="space-y-4">
        {/* Ideen-Info */}
        <div className="p-3 bg-obsidian-800 rounded-lg border border-surface-border">
          <p className="text-sm font-semibold text-text-primary">{idea.title}</p>
          {idea.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{idea.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] uppercase text-text-muted">{idea.status}</span>
            {hasTags && <span className="text-[10px] text-accent-purple">{idea.tags.join(', ')}</span>}
            {hasPartners && <span className="text-[10px] text-accent-cyan">{idea.interviewPartners.length} Interview-Partner</span>}
          </div>
        </div>

        {/* Optionen */}
        <div>
          <p className="text-xs text-text-muted mb-3 font-medium uppercase">Was soll übernommen werden?</p>
          <div className="space-y-2">
            {[
              { key: 'title', label: 'Titel', icon: <FileText size={14} />, available: !!idea.title },
              { key: 'description', label: 'Beschreibung / Shownotes', icon: <BookOpen size={14} />, available: !!idea.description },
              { key: 'tags', label: `Tags (${idea.tags?.length || 0})`, icon: <Tag size={14} />, available: hasTags },
              { key: 'guests', label: `Gäste aus Interview-Partnern (${idea.interviewPartners?.length || 0})`, icon: <Users size={14} />, available: hasPartners },
              { key: 'notes', label: 'Notizen, Checkliste & Interview-Fragen', icon: <FileText size={14} />, available: hasNotes },
              { key: 'blocks', label: 'Interview-Blöcke ins Script einfügen', icon: <Layers size={14} />, available: hasPartners },
            ].map(({ key, label, icon, available }) => (
              <button
                key={key}
                onClick={() => available && toggle(key as keyof typeof options)}
                disabled={!available}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  !available
                    ? 'border-surface-border opacity-40 cursor-not-allowed'
                    : options[key as keyof typeof options]
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-surface-border hover:border-accent-purple/40'
                }`}
              >
                {options[key as keyof typeof options] && available
                  ? <CheckCircle size={16} className="text-accent-purple flex-shrink-0" />
                  : <Circle size={16} className="text-text-muted flex-shrink-0" />}
                <span className="flex items-center gap-2 text-sm text-text-primary">
                  {icon} {label}
                </span>
                {!available && <span className="ml-auto text-[10px] text-text-muted">Keine Daten</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Vorschau der Interview-Partner */}
        {hasPartners && options.blocks && (
          <div className="p-3 bg-accent-cyan/5 border border-accent-cyan/20 rounded-lg">
            <p className="text-xs text-accent-cyan font-medium mb-2">Interview-Blöcke werden erstellt für:</p>
            <div className="space-y-1">
              {idea.interviewPartners.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle size={12} className="text-accent-cyan" />
                  <span>{p.name}{p.company ? ` (${p.company})` : ''}</span>
                  <span className="text-text-muted">
                    · {idea.interviewQuestions?.filter((q: any) => q.partnerId === p.id).length || 0} Fragen
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Abbrechen</button>
          <button
            onClick={() => onApply(idea, options)}
            disabled={!Object.values(options).some(Boolean)}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </Modal>
  );
}
