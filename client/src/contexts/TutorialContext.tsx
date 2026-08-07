import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApp } from './AppContext';

export interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  highlightColor?: string;
  allowSkip?: boolean;
  action?: string;
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
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);

  // Open/close wiki panel
  const openWiki = () => setWikiOpen(true);
  const closeWiki = () => setWikiOpen(false);

  // Load tutorials for user's role
  const loadTutorials = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/tutorials', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTutorials(data);
      }
    } catch (error) {
      console.error('Error loading tutorials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load tutorials on mount and when user changes
  useEffect(() => {
    loadTutorials();
  }, [user?.id]);

  // Start a tutorial
  const startTutorial = async (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) return;

    try {
      // Fetch or create progress
      const progressResponse = await fetch(`/api/tutorials/${tutorialId}/progress`, {
        credentials: 'include',
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setProgress(progressData);
        setCurrentStep(progressData.currentStep || 0);
      }

      setActiveTutorial(tutorial);
      setWikiOpen(false);
    } catch (error) {
      console.error('Error starting tutorial:', error);
    }
  };

  // Move to next step
  const nextStep = () => {
    if (activeTutorial && currentStep < activeTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      updateProgress(currentStep + 1, false, false);
    }
  };

  // Move to previous step
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      updateProgress(currentStep - 1, false, false);
    }
  };

  // Skip tutorial
  const skipTutorial = async () => {
    if (!activeTutorial) return;

    try {
      await fetch(`/api/tutorials/${activeTutorial.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          skipped: true,
          currentStep,
        }),
      });

      setActiveTutorial(null);
      setCurrentStep(0);
      setProgress(null);
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  // Complete tutorial
  const completeTutorial = async () => {
    if (!activeTutorial) return;

    try {
      await fetch(`/api/tutorials/${activeTutorial.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          completed: true,
          currentStep: activeTutorial.steps.length - 1,
        }),
      });

      setActiveTutorial(null);
      setCurrentStep(0);
      setProgress(null);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  // Update progress
  const updateProgress = async (step: number, completed: boolean, skipped: boolean) => {
    if (!activeTutorial) return;

    try {
      await fetch(`/api/tutorials/${activeTutorial.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          completed,
          skipped,
          currentStep: step,
        }),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Close tutorial
  const closeTutorial = () => {
    setActiveTutorial(null);
    setCurrentStep(0);
    setProgress(null);
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorials,
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
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};
