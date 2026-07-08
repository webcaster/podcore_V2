// ============================================================
// PodCore v2.0 - Shared Types
// ============================================================

// --- Auth & Users ---
export type UserRole = 'admin' | 'redakteur' | 'moderator' | 'produktion';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
  avatarColor?: string;
}

export interface UserPermissions {
  // Redaktions-Hub
  canViewIdeas: boolean;
  canCreateIdeas: boolean;
  canEditIdeas: boolean;
  canDeleteIdeas: boolean;
  canViewEditorialPlan: boolean;
  canEditEditorialPlan: boolean;
  canViewInterviews: boolean;
  canEditInterviews: boolean;
  canViewNotes: boolean;
  canEditNotes: boolean;
  // Episoden
  canViewEpisodes: boolean;
  canCreateEpisodes: boolean;
  canEditEpisodes: boolean;
  canDeleteEpisodes: boolean;
  canEditScript: boolean;
  // Media
  canViewMedia: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  canCommentMedia: boolean;
  // Sponsoring
  canViewSponsors: boolean;
  canCreateSponsors: boolean;
  canEditSponsors: boolean;
  canDeleteSponsors: boolean;
  canViewSponsorReports: boolean;
  // Admin
  canManageUsers: boolean;
  canViewErrorLogs: boolean;
  canExport: boolean;
  canManageSettings: boolean;
}

// --- Episodes ---
export type EpisodeStatus = 'idee' | 'entwurf' | 'aufnahme' | 'produktion' | 'geplant' | 'veroeffentlicht' | 'archiviert';

