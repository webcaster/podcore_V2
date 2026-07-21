import { Router, Response } from 'express';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import {
  getAllLayouts, getLayoutById, createLayout, updateLayout,
  deleteLayout, duplicateLayout, DEFAULT_LAYOUT,
  renderPdfHeader, renderPdfFooter, renderSectionHeading,
  preparePdfDocument, normalizePdfText,
  PdfLayout,
} from '../pdfLayouts';
import PDFDocument from 'pdfkit';
import { getDb } from '../database';

const router: import("express").Router = Router();
router.use(requireAuth as any);

// ─── Hilfsfunktion: Muster-PDF für Vorschau generieren ────────────────────────

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

    preparePdfDocument(doc);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { colors, typography, pageMargin } = layout;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - pageMargin * 2;

    // Logo-Pfad
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
      documentTitle: normalizePdfText(`Vorschau — ${layout.name || 'Layout'}`),
      logoPath,
    });

    const type = layout.exportType;

    if (type === 'sponsor_offer') {
      renderSectionHeading(doc, layout, 'Angebot für: Beispiel Sponsor');
      doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
        .text(normalizePdfText('Gültig bis: 31.12.2026'), { width: contentWidth });
      doc.moveDown();
      
      if (layout.sections.showOfferIntro) {
        doc.text('Vielen Dank für das freundliche Telefonat. Gerne unterbreiten wir Ihnen folgendes Angebot für eine Zusammenarbeit in unserem Podcast.', { align: 'justify' });
        doc.moveDown();
      }

      renderSectionHeading(doc, layout, 'Paket: Premium');
      const items = [
        ['Beschreibung', 'Menge', 'Einzel', 'Gesamt'],
        ['Pre-Roll Werbung (30s)', '4', '250.00 €', '1000.00 €'],
        ['Mid-Roll Sponsoring', '2', '450.00 €', '900.00 €'],
      ];
      
      let curY = doc.y;
      items.forEach((row, i) => {
        doc.fontSize(i === 0 ? typography.smallSize : typography.bodySize)
           .font(i === 0 ? `${typography.fontFamily}-Bold` : typography.fontFamily)
           .fillColor(i === 0 ? colors.headerText : colors.text);
        if (i === 0) {
          doc.rect(pageMargin, curY - 2, contentWidth, 15).fill(colors.primary);
          doc.fillColor(colors.headerText);
        }
        doc.text(row[0], pageMargin + 5, curY);
        doc.text(row[1], pageMargin + 250, curY, { width: 50, align: 'right' });
        doc.text(row[2], pageMargin + 310, curY, { width: 80, align: 'right' });
        doc.text(row[3], pageMargin + 400, curY, { width: 80, align: 'right' });
        curY += 18;
      });
      doc.y = curY + 10;
      doc.fontSize(typography.headingSize).font(`${typography.fontFamily}-Bold`).fillColor(colors.primary)
         .text('Gesamtpreis: 1.900,00 €', { align: 'right' });
      
    } else if (type === 'invoice' || type === 'confirmation') {
       renderSectionHeading(doc, layout, type === 'invoice' ? 'Abrechnung' : 'Buchungsbestätigung');
       doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
          .text(`Nummer: 2026-001
Datum: 01.01.2026`, { width: contentWidth });
       doc.moveDown();
               doc.text(normalizePdfText('Hiermit bestätigen wir die folgenden Werbebuchungen für den Zeitraum Q1/2026.'));

    } else {
      // Fallback: Episode Preview (wie bisher)
      renderSectionHeading(doc, layout, 'Beispiel-Inhalt');
      doc.fontSize(typography.bodySize).font(typography.fontFamily).fillColor(colors.text)
        .text(normalizePdfText('Dies ist eine Vorschau für den Export-Typ: ' + type), { width: contentWidth });
    }

    // Footer
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
