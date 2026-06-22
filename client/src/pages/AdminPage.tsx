import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Plus, Edit2, Trash2, Key, Check, X, Eye, EyeOff,
  Server, Database, HardDrive, Activity, RefreshCw, Loader2, Lock, Tag, Save
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

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
  { key: 'canViewSponsorReports', label: 'Auswertungen ansehen', group: 'Sponsoring' },
  { key: 'canManageUsers', label: 'Benutzer verwalten', group: 'Administration' },
  { key: 'canManageSettings', label: 'Einstellungen verwalten', group: 'Administration' },
  { key: 'canViewErrorLogs', label: 'Logs ansehen', group: 'Administration' },
  { key: 'canExport', label: 'Daten exportieren', group: 'Administration' },
];

const PERMISSION_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const emptyPermissions = () => Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false]));

export default function AdminPage() {
  const { can, user: currentUser, showSuccess, showError } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'system' | 'logs'>('users');

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: '', displayName: '', email: '', password: '', role: 'redakteur', avatarColor: '#7c3aed' });
  const [showPassword, setShowPassword] = useState(false);

  // Permissions modal
  const [showPermModal, setShowPermModal] = useState(false);
  const [permUser, setPermUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(emptyPermissions());

  // Role editor modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', label: '', description: '', color: '#7c3aed' });
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>(emptyPermissions());

  const [logs, setLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [userData, sysData, rolesData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getSystem(),
        adminApi.listRoles(),
      ]);
      setUsers(userData);
      setSystemInfo(sysData);
      setRoles(rolesData);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const data = await adminApi.getLogs();
      setLogs(data?.items || data || []);
    } catch (err: any) { showError(err.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab]);

  // ── User CRUD ──────────────────────────────────────────────
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

  // ── Permissions ───────────────────────────────────────────
  const openPermissions = (u: any) => {
    setPermUser(u);
    const perms: Record<string, boolean> = emptyPermissions();
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = u.permissions?.[p.key] === true; });
    setPermissions(perms);
    setShowPermModal(true);
  };

  const applyRoleDefaults = (rolePerms: Record<string, boolean>) => {
    const perms: Record<string, boolean> = emptyPermissions();
    Object.keys(rolePerms).forEach(k => { perms[k] = rolePerms[k] === true; });
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

  // ── Roles CRUD ────────────────────────────────────────────
  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', label: '', description: '', color: '#7c3aed' });
    setRolePermissions(emptyPermissions());
    setShowRoleModal(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, label: role.label, description: role.description || '', color: role.color || '#7c3aed' });
    const perms: Record<string, boolean> = emptyPermissions();
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = role.permissions?.[p.key] === true; });
    setRolePermissions(perms);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingRole) {
        await adminApi.updateRole(editingRole.id, {
          label: roleForm.label,
          description: roleForm.description,
          color: roleForm.color,
          permissions: rolePermissions,
        });
        showSuccess('Rolle gespeichert');
      } else {
        await adminApi.createRole({
          name: roleForm.name,
          label: roleForm.label,
          description: roleForm.description,
          color: roleForm.color,
          permissions: rolePermissions,
        });
        showSuccess('Rolle erstellt');
      }
      setShowRoleModal(false);
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteRole = async (id: string, label: string) => {
    if (!confirm(`Rolle "${label}" löschen?`)) return;
    try {
      await adminApi.deleteRole(id);
      showSuccess('Rolle gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const toggleAllRolePerms = (group: string, value: boolean) => {
    const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    setRolePermissions(prev => { const n = { ...prev }; groupPerms.forEach(k => { n[k] = value; }); return n; });
  };

  const roleInfo = (roleName: string) => roles.find(r => r.name === roleName) || { label: roleName, color: '#6b7280' };

  const roleBadgeClass = (color: string) => {
    const map: Record<string, string> = {
      '#dc2626': 'bg-accent-red/20 text-accent-red',
      '#7c3aed': 'bg-accent-purple/20 text-accent-purple',
      '#2563eb': 'bg-accent-blue/20 text-accent-blue',
      '#059669': 'bg-accent-green/20 text-accent-green',
    };
    return map[color] || 'bg-surface-overlay text-text-muted';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Shield size={24} className="text-accent-red" />
          Administration
        </h1>
        <p className="text-text-secondary text-sm mt-1">Benutzerverwaltung, Rollen, Berechtigungen und Systemstatus</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'users', label: 'Benutzer', icon: <Users size={14} /> },
          { key: 'roles', label: 'Rollen', icon: <Tag size={14} /> },
          { key: 'system', label: 'System', icon: <Server size={14} /> },
          { key: 'logs', label: 'Logs', icon: <Activity size={14} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ──────────────────────────────────────── */}
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
                        {!u.isActive && <span className="badge bg-accent-red/20 text-accent-red text-xs">Inaktiv</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                        <span className="font-mono">@{u.username}</span>
                        {u.email && <span>{u.email}</span>}
                      </div>
                    </div>
                    <span className={`badge text-xs ${roleBadgeClass(ri.color)}`}>{ri.label}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openPermissions(u)} className="p-2 text-text-muted hover:text-accent-orange hover:bg-accent-orange/10 rounded-lg transition-colors" title="Berechtigungen bearbeiten">
                        <Key size={14} />
                      </button>
                      <button onClick={() => openEditUser(u)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors" title="Benutzer bearbeiten">
                        <Edit2 size={14} />
                      </button>
                      {!isCurrentUser && (
                        <button onClick={() => handleDeleteUser(u.id, u.displayName)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors" title="Benutzer löschen">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ROLES TAB ──────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-secondary text-sm">{roles.length} Rollen — System-Rollen können nicht gelöscht, aber bearbeitet werden</p>
            </div>
            <button onClick={openCreateRole} className="btn-primary"><Plus size={16} /><span>Neue Rolle</span></button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roles.map(role => {
                const userCount = users.filter(u => u.role === role.name).length;
                const permCount = Object.values(role.permissions || {}).filter(Boolean).length;
                return (
                  <div key={role.id} className="card group relative">
                    {/* Color stripe */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: role.color }} />
                    <div className="pt-2">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: role.color + '22' }}>
                            <Shield size={16} style={{ color: role.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary text-sm">{role.label}</h3>
                            <span className="text-xs font-mono text-text-muted">{role.name}</span>
                          </div>
                        </div>
                        {role.isSystem && (
                          <span className="badge bg-surface-overlay text-text-muted text-xs">System</span>
                        )}
                      </div>

                      {role.description && (
                        <p className="text-text-secondary text-xs mb-3">{role.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
                        <span className="flex items-center gap-1"><Users size={12} /> {userCount} Benutzer</span>
                        <span className="flex items-center gap-1"><Key size={12} /> {permCount} Rechte</span>
                      </div>

                      {/* Permission preview */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {ALL_PERMISSIONS.filter(p => role.permissions?.[p.key]).slice(0, 6).map(p => (
                          <span key={p.key} className="text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted">{p.label}</span>
                        ))}
                        {Object.values(role.permissions || {}).filter(Boolean).length > 6 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted">
                            +{Object.values(role.permissions || {}).filter(Boolean).length - 6} weitere
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => openEditRole(role)} className="btn-secondary flex-1 text-xs py-1.5">
                          <Edit2 size={13} /><span>Bearbeiten</span>
                        </button>
                        {!role.isSystem && (
                          <button onClick={() => handleDeleteRole(role.id, role.label)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM TAB ─────────────────────────────────────── */}
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
                  <Server size={16} className="text-accent-purple" />
                  System-Informationen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Version', value: systemInfo.version || '2.0.1' },
                    { label: 'Node.js', value: systemInfo.nodeVersion },
                    { label: 'Plattform', value: systemInfo.platform },
                    { label: 'Architektur', value: systemInfo.arch },
                    { label: 'Datenbankgröße', value: systemInfo.dbSize },
                    { label: 'Upload-Ordner', value: systemInfo.uploadDir || '~/.podcore' },
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

      {/* ── LOGS TAB ───────────────────────────────────────── */}
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

      {/* ── User Modal ─────────────────────────────────────── */}
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
                {roles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
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

      {/* ── Permissions Modal ──────────────────────────────── */}
      <Modal isOpen={showPermModal} onClose={() => setShowPermModal(false)} title={`Berechtigungen: ${permUser?.displayName}`} size="xl">
        <div className="space-y-4">
          {/* Role presets */}
          <div>
            <label className="label">Schnellauswahl nach Rolle</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map(r => (
                <button key={r.name} type="button" onClick={() => applyRoleDefaults(r.permissions)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 transition-all"
                  style={{ color: r.color }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permission groups */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
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

      {/* ── Role Editor Modal ──────────────────────────────── */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? `Rolle bearbeiten: ${editingRole.label}` : 'Neue Rolle erstellen'} size="xl">
        <form onSubmit={handleSaveRole} className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rollenname (intern) *</label>
              <input
                type="text"
                value={roleForm.name}
                onChange={e => setRoleForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                className="input font-mono"
                required
                disabled={!!editingRole}
                placeholder="z.B. cutter"
              />
              {!editingRole && <p className="text-text-muted text-xs mt-1">Nur Kleinbuchstaben, keine Leerzeichen</p>}
            </div>
            <div>
              <label className="label">Bezeichnung *</label>
              <input
                type="text"
                value={roleForm.label}
                onChange={e => setRoleForm(p => ({ ...p, label: e.target.value }))}
                className="input"
                required
                placeholder="z.B. Cutter"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Beschreibung</label>
              <input
                type="text"
                value={roleForm.description}
                onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))}
                className="input"
                placeholder="Kurze Beschreibung der Rolle"
              />
            </div>
            <div>
              <label className="label">Farbe</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={roleForm.color}
                  onChange={e => setRoleForm(p => ({ ...p, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent"
                />
                <div className="flex-1 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: roleForm.color }}>
                  {roleForm.label || 'Vorschau'}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Berechtigungen</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRolePermissions(Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true])))} className="text-xs text-accent-green hover:underline">Alle aktivieren</button>
                <button type="button" onClick={() => setRolePermissions(emptyPermissions())} className="text-xs text-accent-red hover:underline">Alle deaktivieren</button>
              </div>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 border border-surface-border rounded-xl p-4 bg-obsidian-900">
              {PERMISSION_GROUPS.map(group => (
                <div key={group}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-text-primary font-medium text-sm">{group}</h4>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => toggleAllRolePerms(group, true)} className="text-xs text-accent-green hover:underline">Alle</button>
                      <button type="button" onClick={() => toggleAllRolePerms(group, false)} className="text-xs text-accent-red hover:underline">Keine</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-surface-raised transition-colors">
                        <div
                          onClick={() => setRolePermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                          className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all cursor-pointer ${rolePermissions[perm.key] ? 'bg-accent-purple border-accent-purple' : 'border-surface-border-light'}`}
                        >
                          {rolePermissions[perm.key] && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-text-secondary text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-text-muted text-xs mt-2">
              {Object.values(rolePermissions).filter(Boolean).length} von {ALL_PERMISSIONS.length} Berechtigungen aktiviert
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
            <button type="button" onClick={() => setShowRoleModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{editingRole ? 'Rolle speichern' : 'Rolle erstellen'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
