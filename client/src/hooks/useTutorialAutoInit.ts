import { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTutorial } from '../contexts/TutorialContext';

/**
 * Hook to automatically initialize tutorials for new users on login
 * Checks if user has completed tutorials and starts first incomplete one
 */
export const useTutorialAutoInit = () => {
  const { user } = useApp();
  const { tutorials, startTutorial, loadTutorials } = useTutorial();

  useEffect(() => {
    if (!user) return;

    // Load tutorials for user's role
    const initTutorials = async () => {
      try {
        await loadTutorials();
      } catch (error) {
        console.error('Error loading tutorials on login:', error);
      }
    };

    initTutorials();
  }, [user?.id]);

  // Auto-start first incomplete tutorial
  useEffect(() => {
    if (!user || tutorials.length === 0) return;

    // Find first enabled tutorial that hasn't been completed
    const checkAndStartTutorial = async () => {
      for (const tutorial of tutorials) {
        if (!tutorial.enabled) continue;

        try {
          const progressResponse = await fetch(`/api/tutorials/${tutorial.id}/progress`, {
            credentials: 'include',
          });

          if (progressResponse.ok) {
            const progress = await progressResponse.json();

            // If not completed and not skipped, start it
            if (!progress.completed && !progress.skipped) {
              await startTutorial(tutorial.id);
              break;
            }
          }
        } catch (error) {
          console.error('Error checking tutorial progress:', error);
        }
      }
    };

    // Delay to allow UI to settle
    const timer = setTimeout(checkAndStartTutorial, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, tutorials]);
};
