/**
 * PodCore PDF Layout Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Verwaltet benutzerdefinierte PDF-Layouts für alle Export-Optionen.
 * Jedes Layout ist ein JSON-Objekt, das Farben, Schriften, Sektionen und
 * Sichtbarkeitsregeln definiert. Die Render-Funktionen nutzen PDFKit.
 *
 * Export-Typen:
 *   - episode          → Episoden-Dokument (Script, Meta, Blöcke)
 *   - idea             → Ideenmappe
 *   - calendar         → Redaktionsplan-Kalender
 *   - invoice          → Sponsor-Abrechnung
 *   - confirmation     → Buchungsbestätigung für Sponsor
 *   - booking_calendar → Buchungskalender-Übersicht
 */

import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

// ─── Typen ────────────────────────────────────────────────────────────────────

export type PdfExportType = 'episode' | 'idea' | 'calendar' | 'invoice' | 'confirmation' | 'booking_calendar' | 'performance_report' | 'sponsor_dossier';

export interface PdfLayoutColors {
  primary: string;       // Hauptfarbe (Überschriften, Akzente)
  secondary: string;     // Sekundärfarbe (Unterüberschriften)
  accent: string;        // Akzentfarbe (Trennlinien, Badges)
  text: string;          // Haupttextfarbe
  muted: string;         // Gedämpfte Textfarbe (Meta, Footer)
  background: string;    // Hintergrundfarbe (Headerbereich)
  headerText: string;    // Textfarbe im Header
}

export interface PdfLayoutTypography {
  titleSize: number;
  subtitleSize: number;
  headingSize: number;
  bodySize: number;
  smallSize: number;
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
}

export interface PdfLayoutHeader {
  showLogo: boolean;
  showPodcastName: boolean;
  showDocumentTitle: boolean;
  logoPosition: 'left' | 'right' | 'center';
  style: 'minimal' | 'banner' | 'sidebar';
}

export interface PdfLayoutFooter {
  showPageNumbers: boolean;
  showDate: boolean;
  showPodcastName: boolean;
  customText: string;
}

export interface PdfLayoutSections {
  // Episode
  showMeta: boolean;
  showDescription: boolean;
  showBlocks: boolean;
  showProductionInfo: boolean;
  showTechnicalData: boolean;
  showNotes: boolean;
  showShowNotes: boolean;       // v2.9.0 – öffentliche Show-Notes
  showSponsors: boolean;
  showAltDuration: boolean;     // v2.9.0 – alternative Episodenlänge
  // Idea
  showIdeaDescription: boolean;
  showIdeaNotes: boolean;
  showIdeaResearch: boolean;
  showIdeaQuestions: boolean;
  showIdeaChecklist: boolean;
  // Calendar
  showCalendarLegend: boolean;
  showCalendarNotes: boolean;          // v2.9.3 – Notizen je Kalender-Eintrag
  // Invoice
  showInvoiceDetails: boolean;
  showInvoiceSummary: boolean;
  // Pricelist
  showPricelistDescriptions: boolean;  // v2.9.3 – Beschreibungen in Preisliste
  showPricelistExclusive: boolean;     // v2.9.3 – Exklusiv-Kennzeichnung
  // Confirmation (Buchungsbestätigung)
  showConfirmationContact: boolean;    // v2.11.1 – Kontaktdaten im Bestätigungsdokument
  showConfirmationPricing: boolean;    // v2.11.1 – Preisdetails in Bestätigung
  showConfirmationTerms: boolean;      // v2.11.1 – Vertragslaufzeit in Bestätigung
  // Booking Calendar
  showBookingCalendarLegend: boolean;  // v2.11.1 – Legende im Buchungskalender
  showBookingCalendarConflicts: boolean; // v2.11.1 – Konflikte hervorheben
  // Performance Report (Leistungsübersicht) – v2.12.0
  showPerformanceCustomerInfo: boolean; // Kundennummer und Kontaktdaten
  showPerformanceV2Bookings: boolean;   // v2-Buchungen (ad_bookings) einbeziehen
  showPerformancePriceBreakdown: boolean; // Preisaufschlüsselung je Buchung
  showPerformanceTotals: boolean;       // Gesamtsummen am Ende
  showPerformanceNotes: boolean;        // Performance-Notizen je Buchung
}

export interface PdfLayoutWatermark {
  enabled: boolean;
  text: string;              // z.B. "ENTWURF", "VERTRAULICH"
  color: string;             // Hex-Farbe
  opacity: number;           // 0.0 – 1.0
  position: 'center' | 'diagonal' | 'bottom-right';
}

