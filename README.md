# PodCore v2.11.7

[cite_start]PodCore ist ein eigenständiges, lokal hostbares Podcast-Management-System zur professionellen Verwaltung von Episoden, Ideen, Medien, Sponsoren und Statistiken[cite: 6]. [cite_start]Mit PodCore behältst du alles für deinen Podcast vollständig unter deiner eigenen Kontrolle[cite: 6].

---

## 💻 Systemvoraussetzungen & Zugangsdaten

* **Runtime:** Node.js (Version 18 oder höher)
* **Datenbank:** Keine externe Datenbank erforderlich (verwendet SQLite)
* **Infrastruktur:** Keine Cloud-Abhängigkeiten – 100 % lokal lauffähig

> 🔐 **Standard-Zugangsdaten beim ersten Start:**
> * **Benutzername:** `admin`
> * **Passwort:** `admin123`
> *(Bitte ändere das Passwort nach dem ersten Login direkt in den Einstellungen!)*

---

## 🚀 Installation & Start

### 🔷 Windows
1. Lade das PodCore-Paket herunter und entpacke es.
2. Führe die Datei `start-windows.bat` per Doppelklick aus.
3. Der Server installiert beim ersten Start automatisch alle nötigen Abhängigkeiten.
4. Öffne deinen Browser und navigiere zu: `http://localhost:3001`.

