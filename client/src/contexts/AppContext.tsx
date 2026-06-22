import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, adminApi } from '../lib/api';

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

  // Toast notifications
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Check auth on mount
  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
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
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

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
