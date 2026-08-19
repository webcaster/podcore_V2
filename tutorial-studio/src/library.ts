import { createProject, makeId, TutorialLibrary, TutorialProject } from './types';

export const LIBRARY_KEY = 'tutorial-studio-library-v1';
const LEGACY_PROJECT_KEY = 'tutorial-studio-project-v1';

export function normalizeProject(value: Partial<TutorialProject>): TutorialProject {
  const fallback = createProject();
  return {
    ...fallback,
    ...value,
    id: value.id || fallback.id,
    steps: Array.isArray(value.steps) && value.steps.length ? value.steps : fallback.steps,
    audience: Array.isArray(value.audience) && value.audience.length ? value.audience : fallback.audience,
    pdfLayout: { ...fallback.pdfLayout, ...(value.pdfLayout || {}) },
    archived: Boolean(value.archived),
  };
}

export function loadLibrary(): TutorialLibrary {
  try {
    const stored = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '');
    if (stored?.schemaVersion === '1.0' && Array.isArray(stored.projects) && stored.projects.length) {
      const projects: TutorialProject[] = stored.projects.map((project: Partial<TutorialProject>) => normalizeProject(project));
      const activeProjectId = projects.some((project) => project.id === stored.activeProjectId && !project.archived)
        ? stored.activeProjectId
        : projects.find((project) => !project.archived)?.id || projects[0].id;
      return { schemaVersion: '1.0', activeProjectId, projects };
    }
  } catch { /* The following migration safely creates a fresh library when storage is corrupted. */ }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_PROJECT_KEY) || '');
    if (legacy?.schemaVersion === '1.0') {
      const project = normalizeProject(legacy);
      return { schemaVersion: '1.0', activeProjectId: project.id, projects: [project] };
    }
  } catch { /* Start a new local library below. */ }

  const project = createProject();
  return { schemaVersion: '1.0', activeProjectId: project.id, projects: [project] };
}

export function persistLibrary(library: TutorialLibrary) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function cloneProject(source: TutorialProject): TutorialProject {
  const now = new Date().toISOString();
  return {
    ...normalizeProject(source),
    id: makeId('tutorial'),
    title: `${source.title || 'Unbenanntes Tutorial'} (Kopie)`,
    createdAt: now,
    updatedAt: now,
    archived: false,
    archivedAt: undefined,
    steps: source.steps.map((step) => ({
      ...step,
      id: makeId('step'),
      annotations: step.annotations.map((annotation) => ({ ...annotation, id: makeId('mark') })),
    })),
  };
}
