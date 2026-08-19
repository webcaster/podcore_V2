import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface RecordedTutorialAction {
  target: string;
  route: string;
  label: string;
  title: string;
  description: string;
  interaction: 'click' | 'guide' | 'confirm';
  image?: string;
}

interface TutorialRecordingState {
  active: boolean;
  simulatedRole: string | null;
  simulatedPermissions: Record<string, boolean>;
  onComplete: ((actions: RecordedTutorialAction[]) => void) | null;
  onCancel: (() => void) | null;
}

interface TutorialRecordingContextValue extends TutorialRecordingState {
  startRecording: (params: {
    role: string;
    permissions: Record<string, boolean>;
    onComplete: (actions: RecordedTutorialAction[]) => void;
    onCancel: () => void;
  }) => void;
  endRecording: () => void;
}

const TutorialRecordingContext = createContext<TutorialRecordingContextValue | null>(null);

export function TutorialRecordingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TutorialRecordingState>({
    active: false,
    simulatedRole: null,
    simulatedPermissions: {},
    onComplete: null,
    onCancel: null,
  });

  const startRecording = useCallback((params: {
    role: string;
    permissions: Record<string, boolean>;
    onComplete: (actions: RecordedTutorialAction[]) => void;
    onCancel: () => void;
  }) => {
    setState({ active: true, simulatedRole: params.role, simulatedPermissions: params.permissions, onComplete: params.onComplete, onCancel: params.onCancel });
  }, []);

  const endRecording = useCallback(() => {
    setState({ active: false, simulatedRole: null, simulatedPermissions: {}, onComplete: null, onCancel: null });
  }, []);

  return <TutorialRecordingContext.Provider value={{ ...state, startRecording, endRecording }}>{children}</TutorialRecordingContext.Provider>;
}

export function useTutorialRecording() {
  const context = useContext(TutorialRecordingContext);
  if (!context) throw new Error('useTutorialRecording must be used within TutorialRecordingProvider');
  return context;
}
