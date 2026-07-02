import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic2, Lightbulb, Library, Megaphone, TrendingUp, Clock,
  BarChart2, Radio, Save, X, RefreshCw,
  Download, Eye, Headphones, MapPin, Smartphone, ChevronLeft, ChevronRight,
  BookOpen, Settings2, GripVertical, EyeOff, Edit2, Users,
  CheckCircle, XCircle, AlertTriangle, Globe, Info, ShieldCheck,
} from 'lucide-react';
import { episodesApi, editorialApi, adminApi, podigeeApi, authApi } from '../lib/api';
import { useApp, useOnlineUsers } from '../contexts/AppContext';

interface Stats {
  episodes: { total: number; byStatus: Record<string, number> };
  ideas: { total: number; new: number };
  assets: { total: number };
  sponsors: { total: number; active: number };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, can, branding, podcastProfile, refreshPodcastProfile, showSuccess, showError, refreshUser } = useApp();
  const { onlineUsers } = useOnlineUsers();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [podigeeStats, setPodigeeStats] = useState<any>(null);
  const [podigeeLoading, setPodigeeLoading] = useState(false);
  const [editorialPlan, setEditorialPlan] = useState<any[]>([]);
  const [planMonth, setPlanMonth] = useState(new Date().getMonth() + 1);
  const [planYear, setPlanYear] = useState(new Date().getFullYear());

  // Podcast-Profil bearbeiten (nur Admin/canManageSettings)
  const [editingPodcast, setEditingPodcast] = useState(false);
  const [podcastForm, setPodcastForm] = useState<any>({});
  const [savingPodcast, setSavingPodcast] = useState(false);

  // Freigabe-Anfragen
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Dashboard-Anpassung
  const DEFAULT_WIDGETS = ['stats', 'approvals', 'online_users', 'podcast_episodes', 'podigee', 'editorial', 'quickactions'];
  const WIDGET_LABELS: Record<string, string> = {
    stats: 'Statistik-Kacheln',
    approvals: 'Freigabe-Anfragen',
    online_users: 'Online-Nutzer',
    podcast_episodes: 'Podcast-Profil & Aktuelle Episoden',
    podigee: 'Podcast-Statistiken (Podigee)',
    editorial: 'Redaktionsplan',
    quickactions: 'Schnellzugriff',
  };
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Layout aus Benutzerprofil laden
  useEffect(() => {
    if (user?.dashboardLayout && Array.isArray(user.dashboardLayout) && user.dashboardLayout.length > 0) {
      // Sicherstellen dass 'approvals' im Layout vorhanden ist (Migration)
      const layout = user.dashboardLayout;
      if (!layout.includes('approvals')) {
        setWidgetOrder(['approvals', ...layout]);
      } else {
        setWidgetOrder(layout);
      }
    }
  }, [user?.dashboardLayout]);

  const saveDashboardLayout = async (layout: string[]) => {
    setIsSavingLayout(true);
    try {
      await authApi.updateProfile({ dashboardLayout: layout });
      await refreshUser();
      showSuccess('Dashboard-Layout gespeichert');
      setIsCustomizing(false);
    } catch (err: any) {
      showError('Fehler beim Speichern des Layouts');
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleDragStart = (widget: string) => setDraggedWidget(widget);
  const handleDragOver = (e: React.DragEvent, targetWidget: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidget) return;
    const newOrder = [...widgetOrder];
    const fromIdx = newOrder.indexOf(draggedWidget);
    const toIdx = newOrder.indexOf(targetWidget);
    if (fromIdx === -1 || toIdx === -1) return;
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedWidget);
    setWidgetOrder(newOrder);
  };
  const handleDragEnd = () => setDraggedWidget(null);

  const toggleWidget = (widget: string) => {
    setWidgetOrder(prev =>
      prev.includes(widget) ? prev.filter(w => w !== widget) : [...prev, widget]
    );
  };

  // Freigabe-Anfragen laden
  const loadPendingApprovals = useCallback(async () => {
    if (!can('canApproveEpisodes')) return;
    setApprovalsLoading(true);
    try {
      const data = await episodesApi.getPendingApprovals();
      setPendingApprovals(Array.isArray(data) ? data : []);
    } catch {
      setPendingApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, [can]);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  // Episode freigeben
  const handleApprove = async (episodeId: string) => {
    setApprovingId(episodeId);
    try {
      await episodesApi.approve(episodeId, '');
      showSuccess('Episode freigegeben');
      setPendingApprovals(prev => prev.filter(e => e.id !== episodeId));
    } catch {
      showError('Freigabe fehlgeschlagen');
    } finally {
      setApprovingId(null);
    }
  };

  // Episode ablehnen
  const handleReject = async (episodeId: string) => {
    setApprovingId(episodeId);
    try {
      await episodesApi.reject(episodeId, 'Vom Dashboard abgelehnt');
      showSuccess('Episode abgelehnt');
      setPendingApprovals(prev => prev.filter(e => e.id !== episodeId));
    } catch {
      showError('Ablehnen fehlgeschlagen');
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    if (can('canViewEditorialPlan')) {
      editorialApi.listPlan({ month: planMonth, year: planYear })
        .then((data: any[]) => setEditorialPlan(data))
        .catch(() => {});
    }
  }, [planMonth, planYear, can]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sysData = await adminApi.getSystem().catch(() => null);
        if (sysData) {
          setStats({
            episodes: { total: sysData.episodes, byStatus: {} },
            ideas: { total: sysData.ideas, new: 0 },
            assets: { total: sysData.assets },
            sponsors: { total: sysData.sponsors, active: 0 },
          });
        }
        if (can('canViewEpisodes')) {
          const epData = await episodesApi.list({ pageSize: 5 });
          setRecentEpisodes(epData.items || []);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [can]);

  // Podcast-Profil-Form mit globalem Profil synchronisieren
  useEffect(() => {
    if (podcastProfile) {
      setPodcastForm({
        name: podcastProfile.name || '',
        podcastName: podcastProfile.name || '',
        description: podcastProfile.description || '',
        author: podcastProfile.author || '',
        email: podcastProfile.email || '',
        website: podcastProfile.website || '',
        rssUrl: podcastProfile.rssUrl || '',
        category: podcastProfile.category || '',
        language: podcastProfile.language || 'de',
        moderator: podcastProfile.moderator || '',
        copyright: podcastProfile.copyright || '',
        explicit: podcastProfile.explicit || false,
      });
    }
  }, [podcastProfile]);

  const loadPodigeeStats = async () => {
    setPodigeeLoading(true);
    try {
      const data = await podigeeApi.getOverview();
      setPodigeeStats(data);
    } catch (e) {
      showError('Podigee-Statistiken konnten nicht geladen werden. Bitte API-Token in den Einstellungen prüfen.');
    } finally {
      setPodigeeLoading(false);
    }
  };

  const savePodcastInfo = async () => {
    setSavingPodcast(true);
    try {
      const current = await adminApi.getSettings();
      await adminApi.updateSettings({
        ...current,
        podcast: { ...podcastForm, name: podcastForm.name || podcastForm.podcastName },
        general: { ...current?.general, podcastName: podcastForm.name || podcastForm.podcastName },
      });
      await refreshPodcastProfile();
      setEditingPodcast(false);
      showSuccess('Podcast-Profil gespeichert – für alle Nutzer aktualisiert');
    } catch (e) {
      showError('Fehler beim Speichern');
    } finally {
      setSavingPodcast(false);
    }
  };

  const statusLabels: Record<string, string> = {
    idee: 'Idee', entwurf: 'Entwurf', aufnahme: 'Aufnahme',
    produktion: 'Produktion', geplant: 'Geplant', veroeffentlicht: 'Veröffentlicht',
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  };

  // ─── Widget: Freigabe-Anfragen ─────────────────────────────────────────────
  const renderApprovals = () => {
    // Nur für Nutzer mit canApproveEpisodes oder canRequestApproval anzeigen
    if (!can('canApproveEpisodes') && !can('canRequestApproval')) return null;

    return (
      <div key="approvals" className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent-orange" />
            Freigabe-Anfragen
            {pendingApprovals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-accent-orange/20 text-accent-orange font-semibold">
                {pendingApprovals.length}
              </span>
            )}
          </h2>
          <button
            onClick={loadPendingApprovals}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-obsidian-800 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw size={14} className={approvalsLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {approvalsLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <RefreshCw size={18} className="animate-spin mr-2" /> Lade Anfragen…
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={32} className="mx-auto text-accent-green mb-2 opacity-60" />
            <p className="text-text-muted text-sm">Keine offenen Freigabe-Anfragen</p>
            {can('canRequestApproval') && !can('canApproveEpisodes') && (
              <p className="text-text-muted text-xs mt-1">Du kannst Episoden zur Freigabe einreichen.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map(ep => (
              <div
                key={ep.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800 border border-accent-orange/20 hover:border-accent-orange/40 transition-colors"
              >
                {/* Episode-Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/episodes/${ep.id}`)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-text-primary font-medium text-sm truncate">
                      {ep.number ? `#${ep.number} ` : ''}{ep.title}
                    </span>
                    <span className="badge text-xs bg-accent-orange/20 text-accent-orange flex items-center gap-1">
                      <AlertTriangle size={10} /> Freigabe angefragt
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    {ep.approvalRequestedAt && (
                      <span>
                        {new Date(ep.approvalRequestedAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                    {ep.status && (
                      <span className={`badge text-xs ${
                        ep.status === 'produktion' ? 'bg-accent-blue/20 text-accent-blue' :
                        ep.status === 'aufnahme' ? 'bg-accent-orange/20 text-accent-orange' :
                        'bg-surface-overlay text-text-muted'
                      }`}>{statusLabels[ep.status] || ep.status}</span>
                    )}
                  </div>
                </div>

                {/* Aktions-Buttons (nur für canApproveEpisodes) */}
                {can('canApproveEpisodes') && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(ep.id)}
                      disabled={approvingId === ep.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent-green/20 text-accent-green hover:bg-accent-green/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Freigeben"
                    >
                      <CheckCircle size={13} />
                      Freigeben
                    </button>
                    <button
                      onClick={() => handleReject(ep.id)}
                      disabled={approvingId === ep.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Ablehnen"
                    >
                      <XCircle size={13} />
                      Ablehnen
                    </button>
                    <button
                      onClick={() => navigate(`/episodes/${ep.id}`)}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-obsidian-700 rounded-lg transition-colors"
                      title="Episode öffnen"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                )}
                {/* Nur-Lesen für canRequestApproval ohne canApproveEpisodes */}
                {!can('canApproveEpisodes') && can('canRequestApproval') && (
                  <button
                    onClick={() => navigate(`/episodes/${ep.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-overlay text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                  >
                    <Eye size={13} /> Öffnen
                  </button>
                )}
              </div>
            ))}
            {can('canApproveEpisodes') && (
              <Link
                to="/episodes?filter=approval"
                className="block text-center text-xs text-accent-purple hover:text-accent-purple/80 mt-2"
              >
                Alle Episoden mit Freigabe-Status anzeigen →
              </Link>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Widget: Statistiken ──────────────────────────────────────────────────
  const renderStats = () => {
    if (isLoading || !stats) return null;
    return (
      <div key="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {can('canViewEpisodes') && (
          <Link to="/episodes" className="card hover:border-accent-purple/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center">
                <Mic2 size={20} className="text-accent-purple" />
              </div>
              <TrendingUp size={14} className="text-text-muted group-hover:text-accent-purple transition-colors" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.episodes.total}</p>
            <p className="text-text-secondary text-sm">Episoden</p>
          </Link>
        )}
        {can('canViewIdeas') && (
          <Link to="/editorial" className="card hover:border-accent-orange/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent-orange/20 rounded-lg flex items-center justify-center">
                <Lightbulb size={20} className="text-accent-orange" />
              </div>
              <TrendingUp size={14} className="text-text-muted group-hover:text-accent-orange transition-colors" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.ideas.total}</p>
            <p className="text-text-secondary text-sm">Ideen</p>
          </Link>
        )}
        {can('canViewMedia') && (
          <Link to="/media" className="card hover:border-accent-blue/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center">
                <Library size={20} className="text-accent-blue" />
              </div>
              <TrendingUp size={14} className="text-text-muted group-hover:text-accent-blue transition-colors" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.assets.total}</p>
            <p className="text-text-secondary text-sm">Assets</p>
          </Link>
        )}
        {can('canViewSponsors') && (
          <Link to="/sponsors" className="card hover:border-accent-green/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                <Megaphone size={20} className="text-accent-green" />
              </div>
              <TrendingUp size={14} className="text-text-muted group-hover:text-accent-green transition-colors" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.sponsors.total}</p>
            <p className="text-text-secondary text-sm">Sponsoren</p>
          </Link>
        )}
      </div>
    );
  };

  // ─── Widget: Podcast-Profil + Episoden ────────────────────────────────────
  const renderPodcastEpisodes = () => {
    const profile = podcastProfile;
    const hasProfile = profile && (profile.name || profile.description || profile.website);

    return (
      <div key="podcast_episodes" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Podcast Profile Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <Radio size={16} className="text-accent-purple" /> Podcast-Profil
              {!can('canManageSettings') && hasProfile && (
                <span className="text-xs text-text-muted font-normal flex items-center gap-1 ml-1">
                  <Globe size={11} /> Global
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {can('canManageSettings') && !editingPodcast && (
                <button
                  onClick={() => setEditingPodcast(true)}
                  className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"
                  title="Podcast-Profil bearbeiten (gilt für alle Nutzer)"
                >
                  <Edit2 size={14} />
                </button>
              )}
              {editingPodcast && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingPodcast(false); }}
                    className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={savePodcastInfo}
                    disabled={savingPodcast}
                    className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                  >
                    <Save size={12} /> {savingPodcast ? 'Speichern...' : 'Global speichern'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Admin-Hinweis beim Bearbeiten */}
          {editingPodcast && (
            <div className="flex items-start gap-2 p-2 mb-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg text-xs text-accent-blue">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>Diese Einstellungen gelten <strong>global für alle Nutzer</strong>. Änderungen sind sofort für alle sichtbar.</span>
            </div>
          )}

          {editingPodcast ? (
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Podcast-Name', placeholder: 'Mein Podcast' },
                { key: 'moderator', label: 'Moderator/in', placeholder: 'Max Mustermann' },
                { key: 'category', label: 'Kategorie', placeholder: 'Technologie, Gesellschaft...' },
                { key: 'language', label: 'Sprache', placeholder: 'Deutsch' },
                { key: 'website', label: 'Website', placeholder: 'https://...' },
                { key: 'rssUrl', label: 'RSS-Feed URL', placeholder: 'https://...' },
                { key: 'copyright', label: 'Copyright', placeholder: `© ${new Date().getFullYear()}` },
              ].map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    className="input w-full text-sm"
                    placeholder={field.placeholder}
                    value={podcastForm[field.key] || ''}
                    onChange={e => setPodcastForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label">Beschreibung</label>
                <textarea
                  className="input w-full text-sm resize-none"
                  rows={3}
                  placeholder="Kurzbeschreibung des Podcasts..."
                  value={podcastForm.description || ''}
                  onChange={e => setPodcastForm((f: any) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {hasProfile ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {(profile.name) && (
                    <div className="col-span-2">
                      <p className="text-text-muted text-xs">Podcast-Name</p>
                      <p className="text-text-primary font-medium">{profile.name}</p>
                    </div>
                  )}
                  {profile.moderator && (
                    <div>
                      <p className="text-text-muted text-xs">Moderator/in</p>
                      <p className="text-text-secondary">{profile.moderator}</p>
                    </div>
                  )}
                  {profile.category && (
                    <div>
                      <p className="text-text-muted text-xs">Kategorie</p>
                      <p className="text-text-secondary">{profile.category}</p>
                    </div>
                  )}
                  {profile.language && (
                    <div>
                      <p className="text-text-muted text-xs">Sprache</p>
                      <p className="text-text-secondary">{profile.language === 'de' ? 'Deutsch' : profile.language}</p>
                    </div>
                  )}
                  {profile.website && (
                    <div>
                      <p className="text-text-muted text-xs">Website</p>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline text-xs">{profile.website}</a>
                    </div>
                  )}
                  {profile.rssUrl && (
                    <div>
                      <p className="text-text-muted text-xs">RSS-Feed</p>
                      <a href={profile.rssUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline text-xs truncate block">{profile.rssUrl}</a>
                    </div>
                  )}
                  {profile.copyright && (
                    <div>
                      <p className="text-text-muted text-xs">Copyright</p>
                      <p className="text-text-secondary text-xs">{profile.copyright}</p>
                    </div>
                  )}
                  {profile.description && (
                    <div className="col-span-2">
                      <p className="text-text-muted text-xs">Beschreibung</p>
                      <p className="text-text-secondary text-sm">{profile.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Radio size={32} className="mx-auto text-text-muted mb-2" />
                  <p className="text-text-muted text-sm">Noch keine Podcast-Infos hinterlegt</p>
                  {can('canManageSettings') ? (
                    <button onClick={() => setEditingPodcast(true)} className="btn-ghost text-sm mt-2">
                      Jetzt ausfüllen
                    </button>
                  ) : (
                    <p className="text-text-muted text-xs mt-1">Der Admin kann das Podcast-Profil in den Einstellungen hinterlegen.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Episodes */}
        {can('canViewEpisodes') && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0 flex items-center gap-2">
                <Clock size={16} className="text-accent-blue" /> Aktuelle Episoden
              </h2>
              <Link to="/episodes" className="text-accent-purple text-sm hover:underline">Alle →</Link>
            </div>
            {recentEpisodes.length === 0 ? (
              <div className="text-center py-6">
                <Mic2 size={32} className="mx-auto text-text-muted mb-2" />
                <p className="text-text-muted text-sm">Noch keine Episoden</p>
                {can('canCreateEpisodes') && (
                  <Link to="/episodes" className="btn-ghost text-sm mt-2 inline-block">Erste Episode erstellen</Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recentEpisodes.map(ep => (
                  <Link
                    key={ep.id}
                    to={`/episodes/${ep.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-raised transition-colors group"
                  >
                    <div className="w-8 h-8 bg-obsidian-700 rounded-lg flex items-center justify-center text-text-muted text-xs font-mono flex-shrink-0">
                      {ep.number ? `#${ep.number}` : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium truncate group-hover:text-accent-purple transition-colors text-sm">
                        {ep.title}
                      </p>
                      <p className="text-text-muted text-xs">
                        {ep.publishDate ? new Date(ep.publishDate).toLocaleDateString('de-DE') : 'Kein Datum'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ep.approvalStatus === 'angefragt' && (
                        <span className="badge text-xs bg-accent-orange/20 text-accent-orange" title="Freigabe angefragt">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                      {ep.approvalStatus === 'freigegeben' && (
                        <span className="badge text-xs bg-accent-green/20 text-accent-green" title="Freigegeben">
                          <CheckCircle size={10} />
                        </span>
                      )}
                      <span className={`badge text-xs ${
                        ep.status === 'veroeffentlicht' ? 'bg-accent-green/20 text-accent-green' :
                        ep.status === 'produktion' ? 'bg-accent-blue/20 text-accent-blue' :
                        ep.status === 'aufnahme' ? 'bg-accent-orange/20 text-accent-orange' :
                        ep.status === 'geplant' ? 'bg-accent-purple/20 text-accent-purple' :
                        'bg-surface-overlay text-text-muted'
                      }`}>
                        {statusLabels[ep.status] || ep.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Widget: Podigee ──────────────────────────────────────────────────────
  const renderPodigee = () => {
    if (!can('canViewStats')) return null;
    return (
      <div key="podigee" className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <BarChart2 size={16} className="text-accent-cyan" /> Podcast-Statistiken
          </h2>
          <button
            onClick={loadPodigeeStats}
            disabled={podigeeLoading}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {podigeeLoading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
            {podigeeLoading ? 'Lade...' : 'Podigee-Daten laden'}
          </button>
        </div>
        {!podigeeStats ? (
          <div className="text-center py-8">
            <Headphones size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-text-muted text-sm">Klicke auf "Podigee-Daten laden" um Statistiken anzuzeigen</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Downloads gesamt', value: podigeeStats.totalDownloads?.toLocaleString('de-DE') || '—', color: 'text-accent-cyan' },
                { label: 'Ø Downloads/Episode', value: podigeeStats.avgDownloadsPerEpisode?.toLocaleString('de-DE') || '—', color: 'text-accent-purple' },
                { label: 'Episoden', value: podigeeStats.episodeCount || '—', color: 'text-accent-blue' },
                { label: 'Abonnenten', value: podigeeStats.subscribers?.toLocaleString('de-DE') || '—', color: 'text-accent-green' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-obsidian-800 rounded-lg">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-text-muted text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {podigeeStats.topEpisodes && podigeeStats.topEpisodes.length > 0 && (
              <div>
                <h3 className="text-text-secondary text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp size={14} /> Top Episoden
                </h3>
                <div className="space-y-2">
                  {podigeeStats.topEpisodes.slice(0, 5).map((ep: any, i: number) => (
                    <div key={ep.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-raised transition-colors">
                      <span className="text-text-muted text-xs font-mono w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-secondary text-sm truncate">{ep.title}</p>
                      </div>
                      <span className="text-text-primary text-sm font-medium">{ep.downloads?.toLocaleString('de-DE') || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {podigeeStats.clients && podigeeStats.clients.length > 0 && (
                <div>
                  <h3 className="text-text-secondary text-sm font-medium mb-3 flex items-center gap-2">
                    <Smartphone size={14} /> Podcast-Apps
                  </h3>
                  <div className="space-y-2">
                    {podigeeStats.clients.slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-secondary truncate">{c.name}</span>
                            <span className="text-text-muted ml-2">{c.percentage?.toFixed(1) || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                            <div className="h-full bg-accent-purple rounded-full" style={{ width: `${c.percentage || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {podigeeStats.countries && podigeeStats.countries.length > 0 && (
                <div>
                  <h3 className="text-text-secondary text-sm font-medium mb-3 flex items-center gap-2">
                    <MapPin size={14} /> Länder
                  </h3>
                  <div className="space-y-2">
                    {podigeeStats.countries.slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-secondary truncate">{c.country}</span>
                            <span className="text-text-muted ml-2">{c.percentage?.toFixed(1) || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                            <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${c.percentage || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Widget: Redaktionsplan ───────────────────────────────────────────────
  const renderEditorial = () => {
    if (!can('canViewEditorialPlan')) return null;
    return (
      <div key="editorial" className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <BookOpen size={16} className="text-accent-orange" /> Redaktionsplan
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(planYear, planMonth - 2, 1);
                setPlanMonth(d.getMonth() + 1);
                setPlanYear(d.getFullYear());
              }}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-text-secondary text-sm font-medium min-w-[130px] text-center">
              {new Date(planYear, planMonth - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const d = new Date(planYear, planMonth, 1);
                setPlanMonth(d.getMonth() + 1);
                setPlanYear(d.getFullYear());
              }}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <Link to="/editorial" className="text-accent-purple text-sm hover:underline ml-2">Alle →</Link>
          </div>
        </div>
        {editorialPlan.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-text-muted text-sm">Keine Einträge für diesen Monat</p>
            {can('canEditEditorialPlan') && (
              <Link to="/editorial" className="btn-ghost text-sm mt-2 inline-block">Redaktionsplan öffnen</Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {[...editorialPlan]
              .sort((a: any, b: any) => (a.plannedDate || '').localeCompare(b.plannedDate || ''))
              .map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800 hover:bg-surface-raised transition-colors">
                  <div className="w-12 text-center flex-shrink-0">
                    {entry.plannedDate ? (
                      <>
                        <p className="text-text-muted text-xs">{new Date(entry.plannedDate).toLocaleDateString('de-DE', { weekday: 'short' })}</p>
                        <p className="text-text-primary font-bold text-sm">{new Date(entry.plannedDate).getDate()}.</p>
                      </>
                    ) : (
                      <p className="text-text-muted text-xs">—</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{entry.title}</p>
                    {entry.assignedTo && (
                      <p className="text-text-muted text-xs mt-0.5">{entry.assignedTo}</p>
                    )}
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ${
                    entry.status === 'veroeffentlicht' ? 'bg-accent-green/20 text-accent-green' :
                    entry.status === 'produktion' ? 'bg-accent-blue/20 text-accent-blue' :
                    entry.status === 'aufnahme' ? 'bg-accent-orange/20 text-accent-orange' :
                    entry.status === 'geplant' ? 'bg-accent-purple/20 text-accent-purple' :
                    'bg-surface-overlay text-text-muted'
                  }`}>
                    {entry.status === 'entwurf' ? 'Entwurf' :
                     entry.status === 'geplant' ? 'Geplant' :
                     entry.status === 'aufnahme' ? 'Aufnahme' :
                     entry.status === 'produktion' ? 'Produktion' :
                     entry.status === 'veroeffentlicht' ? 'Veröffentlicht' : entry.status}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Widget: Schnellzugriff ───────────────────────────────────────────────
  const renderQuickActions = () => (
    <div key="quickactions" className="card">
      <h2 className="section-title">Schnellzugriff</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {can('canCreateEpisodes') && (
          <Link to="/episodes" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-obsidian-800 hover:bg-surface-raised border border-surface-border hover:border-accent-purple/50 transition-all text-center">
            <Mic2 size={20} className="text-accent-purple" />
            <span className="text-text-secondary text-sm">Neue Episode</span>
          </Link>
        )}
        {can('canCreateIdeas') && (
          <Link to="/editorial" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-obsidian-800 hover:bg-surface-raised border border-surface-border hover:border-accent-orange/50 transition-all text-center">
            <Lightbulb size={20} className="text-accent-orange" />
            <span className="text-text-secondary text-sm">Neue Idee</span>
          </Link>
        )}
        {can('canUploadMedia') && (
          <Link to="/media" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-obsidian-800 hover:bg-surface-raised border border-surface-border hover:border-accent-blue/50 transition-all text-center">
            <Library size={20} className="text-accent-blue" />
            <span className="text-text-secondary text-sm">Asset hochladen</span>
          </Link>
        )}
        {can('canCreateSponsors') && (
          <Link to="/sponsors" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-obsidian-800 hover:bg-surface-raised border border-surface-border hover:border-accent-green/50 transition-all text-center">
            <Megaphone size={20} className="text-accent-green" />
            <span className="text-text-secondary text-sm">Neuer Sponsor</span>
          </Link>
        )}
      </div>
    </div>
  );

  // ─── Widget: Online-Nutzer ────────────────────────────────────────────────
  const renderOnlineUsers = () => (
    <div key="online_users" className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-accent-green/20 rounded-lg flex items-center justify-center">
          <Users size={16} className="text-accent-green" />
        </div>
        <h2 className="font-semibold text-text-primary">Online-Nutzer</h2>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green font-medium">{onlineUsers.length} aktiv</span>
      </div>
      {onlineUsers.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4">Keine anderen Nutzer aktiv</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {onlineUsers.map((u: any) => {
            const initials = u.displayName
              ? u.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              : u.username?.[0]?.toUpperCase() || '?';
            const isCurrentUser = u.id === user?.id;
            return (
              <div key={u.id} className="flex items-center gap-2 p-2 bg-obsidian-800 rounded-lg border border-surface-border">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: u.avatarColor || '#7c3aed' }}
                  >
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-obsidian-800" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.displayName || u.username}</p>
                  {isCurrentUser && <p className="text-[10px] text-accent-green">Du</p>}
                  {u.role && !isCurrentUser && <p className="text-[10px] text-text-muted capitalize">{u.role}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Widget-Map ───────────────────────────────────────────────────────────
  const widgetRenderers: Record<string, () => React.ReactNode> = {
    stats: renderStats,
    approvals: renderApprovals,
    online_users: renderOnlineUsers,
    podcast_episodes: renderPodcastEpisodes,
    podigee: renderPodigee,
    editorial: renderEditorial,
    quickactions: renderQuickActions,
  };

  // Sichtbare Widgets (nur die, die für den aktuellen Nutzer relevant sind)
  const visibleWidgets = widgetOrder.filter(w => {
    if (w === 'approvals' && !can('canApproveEpisodes') && !can('canRequestApproval')) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {greeting()}, {user?.displayName?.split(' ')[0] || user?.username}! 👋
          </h1>
          <p className="text-text-secondary mt-1">
            {branding?.podcastName ? `Willkommen zurück bei ${branding.podcastName}` : 'Willkommen zurück in PodCore'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Freigabe-Badge im Header */}
          {can('canApproveEpisodes') && pendingApprovals.length > 0 && (
            <button
              onClick={() => {
                const idx = widgetOrder.indexOf('approvals');
                if (idx === -1) setWidgetOrder(prev => ['approvals', ...prev]);
                document.getElementById('widget-approvals')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-orange/20 text-accent-orange border border-accent-orange/40 rounded-full hover:bg-accent-orange/30 transition-colors"
            >
              <AlertTriangle size={13} />
              {pendingApprovals.length} Freigabe{pendingApprovals.length !== 1 ? 'n' : ''} ausstehend
            </button>
          )}
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt="Podcast Logo" className="h-12 w-auto object-contain rounded-lg" />
          )}
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`p-2 rounded-lg transition-colors ${isCustomizing ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary hover:bg-obsidian-800'}`}
            title="Dashboard anpassen"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Dashboard-Anpassung Panel */}
      {isCustomizing && (
        <div className="card border-accent-purple/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <Settings2 size={16} className="text-accent-purple" /> Dashboard anpassen
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setWidgetOrder(DEFAULT_WIDGETS)} className="btn-ghost text-xs">
                Zurücksetzen
              </button>
              <button
                onClick={() => saveDashboardLayout(widgetOrder)}
                disabled={isSavingLayout}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Save size={12} /> {isSavingLayout ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setIsCustomizing(false)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-obsidian-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-text-muted text-sm mb-4">Ziehe die Blöcke um die Reihenfolge zu ändern. Klicke auf das Auge um einen Block aus- oder einzublenden.</p>
          <div className="space-y-2">
            {DEFAULT_WIDGETS.map(widget => {
              const isVisible = widgetOrder.includes(widget);
              const pos = widgetOrder.indexOf(widget);
              return (
                <div
                  key={widget}
                  draggable={isVisible}
                  onDragStart={() => handleDragStart(widget)}
                  onDragOver={e => handleDragOver(e, widget)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    draggedWidget === widget
                      ? 'opacity-50 border-accent-purple bg-accent-purple/5'
                      : isVisible
                      ? 'border-surface-border bg-obsidian-800 cursor-grab'
                      : 'border-dashed border-surface-border opacity-50'
                  }`}
                >
                  <GripVertical size={16} className="text-text-muted flex-shrink-0" />
                  <span className="flex-1 text-text-primary text-sm">{WIDGET_LABELS[widget]}</span>
                  {widget === 'approvals' && (
                    <span className="text-xs text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-full">
                      Moderator/Admin
                    </span>
                  )}
                  {isVisible && (
                    <span className="text-text-muted text-xs bg-obsidian-700 px-2 py-0.5 rounded-full">
                      Position {pos + 1}
                    </span>
                  )}
                  <button
                    onClick={() => toggleWidget(widget)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isVisible
                        ? 'text-accent-green hover:text-accent-red hover:bg-accent-red/10'
                        : 'text-text-muted hover:text-accent-green hover:bg-accent-green/10'
                    }`}
                    title={isVisible ? 'Ausblenden' : 'Einblenden'}
                  >
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Widgets in benutzerdefinierter Reihenfolge */}
      {visibleWidgets.map(widget => {
        const renderer = widgetRenderers[widget];
        if (!renderer) return null;
        const rendered = renderer();
        if (!rendered) return null;
        return (
          <div key={widget} id={`widget-${widget}`}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}
