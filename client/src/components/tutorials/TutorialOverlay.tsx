import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, SkipForward, MousePointerClick, CheckCircle2, PauseCircle, GripVertical, RotateCcw } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../contexts/TutorialContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './TutorialOverlay.css';

const ANN_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0d9488',
];

// Mapping stabile Tutorialkennungen auf Seiten und Unterbereiche. Untermenüs
// verwenden bewusst Query-Parameter, damit ein Schritt direkt den geöffneten
// Tab findet und nicht nur die übergeordnete Seite erreichen kann.
const TARGET_ROUTES: Record<string, string> = {
  'nav-dashboard': '/',
  'dashboard-settings-toggle': '/',
  'dashboard-settings-panel': '/?tutorial=dashboard-settings',
  'nav-episodes': '/episodes',
  'nav-episodes-dashboard': '/episodes-dashboard',
  'nav-editorial': '/editorial',
  'nav-calendar': '/calendar',
  'nav-chat': '/chat',
  'nav-media': '/media',
  'nav-sponsors': '/sponsors',
  'nav-sponsors-calendar': '/sponsors/calendar',
  'nav-sponsors-reports': '/sponsors/reports',
  'nav-seasons': '/seasons',
  'nav-archive': '/archive',
  'nav-analytics': '/analytics',
  'nav-stats': '/stats',
  'nav-branding': '/branding',
  'nav-admin': '/admin',
  'nav-settings': '/settings',
  'nav-pdf-layouts': '/pdf-layouts',
  'settings-tabs': '/settings',
  'settings-tab-profile': '/settings?tab=profile',
  'settings-tab-theme': '/settings?tab=theme',
  'settings-tab-podcast': '/settings?tab=podcast',
  'settings-tab-technical': '/settings?tab=technical',
  'settings-tab-storage': '/settings?tab=storage',
  'settings-tab-app': '/settings?tab=app',
  'settings-tab-update': '/settings?tab=update',
  'settings-tab-license': '/settings?tab=license',
  'settings-profile': '/settings?tab=profile',
  'settings-theme': '/settings?tab=theme',
  'settings-podcast': '/settings?tab=podcast',
  'settings-technical': '/settings?tab=technical',
  'settings-storage': '/settings?tab=storage',
  'settings-app': '/settings?tab=app',
  'settings-update': '/settings?tab=update',
  'admin-tabs': '/admin',
  'admin-tab-users': '/admin?tab=users',
  'admin-tab-roles': '/admin?tab=roles',
  'admin-tab-modules': '/admin?tab=modules',
  'admin-tab-system': '/admin?tab=system',
  'admin-tab-database': '/admin?tab=database',
  'admin-tab-trash': '/admin?tab=trash',
  'admin-tab-tutorials': '/admin?tab=tutorials',
  'admin-tab-logs': '/admin?tab=logs',
  'admin-users': '/admin?tab=users',
  'admin-roles': '/admin?tab=roles',
  'admin-modules': '/admin?tab=modules',
  'admin-system': '/admin?tab=system',
  'admin-database': '/admin?tab=database',
  'admin-trash': '/admin?tab=trash',
  'admin-tutorials': '/admin?tab=tutorials',
  'admin-logs': '/admin?tab=logs',
  'branding-tabs': '/branding',
  'branding-tab-branding': '/branding?tab=branding',
  'branding-tab-storage': '/branding?tab=storage',
  'branding-tab-backup': '/branding?tab=backup',
  'branding-tab-podigee': '/branding?tab=podigee',
  'branding-storage': '/branding?tab=storage',
  'branding-backup': '/branding?tab=backup',
  'branding-podigee': '/branding?tab=podigee',
  'editorial-tabs': '/editorial',
  'editorial-tab-ideas': '/editorial?tab=ideas',
  'editorial-tab-season-planning': '/editorial?tab=season-planning',
  'editorial-tab-research': '/editorial?tab=research',
  'editorial-tab-plan': '/editorial?tab=plan',
  'editorial-tab-interviews': '/editorial?tab=interviews',
  'editorial-tab-notes': '/editorial?tab=notes',
};

