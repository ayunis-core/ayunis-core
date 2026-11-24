import { beforeEach, describe, expect, it } from 'vitest';
import { createItemChats } from '@/outlook/lib/item-chats';

describe('createItemChats', () => {
  beforeEach(() => window.localStorage.clear());

  it('reopens the chat remembered for an email after the pane reloads', () => {
    createItemChats('user-1').remember('read:A', 'thread-a');

    expect(createItemChats('user-1').chatFor('read:A')).toBe('thread-a');
  });

  it('keeps one user’s emails apart from another user signing in on the device', () => {
    createItemChats('user-1').remember('read:A', 'thread-a');

    expect(createItemChats('user-2').chatFor('read:A')).toBeUndefined();
  });

  it('forgets an email whose chat the user left for a new one', () => {
    const chats = createItemChats('user-1');
    chats.remember('read:A', 'thread-a');

    chats.forget('read:A');

    expect(chats.chatFor('read:A')).toBeUndefined();
  });

  it('drops the least recently used emails beyond its limit', () => {
    const chats = createItemChats('user-1', 2);
    chats.remember('read:A', 'thread-a');
    chats.remember('read:B', 'thread-b');
    chats.remember('read:A', 'thread-a');
    chats.remember('read:C', 'thread-c');

    expect(chats.chatFor('read:B')).toBeUndefined();
    expect(chats.chatFor('read:A')).toBe('thread-a');
    expect(chats.chatFor('read:C')).toBe('thread-c');
  });

  it('still works in memory when the browser blocks storage', () => {
    const chats = createItemChats('user-1');
    const setItem = Storage.prototype.setItem;
    const getItem = Storage.prototype.getItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      chats.remember('read:A', 'thread-a');
      expect(chats.chatFor('read:A')).toBe('thread-a');
    } finally {
      Storage.prototype.setItem = setItem;
      Storage.prototype.getItem = getItem;
    }
  });

  it('keeps a chat it could not save while storage can still be read', () => {
    const chats = createItemChats('user-1');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      chats.remember('read:A', 'thread-a');
      expect(chats.chatFor('read:A')).toBe('thread-a');
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });

  // Several panes (or windows) of one user share the device's storage.
  it('keeps what another pane remembered meanwhile', () => {
    const first = createItemChats('user-1');
    const second = createItemChats('user-1');

    first.remember('read:A', 'thread-a');
    second.remember('read:B', 'thread-b');

    const later = createItemChats('user-1');
    expect(later.chatFor('read:A')).toBe('thread-a');
    expect(later.chatFor('read:B')).toBe('thread-b');
  });
});
