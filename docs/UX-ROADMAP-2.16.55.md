# UX-Überarbeitung für PodCore v2.16.55

PodCore ist eine funktionsreiche Produktionsanwendung. Die Überarbeitung konzentriert sich deshalb nicht auf zusätzliche Module, sondern auf bessere Orientierung und eine geringere visuelle Last in häufigen Arbeitswegen. Eingebaute Funktionen wie die gruppierte Navigation, Menüsuche, Dashboard-Anpassung, Fokusmodus, Tutorials und Audioansichten bleiben bestehen.

## Recherchierte Leitlinien

Progressive Disclosure empfiehlt, im ersten Schritt nur die wichtigsten Optionen zu zeigen und spezialisierte Optionen auf klare, erwartbare Sekundärflächen zu verschieben. Das verbessert Lernbarkeit, Geschwindigkeit und Fehlerquote. Wichtig ist, dass der Übergang zur zweiten Ebene sichtbar beschriftet bleibt und nicht mehr als zwei Ebenen nötig werden. [1]

Für Formularrückmeldungen empfiehlt W3C eine kurze, verständliche Rückmeldung nahe am Feld und eine zusammenfassende Rückmeldung bei Submit-Fehlern. Fehler sollen das betroffene Feld benennen, die Korrektur erklären und direkt dorthin führen. Erfolgreiche Aktionen sollen ebenfalls bestätigt werden. [2]

Für Änderungen und Löschungen empfiehlt W3C, wichtige Aktionen prüfbar, korrigierbar oder reversibel zu machen. Das ist besonders relevant für PodCore-Daten, Papierkorb, Backup und Produktionsstatus. Nicht jeder normale Speichervorgang benötigt eine zusätzliche Bestätigung; unnötige Dialoge würden den täglichen Ablauf verlangsamen. [3]

Für die Navigation nutzt WAI-ARIA bei einer normalen Seitenleiste den Disclosure-Ansatz mit semantischen Links und Auf-/Zu-Schaltflächen. `aria-expanded`, `aria-controls` und `aria-current` kommunizieren den Zustand. Die komplexe ARIA-Menu-Rolle ist für eine normale Web-App-Seitenleiste nicht erforderlich und kann Assistenztechnik unnötig belasten. [4]

Eine Command Palette ist als zusätzliche Abkürzung sinnvoll, wenn Funktionen in Untermenüs liegen. Sie ersetzt nicht die sichtbare Navigation, sondern bietet eine fokussierte Suche mit Tastatur- und Fokusführung. [5]

## Umsetzung in PodCore

Die Sidebar bleibt in Gruppen organisiert. Oberhalb einer Unterseite zeigt eine Kontextleiste Arbeitsgruppe und aktive Seite. Dadurch erhalten tiefe Seiten Orientierung, ohne eine weitere dauerhafte Navigationsleiste einzuführen. Die vorhandene Menüsuche bleibt über Strg/⌘ + K erreichbar.

Das Dashboard zeigt Schnellaktionen nun als kurze Arbeitsschritte. Jede Aktion nennt neben dem Ziel eine kleine Folgehandlung: Entwurf anlegen, Thema festhalten, Audio oder Bild hochladen beziehungsweise Kontakt anlegen. Die individuelle Reihenfolge, Sichtbarkeit, Dichte und persönliche Begrüßung werden nicht verändert.

Karten und Seitenköpfe haben eine ruhigere Gewichtung. Der Rahmen bleibt als Gruppierung sichtbar, während Schatten, Rundung und Hoverbewegung zurückhaltender sind. Das hält aktive Bereiche unterscheidbar und reduziert Dauerbewegung. Tastaturfokus und `prefers-reduced-motion` bleiben globale Anforderungen.

## Bewusst nicht umgesetzt

Ein weiteres globales Menü, eine dritte Navigationshierarchie oder zusätzliche Pflichtschritte würden die Komplexität erhöhen. Eine vollständige Neuanordnung aller Module ohne Nutzungsdaten wäre nicht belastbar. Ebenso werden keine automatischen Aktionen eingeführt, die Episodenstatus, Sponsor- oder Produktionsdaten ohne Rückweg ändern.

Die nächste sinnvolle UX-Iteration sollte mit anonymisierten Nutzungsdaten und kurzen Aufgaben-Tests prüfen, welche Dashboard-Aktionen tatsächlich häufig verwendet werden. Erst danach sollten seltene Widgets standardmäßig ausgeblendet oder weitere Gruppen zusammengelegt werden.

## References

[1]: https://www.nngroup.com/articles/progressive-disclosure/ "Nielsen Norman Group – Progressive Disclosure"
[2]: https://www.w3.org/WAI/tutorials/forms/notifications/ "W3C WAI – User Notification"
[3]: https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-legal-financial-data.html "W3C WAI – Error Prevention"
[4]: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation-hybrid/ "W3C WAI-ARIA APG – Disclosure Navigation"
[5]: https://robdodson.me/posts/command-palettes/ "Rob Dodson – Command palettes for the web"
