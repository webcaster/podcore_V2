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
import * as fs from 'fs';
import * as path from 'path';

// ─── Typen ────────────────────────────────────────────────────────────────────

export type PdfExportType = 'episode' | 'idea' | 'calendar' | 'invoice' | 'confirmation' | 'booking_calendar' | 'performance_report' | 'sponsor_dossier' | 'sponsor_offer' | 'question_pool' | 'season_planning';

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
  fontFamily: PdfFontFamily;
  /** Ausrichtung für Fließtext. */
  bodyAlignment?: 'left' | 'justify';
  /** Gestaltung der Abschnittsüberschriften. */
  headingStyle?: 'accent' | 'boxed' | 'minimal';
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
  // Sponsor-Angebot – v2.12.13
  showOfferIntro: boolean;              // Einleitungstext im Angebot
  showOfferOutro: boolean;              // Abschlusstext im Angebot
  showOfferNotes: boolean;              // Hinweise im Angebot
  showOfferOptions: boolean;            // Optionen/Positionen im Angebot
  showSponsorAddress: boolean;          // Sponsor-Adresse im Angebot
  // Fragenbibliothek – eingeführt in v2.14.3
  showQuestionPoolNotes?: boolean;       // Interne Hinweise je Pool-Frage ausgeben
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

export const PDF_FONT_FAMILIES = [
  'Helvetica',
  'Times-Roman',
  'Courier',
  'DejaVu Sans',
  'DejaVu Serif',
  'DejaVu Sans Mono',
] as const;

export type PdfFontFamily = (typeof PDF_FONT_FAMILIES)[number];
type PdfFontVariant = 'regular' | 'bold' | 'italic' | 'boldItalic';

const DEFAULT_TYPOGRAPHY: PdfLayoutTypography = {
  titleSize: 20,
  subtitleSize: 14,
  headingSize: 12,
  bodySize: 10,
  smallSize: 8,
  fontFamily: 'Helvetica',
  bodyAlignment: 'left',
  headingStyle: 'accent',
};

const BUNDLED_FONT_DIRECTORY = path.resolve(__dirname, '..', 'assets', 'fonts');
const FONT_VARIANTS: Record<PdfFontFamily, Record<PdfFontVariant, string>> = {
  Helvetica: {
    regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique', boldItalic: 'Helvetica-BoldOblique',
  },
  'Times-Roman': {
    regular: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic', boldItalic: 'Times-BoldItalic',
  },
  Courier: {
    regular: 'Courier', bold: 'Courier-Bold', italic: 'Courier-Oblique', boldItalic: 'Courier-BoldOblique',
  },
  'DejaVu Sans': {
    regular: 'PodCore-DejaVuSans', bold: 'PodCore-DejaVuSans-Bold', italic: 'PodCore-DejaVuSans', boldItalic: 'PodCore-DejaVuSans-Bold',
  },
  'DejaVu Serif': {
    regular: 'PodCore-DejaVuSerif', bold: 'PodCore-DejaVuSerif-Bold', italic: 'PodCore-DejaVuSerif', boldItalic: 'PodCore-DejaVuSerif-Bold',
  },
  'DejaVu Sans Mono': {
    regular: 'PodCore-DejaVuSansMono', bold: 'PodCore-DejaVuSansMono-Bold', italic: 'PodCore-DejaVuSansMono-Oblique', boldItalic: 'PodCore-DejaVuSansMono-BoldOblique',
  },
};

const BUNDLED_FONT_FILES: Array<{ key: string; file: string }> = [
  { key: 'PodCore-DejaVuSans', file: 'DejaVuSans.ttf' },
  { key: 'PodCore-DejaVuSans-Bold', file: 'DejaVuSans-Bold.ttf' },
  { key: 'PodCore-DejaVuSerif', file: 'DejaVuSerif.ttf' },
  { key: 'PodCore-DejaVuSerif-Bold', file: 'DejaVuSerif-Bold.ttf' },
  { key: 'PodCore-DejaVuSansMono', file: 'DejaVuSansMono.ttf' },
  { key: 'PodCore-DejaVuSansMono-Bold', file: 'DejaVuSansMono-Bold.ttf' },
  { key: 'PodCore-DejaVuSansMono-Oblique', file: 'DejaVuSansMono-Oblique.ttf' },
  { key: 'PodCore-DejaVuSansMono-BoldOblique', file: 'DejaVuSansMono-BoldOblique.ttf' },
];

