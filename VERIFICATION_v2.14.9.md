# PodCore v2.14.9 – Funktionsprüfung

**Prüfdatum:** 21. Juli 2026
**Geprüfter Stand:** Lokale Release-Arbeitskopie von PodCore v2.14.9
**Prüfumgebung:** Isolierter Produktionsserver mit frischem temporärem Datenordner und authentifizierter Administrationssitzung

## Prüfziel

Dieses Protokoll dokumentiert die Nachweise für den vereinheitlichten Interview- und Episodenabschlussablauf, die Freigabe und Sortierung von Interview-Fragen, die transparente Datenbank- und Speicheranzeige sowie die Bereinigung verwaister Staffelplan-Positionen. Die automatisierten Prüfungen liefen gegen einen isolierten Datenordner unter `/tmp`; produktive Projekt- oder Nutzerdaten wurden nicht verwendet.

| Bereich | Prüfschritt | Ergebnis |
|---|---|---|
| Einheitlicher Interview-Einstieg | Im Episoden-Editor **„+ Interview“** gewählt | Erfolgreich; der neue Block zeigt unmittelbar Partnerauswahl und Frageneditor. |
| Partner- und Fragenübernahme | Testpartner im Interview-Block ausgewählt | Erfolgreich; Partnerfragen wurden mit Quellenbezug und Status in den Block übernommen. |
| Manuelle Blockfrage | Frage direkt im Block eingegeben und gespeichert | Erfolgreich; die Eingabe war bedienbar, wurde im RedaktionsHub gespeichert und blieb nach dem Neuladen erhalten. |
| Fragenfreigabe | Freigabe aus dem Episoden-Editor angefordert und über API verarbeitet | Erfolgreich; Statusübergang bis **freigegeben** bestätigt. |
| Fragen-Sortierung | Partnerfrage im Editor verschoben und Episode gespeichert | Erfolgreich; die sichtbare Reihenfolge änderte sich und blieb nach erneutem Laden erhalten. |
| Ideenmappen- und manueller Folgenweg | Regulären Staffelplan-zu-Ideenmappe-zu-Episode-Weg sowie manuelle Episode durchlaufen | Erfolgreich; die Datenflüsse erzeugten gültige Folgen und Interviewdaten. |
| Fertigstellungscheck | Interview-Block im Editor visuell geprüft | Erfolgreich; Partner, Fragen und erforderliche Freigaben werden im Abschlussstatus berücksichtigt. |
| Datenbankstatus | Administration → Datenbank → **Status laden** | Erfolgreich; aktive SQLite-Datenbank, Datenbankdatei, Datenordner, Medienablage und Bestandsübersicht sichtbar. |
| MySQL/MariaDB-Umstellung | Datenbankbereich visuell geprüft | Erfolgreich; die Oberfläche unterscheidet die aktive SQLite-Laufzeit klar von der optionalen, vorher testbaren Datenkopie. |
| Speicherstatus | Branding & Backup → Speicher geöffnet | Erfolgreich; Betriebsdaten, Medienablage, Sicherungen und aktives Medienziel werden getrennt ausgewiesen. |
| Lokaler Speichertest | Konfigurierten lokalen Medienpfad getestet | Erfolgreich; der Pfad wurde als erreichbar bestätigt. |
| Staffelplan-Löschung | Episode gelöscht und verwaiste Planposition entfernt | Erfolgreich; die Staffelplan-Position wurde bereinigt. |

## Detailnachweise

### Einheitlicher Interview-Block und Partnerauswahl

Die sichtbare Aktion **„+ Interview“** wurde über den strukturierten Interview-Einstieg ausgeführt. Der neu angelegte Block enthält die Auswahl eines Interview-Partners, die zugehörigen Fragen und die Bearbeitungsschritte, die bisher nur im spezifischen Fragenblock zuverlässig verfügbar waren. Damit existieren keine zwei fachlich abweichenden Wege mehr, einen Interview-Block anzulegen.

