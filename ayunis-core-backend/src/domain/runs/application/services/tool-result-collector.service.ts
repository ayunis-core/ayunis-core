import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { ExecuteToolCommand } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.command';
import { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { CheckToolCapabilitiesQuery } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.query';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  RunAnonymizationUnavailableError,
  RunToolExecutionFailedError,
} from '../runs.errors';
import { RunToolResultInput } from '../../domain/run-input.entity';

const MAX_TOOL_RESULT_LENGTH = 20000;

@Injectable()
export class ToolResultCollectorService {
  private readonly logger = new Logger(ToolResultCollectorService.name);

  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  async collectToolResults(params: {
    thread: Thread;
    tools: Tool[];
    input: RunToolResultInput | null;
    orgId: UUID;
    isAnonymous: boolean;
  }): Promise<ToolResultMessageContent[]> {
    this.logger.debug('collectToolResults');
    const { thread, tools, input, orgId, isAnonymous } = params;

    const lastMessage = thread.getLastMessage();
    const toolUseMessageContent = lastMessage
      ? lastMessage.content.filter(
          (content) => content instanceof ToolUseMessageContent,
        )
      : [];

    const toolResultMessageContent: ToolResultMessageContent[] = [];

    for (const content of toolUseMessageContent) {
      const result = await this.processToolUse(
        content,
        tools,
        input,
        orgId,
        thread.id,
        isAnonymous,
      );
      toolResultMessageContent.push(result);
    }

    return toolResultMessageContent;
  }

  private async processToolUse(
    content: ToolUseMessageContent,
    tools: Tool[],
    input: RunToolResultInput | null,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<ToolResultMessageContent> {
    const tool = tools.find((t) => t.name === content.name);
    if (!tool) {
      return new ToolResultMessageContent(
        content.id,
        content.name,
        `A tool with the name ${content.name} was not found. Only use tools that are available in your given list of tools.`,
      );
    }

    try {
      const capabilities = this.checkToolCapabilitiesUseCase.execute(
        new CheckToolCapabilitiesQuery(tool),
      );

      if (capabilities.isDisplayable && capabilities.isExecutable) {
        return await this.processHybridTool(
          tool,
          content,
          input,
          orgId,
          threadId,
          isAnonymous,
        );
      }

      if (capabilities.isDisplayable) {
        return this.handleDisplayableTool(content, input);
      }

      if (capabilities.isExecutable) {
        const executionResult = await this.executeBackendTool(
          tool,
          content,
          orgId,
          threadId,
          isAnonymous,
        );
        return executionResult.content;
      }

      return new ToolResultMessageContent(
        content.id,
        content.name,
        `Tool ${content.name} has no executable or displayable capability.`,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(`Error processing tool ${content.name}`, error);
      throw new RunToolExecutionFailedError(content.name, {
        error: error as Error,
      });
    }
  }

  private async processHybridTool(
    tool: Tool,
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<ToolResultMessageContent> {
    const executionResult = await this.executeBackendTool(
      tool,
      content,
      orgId,
      threadId,
      isAnonymous,
    );
    if (executionResult.succeeded) {
      return this.handleDisplayableTool(content, input);
    }
    return executionResult.content;
  }

  exitLoopAfterAgentResponse(
    agentResponseMessage: AssistantMessage,
    tools: Tool[],
  ): boolean {
    const responseDoesNotContainToolCalls = agentResponseMessage.content.every(
      (content) => content.type !== MessageContentType.TOOL_USE,
    );
    if (responseDoesNotContainToolCalls) return true;

    try {
      const responseContainsDisplayOnlyTool = agentResponseMessage.content
        .filter((content) => content instanceof ToolUseMessageContent)
        .some((content) => {
          const tool = tools.find((tool) => tool.name === content.name);
          if (!tool) {
            this.logger.warn(
              `Tool ${content.name} mentioned in response but not found`,
            );
            return false;
          }

          const capabilities = this.checkToolCapabilitiesUseCase.execute(
            new CheckToolCapabilitiesQuery(tool),
          );
          // Only exit the loop for display-only tools (not hybrid tools that also need execution)
          return capabilities.isDisplayable && !capabilities.isExecutable;
        });
      if (responseContainsDisplayOnlyTool) return true;
    } catch (error) {
      this.logger.error('Error checking for display tools', error);
    }

    return false;
  }

  private handleDisplayableTool(
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
  ): ToolResultMessageContent {
    if (input?.toolId === content.id) {
      return new ToolResultMessageContent(
        input.toolId,
        input.toolName,
        input.result,
      );
    }
    return new ToolResultMessageContent(
      content.id,
      content.name,
      'Tool has been displayed successfully',
    );
  }

  private async executeBackendTool(
    tool: Tool,
    content: ToolUseMessageContent,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<{ content: ToolResultMessageContent; succeeded: boolean }> {
    const context = {
      orgId,
      threadId,
    };
    let succeeded = true;
    let result = await this.executeToolUseCase
      .execute(new ExecuteToolCommand(tool, content.params, context))
      .catch((error) => {
        succeeded = false;
        if (error instanceof ToolExecutionFailedError && error.exposeToLLM) {
          return `The tool didn't provide any result due to the following error in tool usage: ${error.message}`;
        } else {
          return `The tool didn't provide any result due to an unknown error`;
        }
      });

    if (result.length > MAX_TOOL_RESULT_LENGTH) {
      result = `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
    }

    if (isAnonymous && tool.returnsPii) {
      result = await this.anonymizeText(result);
    }

    return {
      content: new ToolResultMessageContent(content.id, content.name, result),
      succeeded,
    };
  }

  private async anonymizeText(text: string): Promise<string> {
    try {
      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(text, 'de'),
      );
      return result.anonymizedText;
    } catch (error) {
      throw new RunAnonymizationUnavailableError({
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
