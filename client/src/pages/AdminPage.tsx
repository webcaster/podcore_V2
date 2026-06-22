import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Plus, Edit2, Trash2, Key, Check, X, Eye, EyeOff,
  Server, Database, HardDrive, Activity, RefreshCw, Loader2, Lock
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const ROLES = [
  { value: 'admin', label: 'Administrator', color: 'text-accent-red', desc: 'Vollzugriff auf alle Bereiche' },
  { value: 'produktion', label: 'Produktion', color: 'text-accent-purple', desc: 'Episoden, Media Library, Sponsoring' },
  { value: 'redakteur', label: 'Redakteur', color: 'text-accent-blue', desc: 'Redaktions-Hub, Episoden bearbeiten' },
  { value: 'moderator', label: 'Moderator', color: 'text-accent-green', desc: 'Episoden ansehen und bearbeiten' },
  { value: 'leser', label: 'Leser', color: 'text-text-muted', desc: 'Nur Lesezugriff' },
];

const ALL_PERMISSIONS = [
  { key: 'canViewEpisodes', label: 'Episoden ansehen', group: 'Episoden' },
  { key: 'canCreateEpisodes', label: 'Episoden erstellen', group: 'Episoden' },
  { key: 'canEditEpisodes', label: 'Episoden bearbeiten', group: 'Episoden' },
  { key: 'canDeleteEpisodes', label: 'Episoden löschen', group: 'Episoden' },
  { key: 'canEditScript', label: 'Script bearbeiten', group: 'Episoden' },
  { key: 'canViewIdeas', label: 'Ideen ansehen', group: 'Redaktions-Hub' },
  { key: 'canCreateIdeas', label: 'Ideen erstellen', group: 'Redaktions-Hub' },
  { key: 'canEditIdeas', label: 'Ideen bearbeiten', group: 'Redaktions-Hub' },
  { key: 'canDeleteIdeas', label: 'Ideen löschen', group: 'Redaktions-Hub' },
  { key: 'canViewEditorialPlan', label: 'Redaktionsplan ansehen', group: 'Redaktions-Hub' },
  { key: 'canEditEditorialPlan', label: 'Redaktionsplan bearbeiten', group: 'Redaktions-Hub' },
  { key: 'canViewInterviews', label: 'Interviews ansehen', group: 'Redaktions-Hub' },
  { key: 'canEditInterviews', label: 'Interviews bearbeiten', group: 'Redaktions-Hub' },
  { key: 'canViewNotes', label: 'Notizen ansehen', group: 'Redaktions-Hub' },
  { key: 'canEditNotes', label: 'Notizen bearbeiten', group: 'Redaktions-Hub' },
  { key: 'canViewMedia', label: 'Media Library ansehen', group: 'Media Library' },
  { key: 'canUploadMedia', label: 'Assets hochladen', group: 'Media Library' },
  { key: 'canDeleteMedia', label: 'Assets löschen', group: 'Media Library' },
  { key: 'canCommentMedia', label: 'Kommentare hinzufügen', group: 'Media Library' },
  { key: 'canViewSponsors', label: 'Sponsoren ansehen', group: 'Sponsoring' },
  { key: 'canCreateSponsors', label: 'Sponsoren erstellen', group: 'Sponsoring' },
  { key: 'canEditSponsors', label: 'Sponsoren bearbeiten', group: 'Sponsoring' },
  { key: 'canDeleteSponsors', label: 'Sponsoren löschen', group: 'Sponsoring' },
  { key: 'canManageSponsors', label: 'Kategorien verwalten', group: 'Sponsoring' },
  { key: 'canViewSponsorReports', label: 'Auswertungen ansehen', group: 'Sponsoring' },
  { key: 'canManageUsers', label: 'Benutzer verwalten', group: 'Administration' },
  { key: 'canManageSettings', label: 'Einstellungen verwalten', group: 'Administration' },
  { key: 'canViewLogs', label: 'Logs ansehen', group: 'Administration' },
];

const PERMISSION_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.key),
  produktion: ['canViewEpisodes', 'canCreateEpisodes', 'canEditEpisodes', 'canEditScript', 'canViewMedia', 'canUploadMedia', 'canDeleteMedia', 'canCommentMedia', 'canViewSponsors', 'canEditSponsors', 'canViewSponsorReports', 'canViewIdeas', 'canViewNotes'],
  redakteur: ['canViewEpisodes', 'canCreateEpisodes', 'canEditEpisodes', 'canEditScript', 'canViewIdeas', 'canCreateIdeas', 'canEditIdeas', 'canDeleteIdeas', 'canViewEditorialPlan', 'canEditEditorialPlan', 'canViewInterviews', 'canEditInterviews', 'canViewNotes', 'canEditNotes', 'canViewMedia', 'canCommentMedia'],
  moderator: ['canViewEpisodes', 'canEditEpisodes', 'canEditScript', 'canViewIdeas', 'canViewEditorialPlan', 'canViewInterviews', 'canViewNotes', 'canViewMedia', 'canCommentMedia'],
  leser: ['canViewEpisodes', 'canViewIdeas', 'canViewMedia'],
};

