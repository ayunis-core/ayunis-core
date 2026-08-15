import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { serializeSpreadsheetContent } from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { UUID } from 'crypto';

@Injectable()
export class UpdateSpreadsheetToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(UpdateSpreadsheetToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: UpdateSpreadsheetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.info('Executing update_spreadsheet tool');

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
        // The shared error text tells the model to use read_document, which
        // does not exist for spreadsheets — give spreadsheet-specific
        // recovery guidance instead.
        const actualVersion = error.metadata?.actualVersion;
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            `Version conflict: the spreadsheet is now at version ${String(actualVersion)}. ` +
            `It has been edited since you last saw it, likely by the user in the editor. ` +
            `Retry with expected_version set to the current version, and rebuild the full ` +
            `columns and rows from the latest state visible in the conversation — do not ` +
            `resend your previous content unchanged, or you may overwrite the user's edits. ` +
            `If you do not know the user's latest changes, ask the user before updating.`,
          exposeToLLM: true,
        });
      }

      this.logger.error(
        { err: error },
        'Failed to execute update_spreadsheet tool',
      );
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
