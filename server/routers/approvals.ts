import express, { Response } from 'express';
import { getDb } from '../database';
import { requirePermission, AuthRequest } from '../middleware/auth';

const router = express.Router();

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
router.get('/pending', requirePermission('canApproveEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  
  // 1. Episoden mit Status 'angefragt'
  const episodes = db.all(
    `SELECT * FROM episodes WHERE approval_status = 'angefragt' ORDER BY approval_requested_at ASC`,
    []
  ).map(parseEpisode);
  
  // 2. Interview-Fragen mit Status 'angefragt' (oder approved = 0 falls status noch nicht migriert)
  // Wir prüfen beides für maximale Kompatibilität während der Migration
  const questions = db.all(
    `SELECT q.*, p.name as partner_name, e.title as episode_title 
     FROM interview_questions q
     LEFT JOIN interview_partners p ON q.partner_id = p.id
     LEFT JOIN episodes e ON q.episode_id = e.id
     WHERE q.approved = 0 AND (q.status = 'angefragt' OR q.status IS NULL)
     ORDER BY q.created_at ASC`,
    []
  ).map((r: any) => ({
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
      totalCount: episodes.length + questions.length
    }
  });
});

export default router;
