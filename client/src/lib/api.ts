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
  downloadIdeaPdf: (ideaId: string) => { window.location.href = `/api/editorial/ideas/${ideaId}/export-pdf`; },

  // Plan
  listPlan: (params?: any) => {
    return api.get<any[]>(`/editorial/plan${buildQs(params)}`);
  },
  createPlanEntry: (data: any) => api.post<any>('/editorial/plan', data),
  updatePlanEntry: (id: string, data: any) => api.put<any>(`/editorial/plan/${id}`, data),
  deletePlanEntry: (id: string) => api.delete(`/editorial/plan/${id}`),
  getCalendar: (year: number, month: number) => api.get<any>(`/editorial/calendar/${year}/${month}`),
  downloadCalendarPdf: async (year: number, month: number): Promise<Blob> => {
    const response = await fetch(`/api/editorial/calendar/${year}/${month}/export-pdf`, { credentials: 'include' });
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
  approveQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/approve`, {}),
  revokeQuestion: (id: string) => api.post<any>(`/editorial/interviews/questions/${id}/revoke`, {}),
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

  // Categories (stored as ad slot categories — handled client-side from slot data)
  listCategories: () => Promise.resolve(['pre-roll', 'mid-roll', 'post-roll', 'host-read', 'display']),
  createCategory: (data: any) => Promise.resolve(data),
  updateCategory: (id: string, data: any) => Promise.resolve(data),
  deleteCategory: (id: string) => Promise.resolve({}),

  // Billing
  getBilling: (sponsorId: string) => api.get<any>(`/sponsors/${sponsorId}/billing`),
  getInvoicePdfUrl: (sponsorId: string) => `/api/sponsors/${sponsorId}/invoice-pdf`,

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
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getRolePermissions: (role: string) => api.get<any>(`/admin/roles/${role}/permissions`),

  // Roles
  listRoles: () => api.get<any[]>('/admin/roles'),
  createRole: (data: any) => api.post<any>('/admin/roles', data),
  updateRole: (id: string, data: any) => api.put<any>(`/admin/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/admin/roles/${id}`),

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
