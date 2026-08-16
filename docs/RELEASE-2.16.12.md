# PodCore v2.16.12 – Hotfix für Sponsor-Detailseiten

Version **2.16.12** behebt einen Client-Laufzeitfehler, durch den beim Öffnen einer Sponsor-Detailseite eine schwarze Ansicht entstehen konnte.

## Fehlerbehebung

Die Sponsor-Detailansicht verarbeitet jetzt Listenfelder aus älteren und aktuellen Datensätzen fehlertolerant. Kundeninteressen, Themen-Tags und bevorzugte Formate werden unabhängig davon sicher normalisiert, ob sie als JSON-Liste, bereits aufgelöstes Array oder historischer kommagetrennter Text vorliegen.

Auch Antworten der Sponsoring-V2-Endpunkte werden vor der Darstellung als Listen abgesichert. Unvollständige oder anders verpackte Daten können damit keinen Render-Abbruch der Detailseite mehr auslösen.

## Prüfung

Die Client- und Server-Typprüfung sowie der vollständige Produktions-Build wurden erfolgreich ausgeführt.
