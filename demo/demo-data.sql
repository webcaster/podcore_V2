-- ============================================================
-- PodCore Demo-Daten v2.7.0
-- Podcast: "Deep Dive Digital" — Tech & Gesellschaft
-- ============================================================
-- WICHTIG: Dieses Skript NICHT auf einer Produktionsdatenbank
-- ausführen, die bereits echte Daten enthält!
-- Ausführung: siehe import-demo.sh
-- ============================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- ============================================================
-- 1. BENUTZER (Passwort für alle: demo1234)
-- ============================================================
-- Passwort-Hash für "demo1234" (bcrypt, 10 rounds)
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh

INSERT OR IGNORE INTO users (id, username, display_name, email, password_hash, role, permissions, is_active, avatar_color) VALUES
(
  'demo-user-admin-001',
  'max.mueller',
  'Max Müller',
  'max@deepdivedigital.de',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh',
  'admin',
  '{"canViewIdeas":true,"canCreateIdeas":true,"canEditIdeas":true,"canDeleteIdeas":true,"canViewEditorialPlan":true,"canEditEditorialPlan":true,"canViewInterviews":true,"canEditInterviews":true,"canViewNotes":true,"canEditNotes":true,"canViewEpisodes":true,"canCreateEpisodes":true,"canEditEpisodes":true,"canDeleteEpisodes":true,"canEditScript":true,"canViewMedia":true,"canUploadMedia":true,"canDeleteMedia":true,"canCommentMedia":true,"canViewSponsors":true,"canCreateSponsors":true,"canEditSponsors":true,"canDeleteSponsors":true,"canViewSponsorReports":true,"canManageUsers":true,"canViewErrorLogs":true,"canExport":true,"canManageSettings":true,"canApproveEpisodes":true,"canRequestApproval":true,"canApproveInterviewQuestions":true}',
  1,
  '#7c3aed'
),
(
  'demo-user-redakteur-001',
  'sarah.schneider',
  'Sarah Schneider',
  'sarah@deepdivedigital.de',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh',
  'redakteur',
  '{"canViewIdeas":true,"canCreateIdeas":true,"canEditIdeas":true,"canDeleteIdeas":false,"canViewEditorialPlan":true,"canEditEditorialPlan":true,"canViewInterviews":true,"canEditInterviews":true,"canViewNotes":true,"canEditNotes":true,"canViewEpisodes":true,"canCreateEpisodes":true,"canEditEpisodes":true,"canDeleteEpisodes":false,"canEditScript":true,"canViewMedia":true,"canUploadMedia":true,"canDeleteMedia":false,"canCommentMedia":true,"canViewSponsors":true,"canCreateSponsors":false,"canEditSponsors":false,"canDeleteSponsors":false,"canViewSponsorReports":true,"canManageUsers":false,"canViewErrorLogs":false,"canExport":true,"canManageSettings":false,"canApproveEpisodes":false,"canRequestApproval":true,"canApproveInterviewQuestions":false}',
  1,
  '#2563eb'
),
(
  'demo-user-moderator-001',
  'tom.weber',
  'Tom Weber',
  'tom@deepdivedigital.de',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh',
  'moderator',
  '{"canViewIdeas":true,"canCreateIdeas":false,"canEditIdeas":false,"canDeleteIdeas":false,"canViewEditorialPlan":true,"canEditEditorialPlan":false,"canViewInterviews":true,"canEditInterviews":true,"canViewNotes":true,"canEditNotes":false,"canViewEpisodes":true,"canCreateEpisodes":false,"canEditEpisodes":true,"canDeleteEpisodes":false,"canEditScript":true,"canViewMedia":true,"canUploadMedia":false,"canDeleteMedia":false,"canCommentMedia":true,"canViewSponsors":true,"canCreateSponsors":false,"canEditSponsors":false,"canDeleteSponsors":false,"canViewSponsorReports":true,"canManageUsers":false,"canViewErrorLogs":false,"canExport":true,"canManageSettings":false,"canApproveEpisodes":true,"canRequestApproval":true,"canApproveInterviewQuestions":true}',
  1,
  '#059669'
),
(
  'demo-user-produktion-001',
  'lena.braun',
  'Lena Braun',
  'lena@deepdivedigital.de',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh',
  'produktion',
  '{"canViewIdeas":false,"canCreateIdeas":false,"canEditIdeas":false,"canDeleteIdeas":false,"canViewEditorialPlan":false,"canEditEditorialPlan":false,"canViewInterviews":false,"canEditInterviews":false,"canViewNotes":false,"canEditNotes":false,"canViewEpisodes":true,"canCreateEpisodes":false,"canEditEpisodes":false,"canDeleteEpisodes":false,"canEditScript":false,"canViewMedia":true,"canUploadMedia":true,"canDeleteMedia":false,"canCommentMedia":true,"canViewSponsors":true,"canCreateSponsors":false,"canEditSponsors":false,"canDeleteSponsors":false,"canViewSponsorReports":false,"canManageUsers":false,"canViewErrorLogs":false,"canExport":true,"canManageSettings":false,"canApproveEpisodes":false,"canRequestApproval":false,"canApproveInterviewQuestions":false}',
  1,
  '#f59e0b'
);

-- ============================================================
-- 2. STAFFELN
-- ============================================================
INSERT OR IGNORE INTO seasons (id, number, title, description, start_date, end_date, status, created_by) VALUES
(
  'demo-season-001',
  1,
  'Staffel 1: Grundlagen der digitalen Welt',
  'Die erste Staffel von Deep Dive Digital. Wir erkunden die Grundlagen: KI, Datenschutz, Social Media und die Zukunft der Arbeit.',
  '2024-01-15',
  '2024-06-30',
  'abgeschlossen',
  'demo-user-admin-001'
),
(
  'demo-season-002',
  2,
  'Staffel 2: Technologie & Gesellschaft',
  'In der zweiten Staffel gehen wir tiefer: Wie verändert Technologie unsere Gesellschaft, Demokratie und zwischenmenschliche Beziehungen?',
  '2024-09-02',
  NULL,
  'aktiv',
  'demo-user-admin-001'
);

-- ============================================================
-- 3. WERBEKATEGORIEN
-- ============================================================
INSERT OR IGNORE INTO ad_categories (id, name, description, color, default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, currency, is_active, sort_order) VALUES
(
  'demo-cat-preroll',
  'Pre-Roll',
  'Werbung zu Beginn der Episode, vor dem eigentlichen Inhalt. Höchste Aufmerksamkeit.',
  '#dc2626',
  'pre-roll',
  30,
  'präsentiert von',
  0,
  1500.00,
  800.00,
  25.00,
  'EUR',
  1,
  1
),
(
  'demo-cat-midroll',
  'Mid-Roll',
  'Werbung in der Mitte der Episode. Beste Kombination aus Reichweite und Aufmerksamkeit.',
  '#7c3aed',
  'mid-roll',
  60,
  'präsentiert von',
  0,
  2000.00,
  1200.00,
  35.00,
  'EUR',
  1,
  2
),
(
  'demo-cat-postroll',
  'Post-Roll',
  'Werbung am Ende der Episode. Günstigster Einstieg ins Podcast-Sponsoring.',
  '#2563eb',
  'post-roll',
  30,
  'präsentiert von',
  0,
  800.00,
  400.00,
  12.00,
  'EUR',
  1,
  3
),
(
  'demo-cat-folgensponsor',
  'Folgensponsor',
  'Exklusiver Hauptsponsor einer Folge. Nur ein Sponsor pro Episode möglich.',
  '#f59e0b',
  'pre-roll',
  90,
  'Diese Episode wird präsentiert von',
  1,
  3500.00,
  2500.00,
  NULL,
  'EUR',
  1,
  4
);

