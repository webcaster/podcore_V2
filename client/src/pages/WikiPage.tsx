import React, { useState } from 'react';
import {
  LayoutDashboard, Package, CheckCircle, Zap, BookOpen, Search, ChevronRight, ChevronDown, 
  Settings, Users, Info, ArrowRight, Shield, Database, Folder, Globe, AlertCircle, Calendar,
  FileEdit, MessageSquare, Cpu, Download, FileText
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
    id: 'general',
    label: 'Allgemein',
    icon: <LayoutDashboard size={16} />,
    color: 'text-accent-blue',
    articles: [
      {
        id: 'getting-started',
        title: 'Erste Schritte',
        summary: 'Einführung in PodCore und Übersicht über die Benutzeroberfläche.',
        icon: <Zap size={18} />,
        tags: ['einführung', 'grundlagen', 'ui'],
        content: [
          { heading: 'Willkommen bei PodCore', text: 'PodCore ist Ihre zentrale Plattform für Podcast-Management. Von der ersten Idee bis zur finalen Veröffentlichung unterstützt Sie PodCore in jedem Schritt.' },
          { heading: 'Dashboard', text: 'Ihr Startpunkt mit Statistiken, aktuellen Episoden und Schnellzugriffen.' },
          { heading: 'Navigation', text: 'Nutzen Sie die Seitenleiste, um zwischen Episoden, RedaktionsHub, Sponsoren und Medienbibliothek zu wechseln.' }
        ]
      }
    ]
  },
  {
    id: 'editor',
    label: 'Episoden-Editor',
    icon: <FileEdit size={16} />,
    color: 'text-accent-purple',
    articles: [
      {
        id: 'editor-features',
        title: 'Editor Funktionen',
        summary: 'Details zum neuen Workflow-optimierten Editor.',
        icon: <Zap size={18} />,
        tags: ['editor', 'workflow', 'v2.14.0'],
        content: [
          { heading: 'Inline-Editing', text: 'Bearbeiten Sie Metadaten direkt in der Ansicht. Änderungen werden automatisch nach 2 Sekunden Inaktivität gespeichert.' },
          { heading: 'Zuklappbare Sektionen', text: 'Medien- und Audioquellen können nun platzsparend zugeklappt werden.' },
          { heading: 'Vorschau-Tab', text: 'Die Live-Vorschau befindet sich jetzt in einem eigenen Tab für volle Breite und bessere Übersicht.' },
          { heading: 'Shortcuts', text: 'Nutzen Sie Strg+N im Dashboard für neue Episoden oder Strg+Z für Undo im Editor.' }
        ]
      }
    ]
  },
  {
    id: 'collaboration',
    label: 'Zusammenarbeit',
    icon: <Users size={16} />,
    color: 'text-accent-cyan',
    articles: [
      {
        id: 'feedback-system',
        title: 'Feedback & Versionen',
        summary: 'Wie Sie im Team zusammenarbeiten und Änderungen verfolgen.',
        icon: <MessageSquare size={18} />,
        tags: ['team', 'kommentare', 'versionen'],
        content: [
          { heading: 'Kommentare', text: 'Fügen Sie feldbezogene Kommentare hinzu und nutzen Sie @Mentions, um Teammitglieder zu benachrichtigen.' },
          { heading: 'Änderungsverlauf', text: 'Verfolgen Sie jede Änderung im Audit-Log und nutzen Sie den visuellen Diff-Vergleich.' },
          { heading: 'Rollback', text: 'Stellen Sie bei Bedarf jederzeit eine frühere Version Ihrer Episode wieder her.' }
        ]
      }
    ]
  },
  {
    id: 'automation',
    label: 'Automatisierung',
    icon: <Zap size={16} />,
    color: 'text-accent-amber',
    articles: [
      {
        id: 'smart-features',
        title: 'Intelligente Funktionen',
        summary: 'Datenbasierte Automatisierungen für effizienteres Arbeiten.',
        icon: <Cpu size={18} />,
        tags: ['ki', 'automatisierung', 'audio'],
        content: [
          { heading: 'Audio-Zeitstempel', text: 'Automatisches Auslesen von Kapitelmarken aus MP3/WAV-Dateien zur Zuordnung von Interviewfragen.' },
          { heading: 'Sponsoring-Matchmaking', text: 'KI-gestützte Vorschläge für passende Sponsoren basierend auf Episoden-Inhalten.' }
        ]
      }
    ]
  },
  {
    id: 'exports',
    label: 'Exporte',
    icon: <Download size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'pdf-exports',
        title: 'PDF & Dokumente',
        summary: 'Alles über den Export von Dokumenten.',
        icon: <FileText size={18} />,
        tags: ['pdf', 'export', 'buchungen'],
        content: [
          { heading: 'Buchungsbestätigungen', text: 'Exportieren Sie einzelne oder gesammelte Buchungsbestätigungen für Sponsoren.' },
          { heading: 'Layout-Manager', text: 'Passen Sie CI-Farben und Header-Designs für alle PDF-Exporte zentral an.' }
        ]
      }
    ]
  },
  {
    id: 'changelog',
    label: 'Versionshistorie',
    icon: <Package size={16} />,
    color: 'text-text-secondary',
    articles: [
      {
        id: 'v2-14-0',
        title: 'v2.14.0 - Das Workflow-Update',
        summary: 'Konsolidiertes Update mit Fokus auf Editor-Workflow, Kollaboration und Automatisierung.',
        icon: <Package size={18} />,
        tags: ['major', 'workflow', 'v2.14.0'],
        content: [
          { heading: 'Highlights', text: 'Inline-Editing, Auto-Save, Echtzeit-Synchronisation, Audio-Zeitstempel und neues Benachrichtigungscenter.' },
          { heading: 'Fixes', text: 'Behebung der PDF-Export-Routen und Korrektur der Buchungs-Datenpersistenz.' }
        ]
      },
      {
        id: 'v2-12-13',
        title: 'v2.12.13 - Stabilität & Sponsoring',
        summary: 'Stabilisierung des Sponsoring-Systems und PDF-Layout-Optimierungen.',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'pdf', 'v2.12.13'],
        content: [
          { heading: 'Features', text: 'PDF-Layout-Uebergabe, Angebotsnummern-Einstellungen und neue Rollen-Berechtigungen.' }
        ]
      }
    ]
  }
];

export default function WikiPage() {
  const [activeTab, setActiveTab] = useState('general');
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
