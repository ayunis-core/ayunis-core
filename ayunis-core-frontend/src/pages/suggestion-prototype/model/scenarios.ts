export type SuggestionKind = 'skill' | 'integration' | 'knowledge' | 'confirm';

export type ScenarioKey = SuggestionKind | 'confirmMany';

export const SCENARIO_KEYS: ScenarioKey[] = [
  'skill',
  'integration',
  'knowledge',
  'confirm',
  'confirmMany',
];

export interface SuggestionDetail {
  label: string;
  value: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  toolName: string;
  summary: SuggestionDetail[];
}

export interface Suggestion {
  kind: SuggestionKind;
  subject: string;
  ask: string;
  reason: string;
  summary: SuggestionDetail[];
  technical?: string;
}

export interface MultiConfirmation {
  reason: string;
  calls: ToolCall[];
}

export interface SkillDraft {
  name: string;
  short_description: string;
  instructions: string;
}

export interface Scenario {
  tabLabel: string;
  userMessage: string;
  assistantMessage: string;
  suggestion?: Suggestion;
  multiConfirmation?: MultiConfirmation;
  skillDraft?: SkillDraft;
}

const PRESS_RELEASE_DRAFT: SkillDraft = {
  name: 'Pressemitteilung aus Ratsbeschluss',
  short_description:
    'Wenn aus einem Ratsbeschluss oder Sitzungsergebnis eine Pressemitteilung entstehen soll.',
  instructions:
    'Schreibe aus dem vorliegenden Ratsbeschluss eine Pressemitteilung für die Website und die lokale Presse.\n\nAufbau:\n- Überschrift fett, höchstens 80 Zeichen, nennt das Ergebnis des Beschlusses\n- Erster Absatz: Wer hat wann was beschlossen?\n- Zweiter Absatz: Kosten, Förderung und Zeitplan, sofern im Beschluss genannt\n- Dritter Absatz: Was ändert sich für Bürgerinnen und Bürger?\n- Am Ende ein Zitat des Bürgermeisters Thomas Berger\n\nStil:\n- Höchstens 2.000 Zeichen\n- Sachlicher Ton, keine Wertungen\n- Kurze Sätze, kein Amtsdeutsch\n- Zahlen ausschreiben bis zwölf, Beträge in Euro mit Punkt als Tausendertrennzeichen\n- Keine Namen von Ratsmitgliedern außer dem Bürgermeister\n\nWenn Angaben im Beschluss fehlen, frage nach, statt sie zu erfinden.',
};

const HUBSPOT_CALLS: ToolCall[] = [
  {
    id: 'ticket',
    tool: 'Ticket anlegen',
    toolName: 'create_ticket',
    summary: [
      { label: 'Titel', value: 'Straßenlaterne defekt, Lindenweg 4' },
      {
        label: 'Beschreibung',
        value:
          'Die Laterne vor Hausnummer 4 leuchtet seit Montag nicht mehr. Gemeldet von Murat Yilmaz.',
      },
      { label: 'Zuständig', value: 'Anna Albers' },
    ],
  },
  {
    id: 'contact',
    tool: 'Kontakt ändern',
    toolName: 'update_contact',
    summary: [
      { label: 'Kontakt', value: 'Murat Yilmaz' },
      { label: 'Neue Telefonnummer', value: '0171 2345678' },
    ],
  },
  {
    id: 'email',
    tool: 'E-Mail senden',
    toolName: 'send_email',
    summary: [
      { label: 'An', value: 'm.yilmaz@example.de' },
      { label: 'Betreff', value: 'Ihre Meldung ist eingegangen' },
      {
        label: 'Text',
        value:
          'Sehr geehrter Herr Yilmaz,\n\nvielen Dank für Ihre Meldung zur defekten Straßenlaterne am Lindenweg 4. Wir haben sie unter der Nummer 2026-1187 aufgenommen und an den Bauhof weitergegeben.\n\nIn der Regel beheben wir solche Schäden innerhalb von fünf Werktagen. Sollte die Laterne danach weiterhin nicht leuchten, melden Sie sich gern erneut.\n\nMit freundlichen Grüßen\nAnna Albers\nBürgerservice',
      },
    ],
  },
];

const CONFIRM_SCENARIO: Scenario = {
  tabLabel: 'Bestätigung',
  userMessage:
    'Setz den Deal mit den Stadtwerken Neuburg auf gewonnen und trag als Abschlussdatum heute ein.',
  assistantMessage:
    'Ich habe den Deal „Stadtwerke Neuburg – Rahmenvertrag 2027“ in HubSpot gefunden. Für die Änderung brauche ich Ihre Bestätigung.',
  suggestion: {
    kind: 'confirm',
    summary: [
      { label: 'Phase', value: 'Gewonnen' },
      { label: 'Abschlussdatum', value: '16.11.2026' },
    ],
    technical:
      'update_deal\n{\n  "dealId": "18342",\n  "properties": {\n    "dealstage": "closedwon",\n    "closedate": "2026-11-16"\n  }\n}',
    subject: 'Stadtwerke Neuburg – Rahmenvertrag 2027',
    ask: 'Soll ich den Deal „Stadtwerke Neuburg – Rahmenvertrag 2027“ auf „Gewonnen“ setzen?',
    reason: 'HubSpot · Deal aktualisieren',
  },
};

