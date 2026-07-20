import { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Copy, Trash2, Edit2, Check, X, ChevronDown, ChevronUp,
  Palette, Type, Layout, Eye, Save, RotateCcw, Star, Lock, Info,
  RefreshCw, ExternalLink, Monitor
} from 'lucide-react';
import { pdfLayoutsApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const EXPORT_TYPES = [
  { value: 'all', label: 'Alle Exporte' },
  { value: 'episode', label: 'Episoden-Dokument' },
  { value: 'idea', label: 'Ideenmappe' },
  { value: 'calendar', label: 'Redaktionskalender' },
  { value: 'invoice', label: 'Sponsoring-Abrechnung' },
  { value: 'confirmation', label: 'Buchungsbestätigung (Sponsor)' },
  { value: 'booking_calendar', label: 'Buchungskalender-Übersicht' },
  { value: 'performance_report', label: 'Leistungsübersicht (Sponsor)' },
  { value: 'sponsor_dossier', label: 'Sponsor-Dossier' },
  { value: 'sponsor_offer', label: 'Sponsor-Angebot' },
  { value: 'question_pool', label: 'Allgemeiner Fragen-Pool' },
  { value: 'price_list', label: 'Preisliste (Werbung)' },
  { value: 'episode_table', label: 'Episoden-Skript (Tabelle)' },
];

const HEADER_STYLES = [
  { value: 'banner', label: 'Banner (farbiger Balken)' },
  { value: 'minimal', label: 'Minimal (Linie)' },
  { value: 'sidebar', label: 'Seitenstreifen' },
];

const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Helvetica (Sans-Serif)' },
  { value: 'Times-Roman', label: 'Times Roman (Serif)' },
  { value: 'Courier', label: 'Courier (Monospace)' },
];

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'Letter', label: 'Letter (216 × 279 mm)' },
];

const PAGE_ORIENTATIONS = [
  { value: 'portrait', label: 'Hochformat (Portrait)' },
  { value: 'landscape', label: 'Querformat (Landscape)' },
];

// Sektionen gruppiert nach Export-Typ
const SECTION_GROUPS: Record<string, { label: string; keys: string[] }> = {
  episode: {
    label: 'Episoden-Dokument',
    keys: ['showMeta', 'showDescription', 'showShowNotes', 'showBlocks', 'showProductionInfo', 'showTechnicalData', 'showAltDuration', 'showNotes', 'showSponsors'],
  },
  idea: {
    label: 'Ideenmappe',
    keys: ['showIdeaDescription', 'showIdeaNotes', 'showIdeaResearch', 'showIdeaQuestions', 'showIdeaChecklist'],
  },
  calendar: {
    label: 'Redaktionskalender',
    keys: ['showCalendarLegend', 'showCalendarNotes'],
  },
  invoice: {
    label: 'Sponsoring-Abrechnung',
    keys: ['showInvoiceDetails', 'showInvoiceSummary'],
  },
  confirmation: {
    label: 'Buchungsbestätigung',
    keys: ['showConfirmationContact', 'showConfirmationPricing', 'showConfirmationTerms'],
  },
  price_list: {
    label: 'Preisliste (Werbung)',
    keys: ['showPricelistDescriptions', 'showPricelistExclusive'],
  },
  episode_table: {
    label: 'Episoden-Skript (Tabelle)',
    keys: ['showTableColors', 'showTableDuration', 'showTableRegie'],
  },
  booking_calendar: {
    label: 'Buchungskalender',
    keys: ['showBookingCalendarLegend', 'showBookingCalendarConflicts'],
  },
  sponsor_offer: {
    label: 'Sponsor-Angebot',
    keys: ['showOfferIntro', 'showOfferOutro', 'showOfferNotes', 'showOfferOptions'],
  },
  sponsor_dossier: {
    label: 'Sponsor-Dossier',
    keys: ['showDossierMeta', 'showDossierContracts', 'showDossierBookings', 'showDossierBilling'],
  },
  performance_report: {
    label: 'Leistungsbericht',
    keys: ['showReportStats', 'showReportChart', 'showReportBookings'],
  },
  question_pool: {
    label: 'Allgemeiner Fragen-Pool',
    keys: ['showQuestionPoolNotes'],
  },
};

