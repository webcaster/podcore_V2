import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

// GET /api/chat/channels — list available channels + unread count
router.get('/channels', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  // Built-in channels
  const channels = [
    { id: 'allgemein', name: 'Allgemein', description: 'Allgemeine Teamkommunikation', icon: 'hash' },
    { id: 'redaktion', name: 'Redaktion', description: 'Redaktionelle Abstimmungen', icon: 'edit' },
    { id: 'technik', name: 'Technik', description: 'Technische Themen', icon: 'settings' },
    { id: 'ankuendigungen', name: 'Ankündigungen', description: 'Wichtige Mitteilungen', icon: 'bell' },
  ];

  // Add unread count per channel
  const channelsWithUnread = channels.map(ch => {
    const unread = (db.get(
      `SELECT COUNT(*) as count FROM chat_messages WHERE channel = ? AND sender_id != ? AND is_read = 0`,
    // Note: users table uses display_name not name
      [ch.id, userId]
    ) as any)?.count || 0;
    const lastMsg = db.get(
      `SELECT m.message, m.created_at, u.display_name as sender_name FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.channel = ? ORDER BY m.created_at DESC LIMIT 1`,
    // Note: users table uses display_name not name
      [ch.id]
    ) as any;
    const rawTime = lastMsg?.created_at || null;
    const lastMessageTime = rawTime ? (rawTime.endsWith('Z') ? rawTime : rawTime.replace(' ', 'T') + 'Z') : null;
    return { ...ch, unread, lastMessage: lastMsg?.message || null, lastMessageTime, lastMessageSender: lastMsg?.sender_name || null };
  });

  return res.json({ success: true, data: channelsWithUnread });
});

// GET /api/chat/messages/:channel — get messages for a channel
router.get('/messages/:channel', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { channel } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  let query = `SELECT m.*, u.display_name as sender_name, u.role as sender_role 
               FROM chat_messages m JOIN users u ON u.id = m.sender_id 
               WHERE m.channel = ?`;
  const params: any[] = [channel];

  if (before) {
    query += ` AND m.created_at < ?`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(limit);

  const messages = db.all(query, params) as any[];

  // Mark messages as read
  db.run(
    `UPDATE chat_messages SET is_read = 1 WHERE channel = ? AND sender_id != ? AND is_read = 0`,
    [channel, req.user!.id]
  );

  return res.json({
    success: true,
    data: messages.reverse().map((m: any) => ({
      id: m.id,
      message: m.message,
      channel: m.channel,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      isRead: m.is_read === 1,
      createdAt: m.created_at.endsWith('Z') ? m.created_at : m.created_at.replace(' ', 'T') + 'Z',
    }))
  });
});

// POST /api/chat/messages — send a message
router.post('/messages', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { channel, message } = req.body;

  if (!channel || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'Kanal und Nachricht erforderlich' });
  }

  const validChannels = ['allgemein', 'redaktion', 'technik', 'ankuendigungen'];
  if (!validChannels.includes(channel)) {
    return res.status(400).json({ success: false, error: 'Ungültiger Kanal' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO chat_messages (id, sender_id, channel, message, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    [id, req.user!.id, channel, message.trim(), new Date().toISOString()]
  );

  const msg = db.get(
    `SELECT m.*, u.display_name as sender_name, u.role as sender_role FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    [id]
  ) as any;

  return res.status(201).json({
    success: true,
    data: {
      id: msg.id, message: msg.message, channel: msg.channel,
      senderId: msg.sender_id, senderName: msg.sender_name, senderRole: msg.sender_role,
      isRead: false, createdAt: msg.created_at.endsWith('Z') ? msg.created_at : msg.created_at.replace(' ', 'T') + 'Z',
    }
  });
});

// DELETE /api/chat/messages/:id — delete own message
router.delete('/messages/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const msg = db.get('SELECT * FROM chat_messages WHERE id = ?', [req.params.id]) as any;

  if (!msg) return res.status(404).json({ success: false, error: 'Nachricht nicht gefunden' });

  const isAdmin = req.user!.role === 'admin';
  if (msg.sender_id !== req.user!.id && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  }

  db.run('DELETE FROM chat_messages WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Nachricht gelöscht' });
});

// GET /api/chat/unread — total unread count for current user
router.get('/unread', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const count = (db.get(
    `SELECT COUNT(*) as count FROM chat_messages WHERE sender_id != ? AND is_read = 0`,
    [req.user!.id]
  ) as any)?.count || 0;
  return res.json({ success: true, data: { count } });
});

export default router;
