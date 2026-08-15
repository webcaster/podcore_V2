# PodCore Add-on-Roadmap

**Planstand:** 1.0.0  
**Zielrelease für die technische Vorbereitung:** PodCore 2.16.11  
**Status:** Planung, keine Aktivierung von Käufen oder Lizenzen  
**Autor:** Manus AI

## 1. Ziel und Leitentscheidung

PodCore soll künftig um klar abgegrenzte Add-ons erweitert werden können, die auf der Website als eigenständige Module angeboten und in der App kontrolliert installiert, aktualisiert, deaktiviert und entfernt werden. Die erste Generation darf die stabile Basisinstallation nicht gefährden und soll keine beliebigen Drittanbieter-Skripte ausführen.

Die zentrale Leitentscheidung lautet deshalb: **Version 1 der Add-ons besteht ausschließlich aus signierten Daten-, Vorlagen- und Konfigurationspaketen.** Ein Paket kann neue Produktionsvorlagen, PDF-Layouts, Markenbausteine, Checklisten, Rollenprofile oder deklarative Integrationskonfigurationen liefern. Beliebiger JavaScript-, PHP-, Python- oder Binärcode wird in dieser ersten Ausbaustufe nicht installiert und nicht ausgeführt.

Diese Entscheidung passt zum vorhandenen Konzept in `docs/ADDON-KONZEPT-2.16.10.md` und reduziert das Risiko für lokale Installationen, Backups, Episodendaten und Benutzerkonten. Spätere Connectoren dürfen nur über ausdrücklich implementierte und getestete PodCore-Schnittstellen arbeiten.

## 2. Ausgangslage im bestehenden Projekt

Die aktuelle Codebasis enthält bereits mehrere geeignete Anknüpfungspunkte: einen separaten Server mit Express-Routern, eine SQLite-/Datenbankstruktur mit `settings`, bestehende Admin-Routen unter `server/routers/admin.ts`, Rollen- und Berechtigungsprüfungen sowie eine etablierte Skript- und Dokumentationsstruktur. Die vorhandene Add-on-Konzeption fordert bereits Manifest, Kompatibilitätsprüfung, Prüfsumme, Abhängigkeiten, Deinstallationsstrategie und einen getrennten Administrationsbereich.

Der Add-on-Manager sollte deshalb nicht als paralleles Fremdsystem entstehen. Er wird als neues Modul in die vorhandene Admin-Struktur integriert und nutzt dieselben Authentifizierungs-, Rollen-, Audit- und Update-Prinzipien wie die übrigen Administrationsfunktionen.

| Bestehender Bereich | Verwendung für Add-ons | Konsequenz |
|---|---|---|
| `server/routers/admin.ts` | Geschützte Endpunkte für Katalog, Installation, Aktivierung und Entfernung | Alle Schreibvorgänge nur mit passender Admin-Berechtigung |
| `settings` und bestehende Datenbank | Add-on-Status, Quelle, letzte Prüfung und lokale Konfiguration | Keine Add-on-Daten in Episoden- oder Mediendaten vermischen |
| Rollen/Berechtigungen | Sichtbarkeit und Nutzung einzelner Add-on-Funktionen | Mindestens getrennte Rechte für Verwalten und Verwenden |
| `client`-Adminoberfläche | Add-on-Katalog und lokale Verwaltung | Verfügbare, installierte und aktualisierbare Pakete getrennt darstellen |
| `scripts/set-version.mjs` und Release-Dokumente | Versionierung und reproduzierbare Releases | App- und Add-on-Versionen getrennt, aber kompatibel deklarieren |
| `docs/ADDON-KONZEPT-2.16.10.md` | Bestehende Produktleitplanken | Diese Roadmap konkretisiert die Umsetzung |

## 3. Zielarchitektur

### 3.1 Komponenten

Die Lösung besteht aus vier Teilen. Erstens gibt es einen öffentlichen Add-on-Katalog auf der Website der App. Er beschreibt Pakete, Kompatibilität, Lizenzstatus, Änderungsprotokoll, Screenshots oder Vorschaudateien sowie den Download. Zweitens gibt es einen Paketdienst, der Manifestdateien, Archive, Signaturen und Prüfsummen ausliefert. Drittens gibt es den lokalen Add-on-Manager im PodCore-Server. Er lädt Pakete herunter oder nimmt sie als manuelle Datei entgegen, prüft sie und installiert sie in einem isolierten Datenverzeichnis. Viertens gibt es den Adminbereich, über den Administratoren den Zustand kontrollieren und Aktionen ausführen.

