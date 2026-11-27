const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function htmlDocument(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
}

const PRINT_STYLES =
  'body{font-family:system-ui,sans-serif;font-size:11pt;line-height:1.5;margin:2cm;color:#000}h1{font-size:18pt}h2{font-size:14pt;margin-top:1.5em}h3{font-size:12pt}hr{border:0;border-top:1px solid #999;margin:1.5em 0}';

export function printAsPdf(title: string, bodyHtml: string): void {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = htmlDocument(
    title,
    `<style>${PRINT_STYLES}</style>${bodyHtml}`,
  );
  frame.onload = () => {
    const view = frame.contentWindow;
    if (!view) return;
    view.onafterprint = () => frame.remove();
    view.focus();
    view.print();
  };
  document.body.appendChild(frame);
}

export async function copyRichText(html: string, text: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined') {
    await navigator.clipboard.writeText(text);
    return;
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    }),
  ]);
}
