import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(new URL('../client/package.json', import.meta.url));
const { jsPDF } = require('jspdf');

const COLORS = ['#7c3aed', '#2563eb', '#059669'];
const hexToRgb = (hex) => {
  const value = String(hex || '').replace('#', '');
  const normalized = /^[0-9a-f]{6}$/i.test(value) ? value : '303030';
  return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
};

const drawPdfAnnotations = (doc, annotations, imageX, imageY, imageWidth, imageHeight) => {
  annotations.forEach((annotation, index) => {
    const x = imageX + (Math.max(0, Math.min(100, Number(annotation.x) || 0)) / 100) * imageWidth;
    const y = imageY + (Math.max(0, Math.min(100, Number(annotation.y) || 0)) / 100) * imageHeight;
    const type = annotation.type || 'point';
    const [red, green, blue] = hexToRgb(annotation.color || COLORS[index % COLORS.length]);
    doc.setDrawColor(255, 255, 255);
    doc.setFillColor(red, green, blue);
    if (type === 'circle') {
      const diameter = Math.max(5, ((Number(annotation.size) || 10) / 100) * imageWidth);
      doc.setLineWidth(1.25); doc.circle(x, y, diameter / 2, 'S');
      doc.setDrawColor(red, green, blue); doc.setLineWidth(0.72); doc.circle(x, y, Math.max(1.7, diameter / 2 - 1.1), 'S');
    } else {
      const radius = Math.max(3, Math.min(6, imageWidth * 0.021));
      doc.setLineWidth(0.75); doc.circle(x, y, radius, 'FD');
      const label = String(type === 'symbol' ? (annotation.symbol || annotation.label || '•') : (annotation.label || index + 1)).slice(0, 2);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.max(5.4, radius * 1.7));
      doc.text(label, x, y + radius * 0.57, { align: 'center', baseline: 'middle' });
    }
  });
};

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
doc.setFillColor(30, 31, 47);
doc.rect(20, 43, 170, 96, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.text('Test-Screenshot: Tutorialmarkierungen', 28, 58);
doc.setTextColor(196, 197, 214);
doc.setFontSize(10);
doc.text('Punkt, Kreis und Zeichen werden direkt im PDF gerendert.', 28, 68);

drawPdfAnnotations(doc, [
  { id: 'point-1', type: 'point', x: 25, y: 48, label: '1', color: '#7c3aed' },
  { id: 'circle-1', type: 'circle', x: 57, y: 58, size: 18, color: '#2563eb' },
  { id: 'symbol-1', type: 'symbol', x: 82, y: 34, label: '!', symbol: '!', color: '#059669' },
], 20, 43, 170, 96);

doc.setTextColor(48, 48, 58);
doc.setFontSize(12);
doc.text('Validierung: Alle drei Markierungstypen müssen im dunklen Screenshotbereich sichtbar sein.', 20, 158);

const outputDir = resolve(process.cwd(), '../release-v2.16.34/validation');
await mkdir(outputDir, { recursive: true });
const outputPath = resolve(outputDir, 'tutorial-pdf-marker-smoketest.pdf');
await writeFile(outputPath, Buffer.from(doc.output('arraybuffer')));
console.log(outputPath);
