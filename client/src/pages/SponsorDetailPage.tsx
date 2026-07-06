import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Edit2, Loader2, Mail, Phone,
  Globe, Building2, Calendar, Clock, Tag, CheckCircle, XCircle,
  AlertCircle, Megaphone, BarChart3, FileText, Package, Mic2,
  ExternalLink, Download, FileSpreadsheet, CalendarRange, Info, TrendingUp
} from 'lucide-react';
import { sponsorsApi, episodesApi } from '../lib/api';
import PdfLayoutPicker from '../components/ui/PdfLayoutPicker';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const AD_STATUS = [
  { value: 'geplant', label: 'Geplant', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'material_ausstehend', label: 'Material ausstehend', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'material_eingegangen', label: 'Material eingegangen', color: 'bg-accent-cyan/20 text-accent-cyan' },
  { value: 'in_produktion', label: 'In Produktion', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'bereit', label: 'Bereit', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'ausgestrahlt', label: 'Ausgestrahlt', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'abgerechnet', label: 'Abgerechnet', color: 'bg-surface-overlay text-text-muted' },
];

// Berechne Laufzeit in Tagen/Wochen/Monaten
function calcRuntime(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Ungültiger Zeitraum';
  if (days === 0) return '1 Tag';
  if (days < 7) return `${days} Tage`;
  if (days < 31) return `${Math.round(days / 7)} Woche(n)`;
  return `${Math.round(days / 30)} Monat(e)`;
}