const SECTION_LABELS: Record<string, string> = {
  showMeta: 'Meta-Informationen (Episode)',
  showDescription: 'Beschreibung (Episode)',
  showShowNotes: 'Show-Notes (Episode) – neu v2.9.0',
  showBlocks: 'Script-Blöcke (Episode)',
  showProductionInfo: 'Produktions-Informationen (Episode)',
  showTechnicalData: 'Technische Daten (Episode)',
  showAltDuration: 'Alternative Episodenlänge (Sonderfolge) – neu v2.9.1',
  showNotes: 'Interne Notizen (Episode)',
  showSponsors: 'Sponsoren-Platzierungen (Episode)',
  showIdeaDescription: 'Beschreibung (Idee)',
  showIdeaNotes: 'Notizen (Idee)',
  showIdeaResearch: 'Recherche-Quellen (Idee)',
  showIdeaQuestions: 'Interview-Fragen (Idee)',
  showIdeaChecklist: 'Checkliste (Idee)',
  showCalendarLegend: 'Legende (Kalender)',
  showCalendarNotes: 'Notizen je Eintrag (Kalender)',
  showInvoiceDetails: 'Detailansicht (Rechnung)',
  showInvoiceSummary: 'Zusammenfassung / Gesamt (Rechnung)',
  showInvoiceBankDetails: 'Bankverbindung (Rechnung)',
  showPricelistDescriptions: 'Beschreibungen (Preisliste)',
  showPricelistExclusive: 'Exklusiv-Kennzeichnung (Preisliste)',
  showConfirmationContact: 'Kontaktdaten (Bestätigung)',
  showConfirmationPricing: 'Preisdetails (Bestätigung)',
  showConfirmationTerms: 'Vertragslaufzeit (Bestätigung)',
  showBookingCalendarLegend: 'Legende (Buchungskalender)',
  showBookingCalendarConflicts: 'Konflikte hervorheben (Buchungskalender)',
  showPricelistCPM: 'Hörerbeteiligung (CPM) anzeigen',
  showTableColors: 'CI-Farben in Tabelle verwenden',
  showTableDuration: 'Dauer-Spalte anzeigen',
  showTableRegie: 'Regieanweisungen-Spalte anzeigen',
  showTableNotesPage: 'Zusätzliche Notizseite anhängen',
  showQuestionPoolNotes: 'Interne Notizen zu Fragen anzeigen',
};

const LINE_SPACING_OPTIONS = [
  { value: 'compact', label: 'Kompakt (1.2)' },
  { value: 'normal', label: 'Normal (1.5)' },
  { value: 'wide', label: 'Weit (2.0)' },
];

const DIVIDER_STYLES = [
  { value: 'solid', label: 'Durchgezogen' },
  { value: 'dashed', label: 'Gestrichelt' },
  { value: 'dotted', label: 'Gepunktet' },
  { value: 'double', label: 'Doppellinie' },
  { value: 'none', label: 'Keine Trennlinien' },
];

