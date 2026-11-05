import type { SearchWebUseCase } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.use-case';
import { SearchWebCommand } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.command';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { InternetSearchToolHandler } from './internet-search-tool.handler';

const context = {
  threadId: '123e4567-e89b-12d3-a456-426614174000',
  orgId: '323e4567-e89b-12d3-a456-426614174000',
} as const;

describe('InternetSearchToolHandler', () => {
  it('passes the run cancel signal to the web search', async () => {
    const search = jest.fn().mockResolvedValue([]);
    const handler = new InternetSearchToolHandler({
      execute: search,
    } as unknown as SearchWebUseCase);
    const controller = new AbortController();

    await handler.execute({
      tool: new InternetSearchTool(),
      input: { query: 'Sperrmüll anmelden Musterstadt' },
      context: { ...context, signal: controller.signal },
    });

    expect(search).toHaveBeenCalledWith(
      new SearchWebCommand('Sperrmüll anmelden Musterstadt', controller.signal),
    );
  });
});
