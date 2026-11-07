import type { ChatRunProfile } from './chat-run-profile';
import { RunProfileRegistry } from './run-profile.registry';

describe('RunProfileRegistry', () => {
  it('resolves the chat profile', () => {
    const chat = { id: 'chat' } as ChatRunProfile;

    expect(new RunProfileRegistry(chat).get('chat')).toBe(chat);
  });
});
