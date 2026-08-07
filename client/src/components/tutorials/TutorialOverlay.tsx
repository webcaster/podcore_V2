import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, SkipForward, Eye } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../contexts/TutorialContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './TutorialOverlay.css';

const ANN_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0d9488',
];

// Mapping targets to routes for auto-navigation
const TARGET_ROUTES: Record<string, string> = {
  'nav-dashboard': '/',
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
};

export const TutorialOverlay: React.FC = () => {
  const { activeTutorial, currentStep, nextStep, previousStep, skipTutorial, completeTutorial, closeTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isNavigating, setIsNavigating] = useState(false);

  const updatePosition = useCallback(() => {
    if (!activeTutorial) return;
    const step = activeTutorial.steps[currentStep];
    if (!step || !step.target) {
      setPosition(null);
      return;
    }

    // Try to find element by data-tutorial-id
    const element = document.querySelector(`[data-tutorial-id="${step.target}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });

      // Calculate tooltip position
      const tooltipWidth = 340;
      const tooltipHeight = 220; // estimate
      const offset = 24;
      
      let top = rect.top + window.scrollY - tooltipHeight - offset;
      let left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;

      // Adjust if off-screen (too high)
      if (top < window.scrollY + offset) {
        top = rect.top + window.scrollY + rect.height + offset;
      }
      
      // Adjust if off-screen (horizontal)
      if (left < offset) {
        left = offset;
      } else if (left + tooltipWidth > window.innerWidth - offset) {
        left = window.innerWidth - tooltipWidth - offset;
      }

      setTooltipPos({ top, left });
      setIsNavigating(false);
    } else {
      // Element not found - maybe on wrong page?
      setPosition(null);
      
      // Check if we should navigate
      const targetRoute = TARGET_ROUTES[step.target];
      if (targetRoute && location.pathname !== targetRoute && !isNavigating) {
        setIsNavigating(true);
        navigate(targetRoute);
      }
    }
  }, [activeTutorial, currentStep, location.pathname, navigate, isNavigating]);

  useEffect(() => {
    if (!activeTutorial) return;
    
    // Initial delay to allow page rendering/navigation
    const timer = setTimeout(updatePosition, 300);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [activeTutorial, currentStep, updatePosition]);

  if (!activeTutorial) return null;

  const step = activeTutorial.steps[currentStep];
  const isLastStep = currentStep === activeTutorial.steps.length - 1;
  const highlightColor = step.highlightColor || 'rgba(124, 58, 237, 0.15)';

  return (
    <>
      {/* ── Highlight Layer ── */}
      <div className="tutorial-overlay-root">
        {position && (
          <div
            className="tutorial-highlight-box"
            style={{
              top: position.top - 6,
              left: position.left - 6,
              width: position.width + 12,
              height: position.height + 12,
              backgroundColor: highlightColor,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), inset 0 0 0 2px #7c3aed',
            }}
          />
        )}
      </div>

      {/* ── Tooltip / Dialog ── */}
      <div
        className="tutorial-tooltip-container"
        style={{
          ...( (!position && !isNavigating) ? {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed' as const
          } : { 
            top: tooltipPos.top,
            left: tooltipPos.left,
            position: 'absolute' as const
          }),
          display: position ? 'block' : (isNavigating ? 'none' : 'block'),
        }}
      >
        <div className="tutorial-card">
          {/* Header */}
          <div className="tutorial-header">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple text-[10px] font-bold">
                {currentStep + 1}
              </div>
              <h3 className="text-sm font-bold text-text-primary truncate">{step.title}</h3>
            </div>
            <button onClick={closeTutorial} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Image with Annotations */}
          {step.image && (
            <div className="tutorial-image-container">
              <div className="relative inline-block w-full">
                <img src={step.image} alt={step.title} className="w-full rounded-lg border border-obsidian-700" />
                {/* Render annotation points on the image */}
                {step.annotations?.map((ann, i) => (
                  <div
                    key={ann.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg border-2 border-white/80"
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
            </div>
          )}

          {/* Description */}
          <div className="tutorial-body">
            <p className="text-sm text-text-secondary leading-relaxed">
              {/* Replace [1], [2] with colored badges if we wanted to be fancy, 
                  but for now just plain text as saved. */}
              {step.description}
            </p>
          </div>

          {/* Progress & Actions */}
          <div className="tutorial-footer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 h-1 bg-obsidian-700 rounded-full overflow-hidden mr-3">
                <div 
                  className="h-full bg-accent-purple transition-all duration-300" 
                  style={{ width: `${((currentStep + 1) / activeTutorial.steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-text-muted whitespace-nowrap">
                {currentStep + 1} / {activeTutorial.steps.length}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-obsidian-700 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} /> Zurück
              </button>

              <div className="flex items-center gap-2">
                {step.allowSkip && (
                  <button
                    onClick={skipTutorial}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors px-2"
                  >
                    Überspringen
                  </button>
                )}
                
                {isLastStep ? (
                  <button
                    onClick={completeTutorial}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                  >
                    Abschließen
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-accent-purple text-white hover:bg-accent-purple/80 transition-all"
                  >
                    Weiter <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
