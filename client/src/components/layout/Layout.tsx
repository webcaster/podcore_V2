import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Mic2, LayoutDashboard, BookOpen, Library, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, Megaphone, BarChart3,
  Shield, Menu, X, Headphones, TrendingUp, Image, FileText, HelpCircle
} from 'lucide-react';
import { useApp, usePermissions } from '../../contexts/AppContext';

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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    { to: '/episodes', icon: <Mic2 size={18} />, label: 'Episoden', permission: 'canViewEpisodes' },
    { to: '/editorial', icon: <BookOpen size={18} />, label: 'Redaktions-Hub', permission: 'canViewIdeas' },
    { to: '/media', icon: <Library size={18} />, label: 'Media Library', permission: 'canViewMedia' },
    { to: '/sponsors', icon: <Megaphone size={18} />, label: 'Sponsoring', permission: 'canViewSponsors', dividerBefore: true },
    { to: '/sponsors/reports', icon: <BarChart3 size={18} />, label: 'Sponsor-Auswertungen', permission: 'canViewSponsorReports' },
    { to: '/analytics', icon: <TrendingUp size={18} />, label: 'Podcast-Statistiken', permission: 'canViewEpisodes', dividerBefore: true },
    { to: '/branding', icon: <Image size={18} />, label: 'Branding & Backup', permission: 'canManageSettings' },
    { to: '/admin', icon: <Shield size={18} />, label: 'Administration', permission: 'canManageUsers', dividerBefore: true },
    { to: '/settings', icon: <Settings size={18} />, label: 'Einstellungen', permission: 'canManageSettings' },
  ];

  const visibleItems = navItems.filter(item => !item.permission || can(item.permission));

  const avatarInitials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  const Sidebar = ({ mobile = false }) => (
    <aside className={`
      flex flex-col h-full bg-obsidian-800 border-r border-surface-border
      ${mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
    `}>
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-surface-border ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-accent-purple rounded-lg flex items-center justify-center flex-shrink-0">
          <Headphones size={16} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <h1 className="text-text-primary font-bold text-sm leading-tight">PodCore</h1>
            <p className="text-text-muted text-xs">v2.0.0</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item, idx) => (
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
    <div className="flex h-screen overflow-hidden bg-obsidian-900">
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
            <div className="w-6 h-6 bg-accent-purple rounded flex items-center justify-center">
              <Headphones size={12} className="text-white" />
            </div>
            <span className="font-bold text-text-primary">PodCore</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
