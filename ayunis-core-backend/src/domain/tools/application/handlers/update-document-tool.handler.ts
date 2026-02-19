import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UpdateDocumentTool } from '../../domain/tools/update-document-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { UUID } from 'crypto';

@Injectable()
export class UpdateDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(UpdateDocumentToolHandler.name);

  constructor(private readonly updateArtifactUseCase: UpdateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: UpdateDocumentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing update_document tool');

    try {
      const validatedInput = tool.validateParams(input);

      await this.updateArtifactUseCase.execute(
        new UpdateArtifactCommand({
          artifactId: validatedInput.artifact_id as UUID,
          content: validatedInput.content,
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Document updated successfully. Artifact ID: ${validatedInput.artifact_id}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('Failed to execute update_document tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
