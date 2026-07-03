import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, mediaApi, adminApi } from '../lib/api';

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
  dashboardLayout?: string[] | null;
}

export interface UserTheme {
  accentColor?: string;
  sidebarColor?: string;
  fontScale?: number;
  accentColorLight?: string;
  accentColorDark?: string;
  surfaceColor?: string;
  surfaceRaisedColor?: string;
}

// Feature-Flags: welche Module sind aktiviert
export interface FeatureFlags {
  sponsoring: boolean;
  editorial: boolean;
  statistics: boolean;
  chat: boolean;
  branding: boolean;
  podigee: boolean;
  seasons: boolean;
  approvals: boolean;
  wiki: boolean;
  mediaLibrary: boolean;
}

export interface BrandingState {
  podcastName: string;
  podcastDescription: string;
  logoUrl: string | null;
  coverUrl: string | null;
}

// Globales Podcast-Profil (vom Admin definiert, für alle Nutzer sichtbar)
export interface PodcastProfile {
  name: string;
  description: string;
  author: string;
  email: string;
  website: string;
  rssUrl: string;
  category: string;
  language: string;
  moderator: string;
  copyright: string;
  explicit: boolean;
}

// Globale technische Standards (einmal definiert, als Vorlage für Episoden)
export interface TechnicalDefaults {
  sampleRate: string;
  bitrate: string;
  format: string;
  channels: string;
  recordingDevice: string;
  daw: string;
  additionalNotes: string;
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

  // Feature-Flags
  features: FeatureFlags;

  // Globales Podcast-Profil
  podcastProfile: PodcastProfile;
  technicalDefaults: TechnicalDefaults;
  refreshPodcastProfile: () => Promise<void>;

  // Online-Nutzer
  onlineUsers: OnlineUser[];

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

const DEFAULT_PODCAST_PROFILE: PodcastProfile = {
  name: '',
  description: '',
  author: '',
  email: '',
  website: '',
  rssUrl: '',
  category: '',
  language: 'de',
  moderator: '',
  copyright: '',
  explicit: false,
};

const DEFAULT_FEATURES: FeatureFlags = {
  sponsoring: true,
  editorial: true,
  statistics: true,
  chat: true,
  podigee: true,
  mediaLibrary: true,
  seasons: true,
  wiki: true,
  branding: true,
  approvals: true,
};

const DEFAULT_TECHNICAL_DEFAULTS: TechnicalDefaults = {
  sampleRate: '',
  bitrate: '',
  format: '',
  channels: '',
  recordingDevice: '',
  daw: '',
  additionalNotes: '',
};

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppContextValue | null>(null);

export interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor?: string;
  role: string;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [branding, setBranding] = useState<BrandingState>(DEFAULT_BRANDING);
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [podcastProfile, setPodcastProfile] = useState<PodcastProfile>(DEFAULT_PODCAST_PROFILE);
  const [technicalDefaults, setTechnicalDefaults] = useState<TechnicalDefaults>(DEFAULT_TECHNICAL_DEFAULTS);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Load branding from server
  const refreshBranding = useCallback(async () => {
    try {
      const data = await mediaApi.getBranding();
      setBranding({
        podcastName: data.podcastName || 'PodCore',
        podcastDescription: data.podcastDescription || '',
        logoUrl: data.logo ? `${data.logo}?t=${Date.now()}` : null,
        coverUrl: data.cover ? `${data.cover}?t=${Date.now()}` : null,
      });
    } catch {
      // Keep defaults on error
    }
  }, []);

  // Load global podcast profile and technical defaults
  const refreshPodcastProfile = useCallback(async () => {
    try {
      const data = await adminApi.getPublicSettings();
      if (data) {
        const podcast = data.podcast || {};
        setPodcastProfile({
          name: podcast.name || data.general?.podcastName || '',
          description: podcast.description || data.branding?.podcastDescription || '',
          author: podcast.author || '',
          email: podcast.email || '',
          website: podcast.website || '',
          rssUrl: podcast.rssUrl || '',
          category: podcast.category || '',
          language: podcast.language || data.general?.language || 'de',
          moderator: podcast.moderator || '',
          copyright: podcast.copyright || '',
          explicit: podcast.explicit || false,
        });
        const tech = data.technicalDefaults || {};
        setTechnicalDefaults({
          sampleRate: tech.sampleRate || '',
          bitrate: tech.bitrate || '',
          format: tech.format || '',
          channels: tech.channels || '',
          recordingDevice: tech.recordingDevice || '',
          daw: tech.daw || '',
          additionalNotes: tech.additionalNotes || '',
        });
        // Feature-Flags laden
        if (data.features) {
          setFeatures({ ...DEFAULT_FEATURES, ...data.features });
        }
        // Sync podcast name to branding if not set separately
        if (podcast.name) {
          setBranding(prev => ({
            ...prev,
            podcastName: podcast.name || prev.podcastName,
          }));
        }
      }
    } catch {
      // Keep defaults on error
    }
  }, []);

  // Check auth on mount, then load branding and podcast profile
  useEffect(() => {
    authApi.me()
      .then(u => {
        setUser(u);
        if (u?.theme) applyUserTheme(u.theme);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));

    // Load branding and podcast profile independently (doesn't require auth)
    refreshBranding();
    refreshPodcastProfile();
  }, [refreshBranding, refreshPodcastProfile]);

  // Poll for permission/role changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      try {
        const fresh = await authApi.me();
        if (!fresh) return;
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

  // Heartbeat: alle 60 Sekunden eigene Session als aktiv markieren + Online-Nutzer laden
  useEffect(() => {
    if (!user) return;
    // Sofort beim Login einmal senden
    authApi.heartbeat().catch(() => {});
    authApi.getOnlineUsers().then(users => setOnlineUsers(Array.isArray(users) ? users : [])).catch(() => {});

    const interval = setInterval(async () => {
      try {
        await authApi.heartbeat();
        const users = await authApi.getOnlineUsers();
        setOnlineUsers(Array.isArray(users) ? users : []);
      } catch {
        // Silently ignore
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setUser(result.user);
    applyUserTheme(result.user?.theme || null);
    refreshBranding();
    refreshPodcastProfile();
  }, [refreshBranding, refreshPodcastProfile]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
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
    features,
    podcastProfile,
    technicalDefaults,
    refreshPodcastProfile,
    onlineUsers,
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
    root.style.setProperty('--color-accent-primary-light', theme.accentColorLight || lightenColor(theme.accentColor, 20));
    root.style.setProperty('--color-accent-primary-dark', theme.accentColorDark || darkenColor(theme.accentColor, 20));
    root.style.setProperty('--color-text-accent', lightenColor(theme.accentColor, 30));
  }

  if (theme.sidebarColor) {
    root.style.setProperty('--color-sidebar-bg', theme.sidebarColor);
    // root.style.setProperty('--color-obsidian-800', theme.sidebarColor); // REMOVED: Breaks shared card styling
    // root.style.setProperty('--color-surface', lightenColor(theme.sidebarColor, 8)); // REMOVED: Breaks shared card styling
    // root.style.setProperty('--color-surface-raised', lightenColor(theme.sidebarColor, 12)); // REMOVED: Breaks shared card styling
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

export function usePodcastProfile() {
  const { podcastProfile, technicalDefaults, refreshPodcastProfile } = useApp();
  return { podcastProfile, technicalDefaults, refreshPodcastProfile };
}

export function useFeatures() {
  const { features } = useApp();
  return { features };
}

export function useOnlineUsers() {
  const { onlineUsers } = useApp();
  return { onlineUsers };
}
