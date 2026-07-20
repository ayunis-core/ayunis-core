import type { ConfigService } from '@nestjs/config';
import { StaanInternetSearchHandler } from './staan-internet-search.handler';
import { InternetSearchResult } from '../../domain/internet-search-result.entity';
import { InternetSearchResultType } from '../../domain/value-objects/internet-search-result-type.enum';

describe('StaanInternetSearchHandler', () => {
  let handler: StaanInternetSearchHandler;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'internetSearch.staan.apiKey') return 'staan-test-key';
        if (key === 'internetSearch.staan.market') return 'de-de';
        return undefined;
      }),
    };
    handler = new StaanInternetSearchHandler(
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should map Staan web results, using snippet as the description', async () => {
    const staanResponse = {
      web: {
        results: [
          {
            title: 'Rathaus Musterstadt',
            url: 'https://musterstadt.de/rathaus',
            snippet: 'Öffnungszeiten und Kontakt des Rathauses',
            display_url: 'musterstadt.de',
            hostname: 'musterstadt.de',
          },
        ],
      },
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => staanResponse,
    } as Response);

    const results = await handler.search('rathaus musterstadt öffnungszeiten');

    expect(results).toEqual([
      new InternetSearchResult({
        type: InternetSearchResultType.WEB,
        title: 'Rathaus Musterstadt',
        url: 'https://musterstadt.de/rathaus',
        description: 'Öffnungszeiten und Kontakt des Rathauses',
      }),
    ]);
  });

  it('should skip results missing a title, url, or snippet', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: '', url: 'https://x.de', snippet: 'no title' },
            { title: 'ok', url: 'https://y.de', snippet: 'kept' },
          ],
        },
      }),
    } as Response);

    const results = await handler.search('anything');

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://y.de');
  });

  it('should call Staan with bearer auth, an encoded query and the configured market', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    } as Response);

    await handler.search('a & b');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('q=a%20%26%20b');
    expect(url).toContain('market=de-de');
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer staan-test-key',
    );
  });

  it('should fall back to the default endpoint and market when overrides are blank', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'internetSearch.staan.apiKey') return 'staan-test-key';
      return ''; // blank url/market override, as a copied .env.example would produce
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    } as Response);

    await handler.search('berlin');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.staan.ai/v2/search/web');
    expect(url).toContain('market=de-de');
  });

  it('should cap results at 10 to bound the chat-tool payload', async () => {
    const results = Array.from({ length: 25 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.de/${i}`,
      snippet: `Snippet ${i}`,
    }));
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results } }),
    } as Response);

    const mapped = await handler.search('viele treffer');

    expect(mapped).toHaveLength(10);
  });

  it('should throw when the API key is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    await expect(handler.search('q')).rejects.toThrow(
      'Staan search API key is not configured',
    );
  });

  it('should throw on a non-ok HTTP response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    await expect(handler.search('q')).rejects.toThrow('status 401');
  });
});
