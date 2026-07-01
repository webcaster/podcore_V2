import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Plus, Edit2, Trash2, Key, Check, X, Eye, EyeOff,
  Server, Database, HardDrive, Activity, RefreshCw, Loader2, Lock, Tag, Save,
  UserX, ArrowRight, AlertTriangle, ToggleLeft, ToggleRight, Layers, RotateCcw
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApp, useFeatures } from '../contexts/AppContext';
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
  { key: 'canManagePdfLayouts', label: 'PDF-Layouts verwalten', group: 'Administration' },
  // Sponsoring-Erweiterungen (v2.7.x)
  { key: 'canManageSponsors', label: 'Sponsoren vollständig verwalten', group: 'Sponsoring' },
  { key: 'canViewInvoices', label: 'Rechnungen ansehen', group: 'Sponsoring' },
  { key: 'canCreateInvoices', label: 'Rechnungen erstellen', group: 'Sponsoring' },
  { key: 'canEditInvoices', label: 'Rechnungen bearbeiten', group: 'Sponsoring' },
  { key: 'canExportPricelist', label: 'Preisliste exportieren', group: 'Sponsoring' },
  // Episoden-Editor-Erweiterungen (v2.7.x)
  { key: 'canManageBlocks', label: 'Skript-Blöcke verwalten', group: 'Episoden' },
  { key: 'canUseMediaLibraryInEditor', label: 'Media Library im Editor nutzen', group: 'Episoden' },
  // Abnahme-Workflow
  { key: 'canApproveEpisodes', label: 'Episoden freigeben / abnehmen', group: 'Episoden' },
  { key: 'canRequestApproval', label: 'Freigabe anfordern', group: 'Episoden' },
  { key: 'canApproveInterviewQuestions', label: 'Interview-Fragen freigeben', group: 'Redaktions-Hub' },
  // v2.9.0 – neue Berechtigungen
  { key: 'canEditShowNotes', label: 'Show-Notes bearbeiten', group: 'Episoden' },
  { key: 'canManageInterviewBlocks', label: 'Interview-Fragen-Blöcke verwalten', group: 'Episoden' },
  // Media Library-Erweiterungen (v2.9.16)
  { key: 'canEditMediaMetadata', label: 'Asset-Metadaten bearbeiten', group: 'Media Library' },
  { key: 'canUseAudioEditor', label: 'Audio-Editor verwenden', group: 'Media Library' },
  { key: 'canExportMarkers', label: 'Marker / DAW-Export', group: 'Media Library' },
  // Werbung / Sponsoring-Buchung (v2.9.15)
  { key: 'canManageAdBookings', label: 'Werbebuchungen verwalten', group: 'Sponsoring' },
  { key: 'canBookAds', label: 'Werbung nachbuchen (spontan)', group: 'Sponsoring' },
  { key: 'canViewAdBookings', label: 'Werbebuchungen ansehen', group: 'Sponsoring' },
];

const PERMISSION_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const emptyPermissions = () => Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false]));

