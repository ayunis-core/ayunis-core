import type {
  SampleCategory,
  SampleStatus,
} from '@/shared/lib/prototype-settings';
import type {
  Detection,
  FeedItem,
  FeedRoutine,
  FeedTask,
  HomeFeed,
} from './types';

import { buildSampleNews } from './sample-news';

const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function tomorrowAt(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function buildSampleFeed(): HomeFeed {
  const routineResults: FeedItem[] = [
    {
      id: 'sample-1',
      kind: 'routine',
      title: 'Zwei neue Verordnungen zum Gewerberecht',
      source: 'Verkündungsplattform',
      createdAt: hoursAgo(2),
      isUnread: true,
      notificationId: null,
    },
    {
      id: 'sample-2',
      kind: 'routine',
      title: 'Drei Presseartikel erwähnen das Bürgerbüro',
      source: 'Pressespiegel',
      createdAt: hoursAgo(3),
      isUnread: true,
      notificationId: null,
    },
    {
      id: 'sample-3',
      kind: 'routine_error',
      title: 'Ausschreibungen konnten nicht geprüft werden',
      source: 'Vergabeportal',
      createdAt: hoursAgo(5),
      isUnread: true,
      notificationId: null,
    },
  ];
  const news: FeedItem[] = buildSampleNews()
    .filter((entry) => entry.id !== 'sample-news-4')
    .map((entry) => ({
      id: entry.id,
      kind: 'news',
      title: entry.title,
      source: 'Neuigkeiten',
      createdAt: entry.date,
      isUnread: true,
      notificationId: null,
    }));
  const routines: FeedRoutine[] = [
    {
      id: null,
      name: 'Verkündungsplattform',
      dailyTime: '07:00',
      nextRunAt: tomorrowAt('07:00'),
      hasFailed: false,
    },
    {
      id: null,
      name: 'Pressespiegel',
      dailyTime: '08:00',
      nextRunAt: tomorrowAt('08:00'),
      hasFailed: false,
    },
    {
      id: null,
      name: 'Vergabeportal',
      dailyTime: '09:30',
      nextRunAt: tomorrowAt('09:30'),
      hasFailed: true,
    },
  ];
  return {
    routineResults,
    news,
    routines,
    tasks: SAMPLE_TASKS,
    unreadRoutineCount: routineResults.length,
    unreadNewsCount: news.length,
    hasAnything: true,
    runningRoutineNames: [],
    detection: null,
  };
}

const SAMPLE_TASKS: FeedTask[] = [
  {
    id: 'task-1',
    title: 'Stellungnahme zum Bebauungsplan prüfen',
    due: 'Heute',
    source: 'Bauamt',
  },
  {
    id: 'task-2',
    title: 'Antwort auf Bürgeranfrage freigeben',
    due: 'Morgen',
    source: 'Bürgerbüro',
  },
  {
    id: 'task-3',
    title: 'Haushaltsentwurf zusammenfassen',
    due: 'Freitag',
    source: 'Kämmerei',
  },
];

const ARRIVAL_TITLES = [
  ['Neue Ausschreibung für Reinigungsleistungen', 'Vergabeportal'],
  ['Ratsbeschluss zur Parkraumbewirtschaftung', 'Ratsinformationssystem'],
  ['Zwei Leserbriefe zum Bürgerbüro', 'Pressespiegel'],
  ['Neue Förderrichtlinie Digitalisierung', 'Förderdatenbank'],
] as const;

function arrivalItems(count: number): FeedItem[] {
  return Array.from({ length: count }, (_, index): FeedItem => {
    const [title, source] = ARRIVAL_TITLES[index % ARRIVAL_TITLES.length];
    return {
      id: `arrival-${index}`,
      kind: 'routine',
      title,
      source,
      createdAt: new Date(Date.now() - index * 60_000).toISOString(),
      isUnread: true,
      notificationId: null,
    };
  }).reverse();
}

function withCounts(feed: HomeFeed): HomeFeed {
  return {
    ...feed,
    unreadRoutineCount: feed.routineResults.filter((item) => item.isUnread)
      .length,
    unreadNewsCount: feed.news.filter((item) => item.isUnread).length,
  };
}

export interface SampleComposition {
  categories: ReadonlySet<SampleCategory>;
  status: SampleStatus;
  hasRoutines: boolean;
}

const DETECTIONS: Record<string, Detection> = {
  'detected-routine': {
    kind: 'routine',
    label: 'Neue Routine erkannt',
    pattern:
      'Sie fragen seit zwei Wochen fast täglich nach neuen Verordnungen zum Gewerberecht.',
    proposal:
      'Soll Ayunis Core das jeden Morgen um 7 Uhr auf der Verkündungsplattform für Sie prüfen?',
    action: 'Routine einrichten',
    to: '/routines',
  },
  'detected-skill': {
    kind: 'skill',
    label: 'Neue Fähigkeit erkannt',
    pattern:
      'Sie haben diese Woche viermal Widerspruchsbescheide nach demselben Muster formuliert.',
    proposal:
      'Soll Ayunis Core daraus eine Fähigkeit „Widerspruchsbescheid“ machen, die Ihren Aufbau und Ton beibehält?',
    action: 'Fähigkeit anlegen',
    to: '/skills',
  },
  'detected-knowledge': {
    kind: 'knowledge',
    label: 'Neues Wissen erkannt',
    pattern:
      'Sie haben die Gebührensatzung in den letzten Tagen in fünf Chats hochgeladen.',
    proposal:
      'Soll Ayunis Core sie als Wissensbasis speichern, damit Sie sie nicht jedes Mal neu anhängen müssen?',
    action: 'Wissensbasis anlegen',
    to: '/knowledge-bases',
  },
};

function statusFields(status: SampleStatus) {
  const running: Record<string, string[]> = {
    running: ['Pressespiegel'],
    'running-many': ['Pressespiegel', 'Vergabeportal', 'Amtsblatt'],
  };
  return {
    runningRoutineNames: running[status] ?? [],
    detection: DETECTIONS[status] ?? null,
  };
}

export function buildScenarioFeed(
  composition: SampleComposition,
  arrivals: number,
): HomeFeed {
  const base = buildSampleFeed();
  const { categories, hasRoutines } = composition;
  const routineResults = hasRoutines
    ? [
        ...arrivalItems(arrivals),
        ...base.routineResults.filter((item) =>
          item.kind === 'routine_error'
            ? categories.has('failed')
            : categories.has('results'),
        ),
      ]
    : [];
  return withCounts({
    ...base,
    ...(hasRoutines
      ? statusFields(composition.status)
      : { runningRoutineNames: [], detection: null }),
    routineResults,
    news: categories.has('news') ? base.news : [],
    tasks: categories.has('tasks') ? base.tasks : [],
    routines: hasRoutines ? base.routines : [],
    hasAnything: hasRoutines || categories.size > 0,
  });
}