### 🔷 macOS / Linux
1. Öffne das Terminal im entpackten PodCore-Verzeichnis.
2. Mache das Start-Skript ausführbar und starte es:
   ```bash
   chmod +x start-unix.sh
   ./start-unix.sh

 Öffne deinen Browser und navigiere zu: http://localhost:3001.

---

## 📦 Alle Module im Überblick

<details>
<summary>📂 <b>Redaktions-Hub</b> (Klicken zum Ausklappen)</summary>

* **Ideenpool:** Ideen flexibel sammeln, bewerten und priorisieren.
* **Redaktionsplan:** Geplante Episoden übersichtlich in einer Kalender-Ansicht strukturieren.
* **Interviews:** Externe Interview-Partner verwalten und Fragen gezielt vorbereiten.
* **Notizen & Recherche:** Eine zentrale Notizenverwaltung für dein gesamtes Team.
</details>

<details>
<summary>🎙️ <b>Episoden-Management</b> (Klicken zum Ausklappen)</summary>

* **Block-Editor:** Strukturierter Script-Editor mit verschiedenen Block-Typen (*Intro, Segment, Interview, Werbung, Jingle, Outro*).
* **Interview-Fragen-Block:** Fragen dynamisch direkt im Script einbetten und verwalten.
* **Show-Notes & Kapitelmarken:** Schnelles Erstellen von Metadaten, Zeitstempeln und Kapitelstrukturen.
* **PDF-Export:** Vollständiges Episoden-Skript als sauberes Dokument exportieren.
* **Freigabe-System:** Rollenbasierte Freigabe oder Ablehnung von Episoden durch Moderatoren.
</details>

<details>
<summary>💰 <b>Sponsoren & Werbung</b> (Klicken zum Ausklappen)</summary>

* **Werbekategorien & Ad-Slots:** Flexible Kategorisierung von Werbeplätzen sowie zeitraum-basierte oder episoden-spezifische Buchungen.
* **Platzierungen:** Konkrete Buchungen mit flexiblem Preismodell (*Festpreis, Pro Folge, CPM*).
* **Buchungskalender:** Monatsansicht aller Werbeplatzierungen inklusive automatischer Konflikt-Erkennung.
* **Buchungsbestätigung & Leistungsübersicht:** PDF für Kunden mit allen Vorplanungen sowie detaillierte Statistiken nach der Ausstrahlung.
* **Abrechnungstool:** Manuelle Preisanpassungen, optionale Hörer-Gebühren und komfortabler CSV-Export.
</details>

<details>
<summary>📊 <b>Media Library, Insights & Branding</b> (Klicken zum Ausklappen)</summary>

* **Media Library:** Upload und Strukturierung von Audio-Dateien und Sponsoren-Assets.
* **Flexible Storage:** Unterstützung für lokalen Speicher, WebDAV (*Nextcloud/OneDrive*) und S3-kompatible Speicher.
* **Podigee-Integration:** Direkter Abruf von Podcast-Statistiken (*Downloads, Geo, Clients*).
* **Branding & Exporte:** Individuelle Logos, Podcast-Cover-Management und anpassbare PDF-Templates im Layout-Manager.
* **Backup-System:** Export und Import von Episoden, Ideen und kompletten Datenbank-Backups.
</details>

---

## ✨ Letzte Änderungen & Updates

### Neu in v2.11.7
* **Wartung & Stabilität:** Optimierungen an der Systemperformance und kleinere UI-Anpassungen im Dashboard.

### v2.11.5
* **Zentrales Freigabe-Center:** Alle Freigabe-Anfragen (Episoden + Interviews) an einem Ort. Ein neues Dashboard-Widget sorgt für unmittelbare Sichtbarkeit ausstehender Anfragen.
* **Daten-Speicher-Verbesserungen:** Werbetitel, Kategorien und Vertragsdaten werden persistent erfasst. Neue Position "Folgensponsor" für automatische Zuweisungen.
* **Abrechnungs-Features:** Einführung manueller Preisanpassungen pro Platzierung sowie optionaler Hörer-Gebühren für feingranulare CPM-Modelle.
* **PDF-Optimierung:** Integrierter automatischer Textumbruch verhindert abgeschnittene Zeilen. Leistungsübersichten nutzen nun nativ das globale Layout-System.
* **Bug-Fixes:** Die fehlerhafte Darstellung schwarzer Wiki-Seiten wurde korrigiert. Zudem zeigt das Abrechnungs-Tool ab sofort lesbare Bezeichnungen statt kryptischer UUID-Strings an.

---

## 💾 Datenablage & Updates

Alle operativen Anwendungsdaten (SQLite-Datenbank, lokale Mediendateien, generierte Backups) werden im Benutzerverzeichnis unter `.podcore` gespeichert:
* **Windows:** `C:\Users\Name\.podcore`
* **macOS/Linux:** `~/.podcore`

> ⚠️ **Update-Hinweis:** Da deine Daten sicher im Benutzerverzeichnis hinterlegt sind, kannst du bei einem Update einfach den gesamten Programmordner durch die neue Version ersetzen. Die Datenbank-Migrationen werden beim Start der neuen Version automatisch ausgeführt.

---

## 📜 Versionshistorie

* **v2.11.7 (Juli 2026):** Performance-Optimierungen und Systemstabilität.
* **v2.11.5 (Juli 2026):** Freigabe-Center für Episoden und Interview-Fragen, Fixes für Vertragsdaten-Persistenz, Abrechnungs-Features, Textumbruch-Korrekturen in PDF-Dokumenten.
* **v2.11.4 (Juli 2026):** UUID-Ersetzung in Abrechnung durch Klarnamen, Buchungsbestätigung-PDF mit Vorplanungen.
* **v2.11.3 (Juli 2026):** Vorplanungen im integrierten Buchungskalender sichtbar, CSV-Export für Buchungsdaten.
* **v2.11.2 (Juli 2026):** Freigabe-Anfragen-Widget im Dashboard, globales Podcast-Profil für alle Nutzer.
* **v2.11.1 (Juli 2026):** Buchungs-Modal für Werbeplätze, Abrechnungs-Tab, TKP-Kalkulator-Fix.
* **v2.11.0 (Juli 2026):** Sponsoring-Infrastruktur-Update: Einführung des interaktiven Buchungskalenders, TKP-Kalkulator, Folgensponsor-Automatisierung.

---

## ☕ Support & Feedback

Bei Fragen oder Problemen öffne bitte ein Issue im GitHub-Repository. 

Wenn dir das Projekt gefällt und du die Weiterentwicklung unterstützen möchtest, freuen wir uns über einen Kaffee!
* **[☕ Unterstütze uns auf Buy Me a Coffee](https://www.paypal.com/donate/?hosted_button_id=XDVTBJ7YDRCXQ)**

**Lizenz:** MIT
