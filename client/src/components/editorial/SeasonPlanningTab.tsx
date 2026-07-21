import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, ArrowUp, Calendar, CheckCircle2, Download, Edit2,
  FileText, Layers3, Lightbulb, ListOrdered, Loader2, Plus, Save, Sparkles,
  Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { editorialApi } from '../../lib/api';
import { useApp } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import PdfLayoutPicker from '../ui/PdfLayoutPicker';

interface SeasonPlanningTabProps {
  initialSeasonId?: string | null;
  onSeasonChange?: (seasonId: string) => void;
}

interface PlanPartner {
  id?: string;
  partnerId?: string;
  displayName: string;
  roleLabel: string;
  confirmationStatus: string;
}

interface PlanItem {
  id: string;
  seasonId: string;
  position: number | null;
  lane: 'lineup' | 'alternative';
  title: string;
  summary: string;
  topics: string[];
  episodeFormat: string;
  focusPoints: string[];
  status: string;
  priority: string;
  plannedDate?: string | null;
  episodeNumber?: number | null;
  ideaId?: string | null;
  episodeId?: string | null;
  notes: string;
  partners: PlanPartner[];
}

const STATUS_OPTIONS = [
  ['kandidat', 'Kandidat'],
  ['vorgemerkt', 'Vorgemerkt'],
  ['bestaetigt', 'Bestätigt'],
  ['in_produktion', 'In Produktion'],
  ['fertig', 'Fertig'],
  ['zurueckgestellt', 'Zurückgestellt'],
];

const STATUS_COLORS: Record<string, string> = {
  kandidat: 'bg-surface-overlay text-text-muted',
  vorgemerkt: 'bg-accent-blue/15 text-accent-blue',
  bestaetigt: 'bg-accent-green/15 text-accent-green',
  in_produktion: 'bg-accent-purple/15 text-accent-purple',
  fertig: 'bg-accent-green/20 text-accent-green',
  zurueckgestellt: 'bg-accent-orange/15 text-accent-orange',
};

const PRIORITY_OPTIONS = [
  ['niedrig', 'Niedrig'],
  ['mittel', 'Mittel'],
  ['hoch', 'Hoch'],
  ['dringend', 'Dringend'],
];

const FORMAT_OPTIONS = ['offen', 'Interview', 'Solo', 'Gespräch', 'Reportage', 'Panel', 'Sonderfolge'];

const emptyForm = () => ({
  title: '',
  summary: '',
  topics: '',
  episodeFormat: 'offen',
  focusPoints: '',
  status: 'kandidat',
  priority: 'mittel',
  plannedDate: '',
  episodeNumber: '',
  lane: 'lineup' as 'lineup' | 'alternative',
  notes: '',
  partners: [] as PlanPartner[],
});

const authHeaders = () => {
  const token = localStorage.getItem('podcore_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${url}`, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Anfrage fehlgeschlagen');
  return data.data as T;
}

