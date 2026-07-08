import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock,
  Calendar, Filter, RefreshCw, Info, Megaphone, Tag, ExternalLink, Euro,
  Download, FileText, CalendarRange, X, FileSpreadsheet,
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { sponsorsV2Api } from '../lib/api-v2';

// ─── Einheitliches Kalender-Eintrag-Modell ───────────────────────────────────
type EntryType = 'episode' | 'slot' | 'placement' | 'planned' | 'contract' | 'v2booking';

interface CalendarEntry {
  id: string;
  type: EntryType;
  sponsorId: string;
  sponsorName: string;
  sponsorCompany?: string;
  sponsorColor: string;
  // Zeitraum
  startDate?: string;   // ISO YYYY-MM-DD
  endDate?: string;     // ISO YYYY-MM-DD
  singleDate?: string;  // ISO YYYY-MM-DD (für episodengebundene Buchungen)
  // Details
  label?: string;
  position?: string;
  slotName?: string;
  categoryName?: string;
  episodeId?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  // Finanzen
  price?: number;
  finalPrice?: number;
  invoiceStatus?: string;
  // Status
  status?: string;
  confirmed?: boolean;
  isExclusive?: boolean;
  // Preismodell (v2)
  basePrice?: number;
  pricePerEpisode?: number;
  pricePer1000?: number;
  // Sonstiges
  notes?: string;
  contactPerson?: string;
  contactEmail?: string;
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
function normDate(d: any): string | null {
  if (!d) return null;
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
  return null;
}

// Prüft ob ein Eintrag an einem bestimmten Tag sichtbar ist
function entryOnDay(entry: CalendarEntry, dateStr: string): boolean {
  if (entry.singleDate) return normDate(entry.singleDate) === dateStr;
  const start = normDate(entry.startDate);
  const end = normDate(entry.endDate);
  if (!start && !end) return false;
  if (start && !end) return start === dateStr;
  if (!start && end) return end === dateStr;
  return dateStr >= start! && dateStr <= end!;
}

const positionLabels: Record<string, string> = {
  'pre-roll': 'Pre-Roll', 'mid-roll': 'Mid-Roll', 'post-roll': 'Post-Roll',
  'folgensponsor': 'Folgensponsor', 'sonderbuchung': 'Sonderbuchung',
};

const typeConfig: Record<EntryType, { label: string; color: string; borderStyle: string; bg: string; textColor: string }> = {
  episode:   { label: 'Episodenbuchung', color: '#7c3aed', borderStyle: 'solid',  bg: '#7c3aed20', textColor: '#a78bfa' },
  slot:      { label: 'Zeitraum-Slot',   color: '#2563eb', borderStyle: 'dashed', bg: '#2563eb15', textColor: '#93c5fd' },
  placement: { label: 'Werbeplatz',      color: '#059669', borderStyle: 'dotted', bg: '#05966920', textColor: '#6ee7b7' },
  planned:   { label: 'Vorplanung',      color: '#d97706', borderStyle: 'dashed', bg: '#d9770615', textColor: '#fcd34d' },
  contract:  { label: 'Vertrag',         color: '#9333ea', borderStyle: 'double', bg: '#9333ea15', textColor: '#d8b4fe' },
  v2booking: { label: 'Buchung (v2)',    color: '#0891b2', borderStyle: 'solid',  bg: '#0891b225', textColor: '#67e8f9' },
};

const invoiceStatusColors: Record<string, string> = {
  'offen':     'bg-yellow-900/50 text-yellow-300',
  'versendet': 'bg-blue-900/50 text-blue-300',
  'bezahlt':   'bg-green-900/50 text-green-300',
  'storniert': 'bg-gray-700 text-gray-400',
};

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function SponsorBookingCalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterSponsor, setFilterSponsor] = useState('');
  const [filterType, setFilterType] = useState<EntryType | ''>('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Alle Sponsoren für Filter
  const allSponsors = Array.from(new Set(entries.map(e => e.sponsorName))).sort();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firstDay = toIso(year, month, 1);
      const lastDay = toIso(year, month, getDaysInMonth(year, month));

      // Legacy und v2 separat laden – Legacy-Fehler sollen v2-Daten nicht blockieren
      const [legacyResult, v2Result] = await Promise.allSettled([
        sponsorsApi.getBookingCalendar({ from: firstDay, to: lastDay }),
        sponsorsV2Api.getBookingCalendar({ from: firstDay, to: lastDay }),
      ]);

      const legacyRes = legacyResult.status === 'fulfilled' ? legacyResult.value : null;
      const v2Res = v2Result.status === 'fulfilled' ? v2Result.value : null;

      const all: CalendarEntry[] = [];

      // Legacy: Episodenbuchungen
      for (const b of ((legacyRes as any)?.episodeBookings || [])) {
        all.push({
          id: `ep_${b.id}`,
          type: 'episode',
          sponsorId: b.sponsorId,
          sponsorName: b.sponsorName,
          sponsorCompany: b.sponsorCompany,
          sponsorColor: b.sponsorColor || '#7c3aed',
          singleDate: b.date,
          label: b.categoryName,
          position: b.position,
          categoryName: b.categoryName,
          episodeId: b.episodeId,
          episodeTitle: b.episodeTitle,
          episodeNumber: b.episodeNumber,
          confirmed: b.confirmed,
          isExclusive: b.isExclusive,
          status: b.episodeStatus,
        });
      }

      // Legacy: Zeitraum-Slots
      for (const b of ((legacyRes as any)?.slotBookings || [])) {
        all.push({
          id: `sl_${b.id}`,
          type: 'slot',
          sponsorId: b.sponsorId,
          sponsorName: b.sponsorName,
          sponsorCompany: b.sponsorCompany,
          sponsorColor: b.sponsorColor || '#2563eb',
          startDate: b.startDate,
          endDate: b.endDate,
          label: b.label,
          position: b.position,
          categoryName: b.categoryName,
          price: b.basePrice || b.pricePerEpisode,
          status: b.status,
          isExclusive: b.isExclusive,
        });
      }

      // Legacy: Werbeplatz-Buchungen
      for (const p of ((legacyRes as any)?.adPlacements || [])) {
        all.push({
          id: `pl_${p.id}`,
          type: 'placement',
          sponsorId: p.sponsorId,
          sponsorName: p.sponsorName,
          sponsorCompany: p.sponsorCompany,
          sponsorColor: p.sponsorColor || '#059669',
          singleDate: p.date,
          slotName: p.slotName,
          position: p.position,
          categoryName: p.categoryName,
          episodeId: p.episodeId,
          episodeTitle: p.episodeTitle,
          episodeNumber: p.episodeNumber,
          price: p.price,
          invoiceStatus: p.invoiceStatus,
          status: p.status,
          notes: p.notes,
        });
      }

      // Legacy: Vorplanungen (nur wenn kein Duplikat mit Slot)
      const slotIds = new Set(((legacyRes as any)?.slotBookings || []).map((b: any) => b.id));
      for (const p of ((legacyRes as any)?.plannedSlots || [])) {
        const rawId = p.id?.toString().replace('planned_', '');
        if (slotIds.has(rawId)) continue; // Duplikat vermeiden
        all.push({
          id: `ps_${p.id}`,
          type: 'planned',
          sponsorId: p.sponsorId,
          sponsorName: p.sponsorName,
          sponsorCompany: p.sponsorCompany,
          sponsorColor: p.sponsorColor || '#d97706',
          startDate: p.startDate,
          endDate: p.endDate,
          label: p.label,
          position: p.position,
          categoryName: p.categoryName,
          price: p.basePrice || p.pricePerEpisode,
          status: p.status,
          notes: p.notes,
        });
      }

      // v2: Verträge
      for (const c of ((v2Res as any)?.contracts || [])) {
        all.push({
          id: `ct_${c.id}`,
          type: 'contract',
          sponsorId: c.sponsorId,
          sponsorName: c.sponsorName,
          sponsorCompany: c.sponsorCompany,
          sponsorColor: c.sponsorColor || '#9333ea',
          startDate: c.startDate,
          endDate: c.endDate,
          label: `Vertrag ${c.contactPerson ? `(${c.contactPerson})` : ''}`.trim(),
          status: c.status,
          contactPerson: c.contactPerson,
          contactEmail: c.contactEmail,
          notes: c.notes,
        });
      }

      // v2: Buchungen
      for (const b of ((v2Res as any)?.bookings || [])) {
        const priceLabel = b.pricePerEpisode ? 'Pro Folge' : b.pricePer1000 ? 'CPM' : b.basePrice ? 'Basis' : '';
        all.push({
          id: `v2_${b.id}`,
          type: 'v2booking',
          sponsorId: b.sponsorId,
          sponsorName: b.sponsorName,
          sponsorCompany: b.sponsorCompany,
          sponsorColor: b.sponsorColor || '#0891b2',
          startDate: b.date,
          endDate: b.endDate,
          singleDate: (!b.endDate && b.date) ? b.date : undefined,
          slotName: b.slotName,
          position: b.position,
          label: priceLabel ? `${b.slotName || 'Buchung'} · ${priceLabel}` : b.slotName,
          episodeTitle: b.episodeTitle,
          episodeNumber: b.episodeNumber,
          price: b.finalPrice ?? b.price,
          invoiceStatus: b.invoiceStatus,
          status: b.status,
          basePrice: b.basePrice,
          pricePerEpisode: b.pricePerEpisode,
          pricePer1000: b.pricePer1000,
        });
      }

      setEntries(all);
      setConflicts((legacyRes as any)?.conflicts || []);
    } catch (e) {
      console.error('Kalender-Ladefehler:', e);
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

  // Einträge für einen Tag filtern
  const getEntriesForDay = (dateStr: string): CalendarEntry[] => {
    let result = entries.filter(e => entryOnDay(e, dateStr));
    if (filterSponsor) result = result.filter(e => e.sponsorName === filterSponsor);
    if (filterType) result = result.filter(e => e.type === filterType);
    return result;
  };

  const hasConflict = (dateStr: string) => conflicts.some(c => c.date === dateStr);

  // Kalender-Grid aufbauen
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Monatsstatistiken
  const monthEntries = entries.filter(e => {
    const firstDay = toIso(year, month, 1);
    const lastDay = toIso(year, month, daysInMonth);
    // Prüfe ob Eintrag im Monat liegt
    if (e.singleDate) {
      const d = normDate(e.singleDate);
      return d && d >= firstDay && d <= lastDay;
    }
    const start = normDate(e.startDate);
    const end = normDate(e.endDate);
    if (!start && !end) return false;
    const startOk = !end || end >= firstDay;
    const endOk = !start || start <= lastDay;
    return startOk && endOk;
  });

  const v2BookingEntries = monthEntries.filter(e => e.type === 'v2booking');
  const v2Revenue = v2BookingEntries.reduce((s, e) => s + (e.price || 0), 0);
  const totalBookingsCount = monthEntries.filter(e => e.type !== 'contract' && e.type !== 'planned').length;

  // Detail-Panel
  const selectedEntries = selectedDay ? getEntriesForDay(selectedDay) : [];
  const selectedConflicts = selectedDay ? conflicts.filter(c => c.date === selectedDay) : [];

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <Calendar size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Buchungskalender</h1>
          {conflicts.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full border border-red-700/50">
              <AlertTriangle size={11} /> {conflicts.length} Konflikt{conflicts.length !== 1 ? 'e' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
            <FileSpreadsheet size={13} /> CSV
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Haupt-Kalenderbereich */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Monats-Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">{MONTHS_DE[month]} {year}</h2>
              <p className="text-xs text-gray-500">{totalBookingsCount} Buchung{totalBookingsCount !== 1 ? 'en' : ''} im Monat</p>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Filter-Leiste */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-500" />
              <select value={filterSponsor} onChange={e => setFilterSponsor(e.target.value)}
                className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg focus:outline-none focus:border-purple-500">
                <option value="">Alle Sponsoren</option>
                {allSponsors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as EntryType | '')}
              className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg focus:outline-none focus:border-purple-500">
              <option value="">Alle Typen</option>
              {(Object.keys(typeConfig) as EntryType[]).map(t => (
                <option key={t} value={t}>{typeConfig[t].label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={showConflictsOnly} onChange={e => setShowConflictsOnly(e.target.checked)}
                className="w-3 h-3 accent-red-500" />
              Nur Konflikte
            </label>
            {(filterSponsor || filterType || showConflictsOnly) && (
              <button onClick={() => { setFilterSponsor(''); setFilterType(''); setShowConflictsOnly(false); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                <X size={11} /> Filter zurücksetzen
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <RefreshCw size={20} className="animate-spin mr-2" /> Lade Buchungen...
            </div>
          ) : (
            <>
              {/* Wochentag-Header */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS_DE.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
                ))}
              </div>

              {/* Kalender-Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - firstDay + 1;
                  if (dayNum < 1 || dayNum > daysInMonth) {
                    return <div key={i} className="min-h-[80px] bg-gray-900/20 rounded-lg" />;
                  }
                  const dateStr = toIso(year, month, dayNum);
                  const dayEntries = getEntriesForDay(dateStr);
                  const isConflict = hasConflict(dateStr);
                  const isToday = dateStr === today.toISOString().split('T')[0];
                  const isSelected = dateStr === selectedDay;
                  const hasAny = dayEntries.length > 0;

                  if (showConflictsOnly && !isConflict) {
                    return <div key={i} className="min-h-[80px] bg-gray-900/10 rounded-lg opacity-20" />;
                  }

                  return (
                    <div key={i}
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      className={`min-h-[80px] rounded-lg p-1.5 cursor-pointer transition-all border ${
                        isSelected ? 'border-purple-500 bg-purple-900/20' :
                        isConflict ? 'border-red-700 bg-red-900/10' :
                        hasAny ? 'border-gray-700 bg-gray-800/50 hover:border-purple-600' :
                        'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                      }`}
                    >
                      {/* Tag-Nummer */}
                      <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${isToday ? 'text-purple-400' : 'text-gray-400'}`}>
                        <span className={isToday ? 'bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]' : ''}>
                          {dayNum}
                        </span>
                        {isConflict && <AlertTriangle size={10} className="text-red-400" />}
                      </div>

                      {/* Eintrags-Chips */}
                      <div className="space-y-0.5">
                        {dayEntries.slice(0, 3).map(e => {
                          const cfg = typeConfig[e.type];
                          const color = e.sponsorColor || cfg.color;
                          return (
                            <div key={e.id}
                              className="text-[10px] rounded px-1 py-0.5 truncate"
                              style={{
                                backgroundColor: color + '25',
                                borderLeft: `2px ${cfg.borderStyle} ${color}`,
                              }}>
                              <span className="truncate font-medium" style={{ color }}>
                                {e.sponsorName}
                              </span>
                              {e.slotName && (
                                <span className="text-[9px] text-gray-400 ml-1 truncate">· {e.slotName}</span>
                              )}
                            </div>
                          );
                        })}
                        {dayEntries.length > 3 && (
                          <div className="text-[9px] text-gray-500 pl-1">+{dayEntries.length - 3} weitere</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legende */}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
                {(Object.entries(typeConfig) as [EntryType, typeof typeConfig[EntryType]][]).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{
                      backgroundColor: cfg.bg,
                      borderLeft: `2px ${cfg.borderStyle} ${cfg.color}`,
                    }} />
                    {cfg.label}
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border border-red-700 bg-red-900/20" />
                  Konflikt
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail-Panel */}
        <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-y-auto flex-shrink-0">
          {selectedDay ? (
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('de-DE', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-gray-300">
                  <X size={16} />
                </button>
              </div>

              {/* Konflikte */}
              {selectedConflicts.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-2">
                    <AlertTriangle size={13} /> Konflikte
                  </div>
                  {selectedConflicts.map((c, i) => (
                    <div key={i} className="text-xs text-red-300">{c.message}</div>
                  ))}
                </div>
              )}

              {/* Einträge */}
              {selectedEntries.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <Calendar size={24} className="mx-auto mb-2 opacity-30" />
                  Keine Buchungen an diesem Tag
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEntries.map(e => {
                    const cfg = typeConfig[e.type];
                    const color = e.sponsorColor || cfg.color;
                    const displayPrice = e.finalPrice ?? e.price;
                    return (
                      <div key={e.id}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-800/50"
                        style={{ borderLeftColor: color, borderLeftWidth: 3 }}>

                        {/* Typ-Badge + Sponsor */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-semibold text-sm text-white">{e.sponsorName}</div>
                            {e.sponsorCompany && e.sponsorCompany !== e.sponsorName && (
                              <div className="text-[10px] text-gray-500">{e.sponsorCompany}</div>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: color + '25', color: cfg.textColor }}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-xs text-gray-400">
                          {/* Slot / Kategorie */}
                          {(e.slotName || e.label || e.categoryName) && (
                            <div className="flex items-center gap-1">
                              <Tag size={10} />
                              <span className="text-gray-300">{e.slotName || e.label || e.categoryName}</span>
                            </div>
                          )}

                          {/* Position */}
                          {e.position && (
                            <div className="text-gray-500">{positionLabels[e.position] || e.position}</div>
                          )}

                          {/* Episode */}
                          {e.episodeTitle && (
                            <div className="flex items-center gap-1">
                              <Megaphone size={10} />
                              <button onClick={() => e.episodeId && navigate(`/episodes/${e.episodeId}`)}
                                className="hover:text-purple-400 transition-colors truncate max-w-[180px]">
                                {e.episodeNumber ? `#${e.episodeNumber} ` : ''}{e.episodeTitle}
                              </button>
                            </div>
                          )}

                          {/* Laufzeit */}
                          {(e.startDate || e.endDate) && !e.singleDate && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <CalendarRange size={10} />
                              {e.startDate ? new Date(e.startDate + 'T12:00:00').toLocaleDateString('de-DE') : '?'}
                              {' – '}
                              {e.endDate ? new Date(e.endDate + 'T12:00:00').toLocaleDateString('de-DE') : '?'}
                            </div>
                          )}

                          {/* Preismodell (v2) */}
                          {e.type === 'v2booking' && (e.basePrice || e.pricePerEpisode || e.pricePer1000) && (
                            <div className="text-[10px] text-cyan-400/70">
                              {e.pricePerEpisode ? `Pro Folge: ${e.pricePerEpisode.toFixed(2)} €` :
                               e.pricePer1000 ? `CPM: ${e.pricePer1000.toFixed(2)} €` :
                               e.basePrice ? `Basis: ${e.basePrice.toFixed(2)} €` : ''}
                            </div>
                          )}

                          {/* Preis + Rechnungsstatus */}
                          {displayPrice != null && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5 text-green-400">
                                <Euro size={10} />{displayPrice.toFixed(2)} €
                              </div>
                              {e.invoiceStatus && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${invoiceStatusColors[e.invoiceStatus] || 'bg-gray-700 text-gray-400'}`}>
                                  {e.invoiceStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bestätigt / Status */}
                          {e.type === 'episode' && (
                            e.confirmed
                              ? <span className="flex items-center gap-1 text-green-400"><CheckCircle size={10} /> Bestätigt</span>
                              : <span className="flex items-center gap-1 text-yellow-400"><Clock size={10} /> Ausstehend</span>
                          )}

                          {/* Kontakt (Vertrag) */}
                          {e.type === 'contract' && e.contactPerson && (
                            <div className="text-gray-500">
                              {e.contactPerson}
                              {e.contactEmail && <span className="ml-1">· {e.contactEmail}</span>}
                            </div>
                          )}

                          {/* Notizen */}
                          {e.notes && (
                            <div className="text-gray-500 italic text-[10px] mt-1">{e.notes}</div>
                          )}
                        </div>

                        {/* Sponsor-Link */}
                        <button onClick={() => navigate(`/sponsors/${e.sponsorId}`)}
                          className="mt-2 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                          <ExternalLink size={9} /> Sponsor öffnen
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Monatsübersicht in der Sidebar */
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Info size={14} className="text-purple-400" />
                {MONTHS_DE[month]} {year} – Übersicht
              </h3>

              {/* Monatsstatistiken */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">Buchungen</div>
                  <div className="text-xl font-bold text-white">{totalBookingsCount}</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">Verträge aktiv</div>
                  <div className="text-xl font-bold text-purple-400">
                    {monthEntries.filter(e => e.type === 'contract').length}
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">Vorplanungen</div>
                  <div className="text-xl font-bold text-amber-400">
                    {monthEntries.filter(e => e.type === 'planned').length}
                  </div>
                </div>
                {v2Revenue > 0 && (
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Umsatz (v2)</div>
                    <div className="text-lg font-bold text-cyan-400">{v2Revenue.toFixed(0)} €</div>
                  </div>
                )}
              </div>

              {/* Typ-Verteilung */}
              {monthEntries.length > 0 && (
                <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs font-medium text-gray-400 mb-2">Buchungen nach Typ</div>
                  <div className="space-y-1.5">
                    {(Object.keys(typeConfig) as EntryType[]).map(type => {
                      const count = monthEntries.filter(e => e.type === type).length;
                      if (count === 0) return null;
                      const cfg = typeConfig[type];
                      return (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <span className="text-gray-400">{cfg.label}</span>
                          </div>
                          <span className="font-medium text-white">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Konflikte */}
              {conflicts.length > 0 && (
                <div className="bg-red-900/15 border border-red-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-2">
                    <AlertTriangle size={12} /> {conflicts.length} Konflikt{conflicts.length !== 1 ? 'e' : ''}
                  </div>
                  {conflicts.slice(0, 3).map((c, i) => (
                    <div key={i} className="text-xs text-red-300 mb-1">{c.message}</div>
                  ))}
                </div>
              )}

              {/* Hinweis */}
              <div className="flex items-start gap-2 p-3 bg-blue-900/15 border border-blue-700/30 rounded-lg text-xs text-blue-300">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>Klicke auf einen Tag, um alle Buchungen dieses Tages zu sehen.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
