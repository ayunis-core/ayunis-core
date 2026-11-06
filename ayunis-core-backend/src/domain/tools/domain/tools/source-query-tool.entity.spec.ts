import { randomUUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceQueryTool } from './source-query-tool.entity';

describe('SourceQueryTool', () => {
  const sources = Array.from(
    { length: 21 },
    (_, index) =>
      new FileSource({
        id: randomUUID(),
        name: `Ratsprotokoll_${index + 1}.pdf`,
        fileType: FileType.PDF,
        type: TextType.FILE,
      }),
  );
  const sourceIds = sources.map((source) => source.id);

  it('accepts several files and several queries in one call', () => {
    const tool = new SourceQueryTool(sources);

    const params = tool.validateParams({
      sourceIds: sourceIds.slice(0, 2),
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(params).toEqual({
      sourceIds: sourceIds.slice(0, 2),
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });
  });

  it('rejects the single sourceId and query shape', () => {
    const tool = new SourceQueryTool(sources);

    expect(() =>
      tool.validateParams({ sourceId: sourceIds[0], query: 'Kündigungsfrist' }),
    ).toThrow(/missing required parameter 'sourceIds'/);
  });

  it('rejects a file that is not available in the thread', () => {
    const tool = new SourceQueryTool(sources);

    expect(() =>
      tool.validateParams({
        sourceIds: [sourceIds[0], randomUUID()],
        queries: ['Kündigungsfrist'],
      }),
    ).toThrow(/parameter 'sourceIds.1' must be one of/);
  });

  it('rejects more than twenty files', () => {
    const tool = new SourceQueryTool(sources);

    expect(() =>
      tool.validateParams({ sourceIds, queries: ['Kündigungsfrist'] }),
    ).toThrow(/'sourceIds' must NOT have more than 20 items/);
  });

  it('rejects more than five queries', () => {
    const tool = new SourceQueryTool(sources);

    expect(() =>
      tool.validateParams({
        sourceIds: [sourceIds[0]],
        queries: ['Frist', 'Laufzeit', 'Kündigung', 'Gebühr', 'Haftung', 'Ort'],
      }),
    ).toThrow(/'queries' must NOT have more than 5 items/);
  });

  it('rejects an empty query list', () => {
    const tool = new SourceQueryTool(sources);

    expect(() =>
      tool.validateParams({ sourceIds: [sourceIds[0]], queries: [] }),
    ).toThrow(/'queries' must NOT have fewer than 1 items/);
  });

  it('describes the array inputs to the model', () => {
    const tool = new SourceQueryTool(sources);

    expect(tool.description).toMatch(/several files/);
    expect(tool.descriptionLong).toMatch(/matchedQueries/);
  });
});
