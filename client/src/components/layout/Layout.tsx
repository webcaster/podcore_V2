import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useRef } from 'react';
import {
  Mic2, LayoutDashboard, BookOpen, Library, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, Megaphone, BarChart3,
  Shield, Menu, X, TrendingUp, Image, FileText, HelpCircle, Info, Download, Globe2,
  Layers, Archive, BarChart2, Calendar, MessageSquare, Radio, CheckCircle, Podcast, Search, ChevronDown
} from 'lucide-react';
import { useApp, usePermissions, useBranding, useFeatures, useOnlineUsers } from '../../contexts/AppContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { useScreenshotMode } from '../../contexts/ScreenshotModeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../lib/api';
import NotificationCenter from './NotificationCenter';

// Injected at build time by vite.config.ts
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.16.0';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  exact?: boolean;
  dividerBefore?: boolean;
  tutorialId?: string;
}

const NAV_GROUPS = [
  { id: 'work', de: 'Arbeitsplatz', en: 'Workspace', paths: ['/', '/episodes', '/editorial', '/calendar', '/media', '/chat', '/approvals'] },
  { id: 'planning', de: 'Planung & Archiv', en: 'Planning & archive', paths: ['/episodes-dashboard', '/seasons', '/archive'] },
  { id: 'partners', de: 'Sponsoring', en: 'Sponsorship', paths: ['/sponsors', '/sponsors/calendar', '/sponsors/reports'] },
  { id: 'insights', de: 'Auswertungen', en: 'Reports', paths: ['/analytics', '/stats'] },
  { id: 'system', de: 'Einrichtung & Hilfe', en: 'Setup & help', paths: ['/branding', '/podcasts', '/admin', '/admin/tutorials', '/tutorials/import', '/pdf-layouts', '/settings'] },
];

