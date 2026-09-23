import { useCallback, useEffect, useRef, useState } from 'react';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';
import { setTheme } from '@/features/theme';
import {
  loadOffice,
  readMailItem,
  readHostTheme,
  readBody,
  isComposeItem,
  writeReplyPreservingBody,
  type OfficeApi,
  type OfficeMailItem,
} from './office-host';

// The quoted original of a reply, captured once per pane session before Ayunis
// Core overwrites the draft. Module scope so it survives the pane's internal
// route change (new chat → thread); a fresh pane load resets it.
let composeOriginalText: string | null = null;

export { resetReplyPreservation } from './office-host';

export interface OutlookMail {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
}

function toOutlookMail(item: OfficeMailItem | null): OutlookMail | null {
  if (!item) return null;
  // In compose items `subject`/`from` are async objects, not strings — read the
  // read-mode string shape defensively so the poll never throws on a draft.
  const rawSubject: unknown = item.subject;
  const subject =
    typeof rawSubject === 'string' && rawSubject.trim()
      ? rawSubject.trim()
      : undefined;
  const contact = item.from ?? item.sender;
  const senderName =
    typeof contact?.displayName === 'string' ? contact.displayName : undefined;
  const senderEmail =
    typeof contact?.emailAddress === 'string'
      ? contact.emailAddress
      : undefined;
  return { subject, senderName, senderEmail };
}

const POLL_INTERVAL_MS = 1000;

/**
 * Reads the mail item currently open in the Outlook task pane and mirrors the
 * host light/dark theme. No-op outside the embedded pane. Updates live as the
 * user switches messages in a pinned pane: the `ItemChanged` event is the fast
 * path, and a light poll is the fallback for clients where it doesn't fire
 * reliably. `isLoading` is true only during the initial Office.js boot.
 */
export function useOutlookMail(): {
  isOutlook: boolean;
  mail: OutlookMail | null;
  isLoading: boolean;
  readMailBody: () => Promise<string>;
} {
  const isEmbedded = useEmbedded();
  const [isOutlook, setIsOutlook] = useState(false);
  const [mail, setMail] = useState<OutlookMail | null>(null);
  const [isLoading, setIsLoading] = useState(isEmbedded);
  const officeRef = useRef<OfficeApi | null>(null);

  const readMailBody = useCallback(async () => {
    const office = officeRef.current;
    return office ? readBody(office) : '';
  }, []);

  useEffect(() => {
    if (!isEmbedded) return;
    let cancelled = false;
    let intervalId: number | undefined;
    let lastSubject: string | null | undefined;

    void loadOffice().then((office: OfficeApi | null) => {
      if (cancelled) return;
      if (!office?.context?.mailbox) {
        setIsLoading(false);
        return;
      }
      officeRef.current = office;
      setIsOutlook(true);

      const hostTheme = readHostTheme(office);
      if (hostTheme) setTheme(hostTheme);

      const apply = () => {
        const next = toOutlookMail(readMailItem(office));
        const subject = next?.subject ?? null;
        if (subject !== lastSubject) {
          lastSubject = subject;
          setMail(next);
        }
        setIsLoading(false);
      };

      apply();

      const itemChanged = office.EventType?.ItemChanged;
      if (itemChanged && office.context.mailbox.addHandlerAsync) {
        office.context.mailbox.addHandlerAsync(itemChanged, () => {
          if (!cancelled) apply();
        });
      }

      intervalId = window.setInterval(() => {
        if (!cancelled) apply();
      }, POLL_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isEmbedded]);

  return { isOutlook, mail, isLoading, readMailBody };
}

/**
 * Compose-mode integration: true when the pane runs inside a reply/compose
 * window, where Ayunis Core writes the draft body directly (and updates it live
 * on each revision) instead of opening a separate reply window.
 */
export function useOutlookCompose(options?: { reactive?: boolean }): {
  isCompose: boolean;
  originalText: string;
  setReplyBody: (html: string) => boolean;
} {
  const isEmbedded = useEmbedded();
  const reactive = options?.reactive ?? false;
  const [isCompose, setIsCompose] = useState(false);
  const [originalText, setOriginalText] = useState(composeOriginalText ?? '');
  const officeRef = useRef<OfficeApi | null>(null);

  useEffect(() => {
    if (!isEmbedded) return;
    let cancelled = false;
    let intervalId: number | undefined;

    const detect = (office: OfficeApi) => {
      if (cancelled) return;
      if (!office.context?.mailbox?.item) return;
      const compose = isComposeItem(office);
      setIsCompose(compose);
      if (!compose) return;
      if (composeOriginalText !== null) {
        setOriginalText(composeOriginalText);
        return;
      }
      void readBody(office).then((text) => {
        composeOriginalText ??= text;
        if (!cancelled) setOriginalText(composeOriginalText);
      });
    };

    void loadOffice().then((office) => {
      if (cancelled || !office?.context?.mailbox) return;
      officeRef.current = office;
      detect(office);
      // In a pinned pane the mode flips live (read → reply). ItemChanged is
      // the fast path; the poll is the fallback for hosts where it doesn't
      // fire — the same pairing useOutlookMail relies on.
      if (!reactive) return;
      const itemChanged = office.EventType?.ItemChanged;
      if (itemChanged && office.context.mailbox.addHandlerAsync) {
        office.context.mailbox.addHandlerAsync(itemChanged, () => {
          if (!cancelled) detect(office);
        });
      }
      intervalId = window.setInterval(() => {
        if (!cancelled) detect(office);
      }, POLL_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isEmbedded, reactive]);

  const setReplyBody = useCallback((html: string) => {
    const office = officeRef.current;
    return office ? writeReplyPreservingBody(office, html) : false;
  }, []);

  return { isCompose, originalText, setReplyBody };
}
