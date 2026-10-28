const LINE_NUMBER_SELECTOR = '.react-syntax-highlighter-line-number';

export function copyableMessageContent(element: Element): {
  html: string;
  text: string;
} {
  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return { html: '', text: '' };
  }

  clone.querySelectorAll(LINE_NUMBER_SELECTOR).forEach((node) => {
    node.remove();
  });

  const host = document.createElement('div');
  host.append(clone);
  document.body.append(host);
  try {
    const renderedText: unknown = clone.innerText;
    const text =
      typeof renderedText === 'string' ? renderedText : clone.textContent;
    return { html: clone.innerHTML, text };
  } finally {
    host.remove();
  }
}
