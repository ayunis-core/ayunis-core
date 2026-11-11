import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatReceived(iso: string | undefined) {
  return iso
    ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
    : '';
}

export type CaseChannel = 'email' | 'letter' | 'ozg' | 'mention';
export type CaseStage = 'new' | 'researched' | 'drafted' | 'sent';
export type CaseScope = 'mine' | 'team';

export interface CaseFinding {
  title: string;
  source: string;
  excerpt: string;
}

export interface CaseMentionMessage {
  author: string;
  text: string;
}

export interface CaseItem {
  id: string;
  channel: CaseChannel;
  scope: CaseScope;
  assignee: string | null;
  sender: string;
  via: string;
  subject: string;
  hoursAgo: number;
  receivedAt?: string;
  dueInDays: number | null;
  request: string;
  findings: CaseFinding[];
  draft: string;
  initialStage: CaseStage;
  mention?: { threadTitle: string; messages: CaseMentionMessage[] };
}

export const CHANNEL_LABELS: Record<CaseChannel, string> = {
  email: 'E-Mail',
  letter: 'Brief (gescannt)',
  ozg: 'Online-Antrag',
  mention: 'Erwähnung',
};

export const STAGES: { id: CaseStage; label: string }[] = [
  { id: 'new', label: 'Eingang' },
  { id: 'researched', label: 'Recherche' },
  { id: 'drafted', label: 'Antwort' },
  { id: 'sent', label: 'Versand' },
];

