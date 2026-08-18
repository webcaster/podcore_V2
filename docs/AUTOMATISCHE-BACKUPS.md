# Automatische Backups in PodCore

PodCore arbeitet lokal und offlinefähig. Die automatische Sicherung ergänzt die manuelle Vollsicherung, ersetzt aber keine bewusste Aufbewahrung einer Kopie auf einem getrennten Laufwerk oder in einem eigenen Cloud-Ordner.

## 1. In-App-Sicherung aktivieren und einstellen

Öffne **Einstellungen → Speicher & Backup → Automatische lokale Sicherung**. Aktiviere die In-App-Sicherung, wähle ein Intervall und die Anzahl der aufzubewahrenden automatischen Sicherungen. Ein Klick auf **„Jetzt sichern“** prüft den Ablauf unmittelbar.

| Einstellung | Bedeutung |
|---|---|
| Intervall | Wie oft PodCore bei laufender App eine fällige Sicherung erstellen darf. |
| Aufbewahrung | Anzahl automatischer Dateien, die behalten werden. Ältere automatische Dateien werden nach erfolgreichem Lauf entfernt. |
| Dateien einbeziehen | Bindet vorhandene Medien und Uploads innerhalb der bestehenden Sicherungsgrenzen ein. |

Die In-App-Sicherung prüft beim Serverstart und anschließend alle 15 Minuten, ob der gewählte Zeitpunkt fällig ist. Sie kann nur laufen, solange PodCore geöffnet ist.

## 2. Systemplanung für geschlossene App

Für eine tägliche Sicherung bei geschlossener App enthält das Endnutzerpaket zwei Einrichtungsdateien. Sie verwenden dieselbe Prüfsumme, denselben Sicherungsordner und dieselbe Aufbewahrungsregel wie PodCore selbst.

| Betriebssystem | Einmalige Einrichtung | Standardzeit |
|---|---|---|
| Windows | `install-automatic-backup-windows.bat` doppelklicken; bei Rückfrage mit passenden Rechten bestätigen | täglich 20:00 Uhr |
| macOS / Linux | Im PodCore-Ordner `chmod +x install-automatic-backup-unix.sh run-automatic-backup-unix.sh` und danach `./install-automatic-backup-unix.sh` ausführen | täglich 20:00 Uhr |

Die Ausführung selbst erfolgt über `run-automatic-backup-windows.bat` beziehungsweise `run-automatic-backup-unix.sh`. Windows führt die Aufgabe unter **PodCore-Automatisches-Backup**. Unter macOS/Linux wird ein Cron-Eintrag angelegt. Wird PodCore in einen anderen Ordner verschoben, sollte die Systemplanung danach erneut eingerichtet werden.

## 3. Wiederherstellung prüfen

Öffne **Einstellungen → Speicher & Backup** und importiere eine Sicherungsdatei zunächst über die Vorschau. PodCore prüft dabei die SHA-256-Prüfsumme. Erst danach wählst du bewusst den Importmodus. Bewahre vor einem vollständigen Ersetzen immer zusätzlich eine manuelle Sicherung auf.

> Für wichtige Produktionen empfiehlt sich die 3-2-1-Regel: drei Kopien, auf mindestens zwei unterschiedlichen Speichern, davon eine Kopie getrennt vom Arbeitsgerät.
