import { useEffect, useState } from 'react';

export interface SpotlightRequest {
  target: string;
  title?: string;
  description?: string;
}

export interface SpotlightRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

const EVENT_NAME = 'spotlight-request';
const STATE_EVENT = 'spotlight-state';

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

export function emitSpotlightRect(rect: SpotlightRect | null) {
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: rect }));
}

export function useSpotlightRect(): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      setRect((e as CustomEvent<SpotlightRect | null>).detail);
    };
    window.addEventListener(STATE_EVENT, handler);
    return () => window.removeEventListener(STATE_EVENT, handler);
  }, []);
  return rect;
}
