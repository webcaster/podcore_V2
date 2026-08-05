/**
 * TutorialsManagementPage v2
 * - Mehrere Rollen pro Tutorial
 * - Einklappbare Schritte
 * - Screenshot-Modus: navigiert zur Zielseite mit Rollen-Menü
 * - Annotationspunkte mit Beschreibungsfeldern + [1][2] Referenzen
 * - PDF-Export (lazy)
 * - Menü-Vorschau der Zielrolle
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Save, ChevronDown, ChevronUp, ChevronRight,
  Camera, Download, Eye, Users, BookOpen, Edit3,
  X, Check, AlertCircle, Loader2,
  ToggleLeft, ToggleRight, Navigation, Image as ImageIcon,
} from 'lucide-react';
import { useScreenshotMode } from '../contexts/ScreenshotModeContext';
import RoleMenuPreview from '../components/tutorials/RoleMenuPreview';

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
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  allowSkip?: boolean;
}

interface Tutorial {
  id: string;
  roles: string[];
  role?: string; // legacy
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
];

const ANN_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

const newStep = (): TutorialStep => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  target: '',
  position: 'bottom',
  image: '',
  annotations: [],
  allowSkip: true,
});

function getRoleColor(name: string): string {
  return ROLE_COLORS[name] || '#6b7280';
}

function renderAnnotatedText(text: string, annotations: AnnotationPoint[] = []) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (m) {
          const num = parseInt(m[1]);
          const ann = annotations.find(a => a.label === String(num));
          const color = ANN_COLORS[(num - 1) % ANN_COLORS.length];
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold mx-0.5 cursor-help"
              style={{ backgroundColor: color }}
              title={ann?.description || `Punkt ${num}`}
            >
              {num}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function TutorialsManagementPage() {
  const navigate = useNavigate();
  const { startScreenshotMode } = useScreenshotMode();

  const [view, setView] = useState<'list' | 'edit' | 'users'>('list');
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

  // ── LOAD ───────────────────────────────────────────────────────────────
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
        // Normalise: ensure roles is always an array
        const list: Tutorial[] = (Array.isArray(d) ? d : []).map((t: any) => ({
          ...t,
          roles: Array.isArray(t.roles) && t.roles.length > 0
            ? t.roles
            : t.role ? [t.role] : [],
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

  // ── PROGRESS ───────────────────────────────────────────────────────────
  const loadProgress = useCallback(async (tid: string) => {
    setLoadingProgress(tid);
    try {
      const r = await fetch(`/api/admin/tutorials/${tid}/progress`, { credentials: 'include' });
      if (r.ok) { const data = await r.json(); setProgressMap(p => ({ ...p, [tid]: data })); }
    } finally { setLoadingProgress(null); }
  }, []);

  // ── SAVE ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editTutorial) return;
    if (!editTutorial.title.trim()) { setError('Titel erforderlich'); return; }
    if (!editTutorial.roles.length) { setError('Mindestens eine Rolle erforderlich'); return; }
    if (!editTutorial.steps.length) { setError('Mindestens ein Schritt erforderlich'); return; }

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
          steps: editTutorial.steps,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Speichern fehlgeschlagen');
      }
      setSuccess('Tutorial gespeichert');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
      setView('list'); setEditTutorial(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }, [editTutorial, loadData]);

  // ── DELETE ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tutorial wirklich löschen?')) return;
    try {
      await fetch(`/api/tutorials/${id}`, { method: 'DELETE', credentials: 'include' });
      await loadData();
      setSuccess('Tutorial gelöscht');
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Fehler beim Löschen'); }
  }, [loadData]);

  // ── RESET PROGRESS ─────────────────────────────────────────────────────
  const handleResetProgress = useCallback(async (tid: string, uid: string) => {
    try {
      await fetch(`/api/admin/tutorials/${tid}/reset/${uid}`, { method: 'POST', credentials: 'include' });
      await loadProgress(tid);
      setSuccess('Fortschritt zurückgesetzt');
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Fehler beim Zurücksetzen'); }
  }, [loadProgress]);

  // ── PDF EXPORT ─────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async (tutorial: Tutorial) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, H = 297, M = 20;
      let y = M;
      const checkY = (n: number) => { if (y + n > H - M) { doc.addPage(); y = M; } };

      // Cover
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, W, 55, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text(tutorial.title, M, 28);
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      if (tutorial.description) doc.text(tutorial.description, M, 40);
      doc.text(`Rollen: ${tutorial.roles.join(', ')}`, M, 50);
      y = 70;
      doc.setTextColor(0, 0, 0);

      for (let i = 0; i < tutorial.steps.length; i++) {
        const s = tutorial.steps[i];
        checkY(30);
        doc.setFillColor(245, 243, 255);
        doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, 'F');
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text(`${i + 1}. ${s.title}`, M + 4, y + 8);
        y += 16;

        if (s.description) {
          doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(s.description.replace(/\[\d+\]/g, ''), W - 2 * M);
          checkY(lines.length * 5 + 4);
          doc.text(lines, M, y);
          y += lines.length * 5 + 4;
        }

        if (s.image) {
          try {
            checkY(84);
            doc.addImage(s.image, 'PNG', M, y, W - 2 * M, 80);
            y += 84;
          } catch {}
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
      setSuccess('PDF exportiert'); setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Fehler beim PDF-Export'); }
  }, []);

  // ── SCREENSHOT ─────────────────────────────────────────────────────────
  const handleStartScreenshot = useCallback((step: TutorialStep) => {
    if (!editTutorial) return;
    const firstRole = editTutorial.roles[0];
    const roleObj = roles.find(r => r.name === firstRole || r.id === firstRole);

    startScreenshotMode({
      role: firstRole || 'unbekannt',
      permissions: roleObj?.permissions || {},
      onCapture: ({ dataUrl, annotations }) => {
        setEditTutorial(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => s.id === step.id ? { ...s, image: dataUrl, annotations } : s),
        } : prev);
        navigate('/admin/tutorials');
      },
      onCancel: () => navigate('/admin/tutorials'),
    });

    const route = PAGE_ROUTES.find(r => r.tutorialId === step.target || r.path === step.target);
    navigate(route?.path || '/');
  }, [editTutorial, roles, startScreenshotMode, navigate]);

  // ── STEP HELPERS ───────────────────────────────────────────────────────
  const toggleStep = (id: string) => setCollapsedSteps(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const updateStep = (id: string, upd: Partial<TutorialStep>) =>
    setEditTutorial(p => p ? { ...p, steps: p.steps.map(s => s.id === id ? { ...s, ...upd } : s) } : p);

  const addStep = () => {
    const s = newStep();
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

  const toggleRole = (name: string) => setEditTutorial(p => {
    if (!p) return p;
    const roles = p.roles.includes(name) ? p.roles.filter(r => r !== name) : [...p.roles, name];
    return { ...p, roles };
  });

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────
  const Notifications = () => (
    <>
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <AlertCircle size={16} /><span className="text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
          <Check size={16} /><span className="text-sm">{success}</span>
        </div>
      )}
    </>
  );

  // ── LIST VIEW ──────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header" data-tutorial-id="tutorials-header">
        <div>
          <h1 className="page-title">Tutorial-Verwaltung</h1>
          <p className="page-subtitle">Einstiegs-Tutorials für alle Rollen erstellen und verwalten</p>
        </div>
        <button
          onClick={() => {
            setEditTutorial({ id: `new-${Date.now()}`, roles: [], title: '', description: '', enabled: true, steps: [newStep()], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            setView('edit');
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />Neues Tutorial
        </button>
      </div>

      <Notifications />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-accent-purple" />
        </div>
      ) : tutorials.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto mb-4 text-text-muted opacity-40" />
          <p className="text-text-secondary font-medium">Noch keine Tutorials</p>
          <p className="text-text-muted text-sm mt-1">Erstelle das erste Tutorial für deine Nutzer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutorials.map(t => {
            const prog = progressMap[t.id];
            const done = prog?.filter(p => p.completed).length ?? 0;
            return (
              <div key={t.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text-primary truncate">{t.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${t.enabled ? 'bg-green-500/20 text-green-400' : 'bg-obsidian-600 text-text-muted'}`}>
                        {t.enabled ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    {t.description && <p className="text-text-muted text-sm mb-3 line-clamp-2">{t.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {t.roles.map(r => (
                        <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getRoleColor(r) + 'cc' }}>{r}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{t.steps.length} Schritt{t.steps.length !== 1 ? 'e' : ''}</span>
                      {prog && <span>{done}/{prog.length} abgeschlossen</span>}
                      <span>Aktualisiert: {new Date(t.updatedAt).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { if (!progressMap[t.id]) loadProgress(t.id); setEditTutorial(t); setView('users'); }} className="p-2 text-text-muted hover:text-accent-purple rounded-lg hover:bg-accent-purple/10 transition-colors" title="Nutzer-Fortschritt">
                      {loadingProgress === t.id ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    </button>
                    <button onClick={() => handleExportPDF(t)} className="p-2 text-text-muted hover:text-accent-purple rounded-lg hover:bg-accent-purple/10 transition-colors" title="PDF exportieren"><Download size={16} /></button>
                    <button onClick={() => { setEditTutorial(t); setView('edit'); }} className="p-2 text-text-muted hover:text-accent-purple rounded-lg hover:bg-accent-purple/10 transition-colors" title="Bearbeiten"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors" title="Löschen"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── USERS VIEW ─────────────────────────────────────────────────────────
  if (view === 'users' && editTutorial) {
    const prog = progressMap[editTutorial.id] || [];
    const relevant = users.filter(u => editTutorial.roles.includes(u.role));
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <button onClick={() => { setView('list'); setEditTutorial(null); }} className="text-text-muted hover:text-text-primary text-sm mb-1 flex items-center gap-1">← Zurück</button>
            <h1 className="page-title">Nutzer-Fortschritt</h1>
            <p className="page-subtitle">{editTutorial.title}</p>
          </div>
        </div>
        <Notifications />
        {relevant.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={32} className="mx-auto mb-3 text-text-muted opacity-40" />
            <p className="text-text-secondary">Keine Nutzer mit den Rollen: {editTutorial.roles.join(', ')}</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-obsidian-800 border-b border-obsidian-700">
                <tr>
                  {['Nutzer','Rolle','Status','Schritt','Aktion'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-700">
                {relevant.map(u => {
                  const p = prog.find(pr => pr.userId === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-obsidian-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: u.avatarColor || '#7c3aed' }}>
                            {(u.displayName || u.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{u.displayName || u.username}</p>
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
                      <td className="px-4 py-3 text-xs text-text-muted">{p ? `${p.currentStep + 1}/${editTutorial.steps.length}` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {p && (
                          <button onClick={() => handleResetProgress(editTutorial.id, u.id)} className="text-xs text-text-muted hover:text-accent-purple px-2 py-1 rounded hover:bg-accent-purple/10 transition-colors">
                            Neu starten
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT VIEW ──────────────────────────────────────────────────────────
  if (view === 'edit' && editTutorial) {
    const selectedRole = roles.find(r => editTutorial.roles.length > 0 && (r.name === editTutorial.roles[0] || r.id === editTutorial.roles[0]));

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <button onClick={() => { setView('list'); setEditTutorial(null); }} className="text-text-muted hover:text-text-primary text-sm mb-1 flex items-center gap-1">← Zurück</button>
            <h1 className="page-title">{editTutorial.id.startsWith('new-') ? 'Neues Tutorial' : 'Tutorial bearbeiten'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleExportPDF(editTutorial)} className="btn-secondary flex items-center gap-2"><Download size={16} />PDF</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Speichern
            </button>
          </div>
        </div>

        <Notifications />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: meta + steps */}
          <div className="xl:col-span-2 space-y-6">
            {/* Meta card */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-text-primary flex items-center gap-2"><BookOpen size={16} className="text-accent-purple" />Tutorial-Informationen</h2>

              <div>
                <label className="form-label">Titel *</label>
                <input type="text" value={editTutorial.title} onChange={e => setEditTutorial(p => p ? { ...p, title: e.target.value } : p)} className="form-input" placeholder="z.B. Erste Schritte in PodCore" />
              </div>

              <div>
                <label className="form-label">Beschreibung</label>
                <textarea value={editTutorial.description} onChange={e => setEditTutorial(p => p ? { ...p, description: e.target.value } : p)} className="form-input" rows={2} placeholder="Kurze Beschreibung..." />
              </div>

              <div>
                <label className="form-label">Rollen * <span className="text-text-muted font-normal text-xs">(mehrere möglich)</span></label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {roles.map(role => {
                    const sel = editTutorial.roles.includes(role.name) || editTutorial.roles.includes(role.id);
                    return (
                      <button key={role.id} onClick={() => toggleRole(role.name || role.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${sel ? 'text-white border-transparent' : 'bg-obsidian-700 text-text-muted border-obsidian-600 hover:border-obsidian-500'}`}
                        style={sel ? { backgroundColor: role.color || getRoleColor(role.name) } : {}}>
                        {role.label || role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Tutorial aktiv</p>
                  <p className="text-xs text-text-muted">Inaktive Tutorials werden nicht angezeigt</p>
                </div>
                <button onClick={() => setEditTutorial(p => p ? { ...p, enabled: !p.enabled } : p)} className="text-text-muted hover:text-accent-purple transition-colors">
                  {editTutorial.enabled ? <ToggleRight size={28} className="text-accent-purple" /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>

            {/* Steps card */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary flex items-center gap-2"><Navigation size={16} className="text-accent-purple" />Schritte ({editTutorial.steps.length})</h2>
                <button onClick={addStep} className="btn-secondary flex items-center gap-2 text-sm py-1.5"><Plus size={14} />Schritt hinzufügen</button>
              </div>

              {editTutorial.steps.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">Noch keine Schritte</div>
              )}

              <div className="space-y-3">
                {editTutorial.steps.map((step, idx) => {
                  const collapsed = collapsedSteps.has(step.id);
                  return (
                    <div key={step.id} className="border border-obsidian-700 bg-obsidian-800/50 rounded-xl">
                      {/* Step header */}
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => toggleStep(step.id)}>
                        <span className="w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <span className="flex-1 text-sm font-medium text-text-primary truncate">{step.title || `Schritt ${idx + 1}`}</span>
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {step.image && <ImageIcon size={12} className="text-text-muted" />}
                          {step.annotations?.length ? <span className="text-xs text-text-muted">{step.annotations.length}×</span> : null}
                          <button onClick={() => moveStep(step.id, -1)} disabled={idx === 0} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                          <button onClick={() => moveStep(step.id, 1)} disabled={idx === editTutorial.steps.length - 1} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                          <button onClick={() => removeStep(step.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                        <span className="text-text-muted">{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</span>
                      </div>

                      {/* Step body */}
                      {!collapsed && (
                        <div className="px-4 pb-4 space-y-4 border-t border-obsidian-700 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label">Titel *</label>
                              <input type="text" value={step.title} onChange={e => updateStep(step.id, { title: e.target.value })} className="form-input" placeholder="Schritt-Titel" />
                            </div>
                            <div>
                              <label className="form-label">Zielseite</label>
                              <select value={step.target || ''} onChange={e => updateStep(step.id, { target: e.target.value })} onFocus={() => setHighlightedTarget(step.target || null)} onBlur={() => setHighlightedTarget(null)} className="form-input text-sm">
                                <option value="">— Keine —</option>
                                {PAGE_ROUTES.map(r => <option key={r.tutorialId} value={r.tutorialId}>{r.label}</option>)}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="form-label">
                              Beschreibung
                              <span className="text-text-muted font-normal ml-2 text-xs">Verwende [1], [2] für Annotationspunkte</span>
                            </label>
                            <textarea value={step.description} onChange={e => updateStep(step.id, { description: e.target.value })} className="form-input" rows={3} placeholder="Beschreibe diesen Schritt..." />
                            {step.description && step.annotations?.length ? (
                              <div className="mt-2 p-3 bg-obsidian-700 rounded-lg text-sm text-text-secondary">
                                {renderAnnotatedText(step.description, step.annotations)}
                              </div>
                            ) : null}
                          </div>

                          {/* Screenshot */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="form-label mb-0">Screenshot</label>
                              <button onClick={() => handleStartScreenshot(step)} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-lg border border-accent-purple/30 transition-colors">
                                <Camera size={12} />Screenshot aufnehmen
                              </button>
                            </div>

                            {step.image ? (
                              <div className="relative group rounded-xl overflow-hidden border border-obsidian-700">
                                <img src={step.image} alt="Screenshot" className="w-full max-h-48 object-cover" />
                                {step.annotations?.map((ann, i) => (
                                  <div key={ann.id} className="absolute w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/80 shadow-lg pointer-events-none"
                                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%,-50%)', backgroundColor: ANN_COLORS[i % ANN_COLORS.length] }}>
                                    {ann.label}
                                  </div>
                                ))}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                  <button onClick={() => handleStartScreenshot(step)} className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs font-medium">Neu aufnehmen</button>
                                  <button onClick={() => updateStep(step.id, { image: '', annotations: [] })} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium">Entfernen</button>
                                </div>
                              </div>
                            ) : (
                              <div onClick={() => handleStartScreenshot(step)} className="border-2 border-dashed border-obsidian-600 hover:border-accent-purple/50 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                                <Camera size={24} className="mx-auto mb-2 text-text-muted group-hover:text-accent-purple transition-colors" />
                                <p className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">Screenshot aufnehmen</p>
                                <p className="text-xs text-text-muted mt-1">Navigiert zur Zielseite mit Rollen-Ansicht</p>
                              </div>
                            )}

                            {/* Annotation descriptions */}
                            {step.annotations?.length ? (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Annotationspunkte</p>
                                {step.annotations.map((ann, i) => (
                                  <div key={ann.id} className="flex items-start gap-3 p-2 bg-obsidian-700 rounded-lg">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: ANN_COLORS[i % ANN_COLORS.length] }}>{ann.label}</span>
                                    <input type="text" value={ann.description}
                                      onChange={e => updateStep(step.id, { annotations: step.annotations!.map(a => a.id === ann.id ? { ...a, description: e.target.value } : a) })}
                                      className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                                      placeholder={`Beschreibung für Punkt ${ann.label}...`} />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <input type="checkbox" id={`skip-${step.id}`} checked={step.allowSkip !== false} onChange={e => updateStep(step.id, { allowSkip: e.target.checked })} className="rounded" />
                            <label htmlFor={`skip-${step.id}`} className="text-sm text-text-secondary cursor-pointer">Überspringen erlaubt</label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {editTutorial.steps.length > 0 && (
                <button onClick={addStep} className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"><Plus size={14} />Weiteren Schritt hinzufügen</button>
              )}
            </div>
          </div>

          {/* Right: Menu preview */}
          <div>
            <div className="card sticky top-4">
              <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-4"><Eye size={16} className="text-accent-purple" />Menü-Vorschau</h2>
              {editTutorial.roles.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Wähle eine Rolle</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-text-muted mb-3">
                    Vorschau: <strong className="text-text-secondary">{editTutorial.roles[0]}</strong>
                    {editTutorial.roles.length > 1 && ` +${editTutorial.roles.length - 1}`}
                  </p>
                  {selectedRole ? (
                    <RoleMenuPreview role={selectedRole.name || selectedRole.id} permissions={selectedRole.permissions} roleLabel={selectedRole.label || selectedRole.name} roleColor={selectedRole.color || getRoleColor(selectedRole.name)} highlightedTarget={highlightedTarget} />
                  ) : (
                    <p className="text-xs text-text-muted text-center py-4">Rolle nicht gefunden</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
