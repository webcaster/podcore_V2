# PodCore Add-ons – Produkt- und Umsetzungsplan

**Planstand:** 2.0.0  
**Bezugsversion:** PodCore v2.16.34  
**Status:** Architektur- und Produktplanung; keine Add-ons werden mit diesem Release aktiviert oder verkauft.

## Zielbild

PodCore soll durch **klar abgegrenzte Erweiterungspakete** wachsen, ohne die Stabilität der lokalen Basisinstallation zu gefährden. Add-ons erweitern zuerst Vorlagen, PDF-Layouts, Produktionsabläufe, Rollenprofile und geprüfte Integrationskonfigurationen. Sie dürfen weder beliebigen Drittcode ausführen noch Episoden, Medien, Benutzer oder Sicherungen außerhalb ihres eigenen Namensraums verändern.

Das bestehende **WordPress-Plugin zur Präsentation von Add-ons** bleibt die öffentliche Katalog- und Produktoberfläche. PodCore selbst übernimmt erst nach einer späteren Freigabe die kontrollierte Prüfung, Installation, Aktivierung, Deaktivierung und Aktualisierung eines erworbenen oder kostenlosen Pakets.

> **Leitentscheidung:** Die erste produktive Add-on-Generation besteht ausschließlich aus signierten, deklarativen Inhaltspaketen. Ausführbarer Drittcode, frei installierbare Skripte und unkontrollierte Connectoren bleiben ausdrücklich ausgeschlossen.

## Produktstruktur

| Kategorie | Erste geeignete Pakete | Nutzen in PodCore | Reifegrad |
|---|---|---|---|
| Produktionsvorlagen | Interview-Kit, Serienformat, Recherche-Workflow | Startfertige Episodenblöcke, Checklisten und Produktionsschritte | Priorität 1 |
| PDF- & Markenpakete | Angebots-PDF, Sponsoring-Layout, CI-Erweiterung | Geprüfte Layouts, Farben, Typografie und Dokumentvorlagen | Priorität 1 |
| Tutorial-Kollektionen | Onboarding für Redaktion, Sponsoring oder Produktion | Importierbare, rollenbezogene Anleitungen mit optionalen Screenshots | Priorität 1, teilweise kostenfrei |
| Rollen- & Workflowpakete | Agentur-Workflow, Redaktionsfreigabe, Gastproduktion | Rollenprofile, Freigabeschritte und Checklisten als Vorschlag | Priorität 2 |
| Integrationskonfigurationen | Podigee-Setup, Speicher- und Backup-Vorlage | Ausschließlich geprüfte Einstellungen, niemals mit eingebettetem Drittcode | Priorität 2 |
| Connectoren | Externe Plattformen oder Dienste | Eigene, von PodCore implementierte Schnittstellen mit klaren Berechtigungen | Erst nach stabiler Add-on-Basis |

## Verantwortlichkeiten von WordPress und PodCore

| Bereich | WordPress-Add-on-Plugin | PodCore-App |
|---|---|---|
| Öffentlicher Katalog | Produktseiten, Nutzen, Screenshots, Changelog, Preis und Kompatibilität | Zeigt später denselben Katalog innerhalb des Adminbereichs an |
| Berechtigung | Verknüpft Kauf, Kundenkonto und Lizenz mit einem Add-on-Anspruch | Prüft den Anspruch vor Aktivierung und speichert nur einen minimierten lokalen Nachweis |
| Paketbereitstellung | Liefert Manifest, ZIP, Prüfsumme und Signatur aus | Lädt oder importiert das Paket, prüft es und installiert es isoliert |
| Installation | Keine Ausführung von Paketinhalt | Vorschau, Kompatibilitätscheck, Aktivierung, Deaktivierung, Update und Rollback |
| Offlinebetrieb | Stellt bei Onlinekontakt erneuerte Nachweise bereit | Nutzt einen zeitlich begrenzten, signierten lokalen Nachweis und bleibt innerhalb der Grace Period nutzbar |

Der WordPress-Katalog ist dabei **nicht** die Sicherheitsgrenze. Kaufstatus und Downloadberechtigung ergänzen die technische Paketprüfung, ersetzen aber weder Signatur noch Prüfsumme oder Kompatibilitätsprüfung.

## Technische Leitplanken

Ein Add-on wird als versioniertes ZIP mit `manifest.json`, `signature.sig`, `README.md`, `CHANGELOG.md` und ausschließlich erlaubten Inhaltsordnern geliefert. Die App prüft vor jedem Entpacken Paketgröße, sichere Pfade, Manifest-Schema, Herausgeber, Ed25519-Signatur, SHA-256-Prüfsumme, PodCore-Version, Add-on-Typ, Abhängigkeiten und deklarierte Berechtigungen.

| Kontrollpunkt | Vorgabe |
|---|---|
| Erlaubte Typen in Version 1 | `template-pack`, `pdf-pack`, `brand-pack`, `workflow-pack`, `tutorial-pack` |
| Nicht zulässig | JavaScript, PHP, Python, native Binaries, Shell-Skripte, Symlinks und Pfade außerhalb des Add-on-Verzeichnisses |
| Lokaler Speicher | Separat vom Quellcode und den Produktionsdaten, versioniert mit Staging- und Quarantänebereich |
| Aktivierung | Erst nach lesbarer Paketvorschau und ausdrücklicher Bestätigung eines berechtigten Administrators |
| Updates | Neue Version zuerst in Staging prüfen; letzte funktionsfähige Version bis zur Bestätigung behalten |
| Deinstallation | Entfernt nur den eigenen Paketbereich; von Nutzern erzeugte Inhalte bleiben standardmäßig erhalten |
| Audit | Aktion, Zeitpunkt, Administrator, Add-on-ID, Version und Ergebnis; keine Tokens oder Lizenzschlüssel im Protokoll |

