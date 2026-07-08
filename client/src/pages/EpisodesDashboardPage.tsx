import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic, Calendar, BarChart3, Clock, CheckCircle2, AlertCircle,
  FileText, ChevronLeft, ChevronRight, Download, Filter,
  Play, Pause, Archive, Edit3, TrendingUp, Radio, Layers,
  ArrowRight, Star, CalendarClock
} from 'lucide-react';
import { episodesApi, editorialApi } from '../lib/api';
import { usePodcastProfile } from '../contexts/AppContext';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Episode {
  id: string;
  title: string;
  episodeNumber?: number;
  season?: number;
  status: string;
  publishDate?: string;
  recordingDate?: string;
  plannedDate?: string;
  duration?: string;
  type?: string;
  tags?: string[];
  description?: string;
}

interface CalendarDay {
  date: Date;
  episodes: Episode[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

// ─────────────────────────────────────────────────────────────
// Status-Mapping: Deutsche Backend-Werte → Anzeige
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  // Deutsche Status-Werte (Backend)
  idee:             { label: 'Idee',          color: 'text-text-muted',     bg: 'bg-obsidian-700',         icon: <FileText size={12} /> },
  entwurf:          { label: 'Entwurf',       color: 'text-text-muted',     bg: 'bg-obsidian-700',         icon: <Edit3 size={12} /> },
  aufnahme:         { label: 'Aufnahme',      color: 'text-accent-yellow',  bg: 'bg-accent-yellow/15',     icon: <Mic size={12} /> },
  produktion:       { label: 'Produktion',    color: 'text-accent-blue',    bg: 'bg-accent-blue/15',       icon: <Layers size={12} /> },
  review:           { label: 'Review',        color: 'text-accent-orange',  bg: 'bg-accent-orange/15',     icon: <AlertCircle size={12} /> },
  freigegeben:      { label: 'Freigegeben',   color: 'text-accent-green',   bg: 'bg-accent-green/15',      icon: <CheckCircle2 size={12} /> },
  geplant:          { label: 'Geplant',       color: 'text-accent-purple',  bg: 'bg-accent-purple/15',     icon: <Calendar size={12} /> },
  veroeffentlicht:  { label: 'Veröffentlicht',color: 'text-accent-green',   bg: 'bg-accent-green/15',      icon: <Play size={12} /> },
  archiviert:       { label: 'Archiviert',    color: 'text-text-muted',     bg: 'bg-obsidian-700',         icon: <Archive size={12} /> },
  // Englische Fallback-Werte (Kompatibilität)
  draft:            { label: 'Entwurf',       color: 'text-text-muted',     bg: 'bg-obsidian-700',         icon: <Edit3 size={12} /> },
  recording:        { label: 'Aufnahme',      color: 'text-accent-yellow',  bg: 'bg-accent-yellow/15',     icon: <Mic size={12} /> },
  editing:          { label: 'Schnitt',       color: 'text-accent-blue',    bg: 'bg-accent-blue/15',       icon: <Layers size={12} /> },
  approved:         { label: 'Freigegeben',   color: 'text-accent-green',   bg: 'bg-accent-green/15',      icon: <CheckCircle2 size={12} /> },
  scheduled:        { label: 'Geplant',       color: 'text-accent-purple',  bg: 'bg-accent-purple/15',     icon: <Calendar size={12} /> },
  published:        { label: 'Veröffentlicht',color: 'text-accent-green',   bg: 'bg-accent-green/15',      icon: <Play size={12} /> },
  archived:         { label: 'Archiviert',    color: 'text-text-muted',     bg: 'bg-obsidian-700',         icon: <Archive size={12} /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: 'text-text-muted', bg: 'bg-obsidian-700', icon: <FileText size={12} /> };
}

// Prüft ob ein Status "veröffentlicht" bedeutet
function isPublished(status: string) {
  return ['veroeffentlicht', 'published'].includes(status);
}

// Prüft ob ein Status "geplant/freigegeben" bedeutet (nächste Episoden)
function isUpcoming(status: string) {
  return ['geplant', 'freigegeben', 'scheduled', 'approved'].includes(status);
}

// ─────────────────────────────────────────────────────────────
// Kalender-Builder (mit plannedDate-Unterstützung)
// ─────────────────────────────────────────────────────────────

function buildCalendar(year: number, month: number, episodes: Episode[]): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, episodes: [], isCurrentMonth: false, isToday: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().slice(0, 10);
    const dayEps = episodes.filter(ep => {
      const pub = ep.publishDate?.slice(0, 10);
      const rec = ep.recordingDate?.slice(0, 10);
      const plan = ep.plannedDate?.slice(0, 10);
      return pub === dateStr || rec === dateStr || plan === dateStr;
    });
    days.push({
      date,
      episodes: dayEps,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
    });
  }

  // Next month padding to complete grid
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, episodes: [], isCurrentMonth: false, isToday: false });
  }

  return days;
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function EpisodesDashboardPage() {
  const { podcastProfile } = usePodcastProfile();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'stats'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // episodesApi.list() gibt { items: [...], total: N } zurück (api.get() unwrapped)
      const data = await episodesApi.list({ pageSize: 500 });
      const items = (data as any)?.items ?? (Array.isArray(data) ? data : []);
      setEpisodes(items);
    } catch {
      setEpisodes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────
  const stats = {
    total: episodes.length,
    published: episodes.filter(e => isPublished(e.status)).length,
    scheduled: episodes.filter(e => ['geplant', 'scheduled'].includes(e.status)).length,
    inProgress: episodes.filter(e => ['aufnahme', 'produktion', 'recording', 'editing', 'review'].includes(e.status)).length,
    draft: episodes.filter(e => ['entwurf', 'idee', 'draft'].includes(e.status)).length,
    approved: episodes.filter(e => ['freigegeben', 'approved'].includes(e.status)).length,
  };

  // ── Calendar ───────────────────────────────────────────────
  const calDays = buildCalendar(calYear, calMonth, episodes);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  // ── PDF Export ─────────────────────────────────────────────
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await editorialApi.downloadCalendarPdf(calYear, calMonth + 1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Episoden_${MONTH_NAMES[calMonth]}_${calYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback silent
    } finally {
      setIsExporting(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────
  const filteredEpisodes = filterStatus === 'all'
    ? episodes
    : episodes.filter(e => e.status === filterStatus);

  const sortedEpisodes = [...filteredEpisodes].sort((a, b) => {
    const da = a.publishDate || a.recordingDate || a.plannedDate || '';
    const db = b.publishDate || b.recordingDate || b.plannedDate || '';
    if (!da && !db) return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);
    if (!da) return 1;
    if (!db) return -1;
    return db.localeCompare(da);
  });

  // Alle eindeutigen Status-Werte aus den Episoden
  const allStatuses = Array.from(new Set(episodes.map(e => e.status)));

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Radio size={24} className="text-accent-purple" />
            Episoden-Dashboard
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {podcastProfile.name ? `${podcastProfile.name} — ` : ''}Übersicht aller Folgen, Kalender und Statistiken
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['calendar', 'list', 'stats'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode ? 'bg-accent-purple text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              {mode === 'calendar' ? 'Kalender' : mode === 'list' ? 'Liste' : 'Statistiken'}
            </button>
          ))}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Download size={14} />
            {isExporting ? 'Exportiere...' : 'PDF exportieren'}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Stats Row ── */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Gesamt',         value: stats.total,      color: 'text-text-primary',   icon: <Mic size={16} /> },
            { label: 'Veröffentlicht', value: stats.published,  color: 'text-accent-green',   icon: <Play size={16} /> },
            { label: 'Geplant',        value: stats.scheduled,  color: 'text-accent-purple',  icon: <Calendar size={16} /> },
            { label: 'In Arbeit',      value: stats.inProgress, color: 'text-accent-blue',    icon: <Edit3 size={16} /> },
            { label: 'Freigegeben',    value: stats.approved,   color: 'text-accent-green',   icon: <CheckCircle2 size={16} /> },
            { label: 'Entwurf/Idee',   value: stats.draft,      color: 'text-text-muted',     icon: <FileText size={16} /> },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-text-muted text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar View ── */}
      {!isLoading && viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 card space-y-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors">
                <ChevronLeft size={18} className="text-text-secondary" />
              </button>
              <h2 className="font-semibold text-text-primary">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors">
                <ChevronRight size={18} className="text-text-secondary" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => (
                <button
                  key={i}
                  onClick={() => day.isCurrentMonth && setSelectedDay(day.episodes.length > 0 || day.isToday ? day : null)}
                  className={`
                    relative min-h-[52px] p-1 rounded-lg text-left transition-all
                    ${!day.isCurrentMonth ? 'opacity-25 cursor-default' : 'hover:bg-obsidian-700 cursor-pointer'}
                    ${day.isToday ? 'ring-2 ring-accent-purple' : ''}
                    ${selectedDay?.date.getTime() === day.date.getTime() ? 'bg-accent-purple/20' : ''}
                  `}
                >
                  <span className={`text-xs font-medium block text-center mb-1 ${
                    day.isToday ? 'text-accent-purple font-bold' : 'text-text-secondary'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  {day.episodes.slice(0, 2).map(ep => {
                    const sc = getStatusConfig(ep.status);
                    return (
                      <div key={ep.id} className={`text-[9px] px-1 py-0.5 rounded truncate mb-0.5 ${sc.bg} ${sc.color}`}>
                        {ep.title}
                      </div>
                    );
                  })}
                  {day.episodes.length > 2 && (
                    <div className="text-[9px] text-text-muted text-center">+{day.episodes.length - 2}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-obsidian-600">
              {[
                { key: 'entwurf',         cfg: STATUS_CONFIG['entwurf'] },
                { key: 'aufnahme',        cfg: STATUS_CONFIG['aufnahme'] },
                { key: 'produktion',      cfg: STATUS_CONFIG['produktion'] },
                { key: 'geplant',         cfg: STATUS_CONFIG['geplant'] },
                { key: 'veroeffentlicht', cfg: STATUS_CONFIG['veroeffentlicht'] },
              ].map(({ key, cfg }) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                  <span className="text-xs text-text-muted">{cfg.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <CalendarClock size={10} className="text-accent-purple/60" />
                <span className="text-xs text-text-muted">Vorplanung</span>
              </div>
            </div>
          </div>

          {/* Sidebar: selected day or upcoming */}
          <div className="space-y-4">
            {selectedDay ? (
              <div className="card space-y-3">
                <h3 className="font-semibold text-text-primary text-sm">
                  {selectedDay.date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedDay.episodes.length === 0 ? (
                  <p className="text-text-muted text-sm">Keine Episoden an diesem Tag</p>
                ) : (
                  selectedDay.episodes.map(ep => {
                    const sc = getStatusConfig(ep.status);
                    return (
                      <Link key={ep.id} to={`/episodes/${ep.id}`} className="block p-3 bg-obsidian-700 rounded-lg hover:bg-obsidian-600 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-sm font-medium truncate">{ep.title}</p>
                            {ep.episodeNumber && (
                              <p className="text-text-muted text-xs">Episode #{ep.episodeNumber}</p>
                            )}
                            {ep.plannedDate && !ep.publishDate && !ep.recordingDate && (
                              <p className="text-accent-purple/70 text-xs flex items-center gap-1">
                                <CalendarClock size={10} /> Vorplanung
                              </p>
                            )}
                          </div>
                          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${sc.bg} ${sc.color} whitespace-nowrap`}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="card space-y-3">
                <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                  <TrendingUp size={14} className="text-accent-purple" /> Nächste Episoden
                </h3>
                {episodes
                  .filter(e => isUpcoming(e.status))
                  .slice(0, 5)
                  .map(ep => {
                    const sc = getStatusConfig(ep.status);
                    return (
                      <Link key={ep.id} to={`/episodes/${ep.id}`} className="flex items-center gap-3 p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.bg}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm truncate">{ep.title}</p>
                          {(ep.publishDate || ep.plannedDate) && (
                            <p className="text-text-muted text-xs">
                              {ep.publishDate
                                ? new Date(ep.publishDate).toLocaleDateString('de-DE')
                                : ep.plannedDate
                                  ? `Vorplanung: ${new Date(ep.plannedDate).toLocaleDateString('de-DE')}`
                                  : ''}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
                      </Link>
                    );
                  })}
                {episodes.filter(e => isUpcoming(e.status)).length === 0 && (
                  <p className="text-text-muted text-sm">Keine geplanten Episoden</p>
                )}
              </div>
            )}

            {/* Recent published */}
            <div className="card space-y-3">
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Star size={14} className="text-accent-yellow" /> Zuletzt veröffentlicht
              </h3>
              {episodes
                .filter(e => isPublished(e.status))
                .slice(0, 4)
                .map(ep => (
                  <Link key={ep.id} to={`/episodes/${ep.id}`} className="flex items-center gap-3 p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
                    <Play size={12} className="text-accent-green flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{ep.title}</p>
                      {ep.publishDate && (
                        <p className="text-text-muted text-xs">{new Date(ep.publishDate).toLocaleDateString('de-DE')}</p>
                      )}
                    </div>
                  </Link>
                ))}
              {episodes.filter(e => isPublished(e.status)).length === 0 && (
                <p className="text-text-muted text-sm">Noch keine veröffentlichten Episoden</p>
              )}
            </div>

            {/* Episoden ohne Datum */}
            {episodes.filter(e => !e.publishDate && !e.recordingDate && !e.plannedDate).length > 0 && (
              <div className="card space-y-3">
                <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                  <Clock size={14} className="text-text-muted" /> Ohne Datum
                </h3>
                {episodes
                  .filter(e => !e.publishDate && !e.recordingDate && !e.plannedDate)
                  .slice(0, 5)
                  .map(ep => {
                    const sc = getStatusConfig(ep.status);
                    return (
                      <Link key={ep.id} to={`/episodes/${ep.id}`} className="flex items-center gap-3 p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.bg}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm truncate">{ep.title}</p>
                          <p className="text-text-muted text-xs">{sc.label}</p>
                        </div>
                        <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── List View ── */}
      {!isLoading && viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-text-muted" />
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterStatus === 'all' ? 'bg-accent-purple text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              Alle ({episodes.length})
            </button>
            {allStatuses.map(s => {
              const cfg = getStatusConfig(s);
              const count = episodes.filter(e => e.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filterStatus === s ? 'bg-accent-purple text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Episode table */}
          <div className="card overflow-hidden p-0">
            {sortedEpisodes.length === 0 ? (
              <div className="text-center py-12 text-text-muted">Keine Episoden gefunden</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-obsidian-600">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Titel</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden lg:table-cell">Veröffentlichung</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden lg:table-cell">Aufnahme</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden xl:table-cell">Vorplanung</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden xl:table-cell">Dauer</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedEpisodes.map((ep, idx) => {
                    const sc = getStatusConfig(ep.status);
                    return (
                      <tr key={ep.id} className={`border-b border-obsidian-700/50 hover:bg-obsidian-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-obsidian-800/30'}`}>
                        <td className="px-4 py-3 text-text-muted text-sm">{ep.episodeNumber ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-text-primary text-sm font-medium">{ep.title}</div>
                          {ep.season && <div className="text-text-muted text-xs">Staffel {ep.season}</div>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-sm hidden lg:table-cell">
                          {ep.publishDate ? new Date(ep.publishDate).toLocaleDateString('de-DE') : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-sm hidden lg:table-cell">
                          {ep.recordingDate ? new Date(ep.recordingDate).toLocaleDateString('de-DE') : '—'}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {ep.plannedDate ? (
                            <span className="text-accent-purple/80 text-xs flex items-center gap-1">
                              <CalendarClock size={10} />
                              {new Date(ep.plannedDate).toLocaleDateString('de-DE')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-sm hidden xl:table-cell">
                          {ep.duration || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/episodes/${ep.id}`} className="text-accent-purple hover:text-accent-purple/80 text-xs font-medium">
                            Öffnen
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Stats View ── */}
      {!isLoading && viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status distribution */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={16} className="text-accent-purple" /> Status-Verteilung
            </h3>
            {allStatuses.length === 0 ? (
              <p className="text-text-muted text-sm">Keine Episoden vorhanden</p>
            ) : (
              allStatuses.map(key => {
                const cfg = getStatusConfig(key);
                const count = episodes.filter(e => e.status === key).length;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`flex items-center gap-1.5 ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                      <span className="text-text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-obsidian-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cfg.bg}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Monthly distribution */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-blue" /> Episoden pro Monat ({calYear})
            </h3>
            {MONTH_NAMES.map((month, idx) => {
              const count = episodes.filter(e => {
                const d = e.publishDate || e.recordingDate || e.plannedDate;
                if (!d) return false;
                const date = new Date(d);
                return date.getFullYear() === calYear && date.getMonth() === idx;
              }).length;
              const maxCount = Math.max(...MONTH_NAMES.map((_, i) =>
                episodes.filter(e => {
                  const d = e.publishDate || e.recordingDate || e.plannedDate;
                  if (!d) return false;
                  const date = new Date(d);
                  return date.getFullYear() === calYear && date.getMonth() === i;
                }).length
              ), 1);
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-text-muted text-xs w-8">{month.slice(0, 3)}</span>
                  <div className="flex-1 h-2 bg-obsidian-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue/60 rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-text-secondary text-xs w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Episoden ohne Datum */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Clock size={16} className="text-text-muted" /> Episoden ohne Datum
            </h3>
            {episodes.filter(e => !e.publishDate && !e.recordingDate && !e.plannedDate).length === 0 ? (
              <p className="text-text-muted text-sm">Alle Episoden haben ein Datum ✓</p>
            ) : (
              episodes
                .filter(e => !e.publishDate && !e.recordingDate && !e.plannedDate)
                .map(ep => {
                  const sc = getStatusConfig(ep.status);
                  return (
                    <Link key={ep.id} to={`/episodes/${ep.id}`} className="flex items-center gap-3 p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <span className="text-text-primary text-sm truncate flex-1">{ep.title}</span>
                      <ArrowRight size={12} className="text-text-muted" />
                    </Link>
                  );
                })
            )}
          </div>

          {/* Podcast profile info */}
          {(podcastProfile.name || podcastProfile.author) && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Radio size={16} className="text-accent-purple" /> Podcast-Profil
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {podcastProfile.name && (
                  <div>
                    <p className="text-text-muted text-xs">Name</p>
                    <p className="text-text-primary text-sm font-medium">{podcastProfile.name}</p>
                  </div>
                )}
                {podcastProfile.author && (
                  <div>
                    <p className="text-text-muted text-xs">Autor</p>
                    <p className="text-text-primary text-sm">{podcastProfile.author}</p>
                  </div>
                )}
                {podcastProfile.category && (
                  <div>
                    <p className="text-text-muted text-xs">Kategorie</p>
                    <p className="text-text-primary text-sm">{podcastProfile.category}</p>
                  </div>
                )}
                {podcastProfile.language && (
                  <div>
                    <p className="text-text-muted text-xs">Sprache</p>
                    <p className="text-text-primary text-sm">{podcastProfile.language === 'de' ? 'Deutsch' : podcastProfile.language}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
