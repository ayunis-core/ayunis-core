import type { OparlSearchResult } from 'src/domain/oparl/application/models/oparl-search';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import {
  OPARL_RESOLUTION_TEXT_LIMIT,
  oparlObjectToolResult,
  oparlSearchToolResult,
} from './oparl-tool-results.utils';

const PAPER_WEB = 'https://ris.example.de/vorgang/4';
const FILE_URL = 'https://ris.example.de/files/antrag.pdf';

function result(overrides: Partial<OparlSearchResult>): OparlSearchResult {
  return {
    chunkId: '00000000-0000-4000-8000-000000000001',
    source: OparlChunkSource.PAPER,
    text: 'Ausbau der Kindertagesstätten',
    date: '2026-01-07',
    body: { id: '00000000-0000-4000-8000-0000000000b1', name: 'Musterstadt' },
    paper: {
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Ausbau der Kindertagesstätten',
      reference: 'AN-4/2026',
      paperType: null,
      web: PAPER_WEB,
    },
    meeting: null,
    agendaItem: null,
    file: null,
    matchedQueries: ['Kita'],
    ...overrides,
  };
}

describe('OParl tool results', () => {
  it("gives every search result the RIS link to cite: a document passage its file's access URL, a paper its web page", () => {
    const parsed = JSON.parse(
      oparlSearchToolResult({
        mode: 'hybrid',
        page: 1,
        hasMore: false,
        results: [
          result({}),
          result({
            source: OparlChunkSource.FILE,
            file: {
              id: '00000000-0000-4000-8000-0000000000f1',
              name: 'Antrag',
              accessUrl: FILE_URL,
              pageNumber: 2,
            },
          }),
        ],
      }),
    ) as { results: Array<Record<string, unknown>> };

    expect(parsed.results[0]).toMatchObject({
      url: PAPER_WEB,
      paper: { url: PAPER_WEB, reference: 'AN-4/2026' },
    });
    expect(parsed.results[0]).not.toHaveProperty('meeting');
    expect(parsed.results[0].paper).not.toHaveProperty('paperType');
    expect(parsed.results[1]).toMatchObject({
      url: FILE_URL,
      file: { url: FILE_URL, page: 2 },
    });
  });

  it("cites a document passage whose file has no access URL by its paper's page", () => {
    const parsed = JSON.parse(
      oparlSearchToolResult({
        mode: 'hybrid',
        page: 1,
        hasMore: false,
        results: [
          result({
            source: OparlChunkSource.FILE,
            file: {
              id: '00000000-0000-4000-8000-0000000000f1',
              name: 'Antrag',
              accessUrl: null,
              pageNumber: 1,
            },
          }),
        ],
      }),
    ) as { results: Array<Record<string, unknown>> };

    expect(parsed.results[0].url).toBe(PAPER_WEB);
  });

  it('cuts long resolution texts and turns their HTML into text', () => {
    const parsed = JSON.parse(
      oparlObjectToolResult({
        type: 'meeting',
        id: '00000000-0000-4000-8000-0000000000c1',
        body: {
          id: '00000000-0000-4000-8000-0000000000b1',
          name: 'Musterstadt',
        },
        name: 'Bauausschuss',
        start: null,
        end: null,
        meetingState: null,
        cancelled: null,
        web: 'https://ris.example.de/sitzung/1',
        location: null,
        organizations: [],
        participants: [],
        invitation: null,
        resultsProtocol: null,
        verbatimProtocol: null,
        auxiliaryFiles: [],
        agendaItems: [
          {
            id: '00000000-0000-4000-8000-0000000000d1',
            number: 'TOP 4',
            order: 4,
            name: 'Kita',
            public: true,
            result: '<p>einstimmig <b>beschlossen</b></p>',
            resolutionText: 'x'.repeat(OPARL_RESOLUTION_TEXT_LIMIT + 10),
            web: null,
            paper: null,
            resolutionFile: null,
            auxiliaryFiles: [],
          },
        ],
      }),
    ) as { url: string; agendaItems: Array<Record<string, string>> };

    expect(parsed.url).toBe('https://ris.example.de/sitzung/1');
    expect(parsed.agendaItems[0].result).toBe('einstimmig beschlossen');
    expect(parsed.agendaItems[0].resolutionText).toHaveLength(
      OPARL_RESOLUTION_TEXT_LIMIT + ' […]'.length,
    );
  });
});
