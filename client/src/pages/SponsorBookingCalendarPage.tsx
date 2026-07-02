import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock,
  Calendar, Filter, RefreshCw, Info, Megaphone, Tag, ExternalLink, Euro,
  Download, FileText, CalendarRange,
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';

// ─── Typen ────────────────────────────────────────────────────────────────────
interface EpisodeBooking {
  id: string; type: 'episode'; sponsorId: string; sponsorName: string;
  sponsorCompany?: string; sponsorColor: string; categoryName?: string;
  categoryColor: string; isExclusive: boolean; position: string;
  episodeId?: string; episodeTitle?: string; episodeNumber?: number;
  date?: string; confirmed: boolean; episodeStatus?: string;
}
interface SlotBooking {
  id: string; type: 'slot'; sponsorId: string; sponsorName: string;
  sponsorCompany?: string; sponsorColor: string; categoryName?: string;
  categoryColor: string; isExclusive: boolean; position?: string;
  startDate?: string; endDate?: string; label?: string; status?: string;
  basePrice?: number; pricePerEpisode?: number;
}
interface AdPlacement {
  id: string; type: 'placement'; sponsorId: string; sponsorName: string;
  sponsorCompany?: string; sponsorColor: string; categoryName?: string;
  categoryColor: string; isExclusive: boolean; position?: string;
  episodeId?: string; episodeTitle?: string; episodeNumber?: number;
  date?: string; slotName?: string; price?: number;
  invoiceStatus?: string; status?: string; notes?: string;
}
interface PlannedSlot {
  id: string; type: 'planned'; sponsorId: string; sponsorName: string;
  sponsorCompany?: string; sponsorColor: string; categoryName?: string;
  categoryColor: string; isExclusive: boolean; position?: string;
  startDate?: string; endDate?: string; label?: string; status?: string;
  basePrice?: number; pricePerEpisode?: number; notes?: string;
}
interface Conflict {
  type: string; date: string; categoryName: string;
  bookings: { id: string; sponsorName: string; episodeTitle?: string }[];
  message: string;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS_DE = ['Mo','Di','Mi','Do','Fr','Sa','So'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const positionLabels: Record<string, string> = {
  'pre-roll': 'Pre-Roll', 'mid-roll': 'Mid-Roll', 'post-roll': 'Post-Roll',
  'folgensponsor': 'Folgensponsor', 'sonderbuchung': 'Sonderbuchung',
};

const invoiceStatusColors: Record<string, string> = {
  'offen': 'bg-yellow-900/50 text-yellow-400',
  'versendet': 'bg-blue-900/50 text-blue-400',
  'bezahlt': 'bg-green-900/50 text-green-400',
  'storniert': 'bg-gray-700 text-gray-400',
  'geplant': 'bg-amber-900/50 text-amber-400',
};

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function SponsorBookingCalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [episodeBookings, setEpisodeBookings] = useState<EpisodeBooking[]>([]);
  const [slotBookings, setSlotBookings] = useState<SlotBooking[]>([]);
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([]);
  const [plannedSlots, setPlannedSlots] = useState<PlannedSlot[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterSponsor, setFilterSponsor] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showPlanned, setShowPlanned] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Alle Sponsoren für Filter
  const allSponsors = Array.from(new Set([
    ...episodeBookings.map(b => b.sponsorName),
    ...slotBookings.map(b => b.sponsorName),
    ...adPlacements.map(p => p.sponsorName),
    ...plannedSlots.map(p => p.sponsorName),
  ])).sort();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firstDay = toIso(year, month, 1);
      const lastDay = toIso(year, month, getDaysInMonth(year, month));
      const res = await sponsorsApi.getBookingCalendar({ from: firstDay, to: lastDay });
      setEpisodeBookings(res.data?.episodeBookings || []);
      setSlotBookings(res.data?.slotBookings || []);
      setAdPlacements(res.data?.adPlacements || []);
      setPlannedSlots(res.data?.plannedSlots || []);
      setConflicts(res.data?.conflicts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Navigation
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // CSV Export
  const handleExportCsv = () => {
    const from = toIso(year, month, 1);
    const to = toIso(year, month, getDaysInMonth(year, month));
    const url = sponsorsApi.exportBookingCalendarCsv({ from, to });
    const a = document.createElement('a');
    a.href = url;
    a.download = `buchungskalender_${MONTHS_DE[month]}_${year}.csv`;
    a.click();
  };

  // Buchungen für einen Tag filtern
  const getBookingsForDay = (dateStr: string) => {
    let ep = episodeBookings.filter(b => b.date === dateStr);
    let sl = slotBookings.filter(b => b.startDate && b.endDate && dateStr >= b.startDate && dateStr <= b.endDate);
    let pl = adPlacements.filter(p => p.date === dateStr);
    let ps = showPlanned ? plannedSlots.filter(p =>
      p.startDate && p.endDate && dateStr >= p.startDate && dateStr <= p.endDate
    ) : [];
    if (filterSponsor) {
      ep = ep.filter(b => b.sponsorName === filterSponsor);
      sl = sl.filter(b => b.sponsorName === filterSponsor);
      pl = pl.filter(p => p.sponsorName === filterSponsor);
      ps = ps.filter(p => p.sponsorName === filterSponsor);
    }
    if (filterPosition) {
      ep = ep.filter(b => b.position === filterPosition);
      sl = sl.filter(b => b.position === filterPosition);
      pl = pl.filter(p => p.position === filterPosition);
      ps = ps.filter(p => p.position === filterPosition);
    }
    return { ep, sl, pl, ps };
  };

  // Placements ohne Datum: im aktuellen Monat anzeigen
  const undatedPlacements = adPlacements.filter(p => !p.date);
  // Vorplanungen ohne Datum
  const undatedPlanned = plannedSlots.filter(p => !p.startDate && !p.endDate);

  const hasConflict = (dateStr: string) => conflicts.some(c => c.date === dateStr);

  // Kalender-Grid aufbauen
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Detail-Panel für ausgewählten Tag
  const selectedBookings = selectedDay ? getBookingsForDay(selectedDay) : null;
  const selectedConflicts = selectedDay ? conflicts.filter(c => c.date === selectedDay) : [];

  const totalBookings = episodeBookings.length + slotBookings.length + adPlacements.length;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <Calendar size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Buchungskalender</h1>
          {conflicts.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded-full border border-red-700">
              <AlertTriangle size={12} /> {conflicts.length} Konflikt{conflicts.length !== 1 ? 'e' : ''}
            </span>
          )}
          {plannedSlots.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700">
              <Clock size={12} /> {plannedSlots.length} Vorplanung{plannedSlots.length !== 1 ? 'en' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
            title="Als CSV exportieren"
          >
            <Download size={13} />
            CSV Export
          </button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Aktualisieren">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/sponsors')} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            ← Sponsoring
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Kalender-Bereich */}
        <div className="flex-1 flex flex-col overflow-auto p-4">
          {/* Monat-Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {MONTHS_DE[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Filter-Zeile */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Filter size={14} className="text-gray-500" />
            <select
              value={filterSponsor}
              onChange={e => setFilterSponsor(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              <option value="">Alle Sponsoren</option>
              {allSponsors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              <option value="">Alle Positionen</option>
              {Object.entries(positionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={showConflictsOnly} onChange={e => setShowConflictsOnly(e.target.checked)} className="rounded" />
              Nur Konflikte
            </label>
            <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer">
              <input type="checkbox" checked={showPlanned} onChange={e => setShowPlanned(e.target.checked)} className="rounded" />
              Vorplanungen anzeigen
            </label>
            {(filterSponsor || filterPosition || showConflictsOnly) && (
              <button onClick={() => { setFilterSponsor(''); setFilterPosition(''); setShowConflictsOnly(false); }}
                className="text-xs text-purple-400 hover:text-purple-300">Filter zurücksetzen</button>
            )}
          </div>

          {/* Wochentage-Header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_DE.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Kalender-Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <RefreshCw size={24} className="animate-spin mr-2" /> Lade Buchungen…
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDay + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                  return <div key={i} className="min-h-[80px] bg-gray-900/30 rounded-lg" />;
                }
                const dateStr = toIso(year, month, dayNum);
                const { ep, sl, pl, ps } = getBookingsForDay(dateStr);
                const isConflict = hasConflict(dateStr);
                const isToday = dateStr === today.toISOString().split('T')[0];
                const isSelected = dateStr === selectedDay;
                const hasBookings = ep.length > 0 || sl.length > 0 || pl.length > 0 || ps.length > 0;
                if (showConflictsOnly && !isConflict) {
                  return <div key={i} className="min-h-[80px] bg-gray-900/20 rounded-lg opacity-30" />;
                }

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`min-h-[80px] rounded-lg p-1.5 cursor-pointer transition-all border ${
                      isSelected ? 'border-purple-500 bg-purple-900/20' :
                      isConflict ? 'border-red-700 bg-red-900/10' :
                      hasBookings ? 'border-gray-700 bg-gray-800/50 hover:border-purple-600' :
                      'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${
                      isToday ? 'text-purple-400' : 'text-gray-400'
                    }`}>
                      <span className={isToday ? 'bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]' : ''}>
                        {dayNum}
                      </span>
                      {isConflict && <AlertTriangle size={10} className="text-red-400" />}
                    </div>
                    <div className="space-y-0.5">
                      {ep.slice(0, 2).map(b => (
                        <div key={b.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate"
                          style={{ backgroundColor: b.sponsorColor + '30', borderLeft: `2px solid ${b.sponsorColor}` }}>
                          <span className="truncate font-medium" style={{ color: b.sponsorColor }}>{b.sponsorName}</span>
                        </div>
                      ))}
                      {sl.slice(0, 1).map(b => (
                        <div key={b.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate"
                          style={{ backgroundColor: b.sponsorColor + '20', borderLeft: `2px dashed ${b.sponsorColor}` }}>
                          <span className="truncate text-gray-400">{b.sponsorName}</span>
                        </div>
                      ))}
                      {pl.slice(0, 2).map(p => (
                        <div key={p.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate"
                          style={{ backgroundColor: p.sponsorColor + '25', borderLeft: `2px dotted ${p.sponsorColor}` }}>
                          <span className="truncate" style={{ color: p.sponsorColor }}>● {p.sponsorName}</span>
                        </div>
                      ))}
                      {ps.slice(0, 1).map(p => (
                        <div key={p.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate"
                          style={{ backgroundColor: '#f59e0b20', borderLeft: `2px dashed #f59e0b` }}>
                          <span className="truncate text-amber-400">◷ {p.sponsorName}</span>
                        </div>
                      ))}
                      {(ep.length + sl.length + pl.length + ps.length) > 5 && (
                        <div className="text-[9px] text-gray-500 pl-1">+{ep.length + sl.length + pl.length + ps.length - 5} weitere</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Undatierte Einträge */}
          {(undatedPlacements.length > 0 || undatedPlanned.length > 0) && (
            <div className="mt-4 p-3 bg-amber-900/15 border border-amber-700/50 rounded-lg">
              <div className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1">
                <Clock size={12} /> Vorplanungen & Buchungen ohne Datum
                <span className="ml-auto text-[10px] text-amber-500/70 font-normal">Im Kalender nicht sichtbar</span>
              </div>
              <div className="space-y-1.5">
                {undatedPlanned.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 rounded px-2 py-1.5">
                    <span className="text-amber-400">◷</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.sponsorName}</span>
                      {p.label && <span className="text-amber-500/70 ml-1">– {p.label}</span>}
                    </div>
                    {(p.basePrice || p.pricePerEpisode) && (
                      <span className="text-[10px] text-amber-400 shrink-0">{(p.basePrice || p.pricePerEpisode || 0).toFixed(2)} €</span>
                    )}
                  </div>
                ))}
                {undatedPlacements.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-green-300 bg-green-900/20 rounded px-2 py-1.5">
                    <span style={{ color: p.sponsorColor }}>●</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white">{p.sponsorName}</span>
                      {p.slotName && <span className="text-gray-400 ml-1">– {p.slotName}</span>}
                    </div>
                    <span className="text-[10px] text-green-400 shrink-0">{p.price?.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-amber-600/70">
                Tipp: Laufzeit-Datum im Werbeplatz eintragen, damit Vorplanungen im Kalender erscheinen.
              </div>
            </div>
          )}

          {/* Legende */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-l-2 border-purple-500 bg-purple-500/20" />
              Episodenbuchung
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-l-2 border-dashed border-purple-500 bg-purple-500/10" />
              Zeitraum-Buchung
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-l-2 border-dotted border-green-500 bg-green-500/10" />
              Werbeplatz-Buchung
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-l-2 border-dashed border-amber-500 bg-amber-500/10" />
              Vorplanung
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-red-700 bg-red-900/20" />
              Konflikt
            </div>
          </div>
        </div>

        {/* Detail-Panel */}
        <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-y-auto flex-shrink-0">
          {selectedDay ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
              </div>

              {/* Konflikte */}
              {selectedConflicts.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
                    <AlertTriangle size={14} /> Konflikte
                  </div>
                  {selectedConflicts.map((c, i) => (
                    <div key={i} className="text-xs text-red-300 mb-1">{c.message}</div>
                  ))}
                </div>
              )}

              {/* Episodenbuchungen */}
              {selectedBookings && selectedBookings.ep.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Episodenbuchungen</h4>
                  <div className="space-y-2">
                    {selectedBookings.ep.map(b => (
                      <div key={b.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/50"
                        style={{ borderLeftColor: b.sponsorColor, borderLeftWidth: 3 }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white">{b.sponsorName}</span>
                          {b.confirmed ? (
                            <span className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle size={10} /> Bestätigt</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-yellow-400"><Clock size={10} /> Ausstehend</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {b.episodeTitle && (
                            <div className="flex items-center gap-1">
                              <Megaphone size={10} />
                              <button onClick={() => b.episodeId && navigate(`/episodes/${b.episodeId}`)}
                                className="hover:text-purple-400 transition-colors truncate max-w-[180px]">
                                {b.episodeNumber ? `#${b.episodeNumber} ` : ''}{b.episodeTitle}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Tag size={10} />
                            {positionLabels[b.position] || b.position}
                            {b.isExclusive && <span className="ml-1 text-[9px] bg-yellow-900/50 text-yellow-400 px-1 rounded">Exklusiv</span>}
                          </div>
                          {b.categoryName && <div className="text-gray-500">{b.categoryName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zeitraum-Buchungen */}
              {selectedBookings && selectedBookings.sl.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Zeitraum-Buchungen</h4>
                  <div className="space-y-2">
                    {selectedBookings.sl.map(b => (
                      <div key={b.id} className="p-3 rounded-lg border border-dashed border-gray-700 bg-gray-800/30"
                        style={{ borderLeftColor: b.sponsorColor, borderLeftWidth: 3, borderLeftStyle: 'solid' }}>
                        <div className="font-semibold text-sm text-white mb-1">{b.sponsorName}</div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {b.label && <div>{b.label}</div>}
                          {b.categoryName && <div className="flex items-center gap-1"><Tag size={10} />{b.categoryName}</div>}
                          {b.startDate && b.endDate && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <CalendarRange size={10} />
                              {new Date(b.startDate + 'T12:00:00').toLocaleDateString('de-DE')} – {new Date(b.endDate + 'T12:00:00').toLocaleDateString('de-DE')}
                            </div>
                          )}
                          {b.status && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              b.status === 'aktiv' ? 'bg-green-900/50 text-green-400' :
                              b.status === 'angefragt' ? 'bg-yellow-900/50 text-yellow-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>{b.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Werbeplatz-Buchungen (ad_placements) */}
              {selectedBookings && selectedBookings.pl.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Werbeplatz-Buchungen</h4>
                  <div className="space-y-2">
                    {selectedBookings.pl.map(p => (
                      <div key={p.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/50"
                        style={{ borderLeftColor: p.sponsorColor, borderLeftWidth: 3 }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white">{p.sponsorName}</span>
                          {p.price != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                              <Euro size={9} />{p.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {p.slotName && <div className="text-gray-300 font-medium">{p.slotName}</div>}
                          {p.episodeTitle && (
                            <div className="flex items-center gap-1">
                              <Megaphone size={10} />
                              <button onClick={() => p.episodeId && navigate(`/episodes/${p.episodeId}`)}
                                className="hover:text-purple-400 transition-colors truncate max-w-[180px]">
                                {p.episodeNumber ? `#${p.episodeNumber} ` : ''}{p.episodeTitle}
                              </button>
                            </div>
                          )}
                          {!p.episodeTitle && <div className="text-gray-500 italic">Zeitraum-Buchung</div>}
                          <div className="flex items-center gap-1">
                            <Tag size={10} />
                            {positionLabels[p.position || ''] || p.position || 'Pre-Roll'}
                          </div>
                          {p.invoiceStatus && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${invoiceStatusColors[p.invoiceStatus] || 'bg-gray-700 text-gray-400'}`}>
                              {p.invoiceStatus}
                            </span>
                          )}
                          {p.notes && <div className="text-gray-500 text-[10px] mt-1 italic">{p.notes}</div>}
                        </div>
                        <button
                          onClick={() => navigate(`/sponsors/${p.sponsorId}`)}
                          className="mt-2 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink size={9} /> Sponsor öffnen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vorplanungen */}
              {selectedBookings && selectedBookings.ps.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Vorplanungen</h4>
                  <div className="space-y-2">
                    {selectedBookings.ps.map(p => (
                      <div key={p.id} className="p-3 rounded-lg border border-dashed border-amber-700/50 bg-amber-900/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white">{p.sponsorName}</span>
                          <span className="text-[10px] text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded-full">Geplant</span>
                        </div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {p.label && <div className="text-amber-300/80">{p.label}</div>}
                          {p.categoryName && <div className="flex items-center gap-1"><Tag size={10} />{p.categoryName}</div>}
                          {p.startDate && p.endDate && (
                            <div className="flex items-center gap-1 text-amber-500/70">
                              <CalendarRange size={10} />
                              {new Date(p.startDate + 'T12:00:00').toLocaleDateString('de-DE')} – {new Date(p.endDate + 'T12:00:00').toLocaleDateString('de-DE')}
                            </div>
                          )}
                          {(p.basePrice || p.pricePerEpisode) && (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              <Euro size={9} />{(p.basePrice || p.pricePerEpisode || 0).toFixed(2)} (geplant)
                            </div>
                          )}
                          {p.notes && <div className="text-gray-500 text-[10px] italic">{p.notes}</div>}
                        </div>
                        <button
                          onClick={() => navigate(`/sponsors/${p.sponsorId}`)}
                          className="mt-2 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink size={9} /> Sponsor öffnen & buchen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBookings && selectedBookings.ep.length === 0 && selectedBookings.sl.length === 0 && selectedBookings.pl.length === 0 && selectedBookings.ps.length === 0 && (
                <div className="text-center text-gray-500 py-8 text-sm">
                  <Calendar size={24} className="mx-auto mb-2 opacity-40" />
                  Keine Buchungen an diesem Tag
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Monats-Zusammenfassung */}
              <h3 className="font-semibold text-white mb-4">Monatsübersicht</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-white">{totalBookings + plannedSlots.length}</div>
                  <div className="text-xs text-gray-400">Einträge gesamt</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-purple-400">{episodeBookings.length}</div>
                    <div className="text-xs text-gray-400">Episodenbuchungen</div>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-blue-400">{slotBookings.length}</div>
                    <div className="text-xs text-gray-400">Zeitraum-Buchungen</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-green-400">{adPlacements.length}</div>
                    <div className="text-xs text-gray-400">Werbeplatz-Buchungen</div>
                  </div>
                  <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                    <div className="text-lg font-bold text-amber-400">{plannedSlots.length}</div>
                    <div className="text-xs text-amber-500">Vorplanungen</div>
                  </div>
                </div>
                {adPlacements.length > 0 && (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-green-300">
                      {adPlacements.filter(p => p.price).reduce((sum, p) => sum + (p.price || 0), 0).toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-400">Umsatz Werbeplätze</div>
                  </div>
                )}
                {conflicts.length > 0 && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <div className="text-lg font-bold text-red-400">{conflicts.length}</div>
                    <div className="text-xs text-red-300">Konflikte erkannt</div>
                  </div>
                )}
              </div>

              {/* Vorplanungen-Liste */}
              {plannedSlots.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock size={12} /> Offene Vorplanungen
                  </h4>
                  <div className="space-y-2">
                    {plannedSlots.slice(0, 5).map(p => (
                      <div key={p.id} className="p-2 bg-amber-900/10 border border-amber-700/40 rounded-lg cursor-pointer hover:border-amber-600"
                        onClick={() => navigate(`/sponsors/${p.sponsorId}`)}>
                        <div className="text-xs text-amber-300 font-medium">{p.sponsorName}</div>
                        <div className="text-[11px] text-amber-500/80 mt-0.5">{p.label}</div>
                        {p.startDate && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(p.startDate + 'T12:00:00').toLocaleDateString('de-DE')} – {p.endDate ? new Date(p.endDate + 'T12:00:00').toLocaleDateString('de-DE') : '?'}
                          </div>
                        )}
                      </div>
                    ))}
                    {plannedSlots.length > 5 && (
                      <div className="text-[11px] text-gray-500 pl-1">+{plannedSlots.length - 5} weitere Vorplanungen</div>
                    )}
                  </div>
                </div>
              )}

              {/* Konflikte-Liste */}
              {conflicts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Konflikte
                  </h4>
                  <div className="space-y-2">
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-2 bg-red-900/20 border border-red-800 rounded-lg cursor-pointer hover:border-red-600"
                        onClick={() => setSelectedDay(c.date)}>
                        <div className="text-xs text-red-300 font-medium">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('de-DE')}
                        </div>
                        <div className="text-[11px] text-red-400 mt-0.5">{c.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export-Bereich */}
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1">
                  <Download size={12} /> Export
                </div>
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <FileText size={12} />
                  CSV für {MONTHS_DE[month]} {year}
                </button>
              </div>

              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Info size={12} />
                  Klicke auf einen Tag um Details zu sehen.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
