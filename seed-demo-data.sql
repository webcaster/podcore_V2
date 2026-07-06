-- ============================================================
-- PodCore v2.11.5 - Demo Data Script
-- Start: Januar 2026
-- ============================================================

-- ============================================================
-- 1. PODCASTS
-- ============================================================

INSERT INTO podcasts (id, title, description, cover_url, website, social_links, status, created_at) VALUES
('pod-001', 'Tech Talk Daily', 'Der tägliche Podcast über Technologie, Innovation und digitale Trends', 'https://example.com/covers/tech-talk.jpg', 'https://techtalkdaily.de', '{"twitter":"@techtalkdaily","instagram":"@techtalkdaily"}', 'active', '2025-12-01T10:00:00Z'),
('pod-002', 'Marketing Minds', 'Interviews mit Top-Marketern und Strategen aus der ganzen Welt', 'https://example.com/covers/marketing-minds.jpg', 'https://marketingminds.de', '{"twitter":"@marketingminds","linkedin":"marketingminds"}', 'active', '2025-11-15T14:30:00Z'),
('pod-003', 'Startup Stories', 'Gründer erzählen ihre Erfolgs- und Scheiterns-Geschichten', 'https://example.com/covers/startup-stories.jpg', 'https://startupstories.de', '{"twitter":"@startupstories"}', 'active', '2025-10-20T09:00:00Z');

-- ============================================================
-- 2. USERS (Podcast-Team)
-- ============================================================

INSERT INTO users (id, name, email, role, podcast_id, can_approve_episodes, can_request_approval, can_manage_settings, created_at) VALUES
('user-001', 'Max Müller', 'max@techtalkdaily.de', 'admin', 'pod-001', 1, 1, 1, '2025-12-01T10:00:00Z'),
('user-002', 'Anna Schmidt', 'anna@techtalkdaily.de', 'moderator', 'pod-001', 1, 0, 0, '2025-12-05T11:00:00Z'),
('user-003', 'Tom Weber', 'tom@techtalkdaily.de', 'editor', 'pod-001', 0, 1, 0, '2025-12-10T08:30:00Z'),
('user-004', 'Lisa König', 'lisa@marketingminds.de', 'admin', 'pod-002', 1, 1, 1, '2025-11-15T14:30:00Z'),
('user-005', 'Peter Braun', 'peter@startupstories.de', 'admin', 'pod-003', 1, 1, 1, '2025-10-20T09:00:00Z');

-- ============================================================
-- 3. SPONSORS
-- ============================================================

INSERT INTO sponsors (id, name, company, contact_person, email, phone, website, color, status, created_at) VALUES
('sponsor-001', 'TechHub', 'TechHub GmbH', 'Klaus Fischer', 'klaus@techhub.de', '+49 30 12345678', 'https://techhub.de', '#0066CC', 'active', '2026-01-05T10:00:00Z'),
('sponsor-002', 'CloudServe', 'CloudServe AG', 'Maria Hoffmann', 'maria@cloudserve.de', '+49 89 87654321', 'https://cloudserve.de', '#FF6600', 'active', '2026-01-08T14:00:00Z'),
('sponsor-003', 'DataViz Pro', 'DataViz Solutions', 'Robert Müller', 'robert@dataviz.de', '+49 40 11223344', 'https://dataviz.de', '#00AA00', 'active', '2026-01-10T09:30:00Z'),
('sponsor-004', 'Marketing Suite', 'Marketing Suite Inc', 'Jennifer Chen', 'jennifer@marketingsuite.com', '+1 415 555 0100', 'https://marketingsuite.com', '#9900FF', 'active', '2026-01-12T11:00:00Z'),
('sponsor-005', 'Startup Accelerator', 'Startup Accelerator Fund', 'David Lehmann', 'david@startupaccel.de', '+49 69 55667788', 'https://startupaccel.de', '#FF3333', 'active', '2026-01-15T10:00:00Z');

-- ============================================================
-- 4. AD CATEGORIES
-- ============================================================

