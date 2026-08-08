import React, { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useTutorial } from '../../contexts/TutorialContext';

export default function TutorialHintNotification() {
  const { tutorials, openWiki } = useTutorial();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleHint = () => {
      if (tutorials.length > 0) {
        setShow(true);
        // Auto-hide after 8 seconds
        const timer = setTimeout(() => setShow(false), 8000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('tutorial-hint', handleHint);
    return () => window.removeEventListener('tutorial-hint', handleHint);
  }, [tutorials.length]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-in-up">
      <div className="bg-obsidian-800 border border-accent-purple/40 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
          <BookOpen size={20} className="text-accent-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm">Tutorial verfügbar</p>
          <p className="text-text-muted text-xs mt-0.5">
            {tutorials.length === 1 
              ? 'Es gibt ein Tutorial für deine Rolle.' 
              : `Es gibt ${tutorials.length} Tutorials für deine Rolle.`}
          </p>
          <button
            onClick={() => {
              openWiki();
              setShow(false);
            }}
            className="mt-2 text-xs font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
          >
            Jetzt anschauen →
          </button>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0 p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
