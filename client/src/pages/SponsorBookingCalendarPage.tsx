import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock,
  Calendar, Filter, RefreshCw, Info, Megaphone, Tag, ExternalLink, Euro,
  Download, FileText, CalendarRange,
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { sponsorsV2Api } from '../lib/api-v2';

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
interface V2Contract {
  id: string; type: 'contract'; sponsorId: string; sponsorName: string;
  sponsorCompany?: string; sponsorColor: string;
  startDate?: string; endDate?: string;
  contactPerson?: string; contactEmail?: string;
  status?: string; notes?: string;
}
interface V2Booking {
  id: string; type: 'v2booking'; sponsorId: string; sponsorName: string;
  sponsorColor: string; slotName?: string; position?: string;
  date?: string; endDate?: string; episodeTitle?: string;
  price?: number; finalPrice?: number; invoiceStatus?: string; status?: string;
  basePrice?: number; pricePerEpisode?: number; pricePer1000?: number;
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
  const [v2Contracts, setV2Contracts] = useState<V2Contract[]>([]);
  const [v2Bookings, setV2Bookings] = useState<V2Booking[]>([]);
  const [showContracts, setShowContracts] = useState(true);
  const [showV2Bookings, setShowV2Bookings] = useState(true);

  // Alle Sponsoren für Filter
  const allSponsors = Array.from(new Set([
    ...episodeBookings.map(b => b.sponsorName),
    ...slotBookings.map(b => b.sponsorName),
    ...adPlacements.map(p => p.sponsorName),
    ...plannedSlots.map(p => p.sponsorName),
    ...v2Contracts.map(c => c.sponsorName),
    ...v2Bookings.map(b => b.sponsorName),
  ])).sort();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firstDay = toIso(year, month, 1);
      const lastDay = toIso(year, month, getDaysInMonth(year, month));
      const [res, v2Res] = await Promise.all([
        sponsorsApi.getBookingCalendar({ from: firstDay, to: lastDay }),
        sponsorsV2Api.getBookingCalendar({ from: firstDay, to: lastDay }),
      ]);
      setEpisodeBookings(res.data?.episodeBookings || []);
      setSlotBookings(res.data?.slotBookings || []);
      setAdPlacements(res.data?.adPlacements || []);
      setPlannedSlots(res.data?.plannedSlots || []);
      setConflicts(res.data?.conflicts || []);
      // v2.12.0: Verträge und neue Buchungen
      setV2Contracts((v2Res as any)?.data?.contracts || []);
      setV2Bookings((v2Res as any)?.data?.bookings || []);
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
    // v2.12.0: Verträge (Laufzeit)
    let ct: V2Contract[] = [];
    if (showContracts) {
      ct = v2Contracts.filter(c => {
        if (!c.startDate || !c.endDate) return false;
        return dateStr >= c.startDate && dateStr <= c.endDate;
      });
    }
    // v2.12.0: Neue Buchungen (Laufzeit)
    let v2b: V2Booking[] = [];
    if (showV2Bookings) {
      v2b = v2Bookings.filter(b => {
        if (b.date && b.endDate) return dateStr >= b.date && dateStr <= b.endDate;
        if (b.date) return b.date === dateStr;
        return false;
      });
    }
    // BUGFIX v2.11.11: Vorplanungen mit verbesserter Logik
    let ps: PlannedSlot[] = [];
    if (showPlanned && plannedSlots.length > 0) {
      ps = plannedSlots.filter(p => {
        // Slots ohne Daten werden nicht angezeigt
        if (!p.startDate && !p.endDate) return false;
        if (!p.startDate || !p.endDate) return false;
        
        // Normalisiere zu ISO-Format
        const normalize = (d: any) => {
          if (!d) return null;
          const str = String(d);
          // Wenn bereits ISO-Format, nutze es
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
          // Versuche zu parsen
          const date = new Date(str);
          if (!isNaN(date.getTime())) {
            return date.toISOString().substring(0, 10);
          }
          return null;
        };
        
        const pStart = normalize(p.startDate);
        const pEnd = normalize(p.endDate);
        const date = normalize(dateStr);
        
        if (!pStart || !pEnd || !date) return false;
        
        // Zeige wenn date zwischen start und end liegt
        return date >= pStart && date <= pEnd;
      });
    }
    if (filterSponsor) {
      ep = ep.filter(b => b.sponsorName === filterSponsor);
      sl = sl.filter(b => b.sponsorName === filterSponsor);
      pl = pl.filter(p => p.sponsorName === filterSponsor);
      ps = ps.filter(p => p.sponsorName === filterSponsor);
      ct = ct.filter(c => c.sponsorName === filterSponsor);
      v2b = v2b.filter(b => b.sponsorName === filterSponsor);
    }
    if (filterPosition) {
      ep = ep.filter(b => b.position === filterPosition);
      sl = sl.filter(b => b.position === filterPosition);
      pl = pl.filter(p => p.position === filterPosition);
      ps = ps.filter(p => p.position === filterPosition);
      v2b = v2b.filter(b => b.position === filterPosition);
    }
    return { ep, sl, pl, ps, ct, v2b };
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
                const { ep, sl, pl, ps, ct, v2b } = getBookingsForDay(dateStr);
                const isConflict = hasConflict(dateStr);
                const isToday = dateStr === today.toISOString().split('T')[0];
                const isSelected = dateStr === selectedDay;
                const hasBookings = ep.length > 0 || sl.length > 0 || pl.length > 0 || ps.length > 0 || ct.length > 0 || v2b.length > 0;
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
                      {ct.slice(0, 1).map(c => (
                        <div key={c.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate"
                          style={{ backgroundColor: (c.sponsorColor || '#7c3aed') + '15', borderLeft: `2px solid ${c.sponsorColor || '#7c3aed'}`, borderStyle: 'double' }}>
                          <span className="truncate text-purple-300">≡ {c.sponsorName}</span>
                        </div>
                      ))}
                      {v2b.slice(0, 2).map(b => {
                        // Preismodell ableiten
                        const priceLabel = b.pricePerEpisode ? 'Folge' : b.pricePer1000 ? 'CPM' : b.basePrice ? 'Basis' : null;
                        return (
                          <div key={b.id} className="text-[10px] rounded px-1 py-0.5 truncate"
                            style={{ backgroundColor: (b.sponsorColor || '#7c3aed') + '25', borderLeft: `3px solid ${b.sponsorColor || '#7c3aed'}` }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-medium" style={{ color: b.sponsorColor || '#a78bfa' }}>● {b.sponsorName}</span>
                              {priceLabel && <span className="text-[9px] text-violet-400 shrink-0">{priceLabel}</span>}
                            </div>
                            {b.slotName && <div className="truncate text-gray-400 text-[9px]">{b.slotName}</div>}
                          </div>
                        );
                      })}
                      {(ep.length + sl.length + pl.length + ps.length + ct.length + v2b.length) > 5 && (
                        <div className="text-[9px] text-gray-500 pl-1">+{ep.length + sl.length + pl.length + ps.length + ct.length + v2b.length - 5} weitere</div>
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

              {/* v2.12.0 Verträge */}
              {selectedBookings && selectedBookings.ct.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText size={11} /> Verträge (v2.12.0)
                  </h4>
                  <div className="space-y-2">
                    {selectedBookings.ct.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-double border-purple-700/60 bg-purple-900/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white">{c.sponsorName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            c.status === 'aktiv' ? 'bg-green-900/40 text-green-400 border border-green-700/40' :
                            c.status === 'abgelaufen' ? 'bg-gray-700 text-gray-400' :
                            'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40'
                          }`}>{c.status || 'Vertrag'}</span>
                        </div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {c.sponsorCompany && <div className="text-gray-300">{c.sponsorCompany}</div>}
                          {c.startDate && c.endDate && (
                            <div className="flex items-center gap-1 text-purple-400/80">
                              <CalendarRange size={10} />
                              {new Date(c.startDate + 'T12:00:00').toLocaleDateString('de-DE')} – {new Date(c.endDate + 'T12:00:00').toLocaleDateString('de-DE')}
                            </div>
                          )}
                          {c.contactPerson && <div className="text-gray-400">{c.contactPerson}{c.contactEmail && ` · ${c.contactEmail}`}</div>}
                          {c.notes && <div className="text-gray-500 text-[10px] italic">{c.notes}</div>}
                        </div>
                        <button onClick={() => navigate(`/sponsors/${c.sponsorId}`)} className="mt-2 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300">
                          <ExternalLink size={9} /> Sponsor öffnen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* v2.12.0 Buchungen */}
              {selectedBookings && selectedBookings.v2b.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Megaphone size={11} /> Buchungen v2.12.0
                  </h4>
                  <div className="space-y-2">
                    {selectedBookings.v2b.map(b => {
                      // Preismodell ableiten
                      const priceModel = b.pricePerEpisode ? 'Pro Folge' : b.pricePer1000 ? 'CPM (pro 1.000 Hörer)' : b.basePrice ? 'Basis-Preis' : null;
                      const displayPrice = b.finalPrice || b.price || 0;
                      // Laufzeit in Tagen berechnen
                      let durationDays: number | null = null;
                      if (b.date && b.endDate) {
                        const start = new Date(b.date + 'T12:00:00');
                        const end = new Date(b.endDate + 'T12:00:00');
                        durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      }
                      return (
                        <div key={b.id} className="p-3 rounded-lg border border-violet-700/50 bg-violet-900/10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-white">{b.sponsorName}</span>
                            <div className="flex items-center gap-1">
                              {b.status && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                  b.status === 'bestätigt' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                                  b.status === 'ausgestrahlt' ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                                  'bg-yellow-900/30 text-yellow-400 border-yellow-700/40'
                                }`}>{b.status}</span>
                              )}
                              <a href={`/api/sponsors/v2/bookings/${b.id}/confirmation-pdf`} target="_blank" rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-violet-300 rounded transition-colors" title="Bestätigung als PDF">
                                <FileText size={11} />
                              </a>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            {b.slotName && (
                              <div className="flex items-center gap-1.5">
                                <Tag size={10} className="text-violet-400 shrink-0" />
                                <span className="text-violet-300">{b.slotName}</span>
                                {b.position && <span className="text-gray-500">· {b.position}</span>}
                              </div>
                            )}
                            {b.date && (
                              <div className="flex items-center gap-1 text-violet-400/80">
                                <CalendarRange size={10} />
                                {new Date(b.date + 'T12:00:00').toLocaleDateString('de-DE')}
                                {b.endDate && <> – {new Date(b.endDate + 'T12:00:00').toLocaleDateString('de-DE')}</>}
                                {durationDays && <span className="text-gray-500 ml-1">({durationDays} Tage)</span>}
                              </div>
                            )}
                            {priceModel && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 border border-violet-700/50 text-violet-300">
                                  {priceModel}
                                </span>
                              </div>
                            )}
                            {displayPrice > 0 && (
                              <div className="flex items-center gap-0.5 text-green-400 font-medium">
                                <Euro size={10} />{displayPrice.toFixed(2)}
                                {b.invoiceStatus && (
                                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                                    b.invoiceStatus === 'bezahlt' ? 'bg-green-900/30 text-green-400' :
                                    b.invoiceStatus === 'versendet' ? 'bg-blue-900/30 text-blue-400' :
                                    'bg-gray-700/50 text-gray-400'
                                  }`}>{b.invoiceStatus}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <button onClick={() => navigate(`/sponsors/${b.sponsorId}`)} className="mt-2 flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300">
                            <ExternalLink size={9} /> Sponsor öffnen
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBookings && selectedBookings.ep.length === 0 && selectedBookings.sl.length === 0 && selectedBookings.pl.length === 0 && selectedBookings.ps.length === 0 && selectedBookings.ct.length === 0 && selectedBookings.v2b.length === 0 && (
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
                  <div className="text-2xl font-bold text-white">{totalBookings + plannedSlots.length + v2Contracts.length + v2Bookings.length}</div>
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
                {(v2Contracts.length > 0 || v2Bookings.length > 0) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                        <div className="text-lg font-bold text-purple-400">{v2Contracts.length}</div>
                        <div className="text-xs text-purple-500">Verträge (v2)</div>
                      </div>
                      <div className="p-3 bg-violet-900/20 border border-violet-700/50 rounded-lg">
                        <div className="text-lg font-bold text-violet-400">{v2Bookings.length}</div>
                        <div className="text-xs text-violet-500">Buchungen (v2)</div>
                      </div>
                    </div>
                    {v2Bookings.length > 0 && (() => {
                      const v2Revenue = v2Bookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
                      return v2Revenue > 0 ? (
                        <div className="p-3 bg-violet-900/20 border border-violet-700/50 rounded-lg">
                          <div className="text-lg font-bold text-violet-300">
                            {v2Revenue.toFixed(2)} €
                          </div>
                          <div className="text-xs text-violet-400">Umsatz Buchungen (v2)</div>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
                {conflicts.length > 0 && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <div className="text-lg font-bold text-red-400">{conflicts.length}</div>
                    <div className="text-xs text-red-300">Konflikte erkannt</div>
                  </div>
                )}
              </div>

              {/* v2.12.0 Verträge-Liste */}
              {v2Contracts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText size={12} /> Aktive Verträge (v2.12.0)
                  </h4>
                  <div className="space-y-2">
                    {v2Contracts.slice(0, 5).map(c => (
                      <div key={c.id} className="p-2 bg-purple-900/10 border border-purple-700/40 rounded-lg cursor-pointer hover:border-purple-600"
                        onClick={() => navigate(`/sponsors/${c.sponsorId}`)}>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-purple-300 font-medium">{c.sponsorName}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            c.status === 'aktiv' ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                          }`}>{c.status || '–'}</span>
                        </div>
                        {c.startDate && c.endDate && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(c.startDate + 'T12:00:00').toLocaleDateString('de-DE')} – {new Date(c.endDate + 'T12:00:00').toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </div>
                    ))}
                    {v2Contracts.length > 5 && (
                      <div className="text-[11px] text-gray-500 pl-1">+{v2Contracts.length - 5} weitere Verträge</div>
                    )}
                  </div>
                </div>
              )}

              {/* v2-Buchungen-Liste */}
              {v2Bookings.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Megaphone size={12} /> Buchungen diesen Monat (v2)
                  </h4>
                  <div className="space-y-2">
                    {v2Bookings.slice(0, 5).map(b => {
                      const priceLabel = b.pricePerEpisode ? 'Folge' : b.pricePer1000 ? 'CPM' : b.basePrice ? 'Basis' : null;
                      const displayPrice = b.finalPrice || b.price || 0;
                      return (
                        <div key={b.id} className="p-2 bg-violet-900/10 border border-violet-700/40 rounded-lg cursor-pointer hover:border-violet-600"
                          onClick={() => navigate(`/sponsors/${b.sponsorId}`)}>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-violet-300 font-medium truncate">{b.sponsorName}</div>
                            <div className="flex items-center gap-1 shrink-0">
                              {priceLabel && <span className="text-[9px] text-violet-500">{priceLabel}</span>}
                              {b.status && (
                                <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                                  b.status === 'bestätigt' ? 'bg-green-900/30 text-green-400' :
                                  b.status === 'ausgestrahlt' ? 'bg-blue-900/30 text-blue-400' :
                                  'bg-yellow-900/30 text-yellow-400'
                                }`}>{b.status}</span>
                              )}
                            </div>
                          </div>
                          {b.slotName && <div className="text-[10px] text-violet-400/70 mt-0.5 truncate">{b.slotName}</div>}
                          <div className="flex items-center justify-between mt-0.5">
                            {b.date && (
                              <div className="text-[10px] text-gray-500">
                                {new Date(b.date + 'T12:00:00').toLocaleDateString('de-DE')}
                                {b.endDate && <> – {new Date(b.endDate + 'T12:00:00').toLocaleDateString('de-DE')}</>}
                              </div>
                            )}
                            {displayPrice > 0 && (
                              <div className="text-[10px] text-green-400 font-medium">{displayPrice.toFixed(2)} €</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {v2Bookings.length > 5 && (
                      <div className="text-[11px] text-gray-500 pl-1">+{v2Bookings.length - 5} weitere Buchungen</div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Legende */}
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-xs font-semibold text-gray-400 mb-2">Legende</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-purple-500/30 border-l-2 border-purple-500"></div>
                    <span className="text-[11px] text-gray-400">Episodenbuchung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/30 border-l-2 border-blue-500"></div>
                    <span className="text-[11px] text-gray-400">Zeitraum-Buchung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500/30 border-l-2 border-green-500"></div>
                    <span className="text-[11px] text-gray-400">Werbeplatz-Buchung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500/30 border-l-2 border-amber-500"></div>
                    <span className="text-[11px] text-gray-400">Vorplanung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-violet-500/30 border border-violet-500/50 border-double"></div>
                    <span className="text-[11px] text-gray-400">Vertrag (v2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-violet-600/30 border-l-2 border-violet-500"></div>
                    <span className="text-[11px] text-gray-400">Buchung (v2) – Basis/Folge/CPM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-700"></div>
                    <span className="text-[11px] text-gray-400">Konflikt</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
