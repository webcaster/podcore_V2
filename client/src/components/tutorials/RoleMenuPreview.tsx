import React, { useState } from 'react';
import {
  LayoutDashboard, Mic2, Radio, BookOpen, Calendar, MessageSquare,
  Library, Megaphone, Layers, Archive, TrendingUp, BarChart2,
  Image, Shield, Info, FileText, Settings, CheckCircle, BarChart3,
  ChevronRight,
} from 'lucide-react';

// ─── Default permissions per role (mirrors server/database.ts) ───────────────

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    canViewEpisodes: true, canViewIdeas: true, canViewEditorialPlan: true,
    canViewMedia: true, canViewSponsors: true, canViewSponsorReports: true,
    canManageUsers: true, canManageSettings: true, canViewErrorLogs: true,
    canApproveEpisodes: true, canViewAdBookings: true,
    canViewSponsorContracts: true, canViewSponsorOffers: true,
    canViewTutorials: true, canManageTutorials: true,
  },
  redakteur: {
    canViewEpisodes: true, canViewIdeas: true, canViewEditorialPlan: true,
    canViewMedia: true, canViewSponsors: true, canViewSponsorReports: true,
    canManageUsers: false, canManageSettings: false,
    canApproveEpisodes: false, canRequestApproval: true,
    canViewAdBookings: true, canViewSponsorContracts: true, canViewSponsorOffers: true,
    canViewTutorials: true, canManageTutorials: false,
  },
  moderator: {
    canViewEpisodes: true, canViewIdeas: true, canViewEditorialPlan: true,
    canViewMedia: true, canViewSponsors: true, canViewSponsorReports: true,
    canManageUsers: false, canManageSettings: false,
    canApproveEpisodes: true, canRequestApproval: true,
    canViewAdBookings: true, canViewSponsorContracts: true, canViewSponsorOffers: true,
    canViewTutorials: true, canManageTutorials: false,
  },
  produktion: {
    canViewEpisodes: true, canViewIdeas: false, canViewEditorialPlan: false,
    canViewMedia: true, canViewSponsors: true, canViewSponsorReports: true,
    canManageUsers: false, canManageSettings: false,
    canApproveEpisodes: false, canRequestApproval: false,
    canViewAdBookings: true, canViewSponsorContracts: true, canViewSponsorOffers: false,
    canViewTutorials: true, canManageTutorials: false,
  },
};

// ─── Features (all enabled for preview) ─────────────────────────────────────

const ALL_FEATURES = {
  editorial: true, approvals: true, sponsoring: true,
  mediaLibrary: true, chat: true, statistics: true,
  seasons: true, branding: true,
};

// ─── Nav items (mirrors Layout.tsx) ─────────────────────────────────────────

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  feature?: string;
  dividerBefore?: boolean;
  group?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'nav-approvals', label: 'Freigabe-Center', icon: <CheckCircle size={16} />, permission: 'canApproveEpisodes', feature: 'approvals' },
  { id: 'nav-episodes', label: 'Episoden', icon: <Mic2 size={16} />, permission: 'canViewEpisodes' },
  { id: 'nav-episodes-dashboard', label: 'Episoden-Dashboard', icon: <Radio size={16} />, permission: 'canViewEpisodes' },
  { id: 'nav-editorial', label: 'Redaktions-Hub', icon: <BookOpen size={16} />, permission: 'canViewIdeas', feature: 'editorial' },
  { id: 'nav-calendar', label: 'Redaktionskalender', icon: <Calendar size={16} />, permission: 'canViewEditorialPlan', feature: 'editorial' },
  { id: 'nav-chat', label: 'Team-Chat', icon: <MessageSquare size={16} />, feature: 'chat' },
  { id: 'nav-media', label: 'Media Library', icon: <Library size={16} />, permission: 'canViewMedia', feature: 'mediaLibrary' },
  { id: 'nav-sponsors', label: 'Sponsoring', icon: <Megaphone size={16} />, permission: 'canViewSponsors', feature: 'sponsoring', dividerBefore: true },
  { id: 'nav-sponsors-calendar', label: 'Buchungskalender', icon: <Calendar size={16} />, permission: 'canViewSponsors', feature: 'sponsoring' },
  { id: 'nav-sponsors-reports', label: 'Sponsor-Auswertungen', icon: <BarChart3 size={16} />, permission: 'canViewSponsorReports', feature: 'sponsoring' },
  { id: 'nav-seasons', label: 'Staffeln', icon: <Layers size={16} />, permission: 'canViewEpisodes', feature: 'seasons' },
  { id: 'nav-archive', label: 'Archiv', icon: <Archive size={16} />, permission: 'canViewEpisodes' },
  { id: 'nav-analytics', label: 'Podigee Analytics', icon: <TrendingUp size={16} />, permission: 'canViewEpisodes', feature: 'statistics', dividerBefore: true },
  { id: 'nav-stats', label: 'Podcast-Statistiken', icon: <BarChart2 size={16} />, permission: 'canViewEpisodes', feature: 'statistics' },
  { id: 'nav-branding', label: 'Branding & Backup', icon: <Image size={16} />, permission: 'canManageSettings', feature: 'branding' },
  { id: 'nav-admin', label: 'Administration', icon: <Shield size={16} />, permission: 'canManageUsers', dividerBefore: true },
  { id: 'nav-tutorials', label: 'Tutorial-Verwaltung', icon: <Info size={16} />, permission: 'canManageSettings' },
  { id: 'nav-pdf-layouts', label: 'PDF-Layouts', icon: <FileText size={16} />, permission: 'canManageSettings' },
  { id: 'nav-settings', label: 'Einstellungen', icon: <Settings size={16} />, permission: 'canManageSettings' },
];