-- ============================================================
-- 4. SPONSOREN
-- ============================================================
INSERT OR IGNORE INTO sponsors (id, name, company, contact_name, contact_email, contact_phone, website, status, description, notes, tags, total_budget, currency, created_by) VALUES
(
  'demo-sponsor-001',
  'TechCloud Solutions',
  'TechCloud Solutions GmbH',
  'Julia Hartmann',
  'julia.hartmann@techcloud.de',
  '+49 89 1234567',
  'https://techcloud.de',
  'aktiv',
  'Cloud-Infrastruktur und DevOps-Lösungen für mittelständische Unternehmen. Sehr guter Partner, zahlt pünktlich.',
  'Bevorzugt Mid-Roll-Platzierungen in Tech-Episoden. Kein Interesse an KI-kritischen Inhalten.',
  '["tech","cloud","b2b","devops"]',
  15000.00,
  'EUR',
  'demo-user-admin-001'
),
(
  'demo-sponsor-002',
  'DataSafe VPN',
  'DataSafe Technologies AG',
  'Markus Keller',
  'm.keller@datasafe.io',
  '+41 44 9876543',
  'https://datasafe.io',
  'aktiv',
  'VPN- und Datenschutz-Software für Privatanwender und Unternehmen. Schweizer Unternehmen, DSGVO-konform.',
  'Sehr an Datenschutz-Episoden interessiert. Bietet Rabattcodes für Hörer an.',
  '["datenschutz","vpn","security","privacy"]',
  8500.00,
  'EUR',
  'demo-user-admin-001'
),
(
  'demo-sponsor-003',
  'LearnCode Academy',
  'LearnCode GmbH',
  'Anna Fischer',
  'anna@learncode.de',
  '+49 30 5554321',
  'https://learncode.de',
  'aktiv',
  'Online-Lernplattform für Programmierung und IT. Richtet sich an Einsteiger und Fortgeschrittene.',
  'Neuer Sponsor seit Q3 2024. Sehr kooperativ bei der Skript-Erstellung.',
  '["bildung","coding","online-learning","it"]',
  6000.00,
  'EUR',
  'demo-user-admin-001'
),
(
  'demo-sponsor-004',
  'GreenTech Invest',
  'GreenTech Invest KG',
  'Dr. Peter Vogel',
  'p.vogel@greentech-invest.de',
  '+49 40 7778899',
  'https://greentech-invest.de',
  'interessent',
  'Nachhaltige Tech-Investments und ESG-Fonds. Interessiert an Episoden über Green IT und Nachhaltigkeit.',
  'Erstkontakt auf der re:publica 2024. Anfrage läuft noch.',
  '["nachhaltigkeit","greentech","investment","esg"]',
  NULL,
  'EUR',
  'demo-user-admin-001'
);

-- ============================================================
-- 5. WERBEPLÄTZE (Ad Slots)
-- ============================================================
INSERT OR IGNORE INTO ad_slots (id, sponsor_id, name, category, category_id, production_type, status, duration, script, price, currency, start_date, end_date, target_episodes, notes) VALUES
(
  'demo-slot-001',
  'demo-sponsor-001',
  'TechCloud Q4 2024 Mid-Roll',
  'mid-roll',
  'demo-cat-midroll',
  'eigenproduktion',
  'aktiv',
  60,
  'Diese Episode wird euch präsentiert von TechCloud Solutions — der Cloud-Infrastruktur für den Mittelstand. Mit TechCloud migriert ihr eure IT sicher, schnell und DSGVO-konform in die Cloud. Jetzt 30 Tage kostenlos testen unter techcloud.de/podcast — den Link findet ihr in den Show Notes.',
  1200.00,
  'EUR',
  '2024-10-01',
  '2024-12-31',
  8,
  'Skript von Julia Hartmann freigegeben am 15.09.2024'
),
(
  'demo-slot-002',
  'demo-sponsor-002',
  'DataSafe Pre-Roll Dauerbuchung',
  'pre-roll',
  'demo-cat-preroll',
  'eigenproduktion',
  'aktiv',
  30,
  'Kurze Werbung: Euer Datenschutz liegt uns am Herzen — deshalb empfehlen wir DataSafe VPN. Sicher surfen, anonym bleiben, DSGVO-konform. Jetzt 3 Monate gratis mit dem Code DEEPDIVE unter datasafe.io/podcast.',
  800.00,
  'EUR',
  '2024-09-01',
  '2025-03-31',
  NULL,
  'Dauerbuchung, automatische Verlängerung möglich'
),
(
  'demo-slot-003',
  'demo-sponsor-003',
  'LearnCode Folgensponsor November',
  'folgensponsor',
  'demo-cat-folgensponsor',
  'eigenproduktion',
  'bestätigt',
  90,
  'Diese Episode wird präsentiert von LearnCode Academy — der Online-Lernplattform für alle, die Programmieren lernen wollen. Egal ob Anfänger oder Profi: Mit über 200 Kursen und einer aktiven Community bringt LearnCode euch ans Ziel. Jetzt starten unter learncode.de — mit dem Code DEEPDIVE bekommt ihr den ersten Monat kostenlos.',
  2500.00,
  'EUR',
  '2024-11-01',
  '2024-11-30',
  2,
  'Exklusiver Folgensponsor für November 2024'
);

