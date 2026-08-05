/**
 * ScreenshotModeContext
 *
 * Globaler Zustand für den Screenshot-Modus im Tutorial-Editor.
 * Wenn aktiv:
 *  - Layout zeigt das Menü in der Ansicht der simulierten Rolle
 *  - Ein schwebender Capture-Button erscheint
 *  - Nach dem Screenshot kehrt der Admin zur Tutorial-Verwaltung zurück
 *
 * persistedState: Speichert den Tutorial-Editor-State über Navigation hinweg,
 * damit nach dem Screenshot der Editor-Zustand wiederhergestellt werden kann.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
}

export interface ScreenshotResult {
  dataUrl: string;
  annotations: AnnotationPoint[];
}

export interface PersistedTutorialState {
  editTutorial: any;
  stepId: string;
}

interface ScreenshotModeState {
  active: boolean;
  simulatedRole: string | null;
  simulatedPermissions: Record<string, boolean>;
  onCapture: ((result: ScreenshotResult) => void) | null;
  onCancel: (() => void) | null;
  /** Tutorial-State der nach der Navigation wiederhergestellt werden soll */
  persistedState: PersistedTutorialState | null;
}

interface ScreenshotModeContextValue extends ScreenshotModeState {
  startScreenshotMode: (params: {
    role: string;
    permissions: Record<string, boolean>;
    onCapture: (result: ScreenshotResult) => void;
    onCancel: () => void;
    persistedState?: PersistedTutorialState;
  }) => void;
  endScreenshotMode: () => void;
  clearPersistedState: () => void;
}

const ScreenshotModeContext = createContext<ScreenshotModeContextValue | null>(null);

export function ScreenshotModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenshotModeState>({
    active: false,
    simulatedRole: null,
    simulatedPermissions: {},
    onCapture: null,
    onCancel: null,
    persistedState: null,
  });

  const startScreenshotMode = useCallback(({
    role, permissions, onCapture, onCancel, persistedState,
  }: {
    role: string;
    permissions: Record<string, boolean>;
    onCapture: (result: ScreenshotResult) => void;
    onCancel: () => void;
    persistedState?: PersistedTutorialState;
  }) => {
    setState({
      active: true,
      simulatedRole: role,
      simulatedPermissions: permissions,
      onCapture,
      onCancel,
      persistedState: persistedState || null,
    });
  }, []);

  const endScreenshotMode = useCallback(() => {
    setState(prev => ({
      active: false,
      simulatedRole: null,
      simulatedPermissions: {},
      onCapture: null,
      onCancel: null,
      // Keep persistedState so the tutorial page can read it on remount
      persistedState: prev.persistedState,
    }));
  }, []);

  const clearPersistedState = useCallback(() => {
    setState(prev => ({ ...prev, persistedState: null }));
  }, []);

  return (
    <ScreenshotModeContext.Provider value={{ ...state, startScreenshotMode, endScreenshotMode, clearPersistedState }}>
      {children}
    </ScreenshotModeContext.Provider>
  );
}

export function useScreenshotMode() {
  const ctx = useContext(ScreenshotModeContext);
  if (!ctx) throw new Error('useScreenshotMode must be used within ScreenshotModeProvider');
  return ctx;
}
