export type TextInsertionPoint = 'caret' | 'end';

export function insertTextPreservingUndo(
  field: HTMLTextAreaElement,
  text: string,
  at: TextInsertionPoint = 'caret',
): boolean {
  field.focus();
  if (at === 'end') {
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }
  // No current editing API records a textarea undo step. This command does.
  // eslint-disable-next-line sonarjs/deprecation -- undo-preserving insert
  return document.execCommand('insertText', false, text);
}
