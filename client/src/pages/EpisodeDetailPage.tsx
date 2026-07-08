import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Mic2, Music, Megaphone,
  FileText, ChevronDown, ChevronUp, Calendar, Clock, Tag, Users, Loader2,
  Download, Settings, Wrench, Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Quote, Code,
  AlertTriangle, Lightbulb, BarChart3, Cpu, Mic, Volume2, Film, Info, CheckCircle, Circle,
  Search, Star, CheckSquare, Square, BookOpen, UserCheck, Layers, ExternalLink, X,
  MessageSquare, HelpCircle, FileEdit, StickyNote, Target, Timer, Timer as TimerIcon,
  RotateCcw
} from 'lucide-react';
import { episodesApi, adminApi, editorialApi, editorialHubApi, sponsorsApi, mediaApi } from '../lib/api';
import { sponsorsV2Api } from '../lib/api-v2';
import Modal from '../components/ui/Modal';
import IdeaImportModal from '../components/ui/IdeaImportModal';
import PdfLayoutPicker from '../components/ui/PdfLayoutPicker';
import { useApp } from '../contexts/AppContext';

const BLOCK_TYPES = [
  { value: 'intro', label: 'Intro', color: 'text-accent-cyan', bg: 'bg-accent-cyan/20' },
  { value: 'segment', label: 'Segment', color: 'text-accent-blue', bg: 'bg-accent-blue/20' },
  { value: 'interview', label: 'Interview', color: 'text-accent-purple', bg: 'bg-accent-purple/20' },
  // interview_questions: strukturierter Block für Fragen aus dem Redaktionshub
  // Zeiterfassung: pro Frage konfigurierbare Antwortzeit (Standard 90s) + Sprechzeit der Frage
  { value: 'interview_questions', label: 'Interview-Fragen', color: 'text-accent-purple', bg: 'bg-accent-purple/10', hubOnly: true },
  { value: 'highlights', label: 'Highlights', color: 'text-accent-yellow', bg: 'bg-accent-yellow/20' },
  { value: 'ad', label: 'Werbung', color: 'text-accent-orange', bg: 'bg-accent-orange/20' },
  { value: 'jingle', label: 'Jingle', color: 'text-accent-green', bg: 'bg-accent-green/20' },
  { value: 'outro', label: 'Outro', color: 'text-accent-red', bg: 'bg-accent-red/20' },
  { value: 'custom', label: 'Benutzerdefiniert', color: 'text-text-secondary', bg: 'bg-surface-overlay' },
];

const STATUS_OPTIONS = [
  { value: 'idee', label: 'Idee', color: 'bg-surface-overlay text-text-muted' },
  { value: 'entwurf', label: 'Entwurf', color: 'bg-surface-overlay text-text-muted' },
  { value: 'aufnahme', label: 'Aufnahme', color: 'bg-accent-orange/20 text-accent-orange' },
  { value: 'produktion', label: 'Produktion', color: 'bg-accent-blue/20 text-accent-blue' },
  { value: 'geplant', label: 'Geplant', color: 'bg-accent-purple/20 text-accent-purple' },
  { value: 'veroeffentlicht', label: 'Veröffentlicht', color: 'bg-accent-green/20 text-accent-green' },
  { value: 'archiviert', label: 'Archiviert', color: 'bg-surface-overlay text-text-muted' },
];

// ── Rich Text Toolbar ──────────────────────────────────────────────────────
function RichTextToolbar({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string, value?: string) => {
    targetRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const buttons = [
    { icon: <Bold size={13} />, cmd: 'bold', title: 'Fett (Strg+B)' },
    { icon: <Italic size={13} />, cmd: 'italic', title: 'Kursiv (Strg+I)' },
    { icon: <Underline size={13} />, cmd: 'underline', title: 'Unterstrichen (Strg+U)' },
    null,
    { icon: <Heading1 size={13} />, cmd: 'formatBlock', value: 'h2', title: 'Überschrift 1' },
    { icon: <Heading2 size={13} />, cmd: 'formatBlock', value: 'h3', title: 'Überschrift 2' },
    { icon: <Quote size={13} />, cmd: 'formatBlock', value: 'blockquote', title: 'Zitat' },
    { icon: <Code size={13} />, cmd: 'formatBlock', value: 'pre', title: 'Code-Block' },
    null,
    { icon: <List size={13} />, cmd: 'insertUnorderedList', title: 'Aufzählung' },
    { icon: <ListOrdered size={13} />, cmd: 'insertOrderedList', title: 'Nummerierte Liste' },
    null,
    { icon: <AlignLeft size={13} />, cmd: 'justifyLeft', title: 'Linksbündig' },
    { icon: <AlignCenter size={13} />, cmd: 'justifyCenter', title: 'Zentriert' },
    { icon: <AlignRight size={13} />, cmd: 'justifyRight', title: 'Rechtsbündig' },
  ];

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 bg-obsidian-800 border-b border-surface-border rounded-t-lg">
      {buttons.map((btn, i) =>
        btn === null ? (
          <div key={i} className="w-px h-4 bg-surface-border mx-1" />
        ) : (
          <button
            key={i}
            type="button"
            title={btn.title}
            onMouseDown={e => { e.preventDefault(); exec(btn.cmd, (btn as any).value); }}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            {btn.icon}
          </button>
        )
      )}
    </div>
  );
}