export interface PdfLayout {
  id: string;
  name: string;
  description: string;
  exportType: PdfExportType | 'all';
  isDefault: boolean;
  isSystem: boolean;
  isEnabled: boolean;
  colors: PdfLayoutColors;
  typography: PdfLayoutTypography;
  header: PdfLayoutHeader;
  footer: PdfLayoutFooter;
  sections: PdfLayoutSections;
  pageMargin: number;
  pageSize: 'A4' | 'Letter';
  pageOrientation: 'portrait' | 'landscape';
  // v2.9.3 – neue Einstellungen
  headerHeight: number;      // Header-Höhe in Pixeln (Standard: 70)
  lineSpacing: 'compact' | 'normal' | 'wide';  // Zeilenabstand
  dividerStyle: 'line' | 'dotted' | 'double' | 'none';  // Trennlinien-Stil
  watermark: PdfLayoutWatermark;
  createdAt: string;
  updatedAt: string;
}

// ─── Standard-Layout ──────────────────────────────────────────────────────────

export const DEFAULT_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Standard',
  description: 'Das Standard-Layout für alle PDF-Exporte',
  exportType: 'all',
  isDefault: true,
  isSystem: true,
  colors: {
    primary: '#1a1a2e',
    secondary: '#7c3aed',
    accent: '#2563eb',
    text: '#111111',
    muted: '#888888',
    background: '#1a1a2e',
    headerText: '#ffffff',
  },
  typography: {
    titleSize: 20,
    subtitleSize: 14,
    headingSize: 12,
    bodySize: 10,
    smallSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: true,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'banner',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: true,
    customText: '',
  },
  sections: {
    showMeta: true,
    showDescription: true,
    showBlocks: true,
    showProductionInfo: true,
    showTechnicalData: true,
    showNotes: true,
    showShowNotes: true,
    showSponsors: true,
    showAltDuration: true,
    showIdeaDescription: true,
    showIdeaNotes: true,
    showIdeaResearch: true,
    showIdeaQuestions: true,
    showIdeaChecklist: true,
    showCalendarLegend: true,
    showCalendarNotes: true,
    showInvoiceDetails: true,
    showInvoiceSummary: true,
    showPricelistDescriptions: true,
    showPricelistExclusive: true,
    showConfirmationContact: true,
    showConfirmationPricing: true,
    showConfirmationTerms: true,
    showBookingCalendarLegend: true,
    showBookingCalendarConflicts: true,
    showPerformanceCustomerInfo: true,
    showPerformanceV2Bookings: true,
    showPerformancePriceBreakdown: true,
    showPerformanceTotals: true,
    showPerformanceNotes: true,
  },
  pageMargin: 50,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 70,
  lineSpacing: 'normal',
  dividerStyle: 'line',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

export const MINIMAL_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Minimal',
  description: 'Schlichtes Layout ohne farbigen Header',
  exportType: 'all',
  isDefault: false,
  isSystem: true,
  colors: {
    primary: '#000000',
    secondary: '#333333',
    accent: '#555555',
    text: '#111111',
    muted: '#999999',
    background: '#f5f5f5',
    headerText: '#000000',
  },
  typography: {
    titleSize: 18,
    subtitleSize: 13,
    headingSize: 11,
    bodySize: 10,
    smallSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: false,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'minimal',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: false,
    customText: '',
  },
  sections: {
    showMeta: true,
    showDescription: true,
    showBlocks: true,
    showProductionInfo: false,
    showTechnicalData: false,
    showNotes: false,
    showShowNotes: false,
    showSponsors: false,
    showAltDuration: false,
    showIdeaDescription: true,
    showIdeaNotes: true,
    showIdeaResearch: true,
    showIdeaQuestions: true,
    showIdeaChecklist: true,
    showCalendarLegend: true,
    showCalendarNotes: false,
    showInvoiceDetails: true,
    showInvoiceSummary: true,
    showPricelistDescriptions: true,
    showPricelistExclusive: false,
    showConfirmationContact: true,
    showConfirmationPricing: true,
    showConfirmationTerms: true,
    showBookingCalendarLegend: true,
    showBookingCalendarConflicts: false,
    showPerformanceCustomerInfo: true,
    showPerformanceV2Bookings: true,
    showPerformancePriceBreakdown: false,
    showPerformanceTotals: true,
    showPerformanceNotes: false,
  },
  pageMargin: 60,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 70,
  lineSpacing: 'normal',
  dividerStyle: 'line',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

// ─── Spezialisierte Layouts v2.12.0 ─────────────────────────────────────────

