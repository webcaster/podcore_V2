import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Plus, Trash2, Check, X, Move, Download, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

interface AnnotationPoint {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  number: number;
  label: string;
}

interface ScreenshotAnnotatorProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  existingImage?: string;
}

export default function ScreenshotAnnotator({ onCapture, onClose, existingImage }: ScreenshotAnnotatorProps) {
  const [mode, setMode] = useState<'capture' | 'annotate'>(existingImage ? 'annotate' : 'capture');
  const [screenshot, setScreenshot] = useState<string | null>(existingImage || null);
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelText, setLabelText] = useState('');
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Capture the main content area
  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Try to capture the main content area
      const mainContent = document.querySelector('[data-tutorial-id="main-content"]') as HTMLElement
        || document.querySelector('main') as HTMLElement
        || document.body;

      const canvas = await html2canvas(mainContent, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        backgroundColor: '#1a1a2e',
        ignoreElements: (el) => {
          // Ignore tutorial overlay and screenshot tool itself
          return el.classList.contains('tutorial-overlay') || el.id === 'screenshot-annotator-modal';
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      setAnnotations([]);
      setMode('annotate');
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Handle click on image to add annotation point
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingPoint || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPoint: AnnotationPoint = {
      id: Date.now().toString(),
      x,
      y,
      number: annotations.length + 1,
      label: '',
    };
    setAnnotations(prev => [...prev, newPoint]);
    setAddingPoint(false);
    setEditingLabel(newPoint.id);
    setLabelText('');
  }, [addingPoint, annotations.length]);

  // Drag annotation point
  const handlePointDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDragTarget(id);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragTarget || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setAnnotations(prev => prev.map(p => p.id === dragTarget ? { ...p, x, y } : p));
  }, [dragTarget]);

  const handleMouseUp = () => setDragTarget(null);

  // Save label
  const saveLabel = (id: string) => {
    setAnnotations(prev => prev.map(p => p.id === id ? { ...p, label: labelText } : p));
    setEditingLabel(null);
    setLabelText('');
  };

  // Delete annotation
  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // Renumber
      return filtered.map((p, i) => ({ ...p, number: i + 1 }));
    });
  };

  // Render final image with annotations baked in
  const renderFinalImage = useCallback(async (): Promise<string> => {
    if (!screenshot || !imageContainerRef.current) return screenshot || '';

    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();

    // Create canvas
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = screenshot;
    await new Promise(resolve => { img.onload = resolve; });

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw screenshot
    ctx.drawImage(img, 0, 0);

    // Draw annotation points
    annotations.forEach(point => {
      const px = (point.x / 100) * canvas.width;
      const py = (point.y / 100) * canvas.height;

      // Circle background
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#9333ea';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(point.number), px, py);

      // Label if present
      if (point.label) {
        const labelX = px + 24;
        const labelY = py;
        const padding = 6;
        ctx.font = '13px sans-serif';
        const textWidth = ctx.measureText(point.label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(labelX - padding, labelY - 12, textWidth + padding * 2, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.label, labelX, labelY);
      }
    });

    return canvas.toDataURL('image/png');
  }, [screenshot, annotations]);

  const handleConfirm = async () => {
    const finalImage = await renderFinalImage();
    onCapture(finalImage);
  };

  return (
    <div
      id="screenshot-annotator-modal"
      className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
    >
      <div className="bg-obsidian-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <Camera size={20} className="text-accent-purple" />
            <h2 className="text-lg font-bold text-text-primary">Screenshot-Tool</h2>
            {mode === 'annotate' && (
              <span className="text-xs text-text-muted bg-obsidian-900 px-2 py-1 rounded">
                Klicke auf „+" um Markierungspunkte zu setzen
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-obsidian-900 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b border-surface-border bg-obsidian-900/50">
          {mode === 'capture' ? (
            <button
              onClick={captureScreen}
              disabled={isCapturing}
              className="btn-primary flex items-center gap-2"
            >
              <Camera size={16} />
              {isCapturing ? 'Wird aufgenommen...' : 'Aktuellen Bereich aufnehmen'}
            </button>
          ) : (
            <>
              <button
                onClick={() => setAddingPoint(!addingPoint)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  addingPoint
                    ? 'bg-accent-purple text-white shadow-glow-purple'
                    : 'bg-obsidian-900 text-text-secondary hover:text-text-primary'
                }`}
              >
                <Plus size={16} />
                {addingPoint ? 'Klick auf Bild...' : 'Punkt hinzufügen'}
              </button>

              <button
                onClick={() => { setScreenshot(null); setAnnotations([]); setMode('capture'); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-obsidian-900 transition-colors"
              >
                <RotateCcw size={16} />
                Neu aufnehmen
              </button>

              <div className="flex-1" />

              <button
                onClick={handleConfirm}
                className="btn-primary flex items-center gap-2"
              >
                <Check size={16} />
                Übernehmen
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image area */}
          <div className="flex-1 overflow-auto p-4">
            {mode === 'capture' && !screenshot && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Camera size={48} className="text-text-muted mb-4" />
                <p className="text-text-secondary font-medium">Klicke auf „Aktuellen Bereich aufnehmen"</p>
                <p className="text-text-muted text-sm mt-1">Es wird der Hauptinhalt der aktuellen Seite aufgenommen</p>
              </div>
            )}

            {screenshot && (
              <div
                ref={imageContainerRef}
                className={`relative inline-block select-none ${addingPoint ? 'cursor-crosshair' : ''}`}
                style={{ maxWidth: '100%' }}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <img
                  src={screenshot}
                  alt="Screenshot"
                  className="block max-w-full rounded-lg border border-surface-border"
                  draggable={false}
                />

                {/* Annotation Points */}
                {annotations.map(point => (
                  <div
                    key={point.id}
                    style={{
                      position: 'absolute',
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10,
                    }}
                  >
                    {/* Point circle */}
                    <div
                      className="w-9 h-9 rounded-full bg-accent-purple border-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-move select-none"
                      onMouseDown={(e) => handlePointDragStart(e, point.id)}
                      title="Ziehen zum Verschieben"
                    >
                      {point.number}
                    </div>

                    {/* Label bubble */}
                    {editingLabel === point.id ? (
                      <div
                        className="absolute left-10 top-0 flex items-center gap-1 bg-obsidian-800 border border-surface-border rounded-lg shadow-xl p-1 z-20"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={labelText}
                          onChange={e => setLabelText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveLabel(point.id); if (e.key === 'Escape') { setEditingLabel(null); } }}
                          placeholder="Beschriftung..."
                          className="input text-xs w-40 py-1"
                        />
                        <button onClick={() => saveLabel(point.id)} className="p-1 text-green-400 hover:text-green-300">
                          <Check size={14} />
                        </button>
                        <button onClick={() => deleteAnnotation(point.id)} className="p-1 text-red-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : point.label ? (
                      <div
                        className="absolute left-10 top-1/2 -translate-y-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap cursor-pointer hover:bg-black/90"
                        onClick={e => { e.stopPropagation(); setEditingLabel(point.id); setLabelText(point.label); }}
                      >
                        {point.label}
                      </div>
                    ) : (
                      <div
                        className="absolute left-10 top-1/2 -translate-y-1/2 text-xs text-text-muted cursor-pointer hover:text-text-secondary"
                        onClick={e => { e.stopPropagation(); setEditingLabel(point.id); setLabelText(''); }}
                      >
                        + Beschriftung
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Annotations sidebar */}
          {mode === 'annotate' && annotations.length > 0 && (
            <div className="w-64 border-l border-surface-border p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Markierungspunkte</h3>
              <div className="space-y-2">
                {annotations.map(point => (
                  <div key={point.id} className="flex items-start gap-2 p-2 bg-obsidian-900 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {point.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingLabel === point.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={labelText}
                          onChange={e => setLabelText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveLabel(point.id); }}
                          className="input text-xs w-full py-1"
                          placeholder="Beschriftung..."
                        />
                      ) : (
                        <p
                          className="text-xs text-text-secondary cursor-pointer hover:text-text-primary truncate"
                          onClick={() => { setEditingLabel(point.id); setLabelText(point.label); }}
                        >
                          {point.label || <span className="text-text-muted italic">Keine Beschriftung</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteAnnotation(point.id)}
                      className="p-1 text-text-muted hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