INSERT INTO ad_categories (id, name, description, default_price, created_at) VALUES
('cat-001', 'SaaS Tools', 'Software-as-a-Service Produkte und Dienste', 150.00, '2026-01-01T00:00:00Z'),
('cat-002', 'Cloud Services', 'Cloud-Infrastruktur und Hosting', 200.00, '2026-01-01T00:00:00Z'),
('cat-003', 'Data Analytics', 'Datenanalyse und Business Intelligence', 180.00, '2026-01-01T00:00:00Z'),
('cat-004', 'Marketing Tools', 'Marketing Automation und CRM', 160.00, '2026-01-01T00:00:00Z'),
('cat-005', 'Venture Capital', 'Investitionen und Finanzierung', 250.00, '2026-01-01T00:00:00Z');

-- ============================================================
-- 5. AD SLOTS (Werbeplatzierungen)
-- ============================================================

INSERT INTO ad_slots (id, sponsor_id, slot_name, position, duration_seconds, category_id, price_model, base_price, price_per_episode, price_per_1000_listeners, status, created_at) VALUES
-- Tech Talk Daily - TechHub
('slot-001', 'sponsor-001', 'TechHub Pre-Roll', 'pre-roll', 30, 'cat-001', 'fixed', 100.00, NULL, NULL, 'active', '2026-01-05T10:30:00Z'),
('slot-002', 'sponsor-001', 'TechHub Mid-Roll', 'mid-roll', 60, 'cat-001', 'per_episode', NULL, 150.00, NULL, 'active', '2026-01-05T10:30:00Z'),
('slot-003', 'sponsor-001', 'TechHub Folgensponsor', 'folgensponsor', 90, 'cat-001', 'per_1000_listeners', NULL, NULL, 0.05, 'active', '2026-01-05T10:30:00Z'),

-- Tech Talk Daily - CloudServe
('slot-004', 'sponsor-002', 'CloudServe Pre-Roll', 'pre-roll', 30, 'cat-002', 'fixed', 120.00, NULL, NULL, 'active', '2026-01-08T14:30:00Z'),
('slot-005', 'sponsor-002', 'CloudServe Post-Roll', 'post-roll', 30, 'cat-002', 'per_episode', NULL, 100.00, NULL, 'active', '2026-01-08T14:30:00Z'),

-- Tech Talk Daily - DataViz Pro
('slot-006', 'sponsor-003', 'DataViz Pro Mid-Roll', 'mid-roll', 60, 'cat-003', 'per_1000_listeners', NULL, NULL, 0.08, 'active', '2026-01-10T10:00:00Z'),

-- Marketing Minds - Marketing Suite
('slot-007', 'sponsor-004', 'Marketing Suite Pre-Roll', 'pre-roll', 30, 'cat-004', 'fixed', 140.00, NULL, NULL, 'active', '2026-01-12T11:30:00Z'),
('slot-008', 'sponsor-004', 'Marketing Suite Folgensponsor', 'folgensponsor', 90, 'cat-004', 'per_episode', NULL, 180.00, NULL, 'active', '2026-01-12T11:30:00Z'),

-- Startup Stories - Startup Accelerator
('slot-009', 'sponsor-005', 'Startup Accelerator Pre-Roll', 'pre-roll', 30, 'cat-005', 'fixed', 200.00, NULL, NULL, 'active', '2026-01-15T10:30:00Z'),
('slot-010', 'sponsor-005', 'Startup Accelerator Mid-Roll', 'mid-roll', 60, 'cat-005', 'per_episode', NULL, 250.00, NULL, 'active', '2026-01-15T10:30:00Z');

-- ============================================================
-- 6. EPISODES
-- ============================================================

