import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ReadSpreadsheetToolHandler } from './read-spreadsheet-tool.handler';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { ReadSpreadsheetTool } from 'src/domain/tools/domain/tools/read-spreadsheet-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import {
  DiagramArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactNotFoundError } from 'src/domain/artifacts/application/artifacts.errors';
import {
  serializeSpreadsheetContent,
  type SpreadsheetCell,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import toolsConfig from 'src/config/tools.config';

describe('ReadSpreadsheetToolHandler', () => {
  let handler: ReadSpreadsheetToolHandler;
  let findArtifactUseCase: jest.Mocked<FindArtifactWithVersionsUseCase>;

  const threadId = randomUUID();
  const orgId = randomUUID();
  const userId = randomUUID();
  const artifactId = randomUUID();
  const tool = new ReadSpreadsheetTool();

  beforeEach(async () => {
    findArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindArtifactWithVersionsUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadSpreadsheetToolHandler,
        {
          provide: FindArtifactWithVersionsUseCase,
          useValue: findArtifactUseCase,
        },
        {
          provide: toolsConfig.KEY,
          useValue: { sourceGetText: { maxLines: 200, maxChars: 5000 } },
        },
      ],
    }).compile();

    handler = module.get(ReadSpreadsheetToolHandler);
  });

  function spreadsheet(
    versionNumber: number,
    columns: string[],
    rows: SpreadsheetCell[][],
  ): SpreadsheetArtifact {
    return new SpreadsheetArtifact({
      id: artifactId,
      threadId,
      userId,
      title: 'Haushalt 2026',
      currentVersionNumber: versionNumber,
      versions: [
        new ArtifactVersion({
          artifactId,
          versionNumber,
          content: serializeSpreadsheetContent({ columns, rows }),
          authorType: AuthorType.USER,
          authorId: userId,
        }),
      ],
    });
  }

  async function read(input: Record<string, unknown>) {
    return JSON.parse(
      await handler.execute({
        tool,
        input: { artifact_id: artifactId, ...input },
        context: { threadId, orgId },
      }),
    );
  }

  it('returns the current version with columns and rows that update_spreadsheet accepts unchanged', async () => {
    const columns = ['Posten', 'Betrag', 'Anteil'];
    const rows: SpreadsheetCell[][] = [
      ['Miete', 1300, '=B2/B4'],
      ['Strom', null, '=B3/B4'],
      ['Summe', '=SUM(B2:B3)', null],
    ];
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(3, columns, rows),
    );

    const result = await read({});

    expect(result).toMatchObject({
      artifactId,
      title: 'Haushalt 2026',
      version: 3,
      columns,
      rows,
      totalRows: 3,
      truncated: false,
      nextPage: null,
    });
    expect(() =>
      new UpdateSpreadsheetTool().validateParams({
        artifact_id: result.artifactId,
        columns: result.columns,
        rows: result.rows,
        expected_version: result.version,
      }),
    ).not.toThrow();
  });

  it('returns consecutive pages without duplicated or missing rows', async () => {
    const rows = Array.from({ length: 205 }, (_, index) => [
      `Posten ${index + 1}`,
      index + 1,
    ]);
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(2, ['Posten', 'Betrag'], rows),
    );

    const firstPage = await read({});
    const finalPage = await read({ startRow: firstPage.nextPage.startRow });

    expect(firstPage).toMatchObject({
      actualStartRow: 1,
      actualEndRow: 200,
      truncated: true,
      truncationReasons: ['max_rows'],
      nextPage: { artifact_id: artifactId, startRow: 201, numRows: 200 },
    });
    expect(finalPage).toMatchObject({
      version: 2,
      actualStartRow: 201,
      actualEndRow: 205,
      truncated: false,
      nextPage: null,
    });
    expect([...firstPage.rows, ...finalPage.rows]).toEqual(rows);
  });

  it('ends a page before the character budget is exceeded and continues on the next', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => [
      `${index + 1} ${'x'.repeat(500)}`,
    ]);
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(1, ['Notiz'], rows),
    );

    const firstPage = await read({});
    const secondPage = await read({ startRow: firstPage.nextPage.startRow });

    expect(firstPage.truncationReasons).toEqual(['max_chars']);
    expect(JSON.stringify(firstPage.rows).length).toBeLessThanOrEqual(5000);
    expect(secondPage.rows[0]).toEqual(rows[firstPage.actualEndRow]);
  });

  it('names a data row too large for any page and keeps the rows after it readable', async () => {
    const rows = [['Miete'], ['x'.repeat(31_000)], ['Strom']];
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(4, ['Posten'], rows),
    );

    const firstPage = await read({ numRows: 1 });
    const oversized = await read({ startRow: 2 }).catch(
      (caught: unknown) => caught,
    );
    const lastPage = await read({ startRow: 3 });

    expect(firstPage.rows).toEqual([['Miete']]);
    expect(oversized).toBeInstanceOf(ToolExecutionFailedError);
    expect((oversized as ToolExecutionFailedError).message).toContain(
      'Data row 2 is too large',
    );
    expect((oversized as ToolExecutionFailedError).message).toContain(
      'Do not replace this spreadsheet with update_spreadsheet',
    );
    expect(lastPage.rows).toEqual([['Strom']]);
  });

  it('names column headers too large for any page instead of asking for fewer rows', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(1, ['x'.repeat(31_000)], [['Miete']]),
    );

    await expect(read({})).rejects.toThrow(
      'The column headers are too large to return.',
    );
  });

  it('returns an empty page for a spreadsheet without data rows', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(1, ['Posten'], []),
    );

    await expect(read({})).resolves.toMatchObject({
      columns: ['Posten'],
      rows: [],
      totalRows: 0,
      truncated: false,
      nextPage: null,
    });
  });

  it('rejects a start row past the last data row', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      spreadsheet(1, ['Posten'], [['Miete']]),
    );

    await expect(read({ startRow: 2 })).rejects.toThrow(
      'startRow (2) is greater than',
    );
  });

  it('points the model to read_diagram when the artifact is a diagram', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      new DiagramArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Ablauf',
        versions: [
          new ArtifactVersion({
            artifactId,
            versionNumber: 1,
            content: 'flowchart TD\n  A --> B',
            authorType: AuthorType.ASSISTANT,
          }),
        ],
      }),
    );

    await expect(read({})).rejects.toThrow('Use read_diagram to read it');
  });

  it('reports an artifact the user cannot access as not found to the model', async () => {
    findArtifactUseCase.execute.mockRejectedValue(
      new ArtifactNotFoundError(artifactId),
    );

    const error = await read({}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ToolExecutionFailedError);
    expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
    expect((error as ToolExecutionFailedError).message).toContain('not found');
  });
});