export const TutorialOverlay: React.FC = () => {
  const { activeTutorial, currentStep, nextStep, previousStep, skipTutorial, completeTutorial, closeTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [manualPosition, setManualPosition] = useState<{ top: number; left: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const findTargetElement = useCallback((target?: string): Element | null => {
    if (!target) return null;
    let element: Element | null = document.querySelector(`[data-tutorial-id="${CSS.escape(target)}"]`);
    if (!element && /^(#|\.|\[)/.test(target)) {
      try { element = document.querySelector(target); } catch { element = null; }
    }
    return element || document.getElementById(target);
  }, []);

  const isTargetRouteActive = useCallback((targetRoute: string) => {
    const [targetPath, targetQuery = ''] = targetRoute.split('?');
    if (location.pathname !== targetPath) return false;
    const expectedParams = new URLSearchParams(targetQuery);
    const currentParams = new URLSearchParams(location.search);
    return Array.from(expectedParams.entries()).every(([key, value]) => currentParams.get(key) === value);
  }, [location.pathname, location.search]);

  const updatePosition = useCallback(() => {
    if (!activeTutorial) return;
    const step = activeTutorial.steps[currentStep];
    if (!step || !step.target) {
      setPosition(null);
      return;
    }

    // Prefer the stable tutorial ID, but also support legacy CSS selectors
    // and direct element IDs for tutorials created in older versions.
    const element = findTargetElement(step.target);

    if (element) {
      const initialRect = element.getBoundingClientRect();
      if (initialRect.top < 24 || initialRect.bottom > window.innerHeight - 24) {
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      const margin = 12;
      const tooltipWidth = Math.min(500, window.innerWidth - margin * 2);
      const tooltipHeight = Math.min(680, window.innerHeight - margin * 2);
      const offset = 24;
      
      let top = rect.top - tooltipHeight - offset;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      if (top < margin) {
        top = rect.bottom + offset;
      }
      top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));
      
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

      setTooltipPos({ top, left });
      setIsNavigating(false);
    } else {
      // Element not found - maybe on wrong page?
      setPosition(null);
      
      // Check if we should navigate
      const targetRoute = TARGET_ROUTES[step.target] || step.route;
      if (targetRoute && !isTargetRouteActive(targetRoute) && !isNavigating) {
        setIsNavigating(true);
        navigate(targetRoute);
      }
    }
  }, [activeTutorial, currentStep, findTargetElement, isNavigating, isTargetRouteActive, navigate]);

  useEffect(() => {
    if (!activeTutorial) return;
    
    // Initial delay to allow page rendering/navigation. A second pass handles
    // lazy-rendered pages and navigation transitions reliably.
    const timer = setTimeout(updatePosition, 300);
    const retryTimer = setTimeout(updatePosition, 900);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [activeTutorial, currentStep, updatePosition]);

  useEffect(() => {
    setActionConfirmed(false);
  }, [activeTutorial?.id, currentStep]);

  useEffect(() => {
    setManualPosition(null);
    setIsDragging(false);
  }, [activeTutorial?.id]);

  const currentStepData = activeTutorial?.steps[currentStep];
  const currentInteraction = currentStepData?.interaction || (currentStepData?.action === 'confirm' ? 'confirm' : currentStepData?.target ? 'click' : 'guide');
  const currentRequiresTargetClick = currentInteraction === 'click' && Boolean(currentStepData?.target);

  useEffect(() => {
    if (!activeTutorial || !currentRequiresTargetClick || !currentStepData?.target) return;
    const handleTargetClick = (event: MouseEvent) => {
      const element = findTargetElement(currentStepData.target);
      if (!element || !element.contains(event.target as Node)) return;
      setActionConfirmed(true);
      window.setTimeout(() => {
        if (currentStep === activeTutorial.steps.length - 1) void completeTutorial();
        else nextStep();
      }, 180);
    };
    document.addEventListener('click', handleTargetClick, true);
    return () => document.removeEventListener('click', handleTargetClick, true);
  }, [activeTutorial, completeTutorial, currentRequiresTargetClick, currentStep, currentStepData?.target, findTargetElement, nextStep]);

  if (!activeTutorial) return null;

  const step = activeTutorial.steps[currentStep];
  const isLastStep = currentStep === activeTutorial.steps.length - 1;
  const interaction = step.interaction || (step.action === 'confirm' ? 'confirm' : step.target ? 'click' : 'guide');
  const requiresTargetClick = interaction === 'click' && Boolean(step.target);
  const requiresConfirmation = interaction === 'confirm';
  const highlightColor = step.highlightColor || 'rgba(124, 58, 237, 0.15)';
  const targetLabel = step.target && TARGET_ROUTES[step.target]
    ? Object.entries(TARGET_ROUTES).find(([target]) => target === step.target)?.[0]?.replace('nav-', '').replace(/-/g, ' ')
    : null;

  const continueTutorial = () => {
    if (isLastStep) {
      void completeTutorial();
    } else {
      nextStep();
    }
  };

  const focusTarget = () => {
    const element = findTargetElement(step.target);
    if (!element) return;
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    (element as HTMLElement).focus?.({ preventScroll: true });
  };

  const clampManualPosition = useCallback((top: number, left: number) => {
    const node = tooltipRef.current;
    const width = node?.offsetWidth || Math.min(500, window.innerWidth - 24);
    const height = node?.offsetHeight || Math.min(680, window.innerHeight - 24);
    const margin = 12;
    return {
      top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
      left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
    };
  }, []);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const interactiveChild = (event.target as HTMLElement).closest('button, a, input, textarea, select');
    if (interactiveChild) return;
    const rect = tooltipRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setManualPosition({ top: rect.top, left: rect.left });
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setManualPosition(clampManualPosition(event.clientY - dragOffsetRef.current.y, event.clientX - dragOffsetRef.current.x));
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      {/* ── Highlight Layer ── */}
      <div className="tutorial-overlay-root">
        {position && (
          <div
            className="tutorial-highlight-box"
            style={{
              top: position.top - 8,
              left: position.left - 8,
              width: position.width + 16,
              height: position.height + 16,
              backgroundColor: highlightColor,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), inset 0 0 0 3px #7c3aed',
            }}
          />
        )}
      </div>

      {/* ── Tooltip / Dialog ── */}
      <div
        ref={tooltipRef}
        className={`tutorial-tooltip-container${isDragging ? ' is-dragging' : ''}`}
        style={{
          ...(manualPosition ? {
            top: manualPosition.top,
            left: manualPosition.left,
            transform: 'none',
            position: 'fixed' as const,
          } : !position ? {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed' as const
          } : { 
            top: tooltipPos.top,
            left: tooltipPos.left,
            position: 'fixed' as const
          }),
          // Die Karte bleibt auch während eines Routenwechsels sichtbar. So ist
          // ein Tutorial nie blockiert, falls ein Ziel wegen Rolle, Route oder
          // einer noch nicht gerenderten Ansicht kurzfristig nicht gefunden wird.
          display: 'block',
        }}
      >
        <div className="tutorial-card">
          {/* Header */}
          <div
            className={`tutorial-header tutorial-header--draggable${isDragging ? ' is-dragging' : ''}`}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            title="Tutorialfenster verschieben"
          >
            <div className="flex items-center gap-3">
              <span className="tutorial-drag-handle" aria-hidden="true"><GripVertical size={18} /></span>
              <div className="w-8 h-8 rounded-full bg-accent-purple/30 border border-accent-purple/60 flex items-center justify-center text-accent-purple text-sm font-bold">
                {currentStep + 1}
              </div>
              <h3 className="text-lg font-bold text-text-primary flex-1">{step.title}</h3>
            </div>
            <button onClick={closeTutorial} className="text-text-muted hover:text-text-primary transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          {/* Image with Annotations */}
          {step.image && (
            <div className="tutorial-image-container">
              <div className="relative inline-block w-full">
                <img src={step.image} alt={step.title} className="w-full rounded-lg border border-obsidian-700" />
                {step.annotations?.map((ann, i) => {
                  const annotationType = ann.type || 'point';
                  const annotationColor = ann.color || ANN_COLORS[i % ANN_COLORS.length];
                  return (
                    <div
                      key={ann.id}
                      className={annotationType === 'circle'
                        ? 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-transparent shadow-lg pointer-events-none'
                        : 'absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white/80 pointer-events-none'}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        ...(annotationType === 'circle'
                          ? { width: `${ann.size || 10}%`, aspectRatio: '1 / 1', borderColor: annotationColor, boxShadow: `0 0 0 3px rgba(255,255,255,.34), 0 4px 16px ${annotationColor}77` }
                          : { backgroundColor: annotationColor }),
                      }}
                      title={ann.description}
                    >
                      {annotationType === 'circle' ? null : (annotationType === 'symbol' ? (ann.symbol || ann.label) : ann.label)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="tutorial-body">
            {step.target && (
              <div className="tutorial-action-hint" role="status">
                <span className="tutorial-action-hint__pulse" aria-hidden="true" />
                <span><strong>Nächste Aktion:</strong> {requiresTargetClick ? `Klicke auf den violett hervorgehobenen Bereich${targetLabel ? ` (${targetLabel})` : ''}. Danach geht das Tutorial automatisch weiter.` : requiresConfirmation ? 'Führe die Aufgabe aus und bestätige anschließend diesen Schritt.' : `Sieh dir den hervorgehobenen Bereich${targetLabel ? ` (${targetLabel})` : ''} an und fahre fort, wenn du bereit bist.`}</span>
              </div>
            )}
            {requiresTargetClick && actionConfirmed && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent-green"><CheckCircle2 size={14} /> Aktion erkannt – nächster Schritt wird geöffnet.</p>}
            <p className="text-base text-text-secondary leading-relaxed whitespace-pre-wrap">
              {step.description}
            </p>
          </div>

          {/* Annotations List */}
          {step.annotations && step.annotations.length > 0 && (
            <div className="tutorial-annotations-list">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Markierungen</p>
              <div className="space-y-1.5">
                {step.annotations.map((ann, i) => {
                  const annotationType = ann.type || 'point';
                  const annotationColor = ann.color || ANN_COLORS[i % ANN_COLORS.length];
                  return (
                    <div key={ann.id} className="flex items-start gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: annotationColor }}>
                        {annotationType === 'circle' ? '○' : (annotationType === 'symbol' ? (ann.symbol || ann.label) : ann.label)}
                      </span>
                      <span className="text-text-secondary">{ann.description || (annotationType === 'circle' ? 'Hervorgehobener Bereich' : 'Markierung')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress & Actions */}
          <div className="tutorial-footer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 h-2 bg-obsidian-700 rounded-full overflow-hidden mr-4">
                <div 
                  className="h-full bg-accent-purple transition-all duration-300" 
                  style={{ width: `${((currentStep + 1) / activeTutorial.steps.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-text-muted whitespace-nowrap">
                {currentStep + 1} / {activeTutorial.steps.length}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-obsidian-700 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} /> Zurück
              </button>

              <div className="flex items-center gap-2">
                {step.allowSkip && (
                  <button
                    onClick={skipTutorial}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors px-3 py-2"
                  >
                    Überspringen
                  </button>
                )}
                {manualPosition && (
                  <button
                    type="button"
                    onClick={() => setManualPosition(null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-obsidian-700 text-text-secondary hover:text-text-primary transition-all"
                    title="Tutorialfenster wieder automatisch am Zielbereich ausrichten"
                  >
                    <RotateCcw size={14} /> Position zurücksetzen
                  </button>
                )}
                
                {requiresTargetClick ? (
                  <>
                    <button
                      onClick={focusTarget}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                    >
                      <MousePointerClick size={16} /> Zum Bereich
                    </button>
                    <button
                      onClick={continueTutorial}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-obsidian-700 text-text-primary hover:bg-obsidian-600 transition-all"
                      title="Fahre fort, wenn der Bereich nicht verfügbar ist oder du die Aktion bereits ausgeführt hast."
                    >
                      {isLastStep ? 'Abschließen' : 'Weiter'} <ChevronRight size={16} />
                    </button>
                  </>
                ) : requiresConfirmation ? (
                  <button
                    onClick={() => { setActionConfirmed(true); continueTutorial(); }}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                  >
                    <CheckCircle2 size={16} /> Erledigt – {isLastStep ? 'abschließen' : 'weiter'}
                  </button>
                ) : isLastStep ? (
                  <button
                    onClick={completeTutorial}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                  >
                    Abschließen
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                  >
                    Weiter <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted"><PauseCircle size={13} /> Du kannst das Tutorial jederzeit schließen und später bei diesem Schritt fortsetzen.</p>
          </div>
        </div>
      </div>
    </>
  );
};
