import React from 'react';
import { ExternalLink, Mail, MapPin, User, Globe, Shield, Link2, Copyright } from 'lucide-react';

export default function ImpressumPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* Header with Logo */}
      <div className="card flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <a href="https://www.medien-der-sinne.de" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <img
            src="https://www.medien-der-sinne.de/fileadmin/MDS_Logos/Logo_V1_medienDerSinne_OhneURL.png"
            alt="Maximilian Hartwich – Medien der Sinne"
            className="h-24 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/logo-medien-der-sinne.png'; }}
          />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Impressum</h1>
          <p className="text-text-secondary mt-1">Angaben gemäß § 5 DDG</p>
          <a
            href="https://medien-der-sinne.de"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent-orange hover:text-accent-orange/80 transition-colors text-sm mt-2"
          >
            <Globe size={14} />
            medien-der-sinne.de
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Anbieter */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <User size={16} className="text-accent-purple" />
          Anbieter
        </h2>
        <div className="text-text-secondary text-sm space-y-1">
          <p className="font-medium text-text-primary">Maximilian Hartwich – Medien der Sinne</p>
          <div className="flex items-start gap-2 mt-2">
            <MapPin size={14} className="text-text-muted flex-shrink-0 mt-0.5" />
            <div>
              <p>Buchenstraße 19</p>
              <p>86356 Neusäß</p>
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border pt-4 space-y-2 text-sm">
          <p className="text-text-muted font-medium uppercase text-xs tracking-wide">Vertreten durch</p>
          <p className="text-text-secondary">Maximilian Hartwich</p>
        </div>

        <div className="border-t border-surface-border pt-4 space-y-2 text-sm">
          <p className="text-text-muted font-medium uppercase text-xs tracking-wide">Kontakt</p>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-text-muted" />
            <a href="mailto:webmaster@medien-der-sinne.de" className="text-accent-purple hover:underline">
              webmaster@medien-der-sinne.de
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-text-muted" />
            <a href="https://medien-der-sinne.de" target="_blank" rel="noopener noreferrer" className="text-accent-purple hover:underline flex items-center gap-1">
              https://medien-der-sinne.de <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="border-t border-surface-border pt-4 space-y-2 text-sm">
          <p className="text-text-muted font-medium uppercase text-xs tracking-wide">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</p>
          <p className="text-text-secondary">Maximilian Hartwich</p>
          <p className="text-text-muted">Buchenstraße 19, 86356 Neusäß</p>
        </div>
      </div>

      {/* Haftungsausschluss */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Shield size={16} className="text-accent-blue" />
          Haftungsausschluss
        </h2>

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <div>
            <h3 className="font-semibold text-text-primary mb-2">Haftung für Inhalte</h3>
            <p>
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit
              und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir
              gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
              Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
              gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung
              ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
              Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary mb-2">Haftung für Links</h3>
            <p>
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss
              haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte
              der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
              Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche
              Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
              zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </div>
        </div>
      </div>

      {/* Urheberrecht */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Copyright size={16} className="text-accent-green" />
          Urheberrecht
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
          Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
          Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter
          beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
          Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden
          von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
        </p>
      </div>

      {/* Datenschutz */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Link2 size={16} className="text-accent-cyan" />
          Datenschutz
        </h2>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            Die Nutzung dieser Anwendung ist ohne Angabe personenbezogener Daten möglich. Soweit personenbezogene
            Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit
            möglich, stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht
            an Dritte weitergegeben.
          </p>
          <p>
            Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail)
            Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist
            nicht möglich.
          </p>
          <p>
            Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte zur
            Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit
            ausdrücklich widersprochen. Die Betreiber behalten sich ausdrücklich rechtliche Schritte im Falle
            der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-Mails, vor.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-text-muted text-xs pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <a href="https://www.medien-der-sinne.de" target="_blank" rel="noopener noreferrer">
            <img
              src="https://www.medien-der-sinne.de/fileadmin/MDS_Logos/Logo_V1_medienDerSinne_OhneURL.png"
              alt="Medien der Sinne"
              className="h-6 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity"
              onError={(e) => { (e.target as HTMLImageElement).src = '/assets/logo-medien-der-sinne.png'; }}
            />
          </a>
        </div>
        <p>
          © {currentYear} Maximilian Hartwich – Medien der Sinne ·{' '}
          <a href="https://medien-der-sinne.de" target="_blank" rel="noopener noreferrer" className="hover:text-accent-orange transition-colors">
            medien-der-sinne.de
          </a>
        </p>
        <p className="mt-1">PodCore ist eine interne Anwendung und nicht für die Öffentlichkeit bestimmt.</p>
      </div>
    </div>
  );
}
