import type { APIRequestContext } from '@playwright/test';
import { config } from '../../config';
import { generatedApi } from './generated-api';

export async function dismissWelcomeVideo(api: APIRequestContext): Promise<void> {
  await generatedApi.onboardingControllerMarkWelcomeVideoSeen({ api });
}

export async function dismissWelcomeVideoFromBrowserContext(
  api: APIRequestContext,
): Promise<void> {
  const response = await api.post(
    `${config.apiURL}/api/onboarding/welcome-video-seen`,
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to dismiss welcome video (HTTP ${response.status()})`,
    );
  }
}