const RAW_CASES: CaseItem[] = [
  {
    id: 'case-1',
    channel: 'email',
    scope: 'mine',
    assignee: 'Sofia Prototyp',
    sender: 'Murat Kaya',
    via: 'ordnungsamt@musterstadt.de',
    subject: 'Außenbestuhlung für mein Café am Marktplatz',
    hoursAgo: 1,
    dueInDays: 13,
    request: `Sehr geehrte Damen und Herren,

ich betreibe das Café Kaya am Marktplatz 4 und möchte ab April sechs Tische mit je vier Stühlen auf dem Gehweg vor meinem Lokal aufstellen. Was muss ich dafür beantragen und was kostet das?

Mit freundlichen Grüßen
Murat Kaya`,
    findings: [
      {
        title: '§ 2 Erlaubnispflicht',
        source: 'Sondernutzungssatzung Musterstadt',
        excerpt:
          'Die Benutzung der Gemeindestraßen über den Gemeingebrauch hinaus bedarf der Erlaubnis der Stadt. Hierzu zählt insbesondere das Aufstellen von Tischen und Stühlen.',
      },
      {
        title: 'Gebührentarif Nr. 3.1',
        source: 'Sondernutzungsgebührensatzung Musterstadt',
        excerpt:
          'Außengastronomie in Zone I (Innenstadt): 18,00 € je m² und Saison (1. April bis 31. Oktober).',
      },
      {
        title: '§ 18 Sondernutzung',
        source: 'Straßen- und Wegegesetz NRW',
        excerpt:
          'Die Erlaubnis darf nur auf Zeit oder Widerruf erteilt werden. Sie kann mit Bedingungen und Auflagen versehen werden.',
      },
    ],
    draft: `Sehr geehrter Herr Kaya,

vielen Dank für Ihre Anfrage. Für das Aufstellen von Tischen und Stühlen auf dem Gehweg benötigen Sie eine Sondernutzungserlaubnis nach § 2 der Sondernutzungssatzung der Stadt Musterstadt.

Bitte reichen Sie den Antrag mit einer Skizze der geplanten Fläche mindestens vier Wochen vor Beginn ein. Der Marktplatz liegt in Zone I; die Gebühr beträgt 18,00 € je m² und Saison. Bei sechs Tischen rechnen wir mit etwa 15 m², also rund 270 € für die Saison 2027.

Die Erlaubnis wird befristet erteilt und kann mit Auflagen verbunden werden, etwa einer freizuhaltenden Gehwegbreite von 1,50 m.

Mit freundlichen Grüßen
Sofia Prototyp
Ordnungsamt Musterstadt`,
    initialStage: 'researched',
  },
  {
    id: 'case-2',
    channel: 'mention',
    scope: 'mine',
    assignee: 'Sofia Prototyp',
    sender: 'Thomas Weber',
    via: 'Bauamt · Chat',
    subject: 'Bauvoranfrage Hauptstraße 12 – Sondernutzung nötig?',
    hoursAgo: 2,
    dueInDays: null,
    request:
      '@Sofia kannst du kurz prüfen, ob für die geplante Außengastronomie an der Hauptstraße 12 zusätzlich eine Sondernutzungserlaubnis nötig ist? Ich brauche das für meine Stellungnahme bis Freitag.',
    findings: [
      {
        title: '§ 2 Erlaubnispflicht',
        source: 'Sondernutzungssatzung Musterstadt',
        excerpt:
          'Die Benutzung der Gemeindestraßen über den Gemeingebrauch hinaus bedarf der Erlaubnis der Stadt.',
      },
      {
        title: 'Liegenschaftskataster',
        source: 'Geodaten Musterstadt',
        excerpt:
          'Die Fläche vor Hauptstraße 12 ist gewidmete Gemeindestraße (Gehweg), kein Privatgrund.',
      },
    ],
    draft:
      'Ja, die Fläche vor der Hauptstraße 12 ist gewidmeter Gehweg. Für Tische und Stühle braucht der Betreiber deshalb zusätzlich zur Baugenehmigung eine Sondernutzungserlaubnis nach § 2 Sondernutzungssatzung. Das kannst du so in die Stellungnahme übernehmen; den Antrag bearbeiten wir im Ordnungsamt.',
    initialStage: 'new',
    mention: {
      threadTitle: 'Stellungnahme Bauvoranfrage Hauptstraße 12',
      messages: [
        {
          author: 'Thomas Weber',
          text: 'Fasse mir bitte die Bauvoranfrage für die Hauptstraße 12 zusammen.',
        },
        {
          author: 'Ayunis Core',
          text: 'Geplant ist eine Nutzungsänderung vom Einzelhandel zur Gastronomie mit 40 Innen- und 24 Außenplätzen …',
        },
      ],
    },
  },
  {
    id: 'case-3',
    channel: 'email',
    scope: 'team',
    assignee: null,
    sender: 'Petra Becker',
    via: 'ordnungsamt@musterstadt.de',
    subject: 'Lärm durch Gartenpartys beim Nachbarn',
    hoursAgo: 4,
    dueInDays: 14,
    request: `Guten Tag,

mein Nachbar in der Lindenstraße feiert seit Wochen jeden Samstag bis nach Mitternacht im Garten. Ab wann darf er keine laute Musik mehr spielen und was kann ich tun?

Petra Becker`,
    findings: [
      {
        title: '§ 9 Nachtruhe',
        source: 'Landes-Immissionsschutzgesetz NRW',
        excerpt:
          'Von 22 bis 6 Uhr sind Betätigungen verboten, welche die Nachtruhe zu stören geeignet sind.',
      },
      {
        title: '§ 5 Lärmschutz',
        source: 'Ordnungsbehördliche Verordnung Musterstadt',
        excerpt:
          'Tonwiedergabegeräte dürfen nur in solcher Lautstärke benutzt werden, dass unbeteiligte Personen nicht erheblich belästigt werden.',
      },
    ],
    draft: `Sehr geehrte Frau Becker,

vielen Dank für Ihre Nachricht. Nach § 9 des Landes-Immissionsschutzgesetzes NRW gilt von 22 bis 6 Uhr Nachtruhe. Musik, die in dieser Zeit die Nachbarschaft stört, ist nicht erlaubt.

Wir empfehlen zunächst ein Gespräch mit Ihrem Nachbarn. Bei akuter Ruhestörung erreichen Sie den Ordnungsdienst samstags bis 2 Uhr unter 0123 456-789. Gern nehmen wir Ihre Beschwerde auch schriftlich auf und schreiben Ihren Nachbarn an.

Mit freundlichen Grüßen
Ordnungsamt Musterstadt`,
    initialStage: 'new',
  },
  {
    id: 'case-4',
    channel: 'ozg',
    scope: 'team',
    assignee: 'Markus Schulz',
    sender: 'Modehaus Lange GmbH',
    via: 'Serviceportal NRW',
    subject: 'Antrag verkaufsoffener Sonntag am 6. Dezember',
    hoursAgo: 22,
    dueInDays: 5,
    request:
      'Antrag auf Freigabe eines verkaufsoffenen Sonntags am 6. Dezember 2026 anlässlich des Nikolausmarkts in der Innenstadt. Betroffen: Modehaus Lange, Schuhhaus Krämer, Buchhandlung am Markt. Öffnungszeit 13 bis 18 Uhr.',
    findings: [
      {
        title: '§ 6 Verkaufsoffene Sonntage',
        source: 'Ladenöffnungsgesetz NRW',
        excerpt:
          'Verkaufsstellen dürfen an jährlich höchstens acht Sonn- und Feiertagen bis zur Dauer von fünf Stunden geöffnet sein, wenn ein öffentliches Interesse besteht.',
      },
      {
        title: 'Ratsbeschluss 2026/114',
        source: 'Ratsinformationssystem Musterstadt',
        excerpt:
          'Für 2026 sind bereits sieben verkaufsoffene Sonntage freigegeben.',
      },
    ],
    draft:
      'Der Antrag ist zulässig: Mit dem 6. Dezember wäre der achte und damit letzte mögliche verkaufsoffene Sonntag 2026 erreicht. Der Nikolausmarkt begründet das öffentliche Interesse. Die Freigabe braucht eine Änderung der Ordnungsbehördlichen Verordnung durch den Rat.',
    initialStage: 'drafted',
  },
  {
    id: 'case-5',
    channel: 'letter',
    scope: 'mine',
    assignee: 'Sofia Prototyp',
    sender: 'Gerda Hoffmann',
    via: 'Posteingangsstelle · E-Akte',
    subject: 'Abmeldung Hundesteuer nach Tod des Hundes',
    hoursAgo: 50,
    dueInDays: null,
    request:
      'Mein Hund Bruno ist am 2. November gestorben. Ich möchte ihn hiermit von der Hundesteuer abmelden und bitte um Erstattung der zu viel gezahlten Steuer.',
    findings: [
      {
        title: '§ 10 Ende der Steuerpflicht',
        source: 'Hundesteuersatzung Musterstadt',
        excerpt:
          'Die Steuerpflicht endet mit Ablauf des Kalendermonats, in dem die Hundehaltung beendet wird.',
      },
    ],
    draft:
      'Sehr geehrte Frau Hoffmann,\n\nherzliches Beileid zum Verlust von Bruno. Wir haben die Hundesteuer zum 30. November 2026 abgemeldet. Den zu viel gezahlten Betrag von 24,00 € überweisen wir in den nächsten Tagen auf Ihr bekanntes Konto.\n\nMit freundlichen Grüßen\nSofia Prototyp',
    initialStage: 'sent',
  },
];

const LOADED_AT = Date.now();

export const SAMPLE_CASES: CaseItem[] = RAW_CASES.map((item) => ({
  ...item,
  receivedAt: new Date(LOADED_AT - item.hoursAgo * 3600_000).toISOString(),
}));
