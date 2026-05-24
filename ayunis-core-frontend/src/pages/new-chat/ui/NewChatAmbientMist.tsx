'use client';

import { cn } from '@/shared/lib/shadcn/utils';
import { useCallback, useEffect, useRef } from 'react';
import './new-chat-ambient-mist.css';

export type NewChatAmbientMistPhase = 'idle' | 'exiting';

const EXIT_MS = 1300;

interface NewChatAmbientMistProps {
  phase: NewChatAmbientMistPhase;
  onExitComplete: () => void;
}

export default function NewChatAmbientMist({
  phase,
  onExitComplete,
}: Readonly<NewChatAmbientMistProps>) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const exitDoneRef = useRef(false);
  const isExiting = phase === 'exiting';

  const finishExit = useCallback(() => {
    if (exitDoneRef.current) return;
    exitDoneRef.current = true;
    onExitComplete();
  }, [onExitComplete]);

  useEffect(() => {
    exitDoneRef.current = false;
  }, []);

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
        'new-chat-ambient-mist',
        isExiting && 'new-chat-ambient-mist--exiting',
      )}
      aria-hidden
    >
      <div ref={canvasRef} className="new-chat-ambient-mist__canvas">
        <div className="new-chat-ambient-mist__blobs">
          <div className="new-chat-ambient-mist__blob is-1" />
          <div className="new-chat-ambient-mist__blob is-2" />
          <div className="new-chat-ambient-mist__blob is-3" />
        </div>
      </div>
    </div>
  );
}
