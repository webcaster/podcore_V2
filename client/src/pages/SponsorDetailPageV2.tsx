import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Edit2, Loader2, Mail, Phone,
  Globe, Building2, Calendar, Clock, Tag, CheckCircle, XCircle,
  AlertCircle, Megaphone, BarChart3, FileText, Package, Mic2,
  ExternalLink, Download, FileSpreadsheet, CalendarRange, Info, TrendingUp,
  ChevronDown, ChevronUp, Euro, Receipt, Filter, RefreshCw
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { sponsorsV2Api } from '../lib/api-v2';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

export default function SponsorDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();

  const [sponsor, setSponsor] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stammdaten' | 'contracts' | 'slots' | 'bookings' | 'billing'>('stammdaten');

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [contractForm, setContractForm] = useState({
    contractStart: '', contractEnd: '', contactPerson: '',
    contactEmail: '', contactPhone: '', notes: '',
  });

  // Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    slotId: '', episodeId: '', bookingDate: '', bookingEndDate: '',
    price: '', priceModel: 'per_episode', notes: '', invoiceStatus: 'offen',
    status: 'geplant',
  });

  // Billing Tab State
  const [billingFilter, setBillingFilter] = useState<'alle' | 'offen' | 'versendet' | 'bezahlt'>('alle');
  const [leistungIntro, setLeistungIntro] = useState('');
  const [leistungOutro, setLeistungOutro] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfDocTitle, setPdfDocTitle] = useState('');
  const [isExportingLeistung, setIsExportingLeistung] = useState(false);
  const [lastExportTime, setLastExportTime] = useState('');

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [spData, contractsData, bookingsData, slotsData] = await Promise.all([
        sponsorsApi.get(id),
        sponsorsV2Api.listContracts(id),
        sponsorsV2Api.listBookings(id),
        sponsorsV2Api.listAllSlots(),
      ]);
      setSponsor(spData);
      setContracts(contractsData || []);
      setBookings(bookingsData || []);
      setSlots(slotsData || []);
      if (spData.lastPerformanceExport) setLastExportTime(spData.lastPerformanceExport);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Contract Handlers ─────────────────────────────────────────────────────
  const handleSaveContract = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      if (editingContract) {
        await sponsorsV2Api.updateContract(editingContract.id, contractForm);
        showSuccess('Vertrag aktualisiert');
      } else {
        await sponsorsV2Api.createContract(id, contractForm);
        showSuccess('Vertrag erstellt');
      }
      setShowContractModal(false);
      setEditingContract(null);
      setContractForm({ contractStart: '', contractEnd: '', contactPerson: '', contactEmail: '', contactPhone: '', notes: '' });
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Vertrag wirklich löschen?')) return;
    try {
      await sponsorsV2Api.deleteContract(contractId);
      showSuccess('Vertrag gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  // ── Booking Handlers ──────────────────────────────────────────────────────
  const handleSaveBooking = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload = {
        slotId: bookingForm.slotId,
        episodeId: bookingForm.episodeId || null,
        bookingDate: bookingForm.bookingDate,
        bookingEndDate: bookingForm.bookingEndDate || null,
        price: parseFloat(bookingForm.price) || 0,
        notes: bookingForm.notes || null,
        invoiceStatus: bookingForm.invoiceStatus,
        status: bookingForm.status,
      };
      if (editingBooking) {
        await sponsorsV2Api.updateBooking(editingBooking.id, payload);
        showSuccess('Buchung aktualisiert');
      } else {
        await sponsorsV2Api.createBooking(id, payload);
        showSuccess('Buchung erstellt');
      }
      setShowBookingModal(false);
      setEditingBooking(null);
      setBookingForm({ slotId: '', episodeId: '', bookingDate: '', bookingEndDate: '', price: '', priceModel: 'per_episode', notes: '', invoiceStatus: 'offen', status: 'geplant' });
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Buchung wirklich löschen?')) return;
    try {
      await sponsorsV2Api.deleteBooking(bookingId);
      showSuccess('Buchung gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  // ── Billing Exports ───────────────────────────────────────────────────────
  const filteredBookings = billingFilter === 'alle' ? bookings
    : bookings.filter(b => b.invoiceStatus === billingFilter);

  const totalRevenue = bookings.reduce((s, b) => s + (b.finalPrice || b.price || 0), 0);
  const openRevenue = bookings.filter(b => b.invoiceStatus !== 'bezahlt' && b.invoiceStatus !== 'storniert')
    .reduce((s, b) => s + (b.finalPrice || b.price || 0), 0);
  const paidCount = bookings.filter(b => b.invoiceStatus === 'bezahlt').length;

  const handleExportLeistungPdf = async () => {
    if (!id) return;
    setIsExportingLeistung(true);
    try {
      const params = new URLSearchParams();
      if (billingFilter !== 'alle') params.set('filter', billingFilter);
      if (leistungIntro) params.set('intro', leistungIntro);
      if (leistungOutro) params.set('outro', leistungOutro);
      if (pdfDocTitle) params.set('documentTitle', encodeURIComponent(pdfDocTitle));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/sponsors/${id}/invoice-pdf${qs}`, { credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `PDF-Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const defaultName = `leistungsuebersicht-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || id}`;
      a.download = pdfFileName ? `${pdfFileName.replace(/\.pdf$/i, '')}.pdf` : `${defaultName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Leistungsübersicht exportiert');
      setLastExportTime(new Date().toISOString());
    } catch (err: any) { showError(err.message); }
    finally { setIsExportingLeistung(false); }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Werbe-Slot', 'Laufzeit Von', 'Laufzeit Bis', 'Preis', 'Rechnungsstatus', 'Status', 'Notizen'],
      ...filteredBookings.map((b: any) => [
        b.slotName || '–',
        b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('de-DE') : '–',
        b.bookingEndDate ? new Date(b.bookingEndDate).toLocaleDateString('de-DE') : '–',
        b.finalPrice != null ? `${(b.finalPrice).toFixed(2)} €` : b.price != null ? `${(b.price).toFixed(2)} €` : '–',
        b.invoiceStatus || 'offen',
        b.status || '–',
        b.notes || '–',
      ])
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buchungen-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('CSV exportiert');
  };

  const handleExportConfirmation = async (bookingId: string) => {
    try {
      const url = sponsorsV2Api.getConfirmationPdfUrl(bookingId);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `PDF-Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `buchungsbestaetigung-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || id}-${bookingId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      showSuccess('Buchungsbestätigung exportiert');
    } catch (err: any) { showError(err.message); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const invoiceStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      bezahlt: 'bg-green-900/30 text-green-400 border-green-700/40',
      versendet: 'bg-blue-900/30 text-blue-400 border-blue-700/40',
      offen: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
      storniert: 'bg-red-900/30 text-red-400 border-red-700/40',
    };
    return map[status] || 'bg-gray-700/50 text-gray-400 border-gray-600/40';
  };

  const bookingStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      geplant: 'bg-blue-900/30 text-blue-400',
      bestätigt: 'bg-green-900/30 text-green-400',
      ausgestrahlt: 'bg-purple-900/30 text-purple-400',
      storniert: 'bg-red-900/30 text-red-400',
    };
    return map[status] || 'bg-gray-700 text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Sponsor nicht gefunden</p>
        <button onClick={() => navigate('/sponsors')} className="mt-4 text-purple-400 hover:text-purple-300">
          ← Zurück zu Sponsoren
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sponsors')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{sponsor.name}</h1>
            <p className="text-sm text-gray-400">{sponsor.company}{sponsor.customer_number ? ` · KD-Nr: ${sponsor.customer_number}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            sponsor.status === 'aktiv' ? 'bg-green-900/30 text-green-400' :
            sponsor.status === 'inaktiv' ? 'bg-red-900/30 text-red-400' :
            'bg-gray-700 text-gray-400'
          }`}>{sponsor.status || 'unbekannt'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-800 bg-gray-900/50 px-6">
        {(['stammdaten', 'contracts', 'slots', 'bookings', 'billing'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'stammdaten' && 'Stammdaten'}
            {tab === 'contracts' && `Verträge${contracts.length > 0 ? ` (${contracts.length})` : ''}`}
            {tab === 'slots' && 'Werbe-Slots'}
            {tab === 'bookings' && `Buchungen${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
            {tab === 'billing' && 'Abrechnung'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Stammdaten Tab ──────────────────────────────────────────────── */}
        {activeTab === 'stammdaten' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-purple-400" /> Sponsor-Stammdaten
              </h2>
              <SponsorStammdatenForm sponsor={sponsor} onSaved={(updated: any) => setSponsor({ ...sponsor, ...updated })} />
            </div>
          </div>
        )}

        {/* ── Verträge Tab ────────────────────────────────────────────────── */}
        {activeTab === 'contracts' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Sponsoring-Verträge</h2>
                <p className="text-xs text-gray-500 mt-0.5">Vertragslaufzeiten und Ansprechpartner für diesen Sponsor</p>
              </div>
              <button
                onClick={() => {
                  setEditingContract(null);
                  setContractForm({ contractStart: '', contractEnd: '', contactPerson: '', contactEmail: '', contactPhone: '', notes: '' });
                  setShowContractModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={16} /> Neuer Vertrag
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-900/30 rounded-lg border border-gray-800">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Verträge hinterlegt</p>
                <p className="text-xs text-gray-500 mt-1">Verträge dienen zur Dokumentation der Vertragslaufzeiten und Ansprechpartner.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {contracts.map((contract: any) => {
                  const isActive = contract.status === 'aktiv';
                  const isExpiring = contract.contractEnd && new Date(contract.contractEnd) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={contract.id} className={`p-4 bg-gray-900/50 border rounded-lg ${
                      isActive && !isExpiring ? 'border-green-800/40' :
                      isExpiring ? 'border-yellow-800/40' : 'border-gray-800'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1 ${
                            contract.status === 'aktiv' ? 'bg-green-400' :
                            contract.status === 'auslaufend' ? 'bg-yellow-400' : 'bg-gray-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-sm">
                                {contract.contractStart ? new Date(contract.contractStart).toLocaleDateString('de-DE') : '?'}
                                {' '}–{' '}
                                {contract.contractEnd ? new Date(contract.contractEnd).toLocaleDateString('de-DE') : '?'}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                contract.status === 'aktiv' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                                contract.status === 'auslaufend' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40' :
                                'bg-gray-700/50 text-gray-400 border-gray-600/40'
                              }`}>{contract.status || 'unbekannt'}</span>
                            </div>
                            {isExpiring && contract.status === 'aktiv' && (
                              <p className="text-xs text-yellow-400 mt-0.5 flex items-center gap-1">
                                <AlertCircle size={10} /> Läuft in weniger als 30 Tagen aus
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingContract(contract);
                              setContractForm({
                                contractStart: contract.contractStart?.split('T')[0] || '',
                                contractEnd: contract.contractEnd?.split('T')[0] || '',
                                contactPerson: contract.contactPerson || '',
                                contactEmail: contract.contactEmail || '',
                                contactPhone: contract.contactPhone || '',
                                notes: contract.notes || '',
                              });
                              setShowContractModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {(contract.contactPerson || contract.contactEmail || contract.contactPhone) && (
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800">
                          {contract.contactPerson && (
                            <span className="flex items-center gap-1"><Building2 size={10} /> {contract.contactPerson}</span>
                          )}
                          {contract.contactEmail && (
                            <a href={`mailto:${contract.contactEmail}`} className="flex items-center gap-1 hover:text-purple-400">
                              <Mail size={10} /> {contract.contactEmail}
                            </a>
                          )}
                          {contract.contactPhone && (
                            <a href={`tel:${contract.contactPhone}`} className="flex items-center gap-1 hover:text-purple-400">
                              <Phone size={10} /> {contract.contactPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {contract.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{contract.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Werbe-Slots Tab ─────────────────────────────────────────────── */}
        {activeTab === 'slots' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Verfügbare Werbe-Slots</h2>
              <p className="text-xs text-gray-500 mt-0.5">Buchbare Werbekategorien aus den globalen Einstellungen</p>
            </div>
            {slots.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-900/30 rounded-lg">
                Keine Werbe-Slots definiert
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {slots.map((slot: any) => (
                  <div key={slot.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {slot.color && (
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
                        )}
                        <h3 className="font-medium text-white">{slot.name}</h3>
                        {slot.isExclusive && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 rounded">Exklusiv</span>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded capitalize">
                        {slot.defaultPosition || slot.position || '—'}
                      </span>
                    </div>
                    {slot.description && (
                      <p className="text-xs text-gray-400 mb-2">{slot.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {slot.duration && <span className="text-gray-500">Dauer: {slot.duration}s</span>}
                      {slot.basePrice > 0 && <span className="px-1.5 py-0.5 bg-gray-800 text-green-400 rounded">Basis: {slot.basePrice} {slot.currency}</span>}
                      {slot.pricePerEpisode > 0 && <span className="px-1.5 py-0.5 bg-gray-800 text-blue-400 rounded">{slot.pricePerEpisode} {slot.currency}/Folge</span>}
                      {slot.pricePer1000 > 0 && <span className="px-1.5 py-0.5 bg-gray-800 text-orange-400 rounded">{slot.pricePer1000} {slot.currency}/1.000 Hörer</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Buchungen Tab ───────────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Buchungen</h2>
                <p className="text-xs text-gray-500 mt-0.5">Alle Werbebuchungen für {sponsor.name}</p>
              </div>
              <button
                onClick={() => {
                  setEditingBooking(null);
                  setBookingForm({ slotId: '', episodeId: '', bookingDate: '', bookingEndDate: '', price: '', priceModel: 'per_episode', notes: '', invoiceStatus: 'offen', status: 'geplant' });
                  setShowBookingModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={16} /> Neue Buchung
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-900/30 rounded-lg border border-gray-800">
                <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Buchungen vorhanden</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {bookings.map((booking: any) => {
                  const displayPrice = booking.finalPrice ?? booking.price ?? 0;
                  return (
                    <div key={booking.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{booking.slotName || '—'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bookingStatusBadge(booking.status)}`}>
                              {booking.status || 'geplant'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${invoiceStatusBadge(booking.invoiceStatus)}`}>
                              {booking.invoiceStatus || 'offen'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <CalendarRange size={10} />
                            {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('de-DE') : '–'}
                            {booking.bookingEndDate && <> – {new Date(booking.bookingEndDate).toLocaleDateString('de-DE')}</>}
                            {booking.bookingDate && booking.bookingEndDate && (() => {
                              const days = Math.round((new Date(booking.bookingEndDate).getTime() - new Date(booking.bookingDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                              return <span className="text-gray-500 ml-1">({days} Tage)</span>;
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-green-400">{displayPrice > 0 ? `${displayPrice.toFixed(2)} €` : '–'}</span>
                          <button
                            onClick={() => handleExportConfirmation(booking.id)}
                            className="p-1.5 text-gray-400 hover:text-violet-300 hover:bg-violet-900/20 rounded transition-colors"
                            title="Buchungsbestätigung als PDF"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBooking(booking);
                              setBookingForm({
                                slotId: booking.slotId,
                                episodeId: booking.episodeId || '',
                                bookingDate: booking.bookingDate?.split('T')[0] || '',
                                bookingEndDate: booking.bookingEndDate?.split('T')[0] || '',
                                price: String(booking.price ?? ''),
                                priceModel: 'per_episode',
                                notes: booking.notes || '',
                                invoiceStatus: booking.invoiceStatus || 'offen',
                                status: booking.status || 'geplant',
                              });
                              setShowBookingModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {booking.notes && (
                        <p className="text-xs text-gray-500 italic mt-1">{booking.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Abrechnung Tab ──────────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div className="space-y-6 max-w-4xl">

            {/* Kennzahlen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">{bookings.length}</p>
                <p className="text-xs text-gray-400 mt-1">Buchungen gesamt</p>
              </div>
              <div className="p-4 bg-green-900/20 border border-green-800/40 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{paidCount}</p>
                <p className="text-xs text-gray-400 mt-1">Bezahlt</p>
              </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                <p className="text-xl font-bold text-white">{totalRevenue.toFixed(2)} €</p>
                <p className="text-xs text-gray-400 mt-1">Gesamtumsatz</p>
              </div>
              <div className="p-4 bg-yellow-900/20 border border-yellow-800/40 rounded-lg text-center">
                <p className="text-xl font-bold text-yellow-400">{openRevenue.toFixed(2)} €</p>
                <p className="text-xs text-gray-400 mt-1">Offen / ausstehend</p>
              </div>
            </div>

            {/* Leistungsübersicht erstellen */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-400" />
                <h3 className="font-semibold text-white">Leistungsübersicht erstellen</h3>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-xs text-blue-300">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  Die Leistungsübersicht dient als Grundlage für die Rechnungserstellung in eurer internen Software.
                  Sie enthält alle Buchungen mit Zeitraum, Preismodell und Betrag. Die eigentliche Rechnung wird extern erstellt.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Buchungen filtern</label>
                  <select
                    value={billingFilter}
                    onChange={e => setBillingFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="alle">Alle Buchungen ({bookings.length})</option>
                    <option value="offen">Nur offene ({bookings.filter(b => b.invoiceStatus === 'offen' || !b.invoiceStatus).length})</option>
                    <option value="versendet">Nur versendet ({bookings.filter(b => b.invoiceStatus === 'versendet').length})</option>
                    <option value="bezahlt">Nur bezahlt ({bookings.filter(b => b.invoiceStatus === 'bezahlt').length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Dateiname (optional)</label>
                  <input
                    type="text"
                    value={pdfFileName}
                    onChange={e => setPdfFileName(e.target.value)}
                    placeholder={`leistungsuebersicht-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || 'sponsor'}.pdf`}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Dokumententitel im PDF <span className="font-normal text-gray-500">(erscheint im Header)</span>
                </label>
                <input
                  type="text"
                  value={pdfDocTitle}
                  onChange={e => setPdfDocTitle(e.target.value)}
                  placeholder="Leistungsübersicht Sponsoring"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Einleitungstext (optional)</label>
                <textarea
                  value={leistungIntro}
                  onChange={e => setLeistungIntro(e.target.value)}
                  rows={3}
                  placeholder={`z.B. Sehr geehrte Damen und Herren,\nhiermit übersenden wir Ihnen die Leistungsübersicht für Ihre Werbeschaltungen im Zeitraum...`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Schlusstext / Zahlungshinweis (optional)</label>
                <textarea
                  value={leistungOutro}
                  onChange={e => setLeistungOutro(e.target.value)}
                  rows={2}
                  placeholder="z.B. Zahlbar innerhalb von 14 Tagen ohne Abzug. Bei Fragen stehen wir gerne zur Verfügung."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {bookings.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-300">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>Noch keine Buchungen vorhanden. Erstelle zuerst Buchungen im Tab "Buchungen".</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleExportLeistungPdf}
                  disabled={isExportingLeistung || bookings.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExportingLeistung ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Leistungsübersicht (PDF)
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={bookings.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet size={15} />
                  Als CSV exportieren
                </button>
              </div>

              {(lastExportTime || sponsor?.lastPerformanceExport) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-800">
                  <CheckCircle size={12} className="text-green-400 shrink-0" />
                  <span>
                    Zuletzt exportiert am{' '}
                    <span className="text-gray-300 font-medium">
                      {new Date(lastExportTime || sponsor?.lastPerformanceExport).toLocaleString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {' '}– Grundlage für Rechnungserstellung in externer Software.
                  </span>
                </div>
              )}
            </div>

            {/* Buchungsliste mit Rechnungsstatus */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Receipt size={16} className="text-blue-400" />
                  Buchungsübersicht
                  {billingFilter !== 'alle' && (
                    <span className="text-xs text-gray-400 font-normal">— gefiltert: {billingFilter}</span>
                  )}
                </h3>
                <span className="text-xs text-gray-500">
                  {filteredBookings.length} Buchungen · {filteredBookings.reduce((s, b) => s + (b.finalPrice || b.price || 0), 0).toFixed(2)} €
                </span>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 text-sm">
                  Keine Buchungen für diesen Filter
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBookings.map((booking: any) => {
                    const displayPrice = booking.finalPrice ?? booking.price ?? 0;
                    return (
                      <div key={booking.id} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white truncate">{booking.slotName || '—'}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bookingStatusBadge(booking.status)}`}>
                                {booking.status || 'geplant'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <CalendarRange size={9} />
                              {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('de-DE') : '–'}
                              {booking.bookingEndDate && <> – {new Date(booking.bookingEndDate).toLocaleDateString('de-DE')}</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-green-400">{displayPrice > 0 ? `${displayPrice.toFixed(2)} €` : '–'}</span>
                            {/* Rechnungsstatus ändern */}
                            <select
                              value={booking.invoiceStatus || 'offen'}
                              onChange={async (e) => {
                                try {
                                  await sponsorsV2Api.updateBooking(booking.id, { invoiceStatus: e.target.value });
                                  showSuccess('Rechnungsstatus aktualisiert');
                                  load();
                                } catch (err: any) { showError(err.message); }
                              }}
                              className={`text-[10px] px-2 py-1 rounded border bg-gray-900 cursor-pointer focus:outline-none ${invoiceStatusBadge(booking.invoiceStatus || 'offen')}`}
                            >
                              <option value="offen">offen</option>
                              <option value="versendet">versendet</option>
                              <option value="bezahlt">bezahlt</option>
                              <option value="storniert">storniert</option>
                            </select>
                            <button
                              onClick={() => handleExportConfirmation(booking.id)}
                              className="p-1.5 text-gray-400 hover:text-violet-300 hover:bg-violet-900/20 rounded transition-colors"
                              title="Buchungsbestätigung als PDF exportieren"
                            >
                              <FileText size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Contract Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title={editingContract ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Hinterlege Vertragslaufzeit und Ansprechpartner für {sponsor.name}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vertragsbeginn *</label>
              <input type="date" value={contractForm.contractStart}
                onChange={(e) => setContractForm({ ...contractForm, contractStart: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vertragsende *</label>
              <input type="date" value={contractForm.contractEnd}
                onChange={(e) => setContractForm({ ...contractForm, contractEnd: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ansprechpartner beim Sponsor</label>
            <input type="text" value={contractForm.contactPerson}
              onChange={(e) => setContractForm({ ...contractForm, contactPerson: e.target.value })}
              placeholder="Vor- und Nachname"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-Mail</label>
              <input type="email" value={contractForm.contactEmail}
                onChange={(e) => setContractForm({ ...contractForm, contactEmail: e.target.value })}
                placeholder="kontakt@firma.de"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Telefon</label>
              <input type="tel" value={contractForm.contactPhone}
                onChange={(e) => setContractForm({ ...contractForm, contactPhone: e.target.value })}
                placeholder="+49 ..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notizen</label>
            <textarea value={contractForm.notes}
              onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
              rows={3} placeholder="Interne Notizen zum Vertrag..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveContract} disabled={isSaving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {isSaving ? 'Speichert...' : 'Speichern'}
            </button>
            <button onClick={() => setShowContractModal(false)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Booking Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={editingBooking ? 'Buchung bearbeiten' : 'Neue Buchung'}
      >
        <div className="space-y-4">
          {/* Werbe-Slot Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Werbe-Slot *</label>
            <select
              value={bookingForm.slotId}
              onChange={(e) => {
                const selectedSlot = slots.find((s: any) => s.id === e.target.value);
                // camelCase-Felder aus der API verwenden
                const defaultPrice = selectedSlot
                  ? String(selectedSlot.pricePerEpisode || selectedSlot.basePrice || '')
                  : '';
                const defaultModel = selectedSlot?.pricePerEpisode ? 'per_episode'
                  : selectedSlot?.basePrice ? 'base'
                  : selectedSlot?.pricePer1000 ? 'cpm'
                  : 'per_episode';
                setBookingForm({ ...bookingForm, slotId: e.target.value, price: defaultPrice, priceModel: defaultModel });
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Werbekategorie auswählen --</option>
              {slots.map((slot: any) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}{slot.defaultPosition ? ` (${slot.defaultPosition})` : ''}
                </option>
              ))}
            </select>

            {/* Preismodell-Auswahl – verwendet camelCase-Felder */}
            {bookingForm.slotId && (() => {
              const sel = slots.find((s: any) => s.id === bookingForm.slotId);
              if (!sel) return null;
              const hasBase = sel.basePrice > 0;
              const hasEpisode = sel.pricePerEpisode > 0;
              const hasCpm = sel.pricePer1000 > 0;
              if (!hasBase && !hasEpisode && !hasCpm) return (
                <p className="text-xs text-gray-500 mt-2">Keine Preise für diesen Slot hinterlegt – bitte manuell eingeben.</p>
              );
              return (
                <div className="mt-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preismodell wählen</p>
                  <div className="grid grid-cols-3 gap-2">
                    {hasBase && (
                      <button type="button"
                        onClick={() => setBookingForm({ ...bookingForm, priceModel: 'base', price: String(sel.basePrice) })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          bookingForm.priceModel === 'base'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}>
                        <div>Basis</div>
                        <div className="font-bold mt-0.5">{sel.basePrice} {sel.currency}</div>
                      </button>
                    )}
                    {hasEpisode && (
                      <button type="button"
                        onClick={() => setBookingForm({ ...bookingForm, priceModel: 'per_episode', price: String(sel.pricePerEpisode) })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          bookingForm.priceModel === 'per_episode'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}>
                        <div>Pro Folge</div>
                        <div className="font-bold mt-0.5">{sel.pricePerEpisode} {sel.currency}</div>
                      </button>
                    )}
                    {hasCpm && (
                      <button type="button"
                        onClick={() => setBookingForm({ ...bookingForm, priceModel: 'cpm', price: String(sel.pricePer1000) })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          bookingForm.priceModel === 'cpm'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}>
                        <div>CPM</div>
                        <div className="font-bold mt-0.5">{sel.pricePer1000} {sel.currency}/1k</div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Laufzeit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Laufzeit Von *</label>
              <input type="date" value={bookingForm.bookingDate}
                onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Laufzeit Bis *</label>
              <input type="date" value={bookingForm.bookingEndDate}
                min={bookingForm.bookingDate || undefined}
                onChange={(e) => setBookingForm({ ...bookingForm, bookingEndDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          {bookingForm.bookingDate && bookingForm.bookingEndDate && (
            <p className="text-xs text-gray-400 -mt-2">
              Laufzeit: {Math.max(1, Math.ceil((new Date(bookingForm.bookingEndDate).getTime() - new Date(bookingForm.bookingDate).getTime()) / (1000 * 60 * 60 * 24) + 1))} Tage
            </p>
          )}

          {/* Preis */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Preis (EUR)</label>
            <input type="number" step="0.01" value={bookingForm.price}
              onChange={(e) => setBookingForm({ ...bookingForm, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Buchungsstatus</label>
              <select value={bookingForm.status}
                onChange={(e) => setBookingForm({ ...bookingForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500">
                <option value="geplant">Geplant</option>
                <option value="bestätigt">Bestätigt</option>
                <option value="ausgestrahlt">Ausgestrahlt</option>
                <option value="storniert">Storniert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rechnungsstatus</label>
              <select value={bookingForm.invoiceStatus}
                onChange={(e) => setBookingForm({ ...bookingForm, invoiceStatus: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500">
                <option value="offen">Offen</option>
                <option value="versendet">Versendet</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="storniert">Storniert</option>
              </select>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notizen (optional)</label>
            <textarea value={bookingForm.notes}
              onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
              rows={2} placeholder="Interne Notizen zur Buchung..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveBooking} disabled={isSaving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {isSaving ? 'Speichert...' : 'Speichern'}
            </button>
            <button onClick={() => setShowBookingModal(false)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Stammdaten-Formular Komponente ──────────────────────────────────────────
function SponsorStammdatenForm({ sponsor, onSaved }: { sponsor: any; onSaved: (data: any) => void }) {
  const { showSuccess, showError } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: sponsor.name || '',
    company: sponsor.company || '',
    customerNumber: sponsor.customer_number || sponsor.customerNumber || '',
    contactName: sponsor.contact_name || sponsor.contactName || '',
    contactEmail: sponsor.contact_email || sponsor.contactEmail || '',
    contactPhone: sponsor.contact_phone || sponsor.contactPhone || '',
    website: sponsor.website || '',
    description: sponsor.description || '',
    notes: sponsor.notes || '',
    status: sponsor.status || 'interessent',
    adDelivery: sponsor.ad_delivery || sponsor.adDelivery || 'self',
    contactHint: sponsor.contact_hint || sponsor.contactHint || '',
    totalBudget: sponsor.total_budget || sponsor.totalBudget || '',
    contractStart: sponsor.contract_start || sponsor.contractStart || '',
    contractEnd: sponsor.contract_end || sponsor.contractEnd || '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await sponsorsApi.update(sponsor.id, form);
      onSaved(form);
      showSuccess('Stammdaten erfolgreich gespeichert');
    } catch (e) {
      showError('Fehler beim Speichern der Stammdaten');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="space-y-6">
      {/* Basis-Informationen */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Basis-Informationen</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Sponsor-Name" />
          </div>
          <div>
            <label className={labelClass}>Firma</label>
            <input className={inputClass} value={form.company} onChange={e => handleChange('company', e.target.value)} placeholder="Firmenname" />
          </div>
          <div>
            <label className={labelClass}>Kundennummer</label>
            <input className={`${inputClass} font-mono`} value={form.customerNumber}
              onChange={e => handleChange('customerNumber', e.target.value)} placeholder="z.B. KD-2024-001" />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={e => handleChange('status', e.target.value)}>
              <option value="interessent">Interessent</option>
              <option value="aktiv">Aktiv</option>
              <option value="inaktiv">Inaktiv</option>
              <option value="pausiert">Pausiert</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input className={inputClass} value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Werbe-Lieferung</label>
            <select className={inputClass} value={form.adDelivery} onChange={e => handleChange('adDelivery', e.target.value)}>
              <option value="self">Selbst produziert</option>
              <option value="provided">Vom Sponsor geliefert</option>
              <option value="host_read">Host-Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kontaktdaten */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Kontaktdaten</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ansprechpartner</label>
            <input className={inputClass} value={form.contactName} onChange={e => handleChange('contactName', e.target.value)} placeholder="Vor- und Nachname" />
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input className={inputClass} type="email" value={form.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} placeholder="kontakt@firma.de" />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input className={inputClass} value={form.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} placeholder="+49 ..." />
          </div>
          <div>
            <label className={labelClass}>Kontakt-Hinweis</label>
            <input className={inputClass} value={form.contactHint} onChange={e => handleChange('contactHint', e.target.value)} placeholder="z.B. Nur per E-Mail" />
          </div>
        </div>
      </div>

      {/* Vertragsdaten */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Vertragsdaten</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vertragsstart</label>
            <input className={inputClass} type="date" value={form.contractStart} onChange={e => handleChange('contractStart', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Vertragsende</label>
            <input className={inputClass} type="date" value={form.contractEnd} onChange={e => handleChange('contractEnd', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Gesamtbudget (EUR)</label>
            <input className={inputClass} type="number" value={form.totalBudget} onChange={e => handleChange('totalBudget', e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* Beschreibung & Notizen */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Beschreibung & Notizen</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Beschreibung</label>
            <textarea className={`${inputClass} h-20 resize-none`} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Kurzbeschreibung des Sponsors..." />
          </div>
          <div>
            <label className={labelClass}>Interne Notizen</label>
            <textarea className={`${inputClass} h-20 resize-none`} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Interne Notizen..." />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50">
          <Save size={16} />
          {isSaving ? 'Speichert...' : 'Stammdaten speichern'}
        </button>
      </div>
    </div>
  );
}
