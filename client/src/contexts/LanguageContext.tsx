import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi, authApi } from '../lib/api';
import { useApp } from './AppContext';

export type AppLanguage = 'de' | 'en';

const translations = {
  de: {
    'language.german': 'Deutsch', 'language.english': 'English', 'language.switch': 'Sprache wechseln',
    'nav.dashboard': 'Dashboard', 'nav.approvals': 'Freigabe-Center', 'nav.episodes': 'Episoden', 'nav.episodesDashboard': 'Episoden-Dashboard',
    'nav.editorial': 'Redaktions-Hub', 'nav.calendar': 'Redaktionskalender', 'nav.chat': 'Team-Chat', 'nav.media': 'Media Library',
    'nav.sponsoring': 'Sponsoring', 'nav.bookingCalendar': 'Buchungskalender', 'nav.sponsorReports': 'Sponsor-Auswertungen',
    'nav.seasons': 'Staffeln', 'nav.archive': 'Archiv', 'nav.analytics': 'Podigee Analytics', 'nav.statistics': 'Podcast-Statistiken',
    'nav.branding': 'Branding', 'nav.podcasts': 'Podcast-Verwaltung', 'nav.administration': 'Administration', 'nav.tutorials': 'Tutorial-Verwaltung',
    'nav.tutorialImport': 'Tutorials importieren', 'nav.pdfLayouts': 'PDF-Layouts', 'nav.settings': 'Einstellungen',
    'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.delete': 'Löschen', 'common.edit': 'Bearbeiten', 'common.language': 'Sprache',
    'settings.title': 'Einstellungen', 'settings.profile': 'Mein Profil', 'settings.design': 'Mein Design', 'settings.podcast': 'Podcast-Profil', 'settings.technical': 'Technische Daten', 'settings.storage': 'Speicher & Backup', 'settings.app': 'App-Einstellungen',
    'admin.title': 'Administration', 'admin.subtitle': 'Benutzerverwaltung, Rollen, Berechtigungen und Systemstatus', 'admin.users': 'Benutzer', 'admin.roles': 'Rollen', 'admin.modules': 'Module', 'admin.system': 'System', 'admin.database': 'Datenbank', 'admin.trash': 'Papierkorb', 'admin.language': 'Sprache', 'admin.logs': 'Logs',
  },
  en: {
    'language.german': 'German', 'language.english': 'English', 'language.switch': 'Switch language',
    'nav.dashboard': 'Dashboard', 'nav.approvals': 'Approvals', 'nav.episodes': 'Episodes', 'nav.episodesDashboard': 'Episode Dashboard',
    'nav.editorial': 'Editorial Hub', 'nav.calendar': 'Editorial Calendar', 'nav.chat': 'Team Chat', 'nav.media': 'Media Library',
    'nav.sponsoring': 'Sponsorship', 'nav.bookingCalendar': 'Booking Calendar', 'nav.sponsorReports': 'Sponsor Reports',
    'nav.seasons': 'Seasons', 'nav.archive': 'Archive', 'nav.analytics': 'Podigee Analytics', 'nav.statistics': 'Podcast Statistics',
    'nav.branding': 'Branding', 'nav.podcasts': 'Podcast Management', 'nav.administration': 'Administration', 'nav.tutorials': 'Tutorial Management',
    'nav.tutorialImport': 'Import Tutorials', 'nav.pdfLayouts': 'PDF Layouts', 'nav.settings': 'Settings',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit', 'common.language': 'Language',
    'settings.title': 'Settings', 'settings.profile': 'My Profile', 'settings.design': 'My Design', 'settings.podcast': 'Podcast Profile', 'settings.technical': 'Technical Data', 'settings.storage': 'Storage & Backup', 'settings.app': 'App Settings',
    'admin.title': 'Administration', 'admin.subtitle': 'User management, roles, permissions and system status', 'admin.users': 'Users', 'admin.roles': 'Roles', 'admin.modules': 'Modules', 'admin.system': 'System', 'admin.database': 'Database', 'admin.trash': 'Recycle Bin', 'admin.language': 'Language', 'admin.logs': 'Logs',
  },
} as const;

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: keyof typeof translations.de, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useApp();
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try { return localStorage.getItem('podcore-language') === 'en' ? 'en' : 'de'; }
    catch { return 'de'; }
  });
  const [languageTools, setLanguageTools] = useState<{ enabled: boolean; customWords: Record<AppLanguage, string[]> }>({ enabled: true, customWords: { de: [], en: [] } });

  useEffect(() => {
    if (user) setLanguageState(user.language === 'en' ? 'en' : 'de');
  }, [user?.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-language', language);
    localStorage.setItem('podcore-language', language);
  }, [language]);

  useEffect(() => {
    if (!user) return;
    adminApi.getLanguageTools()
      .then(data => setLanguageTools({ enabled: data?.enabled !== false, customWords: { de: data?.customWords?.de || [], en: data?.customWords?.en || [] } }))
      .catch(() => setLanguageTools({ enabled: true, customWords: { de: [], en: [] } }));
  }, [user?.id]);

  useEffect(() => {
    const applySpellcheck = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"], input[type="search"], input[type="email"]').forEach(field => {
        if (field.dataset.spellcheckOptout === 'true') return;
        field.spellcheck = true;
        field.lang = language;
      });
    };
    applySpellcheck();
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.matches('textarea, input[type="text"], input[type="search"], input[type="email"]')) applySpellcheck(node.parentNode || document);
          applySpellcheck(node);
        }
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    if (!languageTools.enabled || !user) return;
    const annotateCustomTerms = (event: FocusEvent) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || field.dataset.spellcheckOptout === 'true') return;
      const ownTerms = languageTools.customWords[language] || [];
      field.dataset.podcoreDictionaryTerms = ownTerms.join('|');
    };
    document.addEventListener('focusin', annotateCustomTerms, true);
    return () => document.removeEventListener('focusin', annotateCustomTerms, true);
  }, [language, languageTools, user?.id]);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    const normalized = next === 'en' ? 'en' : 'de';
    setLanguageState(normalized);
    if (!user) return;
    try {
      await authApi.updateProfile({ language: normalized });
      await refreshUser();
    } catch (error) {
      setLanguageState(user.language === 'en' ? 'en' : 'de');
      throw error;
    }
  }, [refreshUser, user]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key, fallback) => translations[language][key] || fallback || translations.de[key] || key,
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
