import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useApp } from './AppContext';

export interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  type?: 'point' | 'circle' | 'symbol';
  symbol?: string;
  color?: string;
  size?: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  highlightColor?: string;
  allowSkip?: boolean;
  action?: string;
  interaction?: 'guide' | 'click' | 'confirm';
}

export interface Tutorial {
  id: string;
  role: string;
  title: string;
  description: string;
  enabled: boolean;
  steps: TutorialStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TutorialProgress {
  id?: string;
  completed: boolean;
  completedAt?: string;
  skipped: boolean;
  currentStep: number;
}

interface TutorialContextType {
  tutorials: Tutorial[];
  progressByTutorial: Record<string, TutorialProgress>;
  activeTutorial: Tutorial | null;
  currentStep: number;
  progress: TutorialProgress | null;
  isLoading: boolean;
  wikiOpen: boolean;
  openWiki: () => void;
  closeWiki: () => void;
  startTutorial: (tutorialId: string) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  closeTutorial: () => void;
  loadTutorials: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useApp();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [progressByTutorial, setProgressByTutorial] = useState<Record<string, TutorialProgress>>({});
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);

  const openWiki = () => setWikiOpen(true);
  const closeWiki = () => setWikiOpen(false);

  const loadProgressForTutorial = useCallback(async (tutorialId: string): Promise<TutorialProgress> => {
    const response = await fetch(`/api/tutorials/${tutorialId}/progress`, { credentials: 'include' });
    if (!response.ok) throw new Error(`Tutorial-Fortschritt konnte nicht geladen werden (${response.status})`);
    return response.json();
  }, []);

  const loadTutorials = useCallback(async () => {
    if (!user?.id) {
      setTutorials([]);
      setProgressByTutorial({});
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/tutorials', { credentials: 'include' });
      if (!response.ok) throw new Error(`Tutorials konnten nicht geladen werden (${response.status})`);

      const data = await response.json();
      const list: Tutorial[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setTutorials(list);

      const progressEntries = await Promise.all(list.map(async (tutorial) => {
        try {
          return [tutorial.id, await loadProgressForTutorial(tutorial.id)] as const;
        } catch {
          return [tutorial.id, { completed: false, skipped: false, currentStep: 0 }] as const;
        }
      }));
      setProgressByTutorial(Object.fromEntries(progressEntries));
    } catch (error) {
      console.error('Error loading tutorials:', error);
      setTutorials([]);
      setProgressByTutorial({});
    } finally {
      setIsLoading(false);
    }
  }, [loadProgressForTutorial, user?.id]);

  useEffect(() => {
    void loadTutorials();
    const handleTutorialUpdate = () => { void loadTutorials(); };
    window.addEventListener('podcore-tutorials-updated', handleTutorialUpdate);
    return () => window.removeEventListener('podcore-tutorials-updated', handleTutorialUpdate);
  }, [loadTutorials]);

  const saveProgress = useCallback(async (tutorialId: string, nextProgress: TutorialProgress) => {
    const response = await fetch(`/api/tutorials/${tutorialId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(nextProgress),
    });
    if (!response.ok) throw new Error(`Tutorial-Fortschritt konnte nicht gespeichert werden (${response.status})`);
    const body = await response.json().catch(() => null);
    const savedProgress: TutorialProgress = body?.data || nextProgress;
    setProgress(savedProgress);
    setProgressByTutorial(previous => ({ ...previous, [tutorialId]: savedProgress }));
    return savedProgress;
  }, []);

  const startTutorial = async (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial || !tutorial.enabled || !tutorial.steps?.length) return;

    setProgress(null);
    setCurrentStep(0);
    setActiveTutorial(tutorial);
    setWikiOpen(false);

    try {
      const loadedProgress = await loadProgressForTutorial(tutorialId);
      setProgress(loadedProgress);
      setProgressByTutorial(previous => ({ ...previous, [tutorialId]: loadedProgress }));
      const safeStep = loadedProgress.completed
        ? 0
        : Number.isInteger(loadedProgress.currentStep)
          ? Math.max(0, Math.min(loadedProgress.currentStep, tutorial.steps.length - 1))
          : 0;
      setCurrentStep(safeStep);
    } catch (error) {
      console.warn('Tutorial-Fortschritt konnte nicht geladen werden:', error);
    }
  };

  const updateProgress = useCallback(async (step: number, completed: boolean, skipped: boolean) => {
    if (!activeTutorial) return;
    try {
      await saveProgress(activeTutorial.id, { completed, skipped, currentStep: step });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [activeTutorial, saveProgress]);

  const nextStep = () => {
    if (activeTutorial && currentStep < activeTutorial.steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      void updateProgress(nextStepIndex, false, false);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const previousStepIndex = currentStep - 1;
      setCurrentStep(previousStepIndex);
      void updateProgress(previousStepIndex, false, false);
    }
  };

  const skipTutorial = async () => {
    if (!activeTutorial) return;
    try {
      await saveProgress(activeTutorial.id, { completed: false, skipped: true, currentStep });
      setActiveTutorial(null);
      setCurrentStep(0);
      setProgress(null);
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  const completeTutorial = async () => {
    if (!activeTutorial) return;
    try {
      await saveProgress(activeTutorial.id, {
        completed: true,
        completedAt: new Date().toISOString(),
        skipped: false,
        currentStep: activeTutorial.steps.length - 1,
      });
      setActiveTutorial(null);
      setCurrentStep(0);
      setProgress(null);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
    setCurrentStep(0);
    setProgress(null);
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorials,
        progressByTutorial,
        activeTutorial,
        currentStep,
        progress,
        isLoading,
        wikiOpen,
        openWiki,
        closeWiki,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        completeTutorial,
        closeTutorial,
        loadTutorials,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
};
