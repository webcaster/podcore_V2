import React, { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Crosshair, ListChecks, MousePointerClick, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RecordedTutorialAction, useTutorialRecording } from '../../contexts/TutorialRecordingContext';

function getElementLabel(element: HTMLElement) {
  const explicit = element.getAttribute('aria-label') || element.getAttribute('title');
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
  return (explicit || text || element.dataset.tutorialId || 'Bedienelement').slice(0, 120);
}

export default function TutorialRecordingOverlay() {
  const { active, simulatedRole, onComplete, onCancel, endRecording } = useTutorialRecording();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<{ target: string; label: string; destination?: string } | null>(null);
  const [actions, setActions] = useState<RecordedTutorialAction[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [interaction, setInteraction] = useState<RecordedTutorialAction['interaction']>('click');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [notice, setNotice] = useState('Klicke auf ein markiertes Menü oder Bedienelement, um den nächsten Tutorialschritt aufzuzeichnen.');

  useEffect(() => {
    if (!active) return;
    setCandidate(null);
    setTitle('');
    setDescription('');
    setInteraction('click');
    setActions([]);
    setIncludeScreenshot(false);
    setNotice('Klicke auf ein markiertes Menü oder Bedienelement, um den nächsten Tutorialschritt aufzuzeichnen.');
  }, [active]);

  useEffect(() => {
    if (!active || candidate) return;
    const captureClick = (event: MouseEvent) => {
      const rawTarget = event.target as HTMLElement | null;
      const element = rawTarget?.closest?.('[data-tutorial-id]') as HTMLElement | null;
      if (!element || element.closest('#tutorial-recording-overlay')) {
        if (rawTarget && !rawTarget.closest?.('#tutorial-recording-overlay')) {
          setNotice('Dieses Element besitzt noch keine Tutorial-Kennung. Wähle ein Menü oder ein als Tutorialziel vorbereitetes Bedienelement.');
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const target = element.dataset.tutorialId || '';
      const label = getElementLabel(element);
      const anchor = element.closest('a[href]') as HTMLAnchorElement | null;
      const destination = anchor?.getAttribute('href') || undefined;
      setCandidate({ target, label, destination: destination?.startsWith('/') ? destination : undefined });
      setTitle(label);
      setNotice(`„${label}“ wurde als Klickziel erkannt. Ergänze nun den Hinweis für die Nutzer.`);
    };
    document.addEventListener('click', captureClick, true);
    return () => document.removeEventListener('click', captureClick, true);
  }, [active, candidate]);

  const cancel = useCallback(() => {
    onCancel?.();
    endRecording();
  }, [endRecording, onCancel]);

  const captureCurrentViewport = useCallback(async () => {
    const overlay = document.getElementById('tutorial-recording-overlay');
    const previousVisibility = overlay?.style.visibility || '';
    if (overlay) overlay.style.visibility = 'hidden';
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#12111e',
        scale: Math.min(window.devicePixelRatio || 1, 1.5),
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL('image/jpeg', 0.86);
    } finally {
      if (overlay) overlay.style.visibility = previousVisibility;
    }
  }, []);

  const addAction = useCallback(async () => {
    if (!candidate) return;
    setCapturingScreenshot(includeScreenshot);
    let image: string | undefined;
    try {
      if (includeScreenshot) image = await captureCurrentViewport();
    } catch {
      setNotice('Der Zwischenscreenshot konnte nicht erzeugt werden. Der Klickschritt wurde trotzdem übernommen.');
    } finally {
      setCapturingScreenshot(false);
    }
    const action: RecordedTutorialAction = {
      target: candidate.target,
      route: `${location.pathname}${location.search}`,
      label: candidate.label,
      title: title.trim() || candidate.label,
      description: description.trim(),
      interaction,
      image,
    };
    setActions(previous => [...previous, action]);
    setCandidate(null);
    setTitle('');
    setDescription('');
    setIncludeScreenshot(false);
    setInteraction('click');
    setNotice(`Schritt ${actions.length + 1} wurde übernommen. Führe jetzt die nächste Aktion aus oder schließe die Sequenz ab.`);
    if (candidate.destination && candidate.destination !== `${location.pathname}${location.search}`) {
      navigate(candidate.destination);
    }
  }, [actions.length, candidate, captureCurrentViewport, description, includeScreenshot, interaction, location.pathname, location.search, navigate, title]);

  const finish = useCallback(() => {
    if (!actions.length || !onComplete) return;
    onComplete(actions);
    endRecording();
  }, [actions, endRecording, onComplete]);

  if (!active) return null;

  return (
    <div id="tutorial-recording-overlay" className="fixed inset-0 z-[10020] pointer-events-none">
      <div className="pointer-events-auto fixed top-4 left-1/2 w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-accent-purple/50 bg-obsidian-900/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl border border-accent-purple/40 bg-accent-purple/15 text-accent-purple"><Crosshair size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Tutorialschritt aufzeichnen</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">Ansicht: {simulatedRole || 'Rolle'} · {notice}</p>
          </div>
          <div className="flex items-center gap-1">
            {actions.length > 0 && <button type="button" onClick={finish} className="btn-primary flex items-center gap-1 px-3 py-2 text-xs"><ListChecks size={14} /> Sequenz fertig ({actions.length})</button>}
            <button type="button" onClick={cancel} className="rounded-lg p-2 text-text-muted hover:bg-obsidian-700 hover:text-text-primary" aria-label="Aufzeichnung abbrechen"><X size={16} /></button>
          </div>
        </div>

        {candidate && (
          <div className="mt-4 space-y-3 rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-3">
            <div className="flex items-center gap-2 text-sm text-text-primary"><MousePointerClick size={15} className="text-accent-purple" /><strong>Klickziel:</strong> {candidate.label}</div>
            <input value={title} onChange={event => setTitle(event.target.value)} className="form-input text-sm" placeholder="Titel des Schritts" />
            <textarea value={description} onChange={event => setDescription(event.target.value)} className="form-input text-sm" rows={3} placeholder="Was soll der Nutzer hier tun oder beachten?" />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
              <input type="checkbox" checked={includeScreenshot} onChange={event => setIncludeScreenshot(event.target.checked)} />
              <Camera size={14} className="text-accent-purple" /> Zwischenbild dieses Schritts aufnehmen
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select value={interaction} onChange={event => setInteraction(event.target.value as RecordedTutorialAction['interaction'])} className="form-input w-auto text-sm">
                <option value="click">Klick auf Ziel abwarten</option>
                <option value="guide">Hinweis & weiter</option>
                <option value="confirm">Schritt bestätigen</option>
              </select>
              <button type="button" disabled={capturingScreenshot} onClick={addAction} className="btn-primary flex items-center gap-2 text-sm"><Check size={15} /> {capturingScreenshot ? 'Zwischenbild wird erstellt…' : 'Zur Sequenz hinzufügen'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
