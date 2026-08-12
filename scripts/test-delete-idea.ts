process.env.PODCORE_DATA_DIR = '/tmp/podcore-delete-idea-test';

import fs from 'fs';
let sequence = 0;
const uuidv4 = () => `test-${Date.now()}-${++sequence}`;
import { getDb } from '../server/database';
import { permanentlyDeleteIdeaData } from '../server/routers/editorial';

const dataDir = '/tmp/podcore-delete-idea-test';
const db = getDb();
const user = db.get('SELECT id FROM users LIMIT 1') as any;
if (!user?.id) throw new Error('Test user missing');
const ideaId = uuidv4();

db.run('INSERT INTO ideas (id, title, description, created_by) VALUES (?, ?, ?, ?)', [ideaId, 'Löschkaskaden-Test', '', user.id]);
db.run('INSERT INTO idea_notes (id, idea_id, content, created_by) VALUES (?, ?, ?, ?)', [uuidv4(), ideaId, 'Testnotiz', user.id]);
db.run('INSERT INTO idea_checklists (id, idea_id, title) VALUES (?, ?, ?)', [uuidv4(), ideaId, 'Testcheck']);
db.run('INSERT INTO idea_topic_drafts (id, idea_id, created_by) VALUES (?, ?, ?)', [uuidv4(), ideaId, user.id]);
db.run('INSERT INTO editorial_text_blocks (id, idea_id, title, content, created_by) VALUES (?, ?, ?, ?, ?)', [uuidv4(), ideaId, 'Testblock', 'Testinhalt', user.id]);

const result = permanentlyDeleteIdeaData(db, ideaId);
const remaining = {
  idea: db.get('SELECT COUNT(*) AS count FROM ideas WHERE id = ?', [ideaId]) as any,
  notes: db.get('SELECT COUNT(*) AS count FROM idea_notes WHERE idea_id = ?', [ideaId]) as any,
  checklist: db.get('SELECT COUNT(*) AS count FROM idea_checklists WHERE idea_id = ?', [ideaId]) as any,
  topicDraft: db.get('SELECT COUNT(*) AS count FROM idea_topic_drafts WHERE idea_id = ?', [ideaId]) as any,
  textBlocks: db.get('SELECT COUNT(*) AS count FROM editorial_text_blocks WHERE idea_id = ?', [ideaId]) as any,
};

if (Object.values(remaining).some(value => Number(value.count) !== 0)) throw new Error(`Löschkaskade unvollständig: ${JSON.stringify(remaining)}`);
console.log(JSON.stringify({ ok: true, result, remaining }, null, 2));
