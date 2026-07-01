import { Router, Response } from 'express';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import {
  getAllLayouts, getLayoutById, createLayout, updateLayout,
  deleteLayout, duplicateLayout, DEFAULT_LAYOUT,
  renderPdfHeader, renderPdfFooter, renderSectionHeading,
  PdfLayout,
} from '../pdfLayouts';
import PDFDocument from 'pdfkit';
import { getDb } from '../database';

const router = Router();
router.use(requireAuth as any);

// ─── Hilfsfunktion: Muster-PDF für Vorschau generieren ────────────────────────
function generatePreviewPdf(layout: PdfLayout): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const settings = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
    const appSettings = settings ? JSON.parse(settings.value) : {};
    const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'Mein Podcast';

    const doc = new PDFDocument({
      size: layout.pageSize || 'A4',
      layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
      margin: layout.pageMargin || 50,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { colors, typography, pageMargin } = layout;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - pageMargin * 2;

    // ── Seite 1: Header + Episoden-Beispiel ──────────────────────────────────
    // Logo-Pfad aus Branding-Verzeichnis ermitteln
    const fs = require('fs');
    const path = require('path');
    const { DATA_DIR } = require('../database');
    let logoPath: string | null = null;
    const brandingDir = path.join(DATA_DIR, 'branding');
    if (fs.existsSync(brandingDir)) {
      const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
      if (lf) logoPath = path.join(brandingDir, lf);
    }

    renderPdfHeader(doc, layout, {
      podcastName,
      documentTitle: 'Vorschau — Layout-Beispiel',
      logoPath,
    });

    // Meta-Informationen
    if (layout.sections.showMeta) {
      renderSectionHeading(doc, layout, 'Meta-Informationen');
      const metaItems = [
        ['Episode', '#42 — Beispiel-Episode'],
        ['Status', 'Veröffentlicht'],
        ['Aufnahme', '15.01.2025'],
        ['Veröffentlichung', '20.01.2025'],
        ['Hosts', 'Max Müller, Sarah Schneider'],
        ['Gäste', 'Dr. Petra Hoffmann'],
        ['Tags', 'technologie, ki, gesellschaft'],
      ];
      for (const [label, value] of metaItems) {
        doc.fontSize(typography.bodySize).font(`${typography.fontFamily}-Bold`).fillColor(colors.secondary)
          .text(label + ':', pageMargin, doc.y, { continued: true, width: 120 });
        doc.font(typography.fontFamily).fillColor(colors.text)
          .text(' ' + value, { width: contentWidth - 120 });
      }
      doc.moveDown(0.5);
    }

    // Beschreibung
    if (layout.sections.showDescription) {
      renderSectionHeading(doc, layout, 'Beschreibung');
      doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
        .text(
          'In dieser Beispiel-Episode tauchen wir tief in das Thema Künstliche Intelligenz ein. ' +
          'Wir sprechen über Large Language Models, ihre Fähigkeiten und Grenzen, und was die KI-Revolution ' +
          'für unsere Gesellschaft bedeutet. Mit dabei: Dr. Petra Hoffmann, KI-Forscherin an der TU Berlin.',
          { width: contentWidth, align: 'justify' }
        );
      doc.moveDown(0.5);
    }

    // Script-Blöcke
    if (layout.sections.showBlocks) {
      renderSectionHeading(doc, layout, 'Script-Blöcke');
      const blocks = [
        { type: 'INTRO', title: 'Intro', duration: 30, text: 'Musik und Jingle — 30 Sekunden' },
        { type: 'WERBUNG', title: 'Pre-Roll Werbung', duration: 30, text: 'DataSafe VPN — Werbung 30 Sekunden' },
        { type: 'MODERATION', title: 'Begrüßung', duration: 180,
          text: 'Herzlich willkommen bei Deep Dive Digital! Heute sprechen wir über Künstliche Intelligenz — ' +
                'ein Thema, das 2024 alles dominiert hat. Ich bin Max Müller und mit mir ist heute Sarah Schneider.' },
        { type: 'INTERVIEW', title: 'Interview Dr. Hoffmann', duration: 1800,
          text: 'Interviewgespräch mit Dr. Petra Hoffmann, KI-Forscherin an der TU Berlin. ' +
                'Themen: Wie funktionieren LLMs? Was können sie wirklich? Gesellschaftliche Auswirkungen.' },
        { type: 'MODERATION', title: 'Zusammenfassung', duration: 300,
          text: 'Zusammenfassung der wichtigsten Punkte aus dem Interview. Ausblick auf nächste Episode.' },
        { type: 'OUTRO', title: 'Outro', duration: 30, text: 'Musik und Abspann — 30 Sekunden' },
      ];

      for (const block of blocks) {
        // Block-Header-Box
        const boxY = doc.y;
        doc.rect(pageMargin, boxY, contentWidth, 18)
          .fill(colors.background);
        doc.fontSize(typography.smallSize)
          .font(`${typography.fontFamily}-Bold`)
          .fillColor(colors.headerText)
          .text(
            `${block.type}  ·  ${block.title}  ·  ${Math.floor(block.duration / 60)}:${String(block.duration % 60).padStart(2, '0')} min`,
            pageMargin + 4, boxY + 4,
            { width: contentWidth - 8 }
          );
        doc.y = boxY + 22;
        doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
          .text(block.text, pageMargin + 8, doc.y, { width: contentWidth - 16 });
        doc.moveDown(0.4);
      }
      doc.moveDown(0.3);
    }

    // ── Seite 2: Notizen + Technische Daten ──────────────────────────────────
    doc.addPage();
    renderPdfHeader(doc, layout, {
      podcastName,
      documentTitle: 'Vorschau — Seite 2',
    });

    if (layout.sections.showTechnicalData) {
      renderSectionHeading(doc, layout, 'Technische Daten');
      const techItems = [
        ['Mikrofon', 'Rode NT1'],
        ['Interface', 'Zoom H6'],
        ['DAW', 'Adobe Audition'],
        ['Format', 'MP3 · 192 kbps · 44.1 kHz · Stereo'],
        ['Aufnahmeort', 'Heimstudio Berlin'],
        ['Schnitt', 'Lena Braun'],
      ];
      for (const [label, value] of techItems) {
        doc.fontSize(typography.bodySize).font(`${typography.fontFamily}-Bold`).fillColor(colors.secondary)
          .text(label + ':', pageMargin, doc.y, { continued: true, width: 120 });
        doc.font(typography.fontFamily).fillColor(colors.text)
          .text(' ' + value, { width: contentWidth - 120 });
      }
      doc.moveDown(0.5);
    }

    if (layout.sections.showNotes) {
      renderSectionHeading(doc, layout, 'Interne Notizen');
      doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
        .text(
          'Sehr gute Episode. Dr. Hoffmann war ein toller Gast. ' +
          'Ton war durchgehend sauber, kein Nachbearbeitung nötig. ' +
          'Minute 28:00 — kurze Pause einfügen (Themenübergang). ' +
          'Intro und Outro aus der Media Library übernehmen.',
          { width: contentWidth }
        );
      doc.moveDown(0.5);
    }

    if (layout.sections.showSponsors) {
      renderSectionHeading(doc, layout, 'Sponsoren');
      doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
        .text('DataSafe VPN — Pre-Roll · 30s · Bestätigt', { width: contentWidth });
      doc.moveDown(0.2);
      doc.text('TechCloud Solutions — Mid-Roll · 60s · Bestätigt', { width: contentWidth });
      doc.moveDown(0.5);
    }

    // Footer auf allen Seiten
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      renderPdfFooter(doc, layout, { podcastName, pageNum: i + 1 });
    }

    doc.end();
  });
}

