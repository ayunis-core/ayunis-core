import AppLayout from '@/layouts/app-layout';
import { cn } from '@/shared/lib/shadcn/utils';
import NewChatBackdrop, { type NewChatBackdropPhase } from './NewChatBackdrop';
import { useComposeLift } from '../model/useComposeLift';

export type NewChatMistPhase = NewChatBackdropPhase | 'hidden';

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
  mistPhase = 'idle',
  onMistExitComplete,
}: Readonly<NewChatPageLayoutProps>) {
  const useComposeLayout = compose !== undefined;
  const { stageRef, composeRef, liftPx } = useComposeLift(
    useComposeLayout,
    isSettling,
  );

  return (
    <AppLayout>
      <div className="absolute inset-0 overflow-hidden">
        {mistPhase !== 'hidden' && (
          <NewChatBackdrop
            phase={mistPhase}
            onExitComplete={onMistExitComplete}
          />
        )}
        <div className="absolute inset-0 z-[1] flex min-h-0 flex-col">
          <div className="content-area-page-header">{header}</div>

          {useComposeLayout ? (
            <div
              ref={stageRef}
              className="flex min-h-0 flex-1 flex-col justify-end px-4 pb-4"
            >
              <div
                ref={composeRef}
                className={cn(
                  'new-chat-compose mx-auto w-full max-w-[800px]',
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
                {/* Entrance animation: 200ms delay + 700ms = 900ms. Tour targets
                    inside mirror this via settleMs. Lives on an inner wrapper so
                    its keyframe transform doesn't override the lift transform. */}
                <div className="new-chat-compose__content flex w-full flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:200ms]">
                  {compose}
                </div>
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
