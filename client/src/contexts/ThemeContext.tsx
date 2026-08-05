import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Light Mode Color Palette
const LIGHT_MODE_COLORS = {
  '--color-obsidian-950': '#f8f9fa',
  '--color-obsidian-900': '#ffffff',
  '--color-obsidian-800': '#f3f4f6',
  '--color-obsidian-700': '#e5e7eb',
  '--color-obsidian-600': '#d1d5db',
  '--color-obsidian-500': '#9ca3af',

  '--color-surface': '#f0f1f3',
  '--color-surface-raised': '#ffffff',
  '--color-surface-overlay': '#f3f4f6',
  '--color-surface-border': '#d1d5db',
  '--color-surface-border-light': '#9ca3af',

  '--color-sidebar-bg': '#ffffff',
  '--color-sidebar-border': '#e5e7eb',

  '--color-text-primary': '#111827',
  '--color-text-secondary': '#6b7280',
  '--color-text-muted': '#9ca3af',
};

// Dark Mode Color Palette (Default)
const DARK_MODE_COLORS = {
  '--color-obsidian-950': '#0a0a0f',
  '--color-obsidian-900': '#0f0f1a',
  '--color-obsidian-800': '#141420',
  '--color-obsidian-700': '#1a1a2e',
  '--color-obsidian-600': '#1e1e35',
  '--color-obsidian-500': '#252540',

  '--color-surface': '#1a1a2e',
  '--color-surface-raised': '#1e1e35',
  '--color-surface-overlay': '#252540',
  '--color-surface-border': '#2d2d4e',
  '--color-surface-border-light': '#3d3d6e',

  '--color-sidebar-bg': '#141420',
  '--color-sidebar-border': '#2d2d4e',

  '--color-text-primary': '#f1f5f9',
  '--color-text-secondary': '#94a3b8',
  '--color-text-muted': '#64748b',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('podcore-theme') as ThemeMode | null;
    const preferredMode = savedMode || 'dark';
    setModeState(preferredMode);
    applyTheme(preferredMode);
    setIsInitialized(true);
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((themeMode: ThemeMode) => {
    const colors = themeMode === 'light' ? LIGHT_MODE_COLORS : DARK_MODE_COLORS;
    const root = document.documentElement;

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', themeMode);

    // Update scrollbar colors
    if (themeMode === 'light') {
      root.style.setProperty('color-scheme', 'light');
    } else {
      root.style.setProperty('color-scheme', 'dark');
    }
  }, []);

  // Update theme mode
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('podcore-theme', newMode);
    applyTheme(newMode);
  }, [applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  if (!isInitialized) {
    return null; // Prevent flash of unstyled content
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
