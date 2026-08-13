import type { Page } from '@playwright/test';
import { sendMessage } from '../../../src/flows/chat.flow';
import { delay } from '../lib/delay';
import type { DemoScene } from './types';

export const chatScenes: DemoScene[] = [
  { name: 'type-message', action: typeChatMessage },
  { name: 'open-actions', action: openChatActions },
];

export const chatConversationScenes: DemoScene[] = [
  { name: 'send-message', action: sendConversationMessage },
  { name: 'type-follow-up', action: typeChatMessage },
];

async function typeChatMessage(page: Page): Promise<void> {
  await page.getByTestId('input').fill('Kurzer Video-Check');
  await delay(700);
  await page.getByTestId('input').clear();
}

async function openChatActions(page: Page): Promise<void> {
  await page.getByTestId('input').fill('Demo-Aktion');
  await delay(400);
  const selectAll = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
  await page.keyboard.press(selectAll);
  await delay(300);
  await page.getByTestId('input').clear();
}

async function sendConversationMessage(page: Page): Promise<void> {
  await sendMessage(page, 'Kurzer Video-Check');
}
