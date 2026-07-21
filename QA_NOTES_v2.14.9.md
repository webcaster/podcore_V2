# Visuelle Integrationsprüfung – PodCore v2.14.9

## Prüfumgebung

Die Prüfung erfolgte gegen den frisch erzeugten Produktionsbuild auf einem isolierten lokalen Server mit einem eigenen temporären Datenordner. Dadurch wurden keine bestehenden Projekt- oder Nutzerdaten verändert.

## Bestätigte Abläufe

| Bereich | Prüfschritt | Ergebnis |
|---|---|---|
| Interview-Block | Über **+ Interview** einen neuen Block erstellt | Erfolgreich: Der neue Block ist ein strukturierter Interviewblock mit Partnerauswahl statt eines unverbundenen Freitextblocks. |
| Partnerübernahme | Interview-Partner im neuen Block ausgewählt | Erfolgreich: Zwei Fragen des gewählten Partners wurden direkt in den Block übernommen. |
| Manuelle Frage | Neue Frage im Block hinzugefügt und Text eingegeben | Erfolgreich: Die Eingabe war direkt bearbeitbar und wurde als lokale Frage angezeigt. |
| Hub-Speicherung | Manuelle Frage über die vorgesehene Aktion im Redaktionshub gespeichert | Erfolgreich: Der Status wechselte von „Lokale Frage“ zu „Noch offen“. |
| Fragenfreigabe | Für die gespeicherte manuelle Frage eine Freigabe angefordert | Erfolgreich: Der Status wechselte sichtbar zu „Freigabe angefragt“. |
| Fragenreihenfolge | Manuelle Frage über „Frage nach oben“ verschoben | Erfolgreich: Die Frage wechselte sichtbar von Position 3 auf Position 2. |
| Persistenz | Episode nach den Änderungen gespeichert | Erfolgreich: Die Anwendung bestätigte die Speicherung ohne Fehlermeldung. |

> Die zugehörigen API-Ende-zu-Ende-Tests haben zusätzlich Datenbankstatus, Speicherpfad, Partnerfragen-Reihenfolge, Fragenfreigabe und die Freigabe einer Staffelplan-Position nach Episodenlöschung erfolgreich geprüft.

## Offene Freigabepunkte

Die Tests werden vor der Veröffentlichung mit einem erneuten Produktionsbuild, einer Persistenzkontrolle nach dem Neuladen und den aktualisierten Anwenderunterlagen abgeschlossen.

---

*Stand: 21. Juli 2026*

## Persistenzkontrolle nach Neuladen

Nach dem erneuten Laden der gespeicherten Testfolge waren der ausgewählte Interview-Partner, alle drei Fragen, die sichtbare Sortierung der manuellen Frage auf Position 2 sowie der Status „Freigabe angefragt“ unverändert vorhanden. Damit ist die Speicherung der überarbeiteten Interview-Blockdaten über den regulären Serverabruf bestätigt.

## Datenbank- und Speicheroberfläche

| Bereich | Prüfschritt | Ergebnis |
|---|---|---|
| Datenbankstatus | Administrationsbereich → Datenbank → „Status laden“ | Erfolgreich: Die Anwendung zeigte die aktive **lokale SQLite-Datenbank**, die Datenbankdatei, den Datenordner, die lokale Medienablage und eine kompakte Datensatzübersicht an. |
| MySQL-Umstellung | Administrationsbereich → Datenbank | Erfolgreich: Die Oberfläche trennt den aktiven SQLite-Betrieb klar von der optionalen, vorher testbaren **Datenkopie nach MySQL/MariaDB**; wichtige Hinweise und Einschränkungen sind sichtbar. |
| Speicherstatus | Branding & Backup → Speicher | Erfolgreich: Betriebsdaten, Medienablage, Sicherungen und das aktive Medienziel werden getrennt und verständlich ausgewiesen. |
| Lokaler Speichertest | Branding & Backup → Speicher → „Verbindung testen“ | Erfolgreich: Der konfigurierte lokale Medienpfad wurde mit der Rückmeldung „Lokaler Pfad erreichbar“ bestätigt. |

> Die Oberfläche kennzeichnet SFTP/SSH ausdrücklich als derzeit nicht verfügbar. Damit wird verhindert, dass Endnutzer eine scheinbar erfolgreiche, aber technisch wirkungslose Speicherumstellung durchführen.

## Abschließende API-Ende-zu-Ende-Prüfung

Der reproduzierbare Test wurde nach dem vollständigen Zurücksetzen der isolierten Produktionsdaten erfolgreich ausgeführt.

| Prüfung | Ergebnis |
|---|---|
| Aktiver Datenbanktyp | `SQLite (lokal, aktiv)` |
| Effektiver lokaler Medienpfad | `/tmp/podcore-v2149-e2e-data/media-e2e` |
| Partnerfragen-Reihenfolge | Zwei Partnerfragen wurden in der erwarteten Reihenfolge verarbeitet. |
| Fragenfreigabe | Der Statusübergang bis `freigegeben` wurde erfolgreich bestätigt. |
| Manuelle Episode | Eine Folge ohne Ideenmappe wurde erfolgreich erstellt. |
| Staffelplan-Löschung | Eine nach dem Löschen der Episode verwaiste Staffelplan-Position wurde erfolgreich entfernt. |

> Ergebnis: **Alle automatisierten Ende-zu-Ende-Prüfungen erfolgreich.**
