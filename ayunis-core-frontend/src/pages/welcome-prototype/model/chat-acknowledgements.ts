import type { ChatQuestion, ChatStep } from './chat-script';

const ROLE_REPLIES: ReadonlyArray<[RegExp, string]> = [
  [
    /leit/i,
    'Dann geht es oft um Überblick und Entscheidungen. Ayunis Core fasst deshalb lieber zusammen und hebt hervor, was zu entscheiden ist.',
  ],
  [
    /sachbearbeit/i,
    'Dann geht es meist um konkrete Vorgänge. Ayunis Core bleibt nah an den Vorschriften und schlägt Formulierungen vor, die Sie direkt übernehmen können.',
  ],
  [
    /bürger|service/i,
    'Dann haben Sie viel mit Menschen zu tun. Ayunis Core achtet auf klare, freundliche Sprache.',
  ],
];

const TIME_REPLIES: ReadonlyArray<[RegExp, string]> = [
  [/mail|anfrag/i, 'Antworten auf Anfragen lassen sich gut vorbereiten.'],
  [
    /text|vorlage/i,
    'Texte und Vorlagen entstehen schnell aus ein paar Stichpunkten.',
  ],
  [
    /dokument|lesen/i,
    'Lange Unterlagen fasst Ayunis Core aufs Wesentliche zusammen.',
  ],
];

const EXTRA_REPLIES: ReadonlyArray<[RegExp, string]> = [
  [/kurz|knapp/i, 'Gern, dann kommt Ayunis Core schnell auf den Punkt.'],
  [/quelle/i, 'Gern, dann nennt Ayunis Core die Grundlagen dazu.'],
  [/nein|passt/i, 'Alles klar.'],
];

function firstMatch(
  replies: ReadonlyArray<[RegExp, string]>,
  answer: string,
): string | undefined {
  return replies.find(([pattern]) => pattern.test(answer))?.[1];
}

function allMatches(
  replies: ReadonlyArray<[RegExp, string]>,
  answer: string,
): string | undefined {
  const hits = replies
    .filter(([pattern]) => pattern.test(answer))
    .map(([, reply]) => reply);
  return hits.length > 0 ? hits.join(' ') : undefined;
}

function acknowledgeQuestion(id: ChatQuestion['id'], answer: string) {
  switch (id) {
    case 'role':
      return firstMatch(ROLE_REPLIES, answer) ?? 'Danke, das hilft schon sehr.';
    case 'time':
      return allMatches(TIME_REPLIES, answer) ?? 'Danke, gut zu wissen.';
    case 'extra':
      return firstMatch(EXTRA_REPLIES, answer) ?? 'Danke, das ist notiert.';
  }
}

export function acknowledge(step: ChatStep | undefined, answer: string) {
  return step?.kind === 'question'
    ? acknowledgeQuestion(step.question.id, answer)
    : undefined;
}
