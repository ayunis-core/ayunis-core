import type { OparlSystemFixture } from './minimal-fixture.types';

// The OParl catalog is platform-wide. The `.invalid` host never resolves,
// so the system is only there to have bodies an org admin can link.
// Each body has a small council record (OparlCouncilSeeder) for the chat's
// council tools.
export const OPARL_SYSTEMS = [
  {
    url: 'https://ris.seed.invalid/oparl/v1.1/system',
    name: 'Seed RIS',
    vendor: 'Ayunis',
    bodies: [
      {
        oparlId: 'https://ris.seed.invalid/oparl/v1.1/body/1',
        name: 'Gemeinde Musterstadt',
        shortName: 'Musterstadt',
        council: {
          committee: 'Ausschuss für Bildung und Soziales',
          member: {
            givenName: 'Erika',
            familyName: 'Musterfrau',
            role: 'Vorsitzende',
          },
          paper: {
            reference: 'AN-12/2026',
            name: 'Erweiterung der Kita Sonnenschein',
            paperType: 'Antrag der Fraktion',
            date: '2026-03-02',
            filePages: [
              'Die Fraktion beantragt die Erweiterung der Kita Sonnenschein um zwei Gruppen.',
              'Die Kosten der Erweiterung betragen 1,2 Millionen Euro.',
            ],
          },
          meeting: {
            name: 'Ausschuss für Bildung und Soziales (4. Sitzung)',
            start: '2026-03-18T18:00:00+01:00',
            agendaItem: { number: 'TOP 3', result: 'einstimmig beschlossen' },
          },
        },
      },
      {
        oparlId: 'https://ris.seed.invalid/oparl/v1.1/body/2',
        name: 'Ortsgemeinde Beispielhausen',
        shortName: 'Beispielhausen',
        council: {
          committee: 'Bau- und Umweltausschuss',
          member: {
            givenName: 'Max',
            familyName: 'Beispielmann',
            role: 'Mitglied',
          },
          paper: {
            reference: 'VL-7/2026',
            name: 'Sanierung des Dorfgemeinschaftshauses',
            paperType: 'Beschlussvorlage',
            date: '2026-02-11',
            filePages: ['Das Dorfgemeinschaftshaus wird energetisch saniert.'],
          },
          meeting: {
            name: 'Bau- und Umweltausschuss (2. Sitzung)',
            start: '2026-02-25T19:00:00+01:00',
            agendaItem: {
              number: 'TOP 5',
              result: 'mehrheitlich beschlossen',
            },
          },
        },
      },
    ],
  },
] as const satisfies readonly OparlSystemFixture[];
