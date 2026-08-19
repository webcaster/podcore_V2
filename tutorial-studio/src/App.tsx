import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CheckCircle2, ChevronLeft,
  ChevronRight, CirclePlus, Download, Eye, FileJson2, ImagePlus, Monitor,
  FolderOpen, MousePointer2, PanelLeftClose, PanelLeftOpen, Plus, Save, Trash2, Upload, Users, X,
} from 'lucide-react';
import { annotationColors, AnnotationPoint, createProject, createStep, makeId, TutorialProject, TutorialStep } from './types';
import ProjectLibraryDialog from './ProjectLibraryDialog';
import { cloneProject, loadLibrary, normalizeProject, persistLibrary } from './library';

function nowProject(project: TutorialProject): TutorialProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

function downloadJson(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return (value || 'tutorial').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'tutorial';
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Screenshot konnte nicht geladen werden.'));
    image.src = source;
  });
}

async function bakeAnnotations(source: string, annotations: AnnotationPoint[]) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const radius = Math.max(18, Math.round(Math.max(canvas.width, canvas.height) * 0.018));
  for (const annotation of annotations) {
    const x = (annotation.x / 100) * canvas.width;
    const y = (annotation.y / 100) * canvas.height;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = annotation.color || '#16767a';
    context.fill();
    context.lineWidth = Math.max(3, Math.round(radius * 0.18));
    context.strokeStyle = '#ffffff';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = `800 ${Math.max(16, Math.round(radius * 1.12))}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(annotation.label, x, y + 1);
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function App() {
  const [library, setLibrary] = useState(loadLibrary);
  const project = library.projects.find((candidate) => candidate.id === library.activeProjectId) || library.projects[0] || createProject();
  const [selectedStepId, setSelectedStepId] = useState(project.steps[0]?.id || '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState('Bereit für dein nächstes Tutorial.');
  const [isDirty, setDirty] = useState(false);
  const [screenSources, setScreenSources] = useState<Array<{ id: string; name: string; thumbnail: string; displayId: string }>>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfLogoInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const selectedIndex = Math.max(0, project.steps.findIndex((step) => step.id === selectedStepId));
  const selectedStep = project.steps[selectedIndex] || project.steps[0];

  const progress = useMemo(() => {
    if (!project.steps.length) return 0;
    const complete = project.steps.filter((step) => step.title.trim() && step.description.trim() && step.image).length;
    return Math.round((complete / project.steps.length) * 100);
  }, [project.steps]);

  function commit(next: TutorialProject, message?: string) {
    const normalized = nowProject(next);
    const nextLibrary = { ...library, activeProjectId: normalized.id, projects: library.projects.map((candidate) => candidate.id === normalized.id ? normalized : candidate) };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    setDirty(true);
    if (message) setNotice(message);
  }

  function openProject(id: string) {
    const nextLibrary = { ...library, activeProjectId: id };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    const nextProject = nextLibrary.projects.find((candidate) => candidate.id === id);
    setSelectedStepId(nextProject?.steps[0]?.id || '');
    setDirty(false);
    setShowLibrary(false);
    setNotice(`Projekt „${nextProject?.title || 'Unbenannt'}“ geöffnet.`);
  }

  function createNewProject() {
    const nextProject = createProject();
    const nextLibrary = { ...library, activeProjectId: nextProject.id, projects: [...library.projects, nextProject] };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    setSelectedStepId(nextProject.steps[0]?.id || '');
    setDirty(false);
    setShowLibrary(false);
    setNotice('Neues lokales Tutorial-Projekt angelegt.');
  }

  function duplicateProjectInLibrary(id: string) {
    const source = library.projects.find((candidate) => candidate.id === id);
    if (!source) return;
    const copy = cloneProject(source);
    const nextLibrary = { ...library, activeProjectId: copy.id, projects: [...library.projects, copy] };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    setSelectedStepId(copy.steps[0]?.id || '');
    setShowLibrary(false);
    setNotice('Projekt dupliziert und geöffnet.');
  }

  function archiveProject(id: string) {
    const activeProjects = library.projects.filter((candidate) => !candidate.archived && candidate.id !== id);
    if (!activeProjects.length) { setNotice('Mindestens ein aktives Projekt muss erhalten bleiben.'); return; }
    const now = new Date().toISOString();
    const projects = library.projects.map((candidate) => candidate.id === id ? { ...candidate, archived: true, archivedAt: now, updatedAt: now } : candidate);
    const activeProjectId = id === library.activeProjectId ? activeProjects[0].id : library.activeProjectId;
    const nextLibrary = { ...library, activeProjectId, projects };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    if (id === library.activeProjectId) setSelectedStepId(projects.find((candidate) => candidate.id === activeProjectId)?.steps[0]?.id || '');
    setNotice('Projekt wurde lokal archiviert und kann jederzeit wiederhergestellt werden.');
  }

  function restoreProject(id: string) {
    const projects = library.projects.map((candidate) => candidate.id === id ? { ...candidate, archived: false, archivedAt: undefined, updatedAt: new Date().toISOString() } : candidate);
    const nextLibrary = { ...library, projects };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    setShowArchived(false);
    setNotice('Projekt wurde wiederhergestellt.');
  }

  function updateProject<K extends keyof TutorialProject>(key: K, value: TutorialProject[K]) {
    commit({ ...project, [key]: value });
  }

  function updateStep(id: string, patch: Partial<TutorialStep>) {
    commit({ ...project, steps: project.steps.map((step) => step.id === id ? { ...step, ...patch } : step) });
  }

  function updatePdfLayout(patch: Partial<TutorialProject['pdfLayout']>) {
    commit({ ...project, pdfLayout: { ...project.pdfLayout, ...patch } });
  }

  function addStep() {
    const step = createStep();
    commit({ ...project, steps: [...project.steps, step] }, 'Neuer Schritt angelegt.');
    setSelectedStepId(step.id);
  }

  function duplicateStep(id: string) {
    const index = project.steps.findIndex((step) => step.id === id);
    const source = project.steps[index];
    if (!source) return;
    const copy: TutorialStep = {
      ...source,
      id: makeId('step'),
      title: source.title ? `${source.title} (Kopie)` : 'Schritt (Kopie)',
      annotations: source.annotations.map((annotation) => ({ ...annotation, id: makeId('mark') })),
    };
    const steps = [...project.steps];
    steps.splice(index + 1, 0, copy);
    commit({ ...project, steps }, 'Schritt dupliziert.');
    setSelectedStepId(copy.id);
  }

  function removeStep(id: string) {
    if (project.steps.length === 1) {
      setNotice('Ein Tutorial benötigt mindestens einen Schritt.');
      return;
    }
    const index = project.steps.findIndex((step) => step.id === id);
    const steps = project.steps.filter((step) => step.id !== id);
    commit({ ...project, steps }, 'Schritt entfernt.');
    setSelectedStepId(steps[Math.max(0, index - 1)]?.id || '');
  }

  function moveStep(id: string, direction: -1 | 1) {
    const index = project.steps.findIndex((step) => step.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= project.steps.length) return;
    const steps = [...project.steps];
    [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
    commit({ ...project, steps }, 'Schrittreihenfolge aktualisiert.');
  }

  async function saveProject() {
    const content = JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
    const filename = `${safeFileName(project.title)}.tutorial.json`;
    if (window.tutorialStudio) {
      const result = await window.tutorialStudio.saveJson({ defaultPath: filename, content });
      setNotice(result ? `Projekt gespeichert: ${result}` : 'Speichern abgebrochen.');
    } else {
      downloadJson(filename, content);
      setNotice('Projekt als JSON exportiert.');
    }
    setDirty(false);
  }

  async function exportForPodCore() {
    const payload = [{
      id: project.id,
      roles: project.audience.length ? project.audience : ['Endnutzer'],
      role: project.audience[0] || 'Endnutzer',
      title: project.title,
      description: project.description,
      enabled: project.enabled,
      createdAt: project.createdAt,
      updatedAt: new Date().toISOString(),
      steps: project.steps.map(({ id, title, description, target, position, image, annotations, allowSkip }) => ({
        id, title, description, target, position, image, annotations, allowSkip,
      })),
    }];
    const content = JSON.stringify(payload, null, 2);
    const filename = `${safeFileName(project.title)}.podcore-tutorial.json`;
    if (window.tutorialStudio) {
      const result = await window.tutorialStudio.saveJson({ defaultPath: filename, content });
      setNotice(result ? 'PodCore-kompatiblen Tutorial-Export gespeichert.' : 'PodCore-Export abgebrochen.');
    } else {
      downloadJson(filename, content);
      setNotice('PodCore-kompatiblen Tutorial-Export erstellt.');
    }
  }

  async function exportPdf() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const layout = project.pdfLayout || normalizeProject(project).pdfLayout;
      const documentTitle = layout.documentTitle.trim() || project.title || 'Unbenanntes Tutorial';
      const documentSubtitle = layout.documentSubtitle.trim() || project.description;
      const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const width = 210;
      const margin = 16;
      const contentWidth = width - margin * 2;
      let y = margin;
      const nextPage = () => { document.addPage(); y = margin; };
      const ensureSpace = (height: number) => { if (y + height > 278) nextPage(); };
      const write = (text: string, size: number, color: [number, number, number], weight: 'normal' | 'bold' = 'normal', indent = 0, maxWidth = contentWidth - indent) => {
        document.setFont('helvetica', weight);
        document.setFontSize(size);
        document.setTextColor(...color);
        const lines = document.splitTextToSize(text || '—', maxWidth);
        ensureSpace(Math.max(6, lines.length * (size * 0.44)) + 2);
        document.text(lines, margin + indent, y);
        y += Math.max(6, lines.length * (size * 0.44)) + 2;
      };

      document.setProperties({ title: documentTitle, subject: 'Tutorial Studio Endnutzer-Handbuch', author: project.createdBy || 'Tutorial Studio' });
      document.setFillColor(12, 20, 32);
      document.rect(0, 0, width, 54, 'F');
      document.setTextColor(74, 205, 198);
      document.setFont('helvetica', 'bold');
      document.setFontSize(10);
      document.text('TUTORIAL STUDIO · ENDNUTZER-HANDBUCH', margin, 18);
      if (layout.logo) {
        try {
          const logoFormat = layout.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          document.addImage(layout.logo, logoFormat, width - margin - 29, 10, 29, 29);
        } catch { /* A broken logo must not prevent the manual from exporting. */ }
      }
      document.setTextColor(255, 255, 255);
      document.setFontSize(23);
      const titleLines = document.splitTextToSize(documentTitle, contentWidth - (layout.logo ? 36 : 0));
      document.text(titleLines, margin, 31);
      y = 64;
      if (documentSubtitle) write(documentSubtitle, 11, [66, 83, 98]);
      write(`Zielanwendung: ${project.applicationName || 'Nicht angegeben'}`, 9, [69, 106, 109], 'bold');
      write(`Zielgruppe: ${(project.audience || []).join(', ') || 'Endnutzer'}`, 9, [69, 106, 109], 'bold');
      write(`Stand: ${new Date(project.updatedAt || Date.now()).toLocaleDateString('de-DE')}`, 9, [112, 132, 145]);
      y += 5;
      document.setDrawColor(40, 140, 137);
      document.line(margin, y, width - margin, y);
      y += 9;

      for (let index = 0; index < project.steps.length; index += 1) {
        const step = project.steps[index];
        ensureSpace(24);
        document.setFillColor(231, 247, 245);
        document.roundedRect(margin, y - 4, contentWidth, 18, 2, 2, 'F');
        document.setFont('helvetica', 'bold');
        document.setFontSize(11);
        document.setTextColor(15, 92, 96);
        document.text(`SCHRITT ${String(index + 1).padStart(2, '0')}`, margin + 5, y + 3);
        document.setFontSize(15);
        document.setTextColor(18, 38, 54);
        const stepTitle = document.splitTextToSize(step.title || `Schritt ${index + 1}`, contentWidth - 10);
        document.text(stepTitle, margin + 5, y + 9);
        y += 20 + Math.max(0, stepTitle.length - 1) * 6;
        write(step.description || 'Für diesen Schritt ist noch keine Erklärung hinterlegt.', 10, [47, 65, 80]);
        if (step.target || step.route) write(`Kontext: ${step.route || '—'}${step.target ? ` · Ziel: ${step.target}` : ''}`, 8.5, [104, 123, 136]);

        if (step.image) {
          try {
            const markedScreenshot = await bakeAnnotations(step.image, step.annotations || []);
            const screenshotImage = await loadImage(markedScreenshot);
            const ratio = (screenshotImage.naturalHeight || screenshotImage.height) / (screenshotImage.naturalWidth || screenshotImage.width);
            const imageHeight = Math.min(110, Math.max(42, contentWidth * ratio));
            ensureSpace(imageHeight + 8);
            document.addImage(markedScreenshot, 'JPEG', margin, y, contentWidth, imageHeight, undefined, 'FAST');
            y += imageHeight + 5;
          } catch {
            write('Der zugehörige Screenshot konnte nicht in das PDF übernommen werden.', 8.5, [171, 68, 75]);
          }
        }
        if (step.annotations?.length) {
          write('Markierungen', 9, [15, 92, 96], 'bold');
          for (const annotation of step.annotations) {
            ensureSpace(8);
            document.setFillColor(22, 118, 122);
            document.circle(margin + 3.2, y - 1.7, 3.2, 'F');
            document.setTextColor(255, 255, 255);
            document.setFont('helvetica', 'bold');
            document.setFontSize(7);
            document.text(annotation.label, margin + 3.2, y - 0.3, { align: 'center' });
            write(annotation.description || `Erläuterung zu Markierung ${annotation.label}`, 8.8, [47, 65, 80], 'normal', 9, contentWidth - 9);
          }
        }
        y += 7;
      }

      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setDrawColor(216, 226, 232);
        document.line(margin, 288, width - margin, 288);
        document.setFont('helvetica', 'normal');
        document.setFontSize(7.5);
        document.setTextColor(112, 132, 145);
        document.text(layout.footerText || 'Erstellt mit Tutorial Studio · Eine Idee von Maximilian Hartwich – Medien der Sinne', margin, 293);
        document.text(`Seite ${page} von ${pageCount}`, width - margin, 293, { align: 'right' });
      }
      const fileName = `${safeFileName(layout.fileName || project.pdfFileName || documentTitle)}.pdf`;
      document.save(fileName);
      setNotice(`PDF-Handbuch „${fileName}“ wurde erstellt.`);
    } catch (error) {
      setNotice(error instanceof Error ? `PDF-Export fehlgeschlagen: ${error.message}` : 'PDF-Export fehlgeschlagen.');
    } finally {
      setIsExportingPdf(false);
    }
  }

  function addImportedProject(value: Partial<TutorialProject>) {
    const now = new Date().toISOString();
    const imported = normalizeProject({ ...value, id: makeId('tutorial'), archived: false, archivedAt: undefined, createdAt: now, updatedAt: now });
    const nextLibrary = { ...library, activeProjectId: imported.id, projects: [...library.projects, imported] };
    setLibrary(nextLibrary);
    persistLibrary(nextLibrary);
    setSelectedStepId(imported.steps[0]?.id || '');
    setDirty(false);
    setShowLibrary(false);
    setNotice(`Projekt „${imported.title || 'Unbenannt'}“ importiert.`);
  }

  async function importProject() {
    try {
      let content: string | null = null;
      if (window.tutorialStudio) {
        content = await window.tutorialStudio.openJson();
      } else {
        projectInputRef.current?.click();
        return;
      }
      if (!content) return;
      const parsed = JSON.parse(content) as TutorialProject;
      if (!Array.isArray(parsed.steps) || !parsed.title) throw new Error('Ungültiges Tutorial-Projekt');
      addImportedProject(parsed);
    } catch (error) {
      setNotice(error instanceof Error ? `Import fehlgeschlagen: ${error.message}` : 'Import fehlgeschlagen.');
    }
  }

  function handleProjectUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TutorialProject;
        if (!Array.isArray(parsed.steps) || !parsed.title) throw new Error('Ungültiges Tutorial-Projekt');
        addImportedProject(parsed);
      } catch (error) {
        setNotice(error instanceof Error ? `Import fehlgeschlagen: ${error.message}` : 'Import fehlgeschlagen.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function chooseImage() {
    if (window.tutorialStudio) {
      const selected = await window.tutorialStudio.openImage();
      if (selected && selectedStep) updateStep(selectedStep.id, { image: selected.dataUrl, annotations: [] });
      return;
    }
    imageInputRef.current?.click();
  }

  async function choosePdfLogo() {
    if (window.tutorialStudio) {
      const selected = await window.tutorialStudio.openImage();
      if (selected) updatePdfLayout({ logo: selected.dataUrl });
      return;
    }
    pdfLogoInputRef.current?.click();
  }

  function handlePdfLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePdfLayout({ logo: String(reader.result) });
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedStep) return;
    const reader = new FileReader();
    reader.onload = () => updateStep(selectedStep.id, { image: String(reader.result), annotations: [] });
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function startCapture() {
    if (!window.tutorialStudio) {
      setNotice('Für die native Bildschirmaufnahme starte Tutorial Studio als Desktop-App. Im Browser kannst du Screenshots importieren.');
      return;
    }
    try {
      const sources = await window.tutorialStudio.listScreens();
      setScreenSources(sources);
      setShowCapture(true);
    } catch {
      setNotice('Bildschirmquellen konnten nicht gelesen werden. Prüfe unter macOS die Berechtigung für Bildschirmaufnahmen.');
    }
  }

  function acceptCapture(source: { thumbnail: string; name: string }) {
    if (!selectedStep) return;
    updateStep(selectedStep.id, { image: source.thumbnail, annotations: [] });
    setShowCapture(false);
    setNotice(`Ansicht „${source.name}“ als Screenshot übernommen.`);
  }

  function addAnnotation(event: React.MouseEvent<HTMLDivElement>) {
    if (!selectedStep?.image) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    const label = String(selectedStep.annotations.length + 1);
    const annotation: AnnotationPoint = {
      id: makeId('mark'), x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), label,
      description: `Erklärung zu Markierung ${label}`, color: annotationColors[selectedStep.annotations.length % annotationColors.length],
    };
    updateStep(selectedStep.id, { annotations: [...selectedStep.annotations, annotation] });
    setNotice(`Markierung ${label} hinzugefügt. Ergänze nun die Erklärung.`);
  }

  function updateAnnotation(id: string, patch: Partial<AnnotationPoint>) {
    if (!selectedStep) return;
    updateStep(selectedStep.id, { annotations: selectedStep.annotations.map((annotation) => annotation.id === id ? { ...annotation, ...patch } : annotation) });
  }

  function removeAnnotation(id: string) {
    if (!selectedStep) return;
    updateStep(selectedStep.id, { annotations: selectedStep.annotations.filter((annotation) => annotation.id !== id) });
  }

  function openPreview(index = selectedIndex) {
    setPreviewIndex(Math.max(0, Math.min(index, project.steps.length - 1)));
    setPreviewOpen(true);
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><img src="./brand/tutorial-studio-mark.png" alt="Tutorial Studio Bildmarke" /></div><div><strong>Tutorial Studio</strong><span>Desktop · Web · Software</span></div></div>
        <div className="topbar-center"><span className={isDirty ? 'save-state dirty' : 'save-state'}>{isDirty ? 'Nicht exportierte Änderungen' : 'Projekt ist aktuell'}</span><span className="completion">{progress}% vollständig</span></div>
        <div className="topbar-actions"><button className="button secondary" onClick={() => setShowLibrary(true)}><FolderOpen size={16} />Projekte</button><button className="button secondary" onClick={importProject}><Upload size={16} />Import</button><button className="button secondary" onClick={exportForPodCore}><Download size={16} />PodCore-Export</button><button className="button secondary" disabled={isExportingPdf} onClick={exportPdf}><Download size={16} />{isExportingPdf ? 'PDF wird erstellt…' : 'PDF exportieren'}</button><button className="button primary" onClick={saveProject}><Save size={16} />Projekt exportieren</button></div>
      </header>

      <main className="workspace">
        <aside className={sidebarOpen ? 'project-sidebar' : 'project-sidebar compact'}>
          <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Seitenleiste ein-/ausblenden">{sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
          {sidebarOpen && <>
            <div className="sidebar-head"><p className="eyebrow">Tutorial-Projekt</p><h1>{project.title || 'Unbenanntes Tutorial'}</h1></div>
            <label>Projektname<input value={project.title} onChange={(event) => updateProject('title', event.target.value)} placeholder="z. B. Angebotseditor verstehen" /></label>
            <label>Untertitel<textarea value={project.description} onChange={(event) => updateProject('description', event.target.value)} rows={3} placeholder="Worum geht es in diesem Tutorial?" /></label>
            <label>Anwendung<input value={project.applicationName} onChange={(event) => updateProject('applicationName', event.target.value)} placeholder="z. B. Meine Webanwendung" /></label>
            <label>URL oder Startkontext<input value={project.applicationUrl} onChange={(event) => updateProject('applicationUrl', event.target.value)} placeholder="https://… oder Desktop-App" /></label>
            <label>Zielgruppe<input value={project.audience.join(', ')} onChange={(event) => updateProject('audience', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} placeholder="Endnutzer, Redaktion" /></label><div className="pdf-layout-card"><p className="eyebrow">PDF-Layout</p><label>Dokumenttitel<input value={project.pdfLayout.documentTitle} onChange={(event) => updatePdfLayout({ documentTitle: event.target.value })} placeholder={project.title || 'Titel des Handbuchs'} /></label><label>Untertitel<input value={project.pdfLayout.documentSubtitle} onChange={(event) => updatePdfLayout({ documentSubtitle: event.target.value })} placeholder="Kurze Einordnung für das Titelblatt" /></label><label>PDF-Dateiname<input value={project.pdfLayout.fileName || project.pdfFileName || ''} onChange={(event) => updatePdfLayout({ fileName: event.target.value })} placeholder="Name der PDF-Datei" /></label><label>Footertext<textarea value={project.pdfLayout.footerText} onChange={(event) => updatePdfLayout({ footerText: event.target.value })} rows={2} placeholder="Hinweis im PDF-Footer" /></label><div className="pdf-logo-row"><button className="button secondary" type="button" onClick={choosePdfLogo}><ImagePlus size={15} />Eigenes PDF-Logo</button>{project.pdfLayout.logo && <><img src={project.pdfLayout.logo} alt="Vorschau des PDF-Logos" /><button className="icon-button danger" type="button" onClick={() => updatePdfLayout({ logo: undefined })} title="PDF-Logo entfernen"><X size={15} /></button></>}</div></div>
            <div className="sidebar-metric"><Users size={15} /><span>{project.audience.length || 0} Zielgruppe{project.audience.length === 1 ? '' : 'n'}</span></div>
            <div className="guide-card"><BookOpen size={18} /><div><strong>Kompatibel mit PodCore 2.16.21</strong><span>JSON enthält Schritte, Ziel, Interaktion, Screenshot und Markierungen.</span></div></div>
          </>}
        </aside>

        <section className="step-rail">
          <div className="rail-heading"><div><p className="eyebrow">Ablauf</p><h2>Schritte</h2></div><button className="icon-button accent" onClick={addStep} title="Schritt hinzufügen"><Plus size={18} /></button></div>
          <div className="step-list">
            {project.steps.map((step, index) => <button key={step.id} className={step.id === selectedStep?.id ? 'step-item active' : 'step-item'} onClick={() => setSelectedStepId(step.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title || 'Ohne Titel'}</strong><small>{step.image ? `${step.annotations.length} Markierung${step.annotations.length === 1 ? '' : 'en'}` : 'Kein Screenshot'}</small></div></button>)}
          </div>
          <button className="rail-preview" onClick={() => openPreview(0)}><Eye size={16} />Endnutzer-Vorschau</button>
        </section>

        <section className="editor">
          {!selectedStep ? <div className="empty"><CirclePlus size={32} /><h2>Erstelle den ersten Schritt</h2><p>Ein Tutorial beginnt mit einem klaren Arbeitsschritt und einer sichtbaren Handlung.</p><button className="button primary" onClick={addStep}>Schritt hinzufügen</button></div> : <>
            <div className="editor-head"><div><p className="eyebrow">Schritt {selectedIndex + 1} von {project.steps.length}</p><h2>{selectedStep.title || 'Schritt bearbeiten'}</h2></div><div className="editor-actions"><button className="icon-button" onClick={() => moveStep(selectedStep.id, -1)} disabled={selectedIndex === 0} title="Nach oben"><ArrowUp size={17} /></button><button className="icon-button" onClick={() => moveStep(selectedStep.id, 1)} disabled={selectedIndex === project.steps.length - 1} title="Nach unten"><ArrowDown size={17} /></button><button className="icon-button" onClick={() => duplicateStep(selectedStep.id)} title="Duplizieren"><FileJson2 size={17} /></button><button className="icon-button danger" onClick={() => removeStep(selectedStep.id)} title="Löschen"><Trash2 size={17} /></button></div></div>
            <div className="editor-form"><label>Titel<input value={selectedStep.title} onChange={(event) => updateStep(selectedStep.id, { title: event.target.value })} placeholder="z. B. Neue Episode anlegen" /></label><label>Erklärung<textarea value={selectedStep.description} onChange={(event) => updateStep(selectedStep.id, { description: event.target.value })} rows={4} placeholder="Beschreibe klar, was der Nutzer tun soll und warum." /></label><div className="form-grid"><label>Element / Ziel<input value={selectedStep.target} onChange={(event) => updateStep(selectedStep.id, { target: event.target.value })} placeholder="z. B. #new-episode" /></label><label>Seite / Kontext<input value={selectedStep.route} onChange={(event) => updateStep(selectedStep.id, { route: event.target.value })} placeholder="z. B. /episodes oder Dashboard" /></label><label>Interaktion<select value={selectedStep.interaction} onChange={(event) => updateStep(selectedStep.id, { interaction: event.target.value as TutorialStep['interaction'] })}><option value="guide">Hinweis</option><option value="click">Klick</option><option value="confirm">Bestätigung</option></select></label><label>Hinweisposition<select value={selectedStep.position} onChange={(event) => updateStep(selectedStep.id, { position: event.target.value as TutorialStep['position'] })}><option value="bottom">Unten</option><option value="top">Oben</option><option value="left">Links</option><option value="right">Rechts</option></select></label></div><label className="checkbox"><input type="checkbox" checked={selectedStep.allowSkip} onChange={(event) => updateStep(selectedStep.id, { allowSkip: event.target.checked })} />Dieser Schritt darf übersprungen werden</label></div>

            <section className="capture-section"><div className="section-head"><div><p className="eyebrow">Visuelle Erklärung</p><h3>Screenshot und Markierungen</h3><p>Übernimm einen Bildschirm, importiere einen Screenshot und klicke auf das Bild, um nummerierte Markierungen zu setzen.</p></div><div className="capture-actions"><button className="button secondary" onClick={startCapture}><Monitor size={16} />Bildschirm wählen</button><button className="button secondary" onClick={chooseImage}><ImagePlus size={16} />Bild importieren</button></div></div>
              {selectedStep.image ? <><div className="canvas" onClick={addAnnotation} title="Zum Setzen einer Markierung auf den Screenshot klicken"><img src={selectedStep.image} alt={`Screenshot für ${selectedStep.title}`} />{selectedStep.annotations.map((annotation) => <span key={annotation.id} className="annotation-dot" style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, background: annotation.color || '#16767a' }}>{annotation.label}</span>)}</div><div className="annotation-list"><div className="annotation-title"><MousePointer2 size={16} /><strong>{selectedStep.annotations.length} Markierung{selectedStep.annotations.length === 1 ? '' : 'en'}</strong></div>{selectedStep.annotations.length === 0 && <p className="annotation-empty">Klicke auf den Screenshot, um die erste Markierung zu ergänzen.</p>}{selectedStep.annotations.map((annotation) => <div className="annotation-row" key={annotation.id}><span className="annotation-number" style={{ background: annotation.color || '#16767a' }}>{annotation.label}</span><input aria-label="Nummer" value={annotation.label} onChange={(event) => updateAnnotation(annotation.id, { label: event.target.value })} /><input aria-label="Erklärung" value={annotation.description} onChange={(event) => updateAnnotation(annotation.id, { description: event.target.value })} /><button className="icon-button danger" onClick={() => removeAnnotation(annotation.id)} title="Markierung löschen"><X size={16} /></button></div>)}</div></> : <div className="capture-empty"><ImagePlus size={34} /><h3>Dieser Schritt hat noch keinen Screenshot.</h3><p>Für Webanwendungen kannst du einen Browser-Screenshot importieren. Für Desktop-Software wählst du ein geöffnetes Fenster oder den Bildschirm aus.</p><div><button className="button secondary" onClick={startCapture}><Monitor size={16} />Bildschirm wählen</button><button className="button primary" onClick={chooseImage}><Upload size={16} />Screenshot importieren</button></div></div>}</section>
          </>}
        </section>
      </main>

      <footer className="statusbar"><span><CheckCircle2 size={15} />{notice}</span><span>{project.steps.length} Schritt{project.steps.length === 1 ? '' : 'e'} · {project.enabled ? 'Aktiv' : 'Deaktiviert'} · Format 1.0</span></footer>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleImageUpload} />
      <input ref={pdfLogoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePdfLogoUpload} />
      <input ref={projectInputRef} type="file" accept="application/json,.json" hidden onChange={handleProjectUpload} />

      {previewOpen && project.steps[previewIndex] && <TutorialPreview project={project} stepIndex={previewIndex} onClose={() => setPreviewOpen(false)} onChange={(index) => setPreviewIndex(index)} />}
      {showCapture && <CaptureDialog sources={screenSources} onClose={() => setShowCapture(false)} onPick={acceptCapture} />}
      {showLibrary && <ProjectLibraryDialog projects={library.projects} activeProjectId={library.activeProjectId} query={libraryQuery} showArchived={showArchived} onQueryChange={setLibraryQuery} onShowArchivedChange={setShowArchived} onClose={() => setShowLibrary(false)} onCreate={createNewProject} onOpen={openProject} onDuplicate={duplicateProjectInLibrary} onArchive={archiveProject} onRestore={restoreProject} />}
      {showSources && null}
    </div>
  );
}

function TutorialPreview({ project, stepIndex, onClose, onChange }: { project: TutorialProject; stepIndex: number; onClose: () => void; onChange: (index: number) => void }) {
  const step = project.steps[stepIndex];
  return <div className="modal-backdrop"><section className="preview-modal" role="dialog" aria-modal="true" aria-label="Tutorial-Vorschau"><header><div><p className="eyebrow">Endnutzer-Vorschau · {stepIndex + 1} / {project.steps.length}</p><h2>{project.title}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header><div className="preview-content">{step.image ? <div className="preview-image"><img src={step.image} alt="Schritt-Screenshot" />{step.annotations.map((annotation) => <span key={annotation.id} className="annotation-dot preview" style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, background: annotation.color || '#16767a' }}>{annotation.label}</span>)}</div> : <div className="preview-placeholder"><ImagePlus size={30} />Kein Screenshot hinterlegt</div>}<div className="preview-copy"><p className="eyebrow">Schritt {stepIndex + 1} · {step.interaction === 'click' ? 'Klick ausführen' : step.interaction === 'confirm' ? 'Prüfen und bestätigen' : 'Hinweis lesen'}</p><h3>{step.title}</h3><p>{step.description || 'Für diesen Schritt fehlt noch eine Erklärung.'}</p>{step.annotations.length > 0 && <ol className="marking-copy">{step.annotations.map((annotation) => <li key={annotation.id}><span style={{ background: annotation.color || '#16767a' }}>{annotation.label}</span>{annotation.description}</li>)}</ol>}</div></div><footer><button className="button secondary" disabled={stepIndex === 0} onClick={() => onChange(stepIndex - 1)}><ChevronLeft size={16} />Zurück</button><span>{step.allowSkip ? 'Schritt kann übersprungen werden' : 'Schritt ist verpflichtend'}</span><button className="button primary" disabled={stepIndex === project.steps.length - 1} onClick={() => onChange(stepIndex + 1)}>Weiter<ChevronRight size={16} /></button></footer></section></div>;
}

function CaptureDialog({ sources, onClose, onPick }: { sources: Array<{ id: string; name: string; thumbnail: string; displayId: string }>; onClose: () => void; onPick: (source: { thumbnail: string; name: string }) => void }) {
  return <div className="modal-backdrop"><section className="capture-dialog" role="dialog" aria-modal="true" aria-label="Bildschirm auswählen"><header><div><p className="eyebrow">Bildschirmaufnahme</p><h2>Ansicht für den Schritt auswählen</h2><p>Unter macOS muss Tutorial Studio die Berechtigung zur Bildschirmaufnahme erhalten.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header><div className="source-grid">{sources.map((source) => <button key={source.id} className="source-card" onClick={() => onPick(source)}><img src={source.thumbnail} alt={`Vorschau ${source.name}`} /><span>{source.name}</span></button>)}{sources.length === 0 && <div className="empty"><Monitor size={30} /><p>Keine Bildschirmquellen verfügbar.</p></div>}</div></section></div>;
}