export default function SponsorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();
  const [sponsor, setSponsor] = useState<any>(null);
  const [placements, setPlacements] = useState<any[]>([]); // echte ad_placements (aus billing)
  const [slots, setSlots] = useState<any[]>([]); // ad_slots (Werbeplätze)
  const [categories, setCategories] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodeBookings, setEpisodeBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'billing' | 'contact'>('overview');
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [placementForm, setPlacementForm] = useState({
    episodeId: '', categoryId: '', position: 'pre-roll', duration: 30,
    status: 'geplant', deliveryType: 'self', notes: '',
    adTitle: '', adScript: '', airDate: '',
    // Laufzeit der Platzierung
    placementStart: '', placementEnd: '', placementLabel: '',
    // Performance / Lieferung
    performanceNotes: '', deliveryConfirmed: false,
    // Flexibles Preismodell
    priceModel: 'fixed' as 'fixed' | 'per_episode' | 'per_1000',
    price: '',
    basePrice: '',
    pricePerEpisode: '',
    pricePer1000Listens: '',
    currency: 'EUR',
    // Abrechnung
    invoiceNumber: '', invoiceDate: '', invoiceStatus: 'offen', invoiceNotes: '',
    // Manuelle Anpassungen (v2.11.5)
    priceAdjustment: '0',
    listenerFee: '0',
    manualPrice: '',
  });
  const [billingData, setBillingData] = useState<any>(null);
  // Buchungs-Modal: Slot in Episode buchen
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({ episodeId: '', price: '', airDate: '', notes: '', invoiceStatus: 'offen' });
  const [isExportingInvoice, setIsExportingInvoice] = useState(false);
  const [pdfLayoutId, setPdfLayoutId] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfDocTitle, setPdfDocTitle] = useState('');
  const [showPriceHint, setShowPriceHint] = useState(false);

  // Leistungsübersicht: editierbare Texte
  const [leistungIntro, setLeistungIntro] = useState('');
  const [leistungOutro, setLeistungOutro] = useState('');
  const [leistungFilter, setLeistungFilter] = useState<'alle' | 'offen' | 'bezahlt' | 'versendet'>('alle');
  const [isExportingLeistung, setIsExportingLeistung] = useState(false);

  // TKP-Kalkulator
  const [tkpListeners, setTkpListeners] = useState<string>('');
  const [tkpEpisodeCount, setTkpEpisodeCount] = useState<string>('1');
  const [tkpCalcResult, setTkpCalcResult] = useState<any>(null);
  const [isCalcLoading, setIsCalcLoading] = useState(false);

  const openBookingModal = (slot: any) => {
    setBookingSlot(slot);
    setBookingForm({
      episodeId: '',
      price: slot.price != null ? String(slot.price) : (slot.basePrice != null ? String(slot.basePrice) : ''),
      airDate: '',
      notes: '',
      invoiceStatus: 'offen',
    });
    setShowBookingModal(true);
  };

  const handleSaveBooking = async () => {
    if (!bookingSlot) return;
    try {
      const ep = episodes.find((e: any) => e.id === bookingForm.episodeId);
      await sponsorsApi.createPlacement(bookingSlot.id, {
        episodeId: bookingForm.episodeId || null,
        episodeTitle: ep?.title || null,
        episodeNumber: ep?.episodeNumber || null,
        position: bookingSlot.position || 'pre-roll',
        adTitle: bookingSlot.name || bookingSlot.adTitle || 'Werbung',
        price: bookingForm.price ? parseFloat(bookingForm.price) : null,
        currency: sponsor?.currency || 'EUR',
        airDate: bookingForm.airDate || null,
        notes: bookingForm.notes || null,
        invoiceStatus: bookingForm.invoiceStatus,
        status: 'geplant',
      });
      showSuccess('Buchung erfasst');
      setShowBookingModal(false);
      loadBilling();
    } catch (err: any) { showError(err.message); }
  };

  const handleCalculateTkp = async (slot: any) => {
    if (!slot) return;
    setIsCalcLoading(true);
    try {
      const result = await sponsorsApi.calculatePrice({
        basePrice: slot.basePrice || 0,
        pricePerEpisode: slot.pricePerEpisode || 0,
        pricePer1000Listens: slot.pricePer1000Listens || 0,
        episodeCount: parseInt(tkpEpisodeCount) || 1,
        totalListens: parseInt(tkpListeners) || 0,
        priceModel: slot.priceModel || 'fixed',
      });
      setTkpCalcResult({ ...result, slotName: slot.name });
    } catch (e: any) { showError(e.message); }
    finally { setIsCalcLoading(false); }
  };

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [spData, slotData, catData, epData] = await Promise.all([
        sponsorsApi.get(id),
        sponsorsApi.listSlots(id),
        sponsorsApi.listCategories(),
        episodesApi.list({ pageSize: 200 }),
      ]);
      setSponsor(spData);
      setSlots(slotData || []);
      setEpisodeBookings(spData.episodeBookings || []);
      setForm({
        name: spData.name || '',
        company: spData.company || '',
        email: spData.contactEmail || spData.email || '',
        phone: spData.contactPhone || spData.phone || '',
        contactName: spData.contactName || '',
        website: spData.website || '',
        status: spData.status || 'aktiv',
        adDelivery: spData.adDelivery || spData.ad_delivery || 'self',
        notes: spData.notes || '',
        contractStart: spData.contractStart ? spData.contractStart.slice(0, 10) : '',
        contractEnd: spData.contractEnd ? spData.contractEnd.slice(0, 10) : '',
        budget: spData.totalBudget || spData.budget || '',
        color: spData.color || '#059669',
        customerNumber: spData.customerNumber || '',
        contactHint: spData.contactHint || '',
        currency: spData.currency || 'EUR',
      });
      setCategories(catData);
      setEpisodes(epData.items || []);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); loadBilling(); }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await sponsorsApi.update(id, {
        name: form.name,
        company: form.company,
        contactName: form.contactName,
        contactEmail: form.email,
        contactPhone: form.phone,
        website: form.website,
        status: form.status,
        notes: form.notes,
        adDelivery: form.adDelivery,
        contractStart: form.contractStart || null,
        contractEnd: form.contractEnd || null,
        totalBudget: form.budget ? parseFloat(form.budget) : null,
        currency: form.currency,
        color: form.color,
        customerNumber: form.customerNumber || null,
        contactHint: form.contactHint || null,
      });
      setSponsor(updated);
      setEpisodeBookings(updated.episodeBookings || []);
      setIsDirty(false);
      showSuccess('Sponsor gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
    setIsDirty(true);
  };

  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // BUGFIX v2.11.6: Unterscheide zwischen Slot-Edit und Placement-Edit
      if (editingPlacement && editingPlacement.id && editingPlacement.id.startsWith('planned_')) {
        // Slot-Update (Vorplanung)
        const realSlotId = editingPlacement.id.replace('planned_', '');
        const payload = {
          adTitle: placementForm.adTitle,
          name: placementForm.adTitle,
          category: placementForm.categoryId,
          categoryId: placementForm.categoryId || null,
          adCategoryId: placementForm.categoryId || null,
          position: placementForm.position,
          duration: placementForm.duration,
          status: placementForm.status,
          productionType: placementForm.deliveryType === 'produced' ? 'eigenproduktion' : 'fremd',
          script: placementForm.adScript || null,
          notes: placementForm.notes || null,
          placementStart: placementForm.placementStart || null,
          placementEnd: placementForm.placementEnd || null,
          placementLabel: placementForm.placementLabel || null,
          priceModel: placementForm.priceModel,
          price: placementForm.price ? parseFloat(placementForm.price) : null,
          basePrice: placementForm.basePrice ? parseFloat(placementForm.basePrice) : null,
          pricePerEpisode: placementForm.pricePerEpisode ? parseFloat(placementForm.pricePerEpisode) : null,
          pricePer1000Listens: placementForm.pricePer1000Listens ? parseFloat(placementForm.pricePer1000Listens) : null,
          currency: placementForm.currency,
          deliveryConfirmed: placementForm.deliveryConfirmed,
          performanceNotes: placementForm.performanceNotes || null,
          invoiceNotes: placementForm.invoiceNotes || null,
          priceAdjustment: parseFloat(placementForm.priceAdjustment) || 0,
          listenerFee: parseFloat(placementForm.listenerFee) || 0,
          manualPrice: placementForm.manualPrice ? parseFloat(placementForm.manualPrice) : null,
        };
        await sponsorsApi.updateSlot(realSlotId, payload);
        showSuccess('Platzierung aktualisiert');
      } else if (editingPlacement && editingPlacement.id && !editingPlacement.id.startsWith('planned_')) {
        // Placement-Update (echte Buchung) - BUGFIX: Alle Felder speichern
        const payload = {
          adTitle: placementForm.adTitle,
          adCategoryId: placementForm.categoryId || null,
          position: placementForm.position,
          price: placementForm.price ? parseFloat(placementForm.price) : null,
          invoiceStatus: placementForm.invoiceStatus,
          invoiceNumber: placementForm.invoiceNumber || null,
          invoiceDate: placementForm.invoiceDate || null,
          invoiceNotes: placementForm.invoiceNotes || null,
          placementStart: placementForm.placementStart || null,
          placementEnd: placementForm.placementEnd || null,
          placementLabel: placementForm.placementLabel || null,
          performanceNotes: placementForm.performanceNotes || null,
          priceAdjustment: parseFloat(placementForm.priceAdjustment) || 0,
          listenerFee: parseFloat(placementForm.listenerFee) || 0,
          manualPrice: placementForm.manualPrice ? parseFloat(placementForm.manualPrice) : null,
        };
        await sponsorsApi.updatePlacement(editingPlacement.id, payload);
        showSuccess('Buchung aktualisiert');
      } else {
        // Neuer Slot
        const payload = {
          adTitle: placementForm.adTitle,
          name: placementForm.adTitle,
          category: placementForm.categoryId,
          categoryId: placementForm.categoryId || null,
          adCategoryId: placementForm.categoryId || null,
          position: placementForm.position,
          duration: placementForm.duration,
          status: placementForm.status,
          productionType: placementForm.deliveryType === 'produced' ? 'eigenproduktion' : 'fremd',
          script: placementForm.adScript || null,
          notes: placementForm.notes || null,
          placementStart: placementForm.placementStart || null,
          placementEnd: placementForm.placementEnd || null,
          placementLabel: placementForm.placementLabel || null,
          priceModel: placementForm.priceModel,
          price: placementForm.price ? parseFloat(placementForm.price) : null,
          basePrice: placementForm.basePrice ? parseFloat(placementForm.basePrice) : null,
          pricePerEpisode: placementForm.pricePerEpisode ? parseFloat(placementForm.pricePerEpisode) : null,
          pricePer1000Listens: placementForm.pricePer1000Listens ? parseFloat(placementForm.pricePer1000Listens) : null,
          currency: placementForm.currency,
          deliveryConfirmed: placementForm.deliveryConfirmed,
          performanceNotes: placementForm.performanceNotes || null,
          invoiceNotes: placementForm.invoiceNotes || null,
          priceAdjustment: parseFloat(placementForm.priceAdjustment) || 0,
          listenerFee: parseFloat(placementForm.listenerFee) || 0,
          manualPrice: placementForm.manualPrice ? parseFloat(placementForm.manualPrice) : null,
        };
        await sponsorsApi.createSlot(id!, payload);
        showSuccess('Platzierung erstellt');
      }
      setShowPlacementModal(false);
      load(); // lädt Slots neu
      loadBilling(); // lädt echte Placements für Billing-Tab neu
    } catch (err: any) { showError(err.message); }
  };

  const handleDeletePlacement = async (placementId: string) => {
    if (!confirm('Platzierung löschen?')) return;
    try {
      await sponsorsApi.deleteSlot(placementId);
      showSuccess('Platzierung gelöscht');
      load();
      loadBilling();
    } catch (err: any) { showError(err.message); }
  };

  const handleUpdatePlacementStatus = async (placementId: string, status: string) => {
    try {
      await sponsorsApi.updateSlot(placementId, { status });
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleUpdateInvoiceStatus = async (placementId: string, invoiceStatus: string) => {
    try {
      // Rechnungsstatus wird auf der Platzierung (ad_placements) gespeichert
      await sponsorsApi.updatePlacement(placementId, { invoiceStatus });
      load();
      loadBilling();
    } catch (err: any) { showError(err.message); }
  };

  const handleExportSponsorPlacements = async (format: 'pdf' | 'csv') => {
    try {
      if (format === 'csv') {
        const filtered = leistungFilter === 'alle' ? placements :
          placements.filter(p => p.invoiceStatus === leistungFilter);
        const rows = [
          ['Laufzeit von', 'Laufzeit bis', 'Laufzeit-Bezeichnung', 'Titel', 'Episode', 'Position', 'Dauer', 'Preis', 'Rechnungs-Status', 'Rechnungs-Nr.', 'Notizen'],
          ...filtered.map((p: any) => [
            p.placementStart ? new Date(p.placementStart).toLocaleDateString('de-DE') : '—',
            p.placementEnd ? new Date(p.placementEnd).toLocaleDateString('de-DE') : '—',
            p.placementLabel || '—',
            p.adTitle || 'Werbung',
            p.episodeTitle || '—',
            p.position || '—',
            `${p.duration}s`,
            p.price ? `${p.price.toFixed(2)} €` : '—',
            p.invoiceStatus || 'offen',
            p.invoiceNumber || '—',
            p.performanceNotes || p.notes || '—',
          ])
        ];
        const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leistungsuebersicht-${sponsor?.company || 'sponsor'}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess('Leistungsübersicht als CSV exportiert');
      }
    } catch (err: any) { showError(err.message); }
  };

  // Leistungsübersicht als PDF exportieren
  const handleExportLeistungPdf = async () => {
    if (!id) return;
    setIsExportingLeistung(true);
    try {
      const params = new URLSearchParams();
      if (pdfLayoutId) params.set('layoutId', pdfLayoutId);
      if (leistungFilter !== 'alle') params.set('filter', leistungFilter);
      if (leistungIntro) params.set('intro', leistungIntro);
      if (leistungOutro) params.set('outro', leistungOutro);
      if (pdfDocTitle) params.set('documentTitle', encodeURIComponent(pdfDocTitle));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/sponsors/${id}/invoice-pdf${qs}`, {
        credentials: 'include',
      });
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
    } catch (err: any) { showError(err.message); }
    finally { setIsExportingLeistung(false); }
  };

  // Abrechnung als PDF exportieren
  const handleExportInvoice = async () => {
    if (!id) return;
    setIsExportingInvoice(true);
    try {
      const params = new URLSearchParams();
      if (pdfLayoutId) params.set('layoutId', pdfLayoutId);
      if (pdfDocTitle) params.set('documentTitle', encodeURIComponent(pdfDocTitle));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/sponsors/${id}/invoice-pdf${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `PDF-Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const defaultName = `abrechnung-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || id}`;
      a.download = pdfFileName ? `${pdfFileName.replace(/\.pdf$/i, '')}.pdf` : `${defaultName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Abrechnung exportiert');
    } catch (err: any) { showError(err.message); }
    finally { setIsExportingInvoice(false); }
  };

  // Buchungsbestätigung als PDF exportieren (alle Platzierungen inkl. ohne Folge)
  const handleExportConfirmation = async () => {
    if (!id) return;
    try {
      const params: Record<string, string> = {};
      if (pdfLayoutId) params.layoutId = pdfLayoutId;
      if (pdfDocTitle) params.documentTitle = encodeURIComponent(pdfDocTitle);
      const url = sponsorsApi.getConfirmationPdfUrl(id, Object.keys(params).length ? params : undefined);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `PDF-Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `buchungsbestaetigung-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || id}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      showSuccess('Buchungsbestätigung exportiert');
    } catch (err: any) { showError(err.message); }
  };

  const loadBilling = async () => {
    if (!id) return;
    try {
      const data = await sponsorsApi.getBilling(id);
      setBillingData(data);
      // Echte Placements (ad_placements) aus dem Billing-Endpunkt laden
      setPlacements(data?.placements || []);
    } catch {}
  };

  // Kategorie auswählen: Position, Dauer und alle 3 Preistypen übernehmen
  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find((c: any) => c.id === categoryId);
    if (cat) {
      const newPosition = cat.defaultPosition || placementForm.position;
      const newDuration = cat.defaultDuration || placementForm.duration;
      // Alle drei Preistypen aus der Kategorie übernehmen
      const newBasePrice = cat.basePrice != null ? String(cat.basePrice) : '';
      const newPricePerEpisode = cat.pricePerEpisode != null ? String(cat.pricePerEpisode) : '';
      const newPricePer1000 = cat.pricePer1000Listens != null ? String(cat.pricePer1000Listens) : '';
      // Empfohlener Einzelpreis für das Preis-Feld
      const suggestedPrice = cat.pricePerEpisode || cat.basePrice || '';
      setPlacementForm(p => ({
        ...p,
        categoryId,
        position: newPosition,
        duration: newDuration,
        basePrice: newBasePrice,
        pricePerEpisode: newPricePerEpisode,
        pricePer1000Listens: newPricePer1000,
        price: suggestedPrice ? String(suggestedPrice) : p.price,
      }));
      if (suggestedPrice) setShowPriceHint(true);
    } else {
      setPlacementForm(p => ({ ...p, categoryId }));
    }
  };

  const openCreatePlacement = () => {
    setEditingPlacement(null);
    setShowPriceHint(false);
    setPlacementForm({
      episodeId: '',
      categoryId: '',
      position: 'pre-roll',
      duration: 30,
      status: 'geplant',
      deliveryType: sponsor?.adDelivery || 'self',
      notes: '',
      adTitle: `Platzierung ${new Date().toLocaleDateString('de-DE')}`,
      adScript: '',
      airDate: '',
      placementStart: '',
      placementEnd: '',
      placementLabel: '',
      performanceNotes: '',
      deliveryConfirmed: false,
      priceModel: 'fixed',
      price: '',
      basePrice: '',
      pricePerEpisode: '',
      pricePer1000Listens: '',
      currency: 'EUR',
      invoiceNumber: '',
      invoiceDate: '',
      invoiceStatus: 'offen',
      invoiceNotes: '',
      priceAdjustment: '0',
      listenerFee: '0',
      manualPrice: '',
    });
    setShowPlacementModal(true);
  };

  const openEditPlacement = (pl: any) => {
    setEditingPlacement(pl);
    setShowPriceHint(false);
    setPlacementForm({
      episodeId: pl.episodeId || '',
      categoryId: pl.categoryId || pl.adCategoryId || '',
      position: pl.position || 'pre-roll',
      duration: pl.duration || 30,
      status: pl.status || 'geplant',
      deliveryType: pl.deliveryType || 'self',
      notes: pl.notes || '',
      adTitle: pl.adTitle || pl.name || '',
      adScript: pl.adScript || pl.script || '',
      airDate: pl.airDate ? pl.airDate.slice(0, 10) : '',
      placementStart: pl.placementStart ? pl.placementStart.slice(0, 10) : '',
      placementEnd: pl.placementEnd ? pl.placementEnd.slice(0, 10) : '',
      placementLabel: pl.placementLabel || '',
      performanceNotes: pl.performanceNotes || '',
      deliveryConfirmed: pl.deliveryConfirmed || false,
      // Flexibles Preismodell
      priceModel: (pl.priceModel || 'fixed') as 'fixed' | 'per_episode' | 'per_1000',
      price: pl.price ? String(pl.price) : '',
      basePrice: pl.basePrice != null ? String(pl.basePrice) : '',
      pricePerEpisode: pl.pricePerEpisode != null ? String(pl.pricePerEpisode) : '',
      pricePer1000Listens: pl.pricePer1000Listens != null ? String(pl.pricePer1000Listens) : '',
      currency: pl.currency || 'EUR',
      invoiceNumber: pl.invoiceNumber || '',
      invoiceDate: pl.invoiceDate?.slice(0, 10) || '',
      invoiceStatus: pl.invoiceStatus || 'offen',
      invoiceNotes: pl.invoiceNotes || '',
      // Manuelle Anpassungen (v2.11.5)
      priceAdjustment: String(pl.priceAdjustment || 0),
      listenerFee: String(pl.listenerFee || 0),
      manualPrice: pl.manualPrice != null ? String(pl.manualPrice) : '',
    });
    setShowPlacementModal(true);
  };

  const adStatusInfo = (val: string) => AD_STATUS.find(s => s.value === val) || AD_STATUS[0];

  const totalRevenue = placements.filter(p => p.price).reduce((s, p) => s + (p.price || 0), 0);
  const airedCount = placements.filter(p => p.status === 'ausgestrahlt' || p.status === 'abgerechnet').length;

  // Gefilterte Platzierungen für Leistungsübersicht
  const filteredPlacements = leistungFilter === 'alle' ? placements :
    placements.filter(p => p.invoiceStatus === leistungFilter);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!sponsor) {
    return <div className="text-center py-20"><p className="text-text-secondary">Sponsor nicht gefunden</p><Link to="/sponsors" className="btn-secondary mt-4 inline-flex">Zurück</Link></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sponsors" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={20} /></Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: form.color || '#059669' }}>
            {sponsor.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{sponsor.name}</h1>
            {sponsor.company && sponsor.company !== sponsor.name && (
              <p className="text-text-muted text-sm">{sponsor.company}</p>
            )}
          </div>
          {isDirty && <span className="text-accent-orange text-xs">● Ungespeicherte Änderungen</span>}
        </div>
        {can('canEditSponsors') && (
          <button onClick={handleSave} disabled={isSaving || !isDirty} className="btn-primary">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Speichern...' : 'Speichern'}</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-text-primary">{placements.length}</p>
          <p className="text-text-muted text-xs">Platzierungen</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-accent-green">{airedCount}</p>
          <p className="text-text-muted text-xs">Ausgestrahlt</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-accent-green">{totalRevenue > 0 ? `${totalRevenue.toFixed(0)} €` : '—'}</p>
          <p className="text-text-muted text-xs">Gesamteinnahmen</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-text-primary">
            {sponsor.contractEnd ? new Date(sponsor.contractEnd).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) : '—'}
          </p>
          <p className="text-text-muted text-xs">Vertragsende</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Übersicht' },
          { key: 'placements', label: `Werbeplätze (${slots.length})` },
          { key: 'billing', label: 'Abrechnung' },
          { key: 'contact', label: 'Kontakt & Vertrag' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Sponsor-Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Name / Kontaktperson</label>
                  <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                </div>
                <div>
                  <label className="label">Unternehmen</label>
                  <input type="text" value={form.company} onChange={e => updateForm('company', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                </div>
                <div>
                  <label className="label">Kundennummer</label>
                  <input type="text" value={form.customerNumber} onChange={e => updateForm('customerNumber', e.target.value)} className="input" placeholder="z.B. KD-10001" disabled={!can('canEditSponsors')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="select" disabled={!can('canEditSponsors')}>
                      <option value="aktiv">Aktiv</option>
                      <option value="inaktiv">Inaktiv</option>
                      <option value="interessent">Interessent</option>
                      <option value="pausiert">Pausiert</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Farbe</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.color} onChange={e => updateForm('color', e.target.value)} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" disabled={!can('canEditSponsors')} />
                      <input type="text" value={form.color} onChange={e => updateForm('color', e.target.value)} className="input flex-1 font-mono text-sm" disabled={!can('canEditSponsors')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Vertragsstart</label>
                    <input type="date" value={form.contractStart} onChange={e => updateForm('contractStart', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                  <div>
                    <label className="label">Vertragsende</label>
                    <input type="date" value={form.contractEnd} onChange={e => updateForm('contractEnd', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Werbemittel-Lieferung</h3>
              <div className="space-y-2">
                {[
                  { value: 'self', label: 'Selbst angeliefert', icon: '📦', desc: 'Sponsor liefert fertiges Werbemittel' },
                  { value: 'produced', label: 'Von uns produziert', icon: '🎙️', desc: 'Wir sprechen und produzieren die Werbung' },
                  { value: 'both', label: 'Beides möglich', icon: '🔄', desc: 'Beide Varianten werden genutzt' },
                ].map(d => (
                  <button key={d.value} type="button" onClick={() => can('canEditSponsors') && updateForm('adDelivery', d.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${form.adDelivery === d.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border'} ${can('canEditSponsors') ? 'hover:border-surface-border-light cursor-pointer' : 'cursor-default'}`}>
                    <span className="text-xl">{d.icon}</span>
                    <div>
                      <p className="text-text-primary text-sm font-medium">{d.label}</p>
                      <p className="text-text-muted text-xs">{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Vertragslaufzeit</h3>
              <div className="space-y-3">
                <p className="text-xs text-text-muted">Definiert den Zeitraum, in dem Werbebuchungen für diesen Sponsor möglich sind.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Vertrag von</label>
                    <input type="date" value={form.contractStart} onChange={e => updateForm('contractStart', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                  <div>
                    <label className="label">Vertrag bis</label>
                    <input type="date" value={form.contractEnd} onChange={e => updateForm('contractEnd', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                </div>
                {form.contractStart && form.contractEnd && (
                  <p className="text-xs text-accent-blue flex items-center gap-1">
                    <CalendarRange size={12} /> Laufzeit: {calcRuntime(form.contractStart, form.contractEnd)}
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Notizen</h3>
              <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} className="textarea" rows={5} placeholder="Interne Notizen, Vereinbarungen, Besonderheiten..." disabled={!can('canEditSponsors')} />
            </div>

            {/* Episodenplanung */}
            {episodeBookings.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <Megaphone size={14} className="text-accent-orange" />
                    Eingeplante Episoden ({episodeBookings.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {episodeBookings.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-obsidian-800">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.confirmed ? 'bg-accent-green' : 'bg-accent-orange'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{b.episode_title || 'Unbekannte Episode'}</p>
                        <p className="text-text-muted text-[10px]">
                          {b.position?.toUpperCase()} · {b.slot_name || b.category_name || '—'}
                          {b.duration ? ` · ${b.duration}s` : ''}
                          {b.publish_date ? ` · ${new Date(b.publish_date).toLocaleDateString('de-DE')}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.confirmed ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-orange/20 text-accent-orange'}`}>
                        {b.confirmed ? 'Bestätigt' : 'Geplant'}
                      </span>
                    </div>
                  ))}
                  {episodeBookings.length > 5 && (
                    <p className="text-text-muted text-xs text-center">+{episodeBookings.length - 5} weitere Buchungen</p>
                  )}
                </div>
              </div>
            )}

            {/* Recent Placements Preview */}
            {placements.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary">Letzte Platzierungen</h3>
                  <button onClick={() => setActiveTab('placements')} className="text-accent-purple text-xs hover:underline">Alle anzeigen</button>
                </div>
                <div className="space-y-2">
                  {placements.slice(0, 3).map(pl => {
                    const si = adStatusInfo(pl.status);
                    return (
                      <div key={pl.id} className="flex items-center gap-3 text-sm">
                        <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                        <span className="text-text-primary flex-1 truncate">{pl.episodeTitle || pl.adTitle || 'Keine Episode'}</span>
                        <span className="text-text-muted text-xs capitalize">{pl.position?.replace('-', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLACEMENTS TAB */}
      {activeTab === 'placements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-text-secondary text-sm">Werbeplatzierungen in Episoden verwalten und verfolgen</p>
            {can('canEditSponsors') && (
              <button onClick={openCreatePlacement} className="btn-primary"><Plus size={16} /><span>Neue Platzierung</span></button>
            )}
          </div>

          {slots.length === 0 ? (
            <div className="card text-center py-12">
              <Tag size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Noch keine Werbeplätze angelegt</p>
              {can('canEditSponsors') && (
                <button onClick={openCreatePlacement} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Ersten Werbeplatz erstellen</span></button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(pl => {
                const si = adStatusInfo(pl.status);
                const cat = categories.find(c => c.id === pl.categoryId);
                const runtime = calcRuntime(pl.placementStart, pl.placementEnd);
                return (
                  <div key={pl.id} className="card group">
                    <div className="flex items-start gap-4">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        pl.status === 'ausgestrahlt' || pl.status === 'abgerechnet' ? 'bg-accent-green' :
                        pl.status === 'bereit' ? 'bg-accent-cyan' :
                        pl.status === 'in_produktion' ? 'bg-accent-purple' :
                        pl.status === 'material_eingegangen' ? 'bg-accent-blue' :
                        pl.status === 'material_ausstehend' ? 'bg-accent-orange' :
                        'bg-text-muted'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-text-primary font-medium">{pl.adTitle || 'Unbenannte Werbung'}</h4>
                          <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                          {cat && <span className="badge text-xs" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.name}</span>}
                          {pl.placementLabel && (
                            <span className="badge text-xs bg-accent-blue/20 text-accent-blue">{pl.placementLabel}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                          {pl.episodeTitle && (
                            <span className="flex items-center gap-1">
                              <Mic2 size={11} />
                              {pl.episodeTitle}
                            </span>
                          )}
                          <span className="capitalize">{pl.position?.replace('-', ' ')}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{pl.duration}s</span>
                          {(pl.price != null || pl.basePrice != null) && <span className="font-medium text-accent-green">{((pl.price || pl.basePrice || 0) as number).toFixed(2)} €</span>}
                          {pl.deliveryType === 'produced' ? (
                            <span className="flex items-center gap-1 text-accent-purple"><Mic2 size={11} />Produziert</span>
                          ) : (
                            <span className="flex items-center gap-1"><Package size={11} />Angeliefert</span>
                          )}
                          {pl.airDate && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(pl.airDate).toLocaleDateString('de-DE')}</span>}
                        </div>

                        {/* Laufzeit-Anzeige */}
                        {(pl.placementStart || pl.placementEnd) && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <CalendarRange size={11} className="text-accent-blue flex-shrink-0" />
                            <span className="text-xs text-accent-blue">
                              {pl.placementStart ? new Date(pl.placementStart).toLocaleDateString('de-DE') : '?'}
                              {' → '}
                              {pl.placementEnd ? new Date(pl.placementEnd).toLocaleDateString('de-DE') : '?'}
                              {runtime && ` (${runtime})`}
                            </span>
                          </div>
                        )}

                        {pl.notes && <p className="text-text-muted text-xs mt-1">{pl.notes}</p>}
                        {pl.performanceNotes && (
                          <p className="text-text-muted text-xs mt-1 italic flex items-center gap-1">
                            <Info size={10} />{pl.performanceNotes}
                          </p>
                        )}

                        {can('canEditSponsors') && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-text-muted text-xs">Status:</span>
                            <select
                              value={pl.status}
                              onChange={e => handleUpdatePlacementStatus(pl.id, e.target.value)}
                              className="text-xs bg-obsidian-800 border border-surface-border rounded-lg px-2 py-1 text-text-secondary focus:outline-none hover:border-surface-border-light"
                            >
                              {AD_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {can('canEditSponsors') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openBookingModal(pl)}
                            title="Als Buchung in Episode erfassen"
                            className="p-2 text-text-muted hover:text-accent-green hover:bg-accent-green/10 rounded-lg"
                          ><Plus size={14} /></button>
                          <button onClick={() => openEditPlacement(pl)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeletePlacement(pl.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <div className="space-y-6">

          {/* Kennzahlen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-text-primary">{placements.length}</p>
              <p className="text-text-muted text-xs">Platzierungen gesamt</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-accent-green">{placements.filter((p: any) => p.invoiceStatus === 'bezahlt').length}</p>
              <p className="text-text-muted text-xs">Bezahlt</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-text-primary">
                {placements.filter((p: any) => p.price).reduce((s: number, p: any) => s + (p.price || 0), 0).toFixed(2)} €
              </p>
              <p className="text-text-muted text-xs">Gesamtbetrag</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-accent-orange">
                {placements.filter((p: any) => p.price && p.invoiceStatus !== 'bezahlt' && p.invoiceStatus !== 'storniert').reduce((s: number, p: any) => s + (p.price || 0), 0).toFixed(2)} €
              </p>
              <p className="text-text-muted text-xs">Offen</p>
            </div>
          </div>

          {/* Leistungsübersicht erstellen */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-accent-purple" />
              <h3 className="font-semibold text-text-primary">Leistungsübersicht erstellen</h3>
            </div>

            <p className="text-text-muted text-xs flex items-center gap-1">
              <Info size={12} />
              Die Leistungsübersicht dient als Grundlage für die Rechnungserstellung in eurer internen Software. Texte und Filterung können angepasst werden.
            </p>

            {/* Einleitungstext */}
            <div>
              <label className="label">Einleitungstext (optional)</label>
              <textarea
                value={leistungIntro}
                onChange={e => setLeistungIntro(e.target.value)}
                className="textarea"
                rows={3}
                placeholder={`z.B. Sehr geehrte Damen und Herren,\nhiermit übersenden wir Ihnen die Leistungsübersicht für Ihre Werbeschaltungen im Zeitraum...`}
              />
            </div>

            {/* Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Platzierungen filtern</label>
                <select value={leistungFilter} onChange={e => setLeistungFilter(e.target.value as any)} className="select">
                  <option value="alle">Alle Platzierungen ({placements.length})</option>
                  <option value="offen">Nur offene ({placements.filter(p => !p.invoiceStatus || p.invoiceStatus === 'offen').length})</option>
                  <option value="versendet">Nur versendet ({placements.filter(p => p.invoiceStatus === 'versendet').length})</option>
                  <option value="bezahlt">Nur bezahlt ({placements.filter(p => p.invoiceStatus === 'bezahlt').length})</option>
                </select>
              </div>
              <div>
                <label className="label">Dateiname</label>
                <input
                  type="text"
                  value={pdfFileName}
                  onChange={e => setPdfFileName(e.target.value)}
                  placeholder={`leistungsuebersicht-${sponsor?.name?.replace(/\s+/g, '-').toLowerCase() || 'sponsor'}.pdf`}
                  className="input text-xs"
                  title="Eigener Dateiname für den PDF-Export"
                />
              </div>
            </div>

            {/* Dokumententitel im PDF */}
            <div>
              <label className="label">Dokumententitel im PDF <span className="text-text-muted font-normal">(oben links unter dem Podcast-Namen)</span></label>
              <input
                type="text"
                value={pdfDocTitle}
                onChange={e => setPdfDocTitle(e.target.value)}
                placeholder="Sponsoring-Abrechnung"
                className="input text-sm"
                title="Dieser Titel erscheint im PDF-Header unter dem Podcast-Namen"
              />
            </div>

            {/* Schlusstext */}
            <div>
              <label className="label">Schlusstext / Zahlungshinweis (optional)</label>
              <textarea
                value={leistungOutro}
                onChange={e => setLeistungOutro(e.target.value)}
                className="textarea"
                rows={2}
                placeholder="z.B. Zahlbar innerhalb von 14 Tagen ohne Abzug. Bei Fragen stehen wir gerne zur Verfügung."
              />
            </div>

            {/* Hinweis wenn keine echten Buchungen vorhanden */}
            {placements.filter(p => !p.isPlanned).length === 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-300">
                <Info size={14} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Leistungsübersicht</span> ist erst verfügbar, wenn mindestens eine Episode mit diesem Sponsor ausgestrahlt wurde und als Buchung erfasst ist.
                  Die <span className="font-semibold">Buchungsbestätigung</span> hingegen zeigt alle Vorplanungen für den Kunden.
                </div>
              </div>
            )}

            {/* Export-Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                <PdfLayoutPicker exportType="invoice" value={pdfLayoutId} onChange={setPdfLayoutId} />
                <button
                  onClick={handleExportLeistungPdf}
                  disabled={isExportingLeistung || placements.filter(p => !p.isPlanned).length === 0}
                  title={placements.filter(p => !p.isPlanned).length === 0 ? 'Keine abgeschlossenen Buchungen – erst nach Ausstrahlung verfügbar' : 'Leistungsübersicht als PDF exportieren'}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExportingLeistung ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>Leistungsübersicht (PDF)</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <PdfLayoutPicker exportType="confirmation" value={pdfLayoutId} onChange={setPdfLayoutId} />
                <button onClick={handleExportConfirmation} className="btn-secondary">
                  <FileText size={16} />
                  <span>Buchungsbestätigung (PDF)</span>
                </button>
              </div>
              <button onClick={() => handleExportSponsorPlacements('csv')} className="btn-secondary">
                <FileSpreadsheet size={16} />
                <span>Als CSV exportieren</span>
              </button>
            </div>
          </div>

          {/* TKP-Kalkulator */}
          {placements.length > 0 && placements.some((p: any) => p.pricePer1000Listens > 0 || p.pricePerEpisode > 0) && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-400" />
                <h3 className="font-semibold text-text-primary">TKP-Kalkulator</h3>
                <span className="text-xs text-text-muted">(Preis-Simulation für Slots mit dynamischem Preismodell)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label text-xs">Werbeplatz auswählen</label>
                  <select
                    className="select text-sm"
                    onChange={e => {
                      const slot = slots.find((s: any) => s.id === e.target.value);
                      if (slot) handleCalculateTkp(slot);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Slot wählen…</option>
                    {slots.filter((s: any) => (s.pricePer1000Listens || 0) > 0 || (s.pricePerEpisode || 0) > 0).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name || s.adTitle || `Slot ${s.id}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Anzahl Hörer (gesamt)</label>
                  <input
                    type="number"
                    value={tkpListeners}
                    onChange={e => setTkpListeners(e.target.value)}
                    placeholder="z.B. 5000"
                    className="input text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label text-xs">Anzahl Episoden</label>
                  <input
                    type="number"
                    value={tkpEpisodeCount}
                    onChange={e => setTkpEpisodeCount(e.target.value)}
                    placeholder="1"
                    className="input text-sm"
                    min="1"
                  />
                </div>
              </div>
              {tkpCalcResult && (
                <div className="bg-surface-raised rounded-xl p-4 border border-surface-border">
                  <div className="text-xs text-text-muted mb-3">Kalkulation für: <span className="text-text-primary font-medium">{tkpCalcResult.slotName}</span></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {tkpCalcResult.basePrice > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-text-primary">{tkpCalcResult.basePrice?.toFixed(2)} €</div>
                        <div className="text-xs text-text-muted">Basispreis</div>
                      </div>
                    )}
                    {tkpCalcResult.episodeCost > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{tkpCalcResult.episodeCost?.toFixed(2)} €</div>
                        <div className="text-xs text-text-muted">{tkpCalcResult.episodeCount} × Folgenpreis</div>
                      </div>
                    )}
                    {tkpCalcResult.tkpCost > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-400">{tkpCalcResult.tkpCost?.toFixed(2)} €</div>
                        <div className="text-xs text-text-muted">{(parseInt(tkpListeners) / 1000).toFixed(1)}k Hörer × TKP</div>
                      </div>
                    )}
                    <div className="text-center bg-accent-purple/10 rounded-lg p-2">
                      <div className="text-xl font-bold text-accent-purple">{tkpCalcResult.total?.toFixed(2)} €</div>
                      <div className="text-xs text-text-muted">Gesamtpreis</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Platzierungs-Liste mit Rechnungs-Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Clock size={16} className="text-accent-blue" />
                Platzierungs-Übersicht
                {leistungFilter !== 'alle' && (
                  <span className="text-xs text-text-muted font-normal">— gefiltert: {leistungFilter}</span>
                )}
              </h3>
              <span className="text-text-muted text-xs">{filteredPlacements.length} Einträge · {filteredPlacements.filter(p => p.price).reduce((s, p) => s + (p.price || 0), 0).toFixed(2)} €</span>
            </div>

            {filteredPlacements.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-text-muted text-sm">Keine Platzierungen für diesen Filter</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlacements.map(pl => {
                  const si = adStatusInfo(pl.status);
                  const runtime = calcRuntime(pl.placementStart, pl.placementEnd);
                  return (
                    <div key={pl.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className={`font-medium text-sm ${pl.isPlanned ? 'text-amber-300' : 'text-text-primary'}`}>
                              {pl.isPlanned && '◷ '}{pl.adTitle || pl.slotName || pl.placementLabel || 'Unbenannte Werbung'}
                            </h4>
                            {pl.isPlanned && (
                              <span className="badge text-xs bg-amber-900/40 text-amber-400 border border-amber-700/50">Vorplanung</span>
                            )}
                            {pl.placementLabel && !pl.isPlanned && (
                              <span className="badge text-xs bg-accent-blue/20 text-accent-blue">{pl.placementLabel}</span>
                            )}
                            {!pl.isPlanned && <span className={`badge text-xs ${si.color}`}>{si.label}</span>}
                            {pl.categoryName && (
                              <span className="badge text-xs bg-surface-overlay text-text-muted">{pl.categoryName}</span>
                            )}
                            <span className={`badge text-xs ${
                              pl.invoiceStatus === 'bezahlt' ? 'bg-accent-green/20 text-accent-green' :
                              pl.invoiceStatus === 'versendet' ? 'bg-accent-orange/20 text-accent-orange' :
                              pl.invoiceStatus === 'storniert' ? 'bg-accent-red/20 text-accent-red' :
                              pl.invoiceStatus === 'geplant' ? 'bg-amber-900/30 text-amber-400' :
                              'bg-surface-overlay text-text-muted'
                            }`}>
                              {pl.invoiceStatus === 'bezahlt' ? '✓ Bezahlt' :
                               pl.invoiceStatus === 'versendet' ? '→ Versendet' :
                               pl.invoiceStatus === 'storniert' ? '✕ Storniert' :
                               pl.invoiceStatus === 'geplant' ? '◷ Geplant' : '○ Offen'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                            {/* Laufzeit */}
                            <div>
                              <p className="text-text-muted text-xs">Laufzeit</p>
                              {pl.placementStart || pl.placementEnd ? (
                                <p className="text-text-primary text-xs">
                                  {pl.placementStart ? new Date(pl.placementStart).toLocaleDateString('de-DE') : '?'}
                                  {' – '}
                                  {pl.placementEnd ? new Date(pl.placementEnd).toLocaleDateString('de-DE') : '?'}
                                  {runtime && <span className="text-text-muted ml-1">({runtime})</span>}
                                </p>
                              ) : (
                                <p className="text-text-muted text-xs">—</p>
                              )}
                            </div>
                            <div>
                              <p className="text-text-muted text-xs">Position / Titel</p>
                              <p className="text-text-primary text-xs">
                                {pl.adTitle || pl.slotName || 'Ohne Position'}
                                {pl.position ? ` · ${pl.position}` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-text-muted text-xs">Preis</p>
                              <p className="text-text-primary font-medium">{pl.price != null ? `${(pl.price as number).toFixed(2)} €` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-text-muted text-xs">Rechnungs-Nr.</p>
                              <p className="text-text-primary text-xs">{pl.invoiceNumber || '—'}</p>
                            </div>
                          </div>

                          {pl.performanceNotes && (
                            <p className="text-text-muted text-xs mt-1.5 italic">{pl.performanceNotes}</p>
                          )}
                          {pl.invoiceNotes && (
                            <p className="text-text-muted text-xs mt-1 italic">{pl.invoiceNotes}</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {can('canEditSponsors') && (
                            <>
                              <select
                                value={pl.invoiceStatus || 'offen'}
                                onChange={e => handleUpdateInvoiceStatus(pl.id, e.target.value)}
                                className="text-xs bg-obsidian-800 border border-surface-border rounded-lg px-2 py-1 text-text-secondary focus:outline-none hover:border-surface-border-light"
                                title="Rechnungs-Status ändern"
                              >
                                <option value="offen">Offen</option>
                                <option value="versendet">Versendet</option>
                                <option value="bezahlt">Bezahlt</option>
                                <option value="storniert">Storniert</option>
                              </select>
                              <button onClick={() => openEditPlacement(pl)} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg text-center">
                                <Edit2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summe */}
            {filteredPlacements.length > 0 && (
              <div className="flex justify-end">
                <div className="bg-obsidian-800 rounded-xl px-4 py-3 text-right">
                  <p className="text-text-muted text-xs mb-1">Summe ({leistungFilter === 'alle' ? 'alle' : leistungFilter})</p>
                  <p className="text-xl font-bold text-text-primary">
                    {filteredPlacements.filter(p => p.price).reduce((s, p) => s + (p.price || 0), 0).toFixed(2)} €
                  </p>
                  {leistungFilter !== 'bezahlt' && (
                    <p className="text-xs text-accent-green mt-0.5">
                      davon bezahlt: {filteredPlacements.filter(p => p.price && p.invoiceStatus === 'bezahlt').reduce((s, p) => s + (p.price || 0), 0).toFixed(2)} €
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACT TAB */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">Kontaktdaten</h3>
            <div>
              <label className="label">E-Mail</label>
              <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
            </div>
            <div>
              <label className="label">Website</label>
              <div className="flex gap-2">
                <input type="url" value={form.website} onChange={e => updateForm('website', e.target.value)} className="input flex-1" placeholder="https://..." disabled={!can('canEditSponsors')} />
                {form.website && (
                  <a href={form.website} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
            {/* Hinweisfeld zum Sponsor */}
            <div>
              <label className="label flex items-center gap-1">
                <AlertCircle size={12} className="text-accent-orange" />
                Interner Hinweis
              </label>
              <textarea
                value={form.contactHint || ''}
                onChange={e => updateForm('contactHint', e.target.value)}
                className="textarea"
                rows={4}
                placeholder="Interne Hinweise zum Sponsor, z.B. bevorzugte Kontaktzeiten, besondere Vereinbarungen, Vorsichtsmaßnahmen..."
                disabled={!can('canEditSponsors')}
              />
              <p className="text-text-muted text-xs mt-1">Nur für interne Zwecke — erscheint nicht im PDF-Export</p>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">Schnellkontakt</h3>
            {form.email ? (
              <a href={`mailto:${form.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800 hover:bg-surface-raised transition-colors">
                <Mail size={18} className="text-accent-blue" />
                <div>
                  <p className="text-text-primary text-sm font-medium">E-Mail senden</p>
                  <p className="text-text-muted text-xs">{form.email}</p>
                </div>
              </a>
            ) : (
              <p className="text-text-muted text-sm">Keine E-Mail hinterlegt</p>
            )}
            {form.phone && (
              <a href={`tel:${form.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800 hover:bg-surface-raised transition-colors">
                <Phone size={18} className="text-accent-green" />
                <div>
                  <p className="text-text-primary text-sm font-medium">Anrufen</p>
                  <p className="text-text-muted text-xs">{form.phone}</p>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Placement Modal */}
      <Modal isOpen={showPlacementModal} onClose={() => setShowPlacementModal(false)} title={editingPlacement ? 'Platzierung bearbeiten' : 'Neue Werbeplatzierung'} size="lg">
        <form onSubmit={handleSavePlacement} className="space-y-4">
          <div>
            <label className="label">Werbetitel</label>
            <input type="text" value={placementForm.adTitle} onChange={e => setPlacementForm(p => ({ ...p, adTitle: e.target.value }))} className="input" placeholder="z.B. Produkt-Spot Q1 2025" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Episode (Optional)</label>
              <select value={placementForm.episodeId} onChange={e => setPlacementForm(p => ({ ...p, episodeId: e.target.value }))} className="select">
                <option value="">Keine feste Folge (Zeitraum-Buchung)</option>
                {episodes.map(ep => <option key={ep.id} value={ep.id}>{ep.number ? `#${ep.number} — ` : ''}{ep.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Werbekategorie</label>
              <select value={placementForm.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="select">
                <option value="">Keine Kategorie</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}{cat.pricePerEpisode ? ` — ${cat.pricePerEpisode} €/Folge` : cat.basePrice ? ` — ab ${cat.basePrice} €` : ''}
                  </option>
                ))}
              </select>
              {showPriceHint && (
                <p className="text-xs text-accent-green mt-1 flex items-center gap-1">
                  <CheckCircle size={11} /> Preis aus Kategorie übernommen
                </p>
              )}
            </div>
          </div>

          {/* Laufzeit der Platzierung */}
          <div className="bg-obsidian-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarRange size={14} className="text-accent-blue" />
              <label className="label mb-0 text-accent-blue">Laufzeit der Platzierung</label>
            </div>
            <div>
              <label className="label text-xs">Bezeichnung / Kampagnenname (optional)</label>
              <input
                type="text"
                value={placementForm.placementLabel}
                onChange={e => setPlacementForm(p => ({ ...p, placementLabel: e.target.value }))}
                className="input"
                placeholder="z.B. Frühjahrskampagne 2025, Q2-Schaltung..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Laufzeit von</label>
                <input
                  type="date"
                  value={placementForm.placementStart}
                  onChange={e => setPlacementForm(p => ({ ...p, placementStart: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label text-xs">Laufzeit bis</label>
                <input
                  type="date"
                  value={placementForm.placementEnd}
                  onChange={e => setPlacementForm(p => ({ ...p, placementEnd: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            {placementForm.placementStart && placementForm.placementEnd && (
              <p className="text-xs text-accent-blue flex items-center gap-1">
                <CheckCircle size={11} /> Laufzeit: {calcRuntime(placementForm.placementStart, placementForm.placementEnd)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Position</label>
              <select value={placementForm.position} onChange={e => setPlacementForm(p => ({ ...p, position: e.target.value }))} className="select">
                <option value="folgensponsor">Folgensponsor</option>
                <option value="pre-roll">Pre-Roll</option>
                <option value="mid-roll">Mid-Roll</option>
                <option value="post-roll">Post-Roll</option>
                <option value="host-read">Host-Read</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            </div>
            <div>
              <label className="label">Dauer (Sekunden)</label>
              <input type="number" value={placementForm.duration} onChange={e => setPlacementForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} className="input" min="5" max="600" />
            </div>
          </div>

          {/* Flexibles Preismodell */}
          <div className="bg-obsidian-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0 text-accent-green">Preismodell</label>
              {showPriceHint && (
                <span className="text-xs text-accent-green flex items-center gap-1">
                  <CheckCircle size={11} /> Preise aus Kategorie übernommen
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'fixed', label: 'Festpreis', desc: 'Einmaliger Preis' },
                { value: 'per_episode', label: 'Pro Folge', desc: 'Preis je Episode' },
                { value: 'per_1000', label: 'Per 1.000 Hörer', desc: 'CPM-Modell' },
              ] as const).map(m => (
                <button key={m.value} type="button"
                  onClick={() => setPlacementForm(p => ({ ...p, priceModel: m.value }))}
                  className={`p-2 rounded-lg border-2 text-left transition-all ${
                    placementForm.priceModel === m.value
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-surface-border hover:border-surface-border-light'
                  }`}>
                  <p className="text-text-primary text-xs font-semibold">{m.label}</p>
                  <p className="text-text-muted text-xs">{m.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Basispreis ({placementForm.currency})</label>
                <input type="number" value={placementForm.basePrice}
                  onChange={e => setPlacementForm(p => ({ ...p, basePrice: e.target.value }))}
                  className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label text-xs">Folgenpreis ({placementForm.currency})</label>
                <input type="number" value={placementForm.pricePerEpisode}
                  onChange={e => setPlacementForm(p => ({ ...p, pricePerEpisode: e.target.value }))}
                  className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label text-xs">Preis / 1.000 Hörer ({placementForm.currency})</label>
                <input type="number" value={placementForm.pricePer1000Listens}
                  onChange={e => setPlacementForm(p => ({ ...p, pricePer1000Listens: e.target.value }))}
                  className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label text-xs">Abrechnungspreis ({placementForm.currency})</label>
                <input type="number" value={placementForm.price}
                  onChange={e => setPlacementForm(p => ({ ...p, price: e.target.value }))}
                  className="input" placeholder="Finaler Rechnungsbetrag" min="0" step="0.01" />
                <p className="text-text-muted text-xs mt-1">Wird für die Abrechnung verwendet</p>
              </div>
            </div>
            {/* Manuelle Preisanpassungen */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border/50">
              <div>
                <label className="label text-xs text-accent-orange">Preisanpassung / Rabatt ({placementForm.currency})</label>
                <input type="number" value={placementForm.priceAdjustment}
                  onChange={e => setPlacementForm(p => ({ ...p, priceAdjustment: e.target.value }))}
                  className="input border-accent-orange/30 focus:border-accent-orange" placeholder="± 0.00" step="0.01" />
                <p className="text-text-muted text-[10px] mt-0.5">Positiv für Aufschlag, negativ für Rabatt</p>
              </div>
              <div>
                <label className="label text-xs text-accent-cyan">Hörer-Gebühr / Variable ({placementForm.currency})</label>
                <input type="number" value={placementForm.listenerFee}
                  onChange={e => setPlacementForm(p => ({ ...p, listenerFee: e.target.value }))}
                  className="input border-accent-cyan/30 focus:border-accent-cyan" placeholder="0.00" min="0" step="0.01" />
                <p className="text-text-muted text-[10px] mt-0.5">Optionale Gebühr basierend auf Reichweite</p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Status</label>
            <select value={placementForm.status} onChange={e => setPlacementForm(p => ({ ...p, status: e.target.value }))} className="select">
              {AD_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Delivery Type */}
          <div>
            <label className="label">Werbemittel-Lieferung</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'self', label: '📦 Selbst angeliefert', desc: 'Sponsor liefert fertiges Material' },
                { value: 'produced', label: '🎙️ Von uns produziert', desc: 'Wir produzieren das Werbemittel' },
              ].map(d => (
                <button key={d.value} type="button" onClick={() => setPlacementForm(p => ({ ...p, deliveryType: d.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${placementForm.deliveryType === d.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}>
                  <p className="text-text-primary text-sm font-medium">{d.label}</p>
                  <p className="text-text-muted text-xs">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Lieferung bestätigt */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="deliveryConfirmed"
              checked={placementForm.deliveryConfirmed}
              onChange={e => setPlacementForm(p => ({ ...p, deliveryConfirmed: e.target.checked }))}
              className="w-4 h-4 rounded accent-accent-purple"
            />
            <label htmlFor="deliveryConfirmed" className="text-text-primary text-sm cursor-pointer">
              Werbemittel-Lieferung bestätigt
            </label>
          </div>

          {/* Script (for produced ads) */}
          {placementForm.deliveryType === 'produced' && (
            <div>
              <label className="label">Werbe-Script / Briefing</label>
              <textarea value={placementForm.adScript} onChange={e => setPlacementForm(p => ({ ...p, adScript: e.target.value }))} className="textarea" rows={4} placeholder="Script-Text oder Briefing für die Produktion..." />
            </div>
          )}

          <div>
            <label className="label">Notizen (intern)</label>
            <textarea value={placementForm.notes} onChange={e => setPlacementForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
          </div>

          <div>
            <label className="label">Performance-Notizen (für Leistungsübersicht)</label>
            <textarea
              value={placementForm.performanceNotes}
              onChange={e => setPlacementForm(p => ({ ...p, performanceNotes: e.target.value }))}
              className="textarea"
              rows={2}
              placeholder="z.B. Reichweite, Hörer-Feedback, besondere Leistungen..."
            />
          </div>

          {/* Währung */}
          <div>
            <label className="label">Währung</label>
            <select value={placementForm.currency} onChange={e => setPlacementForm(p => ({ ...p, currency: e.target.value }))} className="select">
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
          <div>
            <label className="label">Rechnungsnotiz</label>
            <textarea value={placementForm.invoiceNotes} onChange={e => setPlacementForm(p => ({ ...p, invoiceNotes: e.target.value }))} className="textarea" rows={2} placeholder="Zahlungsbedingungen, Hinweise für den Kunden..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPlacementModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" className="btn-primary">{editingPlacement ? 'Aktualisieren' : 'Erstellen'}</button>
          </div>
        </form>
      </Modal>

      {/* Buchungs-Modal: Slot in Episode buchen */}
      <Modal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} title={`Buchung erfassen: ${bookingSlot?.name || bookingSlot?.adTitle || 'Werbeplatz'}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Episode (optional)</label>
            <select value={bookingForm.episodeId} onChange={e => setBookingForm(f => ({ ...f, episodeId: e.target.value }))} className="select">
              <option value="">Ohne Episode (Zeitraum-Buchung)</option>
              {episodes.map((ep: any) => (
                <option key={ep.id} value={ep.id}>{ep.episodeNumber ? `#${ep.episodeNumber} – ` : ''}{ep.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Preis (€)</label>
              <input type="number" value={bookingForm.price} onChange={e => setBookingForm(f => ({ ...f, price: e.target.value }))} className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Ausstrahlungsdatum</label>
              <input type="date" value={bookingForm.airDate} onChange={e => setBookingForm(f => ({ ...f, airDate: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Rechnungsstatus</label>
            <select value={bookingForm.invoiceStatus} onChange={e => setBookingForm(f => ({ ...f, invoiceStatus: e.target.value }))} className="select">
              <option value="offen">Offen</option>
              <option value="versendet">Versendet</option>
              <option value="bezahlt">Bezahlt</option>
              <option value="storniert">Storniert</option>
            </select>
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))} className="textarea" rows={2} placeholder="Interne Notizen zur Buchung..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowBookingModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="button" onClick={handleSaveBooking} className="btn-primary">Buchung erfassen</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
