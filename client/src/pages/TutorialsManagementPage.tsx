/**
 * TutorialsManagementPage v3
 * Fixes:
 *  - Screenshot-Übernahme: kein sofortiger Redirect, onCapture speichert Bild korrekt
 *  - API-Pfade: /api/tutorials (CRUD), /api/admin/tutorials (Admin-Liste + Fortschritt)
 *  - Besseres Design: zweispaltig, klarer Workflow, Schritt-Editor übersichtlich
 *  - Mehrere Rollen pro Tutorial
 *  - Einklappbare Schritte
 *  - PDF-Export (lazy)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  Plus, Trash2, Save, ChevronDown, ChevronUp,
  Camera, Download, Eye, Users, BookOpen, Edit3,
  X, Check, AlertCircle, Loader2, ArrowLeft,
  ToggleLeft, ToggleRight, GripVertical, Image as ImageIcon,
  FileText, Settings as SettingsIcon, ChevronRight, RefreshCw, Copy, MousePointerClick,
} from 'lucide-react';
import { useScreenshotMode } from '../contexts/ScreenshotModeContext';
import { RecordedTutorialAction, useTutorialRecording } from '../contexts/TutorialRecordingContext';
import RoleMenuPreview from '../components/tutorials/RoleMenuPreview';
import { tutorialCloudApi, TutorialCloudItem, TutorialCloudStatus } from '../lib/api';

// ── TYPES ──────────────────────────────────────────────────────────────────
interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
}
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  allowSkip?: boolean;
  interaction?: 'guide' | 'click' | 'confirm';
}
interface Tutorial {
  id: string;
  roles: string[];
  role?: string;
  title: string;
  description: string;
  enabled: boolean;
  steps: TutorialStep[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
interface Role {
  id: string;
  name: string;
  label: string;
  color: string;
  permissions: Record<string, boolean>;
}
interface UserProgress {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  currentStep: number;
  updatedAt: string;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  redakteur: '#2563eb',
  moderator: '#059669',
  produktion: '#d97706',
  sponsoring: '#dc2626',
  editor: '#2563eb',
  producer: '#d97706',
};
const ANN_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0d9488',
];
const PAGE_ROUTES: { label: string; path: string; tutorialId: string }[] = [
  { label: 'Dashboard', path: '/', tutorialId: 'nav-dashboard' },
  { label: 'Episoden', path: '/episodes', tutorialId: 'nav-episodes' },
  { label: 'Episoden-Dashboard', path: '/episodes-dashboard', tutorialId: 'nav-episodes-dashboard' },
  { label: 'Redaktions-Hub', path: '/editorial', tutorialId: 'nav-editorial' },
  { label: 'Redaktionskalender', path: '/calendar', tutorialId: 'nav-calendar' },
  { label: 'Team-Chat', path: '/chat', tutorialId: 'nav-chat' },
  { label: 'Media Library', path: '/media', tutorialId: 'nav-media' },
  { label: 'Sponsoring', path: '/sponsors', tutorialId: 'nav-sponsors' },
  { label: 'Buchungskalender', path: '/sponsors/calendar', tutorialId: 'nav-sponsors-calendar' },
  { label: 'Sponsor-Auswertungen', path: '/sponsors/reports', tutorialId: 'nav-sponsors-reports' },
  { label: 'Staffeln', path: '/seasons', tutorialId: 'nav-seasons' },
  { label: 'Archiv', path: '/archive', tutorialId: 'nav-archive' },
  { label: 'Podigee Analytics', path: '/analytics', tutorialId: 'nav-analytics' },
  { label: 'Podcast-Statistiken', path: '/stats', tutorialId: 'nav-stats' },
  { label: 'Branding & Backup', path: '/branding', tutorialId: 'nav-branding' },
  { label: 'Administration', path: '/admin', tutorialId: 'nav-admin' },
  { label: 'Einstellungen', path: '/settings', tutorialId: 'nav-settings' },
  { label: 'PDF-Layouts', path: '/pdf-layouts', tutorialId: 'nav-pdf-layouts' },
];

const getRoleColor = (name: string) =>
  ROLE_COLORS[name?.toLowerCase()] || '#6b7280';

const newStep = (title = 'Neuer Tutorialschritt'): TutorialStep => ({
  id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title,
  description: '',
  target: '',
  position: 'bottom',
  image: '',
  annotations: [],
  allowSkip: true,
  interaction: 'guide',
});

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function TutorialsManagementPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { startScreenshotMode, persistedState, clearPersistedState } = useScreenshotMode();
  const { startRecording } = useTutorialRecording();

  // Developer Mode Check
  const isDeveloper = user?.developerMode === true;

  // ── State ──
  type View = 'list' | 'edit' | 'progress';
  const [view, setView] = useState<View>('list');
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editTutorial, setEditTutorial] = useState<Tutorial | null>(null);
  const [collapsedSteps, setCollapsedSteps] = useState<Set<string>>(new Set());
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress[]>>({});
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'steps' | 'roles' | 'preview'>('steps');
  const [tutorialSearch, setTutorialSearch] = useState('');
  const [tutorialStatus, setTutorialStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [cloudStatus, setCloudStatus] = useState<TutorialCloudStatus | null>(null);
  const [cloudItems, setCloudItems] = useState<TutorialCloudItem[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('https://podcore.de/wp-json/app-tutorials/v1');
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [cloudAutoSync, setCloudAutoSync] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotRestoreAppliedRef = useRef(false);
  const recordingRestoreAppliedRef = useRef(false);

  // Ref to hold the current editTutorial for use inside screenshot callbacks
  const editTutorialRef = useRef<Tutorial | null>(null);
  useEffect(() => { editTutorialRef.current = editTutorial; }, [editTutorial]);

  const visibleTutorials = tutorials.filter((tutorial) => {
    const query = tutorialSearch.trim().toLocaleLowerCase('de-DE');
    const haystack = [tutorial.title, tutorial.description, ...(tutorial.roles || [])]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('de-DE');
    const matchesSearch = !query || haystack.includes(query);
    const matchesStatus = tutorialStatus === 'all'
      || (tutorialStatus === 'active' ? tutorial.enabled : !tutorial.enabled);
    return matchesSearch && matchesStatus;
  });

  // ── RESTORE STATE AFTER SCREENSHOT NAVIGATION ──
  // The complete editor snapshot is written before navigating away. This prevents
  // a React route transition from dropping the confirmed screenshot or its points.
  useEffect(() => {
    if (screenshotRestoreAppliedRef.current) return;

    let storedRestore: { editTutorial?: Tutorial; stepId?: string } | null = null;
    try {
      const raw = sessionStorage.getItem('podcore_screenshot_editor_restore');
      storedRestore = raw ? JSON.parse(raw) : null;
    } catch {
      storedRestore = null;
    }

    const restoreState = storedRestore?.editTutorial
      ? storedRestore
      : persistedState;

    if (restoreState?.editTutorial) {
      let restoredTutorial = restoreState.editTutorial as Tutorial;
      const stepId = restoreState.stepId;

      // Check if there's a pending screenshot in sessionStorage
      const pendingRaw = sessionStorage.getItem('podcore_screenshot_pending');
      if (pendingRaw && stepId) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending[stepId]) {
            const { dataUrl, annotations } = pending[stepId];
            restoredTutorial = {
              ...restoredTutorial,
              steps: restoredTutorial.steps.map((s: TutorialStep) =>
                s.id === stepId ? { ...s, image: dataUrl, annotations } : s
              ),
            };
            // Clean up
            delete pending[stepId];
            if (Object.keys(pending).length === 0) {
              sessionStorage.removeItem('podcore_screenshot_pending');
            } else {
              sessionStorage.setItem('podcore_screenshot_pending', JSON.stringify(pending));
            }
          }
        } catch {}
      }

      setEditTutorial(restoredTutorial);
      setView('edit');
      setActiveTab('steps');
      screenshotRestoreAppliedRef.current = true;
      sessionStorage.removeItem('podcore_screenshot_editor_restore');
      clearPersistedState();
    }
  }, [persistedState, clearPersistedState]);

  useEffect(() => {
    if (recordingRestoreAppliedRef.current) return;
    try {
      const raw = sessionStorage.getItem('podcore_tutorial_recording_result');
      if (!raw) return;
      const result = JSON.parse(raw) as { editTutorial: Tutorial; stepId?: string; append?: boolean; actions?: RecordedTutorialAction[]; action?: RecordedTutorialAction };
      const actions = result.actions || (result.action ? [result.action] : []);
      if (!result.editTutorial || !actions.length || !actions.every(action => action.target)) return;
      const applyAction = (step: TutorialStep, action: RecordedTutorialAction, index: number): TutorialStep => ({
        ...step,
        title: action.title || step.title || `Schritt ${index + 1}`,
        description: action.description || step.description,
        target: action.target,
        route: action.route,
        interaction: action.interaction,
        image: action.image || step.image,
        annotations: action.image ? [] : step.annotations,
      });
      let restoredTutorial: Tutorial;
      if (result.append) {
        const offset = result.editTutorial.steps.length;
        restoredTutorial = { ...result.editTutorial, steps: [...result.editTutorial.steps, ...actions.map((action, index) => applyAction(newStep(`Schritt ${offset + index + 1}`), action, offset + index))] };
      } else {
        const stepIndex = result.editTutorial.steps.findIndex(step => step.id === result.stepId);
        if (stepIndex < 0) return;
        const steps = [...result.editTutorial.steps];
        steps.splice(stepIndex, 1, applyAction(steps[stepIndex], actions[0], stepIndex), ...actions.slice(1).map((action, index) => applyAction(newStep(`Schritt ${stepIndex + index + 2}`), action, stepIndex + index + 1)));
        restoredTutorial = { ...result.editTutorial, steps };
      }
      setEditTutorial(restoredTutorial);
      setView('edit');
      setActiveTab('steps');
      recordingRestoreAppliedRef.current = true;
      sessionStorage.removeItem('podcore_tutorial_recording_result');
    } catch {
      sessionStorage.removeItem('podcore_tutorial_recording_result');
    }
  }, []);

  // ── LOAD ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes, uRes] = await Promise.all([
        fetch('/api/admin/tutorials', { credentials: 'include' }),
        fetch('/api/admin/roles', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        const list: Tutorial[] = (Array.isArray(d) ? d : []).map((t: any) => ({
          ...t,
          roles: Array.isArray(t.roles) && t.roles.length > 0
            ? t.roles : t.role ? [t.role] : [],
        }));
        setTutorials(list);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setRoles(Array.isArray(d) ? d : (d?.data || []));
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setUsers(Array.isArray(d) ? d : (d?.data || []));
      }
    } catch { setError('Fehler beim Laden'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const loadCloudStatus = useCallback(async () => {
    if (!isDeveloper) return;
    try {
      const status = await tutorialCloudApi.getStatus();
      setCloudStatus(status);
      setCloudUrl(status.baseUrl);
      setCloudEnabled(status.enabled);
      setCloudAutoSync(status.autoSync);
    } catch {
      setCloudStatus(null);
    }
  }, [isDeveloper]);

  useEffect(() => { loadCloudStatus(); }, [loadCloudStatus]);

  const handleCloudSave = useCallback(async () => {
    setCloudSaving(true);
    try {
      const status = await tutorialCloudApi.saveConfig({ enabled: cloudEnabled, baseUrl: cloudUrl, autoSync: cloudAutoSync });
      setCloudStatus(status);
      setSuccess('Tutorial-Cloud-Einstellungen gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Cloud-Einstellungen konnten nicht gespeichert werden');
    } finally {
      setCloudSaving(false);
    }
  }, [cloudEnabled, cloudUrl, cloudAutoSync]);

  const handleCloudCatalog = useCallback(async () => {
    setCloudLoading(true);
    try {
      const result = await tutorialCloudApi.getCatalog();
      setCloudItems(result.items || []);
    } catch (e: any) {
      setError(e?.message || 'Cloud-Katalog konnte nicht geladen werden');
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleCloudSync = useCallback(async () => {
    setCloudLoading(true);
    try {
      const result = await tutorialCloudApi.sync();
      await loadData();
      await loadCloudStatus();
      setSuccess(`${result.imported} Cloud-Tutorial${result.imported === 1 ? '' : 's'} synchronisiert`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Cloud-Synchronisation fehlgeschlagen');
    } finally {
      setCloudLoading(false);
    }
  }, [loadData, loadCloudStatus]);

  // ── PROGRESS ──
  const loadProgress = useCallback(async (tid: string) => {
    setLoadingProgress(tid);
    try {
      const r = await fetch(`/api/admin/tutorials/${tid}/progress`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        setProgressMap(p => ({ ...p, [tid]: data }));
      }
    } finally { setLoadingProgress(null); }
  }, []);

  // ── SAVE ──
  const handleSave = useCallback(async () => {
    if (!editTutorial) return;
    if (!editTutorial.title.trim()) { setError('Titel erforderlich'); return; }
    if (!editTutorial.roles.length) { setError('Mindestens eine Rolle erforderlich'); return; }
    if (!editTutorial.steps.length) { setError('Mindestens ein Schritt erforderlich'); return; }
    const normalizedSteps = editTutorial.steps.map((step, index) => ({
      ...step,
      title: step.title.trim() || `Schritt ${index + 1}`,
      description: step.description.trim(),
      image: step.image || undefined,
      annotations: step.image ? (step.annotations || []) : [],
    }));
    setSaving(true); setError(null);
    try {
      const isNew = editTutorial.id.startsWith('new-');
      const url = isNew ? '/api/tutorials' : `/api/tutorials/${editTutorial.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roles: editTutorial.roles,
          role: editTutorial.roles[0],
          title: editTutorial.title,
          description: editTutorial.description,
          enabled: editTutorial.enabled,
          // Screenshots und Markierungen sind optional. Die interaktive App-
          // Führung benötigt nur Klickziel, Route und Call-out-Text.
          steps: normalizedSteps,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Speichern fehlgeschlagen (${res.status})`);
      }
      setSuccess('Tutorial gespeichert');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
      setView('list');
      setEditTutorial(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }, [editTutorial, loadData]);

  // ── DELETE ──
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tutorial wirklich löschen?')) return;
    try {
      await fetch(`/api/tutorials/${id}`, { method: 'DELETE', credentials: 'include' });
      await loadData();
      setSuccess('Tutorial gelöscht');
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Fehler beim Löschen'); }
  }, [loadData]);

  // ── RESET PROGRESS ──
  const handleResetProgress = useCallback(async (tid: string, uid: string) => {
    try {
      await fetch(`/api/admin/tutorials/${tid}/reset/${uid}`, { method: 'POST', credentials: 'include' });
      await loadProgress(tid);
      setSuccess('Tutorial zurückgesetzt');
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Fehler beim Zurücksetzen'); }
  }, [loadProgress]);

  // ── TOGGLE ENABLED ──
  const handleToggleEnabled = useCallback(async (t: Tutorial) => {
    try {
      await fetch(`/api/tutorials/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...t, enabled: !t.enabled }),
      });
      await loadData();
    } catch { setError('Fehler beim Aktualisieren'); }
  }, [loadData]);

  // ── HELPERS FOR PDF ──
  const bakeAnnotationsToImage = (dataUrl: string, annotations: AnnotationPoint[]): Promise<string> => {
    if (!annotations || annotations.length === 0) return Promise.resolve(dataUrl);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0);
        annotations.forEach((ann, i) => {
          const x = (ann.x / 100) * img.width;
          const y = (ann.y / 100) * img.height;
          const radius = Math.max(img.width, img.height) * 0.012;
          ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = ANN_COLORS[i % ANN_COLORS.length]; ctx.fill();
          ctx.lineWidth = radius * 0.2; ctx.strokeStyle = 'white'; ctx.stroke();
          ctx.fillStyle = 'white'; ctx.font = `bold ${radius * 1.2}px Arial`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(ann.label, x, y);
        });
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // ── PDF EXPORT ──
  const handleExportPDF = useCallback(async (tutorial: Tutorial) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const M = 15; let y = M;
      const checkY = (h: number) => { if (y + h > 280) { doc.addPage(); y = M; } };

      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
      doc.text(tutorial.title, M, y); y += 10;
      if (tutorial.description) {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        const desc = doc.splitTextToSize(tutorial.description, W - 2 * M);
        doc.text(desc, M, y); y += desc.length * 6 + 4;
      }
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text(`Rollen: ${tutorial.roles.join(', ')} · ${tutorial.steps.length} Schritte`, M, y); y += 10;
      doc.setDrawColor(200, 200, 200); doc.line(M, y, W - M, y); y += 8;

      for (let i = 0; i < tutorial.steps.length; i++) {
        const s = tutorial.steps[i];
        checkY(20);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
        doc.text(`${i + 1}. ${s.title || `Schritt ${i + 1}`}`, M, y); y += 7;
        if (s.description) {
          doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
          const lines = doc.splitTextToSize(s.description, W - 2 * M);
          checkY(lines.length * 5 + 4);
          doc.text(lines, M, y); y += lines.length * 5 + 4;
        }
        if (s.image) {
          try {
            const bakedImage = await bakeAnnotationsToImage(s.image, s.annotations || []);
            checkY(90);
            doc.addImage(bakedImage, 'PNG', M, y, W - 2 * M, 80);
            y += 84;
          } catch (err) {
            console.error('Image bake error:', err);
            doc.addImage(s.image, 'PNG', M, y, W - 2 * M, 80);
            y += 84;
          }
        }
        if (s.annotations?.length) {
          checkY(10 + s.annotations.length * 8);
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
          doc.text('Markierungen:', M, y); y += 6;
          for (const a of s.annotations) {
            doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
            const al = doc.splitTextToSize(`[${a.label}] ${a.description}`, W - 2 * M - 4);
            checkY(al.length * 5 + 2);
            doc.text(al, M + 4, y); y += al.length * 5 + 2;
          }
        }
        y += 8;
      }
      doc.save(`${tutorial.title.replace(/[^a-z0-9]/gi, '_')}_Tutorial.pdf`);
      setSuccess('PDF exportiert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { 
      console.error('PDF Export error:', err);
      setError('Fehler beim PDF-Export'); 
    }
  }, []);

  // ── SCREENSHOT ──
  // Key fix: use a ref-based callback so the closure always has the latest editTutorial
  const handleStartScreenshot = useCallback((stepId: string) => {
    const current = editTutorialRef.current;
    if (!current) return;
    const firstRole = current.roles[0];
    const roleObj = roles.find(r => r.name === firstRole || r.id === firstRole);
    const route = PAGE_ROUTES.find(r => {
      const step = current.steps.find(s => s.id === stepId);
      return step && (r.tutorialId === step.target || r.path === step.target);
    });

    startScreenshotMode({
      role: firstRole || 'unbekannt',
      permissions: roleObj?.permissions || {},
      persistedState: { editTutorial: current, stepId },
      onCapture: ({ dataUrl, annotations }) => {
        const restoredTutorial: Tutorial = {
          ...current,
          steps: current.steps.map((step: TutorialStep) =>
            step.id === stepId ? { ...step, image: dataUrl, annotations } : step
          ),
        };
        sessionStorage.setItem('podcore_screenshot_editor_restore', JSON.stringify({
          editTutorial: restoredTutorial,
          stepId,
        }));
        navigate('/admin/tutorials/edit');
      },
      onCancel: () => {
        sessionStorage.setItem('podcore_screenshot_editor_restore', JSON.stringify({
          editTutorial: current,
          stepId,
        }));
        navigate('/admin/tutorials/edit');
      },
    });

    // Einstiegs-Tutorial (mehrere Rollen) oder kein Ziel gesetzt → immer Dashboard
    const isMultiRole = (current.roles?.length || 0) > 1;
    const targetPath = isMultiRole ? '/' : (route?.path || '/');
    navigate(targetPath);
  }, [roles, startScreenshotMode, navigate]);

  const handleStartRecording = useCallback((stepId?: string) => {
    const current = editTutorialRef.current;
    if (!current) return;
    const firstRole = current.roles[0];
    const roleObj = roles.find(role => role.name === firstRole || role.id === firstRole);
    const step = stepId ? current.steps.find(item => item.id === stepId) : undefined;
    const targetPath = step?.route || PAGE_ROUTES.find(route => route.tutorialId === step?.target)?.path || '/';
    startRecording({
      role: firstRole || 'unbekannt',
      permissions: roleObj?.permissions || {},
      onComplete: (actions) => {
        sessionStorage.setItem('podcore_tutorial_recording_result', JSON.stringify({ editTutorial: current, stepId, append: !stepId, actions }));
        navigate('/admin/tutorials/edit');
      },
      onCancel: () => navigate('/admin/tutorials/edit'),
    });
    navigate(targetPath);
  }, [navigate, roles, startRecording]);

  // ── STEP HELPERS ──
  const toggleStep = (id: string) => setCollapsedSteps(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const updateStep = (id: string, upd: Partial<TutorialStep>) =>
    setEditTutorial(p => p ? { ...p, steps: p.steps.map(s => s.id === id ? { ...s, ...upd } : s) } : p);
  const addStep = () => {
    const s = newStep(`Schritt ${(editTutorial?.steps.length || 0) + 1}`);
    setEditTutorial(p => p ? { ...p, steps: [...p.steps, s] } : p);
    setCollapsedSteps(p => { const n = new Set(p); n.delete(s.id); return n; });
  };
  const removeStep = (id: string) =>
    setEditTutorial(p => p ? { ...p, steps: p.steps.filter(s => s.id !== id) } : p);
  const moveStep = (id: string, dir: -1 | 1) => setEditTutorial(p => {
    if (!p) return p;
    const idx = p.steps.findIndex(s => s.id === id);
    const ni = idx + dir;
    if (ni < 0 || ni >= p.steps.length) return p;
    const steps = [...p.steps];
    [steps[idx], steps[ni]] = [steps[ni], steps[idx]];
    return { ...p, steps };
  });
  const duplicateStep = (id: string) => setEditTutorial(p => {
    if (!p) return p;
    const index = p.steps.findIndex(step => step.id === id);
    if (index < 0) return p;
    const source = p.steps[index];
    const duplicate: TutorialStep = {
      ...source,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: source.title ? `${source.title} (Kopie)` : '',
      annotations: (source.annotations || []).map((annotation, annotationIndex) => ({
        ...annotation,
        id: `annotation-${Date.now()}-${annotationIndex}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };
    const steps = [...p.steps];
    steps.splice(index + 1, 0, duplicate);
    return { ...p, steps };
  });
  const toggleRole = (name: string) => setEditTutorial(p => {
    if (!p) return p;
    const r = p.roles.includes(name) ? p.roles.filter(x => x !== name) : [...p.roles, name];
    return { ...p, roles: r };
  });

  // ── NOTIFICATIONS ──
  const Notifications = () => (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <AlertCircle size={15} /><span className="text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-300 transition-colors"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
          <Check size={15} /><span className="text-sm">{success}</span>
        </div>
      )}
    </div>
  );

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(tutorials, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `podcore_tutorials_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
    setSuccess('Export erfolgreich!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleExportTutorial = (tutorial: Tutorial) => {
    const exportData = {
      ...tutorial,
      exportMeta: {
        format: 'podcore-tutorial',
        version: 1,
        exportedAt: new Date().toISOString(),
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(tutorial.title || 'tutorial').replace(/[^a-z0-9äöüß_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'tutorial'}_podcore.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setSuccess(`„${tutorial.title || 'Tutorial'}“ als JSON exportiert`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedTutorials = Array.isArray(json) ? json : [json];
        
        setSaving(true);
        let count = 0;
        for (const t of importedTutorials) {
          // Clean up ID to avoid conflicts, let backend handle it or create new
          const { id, createdAt, updatedAt, ...cleanT } = t;
          const res = await fetch('/api/tutorials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanT),
            credentials: 'include',
          });
          if (res.ok) count++;
        }
        
        setSuccess(`${count} Tutorials erfolgreich importiert!`);
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Fehler beim Importieren der Datei.');
      } finally {
        setSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ── DEVELOPER MODE CHECK ──
  if (!isDeveloper) return (
    <div className="flex items-center justify-center h-screen">
      <div className="card max-w-md text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-accent-red" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Entwickler-Modus erforderlich</h2>
        <p className="text-text-muted mb-4">Die Tutorial-Verwaltung ist nur im Entwickler-Modus verfügbar. Aktiviere diesen in deinen Einstellungen.</p>
        <button onClick={() => navigate('/settings')} className="btn-primary inline-flex items-center gap-2">
          <SettingsIcon size={16} /> Zu den Einstellungen
        </button>
      </div>
    </div>
  );

  // ── LOADING ──
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-accent-purple" />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header" data-tutorial-id="tutorials-header">
        <div>
          <h1 className="page-title">Tutorial-Verwaltung</h1>
          <p className="page-subtitle">Einstiegs-Tutorials für alle Rollen erstellen und verwalten</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2"
            title="Tutorials aus JSON importieren"
          >
            <Download size={16} className="rotate-180" /> Import
          </button>
          <button
            onClick={handleExportAll}
            className="btn-secondary flex items-center gap-2"
            title="Alle Tutorials als JSON exportieren"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => {
              const t: Tutorial = {
                id: `new-${Date.now()}`,
                roles: [],
                title: '',
                description: '',
                enabled: true,
                steps: [newStep('Schritt 1')],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setEditTutorial(t);
              setActiveTab('steps');
              setCollapsedSteps(new Set());
              setView('edit');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />Neues Tutorial
          </button>
        </div>
      </div>

      <Notifications />

      {isDeveloper && (
        <section className="card border border-accent-purple/30 bg-accent-purple/5 space-y-4" aria-labelledby="tutorial-cloud-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="tutorial-cloud-heading" className="font-semibold text-text-primary flex items-center gap-2">
                <BookOpen size={16} className="text-accent-purple" />
                Tutorial-Cloud von podcore.de
              </h2>
              <p className="text-xs text-text-muted mt-1 max-w-2xl">
                Veröffentliche Tutorials im WordPress-Wiki und übernimm sie kontrolliert in diese Installation. Lokale Tutorials bleiben unverändert.
              </p>
            </div>
            {cloudStatus && (
              <span className={`px-2 py-1 rounded-full text-xs ${cloudStatus.enabled ? 'bg-green-500/15 text-green-400' : 'bg-obsidian-700 text-text-muted'}`}>
                {cloudStatus.enabled ? 'Cloud aktiviert' : 'Cloud deaktiviert'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="form-label" htmlFor="tutorial-cloud-url">WordPress-API-URL</label>
              <input
                id="tutorial-cloud-url"
                className="form-input"
                value={cloudUrl}
                onChange={e => setCloudUrl(e.target.value)}
                placeholder="https://podcore.de/wp-json/app-tutorials/v1"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary pb-2">
              <input type="checkbox" checked={cloudEnabled} onChange={e => setCloudEnabled(e.target.checked)} />
              Aktiviert
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary pb-2">
              <input type="checkbox" checked={cloudAutoSync} onChange={e => setCloudAutoSync(e.target.checked)} />
              Auto-Sync vormerken
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleCloudSave} disabled={cloudSaving} className="btn-primary flex items-center gap-2 text-sm">
              {cloudSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Cloud speichern
            </button>
            <button onClick={handleCloudCatalog} disabled={cloudLoading || !cloudEnabled} className="btn-secondary flex items-center gap-2 text-sm">
              {cloudLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Katalog prüfen
            </button>
            <button onClick={handleCloudSync} disabled={cloudLoading || !cloudEnabled} className="btn-secondary flex items-center gap-2 text-sm">
              {cloudLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Cloud-Tutorials synchronisieren
            </button>
            {cloudStatus?.lastSyncAt && <span className="text-xs text-text-muted">Letzte Synchronisation: {new Date(cloudStatus.lastSyncAt).toLocaleString('de-DE')}</span>}
          </div>
          {cloudStatus?.lastError && <p className="text-xs text-red-400">Letzter Cloud-Fehler: {cloudStatus.lastError}</p>}
          {cloudItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-obsidian-700">
              {cloudItems.map(item => (
                <div key={String(item.slug || item.id)} className="rounded-lg bg-obsidian-800/70 p-3">
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-muted mt-1">{item.steps?.length || 0} Schritte · {item.slug}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Suche und Filter */}
      {tutorials.length > 0 && (
        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="tutorial-search" className="sr-only">Tutorials durchsuchen</label>
            <input
              id="tutorial-search"
              type="search"
              value={tutorialSearch}
              onChange={e => setTutorialSearch(e.target.value)}
              className="form-input"
              placeholder="Titel, Beschreibung oder Rolle durchsuchen …"
            />
          </div>
          <select
            value={tutorialStatus}
            onChange={e => setTutorialStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="form-input sm:w-44"
            aria-label="Tutorial-Status filtern"
          >
            <option value="all">Alle Status</option>
            <option value="active">Nur aktive</option>
            <option value="inactive">Nur inaktive</option>
          </select>
          <div className="flex items-center px-2 text-xs text-text-muted whitespace-nowrap">
            {visibleTutorials.length} von {tutorials.length}
          </div>
        </div>
      )}

      {/* Tutorial cards */}
      {tutorials.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto mb-4 text-text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Noch keine Tutorials</h3>
          <p className="text-text-muted text-sm mb-6">Erstelle das erste Einstiegs-Tutorial für deine Nutzer.</p>
          <button
            onClick={() => {
              setEditTutorial({ id: `new-${Date.now()}`, roles: [], title: '', description: '', enabled: true, steps: [newStep()], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              setView('edit');
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />Erstes Tutorial erstellen
          </button>
        </div>
      ) : visibleTutorials.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen size={34} className="mx-auto mb-3 text-text-muted opacity-40" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Keine passenden Tutorials</h3>
          <p className="text-text-muted text-sm">Passe die Suche oder den Statusfilter an.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTutorials.map(t => (
            <div key={t.id} className="card hover:border-accent-purple/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-text-primary truncate">{t.title || 'Ohne Titel'}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.enabled ? 'bg-green-500/15 text-green-400' : 'bg-obsidian-600 text-text-muted'
                    }`}>
                      {t.enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-text-muted mb-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <FileText size={12} />{t.steps.length} Schritt{t.steps.length !== 1 ? 'e' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={12} />
                      {t.roles.map(r => (
                        <span key={r} className="px-1.5 py-0.5 rounded text-white text-xs font-medium" style={{ backgroundColor: getRoleColor(r) + 'cc' }}>{r}</span>
                      ))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleEnabled(t)}
                    className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-obsidian-700"
                    title={t.enabled ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {t.enabled ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => handleExportPDF(t)}
                    className="p-2 text-text-muted hover:text-accent-purple transition-colors rounded-lg hover:bg-accent-purple/10"
                    title="Als PDF exportieren"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleExportTutorial(t)}
                    className="p-2 text-text-muted hover:text-accent-blue transition-colors rounded-lg hover:bg-accent-blue/10"
                    title="Dieses Tutorial als JSON herunterladen"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={async () => {
                      setView('progress');
                      setEditTutorial(t);
                      await loadProgress(t.id);
                    }}
                    className="p-2 text-text-muted hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                    title="Nutzer-Fortschritt"
                  >
                    <Users size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditTutorial({ ...t });
                      setActiveTab('steps');
                      setCollapsedSteps(new Set(t.steps.slice(1).map(s => s.id)));
                      setView('edit');
                    }}
                    className="p-2 text-text-muted hover:text-accent-purple transition-colors rounded-lg hover:bg-accent-purple/10"
                    title="Bearbeiten"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                    title="Löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'progress' && editTutorial) {
    const progress = progressMap[editTutorial.id] || [];
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <button onClick={() => { setView('list'); setEditTutorial(null); }} className="text-text-muted hover:text-text-primary text-sm mb-1 flex items-center gap-1">
              <ArrowLeft size={14} /> Zurück
            </button>
            <h1 className="page-title">Nutzer-Fortschritt</h1>
            <p className="page-subtitle">{editTutorial.title}</p>
          </div>
          <button onClick={() => loadProgress(editTutorial.id)} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loadingProgress === editTutorial.id ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>
        <Notifications />
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-obsidian-700">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Nutzer</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Rolle</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Fortschritt</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-700/50">
              {users.filter(u => editTutorial.roles.includes(u.role)).map(u => {
                const p = progress.find(x => x.userId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-obsidian-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: u.avatarColor || '#7c3aed' }}>
                          {(u.displayName || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{u.displayName || u.username}</p>
                          <p className="text-xs text-text-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getRoleColor(u.role) + 'cc' }}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {!p ? <span className="text-xs text-text-muted">Nicht gestartet</span>
                        : p.completed ? <span className="flex items-center gap-1 text-xs text-green-400"><Check size={12} />Abgeschlossen</span>
                        : p.skipped ? <span className="text-xs text-yellow-400">Übersprungen</span>
                        : <span className="text-xs text-accent-purple">In Bearbeitung</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {p ? `${p.currentStep + 1} / ${editTutorial.steps.length}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p && (
                        <button
                          onClick={() => handleResetProgress(editTutorial.id, u.id)}
                          className="text-xs text-text-muted hover:text-accent-purple px-2 py-1 rounded hover:bg-accent-purple/10 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw size={11} />Neu starten
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.filter(u => editTutorial.roles.includes(u.role)).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">Keine Nutzer mit den ausgewählten Rollen gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'edit' && editTutorial) {
    const isNew = editTutorial.id.startsWith('new-');
    const selectedRole = roles.find(r =>
      editTutorial.roles.length > 0 &&
      (r.name === editTutorial.roles[0] || r.id === editTutorial.roles[0])
    );
    const readiness = {
      info: Boolean(editTutorial.title.trim() && editTutorial.roles.length > 0),
      steps: editTutorial.steps.length > 0 && editTutorial.steps.every(step => step.title.trim() && step.description.trim()),
      preview: editTutorial.steps.some(step => Boolean(step.image)),
    };

    return (
      <div className="space-y-0 animate-fade-in h-full flex flex-col">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-obsidian-700 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setView('list'); setEditTutorial(null); }}
              className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-obsidian-700 shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="page-title truncate">{isNew ? 'Neues Tutorial' : editTutorial.title || 'Tutorial bearbeiten'}</h1>
              <p className="page-subtitle text-xs">
                {editTutorial.roles.length > 0
                  ? `Rollen: ${editTutorial.roles.join(', ')}`
                  : 'Noch keine Rolle gewählt'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExportPDF(editTutorial)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download size={15} />PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Speichern
            </button>
          </div>
        </div>

          <Notifications />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
            {[
              { id: 'roles', number: '01', title: 'Rollen & Info', ready: readiness.info, text: 'Zielgruppe und Einstieg festlegen' },
              { id: 'steps', number: '02', title: 'Schritte bauen', ready: readiness.steps, text: 'Erklärung, Ziel und Screenshot ergänzen' },
              { id: 'preview', number: '03', title: 'Vorschau prüfen', ready: readiness.preview, text: 'Ablauf vor dem Speichern kontrollieren' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`text-left rounded-xl border p-3 transition-colors ${activeTab === item.id ? 'border-accent-purple bg-accent-purple/10' : 'border-obsidian-700 bg-obsidian-800 hover:border-obsidian-600'}`}
              >
                <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-text-muted"><span>{item.number}</span>{item.ready && <Check size={14} className="text-green-400" />}</span>
                <span className="block mt-1 text-sm font-semibold text-text-primary">{item.title}</span>
                <span className="block mt-1 text-xs text-text-muted">{item.text}</span>
              </button>
            ))}
          </div>

        {/* ── Main layout: left editor + right sidebar ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 flex-1">

          {/* ── LEFT: Tabs + Content ── */}
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-obsidian-800 rounded-xl p-1 w-fit">
                {([
                  { id: 'steps', label: 'Schritte', icon: FileText },
                  { id: 'roles', label: 'Rollen & Info', icon: Users },
                  { id: 'preview', label: 'Vorschau', icon: Eye },
                ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-accent-purple text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <tab.icon size={14} />{tab.label}
                  {tab.id === 'steps' && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                      {editTutorial.steps.length}
                    </span>
                  )}
                  {tab.id === 'roles' && editTutorial.roles.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                      {editTutorial.roles.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB: Rollen & Info ── */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                {/* Title + description */}
                <div className="card space-y-4">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <BookOpen size={15} className="text-accent-purple" />Tutorial-Informationen
                  </h2>
                  <div>
                    <label className="form-label">Titel *</label>
                    <input
                      type="text"
                      value={editTutorial.title}
                      onChange={e => setEditTutorial(p => p ? { ...p, title: e.target.value } : p)}
                      className="form-input"
                      placeholder="z.B. Erste Schritte in PodCore"
                    />
                  </div>
                  <div>
                    <label className="form-label">Beschreibung</label>
                    <textarea
                      value={editTutorial.description}
                      onChange={e => setEditTutorial(p => p ? { ...p, description: e.target.value } : p)}
                      className="form-input"
                      rows={3}
                      placeholder="Kurze Beschreibung des Tutorials..."
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-obsidian-800 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Tutorial aktiv</p>
                      <p className="text-xs text-text-muted">Wird Nutzern beim Login angezeigt</p>
                    </div>
                    <button
                      onClick={() => setEditTutorial(p => p ? { ...p, enabled: !p.enabled } : p)}
                      className="transition-colors"
                    >
                      {editTutorial.enabled
                        ? <ToggleRight size={28} className="text-green-400" />
                        : <ToggleLeft size={28} className="text-text-muted" />}
                    </button>
                  </div>
                </div>

                {/* Role selection */}
                <div className="card space-y-3">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <Users size={15} className="text-accent-purple" />
                    Rollen *
                    <span className="text-text-muted font-normal text-xs">(mehrere möglich)</span>
                  </h2>
                  {roles.length === 0 ? (
                    <p className="text-sm text-text-muted">Keine Rollen gefunden.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map(role => {
                        const sel = editTutorial.roles.includes(role.name) || editTutorial.roles.includes(role.id);
                        const color = role.color || getRoleColor(role.name);
                        return (
                          <button
                            key={role.id}
                            onClick={() => toggleRole(role.name || role.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                              sel
                                ? 'border-current bg-current/10'
                                : 'border-obsidian-600 bg-obsidian-800 hover:border-obsidian-500'
                            }`}
                            style={sel ? { borderColor: color, color } : {}}
                          >
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className={`text-sm font-medium ${sel ? '' : 'text-text-secondary'}`}>
                              {role.label || role.name}
                            </span>
                            {sel && <Check size={14} className="ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: Ergebnis-Vorschau ── */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="card border border-accent-purple/25 bg-accent-purple/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-accent-purple">Nutzeransicht</p>
                      <h2 className="mt-1 text-xl font-semibold text-text-primary">{editTutorial.title || 'Titel des Tutorials'}</h2>
                      <p className="mt-2 text-sm text-text-muted">{editTutorial.description || 'Eine kurze Einleitung hilft Nutzern beim Einstieg in das Tutorial.'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${editTutorial.enabled ? 'bg-green-500/15 text-green-400' : 'bg-obsidian-700 text-text-muted'}`}>
                      {editTutorial.enabled ? 'Wird angezeigt' : 'Noch deaktiviert'}
                    </span>
                  </div>
                </div>

                {editTutorial.steps.map((step, index) => (
                  <article key={step.id} className="card border border-obsidian-700">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs font-bold grid place-items-center shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-text-primary">{step.title || `Schritt ${index + 1}`}</h3>
                        <p className="mt-1 text-sm text-text-muted whitespace-pre-wrap">{step.description || 'Noch keine Beschreibung hinterlegt.'}</p>
                      </div>
                    </div>
                    {step.image ? (
                      <div className="relative mt-4 overflow-hidden rounded-xl border border-obsidian-700">
                        <img src={step.image} alt={`Vorschau zu Schritt ${index + 1}`} className="w-full max-h-72 object-cover object-top" />
                        {(step.annotations || []).map((annotation, annotationIndex) => (
                          <span
                            key={annotation.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white/80 text-white text-xs font-bold grid place-items-center shadow-lg"
                            style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, backgroundColor: ANN_COLORS[annotationIndex % ANN_COLORS.length] }}
                          >
                            {annotation.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-amber-300">Für diesen Schritt ist noch kein Screenshot hinterlegt.</p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {/* ── TAB: Schritte ── */}
            {activeTab === 'steps' && (
              <div className="space-y-3">
                {editTutorial.steps.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs text-text-muted">{editTutorial.steps.length} Schritte · Änderungen werden erst mit „Speichern“ übernommen.</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCollapsedSteps(new Set(editTutorial.steps.map(s => s.id)))}
                        className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-obsidian-800"
                      >
                        Alle einklappen
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollapsedSteps(new Set())}
                        className="text-xs text-accent-purple hover:text-accent-purple/80 px-2 py-1 rounded hover:bg-accent-purple/10"
                      >
                        Alle ausklappen
                      </button>
                    </div>
                  </div>
                )}

                {editTutorial.steps.length === 0 && (
                  <div className="card text-center py-10">
                    <FileText size={32} className="mx-auto mb-3 text-text-muted opacity-40" />
                    <p className="text-text-muted text-sm">Noch keine Schritte. Füge den ersten Schritt hinzu.</p>
                  </div>
                )}

                {editTutorial.steps.map((step, idx) => {
                  const isCollapsed = collapsedSteps.has(step.id);
                  return (
                    <div
                      key={step.id}
                      className="card border border-obsidian-700 hover:border-obsidian-600 transition-colors"
                    >
                      {/* Step header */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-7 h-7 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center text-accent-purple text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {isCollapsed ? (
                            <p className="text-sm font-medium text-text-primary truncate">
                              {step.title || <span className="text-text-muted italic">Ohne Titel</span>}
                            </p>
                          ) : (
                            <input
                              type="text"
                              value={step.title}
                              onChange={e => updateStep(step.id, { title: e.target.value })}
                              onFocus={() => setHighlightedTarget(step.target || null)}
                              onBlur={() => setHighlightedTarget(null)}
                              className="form-input text-sm py-1.5"
                              placeholder={`Schritt ${idx + 1} Titel...`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => moveStep(step.id, -1)}
                            disabled={idx === 0}
                            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors rounded hover:bg-obsidian-700"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveStep(step.id, 1)}
                            disabled={idx === editTutorial.steps.length - 1}
                            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors rounded hover:bg-obsidian-700"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => toggleStep(step.id)}
                            className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-obsidian-700"
                          >
                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <button
                            onClick={() => removeStep(step.id)}
                            className="p-1.5 text-text-muted hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Step body (expanded) */}
                      {!isCollapsed && (
                        <div className="mt-4 space-y-4 border-t border-obsidian-700 pt-4">
                          {/* Description */}
                          <div>
                            <label className="form-label text-xs">Beschreibung</label>
                            <textarea
                              value={step.description}
                              onChange={e => updateStep(step.id, { description: e.target.value })}
                              className="form-input text-sm"
                              rows={3}
                              placeholder="Erkläre was der Nutzer in diesem Schritt tun soll. Verwende [1], [2] um auf Annotationspunkte zu verweisen."
                            />
                            <p className="text-xs text-text-muted mt-1">
                              Tipp: Verwende <code className="bg-obsidian-700 px-1 rounded text-accent-purple">[1]</code> <code className="bg-obsidian-700 px-1 rounded text-accent-purple">[2]</code> um auf Annotationspunkte zu verweisen.
                            </p>
                          </div>

                          {/* Target + Position + Interaction */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="form-label text-xs">Ziel-Element</label>
                              <select
                                value={step.target || ''}
                                onChange={e => {
                                  updateStep(step.id, { target: e.target.value });
                                  setHighlightedTarget(e.target.value || null);
                                }}
                                onFocus={() => setHighlightedTarget(step.target || null)}
                                onBlur={() => setHighlightedTarget(null)}
                                className="form-input text-sm"
                              >
                                <option value="">— Kein Ziel —</option>
                                {PAGE_ROUTES.map(r => (
                                  <option key={r.tutorialId} value={r.tutorialId}>{r.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label text-xs">Position</label>
                              <select
                                value={step.position || 'bottom'}
                                onChange={e => updateStep(step.id, { position: e.target.value as any })}
                                className="form-input text-sm"
                              >
                                <option value="bottom">Unten</option>
                                <option value="top">Oben</option>
                                <option value="left">Links</option>
                                <option value="right">Rechts</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label text-xs">Interaktion</label>
                              <select
                                value={step.interaction || 'guide'}
                                onChange={e => updateStep(step.id, { interaction: e.target.value as 'guide' | 'click' | 'confirm' })}
                                className="form-input text-sm"
                              >
                                <option value="guide">Hinweis &amp; weiter</option>
                                <option value="click" disabled={!step.target}>Klick auf Ziel abwarten</option>
                                <option value="confirm">Schritt bestätigen</option>
                              </select>
                              <p className="text-[11px] text-text-muted mt-1">{step.interaction === 'click' ? 'Der nächste Schritt folgt erst nach dem Klick auf das markierte Ziel.' : step.interaction === 'confirm' ? 'Der Nutzer bestätigt bewusst, dass die Aufgabe erledigt ist.' : 'Der Hinweis wird gezeigt; der Nutzer steuert den nächsten Schritt selbst.'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-obsidian-700 bg-obsidian-800/60 p-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">Klickziel aufzeichnen</p>
                              <p className="mt-1 text-xs text-text-muted">Optional: Navigiere zur Zielseite, klicke ein vorbereitetes Bedienelement an und ergänze den Call-out. Screenshots sind dafür nicht erforderlich.</p>
                            </div>
                            <button type="button" onClick={() => handleStartRecording(step.id)} className="btn-secondary flex items-center gap-2 text-sm"><MousePointerClick size={15} /> Klick aufzeichnen</button>
                          </div>

                          {/* Screenshot */}
                          <div>
                            <label className="form-label text-xs flex items-center gap-2">
                              <Camera size={12} />Screenshot
                            </label>
                            {step.image ? (
                              <div className="relative rounded-xl overflow-hidden border border-obsidian-600 group">
                                <img
                                  src={step.image}
                                  alt="Screenshot"
                                  className="w-full max-h-48 object-cover object-top"
                                />
                                {/* Annotation overlays */}
                                {step.annotations?.map((ann, i) => (
                                  <div
                                    key={ann.id}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white/80"
                                    style={{
                                      left: `${ann.x}%`,
                                      top: `${ann.y}%`,
                                      backgroundColor: ANN_COLORS[i % ANN_COLORS.length],
                                    }}
                                  >
                                    {ann.label}
                                  </div>
                                ))}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => handleStartScreenshot(step.id)}
                                    className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs font-medium hover:bg-accent-purple/80 transition-colors"
                                  >
                                    Neu aufnehmen
                                  </button>
                                  <button
                                    onClick={() => updateStep(step.id, { image: '', annotations: [] })}
                                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                                  >
                                    Entfernen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartScreenshot(step.id)}
                                className="border-2 border-dashed border-obsidian-600 hover:border-accent-purple/60 rounded-xl p-6 text-center cursor-pointer transition-colors group"
                              >
                                <Camera size={20} className="mx-auto mb-2 text-text-muted group-hover:text-accent-purple transition-colors" />
                                <p className="text-sm text-text-muted group-hover:text-text-secondary transition-colors font-medium">Optionalen Screenshot aufnehmen</p>
                                <p className="text-xs text-text-muted mt-1">Für Website, PDF und JSON-Download empfohlen – die App-Führung funktioniert auch ohne Bild.</p>
                              </div>
                            )}

                            {/* Annotation descriptions */}
                            {step.annotations && step.annotations.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Annotationspunkte</p>
                                {step.annotations.map((ann, i) => (
                                  <div key={ann.id} className="flex items-center gap-3 p-2.5 bg-obsidian-800 rounded-lg border border-obsidian-700">
                                    <span
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                      style={{ backgroundColor: ANN_COLORS[i % ANN_COLORS.length] }}
                                    >
                                      {ann.label}
                                    </span>
                                    <input
                                      type="text"
                                      value={ann.description}
                                      onChange={e => updateStep(step.id, {
                                        annotations: step.annotations!.map(a =>
                                          a.id === ann.id ? { ...a, description: e.target.value } : a
                                        ),
                                      })}
                                      className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                                      placeholder={`Beschreibung für Punkt ${ann.label}...`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Allow skip */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id={`skip-${step.id}`}
                              checked={step.allowSkip !== false}
                              onChange={e => updateStep(step.id, { allowSkip: e.target.checked })}
                              className="rounded accent-accent-purple"
                            />
                            <label htmlFor={`skip-${step.id}`} className="text-sm text-text-secondary cursor-pointer">
                              Überspringen erlaubt
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add step button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={addStep}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-obsidian-600 hover:border-accent-purple/50 rounded-xl text-text-muted hover:text-accent-purple transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />Schritt hinzufügen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRecording()}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-accent-purple/50 hover:border-accent-purple rounded-xl text-accent-purple hover:bg-accent-purple/10 transition-colors text-sm font-medium"
                  >
                    <MousePointerClick size={16} />Schritt durch Klick aufzeichnen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Menu Preview ── */}
          <div className="space-y-4">
            <div className="card sticky top-4">
              <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-4 text-sm">
                <Eye size={15} className="text-accent-purple" />Menü-Vorschau
              </h2>
              {editTutorial.roles.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Wähle zuerst eine Rolle im Tab „Rollen & Info"</p>
                  <button
                    onClick={() => setActiveTab('roles')}
                    className="mt-3 text-xs text-accent-purple hover:underline"
                  >
                    Zur Rollen-Auswahl →
                  </button>
                </div>
              ) : selectedRole ? (
                <>
                  <p className="text-xs text-text-muted mb-3">
                    Ansicht für: <strong className="text-text-secondary">{selectedRole.label || selectedRole.name}</strong>
                    {editTutorial.roles.length > 1 && (
                      <span className="ml-1 text-text-muted">+{editTutorial.roles.length - 1} weitere</span>
                    )}
                  </p>
                  <RoleMenuPreview
                    role={selectedRole.name || selectedRole.id}
                    permissions={selectedRole.permissions}
                    roleLabel={selectedRole.label || selectedRole.name}
                    roleColor={selectedRole.color || getRoleColor(selectedRole.name)}
                    highlightedTarget={highlightedTarget}
                  />
                </>
              ) : (
                <p className="text-xs text-text-muted text-center py-4">Rolle nicht in der Datenbank gefunden.</p>
              )}
            </div>

            {/* Quick info card */}
            <div className="card bg-accent-purple/5 border-accent-purple/20 space-y-2">
              <h3 className="text-xs font-semibold text-accent-purple uppercase tracking-wide">Tipps</h3>
              <ul className="space-y-1.5 text-xs text-text-muted">
                <li className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-accent-purple" />Klicke auf ein Ziel-Element um es in der Vorschau hervorzuheben</li>
                <li className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-accent-purple" />Verwende <code className="bg-obsidian-700 px-1 rounded">[1]</code> im Text um auf Annotationspunkte zu verweisen</li>
                <li className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-accent-purple" />Screenshots zeigen die Ansicht der gewählten Rolle</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
