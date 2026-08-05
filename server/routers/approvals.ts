import express, { Response } from 'express';
import { getDb } from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: import("express").Router = express.Router();

// Hilfsfunktion für Episoden-Parsing (kopiert aus episodes.ts für Konsistenz)
function parseEpisode(row: any) {
  if (!row) return null;
  return {
    ...row,
    hosts: JSON.parse(row.hosts || '[]'),
    guests: JSON.parse(row.guests || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    blocks: JSON.parse(row.blocks || '[]'),
    sponsors: JSON.parse(row.sponsors || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishDate: row.publish_date,
    recordingDate: row.recording_date,
    approvalStatus: row.approval_status || 'entwurf',
    approvalRequestedAt: row.approval_requested_at,
    approvalProcessedAt: row.approval_processed_at,
    approvalProcessedBy: row.approval_processed_by,
    approvalComment: row.approval_comment
  };
}

// Hilfsfunktion: Erstelle Benachrichtigung für Freigabeanfrage
function createApprovalNotification(db: any, type: 'episode' | 'question', itemId: string, requestedBy: string, message: string): void {
  try {
    // Finde alle Benutzer mit Genehmigungsrechten
    const approvers = db.all(
      `SELECT id FROM users WHERE role = 'admin' OR json_extract(permissions, '$.canApproveEpisodes') = 1 OR json_extract(permissions, '$.canApproveInterviewQuestions') = 1`,
      []
    ) as any[];

    const notificationId = require('uuid').v4();
    const now = new Date().toISOString();

    for (const approver of approvers) {
      db.run(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          require('uuid').v4(),
          approver.id,
          `approval_${type}`,
          `Freigabe angefordert: ${type === 'episode' ? 'Episode' : 'Interview-Frage'}`,
          message,
          JSON.stringify({ itemId, type, requestedBy }),
          now,
          now,
        ]
      );
    }
  } catch (err) {
    console.error('Fehler beim Erstellen der Benachrichtigung:', err);
  }
}

// GET /api/approvals/pending — Alle ausstehenden Freigaben (Episoden & Interview-Fragen)
// Zugänglich für: Admin, Moderator (canApproveEpisodes) und Redakteure (canRequestApproval)
// Redakteure sehen nur ihre eigenen Anfragen; Moderatoren/Admins sehen alle
router.get('/pending', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const canApproveEpisodes = user.role === 'admin' || user.permissions?.canApproveEpisodes;
  const canApproveQuestions = user.role === 'admin' || user.permissions?.canApproveInterviewQuestions;
  const isApprover = canApproveEpisodes || canApproveQuestions;
  const canRequest = user.role === 'admin' || user.permissions?.canRequestApproval;

  // Wenn weder Freigabe-Recht noch Anfrage-Recht → leere Liste zurückgeben (kein Fehler)
  if (!isApprover && !canRequest) {
    return res.json({
      success: true,
      data: { episodes: [], questions: [], totalCount: 0 }
    });
  }

  // 1. Episoden mit Status 'angefragt'
  // Redakteure sehen nur ihre eigenen Anfragen
  let episodeQuery = `SELECT * FROM episodes WHERE approval_status = 'angefragt'`;
  const episodeParams: any[] = [];
  if (!isApprover && canRequest) {
    episodeQuery += ` AND approval_requested_by = ?`;
    episodeParams.push(user.id);
  }
  episodeQuery += ` ORDER BY approval_requested_at ASC`;

  const episodes = db.all(episodeQuery, episodeParams).map(parseEpisode);

  // 2. Interview-Fragen, für die eine Freigabe explizit angefordert wurde
  let questionQuery = `SELECT q.*, p.name as partner_name, e.title as episode_title 
     FROM interview_questions q
     LEFT JOIN interview_partners p ON q.partner_id = p.id
     LEFT JOIN episodes e ON q.episode_id = e.id
     WHERE q.is_pool = 0 AND q.approved = 0 AND q.status = 'angefragt'`;
  const questionParams: any[] = [];
  if (!isApprover && canRequest) {
    questionQuery += ` AND q.approval_requested_by = ?`;
    questionParams.push(user.id);
  }
  questionQuery += ` ORDER BY q.approval_requested_at ASC, q.created_at ASC`;

  const questions = db.all(questionQuery, questionParams).map((r: any) => ({
    ...r,
    approved: r.approved === 1,
    partnerName: r.partner_name,
    episodeTitle: r.episode_title,
    createdAt: r.created_at
  }));

  return res.json({
    success: true,
    data: {
      episodes,
      questions,
      totalCount: episodes.length + questions.length,
      canApprove: isApprover,
      canApproveEpisodes,
      canApproveQuestions,
    }
  });
});

export default router;


