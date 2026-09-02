import type { SourceHit } from '@/pages/chat-context-prototype/model/source-hit';

const WEB_SOURCES: [string, string, string][] = [
  [
    'res-bmi',
    'bmi.bund.de',
    'Barrierefreiheit in Verwaltungsgebäuden — Leitfaden',
  ],
  ['res-difu', 'difu.de', 'Bürgerbüros: Organisation und Öffnungszeiten'],
  ['res-kgst', 'kgst.de', 'Kennzahlen zur Terminvergabe im Bürgeramt'],
  ['res-bitkom', 'bitkom.org', 'Digitale Verwaltung: Erwartungen der Bürger'],
  ['res-nrw', 'mhkbd.nrw', 'Förderprogramm Barrierefreier Umbau'],
  ['res-din', 'din.de', 'DIN 18040-1 Barrierefreies Bauen'],
  [
    'res-bfsg',
    'bfsg-gesetz.de',
    'Barrierefreiheitsstärkungsgesetz im Überblick',
  ],
  ['res-stadt-a', 'muenster.de', 'Bürgerbüro Münster: Serviceversprechen'],
  ['res-stadt-b', 'freiburg.de', 'Öffnungszeiten Bürgeramt Freiburg'],
  ['res-stadt-c', 'leipzig.de', 'Bürgerämter: Wartezeiten und Termine'],
];

const PASSAGES = [
  'Verwaltungsgebäude sollen stufenlos erreichbar sein; Leitsysteme in einfacher Sprache erleichtern die Orientierung.',
  'Kommunen mit offener Sprechstunde erreichen eine höhere Zufriedenheit als Häuser mit reiner Terminpflicht.',
  'Die durchschnittliche Bearbeitungsdauer je Anliegen liegt zwischen sieben und zwölf Minuten.',
  'Erwartet werden verlässliche Zeiten, kurze Wege und die Möglichkeit, Anliegen vorab online zu erledigen.',
  'Zuschüsse sind vor Beginn der Maßnahme zu beantragen; Eigenanteile richten sich nach der Gemeindegröße.',
];

export const RESEARCH_HITS: Record<string, SourceHit> = Object.fromEntries(
  WEB_SOURCES.map(([id, siteName, title], index) => [
    id,
    {
      id,
      kind: 'web' as const,
      title,
      siteName,
      url: `https://www.${siteName}/`,
      retrievedAt: 'Abgerufen heute',
      passage: PASSAGES[index % PASSAGES.length],
    },
  ]),
);

export const RESEARCH_HIT_IDS = WEB_SOURCES.map(([id]) => id);
