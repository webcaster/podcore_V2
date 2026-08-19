# Tutorial Studio 1.0.2 – Auslieferung

Tutorial Studio 1.0.2 ist eine eigenständige Desktop-Anwendung für Windows und macOS. Sie erstellt Schritt-für-Schritt-Tutorials für Software und Webanwendungen, verwaltet mehrere lokale Projekte und exportiert Endnutzer-Handbücher als individualisierte PDF-Dateien.

## Downloadpakete

| Plattform | Paket | Start |
| --- | --- | --- |
| Windows x64 | `Tutorial-Studio-1.0.2-Windows-portable.zip` | ZIP vollständig entpacken und `Tutorial Studio.exe` starten |
| macOS x64 | `Tutorial-Studio-1.0.2-x64.zip` | ZIP entpacken und `Tutorial Studio.app` nach `Programme` verschieben |
| Quellcode | `Tutorial-Studio-1.0.2-Quellcode.zip` | `pnpm install` und `pnpm dev` im Ordner `tutorial-studio` ausführen |

## Prüfsummen

| Paket | SHA-256 |
| --- | --- |
| Windows-portabel | `290200afd19670947520953fdfb7717ccd299c2342de7e77311a8326b4d92096` |
| macOS-ZIP | `1594ad8923264ee43d9792d7b6483307777dbb73e3fd8d2332ee8aae273d7106` |
| Quellcode | `d4f204e460a9e611b0701bc419f66c1e208e9d7d58a186a11b650bfaf3099870` |

## Wichtige Hinweise

Die ausgelieferten Windows- und macOS-Pakete sind nicht signiert. Windows kann beim ersten Start eine Schutzmeldung anzeigen; in diesem Fall sollte die Datei nur dann geöffnet werden, wenn sie aus diesem bestätigten Downloadpaket stammt. macOS kann beim ersten Öffnen eine Gatekeeper-Nachfrage zeigen; die Anwendung kann über Rechtsklick → **Öffnen** freigegeben werden.

Die GitHub-Actions-Release-Automation erzeugt auf nativen Windows- und macOS-Runnern die späteren Installerformate. Für eine öffentliche Veröffentlichung sollten Signierung für Windows sowie Apple-Code-Signing und Notarisierung ergänzt werden.

## Neu in 1.0.2

| Bereich | Ergänzung |
| --- | --- |
| Lokales Archiv | Mehrere Projekte anlegen, durchsuchen, öffnen, duplizieren, archivieren und wiederherstellen |
| PDF-Layout | Eigenes Logo, Titel, Untertitel, Footertext und Dateiname pro Tutorial-Projekt |
| PDF-Handbuch | Screenshots, eingebrannte Markierungen, Erklärungen, Kopf- und Fußzeilen sowie Seitenzahlen |
| Austausch | Generischer Projekt-Export und PodCore-kompatibler Tutorial-Export |
