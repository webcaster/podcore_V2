// ============================================================
// PodCore API Client
// ============================================================

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new ApiError(res.status, data.error || 'Unbekannter Fehler');
  }

  return data.data as T;
}

// For raw JSON responses (backup export)
async function requestRaw(method: string, path: string): Promise<any> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { method, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Fehler');
  }
  return res.json();
}

// Helper: build query string, filtering out undefined/null/empty values
function buildQs(params?: Record<string, any>): string {
  if (!params) return '';
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') filtered[k] = String(v);
  }
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),

  // File upload
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new ApiError(res.status, data.error || 'Upload fehlgeschlagen');
    }
    return data.data as T;
  },
};

export { ApiError };

// ============================================================
// Auth API
// ============================================================
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: any }>('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<any>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  updateProfile: (data: any) => api.put('/auth/me', data),
  getSetupStatus: () => api.get<any>('/auth/setup-status'),
  heartbeat: () => api.post<any>('/auth/heartbeat', {}),
  getOnlineUsers: () => api.get<any[]>('/auth/online-users'),
};

// ============================================================
// Episodes API
// ============================================================
export const episodesApi = {
  // Approval workflow
  requestApproval: (id: string, notes?: string) => api.post<any>(`/episodes/${id}/request-approval`, { notes }),
  approve: (id: string, notes?: string) => api.post<any>(`/episodes/${id}/approve`, { notes }),
  reject: (id: string, notes?: string) => api.post<any>(`/episodes/${id}/reject`, { notes }),
  resetApproval: (id: string) => api.post<any>(`/episodes/${id}/reset-approval`, {}),
  getPendingApprovals: () => api.get<any[]>('/episodes/pending-approval'),
  approveQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/approve`, {}),
  revokeQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/revoke`, {}),
  list: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    return api.get<any>(`/episodes${buildQs(params as any)}`);
  },
  get: (id: string) => api.get<any>(`/episodes/${id}`),
  create: (data: any) => api.post<any>('/episodes', data),
  update: (id: string, data: any) => api.put<any>(`/episodes/${id}`, data),
  delete: (id: string) => api.delete(`/episodes/${id}`),
  duplicate: (id: string) => api.post<any>(`/episodes/${id}/duplicate`),
};

// ============================================================
// Editorial API
// ============================================================
export type TopicWorkshopDraft = {
  id?: string;
  ideaId?: string;
  angle: string;
  guidingQuestion: string;
  coreThesis: string;
  audienceValue: string;
  workingTitles: string[];
  teaser: string;
  episodeDescription: string;
  showNotes: string;
  callToAction: string;
  body: string;
  status: 'draft' | 'review' | 'ready';
  createdAt?: string;
  updatedAt?: string;
};

