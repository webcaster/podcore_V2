import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Send, Upload, Camera,
  FileText, ChevronDown, ChevronUp, Users, CheckCircle,
  XCircle, Clock, RefreshCw, BookOpen, Info, Copy, Check,
  RotateCcw, Download, Tag, AlertCircle, GripVertical,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ScreenshotAnnotator from '../components/tutorials/ScreenshotAnnotator';
import RoleMenuPreview from '../components/tutorials/RoleMenuPreview';
import jsPDF from 'jspdf';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  highlightColor?: string;
  allowSkip?: boolean;
}

interface Tutorial {
  id: string;
  role: string;
  title: string;
  description: string;
  enabled: boolean;
  steps: TutorialStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface UserProgress {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  completed: boolean;
  completedAt?: string;
  skipped: boolean;
  currentStep: number;
  updatedAt: string;
}

// ─── Selector Reference ─────────────────────────────────────────────────────

const SELECTOR_GROUPS = [
  {
    group: 'Navigation',
    items: [
      { id: 'nav-dashboard', label: 'Dashboard' },
      { id: 'nav-episodes', label: 'Episoden' },
      { id: 'nav-episodes-dashboard', label: 'Episoden-Dashboard' },
      { id: 'nav-approvals', label: 'Freigabe-Center' },
      { id: 'nav-editorial', label: 'Redaktions-Hub' },
      { id: 'nav-calendar', label: 'Redaktionskalender' },
      { id: 'nav-chat', label: 'Team-Chat' },
      { id: 'nav-media', label: 'Media Library' },
      { id: 'nav-sponsors', label: 'Sponsoring' },
      { id: 'nav-sponsors-calendar', label: 'Buchungskalender' },
      { id: 'nav-sponsors-reports', label: 'Sponsor-Auswertungen' },
      { id: 'nav-seasons', label: 'Staffeln' },
      { id: 'nav-archive', label: 'Archiv' },
      { id: 'nav-analytics', label: 'Podigee Analytics' },
      { id: 'nav-stats', label: 'Podcast-Statistiken' },
      { id: 'nav-branding', label: 'Branding & Backup' },
      { id: 'nav-admin', label: 'Administration' },
      { id: 'nav-tutorials', label: 'Tutorial-Verwaltung' },
      { id: 'nav-pdf-layouts', label: 'PDF-Layouts' },
      { id: 'nav-settings', label: 'Einstellungen' },
    ],
  },
  {
    group: 'Sidebar',
    items: [
      { id: 'sidebar', label: 'Sidebar (gesamt)' },
      { id: 'sidebar-nav', label: 'Navigationsbereich' },
      { id: 'sidebar-user-info', label: 'Benutzer-Info' },
    ],
  },
  {
    group: 'Seiten',
    items: [
      { id: 'page-dashboard', label: 'Dashboard-Seite' },
      { id: 'dashboard-header', label: 'Dashboard-Header' },
      { id: 'page-episodes', label: 'Episoden-Seite' },
      { id: 'episodes-header', label: 'Episoden-Header' },
      { id: 'page-editorial', label: 'Redaktions-Hub-Seite' },
      { id: 'editorial-header', label: 'Redaktions-Hub-Header' },
      { id: 'editorial-tabs', label: 'Redaktions-Hub-Tabs' },
      { id: 'page-admin', label: 'Admin-Seite' },
      { id: 'admin-header', label: 'Admin-Header' },
      { id: 'admin-tabs', label: 'Admin-Tabs' },
      { id: 'main-content', label: 'Hauptinhalt' },
    ],
  },
  {
    group: 'Aktions-Buttons',
    items: [
      { id: 'btn-create-episode', label: 'Neue Episode erstellen' },
      { id: 'btn-create-idea', label: 'Neue Idee erstellen' },
    ],
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TutorialsManagementPage() {
  const { user, can, showSuccess, showError } = useApp();

  // Data
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'selectors'>('overview');
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [expandedTutorial, setExpandedTutorial] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress[]>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({ role: 'editor', title: '', description: '', enabled: true });
  const [steps, setSteps] = useState<TutorialStep[]>([]);

  // Screenshot
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotTargetStep, setScreenshotTargetStep] = useState<string | null>(null);

  // Menu preview
  const [showMenuPreview, setShowMenuPreview] = useState(true);
  const [menuPreviewHighlight, setMenuPreviewHighlight] = useState<string | null>(null);
  const [activeStepForPreview, setActiveStepForPreview] = useState<string | null>(null);

  // Selector copy feedback
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);

  // Reinit state
  const [reinitTutorialId, setReinitTutorialId] = useState<string | null>(null);
  const [reinitUserId, setReinitUserId] = useState<string | null>(null);
  const [reinitTheme, setReinitTheme] = useState<'dark' | 'light'>('dark');
  const [isReiniting, setIsReiniting] = useState(false);

  const DEFAULT_ROLES = [
    { name: 'editor', label: 'Redakteur' },
    { name: 'moderator', label: 'Moderator' },
    { name: 'producer', label: 'Produktion' },
    { name: 'admin', label: 'Administrator' },
  ];
  const ROLES = roles.length > 0 ? roles : DEFAULT_ROLES;

  const POSITIONS = [
    { value: 'top', label: 'Oben' },
    { value: 'bottom', label: 'Unten' },
    { value: 'left', label: 'Links' },
    { value: 'right', label: 'Rechts' },
  ];

  // ─── Load data ─────────────────────────────────────────────────────────────

  const loadTutorials = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/tutorials', { credentials: 'include' });
      if (res.ok) setTutorials(await res.json());
    } catch { showError('Fehler beim Laden der Tutorials'); }
    finally { setIsLoading(false); }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles', { credentials: 'include' });
      if (res.ok) setRoles(await res.json());
    } catch { setRoles(DEFAULT_ROLES); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  const loadProgressForTutorial = async (tutorialId: string) => {
    if (userProgress[tutorialId] || loadingProgress[tutorialId]) return;
    setLoadingProgress(p => ({ ...p, [tutorialId]: true }));
    try {
      const res = await fetch(`/api/admin/tutorials/${tutorialId}/progress`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserProgress(p => ({ ...p, [tutorialId]: data }));
      }
    } catch {}
    finally { setLoadingProgress(p => ({ ...p, [tutorialId]: false })); }
  };

  useEffect(() => {
    if (can('canManageSettings')) {
      loadTutorials();
      loadUsers();
      loadRoles();
    }
  }, []);

  // ─── Tutorial CRUD ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.title || steps.length === 0) {
      showError('Titel und mindestens ein Schritt erforderlich');
      return;
    }
    try {
      const method = editingTutorial ? 'PUT' : 'POST';
      const url = editingTutorial ? `/api/tutorials/${editingTutorial.id}` : '/api/tutorials';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, steps }),
      });
      if (res.ok) {
        showSuccess(editingTutorial ? 'Tutorial aktualisiert' : 'Tutorial erstellt');
        await loadTutorials();
        resetForm();
        setActiveTab('overview');
      } else showError('Fehler beim Speichern');
    } catch { showError('Fehler beim Speichern'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Dieses Tutorial wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/tutorials/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { showSuccess('Tutorial gelöscht'); loadTutorials(); }
      else showError('Fehler beim Löschen');
    } catch { showError('Fehler beim Löschen'); }
  };

  const handleToggleEnabled = async (tutorial: Tutorial) => {
    try {
      await fetch(`/api/tutorials/${tutorial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...tutorial, enabled: !tutorial.enabled }),
      });
      loadTutorials();
    } catch {}
  };

  const resetForm = () => {
    setEditingTutorial(null);
    const defaultRole = ROLES[0]?.name || 'editor';
    setFormData({ role: defaultRole, title: '', description: '', enabled: true });
    setSteps([]);
  };

  const startEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({ role: tutorial.role, title: tutorial.title, description: tutorial.description, enabled: tutorial.enabled });
    setSteps(tutorial.steps);
    setActiveTab('edit');
  };

  // ─── Steps ─────────────────────────────────────────────────────────────────

  const addStep = () => {
    setSteps(prev => [...prev, {
      id: Date.now().toString(),
      title: '',
      description: '',
      position: 'bottom',
      highlightColor: '#9333ea',
      allowSkip: true,
    }]);
  };

  const updateStep = (id: string, updates: Partial<TutorialStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const moveStep = (id: string, dir: 'up' | 'down') => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // ─── Reinit (Admin only, to restart tutorial for a user) ───────────────────

  const handleReinit = async () => {
    if (!reinitTutorialId || !reinitUserId) return;
    setIsReiniting(true);
    try {
      const res = await fetch(`/api/admin/tutorials/${reinitTutorialId}/initialize/${reinitUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: reinitTheme }),
      });
      if (res.ok) {
        showSuccess('Tutorial für Nutzer neu gestartet');
        setReinitTutorialId(null);
        setReinitUserId(null);
        // Refresh progress
        setUserProgress(p => { const n = { ...p }; delete n[reinitTutorialId!]; return n; });
        if (expandedTutorial === reinitTutorialId) loadProgressForTutorial(reinitTutorialId);
      } else showError('Fehler beim Neustarten');
    } catch { showError('Fehler beim Neustarten'); }
    finally { setIsReiniting(false); }
  };

  // ─── PDF Export ─────────────────────────────────────────────────────────────

  const exportTutorialPDF = async (tutorial: Tutorial) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Title page
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PodCore', margin, 40);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('Tutorial-Dokumentation', margin, 52);
    doc.setDrawColor(147, 51, 234);
    doc.setLineWidth(0.5);
    doc.line(margin, 58, pageW - margin, 58);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(tutorial.title, margin, 75);
    const roleLabel = ROLES.find(r => r.name === tutorial.role)?.label || tutorial.role;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 200);
    doc.text(`Rolle: ${roleLabel}`, margin, 88);
    if (tutorial.description) {
      doc.setFontSize(11);
      doc.setTextColor(200, 200, 220);
      const descLines = doc.splitTextToSize(tutorial.description, contentW);
      doc.text(descLines, margin, 100);
    }
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 140);
    doc.text(`Erstellt: ${new Date(tutorial.updatedAt).toLocaleDateString('de-DE')}`, margin, pageH - 20);
    doc.text(`${tutorial.steps.length} Schritte`, margin, pageH - 14);

    // Steps pages
    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i];
      doc.addPage();
      y = margin;

      // Step header
      doc.setFillColor(147, 51, 234);
      doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Schritt ${i + 1} von ${tutorial.steps.length}`, margin + 4, y + 8);
      y += 18;

      // Step title
      doc.setTextColor(30, 30, 50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(step.title || `Schritt ${i + 1}`, contentW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      // Target selector
      if (step.target) {
        doc.setFillColor(240, 240, 250);
        doc.roundedRect(margin, y, contentW, 9, 1, 1, 'F');
        doc.setTextColor(100, 50, 180);
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.text(`Selektor: [data-tutorial-id="${step.target.replace('[data-tutorial-id="', '').replace('"]', '')}"]`, margin + 3, y + 6);
        doc.setFont('helvetica', 'normal');
        y += 14;
      }

      // Description
      if (step.description) {
        doc.setTextColor(60, 60, 80);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(step.description, contentW);
        doc.text(descLines, margin, y);
        y += descLines.length * 5.5 + 6;
      }

      // Image
      if (step.image) {
        try {
          const imgType = step.image.includes('image/png') ? 'PNG' : 'JPEG';
          const maxImgH = 120;
          const imgW = contentW;
          addPageIfNeeded(maxImgH + 10);
          doc.addImage(step.image, imgType, margin, y, imgW, maxImgH, undefined, 'FAST');
          y += maxImgH + 6;
        } catch {}
      }

      // Footer
      doc.setTextColor(150, 150, 170);
      doc.setFontSize(8);
      doc.text(`PodCore Tutorial — ${tutorial.title}`, margin, pageH - 8);
      doc.text(`Seite ${i + 2}`, pageW - margin - 15, pageH - 8);
    }

    doc.save(`Tutorial_${tutorial.title.replace(/\s+/g, '_')}.pdf`);
    showSuccess('PDF exportiert');
  };

  // ─── Selector copy ──────────────────────────────────────────────────────────

  const copySelector = (id: string) => {
    const selector = `[data-tutorial-id="${id}"]`;
    navigator.clipboard.writeText(selector).then(() => {
      setCopiedSelector(id);
      setTimeout(() => setCopiedSelector(null), 2000);
    });
  };

  // ─── Role label helper ──────────────────────────────────────────────────────

  const roleLabel = (role: string) => ROLES.find(r => r.name === role)?.label || role;

  // ─── Group tutorials by role ────────────────────────────────────────────────

  const tutorialsByRole = ROLES.reduce((acc, role) => {
    acc[role.name] = tutorials.filter(t => t.role === role.name);
    return acc;
  }, {} as Record<string, Tutorial[]>);

  // ─── Guard ─────────────────────────────────────────────────────────────────

  if (!can('canManageSettings')) {
    return <div className="text-center py-12 text-text-secondary">Keine Berechtigung</div>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div data-tutorial-id="page-tutorials" className="space-y-6 animate-fade-in">

      {/* Screenshot Annotator Modal */}
      {showScreenshot && (
        <ScreenshotAnnotator
          existingImage={screenshotTargetStep ? steps.find(s => s.id === screenshotTargetStep)?.image : undefined}
          onCapture={(img) => {
            if (screenshotTargetStep) updateStep(screenshotTargetStep, { image: img });
            setShowScreenshot(false);
            setScreenshotTargetStep(null);
          }}
          onClose={() => { setShowScreenshot(false); setScreenshotTargetStep(null); }}
        />
      )}

      {/* Reinit Confirm Modal */}
      {reinitTutorialId && reinitUserId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-obsidian-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <RotateCcw size={18} className="text-accent-orange" />
              Tutorial neu starten
            </h3>
            <p className="text-text-secondary text-sm">
              Das Einstiegs-Tutorial wird für <strong className="text-text-primary">
                {users.find(u => u.id === reinitUserId)?.name || reinitUserId}
              </strong> zurückgesetzt und startet beim nächsten Login erneut.
            </p>
            <div>
              <label className="label">Design beim Start</label>
              <select value={reinitTheme} onChange={e => setReinitTheme(e.target.value as any)} className="input">
                <option value="dark">Dunkles Design</option>
                <option value="light">Helles Design</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleReinit} disabled={isReiniting} className="btn-primary flex items-center gap-2">
                <RotateCcw size={14} />
                {isReiniting ? 'Wird gestartet...' : 'Neu starten'}
              </button>
              <button onClick={() => { setReinitTutorialId(null); setReinitUserId(null); }} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BookOpen size={24} className="text-accent-purple" />
            Tutorial-Verwaltung
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Einstiegs-Tutorials pro Rolle erstellen — dienen gleichzeitig als Wiki für alle Nutzer
          </p>
        </div>
        {activeTab === 'overview' && (
          <button
            onClick={() => { resetForm(); setActiveTab('edit'); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Neues Tutorial
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Übersicht', icon: <BookOpen size={14} /> },
          { key: 'edit', label: editingTutorial ? 'Bearbeiten' : 'Neues Tutorial', icon: <Edit2 size={14} /> },
          { key: 'selectors', label: 'Selektor-Referenz', icon: <Tag size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-purple text-white shadow-glow-purple'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tutorials.length === 0 ? (
            <div className="card text-center py-16">
              <BookOpen size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary font-medium">Noch keine Tutorials vorhanden</p>
              <p className="text-text-muted text-sm mt-1">Erstelle das erste Einstiegs-Tutorial für eine Rolle</p>
              <button onClick={() => { resetForm(); setActiveTab('edit'); }} className="btn-primary mt-4 mx-auto">
                <Plus size={16} /> Erstes Tutorial erstellen
              </button>
            </div>
          ) : (
            ROLES.map(role => {
              const roleTutorials = tutorialsByRole[role.name] || [];
              if (roleTutorials.length === 0) return null;
              return (
                <div key={role.name} className="space-y-3">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    {role.label}
                    <span className="text-xs normal-case bg-surface-raised px-2 py-0.5 rounded-full">
                      {roleTutorials.length} Tutorial{roleTutorials.length !== 1 ? 's' : ''}
                    </span>
                  </h2>

                  {roleTutorials.map((tutorial: Tutorial) => {
                    const isExpanded = expandedTutorial === tutorial.id;
                    const progress = userProgress[tutorial.id];

                    return (
                      <div key={tutorial.id} className="card overflow-hidden">
                        {/* Tutorial Header Row */}
                        <div className="flex items-start gap-4">
                          {/* Status indicator */}
                          <div className={`w-2 h-full self-stretch rounded-full flex-shrink-0 ${tutorial.enabled ? 'bg-green-500' : 'bg-surface-border'}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-text-primary">{tutorial.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                tutorial.enabled
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-surface-raised text-text-muted'
                              }`}>
                                {tutorial.enabled ? 'Aktiv' : 'Inaktiv'}
                              </span>
                              <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full">
                                {tutorial.steps.length} Schritte
                              </span>
                            </div>
                            {tutorial.description && (
                              <p className="text-sm text-text-secondary mt-1">{tutorial.description}</p>
                            )}
                            <p className="text-xs text-text-muted mt-1">
                              Zuletzt geändert: {new Date(tutorial.updatedAt).toLocaleDateString('de-DE')}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => exportTutorialPDF(tutorial)}
                              className="p-2 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors"
                              title="Als PDF exportieren"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleEnabled(tutorial)}
                              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
                              title={tutorial.enabled ? 'Deaktivieren' : 'Aktivieren'}
                            >
                              {tutorial.enabled ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} />}
                            </button>
                            <button
                              onClick={() => startEdit(tutorial)}
                              className="p-2 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors"
                              title="Bearbeiten"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(tutorial.id)}
                              className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedTutorial(null);
                                } else {
                                  setExpandedTutorial(tutorial.id);
                                  loadProgressForTutorial(tutorial.id);
                                }
                              }}
                              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
                              title="Nutzer-Status anzeigen"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded: User Progress */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-surface-border">
                            <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                              <Users size={14} className="text-accent-purple" />
                              Nutzer-Status
                              {loadingProgress[tutorial.id] && (
                                <div className="w-3 h-3 border border-accent-purple border-t-transparent rounded-full animate-spin" />
                              )}
                            </h4>

                            {!progress || progress.length === 0 ? (
                              <div className="text-sm text-text-muted py-3 text-center bg-obsidian-900 rounded-lg">
                                Noch kein Nutzer hat dieses Tutorial gestartet
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {progress.map(p => (
                                  <div key={p.userId} className="flex items-center gap-3 p-3 bg-obsidian-900 rounded-lg">
                                    {/* Status icon */}
                                    <div className="flex-shrink-0">
                                      {p.completed ? (
                                        <CheckCircle size={16} className="text-green-400" />
                                      ) : p.skipped ? (
                                        <XCircle size={16} className="text-yellow-400" />
                                      ) : (
                                        <Clock size={16} className="text-text-muted" />
                                      )}
                                    </div>

                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-text-primary truncate">
                                        {p.displayName || p.username}
                                      </p>
                                      <p className="text-xs text-text-muted">
                                        {p.completed
                                          ? `Abgeschlossen am ${new Date(p.completedAt!).toLocaleDateString('de-DE')}`
                                          : p.skipped
                                          ? 'Übersprungen'
                                          : p.currentStep > 0
                                          ? `In Bearbeitung (Schritt ${p.currentStep + 1})`
                                          : 'Noch nicht gestartet'}
                                      </p>
                                    </div>

                                    {/* Reinit button */}
                                    <button
                                      onClick={() => { setReinitTutorialId(tutorial.id); setReinitUserId(p.userId); }}
                                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-accent-orange hover:bg-accent-orange/10 rounded-lg transition-colors flex-shrink-0"
                                      title="Tutorial für diesen Nutzer neu starten"
                                    >
                                      <RotateCcw size={12} />
                                      Neu starten
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Users who haven't started */}
                            {(() => {
                              const startedIds = new Set((progress || []).map(p => p.userId));
                              const notStarted = users.filter(u => !startedIds.has(u.id) && u.role === tutorial.role);
                              if (notStarted.length === 0) return null;
                              return (
                                <div className="mt-3">
                                  <p className="text-xs text-text-muted mb-2">Noch nicht gestartet:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {notStarted.map(u => (
                                      <span key={u.id} className="text-xs bg-surface-raised text-text-muted px-2 py-1 rounded-full flex items-center gap-1">
                                        <Clock size={10} />
                                        {u.name || u.username}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: EDIT ────────────────────────────────────────────────────────── */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          <div className="card space-y-5">
            <h2 className="text-lg font-semibold text-text-primary">
              {editingTutorial ? `Tutorial bearbeiten: ${editingTutorial.title}` : 'Neues Tutorial erstellen'}
            </h2>

          {/* Role Menu Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label flex items-center gap-2">
                <Eye size={14} className="text-accent-purple" />
                Menü-Ansicht für Rolle: <span className="text-accent-purple font-semibold">{ROLES.find(r => r.name === formData.role)?.label || formData.role}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowMenuPreview(p => !p)}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                {showMenuPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showMenuPreview ? 'Ausblenden' : 'Einblenden'}
              </button>
            </div>
            {showMenuPreview && (
              <RoleMenuPreview
                role={formData.role}
                highlightId={menuPreviewHighlight || undefined}
                onSelectItem={(id) => {
                  const selector = `[data-tutorial-id="${id}"]`;
                  if (activeStepForPreview) {
                    updateStep(activeStepForPreview, { target: selector });
                  }
                  setMenuPreviewHighlight(id);
                }}
              />
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Rolle *</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input">
                  {ROLES.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Titel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="z.B. Willkommen bei PodCore"
                />
              </div>
            </div>

            <div>
              <label className="label">Beschreibung</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="textarea"
                rows={2}
                placeholder="Kurze Beschreibung — wird Nutzern als Einleitung angezeigt"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 accent-accent-purple"
              />
              <span className="text-sm text-text-secondary">Tutorial aktiv (startet automatisch für neue Nutzer)</span>
            </label>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Info size={16} className="text-accent-purple" />
                Schritte ({steps.length})
              </h3>
              <button onClick={addStep} className="btn-secondary text-sm flex items-center gap-2">
                <Plus size={14} /> Schritt hinzufügen
              </button>
            </div>

            {steps.length === 0 && (
              <div className="card text-center py-8 border-dashed">
                <p className="text-text-muted text-sm">Noch keine Schritte. Füge den ersten Schritt hinzu.</p>
              </div>
            )}

            {steps.map((step, index) => (
              <div key={step.id} className="card space-y-4 border-l-2 border-accent-purple/40">
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="font-medium text-text-primary text-sm">
                      {step.title || `Schritt ${index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0} className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveStep(step.id, 'down')} disabled={index === steps.length - 1} className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => deleteStep(step.id)} className="p-1.5 text-text-muted hover:text-red-400 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Step Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Titel</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={e => updateStep(step.id, { title: e.target.value })}
                      placeholder="Schritt-Titel"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label text-xs flex items-center gap-1">
                      Ziel-Element
                      <span className="text-text-muted font-normal">(Selektor-Tab für Hilfe)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={step.target || ''}
                        onChange={e => {
                          updateStep(step.id, { target: e.target.value });
                          // Sync highlight: extract id from selector
                          const match = e.target.value.match(/data-tutorial-id="([^"]+)"/);
                          if (match) setMenuPreviewHighlight(match[1]);
                        }}
                        onFocus={() => {
                          setActiveStepForPreview(step.id);
                          const match = (step.target || '').match(/data-tutorial-id="([^"]+)"/);
                          if (match) setMenuPreviewHighlight(match[1]);
                        }}
                        placeholder='[data-tutorial-id="nav-dashboard"]'
                        className="input text-sm font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Beschreibung</label>
                  <textarea
                    value={step.description}
                    onChange={e => updateStep(step.id, { description: e.target.value })}
                    placeholder="Erkläre dem Nutzer was er hier sieht oder tun soll..."
                    className="textarea text-sm"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="label text-xs">Position</label>
                    <select
                      value={step.position || 'bottom'}
                      onChange={e => updateStep(step.id, { position: e.target.value as any })}
                      className="input text-sm"
                    >
                      {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Hervorhebungsfarbe</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={step.highlightColor || '#9333ea'}
                        onChange={e => updateStep(step.id, { highlightColor: e.target.value })}
                        className="w-10 h-9 rounded border border-surface-border cursor-pointer bg-transparent"
                      />
                      <span className="text-xs text-text-muted font-mono">{step.highlightColor || '#9333ea'}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer mt-5">
                      <input
                        type="checkbox"
                        checked={step.allowSkip !== false}
                        onChange={e => updateStep(step.id, { allowSkip: e.target.checked })}
                        className="w-4 h-4 accent-accent-purple"
                      />
                      <span className="text-sm text-text-secondary">Überspringen erlauben</span>
                    </label>
                  </div>
                </div>

                {/* Image / Screenshot */}
                <div className="space-y-2">
                  <label className="label text-xs">Bild / Screenshot</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setScreenshotTargetStep(step.id); setShowScreenshot(true); }}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <Camera size={14} />
                      Screenshot aufnehmen
                    </button>
                    <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer">
                      <Upload size={14} />
                      Bild hochladen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => updateStep(step.id, { image: ev.target?.result as string });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {step.image && (
                      <button
                        type="button"
                        onClick={() => updateStep(step.id, { image: undefined })}
                        className="btn-ghost text-sm text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Bild entfernen
                      </button>
                    )}
                  </div>
                  {step.image && (
                    <div className="relative inline-block mt-2">
                      <img
                        src={step.image}
                        alt="Vorschau"
                        className="max-w-sm max-h-48 rounded-lg border border-surface-border object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Check size={16} />
              {editingTutorial ? 'Änderungen speichern' : 'Tutorial erstellen'}
            </button>
            <button
              onClick={() => { resetForm(); setActiveTab('overview'); }}
              className="btn-secondary"
            >
              Abbrechen
            </button>
            {editingTutorial && (
              <button
                onClick={() => exportTutorialPDF(editingTutorial)}
                className="btn-ghost flex items-center gap-2 text-text-muted hover:text-accent-purple ml-auto"
              >
                <Download size={14} /> Als PDF exportieren
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SELECTORS ───────────────────────────────────────────────────── */}
      {activeTab === 'selectors' && (
        <div className="space-y-4">
          <div className="card bg-accent-purple/5 border-accent-purple/20">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-accent-purple flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">So verwendest du Selektoren</p>
                <p className="text-sm text-text-secondary mt-1">
                  Kopiere einen Selektor und füge ihn in das Feld „Ziel-Element" eines Tutorial-Schritts ein.
                  Das Tutorial-System hebt dann genau dieses Element auf der Seite hervor.
                </p>
                <p className="text-xs text-text-muted mt-2 font-mono bg-obsidian-900 px-2 py-1 rounded inline-block">
                  Beispiel: [data-tutorial-id="nav-episodes"]
                </p>
              </div>
            </div>
          </div>

          {SELECTOR_GROUPS.map(group => (
            <div key={group.group} className="card space-y-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Tag size={14} className="text-accent-purple" />
                {group.group}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-obsidian-900 rounded-lg group hover:bg-surface-raised transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary font-medium">{item.label}</p>
                      <p className="text-xs text-text-muted font-mono truncate">
                        [data-tutorial-id="{item.id}"]
                      </p>
                    </div>
                    <button
                      onClick={() => copySelector(item.id)}
                      className="ml-2 p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors flex-shrink-0"
                      title="Selektor kopieren"
                    >
                      {copiedSelector === item.id ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
