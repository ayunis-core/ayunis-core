import { useLayoutEffect, type RefObject } from 'react';

export function useDraftCursorAtEnd(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  draftChatId: string | undefined,
): void {
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !draftChatId) return;
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [draftChatId, textareaRef]);
}
