# Benutzer-Tutorial-System

**Version:** 2.15.1  
**Hinzugefügt:** August 5, 2026

---

## 📖 Übersicht

Das Benutzer-Tutorial-System ermöglicht es Administratoren, rollenbasierte, interaktive Tutorials zu erstellen, die neuen Benutzern bei der Orientierung in PodCore helfen.

---

## 👨‍💼 Für Administratoren

### Tutorial-Verwaltung

**Zugriff:** Einstellungen → Admin → Tutorial-Verwaltung

#### Neues Tutorial erstellen

1. Klicken Sie auf "Neues Tutorial"
2. Füllen Sie die Grundinformationen aus:
   - **Rolle:** Zielgruppe (Redakteur, Moderator, Produktion, Admin)
   - **Titel:** Name des Tutorials
   - **Beschreibung:** Kurze Beschreibung
   - **Aktiviert:** Checkbox zum Aktivieren

3. Fügen Sie Schritte hinzu:
   - Klicken Sie auf "Schritt hinzufügen"
   - Konfigurieren Sie jeden Schritt

#### Schritt-Konfiguration

Für jeden Schritt können Sie folgende Einstellungen vornehmen:

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| **Titel** | Überschrift des Schritts | "Dashboard-Übersicht" |
| **Beschreibung** | Detaillierte Erklärung | "Das Dashboard zeigt..." |
| **CSS Selector** | Element zum Hervorheben | `#dashboard`, `.btn-primary` |
| **Position** | Tooltip-Position | oben, unten, links, rechts |
| **Farbe** | Hervorhebungsfarbe | #9333ea (Farbwähler) |
| **Bild** | Bild-URL oder Base64 | https://example.com/image.png |
| **Überspringen erlauben** | Benutzer kann Schritt überspringen | ✓ / ✗ |

#### Tutorial-Verwaltung

**Bearbeiten:**
- Klicken Sie auf das Bearbeitungs-Icon
- Ändern Sie die Einstellungen
- Speichern Sie

**Aktivieren/Deaktivieren:**
- Klicken Sie auf das Auge-Icon
- Deaktivierte Tutorials werden nicht angezeigt

**Löschen:**
- Klicken Sie auf das Papierkorb-Icon
- Bestätigen Sie die Löschung

#### Tutorials für Benutzer initialisieren

1. Wählen Sie ein Tutorial aus der Liste
2. Wählen Sie einen oder mehrere Benutzer
3. Klicken Sie auf "Tutorial initialisieren"
4. Das Tutorial wird für die Benutzer gestartet

---

## 👥 Für Benutzer

### Tutorial-Erlebnis

#### Beim Login

1. Sie melden sich an
2. Die erste verfügbare, unvollendete Tutorial wird automatisch gestartet
3. Das Tutorial-Overlay wird angezeigt

#### Während des Tutorials

**Visuelles Highlight:**
- Das zu betrachtende Element wird hervorgehoben
- Pulse-Animation zieht Aufmerksamkeit auf sich

**Tooltip:**
- Zeigt Titel und Beschreibung des Schritts
- Optional: Bild zur Veranschaulichung
- Fortschrittsanzeige

**Navigation:**
- **Zurück:** Zum vorherigen Schritt
- **Weiter:** Zum nächsten Schritt
- **Überspringen:** Tutorial überspringen (falls erlaubt)
- **Schließen:** Tutorial beenden (X-Button)

#### Nach dem Tutorial

- Fortschritt wird automatisch gespeichert
- Tutorial wird nicht erneut angezeigt
- Sie können andere Tutorials starten

### Tutorial-Verwaltung für Benutzer

**Einstellungen → Mein Design:**
- Tutorials können manuell neu gestartet werden
- Fortschritt wird zurückgesetzt
- Tutorial wird erneut angezeigt

---

## 🎓 Best Practices

### Tutorial-Erstellung

**Gute Tutorials:**
- ✅ Kurz und prägnant (3-5 Schritte)
- ✅ Fokussiert auf eine Aufgabe
- ✅ Mit visuellen Beispielen
- ✅ Überspringen-Option für erfahrene Benutzer
- ✅ Klare CSS-Selektoren

**Zu vermeiden:**
- ❌ Zu lange Tutorials (>10 Schritte)
- ❌ Zu viel Text pro Schritt
- ❌ Ungültige CSS-Selektoren
- ❌ Zu viele Tutorials gleichzeitig

### CSS-Selektoren

**Häufige Selektoren:**

```css
/* Nach ID */
#dashboard
#episodes-btn

/* Nach Klasse */
.btn-primary
.card-header

/* Nach Element */
button
input[type="text"]

/* Kombiniert */
.sidebar .nav-item
header .user-menu
```

### Bilder in Tutorials

**Unterstützte Formate:**
- URL: `https://example.com/image.png`
- Base64: `data:image/png;base64,...`

**Empfehlungen:**
- Kleine Bilder (< 500KB)
- Aussagekräftige Screenshots
- Konsistente Größe (z.B. 400x300px)

---

## 🔄 Workflow-Beispiel

### Szenario: Onboarding für neue Redakteure

**Schritt 1: Dashboard-Intro**
```
Titel: Willkommen im Dashboard
Beschreibung: Das Dashboard zeigt einen Überblick über Ihre aktuellen Aufgaben.
Selector: #dashboard-stats
Position: unten
```

**Schritt 2: Episoden-Bereich**
```
Titel: Episoden verwalten
Beschreibung: Hier erstellen und bearbeiten Sie Episoden.
Selector: .episodes-card
Position: rechts
```

**Schritt 3: Redaktions-Hub**
```
Titel: Ideen sammeln
Beschreibung: Im Redaktions-Hub sammeln Sie Ideen für zukünftige Episoden.
Selector: .editorial-card
Position: rechts
Überspringen erlauben: ✓
```

**Schritt 4: Abschluss**
```
Titel: Fertig!
Beschreibung: Sie haben einen Überblick über die wichtigsten Bereiche.
Selector: (leer - kein Highlight)
Position: oben
```

---

## ❓ Häufige Fragen

**F: Wie erstelle ich ein Tutorial für mehrere Rollen?**  
A: Erstellen Sie separate Tutorials für jede Rolle. Sie können den gleichen Inhalt verwenden.

**F: Können Benutzer Tutorials mehrmals durchlaufen?**  
A: Ja, sie können Tutorials in den Einstellungen neu starten.

**F: Was passiert, wenn ein CSS-Selector ungültig ist?**  
A: Das Highlight wird nicht angezeigt, aber das Tutorial funktioniert trotzdem.

**F: Können Tutorials auf mobilen Geräten angezeigt werden?**  
A: Ja, das Tutorial-System ist vollständig responsive.

**F: Wie lange dauert ein durchschnittliches Tutorial?**  
A: 2-5 Minuten, je nach Anzahl der Schritte.

---

## 🔐 Sicherheit

- Nur Administratoren können Tutorials erstellen/bearbeiten
- Benutzer können nur ihren eigenen Fortschritt sehen
- Alle Endpoints sind geschützt

---

## 📞 Support

Bei Fragen oder Problemen:
- Lesen Sie diese Dokumentation
- Überprüfen Sie das Wiki
- Öffnen Sie ein GitHub Issue

---

**Viel Spaß beim Erstellen von Tutorials! 🎉**
