#!/usr/bin/env node

/**
 * PodCore v2.11.5 - Demo Data Seeder
 * Lädt realistische Demodaten für Tests und Demonstrationen
 * Start: Januar 2026
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Datenbank-Pfad
const dbPath = path.join(process.env.HOME, '.podcore', 'podcore.db');
const dbDir = path.dirname(dbPath);

// Stelle sicher, dass das Verzeichnis existiert
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✓ Verzeichnis erstellt: ${dbDir}`);
}

// Öffne die Datenbank
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log(`📊 PodCore v2.11.5 - Demo Data Seeder`);
console.log(`📁 Datenbank: ${dbPath}`);
console.log(`📅 Start: Januar 2026\n`);

try {
  // Lese das SQL-Skript
  const sqlFile = path.join(__dirname, 'seed-demo-data.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Teile das SQL in einzelne Statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--'));

  let insertCount = 0;
  let errorCount = 0;

  // Führe jedes Statement aus
  for (const statement of statements) {
    try {
      db.exec(statement);
      if (statement.toUpperCase().startsWith('INSERT')) {
        insertCount++;
      }
    } catch (err) {
      // Ignoriere Fehler bei doppelten Einträgen (UNIQUE constraints)
      if (err.message.includes('UNIQUE constraint failed')) {
        console.log(`⚠️  Eintrag existiert bereits (ignoriert)`);
      } else {
        console.error(`❌ Fehler: ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n✅ Demodaten erfolgreich geladen!`);
  console.log(`   - ${insertCount} INSERT-Statements ausgeführt`);
  console.log(`   - ${errorCount} Fehler (meist doppelte Einträge)\n`);

  // Zeige Statistiken
  console.log(`📈 Datenbank-Statistiken:`);
  console.log(`   - Podcasts: ${db.prepare('SELECT COUNT(*) as count FROM podcasts').get().count}`);
  console.log(`   - Benutzer: ${db.prepare('SELECT COUNT(*) as count FROM users').get().count}`);
  console.log(`   - Sponsoren: ${db.prepare('SELECT COUNT(*) as count FROM sponsors').get().count}`);
  console.log(`   - Werbeplätze: ${db.prepare('SELECT COUNT(*) as count FROM ad_slots').get().count}`);
  console.log(`   - Episoden: ${db.prepare('SELECT COUNT(*) as count FROM episodes').get().count}`);
  console.log(`   - Buchungen: ${db.prepare('SELECT COUNT(*) as count FROM ad_placements').get().count}`);
  console.log(`   - Interview-Fragen: ${db.prepare('SELECT COUNT(*) as count FROM interview_questions').get().count}`);
  console.log(`   - Wiki-Artikel: ${db.prepare('SELECT COUNT(*) as count FROM wiki_articles').get().count}`);

  console.log(`\n🚀 Nächste Schritte:`);
  console.log(`   1. Starten Sie den Server neu: npm start`);
  console.log(`   2. Öffnen Sie die Anwendung im Browser`);
  console.log(`   3. Melden Sie sich als Admin an (user-001: max@techtalkdaily.de)`);
  console.log(`   4. Erkunden Sie die Demodaten\n`);

  db.close();
  process.exit(0);

} catch (err) {
  console.error(`\n❌ Fehler beim Laden der Demodaten:`);
  console.error(err.message);
  db.close();
  process.exit(1);
}