// POST /api/approvals/episodes/:id/request — Fordere Freigabe für Episode an
router.post('/episodes/:id/request', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const episodeId = req.params.id;
  const { comment } = req.body;

  // Prüfe ob Episode existiert
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canRequestApproval) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung zur Freigabeanfrage' });
  }

  // Setze Freigabestatus
  db.run(
    `UPDATE episodes SET approval_status = 'angefragt', approval_requested_by = ?, approval_requested_at = datetime('now'), approval_comment = ?, updated_at = datetime('now') WHERE id = ?`,
    [user.id, comment || null, episodeId]
  );

  // Erstelle Benachrichtigung
  const episodeTitle = episode.title || `Episode ${episode.number}`;
  createApprovalNotification(db, 'episode', episodeId, user.id, `${user.displayName || user.username} hat die Freigabe für "${episodeTitle}" angefordert.`);

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  return res.json({
    success: true,
    data: parseEpisode(updated),
    message: 'Freigabeanfrage erstellt und Benachrichtigungen versendet',
  });
});

// POST /api/approvals/questions/:id/request — Fordere Freigabe für Interview-Frage an
router.post('/questions/:id/request', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const questionId = req.params.id;
  const { comment } = req.body;

  // Prüfe ob Frage existiert
  const question = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  if (!question) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canRequestApproval) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung zur Freigabeanfrage' });
  }

  // Setze Freigabestatus
  db.run(
    `UPDATE interview_questions SET status = 'angefragt', approval_requested_by = ?, approval_requested_at = datetime('now'), approval_notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [user.id, comment || null, questionId]
  );

  // Erstelle Benachrichtigung
  const partnerName = question.partner_id ? db.get('SELECT name FROM interview_partners WHERE id = ?', [question.partner_id])?.name : 'Unbekannt';
  createApprovalNotification(db, 'question', questionId, user.id, `${user.displayName || user.username} hat die Freigabe für eine Frage zu "${partnerName}" angefordert.`);

  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  return res.json({
    success: true,
    data: updated,
    message: 'Freigabeanfrage erstellt und Benachrichtigungen versendet',
  });
});

// POST /api/approvals/episodes/:id/approve — Genehmige Episode
router.post('/episodes/:id/approve', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const episodeId = req.params.id;
  const { comment } = req.body;

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canApproveEpisodes) {
    return res.status(403).json({ success: false, error: 'Keine Genehmigungsberechtigung' });
  }

  // Prüfe ob Episode existiert
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  // Genehmige Episode
  db.run(
    `UPDATE episodes SET approval_status = 'genehmigt', approval_processed_by = ?, approval_processed_at = datetime('now'), approval_comment = ?, updated_at = datetime('now') WHERE id = ?`,
    [user.id, comment || null, episodeId]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  return res.json({
    success: true,
    data: parseEpisode(updated),
    message: 'Episode genehmigt',
  });
});

// POST /api/approvals/episodes/:id/reject — Lehne Episode ab
router.post('/episodes/:id/reject', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const episodeId = req.params.id;
  const { comment } = req.body;

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canApproveEpisodes) {
    return res.status(403).json({ success: false, error: 'Keine Genehmigungsberechtigung' });
  }

  // Prüfe ob Episode existiert
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  // Lehne Episode ab
  db.run(
    `UPDATE episodes SET approval_status = 'abgelehnt', approval_processed_by = ?, approval_processed_at = datetime('now'), approval_comment = ?, updated_at = datetime('now') WHERE id = ?`,
    [user.id, comment || null, episodeId]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  return res.json({
    success: true,
    data: parseEpisode(updated),
    message: 'Episode abgelehnt',
  });
});

// POST /api/approvals/questions/:id/approve — Genehmige Interview-Frage
router.post('/questions/:id/approve', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const questionId = req.params.id;
  const { comment } = req.body;

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canApproveInterviewQuestions) {
    return res.status(403).json({ success: false, error: 'Keine Genehmigungsberechtigung' });
  }

  // Prüfe ob Frage existiert
  const question = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  if (!question) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  // Genehmige Frage
  db.run(
    `UPDATE interview_questions SET approved = 1, approved_by = ?, approved_at = datetime('now'), approval_notes = ?, status = 'genehmigt', updated_at = datetime('now') WHERE id = ?`,
    [user.id, comment || null, questionId]
  );

  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  return res.json({
    success: true,
    data: updated,
    message: 'Frage genehmigt',
  });
});

// POST /api/approvals/questions/:id/reject — Lehne Interview-Frage ab
router.post('/questions/:id/reject', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const questionId = req.params.id;
  const { comment } = req.body;

  // Prüfe Berechtigung
  if (user.role !== 'admin' && !user.permissions?.canApproveInterviewQuestions) {
    return res.status(403).json({ success: false, error: 'Keine Genehmigungsberechtigung' });
  }

  // Prüfe ob Frage existiert
  const question = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  if (!question) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  // Lehne Frage ab
  db.run(
    `UPDATE interview_questions SET status = 'abgelehnt', approval_notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [comment || null, questionId]
  );

  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [questionId]) as any;
  return res.json({
    success: true,
    data: updated,
    message: 'Frage abgelehnt',
  });
});