-- ============================================================
-- 6. EPISODEN
-- ============================================================
INSERT OR IGNORE INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, production_info, technical_data, season_id, approval_status, created_by) VALUES
(
  'demo-ep-001',
  1,
  'Willkommen bei Deep Dive Digital',
  'Was euch in diesem Podcast erwartet',
  '<p>In der ersten Episode stellen wir uns vor: Wer sind wir, was treibt uns an, und warum braucht die Welt noch einen Tech-Podcast? Max und Sarah erzählen von ihrer Vision für Deep Dive Digital und geben einen Ausblick auf die kommenden Themen.</p><p>Wir sprechen über KI, Datenschutz, die Zukunft der Arbeit und die gesellschaftlichen Auswirkungen der Digitalisierung — immer mit dem Anspruch, komplexe Themen verständlich zu machen.</p>',
  'veroeffentlicht',
  '2024-01-10',
  '2024-01-15',
  2340,
  '["Max Müller","Sarah Schneider"]',
  '[]',
  '["intro","meta","podcast","willkommen"]',
  '[{"id":"b001","type":"intro","title":"Intro","duration":30,"content":"","assetName":null},{"id":"b002","type":"moderation","title":"Begrüßung","duration":180,"content":"<p>Herzlich willkommen bei Deep Dive Digital! Ich bin Max Müller und mit mir ist heute Sarah Schneider. Wir freuen uns riesig, dass ihr dabei seid.</p>"},{"id":"b003","type":"moderation","title":"Über uns","duration":300,"content":"<p>Kurz zu uns: Ich, Max, arbeite seit 15 Jahren in der IT-Branche, zuletzt als Produktmanager bei einem Berliner SaaS-Startup. Sarah ist Journalistin mit Schwerpunkt Technologie und hat für verschiedene Medien über Digitalisierung geschrieben.</p>"},{"id":"b004","type":"moderation","title":"Was euch erwartet","duration":420,"content":"<p>In Deep Dive Digital wollen wir tief in Themen einsteigen, die uns alle betreffen: Künstliche Intelligenz, Datenschutz, Social Media, die Zukunft der Arbeit. Aber nicht als trockene Technik-Vorlesung — sondern als echtes Gespräch.</p>"},{"id":"b005","type":"outro","title":"Outro","duration":30,"content":"","assetName":null}]',
  '[]',
  'Erste Episode, kein Schnitt nötig. Ton war sehr gut.',
  'Aufgenommen im Heimstudio Max. Rode NT1 Mikrofone. Zoom H6 als Interface.',
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-001',
  'freigegeben',
  'demo-user-admin-001'
),
(
  'demo-ep-002',
  2,
  'Künstliche Intelligenz — Fluch oder Segen?',
  'ChatGPT, Midjourney & Co.: Was KI wirklich kann (und was nicht)',
  '<p>KI ist in aller Munde — aber was steckt wirklich dahinter? In dieser Episode erklären wir, wie Large Language Models funktionieren, was sie können und wo ihre Grenzen liegen. Wir sprechen über ChatGPT, Midjourney und die gesellschaftlichen Auswirkungen der KI-Revolution.</p>',
  'veroeffentlicht',
  '2024-01-24',
  '2024-01-29',
  3120,
  '["Max Müller","Sarah Schneider"]',
  '["Dr. Petra Hoffmann"]',
  '["ki","chatgpt","llm","gesellschaft","technologie"]',
  '[{"id":"b010","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b011","type":"moderation","title":"Themeneinführung KI","duration":240,"content":"<p>Heute sprechen wir über das Thema, das 2023 alles dominiert hat: Künstliche Intelligenz. ChatGPT hat in kürzester Zeit 100 Millionen Nutzer erreicht — schneller als jede andere App in der Geschichte.</p>"},{"id":"b012","type":"interview","title":"Interview Dr. Hoffmann","duration":1800,"content":"<p>Wir haben Dr. Petra Hoffmann eingeladen, KI-Forscherin an der TU Berlin. Sie erklärt uns, wie Large Language Models wirklich funktionieren.</p>"},{"id":"b013","type":"ad","title":"Werbung DataSafe","duration":30,"content":""},{"id":"b014","type":"moderation","title":"Gesellschaftliche Auswirkungen","duration":600,"content":"<p>Was bedeutet das alles für uns als Gesellschaft? Jobs, Bildung, Kreativität — alles steht auf dem Prüfstand.</p>"},{"id":"b015","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-002"]',
  'Sehr gute Episode. Dr. Hoffmann war ein toller Gast.',
  'Aufgenommen remote via Riverside.fm. Nachbearbeitung: 3h Schnitt, Rauschreduzierung.',
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-001',
  'freigegeben',
  'demo-user-admin-001'
),
(
  'demo-ep-003',
  3,
  'Datenschutz im Alltag — So schützt du dich wirklich',
  'DSGVO, Tracking, Cookies: Was du wissen musst',
  '<p>Datenschutz ist kein Luxus — es ist ein Grundrecht. Aber wie schützt man sich im digitalen Alltag wirklich? Wir gehen durch die wichtigsten Maßnahmen: sichere Passwörter, VPN, Browser-Einstellungen und was die DSGVO wirklich bedeutet.</p>',
  'veroeffentlicht',
  '2024-02-07',
  '2024-02-12',
  2880,
  '["Max Müller","Sarah Schneider"]',
  '[]',
  '["datenschutz","dsgvo","privacy","sicherheit","vpn"]',
  '[{"id":"b020","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b021","type":"ad","title":"DataSafe Pre-Roll","duration":30,"content":""},{"id":"b022","type":"moderation","title":"Warum Datenschutz wichtig ist","duration":360,"content":"<p>Jedes Mal, wenn ihr eine App öffnet, hinterlasst ihr Spuren. Euer Standort, eure Interessen, eure Gewohnheiten — all das wird gesammelt, analysiert und verkauft.</p>"},{"id":"b023","type":"moderation","title":"Praktische Tipps","duration":900,"content":"<p>Passwort-Manager, Zwei-Faktor-Authentifizierung, VPN — wir gehen durch die wichtigsten Maßnahmen Schritt für Schritt.</p>"},{"id":"b024","type":"ad","title":"DataSafe Mid-Roll","duration":60,"content":""},{"id":"b025","type":"moderation","title":"DSGVO einfach erklärt","duration":720,"content":"<p>Die Datenschutz-Grundverordnung gibt euch Rechte — aber die meisten kennen sie nicht. Wir erklären, was ihr einfordern könnt.</p>"},{"id":"b026","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-002"]',
  'DataSafe sehr zufrieden mit der Episode.',
  NULL,
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-001',
  'freigegeben',
  'demo-user-admin-001'
),
(
  'demo-ep-004',
  4,
  'Die Zukunft der Arbeit — Remote, KI und neue Berufsbilder',
  'Wie Technologie unsere Arbeitswelt auf den Kopf stellt',
  '<p>Home Office, KI-Assistenten, digitale Nomaden — die Arbeitswelt verändert sich rasant. Welche Jobs werden verschwinden? Welche entstehen neu? Und wie bereiten wir uns auf diese Veränderungen vor?</p>',
  'veroeffentlicht',
  '2024-02-21',
  '2024-02-26',
  3600,
  '["Max Müller","Sarah Schneider"]',
  '["Prof. Klaus Richter"]',
  '["arbeit","remote","ki","zukunft","berufe"]',
  '[{"id":"b030","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b031","type":"ad","title":"TechCloud Pre-Roll","duration":30,"content":""},{"id":"b032","type":"moderation","title":"Status quo der Arbeitswelt","duration":480,"content":"<p>Seit der Pandemie hat sich die Arbeitswelt fundamental verändert. Remote Work ist für viele zur Normalität geworden.</p>"},{"id":"b033","type":"interview","title":"Interview Prof. Richter","duration":1800,"content":"<p>Prof. Klaus Richter von der Universität Hamburg forscht zur Zukunft der Arbeit. Er erklärt, welche Berufe gefährdet sind und welche entstehen.</p>"},{"id":"b034","type":"ad","title":"TechCloud Mid-Roll","duration":60,"content":""},{"id":"b035","type":"moderation","title":"Handlungsempfehlungen","duration":600,"content":"<p>Was können wir jetzt tun? Weiterbildung, Flexibilität, digitale Kompetenzen — wir geben konkrete Tipps.</p>"},{"id":"b036","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-001"]',
  'Prof. Richter hat sehr interessante Perspektiven eingebracht.',
  'Aufgenommen im Studio der Universität Hamburg.',
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-001',
  'freigegeben',
  'demo-user-admin-001'
),
(
  'demo-ep-005',
  5,
  'Social Media — Sucht, Algorithmen und mentale Gesundheit',
  'Was Instagram, TikTok & Co. mit unserem Gehirn machen',
  '<p>Durchschnittlich verbringen wir über 6 Stunden täglich mit digitalen Medien. Was macht das mit uns? Wir sprechen über Algorithmen, die uns süchtig machen sollen, über mentale Gesundheit und darüber, wie wir einen gesunden Umgang mit Social Media finden.</p>',
  'veroeffentlicht',
  '2024-03-06',
  '2024-03-11',
  3240,
  '["Max Müller","Sarah Schneider"]',
  '["Dr. Lisa Bauer"]',
  '["social-media","algorithmen","mental-health","tiktok","instagram"]',
  '[{"id":"b040","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b041","type":"ad","title":"DataSafe Pre-Roll","duration":30,"content":""},{"id":"b042","type":"moderation","title":"Zahlen und Fakten","duration":300,"content":"<p>6 Stunden täglich — das ist der Durchschnitt. Bei Teenagern sind es sogar über 9 Stunden. Was passiert in dieser Zeit in unserem Gehirn?</p>"},{"id":"b043","type":"interview","title":"Interview Dr. Bauer","duration":1500,"content":"<p>Dr. Lisa Bauer ist Psychologin und forscht zu Social Media und mentaler Gesundheit. Sie erklärt, wie Dopamin-Schleifen funktionieren.</p>"},{"id":"b044","type":"ad","title":"DataSafe Mid-Roll","duration":60,"content":""},{"id":"b045","type":"moderation","title":"Praktische Tipps für Digital Detox","duration":720,"content":"<p>Wie kommt man raus aus der Sucht? Wir haben konkrete Tipps gesammelt.</p>"},{"id":"b046","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-002"]',
  NULL,
  NULL,
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-001',
  'freigegeben',
  'demo-user-admin-001'
),
-- Staffel 2 Episoden
(
  'demo-ep-006',
  6,
  'Deepfakes — Wenn Sehen nicht mehr Glauben bedeutet',
  'KI-generierte Fakes und die Krise der Wahrheit',
  '<p>Deepfakes werden immer besser und immer einfacher zu erstellen. Was bedeutet das für unsere Demokratie, für Wahlen, für das Vertrauen in Medien? Wir sprechen über die Technologie hinter Deepfakes und was wir dagegen tun können.</p>',
  'veroeffentlicht',
  '2024-09-04',
  '2024-09-09',
  3480,
  '["Max Müller","Sarah Schneider"]',
  '["Thomas Lange"]',
  '["deepfakes","ki","demokratie","medien","desinformation"]',
  '[{"id":"b050","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b051","type":"ad","title":"TechCloud Pre-Roll","duration":30,"content":""},{"id":"b052","type":"moderation","title":"Was sind Deepfakes?","duration":480,"content":"<p>Ein Deepfake ist ein KI-generiertes Video oder Bild, das eine Person zeigt, die etwas tut oder sagt, was sie nie getan oder gesagt hat.</p>"},{"id":"b053","type":"interview","title":"Interview Thomas Lange","duration":1800,"content":"<p>Thomas Lange ist Investigativjournalist und hat für eine große Recherche über Deepfakes in der Politik gearbeitet.</p>"},{"id":"b054","type":"ad","title":"TechCloud Mid-Roll","duration":60,"content":""},{"id":"b055","type":"moderation","title":"Gegenmittel und Ausblick","duration":780,"content":"<p>Was können Plattformen, Gesetzgeber und wir selbst tun?</p>"},{"id":"b056","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-001"]',
  NULL,
  NULL,
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-002',
  'freigegeben',
  'demo-user-admin-001'
),
(
  'demo-ep-007',
  7,
  'Das Metaverse — Hype oder Zukunft?',
  'Meta, Apple Vision Pro und die virtuelle Realität',
  '<p>Meta hat Milliarden in das Metaverse investiert — und bisher wenig vorzuweisen. Apple hat mit dem Vision Pro einen neuen Anlauf gestartet. Ist das die Zukunft des Internets oder nur ein teurer Hype?</p>',
  'schnitt',
  '2024-10-02',
  '2024-10-14',
  3900,
  '["Max Müller","Tom Weber"]',
  '["Carla Zimmermann"]',
  '["metaverse","vr","ar","meta","apple","zukunft"]',
  '[{"id":"b060","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b061","type":"ad","title":"LearnCode Folgensponsor","duration":90,"content":""},{"id":"b062","type":"moderation","title":"Was ist das Metaverse?","duration":420,"content":"<p>Das Metaverse ist eine Idee, die seit Jahren die Tech-Branche beschäftigt: Ein persistentes, dreidimensionales Internet, in dem wir arbeiten, spielen und kommunizieren.</p>"},{"id":"b063","type":"interview","title":"Interview Carla Zimmermann","duration":2100,"content":"<p>Carla Zimmermann ist UX-Designerin und hat an mehreren VR-Projekten gearbeitet. Sie erklärt, was heute schon möglich ist.</p>"},{"id":"b064","type":"moderation","title":"Kritische Betrachtung","duration":660,"content":"<p>Aber ist das wirklich die Zukunft? Oder ist es ein Milliarden-Grab für Konzerne?</p>"},{"id":"b065","type":"outro","title":"Outro","duration":30,"content":""}]',
  '["demo-sponsor-003"]',
  'Schnitt läuft. Carla Zimmermann hat sehr gutes Material geliefert.',
  'Aufgenommen remote. Etwas Hall bei Carla — muss bearbeitet werden.',
  '{"bitrate":"192kbps","sampleRate":"44.1kHz","format":"MP3","channels":"Stereo"}',
  'demo-season-002',
  'angefragt',
  'demo-user-redakteur-001'
),
(
  'demo-ep-008',
  8,
  'Quantencomputer — Die nächste Revolution',
  'Was Quantencomputing bedeutet und wann es uns betrifft',
  '<p>Quantencomputer versprechen, Probleme zu lösen, die klassische Computer nie lösen könnten. Aber wann kommt der Quantencomputer in die Praxis? Und was bedeutet das für Verschlüsselung und Datensicherheit?</p>',
  'aufnahme',
  '2024-10-23',
  '2024-11-04',
  NULL,
  '["Max Müller","Sarah Schneider"]',
  '["Dr. Felix Krause"]',
  '["quantencomputer","verschlüsselung","zukunft","physik","it-sicherheit"]',
  '[{"id":"b070","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b071","type":"ad","title":"DataSafe Pre-Roll","duration":30,"content":""},{"id":"b072","type":"moderation","title":"Grundlagen Quantencomputing","duration":600,"content":"<p>Ein Quantencomputer nutzt die Prinzipien der Quantenmechanik — Superposition und Verschränkung — um Berechnungen durchzuführen, die klassische Computer überfordern.</p>"},{"id":"b073","type":"interview","title":"Interview Dr. Krause","duration":2400,"content":"<p>Dr. Felix Krause forscht am Fraunhofer-Institut an Quantencomputern. Er erklärt uns den aktuellen Stand der Forschung.</p>"},{"id":"b074","type":"moderation","title":"Auswirkungen auf Sicherheit","duration":720,"content":"<p>Quantencomputer könnten aktuelle Verschlüsselungsverfahren brechen. Was bedeutet das für unsere Daten?</p>"},{"id":"b075","type":"outro","title":"Outro","duration":30,"content":""}]',
  '[]',
  'Aufnahme geplant für 23.10. Dr. Krause hat Fragenkatalog erhalten.',
  NULL,
  '{}',
  'demo-season-002',
  'ausstehend',
  'demo-user-redakteur-001'
),
(
  'demo-ep-009',
  9,
  'Open Source — Die unsichtbare Macht hinter dem Internet',
  'Wie freie Software die Welt verändert',
  '<p>Linux läuft auf 96% aller Server weltweit. Firefox, LibreOffice, Android — Open Source ist überall. Aber wie funktioniert das Modell? Wer bezahlt dafür? Und ist Open Source wirklich sicherer?</p>',
  'entwurf',
  NULL,
  '2024-11-18',
  NULL,
  '["Max Müller","Sarah Schneider"]',
  '[]',
  '["open-source","linux","software","community","entwicklung"]',
  '[{"id":"b080","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b081","type":"moderation","title":"Was ist Open Source?","duration":480,"content":"<p>Open Source bedeutet: Der Quellcode einer Software ist öffentlich zugänglich, jeder kann ihn lesen, verändern und weitergeben.</p>"},{"id":"b082","type":"moderation","title":"Geschichte und Bedeutung","duration":600,"content":"<p>Von Richard Stallmans GNU-Projekt bis zu Linus Torvalds Linux-Kernel — die Geschichte von Open Source ist eine Geschichte von Idealismus und Pragmatismus.</p>"},{"id":"b083","type":"moderation","title":"Geschäftsmodelle","duration":540,"content":"<p>Wie verdienen Unternehmen mit kostenloser Software Geld? Red Hat, Canonical, HashiCorp — wir schauen uns verschiedene Modelle an.</p>"},{"id":"b084","type":"outro","title":"Outro","duration":30,"content":""}]',
  '[]',
  'Gast noch gesucht. Evtl. jemanden von der FSFE anfragen.',
  NULL,
  '{}',
  'demo-season-002',
  'ausstehend',
  'demo-user-redakteur-001'
),
(
  'demo-ep-010',
  10,
  'Klimatechnologie — Kann Tech die Welt retten?',
  'Carbon Capture, Smart Grids und die Grenzen der Techno-Optimismus',
  '<p>Technologie soll den Klimawandel stoppen — aber kann sie das wirklich? Wir sprechen über Carbon Capture, erneuerbare Energien, Smart Grids und die Frage, ob wir uns zu sehr auf technische Lösungen verlassen.</p>',
  'entwurf',
  NULL,
  '2024-12-02',
  NULL,
  '["Max Müller","Sarah Schneider"]',
  '[]',
  '["klima","nachhaltigkeit","greentech","energie","zukunft"]',
  '[{"id":"b090","type":"intro","title":"Intro","duration":30,"content":""},{"id":"b091","type":"moderation","title":"Der Techno-Optimismus","duration":480,"content":"<p>Viele glauben: Technologie wird uns retten. Carbon Capture, Kernfusion, Geoengineering — die Lösungen kommen.</p>"},{"id":"b092","type":"moderation","title":"Kritische Perspektive","duration":600,"content":"<p>Aber ist das realistisch? Oder verleitet uns der Glaube an technische Lösungen dazu, notwendige Verhaltensänderungen aufzuschieben?</p>"},{"id":"b093","type":"outro","title":"Outro","duration":30,"content":""}]',
  '[]',
  'GreenTech Invest als Sponsor anfragen? Würde thematisch passen.',
  NULL,
  '{}',
  'demo-season-002',
  'ausstehend',
  'demo-user-redakteur-001'
);

