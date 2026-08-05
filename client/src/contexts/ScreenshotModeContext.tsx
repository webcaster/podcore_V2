/**
 * ScreenshotModeContext
 *
 * Globaler Zustand für den Screenshot-Modus im Tutorial-Editor.
 * Wenn aktiv:
 *  - Layout zeigt das Menü in der Ansicht der simulierten Rolle
 *  - Ein schwebender Capture-Button erscheint
 *  - Nach dem Screenshot kehrt der Admin zur Tutorial-Verwaltung zurück
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AnnotationPoint {
  id: string;
  x: number;       // Prozent 0–100 relativ zur Bildbreite
  y: number;       // Prozent 0–100 relativ zur Bildhöhe
  label: string;   // Angezeigte Nummer z.B. "1"
  description: string;
}

export interface ScreenshotResult {
  dataUrl: string;
  annotations: AnnotationPoint[];
}

interface ScreenshotModeState {
  /** Ist der Screenshot-Modus gerade aktiv? */
  active: boolean;
  /** Welche Rolle wird simuliert? (z.B. "redakteur") */
  simulatedRole: string | null;
  /** Berechtigungen der simulierten Rolle */
  simulatedPermissions: Record<string, boolean>;
  /** Callback der aufgerufen wird wenn ein Screenshot fertig ist */
  onCapture: ((result: ScreenshotResult) => void) | null;
  /** Callback zum Abbrechen ohne Screenshot */
  onCancel: (() => void) | null;
}

interface ScreenshotModeContextValue extends ScreenshotModeState {
  /** Screenshot-Modus starten */
  startScreenshotMode: (params: {
    role: string;
    permissions: Record<string, boolean>;
    onCapture: (result: ScreenshotResult) => void;
    onCancel: () => void;
  }) => void;
  /** Screenshot-Modus beenden */
  endScreenshotMode: () => void;
}

const ScreenshotModeContext = createContext<ScreenshotModeContextValue | null>(null);

export function ScreenshotModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenshotModeState>({
    active: false,
    simulatedRole: null,
    simulatedPermissions: {},
    onCapture: null,
    onCancel: null,
  });

  const startScreenshotMode = useCallback(({ role, permissions, onCapture, onCancel }: {
    role: string;
    permissions: Record<string, boolean>;
    onCapture: (result: ScreenshotResult) => void;
    onCancel: () => void;
  }) => {
    setState({
      active: true,
      simulatedRole: role,
      simulatedPermissions: permissions,
      onCapture,
      onCancel,
    });
  }, []);

  const endScreenshotMode = useCallback(() => {
    setState({
      active: false,
      simulatedRole: null,
      simulatedPermissions: {},
      onCapture: null,
      onCancel: null,
    });
  }, []);

  return (
    <ScreenshotModeContext.Provider value={{ ...state, startScreenshotMode, endScreenshotMode }}>
      {children}
    </ScreenshotModeContext.Provider>
  );
}

export function useScreenshotMode() {
  const ctx = useContext(ScreenshotModeContext);
  if (!ctx) throw new Error('useScreenshotMode must be used within ScreenshotModeProvider');
  return ctx;
}
