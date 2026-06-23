import path from 'path';
import fs from 'fs';
import os from 'os';

// ============================================================
// Data directories
// ============================================================
const DATA_DIR = process.env.PODCORE_DATA_DIR || path.join(os.homedir(), '.podcore');
const DB_PATH = path.join(DATA_DIR, 'podcore.db');

for (const dir of [
  DATA_DIR,
  path.join(DATA_DIR, 'assets'),
  path.join(DATA_DIR, 'backups'),
  path.join(DATA_DIR, 'logs'),
  path.join(DATA_DIR, 'branding'),
  path.join(DATA_DIR, 'tmp'),
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const ASSETS_DIR = path.join(DATA_DIR, 'assets');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

export { DATA_DIR, ASSETS_DIR, BACKUPS_DIR, LOGS_DIR };

// ============================================================
// node-sqlite3-wasm wrapper (synchronous, no native compilation)
// ============================================================

let _db: any = null;

export function getDb(): any {
  if (!_db) {
    const { Database } = require('node-sqlite3-wasm');
    _db = new Database(DB_PATH);
    initializeSchema(_db);
  }
  return _db;
}

// ============================================================
// Schema initialization
// ============================================================

function initializeSchema(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'redakteur',
      permissions TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      avatar_color TEXT DEFAULT '#7c3aed',
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      number INTEGER,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'entwurf',
      recording_date TEXT,
      publish_date TEXT,
      duration INTEGER,
      hosts TEXT NOT NULL DEFAULT '[]',
      guests TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      blocks TEXT NOT NULL DEFAULT '[]',
      sponsors TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      production_info TEXT,
      technical_data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL
    );

    -- Migration: add production_info and technical_data if not exists
    -- (safe to run multiple times due to IF NOT EXISTS on table level)
    -- We use a workaround: try adding columns, ignore errors
    

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'neu',
      priority TEXT NOT NULL DEFAULT 'mittel',
      tags TEXT NOT NULL DEFAULT '[]',
      assigned_to TEXT,
      episode_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS editorial_plan (
      id TEXT PRIMARY KEY,
      episode_id TEXT,
      idea_id TEXT,
      title TEXT NOT NULL,
      planned_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'entwurf',
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      bio TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      episodes TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      episode_id TEXT,
      question TEXT NOT NULL,
      category TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      answered INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS editorial_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      episode_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER,
      duration INTEGER,
      mime_type TEXT,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      comments TEXT NOT NULL DEFAULT '[]',
      used_in_episodes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      uploaded_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      website TEXT,
      logo TEXT,
      status TEXT NOT NULL DEFAULT 'interessent',
      description TEXT,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      total_budget REAL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ad_slots (
      id TEXT PRIMARY KEY,
      sponsor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'mid-roll',
      production_type TEXT NOT NULL DEFAULT 'eigenproduktion',
      status TEXT NOT NULL DEFAULT 'angefragt',
      duration INTEGER,
      script TEXT,
      asset_id TEXT,
      delivered_asset_path TEXT,
      price REAL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      start_date TEXT,
      end_date TEXT,
      target_episodes INTEGER,
      booked_episodes TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ad_placements (
      id TEXT PRIMARY KEY,
      ad_slot_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      episode_title TEXT,
      episode_number INTEGER,
      position TEXT NOT NULL DEFAULT 'mid-roll',
      confirmed INTEGER NOT NULL DEFAULT 0,
      publish_date TEXT,
      listens INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL DEFAULT 'error',
      category TEXT NOT NULL DEFAULT 'system',
      message TEXT NOT NULL,
      details TEXT,
      stack TEXT,
      user_id TEXT,
      user_agent TEXT,
      url TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#7c3aed',
      permissions TEXT NOT NULL DEFAULT '{}',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS research_sources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT,
      type TEXT NOT NULL DEFAULT 'link',
      description TEXT,
      content TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      related_idea_id TEXT,
      related_episode_id TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'aktiv',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS podcast_stats (
      id TEXT PRIMARY KEY,
      episode_id TEXT,
      date TEXT NOT NULL,
      downloads INTEGER DEFAULT 0,
      plays INTEGER DEFAULT 0,
      unique_listeners INTEGER DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT,
      channel TEXT,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );
  `);

  // Migration: add new columns if they don't exist (for existing databases)
  try { db.exec('ALTER TABLE episodes ADD COLUMN production_info TEXT'); } catch (_) {}
  try { db.exec("ALTER TABLE episodes ADD COLUMN technical_data TEXT NOT NULL DEFAULT '{}'"); } catch (_) {}
  try { db.exec('ALTER TABLE users ADD COLUMN theme TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN block_notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN dashboard_layout TEXT DEFAULT NULL"); } catch (_) {}
  // Seasons and archive migrations
  try { db.exec('ALTER TABLE episodes ADD COLUMN season_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN archive_date TEXT DEFAULT NULL'); } catch (_) {}
  // Create seasons and podcast_stats tables if they don't exist (for existing DBs)
  try { db.exec(`CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY, number INTEGER NOT NULL, title TEXT NOT NULL, description TEXT,
    cover_url TEXT, start_date TEXT, end_date TEXT, status TEXT NOT NULL DEFAULT 'aktiv',
    created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS podcast_stats (
    id TEXT PRIMARY KEY, episode_id TEXT, date TEXT NOT NULL,
    downloads INTEGER DEFAULT 0, plays INTEGER DEFAULT 0, unique_listeners INTEGER DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual', notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  // Episodes: add approval/release workflow fields
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_status TEXT NOT NULL DEFAULT \'ausstehend\''); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approved_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approved_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_requested_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_requested_at TEXT DEFAULT NULL'); } catch (_) {}
  // Interview questions: add approved/released workflow fields
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))'); } catch (_) {}
  // Interview partners: add custom guest intro text
  try { db.exec('ALTER TABLE interview_partners ADD COLUMN guest_intro TEXT DEFAULT NULL'); } catch (_) {}
  // Ad placements: add price and invoice fields
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN price REAL DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN currency TEXT NOT NULL DEFAULT \'EUR\''); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN invoice_number TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN invoice_date TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN invoice_status TEXT NOT NULL DEFAULT \'offen\''); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN invoice_notes TEXT DEFAULT NULL'); } catch (_) {}
  // Ad slots: add invoice_notes
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN invoice_notes TEXT DEFAULT NULL'); } catch (_) {}
  // research_sources table migration for existing DBs
  try { db.exec("CREATE TABLE IF NOT EXISTS research_sources (id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT, type TEXT NOT NULL DEFAULT 'link', description TEXT, content TEXT, tags TEXT NOT NULL DEFAULT '[]', related_idea_id TEXT, related_episode_id TEXT, status TEXT NOT NULL DEFAULT 'unread', created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))"); } catch (_) {}
  // Ideas: add extended fields for episode preparation workspace
  try { db.exec('ALTER TABLE ideas ADD COLUMN target_audience TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ideas ADD COLUMN episode_format TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ideas ADD COLUMN target_duration INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ideas ADD COLUMN target_date TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ideas ADD COLUMN cover_image TEXT DEFAULT NULL'); } catch (_) {}
  // Idea checklists table
  try { db.exec(`CREATE TABLE IF NOT EXISTS idea_checklists (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  // Idea notes table (idea-specific notes)
  try { db.exec(`CREATE TABLE IF NOT EXISTS idea_notes (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  // Idea uploads table (files attached to ideas)
  try { db.exec(`CREATE TABLE IF NOT EXISTS idea_uploads (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER,
    mime_type TEXT,
    description TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  // Interview partners: add idea_id field
  try { db.exec('ALTER TABLE interview_partners ADD COLUMN idea_id TEXT DEFAULT NULL'); } catch (_) {}
  // Interview questions: add idea_id field
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN idea_id TEXT DEFAULT NULL'); } catch (_) {}
  // Research sources: add idea_id field (already has related_idea_id)
  // Ensure uploads directory for idea files
  const ideaUploadsDir = path.join(DATA_DIR, 'idea-uploads');
  if (!fs.existsSync(ideaUploadsDir)) fs.mkdirSync(ideaUploadsDir, { recursive: true });

  // Chat messages table migration for existing DBs
  try { db.exec('CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT, channel TEXT, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime("now")), FOREIGN KEY (sender_id) REFERENCES users(id), FOREIGN KEY (recipient_id) REFERENCES users(id))'); } catch (_) {}

  // Default admin user
  const userCount = db.get('SELECT COUNT(*) as count FROM users') as any;
  if (!userCount || userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const adminId = uuidv4();
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const defaultPermissions = JSON.stringify(getDefaultPermissions('admin'));

    db.run(
      'INSERT INTO users (id, username, display_name, email, password_hash, role, permissions, is_active, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [adminId, 'admin', 'Administrator', 'admin@podcore.local', passwordHash, 'admin', defaultPermissions, '#7c3aed']
    );

    console.log('[DB] Default admin user created: admin / admin123');
  }

  // Default settings
  const settingsCount = db.get('SELECT COUNT(*) as count FROM settings') as any;
  if (!settingsCount || settingsCount.count === 0) {
    const defaultSettings = {
      general: {
        podcastName: 'Mein Podcast',
        language: 'de',
        timezone: 'Europe/Berlin',
        dateFormat: 'DD.MM.YYYY',
      },
      storage: { type: 'local', localPath: DATA_DIR },
      backup: { enabled: true, frequency: 'daily', keepDays: 30 },
      appearance: { theme: 'dark', accentColor: '#7c3aed', compactMode: false },
      notifications: { enabled: false, emailEnabled: false },
      podigee: { apiToken: '', podcastSubdomain: '', podcastId: '' },
      branding: { podcastName: '', podcastDescription: '' },
      pdf: {
        primaryColor: '#7c3aed',
        accentColor: '#2563eb',
        headerBg: '#1a1a2e',
        showLogo: true,
        footerText: '',
      },
      workflow: {
        episodeApprovalRequired: false,
        interviewApprovalRequired: false,
        approvalRoles: ['moderator', 'admin'],
      },
    };
    db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['app', JSON.stringify(defaultSettings)]);
  }

  // Default roles
  const rolesCount = db.get('SELECT COUNT(*) as count FROM roles') as any;
  if (!rolesCount || rolesCount.count === 0) {
    const { v4: uuidv4 } = require('uuid');
    const defaultRoles = [
      { name: 'admin', label: 'Administrator', description: 'Vollzugriff auf alle Bereiche', color: '#dc2626', is_system: 1 },
      { name: 'produktion', label: 'Produktion', description: 'Episoden, Media Library, Sponsoring', color: '#7c3aed', is_system: 1 },
      { name: 'redakteur', label: 'Redakteur', description: 'Redaktions-Hub, Episoden bearbeiten', color: '#2563eb', is_system: 1 },
      { name: 'moderator', label: 'Moderator', description: 'Episoden ansehen und bearbeiten', color: '#059669', is_system: 1 },
      { name: 'leser', label: 'Leser', description: 'Nur Lesezugriff', color: '#6b7280', is_system: 1 },
    ];
    for (const role of defaultRoles) {
      const perms = getDefaultPermissions(role.name);
      db.run(
        'INSERT INTO roles (id, name, label, description, color, permissions, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), role.name, role.label, role.description, role.color, JSON.stringify(perms), role.is_system]
      );
    }
    console.log('[DB] Default roles created');
  }

  console.log('[DB] Database initialized at:', DB_PATH);
}

export function getDefaultPermissions(role: string): Record<string, boolean> {
  const base = {
    canViewIdeas: false, canCreateIdeas: false, canEditIdeas: false, canDeleteIdeas: false,
    canViewEditorialPlan: false, canEditEditorialPlan: false,
    canViewInterviews: false, canEditInterviews: false,
    canViewNotes: false, canEditNotes: false,
    canViewEpisodes: false, canCreateEpisodes: false, canEditEpisodes: false, canDeleteEpisodes: false,
    canEditScript: false,
    canViewMedia: false, canUploadMedia: false, canDeleteMedia: false, canCommentMedia: false,
    canViewSponsors: false, canCreateSponsors: false, canEditSponsors: false, canDeleteSponsors: false,
    canViewSponsorReports: false,
    canManageUsers: false, canViewErrorLogs: false, canExport: false, canManageSettings: false,
    canApproveEpisodes: false, canRequestApproval: false,
    canApproveInterviewQuestions: false,
  };

  switch (role) {
    case 'admin':
      return Object.fromEntries(Object.keys(base).map(k => [k, true]));
    case 'redakteur':
      return {
        ...base,
        canViewIdeas: true, canCreateIdeas: true, canEditIdeas: true,
        canViewEditorialPlan: true, canEditEditorialPlan: true,
        canViewInterviews: true, canEditInterviews: true,
        canViewNotes: true, canEditNotes: true,
        canViewEpisodes: true, canCreateEpisodes: true, canEditEpisodes: true,
        canEditScript: true,
        canViewMedia: true, canUploadMedia: true, canCommentMedia: true,
        canViewSponsors: true, canViewSponsorReports: true,
        canExport: true,
        canRequestApproval: true,
      };
    case 'moderator':
      return {
        ...base,
        canViewIdeas: true, canViewEditorialPlan: true, canViewInterviews: true, canViewNotes: true,
        canViewEpisodes: true, canEditEpisodes: true, canEditScript: true,
        canViewMedia: true, canCommentMedia: true,
        canViewSponsors: true, canViewSponsorReports: true,
        canExport: true,
        canApproveEpisodes: true,
        canRequestApproval: true,
        canApproveInterviewQuestions: true,
      };
    case 'produktion':
      return {
        ...base,
        canViewEpisodes: true,
        canViewMedia: true, canCommentMedia: true,
        canViewSponsors: true,
        canExport: true,
      };
    default:
      return base;
  }
}