export default function Layout() {
  const { user, logout } = useApp();
  const { can } = usePermissions();
  const { branding } = useBranding();
  const { features } = useFeatures();
  const { onlineUsers } = useOnlineUsers();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ work: true });
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLElement | null>(null);
  const navScrollTopRef = useRef(0);
  const menuSearchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const contentPositions = useRef(new Map<string, number>());
  const developerUnlockRef = useRef({ count: 0, startedAt: 0 });

  useLayoutEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    node.scrollTop = navigationType === 'POP' ? contentPositions.current.get(location.key) || 0 : 0;
    return () => { contentPositions.current.set(location.key, node.scrollTop); };
  }, [location.key, navigationType]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setCollapsed(false);
      if (isMobileViewport) setMobileOpen(true);
      window.setTimeout(() => menuSearchRef.current?.focus(), 60);
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [isMobileViewport]);

  useEffect(() => {
    if (!mobileOpen) return;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => mobileDrawerRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !mobileDrawerRef.current) return;
      const focusable = Array.from(mobileDrawerRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(focusFirst);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      mobileMenuTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  // Die Sidebar ist ein eigener Scrollcontainer. Beim Routing darf nur der
  // Inhaltsbereich wechseln; die zuletzt gewählte Menüposition bleibt stabil.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (navScrollRef.current) navScrollRef.current.scrollTop = navScrollTopRef.current;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search]);

  // Nur die sichtbare Desktop- oder Mobilansicht darf das Benachrichtigungs-
  // Center einhängen. Tailwind blendet Varianten nur per CSS aus; ohne diese
  // Abfrage würden beide Instanzen ihre Daten gleichzeitig laden.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(query.matches);
    updateViewport();
    query.addEventListener('change', updateViewport);
    return () => query.removeEventListener('change', updateViewport);
  }, []);

  // Check server version periodically
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const data = await api.get<{ version: string }>('/health');
        setServerVersion(data.version || null);
      } catch {
        // ignore
      }
    };
    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  const hasUpdate = serverVersion && serverVersion !== APP_VERSION;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Exklusiver Entwickler-Handshake: sieben Klicks auf die Versionsanzeige
  // innerhalb von drei Sekunden öffnen ausschließlich die Profil-Freischaltung.
  const handleVersionClick = () => {
    const now = Date.now();
    const unlock = developerUnlockRef.current;
    if (!unlock.startedAt || now - unlock.startedAt > 3000) {
      unlock.count = 0;
      unlock.startedAt = now;
    }
    unlock.count += 1;
    if (unlock.count >= 7) {
      unlock.count = 0;
      unlock.startedAt = 0;
      sessionStorage.setItem('podcore_developer_unlock', '1');
      navigate('/settings?tab=profile&developer_unlock=1');
    }
  };

  const navItems: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: t('nav.dashboard'), exact: true, tutorialId: 'nav-dashboard' },
    { to: '/approvals', icon: <CheckCircle size={18} />, label: t('nav.approvals'), permission: 'canApproveEpisodes', tutorialId: 'nav-approvals' },
    { to: '/episodes', icon: <Mic2 size={18} />, label: t('nav.episodes'), permission: 'canViewEpisodes', tutorialId: 'nav-episodes' },
    { to: '/episodes-dashboard', icon: <Radio size={18} />, label: t('nav.episodesDashboard'), permission: 'canViewEpisodes', tutorialId: 'nav-episodes-dashboard' },
    { to: '/editorial', icon: <BookOpen size={18} />, label: t('nav.editorial'), permission: 'canViewIdeas', tutorialId: 'nav-editorial' },
    { to: '/calendar', icon: <Calendar size={18} />, label: t('nav.calendar'), permission: 'canViewEditorialPlan', tutorialId: 'nav-calendar' },
    { to: '/chat', icon: <MessageSquare size={18} />, label: t('nav.chat'), tutorialId: 'nav-chat' },
    { to: '/media', icon: <Library size={18} />, label: t('nav.media'), permission: 'canViewMedia', tutorialId: 'nav-media' },
    { to: '/sponsors', icon: <Megaphone size={18} />, label: t('nav.sponsoring'), permission: 'canViewSponsors', dividerBefore: true, tutorialId: 'nav-sponsors' },
    { to: '/sponsors/calendar', icon: <Calendar size={18} />, label: t('nav.bookingCalendar'), permission: 'canViewSponsors', tutorialId: 'nav-sponsors-calendar' },
    { to: '/sponsors/reports', icon: <BarChart3 size={18} />, label: t('nav.sponsorReports'), permission: 'canViewSponsorReports', tutorialId: 'nav-sponsors-reports' },
    { to: '/seasons', icon: <Layers size={18} />, label: t('nav.seasons'), permission: 'canViewEpisodes', tutorialId: 'nav-seasons' },
    { to: '/archive', icon: <Archive size={18} />, label: t('nav.archive'), permission: 'canViewEpisodes', tutorialId: 'nav-archive' },
    { to: '/analytics', icon: <TrendingUp size={18} />, label: t('nav.analytics'), permission: 'canViewEpisodes', dividerBefore: true, tutorialId: 'nav-analytics' },
    { to: '/stats', icon: <BarChart2 size={18} />, label: t('nav.statistics'), permission: 'canViewEpisodes', tutorialId: 'nav-stats' },
    { to: '/branding', icon: <Image size={18} />, label: t('nav.branding'), permission: 'canManageSettings', tutorialId: 'nav-branding' },
    { to: '/podcasts', icon: <Podcast size={18} />, label: t('nav.podcasts'), permission: 'canManageSettings', tutorialId: 'nav-podcasts' },
    { to: '/admin', icon: <Shield size={18} />, label: t('nav.administration'), permission: 'canManageUsers', dividerBefore: true, tutorialId: 'nav-admin' },
    { to: '/admin/tutorials', icon: <Info size={18} />, label: t('nav.tutorials'), permission: 'canManageSettings', tutorialId: 'nav-tutorials' },
    { to: '/tutorials/import', icon: <Download size={18} />, label: t('nav.tutorialImport'), permission: 'canImportTutorials', tutorialId: 'nav-tutorial-import' },
    { to: '/pdf-layouts', icon: <FileText size={18} />, label: t('nav.pdfLayouts'), permission: 'canManageSettings', tutorialId: 'nav-pdf-layouts' },
    // Profil und persönliches Design gehören jedem Nutzer. Die Settings-Seite
    // blendet administrative Tabs weiterhin über canManageSettings aus.
    { to: '/settings', icon: <Settings size={18} />, label: t('nav.settings'), tutorialId: 'nav-settings' },
  ];

  // Feature-Flag-basierte Filterung der Navigation
  const featureFilteredItems = navItems.filter(item => {
    // Zuerst Berechtigungen prüfen
    if (item.permission && !can(item.permission)) return false;
    // Nur die Tutorial-Erstellung bleibt im exklusiven Entwickler-Modus verborgen.
    // Der getrennte Import-Eintrag ist für die dafür berechtigten Endnutzer sichtbar.
    if (item.to === '/admin/tutorials' && !user?.developerMode) return false;
    // Dann Feature-Flags prüfen
    const path = item.to;
    if ((path === '/editorial' || path === '/calendar') && !features.editorial) return false;
    if (path === '/approvals' && !features.approvals) return false;
    if ((path === '/sponsors' || path === '/sponsors/calendar' || path === '/sponsors/reports') && !features.sponsoring) return false;
    if (path === '/media' && !features.mediaLibrary) return false;
    if (path === '/chat' && !features.chat) return false;
    if ((path === '/analytics' || path === '/stats') && !features.statistics) return false;
    if (path === '/seasons' && !features.seasons) return false;
    if (path === '/branding' && !features.branding) return false;
    return true;
  });
  const visibleItems = featureFilteredItems;

  const avatarInitials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  // Sidebar logo area: show uploaded logo if available, else default icon
  const SidebarLogo = ({ mobile = false }: { mobile?: boolean }) => {
    // Prefer podcast cover, fallback to logo, then default icon
    const imageUrl = branding.coverUrl || branding.logoUrl;
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={branding.podcastName}
          className={`object-cover rounded-lg flex-shrink-0 ${collapsed && !mobile ? 'w-8 h-8' : 'w-8 h-8'}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }
    return <img src="/podcore-logo.svg" alt="PodCore" className="w-8 h-8 flex-shrink-0" />;
  };

  const { openWiki, tutorials, activeTutorial, currentStep } = useTutorial();
  const hasTutorials = tutorials.length > 0;
  const { active: screenshotActive, simulatedRole, simulatedPermissions } = useScreenshotMode();

  // Im Screenshot-Modus: Menü auf die Berechtigungen der simulierten Rolle filtern
  const screenshotFilteredItems = screenshotActive
    ? navItems.filter(item => {
        // Admin-only items ausblenden
        if (item.permission === 'canManageUsers' || item.permission === 'canManageSettings') return false;
        // Berechtigungen der simulierten Rolle prüfen
        if (item.permission && !simulatedPermissions[item.permission]) return false;
        // Feature-Flags prüfen
        const path = item.to;
        if ((path === '/editorial' || path === '/calendar') && !features.editorial) return false;
        if (path === '/approvals' && !features.approvals) return false;
        if ((path === '/sponsors' || path === '/sponsors/calendar' || path === '/sponsors/reports') && !features.sponsoring) return false;
        if (path === '/media' && !features.mediaLibrary) return false;
        if (path === '/chat' && !features.chat) return false;
        if ((path === '/analytics' || path === '/stats') && !features.statistics) return false;
        if (path === '/seasons' && !features.seasons) return false;
        if (path === '/branding' && !features.branding) return false;
        return true;
      })
    : visibleItems;

  const navigationItems = screenshotActive ? screenshotFilteredItems : visibleItems;
  const activeItem = [...navigationItems].sort((a, b) => b.to.length - a.to.length).find(item =>
    item.to === '/' ? location.pathname === '/' : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );
  const activeGroup = NAV_GROUPS.find(group => group.paths.includes(activeItem?.to || ''));
  const tutorialTarget = activeTutorial?.steps[currentStep]?.target;
  useEffect(() => {
    const currentGroup = NAV_GROUPS.find(group => group.paths.includes(activeItem?.to || ''));
    const tutorialItem = navigationItems.find(item => item.tutorialId === tutorialTarget);
    const tutorialGroup = NAV_GROUPS.find(group => group.paths.includes(tutorialItem?.to || ''));
    setOpenGroups(previous => ({ ...previous, ...(currentGroup ? { [currentGroup.id]: true } : {}), ...(tutorialGroup ? { [tutorialGroup.id]: true } : {}) }));
    if (tutorialTarget) setMenuQuery('');
  }, [activeItem?.to, tutorialTarget]);
  const normalizedQuery = menuQuery.trim().toLocaleLowerCase(language);
  const filteredMenuItems = navigationItems.filter(item => !normalizedQuery || item.label.toLocaleLowerCase(language).includes(normalizedQuery));

  // Renderfunktion statt verschachteltem React-Komponententyp: Ein Layout-
  // Update darf die Sidebar (Fokus, Scrollcontainer, Suche) nicht neu einhängen.
  const renderSidebar = ({ mobile = false, showNotifications = true }: { mobile?: boolean; showNotifications?: boolean }) => (
    <aside
      data-tutorial-id={mobile ? 'sidebar-mobile' : 'sidebar'}
      className={`
      flex flex-col h-full min-h-0 bg-sidebar-bg border-r border-sidebar-border shadow-[10px_0_30px_rgba(4,2,10,0.18)]
      ${mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
    `}>
      {/* Logo / Branding */}
      <div className={`flex items-center gap-3 p-4 border-b border-sidebar-border ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <SidebarLogo mobile={mobile} />
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <h1 className="text-text-primary font-bold text-sm leading-tight truncate">
              {branding.podcastName || 'PodCore'}
            </h1>
            <p className="text-[10px] leading-tight text-accent-purple/90 truncate">Dein Podcast. Dein Workflow.</p>
            <button
              type="button"
              onClick={handleVersionClick}
              className="block text-left text-text-muted text-xs transition-colors hover:text-text-secondary"
              aria-label="PodCore-Version"
            >
              v{APP_VERSION}
            </button>
          </div>
        )}
        {!mobile && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Navigation ausklappen' : 'Navigation einklappen'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {mobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="Menü schließen"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      {/* Screenshot-Modus: Rollen-Badge in der Sidebar */}
      {screenshotActive && (
        <div className="mx-3 mb-2 px-3 py-2 bg-accent-purple/20 border border-accent-purple/40 rounded-xl">
          <p className="text-xs text-accent-purple font-semibold text-center">
            Ansicht: {simulatedRole}
          </p>
        </div>
      )}
      {(!collapsed || mobile) && !screenshotActive && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-text-muted" />
            <input ref={menuSearchRef} type="search" value={menuQuery} onChange={event => setMenuQuery(event.target.value)}
              aria-label={language === 'de' ? 'Menü durchsuchen' : 'Search navigation'}
              placeholder={language === 'de' ? 'Menü finden …' : 'Find a page …'}
              className="input input-compact menu-search" />
          </div>
          <span className="mt-1 block px-1 text-[10px] text-text-muted">{language === 'de' ? 'Direkt suchen: Strg / ⌘ + K' : 'Quick search: Ctrl / ⌘ + K'}</span>
        </div>
      )}
      <nav 
        data-tutorial-id="sidebar-nav" 
        aria-label={language === 'de' ? 'Hauptnavigation' : 'Main navigation'}
        ref={node => { navScrollRef.current = node; }}
        onScroll={event => { navScrollTopRef.current = event.currentTarget.scrollTop; }}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-gutter-stable"
        style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-3 py-2 space-y-0.5">
          {NAV_GROUPS.map(group => {
            const items = filteredMenuItems.filter(item => group.paths.includes(item.to));
            if (!items.length) return null;
            const expanded = Boolean(openGroups[group.id] || normalizedQuery || screenshotActive || (collapsed && !mobile));
            return <section key={group.id} className="pb-1">
              {(!collapsed || mobile) && (
                <button type="button" className="nav-group-heading" aria-expanded={expanded} aria-controls={`nav-group-${group.id}-${mobile ? 'mobile' : 'desktop'}`}
                  onClick={() => setOpenGroups(previous => ({ ...previous, [group.id]: !expanded }))}>
                  <span>{language === 'de' ? group.de : group.en}</span>
                  <ChevronDown size={13} className={expanded ? '' : '-rotate-90'} />
                </button>
              )}
              {expanded && <div id={`nav-group-${group.id}-${mobile ? 'mobile' : 'desktop'}`} className="space-y-0.5">
              {items.map(item => <Link key={item.to}
                to={item.to}
                onClick={() => {
                  navScrollTopRef.current = navScrollRef.current?.scrollTop || 0;
                  setMenuQuery('');
                  if (mobile) setMobileOpen(false);
                }}
                className={
                  activeItem?.to === item.to
                    ? `nav-item-active ${collapsed && !mobile ? 'justify-center px-0' : ''}`
                    : `nav-item ${collapsed && !mobile ? 'justify-center px-0' : ''}`
                }
                aria-current={activeItem?.to === item.to ? 'page' : undefined}
                aria-label={collapsed && !mobile ? item.label : undefined}
                title={collapsed && !mobile ? item.label : undefined}
                data-tutorial-id={item.tutorialId}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {(!collapsed || mobile) && <span className="text-sm">{item.label}</span>}
              </Link>)}
              </div>}
            </section>;
          })}
          {filteredMenuItems.length === 0 && <p className="px-2 py-4 text-sm text-text-muted" role="status">{language === 'de' ? 'Kein zugänglicher Menüpunkt gefunden.' : 'No accessible page found.'}</p>}
        </div>
      </nav>

      {/* User info */}
      <div data-tutorial-id="sidebar-user-info" className={`p-3 border-t border-sidebar-border ${collapsed && !mobile ? 'flex flex-col items-center gap-2' : ''}`}>
        {/* Im Screenshot-Modus: simulierte Rolle anzeigen, nicht den echten Admin */}
        {screenshotActive ? (
          (!collapsed || mobile) ? (
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-accent-purple">
                {(simulatedRole || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-medium truncate capitalize">{simulatedRole}</p>
                <p className="text-accent-purple text-xs">Vorschau-Modus</p>
              </div>
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-accent-purple"
              title={`Vorschau: ${simulatedRole}`}
            >
              {(simulatedRole || '?')[0].toUpperCase()}
            </div>
          )
        ) : (
          (!collapsed || mobile) ? (
            <div className="flex items-center gap-3 mb-2 px-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: user?.avatarColor || '#7c3aed' }}
              >
                {avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-medium truncate">{user?.displayName}</p>
                <p className="text-text-muted text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: user?.avatarColor || '#7c3aed' }}
              title={user?.displayName}
            >
              {avatarInitials}
            </div>
          )
        )}
        {showNotifications && (
          <div className={`mb-1 ${collapsed && !mobile ? '' : 'px-0'}`}>
            <NotificationCenter compact={collapsed && !mobile} />
          </div>
        )}
        <button
          onClick={async () => { try { await setLanguage(language === 'de' ? 'en' : 'de'); } catch { /* Einstellung bleibt unverändert */ } }}
          className={`flex items-center gap-2 text-text-muted hover:text-accent-purple transition-colors text-sm w-full px-2 py-1.5 rounded-lg hover:bg-accent-purple/10 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}
          title={collapsed && !mobile ? t('language.switch') : undefined}
          aria-label={t('language.switch')}
        >
          <Globe2 size={16} />
          {(!collapsed || mobile) && <span>{language === 'de' ? 'DE · EN' : 'EN · DE'}</span>}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center gap-2 text-text-muted hover:text-accent-red transition-colors text-sm w-full px-2 py-1.5 rounded-lg hover:bg-accent-red/10 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}
          title={collapsed && !mobile ? 'Abmelden' : undefined}
          aria-label="Abmelden"
        >
          <LogOut size={16} />
          {(!collapsed || mobile) && <span>Abmelden</span>}
        </button>

        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={openWiki}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors flex-1 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10"
              title="Hilfe & Tutorial"
            >
              <HelpCircle size={12} />
              <span>Hilfe / Wiki</span>
              {hasTutorials && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-purple" />
              )}
            </button>
            <NavLink
              to="/impressum"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                  isActive ? 'text-accent-purple' : 'text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <FileText size={12} />
              <span>Impressum</span>
            </NavLink>
          </div>
        ) : (
          <button
            onClick={openWiki}
            className="flex items-center justify-center p-1 rounded transition-colors mt-1 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 relative"
            title="Hilfe / Wiki"
          >
            <HelpCircle size={14} />
            {hasTutorials && (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-accent-purple" />
            )}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-obsidian-900 scrollbar-gutter-stable">
      {/* Update available banner */}
      {hasUpdate && !updateDismissed && (
        <div className="bg-accent-purple/20 border-b border-accent-purple/30 px-4 py-2 flex items-center justify-between text-sm z-50">
          <span className="text-accent-purple font-medium">
            🔄 Neue Version verfügbar: v{serverVersion} — Bitte Seite neu laden (Strg+F5 / Cmd+Shift+R)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-accent-purple text-white px-3 py-1 rounded text-xs hover:bg-accent-purple/80 transition-colors"
            >
              Jetzt neu laden
            </button>
            <button
              onClick={() => setUpdateDismissed(true)}
              className="text-text-muted hover:text-text-primary transition-colors text-xs"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobileViewport && <div className="hidden md:flex flex-shrink-0">
        {renderSidebar({ showNotifications: true })}
      </div>}

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Hauptnavigation">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div id="podcore-mobile-navigation" ref={mobileDrawerRef} className="relative z-10 flex">
            {renderSidebar({ mobile: true, showNotifications: false })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-obsidian-800 border-b border-surface-border">
          <button
            ref={mobileMenuTriggerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Menü öffnen"
            aria-expanded={mobileOpen}
            aria-controls="podcore-mobile-navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.podcastName}
                className="h-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <img src="/podcore-logo.svg" alt="PodCore" className="w-6 h-6 flex-shrink-0" />
            )}
            <div className="min-w-0 leading-tight">
              <span className="block font-bold text-text-primary truncate max-w-[160px]">{branding.podcastName || 'PodCore'}</span>
              <span className="block text-[9px] text-accent-purple truncate max-w-[160px]">Dein Podcast. Dein Workflow.</span>
            </div>
          </div>
          {isMobileViewport && <NotificationCenter compact />}
        </div>

        {/* Page Content */}
        <main ref={mainRef} data-tutorial-id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-gutter-stable">
          {activeItem && activeItem.to !== '/' && (
            <div className="context-bar" aria-label="Aktueller Bereich">
              <div className="min-w-0 flex items-center gap-2">
                <span className="context-bar-group">{language === 'de' ? activeGroup?.de : activeGroup?.en}</span>
                <ChevronRight size={13} aria-hidden="true" />
                <span className="context-bar-current truncate">{activeItem.label}</span>
              </div>
              <span className="context-bar-hint hidden sm:inline">Strg/⌘ + K für Navigation</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
    </div>
  );
}
