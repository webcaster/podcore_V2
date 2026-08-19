export type Interaction = 'click' | 'guide' | 'confirm';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  color?: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  route: string;
  position: TooltipPosition;
  interaction: Interaction;
  allowSkip: boolean;
  image?: string;
  annotations: AnnotationPoint[];
}

export interface PdfLayout {
  documentTitle: string;
  documentSubtitle: string;
  fileName: string;
  logo?: string;
  footerText: string;
}

export interface TutorialProject {
  schemaVersion: '1.0';
  id: string;
  title: string;
  description: string;
  applicationName: string;
  applicationUrl: string;
  pdfFileName?: string;
  pdfLayout: PdfLayout;
  archived?: boolean;
  archivedAt?: string;
  audience: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  steps: TutorialStep[];
}

export interface TutorialLibrary {
  schemaVersion: '1.0';
  activeProjectId: string;
  projects: TutorialProject[];
}

export const annotationColors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#ea580c'];

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStep(): TutorialStep {
  return {
    id: makeId('step'),
    title: 'Neuer Schritt',
    description: '',
    target: '',
    route: '',
    position: 'bottom',
    interaction: 'guide',
    allowSkip: true,
    annotations: [],
  };
}

export function createProject(): TutorialProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.0',
    id: makeId('tutorial'),
    title: 'Unbenanntes Tutorial',
    description: 'Ein geführtes Tutorial für Software oder Webanwendungen.',
    applicationName: '',
    applicationUrl: '',
    pdfFileName: '',
    pdfLayout: {
      documentTitle: '',
      documentSubtitle: '',
      fileName: '',
      footerText: 'Erstellt mit Tutorial Studio · Eine Idee von Maximilian Hartwich – Medien der Sinne',
    },
    archived: false,
    audience: ['Endnutzer'],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    createdBy: 'Tutorial Studio',
    steps: [createStep()],
  };
}