-- ============================================================
-- 7. AD PLACEMENTS (Werbebuchungen in Episoden)
-- ============================================================
INSERT OR IGNORE INTO ad_placements (id, ad_slot_id, episode_id, episode_title, episode_number, position, confirmed, publish_date, listens, price, currency, invoice_number, invoice_date, invoice_status) VALUES
('demo-placement-001', 'demo-slot-001', 'demo-ep-004', 'Die Zukunft der Arbeit', 4, 'pre-roll', 1, '2024-02-26', 4820, 800.00, 'EUR', 'RE-2024-001', '2024-03-01', 'bezahlt'),
('demo-placement-002', 'demo-slot-001', 'demo-ep-006', 'Deepfakes', 6, 'mid-roll', 1, '2024-09-09', 5210, 1200.00, 'EUR', 'RE-2024-002', '2024-09-15', 'bezahlt'),
('demo-placement-003', 'demo-slot-002', 'demo-ep-002', 'Künstliche Intelligenz', 2, 'pre-roll', 1, '2024-01-29', 6100, 800.00, 'EUR', 'RE-2024-003', '2024-02-01', 'bezahlt'),
('demo-placement-004', 'demo-slot-002', 'demo-ep-003', 'Datenschutz im Alltag', 3, 'pre-roll', 1, '2024-02-12', 5430, 800.00, 'EUR', 'RE-2024-004', '2024-02-15', 'bezahlt'),
('demo-placement-005', 'demo-slot-002', 'demo-ep-005', 'Social Media', 5, 'pre-roll', 1, '2024-03-11', 4980, 800.00, 'EUR', 'RE-2024-005', '2024-03-15', 'bezahlt'),
('demo-placement-006', 'demo-slot-003', 'demo-ep-007', 'Das Metaverse', 7, 'pre-roll', 1, '2024-10-14', NULL, 2500.00, 'EUR', NULL, NULL, 'offen');

