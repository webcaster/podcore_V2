# PodCore 2.16.42 – Tutorial-Import und Klickführung

## Anlass

Dieses Patch-Update behebt zwei Probleme beim Einsatz importierter Tutorial-Studio-Projekte: größere eingebettete Screenshots konnten beim App-Import gekürzt werden, und frei formulierte Zielnamen führten nicht zuverlässig zur Erkennung realer Navigationsklicks.

## Korrekturen

| Bereich | Änderung |
|---|---|
| Screenshot-Import | Eingebettete Screenshot-Daten werden bis zu **8 MiB pro Bild** unverändert gespeichert. Zuvor konnte die lokale Offline-Kopie bei großen Data-URLs auf eine zu kleine Länge begrenzt werden. |
| Menü-Klickführung | Das Erste-Schritte-Tutorial verwendet nun die tatsächlich vorhandenen, stabilen Tutorialkennungen der PodCore-Navigation. Klicks auf Podcast-Verwaltung, Episoden, RedaktionsHub, Media Library, Freigabe-Center, Redaktionskalender und Einstellungen werden in der Führung erkannt. |
| Qualitätskontrolle | Der Tab **Qualitätskontrolle** in der Media Library besitzt die stabile Kennung `media-tab-quality` und kann damit als echter Tutorialschritt hervorgehoben und angeklickt werden. |
| Importkompatibilität | Die Erste-Schritte-JSON enthält eine Rollenfreigabe für beide in PodCore vorhandenen Importwege: Endnutzerimport und Entwicklerverwaltung. |

## Validierung

Der Release wurde mit synchronen Versionsdateien, Client- und Server-Build, einem Endnutzer-Importtest mit neun gespeicherten Screenshots und 28 Markierungen sowie einem Laufzeittest der acht Hauptnavigationselemente und des Qualitätskontroll-Tabs geprüft.
