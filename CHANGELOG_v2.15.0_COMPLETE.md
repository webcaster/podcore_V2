# PodCore Version 2.15.0 - Vollständiges Changelog

**Release Date:** August 5, 2026  
**Status:** Stable Release

---

## 🎯 Neue Hauptfunktionen

### 1. **Kaskadierendes Löschen für Ideenmappen** ✅

Implementierung eines vollständigen Cascade-Delete-Systems für Ideenmappen mit automatischer Bereinigung aller verknüpften Daten:

- **Permanentes Löschen:** `DELETE /api/editorial/ideas/:id/permanent`
  - Löscht Idee und ALLE verknüpften Daten
  - Automatische Bereinigung von Dateien vom Server
  - Keine Wiederherstellung möglich

- **Papierkorb-Funktion:** `DELETE /api/editorial/ideas/:id/trash`
  - Verschieben in Papierkorb (soft delete mit `deleted_at`)
  - Daten bleiben erhalten
  - Wiederherstellung möglich

- **Wiederherstellung:** `POST /api/editorial/ideas/:id/restore`
  - Stellt gelöschte Ideenmappen wieder her
  - Alle verknüpften Daten werden wiederhergestellt

**Gelöschte Daten:**
- `idea_checklists` - Alle Checklisten-Einträge
- `idea_notes` - Alle Notizen
- `idea_uploads` - Alle Dateien (physisch vom Server gelöscht)
- `idea_interview_partners` - Alle Verknüpfungen zu Interviewpartnern

---

### 2. **Backup & Restore Funktion repariert** ✅

Vollständige Überarbeitung des Backup/Restore-Systems mit korrekten Spalten-Mappings:

**Behobene Fehler:**
- ✅ Spalten-Mappings für alle Tabellen korrigiert
- ✅ `editorial_plan` - Redaktionsplan mit allen Feldern
- ✅ `interview_partners` - Interviewpartner mit Kontaktdaten
- ✅ `interview_questions` - Interview-Fragen mit Kategorien
- ✅ `sponsors` - Sponsoren mit Verträgen und Buchungen
- ✅ Verbesserte Fehlerbehandlung beim Import

**Funktionalität:**
- Export: `GET /api/backup/export/full` - Vollständiger Datenexport als ZIP
- Import: `POST /api/backup/import/full` - Datenwiederherstellung aus ZIP
- Pre-Backup vor dem Import (Sicherung der aktuellen Daten)

---

### 3. **Auto-Update mit Rechteverwaltung** ✅

Neues Sicherheitssystem für automatische Updates mit Elevation-Token:

**Neue Endpoints:**
- `POST /api/admin/update/request-elevation` - Elevation-Token anfordern
  - One-Time-Token mit 5 Minuten Gültigkeitsdauer
  - Verhindert versehentliche Updates

- `POST /api/admin/update/apply` - Update mit Elevation-Token anwenden
  - Erfordert gültiges Elevation-Token
  - Nur für Benutzer mit `canManageSettings` Berechtigung

- `GET /api/admin/update/check-github` - GitHub auf neue Version prüfen
  - Automatische Versionserkennung
  - Vergleich mit aktueller Version

**Sicherheitsfeatures:**
- Elevation-Token System (One-Time-Tokens)
- Berechtigung-Checks für alle Update-Operationen
- Versionvergleich mit `compareVersions()` Utility
- User-Agent mit aktueller Version

---

### 4. **Freigabeanfragen ins Benachrichtigungssystem verlagert** ✅

Umstrukturierung der Freigabeanfragen mit automatischen Benachrichtigungen:

**Neue Endpoints für Episoden:**
- `POST /api/approvals/episodes/:id/request` - Episode zur Freigabe anfordern
- `POST /api/approvals/episodes/:id/approve` - Episode genehmigen
- `POST /api/approvals/episodes/:id/reject` - Episode ablehnen

**Neue Endpoints für Interview-Fragen:**
- `POST /api/approvals/questions/:id/request` - Frage zur Freigabe anfordern
- `POST /api/approvals/questions/:id/approve` - Frage genehmigen
- `POST /api/approvals/questions/:id/reject` - Frage ablehnen

