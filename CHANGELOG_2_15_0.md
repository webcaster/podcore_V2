# PodCore Version 2.15.0 - Changelog

**Release Date:** August 5, 2026

## 🎯 Major Features

### 1. **Kaskadierendes Löschen für Ideenmappen** ✅
- Implementiert permanentes Löschen mit vollständiger Cascade-Delete-Funktionalität
- Alle verknüpften Daten werden automatisch gelöscht:
  - `idea_checklists` - Checklisten-Einträge
  - `idea_notes` - Notizen
  - `idea_uploads` - Dateien (physisch vom Server)
  - `idea_interview_partners` - Verknüpfungen zu Interviewpartnern
- Neue Endpoints:
  - `DELETE /api/editorial/ideas/:id/permanent` - Permanentes Löschen
  - `DELETE /api/editorial/ideas/:id/trash` - In Papierkorb verschieben
  - `POST /api/editorial/ideas/:id/restore` - Aus Papierkorb wiederherstellen

### 2. **Backup & Restore Funktion repariert** ✅
- Behoben: Spalten-Mappings in Export/Import
- Alle Tabellen korrekt synchronisiert:
  - `editorial_plan` - Redaktionsplan
  - `interview_partners` - Interviewpartner
  - `interview_questions` - Interview-Fragen
  - `sponsors` - Sponsoren
  - Alle weitere Tabellen mit korrekten Spalten
- Verbesserte Fehlerbehandlung beim Import

### 3. **Auto-Update mit Rechteverwaltung** ✅
- Neues Elevation-Token System für sichere Updates
- Endpoints:
  - `POST /api/admin/update/request-elevation` - Elevation-Token anfordern (5 Min Gültigkeitsdauer)
  - `POST /api/admin/update/apply` - Update mit Elevation-Token anwenden
  - `GET /api/admin/update/check-github` - GitHub auf neue Version prüfen
- Nur Benutzer mit `canManageSettings` Berechtigung können Updates durchführen
- Versionvergleich mit compareVersions Utility

### 4. **Freigabeanfragen ins Benachrichtigungssystem verlagert** ✅
- Neue Endpoints für Freigabeanfragen:
  - `POST /api/approvals/episodes/:id/request` - Episode zur Freigabe anfordern
  - `POST /api/approvals/episodes/:id/approve` - Episode genehmigen
  - `POST /api/approvals/episodes/:id/reject` - Episode ablehnen
  - `POST /api/approvals/questions/:id/request` - Frage zur Freigabe anfordern
  - `POST /api/approvals/questions/:id/approve` - Frage genehmigen
  - `POST /api/approvals/questions/:id/reject` - Frage ablehnen
- Automatische Benachrichtigungen an alle Genehmiger
- Benachrichtigungen im Notification Center integriert

### 5. **PDF-Export für Interviewpartner erweitert** ✅
- Endpoint: `GET /api/editorial/interviews/partners/:partnerId/export-pdf`
- Neue Query-Parameter:
  - `customMessage` - Benutzerdefinierte Begrüßungsnachricht
  - `episodeId` - Verknüpfung zu spezifischer Episode
  - `documentName` - Benutzerdefinierten PDF-Dateinamen setzen
- Episode-Informationen im PDF (Nummer, Titel, Beschreibung, Aufnahmedatum)
- Verwendet PDF-Layout mit CI/Branding

### 6. **Modul-Bereinigung** ✅
- **Entfernt:** `GET /interviews/partners/:partnerId/send-summary` (HTML-Zusammenfassung)
- **Entfernt:** `POST /interviews/partners/:partnerId/send-email` (Per Mail senden)
- **Behalten:** `GET /interviews/partners/:partnerId/export-pdf` (Personalisiertes PDF)
- Benutzer können externe Mail-Clients (Outlook, Gmail) verwenden

## 🐛 Bug Fixes

- Backup/Import-Spalten-Fehler behoben
- Cascade-Delete für Ideenmappen implementiert
- Dateien werden physisch gelöscht (nicht nur DB-Einträge)
- Elevation-Token Sicherheit für Auto-Updates

## 📦 Technische Änderungen

### Server-Router Updates
- `server/routers/editorial.ts` - Cascade-Delete, PDF-Export erweitert
- `server/routers/backup.ts` - Spalten-Mappings korrigiert
- `server/routers/admin.ts` - Elevation-Token System, compareVersions Utility
- `server/routers/approvals.ts` - Neue Freigabe-Endpoints mit Benachrichtigungen

### Neue Hilfsfunktionen
- `compareVersions()` - Semantische Versionierung vergleichen
- `createApprovalNotification()` - Benachrichtigungen für Freigabeanfragen erstellen
- `deleteIdeaWithCascade()` - Kaskadierendes Löschen mit Datei-Cleanup

## 🔄 Migration Notes

- Alte `send-summary` und `send-email` Endpoints sind entfernt
- Benutzer sollten PDFs exportieren und externe Mail-Clients verwenden
- Backup-Dateien aus v2.14.x sind mit v2.15.0 kompatibel

## 📝 Dokumentation

- Wiki aktualisiert mit neuen Funktionen
- API-Dokumentation für neue Endpoints
- Anleitung für PDF-Export mit benutzerdefinierten Namen

## 🔐 Security

- Elevation-Token System für kritische Updates
- Bessere Fehlerbehandlung bei Datenlöschung
- Berechtigung-Checks für alle neuen Endpoints

---

**Für Fragen oder Probleme:** Bitte öffnen Sie ein Issue auf GitHub oder kontaktieren Sie den Support.
