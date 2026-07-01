import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, List, Download, ChevronLeft, ChevronRight,
  Loader2, CheckSquare, Clock, Mic2, Filter
} from 'lucide-react';
import { episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

const STATUS_BADGE: Record<string, string> = {
  idee: 'bg-accent-cyan/20 text-accent-cyan',
  entwurf: 'bg-surface-overlay text-text-muted',
  aufnahme: 'bg-accent-orange/20 text-accent-orange',
  produktion: 'bg-accent-blue/20 text-accent-blue',
  geplant: 'bg-accent-purple/20 text-accent-purple',
  veroeffentlicht: 'bg-accent-green/20 text-accent-green',
  archiviert: 'bg-surface-overlay/50 text-text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  idee: 'Idee', entwurf: 'Entwurf', aufnahme: 'Aufnahme',
  produktion: 'Produktion', geplant: 'Geplant',
  veroeffentlicht: 'Veröffentlicht', archiviert: 'Archiviert',
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function EpisodeSchedulePage() {
  const { showError } = useApp();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    setIsLoading(true);
    try {
      // Load all episodes (large page size)
      const data = await episodesApi.list({ pageSize: 500 });
      setEpisodes(data.episodes || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter episodes that have a publish date or recording date
  const scheduledEpisodes = episodes.filter(ep => {
    const hasDate = ep.publishDate || ep.recordingDate;
    if (!hasDate) return false;
    if (statusFilter && ep.status !== statusFilter) return false;
    return true;
  });

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday-first
  };

  const getEpisodesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduledEpisodes.filter(ep => {
      const pub = ep.publishDate?.slice(0, 10);
      const rec = ep.recordingDate?.slice(0, 10);
      return pub === dateStr || rec === dateStr;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // List view: group by month
  const episodesByMonth = () => {
    const groups: Record<string, any[]> = {};
    const sorted = [...scheduledEpisodes].sort((a, b) => {
      const da = a.publishDate || a.recordingDate || '';
      const db = b.publishDate || b.recordingDate || '';
      return da.localeCompare(db);
    });
    for (const ep of sorted) {
      const dateStr = ep.publishDate || ep.recordingDate;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ep);
    }
    return groups;
  };

  const handleExportCSV = () => {
    const rows = [
      ['#', 'Titel', 'Status', 'Script fertig', 'Aufnahmedatum', 'Veröffentlichungsdatum', 'Dauer (Min)'],
      ...scheduledEpisodes.map(ep => [
        ep.number || '',
        ep.title || '',
        STATUS_LABELS[ep.status] || ep.status || '',
        ep.scriptReady ? 'Ja' : 'Nein',
        ep.recordingDate ? new Date(ep.recordingDate).toLocaleDateString('de-DE') : '',
        ep.publishDate ? new Date(ep.publishDate).toLocaleDateString('de-DE') : '',
        ep.duration ? Math.round(ep.duration / 60) : '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = pdfFileName ? pdfFileName.replace(/\.(csv|pdf)$/i, '') : 'episodenplanung';
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/episodes/schedule-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          episodes: scheduledEpisodes,
          month: viewMode === 'calendar' ? `${MONTH_NAMES[month]} ${year}` : null,
          title: pdfFileName || 'Episodenplanung',
        }),
      });
      if (!res.ok) throw new Error('PDF-Export fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '') : 'episodenplanung';
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/episodes" className="p-2 hover:bg-obsidian-800 rounded-lg text-text-muted transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Episodenplanung</h1>
            <p className="text-text-secondary text-sm mt-0.5">{scheduledEpisodes.length} geplante Episode{scheduledEpisodes.length !== 1 ? 'n' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status-Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select text-sm w-40"
          >
            <option value="">Alle Status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Dateiname */}
          <input
            type="text"
            value={pdfFileName}
            onChange={e => setPdfFileName(e.target.value)}
            placeholder="episodenplanung"
            className="input text-xs w-40"
            title="Dateiname für Export"
          />

          {/* CSV Export */}
          <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* PDF Export */}
          <button onClick={handleExportPDF} disabled={isExporting} className="btn-secondary flex items-center gap-2">
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* View Toggle */}
          <div className="flex bg-obsidian-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'}`}
              title="Kalenderansicht"
            >
              <Calendar size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'}`}
              title="Listenansicht"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-accent-purple" size={32} />
        </div>
      ) : viewMode === 'calendar' ? (
        /* ── Kalenderansicht ── */
        <div className="card">
          {/* Monat-Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-obsidian-800 rounded-lg text-text-muted transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-text-primary">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={goToToday} className="btn-ghost text-xs">Heute</button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-obsidian-800 rounded-lg text-text-muted transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Wochentag-Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-2">{d}</div>
            ))}
          </div>

          {/* Kalender-Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leere Zellen vor dem ersten Tag */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] rounded-lg" />
            ))}

            {/* Tage */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEpisodes = getEpisodesForDay(day);
              const today = new Date();
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

              return (
                <div
                  key={day}
                  className={`min-h-[80px] rounded-lg p-1.5 border transition-colors ${
                    isToday
                      ? 'border-accent-purple bg-accent-purple/5'
                      : dayEpisodes.length > 0
                      ? 'border-surface-border bg-obsidian-800'
                      : 'border-transparent hover:border-surface-border'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-accent-purple text-white' : 'text-text-muted'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEpisodes.map(ep => (
                      <Link
                        key={ep.id}
                        to={`/episodes/${ep.id}`}
                        className="block"
                      >
                        <div className={`text-xs px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity ${STATUS_BADGE[ep.status] || 'bg-surface-overlay text-text-muted'}`}>
                          <span className="flex items-center gap-1">
                            {ep.scriptReady && <CheckSquare size={8} className="flex-shrink-0" />}
                            <span className="truncate">{ep.number ? `#${ep.number} ` : ''}{ep.title}</span>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legende */}
          <div className="mt-6 pt-4 border-t border-surface-border flex flex-wrap gap-3">
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <span key={v} className={`badge text-xs ${STATUS_BADGE[v]}`}>{l}</span>
            ))}
            <span className="badge text-xs bg-accent-green/20 text-accent-green flex items-center gap-1">
              <CheckSquare size={10} /> Script fertig
            </span>
          </div>
        </div>
      ) : (
        /* ── Listenansicht ── */
        <div className="space-y-6">
          {Object.keys(episodesByMonth()).length === 0 ? (
            <div className="card text-center py-16">
              <Mic2 size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary font-medium">Keine geplanten Episoden gefunden</p>
              <p className="text-text-muted text-sm mt-1">Episoden mit Aufnahme- oder Veröffentlichungsdatum erscheinen hier.</p>
            </div>
          ) : (
            Object.entries(episodesByMonth()).map(([monthKey, eps]) => {
              const [y, m] = monthKey.split('-');
              const monthLabel = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
              return (
                <div key={monthKey} className="card">
                  <h3 className="section-title flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-accent-purple" />
                    {monthLabel}
                    <span className="text-text-muted text-sm font-normal">({eps.length} Episode{eps.length !== 1 ? 'n' : ''})</span>
                  </h3>
                  <div className="space-y-2">
                    {eps.map(ep => (
                      <Link
                        key={ep.id}
                        to={`/episodes/${ep.id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-raised transition-colors group"
                      >
                        {/* Nummer */}
                        <div className="w-10 h-10 bg-obsidian-800 rounded-lg flex items-center justify-center text-text-muted text-sm font-mono flex-shrink-0">
                          {ep.number ? `#${ep.number}` : <Mic2 size={14} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-text-primary font-medium truncate group-hover:text-accent-purple transition-colors">
                              {ep.title}
                            </span>
                            <span className={`badge text-xs ${STATUS_BADGE[ep.status] || 'bg-surface-overlay text-text-muted'}`}>
                              {STATUS_LABELS[ep.status] || ep.status}
                            </span>
                            {ep.scriptReady && (
                              <span className="badge text-xs bg-accent-green/20 text-accent-green flex items-center gap-1">
                                <CheckSquare size={10} /> Script ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-text-muted text-xs">
                            {ep.recordingDate && (
                              <span className="flex items-center gap-1">
                                <Mic2 size={10} />
                                Aufnahme: {new Date(ep.recordingDate).toLocaleDateString('de-DE')}
                              </span>
                            )}
                            {ep.publishDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                Veröffentl.: {new Date(ep.publishDate).toLocaleDateString('de-DE')}
                              </span>
                            )}
                            {ep.duration && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {Math.round(ep.duration / 60)} Min.
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
