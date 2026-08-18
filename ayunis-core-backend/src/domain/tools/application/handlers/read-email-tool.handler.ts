import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ReadEmailTool } from '../../domain/tools/read-email-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { EmailArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { parseEmailContent } from 'src/domain/artifacts/application/helpers/email-content-format';
import type { UUID } from 'crypto';

@Injectable()
export class ReadEmailToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(ReadEmailToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: ReadEmailTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.info('Executing read_email tool');

    try {
      const validatedInput = tool.validateParams(input);
      const artifact = await this.findArtifactWithVersionsUseCase.execute(
        new FindArtifactWithVersionsQuery({
          artifactId: validatedInput.artifact_id as UUID,
        }),
      );
      if (!(artifact instanceof EmailArtifact)) {
        throw new Error('The requested artifact is not an email');
      }

      const version = artifact.versions.find(
        (candidate) =>
          candidate.versionNumber === artifact.currentVersionNumber,
      );
      if (!version) {
        throw new Error(
          `Current version ${artifact.currentVersionNumber} not found`,
        );
      }
      const content = parseEmailContent(version.content);
      return formatEmail(
        content,
        artifact.title,
        artifact.currentVersionNumber,
      );
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) throw error;
      this.logger.error({ err: error }, 'Failed to execute read_email tool');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}

function formatEmail(
  content: ReturnType<typeof parseEmailContent>,
  title: string,
  version: number,
): string {
  return (
    `Email: "${title}" (version: ${version})\n` +
    `Subject: ${content.subject}\n` +
    `To: ${content.to.join(', ') || '(none)'}\n` +
    `CC: ${content.cc.join(', ') || '(none)'}\n` +
    `BCC: ${content.bcc.join(', ') || '(none)'}\n\n` +
    content.body
  );
}
