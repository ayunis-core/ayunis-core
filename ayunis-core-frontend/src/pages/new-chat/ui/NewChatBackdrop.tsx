import { cn } from '@/shared/lib/shadcn/utils';
import { useCallback, useEffect, useRef } from 'react';
import './new-chat-backdrop.css';

export type NewChatBackdropPhase = 'idle' | 'exiting';

/** Matches --new-chat-backdrop-exit-duration in new-chat-backdrop.css */
const EXIT_MS = 1300;

interface NewChatBackdropProps {
  phase?: NewChatBackdropPhase;
  /** Fired once when the exit fade has finished (transitionend or fallback). */
  onExitComplete?: () => void;
}

export default function NewChatBackdrop({
  phase = 'idle',
  onExitComplete,
}: Readonly<NewChatBackdropProps>) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const exitDoneRef = useRef(false);
  const isExiting = phase === 'exiting';

  const finishExit = useCallback(() => {
    if (exitDoneRef.current) return;
    exitDoneRef.current = true;
    onExitComplete?.();
  }, [onExitComplete]);

  useEffect(() => {
    if (!isExiting) return;

    const node = canvasRef.current;

    function handleTransitionEnd(event: TransitionEvent) {
      if (event.target !== node) return;
      if (event.propertyName !== 'opacity') return;
      finishExit();
    }

    node?.addEventListener('transitionend', handleTransitionEnd);
    const timeoutId = window.setTimeout(finishExit, EXIT_MS + 80);

    return () => {
      node?.removeEventListener('transitionend', handleTransitionEnd);
      window.clearTimeout(timeoutId);
    };
  }, [isExiting, finishExit]);

  return (
    <div
      className={cn(
        'new-chat-backdrop',
        isExiting && 'new-chat-backdrop--exiting',
      )}
      aria-hidden
    >
      <div ref={canvasRef} className="new-chat-backdrop__canvas">
        <div className="new-chat-backdrop__blobs">
          <div className="new-chat-backdrop__blob is-1" />
          <div className="new-chat-backdrop__blob is-2" />
          <div className="new-chat-backdrop__blob is-3" />
        </div>
      </div>
    </div>
  );
}