// GET /api/pdf-layouts — alle Layouts auflisten
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const layouts = getAllLayouts();
    return res.json({ success: true, data: layouts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pdf-layouts/defaults — Standard-Layout-Vorlage zurückgeben
router.get('/defaults', (req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: DEFAULT_LAYOUT });
});

// GET /api/pdf-layouts/:id — einzelnes Layout
router.get('/:id', (req: AuthRequest, res: Response) => {
  const layout = getLayoutById(req.params.id);
  if (!layout) return res.status(404).json({ success: false, error: 'Layout nicht gefunden' });
  return res.json({ success: true, data: layout });
});

// POST /api/pdf-layouts — neues Layout erstellen
router.post('/', requirePermission('canManagePdfLayouts') as any, (req: AuthRequest, res: Response) => {
  try {
    const layout = createLayout(req.body);
    return res.status(201).json({ success: true, data: layout });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/pdf-layouts/:id/duplicate — Layout duplizieren
router.post('/:id/duplicate', requirePermission('canManagePdfLayouts') as any, (req: AuthRequest, res: Response) => {
  try {
    const layout = duplicateLayout(req.params.id, req.body.name);
    return res.status(201).json({ success: true, data: layout });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/pdf-layouts/:id — Layout aktualisieren
router.put('/:id', requirePermission('canManagePdfLayouts') as any, (req: AuthRequest, res: Response) => {
  try {
    const layout = updateLayout(req.params.id, req.body);
    if (!layout) return res.status(404).json({ success: false, error: 'Layout nicht gefunden' });
    return res.json({ success: true, data: layout });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/pdf-layouts/:id — Layout löschen
router.delete('/:id', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  try {
    deleteLayout(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/pdf-layouts/:id/preview — Muster-PDF für Vorschau generieren
router.get('/:id/preview', async (req: AuthRequest, res: Response) => {
  try {
    const layout = getLayoutById(req.params.id);
    if (!layout) return res.status(404).json({ success: false, error: 'Layout nicht gefunden' });
    const pdfBuffer = await generatePreviewPdf(layout);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview-${layout.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pdf-layouts/preview-live — Vorschau mit ungespeicherten Daten
router.post('/preview-live', async (req: AuthRequest, res: Response) => {
  try {
    // Temporäres Layout aus dem Request-Body bauen
    const layoutData = req.body as Partial<PdfLayout>;
    const base = layoutData.id ? (getLayoutById(layoutData.id) || {}) : {};
    const tempLayout: PdfLayout = {
      ...DEFAULT_LAYOUT,
      ...base,
      ...layoutData,
      id: layoutData.id || 'preview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PdfLayout;
    const pdfBuffer = await generatePreviewPdf(tempLayout);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview-live.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
