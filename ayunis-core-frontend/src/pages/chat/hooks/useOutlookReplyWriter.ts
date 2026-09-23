import { useEffect, useRef } from 'react';
import type { Message } from '../model/openapi';
import { useOutlookCompose } from '@/features/outlook/useOutlookMail';
import { getReplyHtml } from '../lib/compose-reply';

export function useOutlookReplyWriter(messages: Message[]): void {
  const { isCompose, setReplyBody } = useOutlookCompose({ reactive: true });
  const insertedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCompose) return;
    const reply = getReplyHtml(messages);
    if (!reply || insertedIdRef.current === reply.id) return;
    if (setReplyBody(reply.html)) insertedIdRef.current = reply.id;
  }, [isCompose, messages, setReplyBody]);
}