export default function SeasonPlanningTab({ initialSeasonId, onSeasonChange }: SeasonPlanningTabProps) {
  const { can, showError, showSuccess } = useApp();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId || '');
  const [season, setSeason] = useState<any>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuingId, setContinuingId] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [targetEpisodeCount, setTargetEpisodeCount] = useState('');
  const [planningNotes, setPlanningNotes] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfLayoutId, setPdfLayoutId] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Strategische Staffelplanung');
  const [exporting, setExporting] = useState(false);

  const lineup = useMemo(() => items.filter(item => item.lane === 'lineup').sort((a, b) => (a.position || 9999) - (b.position || 9999)), [items]);
  const alternatives = useMemo(() => items.filter(item => item.lane === 'alternative').sort((a, b) => (a.position || 9999) - (b.position || 9999)), [items]);

  const loadSeasons = async () => {
    try {
      const data = await request<any[]>('GET', '/seasons');
      const availableSeasons = data || [];
      setSeasons(availableSeasons);
      const requested = initialSeasonId && availableSeasons.some(item => item.id === initialSeasonId) ? initialSeasonId : '';
      const next = requested || selectedSeasonId || availableSeasons[0]?.id || '';
      if (next && next !== selectedSeasonId) setSelectedSeasonId(next);
      // Ohne strategische Staffel kann kein Plan geladen werden – die Leerseite muss trotzdem erscheinen.
      if (!next) setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loadPlan = async (seasonId: string) => {
    if (!seasonId) {
      setSeason(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await request<{ season: any; items: PlanItem[] }>('GET', `/seasons/${seasonId}/plan-items`);
      setSeason(data.season);
      setItems(data.items || []);
      setTargetEpisodeCount(data.season.targetEpisodeCount == null ? '' : String(data.season.targetEpisodeCount));
      setPlanningNotes(data.season.planningNotes || '');
      setDocumentTitle(`Strategische Staffelplanung – Staffel ${data.season.number}`);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadSeasons(), editorialApi.listPartners()])
      .then(([, partnerData]) => setPartners(partnerData || []))
      .catch((error: any) => showError(error.message));
  }, []);

  useEffect(() => {
    if (initialSeasonId && seasons.some(item => item.id === initialSeasonId)) setSelectedSeasonId(initialSeasonId);
  }, [initialSeasonId, seasons]);

  useEffect(() => {
    if (!selectedSeasonId) return;
    onSeasonChange?.(selectedSeasonId);
    void loadPlan(selectedSeasonId);
  }, [selectedSeasonId]);

  const openCreate = (lane: 'lineup' | 'alternative' = 'lineup') => {
    setEditingItem(null);
    setForm({ ...emptyForm(), lane });
    setShowItemModal(true);
  };

  const openEdit = (item: PlanItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      summary: item.summary || '',
      topics: item.topics.join(', '),
      episodeFormat: item.episodeFormat || 'offen',
      focusPoints: item.focusPoints.join('\n'),
      status: item.status,
      priority: item.priority,
      plannedDate: item.plannedDate?.slice(0, 10) || '',
      episodeNumber: item.episodeNumber == null ? '' : String(item.episodeNumber),
      lane: item.lane,
      notes: item.notes || '',
      partners: item.partners.map(partner => ({ ...partner })),
    });
    setShowItemModal(true);
  };

  const payloadFromForm = () => ({
    title: form.title.trim(),
    summary: form.summary.trim(),
    topics: form.topics.split(',').map(value => value.trim()).filter(Boolean),
    episodeFormat: form.episodeFormat,
    focusPoints: form.focusPoints.split('\n').map(value => value.trim()).filter(Boolean),
    status: form.status,
    priority: form.priority,
    plannedDate: form.plannedDate || null,
    episodeNumber: form.episodeNumber === '' ? null : Number(form.episodeNumber),
    lane: form.lane,
    notes: form.notes.trim(),
    partners: form.partners.filter(partner => partner.displayName.trim()).map(partner => ({
      partnerId: partner.partnerId || null,
      displayName: partner.displayName.trim(),
      roleLabel: partner.roleLabel.trim(),
      confirmationStatus: partner.confirmationStatus,
    })),
  });

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSeasonId || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = payloadFromForm();
      if (editingItem) await request('PUT', `/seasons/plan-items/${editingItem.id}`, payload);
      else await request('POST', `/seasons/${selectedSeasonId}/plan-items`, payload);
      setShowItemModal(false);
      await loadPlan(selectedSeasonId);
      await loadSeasons();
      showSuccess(editingItem ? 'Planposition aktualisiert' : 'Planposition angelegt');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: PlanItem) => {
    if (!confirm(`„${item.title}“ aus der Staffelplanung löschen?`)) return;
    try {
      await request('DELETE', `/seasons/plan-items/${item.id}`);
      await loadPlan(selectedSeasonId);
      await loadSeasons();
      showSuccess('Planposition gelöscht');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const moveWithinLane = async (item: PlanItem, direction: -1 | 1) => {
    const laneItems = item.lane === 'lineup' ? lineup : alternatives;
    const currentIndex = laneItems.findIndex(candidate => candidate.id === item.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= laneItems.length) return;
    const reordered = [...laneItems];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    try {
      await request('POST', `/seasons/${selectedSeasonId}/plan-items/reorder`, {
        items: reordered.map(candidate => ({ id: candidate.id, lane: candidate.lane })),
      });
      await loadPlan(selectedSeasonId);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const moveToLane = async (item: PlanItem, lane: 'lineup' | 'alternative') => {
    try {
      const destination = lane === 'lineup' ? lineup : alternatives;
      await request('PUT', `/seasons/plan-items/${item.id}`, { lane, position: destination.length + 1 });
      await loadPlan(selectedSeasonId);
      showSuccess(lane === 'lineup' ? 'In die geplante Reihenfolge übernommen' : 'Zu den Alternativen verschoben');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const continueInEditor = async (item: PlanItem) => {
    if (item.episodeId) {
      navigate(`/episodes/${item.episodeId}?from=season-plan&seasonId=${selectedSeasonId}&planItemId=${item.id}`);
      return;
    }
    if (item.ideaId) {
      navigate(`/editorial/ideas/${item.ideaId}?from=season-plan&seasonId=${selectedSeasonId}&planItemId=${item.id}`);
      return;
    }
    setContinuingId(item.id);
    try {
      const result = await request<{ episodeId: string | null; ideaId: string; stage: 'idea' | 'episode' }>('POST', `/seasons/plan-items/${item.id}/continue`, {});
      if (result.episodeId) {
        showSuccess('Die zugehörige Episode wurde geöffnet');
        navigate(`/episodes/${result.episodeId}?from=season-plan&seasonId=${selectedSeasonId}&planItemId=${item.id}`);
      } else {
        showSuccess('Ideenmappe angelegt. Vervollständige dort alle Folgeninformationen, bevor du die Episode erstellst.');
        navigate(`/editorial/ideas/${result.ideaId}?from=season-plan&seasonId=${selectedSeasonId}&planItemId=${item.id}`);
      }
    } catch (error: any) {
      showError(error.message);
    } finally {
      setContinuingId('');
    }
  };

  const saveSeasonPlan = async () => {
    if (!season) return;
    setSaving(true);
    try {
      await request('PUT', `/seasons/${season.id}`, {
        targetEpisodeCount: targetEpisodeCount ? Number(targetEpisodeCount) : null,
        planningNotes,
      });
      await loadPlan(season.id);
      await loadSeasons();
      showSuccess('Staffelziel gespeichert');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSeasonId || !documentTitle.trim()) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ documentTitle: documentTitle.trim() });
      if (pdfLayoutId) params.set('layoutId', pdfLayoutId);
      const response = await fetch(`/api/seasons/${selectedSeasonId}/plan-items/pdf`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          documentTitle: documentTitle.trim(),
          layoutId: pdfLayoutId || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'PDF-Export fehlgeschlagen');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle.trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      showSuccess('Strategische Staffelplanung als PDF exportiert');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setExporting(false);
    }
  };

  const addPartnerRow = () => setForm(current => ({
    ...current,
    partners: [...current.partners, { displayName: '', roleLabel: '', confirmationStatus: 'offen' }],
  }));

  const updatePartnerRow = (index: number, patch: Partial<PlanPartner>) => setForm(current => ({
    ...current,
    partners: current.partners.map((partner, partnerIndex) => partnerIndex === index ? { ...partner, ...patch } : partner),
  }));

  const selectExistingPartner = (index: number, partnerId: string) => {
    const selected = partners.find(partner => partner.id === partnerId);
    updatePartnerRow(index, {
      partnerId: partnerId || undefined,
      displayName: selected?.name || form.partners[index]?.displayName || '',
      roleLabel: selected?.role || form.partners[index]?.roleLabel || '',
    });
  };

  const renderItem = (item: PlanItem, index: number, laneItems: PlanItem[]) => (
    <div key={item.id} className="card group hover:border-accent-purple/30 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center font-bold flex-shrink-0">
          {item.lane === 'lineup' ? item.position || index + 1 : 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-text-primary">{item.title}</h4>
            <span className={`badge text-[10px] ${STATUS_COLORS[item.status] || STATUS_COLORS.kandidat}`}>
              {STATUS_OPTIONS.find(option => option[0] === item.status)?.[1] || item.status}
            </span>
            {item.priority === 'hoch' || item.priority === 'dringend' ? <span className="badge bg-accent-orange/15 text-accent-orange text-[10px]">{item.priority}</span> : null}
          </div>
          {item.summary && <p className="text-text-secondary text-sm mt-1 line-clamp-2">{item.summary}</p>}
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
            <span>{item.episodeFormat}</span>
            {item.plannedDate && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(item.plannedDate).toLocaleDateString('de-DE')}</span>}
            {item.episodeNumber != null && <span className="flex items-center gap-1"><FileText size={11} /> Folge {item.episodeNumber}</span>}
            {item.partners.length > 0 && <span className="flex items-center gap-1"><Users size={11} /> {item.partners.map(partner => partner.displayName).join(', ')}</span>}
          </div>
          {item.topics.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{item.topics.map(topic => <span key={topic} className="badge bg-accent-blue/10 text-accent-blue text-[10px]">{topic}</span>)}</div>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {can('canEditSeasonPlanning') && (
            <>
              <button onClick={() => moveWithinLane(item, -1)} disabled={index === 0} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-25" title="Nach oben"><ArrowUp size={14} /></button>
              <button onClick={() => moveWithinLane(item, 1)} disabled={index === laneItems.length - 1} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-25" title="Nach unten"><ArrowDown size={14} /></button>
              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue" title="Bearbeiten"><Edit2 size={14} /></button>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => moveToLane(item, item.lane === 'lineup' ? 'alternative' : 'lineup')} disabled={!can('canEditSeasonPlanning')} className="btn-ghost text-xs">
          {item.lane === 'lineup' ? 'Als Alternative ablegen' : 'In Reihenfolge übernehmen'}
        </button>
        <div className="flex items-center gap-2">
          {can('canEditSeasonPlanning') && !item.episodeId && <button onClick={() => deleteItem(item)} className="p-2 text-text-muted hover:text-accent-red" title="Löschen"><Trash2 size={14} /></button>}
          {can('canTransitionSeasonPlanningToEpisode') && (
            <button onClick={() => continueInEditor(item)} disabled={continuingId === item.id} className="btn-primary text-xs flex items-center gap-2">
              {continuingId === item.id ? <Loader2 size={14} className="animate-spin" /> : item.episodeId ? <ArrowRight size={14} /> : <Sparkles size={14} />}
              {item.episodeId ? 'Episode weiterbearbeiten' : item.ideaId ? 'Ideenmappe weiterführen' : 'Ideenmappe anlegen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!loading && seasons.length === 0) return (
    <div className="card text-center py-16">
      <Layers3 size={48} className="mx-auto text-text-muted mb-4" />
      <h3 className="text-lg font-semibold text-text-primary">Zuerst eine Staffel anlegen</h3>
      <p className="text-text-secondary mt-2 mb-5">Die strategische Planung wird immer einer Staffel zugeordnet.</p>
      <button onClick={() => navigate('/seasons')} className="btn-primary">Zur Staffelverwaltung</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ListOrdered size={19} className="text-accent-purple" />
              <h3 className="font-semibold text-text-primary">Strategische Staffelplanung</h3>
            </div>
            <p className="text-sm text-text-muted mt-1">Folgenreihenfolge, Themenmix und Interviewpartner planen. Jede Folge wird zuerst als Ideenmappe vorbereitet und anschließend daraus als Episode erstellt.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={selectedSeasonId} onChange={event => setSelectedSeasonId(event.target.value)} className="input min-w-56">
              {seasons.map(item => <option key={item.id} value={item.id}>Staffel {item.number}: {item.title}</option>)}
            </select>
            {can('canExportSeasonPlanning') && <button onClick={() => setShowExportModal(true)} disabled={!season} className="btn-secondary flex items-center gap-2"><Download size={15} /> PDF</button>}
            {can('canEditSeasonPlanning') && <button onClick={() => openCreate('lineup')} className="btn-primary flex items-center gap-2"><Plus size={15} /> Folge planen</button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card py-16 flex justify-center"><Loader2 size={30} className="animate-spin text-accent-purple" /></div>
      ) : season && (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="card text-center"><p className="text-2xl font-bold text-accent-purple">{lineup.length}</p><p className="text-xs text-text-muted">Geplante Folgen</p></div>
            <div className="card text-center"><p className="text-2xl font-bold text-accent-blue">{targetEpisodeCount || '–'}</p><p className="text-xs text-text-muted">Staffelziel</p></div>
            <div className="card text-center"><p className="text-2xl font-bold text-accent-orange">{alternatives.length}</p><p className="text-xs text-text-muted">Alternativen</p></div>
            <div className="card text-center"><p className="text-2xl font-bold text-accent-green">{items.filter(item => item.episodeId).length}</p><p className="text-xs text-text-muted">Im Episoden-Editor</p></div>
          </div>

          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-medium text-text-primary">Staffelziel und Leitgedanken</h4>
                <p className="text-xs text-text-muted mt-1">Diese Angaben erscheinen auch im PDF und helfen bei der redaktionellen Balance.</p>
              </div>
              {can('canEditSeasonPlanning') && <button onClick={saveSeasonPlan} disabled={saving} className="btn-secondary text-xs flex items-center gap-2"><Save size={14} /> Speichern</button>}
            </div>
            <div className="grid md:grid-cols-[180px_1fr] gap-4 mt-4">
              <div><label className="label">Zielzahl Folgen</label><input type="number" min="1" max="300" value={targetEpisodeCount} onChange={event => setTargetEpisodeCount(event.target.value)} disabled={!can('canEditSeasonPlanning')} className="input w-full" placeholder="z. B. 20" /></div>
              <div><label className="label">Leitgedanken / Dramaturgie</label><textarea value={planningNotes} onChange={event => setPlanningNotes(event.target.value)} disabled={!can('canEditSeasonPlanning')} className="textarea w-full" rows={2} placeholder="Was soll die Staffel als Ganzes erzählen? Welche Themen müssen ausgewogen sein?" /></div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] gap-5 items-start">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-text-primary flex items-center gap-2"><ListOrdered size={17} className="text-accent-purple" /> Geplante Reihenfolge</h3><p className="text-xs text-text-muted mt-1">Die Nummerierung bleibt von der späteren Episodennummer getrennt.</p></div>
                {can('canEditSeasonPlanning') && <button onClick={() => openCreate('lineup')} className="btn-ghost text-xs"><Plus size={14} /> Position</button>}
              </div>
              {lineup.length === 0 ? <div className="card border-dashed text-center py-10"><Lightbulb size={30} className="mx-auto text-text-muted mb-2" /><p className="text-text-secondary">Noch keine Folgenposition geplant.</p></div> : lineup.map((item, index) => renderItem(item, index, lineup))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-text-primary flex items-center gap-2"><Sparkles size={17} className="text-accent-orange" /> Alternativen und Überhang</h3><p className="text-xs text-text-muted mt-1">Ersatzthemen oder Kandidaten für die nächste Staffel.</p></div>
                {can('canEditSeasonPlanning') && <button onClick={() => openCreate('alternative')} className="btn-ghost text-xs"><Plus size={14} /> Alternative</button>}
              </div>
              {alternatives.length === 0 ? <div className="card border-dashed text-center py-10"><p className="text-text-muted text-sm">Keine Alternativen hinterlegt.</p></div> : alternatives.map((item, index) => renderItem(item, index, alternatives))}
            </section>
          </div>
        </>
      )}

      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Planposition bearbeiten' : 'Neue Folge strategisch planen'} size="lg">
        <form onSubmit={saveItem} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">Arbeitstitel *</label><input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="input w-full" required autoFocus maxLength={240} /></div>
            <div className="md:col-span-2"><label className="label">Kurzbeschreibung</label><textarea value={form.summary} onChange={event => setForm(current => ({ ...current, summary: event.target.value }))} className="textarea w-full" rows={3} /></div>
            <div><label className="label">Bereich</label><select value={form.lane} onChange={event => setForm(current => ({ ...current, lane: event.target.value as any }))} className="input w-full"><option value="lineup">Geplante Reihenfolge</option><option value="alternative">Alternative / Überhang</option></select></div>
            <div><label className="label">Format</label><select value={form.episodeFormat} onChange={event => setForm(current => ({ ...current, episodeFormat: event.target.value }))} className="input w-full">{FORMAT_OPTIONS.map(format => <option key={format} value={format}>{format}</option>)}</select></div>
            <div><label className="label">Status</label><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} className="input w-full">{STATUS_OPTIONS.map(option => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></div>
            <div><label className="label">Priorität</label><select value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value }))} className="input w-full">{PRIORITY_OPTIONS.map(option => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></div>
            <div><label className="label">Geplanter Termin</label><input type="date" value={form.plannedDate} onChange={event => setForm(current => ({ ...current, plannedDate: event.target.value }))} className="input w-full" /></div>
            <div><label className="label">Folgennummer <span className="text-text-muted font-normal">(optional)</span></label><input type="number" min="0" step="1" value={form.episodeNumber} onChange={event => setForm(current => ({ ...current, episodeNumber: event.target.value }))} className="input w-full" placeholder="z. B. 0" /><p className="text-[11px] text-text-muted mt-1">Ermöglicht Pilot- und Sonderfolgen ab Nummer 0.</p></div>
            <div><label className="label">Themen / Kategorien</label><input value={form.topics} onChange={event => setForm(current => ({ ...current, topics: event.target.value }))} className="input w-full" placeholder="Gesellschaft, Region, Bildung" /><p className="text-[11px] text-text-muted mt-1">Durch Kommas trennen</p></div>
            <div className="md:col-span-2"><label className="label">Schwerpunkte</label><textarea value={form.focusPoints} onChange={event => setForm(current => ({ ...current, focusPoints: event.target.value }))} className="textarea w-full" rows={4} placeholder={'Ein Schwerpunkt pro Zeile'} /></div>
            <div className="md:col-span-2"><label className="label">Planungsnotizen</label><textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} className="textarea w-full" rows={3} /></div>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3"><div><h4 className="font-medium text-text-primary flex items-center gap-2"><Users size={15} /> Partner und Rollen</h4><p className="text-xs text-text-muted">Bestehende Kontakte auswählen oder zunächst nur einen Rollenplatzhalter eintragen.</p></div><button type="button" onClick={addPartnerRow} className="btn-ghost text-xs"><UserPlus size={14} /> Partner</button></div>
            <div className="space-y-2">
              {form.partners.map((partner, index) => (
                <div key={index} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end bg-surface-raised p-3 rounded-lg">
                  <div><label className="label text-xs">Vorhandener Kontakt</label><select value={partner.partnerId || ''} onChange={event => selectExistingPartner(index, event.target.value)} className="input w-full text-sm"><option value="">Freier Eintrag</option>{partners.map(existing => <option key={existing.id} value={existing.id}>{existing.name}{existing.company ? ` · ${existing.company}` : ''}</option>)}</select></div>
                  <div><label className="label text-xs">Name / Platzhalter *</label><input value={partner.displayName} onChange={event => updatePartnerRow(index, { displayName: event.target.value, partnerId: undefined })} className="input w-full text-sm" placeholder="Name oder z. B. Expertin" /></div>
                  <div><label className="label text-xs">Rolle / Status</label><div className="grid grid-cols-2 gap-2"><input value={partner.roleLabel} onChange={event => updatePartnerRow(index, { roleLabel: event.target.value })} className="input w-full text-sm" placeholder="Rolle" /><select value={partner.confirmationStatus} onChange={event => updatePartnerRow(index, { confirmationStatus: event.target.value })} className="input w-full text-sm"><option value="offen">Offen</option><option value="angefragt">Angefragt</option><option value="zugesagt">Zugesagt</option><option value="abgesagt">Abgesagt</option></select></div></div>
                  <button type="button" onClick={() => setForm(current => ({ ...current, partners: current.partners.filter((_, partnerIndex) => partnerIndex !== index) }))} className="p-2 text-text-muted hover:text-accent-red"><X size={15} /></button>
                </div>
              ))}
              {form.partners.length === 0 && <p className="text-sm text-text-muted text-center py-4 border border-dashed border-border-subtle rounded-lg">Noch keine Partner oder Rollen vorgesehen.</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowItemModal(false)} className="btn-secondary">Abbrechen</button><button type="submit" disabled={saving || !form.title.trim()} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Speichern</button></div>
        </form>
      </Modal>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Strategische Staffelplanung exportieren" size="md">
        <form onSubmit={exportPdf} className="space-y-4">
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3 text-sm text-text-secondary"><FileText size={16} className="inline mr-2 text-accent-purple" />Exportiert werden Staffelziel, geplante Reihenfolge, Themen, Partner, Schwerpunkte und Alternativen.</div>
          <div><label className="label">Dokumenttitel *</label><input value={documentTitle} onChange={event => setDocumentTitle(event.target.value)} className="input w-full" required maxLength={160} /></div>
          <div><label className="label">PDF-Layout</label><PdfLayoutPicker exportType="season_planning" value={pdfLayoutId} onChange={setPdfLayoutId} className="w-full" /></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowExportModal(false)} className="btn-secondary">Abbrechen</button><button type="submit" disabled={exporting || !documentTitle.trim()} className="btn-primary">{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF herunterladen</button></div>
        </form>
      </Modal>
    </div>
  );
}
