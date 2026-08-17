import React, { useState, useMemo } from 'react';
import { X, BookOpen, Play, ChevronRight, ChevronDown, ChevronUp, HelpCircle, Search, CheckCircle2 } from 'lucide-react';
import { useTutorial, Tutorial, TutorialProgress, TutorialStep } from '../../contexts/TutorialContext';

const ANN_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0d9488',
];

// ─── Step Detail View ────────────────────────────────────────────────────────

const StepCard = ({ step, index, total }: { step: TutorialStep; index: number; total: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden hover:border-accent-purple/40 transition-colors">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-raised transition-colors"
      >
        {/* Step number */}
        <div className="w-8 h-8 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center text-accent-purple text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {step.title || `Schritt ${index + 1}`}
          </p>
          {!expanded && step.description && (
            <p className="text-xs text-text-muted truncate mt-1">{step.description.substring(0, 80)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-surface-border bg-obsidian-900/50">
          {step.description && (
            <p className="text-sm text-text-secondary pt-3 leading-relaxed whitespace-pre-wrap">{step.description}</p>
          )}
          {step.image && (
            <div className="rounded-lg overflow-hidden border border-surface-border relative bg-obsidian-950">
              <img
                src={step.image}
                alt={step.title || `Schritt ${index + 1}`}
                className="w-full object-contain max-h-80"
              />
              {/* Render annotation points on the image */}
              {step.annotations?.map((ann, i) => (
                <div
                  key={ann.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-lg border-2 border-white/70 hover:scale-125 transition-transform cursor-help"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    backgroundColor: ANN_COLORS[i % ANN_COLORS.length],
                  }}
                  title={ann.description}
                >
                  {ann.label}
                </div>
              ))}
            </div>
          )}
          {/* Annotations List */}
          {step.annotations && step.annotations.length > 0 && (
            <div className="bg-obsidian-800/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Markierungen</p>
              {step.annotations.map((ann, i) => (
                <div key={ann.id} className="flex items-start gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: ANN_COLORS[i % ANN_COLORS.length] }}
                  >
                    {ann.label}
                  </span>
                  <span className="text-xs text-text-secondary">{ann.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tutorial Card ────────────────────────────────────────────────────────────

const TutorialCard = ({ tutorial, progress, onStart }: { tutorial: Tutorial; progress?: TutorialProgress; onStart: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card space-y-3 border border-surface-border hover:border-accent-purple/40 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
          <BookOpen size={20} className="text-accent-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary text-base">{tutorial.title}</h3>
          {tutorial.description && (
            <p className="text-xs text-text-secondary mt-1">{tutorial.description}</p>
          )}
          <p className="text-[10px] text-text-muted mt-2 font-medium">
            {tutorial.steps.length} Schritt{tutorial.steps.length !== 1 ? 'e' : ''} · {tutorial.role || 'Alle'}
          </p>
          {progress?.completed && (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-green-400"><CheckCircle2 size={12} /> Bereits angesehen</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStart}
          className="btn-primary text-xs flex items-center gap-2 flex-1 justify-center py-2"
        >
          <Play size={14} />
          {progress?.completed ? 'Erneut starten' : 'Starten'}
        </button>
        <button
          onClick={() => setExpanded(p => !p)}
          className="btn-secondary text-xs flex items-center gap-2 px-3 py-2"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Schließen' : 'Details'}
        </button>
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-surface-border">
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
  const { wikiOpen, closeWiki, tutorials, progressByTutorial, startTutorial, isLoading } = useTutorial();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tutorials by search query
  const filteredTutorials = useMemo(() => {
    if (!searchQuery.trim()) return tutorials;
    
    const query = searchQuery.toLowerCase();
    return tutorials.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.steps?.some(s => 
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      )
    );
  }, [tutorials, searchQuery]);

  if (!wikiOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeWiki}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-obsidian-800 border-l border-surface-border shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border flex-shrink-0 bg-obsidian-800/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center">
              <HelpCircle size={20} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-lg">Hilfe & Wissensbase</h2>
              <p className="text-xs text-text-muted">Alle verfügbaren Tutorials</p>
            </div>
          </div>
          <button
            onClick={closeWiki}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Tutorials durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-obsidian-900 border border-surface-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/60 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTutorials.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto">
                <BookOpen size={28} className="text-text-muted" />
              </div>
              <p className="font-medium text-text-secondary">
                {searchQuery ? 'Keine Tutorials gefunden' : 'Noch keine Tutorials verfügbar'}
              </p>
              <p className="text-xs text-text-muted">
                {searchQuery 
                  ? 'Versuche eine andere Suchanfrage.' 
                  : 'Dein Administrator hat noch kein Tutorial für deine Rolle erstellt.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
                {filteredTutorials.length} Tutorial{filteredTutorials.length !== 1 ? 's' : ''} verfügbar
              </p>
              {filteredTutorials.map(tutorial => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  progress={progressByTutorial[tutorial.id]}
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
        <div className="px-6 py-4 border-t border-surface-border flex-shrink-0 bg-obsidian-800/95">
          <p className="text-xs text-text-muted text-center">
            💡 Tipp: Klicke auf ein Tutorial um die einzelnen Schritte zu sehen, oder starte es um eine geführte Tour zu erhalten.
          </p>
        </div>
      </div>
    </>
  );
}
