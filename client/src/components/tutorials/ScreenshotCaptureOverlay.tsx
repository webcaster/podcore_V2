/**
 * ScreenshotCaptureOverlay v2
 *
 * Verwendet html-to-image statt html2canvas für zuverlässigeres Rendering.
 * - Wartet 800ms nach Klick damit die Seite vollständig gerendert ist
 * - Blendet das Overlay selbst aus vor dem Capture
 * - Zeigt Fortschrittsanzeige während des Captures
 * - Annotationspunkte mit Beschreibungsfeldern
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Check, Plus, Trash2, ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { useScreenshotMode, AnnotationPoint } from '../../contexts/ScreenshotModeContext';
import { useNavigate } from 'react-router-dom';

const POINT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0d9488',
];

// `crypto.randomUUID()` ist in einigen Browsern über lokale IP-Adressen ohne
// HTTPS nicht verfügbar. Tutorials werden häufig genau so im Studio-Netzwerk
// erstellt; deshalb muss die Markierung auch ohne Secure Context funktionieren.
const createAnnotationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function ScreenshotCaptureOverlay() {
  const { active, simulatedRole, onCapture, onCancel, endScreenshotMode } = useScreenshotMode();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'ready' | 'capturing' | 'annotate'>('ready');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset when mode starts
  useEffect(() => {
    if (active) {
      setPhase('ready');
      setCapturedImage(null);
      setAnnotations([]);
      setActivePointId(null);
      setCaptureError(null);
    }
  }, [active]);

  const handleCapture = useCallback(async () => {
    setPhase('capturing');
    setCaptureError(null);

    try {
      // 1. Overlay ausblenden
      if (overlayRef.current) {
        overlayRef.current.style.visibility = 'hidden';
        overlayRef.current.style.pointerEvents = 'none';
      }

      // 2. Warten bis Seite vollständig gerendert (Animationen, Bilder, Fonts)
      await new Promise(r => setTimeout(r, 800));

      // 3. Alle Bilder vorladen
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.allSettled(images.map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      ));

      // 4. html-to-image lazy import
      const { toPng } = await import('html-to-image');

      // 5. Screenshot des sichtbaren Bereichs
      const dataUrl = await toPng(document.documentElement, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
        filter: (node: HTMLElement) => {
          // Overlay und Tutorial-Elemente ausblenden
          if (node.id === 'screenshot-capture-overlay') return false;
          if (node.id === 'tutorial-overlay-root') return false;
          if (node.getAttribute?.('data-screenshot-exclude') === 'true') return false;
          return true;
        },
      });

      // 6. Overlay wieder einblenden
      if (overlayRef.current) {
        overlayRef.current.style.visibility = '';
        overlayRef.current.style.pointerEvents = '';
      }

      setCapturedImage(dataUrl);
      setAnnotations([]);
      setPhase('annotate');
    } catch (err) {
      console.error('Screenshot failed:', err);
      setCaptureError('Screenshot fehlgeschlagen. Bitte erneut versuchen.');

      // Overlay wieder einblenden
      if (overlayRef.current) {
        overlayRef.current.style.visibility = '';
        overlayRef.current.style.pointerEvents = '';
      }
      setPhase('ready');
    }
  }, []);

  const handleImagePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'annotate' || !imgRef.current) return;
    // Die Annotationsfläche übernimmt Maus-, Touch- und Stifteingaben gleich.
    // Dadurch verhindert kein Browser-Drag oder Image-Handler mehr das Setzen.
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPoint: AnnotationPoint = {
      id: createAnnotationId(),
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
      label: String(annotations.length + 1),
      description: '',
    };
    setAnnotations(prev => [...prev, newPoint]);
    setActivePointId(newPoint.id);
  }, [phase, annotations.length]);

  const updateDescription = useCallback((id: string, description: string) => {
    setAnnotations(prev => prev.map(p => p.id === id ? { ...p, description } : p));
  }, []);

  const removePoint = useCallback((id: string) => {
    setAnnotations(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return filtered.map((p, i) => ({ ...p, label: String(i + 1) }));
    });
    setActivePointId(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!capturedImage || !onCapture) return;
    onCapture({ dataUrl: capturedImage, annotations });
    endScreenshotMode();
  }, [capturedImage, annotations, onCapture, endScreenshotMode]);

  const handleCancel = useCallback(() => {
    if (onCancel) onCancel();
    endScreenshotMode();
  }, [onCancel, endScreenshotMode]);

  const handleRetake = useCallback(() => {
    setPhase('ready');
    setCapturedImage(null);
    setAnnotations([]);
  }, []);

  if (!active) return null;

  return (
    <div id="screenshot-capture-overlay" ref={overlayRef}>
      {/* ── READY PHASE: floating bar ─────────────────────────────────────── */}
      {phase === 'ready' && (
        <div
          data-screenshot-exclude="true"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
                     bg-obsidian-900 border border-accent-purple/50 rounded-2xl px-5 py-3 shadow-2xl
                     shadow-accent-purple/20 backdrop-blur-sm"
        >
          {/* Role badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-purple/20 rounded-lg border border-accent-purple/30">
            <Eye size={14} className="text-accent-purple" />
            <span className="text-xs font-semibold text-accent-purple uppercase tracking-wide">
              Ansicht: {simulatedRole}
            </span>
          </div>

          <div className="w-px h-6 bg-obsidian-600" />

          {captureError && (
            <span className="text-xs text-red-400">{captureError}</span>
          )}

          <button
            onClick={handleCapture}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-accent-purple/80
                       text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Camera size={16} />
            Screenshot aufnehmen
          </button>

          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-2 bg-obsidian-700 hover:bg-obsidian-600
                       text-text-secondary hover:text-text-primary rounded-xl text-sm transition-all"
          >
            <ArrowLeft size={14} />
            Zurück
          </button>
        </div>
      )}

      {/* ── CAPTURING PHASE: loading indicator ───────────────────────────── */}
      {phase === 'capturing' && (
        <div
          data-screenshot-exclude="true"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
                     bg-obsidian-900 border border-accent-purple/50 rounded-2xl px-5 py-3 shadow-2xl"
          style={{ visibility: 'hidden' }}
        >
          {/* Invisible during capture — just a placeholder */}
          <Loader2 size={16} className="animate-spin text-accent-purple" />
          <span className="text-sm text-text-muted">Aufnahme läuft...</span>
        </div>
      )}

      {/* ── ANNOTATE PHASE: full-screen annotation editor ────────────────── */}
      {phase === 'annotate' && capturedImage && (
        <div
          data-screenshot-exclude="true"
          className="fixed inset-0 z-[9999] bg-obsidian-950/95 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-obsidian-700 bg-obsidian-900 shrink-0">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Camera size={18} className="text-accent-purple" />
                Screenshot annotieren
              </h2>
                  <p className="text-text-muted text-xs mt-0.5">
                    Klicke oder tippe auf das Bild, um nummerierte Punkte zu setzen · Beschreibe jeden Punkt rechts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-3 py-2 bg-obsidian-700 hover:bg-obsidian-600
                           text-text-secondary hover:text-text-primary rounded-xl text-sm transition-all"
              >
                <Camera size={14} /> Neu aufnehmen
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-accent-purple/80
                           text-white rounded-xl text-sm font-semibold transition-all"
              >
                <Check size={16} /> Übernehmen
              </button>
              <button
                onClick={handleCancel}
                className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-obsidian-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Screenshot with annotation points */}
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-obsidian-950">
              <div
                ref={imgRef}
                className="relative cursor-crosshair select-none max-w-full touch-none"
                onPointerDown={handleImagePointerDown}
                role="button"
                tabIndex={0}
                aria-label="Screenshot: Punkt für die Tutorial-Anleitung setzen"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const syntheticPoint: AnnotationPoint = {
                      id: createAnnotationId(), x: 50, y: 50,
                      label: String(annotations.length + 1), description: '',
                    };
                    if (rect.width && rect.height) {
                      setAnnotations(prev => [...prev, syntheticPoint]);
                      setActivePointId(syntheticPoint.id);
                    }
                  }
                }}
                style={{ display: 'inline-block', touchAction: 'none' }}
              >
                <img
                  src={capturedImage}
                  alt="Screenshot"
                  className="max-w-full rounded-lg shadow-2xl border border-obsidian-700 pointer-events-none"
                  draggable={false}
                />
                {/* Annotation points */}
                {annotations.map((pt, idx) => (
                  <button
                    key={pt.id}
                    onPointerDown={(e) => { e.stopPropagation(); setActivePointId(pt.id); }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full
                               flex items-center justify-center text-white text-xs font-bold
                               shadow-lg border-2 border-white/80 transition-transform hover:scale-110 z-10"
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      backgroundColor: POINT_COLORS[idx % POINT_COLORS.length],
                      outline: activePointId === pt.id ? '3px solid white' : 'none',
                      outlineOffset: '2px',
                    }}
                    title={`Punkt ${pt.label}: ${pt.description || 'Keine Beschreibung'}`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Annotations panel */}
            <div className="w-80 border-l border-obsidian-700 bg-obsidian-900 flex flex-col overflow-hidden shrink-0">
              <div className="px-4 py-3 border-b border-obsidian-700">
                <h3 className="text-sm font-semibold text-text-primary">
                  Punkte ({annotations.length})
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {annotations.length === 0
                    ? 'Klicke auf das Bild um Punkte zu setzen'
                    : 'Beschreibe jeden Punkt'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {annotations.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    <Plus size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Noch keine Punkte gesetzt</p>
                  </div>
                )}
                {annotations.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      activePointId === pt.id
                        ? 'border-accent-purple/60 bg-accent-purple/10'
                        : 'border-obsidian-700 bg-obsidian-800 hover:border-obsidian-500'
                    }`}
                    onClick={() => setActivePointId(pt.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: POINT_COLORS[idx % POINT_COLORS.length] }}
                        >
                          {pt.label}
                        </span>
                        <span className="text-xs font-medium text-text-primary">Punkt {pt.label}</span>
                      </div>
                      <button
                    onPointerDown={(e) => { e.stopPropagation(); removePoint(pt.id); }}
                        className="p-1 text-text-muted hover:text-red-400 transition-colors rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea
                      value={pt.description}
                      onChange={(e) => updateDescription(pt.id, e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      placeholder={`Beschreibung für Punkt ${pt.label}...`}
                      rows={3}
                      className="w-full bg-obsidian-700 border border-obsidian-600 rounded-lg px-3 py-2
                                 text-xs text-text-primary placeholder-text-muted resize-none
                                 focus:outline-none focus:border-accent-purple/50 transition-colors"
                    />
                  </div>
                ))}
              </div>

              {annotations.length > 0 && (
                <div className="px-4 py-3 border-t border-obsidian-700 bg-obsidian-950/50">
                  <p className="text-xs text-text-muted">
                    Im Beschreibungstext mit{' '}
                    <code className="bg-obsidian-700 px-1 rounded">[1]</code>,{' '}
                    <code className="bg-obsidian-700 px-1 rounded">[2]</code>{' '}
                    auf Punkte verweisen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
