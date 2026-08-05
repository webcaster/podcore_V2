import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Copy, Send, Upload } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

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

export default function TutorialsManagementPage() {
  const { user, can, showSuccess, showError } = useApp();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    role: 'editor',
    title: '',
    description: '',
    enabled: true,
  });
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [editingStep, setEditingStep] = useState<TutorialStep | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const DEFAULT_ROLES = [
    { value: 'editor', label: 'Redakteur' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'producer', label: 'Produktion' },
    { value: 'admin', label: 'Administrator' },
  ];

  const ROLES = roles.length > 0 ? roles.map(r => ({ value: r.name, label: r.label })) : DEFAULT_ROLES;

  const POSITIONS = [
    { value: 'top', label: 'Oben' },
    { value: 'bottom', label: 'Unten' },
    { value: 'left', label: 'Links' },
    { value: 'right', label: 'Rechts' },
  ];

  // Load tutorials
  const loadTutorials = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/tutorials', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTutorials(data);
      }
    } catch (error) {
      console.error('Error loading tutorials:', error);
      showError('Fehler beim Laden der Tutorials');
    } finally {
      setIsLoading(false);
    }
  };

  // Load roles from database
  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles(DEFAULT_ROLES.map(r => ({ name: r.value, label: r.label })));
    }
  };

  // Load users for tutorial initialization
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    if (can('canManageSettings')) {
      loadTutorials();
      loadUsers();
      loadRoles();
    }
  }, []);

  // Create or update tutorial
  const handleSaveTutorial = async () => {
    if (!formData.title || steps.length === 0) {
      showError('Titel und mindestens ein Schritt erforderlich');
      return;
    }

    try {
      const method = editingTutorial ? 'PUT' : 'POST';
      const url = editingTutorial ? `/api/tutorials/${editingTutorial.id}` : '/api/tutorials';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          steps,
        }),
      });

      if (response.ok) {
        showSuccess(editingTutorial ? 'Tutorial aktualisiert' : 'Tutorial erstellt');
        loadTutorials();
        resetForm();
      } else {
        showError('Fehler beim Speichern des Tutorials');
      }
    } catch (error) {
      console.error('Error saving tutorial:', error);
      showError('Fehler beim Speichern');
    }
  };

  // Delete tutorial
  const handleDeleteTutorial = async (id: string) => {
    if (!window.confirm('Dieses Tutorial wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/tutorials/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showSuccess('Tutorial gelöscht');
        loadTutorials();
      } else {
        showError('Fehler beim Löschen des Tutorials');
      }
    } catch (error) {
      console.error('Error deleting tutorial:', error);
      showError('Fehler beim Löschen');
    }
  };

  // Toggle tutorial enabled status
  const handleToggleEnabled = async (tutorial: Tutorial) => {
    try {
      const response = await fetch(`/api/tutorials/${tutorial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...tutorial,
          enabled: !tutorial.enabled,
        }),
      });

      if (response.ok) {
        loadTutorials();
      }
    } catch (error) {
      console.error('Error toggling tutorial:', error);
    }
  };

  // Initialize tutorial for users
  const handleInitializeForUsers = async (tutorialId: string) => {
    if (selectedUsers.length === 0) {
      showError('Bitte wählen Sie mindestens einen Benutzer');
      return;
    }

    try {
      for (const userId of selectedUsers) {
        await fetch(`/api/admin/tutorials/${tutorialId}/initialize/${userId}`, {
          method: 'POST',
          credentials: 'include',
        });
      }

      showSuccess(`Tutorial für ${selectedUsers.length} Benutzer initialisiert`);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error initializing tutorial:', error);
      showError('Fehler beim Initialisieren des Tutorials');
    }
  };

  // Add step
  const handleAddStep = () => {
    const newStep: TutorialStep = {
      id: Date.now().toString(),
      title: '',
      description: '',
      position: 'bottom',
      highlightColor: 'rgba(147, 51, 234, 0.2)',
      allowSkip: true,
    };
    setSteps([...steps, newStep]);
  };

  // Update step
  const handleUpdateStep = (stepId: string, updates: Partial<TutorialStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  // Delete step
  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  // Reset form
  const resetForm = () => {
    setShowForm(false);
    setEditingTutorial(null);
    const defaultRole = roles.length > 0 ? roles[0].name : 'editor';
    setFormData({ role: defaultRole, title: '', description: '', enabled: true });
    setSteps([]);
    setEditingStep(null);
  };

  // Edit tutorial
  const handleEditTutorial = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    const validRole = roles.find(r => r.name === tutorial.role) ? tutorial.role : (roles.length > 0 ? roles[0].name : 'editor');
    setFormData({
      role: validRole,
      title: tutorial.title,
      description: tutorial.description,
      enabled: tutorial.enabled,
    });
    setSteps(tutorial.steps);
    setShowForm(true);
  };

  if (!can('canManageSettings')) {
    return <div className="text-center py-12">Keine Berechtigung</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">Tutorial-Verwaltung</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Neues Tutorial
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Tutorial Form */}
          {showForm && (
            <div className="card space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">
                {editingTutorial ? 'Tutorial bearbeiten' : 'Neues Tutorial'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Rolle *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="input"
                  >
                    {roles.length > 0 ? (
                      roles.map(role => (
                        <option key={role.name} value={role.name}>
                          {role.label}
                        </option>
                      ))
                    ) : (
                      DEFAULT_ROLES.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="label">Titel *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="z.B. Dashboard Übersicht"
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
                  placeholder="Kurze Beschreibung des Tutorials"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm text-text-secondary">
                  Tutorial aktiviert
                </label>
              </div>

              {/* Steps Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-text-primary">Schritte ({steps.length})</h3>
                  <button
                    onClick={handleAddStep}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Schritt hinzufügen
                  </button>
                </div>

                {steps.map((step, index) => (
                  <div key={step.id} className="border border-surface-border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-text-primary">Schritt {index + 1}</h4>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={step.title}
                        onChange={e => handleUpdateStep(step.id, { title: e.target.value })}
                        placeholder="Schritt-Titel"
                        className="input text-sm"
                      />

                      <input
                        type="text"
                        value={step.target || ''}
                        onChange={e => handleUpdateStep(step.id, { target: e.target.value })}
                        placeholder="CSS Selector (z.B. #dashboard)"
                        className="input text-sm"
                      />
                    </div>

                    <textarea
                      value={step.description}
                      onChange={e => handleUpdateStep(step.id, { description: e.target.value })}
                      placeholder="Schritt-Beschreibung"
                      className="textarea text-sm"
                      rows={2}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={step.position || 'bottom'}
                        onChange={e => handleUpdateStep(step.id, { position: e.target.value as any })}
                        className="input text-sm"
                      >
                        {POSITIONS.map(p => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="color"
                        value={step.highlightColor || '#9333ea'}
                        onChange={e => handleUpdateStep(step.id, { highlightColor: e.target.value })}
                        className="input text-sm"
                        title="Hervorhebungsfarbe"
                      />

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={step.allowSkip || false}
                          onChange={e => handleUpdateStep(step.id, { allowSkip: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Überspringen erlauben
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Bild</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={step.image || ''}
                          onChange={e => handleUpdateStep(step.id, { image: e.target.value })}
                          placeholder="Bild-URL oder Base64"
                          className="input text-sm flex-1"
                        />
                        <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                          <Upload size={16} />
                          <span>Hochladen</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  handleUpdateStep(step.id, { image: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {step.image && (
                        <div className="mt-2 relative">
                          <img
                            src={step.image}
                            alt="Vorschau"
                            className="max-w-xs h-auto rounded-lg border border-surface-border"
                          />
                          <button
                            onClick={() => handleUpdateStep(step.id, { image: undefined })}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveTutorial} className="btn-primary">
                  Speichern
                </button>
                <button onClick={resetForm} className="btn-secondary">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Tutorials List */}
          <div className="space-y-3">
            {tutorials.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                Keine Tutorials vorhanden. Erstellen Sie ein neues Tutorial.
              </div>
            ) : (
              tutorials.map(tutorial => (
                <div key={tutorial.id} className="card flex items-start justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-text-primary">{tutorial.title}</h3>
                      <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-1 rounded">
                        {roles.find(r => r.name === tutorial.role)?.label || tutorial.role}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{tutorial.description}</p>
                    <p className="text-xs text-text-muted">
                      {tutorial.steps.length} Schritte • Aktualisiert: {new Date(tutorial.updatedAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleEnabled(tutorial)}
                      className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                      title={tutorial.enabled ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {tutorial.enabled ? (
                        <Eye size={18} className="text-accent-purple" />
                      ) : (
                        <EyeOff size={18} className="text-text-muted" />
                      )}
                    </button>

                    <button
                      onClick={() => handleEditTutorial(tutorial)}
                      className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 size={18} className="text-accent-purple" />
                    </button>

                    <button
                      onClick={() => handleDeleteTutorial(tutorial.id)}
                      className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Initialize for Users */}
          {tutorials.length > 0 && (
            <div className="card space-y-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Send size={18} />
                Tutorial für Benutzer initialisieren
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tutorial auswählen</label>
                  <select className="input" id="tutorial-select">
                    <option value="">-- Bitte wählen --</option>
                    {tutorials.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({roles.find(r => r.name === t.role)?.label || t.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Benutzer auswählen</label>
                  <select
                    multiple
                    value={selectedUsers}
                    onChange={e => setSelectedUsers(Array.from(e.target.selectedOptions, o => o.value))}
                    className="input"
                    size={3}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  const select = document.getElementById('tutorial-select') as HTMLSelectElement;
                  if (select.value) {
                    handleInitializeForUsers(select.value);
                  }
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Send size={16} />
                Tutorial initialisieren
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