INSERT INTO episodes (id, podcast_id, title, description, episode_number, season_number, publish_date, status, created_at, updated_at) VALUES
-- Tech Talk Daily - Januar 2026
('ep-001', 'pod-001', 'KI und die Zukunft der Softwareentwicklung', 'Wir sprechen mit Experten über die Auswirkungen von künstlicher Intelligenz auf die Entwicklung', 1, 1, '2026-01-06T10:00:00Z', 'published', '2026-01-04T14:00:00Z', '2026-01-06T10:00:00Z'),
('ep-002', 'pod-001', 'Cloud-Migration: Best Practices 2026', 'Ein tiefgreifender Blick auf moderne Cloud-Migrations-Strategien', 2, 1, '2026-01-13T10:00:00Z', 'published', '2026-01-10T09:00:00Z', '2026-01-13T10:00:00Z'),
('ep-003', 'pod-001', 'Cybersecurity im Homeoffice', 'Wie man sich und sein Unternehmen beim Remote Work schützt', 3, 1, '2026-01-20T10:00:00Z', 'published', '2026-01-17T11:00:00Z', '2026-01-20T10:00:00Z'),
('ep-004', 'pod-001', 'Blockchain für Anfänger', 'Alles was Sie über Blockchain wissen müssen', 4, 1, '2026-01-27T10:00:00Z', 'pending_approval', '2026-01-24T08:00:00Z', '2026-01-25T15:00:00Z'),

-- Marketing Minds - Januar 2026
('ep-005', 'pod-002', 'Social Media Trends 2026', 'Die wichtigsten Trends in Social Media Marketing für dieses Jahr', 1, 1, '2026-01-07T14:00:00Z', 'published', '2026-01-05T10:00:00Z', '2026-01-07T14:00:00Z'),
('ep-006', 'pod-002', 'Influencer Marketing ROI', 'Wie man den Return on Investment bei Influencer Kampagnen misst', 2, 1, '2026-01-14T14:00:00Z', 'published', '2026-01-12T09:00:00Z', '2026-01-14T14:00:00Z'),
('ep-007', 'pod-002', 'Email Marketing Automation', 'Automatisierung von E-Mail-Kampagnen für bessere Ergebnisse', 3, 1, '2026-01-21T14:00:00Z', 'draft', '2026-01-18T10:00:00Z', '2026-01-20T16:00:00Z'),

-- Startup Stories - Januar 2026
('ep-008', 'pod-003', 'Von der Idee zum Unicorn', 'Die Geschichte eines erfolgreichen Startup-Gründers', 1, 1, '2026-01-08T18:00:00Z', 'published', '2026-01-06T12:00:00Z', '2026-01-08T18:00:00Z'),
('ep-009', 'pod-003', 'Scheitern ist der erste Schritt zum Erfolg', 'Lektionen aus gescheiterten Startups', 2, 1, '2026-01-15T18:00:00Z', 'published', '2026-01-13T11:00:00Z', '2026-01-15T18:00:00Z'),
('ep-010', 'pod-003', 'Fundraising im Jahr 2026', 'Wie man Investoren findet und überzeugt', 3, 1, '2026-01-22T18:00:00Z', 'pending_approval', '2026-01-20T09:00:00Z', '2026-01-21T14:00:00Z');

-- ============================================================
-- 7. AD PLACEMENTS (Buchungen)
-- ============================================================

INSERT INTO ad_placements (id, slot_id, episode_id, sponsor_id, ad_title, category_id, position, price, invoice_status, ad_date, status, created_at) VALUES
-- Tech Talk Daily - Episode 1 (KI und Softwareentwicklung)
('place-001', 'slot-001', 'ep-001', 'sponsor-001', 'TechHub Pre-Roll', 'cat-001', 'pre-roll', 100.00, 'offen', '2026-01-06', 'confirmed', '2026-01-04T15:00:00Z'),
('place-002', 'slot-002', 'ep-001', 'sponsor-001', 'TechHub Mid-Roll', 'cat-001', 'mid-roll', 150.00, 'offen', '2026-01-06', 'confirmed', '2026-01-04T15:00:00Z'),
('place-003', 'slot-004', 'ep-001', 'sponsor-002', 'CloudServe Pre-Roll', 'cat-002', 'pre-roll', 120.00, 'offen', '2026-01-06', 'confirmed', '2026-01-04T16:00:00Z'),

-- Tech Talk Daily - Episode 2 (Cloud-Migration)
('place-004', 'slot-001', 'ep-002', 'sponsor-001', 'TechHub Pre-Roll', 'cat-001', 'pre-roll', 100.00, 'offen', '2026-01-13', 'confirmed', '2026-01-10T10:00:00Z'),
('place-005', 'slot-004', 'ep-002', 'sponsor-002', 'CloudServe Pre-Roll', 'cat-002', 'pre-roll', 120.00, 'offen', '2026-01-13', 'confirmed', '2026-01-10T10:00:00Z'),
('place-006', 'slot-006', 'ep-002', 'sponsor-003', 'DataViz Pro Mid-Roll', 'cat-003', 'mid-roll', 180.00, 'offen', '2026-01-13', 'confirmed', '2026-01-10T11:00:00Z'),

