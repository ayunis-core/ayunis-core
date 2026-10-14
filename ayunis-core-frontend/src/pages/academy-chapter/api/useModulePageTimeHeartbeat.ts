import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  academyProgressControllerRecordModuleHeartbeat,
  getAcademyProgressControllerGetProgressQueryKey,
} from '@/shared/api';

// Must match MODULE_HEARTBEAT_INTERVAL_SECONDS in the backend: the server
// credits at most one interval per heartbeat.
const HEARTBEAT_INTERVAL_MS = 15_000;

// The server credits time since the learner's latest heartbeat on any module,
// so the old module's closing beat must arrive before the next module's
// session start, or it earns nothing. One queue per tab keeps that order even
// when the player remounts between modules.
let pendingHeartbeat: Promise<unknown> = Promise.resolve();

/**
 * Records how long a course module page is open while the tab is visible and
 * the player is in the viewport. Loom embeds expose no playback events, so
 * this measures page time, not watch time.
 */
export function useModulePageTimeHeartbeat(
  courseModuleId: string,
  targetRef: RefObject<HTMLElement | null>,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let inViewport = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const send = (sessionStart: boolean) => {
      pendingHeartbeat = pendingHeartbeat
        .then(() =>
          academyProgressControllerRecordModuleHeartbeat(courseModuleId, {
            sessionStart,
          }),
        )
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: getAcademyProgressControllerGetProgressQueryKey(),
          });
        })
        // ponytail: a lost heartbeat only loses one interval of time, and the
        // confirmation page shows which modules are still short; a toast every
        // 15 s would be noise.
        .catch(() => undefined);
    };

    const update = () => {
      const active = inViewport && document.visibilityState === 'visible';
      if (active && timer === undefined) {
        send(true);
        timer = setInterval(() => send(false), HEARTBEAT_INTERVAL_MS);
      } else if (!active && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
        send(false);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      update();
    });
    observer.observe(target);
    document.addEventListener('visibilitychange', update);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      inViewport = false;
      update();
    };
  }, [courseModuleId, targetRef, queryClient]);
}
