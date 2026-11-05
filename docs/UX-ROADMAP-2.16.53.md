# PodCore v2.16.53 – UX-Recherche und umgesetzte Verbesserungen

## Umgesetzte Priorität

Die Online-Recherche hat bestätigt, dass der gemeldete Formularfehler ein Fokusmanagement-Problem in der zentralen Modal-Komponente war. Viele Dialoge übergeben Inline-Callbacks. Dadurch wurde der Fokus-Effekt bei jedem Tastaturereignis neu aufgebaut und der Fokus zum Schließen-Button zurückgegeben. v2.16.53 verwendet deshalb eine stabile Effekt-Lebensdauer und hält den jeweils aktuellen Close-Handler separat vor.

Außerdem wurden drei unmittelbar arbeitsrelevante Punkte umgesetzt. Das gespeicherte Nutzer-Theme wird beim Auth-Start erzwungen angewendet, ohne eine Theme-Event-Schleife zu erzeugen. Die Sidebar speichert die Scrollposition ihres eigenen Containers und stellt sie nach einem Routenwechsel wieder her. Tutorials können per Escape verlassen werden, besitzen semantische Schrittüberschriften und zeigen Fehler beim Speichern des Fortschritts direkt an, ohne die Führung zu schließen.

## Weitere priorisierte Empfehlungen

Die Recherche empfiehlt als nächsten Schritt serverseitige Entwürfe für Episoden- und Feed-Formulare. Ein Entwurf sollte Version, Änderungszeit, Speicherkonflikte und Wiederherstellung anzeigen. Er darf niemals automatisch veröffentlichen. Browser-Speicher ist dafür nicht erforderlich; die bestehende Server-/API-Schicht ist der passende Speicherort.

Für die Dashboard- und Redaktionsbereiche sollten Laden, erfolgreich leer, Filter ohne Treffer, Fehler und veraltete Daten klar unterschieden werden. Jeder leere Zustand sollte erklären, was hier erscheint, und eine konkrete nächste Aktion anbieten. Die vorhandene Widget-Personalisierung sollte wichtige Warnungen nicht dauerhaft ausblenden können.

Für die Podcast-Produktion empfiehlt sich danach ein rollenbasierter Zustandsautomat mit getrennten redaktionellen und technischen Checklisten. Ein späterer Veröffentlichungsgate sollte RSS-Enclosure-URL, Länge, MIME-Typ, GUID, Datumsformat, XML-Escaping und erlaubte Audioformate deterministisch prüfen. Audio-QA-Werte sollten je Ausspielprofil gespeichert werden; Podcast- und Broadcast-Ziele dürfen nicht vermischt werden.

## Quellen

[1]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines 2.2"
[2]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ "WAI-ARIA Authoring Practices: Dialog Modal"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration "MDN: History scrollRestoration"
[4]: https://m3.material.io/components/navigation-drawer/overview "Material Design: Navigation Drawer"
[5]: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html "WCAG 2.2: Focus Visible"
[6]: https://www.nngroup.com/articles/empty-state-interface-design/ "Nielsen Norman Group: Empty-State Interface Design"
[7]: https://www.nngroup.com/articles/progressive-disclosure/ "Nielsen Norman Group: Progressive Disclosure"
[8]: https://podcasters.apple.com/support/823-podcast-requirements "Apple Podcasts: Requirements"
[9]: https://podcasters.apple.com/support/893-audio-requirements "Apple Podcasts: Audio Requirements"
[10]: https://tech.ebu.ch/publications/r128 "EBU R 128 Loudness Recommendation"
