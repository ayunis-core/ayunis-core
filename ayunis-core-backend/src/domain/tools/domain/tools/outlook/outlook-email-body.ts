/** The body rules `send_email` uses, for text the pane writes into Outlook. */
export const OUTLOOK_EMAIL_BODY_PROPERTY = {
  type: 'string' as const,
  minLength: 1,
  description:
    'The body of the email as PLAIN TEXT only. Do NOT use Markdown formatting (no **bold**, _italics_, # headings, - bullet lists, [links](url), etc.). Outlook shows the value verbatim, so any Markdown syntax would appear literally to the recipient. Use blank lines and plain punctuation for structure.',
};
