import { Injectable } from '@nestjs/common';
import type { ToolExecutionContext } from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import type { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import type { McpFileField } from 'src/domain/tools/domain/value-objects/mcp-file-fields';
import { ResolveThreadFileUseCase } from 'src/domain/threads/application/use-cases/resolve-thread-file/resolve-thread-file.use-case';
import { ResolveThreadFileQuery } from 'src/domain/threads/application/use-cases/resolve-thread-file/resolve-thread-file.query';
import type { ThreadFileObject } from 'src/domain/threads/application/models/thread-file-object';
import {
  ThreadFileAddedBySkillError,
  ThreadFileNotFoundError,
  ThreadFileNotStoredError,
} from 'src/domain/threads/application/threads.errors';

export interface McpFileHandover {
  /** The tool input with file objects in place of the model's source IDs. */
  readonly arguments: Record<string, unknown>;
  readonly files: readonly ThreadFileObject[];
}

/**
 * Turns the chat-file IDs the model wrote into a tool's file fields into the
 * file objects the MCP server expects. Any rejected file fails the whole call
 * with an error the model can explain, before the server is contacted.
 */
@Injectable()
export class McpFileHandoverService {
  constructor(
    private readonly resolveThreadFileUseCase: ResolveThreadFileUseCase,
  ) {}

  async handOver(
    tool: McpIntegrationTool,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<McpFileHandover> {
    const setFields = tool.fileFields.filter(
      (field) => input[field.name] !== undefined,
    );
    if (setFields.length === 0) return { arguments: input, files: [] };
    if (context.isAnonymous) {
      throw this.refusal(
        tool,
        'File handover to integrations is not available in anonymous mode',
      );
    }

    const handedOver: Record<string, unknown> = { ...input };
    const files: ThreadFileObject[] = [];
    for (const field of setFields) {
      const resolved: ThreadFileObject[] = [];
      for (const sourceId of this.sourceIds(tool, field, input[field.name])) {
        resolved.push(await this.resolve(tool, context, sourceId));
      }
      handedOver[field.name] = field.kind === 'single' ? resolved[0] : resolved;
      files.push(...resolved);
    }
    return { arguments: handedOver, files };
  }

  /** Replaces every handed-over download URL in text the server sent back. */
  redact(text: string, files: readonly ThreadFileObject[]): string {
    return files.reduce(
      (redacted, file) =>
        redacted.replaceAll(
          file.download_url,
          `[download URL of file ${file.file_id}]`,
        ),
      text,
    );
  }

  // Validation is skipped for schemas ajv cannot compile, so the shape of a
  // file field is checked here too.
  private sourceIds(
    tool: McpIntegrationTool,
    field: McpFileField,
    value: unknown,
  ): string[] {
    const ids = field.kind === 'single' ? [value] : value;
    if (
      !Array.isArray(ids) ||
      !ids.every((id): id is string => typeof id === 'string')
    ) {
      throw this.refusal(
        tool,
        `'${field.name}' must contain IDs of files attached to this chat`,
      );
    }
    return ids;
  }

  private async resolve(
    tool: McpIntegrationTool,
    context: ToolExecutionContext,
    sourceId: string,
  ): Promise<ThreadFileObject> {
    try {
      return await this.resolveThreadFileUseCase.execute(
        new ResolveThreadFileQuery(context.threadId, sourceId),
      );
    } catch (error) {
      if (
        error instanceof ThreadFileNotFoundError ||
        error instanceof ThreadFileAddedBySkillError ||
        error instanceof ThreadFileNotStoredError
      ) {
        throw this.refusal(tool, error.message);
      }
      throw error;
    }
  }

  private refusal(
    tool: McpIntegrationTool,
    message: string,
  ): ToolExecutionFailedError {
    return new ToolExecutionFailedError({
      toolName: tool.name,
      message,
      exposeToLLM: true,
    });
  }
}
