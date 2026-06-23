import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Mic2, LayoutDashboard, BookOpen, Library, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, Megaphone, BarChart3,
  Shield, Menu, X, Headphones, TrendingUp, Image, FileText, HelpCircle,
  Layers, Archive, BarChart2, Calendar, MessageSquare, Radio
} from 'lucide-react';
import { useApp, usePermissions, useBranding } from '../../contexts/AppContext';
import { api } from '../../lib/api';

// Injected at build time by vite.config.ts
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.6.0';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  exact?: boolean;
  dividerBefore?: boolean;
}

export default function Layout() {
  const { user, logout } = useApp();
  const { can } = usePermissions();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

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

  const navItems: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    { to: '/episodes', icon: <Mic2 size={18} />, label: 'Episoden', permission: 'canViewEpisodes' },
    { to: '/episodes-dashboard', icon: <Radio size={18} />, label: 'Episoden-Dashboard', permission: 'canViewEpisodes' },
    { to: '/editorial', icon: <BookOpen size={18} />, label: 'Redaktions-Hub', permission: 'canViewIdeas' },
    { to: '/calendar', icon: <Calendar size={18} />, label: 'Redaktionskalender', permission: 'canViewEditorialPlan' },
    { to: '/chat', icon: <MessageSquare size={18} />, label: 'Team-Chat' },
    { to: '/media', icon: <Library size={18} />, label: 'Media Library', permission: 'canViewMedia' },
    { to: '/sponsors', icon: <Megaphone size={18} />, label: 'Sponsoring', permission: 'canViewSponsors', dividerBefore: true },
    { to: '/sponsors/reports', icon: <BarChart3 size={18} />, label: 'Sponsor-Auswertungen', permission: 'canViewSponsorReports' },
    { to: '/seasons', icon: <Layers size={18} />, label: 'Staffeln', permission: 'canViewEpisodes' },
    { to: '/archive', icon: <Archive size={18} />, label: 'Archiv', permission: 'canViewEpisodes' },
    { to: '/analytics', icon: <TrendingUp size={18} />, label: 'Podigee Analytics', permission: 'canViewEpisodes', dividerBefore: true },
    { to: '/stats', icon: <BarChart2 size={18} />, label: 'Podcast-Statistiken', permission: 'canViewEpisodes' },
    { to: '/branding', icon: <Image size={18} />, label: 'Branding & Backup', permission: 'canManageSettings' },
    { to: '/admin', icon: <Shield size={18} />, label: 'Administration', permission: 'canManageUsers', dividerBefore: true },
    { to: '/settings', icon: <Settings size={18} />, label: 'Einstellungen', permission: 'canManageSettings' },
  ];

  const visibleItems = navItems.filter(item => !item.permission || can(item.permission));

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
    return (
      <div className="w-8 h-8 bg-accent-purple rounded-lg flex items-center justify-center flex-shrink-0">
        <Headphones size={16} className="text-white" />
      </div>
    );
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={`
      flex flex-col h-full bg-obsidian-800 border-r border-surface-border
      ${mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
    `}>
      {/* Logo / Branding */}
      <div className={`flex items-center gap-3 p-4 border-b border-surface-border ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <SidebarLogo mobile={mobile} />
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <h1 className="text-text-primary font-bold text-sm leading-tight truncate">
              {branding.podcastName || 'PodCore'}
            </h1>
            <p className="text-text-muted text-xs">v{APP_VERSION}</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <React.Fragment key={item.to}>
            {item.dividerBefore && !collapsed && (
              <div className="my-2 border-t border-surface-border/50" />
            )}
            {item.dividerBefore && collapsed && <div className="my-1" />}
            <NavLink
              to={item.to}
              end={item.exact}
              onClick={() => mobile && setMobileOpen(false)}
              className={({ isActive }) =>
                isActive
                  ? `nav-item-active ${collapsed && !mobile ? 'justify-center px-0' : ''}`
                  : `nav-item ${collapsed && !mobile ? 'justify-center px-0' : ''}`
              }
              title={collapsed && !mobile ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!collapsed || mobile) && <span className="text-sm">{item.label}</span>}
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      {/* User info */}
      <div className={`p-3 border-t border-surface-border ${collapsed && !mobile ? 'flex flex-col items-center gap-2' : ''}`}>
        {(!collapsed || mobile) ? (
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
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 text-text-muted hover:text-accent-red transition-colors text-sm w-full px-2 py-1.5 rounded-lg hover:bg-accent-red/10 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}
          title={collapsed && !mobile ? 'Abmelden' : undefined}
        >
          <LogOut size={16} />
          {(!collapsed || mobile) && <span>Abmelden</span>}
        </button>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-1 mt-1">
            <NavLink
              to="/wiki"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors flex-1 ${
                  isActive ? 'text-accent-purple' : 'text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <HelpCircle size={12} />
              <span>Wiki</span>
            </NavLink>
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
          <NavLink
            to="/wiki"
            className={({ isActive }) =>
              `flex items-center justify-center p-1 rounded transition-colors mt-1 ${
                isActive ? 'text-accent-purple' : 'text-text-muted hover:text-text-secondary'
              }`
            }
            title="Wiki"
          >
            <HelpCircle size={14} />
          </NavLink>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-obsidian-900">
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
    <div className="flex flex-1 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-obsidian-800 border-b border-surface-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-text-secondary hover:text-text-primary"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.podcastName}
                className="h-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-6 h-6 bg-accent-purple rounded flex items-center justify-center">
                <Headphones size={12} className="text-white" />
              </div>
            )}
            <span className="font-bold text-text-primary truncate max-w-[160px]">
              {branding.podcastName || 'PodCore'}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
    </div>
  );
}