export const PERFORMANCE_REPORT_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Leistungsübersicht Professionell',
  description: 'Professionelles Layout für Sponsoring-Leistungsübersichten mit Kundennummer und Preisaufschlüsselung',
  exportType: 'performance_report',
  isDefault: true,
  isSystem: true,
  colors: {
    primary: '#1e3a5f',
    secondary: '#2563eb',
    accent: '#1d4ed8',
    text: '#111111',
    muted: '#6b7280',
    background: '#1e3a5f',
    headerText: '#ffffff',
  },
  typography: {
    titleSize: 20,
    subtitleSize: 13,
    headingSize: 11,
    bodySize: 10,
    smallSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: true,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'banner',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: true,
    customText: 'Dieses Dokument dient als Grundlage für die Rechnungserstellung.',
  },
  sections: {
    showMeta: true, showDescription: true, showBlocks: true, showProductionInfo: false,
    showTechnicalData: false, showNotes: false, showShowNotes: false, showSponsors: false,
    showAltDuration: false, showIdeaDescription: false, showIdeaNotes: false,
    showIdeaResearch: false, showIdeaQuestions: false, showIdeaChecklist: false,
    showCalendarLegend: false, showCalendarNotes: false,
    showInvoiceDetails: true, showInvoiceSummary: true,
    showPricelistDescriptions: false, showPricelistExclusive: false,
    showConfirmationContact: false, showConfirmationPricing: false, showConfirmationTerms: false,
    showBookingCalendarLegend: false, showBookingCalendarConflicts: false,
    showPerformanceCustomerInfo: true,
    showPerformanceV2Bookings: true,
    showPerformancePriceBreakdown: true,
    showPerformanceTotals: true,
    showPerformanceNotes: true,
  },
  pageMargin: 45,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 75,
  lineSpacing: 'normal',
  dividerStyle: 'line',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

export const PERFORMANCE_REPORT_COMPACT_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Leistungsübersicht Kompakt',
  description: 'Kompaktes Layout für viele Buchungen – kleinere Schrift, schmale Ränder',
  exportType: 'performance_report',
  isDefault: false,
  isSystem: true,
  colors: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#4b5563',
    text: '#111111',
    muted: '#9ca3af',
    background: '#111827',
    headerText: '#ffffff',
  },
  typography: {
    titleSize: 16,
    subtitleSize: 11,
    headingSize: 10,
    bodySize: 9,
    smallSize: 7,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: true,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'minimal',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: false,
    customText: '',
  },
  sections: {
    showMeta: true, showDescription: false, showBlocks: false, showProductionInfo: false,
    showTechnicalData: false, showNotes: false, showShowNotes: false, showSponsors: false,
    showAltDuration: false, showIdeaDescription: false, showIdeaNotes: false,
    showIdeaResearch: false, showIdeaQuestions: false, showIdeaChecklist: false,
    showCalendarLegend: false, showCalendarNotes: false,
    showInvoiceDetails: true, showInvoiceSummary: true,
    showPricelistDescriptions: false, showPricelistExclusive: false,
    showConfirmationContact: false, showConfirmationPricing: false, showConfirmationTerms: false,
    showBookingCalendarLegend: false, showBookingCalendarConflicts: false,
    showPerformanceCustomerInfo: true,
    showPerformanceV2Bookings: true,
    showPerformancePriceBreakdown: false,
    showPerformanceTotals: true,
    showPerformanceNotes: false,
  },
  pageMargin: 35,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 60,
  lineSpacing: 'compact',
  dividerStyle: 'dotted',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

export const INVOICE_CORPORATE_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Abrechnung Corporate',
  description: 'Formelles Business-Layout für Sponsor-Abrechnungen mit klarer Tabellenstruktur',
  exportType: 'invoice',
  isDefault: false,
  isSystem: true,
  colors: {
    primary: '#0f172a',
    secondary: '#1e40af',
    accent: '#3b82f6',
    text: '#0f172a',
    muted: '#64748b',
    background: '#0f172a',
    headerText: '#f8fafc',
  },
  typography: {
    titleSize: 22,
    subtitleSize: 14,
    headingSize: 12,
    bodySize: 10,
    smallSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: true,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'banner',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: true,
    customText: '',
  },
  sections: {
    showMeta: true, showDescription: true, showBlocks: true, showProductionInfo: false,
    showTechnicalData: false, showNotes: false, showShowNotes: false, showSponsors: false,
    showAltDuration: false, showIdeaDescription: false, showIdeaNotes: false,
    showIdeaResearch: false, showIdeaQuestions: false, showIdeaChecklist: false,
    showCalendarLegend: false, showCalendarNotes: false,
    showInvoiceDetails: true, showInvoiceSummary: true,
    showPricelistDescriptions: false, showPricelistExclusive: false,
    showConfirmationContact: false, showConfirmationPricing: false, showConfirmationTerms: false,
    showBookingCalendarLegend: false, showBookingCalendarConflicts: false,
    showPerformanceCustomerInfo: true,
    showPerformanceV2Bookings: false,
    showPerformancePriceBreakdown: true,
    showPerformanceTotals: true,
    showPerformanceNotes: false,
  },
  pageMargin: 50,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 80,
  lineSpacing: 'normal',
  dividerStyle: 'double',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

