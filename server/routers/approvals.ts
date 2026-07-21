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
