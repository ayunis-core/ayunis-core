import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { CreateDocumentTool } from '../../domain/tools/create-document-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';

@Injectable()
export class CreateDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CreateDocumentToolHandler.name);

  constructor(private readonly createArtifactUseCase: CreateArtifactUseCase) {
    super();
  }

  async execute(params: {
    tool: CreateDocumentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing create_document tool');

    try {
      const validatedInput = tool.validateParams(input);

      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          title: validatedInput.title,
          content: validatedInput.content,
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Document created successfully. Artifact ID: ${artifact.id}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('Failed to execute create_document tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
