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

interface NewChatPageLayoutProps {
  header: React.ReactNode;
  /** Centered content (personalization, errors) */
  children?: React.ReactNode;
  /** Greeting + input stack; lifted when idle, slides to chat dock when settling */
  compose?: React.ReactNode;
  isSettling?: boolean;
}

export default function NewChatPageLayout({
  header,
  children,
  compose,
  isSettling = false,
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
    setLiftPx(Math.round(lift));
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

  return (
    <AppLayout>
      <div className="absolute inset-0 flex flex-col overflow-hidden px-4 pb-4">
        <div className="sticky top-0 z-10 shrink-0 mb-2">{header}</div>

        {useComposeLayout ? (
          <div
            ref={stageRef}
            className="flex min-h-0 flex-1 flex-col justify-end"
          >
            <div
              ref={composeRef}
              className={cn(
                'new-chat-compose mx-auto flex w-full max-w-[800px] flex-col',
                isSettling
                  ? 'new-chat-compose--settling gap-0'
                  : 'new-chat-compose--idle gap-4',
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto">
            <div className="w-full max-w-[800px]">{children}</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
