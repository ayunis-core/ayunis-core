const EVENT_NAME = 'spotlight-request';

export function requestSpotlight(target: string) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: target }));
}

export function onSpotlightRequest(
  callback: (target: string) => void,
): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
