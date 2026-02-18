import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum ChatSettingsErrorCode {
  USER_SYSTEM_PROMPT_NOT_FOUND = 'USER_SYSTEM_PROMPT_NOT_FOUND',
  UNEXPECTED_CHAT_SETTINGS_ERROR = 'UNEXPECTED_CHAT_SETTINGS_ERROR',
}

export class ChatSettingsError extends ApplicationError {}

export class UserSystemPromptNotFoundError extends ChatSettingsError {
  constructor(userId: string) {
    super(
      `User system prompt not found for user ${userId}`,
      ChatSettingsErrorCode.USER_SYSTEM_PROMPT_NOT_FOUND,
      404,
      { userId },
    );
  }
}

export class UnexpectedChatSettingsError extends ChatSettingsError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      error.message,
      ChatSettingsErrorCode.UNEXPECTED_CHAT_SETTINGS_ERROR,
      500,
      {
        ...metadata,
        error,
      },
    );
  }
}
