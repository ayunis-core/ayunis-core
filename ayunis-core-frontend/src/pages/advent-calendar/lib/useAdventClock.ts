import { useEffect, useRef, useState } from 'react';

const DUE_RETRY_MS = 30_000;

interface AdventClockOptions {
  /** The server's time in the calendar response. */
  serverNow: string;
  /** When this browser received that response. */
  receivedAt: number;
  /** When the next locked door opens, or null without one. */
  nextOpening: number | null;
  onDue: () => void;
}

/**
 * The server's current time, ticking every second. The browser clock only
 * measures the time passed since the response, so a wrong browser clock
 * doesn't move the countdowns. Calls `onDue` when the next door opens, and
 * again every 30 s while it stays locked; stops ticking once no door is locked.
 */
export function useAdventClock({
  serverNow,
  receivedAt,
  nextOpening,
  onDue,
}: AdventClockOptions): number {
  const offset = Date.parse(serverNow) - receivedAt;
  const [now, setNow] = useState(() => Date.now() + offset);

  const hasLockedDoor = nextOpening !== null;
  useEffect(() => {
    if (!hasLockedDoor) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now() + offset;
      setNow(current);
      // On the server's full second, so a countdown reaches zero on time.
      timer = setTimeout(tick, 1000 - (current % 1000));
    };
    tick();
    return () => clearTimeout(timer);
  }, [offset, hasLockedDoor]);

  const onDueRef = useRef(onDue);
  useEffect(() => {
    onDueRef.current = onDue;
  }, [onDue]);

  const isDue = hasLockedDoor && now >= nextOpening;
  useEffect(() => {
    if (!isDue) return;
    onDueRef.current();
    // A failed reload leaves the door locked, so ask again until it opens.
    const retry = setInterval(() => onDueRef.current(), DUE_RETRY_MS);
    return () => clearInterval(retry);
  }, [isDue, nextOpening]);

  return now;
}
