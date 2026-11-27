import type { ChatRunProfile } from './chat-run-profile';
import type { OutlookRunProfile } from './outlook-run-profile';
import type { ExcelRunProfile } from './excel-run-profile';
import type { RoutineRunProfile } from './routine-run-profile';
import { RunProfileRegistry } from './run-profile.registry';

describe('RunProfileRegistry', () => {
  const chat = { id: 'chat' } as ChatRunProfile;
  const outlook = { id: 'outlook' } as OutlookRunProfile;
  const excel = { id: 'excel' } as ExcelRunProfile;
  const routine = { id: 'routine' } as RoutineRunProfile;
  const registry = new RunProfileRegistry(chat, outlook, excel, routine);

  it('resolves the chat profile', () => {
    expect(registry.get('chat')).toBe(chat);
  });

  it('resolves the Outlook profile', () => {
    expect(registry.get('outlook')).toBe(outlook);
  });

  it('resolves the Excel profile', () => {
    expect(registry.get('excel')).toBe(excel);
  });

  it('resolves the routine profile', () => {
    expect(registry.get('routine')).toBe(routine);
  });
});