-- Tech Talk Daily - Episode 3 (Cybersecurity)
('place-007', 'slot-001', 'ep-003', 'sponsor-001', 'TechHub Pre-Roll', 'cat-001', 'pre-roll', 100.00, 'bezahlt', '2026-01-20', 'confirmed', '2026-01-17T12:00:00Z'),
('place-008', 'slot-005', 'ep-003', 'sponsor-002', 'CloudServe Post-Roll', 'cat-002', 'post-roll', 100.00, 'bezahlt', '2026-01-20', 'confirmed', '2026-01-17T12:00:00Z'),

-- Marketing Minds - Episode 5 (Social Media Trends)
('place-009', 'slot-007', 'ep-005', 'sponsor-004', 'Marketing Suite Pre-Roll', 'cat-004', 'pre-roll', 140.00, 'offen', '2026-01-07', 'confirmed', '2026-01-05T11:00:00Z'),
('place-010', 'slot-008', 'ep-005', 'sponsor-004', 'Marketing Suite Folgensponsor', 'cat-004', 'folgensponsor', 180.00, 'offen', '2026-01-07', 'confirmed', '2026-01-05T11:00:00Z'),

-- Startup Stories - Episode 8 (Von der Idee zum Unicorn)
('place-011', 'slot-009', 'ep-008', 'sponsor-005', 'Startup Accelerator Pre-Roll', 'cat-005', 'pre-roll', 200.00, 'offen', '2026-01-08', 'confirmed', '2026-01-06T13:00:00Z'),
('place-012', 'slot-010', 'ep-008', 'sponsor-005', 'Startup Accelerator Mid-Roll', 'cat-005', 'mid-roll', 250.00, 'offen', '2026-01-08', 'confirmed', '2026-01-06T13:00:00Z');

-- ============================================================
-- 8. INTERVIEW QUESTIONS
-- ============================================================

INSERT INTO interview_questions (id, episode_id, question_text, guest_name, status, created_at) VALUES
-- Tech Talk Daily - Episode 1
('q-001', 'ep-001', 'Welche Rolle spielt KI in der modernen Softwareentwicklung?', 'Dr. Sarah Chen', 'approved', '2026-01-04T14:00:00Z'),
('q-002', 'ep-001', 'Wie werden sich Entwickler-Jobs in den nächsten 5 Jahren verändern?', 'Dr. Sarah Chen', 'approved', '2026-01-04T14:00:00Z'),
('q-003', 'ep-001', 'Welche KI-Tools empfehlen Sie für Anfänger?', 'Dr. Sarah Chen', 'approved', '2026-01-04T14:00:00Z'),

-- Tech Talk Daily - Episode 2
('q-004', 'ep-002', 'Was sind die häufigsten Fehler bei Cloud-Migrationen?', 'Prof. Michael Bauer', 'pending_approval', '2026-01-10T09:00:00Z'),
('q-005', 'ep-002', 'Wie lange dauert eine typische Cloud-Migration?', 'Prof. Michael Bauer', 'pending_approval', '2026-01-10T09:00:00Z'),

-- Marketing Minds - Episode 5
('q-006', 'ep-005', 'Welche Social Media Plattformen sind 2026 am wichtigsten?', 'Julia Hoffmann', 'approved', '2026-01-05T10:00:00Z'),
('q-007', 'ep-005', 'Wie messen wir den Erfolg von Social Media Kampagnen?', 'Julia Hoffmann', 'approved', '2026-01-05T10:00:00Z'),

-- Startup Stories - Episode 8
('q-008', 'ep-008', 'Was war Ihre erste große Herausforderung als Gründer?', 'Thomas Richter', 'approved', '2026-01-06T12:00:00Z'),
('q-009', 'ep-008', 'Wie haben Sie Ihre ersten Investoren gefunden?', 'Thomas Richter', 'approved', '2026-01-06T12:00:00Z');

