import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Edit2, Loader2, Mail, Phone,
  Globe, Building2, Calendar, Clock, Tag, CheckCircle, XCircle,
  AlertCircle, Megaphone, BarChart3, FileText, Package, Mic2,
  ExternalLink, Download, FileSpreadsheet, CalendarRange, Info, TrendingUp,
  ChevronDown, ChevronUp
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
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'contracts' | 'slots' | 'bookings' | 'billing'>('contracts');
  const [form, setForm] = useState<any>({});

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [contractForm, setContractForm] = useState({
    contractStart: '',
    contractEnd: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
  });

  // Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    slotId: '',
    episodeId: '',
    bookingDate: '',
    bookingEndDate: '',
    price: '',
    priceAdjustment: '',
    listenerFee: '',
    notes: '',
    invoiceStatus: 'offen',
  });

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [spData, contractsData, bookingsData, slotsData] = await Promise.all([
        sponsorsApi.get(id),
        sponsorsV2Api.listContracts(id),
        sponsorsV2Api.listBookings(id),
        sponsorsApi.listSlots(id),
      ]);

      setSponsor(spData);
      setContracts(contractsData || []);
      setBookings(bookingsData || []);
      setSlots(slotsData || []);

      setForm({
        name: spData.name || '',
        company: spData.company || '',
        email: spData.contactEmail || '',
        phone: spData.contactPhone || '',
        website: spData.website || '',
        status: spData.status || 'aktiv',
        notes: spData.notes || '',
        currency: spData.currency || 'EUR',
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSaveSponsor = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await sponsorsApi.update(id, form);
      setIsDirty(false);
      showSuccess('Sponsor gespeichert');
      load();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
      setContractForm({
        contractStart: '',
        contractEnd: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        notes: '',
      });
      load();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Vertrag wirklich löschen?')) return;
    try {
      await sponsorsV2Api.deleteContract(contractId);
      showSuccess('Vertrag gelöscht');
      load();
    } catch (err: any) {
      showError(err.message);
    }
  };

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
        priceAdjustment: parseFloat(bookingForm.priceAdjustment) || 0,
        listenerFee: parseFloat(bookingForm.listenerFee) || 0,
        notes: bookingForm.notes || null,
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
      setBookingForm({
        slotId: '',
        episodeId: '',
        bookingDate: '',
        bookingEndDate: '',
        price: '',
        priceAdjustment: '',
        listenerFee: '',
        notes: '',
        invoiceStatus: 'offen',
      });
      load();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Buchung wirklich löschen?')) return;
    try {
      await sponsorsV2Api.deleteBooking(bookingId);
      showSuccess('Buchung gelöscht');
      load();
    } catch (err: any) {
      showError(err.message);
    }
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
            <p className="text-sm text-gray-400">{sponsor.company}</p>
          </div>
        </div>
        {isDirty && (
          <button
            onClick={handleSaveSponsor}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-800 bg-gray-900/50 px-6">
        {(['contracts', 'slots', 'bookings', 'billing'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'contracts' && 'Verträge'}
            {tab === 'slots' && 'Werbe-Slots'}
            {tab === 'bookings' && 'Buchungen'}
            {tab === 'billing' && 'Abrechnung'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Sponsoring-Verträge</h2>
              <button
                onClick={() => {
                  setEditingContract(null);
                  setContractForm({
                    contractStart: '',
                    contractEnd: '',
                    contactPerson: '',
                    contactEmail: '',
                    contactPhone: '',
                    notes: '',
                  });
                  setShowContractModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={16} /> Neuer Vertrag
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-900/30 rounded-lg">
                Keine Verträge vorhanden
              </div>
            ) : (
              <div className="grid gap-4">
                {contracts.map((contract: any) => (
                  <div key={contract.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-400">
                          {new Date(contract.contractStart).toLocaleDateString('de-DE')} bis{' '}
                          {new Date(contract.contractEnd).toLocaleDateString('de-DE')}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          contract.status === 'aktiv' ? 'bg-green-900/30 text-green-400' :
                          contract.status === 'auslaufend' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          {contract.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingContract(contract);
                            setContractForm({
                              contractStart: contract.contractStart.split('T')[0],
                              contractEnd: contract.contractEnd.split('T')[0],
                              contactPerson: contract.contactPerson || '',
                              contactEmail: contract.contactEmail || '',
                              contactPhone: contract.contactPhone || '',
                              notes: contract.notes || '',
                            });
                            setShowContractModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {contract.contactPerson && (
                      <p className="text-sm text-gray-300">
                        <strong>Kontakt:</strong> {contract.contactPerson}
                        {contract.contactEmail && ` (${contract.contactEmail})`}
                      </p>
                    )}
                    {contract.notes && (
                      <p className="text-sm text-gray-400 mt-2">{contract.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slots Tab */}
        {activeTab === 'slots' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Verfügbare Werbe-Slots</h2>
            {slots.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-900/30 rounded-lg">
                Keine Werbe-Slots definiert
              </div>
            ) : (
              <div className="grid gap-4">
                {slots.map((slot: any) => (
                  <div key={slot.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-white">{slot.name}</h3>
                      <span className="text-sm px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                        {slot.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Dauer: {slot.duration}s | Status: {slot.status}
                    </p>
                    {slot.price && (
                      <p className="text-sm text-gray-300 mt-1">
                        Preis: {slot.price} {slot.currency}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Buchungen</h2>
              <button
                onClick={() => {
                  setEditingBooking(null);
                  setBookingForm({
                    slotId: '',
                    episodeId: '',
                    bookingDate: '',
                    bookingEndDate: '',
                    price: '',
                    priceAdjustment: '',
                    listenerFee: '',
                    notes: '',
                    invoiceStatus: 'offen',
                  });
                  setShowBookingModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={16} /> Neue Buchung
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-gray-900/30 rounded-lg">
                Keine Buchungen vorhanden
              </div>
            ) : (
              <div className="grid gap-4">
                {bookings.map((booking: any) => (
                  <div key={booking.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">{booking.slotName}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(booking.bookingDate).toLocaleDateString('de-DE')}
                          {booking.bookingEndDate && ` bis ${new Date(booking.bookingEndDate).toLocaleDateString('de-DE')}`}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          booking.status === 'geplant' ? 'bg-blue-900/30 text-blue-400' :
                          booking.status === 'bestätigt' ? 'bg-green-900/30 text-green-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBooking(booking);
                            setBookingForm({
                              slotId: booking.slotId,
                              episodeId: booking.episodeId || '',
                              bookingDate: booking.bookingDate.split('T')[0],
                              bookingEndDate: booking.bookingEndDate ? booking.bookingEndDate.split('T')[0] : '',
                              price: String(booking.price),
                              priceAdjustment: String(booking.priceAdjustment || 0),
                              listenerFee: String(booking.listenerFee || 0),
                              notes: booking.notes || '',
                              invoiceStatus: booking.invoiceStatus,
                            });
                            setShowBookingModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Preis</p>
                        <p className="text-white font-medium">{booking.finalPrice} EUR</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Rechnung</p>
                        <p className={`font-medium ${
                          booking.invoiceStatus === 'bezahlt' ? 'text-green-400' :
                          booking.invoiceStatus === 'versendet' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}>
                          {booking.invoiceStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Abrechnung</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Gesamtbuchungen</p>
                <p className="text-2xl font-bold text-white mt-2">{bookings.length}</p>
              </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Gesamtumsatz</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {bookings.reduce((sum: number, b: any) => sum + (b.finalPrice || 0), 0).toFixed(2)} EUR
                </p>
              </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Offene Rechnungen</p>
                <p className="text-2xl font-bold text-yellow-400 mt-2">
                  {bookings.filter((b: any) => b.invoiceStatus === 'offen').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contract Modal */}
      <Modal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title={editingContract ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vertragsbeginn *</label>
            <input
              type="date"
              value={contractForm.contractStart}
              onChange={(e) => setContractForm({ ...contractForm, contractStart: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vertragsende *</label>
            <input
              type="date"
              value={contractForm.contractEnd}
              onChange={(e) => setContractForm({ ...contractForm, contractEnd: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Kontaktperson</label>
            <input
              type="text"
              value={contractForm.contactPerson}
              onChange={(e) => setContractForm({ ...contractForm, contactPerson: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-Mail</label>
            <input
              type="email"
              value={contractForm.contactEmail}
              onChange={(e) => setContractForm({ ...contractForm, contactEmail: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Telefon</label>
            <input
              type="tel"
              value={contractForm.contactPhone}
              onChange={(e) => setContractForm({ ...contractForm, contactPhone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notizen</label>
            <textarea
              value={contractForm.notes}
              onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveContract}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Speichert...' : 'Speichern'}
            </button>
            <button
              onClick={() => setShowContractModal(false)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={editingBooking ? 'Buchung bearbeiten' : 'Neue Buchung'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Werbe-Slot *</label>
            <select
              value={bookingForm.slotId}
              onChange={(e) => setBookingForm({ ...bookingForm, slotId: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Slot auswählen --</option>
              {slots.map((slot: any) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Buchungsdatum *</label>
            <input
              type="date"
              value={bookingForm.bookingDate}
              onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Preis (EUR)</label>
            <input
              type="number"
              step="0.01"
              value={bookingForm.price}
              onChange={(e) => setBookingForm({ ...bookingForm, price: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveBooking}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Speichert...' : 'Speichern'}
            </button>
            <button
              onClick={() => setShowBookingModal(false)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
