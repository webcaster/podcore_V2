import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../contexts/TutorialContext';
import './TutorialOverlay.css';

export const TutorialOverlay: React.FC = () => {
  const { activeTutorial, currentStep, nextStep, previousStep, skipTutorial, completeTutorial, closeTutorial } = useTutorial();
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!activeTutorial) return;

    const step = activeTutorial.steps[currentStep];
    if (!step || !step.target) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });

        // Calculate tooltip position
        const tooltipWidth = 320;
        const tooltipHeight = 200;
        const offset = 20;
        let top = rect.top + window.scrollY - tooltipHeight - offset;
        let left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;

        // Adjust if off-screen
        if (top < 0) {
          top = rect.top + window.scrollY + rect.height + offset;
        }
        if (left < 0) {
          left = offset;
        } else if (left + tooltipWidth > window.innerWidth) {
          left = window.innerWidth - tooltipWidth - offset;
        }

        setTooltipPos({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [activeTutorial, currentStep]);

  if (!activeTutorial) return null;

  const step = activeTutorial.steps[currentStep];
  const isLastStep = currentStep === activeTutorial.steps.length - 1;
  const highlightColor = step.highlightColor || 'rgba(147, 51, 234, 0.2)';

  return (
    <>
      {/* Overlay */}
      <div className="tutorial-overlay">
        {position && (
          <div
            className="tutorial-highlight"
            style={{
              top: position.top - 4,
              left: position.left - 4,
              width: position.width + 8,
              height: position.height + 8,
              backgroundColor: highlightColor,
              border: '2px solid #9333ea',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="tutorial-tooltip"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        <div className="tutorial-tooltip-header">
          <h3 className="tutorial-tooltip-title">{step.title}</h3>
          <button
            onClick={closeTutorial}
            className="tutorial-tooltip-close"
            aria-label="Close tutorial"
          >
            <X size={18} />
          </button>
        </div>

        {step.image && (
          <div className="tutorial-tooltip-image">
            <img src={step.image} alt={step.title} />
          </div>
        )}

        <p className="tutorial-tooltip-description">{step.description}</p>

        <div className="tutorial-tooltip-progress">
          <div className="tutorial-progress-bar">
            <div
              className="tutorial-progress-fill"
              style={{
                width: `${((currentStep + 1) / activeTutorial.steps.length) * 100}%`,
              }}
            />
          </div>
          <span className="tutorial-progress-text">
            {currentStep + 1} / {activeTutorial.steps.length}
          </span>
        </div>

        <div className="tutorial-tooltip-actions">
          <button
            onClick={previousStep}
            disabled={currentStep === 0}
            className="tutorial-btn tutorial-btn-secondary"
            aria-label="Previous step"
          >
            <ChevronLeft size={16} />
            Zurück
          </button>

          {step.allowSkip && (
            <button
              onClick={skipTutorial}
              className="tutorial-btn tutorial-btn-skip"
              aria-label="Skip tutorial"
            >
              <SkipForward size={16} />
              Überspringen
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={completeTutorial}
              className="tutorial-btn tutorial-btn-primary"
            >
              Fertig
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="tutorial-btn tutorial-btn-primary"
              aria-label="Next step"
            >
              Weiter
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
