import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Euro, TrendingUp, Clock, CheckCircle, Download,
  FileSpreadsheet, Filter, RefreshCw, BarChart3, Users, Tag,
  Calendar, ChevronUp, ChevronDown, Search, AlertCircle
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  offen: { label: 'Offen', color: 'text-red-400', bg: 'bg-red-500/20', icon: <AlertCircle size={13} /> },
  versendet: { label: 'Versendet', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: <Clock size={13} /> },
  bezahlt: { label: 'Bezahlt', color: 'text-green-400', bg: 'bg-green-500/20', icon: <CheckCircle size={13} /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  'pre-roll': 'Pre-Roll',
  'mid-roll': 'Mid-Roll',
  'post-roll': 'Post-Roll',
  'host-read': 'Host-Read',
  'sponsored-segment': 'Sponsored Segment',
};

function fmt(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(m: string) {
  if (m === 'Kein Datum') return m;
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

export default function SponsorRevenuePage() {
  const { can, showError } = useApp();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'sponsorName' | 'totalRevenue' | 'placements'>('totalRevenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeView, setActiveView] = useState<'overview' | 'placements' | 'monthly' | 'categories'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (statusFilter) params.status = statusFilter;
      const result = await sponsorsApi.getRevenueDashboard(params);
      setData(result);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      if (!data) return;
      const placements = data.placements || [];
      const rows = [
        ['Sponsor', 'Unternehmen', 'Slot', 'Kategorie', 'Position', 'Episode', 'Sendedatum', 'Kampagne', 'Laufzeit von', 'Laufzeit bis', 'Preis (EUR)', 'Status', 'Rechnungsnummer'],
        ...placements.map((p: any) => [
          p.sponsorName || '',
          p.sponsorCompany || '',
          p.slotName || '',
          CATEGORY_LABELS[p.category] || p.category || '',
          p.position || '',
          p.episodeTitle || '',
          p.publishDate ? new Date(p.publishDate).toLocaleDateString('de-DE') : '',
          p.placementLabel || '',
          p.placementStart ? new Date(p.placementStart).toLocaleDateString('de-DE') : '',
          p.placementEnd ? new Date(p.placementEnd).toLocaleDateString('de-DE') : '',
          (p.price || 0).toFixed(2),
          STATUS_CONFIG[p.invoiceStatus]?.label || p.invoiceStatus || 'Offen',
          p.invoiceNumber || '',
        ])
      ];
      const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcore-einnahmen-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { showError(err.message); }
    finally { setIsExporting(false); }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortedSponsors = (data?.bySponsor || [])
    .filter((s: any) => !search || s.sponsorName?.toLowerCase().includes(search.toLowerCase()) || s.sponsorCompany?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const v = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'sponsorName') return v * (a.sponsorName || '').localeCompare(b.sponsorName || '');
      if (sortField === 'placements') return v * ((a.placements || 0) - (b.placements || 0));
      return v * ((a.totalRevenue || 0) - (b.totalRevenue || 0));
    });

  const filteredPlacements = (data?.placements || [])
    .filter((p: any) => !search || p.sponsorName?.toLowerCase().includes(search.toLowerCase()) || p.episodeTitle?.toLowerCase().includes(search.toLowerCase()));

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-accent-purple" /> : <ChevronDown size={12} className="text-accent-purple" />;
  };

  const summary = data?.summary || {};
  const maxRevenue = Math.max(...(data?.byMonth || []).map((m: any) => m.totalRevenue || 0), 1);
  const maxSlotRevenue = Math.max(...(data?.slotUtilization || []).map((s: any) => s.totalRevenue || 0), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/sponsors" className="p-2 rounded-lg hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Euro size={22} className="text-accent-green" />
              Einnahmen-Dashboard
            </h1>
            <p className="text-text-muted text-sm mt-0.5">Übersicht aller Sponsoring-Einnahmen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors" title="Aktualisieren">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {can('canViewSponsorReports') && (
            <button onClick={handleExportCsv} disabled={isExporting || !data}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/20 text-accent-green hover:bg-accent-green/30 transition-colors text-sm font-medium disabled:opacity-50">
              <FileSpreadsheet size={15} />
              {isExporting ? 'Exportiere…' : 'CSV Export'}
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap bg-surface rounded-xl p-3 border border-surface-border">
        <Filter size={15} className="text-text-muted" />
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs">Von:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-text-primary text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs">Bis:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-text-primary text-xs" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-text-primary text-xs">
          <option value="">Alle Status</option>
          <option value="offen">Offen</option>
          <option value="versendet">Versendet</option>
          <option value="bezahlt">Bezahlt</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <Search size={14} className="text-text-muted" />
          <input type="text" placeholder="Sponsor suchen…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-text-primary text-xs w-40" />
        </div>
        {(dateFrom || dateTo || statusFilter || search) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setSearch(''); }}
            className="text-text-muted hover:text-text-primary text-xs underline">Filter zurücksetzen</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-accent-purple" />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <Euro size={16} className="text-accent-purple" />
                <span className="text-text-muted text-xs">Gesamteinnahmen</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">{fmt(summary.totalRevenue || 0)} €</div>
              <div className="text-text-muted text-xs mt-1">{summary.totalPlacements || 0} Platzierungen</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-text-muted text-xs">Bezahlt</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{fmt(summary.paidRevenue || 0)} €</div>
              <div className="text-text-muted text-xs mt-1">{data.statusBreakdown?.bezahlt || 0} Platzierungen</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-400" />
                <span className="text-text-muted text-xs">Versendet</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{fmt(summary.sentRevenue || 0)} €</div>
              <div className="text-text-muted text-xs mt-1">{data.statusBreakdown?.versendet || 0} Platzierungen</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-text-muted text-xs">Offen</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{fmt(summary.openRevenue || 0)} €</div>
              <div className="text-text-muted text-xs mt-1">{data.statusBreakdown?.offen || 0} Platzierungen</div>
            </div>
          </div>

          {/* Neue KPI-Cards: Auslastung, TKP, Aktive Slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-blue-400" />
                <span className="text-text-muted text-xs">Slot-Auslastung</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{(summary.utilizationRate || 0).toFixed(0)} %</div>
              <div className="text-text-muted text-xs mt-1">{summary.activeSlots || 0} von {summary.totalSlots || 0} Slots aktiv</div>
              <div className="w-full bg-surface-raised rounded-full h-1.5 mt-2">
                <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${Math.min(100, summary.utilizationRate || 0)}%` }} />
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-purple-400" />
                <span className="text-text-muted text-xs">Ø TKP (Cost per Mille)</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{fmt(summary.avgTkp || 0)} €</div>
              <div className="text-text-muted text-xs mt-1">Durchschnitt pro 1.000 Hörer</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-accent-green" />
                <span className="text-text-muted text-xs">Aktive Werbeplätze</span>
              </div>
              <div className="text-2xl font-bold text-accent-green">{summary.activeSlots || 0}</div>
              <div className="text-text-muted text-xs mt-1">Slots mit Buchungen im Zeitraum</div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-surface-border w-fit flex-wrap">
            {[
              { key: 'overview', label: 'Pro Sponsor', icon: <Users size={14} /> },
              { key: 'placements', label: 'Alle Platzierungen', icon: <BarChart3 size={14} /> },
              { key: 'monthly', label: 'Monatlich', icon: <Calendar size={14} /> },
              { key: 'categories', label: 'Kategorien', icon: <Tag size={14} /> },
              { key: 'utilization', label: 'Auslastung', icon: <TrendingUp size={14} /> },
            ].map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${activeView === v.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>

          {/* Pro Sponsor */}
          {activeView === 'overview' && (
            <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left p-3 text-text-muted text-xs font-medium">
                      <button onClick={() => toggleSort('sponsorName')} className="flex items-center gap-1 hover:text-text-primary">
                        Sponsor <SortIcon field="sponsorName" />
                      </button>
                    </th>
                    <th className="text-center p-3 text-text-muted text-xs font-medium">
                      <button onClick={() => toggleSort('placements')} className="flex items-center gap-1 hover:text-text-primary mx-auto">
                        Platzierungen <SortIcon field="placements" />
                      </button>
                    </th>
                    <th className="text-right p-3 text-text-muted text-xs font-medium">Offen</th>
                    <th className="text-right p-3 text-text-muted text-xs font-medium">Versendet</th>
                    <th className="text-right p-3 text-text-muted text-xs font-medium">Bezahlt</th>
                    <th className="text-right p-3 text-text-muted text-xs font-medium">
                      <button onClick={() => toggleSort('totalRevenue')} className="flex items-center gap-1 hover:text-text-primary ml-auto">
                        Gesamt <SortIcon field="totalRevenue" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSponsors.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-text-muted text-sm">Keine Daten vorhanden</td></tr>
                  ) : sortedSponsors.map((s: any, i: number) => (
                    <tr key={s.sponsorId} className={`border-b border-surface-border/50 hover:bg-surface-raised/50 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-raised/20'}`}>
                      <td className="p-3">
                        <Link to={`/sponsors/${s.sponsorId}`} className="font-medium text-text-primary hover:text-accent-purple transition-colors">
                          {s.sponsorName}
                        </Link>
                        {s.sponsorCompany && <div className="text-text-muted text-xs">{s.sponsorCompany}</div>}
                      </td>
                      <td className="p-3 text-center text-text-secondary text-sm">{s.placements}</td>
                      <td className="p-3 text-right text-red-400 text-sm">{s.openRevenue > 0 ? fmt(s.openRevenue) + ' €' : '—'}</td>
                      <td className="p-3 text-right text-amber-400 text-sm">{s.sentRevenue > 0 ? fmt(s.sentRevenue) + ' €' : '—'}</td>
                      <td className="p-3 text-right text-green-400 text-sm">{s.paidRevenue > 0 ? fmt(s.paidRevenue) + ' €' : '—'}</td>
                      <td className="p-3 text-right font-semibold text-text-primary">{fmt(s.totalRevenue)} €</td>
                    </tr>
                  ))}
                </tbody>
                {sortedSponsors.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-border bg-surface-raised/30">
                      <td className="p-3 font-semibold text-text-primary text-sm">Gesamt</td>
                      <td className="p-3 text-center text-text-secondary text-sm">{sortedSponsors.reduce((s: number, r: any) => s + r.placements, 0)}</td>
                      <td className="p-3 text-right text-red-400 font-semibold text-sm">{fmt(sortedSponsors.reduce((s: number, r: any) => s + r.openRevenue, 0))} €</td>
                      <td className="p-3 text-right text-amber-400 font-semibold text-sm">{fmt(sortedSponsors.reduce((s: number, r: any) => s + r.sentRevenue, 0))} €</td>
                      <td className="p-3 text-right text-green-400 font-semibold text-sm">{fmt(sortedSponsors.reduce((s: number, r: any) => s + r.paidRevenue, 0))} €</td>
                      <td className="p-3 text-right font-bold text-text-primary">{fmt(sortedSponsors.reduce((s: number, r: any) => s + r.totalRevenue, 0))} €</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Alle Platzierungen */}
          {activeView === 'placements' && (
            <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left p-3 text-text-muted text-xs font-medium">Sponsor</th>
                    <th className="text-left p-3 text-text-muted text-xs font-medium">Episode</th>
                    <th className="text-left p-3 text-text-muted text-xs font-medium">Kategorie</th>
                    <th className="text-left p-3 text-text-muted text-xs font-medium">Kampagne</th>
                    <th className="text-left p-3 text-text-muted text-xs font-medium">Sendedatum</th>
                    <th className="text-center p-3 text-text-muted text-xs font-medium">Status</th>
                    <th className="text-right p-3 text-text-muted text-xs font-medium">Preis</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlacements.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-text-muted text-sm">Keine Platzierungen vorhanden</td></tr>
                  ) : filteredPlacements.map((p: any, i: number) => {
                    const sc = STATUS_CONFIG[p.invoiceStatus] || STATUS_CONFIG.offen;
                    return (
                      <tr key={p.id} className={`border-b border-surface-border/50 hover:bg-surface-raised/50 ${i % 2 === 0 ? '' : 'bg-surface-raised/20'}`}>
                        <td className="p-3">
                          <Link to={`/sponsors/${p.sponsorId}`} className="font-medium text-text-primary hover:text-accent-purple text-sm">
                            {p.sponsorName}
                          </Link>
                          {p.sponsorCompany && <div className="text-text-muted text-xs">{p.sponsorCompany}</div>}
                        </td>
                        <td className="p-3 text-text-secondary text-xs max-w-[160px] truncate">{p.episodeTitle || '—'}</td>
                        <td className="p-3 text-text-muted text-xs">{CATEGORY_LABELS[p.category] || p.category || '—'}</td>
                        <td className="p-3 text-text-muted text-xs">{p.placementLabel || '—'}</td>
                        <td className="p-3 text-text-muted text-xs">{p.publishDate ? new Date(p.publishDate).toLocaleDateString('de-DE') : '—'}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                            {sc.icon}{sc.label}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-text-primary text-sm">{fmt(p.price)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Monatliche Übersicht */}
          {activeView === 'monthly' && (
            <div className="bg-surface rounded-xl border border-surface-border p-5">
              <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-accent-purple" />
                Einnahmen pro Monat
              </h3>
              {data.byMonth?.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Keine Daten vorhanden</p>
              ) : (
                <div className="space-y-3">
                  {data.byMonth.map((m: any) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <div className="w-20 text-text-muted text-xs text-right shrink-0">{fmtMonth(m.month)}</div>
                      <div className="flex-1 bg-surface-raised rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-accent-purple/70 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(2, (m.totalRevenue / maxRevenue) * 100)}%` }}>
                          <span className="text-white text-xs font-medium">{fmt(m.totalRevenue)} €</span>
                        </div>
                      </div>
                      <div className="w-20 text-text-muted text-xs shrink-0">{m.placements} Pl.</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auslastung */}
          {activeView === 'utilization' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-surface-border p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  Slot-Auslastung im Zeitraum
                </h3>
                {(data?.slotUtilization || []).length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-8">Keine Slots vorhanden</p>
                ) : (
                  <div className="space-y-3">
                    {(data.slotUtilization || []).map((sl: any) => (
                      <div key={sl.id} className="p-3 bg-surface-raised rounded-lg border border-surface-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sl.sponsorColor }} />
                            <span className="font-medium text-text-primary text-sm">{sl.name}</span>
                            <span className="text-text-muted text-xs">({sl.sponsorName})</span>
                            {sl.isExclusive && (
                              <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-700/50">Exklusiv</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-text-primary text-sm">{fmt(sl.totalRevenue)} €</div>
                            <div className="text-text-muted text-xs">{sl.placements} Platzierung{sl.placements !== 1 ? 'en' : ''}</div>
                          </div>
                        </div>
                        <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(2, (sl.totalRevenue / maxSlotRevenue) * 100)}%`,
                              backgroundColor: sl.sponsorColor + 'cc',
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-text-muted">
                          <span>{sl.bookings} Episodenbuchung{sl.bookings !== 1 ? 'en' : ''}</span>
                          {sl.basePrice > 0 && <span>Basispreis: {fmt(sl.basePrice)} €</span>}
                          {sl.pricePer1000Listens > 0 && <span>TKP: {fmt(sl.pricePer1000Listens)} €</span>}
                          {sl.pricePerEpisode > 0 && <span>Pro Folge: {fmt(sl.pricePerEpisode)} €</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kategorien */}
          {activeView === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.byCategory?.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8 col-span-2">Keine Daten vorhanden</p>
              ) : data.byCategory.map((c: any) => {
                const pct = summary.totalRevenue > 0 ? (c.totalRevenue / summary.totalRevenue) * 100 : 0;
                return (
                  <div key={c.category} className="bg-surface rounded-xl border border-surface-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-accent-purple" />
                        <span className="font-medium text-text-primary text-sm">{CATEGORY_LABELS[c.category] || c.category}</span>
                      </div>
                      <span className="text-text-muted text-xs">{c.placements} Platzierungen</span>
                    </div>
                    <div className="text-xl font-bold text-text-primary mb-2">{fmt(c.totalRevenue)} €</div>
                    <div className="w-full bg-surface-raised rounded-full h-2">
                      <div className="h-2 bg-accent-purple rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-text-muted text-xs mt-1">{pct.toFixed(1)} % des Gesamtumsatzes</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-text-muted">Keine Daten verfügbar</div>
      )}
    </div>
  );
}