export interface Episode {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  description?: string;
  status: EpisodeStatus;
  recordingDate?: string;
  publishDate?: string;
  duration?: number; // in Sekunden
  hosts: string[];
  guests: string[];
  tags: string[];
  blocks: EpisodeBlock[];
  sponsors: EpisodeSponsor[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type BlockType = 'intro' | 'segment' | 'interview' | 'ad' | 'jingle' | 'outro' | 'custom';

export interface EpisodeBlock {
  id: string;
  type: BlockType;
  title: string;
  content?: string;
  duration?: number;
  assetId?: string;
  sponsorId?: string;
  adSlotId?: string;
  order: number;
  notes?: string;
}

export interface EpisodeSponsor {
  sponsorId: string;
  adSlotId: string;
  placement: 'pre-roll' | 'mid-roll' | 'post-roll' | 'segment';
  confirmed: boolean;
  notes?: string;
}

// --- Redaktions-Hub ---
export type IdeaStatus = 'neu' | 'bewertet' | 'geplant' | 'abgelehnt' | 'umgesetzt';
export type IdeaPriority = 'niedrig' | 'mittel' | 'hoch' | 'dringend';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
  assignedTo?: string;
  episodeId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EditorialPlanEntry {
  id: string;
  episodeId?: string;
  ideaId?: string;
  title: string;
  plannedDate: string;
  status: EpisodeStatus | IdeaStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPartner {
  id: string;
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  bio?: string;
  tags: string[];
  episodes: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestion {
  id: string;
  partnerId?: string;
  episodeId?: string;
  question: string;
  category?: string;
  order: number;
  answered: boolean;
  notes?: string;
  createdAt: string;
}

export interface EditorialNote {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  episodeId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// --- Media Library ---
export type AssetType = 'intro' | 'outro' | 'jingle' | 'segment' | 'ad' | 'interview' | 'sfx' | 'music' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  filename: string;
  filepath: string;
  filesize?: number;
  duration?: number;
  mimeType?: string;
  description?: string;
  tags: string[];
  comments: AssetComment[];
  usedInEpisodes: string[];
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

export interface AssetComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp?: number; // Zeitstempel im Audio
  createdAt: string;
}

// --- Sponsoring ---
export type SponsorStatus = 'aktiv' | 'inaktiv' | 'interessent' | 'abgelaufen';
export type AdCategory = 'pre-roll' | 'mid-roll' | 'post-roll' | 'segment-sponsor' | 'episode-sponsor' | 'serie-sponsor';
export type AdProductionType = 'selbst-angeliefert' | 'eigenproduktion' | 'gemischt';
export type AdStatus = 'angefragt' | 'bestätigt' | 'in-produktion' | 'geliefert' | 'genehmigt' | 'aktiv' | 'abgelaufen' | 'pausiert';

export interface Sponsor {
  id: string;
  name: string;
  company: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logo?: string;
  status: SponsorStatus;
  description?: string;
  notes?: string;
  tags: string[];
  adSlots: AdSlot[];
  totalBudget?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdSlot {
  id: string;
  sponsorId: string;
  name: string;
  category: AdCategory;
  productionType: AdProductionType;
  status: AdStatus;
  duration?: number; // Sekunden
  script?: string;
  assetId?: string; // Verknüpftes Audio-Asset
  deliveredAssetPath?: string;
  price?: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  targetEpisodes?: number;
  bookedEpisodes: string[]; // Episode IDs
  placements: AdPlacement[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdPlacement {
  id: string;
  adSlotId: string;
  episodeId: string;
  episodeTitle?: string;
  episodeNumber?: number;
  position: 'pre-roll' | 'mid-roll' | 'post-roll' | 'segment';
  confirmed: boolean;
  publishDate?: string;
  listens?: number;
  notes?: string;
  createdAt: string;
}

export interface SponsorReport {
  sponsorId: string;
  sponsorName: string;
  period: {
    from: string;
    to: string;
  };
  totalPlacements: number;
  confirmedPlacements: number;
  totalEpisodes: number;
  totalListens?: number;
  adSlots: AdSlotReport[];
  generatedAt: string;
}

export interface AdSlotReport {
  adSlotId: string;
  adSlotName: string;
  category: AdCategory;
  status: AdStatus;
  totalPlacements: number;
  placements: AdPlacement[];
  totalListens?: number;
  price?: number;
}

// --- Error Logging ---
export type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type ErrorCategory = 'frontend' | 'backend' | 'database' | 'auth' | 'api' | 'media' | 'system';

export interface ErrorLog {
  id: string;
  level: ErrorLevel;
  category: ErrorCategory;
  message: string;
  details?: string;
  stack?: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
}

// --- Settings ---
export interface AppSettings {
  general: {
    podcastName: string;
    podcastDescription?: string;
    language: string;
    timezone: string;
    dateFormat: string;
  };
  storage: {
    type: 'local' | 'network' | 'cloud';
    localPath?: string;
    networkPath?: string;
    networkType?: 'smb' | 'nfs';
    cloudProvider?: 's3' | 'gdrive' | 'onedrive' | 'dropbox';
    cloudConfig?: Record<string, string>;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    keepDays: number;
    path?: string;
  };
  appearance: {
    theme: 'dark' | 'light';
    accentColor: string;
    compactMode: boolean;
  };
  notifications: {
    enabled: boolean;
    emailEnabled: boolean;
    emailSmtp?: string;
    emailFrom?: string;
  };
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- v2.12.0: Sponsoring-System Überarbeitung ---

export type SponsorContractStatus = 'aktiv' | 'auslaufend' | 'beendet';
export type AdBookingStatus = 'geplant' | 'bestätigt' | 'ausgestrahlt' | 'abgerechnet';
export type InvoiceStatus = 'offen' | 'versendet' | 'bezahlt' | 'storniert';
export type AdSlotType = 'episode_specific' | 'timeframe' | 'recurring';
export type PriceModel = 'fixed' | 'per_episode' | 'per_1000_listeners';

export interface SponsorContract {
  id: string;
  sponsorId: string;
  contractStart: string;
  contractEnd: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  status: SponsorContractStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdSlotV2 {
  id: string;
  sponsorId?: string;
  slotName: string;
  position: 'pre-roll' | 'mid-roll' | 'post-roll' | 'folgensponsor';
  durationSeconds: number;
  categoryId?: string;
  priceModel: PriceModel;
  basePrice?: number;
  pricePerEpisode?: number;
  pricePer1000Listeners?: number;
  slotType: AdSlotType;
  episodeId?: string;
  timeframeStart?: string;
  timeframeEnd?: string;
  status: 'aktiv' | 'inaktiv' | 'archiviert';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdBooking {
  id: string;
  slotId: string;
  sponsorId: string;
  episodeId?: string;
  bookingDate: string;
  bookingEndDate?: string;
  price: number;
  priceAdjustment?: number;
  listenerFee?: number;
  finalPrice: number;
  invoiceStatus: InvoiceStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryConfirmed: boolean;
  listenerCount?: number;
  status: AdBookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
