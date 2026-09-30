import type { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { WebsiteContentToolHandler } from './website-content-tool.handler';
import type { Message } from '@ayunis/agent-runtime';
import type { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CompleteTurnSelector } from 'src/domain/runs/application/agent-runtime/complete-turn-selector';
import { ContextBudgetHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/context-budget-hook.factory';

const context = {
  threadId: '123e4567-e89b-12d3-a456-426614174000',
  orgId: '323e4567-e89b-12d3-a456-426614174000',
} as const;

describe('WebsiteContentToolHandler', () => {
  let retrieveUrl: jest.Mock;
  let handler: WebsiteContentToolHandler;
  const tool = new WebsiteContentTool();

  beforeEach(() => {
    retrieveUrl = jest.fn();
    handler = new WebsiteContentToolHandler(
      { execute: retrieveUrl } as unknown as RetrieveUrlUseCase,
      { sourceGetText: { maxLines: 200, maxChars: 5000 } },
    );
  });

  it('returns the first content page and an actionable next-page input', async () => {
    const lines = Array.from(
      { length: 205 },
      (_, index) => `Council record ${index + 1}`,
    );
    retrieveUrl.mockResolvedValue(
      new UrlRetrieverResult(
        lines.join('\n'),
        'https://stadt.example.de/records',
        'Council records',
      ),
    );

    const result = JSON.parse(
      await handler.execute({
        tool,
        input: { url: 'https://stadt.example.de/records' },
        context,
      }),
    );

    expect(result).toMatchObject({
      section: 'content',
      totalLines: 205,
      actualStartLine: 1,
      actualEndLine: 200,
      truncated: true,
      truncationReasons: ['max_lines'],
      nextPage: { section: 'content', startLine: 201, numLines: 200 },
      paginationHint: expect.stringContaining('startLine 201'),
    });
    expect(result.content.length).toBeLessThanOrEqual(5000);
  });

  it('returns the final content page without truncation', async () => {
    const lines = Array.from(
      { length: 205 },
      (_, index) => `Council record ${index + 1}`,
    );
    retrieveUrl.mockResolvedValue(
      new UrlRetrieverResult(
        lines.join('\n'),
        'https://stadt.example.de/records',
        'Council records',
      ),
    );

    const result = JSON.parse(
      await handler.execute({
        tool,
        input: {
          url: 'https://stadt.example.de/records',
          startLine: 201,
        },
        context,
      }),
    );

    expect(result).toMatchObject({
      actualStartLine: 201,
      actualEndLine: 205,
      truncated: false,
      nextPage: null,
    });
    expect(result.content).toBe(lines.slice(200).join('\n'));
  });

  it('keeps discovered links bounded and recoverable through the links section', async () => {
    const links = Array.from(
      { length: 205 },
      (_, index) => `https://stadt.example/${index + 1}`,
    );
    retrieveUrl.mockResolvedValue(
      new UrlRetrieverResult(
        'Council website',
        'https://stadt.example.de',
        'Council',
        {},
        links,
      ),
    );

    const firstPage = JSON.parse(
      await handler.execute({
        tool,
        input: { url: 'https://stadt.example.de', section: 'links' },
        context,
      }),
    );
    const finalPage = JSON.parse(
      await handler.execute({
        tool,
        input: {
          url: 'https://stadt.example.de',
          section: 'links',
          startLine: firstPage.nextPage.startLine,
        },
        context,
      }),
    );

    expect(firstPage.links.join('\n').length).toBeLessThanOrEqual(5000);
    expect(firstPage.truncationReasons).toEqual(['max_chars']);
    expect(firstPage.nextPage).toMatchObject({
      section: 'links',
    });
    expect([...firstPage.links, ...finalPage.links]).toEqual(links);
    expect(finalPage.truncated).toBe(false);
  });

  it('keeps a turn with five formerly oversized results inside the context budget', async () => {
    retrieveUrl.mockResolvedValue(
      new UrlRetrieverResult(
        'x'.repeat(200_000),
        'https://stadt.example.de/research',
        'Research source',
      ),
    );
    const boundedResults = await Promise.all(
      Array.from({ length: 5 }, () =>
        handler.execute({
          tool,
          input: { url: 'https://stadt.example.de/research' },
          context,
        }),
      ),
    );
    const messages = researchTurn(boundedResults);
    const transform = contextTransform(200_000);

    expect(() =>
      transform(researchTurn(Array(5).fill('x'.repeat(200_000)))),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
    expect(transform(messages)).toEqual(messages);
  });
});

function researchTurn(results: string[]): Message[] {
  return [
    { role: 'user', content: [{ type: 'text', text: 'Research the budget' }] },
    {
      role: 'assistant',
      content: results.map((_, index) => ({
        type: 'tool_use' as const,
        id: `website-${index}`,
        name: 'website_content',
        input: { url: `https://stadt.example.de/${index}` },
      })),
    },
    {
      role: 'tool_result',
      content: results.map((result, index) => ({
        type: 'tool_result' as const,
        toolCallId: `website-${index}`,
        toolName: 'website_content',
        result,
      })),
    },
  ];
}

function contextTransform(
  maxTokens: number,
): (messages: readonly Message[]) => Message[] {
  const countTokens = {
    execute: (command: CountTokensCommand) =>
      Math.ceil(command.text.length / 4),
  } as unknown as CountTokensUseCase;
  const hook = new ContextBudgetHookFactory(
    new CompleteTurnSelector(countTokens),
  ).create({ maxTokens });
  const transformMessages = jest.fn();
  hook.beforeModelTurn!({ transformMessages } as never);
  return transformMessages.mock.calls[0][0];
}
