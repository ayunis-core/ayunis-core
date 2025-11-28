import type {
  AssistantMessageResponseDto,
  TextMessageContentResponseDto,
  GetThreadResponseDto,
  ToolResultMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ThinkingMessageContentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type Thread = GetThreadResponseDto;
export type Message = GetThreadResponseDto['messages'][number];
export type AssistantMessage = AssistantMessageResponseDto;
export type AssistantMessageContent =
  AssistantMessageResponseDto['content'][number];
export type TextMessageContent = TextMessageContentResponseDto;
export type ToolUseMessageContent = ToolUseMessageContentResponseDto;
export type ToolResultMessageContent = ToolResultMessageContentResponseDto;
export type ThinkingMessageContent = ThinkingMessageContentResponseDto;