export type EditorialTextBlock = {
  id: string;
  ideaId: string | null;
  title: string;
  type: 'intro' | 'outro' | 'teaser' | 'description' | 'show-notes' | 'cta' | 'sponsor' | 'transition' | 'question' | 'custom';
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export const editorialApi = {
  // Ideas
  listIdeas: (params?: any) => {
    return api.get<any[]>(`/editorial/ideas${buildQs(params)}`);
  },
  getIdea: (id: string) => api.get<any>(`/editorial/ideas/${id}`),
  createIdea: (data: any) => api.post<any>('/editorial/ideas', data),
  updateIdea: (id: string, data: any) => api.put<any>(`/editorial/ideas/${id}`, data),
  patchIdea: (id: string, data: any) => api.patch<any>(`/editorial/ideas/${id}`, data),
  deleteIdea: (id: string) => api.delete(`/editorial/ideas/${id}`),
  // Idea sub-resources
  listIdeaUploads: (ideaId: string) => api.get<any[]>(`/editorial/ideas/${ideaId}/uploads`),
  uploadIdeaFile: (ideaId: string, file: File, description?: string) => {
    const fd = new FormData(); fd.append('file', file); if (description) fd.append('description', description);
    return api.upload<any>(`/editorial/ideas/${ideaId}/uploads`, fd);
  },
  deleteIdeaUpload: (ideaId: string, uploadId: string) => api.delete(`/editorial/ideas/${ideaId}/uploads/${uploadId}`),
  exportIdeaPdf: (ideaId: string) => `/api/editorial/ideas/${ideaId}/export-pdf`,
  listIdeaNotes: (ideaId: string) => api.get<any[]>(`/editorial/ideas/${ideaId}/notes`),
  createIdeaNote: (ideaId: string, content: string) => api.post<any>(`/editorial/ideas/${ideaId}/notes`, { content }),
  updateIdeaNote: (ideaId: string, noteId: string, content: string) => api.put<any>(`/editorial/ideas/${ideaId}/notes/${noteId}`, { content }),
  deleteIdeaNote: (ideaId: string, noteId: string) => api.delete(`/editorial/ideas/${ideaId}/notes/${noteId}`),
  listIdeaChecklist: (ideaId: string) => api.get<any[]>(`/editorial/ideas/${ideaId}/checklists`),
  createChecklistItem: (ideaId: string, title: string) => api.post<any>(`/editorial/ideas/${ideaId}/checklists`, { title }),
  updateChecklistItem: (ideaId: string, itemId: string, data: any) => api.put<any>(`/editorial/ideas/${ideaId}/checklists/${itemId}`, data),
  deleteChecklistItem: (ideaId: string, itemId: string) => api.delete(`/editorial/ideas/${ideaId}/checklists/${itemId}`),
  createEpisodeFromIdea: (ideaId: string, data: any) => api.post<any>(`/editorial/ideas/${ideaId}/create-episode`, data),
  downloadIdeaPdf: (ideaId: string, layoutId?: string) => {
    const qs = layoutId ? `?layoutId=${encodeURIComponent(layoutId)}` : '';
    window.location.href = `/api/editorial/ideas/${ideaId}/export-pdf${qs}`;
  },
  getTopicWorkshop: (ideaId: string) => api.get<TopicWorkshopDraft | null>(`/editorial/ideas/${ideaId}/topic-workshop`),
  saveTopicWorkshop: (ideaId: string, data: TopicWorkshopDraft) => api.put<TopicWorkshopDraft>(`/editorial/ideas/${ideaId}/topic-workshop`, data),
  listTextBlocks: (params?: { ideaId?: string; scope?: 'all' | 'global' | 'idea'; type?: string; search?: string }) =>
    api.get<EditorialTextBlock[]>(`/editorial/text-blocks${buildQs(params)}`),
  createTextBlock: (data: Omit<EditorialTextBlock, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<EditorialTextBlock>('/editorial/text-blocks', data),
  updateTextBlock: (id: string, data: Partial<Omit<EditorialTextBlock, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<EditorialTextBlock>(`/editorial/text-blocks/${id}`, data),
  deleteTextBlock: (id: string) => api.delete(`/editorial/text-blocks/${id}`),

  // Plan
  listPlan: (params?: any) => {
    return api.get<any[]>(`/editorial/plan${buildQs(params)}`);
  },
  createPlanEntry: (data: any) => api.post<any>('/editorial/plan', data),
  updatePlanEntry: (id: string, data: any) => api.put<any>(`/editorial/plan/${id}`, data),
  deletePlanEntry: (id: string) => api.delete(`/editorial/plan/${id}`),
  getCalendar: (year: number, month: number) => api.get<any>(`/editorial/calendar/${year}/${month}`),
  downloadCalendarPdf: async (year: number, month: number, layoutId?: string): Promise<Blob> => {
    const qs = layoutId ? `?layoutId=${encodeURIComponent(layoutId)}` : '';
    const response = await fetch(`/api/editorial/calendar/${year}/${month}/export-pdf${qs}`, { credentials: 'include' });
    if (!response.ok) throw new Error('PDF-Export fehlgeschlagen');
    return response.blob();
  },

  // Interview Partners
  listPartners: (params?: any) => {
    return api.get<any[]>(`/editorial/interviews/partners${buildQs(params)}`);
  },
  createPartner: (data: any) => api.post<any>('/editorial/interviews/partners', data),
  updatePartner: (id: string, data: any) => api.put<any>(`/editorial/interviews/partners/${id}`, data),
  deletePartner: (id: string) => api.delete(`/editorial/interviews/partners/${id}`),

  // Interview Questions
  listQuestions: (params?: any) => {
    return api.get<any[]>(`/editorial/interviews/questions${buildQs(params)}`);
  },
  createQuestion: (data: any) => api.post<any>('/editorial/interviews/questions', data),
  updateQuestion: (id: string, data: any) => api.put<any>(`/editorial/interviews/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/editorial/interviews/questions/${id}`),
  reorderQuestions: (questionIds: string[]) => api.post<any>('/editorial/interviews/questions/reorder', { questionIds }),
  archiveQuestionToPool: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/archive-to-pool`, {}),
  approveQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/approve`, {}),
  revokeQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/revoke`, {}),
  listQuestionPool: (params?: { category?: string; search?: string }) =>
    api.get<any[]>(`/editorial/interviews/question-pool${buildQs(params)}`),
  createPoolQuestion: (data: any) => api.post<any>('/editorial/interviews/question-pool', data),
  updatePoolQuestion: (id: string, data: any) => api.put<any>(`/editorial/interviews/question-pool/${id}`, data),
  deletePoolQuestion: (id: string) => api.delete(`/editorial/interviews/question-pool/${id}`),
  assignPoolQuestions: (partnerId: string, questionIds: string[]) =>
    api.post<any>('/editorial/interviews/question-pool/assign', { partnerId, questionIds }),
  downloadQuestionPoolPdf: async (params?: { category?: string; search?: string; questionIds?: string[]; layoutId?: string; documentTitle?: string }): Promise<Blob> => {
    const query = buildQs({
      category: params?.category,
      search: params?.search,
      questionIds: params?.questionIds?.length ? params.questionIds.join(',') : undefined,
      layoutId: params?.layoutId,
      documentTitle: params?.documentTitle,
    });
    const response = await fetch(`/api/editorial/interviews/question-pool/export-pdf${query}`, { credentials: 'include' });
    if (!response.ok) {
      let message = 'Fragen-Pool konnte nicht als PDF exportiert werden';
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch (_) {}
      throw new Error(message);
    }
    return response.blob();
  },
  sendSummaryUrl: (partnerId: string, episodeId?: string) => {
    const qs = episodeId ? `?episodeId=${episodeId}` : '';
    return `/api/editorial/interviews/partners/${partnerId}/send-summary${qs}`;
  },

  // Notes
  listNotes: (params?: any) => {
    return api.get<any[]>(`/editorial/notes${buildQs(params)}`);
  },
  createNote: (data: any) => api.post<any>('/editorial/notes', data),
  updateNote: (id: string, data: any) => api.put<any>(`/editorial/notes/${id}`, data),
  deleteNote: (id: string) => api.delete(`/editorial/notes/${id}`),

  // Research Sources
  listResearch: (params?: any) => {
    return api.get<any[]>(`/editorial/research${buildQs(params)}`);
  },
  createResearch: (data: any) => api.post<any>('/editorial/research', data),
  updateResearch: (id: string, data: any) => api.put<any>(`/editorial/research/${id}`, data),
  deleteResearch: (id: string) => api.delete(`/editorial/research/${id}`),
};

// ============================================================
// Editorial Hub API (Episoden-Editor Integration)
// ============================================================
export const editorialHubApi = {
  getIdeasForEpisode: (params?: { search?: string; status?: string }) =>
    api.get<any[]>(`/editorial/ideas-for-episode${buildQs(params)}`),
  getIdeaFull: (id: string) => api.get<any>(`/editorial/ideas/${id}/full`),
  getInterviewsForEpisode: (params: { ideaId?: string } = {}) => api.get<any[]>(`/editorial/interviews/for-episode${buildQs(params)}`),
  getTopicWorkshop: (ideaId: string) => api.get<TopicWorkshopDraft | null>(`/editorial/ideas/${ideaId}/topic-workshop`),
  listTextBlocks: (params?: { ideaId?: string; scope?: 'all' | 'global' | 'idea'; type?: string; search?: string }) =>
    api.get<EditorialTextBlock[]>(`/editorial/text-blocks${buildQs(params)}`),
};

// ============================================================
// Episode Workflow API (v2.14.0)
// ============================================================
export const episodeWorkflowApi = {
  updateField: (episodeId: string, field: string, value: any, expectedUpdatedAt?: string) =>
    api.patch<any>(`/episode-workflow/${episodeId}/field`, { field, value, expectedUpdatedAt }),
  listComments: (episodeId: string, fieldKey?: string) =>
    api.get<any[]>(`/episode-workflow/${episodeId}/comments${buildQs({ fieldKey })}`),
  createComment: (episodeId: string, data: { fieldKey?: string; parentId?: string; content: string; mentions?: string[] }) =>
    api.post<any>(`/episode-workflow/${episodeId}/comments`, data),
  resolveComment: (episodeId: string, commentId: string, resolved = true) =>
    api.patch<any>(`/episode-workflow/${episodeId}/comments/${commentId}/resolve`, { resolved }),
  deleteComment: (episodeId: string, commentId: string) =>
    api.delete(`/episode-workflow/${episodeId}/comments/${commentId}`),
  getHistory: (episodeId: string) => api.get<any[]>(`/episode-workflow/${episodeId}/history`),
  rollback: (episodeId: string, revisionId: string) =>
    api.post<any>(`/episode-workflow/${episodeId}/history/${revisionId}/rollback`, {}),
  getTeam: () => api.get<any[]>('/episode-workflow/team'),
  getNotifications: (limit = 30) => api.get<any[]>(`/episode-workflow/notifications?limit=${limit}`),
  markNotificationsRead: (ids?: string[]) => api.post('/episode-workflow/notifications/read', { ids }),
  getMedia: (episodeId: string) => api.get<any[]>(`/episode-workflow/${episodeId}/media`),
  linkMedia: (episodeId: string, assetId: string, relationType = 'source') =>
    api.post<any>(`/episode-workflow/${episodeId}/media`, { assetId, relationType }),
  unlinkMedia: (episodeId: string, assetId: string) =>
    api.delete(`/episode-workflow/${episodeId}/media/${assetId}`),
  getSponsoringRecommendations: (episodeId: string) =>
    api.get<any[]>(`/episode-workflow/${episodeId}/sponsoring/recommendations`),
  quickBookSponsor: (episodeId: string, data: { sponsorId: string; slotId: string; position?: string; duration?: number; presentationText?: string }) =>
    api.post<any>(`/episode-workflow/${episodeId}/sponsoring/quick-book`, data),
  analyzeAudio: (episodeId: string, assetId: string) =>
    api.post<any>(`/episode-workflow/${episodeId}/audio/${assetId}/analyze`, {}),
  getAudioJob: (episodeId: string, jobId: string) =>
    api.get<any>(`/episode-workflow/${episodeId}/audio/jobs/${jobId}`),
};

// ============================================================
// Sponsors API
// ============================================================
export const sponsorsApi = {
  list: (params?: any) => {
    return api.get<any[]>(`/sponsors${buildQs(params)}`);
  },
  get: (id: string) => api.get<any>(`/sponsors/${id}`),
  create: (data: any) => api.post<any>('/sponsors', data),
  update: (id: string, data: any) => api.put<any>(`/sponsors/${id}`, data),
  delete: (id: string) => api.delete(`/sponsors/${id}`),
  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.upload<{ logo: string }>(`/sponsors/${id}/logo`, formData);
  },
  deleteLogo: (id: string) => api.delete<{ logo: null }>(`/sponsors/${id}/logo`),

  // Ad Slots
  listSlots: (sponsorId: string) => api.get<any[]>(`/sponsors/${sponsorId}/slots`),
  createSlot: (sponsorId: string, data: any) => api.post<any>(`/sponsors/${sponsorId}/slots`, data),
  updateSlot: (slotId: string, data: any) => api.put<any>(`/sponsors/slots/${slotId}`, data),
  deleteSlot: (slotId: string) => api.delete(`/sponsors/slots/${slotId}`),

  // Placements
  listPlacements: (slotId: string) => api.get<any[]>(`/sponsors/slots/${slotId}/placements`),
  getPlacements: (sponsorId: string) => api.get<any[]>(`/sponsors/${sponsorId}/slots`),
  createPlacement: (slotIdOrSponsorId: string, data: any) => api.post<any>(`/sponsors/slots/${slotIdOrSponsorId}/placements`, data),
  updatePlacement: (placementId: string, data: any) => api.put<any>(`/sponsors/placements/${placementId}`, data),
  deletePlacement: (placementId: string) => api.delete(`/sponsors/placements/${placementId}`),

  // Ad Categories (Werbekategorien mit Preislisten & Präsentationstext)
  listCategories: () => api.get<any[]>('/sponsors/categories'),
  createCategory: (data: any) => api.post<any>('/sponsors/categories', data),
  updateCategory: (id: string, data: any) => api.put<any>(`/sponsors/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/sponsors/categories/${id}`),

  // Episode Ad Bookings (gebuchte Werbungen pro Episode)
  getEpisodeBookings: (episodeId: string) => api.get<any[]>(`/sponsors/episode-bookings/${episodeId}`),
  createEpisodeBooking: (data: any) => api.post<any>('/sponsors/episode-bookings', data),
  updateEpisodeBooking: (id: string, data: any) => api.put<any>(`/sponsors/episode-bookings/${id}`, data),
  deleteEpisodeBooking: (id: string) => api.delete(`/sponsors/episode-bookings/${id}`),
  getAvailableSlotsForEpisode: async (episodeId: string) => {
    // Das Backend gibt { success, data: slots[], allSponsors: [], categories: [] } zurück.
    // requestRaw liefert das volle Objekt, damit allSponsors und categories nicht verloren gehen.
    const res = await fetch(`/api/sponsors/available-for-episode/${episodeId}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Fehler beim Laden der Werbeplätze');
    return { data: json.data || [], allSponsors: json.allSponsors || [], categories: json.categories || [] };
  },
  createSpecialBooking: (data: any) => api.post<any>('/sponsors/special-booking', data),

  // Billing
  getBilling: (sponsorId: string) => api.get<any>(`/sponsors/${sponsorId}/billing`),
  getInvoicePdfUrl: (sponsorId: string) => `/api/sponsors/${sponsorId}/invoice-pdf`,
  getConfirmationPdfUrl: (sponsorId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return `/api/sponsors/${sponsorId}/confirmation-pdf${qs}`;
  },

  // Reports
  getReport: (sponsorIdOrParams: string | { sponsorId?: string; dateFrom?: string; dateTo?: string }, params?: { from?: string; to?: string }) => {
    if (typeof sponsorIdOrParams === 'string') {
      return api.get<any>(`/sponsors/${sponsorIdOrParams}/report${buildQs(params as any)}`);
    }
    const p: any = {};
    if (sponsorIdOrParams.dateFrom) p.from = sponsorIdOrParams.dateFrom;
    if (sponsorIdOrParams.dateTo) p.to = sponsorIdOrParams.dateTo;
    if (sponsorIdOrParams.sponsorId) {
      return api.get<any>(`/sponsors/${sponsorIdOrParams.sponsorId}/report${buildQs(p)}`);
    }
    return api.get<any>(`/sponsors/reports/overview${buildQs(p)}`);
  },
  exportReport: (params: { sponsorId?: string; dateFrom?: string; dateTo?: string; format?: string }) => {
    const p: any = {};
    if (params.dateFrom) p.from = params.dateFrom;
    if (params.dateTo) p.to = params.dateTo;
    if (params.format) p.format = params.format;
    if (params.sponsorId) {
      return api.get<any>(`/sponsors/${params.sponsorId}/report${buildQs(p)}`);
    }
    return api.get<any[]>(`/sponsors/reports/overview${buildQs(p)}`);
  },
  getOverview: () => api.get<any[]>('/sponsors/reports/overview'),
  getRevenueDashboard: (params?: { from?: string; to?: string; status?: string }) =>
    api.get<any>(`/sponsors/revenue/dashboard${buildQs(params)}`),
  exportRevenueCsv: (params?: { from?: string; to?: string; status?: string }) =>
    `/api/sponsors/revenue/dashboard${buildQs({ ...params, format: 'csv' })}`,

  // Buchungskalender
  getBookingCalendar: (params?: { from?: string; to?: string }) => api.get<any>(`/sponsors/booking-calendar${buildQs(params)}`),
  exportBookingCalendarCsv: (params?: { from?: string; to?: string }) =>
    `/api/sponsors/booking-calendar/export${buildQs({ ...params, format: 'csv' })}`,

  // Folgensponsor-Automatisierung
  autoAssignEpisode: (episodeId: string) =>
    api.post<any>('/sponsors/auto-assign-episode', { episodeId }),

  // Konfliktprüfung
  checkConflicts: (params: { slotId?: string; from: string; to: string; categoryId?: string; isExclusive?: boolean }) =>
    api.get<any>(`/sponsors/check-conflicts${buildQs(params as any)}`),

  // TKP-Preisberechnung
  calculatePrice: (data: { basePrice?: number; pricePerEpisode?: number; pricePer1000Listens?: number; episodeCount?: number; totalListens?: number; priceModel?: string }) =>
    api.post<any>('/sponsors/calculate-price', data),
};

// ============================================================
// Approvals API
// ============================================================
export const approvalsApi = {
  getPending: () => api.get<any>('/approvals/pending'),
};

// ============================================================
// Media API
// ============================================================
export const mediaApi = {
  list: (params?: any) => {
    return api.get<any[]>(`/media${buildQs(params)}`);
  },
  get: (id: string) => api.get<any>(`/media/${id}`),
  upload: (formData: FormData) => api.upload<any>('/media/upload', formData),
  update: (id: string, data: any) => api.put<any>(`/media/${id}`, data),
  delete: (id: string) => api.delete(`/media/${id}`),
  addComment: (id: string, data: any) => api.post<any>(`/media/${id}/comments`, data),
  deleteComment: (id: string, commentId: string) => api.delete(`/media/${id}/comments/${commentId}`),
  getStreamUrl: (filename: string) => `/api/media/stream/${filename}`,

  // Folders
  listFolders: (params?: any) => api.get<any[]>(`/media/folders${buildQs(params)}`),
  createFolder: (data: any) => api.post<any>('/media/folders', data),
  deleteFolder: (id: string) => api.delete(`/media/folders/${id}`),

  // Branding (logo + cover)
  getBranding: () => api.get<any>('/media/branding'),
  uploadBranding: (type: 'logo' | 'cover', formData: FormData) =>
    api.upload<any>(`/media/branding/${type}`, formData),
  deleteBranding: (type: 'logo' | 'cover') => api.delete(`/media/branding/${type}`),
};

// ============================================================
// Backup API
// ============================================================
export const backupApi = {
  export: (type: 'episodes' | 'ideas' | 'full') => requestRaw('GET', `/backup/export/${type}`),
  import: (type: 'episodes' | 'ideas', formData: FormData) =>
    api.upload<any>(`/backup/import/${type}`, formData),
  importFull: (formData: FormData) =>
    api.upload<any>('/backup/import/full', formData),
  preview: (formData: FormData) =>
    api.upload<any>('/backup/import/preview', formData),
  list: () => api.get<any[]>('/backup/list'),
  delete: (filename: string) => api.delete(`/backup/${encodeURIComponent(filename)}`),
};

// ============================================================
// Admin API
// ============================================================
export const adminApi = {
  // Users
  listUsers: () => api.get<any[]>('/admin/users'),
  getUser: (id: string) => api.get<any>(`/admin/users/${id}`),
  createUser: (data: any) => api.post<any>('/admin/users', data),
  updateUser: (id: string, data: any) => api.put<any>(`/admin/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) => api.post(`/admin/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id: string, transferTo?: string) => api.delete(`/admin/users/${id}${transferTo ? `?transferTo=${encodeURIComponent(transferTo)}` : ''}`),
  getLinkedData: (id: string) => api.get<any>(`/admin/users/${id}/linked-data`),
  getRolePermissions: (role: string) => api.get<any>(`/admin/roles/${role}/permissions`),

  // Roles
  listRoles: () => api.get<any[]>('/admin/roles'),
  createRole: (data: any) => api.post<any>('/admin/roles', data),
  updateRole: (id: string, data: any) => api.put<any>(`/admin/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/admin/roles/${id}`),
  resetRolePermissions: () => api.post<any>('/admin/roles/reset-permissions', {}),

  // Logs
  listLogs: (params?: any) => {
    return api.get<any>(`/admin/logs${buildQs(params)}`);
  },
  getLogs: (params?: any) => {
    return api.get<any>(`/admin/logs${buildQs(params)}`);
  },
  createLog: (data: any) => api.post('/admin/logs', data),
  deleteLogs: (params?: any) => {
    return api.delete(`/admin/logs${buildQs(params)}`);
  },

  // Settings
  getSettings: () => api.get<any>('/admin/settings'),
  updateSettings: (data: any) => api.put<any>('/admin/settings', data),
  getPublicSettings: () => api.get<any>('/admin/settings/public'),
  updatePodcastProfile: (data: any) => api.put<any>('/admin/settings', { podcast: data }),
  updateTechnicalDefaults: (data: any) => api.put<any>('/admin/settings', { technicalDefaults: data }),

  // System
  getSystem: () => api.get<any>('/admin/system'),

  // Aliases used in AdminPage
  getUsers: () => api.get<any[]>('/admin/users'),
  exportDb: () => backupApi.export('full'),

  // Approval users
  listApprovalUsers: () => api.get<any[]>('/admin/approval-users'),
  updateApprovalUsers: (userIds: string[]) => api.put<any>('/admin/approval-users', { userIds }),

  // Database Migration
  getDbStatus: () => api.get<any>('/admin/db/status'),
  testMysql: (data: any) => api.post<any>('/admin/db/test-mysql', data),
  migrateToMysql: (data: any) => api.post<any>('/admin/db/migrate-to-mysql', data),
  getMigrationLog: () => api.get<any>('/admin/db/migration-log'),
};

// ============================================================
// Settings API (public)
// ============================================================
export const settingsApi = {
  get: () => api.get<any>('/settings'),
  update: (data: any) => api.put<any>('/settings', data),
};

// ============================================================
// Podigee API
// ============================================================
export const podigeeApi = {
  getStatus: () => api.get<any>('/podigee/status'),
  getPodcast: () => api.get<any>('/podigee/podcast'),
  getEpisodes: () => api.get<any[]>('/podigee/episodes'),
  getOverview: (params?: { from?: string; to?: string }) => {
    return api.get<any>(`/podigee/stats/overview${buildQs(params)}`);
  },
  getTopEpisodes: (params?: { from?: string; to?: string; limit?: number }) => {
    return api.get<any>(`/podigee/stats/top${buildQs(params as any)}`);
  },
  getClients: (params?: { from?: string; to?: string }) => {
    return api.get<any>(`/podigee/stats/clients${buildQs(params)}`);
  },
  getGeo: (params?: { from?: string; to?: string }) => {
    return api.get<any>(`/podigee/stats/geo${buildQs(params)}`);
  },
  getEpisodeStats: (episodeId: string, params?: { from?: string; to?: string }) => {
    return api.get<any>(`/podigee/stats/episode/${episodeId}${buildQs(params)}`);
  },
  testConnection: (apiToken: string, podcastSubdomain?: string) =>
    api.post<any>('/podigee/test', { apiToken, podcastSubdomain }),
  getConfig: () => api.get<any>('/podigee/config'),
  saveConfig: (data: any) => api.put<any>('/podigee/config', data),
};

// ============================================================
// Chat API
// ============================================================
export const chatApi = {
  getChannels: () => api.get<any[]>('/chat/channels'),
  getMessages: (channel: string) => api.get<any[]>(`/chat/messages/${channel}`),
  sendMessage: (channel: string, message: string) => api.post<any>('/chat/messages', { channel, message }),
  deleteMessage: (id: string) => api.delete(`/chat/messages/${id}`),
  getUnreadCount: () => api.get<any>('/chat/unread'),
};

// ============================================================
// PDF Layouts API
// ============================================================
export const pdfLayoutsApi = {
  list: () => api.get<any[]>('/pdf-layouts'),
  getDefaults: () => api.get<any>('/pdf-layouts/defaults'),
  get: (id: string) => api.get<any>(`/pdf-layouts/${id}`),
  create: (data: any) => api.post<any>('/pdf-layouts', data),
  duplicate: (id: string, name?: string) => api.post<any>(`/pdf-layouts/${id}/duplicate`, { name }),
  update: (id: string, data: any) => api.put<any>(`/pdf-layouts/${id}`, data),
  delete: (id: string) => api.delete(`/pdf-layouts/${id}`),

  // Vorschau-URL für gespeichertes Layout (direkt als iframe-src verwendbar)
  previewUrl: (id: string) => `${API_BASE}/pdf-layouts/${id}/preview`,

  // Vorschau mit ungespeicherten Live-Daten (gibt Blob-URL zurück)
  previewLive: async (layoutData: any): Promise<string> => {
    const res = await fetch(`${API_BASE}/pdf-layouts/preview-live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(layoutData),
    });
    if (!res.ok) throw new Error('Vorschau konnte nicht generiert werden');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

// ============================================================
// Update API
// ============================================================
export const updateApi = {
  getStatus: () => api.get<any>('/admin/update/status'),
  checkGithub: () => api.get<any>('/admin/update/check-github'),
  uploadZip: async (file: File, onProgress?: (pct: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/admin/update/upload`);
      xhr.withCredentials = true;
      if (onProgress) {
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve(data.data);
          else reject(new Error(data.error || 'Upload fehlgeschlagen'));
        } catch { reject(new Error('Ungültige Server-Antwort')); }
      };
      xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'));
      const fd = new FormData();
      fd.append('update', file);
      xhr.send(fd);
    });
  },
  applyUpdate: (updateId: string) => api.post<any>('/admin/update/apply', { updateId }),
  getLogs: () => api.get<any[]>('/admin/update/logs'),
};

