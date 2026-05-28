'use client';

import AppLayout from '@/layouts/app-layout';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import NewChatAmbientMist, {
  type NewChatAmbientMistPhase,
} from './NewChatAmbientMist';

export type NewChatMistPhase = NewChatAmbientMistPhase | 'hidden';

interface NewChatPageLayoutProps {
  header: React.ReactNode;
  /** Centered content (personalization, errors) */
  children?: React.ReactNode;
  /** Greeting + input stack; lifted when idle, slides to chat dock when settling */
  compose?: React.ReactNode;
  isSettling?: boolean;
  mistPhase?: NewChatMistPhase;
  onMistExitComplete?: () => void;
}

export default function NewChatPageLayout({
  header,
  children,
  compose,
  isSettling = false,
  mistPhase = 'hidden',
  onMistExitComplete,
}: Readonly<NewChatPageLayoutProps>) {
  const useComposeLayout = compose !== undefined;
  const stageRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const [liftPx, setLiftPx] = useState(0);

  const measureLift = useCallback(() => {
    if (isSettling) return;

    const stage = stageRef.current;
    const block = composeRef.current;
    if (!stage || !block) return;

    const lift = -((stage.clientHeight - block.offsetHeight) / 2);
    const nextLift = Math.round(lift);

    setLiftPx((prev) => {
      if (prev === nextLift) return prev;
      // Ignore sub-pixel layout churn (textarea autosize, fonts) while idle
      if (prev !== 0 && Math.abs(prev - nextLift) <= 2) return prev;
      return nextLift;
    });
  }, [isSettling]);

  useLayoutEffect(() => {
    if (!useComposeLayout || isSettling) return;
    measureLift();
  }, [useComposeLayout, measureLift, isSettling, compose]);

  useEffect(() => {
    if (!useComposeLayout) return;

    const stage = stageRef.current;
    const block = composeRef.current;
    if (!stage || !block) return;

    const observer = new ResizeObserver(() => {
      measureLift();
    });
    observer.observe(stage);
    observer.observe(block);

    return () => {
      observer.disconnect();
    };
  }, [useComposeLayout, measureLift, isSettling]);

  const mistLayer =
    useComposeLayout && mistPhase !== 'hidden' && onMistExitComplete ? (
      <div className="new-chat-ambient-mist-panel-clip">
        <NewChatAmbientMist
          phase={mistPhase}
          onExitComplete={onMistExitComplete}
        />
      </div>
    ) : null;

  return (
    <AppLayout>
      <div className="absolute inset-0 flex flex-col">
        {mistLayer}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="content-area-page-header px-4">{header}</div>

          {useComposeLayout ? (
            <div
              ref={stageRef}
              className="flex min-h-0 flex-1 flex-col justify-end px-4 pb-4"
            >
              <div
                ref={composeRef}
                className={cn(
                  'new-chat-compose mx-auto flex w-full max-w-[800px] flex-col',
                  isSettling
                    ? 'new-chat-compose--settling'
                    : 'new-chat-compose--idle',
                )}
                style={
                  isSettling
                    ? undefined
                    : ({
                        '--new-chat-lift': `${liftPx}px`,
                      } as React.CSSProperties)
                }
              >
                {compose}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-4">
              <div className="w-full max-w-[800px]">{children}</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