const WATERMARK_POSITIONS = [
  { value: 'center', label: 'Mitte (diagonal)' },
  { value: 'top', label: 'Oben' },
  { value: 'bottom', label: 'Unten' },
];

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-text-muted w-36 shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-surface-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, unit }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-text-muted w-36 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary"
        />
        {unit && <span className="text-xs text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export default function PdfLayoutManagerPage() {
  const { can, showSuccess, showError } = useApp();
  const [layouts, setLayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('all');
  const [cloneFrom, setCloneFrom] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    colors: true, typography: false, header: false, footer: false, sections: false, page: false,
    watermark: false, advanced: false,
  });

  // Sidebar-Filter & Sortierung
  const [sidebarTypeFilter, setSidebarTypeFilter] = useState('all');
  const [sidebarSort, setSidebarSort] = useState<'name' | 'default' | 'type'>('type');

  // PDF-Vorschau
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewBlobRef = useRef<string | null>(null);

  const handlePreview = async (useLive = false) => {
    if (!editForm) return;
    setIsLoadingPreview(true);
    try {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      let url: string;
      if (useLive || isDirty) {
        url = await pdfLayoutsApi.previewLive(editForm);
        previewBlobRef.current = url;
      } else {
        url = pdfLayoutsApi.previewUrl(editForm.id);
      }
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err: any) {
      showError('Vorschau konnte nicht geladen werden: ' + err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => () => {
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await pdfLayoutsApi.list();
      setLayouts(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedId) {
      const layout = layouts.find(l => l.id === selectedId);
      if (layout) { setEditForm(JSON.parse(JSON.stringify(layout))); setIsDirty(false); }
    }
  }, [selectedId, layouts]);

  const update = (path: string, value: any) => {
    setEditForm((prev: any) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!editForm || !selectedId) return;
    setIsSaving(true);
    try {
      const updated = await pdfLayoutsApi.update(selectedId, editForm);
      setLayouts(prev => prev.map(l => l.id === selectedId ? updated : l));
      setIsDirty(false);
      showSuccess('Layout gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      let base: any = {};
      if (cloneFrom) {
        const src = layouts.find(l => l.id === cloneFrom);
        if (src) base = { ...src, name: newName, exportType: newType, isDefault: false, isSystem: false };
      } else {
        const defaults = await pdfLayoutsApi.getDefaults();
        base = { ...defaults, name: newName, exportType: newType };
      }
      const created = await pdfLayoutsApi.create(base);
      setLayouts(prev => [...prev, created]);
      setSelectedId(created.id);
      setShowNewModal(false);
      setNewName('');
      showSuccess('Layout erstellt');
    } catch (err: any) { showError(err.message); }
  };

  const handleDuplicate = async (id: string) => {
    const src = layouts.find(l => l.id === id);
    if (!src) return;
    try {
      const dup = await pdfLayoutsApi.duplicate(id, `${src.name} (Kopie)`);
      setLayouts(prev => [...prev, dup]);
      setSelectedId(dup.id);
      showSuccess('Layout dupliziert');
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Layout wirklich löschen?')) return;
    try {
      await pdfLayoutsApi.delete(id);
      setLayouts(prev => prev.filter(l => l.id !== id));
      if (selectedId === id) setSelectedId(layouts.find(l => l.id !== id)?.id || null);
      showSuccess('Layout gelöscht');
    } catch (err: any) { showError(err.message); }
  };

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const selected = layouts.find(l => l.id === selectedId);

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* ── Sidebar: Layout-Liste ─────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-surface-border bg-obsidian-900 overflow-y-auto">
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-accent-purple" />
            <span className="text-sm font-semibold text-text-primary">PDF-Layouts</span>
            <span className="text-xs bg-surface-raised text-text-muted px-1.5 py-0.5 rounded-full">{layouts.length}</span>
          </div>
          {can('canManageSettings') && (
            <button
              onClick={() => setShowNewModal(true)}
              className="p-1.5 rounded bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-colors"
              title="Neues Layout"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Filter & Sortierung */}
        <div className="p-2 border-b border-surface-border flex flex-col gap-1.5">
          <select
            value={sidebarTypeFilter}
            onChange={e => setSidebarTypeFilter(e.target.value)}
            className="w-full bg-obsidian-800 border border-surface-border rounded px-2 py-1.5 text-xs text-text-primary"
            title="Nach Export-Typ filtern"
          >
            <option value="all">Alle Typen ({layouts.length})</option>
            {EXPORT_TYPES.filter(t => t.value !== 'all').map(t => {
              const count = layouts.filter(l => l.exportType === t.value).length;
              return count > 0 ? (
                <option key={t.value} value={t.value}>{t.label} ({count})</option>
              ) : null;
            })}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted shrink-0">Sortierung:</span>
            <select
              value={sidebarSort}
              onChange={e => setSidebarSort(e.target.value as any)}
              className="flex-1 bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary"
            >
              <option value="type">Nach Typ</option>
              <option value="name">Name A–Z</option>
              <option value="default">Standard zuerst</option>
            </select>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4 text-center text-text-muted text-sm">Lädt…</div>
        ) : (() => {
          // Filtern
          let filtered = sidebarTypeFilter === 'all'
            ? layouts
            : layouts.filter(l => l.exportType === sidebarTypeFilter || l.exportType === 'all');
          // Sortieren
          filtered = [...filtered].sort((a, b) => {
            if (sidebarSort === 'name') return a.name.localeCompare(b.name, 'de');
            if (sidebarSort === 'default') {
              if (a.isDefault && !b.isDefault) return -1;
              if (!a.isDefault && b.isDefault) return 1;
              if (a.isSystem && !b.isSystem) return -1;
              if (!a.isSystem && b.isSystem) return 1;
              return a.name.localeCompare(b.name, 'de');
            }
            const typeOrder = ['all','episode','idea','calendar','invoice','confirmation','booking_calendar','performance_report','sponsor_dossier','sponsor_offer','question_pool'];
            const ta = typeOrder.indexOf(a.exportType);
            const tb = typeOrder.indexOf(b.exportType);
            if (ta !== tb) return ta - tb;
            if (a.isSystem && !b.isSystem) return -1;
            if (!a.isSystem && b.isSystem) return 1;
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name, 'de');
          });
          const grouped = sidebarSort === 'type'
            ? EXPORT_TYPES.reduce((acc: any[], t) => {
                const items = filtered.filter(l => l.exportType === t.value);
                if (items.length > 0) acc.push({ label: t.label, items });
                return acc;
              }, [])
            : [{ label: '', items: filtered }];
          return (
            <div className="flex flex-col gap-0 p-2 flex-1 overflow-y-auto">
              {grouped.map((group: any, gi: number) => (
                <div key={gi} className="mb-2">
                  {group.label && (
                    <div className="px-2 py-1 text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-surface-border mb-1">
                      {group.label}
                    </div>
                  )}
                  {group.items.map((layout: any) => (
                    <div
                      key={layout.id}
                      onClick={() => setSelectedId(layout.id)}
                      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors mb-0.5 ${
                        selectedId === layout.id
                          ? 'bg-accent-purple/20 border border-accent-purple/30'
                          : 'hover:bg-surface-raised border border-transparent'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                        style={{ backgroundColor: layout.colors?.primary || '#4a4a8a' }}
                        title={`Primärfarbe: ${layout.colors?.primary || '#4a4a8a'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {layout.isSystem && <span title="System-Layout"><Lock size={9} className="text-text-muted shrink-0" aria-label="System-Layout" /></span>}
                          {layout.isDefault && <span title="Standard-Layout"><Star size={9} className="text-accent-yellow shrink-0 fill-current" aria-label="Standard-Layout" /></span>}
                          <span className="text-xs text-text-primary truncate">{layout.name}</span>
                        </div>
                        {sidebarSort !== 'type' && (
                          <span className="text-xs text-text-muted">
                            {EXPORT_TYPES.find(t => t.value === layout.exportType)?.label || layout.exportType}
                          </span>
                        )}
                      </div>
                      {can('canManageSettings') && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); handleDuplicate(layout.id); }}
                            className="p-1 rounded hover:bg-surface-overlay text-text-muted hover:text-text-primary"
                            title="Duplizieren"
                          >
                            <Copy size={11} />
                          </button>
                          {!layout.isSystem && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(layout.id); }}
                              className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400"
                              title="Löschen"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-xs text-text-muted text-center py-4">Keine Layouts für diesen Filter.</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Editor: Layout-Details ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!editForm ? (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>Wähle ein Layout aus der Liste</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-obsidian-900">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-text-primary">{editForm.name}</h2>
                  {editForm.isSystem && (
                    <span className="flex items-center gap-1 text-xs text-text-muted bg-surface-overlay px-2 py-0.5 rounded-full">
                      <Lock size={10} /> System
                    </span>
                  )}
                  {editForm.isDefault && (
                    <span className="flex items-center gap-1 text-xs text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-full">
                      <Star size={10} /> Standard
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {EXPORT_TYPES.find(t => t.value === editForm.exportType)?.label}
                </p>
              </div>
              {can('canManageSettings') && (
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      onClick={() => { setEditForm(JSON.parse(JSON.stringify(selected))); setIsDirty(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary border border-surface-border rounded-lg transition-colors"
                    >
                      <RotateCcw size={14} /> Zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? <span className="animate-spin">⟳</span> : <Save size={14} />}
                    Speichern
                  </button>
                </div>
              )}

              {/* Vorschau-Button — immer sichtbar */}
              <button
                onClick={() => handlePreview()}
                disabled={isLoadingPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-obsidian-800 border border-surface-border text-text-primary rounded-lg hover:bg-surface-raised disabled:opacity-50 transition-colors"
                title="PDF-Vorschau anzeigen"
              >
                {isLoadingPreview
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Monitor size={14} className="text-accent-blue" />}
                Vorschau
              </button>
            </div>

            {/* PDF-Vorschau-Panel */}
            {showPreview && previewUrl && (
              <div className="border-b border-surface-border">
                <div className="flex items-center justify-between px-6 py-2 bg-obsidian-900">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-accent-blue" />
                    <span className="text-sm font-medium text-text-primary">PDF-Vorschau</span>
                    {isDirty && (
                      <span className="text-[10px] bg-accent-orange/20 text-accent-orange px-2 py-0.5 rounded-full">
                        Ungespeicherte Änderungen — Vorschau aktualisieren
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(true)}
                      disabled={isLoadingPreview}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded bg-obsidian-800 border border-surface-border transition-colors disabled:opacity-50"
                      title="Vorschau aktualisieren"
                    >
                      <RefreshCw size={12} className={isLoadingPreview ? 'animate-spin' : ''} />
                      Aktualisieren
                    </button>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded bg-obsidian-800 border border-surface-border transition-colors"
                      title="In neuem Tab öffnen"
                    >
                      <ExternalLink size={12} /> Vollbild
                    </a>
                    <button
                      onClick={() => { setShowPreview(false); setPreviewUrl(null); }}
                      className="p-1 text-text-muted hover:text-accent-red rounded transition-colors"
                      title="Vorschau schließen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="relative" style={{ height: '520px' }}>
                  {isLoadingPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-obsidian-900/80 z-10">
                      <div className="flex items-center gap-2 text-text-muted">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="text-sm">Vorschau wird generiert…</span>
                      </div>
                    </div>
                  )}
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF-Vorschau"
                    style={{ background: '#fff' }}
                  />
                </div>
              </div>
            )}

            {/* Editor-Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">

              {/* Allgemein */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Edit2 size={14} className="text-accent-purple" /> Allgemein
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Name</label>
                      <input
                        value={editForm.name}
                        onChange={e => update('name', e.target.value)}
                        className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Export-Typ</label>
                      <select
                        value={editForm.exportType}
                        onChange={e => update('exportType', e.target.value)}
                        className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary"
                      >
                        {EXPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-text-muted mb-1">Beschreibung</label>
                      <input
                        value={editForm.description || ''}
                        onChange={e => update('description', e.target.value)}
                        className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary"
                        placeholder="Kurze Beschreibung des Layouts…"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={editForm.isDefault}
                        onChange={e => update('isDefault', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="isDefault" className="text-sm text-text-primary">Als Standard-Layout verwenden</label>
                    </div>
                  </div>
                </div>

              {/* Seite */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('page')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Layout size={14} className="text-accent-blue" /> Seite & Ränder
                  </span>
                  {expandedSections.page ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.page && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Seitengröße</label>
                      <select
                        value={editForm.pageSize}
                        onChange={e => update('pageSize', e.target.value)}
                        disabled={false}
                        className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                      >
                        {PAGE_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Ausrichtung</label>
                      <div className="flex gap-2">
                        {PAGE_ORIENTATIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => update('pageOrientation', o.value)}
                            disabled={false}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors disabled:opacity-50 ${
                              (editForm.pageOrientation || 'portrait') === o.value
                                ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                                : 'bg-obsidian-800 border-surface-border text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {o.value === 'portrait'
                              ? <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="10" height="14" rx="1" opacity="0.3"/><rect x="1" y="1" width="8" height="12" rx="0.5"/></svg>
                              : <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="0" width="14" height="10" rx="1" opacity="0.3"/><rect x="1" y="1" width="12" height="8" rx="0.5"/></svg>
                            }
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <NumberInput
                      label="Seitenrand"
                      value={editForm.pageMargin}
                      onChange={v => update('pageMargin', v)}
                      min={20} max={100} unit="pt"
                    />
                  </div>
                )}
              </div>

              {/* Farben */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('colors')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Palette size={14} className="text-accent-purple" /> Farben
                  </span>
                  {expandedSections.colors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.colors && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    {Object.entries(editForm.colors || {}).map(([key, val]) => (
                      <ColorInput
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        value={val as string}
                        onChange={v => update(`colors.${key}`, v)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Typografie */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('typography')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Type size={14} className="text-accent-cyan" /> Typografie
                  </span>
                  {expandedSections.typography ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.typography && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Schriftfamilie</label>
                      <select
                        value={editForm.typography?.fontFamily}
                        onChange={e => update('typography.fontFamily', e.target.value)}
                        disabled={false}
                        className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                      >
                        {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    {[
                      { key: 'titleSize', label: 'Titel-Größe' },
                      { key: 'subtitleSize', label: 'Untertitel-Größe' },
                      { key: 'headingSize', label: 'Überschrift-Größe' },
                      { key: 'bodySize', label: 'Fließtext-Größe' },
                      { key: 'smallSize', label: 'Klein-Größe' },
                    ].map(({ key, label }) => (
                      <NumberInput
                        key={key}
                        label={label}
                        value={editForm.typography?.[key] || 10}
                        onChange={v => update(`typography.${key}`, v)}
                        min={6} max={36} unit="pt"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Header */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('header')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Eye size={14} className="text-accent-green" /> Header
                  </span>
                  {expandedSections.header ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.header && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Stil</label>
                      <select
                        value={editForm.header?.style}
                        onChange={e => update('header.style', e.target.value)}
                        disabled={false}
                        className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                      >
                        {HEADER_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    {[
                      { key: 'showLogo', label: 'Logo anzeigen' },
                      { key: 'showPodcastName', label: 'Podcast-Name anzeigen' },
                      { key: 'showDocumentTitle', label: 'Dokumenttitel anzeigen' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`header-${key}`}
                          checked={editForm.header?.[key] ?? true}
                          onChange={e => update(`header.${key}`, e.target.checked)}
                          disabled={false}
                          className="rounded disabled:opacity-50"
                        />
                        <label htmlFor={`header-${key}`} className="text-sm text-text-primary">{label}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('footer')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <FileText size={14} className="text-accent-orange" /> Footer
                  </span>
                  {expandedSections.footer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.footer && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    {[
                      { key: 'showPageNumbers', label: 'Seitenzahlen anzeigen' },
                      { key: 'showDate', label: 'Datum anzeigen' },
                      { key: 'showPodcastName', label: 'Podcast-Name anzeigen' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`footer-${key}`}
                          checked={editForm.footer?.[key] ?? true}
                          onChange={e => update(`footer.${key}`, e.target.checked)}
                          disabled={false}
                          className="rounded disabled:opacity-50"
                        />
                        <label htmlFor={`footer-${key}`} className="text-sm text-text-primary">{label}</label>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Benutzerdefinierter Footer-Text</label>
                      <input
                        value={editForm.footer?.customText || ''}
                        onChange={e => update('footer.customText', e.target.value)}
                        disabled={false}
                        className="w-full bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                        placeholder="z.B. Vertraulich · Intern"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sektionen – gruppiert nach Export-Typ */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('sections')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Check size={14} className="text-accent-green" /> Sichtbare Sektionen
                  </span>
                  {expandedSections.sections ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.sections && (
                  <div className="px-4 pb-4 space-y-4 border-t border-surface-border pt-3">
                    <p className="text-xs text-text-muted">Steuere, welche Bereiche im exportierten PDF erscheinen. Bei Export-Typ "Alle" werden alle Gruppen angewendet.</p>
                    {Object.entries(SECTION_GROUPS)
                      .filter(([groupKey]) =>
                        editForm.exportType === 'all' || editForm.exportType === groupKey
                      )
                      .map(([groupKey, group]) => (
                        <div key={groupKey}>
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{group.label}</p>
                          <div className="space-y-1.5 pl-2">
                            {group.keys.map(key => (
                              <div key={key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`sec-${key}`}
                                  checked={(editForm.sections?.[key] ?? true) as boolean}
                                  onChange={e => update(`sections.${key}`, e.target.checked)}
                                  disabled={false}
                                  className="rounded disabled:opacity-50"
                                />
                                <label htmlFor={`sec-${key}`} className="text-sm text-text-primary">
                                  {SECTION_LABELS[key] || key}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Wasserzeichen */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('watermark')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Eye size={14} className="text-text-muted" /> Wasserzeichen
                  </span>
                  {expandedSections.watermark ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.watermark && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="wm-enabled"
                        checked={editForm.watermark?.enabled ?? false}
                        onChange={e => update('watermark.enabled', e.target.checked)}
                        disabled={false}
                        className="rounded disabled:opacity-50"
                      />
                      <label htmlFor="wm-enabled" className="text-sm text-text-primary">Wasserzeichen aktivieren</label>
                    </div>
                    {editForm.watermark?.enabled && (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-text-muted w-36 shrink-0">Text</label>
                          <input
                            type="text"
                            value={editForm.watermark?.text || ''}
                            onChange={e => update('watermark.text', e.target.value)}
                            disabled={false}
                            placeholder="z.B. ENTWURF, VERTRAULICH"
                            className="flex-1 bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                          />
                        </div>
                        <ColorInput
                          label="Farbe"
                          value={editForm.watermark?.color || '#cccccc'}
                          onChange={v => update('watermark.color', v)}
                        />
                        <NumberInput
                          label="Deckkraft (%)"
                          value={editForm.watermark?.opacity ?? 20}
                          onChange={v => update('watermark.opacity', v)}
                          min={5} max={80} unit="%"
                        />
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-text-muted w-36 shrink-0">Position</label>
                          <select
                            value={editForm.watermark?.position || 'center'}
                            onChange={e => update('watermark.position', e.target.value)}
                            disabled={false}
                            className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                          >
                            {WATERMARK_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                        <NumberInput
                          label="Schriftgröße"
                          value={editForm.watermark?.fontSize ?? 60}
                          onChange={v => update('watermark.fontSize', v)}
                          min={20} max={120} unit="pt"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Erweiterte Einstellungen */}
              <div className="bg-obsidian-900 border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('advanced')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Layout size={14} className="text-accent-cyan" /> Erweiterte Einstellungen
                  </span>
                  {expandedSections.advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.advanced && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Zeilenabstand</label>
                      <select
                        value={editForm.lineSpacing || 'normal'}
                        onChange={e => update('lineSpacing', e.target.value)}
                        disabled={false}
                        className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                      >
                        {LINE_SPACING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-text-muted w-36 shrink-0">Trennlinien-Stil</label>
                      <select
                        value={editForm.dividerStyle || 'solid'}
                        onChange={e => update('dividerStyle', e.target.value)}
                        disabled={false}
                        className="bg-obsidian-800 border border-surface-border rounded px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                      >
                        {DIVIDER_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <NumberInput
                      label="Header-Höhe"
                      value={editForm.header?.height ?? 70}
                      onChange={v => update('header.height', v)}
                      min={40} max={150} unit="pt"
                    />
                    <NumberInput
                      label="Abstand nach Header"
                      value={editForm.header?.marginBottom ?? 20}
                      onChange={v => update('header.marginBottom', v)}
                      min={5} max={60} unit="pt"
                    />
                    <NumberInput
                      label="Abstand vor Footer"
                      value={editForm.footer?.marginTop ?? 20}
                      onChange={v => update('footer.marginTop', v)}
                      min={5} max={60} unit="pt"
                    />
                    <NumberInput
                      label="Abstand zwischen Sektionen"
                      value={editForm.sectionSpacing ?? 15}
                      onChange={v => update('sectionSpacing', v)}
                      min={5} max={50} unit="pt"
                    />
                  </div>
                )}
              </div>

              {/* System-Layout Aktivierung */}
              {editForm.isSystem && (
                <div className="bg-obsidian-900 border border-surface-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                    <Lock size={14} className="text-text-muted" /> System-Layout
                  </h3>
                  <p className="text-xs text-text-muted mb-3">
                    System-Layouts dienen als Fallback und werden nur verwendet, wenn für den jeweiligen Export-Typ kein eigenes Layout definiert wurde.
                  </p>
                  <div className="flex items-center justify-between p-3 bg-obsidian-800 rounded-lg border border-surface-border">
                    <div>
                      <p className="text-sm text-text-primary">Fallback aktiv</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {editForm.isEnabled !== false
                          ? 'Wird als Fallback verwendet, wenn kein eigenes Layout vorhanden ist'
                          : 'Deaktiviert – wird nicht als Fallback verwendet'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = editForm.isEnabled === false ? true : false;
                        update('isEnabled', newVal);
                        try {
                          await pdfLayoutsApi.update(editForm.id, { isEnabled: newVal } as any);
                          setLayouts(prev => prev.map(l => l.id === editForm.id ? { ...l, isEnabled: newVal } : l));
                          showSuccess(newVal ? 'System-Layout aktiviert' : 'System-Layout deaktiviert');
                        } catch (err: any) { showError(err.message); }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.isEnabled !== false ? 'bg-accent-green' : 'bg-surface-overlay'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editForm.isEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* ── Modal: Neues Layout ───────────────────────────────────────── */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Neues PDF-Layout erstellen">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Name *</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
              placeholder="Mein Layout"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Export-Typ</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
            >
              {EXPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Basierend auf</label>
            <select
              value={cloneFrom}
              onChange={e => setCloneFrom(e.target.value)}
              className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Standard-Vorlage</option>
              {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-surface-border rounded-lg">
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 disabled:opacity-50"
            >
              Erstellen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
