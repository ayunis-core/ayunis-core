import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { CreateDiagramTool } from '../../domain/tools/create-diagram-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

@Injectable()
export class CreateDiagramToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CreateDiagramToolHandler.name);

  constructor(private readonly createArtifactUseCase: CreateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: CreateDiagramTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing create_diagram tool');

    try {
      const validatedInput = tool.validateParams(input);

      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          type: ArtifactType.DIAGRAM,
          title: validatedInput.title,
          content: validatedInput.content,
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Diagram created successfully. Artifact ID: ${artifact.id}, version: ${artifact.currentVersionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('Failed to execute create_diagram tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