-- ============================================================
-- 8. IDEEN / REDAKTIONS-HUB
-- ============================================================
INSERT OR IGNORE INTO ideas (id, title, description, status, priority, tags, assigned_to, target_audience, episode_format, target_duration, target_date, created_by) VALUES
(
  'demo-idea-001',
  'Blockchain jenseits von Krypto — echte Anwendungsfälle',
  'Blockchain wird immer noch hauptsächlich mit Kryptowährungen assoziiert. Aber es gibt spannende echte Anwendungsfälle: Lieferketten-Transparenz, digitale Identitäten, Wahlsysteme. Eine nüchterne Bestandsaufnahme ohne Hype.',
  'recherche',
  'hoch',
  '["blockchain","krypto","technologie","anwendung"]',
  'demo-user-redakteur-001',
  'Tech-Interessierte, die Blockchain verstehen wollen ohne Krypto-Hype',
  'Erklärstück mit Experteninterview',
  45,
  '2024-11-25',
  'demo-user-redakteur-001'
),
(
  'demo-idea-002',
  'Das Ende der Passwörter — Passkeys und die Zukunft der Authentifizierung',
  'Apple, Google und Microsoft haben Passkeys eingeführt. Sind Passwörter bald Geschichte? Wir erklären, wie Passkeys funktionieren, warum sie sicherer sind und was die Umstellung bedeutet.',
  'bereit',
  'hoch',
  '["sicherheit","passkeys","authentifizierung","apple","google"]',
  'demo-user-admin-001',
  'Alle, die sich um ihre Online-Sicherheit sorgen',
  'Erklärstück',
  35,
  '2024-12-09',
  'demo-user-admin-001'
),
(
  'demo-idea-003',
  'Algorithmen und Demokratie — Wie Empfehlungssysteme Wahlen beeinflussen',
  'Filterblasen, Echokammern, gezielte Desinformation — wie beeinflussen die Algorithmen von Facebook, YouTube und TikTok unsere politischen Meinungen? Und was können wir dagegen tun?',
  'recherche',
  'hoch',
  '["algorithmen","demokratie","wahlen","social-media","desinformation"]',
  'demo-user-redakteur-001',
  'Politisch interessierte Hörer',
  'Tiefes Gespräch mit Politikwissenschaftler',
  60,
  '2025-01-13',
  'demo-user-redakteur-001'
),
(
  'demo-idea-004',
  'Smart Home — Komfort vs. Datenschutz',
  'Alexa hört immer zu, der Kühlschrank kennt unsere Ernährungsgewohnheiten, die Kamera überwacht den Eingang. Wie viel Komfort ist uns unsere Privatsphäre wert?',
  'neu',
  'mittel',
  '["smart-home","datenschutz","iot","alexa","privatsphäre"]',
  NULL,
  'Smart-Home-Nutzer und Datenschutz-Interessierte',
  'Diskussion mit Praxis-Tipps',
  40,
  NULL,
  'demo-user-admin-001'
),
(
  'demo-idea-005',
  'Cybermobbing — Wenn das Netz zur Waffe wird',
  'Cybermobbing betrifft nicht nur Jugendliche. Wir sprechen über die psychologischen Auswirkungen, rechtliche Möglichkeiten und was Plattformen tun (müssen).',
  'neu',
  'mittel',
  '["cybermobbing","social-media","mental-health","recht","jugend"]',
  NULL,
  'Eltern, Jugendliche, alle Internetnutzer',
  'Gespräch mit Psychologe und Betroffener',
  50,
  NULL,
  'demo-user-redakteur-001'
),
(
  'demo-idea-006',
  'Die 4-Tage-Woche und Produktivitäts-Tools',
  'Immer mehr Unternehmen testen die 4-Tage-Woche. Gleichzeitig versprechen KI-Tools und Automatisierung, uns produktiver zu machen. Passt das zusammen?',
  'abgelehnt',
  'niedrig',
  '["arbeit","produktivität","ki","4-tage-woche"]',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'demo-user-admin-001'
);

