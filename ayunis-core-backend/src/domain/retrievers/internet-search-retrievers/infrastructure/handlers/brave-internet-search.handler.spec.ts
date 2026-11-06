import type { ConfigService } from '@nestjs/config';
import { BraveInternetSearchHandler } from './brave-internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { InternetSearchResultType } from 'src/domain/retrievers/internet-search-retrievers/domain/value-objects/internet-search-result-type.enum';

describe('BraveInternetSearchHandler', () => {
  let handler: BraveInternetSearchHandler;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'internetSearch.brave.url')
          return 'https://api.search.brave.com/res/v1/web/search';
        if (key === 'internetSearch.brave.apiKey') return 'brave-test-key';
        return undefined;
      }),
    };
    handler = new BraveInternetSearchHandler(
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests extra snippets and returns them with each result', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        web: {
          results: [
            {
              title: 'Open Source in bayerischen Kommunen',
              url: 'https://kommunal.example.de/open-source',
              description: 'Digitalplan und BayKommun im Überblick.',
              extra_snippets: [
                'Der Freistaat fördert offene Software in Kommunen.',
                'Die AKDB bietet Open-Source-Fachverfahren an.',
              ],
            },
          ],
        },
        news: {
          results: [
            {
              title: 'Landkreis stellt auf openDesk um',
              url: 'https://news.example.de/opendesk',
              description: 'Umstellung bis Ende des Jahres.',
              page_age: '2026-10-01T08:00:00',
              extra_snippets: ['Rund 800 Arbeitsplätze sind betroffen.'],
            },
          ],
        },
      }),
    } as Response);

    const results = await handler.search('Open Source Bayern Verwaltung');

    expect(fetchMock.mock.calls[0][0]).toContain('extra_snippets=true');
    expect(results).toEqual([
      new InternetSearchResult({
        type: InternetSearchResultType.WEB,
        title: 'Open Source in bayerischen Kommunen',
        url: 'https://kommunal.example.de/open-source',
        description: 'Digitalplan und BayKommun im Überblick.',
        extraSnippets: [
          'Der Freistaat fördert offene Software in Kommunen.',
          'Die AKDB bietet Open-Source-Fachverfahren an.',
        ],
      }),
      new InternetSearchResult({
        type: InternetSearchResultType.NEWS,
        title: 'Landkreis stellt auf openDesk um',
        url: 'https://news.example.de/opendesk',
        description: 'Umstellung bis Ende des Jahres.',
        pageAge: '2026-10-01T08:00:00',
        extraSnippets: ['Rund 800 Arbeitsplätze sind betroffen.'],
      }),
    ]);
  });

  it('omits extra snippets when Brave returns none', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        web: {
          results: [
            {
              title: 'Rathaus Musterstadt',
              url: 'https://musterstadt.de/rathaus',
              description: 'Öffnungszeiten des Rathauses',
            },
          ],
        },
      }),
    } as Response);

    const [result] = await handler.search('rathaus musterstadt');

    expect(result.extraSnippets).toBeUndefined();
  });

  it('aborts the request when the caller cancels', async () => {
    const controller = new AbortController();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(rejectWhenAborted);

    const search = handler.search('rathaus', controller.signal);
    controller.abort();

    await expect(search).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('bounds the request with a 10 second timeout', async () => {
    const timeout = new AbortController();
    const timeoutSpy = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(timeout.signal);
    jest.spyOn(global, 'fetch').mockImplementation(rejectWhenAborted);

    const search = handler.search('rathaus');
    timeout.abort(new DOMException('Timed out', 'TimeoutError'));

    await expect(search).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
  });
});

function rejectWhenAborted(
  _url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(init.signal?.reason as Error),
    );
  });
}