```text
Website / Add-on-Katalog
        |
        | Manifest, Download, Signatur, Changelog
        v
PodCore Add-on-Manager
        |
        | Kompatibilität -> Signatur -> Prüfsumme -> Inhalt -> Abhängigkeiten
        v
Lokaler Add-on-Speicher
        |
        +-- Vorlagen
        +-- PDF-Layouts
        +-- Markenpakete
        +-- Checklisten / Rollenprofile
        +-- deklarative Einstellungen
```

### 3.2 Empfohlene Verzeichnisstruktur

Die tatsächlichen Pfade werden bei der Implementierung gegen die bestehende Serverstruktur geprüft. Als Zielstruktur wird empfohlen:

```text
server/
  addons/
    addonManager.ts
    addonManifest.ts
    addonVerifier.ts
    addonInstaller.ts
    addonRegistry.ts
  routers/
    adminAddons.ts
shared/
  addonTypes.ts
  addonSchema.ts
data/
  addons/
    registry.json
    installed/
      <addon-id>/
        <addon-version>/
        current.json
    staging/
    quarantine/
docs/
  ADDON-SDK-1.0.md
  ADDON-RELEASE-CHECKLIST.md
```

Der lokale Speicher muss außerhalb des Quellcodes liegen. Add-on-Dateien dürfen niemals in `client/src`, `server` oder die Hauptdatenbankdateien geschrieben werden. Ein fehlgeschlagener Download wird in `staging` oder `quarantine` abgelegt und nicht aktiviert.

## 4. Paketformat und Manifest

Ein Add-on wird als ZIP-Paket mit einer festen, dokumentierten Struktur angeboten. Das ZIP darf keine symbolischen Links, absoluten Pfade oder Pfadsegmente wie `..` enthalten. Das Manifest liegt an einer vorgeschriebenen Stelle und wird vor dem Entpacken aus dem Archiv gelesen oder in einem sicheren temporären Verzeichnis geprüft.

```text
podcore-addon-<addon-id>-<version>.zip
  manifest.json
  signature.sig
  README.md
  CHANGELOG.md
  assets/
  templates/
  pdf-layouts/
  permissions.json
```

Beispiel für ein minimales Manifest:

```json
{
  "schemaVersion": 1,
  "id": "podcore.production.interview-kit",
  "name": "Interview-Produktionspaket",
  "version": "1.0.0",
  "publisher": "PodCore",
  "description": "Vorlagen und Checklisten für wiederkehrende Interviewfolgen.",
  "podcore": {
    "minVersion": "2.16.11",
    "maxTestedVersion": "2.16.x"
  },
  "type": "template-pack",
  "entrypoints": {
    "templates": ["templates/interview.json"],
    "checklists": ["templates/interview-checklist.json"]
  },
  "capabilities": ["read:podcast-settings", "write:addon-data"],
  "dependencies": [],
  "files": {
    "sha256": "RELEASE_GENERATED_SHA256"
  },
  "uninstall": {
    "removableData": ["addon-data/podcore.production.interview-kit"],
    "preserveUserData": true
  }
}
```

Die erlaubten Add-on-Typen werden als feste Allowlist implementiert: `template-pack`, `pdf-pack`, `brand-pack`, `workflow-pack` und später `connector-config`. Ein unbekannter Typ führt zu einer Ablehnung. Jede Erweiterung der Allowlist benötigt eine neue App-Version, Tests und eine aktualisierte SDK-Dokumentation.

## 5. Installations- und Sicherheitsablauf

Die Installation erfolgt in einer unveränderlichen Reihenfolge. Zuerst wird die Datei oder URL validiert. Danach werden Manifest, Signatur und SHA-256-Prüfsumme geprüft. Anschließend prüft PodCore App-Version, Add-on-Schema, Pakettyp, Abhängigkeiten, Dateigrößen, Dateianzahl und sichere Pfade. Erst nach erfolgreicher Prüfung wird in ein versioniertes Zielverzeichnis entpackt. Zum Schluss wird ein Registry-Eintrag geschrieben und das Add-on atomar aktiviert.

