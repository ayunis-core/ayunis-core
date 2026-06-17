import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { EditDocumentTool } from '../../domain/tools/edit-document-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { ApplyEditsToArtifactUseCase } from 'src/domain/artifacts/application/use-cases/apply-edits-to-artifact/apply-edits-to-artifact.use-case';
import { ApplyEditsToArtifactCommand } from 'src/domain/artifacts/application/use-cases/apply-edits-to-artifact/apply-edits-to-artifact.command';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { UUID } from 'crypto';
import {
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactExpectedVersionMismatchError,
} from 'src/domain/artifacts/application/artifacts.errors';

@Injectable()
export class EditDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(EditDocumentToolHandler.name);

  constructor(
    private readonly applyEditsToArtifactUseCase: ApplyEditsToArtifactUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: EditDocumentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing edit_document tool');

    try {
      const validatedInput = tool.validateParams(input);

      const edits = validatedInput.edits.map((edit) => ({
        oldText: edit.old_text,
        newText: edit.new_text,
      }));

      const version = await this.applyEditsToArtifactUseCase.execute(
        new ApplyEditsToArtifactCommand({
          artifactId: validatedInput.artifact_id as UUID,
          edits: edits,
          authorType: AuthorType.ASSISTANT,
          expectedVersionNumber: validatedInput.expected_version,
        }),
      );

      const editCount = edits.length;
      const editWord = editCount === 1 ? 'edit' : 'edits';
      return `Document edited successfully. Applied ${editCount} ${editWord} to artifact ID: ${validatedInput.artifact_id}, version: ${version.versionNumber}`;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }

      // Map artifact errors to tool execution errors that can be retried by the LLM
      if (error instanceof ArtifactExpectedVersionMismatchError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: error.message,
          exposeToLLM: true,
        });
      }

      if (
        error instanceof ArtifactEditNotFoundError ||
        error instanceof ArtifactEditAmbiguousError
      ) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: error.message,
          exposeToLLM: true,
        });
      }

      this.logger.error('Failed to execute edit_document tool', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: false,
      });
    }
  }
}
