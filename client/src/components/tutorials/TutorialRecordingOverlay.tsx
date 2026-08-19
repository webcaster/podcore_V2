import React, { useCallback, useEffect, useState } from 'react';
import { Check, Crosshair, MousePointerClick, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { RecordedTutorialAction, useTutorialRecording } from '../../contexts/TutorialRecordingContext';

function getElementLabel(element: HTMLElement) {
  const explicit = element.getAttribute('aria-label') || element.getAttribute('title');
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
  return (explicit || text || element.dataset.tutorialId || 'Bedienelement').slice(0, 120);
}

export default function TutorialRecordingOverlay() {
  const { active, simulatedRole, onRecord, onCancel, endRecording } = useTutorialRecording();
  const location = useLocation();
  const [candidate, setCandidate] = useState<{ target: string; label: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [interaction, setInteraction] = useState<RecordedTutorialAction['interaction']>('click');
  const [notice, setNotice] = useState('Klicke auf ein markiertes Menü oder Bedienelement, um den nächsten Tutorialschritt aufzuzeichnen.');

  useEffect(() => {
    if (!active) return;
    setCandidate(null);
    setTitle('');
    setDescription('');
    setInteraction('click');
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
      setCandidate({ target, label });
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

  const confirm = useCallback(() => {
    if (!candidate || !onRecord) return;
    onRecord({
      target: candidate.target,
      route: `${location.pathname}${location.search}`,
      label: candidate.label,
      title: title.trim() || candidate.label,
      description: description.trim(),
      interaction,
    });
    endRecording();
  }, [candidate, description, endRecording, interaction, location.pathname, location.search, onRecord, title]);

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
          <button type="button" onClick={cancel} className="rounded-lg p-2 text-text-muted hover:bg-obsidian-700 hover:text-text-primary" aria-label="Aufzeichnung abbrechen"><X size={16} /></button>
        </div>

        {candidate && (
          <div className="mt-4 space-y-3 rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-3">
            <div className="flex items-center gap-2 text-sm text-text-primary"><MousePointerClick size={15} className="text-accent-purple" /><strong>Klickziel:</strong> {candidate.label}</div>
            <input value={title} onChange={event => setTitle(event.target.value)} className="form-input text-sm" placeholder="Titel des Schritts" />
            <textarea value={description} onChange={event => setDescription(event.target.value)} className="form-input text-sm" rows={3} placeholder="Was soll der Nutzer hier tun oder beachten?" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select value={interaction} onChange={event => setInteraction(event.target.value as RecordedTutorialAction['interaction'])} className="form-input w-auto text-sm">
                <option value="click">Klick auf Ziel abwarten</option>
                <option value="guide">Hinweis & weiter</option>
                <option value="confirm">Schritt bestätigen</option>
              </select>
              <button type="button" onClick={confirm} className="btn-primary flex items-center gap-2 text-sm"><Check size={15} /> Schritt übernehmen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
