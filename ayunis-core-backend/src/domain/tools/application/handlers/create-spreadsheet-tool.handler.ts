import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import {
  CreateSpreadsheetTool,
  CreateSpreadsheetToolParameters,
} from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import {
  serializeSpreadsheetContent,
  SpreadsheetCell,
  SpreadsheetGrid,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { AuthorizedCsvSourceResolverService } from 'src/domain/tools/application/services/authorized-csv-source-resolver.service';

// At most 15 integer digits and no leading zeros, so IDs, IBAN fragments and
// zero-padded batch numbers stay text.
const PLAIN_NUMBER = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;
// German amounts ("72,25", "1.234,56"); one or two decimals so "1,234" stays
// ambiguous text, and dots only as well-formed thousands groups.
const DECIMAL_COMMA_NUMBER =
  /^-?(0|[1-9]\d{0,14}|[1-9]\d{0,2}(\.\d{3})+),\d{1,2}$/;
// Every decimal with at most 15 significant digits round-trips through a
// double exactly; longer values would be silently rounded.
const MAX_EXACT_SIGNIFICANT_DIGITS = 15;

function isExactNumber(numeric: string): boolean {
  if (!PLAIN_NUMBER.test(numeric)) return false;
  const digits = numeric.replace(/[-.]/g, '').replace(/^0+/, '');
  let end = digits.length;
  while (end > 0 && digits[end - 1] === '0') end--;
  return end <= MAX_EXACT_SIGNIFICANT_DIGITS;
}

function toSpreadsheetCell(value: string): SpreadsheetCell {
  const numeric = DECIMAL_COMMA_NUMBER.test(value)
    ? value.replaceAll('.', '').replace(',', '.')
    : value;
  let cell: SpreadsheetCell = value;
  if (value === '') cell = null;
  else if (isExactNumber(numeric)) cell = Number(numeric);
  return cell;
}

@Injectable()
export class CreateSpreadsheetToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CreateSpreadsheetToolHandler.name);

  constructor(
    private readonly createArtifactUseCase: CreateArtifactUseCase,
    private readonly authorizedCsvSourceResolver: AuthorizedCsvSourceResolverService,
  ) {
    super();
  }

  async execute(params: {
    tool: CreateSpreadsheetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing create_spreadsheet tool');

    try {
      const validatedInput = tool.validateParams(input);
      const grid = await this.resolveGrid(validatedInput, context.threadId);

      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          type: ArtifactType.SPREADSHEET,
          title: validatedInput.title,
          content: serializeSpreadsheetContent(grid),
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Spreadsheet created successfully with ${grid.rows.length} rows. Artifact ID: ${artifact.id}, version: ${artifact.currentVersionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error(
        { err: error },
        'Failed to execute create_spreadsheet tool',
      );
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private async resolveGrid(
    input: CreateSpreadsheetToolParameters,
    threadId: UUID,
  ): Promise<SpreadsheetGrid> {
    const { data_source_id: dataSourceId, columns, rows } = input;
    if (dataSourceId && !columns && !rows) {
      return this.importDataSource(dataSourceId as UUID, threadId);
    }
    if (dataSourceId) {
      throw new Error(
        'Provide either data_source_id or columns and rows, not both.',
      );
    }
    if (columns && rows) {
      return { columns: [...columns], rows: rows.map((row) => [...row]) };
    }
    if (columns) {
      throw new Error(
        'rows is missing: pass rows together with columns, or use data_source_id instead.',
      );
    }
    if (rows) {
      throw new Error(
        'columns is missing: pass columns together with rows, or use data_source_id instead.',
      );
    }
    throw new Error('Provide either data_source_id, or columns and rows.');
  }

  private async importDataSource(
    sourceId: UUID,
    threadId: UUID,
  ): Promise<SpreadsheetGrid> {
    const [source] = await this.authorizedCsvSourceResolver.resolve({
      threadId,
      sourceIds: [sourceId],
    });

    return {
      columns: [...source.data.headers],
      rows: source.data.rows.map((row) => row.map(toSpreadsheetCell)),
    };
  }
}
