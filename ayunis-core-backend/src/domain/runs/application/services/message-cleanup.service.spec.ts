import { randomUUID, type UUID } from 'crypto';
import type { DeleteMessageUseCase } from 'src/domain/messages/application/use-cases/delete-message/delete-message.use-case';
import type { DeleteMessageCommand } from 'src/domain/messages/application/use-cases/delete-message/delete-message.command';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { MessageCleanupService } from './message-cleanup.service';

const threadId = randomUUID();

describe('MessageCleanupService', () => {
  it('rolls back a failed turn containing completed and orphaned tool calls', async () => {
    const deleteMessageUseCase = deletingUseCase();
    const service = new MessageCleanupService(
      {} as FindThreadUseCase,
      deleteMessageUseCase as unknown as DeleteMessageUseCase,
    );
    const firstToolCallId = 'lookup-permit';
    const orphanedToolCallId = 'fetch-owner';
    const userMessage = userText('Find the owner of permit B-2026-184.');
    const completedToolCall = assistantToolCall(firstToolCallId);
    const completedToolResult = toolResult(
      firstToolCallId,
      'Permit B-2026-184 exists.',
    );
    const orphanedAssistant = assistantToolCall(orphanedToolCallId);
    const messages = [
      assistantText('How can I help with municipal records?'),
      userMessage,
      completedToolCall,
      completedToolResult,
      orphanedAssistant,
    ];

    await service.deleteMessagesUntilAssistant(
      threadId,
      messages,
      new Set(messages.map((message) => message.id)),
    );

    expect(deletedMessageIds(deleteMessageUseCase)).toEqual([
      orphanedAssistant.id,
      completedToolResult.id,
      completedToolCall.id,
      userMessage.id,
    ]);
  });

  it('rolls back a failed turn ending in a completed tool result', async () => {
    const deleteMessageUseCase = deletingUseCase();
    const service = new MessageCleanupService(
      {} as FindThreadUseCase,
      deleteMessageUseCase as unknown as DeleteMessageUseCase,
    );
    const toolCallId = 'lookup-permit';
    const userMessage = userText('Find permit B-2026-184.');
    const toolCallMessage = assistantToolCall(toolCallId);
    const toolResultMessage = toolResult(
      toolCallId,
      'Permit B-2026-184 exists.',
    );
    const messages = [
      assistantText('How can I help with municipal records?'),
      userMessage,
      toolCallMessage,
      toolResultMessage,
    ];

    await service.deleteMessagesUntilAssistant(
      threadId,
      messages,
      new Set(messages.map((message) => message.id)),
    );

    expect(deletedMessageIds(deleteMessageUseCase)).toEqual([
      toolResultMessage.id,
      toolCallMessage.id,
      userMessage.id,
    ]);
  });

  it('keeps the messages another run persisted in the same failed turn', async () => {
    const deleteMessageUseCase = deletingUseCase();
    const service = new MessageCleanupService(
      {} as FindThreadUseCase,
      deleteMessageUseCase as unknown as DeleteMessageUseCase,
    );
    const otherRunQuestion = userText('Summarise the attached permit.');
    const otherRunToolCall = assistantToolCall('search-permit');
    const ownQuestion = userText('Who owns permit B-2026-184?');
    const messages = [
      assistantText('How can I help with municipal records?'),
      otherRunQuestion,
      otherRunToolCall,
      ownQuestion,
    ];

    await service.deleteMessagesUntilAssistant(
      threadId,
      messages,
      new Set([ownQuestion.id]),
    );

    expect(deletedMessageIds(deleteMessageUseCase)).toEqual([ownQuestion.id]);
  });

  it('deletes nothing when the run persisted no message', async () => {
    const deleteMessageUseCase = deletingUseCase();
    const service = new MessageCleanupService(
      {} as FindThreadUseCase,
      deleteMessageUseCase as unknown as DeleteMessageUseCase,
    );
    const messages = [
      assistantText('How can I help with municipal records?'),
      userText('Find permit B-2026-184.'),
    ];

    await service.deleteMessagesUntilAssistant(threadId, messages, new Set());

    expect(deleteMessageUseCase.execute).not.toHaveBeenCalled();
  });
});

function deletingUseCase(): jest.Mocked<Pick<DeleteMessageUseCase, 'execute'>> {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
  };
}

function deletedMessageIds(
  useCase: jest.Mocked<Pick<DeleteMessageUseCase, 'execute'>>,
): UUID[] {
  return useCase.execute.mock.calls.map(
    ([command]: [DeleteMessageCommand]) => command.messageId,
  );
}

function assistantText(text: string): AssistantMessage {
  return new AssistantMessage({
    threadId,
    content: [new TextMessageContent(text)],
  });
}

function userText(text: string): UserMessage {
  return new UserMessage({
    threadId,
    content: [new TextMessageContent(text)],
  });
}

function assistantToolCall(toolCallId: string): AssistantMessage {
  return new AssistantMessage({
    threadId,
    content: [
      new ToolUseMessageContent(toolCallId, 'permit_lookup', {
        permitNumber: 'B-2026-184',
      }),
    ],
  });
}

function toolResult(toolCallId: string, result: string): ToolResultMessage {
  return new ToolResultMessage({
    threadId,
    content: [
      new ToolResultMessageContent(toolCallId, 'permit_lookup', result),
    ],
  });
}
