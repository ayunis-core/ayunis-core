import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

export async function skipChatPersonalization(
  api: APIRequestContext,
): Promise<void> {
  await generatedApi.chatSettingsControllerUpsertSystemPrompt(
    { systemPrompt: '-' },
    { api },
  );
}
