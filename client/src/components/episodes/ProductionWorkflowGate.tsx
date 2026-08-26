import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardCheck, Download, FileCheck2, Headphones, Mic2, Plus, Radio, Scale, Send, Trash2, Users } from 'lucide-react';

type CheckState = Record<string, boolean>;

type RightsEntry = {
  id: string;
  asset: string;
  owner: string;
  usage: string;
  expiresAt: string;
  evidence: string;
  verified: boolean;
};

type HandoffEntry = {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  acceptance: string;
  done: boolean;
};

type WorkflowData = {
  studioProfile: string;
  recordingChecks: CheckState;
  recordingNotes: string;
  audioChecks: CheckState;
  audioVersion: string;
  audioAssignee: string;
  audioNotes: string;
  releaseChecks: CheckState;
  releaseTitle: string;
  releaseDescription: string;
  promotionCopy: string;
  hostingStatus: string;
  rights: RightsEntry[];
  handoffs: HandoffEntry[];
};

const RECORDING_CHECKS = [
  ['microphone', 'Mikrofon, Interface und Kopfhörer verbunden'],
  ['room', 'Raum, Pegel und Störgeräusche geprüft'],
  ['storage', 'Ausreichend lokaler Speicher und Aufnahmeziel geprüft'],
  ['test', 'Testaufnahme angehört und verständlich bestätigt'],
  ['guest', 'Gastverbindung und Gesprächsunterlagen bereit'],
  ['consent', 'Einverständnisse und nötige Genehmigungen geklärt'],
] as const;

const AUDIO_CHECKS = [
  ['edit', 'Schnitt und Regieanweisungen umgesetzt'],
  ['noise', 'Störgeräusche, Schnitte und Übergänge geprüft'],
  ['loudness', 'Lautheit und Klangbild geprüft'],
  ['chapters', 'Kapitel, Marker und Zeitangaben geprüft'],
  ['music', 'Intro, Outro und Musikrechte geprüft'],
  ['finalFile', 'Finale Audiodatei und Version bestätigt'],
] as const;

const RELEASE_CHECKS = [
  ['metadata', 'Titel, Kurzbeschreibung und Kategorie final'],
  ['shownotes', 'Show Notes, Quellen und Links final'],
  ['artwork', 'Artwork und Episodenbild verfügbar'],
  ['hosting', 'Podcast-Host oder Veröffentlichungsweg vorbereitet'],
  ['promotion', 'Promotiontexte und Call-to-Action vorbereitet'],
  ['rights', 'Alle erforderlichen Rechte-Einträge verifiziert'],
] as const;

const defaultWorkflow = (): WorkflowData => ({
  studioProfile: '', recordingChecks: {}, recordingNotes: '', audioChecks: {}, audioVersion: '', audioAssignee: '', audioNotes: '',
  releaseChecks: {}, releaseTitle: '', releaseDescription: '', promotionCopy: '', hostingStatus: 'offen', rights: [], handoffs: [],
});

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function parseWorkflow(value: string): WorkflowData {
  if (!value) return defaultWorkflow();
  try {
    const parsed = JSON.parse(value);
    return {
      ...defaultWorkflow(),
      ...parsed,
      recordingChecks: parsed?.recordingChecks || {}, audioChecks: parsed?.audioChecks || {}, releaseChecks: parsed?.releaseChecks || {},
      rights: Array.isArray(parsed?.rights) ? parsed.rights : [], handoffs: Array.isArray(parsed?.handoffs) ? parsed.handoffs : [],
    };
  } catch { return defaultWorkflow(); }
}

function GateProgress({ checks }: { checks: CheckState }) {
  const values = Object.values(checks);
  const complete = values.filter(Boolean).length;
  const total = Math.max(values.length, 1);
  return <span className="rounded-full bg-obsidian-800 px-2 py-1 text-[10px] font-semibold text-text-secondary">{complete}/{total} bestätigt</span>;
}

