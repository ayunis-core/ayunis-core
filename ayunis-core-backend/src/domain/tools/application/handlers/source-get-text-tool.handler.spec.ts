import toolsConfig from 'src/config/tools.config';
import { randomUUID } from 'crypto';
import { SourceGetTextToolHandler } from './source-get-text-tool.handler';
import { SourceGetTextTool } from 'src/domain/tools/domain/tools/source-get-text-tool.entity';
import type { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import type { ExtractTextLinesUseCase } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';

describe('source transcript reading', () => {
  const source = new FileSource({
    id: randomUUID(),
    name: 'Meeting transcript',
    fileType: FileType.PDF,
    type: TextType.FILE,
  });
  const tool = new SourceGetTextTool([source]);
  const context = { orgId: randomUUID(), threadId: randomUUID() };
  const text = 'Budget approved.\u0001"\\'.repeat(4000);
  const findSource = jest.fn();
  const extract = jest.fn();
  const handler = new SourceGetTextToolHandler(
    { execute: findSource } as unknown as GetTextSourceByIdUseCase,
    { execute: extract } as unknown as ExtractTextLinesUseCase,
    { ...toolsConfig(), sourceGetText: { maxLines: 500, maxChars: 20000 } },
  );

  beforeEach(() => {
    findSource.mockReset().mockResolvedValue(source);
    extract.mockReset().mockResolvedValue({ totalLines: 1, text });
  });

  it('returns valid bounded pages that reconstruct an old single-line transcript', async () => {
    let input: Record<string, unknown> = { sourceId: source.id };
    const pages: string[] = [];
    for (let count = 0; count < 100; count++) {
      const response = await handler.execute({ tool, input, context });
      expect(response.length).toBeLessThan(30000);
      const result = JSON.parse(response);
      expect(result.actualStartLine).toBe(1);
      expect(result.actualEndLine).toBe(1);
      pages.push(result.text);
      if (!result.nextPage) break;
      input = result.nextPage;
    }
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('')).toBe(text);
  });

  it('rechecks source existence before reading a continuation', async () => {
    const first = JSON.parse(
      await handler.execute({ tool, input: { sourceId: source.id }, context }),
    );
    findSource.mockRejectedValueOnce(new Error('Source not found'));
    await expect(
      handler.execute({ tool, input: first.nextPage, context }),
    ).rejects.toThrow('Source not found');
    expect(extract).toHaveBeenCalledTimes(1);
  });
});