export const CONFIRMATION_MODERN_LAYOUT: Omit<PdfLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Buchungsbestätigung Modern',
  description: 'Modernes Layout mit lila Akzenten für Buchungsbestätigungen',
  exportType: 'confirmation',
  isDefault: false,
  isSystem: true,
  colors: {
    primary: '#4c1d95',
    secondary: '#7c3aed',
    accent: '#8b5cf6',
    text: '#111111',
    muted: '#6b7280',
    background: '#4c1d95',
    headerText: '#ffffff',
  },
  typography: {
    titleSize: 20,
    subtitleSize: 13,
    headingSize: 11,
    bodySize: 10,
    smallSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    showLogo: true,
    showPodcastName: true,
    showDocumentTitle: true,
    logoPosition: 'left',
    style: 'banner',
  },
  footer: {
    showPageNumbers: true,
    showDate: true,
    showPodcastName: true,
    customText: 'Vielen Dank für Ihre Zusammenarbeit!',
  },
  sections: {
    showMeta: true, showDescription: true, showBlocks: true, showProductionInfo: false,
    showTechnicalData: false, showNotes: false, showShowNotes: false, showSponsors: false,
    showAltDuration: false, showIdeaDescription: false, showIdeaNotes: false,
    showIdeaResearch: false, showIdeaQuestions: false, showIdeaChecklist: false,
    showCalendarLegend: false, showCalendarNotes: false,
    showInvoiceDetails: true, showInvoiceSummary: true,
    showPricelistDescriptions: false, showPricelistExclusive: false,
    showConfirmationContact: true, showConfirmationPricing: true, showConfirmationTerms: true,
    showBookingCalendarLegend: false, showBookingCalendarConflicts: false,
    showPerformanceCustomerInfo: false,
    showPerformanceV2Bookings: false,
    showPerformancePriceBreakdown: false,
    showPerformanceTotals: false,
    showPerformanceNotes: false,
  },
  pageMargin: 50,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  headerHeight: 70,
  lineSpacing: 'normal',
  dividerStyle: 'line',
  watermark: { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
  isEnabled: true,
};

// ─── Datenbank-Hilfsfunktionen ────────────────────────────────────────────────

