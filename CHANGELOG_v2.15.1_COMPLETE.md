# PodCore Version 2.15.1 - Benutzer-Tutorial System

**Release Date:** August 5, 2026  
**Status:** Stable Release

---

## 🎯 Neue Hauptfunktionen

### 1. **Anpassbares Benutzer-Tutorial-System** ✅ (NEU!)

Vollständige Implementierung eines rollenbasierten Tutorial-Systems mit Admin-Verwaltung und automatischer Initialisierung:

#### Backend-Infrastruktur
- **Datenbankschema:**
  - `tutorials` Tabelle - Speichert rollenbasierte Tutorials
  - `user_tutorial_progress` Tabelle - Verfolgt Fortschritt pro Benutzer

- **API Endpoints:**
  - `GET /api/tutorials` - Tutorials für Benutzerrolle abrufen
  - `GET /api/tutorials/:id` - Einzelnes Tutorial abrufen
  - `POST /api/tutorials` - Neues Tutorial erstellen (Admin)
  - `PUT /api/tutorials/:id` - Tutorial bearbeiten (Admin)
  - `DELETE /api/tutorials/:id` - Tutorial löschen (Admin)
  - `GET /api/tutorials/:id/progress` - Benutzer-Fortschritt abrufen
  - `POST /api/tutorials/:id/progress` - Fortschritt aktualisieren
  - `GET /api/admin/tutorials` - Alle Tutorials für Admin
  - `POST /api/admin/tutorials/:id/initialize/:userId` - Tutorial für Benutzer initialisieren

#### Frontend-Komponenten

**TutorialContext (`TutorialContext.tsx`):**
- Globales Tutorial-Management
- Rollenbasierte Tutorial-Verwaltung
- Fortschritt-Tracking pro Benutzer
- Tutorial-Navigation (vor/zurück)
- Skip- und Completion-Funktionen

**TutorialOverlay (`TutorialOverlay.tsx`):**
- Visuelles Highlight mit Pulse-Animation
- Positionierter Tooltip mit Schritt-Information
- Bild-Support in Tutorials
- Fortschrittsanzeige
- Navigation (vor/zurück/überspringen)
- Responsive Design
- Dark-Mode Support

**TutorialsManagementPage (`TutorialsManagementPage.tsx`):**
- Admin-Interface zur Tutorial-Verwaltung
- Visueller Schritt-Editor
- Unterstützung für:
  - Titel und Beschreibung
  - CSS-Selektoren für Hervorhebung
  - Position des Tooltips (oben/unten/links/rechts)
  - Farbe der Hervorhebung
  - Bilder-Support (Base64 oder URL)
  - Skip-Option pro Schritt
- Tutorial-Aktivierung/Deaktivierung
- Tutorial-Initialisierung für einzelne oder mehrere Benutzer

#### Tutorial-Struktur

**Tutorial-Objekt:**
```typescript
{
  id: string;
  role: string;              // 'editor', 'moderator', 'producer', 'admin'
  title: string;
  description: string;
  enabled: boolean;
  steps: TutorialStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

**Tutorial-Schritt:**
```typescript
{
  id: string;
  title: string;
  description: string;
  target?: string;           // CSS Selector für Hervorhebung
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;            // Base64 oder URL
  highlightColor?: string;   // Hervorhebungsfarbe
  allowSkip?: boolean;       // Schritt überspringbar?
  action?: string;           // Optional: Aktion ausführen
}
```

#### Auto-Initialisierung

**useTutorialAutoInit Hook:**
- Automatische Tutorial-Erkennung nach Login
- Erste unvollendete Tutorial wird automatisch gestartet
- Prüft Fortschritt pro Benutzer
- Berücksichtigt Benutzerrolle

**Login-Integration:**
- Tutorials werden nach erfolgreichem Login geladen
- Erste verfügbare unvollendete Tutorial wird automatisch gestartet
- Benutzer können Tutorial überspringen oder neu starten

**Admin-Initialisierung:**
- Admin kann Tutorials für einzelne Benutzer initialisieren
- Batch-Initialisierung für mehrere Benutzer möglich
- Tutorial-Fortschritt wird zurückgesetzt

---

## 📋 Tutorial-Verwaltung für Administratoren

### Zugriff
- **URL:** `/admin/tutorials`
- **Berechtigung:** `canManageSettings`

### Funktionen

#### Tutorials erstellen
1. Klicken Sie auf "Neues Tutorial"
2. Geben Sie ein:
   - **Rolle:** Zielgruppe (Redakteur, Moderator, Produktion, Admin)
   - **Titel:** Name des Tutorials
   - **Beschreibung:** Kurze Beschreibung
   - **Aktiviert:** Checkbox zum Aktivieren/Deaktivieren
3. Fügen Sie Schritte hinzu:
   - Klicken Sie auf "Schritt hinzufügen"
   - Füllen Sie die Schritt-Informationen aus
4. Speichern Sie das Tutorial

#### Schritt-Konfiguration
Für jeden Schritt können Sie konfigurieren:
- **Titel:** Überschrift des Schritts
- **Beschreibung:** Detaillierte Erklärung
- **CSS Selector:** Element zum Hervorheben (z.B. `#dashboard`, `.btn-primary`)
- **Position:** Wo der Tooltip angezeigt wird
- **Farbe:** Hervorhebungsfarbe (Farbwähler)
- **Bild:** URL oder Base64-codiertes Bild
- **Überspringen erlauben:** Benutzer kann Schritt überspringen

