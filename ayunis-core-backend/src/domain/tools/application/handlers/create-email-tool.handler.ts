import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { CreateEmailTool } from '../../domain/tools/create-email-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { serializeEmailContent } from 'src/domain/artifacts/application/helpers/email-content-format';

@Injectable()
export class CreateEmailToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(CreateEmailToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly createArtifactUseCase: CreateArtifactUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: CreateEmailTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.info('Executing create_email tool');

    try {
      const validatedInput = tool.validateParams(input);
      const artifact = await this.createArtifactUseCase.execute(
        new CreateArtifactCommand({
          threadId: context.threadId,
          type: ArtifactType.EMAIL,
          title: validatedInput.subject,
          content: serializeEmailContent({
            subject: validatedInput.subject,
            to: validatedInput.to,
            cc: validatedInput.cc ?? [],
            bcc: validatedInput.bcc ?? [],
            body: validatedInput.body,
          }),
          authorType: AuthorType.ASSISTANT,
        }),
      );

      return `Email draft created successfully. Artifact ID: ${artifact.id}, version: ${artifact.currentVersionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) throw error;
      this.logger.error({ err: error }, 'Failed to execute create_email tool');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
