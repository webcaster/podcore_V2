-- PodCore v2.16.6 Demo-Daten
-- Dieses Skript füllt die Datenbank mit realistischen Beispieldaten für einen Podcast namens "Obsidian Insights"

-- 1. Rollen & Berechtigungen (Standardrollen sicherstellen)
INSERT OR IGNORE INTO roles (id, name, label, description, color, permissions, is_system) VALUES 
('role-admin', 'admin', 'Administrator', 'Voller Zugriff auf alle Funktionen und Einstellungen.', '#7c3aed', '{}', 1),
('role-redakteur', 'redakteur', 'Redakteur', 'Kann Episoden und Ideen verwalten, aber keine Systemeinstellungen ändern.', '#2563eb', '{"canViewEpisodes":true,"canEditEpisodes":true,"canViewIdeas":true,"canEditIdeas":true,"canImportTutorials":true}', 1),
('role-moderator', 'moderator', 'Moderator', 'Fokus auf Skripte und Interview-Vorbereitung.', '#06b6d4', '{"canViewEpisodes":true,"canEditEpisodes":true,"canViewIdeas":true,"canImportTutorials":true}', 1);

-- 2. Beispiel-Nutzer (Passwort ist 'password')
INSERT OR IGNORE INTO users (id, username, display_name, email, password_hash, role, permissions, avatar_color, developer_mode) VALUES 
('user-max', 'max', 'Maximilian Hartwich', 'max@podcore.de', '$2a$10$rY2WvY3m3P5q6Y8W9Z1eO.o5J8F9Y3m3P5q6Y8W9Z1eO.o5J8F9Y', 'admin', '{}', '#7c3aed', 1),
('user-sarah', 'sarah', 'Sarah Sound', 'sarah@podcore.de', '$2a$10$rY2WvY3m3P5q6Y8W9Z1eO.o5J8F9Y3m3P5q6Y8W9Z1eO.o5J8F9Y', 'redakteur', '{}', '#ec4899', 0),
('user-tom', 'tom', 'Tom Tech', 'tom@podcore.de', '$2a$10$rY2WvY3m3P5q6Y8W9Z1eO.o5J8F9Y3m3P5q6Y8W9Z1eO.o5J8F9Y', 'moderator', '{}', '#10b981', 0);

-- 3. Staffeln
INSERT OR IGNORE INTO seasons (id, number, title, description, status, created_by) VALUES 
('season-1', 1, 'Staffel 1: Der Anfang', 'Die Gründungsphase von Obsidian Insights.', 'abgeschlossen', 'user-max'),
('season-2', 2, 'Staffel 2: Skalierung', 'Wie wir den Podcast professionalisiert haben.', 'aktiv', 'user-max');

-- 4. Sponsoren & Kategorien
INSERT OR IGNORE INTO ad_categories (id, name, description, color, default_position, base_price) VALUES 
('cat-pre', 'Pre-Roll', 'Am Anfang der Episode.', '#ef4444', 'pre-roll', 250.00),
('cat-mid', 'Mid-Roll', 'In der Mitte der Episode.', '#7c3aed', 'mid-roll', 450.00);

INSERT OR IGNORE INTO sponsors (id, name, company, contact_email, status, total_budget, created_by) VALUES 
('sponsor-tech', 'TechFlow', 'TechFlow Solutions GmbH', 'info@techflow.io', 'aktiv', 5000.00, 'user-max'),
('sponsor-creative', 'CreativeCloud', 'Creative Agency LLC', 'ads@creative.com', 'interessent', 0.00, 'user-max');

-- 5. Ideenpool (Redaktions-Hub)
INSERT OR IGNORE INTO ideas (id, title, description, status, priority, tags, created_by) VALUES 
('idea-1', 'KI in der Audiobearbeitung', 'Wie KI-Tools wie Adobe Podcast oder Descript den Workflow verändern.', 'in-arbeit', 'hoch', '["KI", "Audio", "Trends"]', 'user-sarah'),
('idea-2', 'Die Zukunft von RSS', 'Ist RSS noch zeitgemäß oder brauchen wir neue Standards?', 'neu', 'mittel', '["Technik", "RSS"]', 'user-tom'),
('idea-3', 'Interview mit Maximilian Hartwich', 'Ein Blick hinter die Kulissen von PodCore.', 'geplant', 'hoch', '["PodCore", "Interview"]', 'user-max');

-- 6. Episoden & Skript-Blöcke
INSERT OR IGNORE INTO episodes (id, number, title, status, recording_date, publish_date, season_id, blocks, created_by) VALUES 
('ep-101', 101, 'KI-Revolution im Studio', 'geplant', '2026-08-20', '2026-08-25', 'season-2', 
'[{"id":"b1","type":"intro","title":"Begrüßung","content":"Willkommen zu Obsidian Insights! Heute sprechen wir über KI im Studio.","duration":120},
  {"id":"b2","type":"ad","title":"Sponsoring TechFlow","content":"Diese Folge wird präsentiert von TechFlow.","duration":60},
  {"id":"b3","type":"content","title":"Hauptteil: KI-Tools","content":"KI-Tools wie Descript ermöglichen es uns, Audio wie Text zu bearbeiten.","duration":600},
  {"id":"b4","type":"outro","title":"Abschluss","content":"Vielen Dank fürs Zuhören! Bis zum nächsten Mal.","duration":180}]', 
'user-sarah');

-- 7. Tutorials (Wiki-Beispiele)
INSERT OR IGNORE INTO tutorials (id, title, description, roles, steps, created_by) VALUES 
('tut-1', 'Erste Schritte in PodCore', 'Eine kurze Einführung in die wichtigsten Funktionen.', '["*"]', 
'[{"id":"s1","title":"Dashboard","description":"Hier siehst du alle aktuellen Projekte und Aufgaben auf einen Blick.","target":"nav-dashboard","position":"right"},
  {"id":"s2","title":"Episoden-Planung","description":"Erstelle hier deine erste Episode und plane die Aufnahme.","target":"nav-episodes","position":"right"}]', 
'user-max'),
('tut-2', 'Kollaboration nutzen', 'So arbeitest du effektiv im Team zusammen.', '["redakteur", "moderator"]', 
'[{"id":"s1","title":"Presence-Anzeige","description":"Oben rechts siehst du, wer gerade mit dir an der Episode arbeitet.","target":"collaboration-bar","position":"bottom"},
  {"id":"s2","title":"Skript-Locks","description":"Blöcke, die von anderen bearbeitet werden, sind automatisch gesperrt.","target":"block-editor","position":"top"}]', 
'user-max');

-- 8. Statistiken (Beispiel-Daten)
INSERT OR IGNORE INTO podcast_stats (id, episode_id, date, downloads, plays, unique_listeners) VALUES 
('stat-1', 'ep-101', '2026-08-01', 150, 120, 100),
('stat-2', 'ep-101', '2026-08-02', 280, 240, 210),
('stat-3', 'ep-101', '2026-08-03', 420, 380, 350);
