import type { ProjectDocument } from './mock';
import { DOCUMENT_CONTENTS } from './document-contents';
import { CHART_CONTENTS, EMAIL_CONTENTS } from './widget-contents';

export const GENERATED_CONTENTS: Record<string, ProjectDocument[]> = {
  buergeranfragen: [
    {
      id: 'g1',
      name: 'Antwortentwurf Sperrmüll-Termin.docx',
      kind: 'document',
      shared: true,
      chatId: 'c1',
      content: DOCUMENT_CONTENTS.g1,
    },
    {
      id: 'g2',
      name: 'Monatsübersicht Anfragen Juni.pdf',
      kind: 'document',
      content: DOCUMENT_CONTENTS.g2,
    },
    {
      id: 'g4',
      name: 'Ablauf Bürgeranfrage',
      kind: 'diagram',
      chatId: 'c1',
      content: DOCUMENT_CONTENTS.g4,
    },
    {
      id: 'g5',
      name: 'Bürgeranfragen nach Themengebiet',
      kind: 'chart',
      shared: true,
      chatId: 'c1',
      chart: CHART_CONTENTS.g5,
    },
    {
      id: 'g6',
      name: 'Antwort an Frau Berger',
      kind: 'email',
      chatId: 'c1',
      email: EMAIL_CONTENTS.g6,
    },
  ],
  vergabe: [
    {
      id: 'g3',
      name: 'Angebotsvergleich Büromöbel.xlsx',
      kind: 'document',
      chatId: 'c6',
      content: DOCUMENT_CONTENTS.g3,
    },
  ],
};
