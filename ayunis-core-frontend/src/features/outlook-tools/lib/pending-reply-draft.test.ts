import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingReplyDraft,
  currentPendingReplyDraftId,
  pendingReplyDraft,
  stagePendingReplyDraft,
  takePendingReplyDraft,
  withOutlookReplyDraftLock,
} from './pending-reply-draft';

const account = 'alex@example.org';
const source = 'read:internet:<message@example.org>';

describe('pending Outlook reply handoff', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '?autoReply=1');
    vi.stubGlobal('Office', {
      context: {
        mailbox: {
          diagnostics: { hostName: 'OutlookWebApp' },
          userProfile: { emailAddress: account },
          item: {
            displayReplyForm: () => undefined,
            internetMessageId: '<message@example.org>',
          },
        },
        requirements: { isSetSupported: () => true },
      },
    });
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_name: string, callback: () => unknown) => callback(),
      },
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
    Reflect.deleteProperty(navigator, 'locks');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('expires the draft for the Outlook event and the reading pane', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
    stagePendingReplyDraft(source, 'call', 'A draft');
    expect(currentPendingReplyDraftId()).toBe('call');

    clock.mockReturnValue(5 * 60 * 1000);
    expect(currentPendingReplyDraftId()).toBeUndefined();
    expect(pendingReplyDraft(account, source)).toBeUndefined();
  });

  it('keeps a revision pending when an earlier event reaches the lock', async () => {
    stagePendingReplyDraft(source, 'first', 'Original draft');
    stagePendingReplyDraft(source, 'revision', 'Revised draft');

    await expect(
      withOutlookReplyDraftLock(() =>
        takePendingReplyDraft(source, 'first', account),
      ),
    ).resolves.toBeUndefined();
    expect(currentPendingReplyDraftId()).toBe('revision');

    clearPendingReplyDraft(source);
    await withOutlookReplyDraftLock(() =>
      expect(currentPendingReplyDraftId()).toBeUndefined(),
    );
  });
});