// ── Rich Text Editor ───────────────────────────────────────────────────────
function RichTextEditor({
  value, onChange, placeholder, disabled, minHeight = 120
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!isComposing.current && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden">
      {!disabled && <RichTextToolbar targetRef={editorRef} />}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={`w-full bg-obsidian-900 text-text-primary text-sm p-4 focus:outline-none prose-editor ${disabled ? 'opacity-60 cursor-default' : ''}`}
      />
    </div>
  );
}

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, showSuccess, showError } = useApp();
  const [episode, setEpisode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'shownotes' | 'meta' | 'production' | 'technical' | 'ads' | 'hub'>('script');

  // Redaktionshub-Tab States
  const [hubIdeas, setHubIdeas] = useState<any[]>([]);
  const [hubInterviews, setHubInterviews] = useState<any[]>([]);
  const [hubSearch, setHubSearch] = useState('');
  const [hubStatusFilter, setHubStatusFilter] = useState('');
  const [isLoadingHub, setIsLoadingHub] = useState(false);
  const [selectedHubIdea, setSelectedHubIdea] = useState<any>(null);
  const [showIdeaImportModal, setShowIdeaImportModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [showNewInterviewModal, setShowNewInterviewModal] = useState(false);
  const [newInterviewForm, setNewInterviewForm] = useState({ name: '', company: '', role: '', email: '', bio: '', guestIntro: '' });
  const [adBookings, setAdBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [showAdBookingModal, setShowAdBookingModal] = useState(false);
  const [adBookingForm, setAdBookingForm] = useState<any>({ adSlotId: '', sponsorId: '', position: 'mid-roll', scriptText: '', presentationText: '', duration: '', confirmed: false, timePosition: '' });
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'request' | 'approve' | 'reject' | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [isImportingHub, setIsImportingHub] = useState(false);
  const [linkedIdeaId, setLinkedIdeaId] = useState<string | null>(null);

  // PDF Layout & Dateiname
  const [pdfLayoutId, setPdfLayoutId] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfDocTitle, setPdfDocTitle] = useState('');

  // Script-fertig Status
  const [scriptReady, setScriptReady] = useState(false);
  const [isTogglingScriptReady, setIsTogglingScriptReady] = useState(false);

  // Block collapse state
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const toggleBlockCollapse = (blockId: string) =>
    setCollapsedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  const collapseAll = () => setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])));
  const expandAll = () => setCollapsedBlocks({});

  // Media Library Modal
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTargetBlock, setMediaTargetBlock] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');

  // Form state
  const [form, setForm] = useState<any>({});
  const [blocks, setBlocks] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Production info
  const [productionInfo, setProductionInfo] = useState('');

  // Show-Notes
  const [showNotes, setShowNotes] = useState('');

  // Technical data fields
  const [technicalData, setTechnicalData] = useState<Record<string, string>>({
    sampleRate: '',
    bitrate: '',
    format: '',
    channels: '',
    microphone: '',
    interface: '',
    daw: '',
    recordingLocation: '',
    mixedBy: '',
    masteredBy: '',
    musicLicense: '',
    introOutroMusic: '',
    additionalNotes: '',
  });
  const [altDuration, setAltDuration] = useState<string>('');

  const [allSponsors, setAllSponsors] = useState<any[]>([]);
  const [adCategories, setAdCategories] = useState<any[]>([]);
  const [adBookingMode, setAdBookingMode] = useState<'slot' | 'special'>('special');
  const [specialBookingForm, setSpecialBookingForm] = useState<any>({ sponsorId: '', adCategoryId: '', position: 'mid-roll', scriptText: '', note: '', timePosition: '' });
  // v2.12.0: Neue Buchungen aus ad_bookings
  const [v2Bookings, setV2Bookings] = useState<any[]>([]);
  const [isLoadingV2Bookings, setIsLoadingV2Bookings] = useState(false);
  const [showV2BookingModal, setShowV2BookingModal] = useState(false);
  const [v2BookingForm, setV2BookingForm] = useState<any>({ slotId: '', price: '', notes: '' });
  const [v2SponsorSlots, setV2SponsorSlots] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'hub') loadHubData();
  }, [activeTab]);

  const loadHubData = async () => {
    setIsLoadingHub(true);
    try {
      const [ideas, interviews] = await Promise.all([
        editorialHubApi.getIdeasForEpisode({ search: hubSearch || undefined, status: hubStatusFilter || undefined }),
        editorialHubApi.getInterviewsForEpisode(),
      ]);
      setHubIdeas(ideas);
      setHubInterviews(interviews);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoadingHub(false); }
  };

  const handleImportIdeaFull = async (idea: any) => {
    // Vollständige Idee laden
    let fullIdea = idea;
    try {
      fullIdea = await editorialHubApi.getIdeaFull(idea.id);
    } catch (_) {}
    setSelectedHubIdea(fullIdea);
    setShowIdeaImportModal(true);
  };

  const handleApplyIdeaToEpisode = (idea: any, options: { title: boolean; description: boolean; tags: boolean; notes: boolean; guests: boolean; blocks: boolean }) => {
    if (options.title && idea.title) updateForm('title', idea.title);
    if (options.description && idea.description) updateForm('description', idea.description);
    if (options.tags && idea.tags?.length) updateForm('tags', [...(form.tags || []), ...idea.tags.filter((t: string) => !(form.tags || []).includes(t))]);
    if (options.guests && idea.interviewPartners?.length) {
      const guestNames = idea.interviewPartners.map((p: any) => p.name).join(', ');
      updateForm('guests', form.guests ? `${form.guests}, ${guestNames}` : guestNames);
    }
    if (options.notes) {
      let hubNotes = '';
      if (idea.notes?.length) hubNotes += '## Notizen\n' + idea.notes.map((n: any) => `- ${n.content}`).join('\n') + '\n\n';
      if (idea.checklists?.length) hubNotes += '## Checkliste\n' + idea.checklists.map((c: any) => `${c.isDone ? '[x]' : '[ ]'} ${c.title}`).join('\n') + '\n\n';
      if (idea.interviewQuestions?.length) hubNotes += '## Interview-Fragen\n' + idea.interviewQuestions.map((q: any) => `- ${q.question}${q.partnerName ? ` (${q.partnerName})` : ''}`).join('\n');
      if (hubNotes) {
        const sep = form.notes?.trim() ? '\n\n---\n\n' : '';
        updateForm('notes', (form.notes || '') + sep + hubNotes);
      }
    }
    if (options.blocks && idea.interviewPartners?.length) {
      const newBlocks = idea.interviewPartners.map((p: any, pIdx: number) => {
        const partnerQuestions = (idea.interviewQuestions || []).filter((q: any) => q.partnerId === p.id);
        const structuredQuestions = partnerQuestions.map((q: any) => ({
          id: q.id || Math.random().toString(36).slice(2),
          question: q.question || '',
          category: q.category || '',
          answerDuration: 90,
          notes: '',
        }));
        return {
          id: Math.random().toString(36).slice(2),
          type: 'interview_questions',
          title: `Interview-Fragen: ${p.name}`,
          partnerName: p.name,
          partnerCompany: p.company || '',
          partnerRole: p.role || '',
          questions: structuredQuestions,
          content: '',
          duration: calculateDuration('', 'interview_questions', structuredQuestions),
          order: blocks.length + pIdx,
          assetId: null,
          assetName: null,
        };
      });
      setBlocks(prev => [...prev, ...newBlocks]);
    }
    showSuccess('Idee übernommen');
    setShowIdeaImportModal(false);
    markDirty();
  };

  const handleAddInterviewBlock = (partner: any) => {
    const rawQuestions = partner.approvedQuestions || partner.allQuestions || [];
    // Strukturierter interview_questions-Block: jede Frage als Objekt mit Antwortzeit
    const structuredQuestions = rawQuestions.map((q: any) => ({
      id: q.id || Math.random().toString(36).slice(2),
      question: q.question || '',
      category: q.category || '',
      answerDuration: 90, // Standard: 90 Sekunden Antwortzeit
      notes: '',
    }));
    const newBlock = {
      id: Math.random().toString(36).slice(2),
      type: 'interview_questions',
      title: `Interview-Fragen: ${partner.name}${partner.company ? ` (${partner.company})` : ''}`,
      partnerName: partner.name,
      partnerCompany: partner.company || '',
      partnerRole: partner.role || '',
      questions: structuredQuestions,
      content: '', // Legacy-Feld, wird nicht mehr für interview_questions genutzt
      duration: calculateDuration('', 'interview_questions', structuredQuestions),
      order: blocks.length,
      assetId: null,
      assetName: null,
    };
    setBlocks(prev => [...prev, newBlock]);
    setActiveTab('script');
    showSuccess(`Interview-Fragen-Block für ${partner.name} hinzugefügt (${structuredQuestions.length} Fragen)`);
    markDirty();
  };

  const handleCreateInterviewPartner = async () => {
    if (!newInterviewForm.name.trim()) return;
    try {
      await editorialApi.createPartner({ ...newInterviewForm });
      setShowNewInterviewModal(false);
      setNewInterviewForm({ name: '', company: '', role: '', email: '', bio: '', guestIntro: '' });
      loadHubData();
      showSuccess('Interview-Partner erstellt');
    } catch (err: any) { showError(err.message); }
  };

  const loadAdBookings = async () => {
    if (!id) return;
    setIsLoadingAds(true);
    try {
      const [bookings, slotsData] = await Promise.all([
        sponsorsApi.getEpisodeBookings(id),
        sponsorsApi.getAvailableSlotsForEpisode(id)
      ]);
      setAdBookings(Array.isArray(bookings) ? bookings : []);
      // slotsData ist jetzt direkt { data: slots[], allSponsors: [], categories: [] }
      setAvailableSlots((slotsData as any)?.data || []);
      setAllSponsors((slotsData as any)?.allSponsors || []);
      setAdCategories((slotsData as any)?.categories || []);
    } catch (err: any) { showError(err.message); }
    finally { setIsLoadingAds(false); }
  };

  // v2.12.0: Neue Buchungen laden
  const loadV2Bookings = async () => {
    if (!id) return;
    setIsLoadingV2Bookings(true);
    try {
      // Alle Sponsoren laden um deren v2-Buchungen für diese Episode zu finden
      const allSponsorsData = await sponsorsApi.list();
      const sponsorList = Array.isArray(allSponsorsData) ? allSponsorsData : (allSponsorsData as any)?.data || [];
      const allV2Bookings: any[] = [];
      const allSlots: any[] = [];
      for (const sp of sponsorList) {
        try {
          const [bkgs, slots] = await Promise.all([
            sponsorsV2Api.listBookings(sp.id, {}),
            sponsorsApi.listSlots(sp.id),
          ]);
          const episodeBookings = (Array.isArray(bkgs) ? bkgs : (bkgs as any)?.data || [])
            .filter((b: any) => b.episodeId === id);
          allV2Bookings.push(...episodeBookings);
          allSlots.push(...(Array.isArray(slots) ? slots : (slots as any)?.data || []).map((s: any) => ({ ...s, sponsorId: sp.id, sponsorName: sp.name })));
        } catch (_) {}
      }
      setV2Bookings(allV2Bookings);
      setV2SponsorSlots(allSlots);
    } catch (err: any) { /* Stille Fehler – v2 ist optional */ }
    finally { setIsLoadingV2Bookings(false); }
  };

  const handleApprovalAction = async () => {
    if (!id || !approvalAction) return;
    setIsApproving(true);
    try {
      let updated: any;
      if (approvalAction === 'request') updated = await episodesApi.requestApproval(id, approvalNotes);
      else if (approvalAction === 'approve') updated = await episodesApi.approve(id, approvalNotes);
      else if (approvalAction === 'reject') updated = await episodesApi.reject(id, approvalNotes);
      if (updated) setEpisode(updated);
      showSuccess(approvalAction === 'request' ? 'Freigabe angefordert' : approvalAction === 'approve' ? 'Episode freigegeben' : 'Episode abgelehnt');
      setShowApprovalModal(false);
      setApprovalNotes('');
      setApprovalAction(null);
    } catch (err: any) { showError(err.message); }
    finally { setIsApproving(false); }
  };

  const handleResetApproval = async () => {
    if (!id) return;
    try {
      const updated = await episodesApi.resetApproval(id);
      setEpisode(updated);
      showSuccess('Freigabe-Status zurückgesetzt');
    } catch (err: any) { showError(err.message); }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      episodesApi.get(id),
      adminApi.getSettings().catch(() => null),
    ]).then(([ep, settings]) => {
        setEpisode(ep);
        setWorkflowEnabled(settings?.workflow?.episodeApprovalRequired ?? false);
        setForm({
          title: ep.title || '',
          subtitle: ep.subtitle || '',
          description: ep.description || '',
          status: ep.status || 'entwurf',
          number: ep.number || '',
          recordingDate: ep.recordingDate?.slice(0, 10) || '',
          publishDate: ep.publishDate?.slice(0, 10) || '',
          hosts: ep.hosts?.join(', ') || '',
          guests: ep.guests?.join(', ') || '',
          tags: ep.tags || [],
          notes: ep.notes || '',
        });
        setBlocks(ep.blocks || []);
        setProductionInfo(ep.productionInfo || '');
        setShowNotes(ep.showNotes || '');
        setAltDuration(ep.altDuration ? String(ep.altDuration) : '');
        setScriptReady(ep.scriptReady || false);
        if (ep.ideaId) setLinkedIdeaId(ep.ideaId);
        loadAdBookings();
        loadV2Bookings();
        const globalTech = settings?.technicalDefaults || {};
        const episodeTech = (ep.technicalData && typeof ep.technicalData === 'object') ? ep.technicalData : {};
        setTechnicalData(prev => ({ ...prev, ...globalTech, ...episodeTech }));
      })
      .catch(err => showError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const markDirty = () => setIsDirty(true);

  const handleImportFromHub = async () => {
    if (!linkedIdeaId) {
      showError('Diese Episode hat keine verknüpfte Ideenmappe.');
      return;
    }
    setIsImportingHub(true);
    try {
      const [idea, notes, research, questions, checklist] = await Promise.all([
        editorialApi.getIdea(linkedIdeaId),
        editorialApi.listIdeaNotes(linkedIdeaId),
        editorialApi.listResearch({ relatedIdeaId: linkedIdeaId }),
        editorialApi.listQuestions({ ideaId: linkedIdeaId }),
        editorialApi.listIdeaChecklist(linkedIdeaId),
      ]);

      let hubNotes = '';
      if (notes.length > 0) hubNotes += '## Notizen aus Ideenmappe\n' + notes.map((n: any) => `- ${n.content}`).join('\n') + '\n\n';
      if (research.length > 0) hubNotes += '## Recherche-Quellen\n' + research.map((s: any) => `- ${s.title}${s.url ? ` (${s.url})` : ''}`).join('\n') + '\n\n';
      if (questions.length > 0) hubNotes += '## Interview-Fragen\n' + questions.map((q: any) => `- ${q.question}${q.category ? ` (${q.category})` : ''}`).join('\n') + '\n\n';
      if (checklist.length > 0) hubNotes += '## Checkliste\n' + checklist.map((c: any) => `${c.isDone ? '[x]' : '[ ]'} ${c.title}`).join('\n');

      const currentNotes = form.notes || '';
      const separator = currentNotes.trim() ? '\n\n---\n\n' : '';
      updateForm('notes', currentNotes + separator + hubNotes);
      showSuccess(`Redaktionshub-Daten importiert`);
    } catch (err: any) { showError(err.message); }
    finally { setIsImportingHub(false); }
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
    markDirty();
  };

  const updateTechnical = (key: string, value: string) => {
    setTechnicalData(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await episodesApi.update(id, {
        ...form,
        number: form.number ? parseInt(form.number) : null,
        hosts: form.hosts ? form.hosts.split(',').map((h: string) => h.trim()).filter(Boolean) : [],
        guests: form.guests ? form.guests.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
        blocks,
        productionInfo,
        showNotes,
        altDuration: altDuration ? parseInt(altDuration) : null,
        technicalData,
      });
      setEpisode(updated);
      setScriptReady(updated.scriptReady || false);
      setIsDirty(false);
      showSuccess('Episode gespeichert');
    } catch (err: any) { showError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    if (isDirty) await handleSave();
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (pdfLayoutId) params.set('layoutId', pdfLayoutId);
      if (pdfDocTitle) params.set('documentTitle', encodeURIComponent(pdfDocTitle));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/episodes/${id}/export-pdf${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `PDF-Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const defaultName = `episode-${episode?.number || id}`;
      a.download = pdfFileName ? `${pdfFileName.replace(/\.pdf$/i, '')}.pdf` : `${defaultName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('PDF exportiert');
    } catch (err: any) { showError(err.message); }
    finally { setIsExporting(false); }
  };

  // --- Episode Editor Pro: Time Calculation ---
  // Regieanweisungen in [eckigen Klammern] werden aus der Sprechzeit herausgerechnet.
  // Beispiele: [Pause 3s], [Einspieler starten], [lachen]
  const calculateDuration = (text: string, blockType?: string, questions?: any[]) => {
    // interview_questions: Fragen-Sprechzeit + konfigurierbare Antwortzeit pro Frage
    if (blockType === 'interview_questions' && questions && questions.length > 0) {
      let total = 0;
      for (const q of questions) {
        // Sprechzeit der Frage (Moderator liest sie vor)
        const qWords = (q.question || '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter((w: string) => w.length > 0).length;
        const qSpeakTime = Math.ceil(qWords / 2.5);
        // Antwortzeit: manuell gesetzt oder Standard 90 Sekunden
        const answerTime = q.answerDuration ?? 90;
        total += qSpeakTime + answerTime;
      }
      return total;
    }
    if (!text) return 0;
    // HTML-Tags entfernen
    let plainText = text.replace(/<[^>]*>?/gm, '').trim();
    if (!plainText) return 0;
    // Regieanweisungen [in eckigen Klammern] entfernen — fließen NICHT in Sprechzeit ein
    const speakerText = plainText.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!speakerText) return 0;
    // Standard: 150 Wörter/Minute → 2.5 Wörter/Sekunde
    const words = speakerText.split(/\s+/).filter(w => w.length > 0).length;
    return Math.ceil(words / 2.5);
  };

  // Regieanweisungen im Text für die Vorschau hervorheben
  const highlightDirections = (html: string): string => {
    if (!html) return html;
    // Regieanweisungen [in eckigen Klammern] mit Span umhüllen
    return html.replace(
      /\[([^\]]+)\]/g,
      '<span class="stage-direction" title="Regieanweisung – wird nicht als Sprechzeit gerechnet">[$1]</span>'
    );
  };

  // Wortanzahl nur für Sprechertext (ohne Regieanweisungen)
  const getSpeakerWordCount = (html: string): number => {
    if (!html) return 0;
    const plain = html.replace(/<[^>]*>?/gm, '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    return plain ? plain.split(/\s+/).filter(w => w.length > 0).length : 0;
  };

  const getDirectionCount = (html: string): number => {
    if (!html) return 0;
    return (html.match(/\[[^\]]*\]/g) || []).length;
  };

  const addBlock = (type: string) => {
    const newBlock = {
      id: Math.random().toString(36).slice(2),
      type,
      title: BLOCK_TYPES.find(b => b.value === type)?.label || type,
      content: '',
      duration: null,
      order: blocks.length,
      assetId: null,
      assetName: null,
    };
    setBlocks(prev => [...prev, newBlock]);
    markDirty();
  };

  const updateBlock = (blockId: string, key: string, value: any) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const updated = { ...b, [key]: value };
        // Auto-calculate duration if content changed and no manual duration set
        if (!b.manualDuration) {
          if (b.type === 'interview_questions' && (key === 'questions' || key === 'content')) {
            const qs = key === 'questions' ? value : b.questions;
            updated.duration = calculateDuration('', 'interview_questions', qs || []);
          } else if (key === 'content') {
            updated.duration = calculateDuration(value);
          }
        }
        return updated;
      }
      return b;
    }));
    markDirty();
  };

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    markDirty();
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const newBlocks = [...blocks];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[targetIdx]] = [newBlocks[targetIdx], newBlocks[idx]];
    setBlocks(newBlocks);
    markDirty();
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        updateForm('tags', [...form.tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateForm('tags', form.tags.filter((t: string) => t !== tag));
  };

  // --- Media Library Integration ---
  const openMediaPicker = (blockId: string) => {
    setMediaTargetBlock(blockId);
    setShowMediaModal(true);
    loadMedia();
  };

  const loadMedia = async () => {
    try {
      const assets = await mediaApi.list({ search: mediaSearch || undefined });
      setMediaList(assets);
    } catch (err: any) { showError(err.message); }
  };

  useEffect(() => { if (showMediaModal) loadMedia(); }, [mediaSearch]);

  const selectMedia = (asset: any) => {
    if (!mediaTargetBlock) return;
    setBlocks(prev => prev.map(b => b.id === mediaTargetBlock ? { 
      ...b, 
      assetId: asset.id, 
      assetName: asset.name,
      duration: asset.duration || b.duration, // Use asset duration if available
      manualDuration: true
    } : b));
    setShowMediaModal(false);
    setMediaTargetBlock(null);
    markDirty();
  };

  const handleToggleScriptReady = async () => {
    if (!id) return;
    setIsTogglingScriptReady(true);
    try {
      const newVal = !scriptReady;
      const updated = await episodesApi.update(id, { scriptReady: newVal });
      setEpisode(updated);
      setScriptReady(updated.scriptReady || false);
      showSuccess(newVal ? 'Script als fertig markiert ✓' : 'Script-fertig-Status zurückgesetzt');
    } catch (err: any) { showError(err.message); }
    finally { setIsTogglingScriptReady(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-accent-purple" size={32} /></div>;
  if (!episode) return <div className="card text-center py-12"><p className="text-text-secondary">Episode nicht gefunden.</p></div>;

  const statusInfo = STATUS_OPTIONS.find(s => s.value === form.status) || STATUS_OPTIONS[0];
  const totalDuration = blocks.reduce((sum, b) => sum + (b.duration || 0), 0);
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/episodes')} className="p-2 hover:bg-obsidian-800 rounded-lg text-text-muted transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              {episode.number ? `#${episode.number}` : 'Neu'} — {form.title || 'Unbenannte Episode'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`badge text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
              <span className="text-text-muted text-xs flex items-center gap-1"><Clock size={12} /> {formatTime(totalDuration)} gesamt</span>
              {scriptReady && <span className="text-accent-green text-xs flex items-center gap-1"><CheckSquare size={12} /> Script fertig</span>}
              {isDirty && <span className="text-accent-orange text-xs">● Ungespeicherte Änderungen</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can('canViewEpisodes') && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={pdfDocTitle}
                onChange={e => setPdfDocTitle(e.target.value)}
                placeholder="Dokumententitel (z.B. Episoden-Script)"
                className="input text-xs w-52"
                title="Dokumententitel im PDF (oben links unter dem Podcast-Namen)"
              />
              <input
                type="text"
                value={pdfFileName}
                onChange={e => setPdfFileName(e.target.value)}
                placeholder={`episode-${episode?.number || id}.pdf`}
                className="input text-xs w-44"
                title="Eigener Dateiname für den PDF-Export"
              />
              <PdfLayoutPicker exportType="episode" value={pdfLayoutId} onChange={setPdfLayoutId} />
              <button onClick={handleExportPdf} disabled={isExporting} className="btn-secondary">
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>PDF Export</span>
              </button>
            </div>
          )}
          {can('canEditEpisodes') && (
            <>
              <button
                onClick={handleToggleScriptReady}
                disabled={isTogglingScriptReady}
                title={scriptReady ? 'Script-fertig-Status zurücksetzen' : 'Script als fertig markieren'}
                className={`btn-secondary flex items-center gap-2 ${scriptReady ? 'border-accent-green text-accent-green hover:bg-accent-green/10' : 'hover:border-accent-green hover:text-accent-green'}`}
              >
                {isTogglingScriptReady ? <Loader2 size={16} className="animate-spin" /> : scriptReady ? <CheckSquare size={16} /> : <Square size={16} />}
                <span className="hidden sm:inline">{scriptReady ? 'Script fertig' : 'Script fertig?'}</span>
              </button>
              <button onClick={handleSave} disabled={isSaving || !isDirty} className="btn-primary">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Speichern</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian-800 p-1 rounded-lg w-fit flex-wrap">
        {[
          { key: 'script', label: 'Script', icon: <FileText size={16} /> },
          { key: 'shownotes', label: 'Show-Notes', icon: <StickyNote size={16} /> },
          { key: 'meta', label: 'Metadaten', icon: <Tag size={16} /> },
          { key: 'production', label: 'Produktion', icon: <Wrench size={16} /> },
          { key: 'technical', label: 'Technik', icon: <Settings size={16} /> },
          { key: 'ads', label: 'Werbung', icon: <Megaphone size={16} /> },
          { key: 'hub', label: 'Redaktionshub', icon: <BookOpen size={16} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'script' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary">Episode-Script (Pro)</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.value} onClick={() => addBlock(bt.value)} className={`text-xs px-2 py-1 rounded-md ${bt.bg} ${bt.color} hover:opacity-80 transition-opacity`}>+ {bt.label}</button>
                  ))}
                </div>
              </div>

              {/* Block-Steuerung: Alle auf-/zuklappen */}
              {blocks.length > 1 && (
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="text-xs text-text-muted mr-auto">Regieanweisungen in <code className="bg-obsidian-800 px-1 rounded text-accent-amber">[eckigen Klammern]</code> werden nicht als Sprechzeit gerechnet.</span>
                  <button onClick={expandAll} className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 rounded bg-obsidian-800 border border-surface-border transition-colors">Alle aufklappen</button>
                  <button onClick={collapseAll} className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 rounded bg-obsidian-800 border border-surface-border transition-colors">Alle zuklappen</button>
                </div>
              )}

              {/* Werbemarker: Pre-Roll vor erstem Block */}
              {adBookings.filter(b => b.position === 'pre-roll').length > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-accent-orange/30" />
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-orange/15 border border-accent-orange/30">
                    <Megaphone size={11} className="text-accent-orange" />
                    <span className="text-[10px] font-bold text-accent-orange uppercase tracking-wider">Pre-Roll</span>
                    {adBookings.filter(b => b.position === 'pre-roll').map(b => (
                      <span key={b.id} className="text-[10px] text-accent-orange/80 ml-1">{b.sponsor_name}</span>
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-accent-orange/30" />
                </div>
              )}

              <div className="space-y-3">
                {blocks.map((block, idx) => {
                  const bt = BLOCK_TYPES.find(b => b.value === block.type) || BLOCK_TYPES[BLOCK_TYPES.length-1];
                  const isCollapsed = !!collapsedBlocks[block.id];
                  const wordCount = getSpeakerWordCount(block.content || '');
                  const dirCount = getDirectionCount(block.content || '');
                  return (
                    <div key={block.id} className={`border rounded-xl overflow-hidden group transition-all ${isCollapsed ? 'border-surface-border/60' : 'border-surface-border'}`}>
                      {/* Block-Header */}
                      <div className={`flex items-center gap-3 px-4 py-3 ${bt.bg} ${isCollapsed ? 'rounded-xl' : ''}`}>
                        <GripVertical size={14} className="text-text-muted cursor-grab shrink-0" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${bt.color} px-1.5 py-0.5 rounded bg-black/20 shrink-0`}>{bt.label}</span>
                        <input
                          type="text"
                          value={block.title}
                          onChange={e => updateBlock(block.id, 'title', e.target.value)}
                          className="flex-1 bg-transparent text-text-primary text-sm font-medium focus:outline-none min-w-0"
                          placeholder="Titel..."
                        />
                        {/* Wort-/Regieanweisungs-Info (nur wenn nicht collapsed) */}
                        {!isCollapsed && block.content && (
                          <div className="flex items-center gap-2 shrink-0">
                            {wordCount > 0 && (
                              <span className="text-[10px] text-text-muted bg-black/20 px-1.5 py-0.5 rounded" title="Sprecherwörter">
                                {wordCount} W
                              </span>
                            )}
                            {dirCount > 0 && (
                              <span className="text-[10px] text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded" title="Regieanweisungen">
                                {dirCount} R
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Dauer-Eingabe */}
                          <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1" title={block.manualDuration ? 'Manuell gesetzt' : 'Auto-berechnet aus Sprechertext'}>
                            <Clock size={12} className={block.manualDuration ? 'text-accent-orange' : 'text-text-muted'} />
                            <input
                              type="number"
                              value={block.duration || ''}
                              onChange={e => {
                                updateBlock(block.id, 'duration', e.target.value ? parseInt(e.target.value) : 0);
                                updateBlock(block.id, 'manualDuration', true);
                              }}
                              className="w-12 bg-transparent text-text-secondary text-xs text-center focus:outline-none"
                              placeholder="Sek."
                            />
                            <span className="text-[9px] text-text-muted">s</span>
                            {!block.manualDuration && <Cpu size={10} className="text-accent-blue opacity-50" />}
                          </div>
                          {/* Collapse-Toggle */}
                          <button
                            onClick={() => toggleBlockCollapse(block.id)}
                            className="p-1 text-text-muted hover:text-text-primary transition-colors"
                            title={isCollapsed ? 'Aufklappen' : 'Zuklappen'}
                          >
                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          {/* Reihenfolge + Löschen */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30" title="Nach oben"><ChevronUp size={14} /></button>
                            <button onClick={() => moveBlock(block.id, 'down')} disabled={idx === blocks.length - 1} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30" title="Nach unten"><ChevronDown size={14} /></button>
                            <button onClick={() => removeBlock(block.id)} className="p-1 text-text-muted hover:text-accent-red" title="Block löschen"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>

                      {/* Block-Body (ausklappbar) */}
                      {!isCollapsed && (
                        <div className="bg-obsidian-900 p-1">
                          {/* ── interview_questions: Strukturierter Fragen-Block ── */}
                          {block.type === 'interview_questions' ? (
                            <div className="p-3 space-y-3">
                              {/* Partner-Info */}
                              <div className="flex items-center gap-3 px-3 py-2 bg-accent-purple/10 rounded-lg border border-accent-purple/20">
                                <MessageSquare size={14} className="text-accent-purple shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary">{block.partnerName || 'Interview-Partner'}</p>
                                  {(block.partnerCompany || block.partnerRole) && (
                                    <p className="text-xs text-text-muted">{[block.partnerRole, block.partnerCompany].filter(Boolean).join(' · ')}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-accent-purple bg-accent-purple/20 px-2 py-0.5 rounded-full">
                                  {(block.questions || []).length} Fragen
                                </span>
                              </div>
                              {/* Zeiterfassung-Info */}
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-obsidian-800 rounded-lg text-xs text-text-muted">
                                <Timer size={12} className="text-accent-blue" />
                                <span>Zeitberechnung: Sprechzeit der Fragen + konfigurierbare Antwortzeit pro Frage</span>
                                <span className="ml-auto text-accent-blue font-medium">
                                  {formatTime(calculateDuration('', 'interview_questions', block.questions || []))}
                                </span>
                              </div>
                              {/* Fragen-Liste */}
                              {(block.questions || []).length === 0 ? (
                                <div className="text-center py-6 text-text-muted text-sm">
                                  <HelpCircle size={24} className="mx-auto mb-2 opacity-40" />
                                  <p>Keine Fragen. Fragen aus dem Redaktionshub hinzufügen.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(block.questions || []).map((q: any, qIdx: number) => (
                                    <div key={q.id || qIdx} className="border border-surface-border rounded-lg overflow-hidden">
                                      <div className="flex items-start gap-3 p-3 bg-obsidian-800">
                                        <span className="text-[10px] font-bold text-accent-purple bg-accent-purple/20 px-1.5 py-0.5 rounded shrink-0 mt-0.5">F{qIdx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-text-primary">{q.question}</p>
                                          {q.category && <span className="text-[10px] text-text-muted">{q.category}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="flex items-center gap-1" title="Geschätzte Antwortzeit in Sekunden">
                                            <Clock size={11} className="text-accent-blue" />
                                            <input
                                              type="number"
                                              value={q.answerDuration ?? 90}
                                              onChange={e => {
                                                const newQs = (block.questions || []).map((qq: any, i: number) =>
                                                  i === qIdx ? { ...qq, answerDuration: parseInt(e.target.value) || 0 } : qq
                                                );
                                                updateBlock(block.id, 'questions', newQs);
                                              }}
                                              className="w-14 bg-obsidian-900 border border-surface-border rounded px-1.5 py-0.5 text-xs text-center text-text-secondary focus:outline-none focus:border-accent-blue"
                                              min="0"
                                              max="600"
                                            />
                                            <span className="text-[9px] text-text-muted">s</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              const newQs = (block.questions || []).filter((_: any, i: number) => i !== qIdx);
                                              updateBlock(block.id, 'questions', newQs);
                                            }}
                                            className="p-1 text-text-muted hover:text-accent-red"
                                            title="Frage entfernen"
                                          ><Trash2 size={12} /></button>
                                        </div>
                                      </div>
                                      {/* Notizfeld für Moderator */}
                                      <div className="px-3 pb-2 pt-1 bg-obsidian-900">
                                        <input
                                          type="text"
                                          value={q.notes || ''}
                                          onChange={e => {
                                            const newQs = (block.questions || []).map((qq: any, i: number) =>
                                              i === qIdx ? { ...qq, notes: e.target.value } : qq
                                            );
                                            updateBlock(block.id, 'questions', newQs);
                                          }}
                                          placeholder="Moderations-Notiz (intern, nicht im PDF)..."
                                          className="w-full bg-transparent text-xs text-text-muted focus:outline-none focus:text-text-primary placeholder:text-text-muted/50"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Neue Frage manuell hinzufügen */}
                              <button
                                onClick={() => {
                                  const newQ = { id: Math.random().toString(36).slice(2), question: '', category: '', answerDuration: 90, notes: '' };
                                  updateBlock(block.id, 'questions', [...(block.questions || []), newQ]);
                                }}
                                className="w-full py-2 border border-dashed border-accent-purple/30 rounded-lg text-xs text-accent-purple hover:bg-accent-purple/5 transition-colors flex items-center justify-center gap-1"
                              >
                                <Plus size={12} /> Frage manuell hinzufügen
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* ── Ad-Block: Sponsor-Verknüpfung ── */}
                              {block.type === 'ad' && (
                                <div className="px-4 py-3 border-b border-surface-border/50 bg-accent-orange/5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Megaphone size={13} className="text-accent-orange" />
                                    <span className="text-xs font-semibold text-accent-orange">Werbeplatzierung</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-text-muted uppercase mb-1 block">Position</label>
                                      <select
                                        value={block.adPosition || 'mid-roll'}
                                        onChange={e => updateBlock(block.id, 'adPosition', e.target.value)}
                                        className="input text-xs py-1"
                                      >
                                        <option value="pre-roll">Pre-Roll</option>
                                        <option value="mid-roll">Mid-Roll</option>
                                        <option value="post-roll">Post-Roll</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-text-muted uppercase mb-1 block">Verknüpfte Buchung</label>
                                      <select
                                        value={block.adBookingId || ''}
                                        onChange={e => updateBlock(block.id, 'adBookingId', e.target.value)}
                                        className="input text-xs py-1"
                                      >
                                        <option value="">— Keine Buchung —</option>
                                        {adBookings.map(b => (
                                          <option key={b.id} value={b.id}>{b.sponsor_name} ({b.position})</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  {block.adBookingId && (() => {
                                    const linked = adBookings.find(b => b.id === block.adBookingId);
                                    return linked ? (
                                      <div className="mt-2 flex items-center gap-2 text-[10px] text-accent-orange/80">
                                        <span className={`px-1.5 py-0.5 rounded ${linked.confirmed ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-orange/20 text-accent-orange'}`}>
                                          {linked.confirmed ? 'Bestätigt' : 'Angefragt'}
                                        </span>
                                        <span>{linked.slot_name || 'Sonderbuchung'}</span>
                                        {linked.time_position != null && <span><Timer size={9} className="inline" /> {formatTime(linked.time_position)}</span>}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                              {['intro', 'outro', 'jingle'].includes(block.type) && (
                                <div className="px-4 py-2 border-b border-surface-border/50 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-text-muted">
                                    <Music size={12} />
                                    {block.assetName ? (
                                      <span className="text-accent-green font-medium">{block.assetName}</span>
                                    ) : (
                                      <span>Platzhalter: {block.title} ({block.duration}s)</span>
                                    )}
                                  </div>
                                  <button onClick={() => openMediaPicker(block.id)} className="text-[10px] text-accent-purple hover:underline">Datei wählen</button>
                                </div>
                              )}
                              <RichTextEditor
                                value={block.content || ''}
                                onChange={html => updateBlock(block.id, 'content', html)}
                                placeholder="Script-Inhalt… Regieanweisungen in [eckigen Klammern] einfügen, z.B. [Pause 3s] oder [Einspieler starten]"
                                minHeight={80}
                              />
                              {/* Regieanweisungs-Vorschau */}
                              {block.content && getDirectionCount(block.content) > 0 && (
                                <div className="px-4 py-2 border-t border-surface-border/40 bg-accent-amber/5">
                                  <p className="text-[10px] text-accent-amber font-medium mb-1">Regieanweisungen in diesem Block:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(block.content.match(/\[[^\]]+\]/g) || []).map((d: string, i: number) => (
                                      <span key={i} className="text-[10px] bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full border border-accent-amber/30">{d}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Werbemarker: Mid-Roll */}
              {adBookings.filter(b => b.position === 'mid-roll').length > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-accent-orange/30" />
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-orange/15 border border-accent-orange/30">
                    <Megaphone size={11} className="text-accent-orange" />
                    <span className="text-[10px] font-bold text-accent-orange uppercase tracking-wider">Mid-Roll</span>
                    {adBookings.filter(b => b.position === 'mid-roll').map(b => (
                      <span key={b.id} className="text-[10px] text-accent-orange/80 ml-1">{b.sponsor_name}</span>
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-accent-orange/30" />
                </div>
              )}

              {/* Werbemarker: Post-Roll */}
              {adBookings.filter(b => b.position === 'post-roll').length > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-accent-orange/30" />
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-orange/15 border border-accent-orange/30">
                    <Megaphone size={11} className="text-accent-orange" />
                    <span className="text-[10px] font-bold text-accent-orange uppercase tracking-wider">Post-Roll</span>
                    {adBookings.filter(b => b.position === 'post-roll').map(b => (
                      <span key={b.id} className="text-[10px] text-accent-orange/80 ml-1">{b.sponsor_name}</span>
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-accent-orange/30" />
                </div>
              )}

            </div>
          )}

          {activeTab === 'meta' && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-text-primary">Metadaten</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Titel *</label><input type="text" value={form.title} onChange={e => updateForm('title', e.target.value)} className="input" /></div>
                <div><label className="label">Nummer</label><input type="number" value={form.number} onChange={e => updateForm('number', e.target.value)} className="input" /></div>
              </div>
              <div>
                <label className="label">Status</label>
                <select 
                  value={form.status} 
                  onChange={e => updateForm('status', e.target.value)} 
                  className="input"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div><label className="label">Untertitel</label><input type="text" value={form.subtitle} onChange={e => updateForm('subtitle', e.target.value)} className="input" /></div>
              <div><label className="label">Beschreibung</label><RichTextEditor value={form.description} onChange={html => updateForm('description', html)} minHeight={120} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Aufnahme</label><input type="date" value={form.recordingDate} onChange={e => updateForm('recordingDate', e.target.value)} className="input" /></div>
                <div><label className="label">Veröffentlichung</label><input type="date" value={form.publishDate} onChange={e => updateForm('publishDate', e.target.value)} className="input" /></div>
              </div>
              <div><label className="label">Hosts</label><input type="text" value={form.hosts} onChange={e => updateForm('hosts', e.target.value)} className="input" placeholder="Name 1, Name 2" /></div>
              <div><label className="label">Gäste</label><input type="text" value={form.guests} onChange={e => updateForm('guests', e.target.value)} className="input" placeholder="Gast 1, Gast 2" /></div>
            </div>
          )}

          {activeTab === 'shownotes' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary flex items-center gap-2"><StickyNote size={16} /> Show-Notes</h2>
                <span className="text-xs text-text-muted">Werden in der Episodenbeschreibung und im RSS-Feed veröffentlicht</span>
              </div>
              <div className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                <p className="text-xs text-accent-blue">
                  <strong>Hinweis:</strong> Show-Notes sind der öffentliche Text der Episode (Links, Zeitmarken, Quellen). Die <em>Beschreibung</em> im Metadaten-Tab ist der kurze Teaser.
                </p>
              </div>
              {can('canEditShowNotes') ? (
                <RichTextEditor
                  value={showNotes}
                  onChange={html => { setShowNotes(html); markDirty(); }}
                  minHeight={400}
                  placeholder="Show-Notes: Links, Zeitmarken, Quellen, Erwähnungen...&#10;&#10;Beispiel:&#10;00:00 Intro&#10;05:30 Thema 1&#10;...&#10;&#10;Links:&#10;- https://..."
                />
              ) : (
                <div className="p-4 bg-obsidian-800 rounded-lg border border-surface-border">
                  <p className="text-sm text-text-muted">Keine Berechtigung zum Bearbeiten der Show-Notes.</p>
                  {showNotes && <div className="mt-3 prose-editor text-sm" dangerouslySetInnerHTML={{ __html: showNotes }} />}
                </div>
              )}
            </div>
          )}

          {activeTab === 'production' && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-text-primary">Produktion</h2>
              <RichTextEditor value={productionInfo} onChange={html => { setProductionInfo(html); markDirty(); }} minHeight={300} placeholder="Anweisungen für den Cutter..." />
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="card space-y-6">
              <h2 className="font-semibold text-text-primary">Technische Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase">Audio-Spezifikationen</h3>
                  {[{k:'sampleRate',l:'Sample Rate'},{k:'bitrate',l:'Bitrate'},{k:'format',l:'Format'},{k:'channels',l:'Kanäle'}].map(({k,l}) => (
                    <div key={k}><label className="label">{l}</label><input type="text" value={technicalData[k] || ''} onChange={e => updateTechnical(k, e.target.value)} className="input" /></div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase">Hardware & Software</h3>
                  {[{k:'microphone',l:'Mikrofon'},{k:'interface',l:'Interface'},{k:'daw',l:'DAW'},{k:'recordingLocation',l:'Aufnahmeort'}].map(({k,l}) => (
                    <div key={k}><label className="label">{l}</label><input type="text" value={technicalData[k] || ''} onChange={e => updateTechnical(k, e.target.value)} className="input" /></div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase">Nachbearbeitung</h3>
                  {[{k:'mixedBy',l:'Gemischt von'},{k:'masteredBy',l:'Gemastert von'}].map(({k,l}) => (
                    <div key={k}><label className="label">{l}</label><input type="text" value={technicalData[k] || ''} onChange={e => updateTechnical(k, e.target.value)} className="input" /></div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase">Musik & Lizenzen</h3>
                  {[{k:'musicLicense',l:'Musik-Lizenz'},{k:'introOutroMusic',l:'Intro/Outro Musik'}].map(({k,l}) => (
                    <div key={k}><label className="label">{l}</label><input type="text" value={technicalData[k] || ''} onChange={e => updateTechnical(k, e.target.value)} className="input" /></div>
                  ))}
                </div>
              </div>
              {/* Episodenlänge für Sonderfolgen */}
              <div className="border border-accent-orange/30 rounded-lg p-4 bg-accent-orange/5">
                <h3 className="text-xs font-bold text-accent-orange uppercase mb-3 flex items-center gap-2"><Target size={14} /> Sonderfolge: Alternative Episodenlänge</h3>
                <p className="text-xs text-text-muted mb-3">Für FAQ-Folgen, Kurzfolgen oder Sonderformate kann hier eine abweichende Ziel-Episodenlänge hinterlegt werden. Die Standard-Länge wird in den globalen Einstellungen gesetzt.</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="label">Alternative Ziel-Länge (Minuten)</label>
                    <input
                      type="number"
                      value={altDuration}
                      onChange={e => { setAltDuration(e.target.value); markDirty(); }}
                      className="input"
                      placeholder="z.B. 15 für eine 15-minütige Kurzfolge"
                      min="1"
                      max="600"
                    />
                  </div>
                  {altDuration && (
                    <div className="flex-shrink-0 text-center">
                      <p className="text-xs text-text-muted">Ziel</p>
                      <p className="text-lg font-bold text-accent-orange">{altDuration} min</p>
                      <p className="text-[10px] text-text-muted">({Math.floor(parseInt(altDuration) * 60 / 60)}h {parseInt(altDuration) % 60}m)</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Zusätzliche Notizen</label>
                <textarea value={technicalData['additionalNotes'] || ''} onChange={e => updateTechnical('additionalNotes', e.target.value)} className="input" rows={3} placeholder="Weitere technische Hinweise..." />
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-4">

              {/* ── Sponsor-Status-Übersicht ─────────────────────────── */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-text-primary flex items-center gap-2">
                      <Megaphone size={16} className="text-accent-orange" /> Werbung dieser Episode
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">Übersicht der aktuell gebuchten Sponsoren-Werbung</p>
                  </div>
                  {can('canEditEpisodes') && (
                    <button
                      onClick={() => setShowAdBookingModal(true)}
                      className="btn-primary text-xs py-1.5"
                      title="Spontane Werbung nachbuchen"
                    >
                      <Plus size={14} /> Werbung nachbuchen
                    </button>
                  )}
                </div>

                {isLoadingAds ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-accent-orange" />
                  </div>
                ) : adBookings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-surface-border rounded-xl">
                    <Megaphone size={32} className="mx-auto mb-3 text-text-muted opacity-40" />
                    <p className="text-text-muted text-sm font-medium">Keine Werbung gebucht</p>
                    <p className="text-text-muted text-xs mt-1 mb-4">Für diese Episode ist momentan kein Sponsor gebucht.</p>
                    {can('canEditEpisodes') && (
                      <button
                        onClick={() => setShowAdBookingModal(true)}
                        className="btn-primary text-xs"
                      >
                        <Plus size={14} /> Werbung nachbuchen
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Positions-Gruppen */}
                    {(['pre-roll', 'mid-roll', 'post-roll'] as const).map(pos => {
                      const posBookings = adBookings.filter(b => b.position === pos);
                      if (posBookings.length === 0) return null;
                      const posColors: Record<string, string> = { 'pre-roll': 'text-accent-orange border-accent-orange/30 bg-accent-orange/5', 'mid-roll': 'text-accent-purple border-accent-purple/30 bg-accent-purple/5', 'post-roll': 'text-accent-blue border-accent-blue/30 bg-accent-blue/5' };
                      const posLabels: Record<string, string> = { 'pre-roll': 'Pre-Roll', 'mid-roll': 'Mid-Roll', 'post-roll': 'Post-Roll' };
                      return (
                        <div key={pos}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${posColors[pos].split(' ')[0]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${pos === 'pre-roll' ? 'bg-accent-orange' : pos === 'mid-roll' ? 'bg-accent-purple' : 'bg-accent-blue'}`} />
                            {posLabels[pos]}
                          </p>
                          <div className="space-y-2">
                            {posBookings.map(b => (
                              <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border ${posColors[pos]}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-obsidian-800 border border-surface-border flex items-center justify-center flex-shrink-0">
                                    <Megaphone size={16} className="text-accent-orange" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-text-primary truncate">{b.sponsor_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className="text-[10px] text-text-muted">{b.slot_name || 'Sonderbuchung'}</span>
                                      {b.category_name && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor: (b.category_color || '#f97316') + '22', color: b.category_color || '#f97316', border: `1px solid ${(b.category_color || '#f97316')}44`}}>{b.category_name}</span>
                                      )}
                                      {b.time_position != null && (
                                        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                                          <Timer size={9} /> {formatTime(b.time_position)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${
                                    b.confirmed
                                      ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                                      : 'bg-accent-orange/15 text-accent-orange border-accent-orange/30'
                                  }`}>
                                    {b.confirmed ? '✓ Bestätigt' : '⏳ Angefragt'}
                                  </span>
                                  {can('canEditEpisodes') && (
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Buchung von "${b.sponsor_name}" wirklich löschen?`)) return;
                                        try {
                                          await sponsorsApi.deleteEpisodeBooking(b.id);
                                          setAdBookings(prev => prev.filter(x => x.id !== b.id));
                                          showSuccess('Buchung gelöscht');
                                        } catch (err: any) { showError(err.message || 'Fehler beim Löschen'); }
                                      }}
                                      className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                                      title="Buchung löschen"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Konflikt-Warnung: mehrere Sponsoren gleicher Kategorie ── */}
              {(() => {
                const categoryGroups: Record<string, any[]> = {};
                adBookings.forEach(b => {
                  if (b.category_name) {
                    if (!categoryGroups[b.category_name]) categoryGroups[b.category_name] = [];
                    categoryGroups[b.category_name].push(b);
                  }
                });
                const conflicts = Object.entries(categoryGroups).filter(([, bks]) => bks.length > 1);
                if (conflicts.length === 0) return null;
                return (
                  <div className="card border-yellow-700/50 bg-yellow-900/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-400">Kategorie-Konflikt erkannt</p>
                        <p className="text-xs text-text-muted mt-0.5">Mehrere Sponsoren aus derselben Kategorie sind in dieser Episode gebucht:</p>
                        <div className="mt-2 space-y-1">
                          {conflicts.map(([cat, bks]) => (
                            <div key={cat} className="text-xs text-yellow-300">
                              <span className="font-medium">{cat}:</span> {bks.map(b => b.sponsor_name).join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Folgensponsor-Hinweis: Slots mit Laufzeit die diese Episode abdecken ── */}
              {availableSlots.filter((sl: any) => sl.startDate && sl.endDate && episode?.publishDate &&
                sl.startDate <= episode.publishDate && sl.endDate >= episode.publishDate &&
                !adBookings.some(b => b.ad_slot_id === sl.id)
              ).length > 0 && (
                <div className="card border-blue-700/50 bg-blue-900/10">
                  <div className="flex items-start gap-3">
                    <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-400">Folgensponsor-Hinweis</p>
                      <p className="text-xs text-text-muted mt-0.5">Folgende Werbeplätze haben eine aktive Laufzeit, die diese Episode abdeckt, sind aber noch nicht zugewiesen:</p>
                      <div className="mt-2 space-y-1.5">
                        {availableSlots.filter((sl: any) => sl.startDate && sl.endDate && episode?.publishDate &&
                          sl.startDate <= episode.publishDate && sl.endDate >= episode.publishDate &&
                          !adBookings.some(b => b.ad_slot_id === sl.id)
                        ).map((sl: any) => (
                          <div key={sl.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sl.sponsorColor || '#3b82f6' }} />
                              <span className="text-text-primary font-medium">{sl.sponsorName}</span>
                              <span className="text-text-muted">{sl.name}</span>
                              <span className="text-text-muted opacity-60">{sl.startDate?.slice(0,10)} – {sl.endDate?.slice(0,10)}</span>
                            </div>
                            {can('canEditEpisodes') && (
                              <button
                                onClick={async () => {
                                  try {
                    // @ts-ignore
                                    await sponsorsApi.createEpisodeBooking({ episodeId: id, adSlotId: sl.id, sponsorId: sl.sponsorId, position: sl.defaultPosition || 'mid-roll', confirmed: false });
                                    const updated = await sponsorsApi.getEpisodeBookings(id);
                                    setAdBookings(updated);
                                    showSuccess(`${sl.sponsorName} zugewiesen`);
                                  } catch (e: any) { showError(e.message); }
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50 hover:bg-blue-800/60 transition-colors"
                              >
                                + Zuweisen
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Timeline-Visualisierung (nur wenn Buchungen + Dauer vorhanden) ── */}
              {adBookings.length > 0 && totalDuration > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Timer size={14} /> Werbe-Timeline</h3>
                  <div className="relative h-10 bg-obsidian-900 rounded-lg border border-surface-border overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="h-full bg-accent-cyan/10" style={{width: '10%'}} title="Intro" />
                      <div className="h-full bg-accent-blue/5" style={{width: '80%'}} title="Hauptinhalt" />
                      <div className="h-full bg-accent-red/10" style={{width: '10%'}} title="Outro" />
                    </div>
                    {adBookings.filter(b => b.time_position != null).map((b, i) => {
                      const pct = Math.min(100, Math.max(0, (b.time_position / totalDuration) * 100));
                      const colors: Record<string, string> = { 'pre-roll': '#f97316', 'mid-roll': '#a855f7', 'post-roll': '#3b82f6' };
                      const color = b.category_color || colors[b.position] || '#f97316';
                      return (
                        <div key={b.id} className="absolute top-0 bottom-0 flex flex-col items-center" style={{left: `${pct}%`, transform: 'translateX(-50%)'}}>
                          <div className="w-0.5 h-full" style={{backgroundColor: color}} />
                          <div className="absolute top-1 w-4 h-4 rounded-full border-2 border-obsidian-900 flex items-center justify-center text-[8px] font-bold" style={{backgroundColor: color, color: 'white'}}>{i+1}</div>
                        </div>
                      );
                    })}
                    <div className="absolute bottom-0 left-1 text-[9px] text-text-muted">0:00</div>
                    <div className="absolute bottom-0 right-1 text-[9px] text-text-muted">{formatTime(totalDuration)}</div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {[{p:'pre-roll',l:'Pre-Roll',c:'#f97316'},{p:'mid-roll',l:'Mid-Roll',c:'#a855f7'},{p:'post-roll',l:'Post-Roll',c:'#3b82f6'}].map(pos => (
                      <div key={pos.p} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: pos.c}} />
                        <span className="text-[10px] text-text-muted">{pos.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── v2.12.0: Neue Buchungen (ad_bookings) ─────────────────── */}
              <div className="card border-purple-700/30 bg-purple-900/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-text-primary flex items-center gap-2">
                      <Megaphone size={16} className="text-accent-purple" /> Buchungen v2
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-700/50">v2.12.0</span>
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">Buchungen aus dem neuen Sponsoring-System (Verträge → Slots → Buchungen)</p>
                  </div>
                  {can('canEditSponsors') && (
                    <button
                      onClick={() => { setV2BookingForm({ slotId: '', price: '', notes: '' }); setShowV2BookingModal(true); }}
                      className="btn-primary text-xs py-1.5"
                    >
                      <Plus size={14} /> Buchung erstellen
                    </button>
                  )}
                </div>

                {isLoadingV2Bookings ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={18} className="animate-spin text-accent-purple" />
                  </div>
                ) : v2Bookings.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-purple-700/30 rounded-xl">
                    <Megaphone size={28} className="mx-auto mb-2 text-purple-600 opacity-40" />
                    <p className="text-text-muted text-sm">Keine v2-Buchungen für diese Episode</p>
                    <p className="text-text-muted text-xs mt-1">Buchungen werden über die Sponsor-Detailseite oder hier erstellt.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {v2Bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-purple-700/30 bg-purple-900/10">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{b.sponsorName}</p>
                          <p className="text-xs text-text-muted">{b.slotName} · {new Date(b.bookingDate).toLocaleDateString('de-DE')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              b.status === 'bestätigt' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                              b.status === 'ausgestrahlt' ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                              'bg-yellow-900/30 text-yellow-400 border-yellow-700/40'
                            }`}>{b.status}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              b.invoiceStatus === 'bezahlt' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                              b.invoiceStatus === 'versendet' ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                              'bg-gray-700/50 text-gray-400 border-gray-600/40'
                            }`}>Rechnung: {b.invoiceStatus}</span>
                            {b.finalPrice > 0 && (
                              <span className="text-[10px] text-accent-green font-medium">{b.finalPrice.toFixed(2)} €</span>
                            )}
                          </div>
                        </div>
                        {can('canEditSponsors') && (
                          <button
                            onClick={async () => {
                              if (!window.confirm('Buchung wirklich löschen?')) return;
                              try {
                                await sponsorsV2Api.deleteBooking(b.id);
                                showSuccess('Buchung gelöscht');
                                loadV2Bookings();
                              } catch (e: any) { showError(e.message); }
                            }}
                            className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors ml-3"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Verfügbare Slots als Vorschläge */}
                {v2SponsorSlots.length > 0 && can('canEditSponsors') && (
                  <div className="mt-4 pt-4 border-t border-purple-700/20">
                    <p className="text-xs font-semibold text-text-muted mb-2">Verfügbare Slots für Schnellbuchung</p>
                    <div className="space-y-1.5">
                      {v2SponsorSlots
                        .filter((s: any) => !v2Bookings.some((b: any) => b.slotId === s.id))
                        .slice(0, 5)
                        .map((slot: any) => (
                          <div key={slot.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-obsidian-800/60 border border-surface-border">
                            <div>
                              <span className="font-medium text-text-primary">{slot.sponsorName}</span>
                              <span className="text-text-muted ml-2">{slot.name}</span>
                              {(slot.price_per_episode || slot.base_price) && (
                                <span className="text-accent-green ml-2">{slot.price_per_episode || slot.base_price} €</span>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const today = new Date().toISOString().split('T')[0];
                                  await sponsorsV2Api.createBooking(slot.sponsorId, {
                                    slotId: slot.id,
                                    episodeId: id,
                                    bookingDate: today,
                                    price: slot.price_per_episode || slot.base_price || 0,
                                  });
                                  showSuccess(`${slot.sponsorName} gebucht`);
                                  loadV2Bookings();
                                } catch (e: any) { showError(e.message); }
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-800/60 transition-colors"
                            >
                              + Buchen
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Redaktionshub Tab ────────────────────────────────── */}
          {activeTab === 'hub' && (
            <div className="space-y-4">
              {/* Ideen-Suche */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2"><BookOpen size={16} /> Ideen aus dem Redaktionshub</h2>
                  <button onClick={loadHubData} className="btn-ghost text-xs py-1.5" disabled={isLoadingHub}>
                    {isLoadingHub ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Aktualisieren
                  </button>
                </div>
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input type="text" value={hubSearch} onChange={e => setHubSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadHubData()} className="input pl-9 text-sm" placeholder="Ideen suchen..." />
                  </div>
                  <select value={hubStatusFilter} onChange={e => { setHubStatusFilter(e.target.value); }} className="input text-sm w-40">
                    <option value="">Alle Status</option>
                    <option value="idee">Idee</option>
                    <option value="recherche">Recherche</option>
                    <option value="bereit">Bereit</option>
                    <option value="in_produktion">In Produktion</option>
                    <option value="archiviert">Archiviert</option>
                  </select>
                </div>
                {isLoadingHub ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-accent-purple" /></div>
                ) : hubIdeas.length === 0 ? (
                  <p className="text-center py-8 text-text-muted text-sm">Keine Ideen gefunden.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {hubIdeas.map(idea => (
                      <div key={idea.id} className="flex items-start justify-between p-3 bg-obsidian-800 rounded-lg border border-surface-border hover:border-accent-purple/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{idea.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-text-muted uppercase">{idea.status}</span>
                            {idea.tags?.length > 0 && <span className="text-[10px] text-accent-purple">{idea.tags.slice(0, 2).join(', ')}</span>}
                            {idea.interviewPartners?.length > 0 && <span className="text-[10px] text-accent-cyan flex items-center gap-1"><UserCheck size={10} /> {idea.interviewPartners.length} Partner</span>}
                          </div>
                          {idea.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{idea.description}</p>}
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <button onClick={() => handleImportIdeaFull(idea)} className="btn-ghost text-xs py-1 px-2" title="Idee übernehmen">
                            <Layers size={12} /> Übernehmen
                          </button>
                          <Link to={`/editorial/ideas/${idea.id}`} target="_blank" className="btn-ghost text-xs py-1 px-2" title="Im Redaktionshub öffnen">
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interview-Partner */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2"><UserCheck size={16} /> Interview-Partner</h2>
                  <button onClick={() => setShowNewInterviewModal(true)} className="btn-primary text-xs py-1.5"><Plus size={14} /> Neu erstellen</button>
                </div>
                {hubInterviews.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-text-muted text-sm mb-3">Keine Interview-Partner vorhanden.</p>
                    <button onClick={() => setShowNewInterviewModal(true)} className="btn-primary text-xs"><Plus size={14} /> Ersten Partner erstellen</button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {hubInterviews.map(partner => (
                      <div key={partner.id} className="flex items-center justify-between p-3 bg-obsidian-800 rounded-lg border border-surface-border hover:border-accent-cyan/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{partner.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {partner.company && <span className="text-[10px] text-text-muted">{partner.company}</span>}
                            {partner.role && <span className="text-[10px] text-accent-cyan">{partner.role}</span>}
                            <span className="text-[10px] text-text-muted">{partner.questionCount || 0} Fragen</span>
                            {partner.approvedCount > 0 && <span className="text-[10px] text-accent-green">{partner.approvedCount} freigegeben</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setSelectedInterview(partner); setShowInterviewModal(true); }} className="btn-ghost text-xs py-1 px-2" title="Details">
                            <Info size={12} />
                          </button>
                          <button onClick={() => handleAddInterviewBlock(partner)} className="btn-primary text-xs py-1 px-2" title="Als Interview-Block einplanen">
                            <Plus size={12} /> Block
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Zusammenfassung</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Blöcke</span>
                <span className="text-text-primary">{blocks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Dauer</span>
                <span className="text-accent-blue font-medium">{formatTime(totalDuration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Werbeplätze</span>
                <span className="text-accent-orange">{adBookings.length}</span>
              </div>
            </div>
          </div>
          
          <div className="card bg-accent-purple/5 border-accent-purple/20">
            <h3 className="text-sm font-bold text-accent-purple uppercase mb-2">Checkliste</h3>
            <div className="space-y-2">
              {[
                { label: 'Titel gesetzt', done: !!form.title },
                { label: 'Script fertig', done: blocks.length > 0 && blocks.every(b => b.type === 'interview_questions' ? (b.questions || []).length > 0 : !!b.content) },
                { label: 'Show-Notes', done: !!showNotes, hint: 'Show-Notes Tab' },
                { label: 'Beschreibung', done: !!form.description },
                { label: 'Technik-Daten', done: Object.values(technicalData).some(v => v) },
                { label: 'Veröffentlichungsdatum', done: !!form.publishDate },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {item.done ? <CheckCircle size={14} className="text-accent-green" /> : <Circle size={14} className="text-text-muted" />}
                  <span className={item.done ? 'text-text-primary' : 'text-text-muted'}>{item.label}</span>
                  {!item.done && (item as any).hint && <span className="text-[10px] text-text-muted ml-auto opacity-60">{(item as any).hint}</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Sonderfolge-Hinweis */}
          {altDuration && (
            <div className="card border-accent-orange/30 bg-accent-orange/5">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-accent-orange" />
                <div>
                  <p className="text-xs font-medium text-accent-orange">Sonderfolge</p>
                  <p className="text-[10px] text-text-muted">Ziel-Länge: {altDuration} min</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Episoden-Freigabe Widget ──────────────────────── */}
          {(() => {
            const approvalStatus = episode?.approvalStatus || 'ausstehend';
            const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
              'ausstehend': { label: 'Ausstehend', color: 'text-text-muted', bg: 'bg-surface-overlay', border: 'border-surface-border', icon: <Circle size={14} className="text-text-muted" /> },
              'angefragt':  { label: 'Freigabe angefragt', color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/30', icon: <Clock size={14} className="text-accent-orange" /> },
              'freigegeben': { label: 'Freigegeben', color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/30', icon: <CheckCircle size={14} className="text-accent-green" /> },
              'abgelehnt':  { label: 'Zur Überarbeitung', color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/30', icon: <X size={14} className="text-accent-red" /> },
            };
            const cfg = statusConfig[approvalStatus] || statusConfig['ausstehend'];
            return (
              <div className={`card ${cfg.border} ${cfg.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold uppercase tracking-wide ${cfg.color}`}>Freigabe</h3>
                  {cfg.icon}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Freigabe-Notiz anzeigen */}
                {episode?.approvalNotes && (
                  <div className="mb-3 p-2 bg-obsidian-900 rounded-lg border border-surface-border">
                    <p className="text-[10px] text-text-muted mb-0.5">Notiz:</p>
                    <p className="text-xs text-text-primary">{episode.approvalNotes}</p>
                  </div>
                )}

                {/* Angefragt-Info */}
                {approvalStatus === 'angefragt' && episode?.approvalRequestedAt && (
                  <p className="text-[10px] text-text-muted mb-3">
                    Angefragt: {new Date(episode.approvalRequestedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Freigegeben-Info */}
                {approvalStatus === 'freigegeben' && episode?.approvedAt && (
                  <p className="text-[10px] text-text-muted mb-3">
                    Freigegeben: {new Date(episode.approvedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Aktions-Buttons */}
                <div className="space-y-2">
                  {/* Freigabe anfordern (Redakteur/Moderator) */}
                  {workflowEnabled && can('canRequestApproval') && approvalStatus === 'ausstehend' && (
                    <button
                      onClick={() => { setApprovalAction('request'); setApprovalNotes(''); setShowApprovalModal(true); }}
                      className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5 border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10"
                    >
                      <UserCheck size={13} /> Freigabe anfordern
                    </button>
                  )}

                  {/* Freigabe erteilen (Admin/Moderator mit Berechtigung) */}
                  {can('canApproveEpisodes') && (approvalStatus === 'angefragt' || approvalStatus === 'ausstehend') && (
                    <button
                      onClick={() => { setApprovalAction('approve'); setApprovalNotes(''); setShowApprovalModal(true); }}
                      className="w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1.5 bg-accent-green hover:bg-accent-green/80 border-accent-green"
                    >
                      <CheckCircle size={13} /> Episode freigeben
                    </button>
                  )}

                  {/* Ablehnen (Admin/Moderator mit Berechtigung) */}
                  {can('canApproveEpisodes') && approvalStatus === 'angefragt' && (
                    <button
                      onClick={() => { setApprovalAction('reject'); setApprovalNotes(''); setShowApprovalModal(true); }}
                      className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5 border-accent-red/40 text-accent-red hover:bg-accent-red/10"
                    >
                      <X size={13} /> Zur Überarbeitung
                    </button>
                  )}

                  {/* Freigabe zurücksetzen (Admin oder wer bearbeiten darf) */}
                  {(can('canApproveEpisodes') || can('canEditEpisodes')) && (approvalStatus === 'freigegeben' || approvalStatus === 'abgelehnt') && (
                    <button
                      onClick={handleResetApproval}
                      className="w-full btn-ghost text-xs py-1.5 flex items-center justify-center gap-1.5 text-text-muted hover:text-text-primary"
                    >
                      <RotateCcw size={12} /> Freigabe zurücksetzen
                    </button>
                  )}

                  {/* Workflow deaktiviert – Hinweis */}
                  {!workflowEnabled && (
                    <p className="text-[10px] text-text-muted text-center">
                      Freigabe-Workflow ist in den Einstellungen deaktiviert.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Media Picker Modal */}
      <Modal isOpen={showMediaModal} onClose={() => setShowMediaModal(false)} title="Media Library" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              value={mediaSearch} 
              onChange={e => setMediaSearch(e.target.value)} 
              className="input pl-10" 
              placeholder="Audio-Dateien suchen..." 
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {mediaList.map(asset => (
              <button 
                key={asset.id} 
                onClick={() => selectMedia(asset)}
                className="w-full flex items-center justify-between p-3 bg-obsidian-800 hover:bg-obsidian-700 rounded-lg border border-surface-border transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{asset.name}</p>
                  <p className="text-[10px] text-text-muted uppercase">
                    {asset.type}
                    {asset.filesize ? ` · ${(asset.filesize / 1024 / 1024).toFixed(2)} MB` : ''}
                    {asset.duration ? ` · ${Math.floor(asset.duration / 60)}:${String(Math.round(asset.duration % 60)).padStart(2, '0')} min` : ''}
                  </p>
                </div>
                <Plus size={16} className="text-accent-purple" />
              </button>
            ))}
            {mediaList.length === 0 && <p className="text-center py-8 text-text-muted">Keine Dateien gefunden.</p>}
          </div>
        </div>
      </Modal>

      {/* Ad Booking Modal */}
      <Modal isOpen={showAdBookingModal} onClose={() => setShowAdBookingModal(false)} title="Werbung buchen">
        <div className="space-y-4">

          {/* Modus-Auswahl */}
          <div className="flex gap-2 p-1 bg-obsidian-900 rounded-lg">
            <button
              onClick={() => setAdBookingMode('slot')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                adBookingMode === 'slot' ? 'bg-accent-orange text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >Gebuchter Werbeplatz</button>
            <button
              onClick={() => setAdBookingMode('special')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                adBookingMode === 'special' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >Sonderbuchung</button>
          </div>

          {/* Positions-Auswahl (beide Modi) */}
          <div>
            <label className="label">Position im Script</label>
            <div className="grid grid-cols-3 gap-2">
              {[{v:'pre-roll',l:'Pre-Roll',desc:'Vor dem Intro'},{v:'mid-roll',l:'Mid-Roll',desc:'In der Mitte'},{v:'post-roll',l:'Post-Roll',desc:'Nach dem Outro'}].map(pos => (
                <button
                  key={pos.v}
                  onClick={() => {
                    setAdBookingForm((f: any) => ({...f, position: pos.v}));
                    setSpecialBookingForm((f: any) => ({...f, position: pos.v}));
                  }}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    (adBookingMode === 'slot' ? adBookingForm.position : specialBookingForm.position) === pos.v
                      ? 'border-accent-orange bg-accent-orange/20 text-accent-orange'
                      : 'border-surface-border bg-obsidian-800 text-text-muted hover:border-accent-orange/50'
                  }`}
                >
                  <p className="text-xs font-bold">{pos.l}</p>
                  <p className="text-[10px] opacity-70">{pos.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Zeitposition */}
          <div>
            <label className="label flex items-center gap-1"><Timer size={12} /> Zeitposition in der Folge (optional)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="z.B. 5:30 oder 330 (Sekunden)"
                  value={adBookingMode === 'slot' ? adBookingForm.timePosition : specialBookingForm.timePosition}
                  onChange={e => {
                    const val = e.target.value;
                    if (adBookingMode === 'slot') setAdBookingForm((f: any) => ({...f, timePosition: val}));
                    else setSpecialBookingForm((f: any) => ({...f, timePosition: val}));
                  }}
                  className="input text-sm"
                />
              </div>
              {totalDuration > 0 && (
                <span className="text-[10px] text-text-muted whitespace-nowrap">Folge: {formatTime(totalDuration)}</span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-1">Format: MM:SS (z.B. 5:30) oder Sekunden (z.B. 330). Wird in der Timeline-Ansicht visualisiert.</p>
          </div>

          {/* MODUS: Gebuchter Werbeplatz */}
          {adBookingMode === 'slot' && (
            <div className="space-y-2">
              <label className="label">Verfügbare Werbeplätze ({availableSlots.length})</label>
              {availableSlots.length === 0 ? (
                <div className="text-center py-6 bg-obsidian-900 rounded-lg border border-surface-border">
                  <p className="text-text-muted text-xs mb-2">Keine passenden Werbeplätze verfügbar.</p>
                  <p className="text-text-muted text-[10px]">Tipp: Prüfe ob der Sponsor eine aktive Vertragslaufzeit hat, die das Episodendatum abdeckt. Oder nutze eine Sonderbuchung.</p>
                </div>
              ) : (
                availableSlots.map(slot => (
                  <button
                    key={slot.id}
                    className="w-full p-3 bg-obsidian-800 hover:bg-obsidian-700 rounded-lg border border-surface-border text-left transition-colors"
                    onClick={async () => {
                      try {
                        // Parse timePosition: MM:SS or seconds
                        let timePosSeconds: number | null = null;
                        const tp = adBookingForm.timePosition?.trim();
                        if (tp) {
                          if (tp.includes(':')) {
                            const [mm, ss] = tp.split(':').map(Number);
                            timePosSeconds = (mm || 0) * 60 + (ss || 0);
                          } else {
                            timePosSeconds = parseInt(tp) || null;
                          }
                        }
                        await sponsorsApi.createEpisodeBooking({
                          episodeId: id,
                          adSlotId: slot.id,
                          sponsorId: slot.sponsor_id,
                          adCategoryId: slot.category_id,
                          position: adBookingForm.position || slot.default_position || 'mid-roll',
                          timePosition: timePosSeconds
                        });
                        showSuccess(`${slot.sponsor_name} als ${adBookingForm.position || 'mid-roll'} gebucht`);
                        setShowAdBookingModal(false);
                        setAdBookingForm({ adSlotId: '', sponsorId: '', position: 'mid-roll', scriptText: '', presentationText: '', duration: '', confirmed: false, timePosition: '' });
                        loadAdBookings();
                      } catch (err: any) { showError(err.message); }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{slot.sponsor_name}</p>
                        <p className="text-xs text-text-muted">{slot.name} · {slot.category_name || '—'}</p>
                        {(slot.price_per_episode || slot.base_price) && (
                          <p className="text-xs text-accent-green mt-0.5">{slot.price_per_episode || slot.base_price} €</p>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-accent-orange/20 text-accent-orange border border-accent-orange/30">
                        {adBookingForm.position || slot.default_position || 'mid-roll'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* MODUS: Sonderbuchung */}
          {adBookingMode === 'special' && (
            <div className="space-y-3">
              <div className="p-3 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
                <p className="text-xs text-accent-purple font-medium">Sonderbuchung</p>
                <p className="text-[10px] text-text-muted mt-1">Eine Sonderbuchung erstellt direkt eine Buchung ohne vorherigen Werbeplatz – z.B. für spontane Kooperationen.</p>
              </div>

              <div>
                <label className="label">Sponsor *</label>
                <select
                  value={specialBookingForm.sponsorId}
                  onChange={e => setSpecialBookingForm((f: any) => ({...f, sponsorId: e.target.value}))}
                  className="select w-full"
                >
                  <option value="">Sponsor auswählen...</option>
                  {allSponsors.map((sp: any) => (
                    <option key={sp.id} value={sp.id}>{sp.name}{sp.company ? ` (${sp.company})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Werbekategorie</label>
                <select
                  value={specialBookingForm.adCategoryId}
                  onChange={e => setSpecialBookingForm((f: any) => ({...f, adCategoryId: e.target.value}))}
                  className="select w-full"
                >
                  <option value="">Keine Kategorie</option>
                  {adCategories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}{cat.price_per_episode ? ` – ${cat.price_per_episode} €` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Interne Notiz</label>
                <input
                  type="text"
                  value={specialBookingForm.note}
                  onChange={e => setSpecialBookingForm((f: any) => ({...f, note: e.target.value}))}
                  placeholder="z.B. Spontane Kooperation, Tauschgeschäft..."
                  className="input w-full"
                />
              </div>

              <button
                disabled={!specialBookingForm.sponsorId}
                onClick={async () => {
                  if (!specialBookingForm.sponsorId) return;
                  try {
                    // Parse timePosition: MM:SS or seconds
                    let timePosSecondsSp: number | null = null;
                    const tpSp = specialBookingForm.timePosition?.trim();
                    if (tpSp) {
                      if (tpSp.includes(':')) {
                        const [mm, ss] = tpSp.split(':').map(Number);
                        timePosSecondsSp = (mm || 0) * 60 + (ss || 0);
                      } else {
                        timePosSecondsSp = parseInt(tpSp) || null;
                      }
                    }
                    await sponsorsApi.createSpecialBooking({
                      episodeId: id,
                      sponsorId: specialBookingForm.sponsorId,
                      adCategoryId: specialBookingForm.adCategoryId || null,
                      position: specialBookingForm.position,
                      note: specialBookingForm.note,
                      timePosition: timePosSecondsSp,
                    });
                    showSuccess('Sonderbuchung erstellt');
                    setShowAdBookingModal(false);
                    setSpecialBookingForm({ sponsorId: '', adCategoryId: '', position: 'mid-roll', scriptText: '', note: '', timePosition: '' });
                    loadAdBookings();
                  } catch (err: any) { showError(err.message); }
                }}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonderbuchung erstellen
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Idee übernehmen Modal */}
      {showIdeaImportModal && selectedHubIdea && (
        <IdeaImportModal
          idea={selectedHubIdea}
          onClose={() => setShowIdeaImportModal(false)}
          onApply={handleApplyIdeaToEpisode}
        />
      )}

      {/* Interview-Partner Detail Modal */}
      <Modal isOpen={showInterviewModal} onClose={() => setShowInterviewModal(false)} title={selectedInterview?.name || 'Interview-Partner'} size="lg">
        {selectedInterview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {selectedInterview.company && <div><p className="text-xs text-text-muted">Unternehmen</p><p className="text-sm text-text-primary">{selectedInterview.company}</p></div>}
              {selectedInterview.role && <div><p className="text-xs text-text-muted">Rolle</p><p className="text-sm text-text-primary">{selectedInterview.role}</p></div>}
              {selectedInterview.email && <div><p className="text-xs text-text-muted">E-Mail</p><p className="text-sm text-text-primary">{selectedInterview.email}</p></div>}
            </div>
            {selectedInterview.guestIntro && <div><p className="text-xs text-text-muted mb-1">Gäste-Intro</p><p className="text-sm text-text-primary bg-obsidian-800 p-3 rounded-lg">{selectedInterview.guestIntro}</p></div>}
            {selectedInterview.bio && <div><p className="text-xs text-text-muted mb-1">Bio</p><p className="text-sm text-text-primary bg-obsidian-800 p-3 rounded-lg">{selectedInterview.bio}</p></div>}
            {(selectedInterview.allQuestions?.length > 0) && (
              <div>
                <p className="text-xs text-text-muted mb-2">Fragen ({selectedInterview.allQuestions.length})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedInterview.allQuestions.map((q: any, i: number) => (
                    <div key={q.id || i} className="flex items-start gap-2 p-2 bg-obsidian-800 rounded">
                      {q.approved ? <CheckCircle size={12} className="text-accent-green mt-0.5 flex-shrink-0" /> : <Circle size={12} className="text-text-muted mt-0.5 flex-shrink-0" />}
                      <p className="text-xs text-text-primary">{q.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { handleAddInterviewBlock(selectedInterview); setShowInterviewModal(false); }} className="btn-primary w-full">
              <Plus size={14} /> Als Interview-Block einplanen
            </button>
          </div>
        )}
      </Modal>

      {/* ── Freigabe-Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={
          approvalAction === 'request' ? 'Freigabe anfordern'
          : approvalAction === 'approve' ? 'Episode freigeben'
          : 'Zur Überarbeitung senden'
        }
      >
        <div className="space-y-4">
          {/* Status-Icon */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            approvalAction === 'approve' ? 'bg-accent-green/10 border-accent-green/30'
            : approvalAction === 'reject' ? 'bg-accent-red/10 border-accent-red/30'
            : 'bg-accent-orange/10 border-accent-orange/30'
          }`}>
            {approvalAction === 'approve'
              ? <CheckCircle size={20} className="text-accent-green flex-shrink-0" />
              : approvalAction === 'reject'
              ? <X size={20} className="text-accent-red flex-shrink-0" />
              : <UserCheck size={20} className="text-accent-orange flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${
                approvalAction === 'approve' ? 'text-accent-green'
                : approvalAction === 'reject' ? 'text-accent-red'
                : 'text-accent-orange'
              }`}>
                {approvalAction === 'request' ? 'Freigabe anfordern'
                 : approvalAction === 'approve' ? 'Episode freigeben'
                 : 'Zur Überarbeitung senden'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {approvalAction === 'request'
                  ? 'Die Episode wird zur Prüfung eingereicht. Berechtigte Nutzer werden benachrichtigt.'
                  : approvalAction === 'approve'
                  ? 'Die Episode wird als freigegeben markiert und kann veröffentlicht werden.'
                  : 'Die Episode wird zur Überarbeitung zurückgegeben.'}
              </p>
            </div>
          </div>

          {/* Episode-Info */}
          <div className="p-3 bg-obsidian-800 rounded-xl border border-surface-border">
            <p className="text-xs text-text-muted mb-1">Episode</p>
            <p className="text-sm font-semibold text-text-primary">{form.title || 'Unbenannte Episode'}</p>
            {form.number && <p className="text-xs text-text-muted">#{form.number}</p>}
          </div>

          {/* Notiz */}
          <div>
            <label className="label">
              {approvalAction === 'reject' ? 'Begründung / Hinweise für die Überarbeitung' : 'Optionale Notiz'}
              {approvalAction === 'reject' && <span className="text-accent-red ml-1">*</span>}
            </label>
            <textarea
              value={approvalNotes}
              onChange={e => setApprovalNotes(e.target.value)}
              className="textarea"
              rows={3}
              placeholder={
                approvalAction === 'request' ? 'Optionale Notiz für den Prüfer...'
                : approvalAction === 'approve' ? 'Optionale Freigabe-Notiz...'
                : 'Was muss überarbeitet werden?'
              }
            />
          </div>

          {/* Aktions-Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowApprovalModal(false)} className="btn-ghost flex-1">Abbrechen</button>
            <button
              onClick={handleApprovalAction}
              disabled={approvalAction === 'reject' && !approvalNotes.trim()}
              className={`flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2 ${
                approvalAction === 'approve' ? 'bg-accent-green hover:bg-accent-green/80 border-accent-green'
                : approvalAction === 'reject' ? 'bg-accent-red hover:bg-accent-red/80 border-accent-red'
                : ''
              }`}
            >
              {approvalAction === 'approve' ? <><CheckCircle size={15} /> Freigeben</>
               : approvalAction === 'reject' ? <><X size={15} /> Zur Überarbeitung</>
               : <><UserCheck size={15} /> Freigabe anfordern</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* v2.12.0 Buchungsmodal */}
      <Modal isOpen={showV2BookingModal} onClose={() => setShowV2BookingModal(false)} title="Neue v2-Buchung erstellen">
        <div className="space-y-4">
          <div className="p-3 bg-purple-900/20 border border-purple-700/40 rounded-lg">
            <p className="text-xs text-purple-400 font-medium">Buchung im neuen Sponsoring-System (v2.12.0)</p>
            <p className="text-[10px] text-text-muted mt-1">Erstellt eine Buchung direkt in der neuen <code>ad_bookings</code>-Tabelle, verknüpft mit einem Sponsor-Slot.</p>
          </div>
          <div>
            <label className="label">Werbeplatz (Slot) *</label>
            <select
              value={v2BookingForm.slotId}
              onChange={e => setV2BookingForm((f: any) => ({...f, slotId: e.target.value}))}
              className="select w-full"
            >
              <option value="">Slot auswählen...</option>
              {v2SponsorSlots.map((s: any) => (
                <option key={s.id} value={s.id}>{s.sponsorName} – {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Preis (€)</label>
            <input
              type="number"
              step="0.01"
              value={v2BookingForm.price}
              onChange={e => setV2BookingForm((f: any) => ({...f, price: e.target.value}))}
              placeholder="z.B. 250.00"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea
              value={v2BookingForm.notes}
              onChange={e => setV2BookingForm((f: any) => ({...f, notes: e.target.value}))}
              placeholder="Interne Notizen zur Buchung..."
              className="input w-full"
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowV2BookingModal(false)} className="btn-ghost flex-1">Abbrechen</button>
            <button
              disabled={!v2BookingForm.slotId}
              onClick={async () => {
                if (!v2BookingForm.slotId) return;
                const slot = v2SponsorSlots.find((s: any) => s.id === v2BookingForm.slotId);
                if (!slot) return;
                try {
                  const today = new Date().toISOString().split('T')[0];
                  await sponsorsV2Api.createBooking(slot.sponsorId, {
                    slotId: v2BookingForm.slotId,
                    episodeId: id,
                    bookingDate: today,
                    price: parseFloat(v2BookingForm.price) || 0,
                    notes: v2BookingForm.notes,
                  });
                  showSuccess('Buchung erstellt');
                  setShowV2BookingModal(false);
                  loadV2Bookings();
                } catch (e: any) { showError(e.message); }
              }}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Buchung erstellen
            </button>
          </div>
        </div>
      </Modal>

      {/* Neuen Interview-Partner erstellen Modal */}
      <Modal isOpen={showNewInterviewModal} onClose={() => setShowNewInterviewModal(false)} title="Interview-Partner erstellen">
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={newInterviewForm.name} onChange={e => setNewInterviewForm(p => ({ ...p, name: e.target.value }))} placeholder="Name des Gastes" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Unternehmen</label><input className="input" value={newInterviewForm.company} onChange={e => setNewInterviewForm(p => ({ ...p, company: e.target.value }))} /></div>
            <div><label className="label">Rolle / Position</label><input className="input" value={newInterviewForm.role} onChange={e => setNewInterviewForm(p => ({ ...p, role: e.target.value }))} /></div>
          </div>
          <div><label className="label">E-Mail</label><input className="input" type="email" value={newInterviewForm.email} onChange={e => setNewInterviewForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div><label className="label">Gäste-Intro (für Moderation)</label><textarea className="input" rows={2} value={newInterviewForm.guestIntro} onChange={e => setNewInterviewForm(p => ({ ...p, guestIntro: e.target.value }))} placeholder="Kurze Vorstellung für die Moderation..." /></div>
          <div><label className="label">Bio</label><textarea className="input" rows={2} value={newInterviewForm.bio} onChange={e => setNewInterviewForm(p => ({ ...p, bio: e.target.value }))} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowNewInterviewModal(false)} className="btn-ghost flex-1">Abbrechen</button>
            <button onClick={handleCreateInterviewPartner} disabled={!newInterviewForm.name.trim()} className="btn-primary flex-1 disabled:opacity-50">Erstellen</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
