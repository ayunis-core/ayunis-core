import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { CreateSpreadsheetTool } from '../../domain/tools/create-spreadsheet-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { serializeSpreadsheetContent } from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';

@Injectable()
export class CreateSpreadsheetToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(CreateSpreadsheetToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly createArtifactUseCase: CreateArtifactUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: CreateSpreadsheetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.info('Executing create_spreadsheet tool');

    try {
      const validatedInput = tool.validateParams(input);

      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          type: ArtifactType.SPREADSHEET,
          title: validatedInput.title,
          content: serializeSpreadsheetContent({
            columns: [...validatedInput.columns],
            rows: validatedInput.rows.map((row) => [...row]),
          }),
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Spreadsheet created successfully. Artifact ID: ${artifact.id}, version: ${artifact.currentVersionNumber}`;
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
}