-- ============================================================
-- 9. IDEEN-CHECKLISTEN
-- ============================================================
INSERT OR IGNORE INTO idea_checklists (id, idea_id, title, is_done, sort_order) VALUES
('demo-cl-001', 'demo-idea-001', 'Experten für Blockchain-Anwendungsfälle recherchieren', 1, 1),
('demo-cl-002', 'demo-idea-001', 'Konkrete Fallbeispiele sammeln (Lieferkette, Identität, Wahlen)', 1, 2),
('demo-cl-003', 'demo-idea-001', 'Interviewpartner kontaktieren', 0, 3),
('demo-cl-004', 'demo-idea-001', 'Fragenkatalog erstellen', 0, 4),
('demo-cl-005', 'demo-idea-002', 'Technische Grundlagen von Passkeys verstehen und dokumentieren', 1, 1),
('demo-cl-006', 'demo-idea-002', 'Praxis-Demo vorbereiten (iPhone + Google)', 1, 2),
('demo-cl-007', 'demo-idea-002', 'Sicherheitsexperten als Gesprächspartner anfragen', 1, 3),
('demo-cl-008', 'demo-idea-002', 'Script-Entwurf erstellen', 1, 4),
('demo-cl-009', 'demo-idea-002', 'Aufnahme terminieren', 0, 5),
('demo-cl-010', 'demo-idea-003', 'Literatur zu Filterblasen und Algorithmen sichten', 1, 1),
('demo-cl-011', 'demo-idea-003', 'Politikwissenschaftler als Gast anfragen', 0, 2),
('demo-cl-012', 'demo-idea-003', 'Fallbeispiele aus aktuellen Wahlen recherchieren', 0, 3);

-- ============================================================
-- 10. IDEEN-NOTIZEN
-- ============================================================
INSERT OR IGNORE INTO idea_notes (id, idea_id, content, created_by) VALUES
('demo-in-001', 'demo-idea-001', '<p>Guter Artikel in der c''t über Blockchain in der Lieferkette: Walmart nutzt Blockchain, um Lebensmittel zurückzuverfolgen. Das wäre ein konkretes Beispiel für die Episode.</p>', 'demo-user-redakteur-001'),
('demo-in-002', 'demo-idea-001', '<p>Kontakt zu Prof. Müller von der RWTH Aachen aufgenommen. Er forscht zu Blockchain-Anwendungen im Gesundheitswesen. Antwort steht noch aus.</p>', 'demo-user-admin-001'),
('demo-in-003', 'demo-idea-002', '<p>Apple hat Passkeys jetzt in iOS 17 deutlich verbessert. Guter Zeitpunkt für die Episode. Wir sollten auch auf die Kompatibilitätsprobleme eingehen — nicht alle Websites unterstützen Passkeys noch.</p>', 'demo-user-admin-001'),
('demo-in-004', 'demo-idea-003', '<p>Studie der Universität Oxford: Algorithmen verstärken politische Polarisierung messbar. Sehr gute Quelle für die Episode.</p>', 'demo-user-redakteur-001');

-- ============================================================
-- 11. INTERVIEW-PARTNER
-- ============================================================
INSERT OR IGNORE INTO interview_partners (id, name, company, role, email, phone, bio, tags, notes, guest_intro) VALUES
(
  'demo-partner-001',
  'Dr. Petra Hoffmann',
  'TU Berlin',
  'KI-Forscherin',
  'p.hoffmann@tu-berlin.de',
  '+49 30 314-12345',
  'Dr. Petra Hoffmann ist Professorin für Maschinelles Lernen an der TU Berlin. Sie forscht seit 15 Jahren zu Large Language Models und deren gesellschaftlichen Auswirkungen. Sie ist Autorin des Buches "KI verstehen" und regelmäßige Expertin in ARD und ZDF.',
  '["ki","machine-learning","llm","wissenschaft"]',
  'Sehr angenehme Gesprächspartnerin. Erklärt komplexe Themen sehr verständlich. Gerne wieder einladen.',
  'Dr. Petra Hoffmann ist Professorin für Maschinelles Lernen an der TU Berlin und eine der führenden KI-Forscherinnen Deutschlands.'
),
(
  'demo-partner-002',
  'Prof. Klaus Richter',
  'Universität Hamburg',
  'Arbeitsmarktforscher',
  'k.richter@uni-hamburg.de',
  '+49 40 42838-0',
  'Prof. Klaus Richter leitet das Institut für Arbeitsmarkt und Berufsforschung an der Universität Hamburg. Er berät Bundesministerien und ist Mitglied des Sachverständigenrats Digitalisierung.',
  '["arbeit","digitalisierung","wirtschaft","politik"]',
  'Hat sehr klare Meinungen. Gut vorbereitet sein. Mag keine zu technischen Fragen.',
  'Prof. Klaus Richter ist einer der renommiertesten Arbeitsmarktforscher Deutschlands und berät die Bundesregierung in Fragen der Digitalisierung.'
),
(
  'demo-partner-003',
  'Dr. Lisa Bauer',
  'Charité Berlin',
  'Psychologin',
  'l.bauer@charite.de',
  '+49 30 450-1',
  'Dr. Lisa Bauer ist klinische Psychologin an der Charité Berlin und forscht zu den Auswirkungen sozialer Medien auf die psychische Gesundheit. Sie behandelt auch Patienten mit Social-Media-Sucht.',
  '["psychologie","social-media","mental-health","sucht"]',
  'Sehr empathisch und nahbar. Gut für Episoden, die persönliche Geschichten einschließen.',
  'Dr. Lisa Bauer ist klinische Psychologin an der Charité und eine der führenden Expertinnen für Social-Media-Sucht in Deutschland.'
),
(
  'demo-partner-004',
  'Thomas Lange',
  'Correctiv',
  'Investigativjournalist',
  't.lange@correctiv.org',
  NULL,
  'Thomas Lange ist investigativer Journalist bei Correctiv und hat mehrere preisgekrönte Recherchen zu Desinformation und Deepfakes veröffentlicht. Er ist Mitgründer des Fact-Checking-Netzwerks.',
  '["journalismus","deepfakes","desinformation","fact-checking"]',
  'Sehr beschäftigt. Frühzeitig anfragen. Bevorzugt kurze Interviews (max. 30 Min.).',
  'Thomas Lange ist investigativer Journalist bei Correctiv und hat mehrere preisgekrönte Recherchen zu Desinformation und Deepfakes veröffentlicht.'
),
(
  'demo-partner-005',
  'Carla Zimmermann',
  'Freelance',
  'UX-Designerin & VR-Expertin',
  'hello@carlazimmermann.de',
  '+49 176 99887766',
  'Carla Zimmermann ist freiberufliche UX-Designerin mit Spezialisierung auf Virtual Reality und Spatial Computing. Sie hat an VR-Projekten für BMW, Deutsche Telekom und mehrere Startups gearbeitet.',
  '["ux","vr","ar","design","metaverse"]',
  'Sehr enthusiastisch über VR. Gute Energie im Gespräch. Hat eigene Demo-Inhalte mitgebracht.',
  'Carla Zimmermann ist UX-Designerin und VR-Expertin und hat an Virtual-Reality-Projekten für DAX-Konzerne und Startups gearbeitet.'
);

