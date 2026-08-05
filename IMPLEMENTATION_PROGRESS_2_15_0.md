# PodCore v2.15.0 Implementation Progress

## Phase 1: Completed ✅
- Repository cloned and analyzed
- Identified all required changes from error report

## Phase 2: In Progress (Kaskadierendes Löschen & Backup-Funktion)

### Cascading Delete Implementation ✅
**File: `/home/ubuntu/podcore/server/routers/editorial.ts`**

Implemented three new endpoints:
1. **DELETE /ideas/:id/permanent** - Permanently delete an idea with all related data
   - Deletes all files from idea_uploads
   - Deletes idea_checklists, idea_notes, idea_uploads
   - Deletes idea_interview_partners, topic_drafts, text_blocks
   - Deletes interview_questions, research_sources
   - Deletes editorial_plan, season_plan_items
   - Finally deletes the idea itself

2. **DELETE /ideas/trash/empty** - Empty entire trash (all deleted ideas)
   - Cascades delete for all ideas with deleted_at IS NOT NULL

3. **DELETE /ideas/:id/trash/delete** - Permanently delete a specific deleted idea from trash
   - Same cascade logic as permanent delete

4. **Helper function cascadeDeleteIdeaUploads()** - Safely deletes physical files

### Backup Function Fixes ⚠️
**File: `/home/ubuntu/podcore/server/routers/backup.ts`**

Created comprehensive fix file: `BACKUP_FIX_2_15_0.ts`

Fixed column mappings for all tables:
- **editorial_plan**: Added idea_id, title, assigned_to (removed created_by)
- **interview_partners**: Added company, email, phone, status, idea_id, guest_intro (removed contact)
- **interview_questions**: Added episode_id, idea_id, sort_order, answered, is_pool, source_question_id, approved fields (removed answer, order_index, created_by)
- **sponsors**: Added address, contact_name, contact_email, contact_phone, customer_number, contract_start, contract_end, contact_hint, color, ad_delivery (removed email, phone, logo_url, created_by)
- **ad_categories**: Added default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, is_active, sort_order (removed price_per_slot)
- **ad_slots**: Added category_id, production_type, asset_id, delivered_asset_path, target_episodes, price_model, placement_start, placement_end, placement_label, is_global, invoice_notes
- **episode_ad_bookings**: Removed created_by, added sort_order
- **seasons**: Added target_episode_count, planning_notes (removed created_by)
- **media_folders**: Removed created_by, added updated_at
- **assets**: Added filepath, mime_type, comments, used_in_episodes, markers, artist, album (removed size, notes, created_by)
- **Pre-import backup**: Now includes all tables for complete recovery

## Next Steps

### Phase 3: Auto-Update & Dashboard Restructuring
- Implement proper elevation prompt for auto-update
- Move approval requests from Dashboard to Notification Center
- Add approval indicator in header

### Phase 4: PDF & Module Cleanup
- Integrate personal PDF for interview partners
- Remove "Zusammenfassung" section from Partner & Fragen
- Remove "Per Mail senden" option from Partner & Fragen

### Phase 5: Version Update & Release
- Set version to 2.15.0 in package.json
- Build and test
- Update GitHub
- Create download package
- Update Wiki

## Files Modified
1. `/home/ubuntu/podcore/server/routers/editorial.ts` - Added cascading delete endpoints
2. `/home/ubuntu/podcore/BACKUP_FIX_2_15_0.ts` - Created comprehensive backup fix

## Testing Required
- Test cascading delete for ideas
- Test trash empty functionality
- Test backup import with new column mappings
- Verify no orphaned data remains