**Benachrichtigungssystem:**
- Automatische Benachrichtigungen an alle Genehmiger
- Integration mit Notification Center
- Benachrichtigungstypen: `approval_episode`, `approval_question`
- Statusverfolgung: angefragt → genehmigt/abgelehnt

---

### 5. **PDF-Export für Interviewpartner erweitert** ✅

Erweiterte PDF-Generierung mit personalisierten Dokumenten:

**Endpoint:** `GET /api/editorial/interviews/partners/:partnerId/export-pdf`

**Neue Query-Parameter:**
- `customMessage` - Benutzerdefinierte Begrüßungsnachricht
- `episodeId` - Verknüpfung zu spezifischer Episode
- `documentName` - Benutzerdefinierten PDF-Dateinamen setzen

**Features:**
- Episode-Informationen im PDF (Nummer, Titel, Beschreibung, Aufnahmedatum)
- Verwendet PDF-Layout mit CI/Branding
- Personalisierte Ansprache des Interviewpartners
- Professionelle Formatierung mit Kopf- und Fußzeilen

**Beispiel:**
```
GET /api/editorial/interviews/partners/{id}/export-pdf?
  customMessage=Liebe%20Max&
  episodeId={episodeId}&
  documentName=Interview-Vorbereitung-Max-Mustermann
```

---

### 6. **Modul-Bereinigung** ✅

Entfernung veralteter Funktionen für optimierte Benutzerführung:

**Entfernte Endpoints:**
- ❌ `GET /interviews/partners/:partnerId/send-summary` (HTML-Zusammenfassung)
- ❌ `POST /interviews/partners/:partnerId/send-email` (Per Mail senden)

**Empfohlene Alternative:**
- ✅ `GET /interviews/partners/:partnerId/export-pdf` (Personalisiertes PDF)
- Benutzer können externe Mail-Clients verwenden (Outlook, Gmail, etc.)

**Vorteile:**
- Vereinfachte API
- Bessere Kontrolle über E-Mail-Versand
- Professionellere PDF-Exporte
- Weniger SMTP-Abhängigkeiten

---

### 7. **Light-Mode Theme-System** ✅ (NEU!)

Vollständige Implementierung eines Light-Mode Designs mit automatischer Persistierung:

**Neue Komponenten:**
- `ThemeContext.tsx` - Globales Theme-Management
- Light-Mode Farbpalette für alle UI-Elemente
- localStorage Persistierung der Theme-Wahl

**Features:**
- **Theme-Toggle in Settings:** Unter "Persönliches Design" → "Farbschema"
- **Automatische Anwendung:** Theme wird beim Login automatisch angewendet
- **Persistierung:** Theme-Wahl bleibt über Sessions erhalten
- **Nahtlose Integration:** Funktioniert mit allen bestehenden Accent-Farben

**Light-Mode Farben:**
```css
--color-obsidian-900: #ffffff (Hintergrund)
--color-obsidian-700: #e5e7eb (Oberfläche)
--color-text-primary: #111827 (Text)
--color-text-secondary: #6b7280 (Sekundärtext)
--color-surface-border: #d1d5db (Rahmen)
```

**Benutzerführung:**
1. Benutzer meldet sich an
2. Navigiert zu Einstellungen → "Mein Design"
3. Wählt zwischen "Dunkles Design" oder "Helles Design"
4. Theme wird sofort angewendet und gespeichert
5. Beim nächsten Login wird das gespeicherte Theme automatisch geladen

---

## 🐛 Bug Fixes

| Fehler | Lösung | Impact |
|--------|--------|--------|
| Backup/Import-Spalten-Fehler | Alle Spalten-Mappings korrigiert | Hoch |
| Cascade-Delete fehlte | Vollständige Implementierung | Hoch |
| Dateien nicht physisch gelöscht | Datei-Cleanup implementiert | Mittel |
| Elevation-Token fehlte | One-Time-Token System | Hoch |
| Freigabeanfragen nicht benachrichtigt | Notification Center Integration | Mittel |
| PDF-Export nicht konfigurierbar | Custom Document Name Parameter | Niedrig |

