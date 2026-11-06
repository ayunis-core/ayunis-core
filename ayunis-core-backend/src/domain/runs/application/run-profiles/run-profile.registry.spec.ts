import type { ChatRunProfile } from './chat-run-profile';
import type { RoutineRunProfile } from './routine-run-profile';
import { RunProfileRegistry } from './run-profile.registry';

describe('RunProfileRegistry', () => {
  const chat = { id: 'chat' } as ChatRunProfile;
  const routine = { id: 'routine' } as RoutineRunProfile;
  const registry = new RunProfileRegistry(chat, routine);

  it('resolves the chat profile', () => {
    expect(registry.get('chat')).toBe(chat);
  });

  it('resolves the routine profile', () => {
    expect(registry.get('routine')).toBe(routine);
  });
});
