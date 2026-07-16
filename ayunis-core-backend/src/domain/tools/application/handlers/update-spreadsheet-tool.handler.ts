import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UpdateSpreadsheetTool } from '../../domain/tools/update-spreadsheet-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactExpectedVersionMismatchError } from 'src/domain/artifacts/application/artifacts.errors';
import { serializeSpreadsheetContent } from 'src/domain/artifacts/application/helpers/spreadsheet-content';
import { UUID } from 'crypto';

@Injectable()
export class UpdateSpreadsheetToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(UpdateSpreadsheetToolHandler.name);

  constructor(private readonly updateArtifactUseCase: UpdateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: UpdateSpreadsheetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing update_spreadsheet tool');

    try {
      const validatedInput = tool.validateParams(input);

      const version = await this.updateArtifactUseCase.execute(
        new UpdateArtifactCommand({
          artifactId: validatedInput.artifact_id as UUID,
          content: serializeSpreadsheetContent({
            columns: [...validatedInput.columns],
            rows: validatedInput.rows.map((row) => [...row]),
          }),
          authorType: AuthorType.ASSISTANT,
          expectedVersionNumber: validatedInput.expected_version,
        }),
      );

      return `Spreadsheet updated successfully. Artifact ID: ${validatedInput.artifact_id}, version: ${version?.versionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }

      if (error instanceof ArtifactExpectedVersionMismatchError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: error.message,
          exposeToLLM: true,
        });
      }

      this.logger.error('Failed to execute update_spreadsheet tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
