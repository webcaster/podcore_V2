import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic2, Lightbulb, Library, Megaphone, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { episodesApi, editorialApi, sponsorsApi, adminApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

interface Stats {
  episodes: { total: number; byStatus: Record<string, number> };
  ideas: { total: number; new: number };
  assets: { total: number };
  sponsors: { total: number; active: number };
}

export default function Dashboard() {
  const { user, can } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sysData] = await Promise.allSettled([
          adminApi.getSystem(),
        ]);

        if (sysData.status === 'fulfilled') {
          const sys = sysData.value;
          setStats({
            episodes: { total: sys.episodes, byStatus: {} },
            ideas: { total: sys.ideas, new: 0 },
            assets: { total: sys.assets },
            sponsors: { total: sys.sponsors, active: 0 },
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

  const statusLabels: Record<string, string> = {
    idee: 'Idee', entwurf: 'Entwurf', aufnahme: 'Aufnahme',
    produktion: 'Produktion', geplant: 'Geplant', veroeffentlicht: 'Veröffentlicht',
  };

  const statusColors: Record<string, string> = {
    idee: 'text-accent-cyan', entwurf: 'text-text-muted', aufnahme: 'text-accent-orange',
    produktion: 'text-accent-blue', geplant: 'text-accent-purple', veroeffentlicht: 'text-accent-green',
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {greeting()}, {user?.displayName?.split(' ')[0] || user?.username}! 👋
        </h1>
        <p className="text-text-secondary mt-1">Willkommen zurück in PodCore</p>
      </div>

      {/* Stats Grid */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      )}

      {/* Recent Episodes */}
      {can('canViewEpisodes') && recentEpisodes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Aktuelle Episoden</h2>
            <Link to="/episodes" className="text-accent-purple text-sm hover:underline">Alle anzeigen →</Link>
          </div>
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
                  <p className="text-text-primary font-medium truncate group-hover:text-accent-purple transition-colors">
                    {ep.title}
                  </p>
                  <p className="text-text-muted text-xs">
                    {ep.publishDate ? new Date(ep.publishDate).toLocaleDateString('de-DE') : 'Kein Datum'}
                  </p>
                </div>
                <span className={`badge ${
                  ep.status === 'veroeffentlicht' ? 'bg-accent-green/20 text-accent-green' :
                  ep.status === 'produktion' ? 'bg-accent-blue/20 text-accent-blue' :
                  ep.status === 'aufnahme' ? 'bg-accent-orange/20 text-accent-orange' :
                  ep.status === 'geplant' ? 'bg-accent-purple/20 text-accent-purple' :
                  'bg-surface-overlay text-text-muted'
                }`}>
                  {statusLabels[ep.status] || ep.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
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
    </div>
  );
}
