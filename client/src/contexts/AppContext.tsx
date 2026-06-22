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

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setUser(result.user);
    if (result.user?.theme) applyUserTheme(result.user.theme);
    // Refresh branding after login in case it changed
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
      if (u?.theme) applyUserTheme(u.theme);
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

function applyUserTheme(theme: UserTheme | null | undefined) {
  const root = document.documentElement;
  if (!theme) {
    root.style.removeProperty('--color-accent-primary');
    root.style.removeProperty('--color-sidebar-bg');
    root.style.removeProperty('--font-scale');
    return;
  }
  if (theme.accentColor) root.style.setProperty('--color-accent-primary', theme.accentColor);
  if (theme.sidebarColor) root.style.setProperty('--color-sidebar-bg', theme.sidebarColor);
  if (theme.fontScale) root.style.setProperty('--font-scale', String(theme.fontScale));
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
