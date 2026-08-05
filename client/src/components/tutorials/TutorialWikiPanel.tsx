import React, { useState } from 'react';
import { X, BookOpen, Play, ChevronRight, ChevronDown, ChevronUp, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { useTutorial, Tutorial, TutorialStep } from '../../contexts/TutorialContext';

// ─── Step Detail View ────────────────────────────────────────────────────────

const StepCard = ({ step, index, total }: { step: TutorialStep; index: number; total: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-raised transition-colors"
      >
        {/* Step number */}
        <div className="w-7 h-7 rounded-full bg-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {step.title || `Schritt ${index + 1}`}
          </p>
          {!expanded && step.description && (
            <p className="text-xs text-text-muted truncate mt-0.5">{step.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-text-muted">{index + 1}/{total}</span>
          {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-surface-border bg-obsidian-900">
          {step.description && (
            <p className="text-sm text-text-secondary pt-3 leading-relaxed">{step.description}</p>
          )}
          {step.image && (
            <div className="rounded-lg overflow-hidden border border-surface-border">
              <img
                src={step.image}
                alt={step.title || `Schritt ${index + 1}`}
                className="w-full object-contain max-h-64"
              />
            </div>
          )}
          {step.target && (
            <div className="flex items-center gap-2 bg-obsidian-800 rounded-lg px-2 py-1.5">
              <span className="text-xs text-text-muted">Bereich:</span>
              <code className="text-xs text-accent-purple font-mono truncate">{step.target}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tutorial Card ────────────────────────────────────────────────────────────

const TutorialCard = ({ tutorial, onStart }: { tutorial: Tutorial; onStart: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-accent-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">{tutorial.title}</h3>
          {tutorial.description && (
            <p className="text-sm text-text-secondary mt-0.5">{tutorial.description}</p>
          )}
          <p className="text-xs text-text-muted mt-1">
            {tutorial.steps.length} Schritt{tutorial.steps.length !== 1 ? 'e' : ''}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStart}
          className="btn-primary text-sm flex items-center gap-2 flex-1 justify-center"
        >
          <Play size={14} />
          Tutorial starten
        </button>
        <button
          onClick={() => setExpanded(p => !p)}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Schließen' : 'Alle Schritte'}
        </button>
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="space-y-2 pt-1">
          {tutorial.steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} total={tutorial.steps.length} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function TutorialWikiPanel() {
  const { wikiOpen, closeWiki, tutorials, startTutorial, isLoading } = useTutorial();

  if (!wikiOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeWiki}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-obsidian-800 border-l border-surface-border shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <HelpCircle size={18} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Hilfe & Wiki</h2>
              <p className="text-xs text-text-muted">Tutorials für deine Rolle</p>
            </div>
          </div>
          <button
            onClick={closeWiki}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tutorials.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto">
                <BookOpen size={24} className="text-text-muted" />
              </div>
              <p className="font-medium text-text-secondary">Noch keine Tutorials verfügbar</p>
              <p className="text-sm text-text-muted">
                Dein Administrator hat noch kein Tutorial für deine Rolle erstellt.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Starte ein Tutorial um geführt durch die Anwendung zu werden, oder klappe die Schritte auf um einzelne Bereiche nachzuschlagen.
              </p>
              {tutorials.map(tutorial => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  onStart={() => {
                    startTutorial(tutorial.id);
                    closeWiki();
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border flex-shrink-0">
          <p className="text-xs text-text-muted text-center">
            Tutorials werden vom Administrator verwaltet und sind auf deine Rolle abgestimmt.
          </p>
        </div>
      </div>
    </>
  );
}