---

## 📦 Technische Änderungen

### Server-Router Updates

| Datei | Änderungen |
|-------|-----------|
| `editorial.ts` | Cascade-Delete, PDF-Export erweitert, send-summary/send-email entfernt |
| `backup.ts` | Spalten-Mappings korrigiert, Fehlerbehandlung verbessert |
| `admin.ts` | Elevation-Token System, compareVersions Utility |
| `approvals.ts` | Neue Freigabe-Endpoints, Benachrichtigungen |

### Client-Komponenten Updates

| Datei | Änderungen |
|-------|-----------|
| `ThemeContext.tsx` | Neu - Theme-Management |
| `App.tsx` | ThemeProvider integriert |
| `SettingsPage.tsx` | Light/Dark Toggle hinzugefügt |

### Neue Hilfsfunktionen

```typescript
// Semantische Versionierung vergleichen
compareVersions(v1: string, v2: string): number

// Benachrichtigungen für Freigabeanfragen erstellen
createApprovalNotification(db, type, itemId, requestedBy, message)

// Kaskadierendes Löschen mit Datei-Cleanup
deleteIdeaWithCascade(db, ideaId, uploadDir)
```

---

## 🔄 Migration & Kompatibilität

### Upgrade-Pfad
- ✅ Kompatibel mit v2.14.x Datenbanken
- ✅ Automatische Datenmigration
- ✅ Backup vor Update empfohlen

### Breaking Changes
- ❌ `send-summary` Endpoint entfernt
- ❌ `send-email` Endpoint entfernt
- ✅ Alternativen vorhanden (PDF-Export)

---

## 📚 Dokumentation

### Benutzeranleitungen
- ✅ Light-Mode Aktivierung
- ✅ PDF-Export mit benutzerdefinierten Namen
- ✅ Freigabeanfragen und Benachrichtigungen
- ✅ Backup & Restore Prozess

### API-Dokumentation
- ✅ Neue Endpoints dokumentiert
- ✅ Query-Parameter erklärt
- ✅ Fehlerbehandlung beschrieben

### Admin-Dokumentation
- ✅ Auto-Update Sicherheitssystem
- ✅ Elevation-Token Prozess
- ✅ Berechtigung-Management

---

## 🔐 Security Improvements

| Feature | Beschreibung |
|---------|-------------|
| Elevation-Token | One-Time-Tokens für kritische Updates |
| Berechtigung-Checks | Alle neuen Endpoints mit Berechtigung-Validierung |
| Datei-Cleanup | Physisches Löschen von Dateien beim Löschen |
| Fehlerbehandlung | Verbesserte Exception-Handling |

---

## 📊 Performance

- ✅ Keine signifikanten Performance-Änderungen
- ✅ Cascade-Delete optimiert mit Batch-Operations
- ✅ Theme-Switching ohne Page-Reload
- ✅ localStorage für schnelle Theme-Anwendung

---

## 🚀 Installation & Update

### Für Benutzer
1. Download der neuen Version (ZIP-Datei)
2. Backup erstellen (empfohlen)
3. Update durchführen über Admin-Panel
4. Elevation-Token bestätigen
5. Anwendung wird neu gestartet

### Für Entwickler
```bash
cd /home/ubuntu/podcore
git pull origin main
npm install
npm run build
npm start
```

---

## 📋 Checkliste für Administratoren

- [ ] Backup vor Update erstellen
- [ ] Update durchführen
- [ ] Alle Funktionen testen
- [ ] Benutzer über neue Features informieren
- [ ] Light-Mode Option in Einstellungen testen
- [ ] Freigabeanfragen testen
- [ ] PDF-Export mit benutzerdefinierten Namen testen

---

## 🤝 Support & Feedback

Für Fragen oder Probleme:
- GitHub Issues: https://github.com/webcaster/podcore_V2/issues
- Wiki: https://github.com/webcaster/podcore_V2/wiki
- Kontakt: support@podcore.app

---

**Version:** 2.15.0  
**Datum:** August 5, 2026  
**Status:** Stable Release ✅
