import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

export async function dismissWelcomeVideo(api: APIRequestContext): Promise<void> {
  await generatedApi.onboardingControllerMarkWelcomeVideoSeen({ api });
}