#### Tutorials bearbeiten
1. Klicken Sie auf das Bearbeitungs-Icon neben dem Tutorial
2. Ändern Sie die Einstellungen
3. Speichern Sie die Änderungen

#### Tutorials aktivieren/deaktivieren
- Klicken Sie auf das Auge-Icon
- Deaktivierte Tutorials werden nicht angezeigt

#### Tutorials löschen
- Klicken Sie auf das Papierkorb-Icon
- Bestätigen Sie die Löschung

#### Tutorials für Benutzer initialisieren
1. Wählen Sie ein Tutorial aus
2. Wählen Sie einen oder mehrere Benutzer
3. Klicken Sie auf "Tutorial initialisieren"
4. Das Tutorial wird für die Benutzer gestartet

---

## 🎓 Benutzer-Perspektive

### Tutorial-Erlebnis

**Beim Login:**
1. Benutzer meldet sich an
2. Erste verfügbare unvollendete Tutorial wird automatisch gestartet
3. Tutorial-Overlay wird angezeigt

**Während des Tutorials:**
1. Visuelles Highlight zeigt das zu betrachtende Element
2. Tooltip mit Erklärung und Bild (falls vorhanden)
3. Fortschrittsanzeige zeigt aktuelle Position
4. Navigation:
   - **Zurück:** Zum vorherigen Schritt
   - **Weiter:** Zum nächsten Schritt
   - **Überspringen:** Tutorial überspringen (falls erlaubt)
   - **Schließen:** Tutorial beenden

**Nach dem Tutorial:**
1. Fortschritt wird gespeichert
2. Tutorial wird nicht erneut angezeigt
3. Benutzer kann andere Tutorials starten

### Tutorial-Verwaltung für Benutzer

**Einstellungen:**
- Benutzer können Tutorials manuell neu starten
- Fortschritt wird zurückgesetzt
- Tutorial wird erneut angezeigt

---

## 🔧 Technische Details

### Datenbankschema

```sql
CREATE TABLE tutorials (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  steps TEXT NOT NULL,  -- JSON array
  created_at DATETIME,
  updated_at DATETIME,
  created_by TEXT
);

CREATE TABLE user_tutorial_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tutorial_id TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  skipped INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE(user_id, tutorial_id)
);
```

### Frontend-Integration

**App.tsx:**
- `TutorialProvider` wraps die gesamte Anwendung
- `TutorialOverlay` wird global gerendert
- Route `/admin/tutorials` für Tutorial-Verwaltung

**Dashboard.tsx:**
- `useTutorialAutoInit` Hook für automatische Initialisierung
- Tutorials werden nach Login geladen

### Hooks

**useTutorial:**
```typescript
const {
  tutorials,           // Alle verfügbaren Tutorials
  activeTutorial,      // Aktuell aktives Tutorial
  currentStep,         // Aktueller Schritt
  progress,            // Fortschritt-Objekt
  isLoading,           // Lade-Status
  startTutorial,       // Tutorial starten
  nextStep,            // Nächster Schritt
  previousStep,        // Vorheriger Schritt
  skipTutorial,        // Tutorial überspringen
  completeTutorial,    // Tutorial abschließen
  closeTutorial,       // Tutorial schließen
  loadTutorials,       // Tutorials neu laden
} = useTutorial();
```

**useTutorialAutoInit:**
- Automatische Tutorial-Erkennung nach Login
- Lädt Tutorials für Benutzerrolle
- Startet erste unvollendete Tutorial

---

## 🎨 Styling

### TutorialOverlay CSS
- Responsive Design
- Dark-Mode Support
- Smooth Animations
- Pulse-Effekt für Highlight
- Mobile-optimiert

### Farben
- Hervorhebung: Konfigurierbar pro Schritt
- Tooltip: Weiß (Dark-Mode: Dunkelgrau)
- Buttons: Lila Gradient (Accent-Purple)
- Text: Graustufen