Die Übernahme eines vorhandenen Testpartners bestätigte, dass Partnerfragen nicht als unstrukturierter Text verloren gehen. Für jede übernommene Frage stehen Herkunft, Freigabestatus und Antwortzeit zur Verfügung. Der automatisierte Ablauf bestätigte zusätzlich, dass derselbe Datenfluss beim Übergang von Staffelplan über Ideenmappe zur Episode und bei einer manuell erstellten Folge gültig bleibt.

### Manuelle Fragen, Freigabe und Sortierung

Eine manuelle Testfrage wurde direkt im Interview-Block eingegeben. Der Eingabewert war editierbar, konnte über die vorgesehene Aktion zentral im RedaktionsHub gespeichert und anschließend aus dem Episoden-Editor zur Freigabe angefordert werden. Die anschließende API-Prüfung bestätigte die fachliche Statusfolge bis **freigegeben**.

Für die Sortierung wurde eine übernommene Partnerfrage im Editor verschoben. Nach dem Speichern und dem erneuten Öffnen der Episode blieb die geänderte Reihenfolge sichtbar. Damit ist die partnerspezifische Fragefolge nicht nur serverseitig, sondern auch im Arbeitsablauf der Redaktion dauerhaft nutzbar.

### Fertigstellungscheck der Episode

Der Episoden-Editor berechnet die Interviewbereitschaft aus denselben Blockdaten wie die Eingabeoberfläche. Der Abschlussbereich weist auf fehlende Partner, fehlende Fragen oder erforderliche noch nicht freigegebene Fragen hin. Bei aktivierter Fragenfreigabe kann eine Episodenfreigabe nicht mehr irreführend angefordert werden, solange ein angelegter Interview-Block unvollständig ist.

### Datenbank- und Speichertransparenz

Im Datenbankbereich wurde der Status der isolierten Produktionsumgebung geladen. Die Anwendung zeigte **SQLite (lokal, aktiv)** sowie Datenbankdatei, Datenordner, lokale Medienablage und eine komprimierte Übersicht der gespeicherten Entitäten. Der Abschnitt zur MySQL-/MariaDB-Datenkopie erläutert sichtbar, dass eine Datenkopie die aktive PodCore-Instanz nicht automatisch umstellt.

Im Speicherbereich wurden Betriebsdaten, Medienablage und Sicherungen getrennt angezeigt. Für den lokalen Medienpfad wurde der Verbindungstest ausgeführt und mit der Rückmeldung **„Lokaler Pfad erreichbar“** bestätigt. Die nicht angebundene Option SFTP/SSH ist sichtbar deaktiviert, sodass kein technisch wirkungsloser Speicherwechsel ausgelöst werden kann.

### Staffelplan-Löschung nach Episodenlöschung

Der isolierte Ende-zu-Ende-Test durchlief eine strategische Planposition, die Erstellung einer Ideenmappe, den regulären Übergang zur Episode und die anschließende Löschung der Episode. Danach wurde die dazugehörige Staffelplan-Position erfolgreich entfernt. Damit werden neue Verwaisungen vermieden und bereits aus älteren Versionen verbliebene Planpositionen können rückwirkend bereinigt werden.

## Prüfdaten und Bereinigung

Die Tests verwendeten einen temporären, isolierten Datenordner außerhalb des Repositorys. Dieser enthielt ausschließlich Testkonten, Testpartner, Testfragen, eine Testidee, eine Testfolge und eine Testplanposition. Er ist nicht Teil des Git-Repositorys oder des Release-ZIP-Pakets.

## Build-Nachweis

Nach Abschluss der Versions- und Dokumentationspflege wurde der vollständige Produktions-Build mit `pnpm run build` erfolgreich ausgeführt. Der Client-TypeScript-Check, das Vite-Bundle, der Server-TypeScript-Check und die Synchronisierung der öffentlichen Client-Dateien nach `server/dist/public` wurden ohne Fehler abgeschlossen. Anschließend meldete ein frisch gestarteter isolierter Produktionsserver über `/api/health` die Version **2.14.9**. Der reproduzierbare Ende-zu-Ende-Test bestätigte erneut die aktive SQLite-Laufzeit, den lokalen Medienpfad, Partnerfragen-Sortierung, Fragenfreigabe, manuelle Episode und die Staffelplan-Löschung. Damit ist der getestete Stand für die Release-Veröffentlichung freigegeben.
