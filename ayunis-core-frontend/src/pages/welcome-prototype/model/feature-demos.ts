export type DemoResult = 'document' | 'spreadsheet' | 'chart' | 'routine';

export interface DemoTool {
  name: string;
  params: Record<string, unknown>;
}

export interface FeatureDemo {
  title: string;
  benefit: string;
  prompt: string;
  attachment?: string;
  step?: DemoTool;
  answer: string;
  result?: { kind: DemoResult; tool: DemoTool };
  hint: string;
}

export const FEATURE_DEMOS: FeatureDemo[] = [
  {
    title: 'Texte und Dokumente',
    benefit: 'Entwürfe in Sekunden, fertig als PDF oder Word.',
    prompt: 'Erstelle ein Anschreiben zur Bauabnahme am Lindenweg 12.',
    answer:
      'Gern, das Anschreiben ist fertig. Sie können es im Editor anpassen und herunterladen.',
    result: {
      kind: 'document',
      tool: {
        name: 'create_document',
        params: { title: 'Anschreiben Bauabnahme Lindenweg 12' },
      },
    },
    hint: 'Fertig zum Versenden: als PDF oder Word.',
  },
  {
    title: 'Tabellen',
    benefit: 'Listen und Übersichten, die Sie direkt weitergeben können.',
    prompt:
      'Liste alle Bauanträge aus dem Oktober mit Status in einer Tabelle.',
    answer: 'Hier ist die Übersicht der 12 Bauanträge aus dem Oktober.',
    result: {
      kind: 'spreadsheet',
      tool: {
        name: 'create_spreadsheet',
        params: { title: 'Bauanträge Oktober' },
      },
    },
    hint: 'Als Excel oder CSV herunterladen.',
  },
  {
    title: 'Diagramme',
    benefit: 'Zahlen auf einen Blick verständlich machen.',
    prompt: 'Zeig mir die Bauanträge pro Monat als Diagramm.',
    answer: 'Seit Januar steigt die Zahl der Anträge deutlich.',
    result: {
      kind: 'chart',
      tool: {
        name: 'bar_chart',
        params: {
          chartTitle: 'Bauanträge 2026',
          xAxis: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'],
          yAxis: [{ label: 'Anträge', values: [18, 24, 31, 28, 35, 41] }],
          insight: 'Mehr als doppelt so viele Anträge wie im Januar.',
        },
      },
    },
    hint: 'Das Diagramm erscheint direkt im Chat.',
  },
  {
    title: 'Recherche im Internet',
    benefit: 'Aktuelle Informationen, jede Aussage mit Quelle.',
    prompt: 'Welche Förderprogramme gibt es aktuell für kommunale Radwege?',
    step: {
      name: 'internet_search',
      params: { query: 'Förderprogramme kommunale Radwege 2026' },
    },
    answer: `Aktuell passen drei Programme:

- **Radverkehrsinfrastruktur des Bundes** {{url:https://www.foerderdatenbank.de}}
- **Nahmobilität NRW** {{url:https://www.land.nrw}}
- **Klimaschutz durch Radverkehr** {{url:https://www.bmv.de}}`,
    hint: 'Jede Quelle lässt sich mit einem Klick nachprüfen.',
  },
  {
    title: 'Ihr eigenes Wissen',
    benefit: 'Antworten aus Ihren Unterlagen, mit Fundstelle.',
    prompt: 'Wie lange gilt eine Sondernutzungserlaubnis?',
    attachment: 'Satzungen',
    step: {
      name: 'knowledge_query',
      params: { queries: ['Geltungsdauer Sondernutzungserlaubnis'] },
    },
    answer:
      'Eine Sondernutzungserlaubnis gilt **höchstens ein Jahr** {{source:3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f|Sondernutzungssatzung, § 6}}. Eine Verlängerung muss neu beantragt werden.',
    hint: 'Die Fundstelle führt direkt zur Stelle in Ihrer Satzung.',
  },
  {
    title: 'Besprechungen',
    benefit: 'Was beschlossen wurde, ohne das Protokoll zu suchen.',
    prompt: 'Was wurde im letzten Bauausschuss beschlossen?',
    step: {
      name: 'recording_search',
      params: { queries: ['Bauausschuss Beschlüsse'] },
    },
    answer: `Im Bauausschuss vom 12. November wurde beschlossen:

- Die Sanierung der Schulstraße startet im Frühjahr.
- Für den Radweg am Lindenweg wird eine Förderung beantragt.

**Aufgaben:** Ausschreibung vorbereiten (S. Rose), Anwohner informieren (J. Becker).`,
    hint: 'Aufgenommene Besprechungen werden durchsuchbar.',
  },
  {
    title: 'Routinen',
    benefit: 'Wiederkehrende Aufgaben laufen automatisch.',
    prompt: 'Suche jeden Montag nach neuen Förderprogrammen für Radwege.',
    answer:
      'Hier ist die vorbereitete Routine. Mit einem Klick läuft sie ab jetzt jeden Montag.',
    result: {
      kind: 'routine',
      tool: {
        name: 'create_routine',
        params: {
          name: 'Förderprogramme Radwege',
          prompt: 'Suche nach neuen Förderprogrammen für kommunale Radwege.',
        },
      },
    },
    hint: 'Das Ergebnis kommt jeden Montag in Ihren Posteingang.',
  },
];
