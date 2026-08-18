import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UpdateEmailTool } from '../../domain/tools/update-email-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { serializeEmailContent } from 'src/domain/artifacts/application/helpers/email-content-format';
import { ArtifactExpectedVersionMismatchError } from 'src/domain/artifacts/application/artifacts.errors';
import type { UUID } from 'crypto';

@Injectable()
export class UpdateEmailToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(UpdateEmailToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: UpdateEmailTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.info('Executing update_email tool');

    try {
      const validatedInput = tool.validateParams(input);
      const version = await this.updateArtifactUseCase.execute(
        new UpdateArtifactCommand({
          artifactId: validatedInput.artifact_id as UUID,
          title: validatedInput.subject,
          content: serializeEmailContent({
            subject: validatedInput.subject,
            to: validatedInput.to,
            cc: validatedInput.cc,
            bcc: validatedInput.bcc,
            body: validatedInput.body,
          }),
          authorType: AuthorType.ASSISTANT,
          expectedVersionNumber: validatedInput.expected_version,
        }),
      );

      return `Email draft updated successfully. Artifact ID: ${validatedInput.artifact_id}, version: ${version?.versionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) throw error;
      if (error instanceof ArtifactExpectedVersionMismatchError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: error.message,
          exposeToLLM: true,
        });
      }
      this.logger.error({ err: error }, 'Failed to execute update_email tool');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