-- ============================================================
-- 9. WIKI ARTICLES
-- ============================================================

INSERT INTO wiki_articles (id, title, slug, content, tags, icon, status, created_at, updated_at) VALUES
('wiki-001', 'Episoden erstellen', 'episoden-erstellen', '# Episoden erstellen\n\nUm eine neue Episode zu erstellen:\n\n1. Gehen Sie zum Episoden-Editor\n2. Klicken Sie auf "Neue Episode"\n3. Füllen Sie die Metadaten aus\n4. Speichern Sie die Episode\n\n## Best Practices\n\n- Verwenden Sie aussagekräftige Titel\n- Schreiben Sie eine detaillierte Beschreibung\n- Ordnen Sie die Episode der richtigen Staffel zu', '["episodes","editing","basics"]', 'FileText', 'published', '2026-01-01T10:00:00Z', '2026-01-10T14:00:00Z'),
('wiki-002', 'Sponsoren verwalten', 'sponsoren-verwalten', '# Sponsoren verwalten\n\nDas Sponsoring-System in PodCore v2.11.5 ermöglicht es Ihnen, Sponsoren und Werbeplatzierungen zu verwalten.\n\n## Neuen Sponsor hinzufügen\n\n1. Gehen Sie zu "Sponsoren"\n2. Klicken Sie auf "Neuer Sponsor"\n3. Füllen Sie die Informationen aus\n4. Speichern Sie den Sponsor\n\n## Werbeplatzierungen\n\nFür jeden Sponsor können Sie Werbeplatzierungen (Slots) definieren:\n- Pre-Roll\n- Mid-Roll\n- Post-Roll\n- Folgensponsor', '["sponsoring","advertising","setup"]', 'DollarSign', 'published', '2026-01-01T10:00:00Z', '2026-01-15T11:00:00Z'),
('wiki-003', 'Freigabe-Center', 'freigabe-center', '# Freigabe-Center\n\nDas Freigabe-Center ist der zentrale Ort für alle Freigabe-Anfragen.\n\n## Episoden freigeben\n\n1. Öffnen Sie das Freigabe-Center\n2. Wählen Sie eine Episode aus\n3. Klicken Sie auf "Freigeben" oder "Ablehnen"\n\n## Interview-Fragen freigeben\n\nSimilar wie Episoden können auch Interview-Fragen freigegeben werden.', '["approvals","moderation","workflow"]', 'CheckCircle', 'published', '2026-01-10T09:00:00Z', '2026-01-15T10:00:00Z');

-- ============================================================
-- 10. PODCAST PROFILE (Global Settings)
-- ============================================================

INSERT INTO podcast_profiles (id, podcast_id, tagline, mission, audience_description, content_pillars, publishing_schedule, created_at, updated_at) VALUES
('profile-001', 'pod-001', 'Der tägliche Podcast über Technologie und Innovation', 'Wir bringen die neuesten Tech-Trends zu unseren Hörern', 'Tech-Enthusiasten, Entwickler, Startup-Gründer', 'KI, Cloud, Cybersecurity, Blockchain', 'Täglich um 10:00 Uhr', '2026-01-01T10:00:00Z', '2026-01-10T14:00:00Z'),
('profile-002', 'pod-002', 'Interviews mit Top-Marketern und Strategen', 'Wir teilen Wissen und Erfahrungen aus der Marketing-Welt', 'Marketing-Profis, Unternehmer, Studenten', 'Social Media, Email Marketing, Content Strategy', 'Dienstags und Donnerstags um 14:00 Uhr', '2026-01-01T10:00:00Z', '2026-01-12T11:00:00Z'),
('profile-003', 'pod-003', 'Gründer erzählen ihre Geschichten', 'Inspiration und Lektionen von erfolgreichen und gescheiterten Startups', 'Gründer, Investoren, Startup-Enthusiasten', 'Gründergeschichten, Finanzierung, Skalierung', 'Mittwochs um 18:00 Uhr', '2026-01-01T10:00:00Z', '2026-01-15T09:00:00Z');

-- ============================================================
-- COMMIT
-- ============================================================

-- Alle Daten wurden eingefügt!
-- Starten Sie den Server neu, damit die Daten verfügbar sind.
