# Contact Form 7: Kontaktformular mit Datenschutz-Zustimmung

Diese Vorlage ist für die PodCore-Kontaktseite gedacht. Sie verwendet Contact Form 7 und enthält eine verpflichtende Zustimmung zur Verarbeitung der Anfrage. Die konkrete Rechtsgrundlage, Speicherdauer und Datenschutzerklärung müssen vor der Veröffentlichung mit den tatsächlichen Angaben des Websitebetreibers abgestimmt werden. Diese Vorlage ersetzt keine rechtliche Prüfung.

## 1. Formular-Tab

Erstelle in WordPress unter **Kontakt → Neues Formular** ein Formular und füge im Tab **Formular** folgenden Inhalt ein:

```text
<div class="podcore-cf7-grid">
  <p>
    <label for="your-name">Name <span aria-hidden="true">*</span></label>
    [text* your-name id:your-name autocomplete:name placeholder "Dein Name"]
  </p>

  <p>
    <label for="your-email">E-Mail-Adresse <span aria-hidden="true">*</span></label>
    [email* your-email id:your-email autocomplete:email placeholder "name@beispiel.de"]
  </p>

  <p>
    <label for="your-subject">Betreff</label>
    [text your-subject id:your-subject placeholder "Worum geht es?"]
  </p>

  <p>
    <label for="your-message">Nachricht <span aria-hidden="true">*</span></label>
    [textarea* your-message id:your-message rows:7 placeholder "Deine Nachricht"]
  </p>

  <p class="podcore-cf7-consent">
    [acceptance privacy-consent id:privacy-consent]
      Ich habe die <a href="/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und stimme zu, dass meine Angaben zur Bearbeitung meiner Kontaktanfrage verarbeitet werden. <span aria-hidden="true">*</span>
    [/acceptance]
  </p>

  <p>
    [submit "Nachricht senden"]
  </p>
</div>
```

Der `acceptance`-Tag ist ohne die Option `optional` verpflichtend. Dadurch kann das Formular nicht abgeschickt werden, solange die Zustimmung nicht erteilt wurde. Der Link `/datenschutz/` muss durch den echten Permalink der Datenschutzerklärung ersetzt werden.

## 2. Mail-Tab

Verwende im Tab **Mail** folgende Einstellungen. Die Absenderadresse sollte zu derselben Domain gehören wie die WordPress-Website. Ersetze die Empfängeradresse durch das tatsächliche Postfach.

| Feld | Wert |
|---|---|
| An | `kontakt@deine-domain.de` |
| Von | `PodCore Website <wordpress@deine-domain.de>` |
| Betreff | `[your-subject] – Kontaktanfrage von [your-name]` |
| Zusätzliche Header | `Reply-To: [your-name] <[your-email]>` |
| Dateianhänge | Leer lassen |
| HTML-Inhalt verwenden | Deaktiviert lassen, sofern keine HTML-Mail benötigt wird |

Für den Nachrichteninhalt:

```text
Neue Kontaktanfrage über die PodCore-Website

Name: [your-name]
E-Mail: [your-email]
Betreff: [your-subject]

Nachricht:
[your-message]

Die anfragende Person hat die Datenschutzerklärung bestätigt.

---
Diese Nachricht wurde über das Kontaktformular der Website gesendet.
```

## 3. Zusätzliche Einstellungen

Füge im Bereich **Zusätzliche Einstellungen** diese Zeile ein, damit eine fehlende Zustimmung wie eine normale Validierungsmeldung am Formular angezeigt wird:

```text
acceptance_as_validation: on
```

## 4. Einbindung auf der Kontaktseite

Speichere das Formular und kopiere anschließend den von Contact Form 7 erzeugten Shortcode, beispielsweise:

```text
[contact-form-7 id="123" title="Kontaktformular"]
```

Füge den Shortcode auf der PodCore-Kontaktseite in einen separaten **Shortcode-Block** ein. Der vorhandene HTML-Block der Datei `kontakt.html` liefert die Seitenstruktur und den Hinweisbereich; der Shortcode-Block rendert darin das funktionierende Formular.

## 5. Vor der Veröffentlichung prüfen

Passe die Empfänger- und Absenderadresse an, ersetze den Datenschutz-Link und teste die Formularbestätigung mit einem echten Testkonto. Konfiguriere außerdem den Mailversand der Website über einen zuverlässigen SMTP-Dienst, damit Nachrichten nicht an der Server-Mailfunktion scheitern. Aktiviere Speicherungserweiterungen wie Flamingo nur, wenn die zusätzliche Speicherung von Kontaktanfragen in der Datenschutzerklärung berücksichtigt ist. Ergänze bei Bedarf einen Spam-Schutz wie reCAPTCHA oder einen datensparsamen Alternativdienst.

Contact Form 7 dokumentiert den Acceptance-Tag als verpflichtende Zustimmung, sofern nicht `optional` gesetzt wird [1]. Für die Mail-Konfiguration empfiehlt Contact Form 7 eine Absenderadresse aus der Website-Domain und die Verwendung von Mail-Tags für Betreff, Antwortadresse und Nachricht [2] [3].

## Quellen

[1]: https://contactform7.com/acceptance-checkbox/ "Contact Form 7: Acceptance checkbox"
[2]: https://contactform7.com/setting-up-mail/ "Contact Form 7: Setting up mail"
[3]: https://contactform7.com/tag-syntax/ "Contact Form 7: How tags work"
