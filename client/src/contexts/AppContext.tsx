import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, mediaApi } from '../lib/api';

// ============================================================
// Types
// ============================================================

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  permissions: Record<string, boolean>;
  avatarColor?: string;
  theme?: UserTheme | null;
}

export interface UserTheme {
  accentColor?: string;
  sidebarColor?: string;
  fontScale?: number;
  // Extended theme options
  accentColorLight?: string;
  accentColorDark?: string;
  surfaceColor?: string;
  surfaceRaisedColor?: string;
}

export interface BrandingState {
  podcastName: string;
  podcastDescription: string;
  logoUrl: string | null;
  coverUrl: string | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface AppContextValue {
  // Auth
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Permissions
  can: (permission: string) => boolean;

  // Branding
  branding: BrandingState;
  refreshBranding: () => Promise<void>;

  // Toast notifications
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

// ============================================================
// Defaults
// ============================================================

const DEFAULT_BRANDING: BrandingState = {
  podcastName: 'PodCore',
  podcastDescription: '',
  logoUrl: null,
  coverUrl: null,
};

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [branding, setBranding] = useState<BrandingState>(DEFAULT_BRANDING);

  // Load branding from server
  const refreshBranding = useCallback(async () => {
    try {
      const data = await mediaApi.getBranding();
      setBranding({
        podcastName: data.podcastName || 'PodCore',
        podcastDescription: data.podcastDescription || '',
        // Add cache-busting timestamp so the browser reloads the image after upload
        logoUrl: data.logo ? `${data.logo}?t=${Date.now()}` : null,
        coverUrl: data.cover ? `${data.cover}?t=${Date.now()}` : null,
      });
    } catch {
      // Keep defaults on error
    }
  }, []);

  // Check auth on mount, then load branding
  useEffect(() => {
    authApi.me()
      .then(u => {
        setUser(u);
        // Apply user theme if set
        if (u?.theme) applyUserTheme(u.theme);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));

    // Load branding independently (doesn't require auth)
    refreshBranding();
  }, [refreshBranding]);

  // Poll for permission/role changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      try {
        const fresh = await authApi.me();
        if (!fresh) return;
        // Check for permission, role OR theme changes
        const oldPerms = JSON.stringify(user.permissions);
        const newPerms = JSON.stringify(fresh.permissions);
        const oldTheme = JSON.stringify(user.theme);
        const newTheme = JSON.stringify(fresh.theme);
        if (oldPerms !== newPerms || user.role !== fresh.role || oldTheme !== newTheme) {
          setUser(fresh);
          applyUserTheme(fresh.theme || null);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setUser(result.user);
    applyUserTheme(result.user?.theme || null);
    // Refresh branding after login
    refreshBranding();
  }, [refreshBranding]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
    // Reset theme on logout
    applyUserTheme(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
      applyUserTheme(u?.theme || null);
    } catch {
      setUser(null);
    }
  }, []);

  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions[permission] === true;
  }, [user]);

  // Toast management
  const addToast = useCallback((type: Toast['type'], message: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => addToast('success', message), [addToast]);
  const showError = useCallback((message: string) => addToast('error', message), [addToast]);
  const showInfo = useCallback((message: string) => addToast('info', message), [addToast]);

  const value: AppContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    can,
    branding,
    refreshBranding,
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================
// Apply user theme via CSS custom properties
// ============================================================

export function applyUserTheme(theme: UserTheme | null | undefined) {
  const root = document.documentElement;

  if (!theme) {
    // Reset all to defaults
    root.style.removeProperty('--color-accent-primary');
    root.style.removeProperty('--color-accent-primary-light');
    root.style.removeProperty('--color-accent-primary-dark');
    root.style.removeProperty('--color-text-accent');
    root.style.removeProperty('--color-sidebar-bg');
    root.style.removeProperty('--color-sidebar-border');
    root.style.removeProperty('--font-scale');
    root.style.removeProperty('--color-surface');
    root.style.removeProperty('--color-surface-raised');
    root.style.removeProperty('--color-obsidian-800');
    return;
  }

  if (theme.accentColor) {
    root.style.setProperty('--color-accent-primary', theme.accentColor);
    // Derive light/dark variants by adjusting opacity
    root.style.setProperty('--color-accent-primary-light', theme.accentColorLight || lightenColor(theme.accentColor, 20));
    root.style.setProperty('--color-accent-primary-dark', theme.accentColorDark || darkenColor(theme.accentColor, 20));
    root.style.setProperty('--color-text-accent', lightenColor(theme.accentColor, 30));
  }

  if (theme.sidebarColor) {
    root.style.setProperty('--color-sidebar-bg', theme.sidebarColor);
    root.style.setProperty('--color-obsidian-800', theme.sidebarColor);
    // Slightly lighter for surface
    root.style.setProperty('--color-surface', lightenColor(theme.sidebarColor, 8));
    root.style.setProperty('--color-surface-raised', lightenColor(theme.sidebarColor, 12));
  }

  if (theme.fontScale) {
    root.style.setProperty('--font-scale', String(theme.fontScale));
  }
}

// ============================================================
// Color utility helpers
// ============================================================

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb[0] + amount, rgb[1] + amount, rgb[2] + amount);
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb[0] - amount, rgb[1] - amount, rgb[2] - amount);
}

// ============================================================
// Hooks
// ============================================================

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, refreshUser } = useApp();
  return { user, isAuthenticated, isLoading, login, logout, refreshUser };
}

export function usePermissions() {
  const { can, user } = useApp();
  return { can, user, isAdmin: user?.role === 'admin' };
}

export function useToast() {
  const { addToast, removeToast, showSuccess, showError, showInfo } = useApp();
  return { addToast, removeToast, showSuccess, showError, showInfo };
}

export function useBranding() {
  const { branding, refreshBranding } = useApp();
  return { branding, refreshBranding };
}
