import type { ScreenshotRouteName } from '../routes';
import { adminInstructionsScenes } from './admin-instructions.scenes';
import { adminUsersScenes } from './admin-users.scenes';
import { chatConversationScenes, chatScenes } from './chat.scenes';
import { settingsAccountScenes } from './settings-account.scenes';
import type { DemoScene } from './types';

export const demoScenesByRoute: Record<ScreenshotRouteName, DemoScene[]> = {
  chat: chatScenes,
  'chat-conversation': chatConversationScenes,
  'admin-users': adminUsersScenes,
  'admin-instructions': adminInstructionsScenes,
  'settings-account': settingsAccountScenes,
};
