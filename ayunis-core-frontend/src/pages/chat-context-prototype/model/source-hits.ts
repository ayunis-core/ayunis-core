import type { SourceHit } from '@/pages/chat-context-prototype/model/source-hit';

export const SOURCE_HITS: Record<string, SourceHit> = {
  'hit-presse-vorlage-2': {
    id: 'hit-presse-vorlage-2',
    kind: 'document',
    title: 'Musterpressemitteilung.pdf',
    location: 'Seite 2',
    page: 2,
    pageCount: 3,
    heading: 'Rückfragen und Freigabe',
    passage:
      'Jede Pressemitteilung schließt mit dem Rückfragehinweis der Pressestelle. Die Freigabe erfolgt durch die Amtsleitung.',
  },
  'hit-buergerbuero': {
    id: 'hit-buergerbuero',
    kind: 'document',
    title: 'Beschluss Bürgerbüro.pdf',
    location: 'Seite 2',
    page: 2,
    pageCount: 6,
    heading: 'Beschluss des Hauptausschusses',
    passage:
      'Der Hauptausschuss beschließt die Einrichtung des Bürgerbüros in der Marktstraße 12 mit Öffnung zum 15. September.',
  },
  'hit-oeffnungszeiten': {
    id: 'hit-oeffnungszeiten',
    kind: 'document',
    title: 'Beschluss Bürgerbüro.pdf',
    location: 'Seite 4',
    page: 4,
    pageCount: 6,
    heading: 'Öffnungszeiten',
    passage:
      'Die Öffnungszeiten werden auf montags bis freitags 8 bis 16 Uhr festgelegt, donnerstags bis 18 Uhr.',
  },
  'hit-barrierefreiheit': {
    id: 'hit-barrierefreiheit',
    kind: 'web',
    title: 'Barrierefreie Verwaltungsgebäude — Leitfaden',
    siteName: 'bmi.bund.de',
    url: 'https://www.bmi.bund.de/',
    retrievedAt: 'Abgerufen heute',
    passage:
      'Verwaltungsgebäude sollen stufenlos erreichbar sein; Leitsysteme in einfacher Sprache erleichtern die Orientierung.',
  },
  'doc-stellplatzsatzung': {
    id: 'doc-stellplatzsatzung',
    kind: 'document',
    title: 'Stellplatzsatzung 2014.pdf',
    location: 'Seite 4',
    page: 4,
    pageCount: 12,
    heading: '§ 3 Nachweis von Stellplätzen',
    passage:
      'Für Wohnungen mit nicht mehr als 50 m² Wohnfläche ist ein Stellplatz je Wohnung nachzuweisen.',
  },
  'doc-gebuehrensatzung': {
    id: 'doc-gebuehrensatzung',
    kind: 'document',
    title: 'Verwaltungsgebührensatzung.pdf',
    location: 'Seite 2',
    page: 2,
    pageCount: 18,
    heading: 'Gebührentarif',
    passage:
      'Für Auskünfte aus dem Melderegister wird eine Gebühr von 5 Euro je Auskunft erhoben.',
  },
  'doc-dienstanweisung': {
    id: 'doc-dienstanweisung',
    kind: 'document',
    title: 'Dienstanweisung Öffnungszeiten.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 4,
    heading: 'Servicezeiten der Ämter',
    passage:
      'Publikumsverkehr findet montags bis freitags statt; abweichende Zeiten sind der Amtsleitung anzuzeigen.',
  },
  'doc-protokoll-ha': {
    id: 'doc-protokoll-ha',
    kind: 'document',
    title: 'Protokoll Hauptausschuss 12.06.2026.pdf',
    location: 'Seite 7',
    page: 7,
    pageCount: 14,
    heading: 'TOP 5 — Bürgerbüro',
    passage:
      'Der Ausschuss folgt der Verwaltungsvorlage und beschließt die Einrichtung des Bürgerbüros einstimmig.',
  },
  'doc-leitfaden': {
    id: 'doc-leitfaden',
    kind: 'document',
    title: 'Leitfaden Pressearbeit.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 24,
    heading: 'Grundsätze der Pressearbeit',
    passage:
      'Mitteilungen der Verwaltung sind sachlich, überprüfbar und in verständlicher Sprache zu formulieren.',
  },
  'doc-eroeffnung-2024': {
    id: 'doc-eroeffnung-2024',
    kind: 'document',
    title: 'PM Eröffnung Stadtbibliothek 2024.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 2,
    heading: 'Stadtbibliothek eröffnet im Bürgerzentrum',
    passage:
      'Die Stadtbibliothek zieht in das Bürgerzentrum und öffnet dort ab dem 3. Juni mit erweiterten Zeiten.',
  },
  'doc-sprachleitfaden': {
    id: 'doc-sprachleitfaden',
    kind: 'document',
    title: 'Einfache Sprache — Handreichung.pdf',
    location: 'Seite 3',
    page: 3,
    pageCount: 12,
    heading: 'Sätze kürzen',
    passage:
      'Ein Satz enthält einen Gedanken. Fachbegriffe werden beim ersten Auftreten erklärt.',
  },
  'hit-presse-vorlage': {
    id: 'hit-presse-vorlage',
    kind: 'document',
    title: 'Musterpressemitteilung.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 3,
    heading: 'Aufbau einer Pressemitteilung',
    passage:
      'Die Kernbotschaft steht im ersten Absatz. Öffnungszeiten, Erreichbarkeit und Barrierefreiheit folgen, der Rückfragehinweis schließt den Text ab.',
  },
  'hit-satzung': {
    id: 'hit-satzung',
    kind: 'document',
    title: 'Stellplatzsatzung.pdf',
    location: 'Seite 4, § 3 Absatz 2',
    page: 4,
    pageCount: 12,
    heading: '§ 3 Nachweis von Stellplätzen',
    passage:
      '(2) Für Wohnungen mit nicht mehr als 50 m² Wohnfläche ist ein Stellplatz je Wohnung nachzuweisen. Für größere Wohnungen sind 1,5 Stellplätze je Wohnung nachzuweisen.',
  },
  'hit-verkehrsplan': {
    id: 'hit-verkehrsplan',
    kind: 'document',
    title: 'Verkehrsentwicklungsplan 2024.pdf',
    location: 'Seite 17',
    page: 17,
    pageCount: 42,
    heading: '4.2 Entwicklung der Haushaltsmotorisierung',
    passage:
      'Im Innenstadtbereich ist der Anteil autofreier Haushalte zwischen 2018 und 2024 von 22 auf 31 Prozent gestiegen.',
  },
  'hit-baunvo': {
    id: 'hit-baunvo',
    kind: 'web',
    title: 'BauNVO § 12 Stellplätze und Garagen',
    siteName: 'gesetze-im-internet.de',
    url: 'https://www.gesetze-im-internet.de/baunvo/__12.html',
    retrievedAt: 'Abgerufen heute',
    passage:
      'Stellplätze und Garagen sind in allen Baugebieten zulässig, soweit sich aus den Absätzen 2 bis 6 nichts anderes ergibt.',
  },
};