export default function AdminPage() {
  const { can, user: currentUser, showSuccess, showError, refreshUser } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'modules' | 'system' | 'database' | 'logs'>('users');

  // Database Migration State
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [mysqlForm, setMysqlForm] = useState({ host: '', port: '3306', database: '', user: '', password: '' });
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [migrationDone, setMigrationDone] = useState(false);
  const { features } = useFeatures();
  const [featureForm, setFeatureForm] = useState<Record<string, boolean>>({});
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);

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

  // Delete with transfer modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<any>(null);
  const [deleteLinkedData, setDeleteLinkedData] = useState<any>(null);
  const [transferToUserId, setTransferToUserId] = useState<string>('global');
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset modal (Admin resets another user's password without knowing the old one)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  const openResetPassword = (u: any) => {
    setResetTargetUser(u);
    setResetPassword('');
    setResetPasswordConfirm('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword.length < 6) { showError('Passwort muss mindestens 6 Zeichen haben'); return; }
    if (resetPassword !== resetPasswordConfirm) { showError('Passwörter stimmen nicht überein'); return; }
    setIsSaving(true);
    try {
      await adminApi.resetPassword(resetTargetUser.id, resetPassword);
      showSuccess(`Passwort für ${resetTargetUser.displayName} wurde zurückgesetzt`);
      setShowResetModal(false);
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const [logs, setLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [roleChanged, setRoleChanged] = useState(false);

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
        if (roleChanged) {
          showSuccess('Benutzer aktualisiert — Berechtigungen wurden auf Rollen-Standard gesetzt');
        } else {
          showSuccess('Benutzer aktualisiert');
        }
        // If admin changed their own role, refresh session
        if (editingUser.id === currentUser?.id) await refreshUser();
      } else {
        await adminApi.createUser(userForm);
        showSuccess('Benutzer erstellt');
      }
      setShowUserModal(false);
      setRoleChanged(false);
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const openDeleteUser = async (u: any) => {
    setDeleteTargetUser(u);
    setTransferToUserId('global');
    setDeleteLinkedData(null);
    // Verknüpfte Daten laden
    try {
      const data = await adminApi.getLinkedData(u.id);
      setDeleteLinkedData(data);
    } catch (_) {
      setDeleteLinkedData({ episodeCount: 0, ideaCount: 0, sponsorCount: 0, assetCount: 0, noteCount: 0, total: 0 });
    }
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    try {
      const hasLinked = deleteLinkedData?.total > 0;
      await adminApi.deleteUser(deleteTargetUser.id, hasLinked ? transferToUserId : undefined);
      showSuccess(`Benutzer "${deleteTargetUser.displayName}" gelöscht${hasLinked ? ` — Inhalte übertragen` : ''}`);
      setShowDeleteModal(false);
      load();
    } catch (err: any) { showError(err.message); }
    finally { setIsDeleting(false); }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', displayName: '', email: '', password: '', role: 'redakteur', avatarColor: '#7c3aed' });
    setShowUserModal(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ username: u.username, displayName: u.displayName, email: u.email || '', password: '', role: u.role, avatarColor: u.avatarColor || '#7c3aed' });
    setRoleChanged(false);
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
      // If the admin changed their own permissions, refresh immediately
      if (permUser.id === currentUser?.id) await refreshUser();
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
        showSuccess('Rolle gespeichert — aktive Benutzer werden innerhalb von 30 Sek. aktualisiert');
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
      // Refresh own session in case the admin's own role was changed
      await refreshUser();
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
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit flex-wrap">
        {[
          { key: 'users', label: 'Benutzer', icon: <Users size={14} /> },
          { key: 'roles', label: 'Rollen', icon: <Tag size={14} /> },
          { key: 'modules', label: 'Module', icon: <Layers size={14} /> },
          { key: 'system', label: 'System', icon: <Server size={14} /> },
          { key: 'database', label: 'Datenbank', icon: <Database size={14} /> },
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
                        <button onClick={() => openResetPassword(u)} className="p-2 text-text-muted hover:text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors" title="Passwort zurücksetzen">
                          <Lock size={14} />
                        </button>
                      )}
                      {!isCurrentUser && (
                        <button onClick={() => openDeleteUser(u)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors" title="Benutzer löschen">
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
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!window.confirm('Alle System-Rollen auf Standard-Berechtigungen zurücksetzen?')) return;
                  try {
                    const result = await adminApi.resetRolePermissions();
                    showSuccess(result?.message || 'Rollen zurückgesetzt');
                    const rolesData = await adminApi.listRoles();
                    setRoles(rolesData);
                  } catch (err: any) { showError(err.message || 'Fehler beim Zurücksetzen'); }
                }}
                className="btn-secondary text-sm"
                title="Alle System-Rollen auf Standard-Berechtigungen zurücksetzen"
              >
                <RotateCcw size={14} /><span>Standard-Berechtigungen</span>
              </button>
              <button onClick={openCreateRole} className="btn-primary"><Plus size={16} /><span>Neue Rolle</span></button>
            </div>
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

      {/* ── MODULES TAB ─────────────────────────────────────── */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
              <Layers size={16} className="text-accent-purple" />
              App-Module aktivieren / deaktivieren
            </h3>
            <p className="text-text-muted text-sm mb-5">Deaktivierte Module werden aus der Navigation ausgeblendet. Die Daten bleiben erhalten und können jederzeit wieder aktiviert werden.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'editorial', label: 'Redaktions-Hub', desc: 'Ideen, Redaktionsplan, Interview-Partner, Recherche', icon: '📝' },
                { key: 'sponsoring', label: 'Sponsoring', desc: 'Sponsoren, Werbekategorien, Platzierungen, Abrechnung', icon: '📢' },
                { key: 'mediaLibrary', label: 'Media Library', desc: 'Asset-Verwaltung, Audio- und Bild-Uploads', icon: '🗂️' },
                { key: 'statistics', label: 'Statistiken & Analytics', desc: 'Podcast-Statistiken und Podigee-Analytics', icon: '📊' },
                { key: 'chat', label: 'Team-Chat', desc: 'Internes Kommunikationstool zwischen Nutzern', icon: '💬' },
                { key: 'seasons', label: 'Staffeln', desc: 'Staffel-Verwaltung und Episoden-Gruppierung', icon: '🗂️' },
                { key: 'wiki', label: 'Wiki', desc: 'Internes Wissens- und Dokumentationssystem', icon: '📖' },
                { key: 'branding', label: 'Branding & Backup', desc: 'Logo, CI-Farben, Speicher-Konfiguration, Backup', icon: '🎨' },
                { key: 'podigee', label: 'Podigee-Sync', desc: 'Synchronisation mit Podigee-Podcast-Hosting', icon: '🔄' },
              ].map(mod => {
                const isActive = featureForm[mod.key] !== undefined ? featureForm[mod.key] : features[mod.key as keyof typeof features];
                return (
                  <div key={mod.key}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isActive ? 'border-accent-green/40 bg-accent-green/5' : 'border-surface-border bg-obsidian-800/50 opacity-70'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mod.icon}</span>
                      <div>
                        <p className="text-text-primary font-medium text-sm">{mod.label}</p>
                        <p className="text-text-muted text-xs mt-0.5">{mod.desc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeatureForm(prev => ({ ...prev, [mod.key]: !isActive }))}
                      className={`flex-shrink-0 ml-4 transition-colors ${
                        isActive ? 'text-accent-green' : 'text-text-muted'
                      }`}
                      title={isActive ? 'Modul deaktivieren' : 'Modul aktivieren'}
                    >
                      {isActive
                        ? <ToggleRight size={32} />
                        : <ToggleLeft size={32} />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-surface-border flex items-center gap-3">
              <button
                onClick={async () => {
                  setIsSavingFeatures(true);
                  try {
                    const merged = { ...features, ...featureForm };
                    await adminApi.updateSettings({ features: merged });
                    // Reload public settings to update context
                    window.location.reload();
                  } catch (err: any) { showError(err.message); }
                  finally { setIsSavingFeatures(false); }
                }}
                disabled={isSavingFeatures || Object.keys(featureForm).length === 0}
                className="btn-primary"
              >
                {isSavingFeatures ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Module-Einstellungen speichern</span>
              </button>
              {Object.keys(featureForm).length > 0 && (
                <span className="text-text-muted text-sm">{Object.keys(featureForm).length} Änderung(en) ausstehend</span>
              )}
            </div>
          </div>

          <div className="card bg-accent-orange/5 border-accent-orange/30">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-accent-orange flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-text-primary font-medium text-sm">Hinweis</p>
                <p className="text-text-muted text-sm mt-1">Das Deaktivieren eines Moduls blendet es nur aus der Navigation aus. Vorhandene Daten (z.B. Sponsoren, Ideen) bleiben vollständig erhalten und werden beim Reaktivieren wieder angezeigt. Direkte URL-Aufrufe der deaktivierten Module sind weiterhin möglich.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DATABASE TAB ─────────────────────────────────────── */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          {/* Aktueller DB-Status */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Database size={16} className="text-accent-green" />
              Aktueller Datenbankstatus
            </h3>
            <div className="flex gap-3 mb-4">
              <button
                onClick={async () => {
                  try {
                    const data = await adminApi.getDbStatus();
                    setDbStatus(data);
                  } catch (err: any) { showError(err.message); }
                }}
                className="btn-secondary"
              >
                <RefreshCw size={14} /> Status laden
              </button>
            </div>
            {dbStatus && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    dbStatus.type === 'mysql' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-green/20 text-accent-green'
                  }`}>
                    <Database size={12} />
                    {dbStatus.type === 'mysql' ? 'MySQL / MariaDB' : 'SQLite (lokal)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(dbStatus.stats || {}).map(([table, count]) => (
                    <div key={table} className="bg-obsidian-800 rounded-lg p-3 border border-surface-border">
                      <p className="text-text-muted text-xs mb-1">{table}</p>
                      <p className="text-text-primary font-bold text-lg">{count as number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MySQL-Migration */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
              <ArrowRight size={16} className="text-accent-orange" />
              Migration: SQLite → MySQL / MariaDB
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              Übertrage alle Daten aus der lokalen SQLite-Datenbank in eine externe MySQL- oder MariaDB-Datenbank.
              Ideal wenn das Podcast-Projekt wächst und mehrere Nutzer gleichzeitig arbeiten.
            </p>

            <div className="bg-accent-orange/5 border border-accent-orange/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-accent-orange mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-text-primary font-medium">Wichtige Hinweise vor der Migration</p>
                  <ul className="text-text-muted mt-2 space-y-1 list-disc list-inside">
                    <li>Erstelle zuerst ein Backup (System-Tab → Backup exportieren)</li>
                    <li>Die Ziel-Datenbank muss bereits existieren (leere MySQL-Datenbank)</li>
                    <li>Der MySQL-Benutzer benötigt CREATE, DROP, INSERT, SELECT Rechte</li>
                    <li>Vorhandene Tabellen in der Ziel-DB werden überschrieben</li>
                    <li>Nach der Migration muss der Server neu konfiguriert werden (mysql2 installieren)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Provider-Hinweis */}
            <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-3 mb-4 text-xs text-text-muted">
              <p className="font-medium text-text-secondary mb-1">💡 Lokale oder externe Datenbank?</p>
              <p>Für <strong className="text-text-primary">lokale Installationen</strong> verwende <code className="bg-obsidian-800 px-1 rounded">localhost</code> als Host.</p>
              <p className="mt-1">Für <strong className="text-text-primary">externe Provider</strong> (z.B. IONOS, Strato, All-Inkl, AWS RDS, DigitalOcean) trage den vollständigen Hostnamen ein, z.B. <code className="bg-obsidian-800 px-1 rounded">database-123.webspace-host.com</code>. Stelle sicher, dass dein Hoster den externen Zugriff auf Port 3306 erlaubt und deine Server-IP freigegeben ist.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-text-muted mb-1">Host <span className="text-text-muted/60">(Hostname oder IP-Adresse)</span></label>
                <input
                  type="text"
                  value={mysqlForm.host}
                  onChange={e => setMysqlForm(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="localhost, 192.168.1.100 oder database-123.webspace-host.com"
                  className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
                />
              </div>
              {[
                { key: 'port', label: 'Port', placeholder: '3306', type: 'number' },
                { key: 'database', label: 'Datenbank', placeholder: 'podcore_db', type: 'text' },
                { key: 'user', label: 'Benutzer', placeholder: 'podcore_user', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-text-muted mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={mysqlForm[field.key as keyof typeof mysqlForm]}
                    onChange={e => setMysqlForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-text-muted mb-1">Passwort</label>
                <input
                  type="password"
                  value={mysqlForm.password}
                  onChange={e => setMysqlForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="MySQL-Passwort"
                  className="w-full bg-obsidian-800 border border-surface-border rounded px-3 py-2 text-sm text-text-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={async () => {
                  setIsTesting(true);
                  setDbTestResult(null);
                  try {
                    const res = await adminApi.testMysql(mysqlForm);
                    // res is already the data part because of the request<T> wrapper
                    setDbTestResult({ success: true, message: (res as any)?.message || 'Verbindung erfolgreich' });
                  } catch (err: any) { 
                    setDbTestResult({ success: false, message: err.message || 'Verbindung fehlgeschlagen' }); 
                  }
                  finally { setIsTesting(false); }
                }}
                disabled={isTesting || !mysqlForm.host || !mysqlForm.database || !mysqlForm.user}
                className="btn-secondary"
              >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Verbindung testen
              </button>

              <button
                onClick={async () => {
                  if (!window.confirm('Alle Daten von SQLite nach MySQL migrieren? Vorhandene Tabellen in der Ziel-DB werden überschrieben!')) return;
                  setIsMigrating(true);
                  setMigrationLog([]);
                  setMigrationDone(false);
                  try {
                    const res = await adminApi.migrateToMysql(mysqlForm);
                    // Support both shapes: { data: { log, success } } and { log, success }
                    const logData = (res as any)?.log || (res as any)?.data?.log || [];
                    const isSuccess = (res as any)?.success !== false;
                    
                    setMigrationLog(logData);
                    setMigrationDone(isSuccess);
                    
                    if (isSuccess) showSuccess((res as any)?.message || 'Migration erfolgreich');
                    else showError((res as any)?.error || 'Migration fehlgeschlagen');
                  } catch (err: any) { showError(err.message); }
                  finally { setIsMigrating(false); }
                }}
                disabled={isMigrating || !dbTestResult?.success}
                className="btn-primary"
              >
                {isMigrating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Migration starten
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await adminApi.getMigrationLog();
                    setMigrationLog(res || []);
                  } catch (err: any) { showError(err.message); }
                }}
                className="btn-secondary"
              >
                <Activity size={14} /> Letztes Migrations-Log laden
              </button>
            </div>

            {dbTestResult && (
              <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
                dbTestResult.success ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' : 'bg-accent-red/10 text-accent-red border border-accent-red/30'
              }`}>
                <div className="flex items-center gap-2">
                  {dbTestResult.success ? <Check size={14} /> : <X size={14} />}
                  <span>{dbTestResult.message}</span>
                </div>
                {!dbTestResult.success && (
                  <div className="mt-2 text-xs opacity-80 space-y-1">
                    {dbTestResult.message?.includes('ENETUNREACH') || dbTestResult.message?.includes('ECONNREFUSED') || dbTestResult.message?.includes('ETIMEDOUT') ? (
                      <>
                        <p>⚠️ Der Host ist nicht erreichbar. Mögliche Ursachen:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>Externer Zugriff beim Hoster nicht aktiviert (Port 3306 gesperrt)</li>
                          <li>Die IP dieses Servers ({window.location.hostname}) ist nicht in der Hoster-Firewall freigegeben</li>
                          <li>Falscher Hostname – prüfe ob dein Hoster einen separaten externen Hostnamen bereitstellt</li>
                          <li>Bei IONOS Shared Hosting: externer DB-Zugriff ist nicht möglich, nur über eigene Cloud-Datenbank</li>
                        </ul>
                      </>
                    ) : dbTestResult.message?.includes('Access denied') ? (
                      <p>⚠️ Zugriff verweigert – prüfe Benutzername, Passwort und ob der Benutzer Remote-Zugriff hat.</p>
                    ) : dbTestResult.message?.includes('Unknown database') ? (
                      <p>⚠️ Datenbank nicht gefunden – stelle sicher, dass die Datenbank im Hoster-Panel bereits angelegt wurde.</p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {migrationLog.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-text-muted mb-2">Migrations-Log</p>
                <div className="bg-obsidian-900 border border-surface-border rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
                  {migrationLog.map((line, i) => (
                    <p key={i} className={line.includes('✓') ? 'text-accent-green' : line.includes('✗') ? 'text-accent-red' : line.includes('Abgeschlossen') ? 'text-accent-blue font-bold' : 'text-text-muted'}>
                      {line}
                    </p>
                  ))}
                </div>
                {migrationDone && (
                  <div className="mt-3 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
                    <p className="text-accent-green text-sm font-medium">✓ Migration erfolgreich abgeschlossen</p>
                    <p className="text-text-muted text-xs mt-1">Nächste Schritte: Installiere mysql2 im Server-Verzeichnis (<code className="bg-obsidian-800 px-1 rounded">npm install mysql2</code>) und konfiguriere die Datenbankverbindung in der Server-Konfiguration.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hinweis-Box */}
          <div className="card bg-accent-blue/5 border-accent-blue/30">
            <div className="flex items-start gap-3">
              <Database size={18} className="text-accent-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-text-primary font-medium text-sm">Wann sollte ich migrieren?</p>
                <div className="text-text-muted text-sm mt-2 space-y-1">
                  <p><strong className="text-text-primary">SQLite (Standard)</strong> – ideal für kleine Teams (1–5 Personen), Einzelnutzer, Raspberry Pi oder lokale Installation. Keine Konfiguration nötig.</p>
                  <p><strong className="text-text-primary">MySQL / MariaDB</strong> – empfohlen ab 5+ gleichzeitigen Nutzern, bei hohem Dateivolumen, für Produktionsserver oder wenn eine bestehende MySQL-Infrastruktur vorhanden ist.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ───────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <p className="text-text-secondary text-sm">Systemereignisse und Fehler</p>
              <p className="text-text-muted text-xs mt-0.5">{logs.length} Einträge geladen</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/admin/logs', {
                      method: 'POST', credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ level: 'info', category: 'test', message: 'Test-Log-Eintrag vom Admin-Panel', details: { timestamp: new Date().toISOString() } }),
                    });
                    loadLogs();
                    showSuccess('Test-Log erstellt');
                  } catch (err: any) { showError(err.message); }
                }}
                className="btn-ghost text-xs"
              >
                Test-Log erstellen
              </button>
              <button onClick={loadLogs} className="btn-ghost p-2" title="Aktualisieren"><RefreshCw size={16} /></button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="card text-center py-12">
              <Activity size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Keine Logs vorhanden</p>
              <p className="text-text-muted text-sm mt-1">Logs werden automatisch bei Systemereignissen erstellt.</p>
              <p className="text-text-muted text-xs mt-2">Klicke auf "Test-Log erstellen" um einen Eintrag zu generieren.</p>
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log: any, idx: number) => (
                <div key={log.id || idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                  log.level === 'error' ? 'bg-accent-red/10' :
                  log.level === 'warn' ? 'bg-accent-orange/10' :
                  'bg-obsidian-800'
                }`}>
                  <span className="text-text-muted flex-shrink-0 w-36">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('de-DE') : '—'}
                  </span>
                  <span className={`uppercase font-bold flex-shrink-0 w-12 ${
                    log.level === 'error' ? 'text-accent-red' :
                    log.level === 'warn' ? 'text-accent-orange' :
                    'text-accent-blue'
                  }`}>{log.level || 'info'}</span>
                  <span className="text-text-muted flex-shrink-0 w-20">{log.category || '—'}</span>
                  <span className="flex-1 text-text-secondary">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Delete with Transfer Modal ────────────────────────── */}
      <Modal isOpen={showDeleteModal} onClose={() => !isDeleting && setShowDeleteModal(false)} title="Benutzer löschen">
        <div className="space-y-5">
          {/* Benutzer-Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: deleteTargetUser?.avatarColor || '#7c3aed' }}>
              {deleteTargetUser?.displayName?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-text-primary font-medium">{deleteTargetUser?.displayName}</p>
              <p className="text-text-muted text-xs">@{deleteTargetUser?.username}</p>
            </div>
          </div>

          {/* Verknüpfte Daten */}
          {deleteLinkedData === null ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-text-muted" />
              <span className="text-text-muted text-sm ml-2">Verknüpfte Inhalte werden geprüft...</span>
            </div>
          ) : deleteLinkedData.total === 0 ? (
            <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/30">
              <p className="text-accent-green text-sm flex items-center gap-2">
                <Check size={16} /> Keine verknüpften Inhalte — Benutzer kann direkt gelöscht werden.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/30">
                <p className="text-accent-orange text-sm font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} /> Dieser Benutzer hat noch {deleteLinkedData.total} verknüpfte Inhalte:
                </p>
                <div className="flex flex-wrap gap-2">
                  {deleteLinkedData.episodeCount > 0 && <span className="badge bg-accent-blue/20 text-accent-blue text-xs">{deleteLinkedData.episodeCount} Episode(n)</span>}
                  {deleteLinkedData.ideaCount > 0 && <span className="badge bg-accent-purple/20 text-accent-purple text-xs">{deleteLinkedData.ideaCount} Idee(n)</span>}
                  {deleteLinkedData.sponsorCount > 0 && <span className="badge bg-accent-green/20 text-accent-green text-xs">{deleteLinkedData.sponsorCount} Sponsor(en)</span>}
                  {deleteLinkedData.assetCount > 0 && <span className="badge bg-accent-cyan/20 text-accent-cyan text-xs">{deleteLinkedData.assetCount} Media-Asset(s)</span>}
                  {deleteLinkedData.noteCount > 0 && <span className="badge bg-accent-orange/20 text-accent-orange text-xs">{deleteLinkedData.noteCount} Notiz(en)</span>}
                </div>
              </div>

              {/* Übergabe-Option */}
              <div>
                <label className="label flex items-center gap-2">
                  <ArrowRight size={14} className="text-accent-blue" />
                  Inhalte übertragen an
                </label>
                <select
                  value={transferToUserId}
                  onChange={e => setTransferToUserId(e.target.value)}
                  className="select"
                >
                  <option value="global">Aktiver Admin (globale Übernahme)</option>
                  {users
                    .filter(u => u.id !== deleteTargetUser?.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} (@{u.username})
                      </option>
                    ))
                  }
                </select>
                <p className="text-text-muted text-xs mt-1">
                  {transferToUserId === 'global'
                    ? 'Alle Inhalte werden dem aktuell eingeloggten Admin zugewiesen.'
                    : 'Alle Inhalte werden auf den gewählten Benutzer übertragen.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Warnung */}
          <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/30">
            <p className="text-accent-red text-sm flex items-center gap-2">
              <UserX size={16} /> Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="btn-secondary">Abbrechen</button>
            <button
              onClick={handleDeleteUser}
              disabled={isDeleting || deleteLinkedData === null}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-red text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>{isDeleting ? 'Wird gelöscht...' : 'Benutzer löschen'}</span>
            </button>
          </div>
        </div>
      </Modal>

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
              <select
                value={userForm.role}
                onChange={e => {
                  const newRole = e.target.value;
                  setUserForm(p => ({ ...p, role: newRole }));
                  if (editingUser && newRole !== editingUser.role) {
                    setRoleChanged(true);
                  } else {
                    setRoleChanged(false);
                  }
                }}
                className="select"
              >
                {roles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
              {roleChanged && (
                <p className="text-xs text-accent-orange mt-1 flex items-center gap-1">
                  <span>⚠️</span> Berechtigungen werden auf Rollen-Standard zurückgesetzt
                </p>
              )}
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

      {/* ── Password Reset Modal ─────────────────────────── */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={`Passwort zurücksetzen: ${resetTargetUser?.displayName}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3 rounded-lg bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-sm">
            Als Administrator kannst du das Passwort ohne das alte Passwort zurücksetzen. Der Benutzer wird aus allen aktiven Sitzungen abgemeldet.
          </div>
          <div>
            <label className="label">Neues Passwort *</label>
            <div className="relative">
              <input
                type={showResetPw ? 'text' : 'password'}
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="input pr-10"
                required
                minLength={6}
                autoFocus
                placeholder="Mindestens 6 Zeichen"
              />
              <button type="button" onClick={() => setShowResetPw(!showResetPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showResetPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Passwort bestätigen *</label>
            <input
              type={showResetPw ? 'text' : 'password'}
              value={resetPasswordConfirm}
              onChange={e => setResetPasswordConfirm(e.target.value)}
              className="input"
              required
              placeholder="Passwort wiederholen"
            />
            {resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
              <p className="text-accent-red text-xs mt-1">Passwörter stimmen nicht überein</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isSaving || resetPassword !== resetPasswordConfirm} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              <span>Passwort zurücksetzen</span>
            </button>
          </div>
        </form>
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