## WordPress-Katalog und Seitenstruktur

Das vorhandene WordPress-Plugin erhält beziehungsweise nutzt künftig einen Bereich **„PodCore Add-ons“**. Die Präsentation bleibt verständlich und verkaufsorientiert, während technische Angaben vollständig einsehbar bleiben.

| WordPress-Unterseite | Inhalt | Hauptaktion |
|---|---|---|
| `/podcore/addons/` | Filterbarer Überblick nach Kategorie, Zielgruppe und Kompatibilität | Details öffnen |
| `/podcore/addons/<slug>/` | Nutzen, enthaltene Inhalte, Screenshots, Kompatibilität, Changelog und Voraussetzungen | Add-on erwerben oder herunterladen |
| `/podcore/addons/installation/` | Anleitung für Online-Download und manuellen Offline-Import | In PodCore installieren |
| Kundenbereich | Gekaufte Add-ons, freigeschaltete Versionen, Downloads und Installationshinweise | Paket erneut laden |

Als nächster Plugin-Schritt wird ein öffentlicher, maschinenlesbarer Katalogendpunkt vorgesehen, beispielsweise `wp-json/podcore-addons/v1/catalog`. Er liefert ausschließlich öffentliche Metadaten. Anspruchs- und Downloadendpunkte benötigen zusätzlich den bereits etablierten, tokenbasierten Lizenznachweis.

## Freischaltung und Offlinebetrieb

Ein berechtigter Kauf erzeugt im WordPress-System einen Add-on-Anspruch, der an die PodCore-Lizenz oder eine definierte Kundengruppe gekoppelt ist. Die App ruft nach erfolgreicher Aktivierung einen signierten, installationsbezogenen Add-on-Nachweis ab. Dieser enthält Add-on-ID, Paketversion beziehungsweise Versionsbereich, Ablaufzeit, Installation und Signatur, aber keine Zahlungsdaten.

Bei fehlender Internetverbindung bleibt ein bereits aktiviertes Add-on innerhalb einer begrenzten Offline-Grace-Period nutzbar. Nach Ablauf schaltet es nicht stillschweigend Daten ab: Die von ihm erzeugten Inhalte bleiben lesbar, während neue Add-on-spezifische Änderungen bis zur erfolgreichen erneuten Prüfung gesperrt werden. Lifetime-Ansprüche erhalten keinen regulären Produktablauf, benötigen aber weiterhin einen erneuerbaren Widerrufs- und Sicherheitsnachweis.

## Umsetzungsreihenfolge

| Phase | Umfang | Ergebnis |
|---|---|---|
| A – Spezifikation | Manifest-Schema, Pakettypen, Berechtigungen, Namensräume und Abnahmefälle | Abgestimmte technische Grundlage |
| B – Lokale Registry | Add-on-Status, Speicherorte, Quarantäne, Audit und `canManageAddons` | App kann Pakete sicher verwalten |
| C – Paketprüfung | Signatur, Prüfsumme, ZIP-Pfadsicherheit, Kompatibilität und Staging | Manipulierte oder inkompatible Pakete werden abgewiesen |
| D – Admin-MVP | Vorschau, manueller Import, Installieren, Aktivieren, Deaktivieren und Entfernen | Kontrollierte lokale Verwaltung |
| E – Referenzpakete | Ein Produktionsvorlagenpaket und ein PDF-/Markenpaket | End-to-End-Nachweis ohne Drittcode |
| F – WordPress-Katalog | Detailseiten, Katalog-API, Paketdateien, Changelog und Kundenbereich | Website und App teilen verlässliche Metadaten |
| G – Anspruchsnachweis | Signierter Add-on-Anspruch, Onlineprüfung und Offline-Grace-Period | Kauf- und Offlineablauf geschlossen |
| H – Sichere Connectoren | Nur explizit implementierte Integrationen mit separaten Berechtigungen | Erweiterte Funktionen ohne fremden Code |

## Abnahmekriterien vor der ersten Veröffentlichung

Ein erstes Add-on darf erst öffentlich angeboten werden, wenn ein gültiges Paket installiert, aktiviert, deaktiviert, aktualisiert und entfernt werden kann, ohne Episoden, Medien, Benutzer, Rollen, Sicherungen oder globale Einstellungen zu verändern. Manipulierte Archive, falsche Prüfsummen, ungültige Signaturen, unbekannte Pakettypen, unsichere Archivpfade, falsche Versionen und fehlende Ansprüche müssen jeweils nachvollziehbar abgewiesen werden.

Vor dem Verkaufsstart benötigt jedes Add-on ein Manifest, eine Signatur, eine SHA-256-Prüfsumme, einen Changelog, die Angabe kompatibler PodCore-Versionen, eine Installations- und Deinstallationsprüfung, eine verständliche WordPress-Detailseite und eine Testinstallation auf einem frischen lokalen System.

## Konkreter nächster Schritt

Als erstes internes Referenz-Add-on wird das **„Interview-Produktionspaket“** empfohlen. Es besteht aus Episoden- und Fragenvorlagen, einer Recherche-Checkliste und einem Tutorial-Paket. Es demonstriert Katalog, Paketprüfung, lokale Installation und Rücknahme mit echtem Nutzen, ohne Drittcode oder externe Systeme einzuführen.
