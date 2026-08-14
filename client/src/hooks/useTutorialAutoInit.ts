import { useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTutorial } from '../contexts/TutorialContext';

/**
 * Hook to load tutorials on login and show a hint if tutorials are available
 * Does NOT auto-start tutorials - user must click to start
 */
export const useTutorialAutoInit = () => {
  const { user } = useApp();
  const { tutorials } = useTutorial();
  const hintShownRef = useRef(false);

  useEffect(() => {
    if (!user) hintShownRef.current = false;
  }, [user?.id]);

  // Show hint if tutorials available (but don't auto-start)
  useEffect(() => {
    if (!user || tutorials.length === 0 || hintShownRef.current) return;

    // Show hint once per session
    hintShownRef.current = true;
    
    // Delay to allow UI to settle
    const timer = setTimeout(() => {
      // Show a subtle toast notification instead of auto-starting
      const event = new CustomEvent('tutorial-hint', {
        detail: { tutorialCount: tutorials.length }
      });
      window.dispatchEvent(event);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id, tutorials]);
};
