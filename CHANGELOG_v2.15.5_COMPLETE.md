# PodCore v2.15.5 - Changelog

**Version:** 2.15.5  
**Datum:** 5. August 2026  
**Status:** Production Ready

---

## 🎯 Zusammenfassung

PodCore v2.15.5 behebt den kritischen Fehler bei der Per-User-Tutorial-Aktivierung. Das Problem war ein Datenbankschema-Mismatch zwischen der Tabellendefinition und den INSERT-Statements.

---

## 🐛 Behobene Fehler

### Kritischer Fehler: Tutorial-Aktivierung pro Benutzer funktioniert nicht ✅

**Problem:**
- Admin konnte Tutorials nicht für einzelne Benutzer aktivieren
- Backend versuchte, `created_at` und `updated_at` Spalten zu schreiben
- Tabellendefinition hatte nur `started_at` und `completed_at` Spalten
- Datenbankschema-Mismatch führte zu Fehler beim INSERT

**Ursache:**
```
Tabellendefinition (database.ts):
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
  completed_at TEXT

INSERT-Statement (tutorials.ts):
  INSERT INTO user_tutorial_progress 
  (id, user_id, tutorial_id, completed, skipped, current_step, 
   created_at, updated_at)  ← Diese Spalten existierten nicht!
```

**Lösung:**
- ✅ Tabellendefinition in database.ts aktualisiert
- ✅ `started_at` und `completed_at` durch `created_at` und `updated_at` ersetzt
- ✅ Konsistenz mit INSERT/UPDATE-Statements hergestellt
- ✅ Per-User-Aktivierung funktioniert jetzt

---

## ✨ Features

### Tutorial-Management
- ✅ Tutorials für einzelne Benutzer aktivierbar
- ✅ Batch-Aktivierung für mehrere Benutzer
- ✅ Fortschritt-Tracking pro Benutzer
- ✅ Automatische Initialisierung beim Login

---

## 📋 Technische Änderungen

### Backend

**server/database.ts:**
- ✅ `user_tutorial_progress` Tabelle Schema korrigiert
- ✅ `started_at` → `created_at` (TEXT NOT NULL DEFAULT (datetime('now')))
- ✅ `completed_at` entfernt → `updated_at` hinzugefügt (TEXT NOT NULL DEFAULT (datetime('now')))
- ✅ Konsistenz mit tutorials.ts hergestellt

---

## 📊 Build-Status

```
✓ Server Build: Erfolgreich (TypeScript)
✓ Client Build: Erfolgreich (5.57s)
✓ Sync Public: Erfolgreich
✓ Keine Fehler
✓ Keine Warnungen
```

---

## 🚀 Installation & Update

### Update von v2.15.4
```bash
# 1. Backup erstellen
cp -r podcore podcore_backup

# 2. Neue Version installieren
unzip podcore_v2.15.5.zip
cd podcore
npm install
npm run build

# 3. Alte Instanz stoppen und neue starten
npm start
```

---

## 📝 Benutzer-Dokumentation

### Tutorials für Benutzer aktivieren

**Zugriff:**
Administration → Tutorials Tab

**Schritte:**
1. Tutorial auswählen (Dropdown)
2. Benutzer auswählen (Multi-Select)
3. "Tutorial initialisieren" klicken
4. Tutorial wird beim nächsten Login automatisch gestartet

---

## ✅ Checkliste

- [x] Datenbankschema-Mismatch behoben
- [x] Per-User-Aktivierung funktioniert
- [x] Build erfolgreich
- [x] Version auf 2.15.5 gesetzt
- [x] Dokumentation aktualisiert
- [x] GitHub aktualisiert

---

## 🎉 Highlights

- ✅ Tutorial-Aktivierung pro Benutzer funktioniert jetzt
- ✅ Keine Datenbankfehler mehr
- ✅ Konsistente Datenbankschema
- ✅ Produktionsreif

---

**Version:** 2.15.5  
**Status:** ✅ Production Ready  
**Datum:** 5. August 2026
