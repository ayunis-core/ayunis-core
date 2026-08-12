import { useEffect, useRef } from 'react';
import type { Message } from '../model/openapi';
import { useOutlookCompose } from '@/features/outlook/useOutlookMail';
import {
  getSendEmailBody,
  extractPlainText,
  replyTextToHtml,
  looksLikeEmailReply,
} from '../lib/compose-reply';

export function useComposeReplyWriter(
  messages: Message[],
  isStreaming: boolean,
): void {
  const { isCompose, setReplyBody } = useOutlookCompose();
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    const justFinished = wasStreamingRef.current && !isStreaming;
    wasStreamingRef.current = isStreaming;
    if (!justFinished || !isCompose || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    const emailDraft = getSendEmailBody(last);
    if (emailDraft) {
      setReplyBody(replyTextToHtml(emailDraft));
      return;
    }
    const answer = extractPlainText(last);
    if (answer && looksLikeEmailReply(answer)) {
      setReplyBody(replyTextToHtml(answer));
    }
  }, [isStreaming, isCompose, messages, setReplyBody]);
}