-- ============================================================
-- 12. INTERVIEW-FRAGEN
-- ============================================================
INSERT OR IGNORE INTO interview_questions (id, partner_id, episode_id, question, category, sort_order, answered) VALUES
('demo-q-001', 'demo-partner-001', 'demo-ep-002', 'Wie würden Sie einem 10-Jährigen erklären, wie ChatGPT funktioniert?', 'Grundlagen', 1, 1),
('demo-q-002', 'demo-partner-001', 'demo-ep-002', 'Was können LLMs wirklich gut — und was können sie überhaupt nicht?', 'Fähigkeiten', 2, 1),
('demo-q-003', 'demo-partner-001', 'demo-ep-002', 'Welche gesellschaftlichen Risiken sehen Sie durch KI in den nächsten 5 Jahren?', 'Gesellschaft', 3, 1),
('demo-q-004', 'demo-partner-001', 'demo-ep-002', 'Wie sollte KI reguliert werden — und wer sollte das tun?', 'Regulierung', 4, 1),
('demo-q-005', 'demo-partner-002', 'demo-ep-004', 'Welche Berufe werden durch KI und Automatisierung am stärksten bedroht?', 'Jobverlust', 1, 1),
('demo-q-006', 'demo-partner-002', 'demo-ep-004', 'Welche neuen Berufsbilder entstehen durch die Digitalisierung?', 'Neue Berufe', 2, 1),
('demo-q-007', 'demo-partner-002', 'demo-ep-004', 'Wie sollte Bildung auf die veränderte Arbeitswelt reagieren?', 'Bildung', 3, 1),
('demo-q-008', 'demo-partner-003', 'demo-ep-005', 'Ab wann spricht man von einer Social-Media-Sucht?', 'Definition', 1, 1),
('demo-q-009', 'demo-partner-003', 'demo-ep-005', 'Wie manipulieren Algorithmen unser Verhalten gezielt?', 'Algorithmen', 2, 1),
('demo-q-010', 'demo-partner-003', 'demo-ep-005', 'Was empfehlen Sie Eltern, deren Kinder zu viel Zeit auf Social Media verbringen?', 'Praxis', 3, 1),
('demo-q-011', 'demo-partner-004', 'demo-ep-006', 'Wie gut sind aktuelle Deepfake-Detektoren?', 'Technologie', 1, 1),
('demo-q-012', 'demo-partner-004', 'demo-ep-006', 'Welche politischen Deepfakes haben Sie in Ihrer Recherche gefunden?', 'Beispiele', 2, 1),
('demo-q-013', 'demo-partner-005', 'demo-ep-007', 'Was ist heute schon im Metaverse möglich — jenseits von Gaming?', 'Anwendungen', 1, 1),
('demo-q-014', 'demo-partner-005', 'demo-ep-007', 'Warum ist das Metaverse bisher gescheitert?', 'Kritik', 2, 1);

-- ============================================================
-- 13. REDAKTIONSPLAN
-- ============================================================
INSERT OR IGNORE INTO editorial_plan (id, episode_id, idea_id, title, planned_date, status, assigned_to, notes) VALUES
('demo-plan-001', 'demo-ep-007', NULL, 'Metaverse-Episode: Schnitt abschließen', '2024-10-10', 'in_bearbeitung', 'demo-user-produktion-001', 'Lena übernimmt den Schnitt. Deadline: 10.10.'),
('demo-plan-002', 'demo-ep-008', NULL, 'Quantencomputer: Aufnahme', '2024-10-23', 'geplant', 'demo-user-admin-001', 'Dr. Krause hat Termin bestätigt.'),
('demo-plan-003', NULL, 'demo-idea-002', 'Passkeys-Episode: Aufnahme vorbereiten', '2024-11-06', 'geplant', 'demo-user-redakteur-001', 'Script muss noch finalisiert werden.'),
('demo-plan-004', 'demo-ep-009', NULL, 'Open Source Episode: Gast suchen', '2024-10-28', 'offen', 'demo-user-redakteur-001', 'FSFE kontaktieren wegen Interviewpartner.'),
('demo-plan-005', NULL, 'demo-idea-001', 'Blockchain-Episode: Recherche abschließen', '2024-11-04', 'geplant', 'demo-user-redakteur-001', NULL),
('demo-plan-006', 'demo-ep-010', NULL, 'Klima-Episode: Script-Entwurf', '2024-11-11', 'offen', 'demo-user-admin-001', 'GreenTech Invest als Sponsor anfragen.');

-- ============================================================
-- 14. REDAKTIONS-NOTIZEN
-- ============================================================
INSERT OR IGNORE INTO editorial_notes (id, title, content, category, tags, is_pinned, episode_id, created_by) VALUES
(
  'demo-note-001',
  'Workflow: Episoden-Freigabe',
  '<p><strong>Unser Freigabe-Prozess:</strong></p><ol><li>Redakteur erstellt Episode und Script</li><li>Moderator (Tom) prüft Inhalt und Fakten</li><li>Max gibt finale Freigabe</li><li>Lena übernimmt Schnitt und Produktion</li><li>Veröffentlichung nach Qualitätsprüfung</li></ol><p>Bitte immer mindestens 3 Tage vor geplantem Veröffentlichungsdatum zur Freigabe einreichen!</p>',
  'workflow',
  '["workflow","freigabe","prozess"]',
  1,
  NULL,
  'demo-user-admin-001'
),
(
  'demo-note-002',
  'Technik-Setup: Aufnahme-Checkliste',
  '<p><strong>Vor jeder Aufnahme prüfen:</strong></p><ul><li>Rode NT1 Mikrofone: Phantomspeisung an?</li><li>Zoom H6: Pegel zwischen -12 und -6 dB</li><li>Riverside.fm für Remote-Gäste: Link 30 Min. vorher senden</li><li>Backup-Aufnahme auf lokalem Gerät starten</li><li>Stille im Raum: Handy auf Flugmodus, Fenster zu</li><li>Testaufnahme: 30 Sekunden aufnehmen und abhören</li></ul>',
  'technik',
  '["technik","aufnahme","checkliste","mikrofon"]',
  1,
  NULL,
  'demo-user-produktion-001'
),
(
  'demo-note-003',
  'Sponsoring-Richtlinien',
  '<p><strong>Was wir nicht bewerben:</strong></p><ul><li>Kryptowährungen und NFTs</li><li>Glücksspiel und Wetten</li><li>Produkte mit irreführenden Gesundheitsversprechen</li><li>Politische Parteien oder Kandidaten</li></ul><p><strong>Kennzeichnungspflicht:</strong> Jede Werbung muss klar als solche erkennbar sein. Wir sagen immer: "Werbung" oder "Diese Episode wird präsentiert von..."</p>',
  'sponsoring',
  '["sponsoring","richtlinien","werbung","compliance"]',
  1,
  NULL,
  'demo-user-admin-001'
),
(
  'demo-note-004',
  'Ideen für Staffel 3',
  '<p>Themen, die wir für Staffel 3 in Betracht ziehen:</p><ul><li>Robotik und Automatisierung in der Pflege</li><li>Digitale Währungen (CBDC) und das Ende des Bargelds</li><li>KI in der Medizin: Diagnose, Therapie, Ethik</li><li>Das Recht auf Reparatur (Right to Repair)</li><li>Überwachungskapitalismus: Shoshana Zuboff revisited</li><li>Neurotech: Gehirn-Computer-Schnittstellen</li></ul>',
  'planung',
  '["staffel3","ideen","planung"]',
  0,
  NULL,
  'demo-user-admin-001'
),
(
  'demo-note-005',
  'Metaverse-Episode: Schnitt-Notizen',
  '<p>Für Lena:</p><ul><li>Minute 12:30 — 13:15: Carla hat sich versprochen, bitte rausschneiden</li><li>Minute 28:00: Kurze Pause einfügen (Themenübergang)</li><li>Minute 41:20: Hintergrundgeräusch (Straßenbahn) — Rauschreduzierung nötig</li><li>Intro und Outro aus der Media Library nehmen (Staffel 2 Versionen)</li></ul>',
  'produktion',
  '["schnitt","metaverse","produktion"]',
  0,
  'demo-ep-007',
  'demo-user-admin-001'
);

