export interface SpotlightRequest {
  target: string;
  title?: string;
  description?: string;
}

const EVENT_NAME = 'spotlight-request';

export function requestSpotlight(request: SpotlightRequest) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: request }));
}

export function onSpotlightRequest(
  callback: (request: SpotlightRequest) => void,
): () => void {
  const handler = (e: Event) =>
    callback((e as CustomEvent<SpotlightRequest>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
