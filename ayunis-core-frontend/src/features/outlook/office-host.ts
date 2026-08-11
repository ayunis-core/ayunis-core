// Minimal typings for the slice of the Office.js API the task pane uses. The
// full @types/office-js package isn't a dependency — the add-in only reads the
// current mail item and the host theme, so a narrow local contract is enough
// and keeps us clear of `any`.

export interface OfficeEmailAddress {
  displayName?: string;
  emailAddress?: string;
}

interface OfficeBody {
  getAsync?: (
    coercionType: string,
    callback: (result: { value?: string }) => void,
  ) => void;
  setAsync?: (data: string, options: { coercionType: string }) => void;
}

export interface OfficeMailItem {
  subject?: string;
  from?: OfficeEmailAddress;
  sender?: OfficeEmailAddress;
  body?: OfficeBody;
  displayReplyFormAsync?: (formData: { htmlBody?: string }) => void;
}

interface OfficeMailbox {
  item?: OfficeMailItem;
  addHandlerAsync?: (eventType: unknown, handler: () => void) => void;
}

interface OfficeTheme {
  bodyBackgroundColor?: string;
}

interface OfficeContext {
  mailbox?: OfficeMailbox;
  officeTheme?: OfficeTheme;
}

export interface OfficeApi {
  onReady: (callback: (info: { host?: unknown }) => void) => void;
  context?: OfficeContext;
  EventType?: { ItemChanged?: unknown };
}

declare global {
  interface Window {
    Office?: OfficeApi;
  }
}

const OFFICE_JS_SRC =
  'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';

let officePromise: Promise<OfficeApi | null> | null = null;

/**
 * Loads Office.js once and resolves when the host signals ready. Resolves to
 * `null` when the script can't load or the page isn't running inside an Office
 * host (e.g. the embedded route opened directly in a browser), so callers can
 * silently fall back to the plain chat.
 */
export function loadOffice(): Promise<OfficeApi | null> {
  if (officePromise) return officePromise;

  officePromise = new Promise<OfficeApi | null>((resolve) => {
    if (window.Office?.onReady) {
      window.Office.onReady(() => resolve(window.Office ?? null));
      return;
    }

    const script = document.createElement('script');
    script.src = OFFICE_JS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Office?.onReady) {
        window.Office.onReady(() => resolve(window.Office ?? null));
      } else {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return officePromise;
}

export function readMailItem(office: OfficeApi): OfficeMailItem | null {
  return office.context?.mailbox?.item ?? null;
}

/**
 * Opens Outlook's native reply form for the current mail with the draft
 * pre-filled. Outlook handles recipients, subject and quoting; nothing is sent
 * — the user reviews and sends. Returns false when the host can't reply.
 */
export function displayReply(office: OfficeApi, htmlBody: string): boolean {
  const item = office.context?.mailbox?.item;
  if (!item?.displayReplyFormAsync) return false;
  item.displayReplyFormAsync({ htmlBody });
  return true;
}

/** Reads the plain-text body of the current mail. Resolves to '' if the host
 *  can't provide it. */
export function readBody(office: OfficeApi): Promise<string> {
  return new Promise((resolve) => {
    const body = office.context?.mailbox?.item?.body;
    if (!body?.getAsync) {
      resolve('');
      return;
    }
    body.getAsync('text', (result) => resolve(result.value ?? ''));
  });
}

/**
 * Compose items expose `body.setAsync`; read items don't. This is how the pane
 * tells whether it's running in a reply/compose window (where it can write the
 * draft) versus the reading pane.
 */
export function isComposeItem(office: OfficeApi): boolean {
  return typeof office.context?.mailbox?.item?.body?.setAsync === 'function';
}

let preservedBodyTail: string | null = null;

export function resetReplyPreservation(): void {
  preservedBodyTail = null;
}

export function writeReplyPreservingBody(
  office: OfficeApi,
  replyHtml: string,
): void {
  const body = office.context?.mailbox?.item?.body;
  if (!body?.setAsync) return;
  const write = (tail: string) => {
    body.setAsync?.(tail ? `${replyHtml}${tail}` : replyHtml, {
      coercionType: 'html',
    });
  };
  if (preservedBodyTail !== null) {
    write(preservedBodyTail);
    return;
  }
  if (body.getAsync) {
    body.getAsync('html', (result) => {
      preservedBodyTail = result.value ?? '';
      write(preservedBodyTail);
    });
  } else {
    preservedBodyTail = '';
    write('');
  }
}

function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  // Perceived brightness (ITU-R BT.601) is enough to tell a dark host theme
  // from a light one.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Returns the host theme when Office reports a body colour, else null. */
export function readHostTheme(office: OfficeApi): 'dark' | 'light' | null {
  const bg = office.context?.officeTheme?.bodyBackgroundColor;
  if (!bg) return null;
  const luminance = relativeLuminance(bg);
  if (luminance === null) return null;
  return luminance < 0.5 ? 'dark' : 'light';
}