function CheckList({ checks, definitions, disabled, onChange }: { checks: CheckState; definitions: readonly (readonly [string, string])[]; disabled: boolean; onChange: (next: CheckState) => void }) {
  return <div className="space-y-2">{definitions.map(([key, label]) => {
    const checked = Boolean(checks[key]);
    return <label key={key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-accent-green/35 bg-accent-green/5 text-text-primary' : 'border-surface-border bg-obsidian-900 text-text-secondary'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange({ ...checks, [key]: event.target.checked })} className="mt-0.5 accent-accent-green" />
      <span className="flex-1">{label}</span>{checked ? <CheckCircle2 size={16} className="shrink-0 text-accent-green" /> : <Circle size={16} className="shrink-0 text-text-muted" />}
    </label>;
  })}</div>;
}

export default function ProductionWorkflowGate({ value, disabled, episode, onChange, onNotify }: { value: string; disabled: boolean; episode: { id?: string; title?: string; number?: string | number; publishDate?: string; description?: string; showNotes?: string }; onChange: (value: string) => void; onNotify?: (message: string) => void }) {
  const [data, setData] = useState<WorkflowData>(() => parseWorkflow(value));

  useEffect(() => { setData(parseWorkflow(value)); }, [value]);

  const update = (changes: Partial<WorkflowData>) => {
    const next = { ...data, ...changes };
    setData(next);
    onChange(JSON.stringify(next));
  };

  const recordingProgress = useMemo(() => ({ ...Object.fromEntries(RECORDING_CHECKS.map(([key]) => [key, Boolean(data.recordingChecks[key])])) }), [data.recordingChecks]);
  const audioProgress = useMemo(() => ({ ...Object.fromEntries(AUDIO_CHECKS.map(([key]) => [key, Boolean(data.audioChecks[key])])) }), [data.audioChecks]);
  const releaseProgress = useMemo(() => ({ ...Object.fromEntries(RELEASE_CHECKS.map(([key]) => [key, Boolean(data.releaseChecks[key])])) }), [data.releaseChecks]);

  const exportHandoff = () => {
    const payload = {
      format: 'PodCore Produktions- und Übergabepaket', generatedAt: new Date().toISOString(), episode,
      workflow: { ...data, recordingReady: Object.values(recordingProgress).every(Boolean), audioApproved: Object.values(audioProgress).every(Boolean), releaseReady: Object.values(releaseProgress).every(Boolean) },
    };
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `PodCore-Uebergabepaket-${String(episode.number || episode.title || 'Episode').replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-+|-+$/g, '')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onNotify?.('Produktions- und Übergabepaket exportiert');
  };

  const exportReleasePackage = () => {
    const rights = data.rights.length
      ? data.rights.map((entry) => `| ${entry.asset || '—'} | ${entry.owner || '—'} | ${entry.usage || '—'} | ${entry.expiresAt || '—'} | ${entry.verified ? 'geprüft' : 'offen'} |`).join('\n')
      : '| — | — | — | — | keine Einträge |';
    const markdown = [
      `# Release-Paket: ${data.releaseTitle || episode.title || 'Episode'}`,
      '',
      `- **Folge:** ${episode.number || '—'}`,
      `- **Veröffentlichung:** ${episode.publishDate || '—'}`,
      `- **Hosting-Status:** ${data.hostingStatus || 'offen'}`,
      `- **Audio-Version:** ${data.audioVersion || '—'}`,
      '',
      '## Kurzbeschreibung', '', data.releaseDescription || episode.description || '—', '',
      '## Show Notes', '', episode.showNotes || '—', '',
      '## Promotion', '', data.promotionCopy || '—', '',
      '## Rechte-Übersicht', '', '| Asset / Inhalt | Rechteinhaber | Nutzungsumfang | Ablauf | Status |', '|---|---|---|---|---|', rights, '',
      '## Offene Übergaben', '', ...(data.handoffs.length ? data.handoffs.map((entry) => `- [${entry.done ? 'x' : ' '}] **${entry.task || 'Aufgabe'}** · zuständig: ${entry.assignee || '—'} · fällig: ${entry.dueDate || '—'} · Abnahme: ${entry.acceptance || '—'}`) : ['- Keine externe Übergabe hinterlegt.']), '',
      `Erstellt mit PodCore am ${new Date().toLocaleString('de-DE')}.`,
    ].join('\n');
    const file = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `PodCore-Release-Paket-${String(episode.number || episode.title || 'Episode').replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-+|-+$/g, '')}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    onNotify?.('Release-Paket exportiert');
  };

  return <div className="space-y-5">
    <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="flex items-center gap-2 font-semibold text-text-primary"><ClipboardCheck size={18} className="text-accent-purple" /> Produktionsgates</h2><p className="mt-1 text-xs text-text-muted">Verbindliche Kontrollpunkte für Aufnahme, Schnitt, Rechte, Veröffentlichung und externe Übergaben. Alles wird mit der Episode gespeichert.</p></div><button type="button" onClick={exportHandoff} className="btn-secondary text-xs" disabled={disabled}><Download size={14} /> Übergabepaket exportieren</button></div>
    </div>

    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Mic2 size={18} className="text-accent-orange" /><h3 className="font-semibold text-text-primary">1. Aufnahmebereitschaft</h3></div><GateProgress checks={recordingProgress} /></div>
      <div><label className="label">Studio- / Aufnahmeprofil</label><input value={data.studioProfile} disabled={disabled} onChange={event => update({ studioProfile: event.target.value })} placeholder="z.B. Studio A · Interview remote · Standard 48 kHz" className="input" /></div>
      <CheckList checks={data.recordingChecks} definitions={RECORDING_CHECKS} disabled={disabled} onChange={recordingChecks => update({ recordingChecks })} />
      <div><label className="label">Aufnahmenotiz</label><textarea value={data.recordingNotes} disabled={disabled} onChange={event => update({ recordingNotes: event.target.value })} rows={3} className="input" placeholder="Besonderheiten zum Raum, Gast, Pegel oder Ablauf …" /></div>
    </section>

    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Headphones size={18} className="text-accent-cyan" /><h3 className="font-semibold text-text-primary">2. Audio-Abnahme</h3></div><GateProgress checks={audioProgress} /></div>
      <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Finale Audio-Version</label><input value={data.audioVersion} disabled={disabled} onChange={event => update({ audioVersion: event.target.value })} className="input" placeholder="z.B. v03 / Master vom 26.08." /></div><div><label className="label">Schnitt / Abnahme durch</label><input value={data.audioAssignee} disabled={disabled} onChange={event => update({ audioAssignee: event.target.value })} className="input" placeholder="Name oder Rolle" /></div></div>
      <CheckList checks={data.audioChecks} definitions={AUDIO_CHECKS} disabled={disabled} onChange={audioChecks => update({ audioChecks })} />
      <div><label className="label">Abnahmenotiz</label><textarea value={data.audioNotes} disabled={disabled} onChange={event => update({ audioNotes: event.target.value })} rows={3} className="input" placeholder="Offene Punkte, Abweichungen oder Hinweise für die finale Datei …" /></div>
    </section>

    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Radio size={18} className="text-accent-green" /><h3 className="font-semibold text-text-primary">3. Release-Paket</h3></div><div className="flex items-center gap-2"><GateProgress checks={releaseProgress} /><button type="button" onClick={exportReleasePackage} className="btn-secondary text-xs" disabled={disabled}><Download size={14} /> Release-Paket</button></div></div>
      <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Release-Titel</label><input value={data.releaseTitle} disabled={disabled} onChange={event => update({ releaseTitle: event.target.value })} className="input" placeholder={episode.title || 'Episodentitel'} /></div><div><label className="label">Hosting-Status</label><select value={data.hostingStatus} disabled={disabled} onChange={event => update({ hostingStatus: event.target.value })} className="input"><option value="offen">Offen</option><option value="vorbereitet">Vorbereitet</option><option value="geplant">Geplant</option><option value="veroeffentlicht">Veröffentlicht</option></select></div></div>
      <div><label className="label">Kurzbeschreibung / Teaser</label><textarea value={data.releaseDescription} disabled={disabled} onChange={event => update({ releaseDescription: event.target.value })} rows={3} className="input" placeholder={episode.description || 'Kurze Beschreibung für den Podcast-Host …'} /></div>
      <div><label className="label">Promotion-Text</label><textarea value={data.promotionCopy} disabled={disabled} onChange={event => update({ promotionCopy: event.target.value })} rows={3} className="input" placeholder="Kopierfertiger Text für Website, Newsletter oder Social Media …" /></div>
      <CheckList checks={data.releaseChecks} definitions={RELEASE_CHECKS} disabled={disabled} onChange={releaseChecks => update({ releaseChecks })} />
    </section>

    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Scale size={18} className="text-accent-yellow" /><h3 className="font-semibold text-text-primary">4. Rechte-Register</h3></div><button type="button" disabled={disabled} onClick={() => update({ rights: [...data.rights, { id: createId('right'), asset: '', owner: '', usage: '', expiresAt: '', evidence: '', verified: false }] })} className="btn-secondary text-xs"><Plus size={14} /> Recht hinzufügen</button></div>
      {data.rights.length === 0 ? <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-text-muted">Noch keine Rechte-Einträge. Erfasse hier z.B. Musik, Jingles, Stockmaterial, Zitate oder Gästefreigaben.</p> : <div className="space-y-3">{data.rights.map((entry, index) => <div key={entry.id} className="rounded-lg border border-surface-border bg-obsidian-900 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-text-secondary">Recht {index + 1}</span><button type="button" disabled={disabled} onClick={() => update({ rights: data.rights.filter(item => item.id !== entry.id) })} className="text-text-muted hover:text-accent-red"><Trash2 size={15} /></button></div><div className="grid gap-3 md:grid-cols-2">{([['asset','Asset / Inhalt'],['owner','Rechteinhaber'],['usage','Nutzungsumfang'],['expiresAt','Ablaufdatum'],['evidence','Nachweis / Link']] as const).map(([field,label]) => <div key={field}><label className="label">{label}</label><input type={field === 'expiresAt' ? 'date' : 'text'} value={entry[field]} disabled={disabled} onChange={event => update({ rights: data.rights.map(item => item.id === entry.id ? { ...item, [field]: event.target.value } : item) })} className="input" /></div>)}</div><label className="mt-3 flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={entry.verified} disabled={disabled} onChange={event => update({ rights: data.rights.map(item => item.id === entry.id ? { ...item, verified: event.target.checked } : item) })} className="accent-accent-green" /> Rechte und Nachweis geprüft</label></div>)}</div>}
    </section>

    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Users size={18} className="text-accent-blue" /><h3 className="font-semibold text-text-primary">5. Externe Übergaben</h3></div><button type="button" disabled={disabled} onClick={() => update({ handoffs: [...data.handoffs, { id: createId('handoff'), task: '', assignee: '', dueDate: '', acceptance: '', done: false }] })} className="btn-secondary text-xs"><Plus size={14} /> Übergabe hinzufügen</button></div>
      {data.handoffs.length === 0 ? <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-text-muted">Keine externe Übergabe geplant. Nutze diesen Bereich für Schnitt, Artwork, Host-Upload oder Promotion.</p> : <div className="space-y-3">{data.handoffs.map((entry, index) => <div key={entry.id} className="rounded-lg border border-surface-border bg-obsidian-900 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-text-secondary">Übergabe {index + 1}</span><button type="button" disabled={disabled} onClick={() => update({ handoffs: data.handoffs.filter(item => item.id !== entry.id) })} className="text-text-muted hover:text-accent-red"><Trash2 size={15} /></button></div><div className="grid gap-3 md:grid-cols-2">{([['task','Aufgabe'],['assignee','Zuständig'],['dueDate','Fälligkeit'],['acceptance','Abnahmekriterium']] as const).map(([field,label]) => <div key={field}><label className="label">{label}</label><input type={field === 'dueDate' ? 'date' : 'text'} value={entry[field]} disabled={disabled} onChange={event => update({ handoffs: data.handoffs.map(item => item.id === entry.id ? { ...item, [field]: event.target.value } : item) })} className="input" /></div>)}</div><label className="mt-3 flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={entry.done} disabled={disabled} onChange={event => update({ handoffs: data.handoffs.map(item => item.id === entry.id ? { ...item, done: event.target.checked } : item) })} className="accent-accent-green" /> Übergabe erfüllt und abgenommen</label></div>)}</div>}
    </section>

    <div className="rounded-lg border border-surface-border bg-obsidian-800 p-3 text-xs text-text-muted"><FileCheck2 size={14} className="mr-1 inline text-accent-purple" /> Die Daten dieses Bereichs werden gemeinsam mit der Episode gespeichert und sind im exportierten Übergabepaket enthalten.</div>
  </div>;
}
