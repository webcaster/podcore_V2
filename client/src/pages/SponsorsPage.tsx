import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Megaphone, Plus, Search, Building2, Mail, Phone, Globe,
  Tag, Edit2, Trash2, ChevronRight, CheckCircle, XCircle,
  Clock, Star, Filter, BarChart3
} from 'lucide-react';
import { sponsorsApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';

const SPONSOR_STATUS = [
  { value: 'aktiv', label: 'Aktiv', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'inaktiv', label: 'Inaktiv', color: 'bg-surface-overlay text-text-muted' },
  { value: 'interessent', label: 'Interessent', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'pausiert', label: 'Pausiert', color: 'bg-accent-orange/20 text-accent-orange' },
];

const AD_DELIVERY = [
  { value: 'self', label: 'Selbst angeliefert', icon: '📦', desc: 'Sponsor liefert fertiges Werbemittel' },
  { value: 'produced', label: 'Von uns produziert', icon: '🎙️', desc: 'Wir sprechen und produzieren die Werbung' },
  { value: 'both', label: 'Beides möglich', icon: '🔄', desc: 'Beide Varianten werden genutzt' },
];

export default function SponsorsPage() {
  const { can, showSuccess, showError } = useApp();
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'sponsors' | 'categories'>('sponsors');
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', company: '', email: '', phone: '', website: '',
    status: 'interessent', adDelivery: 'self', notes: '', contractStart: '', contractEnd: '',
    budget: '', categories: [] as string[],
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '', description: '', color: '#7c3aed', defaultDuration: 30, defaultPosition: 'pre-roll',
  });
  const [isCreating, setIsCreating] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [spData, catData] = await Promise.all([
        sponsorsApi.list({ status: statusFilter || undefined, search: search || undefined }),
        sponsorsApi.listCategories(),
      ]);
      setSponsors(spData);
      setCategories(catData);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const sp = await sponsorsApi.create({
        ...sponsorForm,
        budget: sponsorForm.budget ? parseFloat(sponsorForm.budget) : undefined,
      });
      showSuccess('Sponsor erstellt');
      setShowSponsorModal(false);
      navigate(`/sponsors/${sp.id}`);
    } catch (err: any) { showError(err.message); }
    finally { setIsCreating(false); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await sponsorsApi.updateCategory(editingCategory.id, categoryForm);
        showSuccess('Kategorie aktualisiert');
      } else {
        await sponsorsApi.createCategory(categoryForm);
        showSuccess('Kategorie erstellt');
      }
      setShowCategoryModal(false);
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Kategorie "${name}" löschen?`)) return;
    try {
      await sponsorsApi.deleteCategory(id);
      showSuccess('Kategorie gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const handleDeleteSponsor = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Sponsor "${name}" löschen?`)) return;
    try {
      await sponsorsApi.delete(id);
      showSuccess('Sponsor gelöscht');
      load();
    } catch (err: any) { showError(err.message); }
  };

  const statusInfo = (val: string) => SPONSOR_STATUS.find(s => s.value === val) || SPONSOR_STATUS[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Megaphone size={24} className="text-accent-green" />
            Sponsoring
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Sponsoren, Werbekategorien und Platzierungen verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/sponsors/reports" className="btn-secondary">
            <BarChart3 size={16} />
            <span>Auswertungen</span>
          </Link>
          {can('canCreateSponsors') && (
            <button onClick={() => setShowSponsorModal(true)} className="btn-primary">
              <Plus size={16} /><span>Neuer Sponsor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-xl w-fit">
        {[
          { key: 'sponsors', label: `Sponsoren (${sponsors.length})` },
          { key: 'categories', label: `Werbekategorien (${categories.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SPONSORS TAB */}
      {activeTab === 'sponsors' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Sponsoren suchen..." className="input pl-9" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-44">
              <option value="">Alle Status</option>
              {SPONSOR_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SPONSOR_STATUS.map(s => {
              const count = sponsors.filter(sp => sp.status === s.value).length;
              return (
                <button key={s.value} onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)} className={`card text-center py-3 transition-all hover:border-surface-border-light ${statusFilter === s.value ? 'border-accent-purple/50' : ''}`}>
                  <p className="text-2xl font-bold text-text-primary">{count}</p>
                  <p className={`text-xs font-medium ${s.color.split(' ')[1]}`}>{s.label}</p>
                </button>
              );
            })}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : sponsors.length === 0 ? (
            <div className="card text-center py-16">
              <Megaphone size={40} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary font-medium">Keine Sponsoren gefunden</p>
              {can('canCreateSponsors') && (
                <button onClick={() => setShowSponsorModal(true)} className="btn-primary mt-4 mx-auto"><Plus size={16} /><span>Ersten Sponsor anlegen</span></button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sponsors.map(sp => {
                const si = statusInfo(sp.status);
                const delivery = AD_DELIVERY.find(d => d.value === sp.adDelivery);
                return (
                  <Link key={sp.id} to={`/sponsors/${sp.id}`} className="card flex items-center gap-4 hover:border-accent-green/50 transition-all group">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: sp.color || '#059669' }}>
                      {sp.name[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-text-primary font-semibold group-hover:text-accent-green transition-colors">{sp.name}</h3>
                        {sp.company && sp.company !== sp.name && (
                          <span className="text-text-muted text-sm">· {sp.company}</span>
                        )}
                        <span className={`badge text-xs ${si.color}`}>{si.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-text-muted text-xs flex-wrap">
                        {sp.email && <span className="flex items-center gap-1"><Mail size={11} />{sp.email}</span>}
                        {delivery && <span className="flex items-center gap-1">{delivery.icon} {delivery.label}</span>}
                        {sp.placements > 0 && <span className="flex items-center gap-1"><Tag size={11} />{sp.placements} Platzierung{sp.placements !== 1 ? 'en' : ''}</span>}
                        {sp.contractEnd && (
                          <span className={`flex items-center gap-1 ${new Date(sp.contractEnd) < new Date() ? 'text-accent-red' : ''}`}>
                            <Clock size={11} />Vertrag bis {new Date(sp.contractEnd).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category tags */}
                    {sp.categories?.length > 0 && (
                      <div className="hidden md:flex flex-wrap gap-1">
                        {sp.categories.slice(0, 2).map((cat: any) => (
                          <span key={cat.id} className="badge text-xs" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.name}</span>
                        ))}
                        {sp.categories.length > 2 && <span className="badge bg-surface-overlay text-text-muted text-xs">+{sp.categories.length - 2}</span>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {can('canDeleteSponsors') && (
                        <button onClick={e => handleDeleteSponsor(sp.id, sp.name, e)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <ChevronRight size={16} className="text-text-muted" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-text-secondary text-sm">Werbekategorien definieren die Art und Position von Werbeplatzierungen</p>
            {can('canManageSponsors') && (
              <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', color: '#7c3aed', defaultDuration: 30, defaultPosition: 'pre-roll' }); setShowCategoryModal(true); }} className="btn-primary">
                <Plus size={16} /><span>Neue Kategorie</span>
              </button>
            )}
          </div>

          {/* Predefined positions info */}
          <div className="card bg-obsidian-800/50">
            <h3 className="text-text-primary font-medium mb-3 text-sm">Werbe-Positionen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { pos: 'pre-roll', label: 'Pre-Roll', desc: 'Vor der Episode', color: 'text-accent-cyan' },
                { pos: 'mid-roll', label: 'Mid-Roll', desc: 'In der Mitte', color: 'text-accent-orange' },
                { pos: 'post-roll', label: 'Post-Roll', desc: 'Am Ende', color: 'text-accent-purple' },
                { pos: 'host-read', label: 'Host-Read', desc: 'Vom Host gesprochen', color: 'text-accent-green' },
              ].map(p => (
                <div key={p.pos} className="bg-obsidian-800 rounded-lg p-3">
                  <p className={`font-medium text-sm ${p.color}`}>{p.label}</p>
                  <p className="text-text-muted text-xs mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="card text-center py-12">
              <Tag size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Noch keine Werbekategorien</p>
              {can('canManageSponsors') && (
                <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', color: '#7c3aed', defaultDuration: 30, defaultPosition: 'pre-roll' }); setShowCategoryModal(true); }} className="btn-primary mt-4 mx-auto">
                  <Plus size={16} /><span>Erste Kategorie erstellen</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="card group hover:border-surface-border-light transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <h3 className="text-text-primary font-semibold">{cat.name}</h3>
                    </div>
                    {can('canManageSponsors') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description || '', color: cat.color, defaultDuration: cat.defaultDuration, defaultPosition: cat.defaultPosition }); setShowCategoryModal(true); }} className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  {cat.description && <p className="text-text-secondary text-sm mb-3">{cat.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Clock size={11} />{cat.defaultDuration}s Standard</span>
                    <span className="capitalize">{cat.defaultPosition?.replace('-', ' ')}</span>
                    {cat.placementCount > 0 && <span className="flex items-center gap-1"><Tag size={11} />{cat.placementCount} Platzierungen</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Sponsor Modal */}
      <Modal isOpen={showSponsorModal} onClose={() => setShowSponsorModal(false)} title="Neuer Sponsor" size="lg">
        <form onSubmit={handleCreateSponsor} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name / Kontaktperson *</label>
              <input type="text" value={sponsorForm.name} onChange={e => setSponsorForm(p => ({ ...p, name: e.target.value }))} className="input" required autoFocus />
            </div>
            <div>
              <label className="label">Unternehmen</label>
              <input type="text" value={sponsorForm.company} onChange={e => setSponsorForm(p => ({ ...p, company: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">E-Mail</label>
              <input type="email" value={sponsorForm.email} onChange={e => setSponsorForm(p => ({ ...p, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input type="tel" value={sponsorForm.phone} onChange={e => setSponsorForm(p => ({ ...p, phone: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select value={sponsorForm.status} onChange={e => setSponsorForm(p => ({ ...p, status: e.target.value }))} className="select">
                {SPONSOR_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Website</label>
              <input type="url" value={sponsorForm.website} onChange={e => setSponsorForm(p => ({ ...p, website: e.target.value }))} className="input" placeholder="https://..." />
            </div>
          </div>

          {/* Ad Delivery */}
          <div>
            <label className="label">Werbemittel-Lieferung</label>
            <div className="grid grid-cols-3 gap-3">
              {AD_DELIVERY.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSponsorForm(p => ({ ...p, adDelivery: d.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${sponsorForm.adDelivery === d.value ? 'border-accent-purple bg-accent-purple/10' : 'border-surface-border hover:border-surface-border-light'}`}
                >
                  <span className="text-xl">{d.icon}</span>
                  <p className="text-text-primary text-sm font-medium mt-1">{d.label}</p>
                  <p className="text-text-muted text-xs mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Budget (€)</label>
              <input type="number" value={sponsorForm.budget} onChange={e => setSponsorForm(p => ({ ...p, budget: e.target.value }))} className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Vertrag von</label>
              <input type="date" value={sponsorForm.contractStart} onChange={e => setSponsorForm(p => ({ ...p, contractStart: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Vertrag bis</label>
              <input type="date" value={sponsorForm.contractEnd} onChange={e => setSponsorForm(p => ({ ...p, contractEnd: e.target.value }))} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Notizen</label>
            <textarea value={sponsorForm.notes} onChange={e => setSponsorForm(p => ({ ...p, notes: e.target.value }))} className="textarea" rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowSponsorModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={isCreating || !sponsorForm.name} className="btn-primary">
              {isCreating ? 'Erstelle...' : 'Sponsor erstellen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title={editingCategory ? 'Kategorie bearbeiten' : 'Neue Werbekategorie'}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input type="text" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} className="input" required autoFocus placeholder="z.B. Produkt-Spot, Host-Read..." />
            </div>
            <div>
              <label className="label">Farbe</label>
              <div className="flex items-center gap-2">
                <input type="color" value={categoryForm.color} onChange={e => setCategoryForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-surface-border cursor-pointer bg-transparent" />
                <input type="text" value={categoryForm.color} onChange={e => setCategoryForm(p => ({ ...p, color: e.target.value }))} className="input flex-1 font-mono text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} className="textarea" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Standard-Dauer (Sekunden)</label>
              <input type="number" value={categoryForm.defaultDuration} onChange={e => setCategoryForm(p => ({ ...p, defaultDuration: parseInt(e.target.value) || 30 }))} className="input" min="5" max="600" />
            </div>
            <div>
              <label className="label">Standard-Position</label>
              <select value={categoryForm.defaultPosition} onChange={e => setCategoryForm(p => ({ ...p, defaultPosition: e.target.value }))} className="select">
                <option value="pre-roll">Pre-Roll</option>
                <option value="mid-roll">Mid-Roll</option>
                <option value="post-roll">Post-Roll</option>
                <option value="host-read">Host-Read</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!categoryForm.name} className="btn-primary">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
