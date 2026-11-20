import { mailboxSupports } from '@/features/outlook-tools/lib/office-async';
import { currentOutlookItemKey } from '@/features/outlook-tools/lib/outlook-item';

const STORAGE_KEY = 'ayunis.outlook.pendingReplyDraft';
export const OUTLOOK_REPLY_DRAFT_LOCK = STORAGE_KEY;
const CHANGED_EVENT = 'outlookPendingReplyDraftChanged';
const DRAFT_LIFETIME_MS = 5 * 60 * 1000;

interface PendingReplyDraft {
  callId: string;
  sourceKey: string;
  body: string;
  account: string;
  expiresAt: number;
}

export function outlookReplyAccount(): string | undefined {
  try {
    const { diagnostics, userProfile } = Office.context.mailbox;
    if (
      (diagnostics.hostName === 'OutlookWebApp' ||
        diagnostics.hostName === 'newOutlookWindows' ||
        Office.context.platform === Office.PlatformType.Mac) &&
      'locks' in navigator &&
      mailboxSupports('1.14')
    ) {
      return userProfile.emailAddress.trim().toLowerCase() || undefined;
    }
  } catch {
    // Office or browser storage can be unavailable outside the add-in.
  }
  return undefined;
}

function isPendingDraft(value: unknown): value is PendingReplyDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    'callId' in value &&
    typeof value.callId === 'string' &&
    'sourceKey' in value &&
    typeof value.sourceKey === 'string' &&
    'body' in value &&
    typeof value.body === 'string' &&
    'account' in value &&
    typeof value.account === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number'
  );
}

function readDraft(): PendingReplyDraft | undefined {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    return isPendingDraft(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function removeDraft(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingReplyDraft(sourceKey?: string): void {
  void withOutlookReplyDraftLock(() => {
    if (sourceKey === undefined || readDraft()?.sourceKey === sourceKey) {
      removeDraft();
    }
  });
}

export function stagePendingReplyDraft(
  sourceKey: string,
  callId: string,
  body: string,
): void {
  // A pane opened by an older installed manifest has no compose event.
  if (
    new URLSearchParams(location.search).get('autoReply') !== '1' ||
    !sourceKey.startsWith('read:internet:') ||
    sourceKey !== currentOutlookItemKey() ||
    !body.trim()
  )
    return;

  const account = outlookReplyAccount();
  if (!account) return;

  const draft: PendingReplyDraft = {
    callId,
    sourceKey,
    body,
    account,
    expiresAt: Date.now() + DRAFT_LIFETIME_MS,
  };
  void navigator.locks
    .request(OUTLOOK_REPLY_DRAFT_LOCK, () => {
      if (
        account !== outlookReplyAccount() ||
        sourceKey !== currentOutlookItemKey()
      )
        return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event(CHANGED_EVENT));
    })
    .catch(() => {
      // The chat can still offer manual insertion.
    });
}

export function pendingReplyDraft(
  account: string,
  sourceKey: string,
): PendingReplyDraft | undefined {
  const draft = readDraft();
  if (
    draft?.account === account &&
    draft.sourceKey === sourceKey &&
    draft.expiresAt > Date.now()
  ) {
    return draft;
  }
  return undefined;
}

/** Call inside the reply lock. The event supplies its verified sender. */
export function takePendingReplyDraft(
  sourceKey: string,
  callId: string,
  account = outlookReplyAccount(),
): PendingReplyDraft | undefined {
  if (!account) return undefined;
  const draft = pendingReplyDraft(account, sourceKey);
  return draft?.callId === callId && removeDraft() ? draft : undefined;
}

export function purgeExpiredReplyDraft(): void {
  void withOutlookReplyDraftLock(() => {
    const draft = readDraft();
    if (draft && draft.expiresAt <= Date.now()) removeDraft();
  });
}

export function currentPendingReplyDraftId(): string | undefined {
  const account = outlookReplyAccount();
  const sourceKey = currentOutlookItemKey();
  if (account && sourceKey)
    return pendingReplyDraft(account, sourceKey)?.callId;
  return undefined;
}

export function subscribeToPendingReplyDraft(listener: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function update() {
    clearTimeout(timer);
    const draft = readDraft();
    if (draft) {
      // Reread on expiry so one tab cannot clear a newer draft from another.
      timer = setTimeout(
        purgeExpiredReplyDraft,
        Math.max(0, draft.expiresAt - Date.now()),
      );
    }
    listener();
  }
  function storageChanged(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) update();
  }
  window.addEventListener('storage', storageChanged);
  window.addEventListener(CHANGED_EVENT, update);
  update();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener(CHANGED_EVENT, update);
  };
}

/** Keep the background writer and the explicit Insert action from racing. */
export async function withOutlookReplyDraftLock<T>(
  write: () => T | Promise<T>,
): Promise<T> {
  if (!('locks' in navigator)) return write();
  let result: Promise<T> | undefined;
  const writeOnce = () => (result ??= Promise.resolve().then(write));
  try {
    return await navigator.locks.request(OUTLOOK_REPLY_DRAFT_LOCK, writeOnce);
  } catch {
    // Storage restrictions can block locks. Manual Insert still needs to work.
    return writeOnce();
  }
}
