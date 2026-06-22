import React, { useState, useEffect } from 'react';
import { Settings, User, FolderOpen, Save, Eye, EyeOff, Loader2, RefreshCw, Check } from 'lucide-react';
import { adminApi, authApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

export default function SettingsPage() {
  const { user, can, showSuccess, showError, refreshUser } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'app'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    avatarColor: user?.avatarColor || '#7c3aed',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  // App settings form
  const [appForm, setAppForm] = useState({
    uploadDir: './uploads',
    maxUploadSize: 500,
    sessionSecret: '',
    port: 3001,
    appName: 'PodCore',
    externalHintText: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm(p => ({
        ...p,
        displayName: user.displayName || '',
        email: user.email || '',
        avatarColor: user.avatarColor || '#7c3aed',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (can('canManageSettings')) {
      adminApi.getSettings()
        .then(data => {
          setSettings(data);
          setAppForm({
            uploadDir: data.uploadDir || './uploads',
            maxUploadSize: data.maxUploadSize || 500,
            sessionSecret: '',
            port: data.port || 3001,
            appName: data.appName || 'PodCore',
            externalHintText: data.externalHintText || '',
          });
        })
        .catch(err => showError(err.message))
        .finally(() => setIsLoadingSettings(false));
    } else {
      setIsLoadingSettings(false);
    }
  }, [can]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      showError('Passwörter stimmen nicht überein');
      return;
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = { ...appForm };
      if (!payload.sessionSecret) delete payload.sessionSecret;
      await adminApi.updateSettings(payload);
      showSuccess('Einstellungen gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user?.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Settings size={24} className="text-text-secondary" />
          Einstellungen
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'profile', label: 'Mein Profil' },
          ...(can('canManageSettings') ? [{ key: 'app', label: 'App-Einstellungen' }] : []),
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-6">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <User size={16} />
              Profil-Informationen
            </h3>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: profileForm.avatarColor }}>
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
                  <div className="flex gap-2">
                    {['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'].map(color => (
                      <button key={color} type="button" onClick={() => setProfileForm(p => ({ ...p, avatarColor: color }))}
                        className={`w-7 h-7 rounded-full transition-all ${profileForm.avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-obsidian-900' : ''}`}
                        style={{ backgroundColor: color }} />
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

      {/* APP SETTINGS TAB */}
      {activeTab === 'app' && can('canManageSettings') && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6">
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
                    <textarea value={appForm.externalHintText} onChange={e => setAppForm(p => ({ ...p, externalHintText: e.target.value }))} className="textarea" rows={3} placeholder="Hinweistext der bei externen Terminen angezeigt wird..." />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FolderOpen size={16} />
                  Datei-Speicherung
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Upload-Verzeichnis</label>
                    <input type="text" value={appForm.uploadDir} onChange={e => setAppForm(p => ({ ...p, uploadDir: e.target.value }))} className="input font-mono text-sm" placeholder="./uploads" />
                    <p className="text-text-muted text-xs mt-1">Absoluter oder relativer Pfad zum Upload-Ordner. Neustart erforderlich.</p>
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

              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Speichern...' : 'Einstellungen speichern'}</span>
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
