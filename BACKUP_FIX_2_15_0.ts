// ============================================================
// BACKUP IMPORT FIXES FOR v2.15.0
// ============================================================
// This file contains the corrected import/full endpoint with proper column mappings
// Replace the /import/full endpoint in server/routers/backup.ts with this implementation

router.post('/import/full', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  const mode = (req.body.mode as string) || 'merge';

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(content);
    fs.unlinkSync(req.file.path);

    const validTypes = ['full', 'episodes', 'editorial'];
    if (!validTypes.includes(importData.type)) {
      return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    }

    const db = getDb();
    const stats: Record<string, { imported: number; updated: number; skipped: number }> = {};

    const upsert = (table: string, items: any[], insertFn: (item: any) => void, updateFn?: (item: any) => void) => {
      if (!items || !Array.isArray(items)) return;
      let imported = 0, updated = 0, skipped = 0;
      for (const item of items) {
        if (!item.id) { try { insertFn(item); imported++; } catch (_) { skipped++; } continue; }
        const exists = db.get(`SELECT id FROM ${table} WHERE id = ?`, [item.id]);
        if (exists) {
          if (mode === 'overwrite' && updateFn) { try { updateFn(item); updated++; } catch (_) { skipped++; } }
          else skipped++;
        } else {
          try { insertFn(item); imported++; } catch (_) { skipped++; }
        }
      }
      stats[table] = { imported, updated, skipped };
    };

    const d = importData.type === 'full' ? (importData.data || {}) : {};
    const episodes = importData.type === 'episodes' ? (importData.data || []) : (d.episodes || []);
    const ideas = importData.type === 'editorial' ? (importData.data?.ideas || []) : (d.ideas || []);
    const editorialNotes = importData.type === 'editorial' ? (importData.data?.notes || []) : (d.editorialNotes || []);

    // ── Episoden ──
    upsert('episodes', episodes,
      (ep) => db.run(`INSERT INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ep.id || uuidv4(), ep.number||null, ep.title||'Importierte Episode', ep.subtitle||null, ep.description||null, ep.status||'entwurf', ep.recording_date||null, ep.publish_date||null, ep.duration||null, JSON.stringify(ep.hosts||[]), JSON.stringify(ep.guests||[]), JSON.stringify(ep.tags||[]), JSON.stringify(ep.blocks||[]), JSON.stringify(ep.sponsors||[]), ep.notes||null, ep.created_at||new Date().toISOString(), ep.updated_at||new Date().toISOString(), ep.created_by||req.user!.id]),
      (ep) => db.run(`UPDATE episodes SET number=?,title=?,subtitle=?,description=?,status=?,recording_date=?,publish_date=?,duration=?,hosts=?,guests=?,tags=?,blocks=?,sponsors=?,notes=?,updated_at=? WHERE id=?`,
        [ep.number||null, ep.title||'Importierte Episode', ep.subtitle||null, ep.description||null, ep.status||'entwurf', ep.recording_date||null, ep.publish_date||null, ep.duration||null, JSON.stringify(ep.hosts||[]), JSON.stringify(ep.guests||[]), JSON.stringify(ep.tags||[]), JSON.stringify(ep.blocks||[]), JSON.stringify(ep.sponsors||[]), ep.notes||null, new Date().toISOString(), ep.id])
    );

    // ── Ideen ──
    upsert('ideas', ideas,
      (i) => db.run(`INSERT INTO ideas (id, title, description, status, priority, tags, assigned_to, episode_id, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [i.id||uuidv4(), i.title||'Importierte Idee', i.description||null, i.status||'neu', i.priority||'mittel', JSON.stringify(i.tags||[]), i.assigned_to||null, i.episode_id||null, i.created_at||new Date().toISOString(), i.updated_at||new Date().toISOString(), i.created_by||req.user!.id]),
      (i) => db.run(`UPDATE ideas SET title=?,description=?,status=?,priority=?,tags=?,updated_at=? WHERE id=?`,
        [i.title, i.description||null, i.status||'neu', i.priority||'mittel', JSON.stringify(i.tags||[]), new Date().toISOString(), i.id])
    );

    // ── Redaktionsnotizen ──
    upsert('editorial_notes', editorialNotes,
      (n) => db.run(`INSERT INTO editorial_notes (id, title, content, category, tags, is_pinned, episode_id, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [n.id||uuidv4(), n.title, n.content||'', n.category||null, JSON.stringify(n.tags||[]), n.is_pinned||0, n.episode_id||null, n.created_at||new Date().toISOString(), n.updated_at||new Date().toISOString(), n.created_by||req.user!.id])
    );

    if (importData.type === 'full') {
      // ── Redaktionsplan (FIXED: added idea_id, title, assigned_to) ──
      upsert('editorial_plan', d.editorialPlan || [],
        (p) => db.run(`INSERT OR IGNORE INTO editorial_plan (id, episode_id, idea_id, title, planned_date, status, assigned_to, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [p.id||uuidv4(), p.episode_id||null, p.idea_id||null, p.title||'', p.planned_date||null, p.status||'geplant', p.assigned_to||null, p.notes||null, p.created_at||new Date().toISOString(), p.updated_at||new Date().toISOString()])
      );

      // ── Interview-Partner (FIXED: added company, email, phone, status, idea_id, guest_intro) ──
      upsert('interview_partners', d.interviewPartners || [],
        (p) => db.run(`INSERT INTO interview_partners (id, name, company, role, email, phone, bio, tags, episodes, notes, status, idea_id, guest_intro, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [p.id||uuidv4(), p.name, p.company||null, p.role||null, p.email||null, p.phone||null, p.bio||null, JSON.stringify(p.tags||[]), JSON.stringify(p.episodes||[]), p.notes||null, p.status||'offen', p.idea_id||null, p.guest_intro||null, p.created_at||new Date().toISOString(), p.updated_at||new Date().toISOString()])
      );

      // ── Interview-Fragen (FIXED: added episode_id, idea_id, sort_order, answered, is_pool, source_question_id, approved, approved_by, approved_at, approval_requested_by, approval_requested_at, approval_notes) ──
      upsert('interview_questions', d.interviewQuestions || [],
        (q) => db.run(`INSERT INTO interview_questions (id, partner_id, episode_id, idea_id, question, category, sort_order, answered, notes, is_pool, source_question_id, approved, approved_by, approved_at, status, approval_requested_by, approval_requested_at, approval_notes, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [q.id||uuidv4(), q.partner_id||null, q.episode_id||null, q.idea_id||null, q.question, q.category||null, q.sort_order||0, q.answered||0, q.notes||null, q.is_pool||0, q.source_question_id||null, q.approved||0, q.approved_by||null, q.approved_at||null, q.status||'offen', q.approval_requested_by||null, q.approval_requested_at||null, q.approval_notes||null, q.updated_at||new Date().toISOString(), q.created_at||new Date().toISOString()])
      );

      // ── Sponsoren (FIXED: added address, contact_name, contact_email, contact_phone, customer_number, contract_start, contract_end, contact_hint, color, ad_delivery) ──
      upsert('sponsors', d.sponsors || [],
        (s) => db.run(`INSERT INTO sponsors (id, name, company, address, contact_name, contact_email, contact_phone, website, logo, status, description, notes, tags, total_budget, currency, customer_number, contract_start, contract_end, contact_hint, color, ad_delivery, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.name, s.company||null, s.address||null, s.contact_name||null, s.contact_email||null, s.contact_phone||null, s.website||null, s.logo||null, s.status||'interessent', s.description||null, s.notes||null, JSON.stringify(s.tags||[]), s.total_budget||null, s.currency||'EUR', s.customer_number||null, s.contract_start||null, s.contract_end||null, s.contact_hint||null, s.color||'#059669', s.ad_delivery||'self', s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString(), s.created_by||req.user!.id])
      );

      // ── Werbe-Kategorien (FIXED: added default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, is_active, sort_order) ──
      upsert('ad_categories', d.adCategories || [],
        (c) => db.run(`INSERT OR IGNORE INTO ad_categories (id, name, description, color, default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, currency, is_active, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [c.id||uuidv4(), c.name, c.description||null, c.color||'#7c3aed', c.default_position||'mid-roll', c.default_duration||30, c.presentation_template||'', c.is_exclusive||0, c.base_price||null, c.price_per_episode||null, c.price_per_1000_listens||null, c.currency||'EUR', c.is_active||1, c.sort_order||0, c.created_at||new Date().toISOString(), c.updated_at||new Date().toISOString()])
      );

      // ── Werbe-Slots (FIXED: added category_id, production_type, asset_id, delivered_asset_path, target_episodes, price_model, placement_start, placement_end, placement_label, is_global, invoice_notes) ──
      upsert('ad_slots', d.adSlots || [],
        (s) => db.run(`INSERT OR IGNORE INTO ad_slots (id, sponsor_id, name, category_id, production_type, status, duration, script, asset_id, delivered_asset_path, price, currency, start_date, end_date, target_episodes, booked_episodes, notes, price_model, base_price, price_per_episode, price_per_1000_listens, placement_start, placement_end, placement_label, is_global, invoice_notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.sponsor_id||null, s.name, s.category_id||null, s.production_type||'eigenproduktion', s.status||'angefragt', s.duration||null, s.script||null, s.asset_id||null, s.delivered_asset_path||null, s.price||null, s.currency||'EUR', s.start_date||null, s.end_date||null, s.target_episodes||null, JSON.stringify(s.booked_episodes||[]), s.notes||null, s.price_model||'fixed', s.base_price||null, s.price_per_episode||null, s.price_per_1000_listens||null, s.placement_start||null, s.placement_end||null, s.placement_label||null, s.is_global||0, s.invoice_notes||null, s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString()])
      );

      // ── Episoden-Werbebuchungen (FIXED: removed note, added sort_order) ──
      upsert('episode_ad_bookings', d.episodeAdBookings || [],
        (b) => db.run(`INSERT OR IGNORE INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, script_text, presentation_text, duration, confirmed, sort_order, time_position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [b.id||uuidv4(), b.episode_id||null, b.ad_slot_id||null, b.ad_category_id||null, b.sponsor_id||null, b.position||'mid-roll', b.script_text||null, b.presentation_text||null, b.duration||null, b.confirmed||0, b.sort_order||0, b.time_position||null, b.created_at||new Date().toISOString(), b.updated_at||new Date().toISOString()])
      );

      // ── Staffeln (FIXED: added target_episode_count, planning_notes) ──
      upsert('seasons', d.seasons || [],
        (s) => db.run(`INSERT OR IGNORE INTO seasons (id, number, title, description, cover_url, start_date, end_date, status, created_by, created_at, updated_at, target_episode_count, planning_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.number||1, s.title, s.description||null, s.cover_url||null, s.start_date||null, s.end_date||null, s.status||'aktiv', s.created_by||req.user!.id, s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString(), s.target_episode_count||null, s.planning_notes||null])
      );

      // ── Media-Ordner (FIXED: removed created_by, added updated_at) ──
      upsert('media_folders', d.mediaFolders || [],
        (f) => db.run(`INSERT OR IGNORE INTO media_folders (id, name, parent_id, created_at, updated_at) VALUES (?,?,?,?,?)`,
          [f.id||uuidv4(), f.name, f.parent_id||null, f.created_at||new Date().toISOString(), f.updated_at||new Date().toISOString()])
      );

      // ── Assets (FIXED: added filepath, mime_type, comments, used_in_episodes, markers, artist, album) ──
      upsert('assets', d.assets || [],
        (a) => db.run(`INSERT OR IGNORE INTO assets (id, name, type, filename, filepath, filesize, duration, mime_type, description, tags, comments, used_in_episodes, created_at, updated_at, uploaded_by, folder_id, markers, artist, album) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [a.id||uuidv4(), a.name, a.type||'other', a.filename||'', a.filepath||'', a.filesize||null, a.duration||null, a.mime_type||null, a.description||null, JSON.stringify(a.tags||[]), JSON.stringify(a.comments||[]), JSON.stringify(a.used_in_episodes||[]), a.created_at||new Date().toISOString(), a.updated_at||new Date().toISOString(), a.uploaded_by||req.user!.id, a.folder_id||null, JSON.stringify(a.markers||[]), a.artist||null, a.album||null])
      );

      // ── Recherche-Quellen ──
      upsert('research_sources', d.researchSources || [],
        (r) => db.run(`INSERT OR IGNORE INTO research_sources (id, title, url, type, description, content, tags, related_idea_id, related_episode_id, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [r.id||uuidv4(), r.title, r.url||null, r.type||'link', r.description||null, r.content||null, JSON.stringify(r.tags||[]), r.related_idea_id||null, r.related_episode_id||null, r.status||'unread', r.created_by||req.user!.id, r.created_at||new Date().toISOString(), r.updated_at||new Date().toISOString()])
      );
    }

    // Backup der aktuellen Datenbank VOR dem Import anlegen
    const backupPath = path.join(BACKUPS_DIR, `pre-import-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    try {
      const currentData = {
        version: '2.15.0', type: 'full',
        exportedAt: new Date().toISOString(),
        exportedBy: 'system (pre-import-backup)',
        data: {
          episodes: db.all('SELECT * FROM episodes', []),
          ideas: db.all('SELECT * FROM ideas', []),
          editorialPlan: db.all('SELECT * FROM editorial_plan', []),
          editorialNotes: db.all('SELECT * FROM editorial_notes', []),
          interviewPartners: db.all('SELECT * FROM interview_partners', []),
          interviewQuestions: db.all('SELECT * FROM interview_questions', []),
          sponsors: db.all('SELECT * FROM sponsors', []),
          adSlots: db.all('SELECT * FROM ad_slots', []),
          adCategories: db.all('SELECT * FROM ad_categories', []),
          episodeAdBookings: db.all('SELECT * FROM episode_ad_bookings', []),
          seasons: db.all('SELECT * FROM seasons', []),
          assets: db.all('SELECT * FROM assets', []),
          mediaFolders: db.all('SELECT * FROM media_folders', []),
          researchSources: db.all('SELECT * FROM research_sources', []),
        },
      };
      fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
    } catch (_) { /* Pre-Import-Backup optional */ }

    const totalImported = Object.values(stats).reduce((s, v) => s + v.imported, 0);
    const totalUpdated = Object.values(stats).reduce((s, v) => s + v.updated, 0);
    const totalSkipped = Object.values(stats).reduce((s, v) => s + v.skipped, 0);

    return res.json({
      success: true,
      data: {
        mode,
        stats,
        summary: { totalImported, totalUpdated, totalSkipped },
        preImportBackup: path.basename(backupPath),
      },
    });
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${err.message}` });
  }
});