-- ============================================================
-- 15. RECHERCHE-QUELLEN
-- ============================================================
INSERT OR IGNORE INTO research_sources (id, title, url, type, description, tags, related_idea_id, related_episode_id, status, created_by) VALUES
('demo-src-001', 'OpenAI: GPT-4 Technical Report', 'https://arxiv.org/abs/2303.08774', 'paper', 'Offizieller technischer Bericht zu GPT-4 von OpenAI. Enthält Details zu Fähigkeiten und Einschränkungen.', '["ki","gpt4","openai","llm"]', NULL, 'demo-ep-002', 'gelesen', 'demo-user-redakteur-001'),
('demo-src-002', 'Studie: Social Media und Depression bei Jugendlichen', 'https://www.thelancet.com/', 'paper', 'Lancet-Studie über den Zusammenhang zwischen Social-Media-Nutzung und Depression bei Teenagern (2023).', '["social-media","mental-health","jugend","studie"]', NULL, 'demo-ep-005', 'gelesen', 'demo-user-redakteur-001'),
('demo-src-003', 'DSGVO-Leitfaden für Privatpersonen', 'https://www.datenschutz.org/', 'link', 'Verständlicher Leitfaden zur DSGVO — gut als Grundlage für die Datenschutz-Episode.', '["dsgvo","datenschutz","recht"]', NULL, 'demo-ep-003', 'gelesen', 'demo-user-admin-001'),
('demo-src-004', 'Blockchain Use Cases beyond Crypto', 'https://hbr.org/blockchain', 'artikel', 'Harvard Business Review Artikel über reale Blockchain-Anwendungsfälle in Unternehmen.', '["blockchain","business","anwendung"]', 'demo-idea-001', NULL, 'ungelesen', 'demo-user-redakteur-001'),
('demo-src-005', 'FIDO Alliance: Passkeys Explained', 'https://fidoalliance.org/passkeys/', 'link', 'Offizielle Erklärung der FIDO Alliance zu Passkeys — technische Grundlagen und Implementierung.', '["passkeys","sicherheit","fido","authentifizierung"]', 'demo-idea-002', NULL, 'gelesen', 'demo-user-admin-001'),
('demo-src-006', 'Oxford Internet Institute: Algorithmen und Demokratie', 'https://www.oii.ox.ac.uk/', 'paper', 'Forschungsbericht über den Einfluss von Empfehlungsalgorithmen auf politische Meinungsbildung.', '["algorithmen","demokratie","politik","studie"]', 'demo-idea-003', NULL, 'ungelesen', 'demo-user-redakteur-001');

-- ============================================================
-- 16. PODCAST-STATISTIKEN
-- ============================================================
INSERT OR IGNORE INTO podcast_stats (id, episode_id, date, downloads, plays, unique_listeners, source, notes) VALUES
-- Episode 1
('demo-stat-001', 'demo-ep-001', '2024-01-15', 1240, 980, 890, 'manual', 'Veröffentlichungstag'),
('demo-stat-002', 'demo-ep-001', '2024-01-22', 380, 290, 265, 'manual', 'Erste Woche'),
('demo-stat-003', 'demo-ep-001', '2024-02-15', 120, 95, 88, 'manual', 'Monat 2'),
-- Episode 2
('demo-stat-004', 'demo-ep-002', '2024-01-29', 2180, 1840, 1620, 'manual', 'Veröffentlichungstag — KI-Thema sehr gefragt'),
('demo-stat-005', 'demo-ep-002', '2024-02-05', 890, 720, 680, 'manual', 'Erste Woche'),
('demo-stat-006', 'demo-ep-002', '2024-03-01', 340, 280, 260, 'manual', 'Monat 2'),
-- Episode 3
('demo-stat-007', 'demo-ep-003', '2024-02-12', 1890, 1540, 1380, 'manual', 'Veröffentlichungstag'),
('demo-stat-008', 'demo-ep-003', '2024-02-19', 620, 510, 480, 'manual', 'Erste Woche'),
-- Episode 4
('demo-stat-009', 'demo-ep-004', '2024-02-26', 2340, 1980, 1760, 'manual', 'Veröffentlichungstag — Bester Start bisher'),
('demo-stat-010', 'demo-ep-004', '2024-03-04', 780, 640, 610, 'manual', 'Erste Woche'),
-- Episode 5
('demo-stat-011', 'demo-ep-005', '2024-03-11', 1980, 1640, 1490, 'manual', 'Veröffentlichungstag'),
('demo-stat-012', 'demo-ep-005', '2024-03-18', 560, 450, 420, 'manual', 'Erste Woche'),
-- Episode 6
('demo-stat-013', 'demo-ep-006', '2024-09-09', 2560, 2180, 1940, 'manual', 'Veröffentlichungstag — Staffel 2 Start sehr stark'),
('demo-stat-014', 'demo-ep-006', '2024-09-16', 890, 740, 710, 'manual', 'Erste Woche'),
-- Gesamtstatistiken (ohne Episodenbezug)
('demo-stat-015', NULL, '2024-10-01', 8420, 7180, 6340, 'manual', 'Oktober 2024 Gesamt'),
('demo-stat-016', NULL, '2024-09-01', 7890, 6720, 5980, 'manual', 'September 2024 Gesamt');

-- ============================================================
-- 17. EINSTELLUNGEN (Podcast-Name und Branding)
-- ============================================================
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES
(
  'app',
  '{"general":{"podcastName":"Deep Dive Digital","language":"de","timezone":"Europe/Berlin","dateFormat":"DD.MM.YYYY"},"storage":{"type":"local"},"backup":{"enabled":true,"frequency":"daily","keepDays":30},"appearance":{"theme":"dark","accentColor":"#7c3aed","compactMode":false},"notifications":{"enabled":false,"emailEnabled":false},"podigee":{"apiToken":"","podcastSubdomain":"","podcastId":""},"branding":{"podcastName":"Deep Dive Digital","podcastDescription":"Tech & Gesellschaft — Wir tauchen tief ein in die Themen, die unsere digitale Welt bewegen."},"pdf":{"primaryColor":"#7c3aed","accentColor":"#2563eb","headerBg":"#1a1a2e","showLogo":true,"footerText":"Deep Dive Digital — deepdivedigital.de"},"workflow":{"episodeApprovalRequired":true,"interviewApprovalRequired":false,"approvalRoles":["moderator","admin"]}}',
  datetime('now')
);

COMMIT;
PRAGMA foreign_keys = ON;

-- ============================================================
-- FERTIG
-- Demo-Daten erfolgreich eingefügt.
-- Podcast: Deep Dive Digital
-- Episoden: 10 (5x veröffentlicht, 2x in Produktion, 3x Entwurf)
-- Staffeln: 2
-- Sponsoren: 4 (3 aktiv, 1 Interessent)
-- Ideen: 6
-- Interview-Partner: 5
-- Statistiken: 16 Einträge
-- Benutzer: 4 (Passwort: demo1234)
-- ============================================================
