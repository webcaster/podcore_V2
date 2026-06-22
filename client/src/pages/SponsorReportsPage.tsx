import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, Download, Calendar, TrendingUp, Megaphone,
  CheckCircle, Clock, Tag, FileText, Filter, RefreshCw, Euro
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

export default function SponsorReportsPage() {
  const { can, showError } = useApp();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [reportData, sponsorList] = await Promise.all([
        sponsorsApi.getReport({ sponsorId: selectedSponsor || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
        sponsorsApi.list(),
      ]);
      setReport(reportData);
      setSponsors(sponsorList);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [selectedSponsor, dateFrom, dateTo]);

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const data = await sponsorsApi.exportReport({ sponsorId: selectedSponsor || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, format });
      const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcore-sponsoring-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { showError(err.message); }
    finally { setIsExporting(false); }
  };

  const STATUS_COLORS: Record<string, string> = {
    geplant: '#3b82f6',
    material_ausstehend: '#f97316',
    material_eingegangen: '#06b6d4',
    in_produktion: '#8b5cf6',
    bereit: '#10b981',
    ausgestrahlt: '#10b981',
    abgerechnet: '#6b7280',
  };

  const STATUS_LABELS: Record<string, string> = {
    geplant: 'Geplant',
    material_ausstehend: 'Material ausstehend',
    material_eingegangen: 'Material eingegangen',
    in_produktion: 'In Produktion',
    bereit: 'Bereit',
    ausgestrahlt: 'Ausgestrahlt',
    abgerechnet: 'Abgerechnet',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/sponsors" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="page-title flex items-center gap-3">
              <BarChart3 size={24} className="text-accent-green" />
              Sponsoring-Auswertungen
            </h1>
            <p className="text-text-secondary text-sm mt-1">Übersicht aller Werbeplatzierungen und Kampagnen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} disabled={isExporting} className="btn-secondary">
            <Download size={16} /><span>CSV Export</span>
          </button>
          <button onClick={() => handleExport('json')} disabled={isExporting} className="btn-secondary">
            <FileText size={16} /><span>JSON Export</span>
          </button>
          <button onClick={load} disabled={isLoading} className="btn-ghost p-2">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-text-muted" />
          <h3 className="font-medium text-text-primary text-sm">Filter</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selectedSponsor} onChange={e => setSelectedSponsor(e.target.value)} className="select flex-1">
            <option value="">Alle Sponsoren</option>
            {sponsors.map(sp => <option key={sp.id} value={sp.id}>{sp.name}{sp.company && sp.company !== sp.name ? ` (${sp.company})` : ''}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" placeholder="Von" />
            <span className="text-text-muted">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" placeholder="Bis" />
          </div>
          {(selectedSponsor || dateFrom || dateTo) && (
            <button onClick={() => { setSelectedSponsor(''); setDateFrom(''); setDateTo(''); }} className="btn-ghost text-accent-red">
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : !report ? (
        <div className="card text-center py-12"><p className="text-text-secondary">Keine Daten verfügbar</p></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Megaphone size={20} className="text-accent-green" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{report.totalPlacements}</p>
              <p className="text-text-muted text-sm">Platzierungen gesamt</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-blue/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={20} className="text-accent-blue" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{report.airedPlacements}</p>
              <p className="text-text-muted text-sm">Ausgestrahlt</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Tag size={20} className="text-accent-purple" />
              </div>
              <p className="text-3xl font-bold text-text-primary">{report.activeSponsorCount}</p>
              <p className="text-text-muted text-sm">Aktive Sponsoren</p>
            </div>
            <div className="card text-center py-4">
              <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Euro size={20} className="text-accent-orange" />
              </div>
              <p className="text-3xl font-bold text-text-primary">
                {report.totalRevenue > 0 ? `${report.totalRevenue.toFixed(0)} €` : '—'}
              </p>
              <p className="text-text-muted text-sm">Gesamtbudget</p>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Platzierungen nach Status</h3>
              {report.byStatus && Object.keys(report.byStatus).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(report.byStatus as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const pct = report.totalPlacements > 0 ? (count / report.totalPlacements) * 100 : 0;
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-text-secondary text-sm">{STATUS_LABELS[status] || status}</span>
                            <span className="text-text-primary text-sm font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || '#6b7280' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-text-muted text-sm">Keine Daten</p>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Platzierungen nach Position</h3>
              {report.byPosition && Object.keys(report.byPosition).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(report.byPosition as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .map(([position, count]) => {
                      const pct = report.totalPlacements > 0 ? (count / report.totalPlacements) * 100 : 0;
                      const posColors: Record<string, string> = { 'pre-roll': '#06b6d4', 'mid-roll': '#f97316', 'post-roll': '#8b5cf6', 'host-read': '#10b981' };
                      return (
                        <div key={position}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-text-secondary text-sm capitalize">{position.replace('-', ' ')}</span>
                            <span className="text-text-primary text-sm font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: posColors[position] || '#6b7280' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-text-muted text-sm">Keine Daten</p>
              )}
            </div>
          </div>

          {/* Delivery Type */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Werbemittel-Lieferung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'self', label: '📦 Selbst angeliefert', color: 'text-accent-blue' },
                { key: 'produced', label: '🎙️ Von uns produziert', color: 'text-accent-purple' },
              ].map(d => (
                <div key={d.key} className="bg-obsidian-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-text-primary">{report.byDelivery?.[d.key] || 0}</p>
                  <p className={`text-sm mt-1 ${d.color}`}>{d.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-Sponsor Breakdown */}
          {report.bySponsor && report.bySponsor.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Auswertung je Sponsor</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left py-3 px-4 text-text-muted font-medium">Sponsor</th>
                      <th className="text-center py-3 px-4 text-text-muted font-medium">Platzierungen</th>
                      <th className="text-center py-3 px-4 text-text-muted font-medium">Ausgestrahlt</th>
                      <th className="text-center py-3 px-4 text-text-muted font-medium">Offen</th>
                      <th className="text-right py-3 px-4 text-text-muted font-medium">Budget</th>
                      <th className="text-center py-3 px-4 text-text-muted font-medium">Status</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bySponsor.map((row: any) => (
                      <tr key={row.sponsorId} className="border-b border-surface-border/50 hover:bg-surface-raised transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: row.color || '#059669' }}>
                              {row.sponsorName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-text-primary font-medium">{row.sponsorName}</p>
                              {row.company && row.company !== row.sponsorName && <p className="text-text-muted text-xs">{row.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-text-primary font-medium">{row.total}</td>
                        <td className="py-3 px-4 text-center text-accent-green">{row.aired}</td>
                        <td className="py-3 px-4 text-center text-text-muted">{row.total - row.aired}</td>
                        <td className="py-3 px-4 text-right text-text-primary">{row.revenue > 0 ? `${row.revenue.toFixed(0)} €` : '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge text-xs ${
                            row.sponsorStatus === 'aktiv' ? 'bg-accent-green/20 text-accent-green' :
                            row.sponsorStatus === 'pausiert' ? 'bg-accent-orange/20 text-accent-orange' :
                            'bg-surface-overlay text-text-muted'
                          }`}>{row.sponsorStatus}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={`/sponsors/${row.sponsorId}`} className="text-accent-purple text-xs hover:underline">Details →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {report.bySponsor.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-surface-border">
                        <td className="py-3 px-4 text-text-primary font-semibold">Gesamt</td>
                        <td className="py-3 px-4 text-center text-text-primary font-semibold">{report.totalPlacements}</td>
                        <td className="py-3 px-4 text-center text-accent-green font-semibold">{report.airedPlacements}</td>
                        <td className="py-3 px-4 text-center text-text-muted font-semibold">{report.totalPlacements - report.airedPlacements}</td>
                        <td className="py-3 px-4 text-right text-text-primary font-semibold">{report.totalRevenue > 0 ? `${report.totalRevenue.toFixed(0)} €` : '—'}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {report.byCategory && report.byCategory.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Auswertung je Werbekategorie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {report.byCategory.map((cat: any) => (
                  <div key={cat.categoryId} className="bg-obsidian-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#7c3aed' }} />
                      <h4 className="text-text-primary font-medium text-sm">{cat.categoryName}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-text-primary font-bold">{cat.total}</p>
                        <p className="text-text-muted text-xs">Gesamt</p>
                      </div>
                      <div>
                        <p className="text-accent-green font-bold">{cat.aired}</p>
                        <p className="text-text-muted text-xs">Ausgestrahlt</p>
                      </div>
                      <div>
                        <p className="text-text-primary font-bold">{cat.revenue > 0 ? `${cat.revenue.toFixed(0)}€` : '—'}</p>
                        <p className="text-text-muted text-xs">Budget</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Placements */}
          {report.upcoming && report.upcoming.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Clock size={16} className="text-accent-orange" />
                Anstehende Platzierungen
              </h3>
              <div className="space-y-2">
                {report.upcoming.map((pl: any) => (
                  <div key={pl.id} className="flex items-center gap-4 p-3 rounded-lg bg-obsidian-800">
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-text-muted text-xs">{new Date(pl.airDate).toLocaleString('de-DE', { month: 'short' })}</p>
                      <p className="text-text-primary font-bold">{new Date(pl.airDate).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium truncate">{pl.sponsorName}</p>
                      <p className="text-text-muted text-xs">{pl.episodeTitle || 'Keine Episode'} · {pl.position?.replace('-', ' ')}</p>
                    </div>
                    <span className={`badge text-xs ${
                      pl.status === 'bereit' ? 'bg-accent-green/20 text-accent-green' :
                      pl.status === 'in_produktion' ? 'bg-accent-purple/20 text-accent-purple' :
                      pl.status === 'material_ausstehend' ? 'bg-accent-orange/20 text-accent-orange' :
                      'bg-surface-overlay text-text-muted'
                    }`}>{STATUS_LABELS[pl.status] || pl.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
