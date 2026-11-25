import type { ChatQuestion, ChatStep } from './chat-script';

const ROLE_REPLIES: ReadonlyArray<[RegExp, string]> = [
  [
    /teamleit/i,
    'Als Teamleitung haben Sie viel mit Abstimmungen und Übersichten zu tun. Ayunis Core fasst deshalb lieber zusammen und hebt hervor, was entschieden werden muss.',
  ],
  [
    /fachbereich|amtsleit|leitung/i,
    'In der Leitung geht es oft um Zusammenhänge und Entscheidungsvorlagen. Ayunis Core denkt darum eher strategisch mit und bereitet Ergebnisse vorlagenfertig auf.',
  ],
  [
    /sachbearbeit/i,
    'Dann geht es meist um konkrete Vorgänge. Ayunis Core bleibt nah an den Vorschriften und schlägt Formulierungen vor, die Sie direkt übernehmen können.',
  ],
];

const TASK_HINTS: ReadonlyArray<[RegExp, string]> = [
  [
    /bauantr/i,
    'Bauanträge lassen sich gut gegen eine feste Checkliste prüfen.',
  ],
  [
    /bürger|anfrag/i,
    'Bei Bürgeranfragen hilft ein einheitlicher, verständlicher Ton.',
  ],
  [
    /stellungnahm/i,
    'Stellungnahmen lassen sich nach Themen bündeln und auswerten.',
  ],
];

const STYLE_REPLIES: ReadonlyArray<[RegExp, string]> = [
  [/kurz|knapp/i, 'Gern, dann kommt Ayunis Core schnell auf den Punkt.'],
  [
    /ausführlich/i,
    'Gern, dann erklärt Ayunis Core gründlich und nennt die Grundlagen.',
  ],
  [
    /ausgewogen/i,
    'Gut, dann kommt das Wichtigste zuerst, Details gibt es bei Bedarf.',
  ],
];

function firstMatch(
  replies: ReadonlyArray<[RegExp, string]>,
  answer: string,
): string | undefined {
  return replies.find(([pattern]) => pattern.test(answer))?.[1];
}

function acknowledgeTasks(answer: string) {
  const hints = TASK_HINTS.filter(([pattern]) => pattern.test(answer)).map(
    ([, hint]) => hint,
  );
  const lead = `Verstanden: ${answer}.`;
  return hints.length > 0 ? `${lead} ${hints.join(' ')}` : lead;
}

function acknowledgeQuestion(id: ChatQuestion['id'], answer: string) {
  switch (id) {
    case 'role':
      return (
        firstMatch(ROLE_REPLIES, answer) ??
        `Danke, „${answer}“ ist notiert. Antworten richten sich danach.`
      );
    case 'tasks':
      return acknowledgeTasks(answer);
    case 'style':
      return (
        firstMatch(STYLE_REPLIES, answer) ??
        'Gut, Ayunis Core richtet sich danach.'
      );
    case 'tools':
      return 'Gut zu wissen.';
  }
}

export function acknowledge(step: ChatStep | undefined, answer: string) {
  return step?.kind === 'question'
    ? acknowledgeQuestion(step.question.id, answer)
    : undefined;
}
