# PodCore v2.16.36 – Sichtbare Tutorialkarte über jeder Ansicht

Version **2.16.36** behebt den Fehler, bei dem beim Start eines Tutorials nur der abgedunkelte Hintergrund sichtbar blieb, während die eigentliche Tutorialkarte nicht dargestellt wurde. Der Fix wird bewusst als nachfolgende Patch-Version ausgeliefert, weil v2.16.35 zwischenzeitlich bereits die Mehrfach-Podcast-Verwaltung ergänzt hat.

## Ursache und Korrektur

Die Tutorialkarte war als fest positionierter Dialog vorgesehen, konnte jedoch durch Ebenen- und Transformationskontexte einer geöffneten App-Ansicht in einen unzuverlässigen Darstellungszustand geraten. Der Hintergrund der Tutorialüberlagerung blieb dann aktiv, die Karte war allerdings nicht sichtbar.

Die Karte wird nun über ein React-Portal direkt unter `document.body` gerendert. Sie ist damit vom Layout der jeweiligen Seite entkoppelt. Überlagerung, Zielbereich und Karte verwenden getrennte, hohe Ebenen. Position, Sichtbarkeit und Deckkraft der Karte sind zusätzlich ausdrücklich gesetzt. Der Fallback für ein unvollständiges Tutorial verwendet denselben robusten Renderweg.

## Prüfung

Ein isolierter Render-Test mit einem absichtlich transformierten App-Container zeigt die vollständige Tutorialkarte über dem abgedunkelten Hintergrund. Die Prüfung wurde in einer Desktopansicht von 1440 × 900 Pixel sowie einer mobilen Ansicht von 390 × 844 Pixel wiederholt. In beiden Ansichten blieben Titel, Beschreibung, Schließen- und Weiter-Aktion sichtbar.

Der vollständige Client- und Server-Build einschließlich Produktionssynchronisierung wurde nach der Versionsanhebung erfolgreich ausgeführt.