export default function AdminPage() {
  const { can, user: currentUser, showSuccess, showError } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs'>('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [permUser, setPermUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ username: '', displayName: '', email: '', password: '', role: 'redakteur', avatarColor: '#7c3aed' });
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [userData, sysData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getSystem(),
      ]);
      setUsers(userData);
      setSystemInfo(sysData);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const data = await adminApi.getLogs();
      setLogs(data);
    } catch (err: any) { showError(err.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingUser) {
        const payload: any = { displayName: userForm.displayName, email: userForm.email, role: userForm.role, avatarColor: userForm.avatarColor };
        if (userForm.password) payload.password = userForm.password;
        await adminApi.updateUser(editingUser.id, payload);
        showSuccess('Benutzer aktualisiert');
      } else {
        await adminApi.createUser(userForm);
        showSuccess('Benutzer erstellt');
      }
      setShowUserModal(false);
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Benutzer "${name}" löschen?`)) return;
    try {
      await adminApi.deleteUser(id);
      showSuccess('Benutzer gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', displayName: '', email: '', password: '', role: 'redakteur', avatarColor: '#7c3aed' });
    setShowUserModal(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ username: u.username, displayName: u.displayName, email: u.email || '', password: '', role: u.role, avatarColor: u.avatarColor || '#7c3aed' });
    setShowUserModal(true);
  };

  const openPermissions = (u: any) => {
    setPermUser(u);
    const perms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = u.permissions?.[p.key] === true; });
    setPermissions(perms);
    setShowPermModal(true);
  };

  const applyRoleDefaults = (role: string) => {
    const defaults = DEFAULT_PERMISSIONS[role] || [];
    const perms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = defaults.includes(p.key); });
    setPermissions(perms);
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setIsSaving(true);
    try {
      await adminApi.updateUser(permUser.id, { permissions });
      showSuccess('Berechtigungen gespeichert');
      setShowPermModal(false);
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const roleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[4];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Shield size={24} className="text-accent-red" />
          Administration
        </h1>
        <p className="text-text-secondary text-sm mt-1">Benutzerverwaltung, Berechtigungen und Systemstatus</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'users', label: 'Benutzer' },
          { key: 'system', label: 'System' },
          { key: 'logs', label: 'Logs' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-text-secondary text-sm">{users.length} Benutzer</p>
            <button onClick={openCreateUser} className="btn-primary"><Plus size={16} /><span>Neuer Benutzer</span></button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const ri = roleInfo(u.role);
                const initials = u.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || u.username[0]?.toUpperCase();
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="card flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: u.avatarColor || '#7c3aed' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary font-medium">{u.displayName}</p>
                        {isCurrentUser && <span className="badge bg-accent-purple/20 text-accent-purple text-xs">Du</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                        <span className="font-mono">@{u.username}</span>
                        {u.email && <span>{u.email}</span>}
                      </div>
                    </div>
                    <span className={`badge text-xs ${
                      u.role === 'admin' ? 'bg-accent-red/20 text-accent-red' :
                      u.role === 'produktion' ? 'bg-accent-purple/20 text-accent-purple' :
                      u.role === 'redakteur' ? 'bg-accent-blue/20 text-accent-blue' :
                      u.role === 'moderator' ? 'bg-accent-green/20 text-accent-green' :
                      'bg-surface-overlay text-text-muted'
                    }`}>{ri.label}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openPermissions(u)} className="p-2 text-text-muted hover:text-accent-orange hover:bg-accent-orange/10 rounded-lg transition-colors" title="Berechtigungen">
                        <Key size={14} />
                      </button>
                      <button onClick={() => openEditUser(u)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      {!isCurrentUser && (
                        <button onClick={() => handleDeleteUser(u.id, u.displayName)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Role Overview */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Rollen-Übersicht</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ROLES.map(role => (
                <div key={role.value} className="bg-obsidian-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={14} className={role.color} />
                    <h4 className={`font-medium text-sm ${role.color}`}>{role.label}</h4>
                  </div>
                  <p className="text-text-muted text-xs">{role.desc}</p>
                  <p className="text-text-secondary text-xs mt-2">{users.filter(u => u.role === role.value).length} Benutzer</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : systemInfo && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Episoden', value: systemInfo.episodes, icon: <Activity size={18} />, color: 'text-accent-purple' },
                  { label: 'Ideen', value: systemInfo.ideas, icon: <Activity size={18} />, color: 'text-accent-orange' },
                  { label: 'Assets', value: systemInfo.assets, icon: <HardDrive size={18} />, color: 'text-accent-blue' },
                  { label: 'Sponsoren', value: systemInfo.sponsors, icon: <Activity size={18} />, color: 'text-accent-green' },
                ].map(stat => (
                  <div key={stat.label} className="card text-center py-4">
                    <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
                    <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                    <p className="text-text-muted text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Server size={16} className="text-accent-blue" />
                  System-Informationen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Version', value: systemInfo.version || '2.0.0' },
                    { label: 'Node.js', value: systemInfo.nodeVersion },
                    { label: 'Plattform', value: systemInfo.platform },
                    { label: 'Architektur', value: systemInfo.arch },
                    { label: 'Datenbankgröße', value: systemInfo.dbSize },
                    { label: 'Upload-Ordner', value: systemInfo.uploadDir || './uploads' },
                    { label: 'Server-Port', value: systemInfo.port || '3001' },
                    { label: 'Uptime', value: systemInfo.uptime },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-2 border-b border-surface-border/50">
                      <span className="text-text-muted">{item.label}</span>
                      <span className="text-text-primary font-mono text-xs">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Database size={16} className="text-accent-green" />
                  Datenbank
                </h3>
                <p className="text-text-secondary text-sm mb-3">SQLite-Datenbank — keine externe Datenbankinstallation erforderlich</p>
                <div className="flex gap-3">
                  <button onClick={async () => {
                    try {
                      const data = await adminApi.exportDb();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `podcore-backup-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) { showError(err.message); }
                  }} className="btn-secondary">
                    <HardDrive size={16} /><span>Backup exportieren</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-text-secondary text-sm">Systemereignisse und Fehler</p>
            <button onClick={loadLogs} className="btn-ghost p-2"><RefreshCw size={16} /></button>
          </div>
          {logs.length === 0 ? (
            <div className="card text-center py-12">
              <Activity size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Keine Logs verfügbar</p>
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                  log.level === 'error' ? 'bg-accent-red/10 text-accent-red' :
                  log.level === 'warn' ? 'bg-accent-orange/10 text-accent-orange' :
                  'bg-obsidian-800 text-text-secondary'
                }`}>
                  <span className="text-text-muted flex-shrink-0">{new Date(log.timestamp).toLocaleString('de-DE')}</span>
                  <span className={`uppercase font-bold flex-shrink-0 w-12 ${
                    log.level === 'error' ? 'text-accent-red' :
                    log.level === 'warn' ? 'text-accent-orange' :
                    'text-accent-blue'
                  }`}>{log.level}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}>
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Benutzername *</label>
              <input type="text" value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} className="input" required autoFocus disabled={!!editingUser} />
            </div>
            <div>
              <label className="label">Anzeigename *</label>
              <input type="text" value={userForm.displayName} onChange={e => setUserForm(p => ({ ...p, displayName: e.target.value }))} className="input" required />
            </div>
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">{editingUser ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort *'}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} className="input pr-10" required={!editingUser} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rolle</label>
              <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))} className="select">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Avatar-Farbe</label>
              <div className="flex items-center gap-2">
                <input type="color" value={userForm.avatarColor} onChange={e => setUserForm(p => ({ ...p, avatarColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: userForm.avatarColor }}>
                  {userForm.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editingUser ? 'Speichern' : 'Benutzer erstellen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermModal} onClose={() => setShowPermModal(false)} title={`Berechtigungen: ${permUser?.displayName}`} size="xl">
        <div className="space-y-4">
          {/* Role presets */}
          <div>
            <label className="label">Schnellauswahl nach Rolle</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => applyRoleDefaults(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${r.color} border-current/30 hover:bg-current/10`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permission groups */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {PERMISSION_GROUPS.map(group => (
              <div key={group}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-text-primary font-medium text-sm">{group}</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
                      setPermissions(prev => { const n = { ...prev }; groupPerms.forEach(k => { n[k] = true; }); return n; });
                    }} className="text-xs text-accent-green hover:underline">Alle</button>
                    <button type="button" onClick={() => {
                      const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
                      setPermissions(prev => { const n = { ...prev }; groupPerms.forEach(k => { n[k] = false; }); return n; });
                    }} className="text-xs text-accent-red hover:underline">Keine</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-surface-raised transition-colors">
                      <div
                        onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all cursor-pointer ${permissions[perm.key] ? 'bg-accent-purple border-accent-purple' : 'border-surface-border-light'}`}
                      >
                        {permissions[perm.key] && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-text-secondary text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
            <button type="button" onClick={() => setShowPermModal(false)} className="btn-secondary">Abbrechen</button>
            <button onClick={handleSavePermissions} disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              <span>Berechtigungen speichern</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
