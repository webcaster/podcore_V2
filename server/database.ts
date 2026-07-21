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

export { DATA_DIR, DB_PATH, ASSETS_DIR, BACKUPS_DIR, LOGS_DIR };

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
      deleted_at TEXT DEFAULT NULL,
      deleted_by TEXT DEFAULT NULL,
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
      status TEXT NOT NULL DEFAULT 'offen',
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
      is_pool INTEGER NOT NULL DEFAULT 0,
      source_question_id TEXT DEFAULT NULL,
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
      uploaded_by TEXT NOT NULL,
      folder_id TEXT
    );

    CREATE TABLE IF NOT EXISTS media_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      address TEXT,
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
      episode_id TEXT,
      episode_title TEXT,
      episode_number INTEGER,
      position TEXT NOT NULL DEFAULT 'mid-roll',
      confirmed INTEGER NOT NULL DEFAULT 0,
      publish_date TEXT,
      listens INTEGER,
      notes TEXT,
      price REAL DEFAULT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      invoice_number TEXT DEFAULT NULL,
      invoice_date TEXT DEFAULT NULL,
      invoice_status TEXT NOT NULL DEFAULT 'offen',
      invoice_notes TEXT DEFAULT NULL,
      placement_start TEXT DEFAULT NULL,
      placement_end TEXT DEFAULT NULL,
      placement_label TEXT DEFAULT NULL,
      performance_notes TEXT DEFAULT NULL,
      delivery_confirmed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'geplant',
      ad_title TEXT DEFAULT NULL,
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
  // v2.14.4: Strategische Staffelplanung
  try { db.exec('ALTER TABLE seasons ADD COLUMN target_episode_count INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE seasons ADD COLUMN planning_notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN season_plan_item_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE season_plan_items ADD COLUMN episode_number INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS season_plan_items (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    position INTEGER,
    lane TEXT NOT NULL DEFAULT 'lineup',
    title TEXT NOT NULL,
    summary TEXT,
    topics TEXT NOT NULL DEFAULT '[]',
    episode_format TEXT DEFAULT 'offen',
    focus_points TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'kandidat',
    priority TEXT NOT NULL DEFAULT 'mittel',
    planned_date TEXT,
    episode_number INTEGER,
    idea_id TEXT,
    episode_id TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS season_plan_item_partners (
    id TEXT PRIMARY KEY,
    plan_item_id TEXT NOT NULL,
    partner_id TEXT,
    display_name TEXT NOT NULL,
    role_label TEXT,
    confirmation_status TEXT NOT NULL DEFAULT 'offen',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_season_plan_items_season_lane_position ON season_plan_items(season_id, lane, position)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_season_plan_items_idea ON season_plan_items(idea_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_season_plan_items_episode ON season_plan_items(episode_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_season_plan_partners_item ON season_plan_item_partners(plan_item_id, sort_order)'); } catch (_) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS idea_interview_partners (
    idea_id TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (idea_id, partner_id)
  )`); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_idea_interview_partners_partner ON idea_interview_partners(partner_id)'); } catch (_) {}
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
  // v2.12.1: Fehlende Freigabe-Spalten
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_processed_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_processed_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN approval_comment TEXT DEFAULT NULL'); } catch (_) {}
  // Interview questions: add approved/released workflow fields
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approved_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN status TEXT NOT NULL DEFAULT \'offen\''); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approval_requested_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approval_requested_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN approval_notes TEXT DEFAULT NULL'); } catch (_) {}
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
  // Ad placements: add runtime/period fields (v2.7.7)
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN placement_start TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN placement_end TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN placement_label TEXT DEFAULT NULL'); } catch (_) {}
  // Ad placements: add performance/delivery notes (v2.7.7)
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN performance_notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN delivery_confirmed INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  // Ad slots: add invoice_notes
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN invoice_notes TEXT DEFAULT NULL'); } catch (_) {}
  // Sponsors: add customer number
  try { db.exec('ALTER TABLE sponsors ADD COLUMN customer_number TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN folder_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec("ALTER TABLE assets ADD COLUMN markers TEXT NOT NULL DEFAULT '[]'"); } catch (_) {}
  try { db.exec('ALTER TABLE sessions ADD COLUMN last_seen TEXT'); } catch (_) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS media_folders (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  // Sponsors: add contract dates and contact hint
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contract_start TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contract_end TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contact_hint TEXT DEFAULT NULL'); } catch (_) {}
  // Sponsors: add color field
  try { db.exec("ALTER TABLE sponsors ADD COLUMN color TEXT DEFAULT '#059669'"); } catch (_) {}
  // Sponsors: add ad_delivery field
  try { db.exec("ALTER TABLE sponsors ADD COLUMN ad_delivery TEXT DEFAULT 'self'"); } catch (_) {}
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
  // Interviewstatus im RedaktionsHub (z. B. angefragt, bestätigt, abgeschlossen)
  try { db.exec("ALTER TABLE interview_partners ADD COLUMN status TEXT NOT NULL DEFAULT 'offen'"); } catch (_) {}
  // Interview questions: add idea_id field
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN idea_id TEXT DEFAULT NULL'); } catch (_) {}
  // Research sources: add idea_id field (already has related_idea_id)
  // Ensure uploads directory for idea files
  const ideaUploadsDir = path.join(DATA_DIR, 'idea-uploads');
  if (!fs.existsSync(ideaUploadsDir)) fs.mkdirSync(ideaUploadsDir, { recursive: true });

  // Ad categories table (with price list and presentation text)
  try { db.exec(`CREATE TABLE IF NOT EXISTS ad_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#7c3aed',
    default_position TEXT NOT NULL DEFAULT 'mid-roll',
    default_duration INTEGER NOT NULL DEFAULT 30,
    presentation_template TEXT DEFAULT '',
    is_exclusive INTEGER NOT NULL DEFAULT 0,
    base_price REAL,
    price_per_episode REAL,
    price_per_1000_listens REAL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}

  // Episode ad bookings — links confirmed ad placements to episode script sections
  try { db.exec(`CREATE TABLE IF NOT EXISTS episode_ad_bookings (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    ad_slot_id TEXT NOT NULL,
    ad_category_id TEXT,
    sponsor_id TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT 'mid-roll',
    script_text TEXT,
    presentation_text TEXT,
    duration INTEGER,
    confirmed INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}

  // Ad slots: add category_id reference
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN category_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN is_global INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_categories ADD COLUMN is_exclusive INTEGER NOT NULL DEFAULT 0'); } catch (_) {}

  // Ad slots: flexibles Preismodell (v2.10.0)
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN price_model TEXT NOT NULL DEFAULT \'fixed\''); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN base_price REAL DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN price_per_episode REAL DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN price_per_1000_listens REAL DEFAULT NULL'); } catch (_) {}

  // Ad slots: Laufzeit-Felder direkt an der Platzierung (v2.10.0)
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN placement_start TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN placement_end TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_slots ADD COLUMN placement_label TEXT DEFAULT NULL'); } catch (_) {}

  // Sponsors: fehlende Spalten sicherstellen (v2.10.0)
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contract_start TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contract_end TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN contact_hint TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN ad_delivery TEXT DEFAULT \'self\''); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN color TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN customer_number TEXT DEFAULT NULL'); } catch (_) {}

  // episode_ad_bookings: add presentation_text (migration for existing DBs)
  try { db.exec('ALTER TABLE episode_ad_bookings ADD COLUMN presentation_text TEXT DEFAULT NULL'); } catch (_) {}

  // Episodes: add script_ready flag (v2.8.0)
  try { db.exec('ALTER TABLE episodes ADD COLUMN script_ready INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN script_ready_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN script_ready_by TEXT DEFAULT NULL'); } catch (_) {}

  // episode_ad_bookings: add time_position for ad placement planning (v2.9.5)
  try { db.exec('ALTER TABLE episode_ad_bookings ADD COLUMN time_position INTEGER DEFAULT NULL'); } catch (_) {}
  // time_position = seconds from episode start (e.g. 300 = 5:00)

  // Episodes: add show_notes and alt_duration (v2.9.0)
  try { db.exec('ALTER TABLE episodes ADD COLUMN show_notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN alt_duration INTEGER DEFAULT NULL'); } catch (_) {}
  // Episodes: add planned_date and idea_id if not exists (v2.12.11)
  try { db.exec('ALTER TABLE episodes ADD COLUMN planned_date TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE episodes ADD COLUMN idea_id TEXT DEFAULT NULL'); } catch (_) {}

  // PDF Layouts: neue Spalten für v2.9.3 (header_height, line_spacing, divider_style, watermark)
  try { db.exec("ALTER TABLE pdf_layouts ADD COLUMN header_height INTEGER DEFAULT 70"); } catch (_) {}
  try { db.exec("ALTER TABLE pdf_layouts ADD COLUMN line_spacing TEXT DEFAULT 'normal'"); } catch (_) {}
  try { db.exec("ALTER TABLE pdf_layouts ADD COLUMN divider_style TEXT DEFAULT 'line'"); } catch (_) {}
  try { db.exec("ALTER TABLE pdf_layouts ADD COLUMN watermark TEXT DEFAULT NULL"); } catch (_) {}

  // Assets: backfill duration for existing audio files without duration (v2.9.1)
  // Runs asynchronously after DB init to avoid blocking startup
  setImmediate(async () => {
    try {
      const { execFile } = require('child_process');
      const assetsWithoutDuration = db.all(
        "SELECT id, filepath FROM assets WHERE (duration IS NULL OR duration = 0) AND filepath IS NOT NULL"
      ) as any[];
      for (const asset of assetsWithoutDuration) {
        if (!asset.filepath) continue;
        const fs = require('fs');
        if (!fs.existsSync(asset.filepath)) continue;
        await new Promise<void>((resolve) => {
          execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', asset.filepath],
            { timeout: 15000 }, (err: any, stdout: string) => {
              if (!err) {
                try {
                  const data = JSON.parse(stdout);
                  const dur = parseFloat(data?.format?.duration);
                  if (!isNaN(dur) && dur > 0) {
                    db.run('UPDATE assets SET duration = ? WHERE id = ?', [Math.round(dur), asset.id]);
                  }
                } catch (_) {}
              }
              resolve();
            });
        });
      }
      if (assetsWithoutDuration.length > 0) {
        console.log(`[DB] Audio duration backfill: ${assetsWithoutDuration.length} assets processed`);
      }
    } catch (_) {}
  });

  // Media assets: extended metadata fields (v2.9.16)
  try { db.exec('ALTER TABLE assets ADD COLUMN artist TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN album TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN year INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN genre TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN bpm INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN bitrate INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN sample_rate INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN channels INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN language TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN copyright TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN license TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN mood TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN energy TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN notes TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN source_url TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN recording_date TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN location TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN custom_metadata TEXT DEFAULT NULL'); } catch (_) {}
  // Assets: WaveSurfer Regions (v2.10.1)
  try { db.exec('ALTER TABLE assets ADD COLUMN regions TEXT DEFAULT NULL'); } catch (_) {}

  // Chat messages table migration for existing DBs
  try { db.exec('CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT, channel TEXT, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime("now")), FOREIGN KEY (sender_id) REFERENCES users(id), FOREIGN KEY (recipient_id) REFERENCES users(id))'); } catch (_) {}

  // ad_placements: episode_id nullable machen + status + ad_title Spalten (v2.11.1)
  // SQLite kann NOT NULL nicht per ALTER TABLE entfernen → Tabelle neu erstellen
  try {
    const hasNullableEpisode = db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='ad_placements'") as any;
    if (hasNullableEpisode && hasNullableEpisode.sql && hasNullableEpisode.sql.includes('episode_id TEXT NOT NULL')) {
      db.exec(`
        BEGIN;
        CREATE TABLE IF NOT EXISTS ad_placements_new (
          id TEXT PRIMARY KEY,
          ad_slot_id TEXT NOT NULL,
          episode_id TEXT,
          episode_title TEXT,
          episode_number INTEGER,
          position TEXT NOT NULL DEFAULT 'mid-roll',
          confirmed INTEGER NOT NULL DEFAULT 0,
          publish_date TEXT,
          listens INTEGER,
          notes TEXT,
          price REAL DEFAULT NULL,
          currency TEXT NOT NULL DEFAULT 'EUR',
          invoice_number TEXT DEFAULT NULL,
          invoice_date TEXT DEFAULT NULL,
          invoice_status TEXT NOT NULL DEFAULT 'offen',
          invoice_notes TEXT DEFAULT NULL,
          placement_start TEXT DEFAULT NULL,
          placement_end TEXT DEFAULT NULL,
          placement_label TEXT DEFAULT NULL,
          performance_notes TEXT DEFAULT NULL,
          delivery_confirmed INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'geplant',
          ad_title TEXT DEFAULT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO ad_placements_new SELECT
          id, ad_slot_id, episode_id, episode_title, episode_number, position, confirmed,
          publish_date, listens, notes,
          COALESCE(price, NULL), COALESCE(currency, 'EUR'),
          COALESCE(invoice_number, NULL), COALESCE(invoice_date, NULL),
          COALESCE(invoice_status, 'offen'), COALESCE(invoice_notes, NULL),
          COALESCE(placement_start, NULL), COALESCE(placement_end, NULL),
          COALESCE(placement_label, NULL), COALESCE(performance_notes, NULL),
          COALESCE(delivery_confirmed, 0), 'geplant', NULL, created_at
        FROM ad_placements;
        DROP TABLE ad_placements;
        ALTER TABLE ad_placements_new RENAME TO ad_placements;
        COMMIT;
      `);
      console.log('[DB] ad_placements migrated: episode_id nullable, status + ad_title added');
    }
  } catch (e) { console.error('[DB] ad_placements migration failed:', e); }
  // ad_placements: status und ad_title Spalten sicherstellen (falls Tabelle schon neu war)
  try { db.exec("ALTER TABLE ad_placements ADD COLUMN status TEXT NOT NULL DEFAULT 'geplant'"); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN ad_title TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN ad_category_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN listener_fee REAL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN price_adjustment REAL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_placements ADD COLUMN manual_price REAL DEFAULT NULL'); } catch (_) {}

  // ============================================================
  // v2.12.0: Sponsoring-System Überarbeitung
  // ============================================================
  // Neue Tabelle: sponsor_contracts (Sponsoring-Verträge)
  try { db.exec(`CREATE TABLE IF NOT EXISTS sponsor_contracts (
    id TEXT PRIMARY KEY,
    sponsor_id TEXT NOT NULL,
    contract_start TEXT NOT NULL,
    contract_end TEXT NOT NULL,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'aktiv',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
  )`); } catch (_) {}

  // Neue Tabelle: ad_bookings (Konkrete Buchungen)
  try { db.exec(`CREATE TABLE IF NOT EXISTS ad_bookings (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL,
    sponsor_id TEXT NOT NULL,
    episode_id TEXT,
    booking_date TEXT NOT NULL,
    booking_end_date TEXT,
    price REAL NOT NULL DEFAULT 0,
    price_adjustment REAL DEFAULT 0,
    listener_fee REAL DEFAULT 0,
    final_price REAL NOT NULL DEFAULT 0,
    invoice_status TEXT NOT NULL DEFAULT 'offen',
    invoice_number TEXT,
    invoice_date TEXT,
    delivery_confirmed INTEGER NOT NULL DEFAULT 0,
    listener_count INTEGER,
    status TEXT NOT NULL DEFAULT 'geplant',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- slot_id kann ad_slots.id ODER ad_categories.id sein (kein FK-Constraint)
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id),
    FOREIGN KEY (episode_id) REFERENCES episodes(id)
  )`); } catch (_) {}

  // Indizes für bessere Performance
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_sponsor_contracts_sponsor ON sponsor_contracts(sponsor_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ad_bookings_sponsor ON ad_bookings(sponsor_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ad_bookings_episode ON ad_bookings(episode_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ad_bookings_slot ON ad_bookings(slot_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ad_bookings_date ON ad_bookings(booking_date)'); } catch (_) {}
  // v2.12.0: Export-Zeitstempel für Leistungsübersicht
  try { db.exec('ALTER TABLE sponsors ADD COLUMN last_performance_export TEXT DEFAULT NULL'); } catch (_) {}
  // v2.12.0: performance_notes in ad_bookings
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN performance_notes TEXT DEFAULT NULL'); } catch (_) {}
  // v2.12.1: slot_id FK-Constraint entfernen (slot_id kann ad_categories.id ODER ad_slots.id sein)
  // SQLite erlaubt kein ALTER TABLE DROP CONSTRAINT – daher Tabelle neu erstellen
  try {
    const hasFk = db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='ad_bookings'`) as any;
    if (hasFk && hasFk.sql && hasFk.sql.includes('REFERENCES ad_slots')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS ad_bookings_new (
          id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          sponsor_id TEXT NOT NULL,
          episode_id TEXT,
          booking_date TEXT NOT NULL,
          booking_end_date TEXT,
          price REAL NOT NULL DEFAULT 0,
          price_adjustment REAL DEFAULT 0,
          listener_fee REAL DEFAULT 0,
          final_price REAL NOT NULL DEFAULT 0,
          invoice_status TEXT NOT NULL DEFAULT 'offen',
          invoice_number TEXT,
          invoice_date TEXT,
          delivery_confirmed INTEGER NOT NULL DEFAULT 0,
          listener_count INTEGER,
          status TEXT NOT NULL DEFAULT 'geplant',
          notes TEXT,
          performance_notes TEXT,
          contract_id TEXT DEFAULT NULL,
          placement_count INTEGER DEFAULT 1,
          episode_refs TEXT DEFAULT NULL,
          discount REAL DEFAULT 0,
          discount_type TEXT DEFAULT 'absolute',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (sponsor_id) REFERENCES sponsors(id),
          FOREIGN KEY (episode_id) REFERENCES episodes(id)
        );
        INSERT OR IGNORE INTO ad_bookings_new SELECT id, slot_id, sponsor_id, episode_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, invoice_status, invoice_number, invoice_date, delivery_confirmed, listener_count, status, notes, NULL, NULL, 1, NULL, 0, 'absolute', created_at, updated_at FROM ad_bookings;
        DROP TABLE ad_bookings;
        ALTER TABLE ad_bookings_new RENAME TO ad_bookings;
        PRAGMA foreign_keys = ON;
      `);
      console.log('[DB] v2.12.1: ad_bookings FK-Constraint auf ad_slots entfernt');
    }
  } catch (e) { console.error('[DB] v2.12.1 ad_bookings migration error:', e); }

  // v2.12.2: ad_bookings – Vertragszuordnung, Platzierungsanzahl, Folgenreferenzen
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN contract_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN placement_count INTEGER DEFAULT 1'); } catch (_) {}
  // episode_refs: JSON-Array mit Folgenangaben, z.B. [{"episodeId":"...","episodeTitle":"...","count":2}]
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN episode_refs TEXT DEFAULT NULL'); } catch (_) {}
  // v2.12.2: sponsor_contracts – Sponsoring-Art
  try { db.exec('ALTER TABLE sponsor_contracts ADD COLUMN sponsoring_type TEXT DEFAULT NULL'); } catch (_) {}
  // v2.12.3: ad_bookings – Rabatt und Rabatttyp
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN discount REAL DEFAULT 0'); } catch (_) {}
  try { db.exec("ALTER TABLE ad_bookings ADD COLUMN discount_type TEXT DEFAULT 'absolute'"); } catch (_) {}
  // v2.12.7: ad_bookings – Preisanpassung, Hörerbeteiligung, Gesamtfolgen sicherstellen
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN price_adjustment REAL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN listener_fee REAL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE ad_bookings ADD COLUMN total_episodes INTEGER DEFAULT NULL'); } catch (_) {}
  // v2.12.8: sponsor_offers – Angebots-Funktion
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS sponsor_offers (
      id TEXT PRIMARY KEY,
      sponsor_id TEXT NOT NULL,
      title TEXT NOT NULL,
      offer_number TEXT,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'entwurf',
      intro_text TEXT,
      outro_text TEXT,
      positions TEXT NOT NULL DEFAULT '[]',
      total_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'absolute',
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch (_) {}
  // v2.12.9: sponsor_offers – offer_options für Mehrfach-Varianten
  try { db.exec('ALTER TABLE sponsor_offers ADD COLUMN offer_options TEXT DEFAULT NULL'); } catch (_) {}
  // v2.12.3: episode_templates – Episoden-Vorlagen
  try { db.exec(`CREATE TABLE IF NOT EXISTS episode_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    blocks TEXT NOT NULL DEFAULT '[]',
    hosts TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    default_duration INTEGER,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`); } catch (_) {}
  
  // Roles table migration (v2.11.5)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    
    // Default roles if none exist
    const roleCount = db.get('SELECT COUNT(*) as count FROM roles') as any;
    if (!roleCount || roleCount.count === 0) {
      const { v4: uuidv4 } = require('uuid');
      const roles = [
        { name: 'admin', display: 'Administrator', perms: { all: true } },
        { name: 'moderator', display: 'Moderator', perms: { canViewDashboard: true, canViewEpisodes: true, canEditEpisodes: true, canApproveEpisodes: true, canViewSponsors: true, canViewEditorial: true, canApproveInterviews: true, canViewApprovals: true } },
        { name: 'redakteur', display: 'Redakteur', perms: { canViewDashboard: true, canViewEpisodes: true, canEditEpisodes: true, canRequestApproval: true, canViewEditorial: true, canEditEditorial: true, canViewApprovals: true } },
        { name: 'produktion', display: 'Produktion', perms: { canViewDashboard: true, canViewEpisodes: true, canEditEpisodes: true, canViewAssets: true, canEditAssets: true, canViewApprovals: true } }
      ];
      
      roles.forEach(r => {
        db.run('INSERT OR IGNORE INTO roles (id, name, display_name, permissions) VALUES (?, ?, ?, ?)', 
          [uuidv4(), r.name, r.display, JSON.stringify(r.perms)]);
      });
    }
  } catch (_) {}

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
      sponsoring: {
        offerNumbering: {
          prefix: 'ANG',
          separator: '-',
          includeYear: true,
          paddingDigits: 3,
          nextNumber: 1,
        },
      },
    };
    db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['app', JSON.stringify(defaultSettings)]);
  }

  // Roles migration: nur neue Permissions-Keys ergänzen, gespeicherte Werte NICHT überschreiben
  // Gespeicherte Benutzer-Anpassungen bleiben erhalten
  try {
    const existingRoles = db.all('SELECT id, name, is_system FROM roles') as any[];
    for (const role of existingRoles) {
      const latestPerms = getDefaultPermissions(role.name);
      const currentRow = db.get('SELECT permissions FROM roles WHERE id = ?', [role.id]) as any;
      let currentPerms: Record<string, boolean> = {};
      try { currentPerms = JSON.parse(currentRow?.permissions || '{}'); } catch (_) {}
      // Nur neue Keys aus latestPerms ergänzen, vorhandene Werte NICHT überschreiben
      // Ausnahme: Wenn die Rolle noch gar keine Permissions hat (leeres Objekt)
      const hasCustomPerms = Object.keys(currentPerms).length > 0;
      if (!hasCustomPerms) {
        // Noch keine Permissions gesetzt → Defaults eintragen
        db.run('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(latestPerms), role.id]);
      } else {
        // Nur neue Keys ergänzen (die in latestPerms stehen, aber noch nicht in currentPerms)
        const merged = { ...latestPerms, ...currentPerms };
        db.run('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(merged), role.id]);
      }
    }
    if (existingRoles.length > 0) console.log('[DB] Roles permissions migration checked (v2.12.11)');
  } catch (e) { console.error('[DB] Roles migration error:', e); }

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

  // Seed default ad_categories if empty
  try {
    const catCount = db.get('SELECT COUNT(*) as count FROM ad_categories') as any;
    if (!catCount || catCount.count === 0) {
      const { v4: uuidv4 } = require('uuid');
      const defaultCategories = [
        {
          id: uuidv4(), name: 'Pre-Roll', description: 'Pre-Roll – Kategorie Sponsor, oder Eigenwerbung Kurz',
          color: '#3b82f6', default_position: 'pre-roll', default_duration: 15,
          presentation_template: '', is_exclusive: 0,
          base_price: 50.00, price_per_episode: 60.00, price_per_1000_listens: 12.00,
          currency: 'EUR', is_active: 1, sort_order: 1
        },
        {
          id: uuidv4(), name: 'Mid-Roll', description: 'Mid-Roll // Hauptwerbeplatz',
          color: '#f97316', default_position: 'mid-roll', default_duration: 30,
          presentation_template: '', is_exclusive: 0,
          base_price: 80.00, price_per_episode: 100.00, price_per_1000_listens: 18.00,
          currency: 'EUR', is_active: 1, sort_order: 2
        },
        {
          id: uuidv4(), name: 'Post-Roll', description: 'Post-Roll',
          color: '#22c55e', default_position: 'post-roll', default_duration: 15,
          presentation_template: '', is_exclusive: 0,
          base_price: 30.00, price_per_episode: 40.00, price_per_1000_listens: 8.00,
          currency: 'EUR', is_active: 1, sort_order: 3
        },
        {
          id: uuidv4(), name: 'Host-Read', description: 'Persönlich vom Moderator gesprochen in der laufenden Episode.',
          color: '#a855f7', default_position: 'mid-roll', default_duration: 90,
          presentation_template: '', is_exclusive: 0,
          base_price: 120.00, price_per_episode: 150.00, price_per_1000_listens: 40.00,
          currency: 'EUR', is_active: 1, sort_order: 4
        },
        {
          id: uuidv4(), name: 'Folgensponsoring', description: 'Folgensponsoring - Exklusiv',
          color: '#ef4444', default_position: 'pre-roll', default_duration: 30,
          presentation_template: '', is_exclusive: 1,
          base_price: 150.00, price_per_episode: 200.00, price_per_1000_listens: 25.00,
          currency: 'EUR', is_active: 1, sort_order: 5
        },
      ];
      for (const cat of defaultCategories) {
        db.run(
          `INSERT INTO ad_categories (id, name, description, color, default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, currency, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.description, cat.color, cat.default_position, cat.default_duration, cat.presentation_template, cat.is_exclusive, cat.base_price, cat.price_per_episode, cat.price_per_1000_listens, cat.currency, cat.is_active, cat.sort_order]
        );
      }
      console.log('[DB] Default ad_categories seeded (5 categories)');
    }
    // Clean up legacy text from existing rows
    db.run("UPDATE ad_categories SET presentation_template = '' WHERE presentation_template = 'präsentiert von'");
  } catch (e) { console.error('[DB] Ad categories seed error:', e); }

  // ============================================================
  // v2.14.0: Episoden-Editor, Zusammenarbeit und Automatisierung
  // ============================================================
  try { db.exec(`CREATE TABLE IF NOT EXISTS episode_revisions (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    changed_fields TEXT NOT NULL DEFAULT '[]',
    change_type TEXT NOT NULL DEFAULT 'update',
    changed_by TEXT,
    changed_by_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    UNIQUE (episode_id, revision_number)
  )`); } catch (_) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS episode_comments (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    field_key TEXT NOT NULL DEFAULT 'general',
    parent_id TEXT,
    content TEXT NOT NULL,
    mentions TEXT NOT NULL DEFAULT '[]',
    is_resolved INTEGER NOT NULL DEFAULT 0,
    resolved_by TEXT,
    resolved_at TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES episode_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
  )`); } catch (_) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`); } catch (_) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS episode_media_links (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'source',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE (episode_id, asset_id)
  )`); } catch (_) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS audio_analysis_jobs (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    source TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    result TEXT,
    error TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`); } catch (_) {}

  // Zeitstempel-Zuordnung für Interviewfragen.
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN timestamp_seconds INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN timestamp_source TEXT DEFAULT NULL'); } catch (_) {}
  // Allgemeiner Fragen-Pool und nachvollziehbare Wiederverwendung bei Interviewpartnern.
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN is_pool INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE interview_questions ADD COLUMN source_question_id TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_interview_questions_pool ON interview_questions(is_pool, category, sort_order)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_interview_questions_source_partner ON interview_questions(source_question_id, partner_id)'); } catch (_) {}

  // Zusätzliche, optionale Targeting-Felder für nachvollziehbares Sponsor-Matching.
  try { db.exec("ALTER TABLE sponsors ADD COLUMN target_tags TEXT NOT NULL DEFAULT '[]'"); } catch (_) {}
  try { db.exec("ALTER TABLE sponsors ADD COLUMN target_categories TEXT NOT NULL DEFAULT '[]'"); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN target_audience TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec("ALTER TABLE sponsors ADD COLUMN preferred_formats TEXT NOT NULL DEFAULT '[]'"); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN min_episode_duration INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN max_episode_duration INTEGER DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN address TEXT DEFAULT NULL'); } catch (_) {}

  try { db.exec('CREATE INDEX IF NOT EXISTS idx_episode_revisions_episode ON episode_revisions(episode_id, revision_number DESC)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_episode_comments_episode_field ON episode_comments(episode_id, field_key, created_at)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_episode_media_links_episode ON episode_media_links(episode_id, sort_order)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_audio_analysis_episode ON audio_analysis_jobs(episode_id, created_at DESC)'); } catch (_) {}

  // ============================================================
  // v2.14.1: Themenwerkstatt und wiederverwendbare Textbausteine
  // ============================================================
  try { db.exec(`CREATE TABLE IF NOT EXISTS idea_topic_drafts (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL UNIQUE,
    angle TEXT,
    guiding_question TEXT,
    core_thesis TEXT,
    audience_value TEXT,
    working_titles TEXT NOT NULL DEFAULT '[]',
    teaser TEXT,
    episode_description TEXT,
    show_notes TEXT,
    call_to_action TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
  )`); } catch (_) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS editorial_text_blocks (
    id TEXT PRIMARY KEY,
    idea_id TEXT,
    title TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'custom',
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
  )`); } catch (_) {}

  try { db.exec('CREATE INDEX IF NOT EXISTS idx_topic_drafts_idea ON idea_topic_drafts(idea_id)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_editorial_text_blocks_idea_type ON editorial_text_blocks(idea_id, block_type, updated_at DESC)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_editorial_text_blocks_global ON editorial_text_blocks(block_type, is_favorite, updated_at DESC)'); } catch (_) {}

  // v2.14.8: Papierkorb für Ideenmappen. Ein Löschen bleibt wiederherstellbar,
  // während verknüpfte Recherche, Dateien, Fragen und Checklisten erhalten bleiben.
  try { db.exec('ALTER TABLE ideas ADD COLUMN deleted_at TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('ALTER TABLE ideas ADD COLUMN deleted_by TEXT DEFAULT NULL'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ideas_deleted_at ON ideas(deleted_at, updated_at DESC)'); } catch (_) {}

  console.log('[DB] Database initialized at:', DB_PATH);
}

export function getDefaultPermissions(role: string): Record<string, boolean> {
  const base = {
    canViewIdeas: false, canCreateIdeas: false, canEditIdeas: false, canDeleteIdeas: false,
    canViewEditorialPlan: false, canEditEditorialPlan: false,
    canViewInterviews: false, canEditInterviews: false,
    canViewNotes: false, canEditNotes: false,
    canViewSeasonPlanning: false, canEditSeasonPlanning: false, canExportSeasonPlanning: false, canTransitionSeasonPlanningToEpisode: false,
    canViewEpisodes: false, canCreateEpisodes: false, canEditEpisodes: false, canDeleteEpisodes: false,
    canEditScript: false,
    canViewMedia: false, canUploadMedia: false, canDeleteMedia: false, canCommentMedia: false,
    canViewSponsors: false, canCreateSponsors: false, canEditSponsors: false, canDeleteSponsors: false,
    canViewSponsorReports: false,
    canManageUsers: false, canViewErrorLogs: false, canExport: false, canManageSettings: false,
    canApproveEpisodes: false, canRequestApproval: false,
    canApproveInterviewQuestions: false,
    // Sponsoring-Erweiterungen (v2.7.x)
    canManageSponsors: false,
    canViewInvoices: false, canCreateInvoices: false, canEditInvoices: false,
    canExportPricelist: false,
    canManagePdfLayouts: false,
    // Episoden-Editor-Erweiterungen (v2.7.x)
    canManageBlocks: false,
    canUseMediaLibraryInEditor: false,
    // v2.9.0 – neue Berechtigungen
    canEditShowNotes: false,
    canManageInterviewBlocks: false,
    // v2.9.16 – Media Library & Werbung
    canEditMediaMetadata: false,
    canUseAudioEditor: false,
    canExportMarkers: false,
    canManageAdBookings: false,
    canBookAds: false,
    canViewAdBookings: false,
    // Sponsoring-System v2.12.0
    canManageSponsorContracts: false,
    canManageAdBookingsV2: false,
    canViewSponsorContracts: false,
    // Sponsoring-System v2.12.13 – Angebote
    canManageSponsorOffers: false,
    canViewSponsorOffers: false,
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
        canViewSeasonPlanning: true, canEditSeasonPlanning: true, canExportSeasonPlanning: true, canTransitionSeasonPlanningToEpisode: true,
        canViewEpisodes: true, canCreateEpisodes: true, canEditEpisodes: true,
        canEditScript: true,
        canViewMedia: true, canUploadMedia: true, canCommentMedia: true,
        canViewSponsors: true, canEditSponsors: true, canViewSponsorReports: true,
        canExport: true,
        canRequestApproval: true,
        canViewInvoices: true,
        canExportPricelist: true,
        canManageBlocks: true,
        canUseMediaLibraryInEditor: true,
        canEditShowNotes: true,
        canManageInterviewBlocks: true,
        // v2.9.16
        canEditMediaMetadata: true,
        canUseAudioEditor: true,
        canExportMarkers: true,
        canBookAds: true,
        canViewAdBookings: true,
        // v2.12.0
        canViewSponsorContracts: true,
        canManageAdBookingsV2: true,
        // v2.12.13
        canViewSponsorOffers: true,
        canManageSponsorOffers: true,
      };
    case 'moderator':
      return {
        ...base,
        canViewIdeas: true, canViewEditorialPlan: true, canViewInterviews: true, canViewNotes: true, canEditNotes: true,
        canViewSeasonPlanning: true, canExportSeasonPlanning: true,
        canViewEpisodes: true, canEditEpisodes: true, canEditScript: true,
        canViewMedia: true, canCommentMedia: true,
        canViewSponsors: true, canEditSponsors: true, canViewSponsorReports: true,
        canExport: true,
        canApproveEpisodes: true,
        canRequestApproval: true,
        canApproveInterviewQuestions: true,
        canViewInvoices: true,
        canExportPricelist: true,
        canManageBlocks: true,
        canUseMediaLibraryInEditor: true,
        canEditShowNotes: true,
        canManageInterviewBlocks: true,
        // v2.9.16
        canEditMediaMetadata: true,
        canUseAudioEditor: true,
        canExportMarkers: true,
        canManageAdBookings: true,
        canBookAds: true,
        canViewAdBookings: true,
        // v2.12.0
        canViewSponsorContracts: true,
        canManageSponsorContracts: true,
        canManageAdBookingsV2: true,
        // v2.12.13
        canViewSponsorOffers: true,
        canManageSponsorOffers: true,
      };
    case 'produktion':
      return {
        ...base,
        canViewEpisodes: true, canCreateEpisodes: true, canEditEpisodes: true,
        canViewSeasonPlanning: false, canEditSeasonPlanning: false, canExportSeasonPlanning: false, canTransitionSeasonPlanningToEpisode: false,
        canEditScript: true,
        canViewMedia: true, canUploadMedia: true, canDeleteMedia: true, canCommentMedia: true,
        canViewSponsors: true, canEditSponsors: true, canViewSponsorReports: true,
        canExport: true,
        canManageBlocks: true,
        canUseMediaLibraryInEditor: true,
        canEditShowNotes: true,
        canManageInterviewBlocks: true,
        canViewInvoices: true,
        canExportPricelist: true,
        // v2.9.16
        canEditMediaMetadata: true,
        canUseAudioEditor: true,
        canExportMarkers: true,
        canViewAdBookings: true,
        // v2.12.0
        canViewSponsorContracts: true,
        canManageAdBookingsV2: true,
        // v2.12.13
        canViewSponsorOffers: true,
      };
    default:
      return base;
  }
}