---

## 🔄 Migration & Kompatibilität

### Upgrade-Pfad
- ✅ Kompatibel mit v2.15.0 Datenbanken
- ✅ Automatische Tabellen-Erstellung
- ✅ Keine Datenmigration erforderlich

### Breaking Changes
- ❌ Keine Breaking Changes

---

## 📚 Dokumentation

### Wiki-Artikel
- Tutorial-System Übersicht
- Admin-Anleitung für Tutorial-Erstellung
- Best Practices für Tutorials
- Häufige Fragen

### API-Dokumentation
- ✅ Alle Endpoints dokumentiert
- ✅ Request/Response-Beispiele
- ✅ Fehlerbehandlung beschrieben

---

## 🔐 Security

| Feature | Beschreibung |
|---------|-------------|
| Admin-Only Endpoints | Nur Administratoren können Tutorials erstellen/bearbeiten |
| Berechtigung-Checks | Alle Endpoints validieren Berechtigungen |
| Fortschritt-Isolation | Benutzer können nur eigenen Fortschritt sehen |
| CORS-Schutz | API-Requests sind geschützt |

---

## 📊 Performance

- ✅ Lazy Loading von Tutorials
- ✅ Effiziente Fortschritt-Verfolgung
- ✅ Optimierte Datenbank-Queries
- ✅ Kein Performance-Impact auf bestehende Features

---

## 🚀 Beispiel: Tutorial erstellen

### Szenario: Dashboard-Übersicht für neue Redakteure

**Schritt 1: Dashboard-Intro**
```json
{
  "title": "Willkommen im Dashboard",
  "description": "Das Dashboard zeigt einen Überblick über Ihre aktuellen Aufgaben und Statistiken.",
  "target": "#dashboard-stats",
  "position": "bottom",
  "image": "https://example.com/dashboard-intro.png"
}
```

**Schritt 2: Episoden-Bereich**
```json
{
  "title": "Episoden verwalten",
  "description": "Hier können Sie Episoden erstellen, bearbeiten und veröffentlichen.",
  "target": ".episodes-card",
  "position": "right",
  "highlightColor": "rgba(147, 51, 234, 0.3)"
}
```

**Schritt 3: Redaktions-Hub**
```json
{
  "title": "Ideen sammeln",
  "description": "Im Redaktions-Hub können Sie Ideen für zukünftige Episoden sammeln.",
  "target": ".editorial-card",
  "position": "right",
  "allowSkip": true
}
```

---

## 🆘 Häufige Fragen

**F: Wie erstelle ich ein neues Tutorial?**  
A: Gehen Sie zu Einstellungen → Admin → Tutorial-Verwaltung → Neues Tutorial

**F: Können Benutzer Tutorials überspringen?**  
A: Ja, wenn die Option "Überspringen erlauben" aktiviert ist

**F: Werden Tutorials automatisch gestartet?**  
A: Ja, die erste unvollendete Tutorial wird nach dem Login automatisch gestartet

**F: Kann ich ein Tutorial für mehrere Benutzer starten?**  
A: Ja, Sie können mehrere Benutzer auswählen und das Tutorial initialisieren

**F: Werden Tutorial-Fortschritte gespeichert?**  
A: Ja, der Fortschritt wird in der Datenbank gespeichert

---

## 📦 Dateien hinzugefügt

### Backend
- `server/routers/tutorials.ts` - Tutorial API Router
- `server/migrations/tutorials.sql` - Datenbankschema

### Frontend
- `client/src/contexts/TutorialContext.tsx` - Tutorial Context
- `client/src/components/tutorials/TutorialOverlay.tsx` - Overlay Komponente
- `client/src/components/tutorials/TutorialOverlay.css` - Styling
- `client/src/pages/TutorialsManagementPage.tsx` - Admin-Interface
- `client/src/hooks/useTutorialAutoInit.ts` - Auto-Init Hook

### Konfiguration
- `App.tsx` - TutorialProvider Integration

---

## 🎉 Zusammenfassung

PodCore v2.15.1 führt ein umfassendes, anpassbares Tutorial-System ein, das:

- ✅ Rollenbasierte Tutorials pro Benutzertyp
- ✅ Einfache Admin-Verwaltung mit visuellem Editor
- ✅ Automatische Initialisierung für neue Benutzer
- ✅ Fortschritt-Tracking und Persistierung
- ✅ Responsive und benutzerfreundliches Design
- ✅ Vollständig konfigurierbar und erweiterbar

**Version:** 2.15.1  
**Datum:** August 5, 2026  
**Status:** Stable Release ✅