| Prüfschritt | Ablehnungsgrund | Ergebnis bei Erfolg |
|---|---|---|
| Dateityp und Größenlimit | Kein ZIP, zu groß oder zu viele Dateien | Temporäres Prüfverzeichnis |
| Manifest-Schema | Pflichtfeld fehlt oder ungültiger Datentyp | Strukturierte Add-on-Metadaten |
| Signatur | Signatur fehlt oder unbekannter Herausgeber | Vertrauensstatus |
| Prüfsumme | Archivinhalt stimmt nicht mit Manifest überein | Integrität bestätigt |
| Kompatibilität | PodCore-Version außerhalb des Bereichs | Installationsfreigabe |
| Capability-Allowlist | Nicht erlaubte Berechtigung | Berechtigungsumfang |
| Pfadprüfung | Traversal, Symlink oder absoluter Pfad | Sicherer Paketinhalt |
| Abhängigkeiten | Fehlende oder inkompatible Abhängigkeit | Installationsreihenfolge |
| Deinstallationsplan | Löschen außerhalb des Add-on-Bereichs | Sichere Rücknahme |

Ein Add-on darf nur seinen eigenen Namensraum verändern. Das System muss technisch verhindern, dass Deinstallation oder Update Tabellen, Episoden, Mediendateien, Backups, Benutzer, Rollen oder globale App-Einstellungen löscht. Bei einem Update wird zunächst die alte Version beibehalten; ein Rollback auf die letzte funktionsfähige Version muss möglich sein.

Für die erste produktive Version wird ein eingebetteter öffentlicher Signaturschlüssel in der App vorgesehen. Die Website veröffentlicht zu jedem Paket Signatur, Prüfsumme und Manifest. Ein Schlüsselwechsel benötigt ein reguläres PodCore-Update und darf nicht ausschließlich über den Add-on-Download erfolgen.

## 6. Datenmodell und API-Plan

Die Registry sollte zunächst als eigene Add-on-Verwaltung umgesetzt werden. Die Daten können in einer dedizierten Tabelle oder, falls die bestehende Datenbankabstraktion dies zunächst besser unterstützt, in einem klar abgegrenzten Registry-Datensatz gespeichert werden. Für Wartbarkeit und spätere Migration ist eine eigene Tabelle vorzuziehen.

| Feld | Zweck |
|---|---|
| `id` | Interne eindeutige ID |
| `addon_id` | Stabile öffentliche Add-on-ID |
| `version` | Installierte Paketversion |
| `status` | `available`, `installed`, `active`, `disabled`, `quarantined`, `failed` |
| `manifest_json` | Geprüfte Metadaten des Pakets |
| `source_url` | Herkunft des Downloads |
| `sha256` | Geprüfte Paket-Prüfsumme |
| `signature_status` | Ergebnis der Signaturprüfung |
| `installed_at` / `updated_at` | Nachvollziehbarkeit |
| `enabled_by` | Administrator, der aktiviert hat |
| `last_error` | Nicht-sensitive technische Fehlermeldung |

Empfohlene Endpunkte unter dem geschützten Admin-Router sind `GET /admin/addons/catalog`, `GET /admin/addons/installed`, `POST /admin/addons/preview`, `POST /admin/addons/install`, `POST /admin/addons/:id/enable`, `POST /admin/addons/:id/disable`, `POST /admin/addons/:id/update`, `DELETE /admin/addons/:id` und `GET /admin/addons/:id/audit`. Die Installation, Aktivierung und Deinstallation benötigen die vorhandene Berechtigung zum Verwalten von Einstellungen oder eine spezifischere Berechtigung `canManageAddons`. Eine Aktivierung mit Auswirkungen auf globale Produktionsabläufe sollte zusätzlich eine Bestätigung und – falls vorhanden – die bestehende Elevation-Logik verwenden.

## 7. Admin-Bereich in der App

Alle neuen Module werden im vorhandenen Administrationsbereich ergänzt. Die Navigation erhält den Punkt **Add-ons**. Die Startansicht zeigt drei getrennte Bereiche: „Verfügbar“, „Installiert“ und „Aktualisierungen“. Jede Karte enthält Name, Herausgeber, Version, kompatible PodCore-Version, Pakettyp, Berechtigungen, Speicherbedarf, Lizenzstatus und den Zeitpunkt der letzten Prüfung.