/**
 * Repariert häufige doppelt kodierte UTF-8-Texte und normalisiert Unicode vor
 * der Übergabe an PDFKit. Bereits korrektes UTF-8 bleibt unverändert.
 */
export function normalizePdfText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(/\u0000/g, '').normalize('NFC');
  // Ältere Daten können mehrfach über falsch interpretierte UTF-8/Latin-1-
  // Schnittstellen gelaufen sein. Die Reparatur erfolgt fragmentweise, damit
  // bereits korrekte Zeichen im selben Text (z. B. „Überprüfung … Gespräch“)
  // unverändert bleiben.
  const mojibakeFragment = /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â[\u0080-\u00BF]{2})/g;
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    text = text.replace(mojibakeFragment, (fragment: string) => {
      try {
        const repaired = Buffer.from(fragment, 'latin1').toString('utf8').normalize('NFC');
        if (!repaired || repaired.includes('\uFFFD') || repaired === fragment) return fragment;
        changed = true;
        return repaired;
      } catch (_) {
        return fragment;
      }
    });
    if (!changed) break;
  }
  return text;
}

function normalizePdfTypography(value: unknown): PdfLayoutTypography {
  const input = value && typeof value === 'object' ? value as Partial<PdfLayoutTypography> : {};
  const fontFamily = PDF_FONT_FAMILIES.includes(input.fontFamily as PdfFontFamily)
    ? input.fontFamily as PdfFontFamily
    : DEFAULT_TYPOGRAPHY.fontFamily;
  const bodyAlignment = input.bodyAlignment === 'justify' ? 'justify' : 'left';
  const headingStyle = input.headingStyle === 'boxed' || input.headingStyle === 'minimal' ? input.headingStyle : 'accent';
  return { ...DEFAULT_TYPOGRAPHY, ...input, fontFamily, bodyAlignment, headingStyle };
}

/** Übersetzt Layoutfamilien und historische Namen in gültige PDFKit-Fontnamen. */
export function resolvePdfFontName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return FONT_VARIANTS.Helvetica.regular;
  const source = value.trim();
  if (BUNDLED_FONT_FILES.some(font => font.key === source)) return source;
  const compactSource = source.replace(/[ _-]/g, '').toLocaleLowerCase('en-US');
  let variant: PdfFontVariant = 'regular';
  let compactFamily = compactSource;
  const suffixes: Array<[string, PdfFontVariant]> = [
    ['boldoblique', 'boldItalic'], ['bolditalic', 'boldItalic'], ['oblique', 'italic'], ['italic', 'italic'], ['bold', 'bold'],
  ];
  for (const [suffix, candidate] of suffixes) {
    if (compactSource.endsWith(suffix) && compactSource.length > suffix.length) {
      compactFamily = compactSource.slice(0, -suffix.length);
      variant = candidate;
      break;
    }
  }
  const family = PDF_FONT_FAMILIES.find(candidate => candidate.replace(/[ _-]/g, '').toLocaleLowerCase('en-US') === compactFamily);
  return family ? FONT_VARIANTS[family][variant] : FONT_VARIANTS.Helvetica.regular;
}

/**
 * Registriert mitgelieferte Unicode-Schriften und fängt nicht auflösbare
 * Schriftwünsche transparent mit Helvetica ab. So führt ein Layout niemals
 * zu einem PDFKit-`ENOENT`-Abbruch.
 */
