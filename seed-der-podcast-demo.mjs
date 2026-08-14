import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Auflösung über das Server-Paket, damit der Importer auch im entpackten
// Endnutzerpaket zuverlässig dieselbe SQLite-Bibliothek wie PodCore nutzt.
const require = createRequire(new URL('./server/package.json', import.meta.url));
const { Database } = require('node-sqlite3-wasm');

const DATA_DIR = process.env.PODCORE_DATA_DIR || path.join(os.homedir(), '.podcore');
const DB_PATH = path.join(DATA_DIR, 'podcore.db');
const LOCK_PATH = `${DB_PATH}.lock`;
const PREFIX = 'demo-der-podcast-';

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function json(value) {
  return JSON.stringify(value);
}

function upsert(db, table, columns, values) {
  const placeholders = columns.map(() => '?').join(', ');
  db.run(`INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
}

function readAppSettings(db) {
  const row = db.get("SELECT value FROM settings WHERE key = 'app'");
  if (!row?.value) return {};
  try { return JSON.parse(row.value); } catch (_) { return {}; }
}

function buildEpisodeBlocks() {
  return [
    {
      id: 'demo-block-intro', type: 'intro', title: 'Opener und Begrüßung', duration: 75,
      content: 'Willkommen bei Der Podcast. Hier sprechen wir über die Geschichten, Ideen und Fragen, die uns im Alltag wirklich beschäftigen.',
    },
    {
      id: 'demo-block-hook', type: 'content', title: 'Die Leitfrage', duration: 180,
      content: 'Wann war zuletzt ein Moment, der den eigenen Blick auf ein Thema nachhaltig verändert hat? Wir sammeln drei Perspektiven aus dem Team.',
    },
    {
      id: 'demo-block-ad', type: 'ad', title: 'Mid-Roll: Klangraum Studio', duration: 30,
      content: 'Diese Ausgabe wird unterstützt von Klangraum Studio – Aufnahme, Schnitt und Sounddesign für Formate mit Haltung.',
    },
    {
      id: 'demo-block-interview', type: 'interview', title: 'Gespräch mit Lea Winter', duration: 900,
      content: 'Lea Winter erzählt, wie sie aus einer vagen Idee ein tragfähiges kreatives Projekt entwickelt – und welche Routinen ihr dabei helfen.',
    },
    {
      id: 'demo-block-outro', type: 'outro', title: 'Abschluss und Community-Frage', duration: 90,
      content: 'Welche Idee begleitet dich gerade? Schreib uns deine Perspektive und abonniere Der Podcast für die nächste Folge.',
    },
  ];
}

function main() {
  console.log('--- PodCore Demo-Import: Der Podcast ---');
  console.log(`Datenbank: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    throw new Error('PodCore-Datenbank nicht gefunden. Starte die App zunächst einmal, damit das Schema angelegt wird.');
  }
  if (fs.existsSync(LOCK_PATH)) {
    throw new Error(`SQLite-Sperrverzeichnis erkannt: ${LOCK_PATH}. Beende PodCore vollständig und versuche den Import erneut.`);
  }

  const db = new Database(DB_PATH);
  try {
    const owner = db.get(`
      SELECT id, display_name FROM users
      WHERE is_active = 1
      ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, created_at ASC
      LIMIT 1
    `);
    if (!owner?.id) {
      throw new Error('Kein aktiver PodCore-Nutzer vorhanden. Lege zuerst über den Einrichtungsdialog einen Nutzer an.');
    }

    const existingSettings = readAppSettings(db);
    const appSettings = {
      ...existingSettings,
      general: { ...(existingSettings.general || {}), podcastName: 'Der Podcast', podcastDescription: 'Gespräche über Ideen, Menschen und die Geschichten dazwischen.' },
      branding: { ...(existingSettings.branding || {}), podcastName: 'Der Podcast', podcastDescription: 'Gespräche über Ideen, Menschen und die Geschichten dazwischen.' },
    };

    const dates = {
      previous: isoDate(-21),
      today: isoDate(0),
      recording: isoDate(5),
      planning: isoDate(9),
      publish: isoDate(13),
      future: isoDate(27),
    };

    db.exec('BEGIN IMMEDIATE');

    upsert(db, 'settings', ['key', 'value', 'updated_at'], ['app', json(appSettings), new Date().toISOString()]);

    upsert(db, 'seasons',
      ['id', 'number', 'title', 'description', 'start_date', 'end_date', 'status', 'target_episode_count', 'planning_notes', 'created_by'],
      [`${PREFIX}season-01`, 1, 'Staffel 1: Geschichten, die bleiben', 'Die erste Staffel von Der Podcast widmet sich Menschen, Ideen und Routinen, die den Alltag verändern.', dates.previous, dates.future, 'aktiv', 6, 'Fokus: persönliche Geschichten, klare Dramaturgie und wiederkehrende Community-Frage.', owner.id]);

    const episodePublished = `${PREFIX}episode-001`;
    const episodeRecording = `${PREFIX}episode-002`;
    const episodePlanned = `${PREFIX}episode-003`;

    upsert(db, 'episodes',
      ['id', 'number', 'title', 'subtitle', 'description', 'status', 'recording_date', 'publish_date', 'duration', 'hosts', 'guests', 'tags', 'blocks', 'sponsors', 'notes', 'production_info', 'technical_data', 'approval_status', 'created_by'],
      [episodePublished, 1, 'Der Anfang: Warum wir diesen Podcast machen', 'Eine Einladung zum Zuhören', 'In der Auftaktfolge erklärt das Team, welche Gespräche bei Der Podcast ihren Platz finden und welche Frage jede Folge begleitet.', 'veröffentlicht', dates.previous, dates.previous, 1680, json(['Mara König', 'Jonas Feld']), json([]), json(['Auftakt', 'Haltung', 'Community']), json(buildEpisodeBlocks()), json([]), 'Social-Teaser veröffentlicht, Kapitelmarken eingepflegt.', 'Master: 48 kHz / 24 Bit · Loudness: -16 LUFS · Cover freigegeben.', json({ sampleRate: 48000, bitDepth: 24, loudnessTarget: -16 }), 'freigegeben', owner.id]);

    upsert(db, 'episodes',
      ['id', 'number', 'title', 'subtitle', 'description', 'status', 'recording_date', 'publish_date', 'duration', 'hosts', 'guests', 'tags', 'blocks', 'sponsors', 'notes', 'production_info', 'technical_data', 'approval_status', 'created_by'],
      [episodeRecording, 2, 'Kreativität unter Druck', 'Wie gute Ideen auch dann entstehen, wenn die Zeit knapp ist', 'Ein Gespräch über kreative Routinen, realistische Grenzen und die Kunst, unfertige Ideen sichtbar zu machen.', 'aufnahme-geplant', dates.recording, dates.publish, 2100, json(['Mara König']), json(['Lea Winter']), json(['Kreativität', 'Arbeit', 'Routinen']), json(buildEpisodeBlocks()), json([`${PREFIX}sponsor-klangraum`]), 'Gastbriefing bestätigen, Intro-Atmo auswählen, Freigabe des Sponsorings abwarten.', 'Remote-Aufnahme via Riverside · Backup-Spur aktivieren · Geräuschprofil vorab prüfen.', json({ sampleRate: 48000, bitDepth: 24, recordingMode: 'remote' }), 'ausstehend', owner.id]);

    upsert(db, 'episodes',
      ['id', 'number', 'title', 'subtitle', 'description', 'status', 'recording_date', 'publish_date', 'duration', 'hosts', 'guests', 'tags', 'blocks', 'sponsors', 'notes', 'production_info', 'technical_data', 'approval_status', 'created_by'],
      [episodePlanned, 3, 'Stimmen, die im Kopf bleiben', 'Warum manche Gespräche nachhallen', 'Die Redaktionsfolge untersucht, wodurch persönliche Geschichten glaubwürdig werden und wie Interviewfragen dafür Raum schaffen.', 'entwurf', dates.planning, dates.future, 1800, json(['Jonas Feld']), json([]), json(['Interview', 'Storytelling', 'Gespräch']), json([]), json([]), 'Themenrecherche und potenzielle Gesprächspartner im Redaktions-Hub bündeln.', 'Aufnahme im Studio geplant · zwei Moderationsmikrofone reservieren.', json({ sampleRate: 48000, setup: 'studio' }), 'ausstehend', owner.id]);

    const ideaCreativity = `${PREFIX}idea-kreativitaet`;
    const ideaVoice = `${PREFIX}idea-stimmen`;
    const ideaRitual = `${PREFIX}idea-rituale`;

    upsert(db, 'ideas',
      ['id', 'title', 'description', 'status', 'priority', 'tags', 'assigned_to', 'episode_id', 'target_audience', 'episode_format', 'target_duration', 'target_date', 'created_by'],
      [ideaCreativity, 'Kreativität unter Druck', 'Welche Routinen helfen, wenn die Deadline näher rückt als die zündende Idee? Das Thema wird als Interview mit klaren Praxisbeispielen entwickelt.', 'in-arbeit', 'hoch', json(['Kreativität', 'Routinen', 'Arbeit']), owner.id, episodeRecording, 'Kreative, Selbstständige und Teams mit engem Produktionsrhythmus', 'Interview', 35, dates.publish, owner.id]);
    upsert(db, 'ideas',
      ['id', 'title', 'description', 'status', 'priority', 'tags', 'assigned_to', 'episode_id', 'target_audience', 'episode_format', 'target_duration', 'target_date', 'created_by'],
      [ideaVoice, 'Stimmen, die im Kopf bleiben', 'Eine Gesprächsfolge über emotionale Nähe, offene Fragen und die Verantwortung beim Erzählen persönlicher Geschichten.', 'geplant', 'mittel', json(['Storytelling', 'Interview', 'Ethik']), owner.id, episodePlanned, 'Podcast-Interessierte und Menschen aus Kommunikation, Kultur und Medien', 'Gespräch', 30, dates.future, owner.id]);
    upsert(db, 'ideas',
      ['id', 'title', 'description', 'status', 'priority', 'tags', 'assigned_to', 'target_audience', 'episode_format', 'target_duration', 'target_date', 'created_by'],
      [ideaRitual, 'Das kleine Ritual vor dem Aufnehmen', 'Redaktionsnotiz für eine kurze Solo-Folge: Welche drei Schritte helfen, vor dem Mikrofon ruhig und präsent zu werden?', 'neu', 'niedrig', json(['Solo', 'Produktion', 'Mindset']), owner.id, 'Angehende Podcasterinnen und Podcaster', 'Solo', 18, dates.future, owner.id]);

    for (const [id, title, done, order] of [
      [`${PREFIX}check-01`, 'Gastbriefing mit Lea abstimmen', 1, 1],
      [`${PREFIX}check-02`, 'Fragenpool priorisieren', 1, 2],
      [`${PREFIX}check-03`, 'Aufnahme-Link und Backup-Workflow senden', 0, 3],
      [`${PREFIX}check-04`, 'Sponsoring-Freigabe einholen', 0, 4],
    ]) {
      upsert(db, 'idea_checklists', ['id', 'idea_id', 'title', 'is_done', 'sort_order'], [id, ideaCreativity, title, done, order]);
    }

    upsert(db, 'idea_notes', ['id', 'idea_id', 'content', 'created_by'], [`${PREFIX}idea-note-01`, ideaCreativity, 'Dramaturgie: mit einer konkreten Deadline-Situation beginnen, dann zu Routinen und am Ende zur Community-Frage wechseln.', owner.id]);

    upsert(db, 'editorial_plan',
      ['id', 'episode_id', 'idea_id', 'title', 'planned_date', 'status', 'assigned_to', 'notes'],
      [`${PREFIX}plan-01`, episodeRecording, ideaCreativity, 'Aufnahme: Kreativität unter Druck', dates.recording, 'geplant', owner.id, 'Vormittag: Technikcheck. Nachmittag: Gespräch. Danach Sicherungskopie und Zeitmarken.']);

    upsert(db, 'editorial_plan',
      ['id', 'episode_id', 'idea_id', 'title', 'planned_date', 'status', 'assigned_to', 'notes'],
      [`${PREFIX}plan-02`, episodePlanned, ideaVoice, 'Redaktionsworkshop: Stimmen, die im Kopf bleiben', dates.planning, 'entwurf', owner.id, 'Drei mögliche Gesprächspartnerinnen und einen persönlichen Einstieg vorbereiten.']);

    upsert(db, 'interview_partners',
      ['id', 'name', 'company', 'role', 'email', 'bio', 'tags', 'episodes', 'notes', 'status', 'idea_id', 'guest_intro'],
      [`${PREFIX}partner-lea-winter`, 'Lea Winter', 'Atelier Winter', 'Kreativdirektorin und Autorin', 'lea.winter@example.test', 'Lea Winter entwickelt kreative Konzepte für Kultur- und Bildungsprojekte. Sie spricht offen über Routinen, Umwege und die produktive Seite von Begrenzung.', json(['Kreativität', 'Interview', 'Design']), json([episodeRecording]), 'Einverständnis zur Aufnahme liegt vor. Persönliche Beispiele nur nach vorheriger Abstimmung verwenden.', 'bestätigt', ideaCreativity, 'Lea Winter verbindet kreative Strategie mit einer sehr alltagsnahen Perspektive auf Arbeit und Ideen.']);

    for (const [id, question, category, order] of [
      [`${PREFIX}question-01`, 'Wann merkst du, dass eine Idee tragfähig wird – und wann lässt du sie bewusst liegen?', 'Einstieg', 1],
      [`${PREFIX}question-02`, 'Welche Routine hilft dir, wenn Zeitdruck und Anspruch gleichzeitig steigen?', 'Vertiefung', 2],
      [`${PREFIX}question-03`, 'Wie unterscheidest du zwischen produktivem Zweifel und Selbstblockade?', 'Vertiefung', 3],
      [`${PREFIX}question-04`, 'Welchen kleinen Schritt würdest du Menschen empfehlen, die heute noch anfangen wollen?', 'Abschluss', 4],
    ]) {
      upsert(db, 'interview_questions', ['id', 'partner_id', 'episode_id', 'idea_id', 'question', 'category', 'sort_order', 'answered', 'approved', 'status'], [id, `${PREFIX}partner-lea-winter`, episodeRecording, ideaCreativity, question, category, order, 0, 1, 'freigegeben']);
    }

    upsert(db, 'research_sources',
      ['id', 'title', 'type', 'description', 'content', 'tags', 'related_idea_id', 'related_episode_id', 'status', 'created_by'],
      [`${PREFIX}research-01`, 'Redaktionsnotiz: Kreative Routinen', 'note', 'Interne Sammlung möglicher Gesprächsimpulse.', 'Beobachtung: Konkrete Situationen erzeugen mehr Nähe als allgemeine Erfolgsgeschichten. Für die Aufnahme zwei persönliche Szenen vorbereiten.', json(['Recherche', 'Kreativität']), ideaCreativity, episodeRecording, 'read', owner.id]);

    upsert(db, 'editorial_notes',
      ['id', 'title', 'content', 'category', 'tags', 'is_pinned', 'episode_id', 'created_by'],
      [`${PREFIX}editorial-note-01`, 'Tonality von Der Podcast', 'Nahbar, ruhig und präzise. Nicht schneller sprechen als nötig. Fragen dürfen Pausen zulassen und sollen konkrete Erfahrungen sichtbar machen.', 'Format', json(['Tonality', 'Moderation']), 1, episodeRecording, owner.id]);

    upsert(db, 'ad_categories',
      ['id', 'name', 'description', 'color', 'default_position', 'default_duration', 'presentation_template', 'base_price', 'currency', 'is_active', 'sort_order'],
      [`${PREFIX}ad-category-mid`, 'Mid-Roll Partnersegment', 'Ein kurzes, klar gekennzeichnetes Partnersegment in der Mitte der Episode.', '#7c3aed', 'mid-roll', 30, 'Diese Folge wird unterstützt von {{sponsor}}.', 420, 'EUR', 1, 10]);

    upsert(db, 'sponsors',
      ['id', 'name', 'company', 'contact_name', 'contact_email', 'website', 'status', 'description', 'notes', 'tags', 'total_budget', 'currency', 'color', 'ad_delivery', 'created_by'],
      [`${PREFIX}sponsor-klangraum`, 'Klangraum Studio', 'Klangraum Studio GmbH', 'Nora Brandt', 'nora.brandt@example.test', 'https://example.test/klangraum', 'aktiv', 'Fiktiver Produktionspartner für die Demo-Umgebung.', 'Demo-Partner: Freigabe für eine Mid-Roll in Folge 2 gesetzt.', json(['Audio', 'Produktion', 'Demo']), 1800, 'EUR', '#7c3aed', 'self', owner.id]);

    upsert(db, 'ad_slots',
      ['id', 'sponsor_id', 'name', 'category', 'category_id', 'production_type', 'status', 'duration', 'script', 'price', 'currency', 'start_date', 'end_date', 'target_episodes', 'booked_episodes', 'notes'],
      [`${PREFIX}ad-slot-01`, `${PREFIX}sponsor-klangraum`, 'Klangraum Studio – Mid-Roll', 'mid-roll', `${PREFIX}ad-category-mid`, 'eigenproduktion', 'bestätigt', 30, 'Diese Folge wird unterstützt von Klangraum Studio. Gute Geschichten verdienen guten Klang.', 420, 'EUR', dates.recording, dates.publish, 1, json([episodeRecording]), 'Sprechertext in Episode 2 bei ca. Minute 14 platzieren.']);

    upsert(db, 'episode_ad_bookings',
      ['id', 'episode_id', 'ad_slot_id', 'ad_category_id', 'sponsor_id', 'position', 'script_text', 'presentation_text', 'duration', 'confirmed', 'sort_order'],
      [`${PREFIX}booking-01`, episodeRecording, `${PREFIX}ad-slot-01`, `${PREFIX}ad-category-mid`, `${PREFIX}sponsor-klangraum`, 'mid-roll', 'Diese Folge wird unterstützt von Klangraum Studio. Gute Geschichten verdienen guten Klang.', 'Partnersegment: Klangraum Studio', 30, 1, 1]);

    for (const [id, episodeId, offset, downloads, plays, listeners, note] of [
      [`${PREFIX}stat-01`, episodePublished, -20, 184, 162, 148, 'Veröffentlichungstag'],
      [`${PREFIX}stat-02`, episodePublished, -19, 276, 245, 218, 'Organische Reichweite nach dem ersten Newsletter'],
      [`${PREFIX}stat-03`, episodePublished, -18, 341, 302, 271, 'Social-Clip erzielt überdurchschnittliche Interaktion'],
      [`${PREFIX}stat-04`, episodePublished, -14, 498, 441, 390, 'Stabiler Longtail nach einer Woche'],
    ]) {
      upsert(db, 'podcast_stats', ['id', 'episode_id', 'date', 'downloads', 'plays', 'unique_listeners', 'source', 'notes'], [id, episodeId, isoDate(offset), downloads, plays, listeners, 'manual', note]);
    }

    upsert(db, 'tutorials',
      ['id', 'role', 'roles', 'title', 'description', 'enabled', 'steps', 'created_by', 'source'],
      [`${PREFIX}tutorial-01`, '*', json(['*']), 'Demo-Workflow: Von der Idee zur Episode', 'Dieses kurze Demo-Tutorial zeigt anhand von Der Podcast, wie Ideen, Redaktions-Hub und Episodenplanung zusammenarbeiten.', 1, json([
        { id: 'step-01', title: 'Ideenpool öffnen', description: 'Öffne den Redaktions-Hub und wähle „Kreativität unter Druck“. Dort findest du Recherche, Checkliste und Gastvorbereitung.', target: 'nav-editorial', position: 'right' },
        { id: 'step-02', title: 'Episode prüfen', description: 'Wechsle zur Episode 2. Skriptblöcke, Sponsoring und Freigabestatus sind bereits vorbereitet.', target: 'nav-episodes', position: 'right' },
      ]), owner.id, 'local']);

    db.exec('COMMIT');
    console.log('Demo-Inhalte für „Der Podcast“ wurden erfolgreich importiert.');
    console.log(`Aktiver Besitzer der Demo-Einträge: ${owner.display_name || owner.id}`);
    console.log('Enthalten: 1 Staffel, 3 Episoden, 3 Ideen, Checkliste, Redaktionsplan, Interview, Recherche, Sponsoring, Statistik und Tutorial.');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    try { db.close(); } catch (_) {}
  }
}

try {
  main();
} catch (error) {
  console.error(`Import abgebrochen: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
