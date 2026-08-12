# Backup-Audit PodCore v2.15.11

## Befund

Der bisherige Full-Export umfasst nur einen Teil des Datenbankschemas. Der Full-Import verarbeitet noch weniger Tabellen und speichert beim Vor-Import-Backup nur Episoden, Ideen, Redaktionsplan, Notizen und Sponsoren. Dadurch gehen beim Wiederherstellen insbesondere Sponsoring-Buchungen, Medienverknüpfungen, Episodenverläufe, Kommentare, Benachrichtigungen, Textbausteine, Themenentwürfe, Tutorials und Tutorial-Fortschritte verloren oder werden nicht übernommen.

## Relevante Datenbereiche im Schema

| Bereich | Tabellen |
|---|---|
| Kern | users, roles, settings |
| Redaktion | ideas, idea_checklists, idea_notes, idea_uploads, idea_interview_partners, idea_topic_drafts, editorial_text_blocks, editorial_plan, editorial_notes, research_sources |
| Episoden | episodes, seasons, season_plan_items, season_plan_item_partners, episode_templates, episode_revisions, episode_comments, episode_media_links, audio_analysis_jobs |
| Medien | assets, media_folders |
| Interviews | interview_partners, interview_questions |
| Sponsoring | sponsors, sponsor_contracts, sponsor_offers, ad_categories, ad_slots, ad_placements, ad_bookings, episode_ad_bookings |
| System/Wissen | tutorials, user_tutorial_progress, podcast_stats, chat_messages, notifications |

## Bewusste Ausschlüsse

`error_logs` und `sessions` werden nicht als Endnutzer-Backup übernommen. Sitzungen sind flüchtig und sicherheitsrelevant; Fehlerprotokolle gehören nicht zum fachlichen Datenbestand. Für `users` werden Konten und Rollen übernommen, aber keine aktiven Sitzungen.

## Reparaturziele

Der neue Full-Export soll ein versioniertes Format mit Manifest, Tabellenstatistik, Schema-Version, Datenbestand und optionalem Medienarchiv erzeugen. Der Import soll alle fachlichen Tabellen in einer Transaktion mit Merge-/Overwrite-Strategie verarbeiten, abhängige Datensätze nicht auslassen und am Ende je Tabelle `imported`, `updated`, `skipped` und `failed` melden. Vor jedem Import wird ein vollständiges Pre-Import-Backup erzeugt.