Die Detailansicht bietet zunächst eine **nur lesende Paketvorschau**. Vor der Installation müssen Manifest, Berechtigungen, Abhängigkeiten, betroffene Datenbereiche und Deinstallationsverhalten sichtbar sein. Erst danach werden die Schaltflächen „Installieren“, „Aktivieren“, „Deaktivieren“, „Aktualisieren“ und „Entfernen“ abhängig von Rolle und Zustand freigeschaltet.

Fehler werden verständlich und ohne geheime Download- oder Lizenzdaten angezeigt. Der Auditbereich dokumentiert Benutzer, Zeitpunkt, Aktion, Add-on-ID, Version und Ergebnis. Persönliche Daten, vollständige Tokens und Lizenzschlüssel dürfen nicht in Logs landen.

## 8. Website und Download-Angebot

Die Website erhält einen eigenen Bereich **PodCore Add-ons**. Der öffentliche Katalog ist auch ohne Anmeldung lesbar. Für jedes Add-on werden eine kurze Nutzenbeschreibung, Zielgruppe, Screenshots oder Vorschauen, enthaltene Bestandteile, Kompatibilität, Lizenzmodell, Version, Changelog, Supportstatus und Downloadoptionen angezeigt.

In der ersten Phase genügt ein statischer oder CMS-basierter Katalog mit versionierten Dateien. Der Katalog sollte ein maschinenlesbares Indexdokument anbieten, beispielsweise `addons/index.json`, damit PodCore verfügbare Updates prüfen kann. Dieses Indexdokument enthält nur öffentliche Metadaten und Downloadinformationen; die eigentliche Berechtigung wird später separat ergänzt.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-15T00:00:00Z",
  "addons": [
    {
      "id": "podcore.production.interview-kit",
      "latestVersion": "1.0.0",
      "download": "https://example.org/addons/podcore.production.interview-kit/1.0.0/package.zip",
      "manifest": "https://example.org/addons/podcore.production.interview-kit/1.0.0/manifest.json",
      "sha256": "RELEASE_GENERATED_SHA256",
      "signature": "https://example.org/addons/podcore.production.interview-kit/1.0.0/signature.sig",
      "minPodcoreVersion": "2.16.11"
    }
  ]
}
```

Der Download sollte sowohl direkt von der Website als auch über einen manuellen Import in PodCore möglich sein. Damit bleiben lokale oder offline betriebene Installationen nutzbar. Eine spätere Shop- oder Lizenzanbindung wird als Berechtigungsprüfung vor der Installation ergänzt und darf die kryptografische Paketprüfung nicht ersetzen.

## 9. Versionierung und Releaseprozess

Die PodCore-App und jedes Add-on erhalten eigene semantische Versionen. Eine Add-on-Patch-Version behebt Fehler ohne Manifest- oder Funktionsänderung. Eine Minor-Version ergänzt rückwärtskompatible Inhalte. Eine Major-Version verändert Datenformat, Berechtigungen oder Verhalten und benötigt eine dokumentierte Migration.

Für die nächste kleine Projektrevision wird **PodCore 2.16.11** als Zielversion für die technische Basis vorgesehen. Diese Roadmap selbst trägt den Planstand **1.0.0**. Bis zur ausdrücklichen Anweisung „Finales Update“ werden weitere kleine Änderungen fortlaufend als Patch- oder Minor-Revision dokumentiert.

Jedes Add-on-Release benötigt mindestens: Manifest, ZIP-Archiv, Signatur, SHA-256-Prüfsumme, Changelog, Kompatibilitätsangabe, Installations- und Deinstallationsprüfung, Screenshot oder Vorschau, sowie einen Eintrag im Website-Katalog. Die GitHub-Release-Datei darf erst veröffentlicht werden, wenn die automatisierten Paket- und Sicherheitstests erfolgreich sind.

## 10. Umsetzungsphasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 – Vorbereitung | Add-on-Schema, Namensräume, Datenlöschregeln und öffentliche Signaturstrategie festlegen | Abgenommene technische Spezifikation |
| 1 – Registry | Add-on-Typen, Manifestparser, Registry, sichere lokale Verzeichnisse und Statusmodell | Add-on kann erkannt und verwaltet werden |
| 2 – Verifikation | ZIP-Sicherheitsprüfung, Signatur, Prüfsumme, Kompatibilität und Quarantäne | Manipulierte oder inkompatible Pakete werden abgewiesen |
| 3 – Admin-MVP | Add-on-Menü, Vorschau, Installieren, Aktivieren, Deaktivieren, Entfernen und Audit | Administrator kann Module lokal verwalten |
| 4 – Erste Inhalte | Produktionsvorlagen und PDF-/Markenpaket als interne Referenz-Add-ons | End-to-End-Nachweis ohne Drittcode |
| 5 – Website-Katalog | Detailseiten, Downloads, `index.json`, Changelogs und Installationsanleitung | Nutzer können Add-ons nachvollziehbar beziehen |
| 6 – Updatepfad | Updateprüfung, Versionseinschränkungen, Backup-/Rollback-Verhalten und Fehlerdialoge | Sicherer Updatebetrieb |
| 7 – Lizenzoption | Lizenz- oder Shop-Berechtigung als zusätzliche, offline-tolerante Prüfung | Monetarisierung ohne Architekturbruch |

Die Phasen sollten nacheinander abgeschlossen werden. Connectoren und ausführbarer Drittcode gehören ausdrücklich nicht in den ersten MVP.

## 11. Test- und Abnahmekriterien

Die erste produktionsfähige Add-on-Version ist erst abnahmefähig, wenn ein gültiges Referenzpaket installiert, aktiviert, deaktiviert, aktualisiert und entfernt werden kann, ohne Episoden, Medien, Benutzerkonten oder Backups zu verändern. Ein manipuliertes Archiv, eine falsche Prüfsumme, eine ungültige Signatur, ein unbekannter Pakettyp, eine inkompatible PodCore-Version und ein gefährlicher Archivpfad müssen jeweils reproduzierbar abgewiesen werden.

Zusätzlich sind Tests für fehlende Abhängigkeiten, Rollback nach fehlgeschlagenem Update, doppelte Installation, beschädigte Registry, Offlinebetrieb, unberechtigte Benutzerrollen und fehlende Website-Metadaten erforderlich. Für jede Admin-Aktion muss ein Audit-Eintrag erzeugt werden. Die Installationsanleitung wird mit einer frischen lokalen Installation und mit einer bestehenden PodCore-Installation geprüft.

## 12. Dokumentation und GitHub-Ablauf

Mit der Implementierung werden `docs/ADDON-SDK-1.0.md`, `docs/ADDON-RELEASE-CHECKLIST.md` und eine Anwenderanleitung für den Adminbereich ergänzt. Die README erhält einen kurzen Verweis auf den Add-on-Bereich; ausführliche technische Inhalte bleiben in `docs/`. Für jedes Add-on wird ein eigenes Verzeichnis oder ein eigenes Repository-Segment mit Manifest, Quellen, Vorschau, Changelog und reproduzierbarem Build verwendet.

Die Änderungen werden in einem Feature-Branch entwickelt, geprüft und anschließend mit einer klaren Commit-Nachricht in das ausgewählte GitHub-Repository übertragen. Für jede veröffentlichte Add-on-Version wird ein GitHub-Release mit ZIP, Manifest, Signatur, Prüfsumme und Changelog angelegt. Der Download auf der Website verweist ausschließlich auf veröffentlichte, geprüfte Artefakte.

## 13. Empfohlener nächster Schritt

Als nächster Implementierungsschritt sollte zunächst die **Phase 0** als kleines technisches Basis-Update umgesetzt werden: `shared/addonTypes.ts`, Manifest-Schema, Registry-Statusmodell, sichere Paketpfade und die Berechtigung `canManageAddons`. Danach kann ein internes, kostenloses Referenzpaket für Produktionsvorlagen folgen. Erst wenn dieser Ablauf stabil ist, sollte der öffentliche Download-Katalog freigeschaltet werden.

Die erste konkrete Add-on-Auswahl sollte aus einem **Produktionsvorlagenpaket** und einem **PDF-/Markenpaket** bestehen. Beide demonstrieren einen realen Nutzen, benötigen keinen ausführbaren Drittcode und lassen sich vollständig über den vorgesehenen Adminbereich verwalten.
