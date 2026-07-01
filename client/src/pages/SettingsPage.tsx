import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, User, FolderOpen, Save, Eye, EyeOff, Loader2, Mic2,
  Palette, Radio, Sliders, Globe, Clock, Tag, Info, Download,
  Upload, CheckCircle, XCircle, AlertTriangle, RefreshCw, Package
} from 'lucide-react';
import { adminApi, authApi, updateApi } from '../lib/api';
import { useApp, applyUserTheme } from '../contexts/AppContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function applyThemePreview(theme: { accentColor?: string; sidebarColor?: string; fontScale?: number }) {
  // Verwende die vollständige applyUserTheme Funktion aus dem AppContext
  // damit alle CSS-Variablen (inkl. Light/Dark-Varianten, Surface-Farben) gesetzt werden
  applyUserTheme(theme as any);
}

const ACCENT_PRESETS = [
  { label: 'Violett', value: '#7c3aed' },
  { label: 'Blau', value: '#2563eb' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Grün', value: '#059669' },
  { label: 'Orange', value: '#d97706' },
  { label: 'Rot', value: '#dc2626' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Indigo', value: '#4f46e5' },
];

const SIDEBAR_PRESETS = [
  { label: 'Obsidian (Standard)', value: '#0f0f13' },
  { label: 'Dunkelblau', value: '#0f172a' },
  { label: 'Dunkelgrün', value: '#052e16' },
  { label: 'Dunkelbraun', value: '#1c1008' },
  { label: 'Grau', value: '#111827' },
  { label: 'Schwarz', value: '#000000' },
];

// ── component ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, can, showSuccess, showError, refreshUser, refreshPodcastProfile } = useApp();

  type TabKey = 'profile' | 'theme' | 'podcast' | 'technical' | 'app' | 'update';
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // ── Update state ────────────────────────────────────────────────────────────
  const [updateStatus, setUpdateStatus] = useState<any>(null);
  const [isLoadingUpdateStatus, setIsLoadingUpdateStatus] = useState(false);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateUploadProgress, setUpdateUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyLog, setApplyLog] = useState<string[]>([]);
  const [applyDone, setApplyDone] = useState(false);

  const loadUpdateStatus = useCallback(async () => {
    setIsLoadingUpdateStatus(true);
    try { const s = await updateApi.getStatus(); setUpdateStatus(s); } catch {}
    finally { setIsLoadingUpdateStatus(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'update') loadUpdateStatus();
  }, [activeTab, loadUpdateStatus]);

  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setUpdateFile(f);
    setUploadResult(null);
    setApplyLog([]);
    setApplyDone(false);
  };

  const handleUploadUpdate = async () => {
    if (!updateFile) return;
    setIsUploading(true);
    setUpdateUploadProgress(0);
    setUploadResult(null);
    try {
      const result = await updateApi.uploadZip(updateFile, pct => setUpdateUploadProgress(pct));
      setUploadResult(result);
    } catch (err: any) { showError(err.message); }
    finally { setIsUploading(false); }
  };

  const handleApplyUpdate = async () => {
    if (!uploadResult?.updateId) return;
    setIsApplying(true);
    setApplyLog(['Update wird angewendet...']);
    try {
      const result = await updateApi.applyUpdate(uploadResult.updateId);
      setApplyLog(result.log || ['Update abgeschlossen']);
      setApplyDone(true);
      showSuccess('Update erfolgreich! Server wird neu gestartet...');
    } catch (err: any) {
      showError(err.message);
      setApplyLog(prev => [...prev, `Fehler: ${err.message}`]);
    }
    finally { setIsApplying(false); }
  };

  // ── Profile form ────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    avatarColor: user?.avatarColor || '#7c3aed',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  // ── Theme form ──────────────────────────────────────────────────────────────
  const [themeForm, setThemeForm] = useState({
    accentColor: user?.theme?.accentColor || '#7c3aed',
    sidebarColor: user?.theme?.sidebarColor || '#0f0f13',
    fontScale: user?.theme?.fontScale || 1.0,
  });

  // ── Podcast profile form ────────────────────────────────────────────────────
  const [podcastForm, setPodcastForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    host: '',
    coHosts: '',
    category: '',
    language: 'de',
    website: '',
    email: '',
    copyright: '',
    explicit: false,
    feedUrl: '',
    podcastId: '',
  });

  // ── Technical defaults form ─────────────────────────────────────────────────
  const [techForm, setTechForm] = useState({
    sampleRate: '44100',
    bitrate: '128',
    channels: 'stereo',
    format: 'mp3',
    normalizationTarget: '-16',
    introOutroDuration: '30',
    maxEpisodeDuration: '60',
    recordingSoftware: '',
    editingSoftware: '',
    micModel: '',
    interfaceModel: '',
    notes: '',
  });

  // ── App settings form ───────────────────────────────────────────────────────
  const [appForm, setAppForm] = useState({
    uploadDir: './uploads',
    maxUploadSize: 500,
    sessionSecret: '',
    port: 3001,
    appName: 'PodCore',
    externalHintText: '',
  });

  // ── PDF CI colors form ───────────────────────────────────────────────────────
  const [pdfForm, setPdfForm] = useState({
    primaryColor: '#7c3aed',
    accentColor: '#2563eb',
    headerBg: '#1a1a2e',
  });

  // ── Workflow settings form ───────────────────────────────────────────────────
  const [workflowForm, setWorkflowForm] = useState({
    episodeApprovalRequired: false,
    interviewApprovalRequired: false,
  });

  // ── Invoice number schema form ────────────────────────────────────────────
  const [invoiceForm, setInvoiceForm] = useState({
    prefix: 'RE',
    separator: '-',
    includeYear: true,
    includeMonth: false,
    paddingDigits: 3,
    nextNumber: 1,
  });

  const buildInvoiceExample = (form: typeof invoiceForm): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const num = String(form.nextNumber || 1).padStart(form.paddingDigits, '0');
    const parts: string[] = [form.prefix || 'RE'];
    if (form.includeYear) parts.push(String(year));
    if (form.includeMonth) parts.push(month);
    parts.push(num);
    return parts.join(form.separator || '-');
  };

  // ── Load settings ───────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!can('canManageSettings')) { setIsLoadingSettings(false); return; }
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
      setAppForm({
        uploadDir: data.uploadDir || './uploads',
        maxUploadSize: data.maxUploadSize || 500,
        sessionSecret: '',
        port: data.port || 3001,
        appName: data.appName || 'PodCore',
        externalHintText: data.externalHintText || '',
      });
      // Podcast profile
      const p = data.podcast || {};
      setPodcastForm({
        name: p.name || data.general?.podcastName || '',
        subtitle: p.subtitle || '',
        description: p.description || '',
        host: p.host || '',
        coHosts: p.coHosts || '',
        category: p.category || '',
        language: p.language || data.general?.language || 'de',
        website: p.website || '',
        email: p.email || '',
        copyright: p.copyright || '',
        explicit: p.explicit || false,
        feedUrl: p.feedUrl || '',
        podcastId: p.podcastId || '',
      });
      // PDF CI colors
      const pdf = data.pdf || {};
      setPdfForm({
        primaryColor: pdf.primaryColor || '#7c3aed',
        accentColor: pdf.accentColor || '#2563eb',
        headerBg: pdf.headerBg || '#1a1a2e',
      });
      // Workflow settings
      const wf = data.workflow || {};
      setWorkflowForm({
        episodeApprovalRequired: wf.episodeApprovalRequired ?? false,
        interviewApprovalRequired: wf.interviewApprovalRequired ?? false,
      });
      // Invoice number schema
      const inv = data.invoiceSchema || {};
      setInvoiceForm({
        prefix: inv.prefix || 'RE',
        separator: inv.separator || '-',
        includeYear: inv.includeYear ?? true,
        includeMonth: inv.includeMonth ?? false,
        paddingDigits: inv.paddingDigits || 3,
        nextNumber: inv.nextNumber || 1,
      });
      // Technical defaults
      const t = data.technicalDefaults || {};
      setTechForm({
        sampleRate: t.sampleRate || '44100',
        bitrate: t.bitrate || '128',
        channels: t.channels || 'stereo',
        format: t.format || 'mp3',
        normalizationTarget: t.normalizationTarget || '-16',
        introOutroDuration: t.introOutroDuration || '30',
        maxEpisodeDuration: t.maxEpisodeDuration || '60',
        recordingSoftware: t.recordingSoftware || '',
        editingSoftware: t.editingSoftware || '',
        micModel: t.micModel || '',
        interfaceModel: t.interfaceModel || '',
        notes: t.notes || '',
      });
    } catch (err: any) { showError(err.message); }
    finally { setIsLoadingSettings(false); }
  }, [can, showError]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (user) {
      setProfileForm(p => ({
        ...p,
        displayName: user.displayName || '',
        email: user.email || '',
        avatarColor: user.avatarColor || '#7c3aed',
      }));
      setThemeForm({
        accentColor: user.theme?.accentColor || '#7c3aed',
        sidebarColor: user.theme?.sidebarColor || '#0f0f13',
        fontScale: user.theme?.fontScale || 1.0,
      });
    }
  }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      showError('Passwörter stimmen nicht überein'); return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        displayName: profileForm.displayName,
        email: profileForm.email || undefined,
        avatarColor: profileForm.avatarColor,
      };
      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }
      await authApi.updateProfile(payload);
      await refreshUser();
      setProfileForm(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showSuccess('Profil gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveTheme = async () => {
    setIsSaving(true);
    try {
      // Theme zuerst anwenden (sofortiges visuelles Feedback)
      applyThemePreview(themeForm);
      await authApi.updateProfile({ theme: themeForm });
      // refreshUser NACH dem Speichern aufrufen, damit applyUserTheme das neue Theme aus der DB lädt
      // Kurze Verzögerung damit die DB-Änderung propagiert ist
      await new Promise(r => setTimeout(r, 100));
      await refreshUser();
      // Theme nochmals anwenden falls refreshUser es überschrieben hat
      applyThemePreview(themeForm);
      showSuccess('Design-Einstellungen gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleResetTheme = async () => {
    const defaultTheme = { accentColor: '#7c3aed', sidebarColor: '#0f0f13', fontScale: 1.0 };
    setThemeForm(defaultTheme);
    applyThemePreview(defaultTheme);
    setIsSaving(true);
    try {
      await authApi.updateProfile({ theme: defaultTheme });
      await new Promise(r => setTimeout(r, 100));
      await refreshUser();
      applyThemePreview(defaultTheme);
      showSuccess('Design zurückgesetzt');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleSavePodcast = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateSettings({ podcast: podcastForm, general: { ...settings?.general, podcastName: podcastForm.name } });
      showSuccess('Podcast-Profil gespeichert — wird überall in der App aktualisiert');
      await loadSettings();
      // Globales Podcast-Profil im AppContext aktualisieren
      await refreshPodcastProfile();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveTechnical = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateSettings({ technicalDefaults: techForm });
      showSuccess('Technische Standard-Daten gespeichert — werden als Vorlage für neue Episoden verwendet');
      // Globale technische Defaults im AppContext aktualisieren
      await refreshPodcastProfile();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = { ...appForm, pdf: pdfForm, workflow: workflowForm, invoiceSchema: invoiceForm };
      if (!payload.sessionSecret) delete payload.sessionSecret;
      await adminApi.updateSettings(payload);
      showSuccess('Einstellungen gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user?.username?.[0]?.toUpperCase() || '?';

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'profile', label: 'Mein Profil', icon: <User size={15} /> },
    { key: 'theme', label: 'Mein Design', icon: <Palette size={15} /> },
    ...(can('canManageSettings') ? [
      { key: 'podcast' as TabKey, label: 'Podcast-Profil', icon: <Mic2 size={15} />, adminOnly: true },
      { key: 'technical' as TabKey, label: 'Technische Daten', icon: <Sliders size={15} />, adminOnly: true },
      { key: 'app' as TabKey, label: 'App-Einstellungen', icon: <Settings size={15} />, adminOnly: true },
      { key: 'update' as TabKey, label: 'App-Update', icon: <Download size={15} />, adminOnly: true },
    ] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Settings size={24} className="text-text-secondary" />
          Einstellungen
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-6">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <User size={16} /> Profil-Informationen
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: profileForm.avatarColor }}>
                {initials}
              </div>
              <div>
                <p className="text-text-primary font-medium">{user?.displayName}</p>
                <p className="text-text-muted text-sm">@{user?.username}</p>
                <p className="text-text-muted text-xs capitalize mt-0.5">{user?.role}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Anzeigename</label>
                <input type="text" value={profileForm.displayName} onChange={e => setProfileForm(p => ({ ...p, displayName: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="optional" />
              </div>
              <div>
                <label className="label">Avatar-Farbe</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={profileForm.avatarColor} onChange={e => setProfileForm(p => ({ ...p, avatarColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_PRESETS.map(c => (
                      <button key={c.value} type="button" onClick={() => setProfileForm(p => ({ ...p, avatarColor: c.value }))}
                        title={c.label}
                        className={`w-7 h-7 rounded-full transition-all ${profileForm.avatarColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-obsidian-900' : ''}`}
                        style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Passwort ändern</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Aktuelles Passwort</label>
                <div className="relative">
                  <input type={showPasswords ? 'text' : 'password'} value={profileForm.currentPassword} onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))} className="input pr-10" />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Neues Passwort</label>
                  <input type={showPasswords ? 'text' : 'password'} value={profileForm.newPassword} onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Passwort bestätigen</label>
                  <input type={showPasswords ? 'text' : 'password'} value={profileForm.confirmPassword} onChange={e => setProfileForm(p => ({ ...p, confirmPassword: e.target.value }))} className="input" />
                </div>
              </div>
              {profileForm.newPassword && profileForm.confirmPassword && profileForm.newPassword !== profileForm.confirmPassword && (
                <p className="text-accent-red text-xs">Passwörter stimmen nicht überein</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Speichern...' : 'Profil speichern'}</span>
          </button>
        </form>
      )}

      {/* ── THEME TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'theme' && (
        <div className="max-w-2xl space-y-6">
          <div className="card space-y-6">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Palette size={16} /> Persönliches Design
            </h3>
            <p className="text-text-secondary text-sm -mt-2">Diese Einstellungen gelten nur für dein Konto und werden beim Login automatisch angewendet.</p>

            {/* Accent Color */}
            <div>
              <label className="label">Akzentfarbe</label>
              <p className="text-text-muted text-xs mb-3">Farbe für Buttons, aktive Elemente und Highlights</p>
              <div className="flex items-center gap-3 mb-3">
                <input type="color" value={themeForm.accentColor}
                  onChange={e => { setThemeForm(p => ({ ...p, accentColor: e.target.value })); applyThemePreview({ ...themeForm, accentColor: e.target.value }); }}
                  className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                <span className="text-text-secondary font-mono text-sm">{themeForm.accentColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => { setThemeForm(p => ({ ...p, accentColor: c.value })); applyThemePreview({ ...themeForm, accentColor: c.value }); }}
                    title={c.label}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${themeForm.accentColor === c.value ? 'border-white text-white' : 'border-surface-border text-text-secondary hover:border-surface-border-light'}`}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.value }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Color */}
            <div>
              <label className="label">Sidebar-Hintergrund</label>
              <p className="text-text-muted text-xs mb-3">Hintergrundfarbe der linken Navigation</p>
              <div className="flex items-center gap-3 mb-3">
                <input type="color" value={themeForm.sidebarColor}
                  onChange={e => { setThemeForm(p => ({ ...p, sidebarColor: e.target.value })); applyThemePreview({ ...themeForm, sidebarColor: e.target.value }); }}
                  className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                <span className="text-text-secondary font-mono text-sm">{themeForm.sidebarColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SIDEBAR_PRESETS.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => { setThemeForm(p => ({ ...p, sidebarColor: c.value })); applyThemePreview({ ...themeForm, sidebarColor: c.value }); }}
                    title={c.label}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${themeForm.sidebarColor === c.value ? 'border-white text-white' : 'border-surface-border text-text-secondary hover:border-surface-border-light'}`}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0 border border-surface-border" style={{ backgroundColor: c.value }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Scale */}
            <div>
              <label className="label">Schriftgröße</label>
              <p className="text-text-muted text-xs mb-3">Skalierung der Schriftgröße in der gesamten Anwendung</p>
              <div className="flex items-center gap-4">
                <input type="range" min="0.85" max="1.2" step="0.05" value={themeForm.fontScale}
                  onChange={e => { const v = parseFloat(e.target.value); setThemeForm(p => ({ ...p, fontScale: v })); applyThemePreview({ ...themeForm, fontScale: v }); }}
                  className="flex-1 accent-accent-purple" />
                <span className="text-text-secondary text-sm w-12 text-right">{Math.round(themeForm.fontScale * 100)}%</span>
              </div>
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>Klein (85%)</span>
                <span>Normal (100%)</span>
                <span>Groß (120%)</span>
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-xl border border-surface-border p-4 space-y-2" style={{ backgroundColor: themeForm.sidebarColor }}>
              <p className="text-white text-xs font-medium mb-2 opacity-60">Vorschau</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: themeForm.accentColor }}>
                  <Radio size={12} className="text-white" />
                </div>
                <span className="text-white text-sm font-medium" style={{ fontSize: `${themeForm.fontScale * 14}px` }}>Mein Podcast</span>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                {['Dashboard', 'Episoden', 'Redaktions-Hub'].map(item => (
                  <div key={item} className="flex items-center gap-2 px-2 py-1 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: themeForm.accentColor }} />
                    <span className="text-white opacity-70 text-xs" style={{ fontSize: `${themeForm.fontScale * 12}px` }}>{item}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ backgroundColor: themeForm.accentColor + '33' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeForm.accentColor }} />
                  <span className="font-medium text-xs" style={{ color: themeForm.accentColor, fontSize: `${themeForm.fontScale * 12}px` }}>Einstellungen</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSaveTheme} disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Speichern...' : 'Design speichern'}</span>
            </button>
            <button onClick={handleResetTheme} disabled={isSaving} className="btn-secondary">
              Zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* ── PODCAST PROFILE TAB ─────────────────────────────────────────────── */}
      {activeTab === 'podcast' && can('canManageSettings') && (
        <div className="max-w-2xl space-y-6">
          {isLoadingSettings ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="card space-y-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Mic2 size={16} /> Podcast-Stammdaten
                </h3>
                <p className="text-text-secondary text-sm -mt-2">Diese Daten werden in Berichten, PDF-Exporten und der Navigation verwendet.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Podcast-Name *</label>
                    <input type="text" value={podcastForm.name} onChange={e => setPodcastForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="Mein Podcast" />
                  </div>
                  <div>
                    <label className="label">Untertitel</label>
                    <input type="text" value={podcastForm.subtitle} onChange={e => setPodcastForm(p => ({ ...p, subtitle: e.target.value }))} className="input" placeholder="Kurzer Untertitel" />
                  </div>
                </div>

                <div>
                  <label className="label">Beschreibung</label>
                  <textarea value={podcastForm.description} onChange={e => setPodcastForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={3} placeholder="Worum geht es in diesem Podcast?" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Moderator / Host</label>
                    <input type="text" value={podcastForm.host} onChange={e => setPodcastForm(p => ({ ...p, host: e.target.value }))} className="input" placeholder="Maximilian Hartwich" />
                  </div>
                  <div>
                    <label className="label">Co-Hosts (kommagetrennt)</label>
                    <input type="text" value={podcastForm.coHosts} onChange={e => setPodcastForm(p => ({ ...p, coHosts: e.target.value }))} className="input" placeholder="Name 1, Name 2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Kategorie</label>
                    <select value={podcastForm.category} onChange={e => setPodcastForm(p => ({ ...p, category: e.target.value }))} className="input">
                      <option value="">Bitte wählen...</option>
                      {['Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'Health & Fitness', 'History', 'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality', 'Science', 'Society & Culture', 'Sports', 'Technology', 'True Crime', 'TV & Film'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sprache</label>
                    <select value={podcastForm.language} onChange={e => setPodcastForm(p => ({ ...p, language: e.target.value }))} className="input">
                      <option value="de">Deutsch</option>
                      <option value="en">Englisch</option>
                      <option value="fr">Französisch</option>
                      <option value="es">Spanisch</option>
                      <option value="it">Italienisch</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1"><Globe size={13} /> Website</label>
                    <input type="url" value={podcastForm.website} onChange={e => setPodcastForm(p => ({ ...p, website: e.target.value }))} className="input" placeholder="https://mein-podcast.de" />
                  </div>
                  <div>
                    <label className="label">Kontakt-E-Mail</label>
                    <input type="email" value={podcastForm.email} onChange={e => setPodcastForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="podcast@example.de" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Copyright</label>
                    <input type="text" value={podcastForm.copyright} onChange={e => setPodcastForm(p => ({ ...p, copyright: e.target.value }))} className="input" placeholder={`© ${new Date().getFullYear()} Mein Podcast`} />
                  </div>
                  <div>
                    <label className="label">Podigee Feed-URL</label>
                    <input type="url" value={podcastForm.feedUrl} onChange={e => setPodcastForm(p => ({ ...p, feedUrl: e.target.value }))} className="input" placeholder="https://mein-podcast.podigee.io/feed/mp3" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="explicit" checked={podcastForm.explicit} onChange={e => setPodcastForm(p => ({ ...p, explicit: e.target.checked }))} className="w-4 h-4 accent-accent-purple" />
                  <label htmlFor="explicit" className="text-text-secondary text-sm">Explizite Inhalte (Explicit-Flag im Feed)</label>
                </div>
              </div>

              <button onClick={handleSavePodcast} disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Speichern...' : 'Podcast-Profil speichern'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── TECHNICAL DEFAULTS TAB ──────────────────────────────────────────── */}
      {activeTab === 'technical' && can('canManageSettings') && (
        <div className="max-w-2xl space-y-6">
          {isLoadingSettings ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="card space-y-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Sliders size={16} /> Technische Standard-Daten
                </h3>
                <div className="flex items-start gap-2 p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                  <Info size={14} className="text-accent-blue mt-0.5 flex-shrink-0" />
                  <p className="text-accent-blue text-xs">Diese Werte werden als Vorlage für neue Episoden verwendet. Du kannst sie pro Episode im Editor überschreiben.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label">Sample Rate (Hz)</label>
                    <select value={techForm.sampleRate} onChange={e => setTechForm(p => ({ ...p, sampleRate: e.target.value }))} className="input">
                      <option value="44100">44.100 Hz</option>
                      <option value="48000">48.000 Hz</option>
                      <option value="96000">96.000 Hz</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Bitrate (kbps)</label>
                    <select value={techForm.bitrate} onChange={e => setTechForm(p => ({ ...p, bitrate: e.target.value }))} className="input">
                      <option value="64">64 kbps</option>
                      <option value="96">96 kbps</option>
                      <option value="128">128 kbps</option>
                      <option value="192">192 kbps</option>
                      <option value="256">256 kbps</option>
                      <option value="320">320 kbps</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Kanäle</label>
                    <select value={techForm.channels} onChange={e => setTechForm(p => ({ ...p, channels: e.target.value }))} className="input">
                      <option value="mono">Mono</option>
                      <option value="stereo">Stereo</option>
                      <option value="joint-stereo">Joint Stereo</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Format</label>
                    <select value={techForm.format} onChange={e => setTechForm(p => ({ ...p, format: e.target.value }))} className="input">
                      <option value="mp3">MP3</option>
                      <option value="aac">AAC / M4A</option>
                      <option value="ogg">OGG Vorbis</option>
                      <option value="wav">WAV</option>
                      <option value="flac">FLAC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Normalisierung (LUFS)</label>
                    <select value={techForm.normalizationTarget} onChange={e => setTechForm(p => ({ ...p, normalizationTarget: e.target.value }))} className="input">
                      <option value="-14">-14 LUFS (Spotify)</option>
                      <option value="-16">-16 LUFS (Podcast-Standard)</option>
                      <option value="-18">-18 LUFS</option>
                      <option value="-23">-23 LUFS (EBU R128)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Clock size={13} /> Intro/Outro (Sek.)</label>
                    <input type="number" value={techForm.introOutroDuration} onChange={e => setTechForm(p => ({ ...p, introOutroDuration: e.target.value }))} className="input" min="0" max="300" />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Clock size={13} /> Max. Episodenlänge (Min.)</label>
                    <input type="number" value={techForm.maxEpisodeDuration} onChange={e => setTechForm(p => ({ ...p, maxEpisodeDuration: e.target.value }))} className="input" min="1" max="600" />
                  </div>
                </div>

                <hr className="border-surface-border" />
                <h4 className="font-medium text-text-primary flex items-center gap-2"><Tag size={14} /> Equipment & Software</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Aufnahme-Software</label>
                    <input type="text" value={techForm.recordingSoftware} onChange={e => setTechForm(p => ({ ...p, recordingSoftware: e.target.value }))} className="input" placeholder="z.B. Adobe Audition, Reaper" />
                  </div>
                  <div>
                    <label className="label">Schnitt-Software</label>
                    <input type="text" value={techForm.editingSoftware} onChange={e => setTechForm(p => ({ ...p, editingSoftware: e.target.value }))} className="input" placeholder="z.B. Adobe Audition, Hindenburg" />
                  </div>
                  <div>
                    <label className="label">Mikrofon-Modell</label>
                    <input type="text" value={techForm.micModel} onChange={e => setTechForm(p => ({ ...p, micModel: e.target.value }))} className="input" placeholder="z.B. Shure SM7B, Rode NT1" />
                  </div>
                  <div>
                    <label className="label">Audio-Interface</label>
                    <input type="text" value={techForm.interfaceModel} onChange={e => setTechForm(p => ({ ...p, interfaceModel: e.target.value }))} className="input" placeholder="z.B. Focusrite Scarlett 2i2" />
                  </div>
                </div>

                <div>
                  <label className="label">Technische Notizen</label>
                  <textarea value={techForm.notes} onChange={e => setTechForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={3} placeholder="Weitere technische Hinweise für die Produktion..." />
                </div>
              </div>

              <button onClick={handleSaveTechnical} disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Speichern...' : 'Technische Daten speichern'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── APP SETTINGS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'app' && can('canManageSettings') && (
        <form onSubmit={handleSaveAppSettings} className="max-w-2xl space-y-6">
          {isLoadingSettings ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4">Allgemein</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">App-Name</label>
                    <input type="text" value={appForm.appName} onChange={e => setAppForm(p => ({ ...p, appName: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Server-Port</label>
                    <input type="number" value={appForm.port} onChange={e => setAppForm(p => ({ ...p, port: parseInt(e.target.value) || 3001 }))} className="input" min="1024" max="65535" />
                    <p className="text-text-muted text-xs mt-1">Neustart erforderlich nach Änderung</p>
                  </div>
                  <div>
                    <label className="label">Hinweistext für externe Termine</label>
                    <textarea value={appForm.externalHintText} onChange={e => setAppForm(p => ({ ...p, externalHintText: e.target.value }))} className="textarea" rows={3} />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FolderOpen size={16} /> Datei-Speicherung
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Upload-Verzeichnis</label>
                    <input type="text" value={appForm.uploadDir} onChange={e => setAppForm(p => ({ ...p, uploadDir: e.target.value }))} className="input font-mono text-sm" placeholder="./uploads" />
                    <p className="text-text-muted text-xs mt-1">Neustart erforderlich nach Änderung.</p>
                  </div>
                  <div>
                    <label className="label">Max. Upload-Größe (MB)</label>
                    <input type="number" value={appForm.maxUploadSize} onChange={e => setAppForm(p => ({ ...p, maxUploadSize: parseInt(e.target.value) || 500 }))} className="input" min="10" max="5000" />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4">Sicherheit</h3>
                <div>
                  <label className="label">Session-Secret (leer lassen = unverändert)</label>
                  <input type="password" value={appForm.sessionSecret} onChange={e => setAppForm(p => ({ ...p, sessionSecret: e.target.value }))} className="input font-mono" placeholder="Neues Session-Secret eingeben..." />
                  <p className="text-text-muted text-xs mt-1">Alle aktiven Sitzungen werden nach Änderung ungültig.</p>
                </div>
              </div>

              {/* PDF CI Colors */}
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Palette size={16} /> PDF CI-Farben
                </h3>
                <p className="text-text-muted text-sm mb-4">Diese Farben werden in allen PDF-Exporten (Episoden, Sponsoring-Abrechnung) verwendet.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Primärfarbe</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={pdfForm.primaryColor} onChange={e => setPdfForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                      <input type="text" value={pdfForm.primaryColor} onChange={e => setPdfForm(p => ({ ...p, primaryColor: e.target.value }))} className="input font-mono text-sm" placeholder="#7c3aed" />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ACCENT_PRESETS.map(c => (
                        <button key={c.value} type="button" onClick={() => setPdfForm(p => ({ ...p, primaryColor: c.value }))} title={c.label}
                          className={`w-6 h-6 rounded-full transition-all ${pdfForm.primaryColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-obsidian-900' : ''}`}
                          style={{ backgroundColor: c.value }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Akzentfarbe</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={pdfForm.accentColor} onChange={e => setPdfForm(p => ({ ...p, accentColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                      <input type="text" value={pdfForm.accentColor} onChange={e => setPdfForm(p => ({ ...p, accentColor: e.target.value }))} className="input font-mono text-sm" placeholder="#2563eb" />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ACCENT_PRESETS.map(c => (
                        <button key={c.value} type="button" onClick={() => setPdfForm(p => ({ ...p, accentColor: c.value }))} title={c.label}
                          className={`w-6 h-6 rounded-full transition-all ${pdfForm.accentColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-obsidian-900' : ''}`}
                          style={{ backgroundColor: c.value }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Header-Hintergrund</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={pdfForm.headerBg} onChange={e => setPdfForm(p => ({ ...p, headerBg: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                      <input type="text" value={pdfForm.headerBg} onChange={e => setPdfForm(p => ({ ...p, headerBg: e.target.value }))} className="input font-mono text-sm" placeholder="#1a1a2e" />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {SIDEBAR_PRESETS.map(c => (
                        <button key={c.value} type="button" onClick={() => setPdfForm(p => ({ ...p, headerBg: c.value }))} title={c.label}
                          className={`w-6 h-6 rounded-full transition-all ${pdfForm.headerBg === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-obsidian-900' : ''}`}
                          style={{ backgroundColor: c.value }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="mt-4 rounded-lg overflow-hidden border border-surface-border">
                  <div className="h-12 flex items-center px-4" style={{ backgroundColor: pdfForm.headerBg }}>
                    <span className="font-bold text-sm" style={{ color: pdfForm.primaryColor }}>Podcast-Name</span>
                    <span className="ml-auto text-xs text-gray-400">PDF-Vorschau</span>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="h-1 rounded" style={{ backgroundColor: pdfForm.accentColor }} />
                    <div className="mt-2 text-xs text-gray-500">Episode-Inhalt mit Akzentfarbe</div>
                  </div>
                </div>
              </div>

              {/* Invoice Number Schema */}
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Tag size={16} /> Rechnungsnummern-Schema
                </h3>
                <p className="text-text-muted text-sm mb-4">Lege fest, wie Rechnungsnummern automatisch vergeben werden. Die nächste Nummer wird beim Erstellen einer Platzierung automatisch eingetragen.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Präfix</label>
                    <input type="text" value={invoiceForm.prefix} onChange={e => setInvoiceForm(p => ({ ...p, prefix: e.target.value }))} className="input font-mono" placeholder="RE" maxLength={10} />
                    <p className="text-text-muted text-xs mt-1">z.B. RE, INV, RG</p>
                  </div>
                  <div>
                    <label className="label">Trennzeichen</label>
                    <select value={invoiceForm.separator} onChange={e => setInvoiceForm(p => ({ ...p, separator: e.target.value }))} className="input">
                      <option value="-">Bindestrich  (RE-2025-001)</option>
                      <option value="/">Schrägstrich (RE/2025/001)</option>
                      <option value=".">Punkt        (RE.2025.001)</option>
                      <option value="_">Unterstrich  (RE_2025_001)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Stellen (Nummer)</label>
                    <select value={invoiceForm.paddingDigits} onChange={e => setInvoiceForm(p => ({ ...p, paddingDigits: parseInt(e.target.value) }))} className="input">
                      <option value={2}>2 Stellen (01)</option>
                      <option value={3}>3 Stellen (001)</option>
                      <option value={4}>4 Stellen (0001)</option>
                      <option value={5}>5 Stellen (00001)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={() => setInvoiceForm(p => ({ ...p, includeYear: !p.includeYear }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${invoiceForm.includeYear ? 'bg-accent-purple' : 'bg-surface-border'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${invoiceForm.includeYear ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-text-secondary text-sm">Jahr einschließen</span>
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={() => setInvoiceForm(p => ({ ...p, includeMonth: !p.includeMonth }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${invoiceForm.includeMonth ? 'bg-accent-purple' : 'bg-surface-border'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${invoiceForm.includeMonth ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-text-secondary text-sm">Monat einschließen</span>
                  </div>
                  <div>
                    <label className="label">Nächste Nummer</label>
                    <input type="number" value={invoiceForm.nextNumber} onChange={e => setInvoiceForm(p => ({ ...p, nextNumber: parseInt(e.target.value) || 1 }))} className="input" min={1} />
                    <p className="text-text-muted text-xs mt-1">Zähler für die nächste Rechnung</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-obsidian-800 rounded-lg border border-surface-border flex items-center gap-3">
                  <span className="text-text-muted text-sm">Vorschau:</span>
                  <span className="font-mono text-accent-purple font-bold text-base">{buildInvoiceExample(invoiceForm)}</span>
                </div>
              </div>

              {/* Workflow Settings */}
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Settings size={16} /> Freigabe-Workflow
                </h3>
                <p className="text-text-muted text-sm mb-4">Steuere ob Episoden und Interview-Fragen eine Freigabe benötigen, bevor sie veröffentlicht werden können.</p>
                <div className="space-y-4">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="text-text-primary text-sm font-medium">Episoden-Freigabe erforderlich</p>
                      <p className="text-text-muted text-xs">Episoden müssen von einem Moderator freigegeben werden, bevor sie veröffentlicht werden können.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkflowForm(p => ({ ...p, episodeApprovalRequired: !p.episodeApprovalRequired }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        workflowForm.episodeApprovalRequired ? 'bg-accent-purple' : 'bg-surface-border'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workflowForm.episodeApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="text-text-primary text-sm font-medium">Interview-Fragen-Freigabe erforderlich</p>
                      <p className="text-text-muted text-xs">Interview-Fragen müssen freigegeben werden, bevor sie an den Gast gesendet werden können.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkflowForm(p => ({ ...p, interviewApprovalRequired: !p.interviewApprovalRequired }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        workflowForm.interviewApprovalRequired ? 'bg-accent-purple' : 'bg-surface-border'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workflowForm.interviewApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Speichern...' : 'Einstellungen speichern'}</span>
              </button>
            </>
          )}
        </form>
      )}
      {/* ── UPDATE TAB ──────────────────────────────────────────────────────────── */}
      {activeTab === 'update' && can('canManageSettings') && (
        <div className="max-w-2xl space-y-6">
          {/* System-Info */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Package size={16} /> System-Informationen
            </h3>
            {isLoadingUpdateStatus ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
            ) : updateStatus ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-raised rounded-lg p-3">
                  <div className="text-text-muted text-xs mb-1">Aktuelle Version</div>
                  <div className="font-mono font-bold text-accent-purple text-lg">v{updateStatus.currentVersion}</div>
                </div>
                <div className="bg-surface-raised rounded-lg p-3">
                  <div className="text-text-muted text-xs mb-1">Node.js</div>
                  <div className="font-mono text-text-primary">{updateStatus.nodeVersion}</div>
                </div>
                <div className="bg-surface-raised rounded-lg p-3">
                  <div className="text-text-muted text-xs mb-1">Plattform</div>
                  <div className="text-text-primary">{updateStatus.platform} ({updateStatus.arch})</div>
                </div>
                <div className="bg-surface-raised rounded-lg p-3">
                  <div className="text-text-muted text-xs mb-1">Ausstehende Updates</div>
                  <div className={updateStatus.pendingUpdates > 0 ? 'text-amber-400 font-semibold' : 'text-text-muted'}>
                    {updateStatus.pendingUpdates > 0 ? `${updateStatus.pendingUpdates} Datei(en)` : 'Keine'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-text-muted text-sm">Status konnte nicht geladen werden.</p>
            )}
            <button onClick={loadUpdateStatus} disabled={isLoadingUpdateStatus} className="btn-secondary mt-3">
              <RefreshCw size={14} className={isLoadingUpdateStatus ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>

          {/* ZIP Upload */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Upload size={16} /> Update-ZIP hochladen
            </h3>
            <p className="text-text-muted text-sm mb-4">
              Lade eine PodCore-Update-ZIP-Datei hoch. Die Datei wird geprüft, bevor das Update angewendet wird.
              Datenbank und Uploads bleiben erhalten.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Update-Datei auswählen (.zip)</label>
                <input type="file" accept=".zip" onChange={handleUpdateFileChange}
                  className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent-purple/20 file:text-accent-purple hover:file:bg-accent-purple/30 cursor-pointer" />
              </div>

              {updateFile && !uploadResult && (
                <div className="flex items-center gap-3">
                  <button onClick={handleUploadUpdate} disabled={isUploading} className="btn-primary">
                    {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {isUploading ? `Hochladen... ${updateUploadProgress}%` : 'Hochladen & Prüfen'}
                  </button>
                  {isUploading && (
                    <div className="flex-1 bg-surface-raised rounded-full h-2">
                      <div className="h-2 bg-accent-purple rounded-full transition-all" style={{ width: `${updateUploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}

              {/* Prüfergebnis */}
              {uploadResult && (
                <div className="space-y-3">
                  <div className="bg-surface-raised rounded-lg p-4 border border-surface-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-text-primary">Prüfergebnis</span>
                      <span className="font-mono text-accent-purple font-bold">v{uploadResult.updateVersion}</span>
                    </div>
                    <div className="text-text-muted text-xs mb-3">
                      {uploadResult.fileCount} Dateien • {(uploadResult.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    <div className="space-y-2">
                      {uploadResult.checks?.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          {c.ok
                            ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                            : c.required
                              ? <XCircle size={14} className="text-red-400 shrink-0" />
                              : <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                          <span className={`text-sm ${c.ok ? 'text-text-primary' : c.required ? 'text-red-400' : 'text-amber-400'}`}>{c.name}</span>
                          {!c.ok && c.required && <span className="text-red-400 text-xs">(Pflicht)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {uploadResult.canApply && !applyDone && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-amber-400 font-semibold text-sm">Update anwenden</p>
                          <p className="text-text-muted text-xs mt-1">Der Server wird nach dem Update automatisch neu gestartet. Alle Nutzer werden kurz getrennt.</p>
                        </div>
                      </div>
                      <button onClick={handleApplyUpdate} disabled={isApplying} className="btn-primary mt-3">
                        {isApplying ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {isApplying ? 'Update wird angewendet...' : `Update auf v${uploadResult.updateVersion} anwenden`}
                      </button>
                    </div>
                  )}

                  {!uploadResult.canApply && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <XCircle size={15} className="text-red-400" />
                        <p className="text-red-400 text-sm font-semibold">Update kann nicht angewendet werden</p>
                      </div>
                      <p className="text-text-muted text-xs mt-1">Bitte prüfe die fehlgeschlagenen Anforderungen oben.</p>
                    </div>
                  )}

                  {applyLog.length > 0 && (
                    <div className="bg-obsidian-800 rounded-lg p-3 font-mono text-xs text-text-secondary space-y-1 max-h-40 overflow-y-auto">
                      {applyLog.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  )}

                  {applyDone && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle size={15} className="text-green-400" />
                      <p className="text-green-400 text-sm font-semibold">Update erfolgreich! Seite in 5 Sekunden neu laden...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hinweis */}
          <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info size={15} className="text-accent-blue mt-0.5 shrink-0" />
              <div>
                <p className="text-accent-blue font-semibold text-sm">Hinweis zum Update-Prozess</p>
                <p className="text-text-muted text-xs mt-1">
                  Updates werden als ZIP-Dateien bereitgestellt und enthalten nur die geänderten Programmdateien.
                  Datenbank, Uploads, Branding und alle persönlichen Einstellungen bleiben vollständig erhalten.
                  Nach dem Update startet der Server automatisch neu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
