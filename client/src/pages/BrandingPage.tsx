import React, { useState, useEffect, useRef } from 'react';
import {
  Image, Upload, Trash2, Save, Loader2, CheckCircle, AlertCircle,
  HardDrive, Cloud, Server, FolderOpen, Key, RefreshCw, Download,
  FileJson, Plus, X, ExternalLink, BarChart3
} from 'lucide-react';
import { mediaApi, adminApi, backupApi, podigeeApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

export default function BrandingPage() {
  const { can, showSuccess, showError } = useApp();
  const [branding, setBranding] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'storage' | 'backup' | 'podigee'>('branding');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backupEpRef = useRef<HTMLInputElement>(null);
  const backupIdeasRef = useRef<HTMLInputElement>(null);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [podigeeForm, setPodigeeForm] = useState({ apiToken: '', podcastSubdomain: '', podcastId: '' });
  const [podigeeStatus, setPodigeeStatus] = useState<any>(null);
  const [isTestingPodigee, setIsTestingPodigee] = useState(false);
  const [storageForm, setStorageForm] = useState({
    type: 'local',
    localPath: '',
    webdavUrl: '',
    webdavUser: '',
    webdavPassword: '',
    s3Bucket: '',
    s3Region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    s3Endpoint: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const [brandingData, settingsData, statusData] = await Promise.allSettled([
        mediaApi.getBranding(),
        adminApi.getSettings(),
        podigeeApi.getStatus(),
      ]);

      if (brandingData.status === 'fulfilled') setBranding(brandingData.value);
      if (settingsData.status === 'fulfilled') {
        const s = settingsData.value;
        setSettings(s);
        if (s?.storage) {
          setStorageForm({
            type: s.storage.type || 'local',
            localPath: s.storage.localPath || '',
            webdavUrl: s.storage.webdavUrl || '',
            webdavUser: s.storage.webdavUser || '',
            webdavPassword: '',
            s3Bucket: s.storage.s3Bucket || '',
            s3Region: s.storage.s3Region || 'eu-central-1',
            s3AccessKey: s.storage.s3AccessKey || '',
            s3SecretKey: '',
            s3Endpoint: s.storage.s3Endpoint || '',
          });
        }
        if (s?.podigee) {
          setPodigeeForm({
            apiToken: '',
            podcastSubdomain: s.podigee.podcastSubdomain || '',
            podcastId: s.podigee.podcastId || '',
          });
        }
      }
      if (statusData.status === 'fulfilled') setPodigeeStatus(statusData.value);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadBackups = async () => {
    try {
      const list = await backupApi.list();
      setBackupList(list);
    } catch (err: any) { /* ignore */ }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (activeTab === 'backup') loadBackups();
  }, [activeTab]);

  const handleUploadBranding = async (type: 'logo' | 'cover', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await mediaApi.uploadBranding(type, formData);
      showSuccess(`${type === 'logo' ? 'Logo' : 'Podcast-Cover'} hochgeladen`);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteBranding = async (type: 'logo' | 'cover') => {
    if (!confirm(`${type === 'logo' ? 'Logo' : 'Cover'} löschen?`)) return;
    try {
      await mediaApi.deleteBranding(type);
      showSuccess('Gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDrop = (type: 'logo' | 'cover', e: React.DragEvent) => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(false); else setIsDraggingCover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadBranding(type, file);
  };

  const handleSaveStorage = async () => {
    setIsSaving(true);
    try {
      const payload: any = { storage: { ...storageForm } };
      // Don't save empty passwords (keep existing)
      if (!storageForm.webdavPassword) delete payload.storage.webdavPassword;
      if (!storageForm.s3SecretKey) delete payload.storage.s3SecretKey;
      await adminApi.updateSettings(payload);
      showSuccess('Speicher-Einstellungen gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleTestPodigee = async () => {
    if (!podigeeForm.apiToken) { showError('API-Token erforderlich'); return; }
    setIsTestingPodigee(true);
    try {
      const result = await podigeeApi.testConnection(podigeeForm.apiToken, podigeeForm.podcastSubdomain);
      setPodigeeStatus({ connected: true, ...result });
      if (result.podcastId) setPodigeeForm(p => ({ ...p, podcastId: result.podcastId }));
      showSuccess(`Verbunden! ${result.podcasts?.length || 0} Podcast(s) gefunden`);
    } catch (err: any) { showError(err.message); setPodigeeStatus({ connected: false }); }
    finally { setIsTestingPodigee(false); }
  };

  const handleSavePodigee = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        podigee: {
          podcastSubdomain: podigeeForm.podcastSubdomain,
          podcastId: podigeeForm.podcastId,
        },
      };
      if (podigeeForm.apiToken) payload.podigee.apiToken = podigeeForm.apiToken;
      await adminApi.updateSettings(payload);
      showSuccess('Podigee-Einstellungen gespeichert');
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleExport = async (type: 'episodes' | 'ideas' | 'full') => {
    try {
      const data = await backupApi.export(type);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcore-${type}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Backup exportiert');
      if (type === 'full') loadBackups();
    } catch (err: any) { showError(err.message); }
  };

  const handleImport = async (type: 'episodes' | 'ideas', file: File) => {
    setIsImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await backupApi.import(type, formData);
      setImportResult({ type, ...result });
      showSuccess(`Import abgeschlossen: ${result.imported} Einträge importiert`);
    } catch (err: any) { showError(err.message); }
    finally { setIsImporting(false); }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Backup "${filename}" löschen?`)) return;
    try {
      await backupApi.delete(filename);
      showSuccess('Backup gelöscht');
      loadBackups();
    } catch (err: any) { showError(err.message); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Image size={24} className="text-accent-blue" />
          Podcast-Einstellungen
        </h1>
        <p className="text-text-secondary text-sm mt-1">Branding, Speicher, Backups und Podigee-Integration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit flex-wrap">
        {[
          { key: 'branding', label: 'Branding' },
          { key: 'storage', label: 'Speicher' },
          { key: 'backup', label: 'Backup & Export' },
          { key: 'podigee', label: 'Podigee' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.key === 'podigee' && podigeeStatus?.connected && <span className="inline-block w-2 h-2 bg-accent-green rounded-full mr-1.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* BRANDING TAB */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Image size={16} />
              Podcast-Logo
            </h3>
            <p className="text-text-secondary text-sm">Wird in der App-Navigation und in Berichten verwendet. Empfohlen: quadratisch, min. 400×400px, PNG/SVG.</p>

            {branding?.logo ? (
              <div className="relative group">
                <img src={`${branding.logo}?t=${Date.now()}`} alt="Logo" className="w-32 h-32 object-contain rounded-xl bg-obsidian-800 p-2" />
                {can('canManageSettings') && (
                  <button onClick={() => handleDeleteBranding('logo')} className="absolute top-1 right-1 p-1.5 bg-accent-red text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 bg-obsidian-800 rounded-xl flex items-center justify-center text-text-muted">
                <Image size={32} />
              </div>
            )}

            {can('canManageSettings') && (
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingLogo(true); }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={e => handleDrop('logo', e)}
                onClick={() => logoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingLogo ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}
              >
                <Upload size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary text-sm">Logo hochladen</p>
                <p className="text-text-muted text-xs mt-1">PNG, JPG, SVG, WebP · max. 20 MB</p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadBranding('logo', e.target.files[0])} />
              </div>
            )}
          </div>

          {/* Podcast Cover */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Image size={16} />
              Podcast-Cover
            </h3>
            <p className="text-text-secondary text-sm">Das Podcast-Artwork. Empfohlen: 3000×3000px, JPG/PNG (Podcast-Standard).</p>

            {branding?.cover ? (
              <div className="relative group">
                <img src={`${branding.cover}?t=${Date.now()}`} alt="Cover" className="w-32 h-32 object-cover rounded-xl" />
                {can('canManageSettings') && (
                  <button onClick={() => handleDeleteBranding('cover')} className="absolute top-1 right-1 p-1.5 bg-accent-red text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 bg-obsidian-800 rounded-xl flex items-center justify-center text-text-muted">
                <Image size={32} />
              </div>
            )}

            {can('canManageSettings') && (
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingCover(true); }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={e => handleDrop('cover', e)}
                onClick={() => coverInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingCover ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}
              >
                <Upload size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary text-sm">Cover hochladen</p>
                <p className="text-text-muted text-xs mt-1">PNG, JPG · min. 1400×1400px · max. 20 MB</p>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadBranding('cover', e.target.files[0])} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STORAGE TAB */}
      {activeTab === 'storage' && can('canManageSettings') && (
        <div className="max-w-2xl space-y-6">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Speicher-Backend</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: 'local', label: 'Lokal', icon: <HardDrive size={20} />, desc: 'Auf diesem Server' },
                { value: 'webdav', label: 'WebDAV', icon: <Cloud size={20} />, desc: 'Nextcloud, OneDrive...' },
                { value: 's3', label: 'S3-kompatibel', icon: <Server size={20} />, desc: 'AWS, Minio, Backblaze...' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setStorageForm(p => ({ ...p, type: opt.value }))}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${storageForm.type === opt.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}>
                  <div className={`flex justify-center mb-2 ${storageForm.type === opt.value ? 'text-accent-purple' : 'text-text-muted'}`}>{opt.icon}</div>
                  <p className="text-text-primary text-sm font-medium">{opt.label}</p>
                  <p className="text-text-muted text-xs mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Local */}
            {storageForm.type === 'local' && (
              <div>
                <label className="label">Lokaler Pfad</label>
                <div className="flex gap-2">
                  <input type="text" value={storageForm.localPath} onChange={e => setStorageForm(p => ({ ...p, localPath: e.target.value }))} className="input flex-1 font-mono text-sm" placeholder="/home/user/.podcore/assets" />
                </div>
                <p className="text-text-muted text-xs mt-1">Absoluter Pfad zum Upload-Verzeichnis. Leer lassen für Standard (~/.podcore/assets).</p>
              </div>
            )}

            {/* WebDAV */}
            {storageForm.type === 'webdav' && (
              <div className="space-y-4">
                <div>
                  <label className="label">WebDAV-URL *</label>
                  <input type="url" value={storageForm.webdavUrl} onChange={e => setStorageForm(p => ({ ...p, webdavUrl: e.target.value }))} className="input" placeholder="https://nextcloud.example.com/remote.php/dav/files/user/PodCore/" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Benutzername</label>
                    <input type="text" value={storageForm.webdavUser} onChange={e => setStorageForm(p => ({ ...p, webdavUser: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Passwort</label>
                    <input type="password" value={storageForm.webdavPassword} onChange={e => setStorageForm(p => ({ ...p, webdavPassword: e.target.value }))} className="input" placeholder="Leer = unverändert" />
                  </div>
                </div>
                <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-3 text-sm text-accent-blue">
                  Kompatibel mit Nextcloud, ownCloud, OneDrive (Business), SharePoint und anderen WebDAV-Servern.
                </div>
              </div>
            )}

            {/* S3 */}
            {storageForm.type === 's3' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Bucket-Name *</label>
                    <input type="text" value={storageForm.s3Bucket} onChange={e => setStorageForm(p => ({ ...p, s3Bucket: e.target.value }))} className="input" placeholder="mein-podcast-bucket" />
                  </div>
                  <div>
                    <label className="label">Region</label>
                    <input type="text" value={storageForm.s3Region} onChange={e => setStorageForm(p => ({ ...p, s3Region: e.target.value }))} className="input" placeholder="eu-central-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Access Key</label>
                    <input type="text" value={storageForm.s3AccessKey} onChange={e => setStorageForm(p => ({ ...p, s3AccessKey: e.target.value }))} className="input font-mono text-sm" />
                  </div>
                  <div>
                    <label className="label">Secret Key</label>
                    <input type="password" value={storageForm.s3SecretKey} onChange={e => setStorageForm(p => ({ ...p, s3SecretKey: e.target.value }))} className="input" placeholder="Leer = unverändert" />
                  </div>
                </div>
                <div>
                  <label className="label">Endpoint (optional, für S3-kompatible Dienste)</label>
                  <input type="url" value={storageForm.s3Endpoint} onChange={e => setStorageForm(p => ({ ...p, s3Endpoint: e.target.value }))} className="input" placeholder="https://s3.eu-central-1.amazonaws.com" />
                  <p className="text-text-muted text-xs mt-1">Für Backblaze B2, Minio, Cloudflare R2 etc. Leer lassen für AWS S3.</p>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSaveStorage} disabled={isSaving} className="btn-primary">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Speicher-Einstellungen speichern</span>
          </button>
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Export */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Download size={16} className="text-accent-green" />
              Daten exportieren
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'episodes', label: 'Episoden', desc: 'Alle Episoden mit Blöcken und Notizen', color: 'text-accent-purple' },
                { type: 'ideas', label: 'Redaktion', desc: 'Ideen, Redaktionsplan und Notizen', color: 'text-accent-orange' },
                { type: 'full', label: 'Vollständig', desc: 'Komplettes Datenbank-Backup', color: 'text-accent-green' },
              ].map(opt => (
                <button key={opt.type} onClick={() => handleExport(opt.type as any)}
                  className="card bg-obsidian-800 hover:border-surface-border-light transition-all text-left group">
                  <div className={`text-2xl mb-2 ${opt.color}`}><FileJson size={24} /></div>
                  <p className="text-text-primary font-medium">{opt.label}</p>
                  <p className="text-text-muted text-xs mt-1">{opt.desc}</p>
                  <p className="text-accent-green text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">JSON herunterladen →</p>
                </button>
              ))}
            </div>
          </div>

          {/* Import */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Upload size={16} className="text-accent-blue" />
              Daten importieren
            </h3>
            <p className="text-text-secondary text-sm mb-4">Importiere Daten aus einem PodCore-Backup. Bestehende Einträge mit gleicher ID werden übersprungen.</p>

            {importResult && (
              <div className={`mb-4 p-3 rounded-xl border ${importResult.imported > 0 ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' : 'bg-surface-overlay border-surface-border text-text-secondary'}`}>
                <p className="font-medium">Import abgeschlossen</p>
                <p className="text-sm mt-1">{importResult.imported} importiert · {importResult.skipped || 0} übersprungen · {importResult.total} gesamt</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Episoden importieren</label>
                <button onClick={() => backupEpRef.current?.click()} disabled={isImporting} className="btn-secondary w-full">
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>Episoden-Backup wählen</span>
                </button>
                <input ref={backupEpRef} type="file" accept=".json" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImport('episodes', e.target.files[0])} />
              </div>
              <div>
                <label className="label">Redaktion importieren</label>
                <button onClick={() => backupIdeasRef.current?.click()} disabled={isImporting} className="btn-secondary w-full">
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>Redaktions-Backup wählen</span>
                </button>
                <input ref={backupIdeasRef} type="file" accept=".json" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImport('ideas', e.target.files[0])} />
              </div>
            </div>
          </div>

          {/* Saved Backups */}
          {backupList.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <HardDrive size={16} className="text-text-muted" />
                  Gespeicherte Backups
                </h3>
                <button onClick={loadBackups} className="btn-ghost p-2"><RefreshCw size={14} /></button>
              </div>
              <div className="space-y-2">
                {backupList.map(backup => (
                  <div key={backup.filename} className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800 group">
                    <FileJson size={16} className="text-accent-green flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-mono truncate">{backup.filename}</p>
                      <p className="text-text-muted text-xs">{new Date(backup.createdAt).toLocaleString('de-DE')} · {(backup.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {can('canManageSettings') && (
                      <button onClick={() => handleDeleteBackup(backup.filename)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PODIGEE TAB */}
      {activeTab === 'podigee' && can('canManageSettings') && (
        <div className="max-w-2xl space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <BarChart3 size={16} className="text-accent-cyan" />
                Podigee API-Verbindung
              </h3>
              {podigeeStatus?.connected && (
                <span className="flex items-center gap-1.5 text-accent-green text-sm">
                  <CheckCircle size={14} />
                  Verbunden
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">API-Token *</label>
                <input type="password" value={podigeeForm.apiToken} onChange={e => setPodigeeForm(p => ({ ...p, apiToken: e.target.value }))} className="input font-mono" placeholder="Leer lassen = vorhandenen Token behalten" />
                <p className="text-text-muted text-xs mt-1">
                  Zu finden unter: Podigee → Einstellungen → API →{' '}
                  <a href="https://app.podigee.com" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline inline-flex items-center gap-0.5">
                    app.podigee.com <ExternalLink size={10} />
                  </a>
                </p>
              </div>
              <div>
                <label className="label">Podcast-Subdomain</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={podigeeForm.podcastSubdomain} onChange={e => setPodigeeForm(p => ({ ...p, podcastSubdomain: e.target.value }))} className="input flex-1" placeholder="mein-podcast" />
                  <span className="text-text-muted text-sm">.podigee.io</span>
                </div>
              </div>
              {podigeeForm.podcastId && (
                <div>
                  <label className="label">Podcast-ID (automatisch)</label>
                  <input type="text" value={podigeeForm.podcastId} readOnly className="input font-mono text-sm bg-obsidian-800" />
                </div>
              )}

              {/* Test result */}
              {podigeeStatus?.connected && podigeeStatus?.podcasts && (
                <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-3">
                  <p className="text-accent-green text-sm font-medium mb-2">Verfügbare Podcasts:</p>
                  {podigeeStatus.podcasts.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => setPodigeeForm(prev => ({ ...prev, podcastSubdomain: p.subdomain, podcastId: String(p.id) }))}
                        className={`text-left flex-1 p-2 rounded-lg transition-colors ${podigeeForm.podcastId === String(p.id) ? 'bg-accent-green/20 text-accent-green' : 'text-text-secondary hover:bg-surface-raised'}`}>
                        {p.title} <span className="text-text-muted">· {p.subdomain}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleTestPodigee} disabled={isTestingPodigee || !podigeeForm.apiToken} className="btn-secondary">
                  {isTestingPodigee ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>Verbindung testen</span>
                </button>
                <button onClick={handleSavePodigee} disabled={isSaving} className="btn-primary">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Speichern</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
