import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Users, Headphones, Globe, Smartphone,
  RefreshCw, Settings, AlertCircle, CheckCircle, Calendar,
  Download, Star, ArrowUp, ArrowDown, Minus, ExternalLink
} from 'lucide-react';
import { podigeeApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

type Period = '7d' | '30d' | '90d' | '365d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Letzte 7 Tage',
  '30d': 'Letzte 30 Tage',
  '90d': 'Letzte 90 Tage',
  '365d': 'Letztes Jahr',
};

function getPeriodDates(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = parseInt(period);
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function PodigeePage() {
  const { showError } = useApp();
  const [status, setStatus] = useState<any>(null);
  const [podcast, setPodcast] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [topEpisodes, setTopEpisodes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [geo, setGeo] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'clients' | 'geo'>('overview');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const s = await podigeeApi.getStatus();
      setStatus(s);
      return s;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const loadData = async (p: Period = period) => {
    setIsRefreshing(true);
    setError(null);
    const dates = getPeriodDates(p);

    try {
      const [overviewData, topData, clientData, geoData, podcastData] = await Promise.allSettled([
        podigeeApi.getOverview(dates),
        podigeeApi.getTopEpisodes({ ...dates, limit: 10 }),
        podigeeApi.getClients(dates),
        podigeeApi.getGeo(dates),
        podigeeApi.getPodcast(),
      ]);

      if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
      if (topData.status === 'fulfilled') setTopEpisodes(Array.isArray(topData.value) ? topData.value : topData.value?.episodes || []);
      if (clientData.status === 'fulfilled') setClients(Array.isArray(clientData.value) ? clientData.value : clientData.value?.clients || []);
      if (geoData.status === 'fulfilled') setGeo(Array.isArray(geoData.value) ? geoData.value : geoData.value?.countries || []);
      if (podcastData.status === 'fulfilled') setPodcast(podcastData.value);

      // Check for errors
      const firstError = [overviewData, topData, clientData, geoData].find(r => r.status === 'rejected');
      if (firstError && firstError.status === 'rejected') {
        setError(firstError.reason?.message || 'Fehler beim Laden der Daten');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus().then(s => {
      if (s?.connected) loadData();
      else setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (status?.connected) loadData(period);
  }, [period]);

  const handleRefresh = async () => {
    await loadData(period);
  };

  // Format numbers
  const fmt = (n: number | undefined | null) => {
    if (n == null) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString('de-DE');
  };

  const totalDownloads = overview?.total || overview?.downloads || overview?.sum || 0;
  const avgPerEpisode = topEpisodes.length > 0
    ? Math.round(topEpisodes.reduce((s, e) => s + (e.downloads || e.count || 0), 0) / topEpisodes.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 size={24} className="text-accent-cyan" />
            Podcast-Auswertungen
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Statistiken via Podigee API
            {podcast && <span className="ml-2 text-accent-cyan">· {podcast.title}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.connected && (
            <>
              <select value={period} onChange={e => setPeriod(e.target.value as Period)} className="select w-44">
                {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button onClick={handleRefresh} disabled={isRefreshing} className="btn-ghost p-2">
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </>
          )}
          <Link to="/settings" className="btn-secondary">
            <Settings size={16} /><span>Konfigurieren</span>
          </Link>
        </div>
      </div>

      {/* Not configured */}
      {!isLoading && !status?.connected && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-accent-orange/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-accent-orange" />
          </div>
          <h2 className="text-text-primary font-bold text-xl mb-2">Podigee nicht verbunden</h2>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            Um Podcast-Statistiken anzuzeigen, hinterlege deinen Podigee API-Token und die Podcast-Subdomain in den Einstellungen.
          </p>
          <Link to="/settings" className="btn-primary mx-auto">
            <Settings size={16} /><span>Jetzt konfigurieren</span>
          </Link>
          <div className="mt-6 text-text-muted text-sm">
            <p>Den API-Token findest du in deinem Podigee-Konto unter</p>
            <a href="https://app.podigee.com" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline flex items-center gap-1 justify-center mt-1">
              app.podigee.com <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Error state */}
      {status?.connected && error && (
        <div className="card bg-accent-red/10 border-accent-red/30">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-accent-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-accent-red font-medium">Fehler beim Laden der Statistiken</p>
              <p className="text-text-secondary text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && status?.connected && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Connected & data loaded */}
      {!isLoading && status?.connected && (
        <>
          {/* Connection badge */}
          <div className="flex items-center gap-2 text-sm text-accent-green">
            <CheckCircle size={14} />
            <span>Verbunden mit Podigee · {status.subdomain}</span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-cyan/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Download size={20} className="text-accent-cyan" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{fmt(totalDownloads)}</p>
              <p className="text-text-muted text-sm">Downloads</p>
              <p className="text-text-muted text-xs">{PERIOD_LABELS[period]}</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Headphones size={20} className="text-accent-purple" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{fmt(avgPerEpisode)}</p>
              <p className="text-text-muted text-sm">Ø pro Episode</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Star size={20} className="text-accent-green" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{topEpisodes.length > 0 ? fmt(topEpisodes[0]?.downloads || topEpisodes[0]?.count || 0) : '—'}</p>
              <p className="text-text-muted text-sm">Top-Episode</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Globe size={20} className="text-accent-orange" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{geo.length > 0 ? geo.length : '—'}</p>
              <p className="text-text-muted text-sm">Länder</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
            {[
              { key: 'overview', label: 'Übersicht' },
              { key: 'episodes', label: 'Episoden' },
              { key: 'clients', label: 'Apps & Clients' },
              { key: 'geo', label: 'Regionen' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-cyan text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Download timeline */}
              {overview?.timeline && overview.timeline.length > 0 ? (
                <div className="card">
                  <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-accent-cyan" />
                    Download-Verlauf
                  </h3>
                  <div className="flex items-end gap-1 h-32">
                    {overview.timeline.map((point: any, idx: number) => {
                      const max = Math.max(...overview.timeline.map((p: any) => p.downloads || p.count || 0));
                      const val = point.downloads || point.count || 0;
                      const pct = max > 0 ? (val / max) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-obsidian-700 text-text-primary text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {fmt(val)} · {point.date || point.day}
                          </div>
                          <div
                            className="w-full bg-accent-cyan/70 hover:bg-accent-cyan rounded-t transition-all"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="card text-center py-8">
                  <TrendingUp size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">Keine Zeitreihen-Daten verfügbar</p>
                  <p className="text-text-muted text-xs mt-1">Die Podigee API liefert für diesen Zeitraum keine Verlaufsdaten</p>
                </div>
              )}

              {/* Top 5 quick view */}
              {topEpisodes.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-text-primary mb-4">Top 5 Episoden</h3>
                  <div className="space-y-3">
                    {topEpisodes.slice(0, 5).map((ep, idx) => {
                      const downloads = ep.downloads || ep.count || 0;
                      const max = topEpisodes[0]?.downloads || topEpisodes[0]?.count || 1;
                      const pct = (downloads / max) * 100;
                      return (
                        <div key={ep.id || idx}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-text-muted text-sm w-5 flex-shrink-0">#{idx + 1}</span>
                              <span className="text-text-primary text-sm truncate">{ep.title || ep.episode_title || `Episode ${idx + 1}`}</span>
                            </div>
                            <span className="text-text-primary text-sm font-medium flex-shrink-0 ml-4">{fmt(downloads)}</span>
                          </div>
                          <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
                            <div className="h-full bg-accent-cyan rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {topEpisodes.length > 5 && (
                    <button onClick={() => setActiveTab('episodes')} className="text-accent-cyan text-xs hover:underline mt-3">
                      Alle {topEpisodes.length} Episoden anzeigen →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EPISODES TAB */}
          {activeTab === 'episodes' && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Episoden nach Downloads</h3>
              {topEpisodes.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-8">Keine Episoden-Daten verfügbar</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border">
                        <th className="text-left py-3 px-4 text-text-muted font-medium">#</th>
                        <th className="text-left py-3 px-4 text-text-muted font-medium">Episode</th>
                        <th className="text-right py-3 px-4 text-text-muted font-medium">Downloads</th>
                        <th className="text-right py-3 px-4 text-text-muted font-medium">Anteil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topEpisodes.map((ep, idx) => {
                        const downloads = ep.downloads || ep.count || 0;
                        const total = topEpisodes.reduce((s, e) => s + (e.downloads || e.count || 0), 0);
                        const pct = total > 0 ? ((downloads / total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={ep.id || idx} className="border-b border-surface-border/50 hover:bg-surface-raised transition-colors">
                            <td className="py-3 px-4 text-text-muted">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <p className="text-text-primary">{ep.title || ep.episode_title || `Episode ${idx + 1}`}</p>
                              {ep.published_at && <p className="text-text-muted text-xs">{new Date(ep.published_at).toLocaleDateString('de-DE')}</p>}
                            </td>
                            <td className="py-3 px-4 text-right text-text-primary font-medium">{fmt(downloads)}</td>
                            <td className="py-3 px-4 text-right text-text-muted">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CLIENTS TAB */}
          {activeTab === 'clients' && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Smartphone size={16} className="text-accent-purple" />
                Podcast-Apps & Clients
              </h3>
              {clients.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-8">Keine Client-Daten verfügbar</p>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 15).map((client, idx) => {
                    const count = client.count || client.downloads || 0;
                    const total = clients.reduce((s, c) => s + (c.count || c.downloads || 0), 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const CLIENT_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#3b82f6', '#ec4899', '#f59e0b'];
                    const color = CLIENT_COLORS[idx % CLIENT_COLORS.length];
                    return (
                      <div key={client.name || idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-secondary text-sm">{client.name || client.client || 'Unbekannt'}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted text-xs">{pct.toFixed(1)}%</span>
                            <span className="text-text-primary text-sm font-medium w-16 text-right">{fmt(count)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GEO TAB */}
          {activeTab === 'geo' && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Globe size={16} className="text-accent-orange" />
                Geografische Verteilung
              </h3>
              {geo.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-8">Keine Geo-Daten verfügbar</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border">
                        <th className="text-left py-3 px-4 text-text-muted font-medium">#</th>
                        <th className="text-left py-3 px-4 text-text-muted font-medium">Land</th>
                        <th className="text-right py-3 px-4 text-text-muted font-medium">Downloads</th>
                        <th className="text-right py-3 px-4 text-text-muted font-medium">Anteil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geo.slice(0, 20).map((country, idx) => {
                        const count = country.count || country.downloads || 0;
                        const total = geo.reduce((s, c) => s + (c.count || c.downloads || 0), 0);
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={country.country || idx} className="border-b border-surface-border/50 hover:bg-surface-raised transition-colors">
                            <td className="py-3 px-4 text-text-muted">{idx + 1}</td>
                            <td className="py-3 px-4 text-text-primary">{country.country || country.name || 'Unbekannt'}</td>
                            <td className="py-3 px-4 text-right text-text-primary font-medium">{fmt(count)}</td>
                            <td className="py-3 px-4 text-right text-text-muted">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
