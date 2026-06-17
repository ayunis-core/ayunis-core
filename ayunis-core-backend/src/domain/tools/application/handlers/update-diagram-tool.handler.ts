import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UpdateDiagramTool } from '../../domain/tools/update-diagram-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactExpectedVersionMismatchError } from 'src/domain/artifacts/application/artifacts.errors';
import { UUID } from 'crypto';

@Injectable()
export class UpdateDiagramToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(UpdateDiagramToolHandler.name);

  constructor(private readonly updateArtifactUseCase: UpdateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: UpdateDiagramTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing update_diagram tool');

    try {
      const validatedInput = tool.validateParams(input);

      const version = await this.updateArtifactUseCase.execute(
        new UpdateArtifactCommand({
          artifactId: validatedInput.artifact_id as UUID,
          content: validatedInput.content,
          authorType: AuthorType.ASSISTANT,
          expectedVersionNumber: validatedInput.expected_version,
        }),
      );

      return `Diagram updated successfully. Artifact ID: ${validatedInput.artifact_id}, version: ${version?.versionNumber}`;
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

      this.logger.error('Failed to execute update_diagram tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
