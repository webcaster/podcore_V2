import React, { useState } from 'react';
import {
  LayoutDashboard, Package, CheckCircle, Zap, BookOpen, Search, ChevronRight, ChevronDown, 
  Settings, Users, Info, ArrowRight, Shield, Database, Folder, Globe, AlertCircle, Calendar
} from 'lucide-react';

interface WikiArticle {
  id: string;
  title: string;
  summary: string;
  content: any[];
  tags: string[];
  icon: React.ReactNode;
}

interface WikiCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  articles: WikiArticle[];
}

const wikiData: WikiCategory[] = [
  {
    id: 'changelog',
    label: 'Versionshistorie',
    icon: <Package size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'v2-12-13',
        title: 'v2.12.13 - Sponsoring-System Final',
        summary: 'Vollständige Stabilisierung des Sponsoring-Systems: Accept-Fix, PDF-Layout-Übergabe, Angebotsnummern-Einstellungen im Admin und neue Rollen-Berechtigungen.',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'pdf', 'admin', 'permissions', 'v2.12.13'],
        content: [
          { heading: 'Accept-Fehler behoben', text: 'Der Fehler „Unexpected token < ... is not valid JSON“ beim Annehmen eines Angebots wurde durch Korrektur eines fehlerhaften SQL-Bindings behoben. Buchungen werden nun zuverlässig angelegt.' },
          { heading: 'PDF-Layout-Übergabe', text: 'Das ausgewählte Layout wird nun korrekt beim PDF-Export übergeben. CI-Farben, Sektionen und Schriften aus dem konfigurierten Layout werden im Angebots-PDF vollständig übernommen.' },
          { heading: 'Angebotsnummern-Einstellungen', text: 'Im Admin-Bereich (Einstellungen → App) kann das Schema für automatische Angebotsnummern konfiguriert werden: Präfix, Trennzeichen, Jahreszahl, Stellen und Startnummer.' },
          { heading: 'Neue Rollen-Berechtigungen', text: 'Zwei neue Berechtigungen wurden eingeführt: „Angebote ansehen“ (canViewSponsorOffers) und „Angebote erstellen & verwalten“ (canManageSponsorOffers). Alle bestehenden Rollen wurden entsprechend angepasst.' },
          { heading: 'Sponsor-Adresse im PDF', text: 'Name, Firma und Anschrift des Sponsors werden nun im Angebots-PDF angezeigt (steuerbar über die Layout-Sektionen).' },
          { heading: 'Kein Gesamtpreis bei Optionen', text: 'Bei Angeboten mit mehreren Varianten wird kein Gesamtpreis mehr am Ende angezeigt, da jede Option ihren eigenen Preis ausweist.' }
        ]
      },
      {
        id: 'v2-12-12-p2-4',
        title: 'v2.12.12 - Patch 2.4: PDF & Layout Final',
        summary: 'Finalisierung der PDF-Layout-Engine, Vorschau-Optimierung und automatische Angebotsnummerierung.',
        icon: <Package size={18} />,
        tags: ['patch', 'pdf', 'layout', 'branding', 'v2.12.12-p2.4'],
        content: [
          { heading: 'PDF-Layout-Manager', text: 'Korrektur der Sektions-Auswahl für alle Export-Typen. Sektionen können nun präzise je Dokumententyp konfiguriert werden.' },
          { heading: 'Vorschau-Optimierung', text: 'Export-Typ spezifische Mock-Daten für eine realitätsnahe PDF-Vorschau direkt im Manager.' },
          { heading: 'Sponsoring-Fixes', text: 'Reparatur der PDF-Export-Route und Implementierung der automatischen Angebotsnummerierung (ANG-YYYY-NNN).' },
          { heading: 'CI-Branding & Clipping', text: 'Konsequente Übernahme der CI-Farben in allen PDF-Tabellen und Summen-Boxen. Behebung von Text-Clipping in Summen.' }
        ]
      }
    ]
  }
];

export default function WikiPage() {
  const [activeTab, setActiveTab] = useState('changelog');
  const [search, setSearch] = useState('');

  return (
    <div className="page-container p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <BookOpen className="text-accent-purple" />
            PodCore Wiki
          </h1>
          <p className="text-text-secondary mt-1">Hilfe, Dokumentation und Versionshistorie</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          {wikiData.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                activeTab === cat.id ? 'bg-accent-purple/10 border border-accent-purple/30 text-accent-purple' : 'hover:bg-gray-800 text-text-secondary'
              }`}
            >
              {cat.icon}
              <span className="font-medium">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          {wikiData.find(c => c.id === activeTab)?.articles.map(article => (
            <div key={article.id} className="card p-6 border-gray-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-800 rounded-lg text-accent-purple">{article.icon}</div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{article.title}</h2>
                  <div className="flex gap-2 mt-1">
                    {article.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-800 text-text-muted rounded-full uppercase tracking-wider border border-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-text-secondary mb-6">{article.summary}</p>
              <div className="space-y-6">
                {article.content.map((section: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    {section.heading && <h3 className="text-lg font-semibold text-text-primary">{section.heading}</h3>}
                    {section.text && <p className="text-text-secondary">{section.text}</p>}
                    {section.list && (
                      <ul className="list-disc list-inside space-y-1 text-text-secondary ml-2">
                        {section.list.map((item: string, i: number) => <li key={i}>{item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
