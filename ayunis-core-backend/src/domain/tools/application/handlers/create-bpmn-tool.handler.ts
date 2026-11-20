import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { CreateBpmnTool } from 'src/domain/tools/domain/tools/create-bpmn-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

@Injectable()
export class CreateBpmnToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CreateBpmnToolHandler.name);

  constructor(private readonly createArtifactUseCase: CreateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: CreateBpmnTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing create_bpmn tool');

    try {
      const validatedInput = tool.validateParams(input);

      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          type: ArtifactType.BPMN,
          title: validatedInput.title,
          content: validatedInput.content,
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `BPMN process model created successfully. Artifact ID: ${artifact.id}, version: ${artifact.currentVersionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Failed to execute create_bpmn tool');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