const CONFIRM_MANY_SCENARIO: Scenario = {
  tabLabel: '3 Bestätigungen',
  userMessage:
    'Leg für die Anfrage von Herrn Yilmaz ein Ticket an, aktualisier seine Telefonnummer und schick ihm eine Eingangsbestätigung.',
  assistantMessage:
    'Ich habe alles vorbereitet. Drei Aktionen in HubSpot brauchen Ihre Bestätigung.',
  multiConfirmation: {
    reason: 'HubSpot · 3 Aktionen',
    calls: HUBSPOT_CALLS,
  },
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  skill: {
    tabLabel: 'Fähigkeit',
    userMessage:
      'Mach aus dem Ratsbeschluss vom 12. November eine Pressemitteilung. Wie immer: höchstens 2.000 Zeichen, sachlicher Ton, am Ende ein Zitat des Bürgermeisters.',
    assistantMessage: `**Gemeinderat beschließt Sanierung der Grundschule Am Lindenweg**

Der Gemeinderat hat in seiner Sitzung am 12. November die Sanierung der Grundschule Am Lindenweg beschlossen. Die Arbeiten beginnen im Frühjahr 2027 und sollen bis zum Schuljahresbeginn 2028 abgeschlossen sein. Die Gesamtkosten belaufen sich auf 4,2 Millionen Euro, davon trägt das Land 60 Prozent.

Während der Bauzeit wird der Unterricht in Containern auf dem Sportplatz fortgesetzt.

„Mit der Sanierung schaffen wir für unsere Kinder einen Lernort, der den Anforderungen der nächsten Jahrzehnte gerecht wird“, sagt Bürgermeister Thomas Berger.`,
    suggestion: {
      kind: 'skill',
      summary: [
        { label: 'Gilt für', value: 'Nur Sie' },
        { label: 'Auslöser', value: PRESS_RELEASE_DRAFT.short_description },
        { label: 'Anweisungen', value: PRESS_RELEASE_DRAFT.instructions },
      ],
      ask: 'Soll ich das als Fähigkeit „Pressemitteilung aus Ratsbeschluss“ speichern?',
      subject: PRESS_RELEASE_DRAFT.name,
      reason:
        'Sie haben diese Aufgabe in den letzten zwei Wochen dreimal mit denselben Vorgaben beschrieben.',
    },
    skillDraft: PRESS_RELEASE_DRAFT,
  },
  integration: {
    tabLabel: 'Integration',
    userMessage:
      'Fass mir bitte die Tagesordnung der Bauausschusssitzung am Donnerstag zusammen.',
    assistantMessage:
      'Die Tagesordnung liegt mir nicht vor. Wenn Sie die Einladung hier hochladen, fasse ich sie Ihnen zusammen.',
    suggestion: {
      kind: 'integration',
      summary: [
        {
          label: 'Darf',
          value: 'Sitzungen, Tagesordnungen und Vorlagen lesen',
        },
        { label: 'Ändert', value: 'Nichts' },
        {
          label: 'Anmeldung',
          value: 'Mit Ihrem Konto, in einem neuen Fenster',
        },
        { label: 'Nachfragen', value: 'Vor jeder Änderung' },
      ],
      ask: 'Soll ich das Ratsinformationssystem mit Ihrem Konto verbinden?',
      subject: 'Ratsinformationssystem',
      reason:
        'Mit einer Verbindung kann Ayunis Core Tagesordnungen und Vorlagen selbst abrufen, ohne dass Sie sie hochladen.',
    },
  },
  knowledge: {
    tabLabel: 'Wissen',
    userMessage:
      'Wie hoch ist laut der angehängten Satzung die Nutzungsgebühr für ein Urnenwahlgrab?',
    assistantMessage:
      'Laut § 4 Abs. 2 der Friedhofsgebührensatzung beträgt die Nutzungsgebühr für ein Urnenwahlgrab **1.150 Euro** für eine Nutzungszeit von 20 Jahren. Eine Verlängerung kostet anteilig 57,50 Euro pro Jahr.',
    suggestion: {
      kind: 'knowledge',
      summary: [
        { label: 'Wissensdatenbank', value: 'Satzungen (12 Dokumente)' },
        { label: 'Sichtbar für', value: 'Nur Sie' },
      ],
      ask: 'Soll ich die Satzung in der Wissensdatenbank „Satzungen“ ablegen?',
      subject: 'Friedhofsgebührensatzung 2026.pdf',
      reason:
        'Sie haben dieses Dokument in vier Chats hochgeladen. In der Wissensdatenbank „Satzungen“ steht es künftig in jedem Chat bereit.',
    },
  },
  confirm: CONFIRM_SCENARIO,
  confirmMany: CONFIRM_MANY_SCENARIO,
};

export const OTHER_REPLY = 'Im Prototyp nicht ausgearbeitet.';

export function parseScenarioKey(value: unknown): ScenarioKey {
  return SCENARIO_KEYS.includes(value as ScenarioKey)
    ? (value as ScenarioKey)
    : 'skill';
}
