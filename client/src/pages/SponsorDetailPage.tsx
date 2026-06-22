import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Edit2, Loader2, Mail, Phone,
  Globe, Building2, Calendar, Clock, Tag, CheckCircle, XCircle,
  AlertCircle, Megaphone, BarChart3, FileText, Package, Mic2,
  ExternalLink, Download
} from 'lucide-react';
import { sponsorsApi, episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const AD_STATUS = [
  { value: 'geplant', label: 'Geplant', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'material_ausstehend', label: 'Material ausstehend', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'material_eingegangen', label: 'Material eingegangen', color: 'bg-accent-cyan/20 text-accent-cyan' },
  { value: 'in_produktion', label: 'In Produktion', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'bereit', label: 'Bereit', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'ausgestrahlt', label: 'Ausgestrahlt', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'abgerechnet', label: 'Abgerechnet', color: 'bg-surface-overlay text-text-muted' },
];

export default function SponsorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();
  const [sponsor, setSponsor] = useState<any>(null);
  const [placements, setPlacements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'contact'>('overview');
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [placementForm, setPlacementForm] = useState({
    episodeId: '', categoryId: '', position: 'pre-roll', duration: 30,
    status: 'geplant', deliveryType: 'self', price: '', notes: '',
    adTitle: '', adScript: '', airDate: '',
  });

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [spData, plData, catData, epData] = await Promise.all([
        sponsorsApi.get(id),
        sponsorsApi.getPlacements(id),
        sponsorsApi.listCategories(),
        episodesApi.list({ pageSize: 200 }),
      ]);
      setSponsor(spData);
      setForm({
        name: spData.name || '',
        company: spData.company || '',
        email: spData.email || '',
        phone: spData.phone || '',
        website: spData.website || '',
        status: spData.status || 'aktiv',
        adDelivery: spData.adDelivery || 'self',
        notes: spData.notes || '',
        contractStart: spData.contractStart?.slice(0, 10) || '',
        contractEnd: spData.contractEnd?.slice(0, 10) || '',
        budget: spData.budget || '',
        color: spData.color || '#059669',
      });
      setPlacements(plData);
      setCategories(catData);
      setEpisodes(epData.items || []);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await sponsorsApi.update(id, {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
      });
      setSponsor(updated);
      setIsDirty(false);
      showSuccess('Sponsor gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
    setIsDirty(true);
  };

  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...placementForm,
        price: placementForm.price ? parseFloat(placementForm.price) : undefined,
      };
      if (editingPlacement) {
        await sponsorsApi.updateSlot(editingPlacement.id, payload);
        showSuccess('Platzierung aktualisiert');
      } else {
        await sponsorsApi.createSlot(id!, payload);
        showSuccess('Platzierung erstellt');
      }
      setShowPlacementModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeletePlacement = async (placementId: string) => {
    if (!confirm('Platzierung löschen?')) return;
    try {
      await sponsorsApi.deleteSlot(placementId);
      showSuccess('Platzierung gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleUpdatePlacementStatus = async (placementId: string, status: string) => {
    try {
      await sponsorsApi.updateSlot(placementId, { status });
      load();
    } catch (err: any) { showError(err.message); }
  };

  const openCreatePlacement = () => {
    setEditingPlacement(null);
    setPlacementForm({ episodeId: '', categoryId: '', position: 'pre-roll', duration: 30, status: 'geplant', deliveryType: sponsor?.adDelivery || 'self', price: '', notes: '', adTitle: '', adScript: '', airDate: '' });
    setShowPlacementModal(true);
  };

  const openEditPlacement = (pl: any) => {
    setEditingPlacement(pl);
    setPlacementForm({
      episodeId: pl.episodeId || '',
      categoryId: pl.categoryId || '',
      position: pl.position || 'pre-roll',
      duration: pl.duration || 30,
      status: pl.status || 'geplant',
      deliveryType: pl.deliveryType || 'self',
      price: pl.price || '',
      notes: pl.notes || '',
      adTitle: pl.adTitle || '',
      adScript: pl.adScript || '',
      airDate: pl.airDate?.slice(0, 10) || '',
    });
    setShowPlacementModal(true);
  };

  const adStatusInfo = (val: string) => AD_STATUS.find(s => s.value === val) || AD_STATUS[0];

  const totalRevenue = placements.filter(p => p.price).reduce((s, p) => s + (p.price || 0), 0);
  const airedCount = placements.filter(p => p.status === 'ausgestrahlt' || p.status === 'abgerechnet').length;

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!sponsor) {
    return <div className="text-center py-20"><p className="text-text-secondary">Sponsor nicht gefunden</p><Link to="/sponsors" className="btn-secondary mt-4 inline-flex">Zurück</Link></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sponsors" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={20} /></Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: form.color || '#059669' }}>
            {sponsor.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{sponsor.name}</h1>
            {sponsor.company && sponsor.company !== sponsor.name && (
              <p className="text-text-muted text-sm">{sponsor.company}</p>
            )}
          </div>
          {isDirty && <span className="text-accent-orange text-xs">● Ungespeicherte Änderungen</span>}
        </div>
        {can('canEditSponsors') && (
          <button onClick={handleSave} disabled={isSaving || !isDirty} className="btn-primary">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Speichern...' : 'Speichern'}</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-text-primary">{placements.length}</p>
          <p className="text-text-muted text-xs">Platzierungen</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-accent-green">{airedCount}</p>
          <p className="text-text-muted text-xs">Ausgestrahlt</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-text-primary">{totalRevenue > 0 ? `${totalRevenue.toFixed(0)} €` : '—'}</p>
          <p className="text-text-muted text-xs">Gesamtbudget</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-text-primary">
            {sponsor.contractEnd ? new Date(sponsor.contractEnd).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) : '—'}
          </p>
          <p className="text-text-muted text-xs">Vertragsende</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Übersicht' },
          { key: 'placements', label: `Platzierungen (${placements.length})` },
          { key: 'contact', label: 'Kontakt & Vertrag' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Sponsor-Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Name / Kontaktperson</label>
                  <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                </div>
                <div>
                  <label className="label">Unternehmen</label>
                  <input type="text" value={form.company} onChange={e => updateForm('company', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="select" disabled={!can('canEditSponsors')}>
                      <option value="aktiv">Aktiv</option>
                      <option value="inaktiv">Inaktiv</option>
                      <option value="interessent">Interessent</option>
                      <option value="pausiert">Pausiert</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Farbe</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.color} onChange={e => updateForm('color', e.target.value)} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" disabled={!can('canEditSponsors')} />
                      <input type="text" value={form.color} onChange={e => updateForm('color', e.target.value)} className="input flex-1 font-mono text-sm" disabled={!can('canEditSponsors')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Werbemittel-Lieferung</h3>
              <div className="space-y-2">
                {[
                  { value: 'self', label: 'Selbst angeliefert', icon: '📦', desc: 'Sponsor liefert fertiges Werbemittel' },
                  { value: 'produced', label: 'Von uns produziert', icon: '🎙️', desc: 'Wir sprechen und produzieren die Werbung' },
                  { value: 'both', label: 'Beides möglich', icon: '🔄', desc: 'Beide Varianten werden genutzt' },
                ].map(d => (
                  <button key={d.value} type="button" onClick={() => can('canEditSponsors') && updateForm('adDelivery', d.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${form.adDelivery === d.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border'} ${can('canEditSponsors') ? 'hover:border-surface-border-light cursor-pointer' : 'cursor-default'}`}>
                    <span className="text-xl">{d.icon}</span>
                    <div>
                      <p className="text-text-primary text-sm font-medium">{d.label}</p>
                      <p className="text-text-muted text-xs">{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Vertrag & Budget</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Budget (€)</label>
                  <input type="number" value={form.budget} onChange={e => updateForm('budget', e.target.value)} className="input" placeholder="0.00" min="0" step="0.01" disabled={!can('canEditSponsors')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Vertrag von</label>
                    <input type="date" value={form.contractStart} onChange={e => updateForm('contractStart', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                  <div>
                    <label className="label">Vertrag bis</label>
                    <input type="date" value={form.contractEnd} onChange={e => updateForm('contractEnd', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Notizen</h3>
              <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} className="textarea" rows={5} placeholder="Interne Notizen, Vereinbarungen, Besonderheiten..." disabled={!can('canEditSponsors')} />
            </div>

            {/* Recent Placements Preview */}
            {placements.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary">Letzte Platzierungen</h3>
                  <button onClick={() => setActiveTab('placements')} className="text-accent-purple text-xs hover:underline">Alle anzeigen</button>
                </div>
                <div className="space-y-2">
                  {placements.slice(0, 3).map(pl => {
                    const si = adStatusInfo(pl.status);
                    return (
                      <div key={pl.id} className="flex items-center gap-3 text-sm">
                        <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                        <span className="text-text-primary flex-1 truncate">{pl.episodeTitle || 'Keine Episode'}</span>
                        <span className="text-text-muted text-xs capitalize">{pl.position?.replace('-', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLACEMENTS TAB */}
      {activeTab === 'placements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-text-secondary text-sm">Werbeplatzierungen in Episoden verwalten und verfolgen</p>
            {can('canEditSponsors') && (
              <button onClick={openCreatePlacement} className="btn-primary"><Plus size={16} /><span>Neue Platzierung</span></button>
            )}
          </div>

          {placements.length === 0 ? (
            <div className="card text-center py-12">
              <Tag size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Noch keine Platzierungen</p>
              {can('canEditSponsors') && (
                <button onClick={openCreatePlacement} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Erste Platzierung erstellen</span></button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {placements.map(pl => {
                const si = adStatusInfo(pl.status);
                const cat = categories.find(c => c.id === pl.categoryId);
                return (
                  <div key={pl.id} className="card group">
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        pl.status === 'ausgestrahlt' || pl.status === 'abgerechnet' ? 'bg-accent-green' :
                        pl.status === 'bereit' ? 'bg-accent-cyan' :
                        pl.status === 'in_produktion' ? 'bg-accent-purple' :
                        pl.status === 'material_eingegangen' ? 'bg-accent-blue' :
                        pl.status === 'material_ausstehend' ? 'bg-accent-orange' :
                        'bg-text-muted'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-text-primary font-medium">{pl.adTitle || 'Unbenannte Werbung'}</h4>
                          <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                          {cat && <span className="badge text-xs" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.name}</span>}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                          {pl.episodeTitle && (
                            <span className="flex items-center gap-1">
                              <Mic2 size={11} />
                              {pl.episodeTitle}
                            </span>
                          )}
                          <span className="capitalize">{pl.position?.replace('-', ' ')}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{pl.duration}s</span>
                          {pl.price && <span>{pl.price.toFixed(2)} €</span>}
                          {pl.deliveryType === 'produced' ? (
                            <span className="flex items-center gap-1 text-accent-purple"><Mic2 size={11} />Produziert</span>
                          ) : (
                            <span className="flex items-center gap-1"><Package size={11} />Angeliefert</span>
                          )}
                          {pl.airDate && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(pl.airDate).toLocaleDateString('de-DE')}</span>}
                        </div>

                        {pl.notes && <p className="text-text-muted text-xs mt-1">{pl.notes}</p>}

                        {/* Status progression */}
                        {can('canEditSponsors') && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-text-muted text-xs">Status:</span>
                            <select
                              value={pl.status}
                              onChange={e => handleUpdatePlacementStatus(pl.id, e.target.value)}
                              className="text-xs bg-obsidian-800 border border-surface-border rounded-lg px-2 py-1 text-text-secondary focus:outline-none hover:border-surface-border-light"
                            >
                              {AD_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {can('canEditSponsors') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditPlacement(pl)} className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeletePlacement(pl.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTACT TAB */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">Kontaktdaten</h3>
            <div>
              <label className="label">E-Mail</label>
              <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="input" disabled={!can('canEditSponsors')} />
            </div>
            <div>
              <label className="label">Website</label>
              <div className="flex gap-2">
                <input type="url" value={form.website} onChange={e => updateForm('website', e.target.value)} className="input flex-1" placeholder="https://..." disabled={!can('canEditSponsors')} />
                {form.website && (
                  <a href={form.website} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">Schnellkontakt</h3>
            {form.email ? (
              <a href={`mailto:${form.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800 hover:bg-surface-raised transition-colors">
                <Mail size={18} className="text-accent-blue" />
                <div>
                  <p className="text-text-primary text-sm font-medium">E-Mail senden</p>
                  <p className="text-text-muted text-xs">{form.email}</p>
                </div>
              </a>
            ) : (
              <p className="text-text-muted text-sm">Keine E-Mail hinterlegt</p>
            )}
            {form.phone && (
              <a href={`tel:${form.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800 hover:bg-surface-raised transition-colors">
                <Phone size={18} className="text-accent-green" />
                <div>
                  <p className="text-text-primary text-sm font-medium">Anrufen</p>
                  <p className="text-text-muted text-xs">{form.phone}</p>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Placement Modal */}
      <Modal isOpen={showPlacementModal} onClose={() => setShowPlacementModal(false)} title={editingPlacement ? 'Platzierung bearbeiten' : 'Neue Werbeplatzierung'} size="lg">
        <form onSubmit={handleSavePlacement} className="space-y-4">
          <div>
            <label className="label">Werbetitel</label>
            <input type="text" value={placementForm.adTitle} onChange={e => setPlacementForm(p => ({ ...p, adTitle: e.target.value }))} className="input" placeholder="z.B. Produkt-Spot Q1 2025" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Episode</label>
              <select value={placementForm.episodeId} onChange={e => setPlacementForm(p => ({ ...p, episodeId: e.target.value }))} className="select">
                <option value="">Keine Episode zugeordnet</option>
                {episodes.map(ep => <option key={ep.id} value={ep.id}>{ep.number ? `#${ep.number} — ` : ''}{ep.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Werbekategorie</label>
              <select value={placementForm.categoryId} onChange={e => setPlacementForm(p => ({ ...p, categoryId: e.target.value }))} className="select">
                <option value="">Keine Kategorie</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Position</label>
              <select value={placementForm.position} onChange={e => setPlacementForm(p => ({ ...p, position: e.target.value }))} className="select">
                <option value="pre-roll">Pre-Roll</option>
                <option value="mid-roll">Mid-Roll</option>
                <option value="post-roll">Post-Roll</option>
                <option value="host-read">Host-Read</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            </div>
            <div>
              <label className="label">Dauer (Sekunden)</label>
              <input type="number" value={placementForm.duration} onChange={e => setPlacementForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} className="input" min="5" max="600" />
            </div>
            <div>
              <label className="label">Preis (€)</label>
              <input type="number" value={placementForm.price} onChange={e => setPlacementForm(p => ({ ...p, price: e.target.value }))} className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select value={placementForm.status} onChange={e => setPlacementForm(p => ({ ...p, status: e.target.value }))} className="select">
                {AD_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ausstrahlungsdatum</label>
              <input type="date" value={placementForm.airDate} onChange={e => setPlacementForm(p => ({ ...p, airDate: e.target.value }))} className="input" />
            </div>
          </div>

          {/* Delivery Type */}
          <div>
            <label className="label">Werbemittel-Lieferung</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'self', label: '📦 Selbst angeliefert', desc: 'Sponsor liefert fertiges Material' },
                { value: 'produced', label: '🎙️ Von uns produziert', desc: 'Wir produzieren das Werbemittel' },
              ].map(d => (
                <button key={d.value} type="button" onClick={() => setPlacementForm(p => ({ ...p, deliveryType: d.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${placementForm.deliveryType === d.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}>
                  <p className="text-text-primary text-sm font-medium">{d.label}</p>
                  <p className="text-text-muted text-xs">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Script (for produced ads) */}
          {placementForm.deliveryType === 'produced' && (
            <div>
              <label className="label">Werbe-Script / Briefing</label>
              <textarea value={placementForm.adScript} onChange={e => setPlacementForm(p => ({ ...p, adScript: e.target.value }))} className="textarea" rows={4} placeholder="Script-Text oder Briefing für die Produktion..." />
            </div>
          )}

          <div>
            <label className="label">Notizen</label>
            <textarea value={placementForm.notes} onChange={e => setPlacementForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPlacementModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" className="btn-primary">{editingPlacement ? 'Speichern' : 'Platzierung erstellen'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