function parseLayout(row: any): PdfLayout {
  const sections = JSON.parse(row.sections || '{}');
  const watermarkRaw = row.watermark ? JSON.parse(row.watermark) : null;
  return {
    ...row,
    colors: JSON.parse(row.colors || '{}'),
    typography: JSON.parse(row.typography || '{}'),
    header: JSON.parse(row.header_config || '{}'),
    footer: JSON.parse(row.footer_config || '{}'),
    sections: {
      showShowNotes: false,
      showAltDuration: false,
      showCalendarNotes: false,
      showPricelistDescriptions: true,
      showPricelistExclusive: true,
      showConfirmationContact: true,
      showConfirmationPricing: true,
      showConfirmationTerms: true,
      showBookingCalendarLegend: true,
      showBookingCalendarConflicts: true,
      ...sections,
    },
    isDefault: row.is_default === 1,
    isSystem: row.is_system === 1,
    exportType: row.export_type,
    pageMargin: row.page_margin || 50,
    pageSize: row.page_size || 'A4',
    pageOrientation: (row.page_orientation as 'portrait' | 'landscape') || 'portrait',
    headerHeight: row.header_height || 70,
    lineSpacing: (row.line_spacing as 'compact' | 'normal' | 'wide') || 'normal',
    dividerStyle: (row.divider_style as 'line' | 'dotted' | 'double' | 'none') || 'line',
    watermark: watermarkRaw || { enabled: false, text: 'ENTWURF', color: '#888888', opacity: 0.15, position: 'diagonal' },
    isEnabled: row.is_enabled !== 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ensureDefaultLayouts(): void {
  const db = getDb();

  // Create table if not exists
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS pdf_layouts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      export_type TEXT NOT NULL DEFAULT 'all',
      is_default INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0,
      colors TEXT NOT NULL DEFAULT '{}',
      typography TEXT NOT NULL DEFAULT '{}',
      header_config TEXT NOT NULL DEFAULT '{}',
      footer_config TEXT NOT NULL DEFAULT '{}',
      sections TEXT NOT NULL DEFAULT '{}',
      page_margin INTEGER NOT NULL DEFAULT 50,
      page_size TEXT NOT NULL DEFAULT 'A4',
      page_orientation TEXT NOT NULL DEFAULT 'portrait',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    // Migrations: add missing columns
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN page_orientation TEXT NOT NULL DEFAULT 'portrait'`); } catch (_) {}
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1`); } catch (_) {}
    // v2.9.3 – neue Spalten
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN header_height INTEGER NOT NULL DEFAULT 70`); } catch (_) {}
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN line_spacing TEXT NOT NULL DEFAULT 'normal'`); } catch (_) {}
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN divider_style TEXT NOT NULL DEFAULT 'line'`); } catch (_) {}
    try { db.exec(`ALTER TABLE pdf_layouts ADD COLUMN watermark TEXT DEFAULT NULL`); } catch (_) {}
  } catch (_) {}

  // v2.11.4: Ensure confirmation and booking_calendar layouts exist
  const hasConfirmation = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'confirmation' LIMIT 1");
  if (!hasConfirmation) {
    const layout = { ...DEFAULT_LAYOUT, name: 'Buchungsbestätigung Standard', exportType: 'confirmation', isDefault: true, isSystem: false };
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        (layout as any).pageOrientation || 'portrait',
      ]);
  }
  const hasBookingCal = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'booking_calendar' LIMIT 1");
  if (!hasBookingCal) {
    const layout = { ...DEFAULT_LAYOUT, name: 'Buchungskalender Standard', exportType: 'booking_calendar', isDefault: true, isSystem: false, pageOrientation: 'landscape' };
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        (layout as any).pageOrientation || 'landscape',
      ]);
  }

  // v2.12.0: Neue spezialisierte Layouts seeden
  const hasPerformanceReport = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'performance_report' AND name = 'Leistungsübersicht Professionell' LIMIT 1");
  if (!hasPerformanceReport) {
    for (const layout of [PERFORMANCE_REPORT_LAYOUT, PERFORMANCE_REPORT_COMPACT_LAYOUT]) {
      db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation, header_height, line_spacing, divider_style, watermark)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), layout.name, layout.description, layout.exportType,
          layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
          JSON.stringify(layout.colors), JSON.stringify(layout.typography),
          JSON.stringify(layout.header), JSON.stringify(layout.footer),
          JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
          layout.pageOrientation || 'portrait',
          layout.headerHeight || 70, layout.lineSpacing || 'normal',
          layout.dividerStyle || 'line', JSON.stringify(layout.watermark),
        ]);
    }
  }
  const hasInvoiceCorporate = db.get("SELECT id FROM pdf_layouts WHERE name = 'Abrechnung Corporate' LIMIT 1");
  if (!hasInvoiceCorporate) {
    const layout = INVOICE_CORPORATE_LAYOUT;
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation, header_height, line_spacing, divider_style, watermark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        layout.pageOrientation || 'portrait',
        layout.headerHeight || 70, layout.lineSpacing || 'normal',
        layout.dividerStyle || 'line', JSON.stringify(layout.watermark),
      ]);
  }
  const hasConfirmationModern = db.get("SELECT id FROM pdf_layouts WHERE name = 'Buchungsbestätigung Modern' LIMIT 1");
  if (!hasConfirmationModern) {
    const layout = CONFIRMATION_MODERN_LAYOUT;
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation, header_height, line_spacing, divider_style, watermark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        layout.pageOrientation || 'portrait',
        layout.headerHeight || 70, layout.lineSpacing || 'normal',
        layout.dividerStyle || 'line', JSON.stringify(layout.watermark),
      ]);
  }

  // v2.12.7: Sponsor-Dossier Layout
  const hasDossier = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'sponsor_dossier' LIMIT 1");
  if (!hasDossier) {
    const layout = {
      ...DEFAULT_LAYOUT,
      name: 'Sponsor-Dossier Standard',
      description: 'Vollständiges Sponsor-Dossier mit Stammdaten, Verträgen, Buchungen und Abrechnung',
      exportType: 'sponsor_dossier' as PdfExportType,
      isDefault: true,
      isSystem: true,
      colors: { primary: '#1e3a5f', secondary: '#7c3aed', accent: '#2563eb', text: '#111111', muted: '#6b7280', background: '#1e3a5f', headerText: '#ffffff' },
      footer: { showPageNumbers: true, showDate: true, showPodcastName: true, customText: 'Vertraulich – nur für internen Gebrauch' },
    };
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation, header_height, line_spacing, divider_style, watermark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        layout.pageOrientation || 'portrait',
        layout.headerHeight || 70, layout.lineSpacing || 'normal',
        layout.dividerStyle || 'line', JSON.stringify(layout.watermark),
      ]);
  }

  // Insert system layouts if they don't exist
  const existing = db.all("SELECT id FROM pdf_layouts WHERE is_system = 1") as any[];
  if (existing.length === 0) {
    for (const layout of [DEFAULT_LAYOUT, MINIMAL_LAYOUT]) {
      db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), layout.name, layout.description, layout.exportType,
          layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
          JSON.stringify(layout.colors), JSON.stringify(layout.typography),
          JSON.stringify(layout.header), JSON.stringify(layout.footer),
          JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
          (layout as any).pageOrientation || 'portrait',
        ]);
    }
  }
}

export function getAllLayouts(): PdfLayout[] {
  ensureDefaultLayouts();
  const db = getDb();
  return (db.all('SELECT * FROM pdf_layouts ORDER BY is_system DESC, name ASC') as any[]).map(parseLayout);
}

export function getLayoutById(id: string): PdfLayout | null {
  ensureDefaultLayouts();
  const db = getDb();
  const row = db.get('SELECT * FROM pdf_layouts WHERE id = ?', [id]) as any;
  return row ? parseLayout(row) : null;
}

export function getDefaultLayoutForType(exportType: PdfExportType): PdfLayout {
  ensureDefaultLayouts();
  const db = getDb();
  // 1. Benutzerdefiniertes Layout für diesen Export-Typ (kein System-Layout, aktiviert)
  let row = db.get(
    "SELECT * FROM pdf_layouts WHERE export_type = ? AND is_system = 0 AND is_enabled != 0 AND is_default = 1 LIMIT 1",
    [exportType]
  ) as any;
  // 2. Beliebiges benutzerdefiniertes Layout für diesen Typ
  if (!row) row = db.get(
    "SELECT * FROM pdf_layouts WHERE export_type = ? AND is_system = 0 AND is_enabled != 0 LIMIT 1",
    [exportType]
  ) as any;
  // 3. Benutzerdefiniertes 'all'-Layout
  if (!row) row = db.get(
    "SELECT * FROM pdf_layouts WHERE export_type = 'all' AND is_system = 0 AND is_enabled != 0 AND is_default = 1 LIMIT 1"
  ) as any;
  if (!row) row = db.get(
    "SELECT * FROM pdf_layouts WHERE export_type = 'all' AND is_system = 0 AND is_enabled != 0 LIMIT 1"
  ) as any;
  // 4. System-Layout als Fallback (nur wenn aktiviert)
  if (!row) row = db.get(
    "SELECT * FROM pdf_layouts WHERE export_type = ? AND is_system = 1 AND is_enabled != 0 LIMIT 1",
    [exportType]
  ) as any;
  if (!row) row = db.get(
    "SELECT * FROM pdf_layouts WHERE is_system = 1 AND is_enabled != 0 LIMIT 1"
  ) as any;
  // 5. Absoluter Fallback: irgendein Layout
  if (!row) row = db.get("SELECT * FROM pdf_layouts ORDER BY is_system DESC LIMIT 1") as any;
  return parseLayout(row);
}

export function createLayout(data: Partial<PdfLayout>): PdfLayout {
  ensureDefaultLayouts();
  const db = getDb();
  const id = uuidv4();
  db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation, header_height, line_spacing, divider_style, watermark)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.name || 'Neues Layout', data.description || '', data.exportType || 'all',
      data.isDefault ? 1 : 0,
      JSON.stringify(data.colors || DEFAULT_LAYOUT.colors),
      JSON.stringify(data.typography || DEFAULT_LAYOUT.typography),
      JSON.stringify(data.header || DEFAULT_LAYOUT.header),
      JSON.stringify(data.footer || DEFAULT_LAYOUT.footer),
      JSON.stringify(data.sections || DEFAULT_LAYOUT.sections),
      data.pageMargin || 50, data.pageSize || 'A4',
      data.pageOrientation || 'portrait',
      data.headerHeight || 70,
      data.lineSpacing || 'normal',
      data.dividerStyle || 'line',
      JSON.stringify(data.watermark || DEFAULT_LAYOUT.watermark),
    ]);
  return getLayoutById(id)!;
}

export function updateLayout(id: string, data: Partial<PdfLayout>): PdfLayout | null {
  const db = getDb();
  const existing = getLayoutById(id);
  if (!existing) return null;
  // System-Layouts: können vollständig bearbeitet werden, nur Löschen ist gesperrt

  db.run(`UPDATE pdf_layouts SET
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    export_type = COALESCE(?, export_type),
    is_default = COALESCE(?, is_default),
    is_enabled = COALESCE(?, is_enabled),
    colors = COALESCE(?, colors),
    typography = COALESCE(?, typography),
    header_config = COALESCE(?, header_config),
    footer_config = COALESCE(?, footer_config),
    sections = COALESCE(?, sections),
    page_margin = COALESCE(?, page_margin),
    page_size = COALESCE(?, page_size),
    page_orientation = COALESCE(?, page_orientation),
    header_height = COALESCE(?, header_height),
    line_spacing = COALESCE(?, line_spacing),
    divider_style = COALESCE(?, divider_style),
    watermark = COALESCE(?, watermark),
    updated_at = datetime('now')
    WHERE id = ?`,
    [
      data.name ?? null, data.description ?? null, data.exportType ?? null,
      data.isDefault != null ? (data.isDefault ? 1 : 0) : null,
      data.isEnabled != null ? (data.isEnabled ? 1 : 0) : null,
      data.colors ? JSON.stringify(data.colors) : null,
      data.typography ? JSON.stringify(data.typography) : null,
      data.header ? JSON.stringify(data.header) : null,
      data.footer ? JSON.stringify(data.footer) : null,
      data.sections ? JSON.stringify(data.sections) : null,
      data.pageMargin ?? null, data.pageSize ?? null,
      data.pageOrientation ?? null,
      data.headerHeight ?? null,
      data.lineSpacing ?? null,
      data.dividerStyle ?? null,
      data.watermark ? JSON.stringify(data.watermark) : null,
      id,
    ]);
  return getLayoutById(id);
}

export function deleteLayout(id: string): void {
  const db = getDb();
  const existing = getLayoutById(id);
  if (!existing) throw new Error('Layout nicht gefunden');
  if (existing.isSystem) throw new Error('System-Layouts können nicht gelöscht werden');
  db.run('DELETE FROM pdf_layouts WHERE id = ?', [id]);
}

export function duplicateLayout(id: string, newName: string): PdfLayout {
  const existing = getLayoutById(id);
  if (!existing) throw new Error('Layout nicht gefunden');
  return createLayout({
    ...existing,
    name: newName || `${existing.name} (Kopie)`,
    isDefault: false,
    isSystem: false,
  });
}

// ─── PDF-Render-Helfer ────────────────────────────────────────────────────────

export function renderWatermark(doc: any, layout: PdfLayout): void {
  const wm = layout.watermark;
  if (!wm || !wm.enabled || !wm.text) return;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const opacity = Math.min(1, Math.max(0, wm.opacity || 0.15));
  // Farbe mit Deckkraft simulieren (PDFKit unterstützt kein echtes opacity für Text direkt)
  doc.save();
  doc.opacity(opacity);
  doc.fontSize(60).font('Helvetica-Bold').fillColor(wm.color || '#888888');
  if (wm.position === 'diagonal') {
    doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
    doc.text(wm.text, 0, pageHeight / 2 - 30, { width: pageWidth, align: 'center' });
  } else if (wm.position === 'bottom-right') {
    doc.fontSize(30);
    doc.text(wm.text, pageWidth / 2, pageHeight - 80, { width: pageWidth / 2, align: 'right' });
  } else {
    // center
    doc.text(wm.text, 0, pageHeight / 2 - 30, { width: pageWidth, align: 'center' });
  }
  doc.restore();
}

export function renderPdfHeader(
  doc: any,
  layout: PdfLayout,
  opts: { podcastName: string; documentTitle: string; logoPath?: string | null }
): void {
  const { colors, typography, header, pageMargin } = layout;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - pageMargin * 2;

  if (header.style === 'banner') {
    // Farbiger Header-Balken
    const headerHeight = layout.headerHeight || 70;
    doc.rect(0, 0, pageWidth, headerHeight).fill(colors.background);

    let textX = pageMargin;
    if (header.showLogo && opts.logoPath) {
      try {
        doc.image(opts.logoPath, pageMargin, 10, { fit: [50, 50] });
        textX = pageMargin + 60;
      } catch (_) {}
    }

    const textWidth = pageWidth - textX - pageMargin;
    if (header.showPodcastName) {
      doc.fontSize(typography.smallSize).font(`${typography.fontFamily}`).fillColor(colors.headerText)
        .text(opts.podcastName, textX, 15, { width: textWidth, align: header.logoPosition === 'left' ? 'right' : 'left' });
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.headerText)
        .text(opts.documentTitle, textX, 32, { width: textWidth, align: header.logoPosition === 'left' ? 'right' : 'left' });
    }

    doc.y = (layout.headerHeight || 70) + 15;
    doc.x = pageMargin;

  } else if (header.style === 'sidebar') {
    // Linker farbiger Streifen
    doc.rect(0, 0, 8, doc.page.height).fill(colors.secondary);
    doc.x = pageMargin;
    doc.y = pageMargin;

    if (header.showLogo && opts.logoPath) {
      try { doc.image(opts.logoPath, pageMargin, pageMargin, { fit: [60, 40] }); doc.moveDown(0.5); } catch (_) {}
    }
    if (header.showPodcastName) {
      doc.fontSize(typography.smallSize).font(typography.fontFamily).fillColor(colors.muted).text(opts.podcastName);
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.primary).text(opts.documentTitle);
    }
    doc.moveDown(0.5);
    doc.moveTo(pageMargin, doc.y).lineTo(pageWidth - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(1).stroke();
    doc.moveDown(0.5);

  } else {
    // Minimal
    doc.x = pageMargin;
    doc.y = pageMargin;

    const hasLogo = header.showLogo && opts.logoPath;
    if (hasLogo) {
      try { doc.image(opts.logoPath!, pageMargin, pageMargin, { fit: [50, 35] }); } catch (_) {}
    }

    if (header.showPodcastName) {
      doc.fontSize(typography.smallSize).font(typography.fontFamily).fillColor(colors.muted)
        .text(opts.podcastName, hasLogo ? pageMargin + 60 : pageMargin, pageMargin + 5, { align: 'left' });
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.primary)
        .text(opts.documentTitle, hasLogo ? pageMargin + 60 : pageMargin, pageMargin + 18);
    }
    doc.moveDown(0.3);
    doc.moveTo(pageMargin, doc.y).lineTo(pageWidth - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(0.5).stroke();
    doc.moveDown(0.5);
  }
}

export function renderPdfFooter(doc: any, layout: PdfLayout, opts: { podcastName: string; pageNum?: number }): void {
  const { colors, typography, footer, pageMargin } = layout;
  const pageWidth = doc.page.width;
  const footerY = doc.page.height - 30;

  const parts: string[] = [];
  if (footer.showPodcastName && opts.podcastName) parts.push(opts.podcastName);
  if (footer.customText) parts.push(footer.customText);
  if (footer.showDate) parts.push(new Date().toLocaleDateString('de-DE'));
  if (footer.showPageNumbers && opts.pageNum != null) parts.push(`Seite ${opts.pageNum}`);

  if (parts.length > 0) {
    doc.fontSize(typography.smallSize).font(typography.fontFamily).fillColor(colors.muted)
      .text(parts.join('   ·   '), pageMargin, footerY, { width: pageWidth - pageMargin * 2, align: 'center' });
  }
}

export function getLineSpacingFactor(layout: PdfLayout): number {
  switch (layout.lineSpacing) {
    case 'compact': return 0.6;
    case 'wide': return 1.4;
    default: return 1.0;
  }
}

export function renderSectionHeading(doc: any, layout: PdfLayout, title: string): void {
  const { colors, typography, pageMargin } = layout;
  const ls = getLineSpacingFactor(layout);
  doc.moveDown(0.3 * ls);
  const divStyle = layout.dividerStyle || 'line';
  if (divStyle === 'line') {
    doc.moveTo(pageMargin, doc.y).lineTo(doc.page.width - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(0.5).stroke();
  } else if (divStyle === 'dotted') {
    doc.moveTo(pageMargin, doc.y).lineTo(doc.page.width - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(0.5).dash(3, { space: 3 }).stroke().undash();
  } else if (divStyle === 'double') {
    doc.moveTo(pageMargin, doc.y).lineTo(doc.page.width - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(0.5).stroke();
    doc.moveTo(pageMargin, doc.y + 2).lineTo(doc.page.width - pageMargin, doc.y + 2).strokeColor(colors.accent).lineWidth(0.5).stroke();
    doc.y += 2;
  }
  // divStyle === 'none': keine Linie
  doc.moveDown(0.3 * ls);
  doc.fontSize(typography.headingSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.secondary).text(title);
  doc.fillColor(colors.text);
  doc.moveDown(0.2 * ls);
}

/**
 * Zeichnet Text mit automatischem Umbruch und gibt die neue Y-Position zurück.
 * Verhindert das Abschneiden von langen Zeilen in Tabellen oder Listen.
 */
export function drawWrappedText(
  doc: any,
  text: string,
  x: number,
  y: number,
  width: number,
  options: any = {}
): number {
  const startY = y || doc.y;
  doc.text(text, x, startY, { ...options, width });
  return doc.y;
}
