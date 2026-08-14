import { Database } from 'node-sqlite3-wasm';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DATA_DIR = process.env.PODCORE_DATA_DIR || path.join(os.homedir(), '.podcore');
const DB_PATH = path.join(DATA_DIR, 'podcore.db');
const SQL_PATH = './seed-demo-data.sql';

async function seed() {
  console.log('--- PodCore Demo-Daten Import ---');
  console.log(`Datenbank: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('Fehler: Datenbank nicht gefunden. Bitte starte PodCore zuerst einmal, um das Schema zu initialisieren.');
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const db = new Database(DB_PATH);

  try {
    // SQL in einzelne Statements aufteilen (einfache Variante)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Importiere ${statements.length} Statements...`);
    
    for (const statement of statements) {
      db.exec(statement);
    }

    console.log('✅ Demo-Daten erfolgreich importiert!');
    console.log('\nStandard-Nutzer (Passwort: password):');
    console.log('- max (Admin)');
    console.log('- sarah (Redakteur)');
    console.log('- tom (Moderator)');
  } catch (error) {
    console.error('❌ Fehler beim Import:', error.message);
  }
}

seed();