// ============================================================
// Seasons API
// ============================================================
export const seasonsApi = {
  list: () => api.get<any[]>('/seasons'),
  get: (id: string) => api.get<any>(`/seasons/${id}`),
  create: (data: any) => api.post<any>('/seasons', data),
  update: (id: string, data: any) => api.put<any>(`/seasons/${id}`, data),
  delete: (id: string) => api.delete(`/seasons/${id}`),
  listEpisodes: (id: string) => api.get<any[]>(`/seasons/${id}/episodes`),
};

// ============================================================
// Season Planning API (v2.14.4)
// ============================================================
export const seasonPlanningApi = {
  listItems: (seasonId: string) =>
    api.get<{ season: any; items: any[] }>(`/seasons/${seasonId}/plan-items`),
  createItem: (seasonId: string, data: any) =>
    api.post<any>(`/seasons/${seasonId}/plan-items`, data),
  updateItem: (itemId: string, data: any) =>
    api.put<any>(`/seasons/plan-items/${itemId}`, data),
  deleteItem: (itemId: string) =>
    api.delete(`/seasons/plan-items/${itemId}`),
  reorderItems: (seasonId: string, items: Array<{ id: string; lane: 'lineup' | 'alternative' }>) =>
    api.post<any>(`/seasons/${seasonId}/plan-items/reorder`, { items }),
  continueToEpisode: (itemId: string) =>
    api.post<any>(`/seasons/plan-items/${itemId}/continue`, {}),
  exportPdf: async (seasonId: string, data: { documentTitle: string; layoutId?: string; selectedItems?: string[] }): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/seasons/${seasonId}/plan-items/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('PDF-Export fehlgeschlagen');
    return response.blob();
  },
};
