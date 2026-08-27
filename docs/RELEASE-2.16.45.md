# PodCore v2.16.45 – Entwickler-Modus ausschließlich per Entwicklerlizenz

Version **2.16.45** ersetzt den rein lokalen Entwickler-Schalter durch eine gesonderte, installationsgebundene Entwicklerlizenz. Der vertraute Sieben-Klick-Handshake bleibt nur der Weg zum versteckten Eingabebereich; er ist **keine Freigabe**. Erst ein gültiger Entwicklercode aus dem separaten WordPress-Lizenzplugin schaltet die geschützten Tutorial-Entwicklungsfunktionen frei.

## Schutzkonzept

| Ebene | Umsetzung |
|---|---|
| Versteckte Bedienung | Der Bereich erscheint erst nach dem bestehenden Sieben-Klick-Handshake auf der Versionsanzeige. |
| App-Zugang | Nur echte PodCore-Administratoren können einen Entwicklercode aktivieren, prüfen oder lokal schließen. |
| Getrennte Lizenzart | Entwicklercodes beginnen mit `PC-DEV-` und werden nicht über die normale Kundenlizenz aktiviert. |
| Installationsbindung | WordPress erzeugt für jede Aktivierung einen Token, der an die lokale Installationskennung gebunden ist. |
| Serverseitige Durchsetzung | Tutorial-Erstellung, -Bearbeitung, -Import und -Export prüfen weiterhin Administratorstatus, lokales Entwicklerflag und gültige Entwicklerlizenz. |
| Widerruf | Pausierte oder widerrufene Codes lassen sich nicht mehr validieren. PodCore prüft spätestens nach sechs Stunden erneut und deaktiviert den Entwickler-Modus für alle lokalen Benutzer, falls die Prüfung fehlschlägt. |

## Aktivierung in PodCore

1. Klicke als Administrator siebenmal auf die Versionsanzeige in der Seitenleiste.
2. Öffne **Einstellungen → Profil**. Der geschützte Entwicklerbereich wird nur für diese Sitzung sichtbar.
3. Gib den zuvor in WordPress erzeugten Code `PC-DEV-…` ein und wähle **„Entwicklerzugang freischalten“**.
4. PodCore speichert nur die für die Installation nötigen Aktivierungsdaten; die Oberfläche zeigt den Code anschließend nur maskiert an.
5. Über **„Lizenz prüfen“** wird der Status sofort erneut von WordPress abgerufen. **„Zugang schließen“** beendet den lokalen Entwicklerzugang auch bei fehlender Netzwerkverbindung.

## WordPress-Lizenzplugin v1.4.0

Das getrennte WordPress-Paket ergänzt unter **WooCommerce → PodCore-Entwicklercodes** eine eigene Verwaltung. Dort kann ein Administrator Code, Entwicklerbezeichnung, E-Mail, Laufzeit und Installationslimit festlegen. Aktive Codes lassen sich pausieren oder widerrufen; ein Widerruf beendet zugleich alle noch aktiven Entwicklerinstallationen. Einzelne Installationen können über **„Zugänge widerrufen“** deaktiviert werden, ohne den Code selbst zu löschen.

Der WordPress-Quellcode und das Pluginpaket bleiben bewusst **außerhalb des App-GitHub-Repositories**. Nur die PodCore-App v2.16.45 wird auf GitHub veröffentlicht.

## Prüfung

Der Entwicklerlizenz-Rauchtest bestätigte fünfzehn Sicherheits- und Integrationsregeln, darunter die Trennung normaler Lizenzrouten, die Administratorbeschränkung, die entfernte lokale Checkbox, die Tutorialprüfung sowie die WordPress-Routen und Tabellen. Der vollständige Client- und Server-Build war erfolgreich. Alle PHP-Dateien des WordPress-Plugins v1.4.0 wurden mit PHP 8.3 auf Syntaxfehler geprüft.
