import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Download, Calendar, Radio, FileText, RefreshCw,
} from 'lucide-react';
import { editorialApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const STATUS_COLORS: Record<string, string> = {
  entwurf: 'bg-obsidian-600 text-text-secondary',
  aufnahme: 'bg-yellow-500/20 text-yellow-400',
  schnitt: 'bg-accent-blue/20 text-accent-blue',
  fertig: 'bg-green-500/20 text-green-400',
  veroeffentlicht: 'bg-accent-purple/20 text-accent-purple',
  geplant: 'bg-orange-500/20 text-orange-400',
  in_produktion: 'bg-yellow-500/20 text-yellow-400',
};

export default function CalendarPage() {
  const { addToast } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const loadCalendar = async () => {
    setIsLoading(true);
    try {
      const data = await editorialApi.getCalendar(year, month);
      setCalendarData(data);
    } catch (err: any) {
      addToast('error', err.message || 'Kalender konnte nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const d = new Date(y, m - 1, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getItemsForDay = (day: number) => {
    if (!calendarData) return [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const episodes = (calendarData.episodes || []).filter((e: any) =>
      e.date && e.date.startsWith(dateStr)
    );
    const planEntries = (calendarData.planEntries || []).filter((p: any) =>
      p.date && p.date.startsWith(dateStr)
    );
    return [...episodes, ...planEntries];
  };

  const allItems = calendarData
    ? [...(calendarData.episodes || []), ...(calendarData.planEntries || [])]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Calendar size={24} className="text-accent-blue" />
            Redaktionskalender
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Übersicht aller Episoden und Redaktionsplan-Einträge
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-obsidian-600">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-accent-blue text-white' : 'bg-obsidian-800 text-text-secondary hover:text-text-primary'}`}
            >
              Monat
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'year' ? 'bg-accent-blue text-white' : 'bg-obsidian-800 text-text-secondary hover:text-text-primary'}`}
            >
              Jahr
            </button>
          </div>
          <button onClick={loadCalendar} className="btn-secondary text-sm" disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => editorialApi.downloadCalendarPdf(year, month)}
            className="btn-primary text-sm"
          >
            <Download size={14} />
            <span>PDF exportieren</span>
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-obsidian-800 rounded-xl p-4">
        <button onClick={prevMonth} className="p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <p className="text-text-muted text-sm">
            {allItems.length} Einträge
          </p>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-obsidian-700 rounded-lg transition-colors">
          <ChevronRight size={20} className="text-text-primary" />
        </button>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-obsidian-800 rounded-xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-obsidian-700">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-text-muted">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDay + 1;
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const isToday = isCurrentMonth && dayNum === today.getDate() &&
                  month === today.getMonth() + 1 && year === today.getFullYear();
                const items = isCurrentMonth ? getItemsForDay(dayNum) : [];

                return (
                  <div
                    key={i}
                    className={`min-h-[80px] p-1.5 border-b border-r border-obsidian-700 ${
                      !isCurrentMonth ? 'bg-obsidian-900/50' : 'hover:bg-obsidian-750'
                    }`}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                          isToday ? 'bg-accent-blue text-white' : 'text-text-secondary'
                        }`}>
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {items.slice(0, 3).map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className={`text-xs px-1 py-0.5 rounded truncate ${
                                item.type === 'episode'
                                  ? 'bg-accent-blue/20 text-accent-blue'
                                  : 'bg-accent-purple/20 text-accent-purple'
                              }`}
                              title={item.title}
                            >
                              {item.type === 'episode' ? '🎙' : '📋'} {item.title}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="text-xs text-text-muted px-1">+{items.length - 3} mehr</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: List view */}
          <div className="space-y-4">
            {/* Episodes */}
            <div className="bg-obsidian-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Radio size={14} className="text-accent-blue" />
                Episoden ({(calendarData?.episodes || []).length})
              </h3>
              {isLoading ? (
                <div className="text-text-muted text-sm text-center py-4">Lädt...</div>
              ) : (calendarData?.episodes || []).length === 0 ? (
                <div className="text-text-muted text-sm text-center py-4">Keine Episoden</div>
              ) : (
                <div className="space-y-2">
                  {(calendarData?.episodes || []).map((ep: any) => (
                    <Link
                      key={ep.id}
                      to={`/episodes/${ep.id}`}
                      className="block p-2 rounded-lg bg-obsidian-700 hover:bg-obsidian-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{ep.title}</p>
                          {ep.number && <p className="text-xs text-text-muted">Folge {ep.number}</p>}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[ep.status] || 'bg-obsidian-600 text-text-muted'}`}>
                          {ep.status}
                        </span>
                      </div>
                      {ep.date && (
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(ep.date).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Plan entries */}
            <div className="bg-obsidian-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <FileText size={14} className="text-accent-purple" />
                Redaktionsplan ({(calendarData?.planEntries || []).length})
              </h3>
              {isLoading ? (
                <div className="text-text-muted text-sm text-center py-4">Lädt...</div>
              ) : (calendarData?.planEntries || []).length === 0 ? (
                <div className="text-text-muted text-sm text-center py-4">Keine Einträge</div>
              ) : (
                <div className="space-y-2">
                  {(calendarData?.planEntries || []).map((entry: any) => (
                    <div key={entry.id} className="p-2 rounded-lg bg-obsidian-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{entry.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[entry.status] || 'bg-obsidian-600 text-text-muted'}`}>
                          {entry.status}
                        </span>
                      </div>
                      {entry.date && (
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(entry.date).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Year view */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MONTH_NAMES.map((name, idx) => {
            const m = idx + 1;
            const isCurrentMonth = m === today.getMonth() + 1 && year === today.getFullYear();
            return (
              <button
                key={m}
                onClick={() => { setMonth(m); setViewMode('month'); }}
                className={`p-4 rounded-xl text-left transition-colors ${
                  isCurrentMonth
                    ? 'bg-accent-blue/20 border border-accent-blue/40'
                    : 'bg-obsidian-800 hover:bg-obsidian-700'
                }`}
              >
                <p className={`font-semibold ${isCurrentMonth ? 'text-accent-blue' : 'text-text-primary'}`}>
                  {name}
                </p>
                <p className="text-text-muted text-sm">{year}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent-blue/20"></div>
          <span>Episode</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent-purple/20"></div>
          <span>Redaktionsplan</span>
        </div>
      </div>
    </div>
  );
}