// ─── Role labels ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  redakteur: 'Redakteur',
  moderator: 'Moderator',
  produktion: 'Produktion',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626',
  redakteur: '#7c3aed',
  moderator: '#059669',
  produktion: '#d97706',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  role: string;
  /** Optional: highlight a specific nav item by its tutorial-id */
  highlightId?: string;
  onSelectItem?: (id: string) => void;
}

export default function RoleMenuPreview({ role, highlightId, onSelectItem }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['redakteur'];
  const roleColor = ROLE_COLORS[role] || '#7c3aed';
  const roleLabel = ROLE_LABELS[role] || role;

  const isVisible = (item: NavItemDef): boolean => {
    if (item.permission && !perms[item.permission]) return false;
    if (item.feature && !ALL_FEATURES[item.feature as keyof typeof ALL_FEATURES]) return false;
    return true;
  };

  const visibleItems = NAV_ITEMS.filter(isVisible);
  const hiddenItems = NAV_ITEMS.filter(i => !isVisible(i));

  return (
    <div className="rounded-xl overflow-hidden border border-surface-border bg-obsidian-900 select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: roleColor }}
          />
          <span className="text-sm font-semibold text-text-primary">
            Menü-Ansicht: {roleLabel}
          </span>
        </div>
        <span className="text-xs text-text-muted">
          {visibleItems.length} von {NAV_ITEMS.length} Einträgen sichtbar
        </span>
      </div>

      <div className="flex gap-0">
        {/* Simulated Sidebar */}
        <div className="w-56 border-r border-surface-border bg-obsidian-950 flex flex-col">
          {/* Logo area */}
          <div className="p-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: roleColor }}
              >
                P
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary leading-tight">PodCore</p>
                <p className="text-[10px] text-text-muted leading-tight">Podcast Manager</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto max-h-72">
            {visibleItems.map((item, idx) => {
              const isHighlighted = item.id === highlightId;
              const isHovered = item.id === hoveredId;
              const showDivider = item.dividerBefore && idx > 0;

              return (
                <React.Fragment key={item.id}>
                  {showDivider && (
                    <div className="my-1 border-t border-surface-border opacity-50" />
                  )}
                  <button
                    onClick={() => onSelectItem?.(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs ${
                      isHighlighted
                        ? 'text-white shadow-sm'
                        : isHovered
                        ? 'bg-surface-raised text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    style={isHighlighted ? { backgroundColor: roleColor } : undefined}
                    title={`Selektor: [data-tutorial-id="${item.id}"]`}
                  >
                    <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {isHighlighted && (
                      <ChevronRight size={10} className="ml-auto flex-shrink-0" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-2 border-t border-surface-border">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: roleColor }}
              >
                {roleLabel[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-text-primary truncate">Beispiel-Nutzer</p>
                <p className="text-[9px] text-text-muted capitalize">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 p-3 space-y-3">
          {/* Visible items summary */}
          <div>
            <p className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Sichtbare Menüpunkte ({visibleItems.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem?.(item.id)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                    item.id === highlightId
                      ? 'border-accent-purple bg-accent-purple/20 text-accent-purple'
                      : 'border-surface-border text-text-muted hover:border-accent-purple/50 hover:text-text-primary'
                  }`}
                  title={`Klicken um Selektor zu übernehmen: [data-tutorial-id="${item.id}"]`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hidden items */}
          {hiddenItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-surface-border inline-block" />
                Nicht sichtbar ({hiddenItems.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {hiddenItems.map(item => (
                  <span
                    key={item.id}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-surface-border text-text-muted opacity-50 line-through"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Selected item info */}
          {highlightId && (
            <div className="bg-accent-purple/10 border border-accent-purple/20 rounded-lg p-2">
              <p className="text-[10px] text-accent-purple font-semibold mb-0.5">Ausgewählter Selektor</p>
              <p className="text-[10px] font-mono text-text-primary break-all">
                [data-tutorial-id="{highlightId}"]
              </p>
            </div>
          )}

          <p className="text-[10px] text-text-muted">
            Klicke auf einen Menüpunkt, um dessen Selektor direkt in das Ziel-Element-Feld zu übernehmen.
          </p>
        </div>
      </div>
    </div>
  );
}
