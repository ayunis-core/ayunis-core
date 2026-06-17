import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ReadDocumentTool } from '../../domain/tools/read-document-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { UUID } from 'crypto';

@Injectable()
export class ReadDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ReadDocumentToolHandler.name);

  constructor(
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: ReadDocumentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing read_document tool');

    try {
      const validatedInput = tool.validateParams(input);

      const artifact = await this.findArtifactWithVersionsUseCase.execute(
        new FindArtifactWithVersionsQuery({
          artifactId: validatedInput.artifact_id as UUID,
        }),
      );

      const currentVersion = artifact.versions.find(
        (v) => v.versionNumber === artifact.currentVersionNumber,
      );

      if (!currentVersion) {
        throw new Error(
          `Current version ${artifact.currentVersionNumber} not found for artifact ${artifact.id}`,
        );
      }

      return (
        `Document: "${artifact.title}" (version: ${artifact.currentVersionNumber})\n\n` +
        currentVersion.content
      );
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('Failed to execute read_document tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