export function preparePdfDocument(doc: any): void {
  if (!doc || doc.__podcorePdfPrepared) return;
  for (const font of BUNDLED_FONT_FILES) {
    const fontPath = path.join(BUNDLED_FONT_DIRECTORY, font.file);
    if (fs.existsSync(fontPath)) doc.registerFont(font.key, fontPath);
  }
  const originalFont = typeof doc.font === 'function' ? doc.font.bind(doc) : null;
  if (originalFont) {
    doc.font = (requestedFont: unknown, ...args: any[]) => {
      const resolvedFont = resolvePdfFontName(requestedFont);
      try {
        return originalFont(resolvedFont, ...args);
      } catch (error) {
        console.warn(`PDF-Schrift "${String(requestedFont)}" nicht verfügbar; Helvetica wird verwendet.`, error);
        return originalFont(FONT_VARIANTS.Helvetica.regular, ...args);
      }
    };
  }

  // Alle bestehenden Exportpfade verwenden PDFKit direkt. Durch diese zentralen
  // Wrapper werden Sonderzeichen und ältere doppelt kodierte Texte auch dann
  // bereinigt, wenn ein Export keine eigene Text-Hilfsfunktion aufruft.
  const originalText = typeof doc.text === 'function' ? doc.text.bind(doc) : null;
  if (originalText) doc.text = (value: unknown, ...args: any[]) => originalText(normalizePdfText(value), ...args);
  const originalWidthOfString = typeof doc.widthOfString === 'function' ? doc.widthOfString.bind(doc) : null;
  if (originalWidthOfString) doc.widthOfString = (value: unknown, ...args: any[]) => originalWidthOfString(normalizePdfText(value), ...args);
  const originalHeightOfString = typeof doc.heightOfString === 'function' ? doc.heightOfString.bind(doc) : null;
  if (originalHeightOfString) doc.heightOfString = (value: unknown, ...args: any[]) => originalHeightOfString(normalizePdfText(value), ...args);

  doc.__podcorePdfPrepared = true;
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
  typography: { ...DEFAULT_TYPOGRAPHY },
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
    // Sponsor-Angebot – v2.12.13
    showOfferIntro: true,
    showOfferOutro: true,
    showOfferNotes: true,
    showOfferOptions: true,
    showSponsorAddress: true,
    showQuestionPoolNotes: true,
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
    // Sponsor-Angebot – v2.12.13
    showOfferIntro: true,
    showOfferOutro: true,
    showOfferNotes: false,
    showOfferOptions: true,
    showSponsorAddress: false,
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
    showOfferIntro: true, showOfferOutro: true, showOfferNotes: true, showOfferOptions: true, showSponsorAddress: true,
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
    showOfferIntro: true, showOfferOutro: true, showOfferNotes: false, showOfferOptions: true, showSponsorAddress: false,
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
    showOfferIntro: true, showOfferOutro: true, showOfferNotes: true, showOfferOptions: true, showSponsorAddress: true,
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
    showOfferIntro: true, showOfferOutro: true, showOfferNotes: true, showOfferOptions: true, showSponsorAddress: true,
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
    typography: normalizePdfTypography(JSON.parse(row.typography || '{}')),
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
      // Sponsor-Angebot Defaults
      showOfferIntro: true,
      showOfferOutro: true,
      showOfferNotes: true,
      showOfferOptions: true,
      showSponsorAddress: true,
      showQuestionPoolNotes: true,
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

  // Eigenes konfigurierbares Layout für die Fragenbibliothek
  const hasQuestionPool = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'question_pool' LIMIT 1");
  if (!hasQuestionPool) {
    const layout = {
      ...DEFAULT_LAYOUT,
      name: 'Fragenbibliothek Standard',
      description: 'Themenweise sortierter Fragenkatalog aus der Fragenbibliothek',
      exportType: 'question_pool',
      isDefault: true,
      isSystem: false,
      sections: { ...DEFAULT_LAYOUT.sections, showQuestionPoolNotes: true },
    };
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        layout.pageOrientation || 'portrait',
      ]);
  }
  // Standardlayout aus älteren Versionen nur dann umbenennen, wenn es nicht individuell angepasst wurde.
  db.run(`UPDATE pdf_layouts
          SET name = ?, description = ?, updated_at = datetime('now')
          WHERE export_type = 'question_pool' AND is_default = 1 AND name = ?`,
    ['Fragenbibliothek Standard', 'Themenweise sortierter Fragenkatalog aus der Fragenbibliothek', 'Fragen-Pool Standard']);

  // v2.14.7: Eigenes modernes Layout für die strategische Staffelplanung
  const hasSeasonPlanning = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'season_planning' LIMIT 1");
  if (!hasSeasonPlanning) {
    const layout = {
      ...DEFAULT_LAYOUT,
      name: 'Staffelplanung Modern',
      description: 'Übersichtliche Querformat-Vorlage für strategische Staffelplanung',
      exportType: 'season_planning' as PdfExportType,
      isDefault: true,
      isSystem: false,
      pageOrientation: 'landscape' as const,
      header: { ...DEFAULT_LAYOUT.header, style: 'sidebar' as const },
      colors: {
        ...DEFAULT_LAYOUT.colors,
        primary: '#18233f',
        secondary: '#2563eb',
        accent: '#0ea5a6',
        background: '#18233f',
      },
    };
    db.run(`INSERT INTO pdf_layouts (id, name, description, export_type, is_default, is_system, colors, typography, header_config, footer_config, sections, page_margin, page_size, page_orientation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), layout.name, layout.description, layout.exportType,
        layout.isDefault ? 1 : 0, layout.isSystem ? 1 : 0,
        JSON.stringify(layout.colors), JSON.stringify(layout.typography),
        JSON.stringify(layout.header), JSON.stringify(layout.footer),
        JSON.stringify(layout.sections), layout.pageMargin, layout.pageSize,
        layout.pageOrientation,
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

  // Sponsor-Angebot Standard-Layout
  const hasOffer = db.get("SELECT id FROM pdf_layouts WHERE export_type = 'sponsor_offer' AND is_system = 1") as any;
  if (!hasOffer) {
    const layout = {
      ...DEFAULT_LAYOUT,
      name: 'Sponsor-Angebot Standard',
      description: 'Angebots-PDF für Sponsoren mit Positionen, Preisen und Konditionen',
      exportType: 'sponsor_offer' as PdfExportType,
      isDefault: true,
      isSystem: true,
      colors: { primary: '#7c3aed', secondary: '#1e3a5f', accent: '#a855f7', text: '#111111', muted: '#6b7280', background: '#7c3aed', headerText: '#ffffff' },
      footer: { showPageNumbers: true, showDate: true, showPodcastName: true, customText: 'Angebot freibleibend – Preise zzgl. gesetzlicher MwSt.' },
      sections: { showOfferIntro: true, showOfferOutro: true, showOfferNotes: true, showOfferOptions: true, showSponsorAddress: true },
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
      JSON.stringify(normalizePdfTypography(data.typography || DEFAULT_LAYOUT.typography)),
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
      data.typography ? JSON.stringify(normalizePdfTypography(data.typography)) : null,
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
  preparePdfDocument(doc);
  const wm = layout.watermark;
  if (!wm || !wm.enabled || !wm.text) return;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const opacity = Math.min(1, Math.max(0, wm.opacity || 0.15));
  // Farbe mit Deckkraft simulieren (PDFKit unterstützt kein echtes opacity für Text direkt)
  doc.save();
  doc.opacity(opacity);
  doc.fontSize(60).font(`${layout.typography.fontFamily}-Bold`).fillColor(wm.color || '#888888');
  if (wm.position === 'diagonal') {
    doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
    doc.text(normalizePdfText(wm.text), 0, pageHeight / 2 - 30, { width: pageWidth, align: 'center' });
  } else if (wm.position === 'bottom-right') {
    doc.fontSize(30);
    doc.text(normalizePdfText(wm.text), pageWidth / 2, pageHeight - 80, { width: pageWidth / 2, align: 'right' });
  } else {
    // center
    doc.text(normalizePdfText(wm.text), 0, pageHeight / 2 - 30, { width: pageWidth, align: 'center' });
  }
  doc.restore();
}

export function renderPdfHeader(
  doc: any,
  layout: PdfLayout,
  opts: { podcastName: string; documentTitle: string; logoPath?: string | null }
): void {
  preparePdfDocument(doc);
  const { colors, typography, header, pageMargin } = layout;
  const podcastName = normalizePdfText(opts.podcastName);
  const documentTitle = normalizePdfText(opts.documentTitle);
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
        .text(podcastName, textX, 15, { width: textWidth, align: header.logoPosition === 'left' ? 'right' : 'left' });
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.headerText)
        .text(documentTitle, textX, 32, { width: textWidth, align: header.logoPosition === 'left' ? 'right' : 'left' });
    }

    doc.y = (layout.headerHeight || 70) + 15;
    doc.x = pageMargin;

  } else if (header.style === 'sidebar') {
    // Linker farbiger Streifen. Logo und Text werden bewusst in getrennten
    // Spalten platziert, damit lange Dokumenttitel das Logo nie überlagern.
    doc.rect(0, 0, 8, doc.page.height).fill(colors.secondary);
    const hasLogo = Boolean(header.showLogo && opts.logoPath);
    const logoWidth = 60;
    const logoHeight = 40;
    const gap = hasLogo ? 14 : 0;
    const textX = pageMargin + (hasLogo ? logoWidth + gap : 0);
    const textWidth = Math.max(120, pageWidth - textX - pageMargin);
    const podcastY = pageMargin + 2;
    const titleY = header.showPodcastName ? pageMargin + typography.smallSize + 7 : pageMargin + 2;
    let titleHeight = 0;

    if (hasLogo) {
      try { doc.image(opts.logoPath!, pageMargin, pageMargin, { fit: [logoWidth, logoHeight] }); } catch (_) {}
    }
    if (header.showPodcastName) {
      doc.fontSize(typography.smallSize).font(typography.fontFamily).fillColor(colors.muted)
        .text(podcastName, textX, podcastY, { width: textWidth, lineBreak: false, ellipsis: true });
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.primary);
      titleHeight = doc.heightOfString(documentTitle, { width: textWidth, lineGap: 1 });
      doc.text(documentTitle, textX, titleY, { width: textWidth, lineGap: 1 });
    }
    const dividerY = Math.max(
      hasLogo ? pageMargin + logoHeight : pageMargin,
      titleY + titleHeight
    ) + 13;
    doc.moveTo(pageMargin, dividerY).lineTo(pageWidth - pageMargin, dividerY).strokeColor(colors.accent).lineWidth(1).stroke();
    doc.x = pageMargin;
    doc.y = dividerY + 15;

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
        .text(podcastName, hasLogo ? pageMargin + 60 : pageMargin, pageMargin + 5, { align: 'left' });
    }
    if (header.showDocumentTitle) {
      doc.fontSize(typography.titleSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.primary)
        .text(documentTitle, hasLogo ? pageMargin + 60 : pageMargin, pageMargin + 18);
    }
    doc.moveDown(0.3);
    doc.moveTo(pageMargin, doc.y).lineTo(pageWidth - pageMargin, doc.y).strokeColor(colors.accent).lineWidth(0.5).stroke();
    doc.moveDown(0.5);
  }
}

export function renderPdfFooter(doc: any, layout: PdfLayout, opts: { podcastName: string; pageNum?: number }): void {
  preparePdfDocument(doc);
  const { colors, typography, footer, pageMargin } = layout;
  const pageWidth = doc.page.width;
  const footerY = doc.page.height - 30;

  const parts: string[] = [];
  if (footer.showPodcastName && opts.podcastName) parts.push(normalizePdfText(opts.podcastName));
  if (footer.customText) parts.push(normalizePdfText(footer.customText));
  if (footer.showDate) parts.push(new Date().toLocaleDateString('de-DE'));
  if (footer.showPageNumbers && opts.pageNum != null) parts.push(`Seite ${opts.pageNum}`);

  if (parts.length > 0) {
    // PDFKit erzwingt standardmäßig einen Seitenumbruch, wenn Text unterhalb
    // des Inhaltsbereichs liegt. Für echte Fußzeilen den unteren Rand nur
    // während des Zeichnens freigeben, damit keine leeren Zusatzseiten entstehen.
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(typography.smallSize).font(typography.fontFamily).fillColor(colors.muted)
      .text(parts.join('   ·   '), pageMargin, footerY, {
        width: pageWidth - pageMargin * 2,
        align: 'center',
        lineBreak: false,
      });
    doc.page.margins.bottom = originalBottomMargin;
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
  preparePdfDocument(doc);
  const { colors, typography, pageMargin } = layout;
  const safeTitle = normalizePdfText(title);
  const ls = getLineSpacingFactor(layout);
  const headingStyle = typography.headingStyle || 'accent';
  doc.moveDown(0.3 * ls);
  if (headingStyle === 'boxed') {
    const boxY = doc.y;
    const height = Math.max(22, typography.headingSize + 12);
    doc.roundedRect(pageMargin, boxY, doc.page.width - pageMargin * 2, height, 4).fillColor(colors.primary).fill();
    doc.fontSize(typography.headingSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.headerText)
      .text(safeTitle, pageMargin + 8, boxY + 6, { width: doc.page.width - pageMargin * 2 - 16 });
    doc.fillColor(colors.text);
    doc.y = boxY + height + 5 * ls;
    return;
  }
  const divStyle = headingStyle === 'minimal' ? 'none' : (layout.dividerStyle || 'line');
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
  doc.fontSize(typography.headingSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.secondary).text(safeTitle);
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
