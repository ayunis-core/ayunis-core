import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { Lock } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import NewChatBackdrop, { type NewChatBackdropPhase } from './NewChatBackdrop';
import { useComposeLift } from './use-compose-lift';

export type NewChatPhase = NewChatBackdropPhase | 'hidden';

export interface NewChatLayoutStarter {
  readonly label: string;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}

export interface NewChatLayoutProps {
  readonly layout: 'page' | 'narrow';
  readonly title: string;
  readonly subtitle?: string;
  readonly starters: readonly NewChatLayoutStarter[];
  /** Above the composer, e.g. the workspace picker and notices. */
  readonly leading: ReactNode;
  readonly composer: ReactNode;
  /** Right under the composer, e.g. what is new. */
  readonly supporting: ReactNode;
  /** In the dock under the composer, collapsed while settling. */
  readonly extras: ReactNode;
  readonly privacyHint: string;
  readonly disclaimer: string;
  readonly isSettling: boolean;
  readonly backdropPhase: NewChatPhase;
  readonly onBackdropExitComplete: () => void;
}

function StarterPrompts({
  starters,
}: Readonly<{ starters: readonly NewChatLayoutStarter[] }>) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {starters.map((starter) => (
        <Button
          key={starter.label}
          type="button"
          variant="outline"
          size="sm"
          disabled={starter.disabled}
          onClick={starter.onSelect}
        >
          {starter.label}
        </Button>
      ))}
    </div>
  );
}

function Greeting({ props }: Readonly<{ props: NewChatLayoutProps }>) {
  const narrow = props.layout === 'narrow';
  const settling = props.isSettling;
  return (
    <>
      <h1
        className={cn(
          'new-chat-greeting text-center font-bold',
          narrow ? 'text-xl' : 'text-2xl',
          settling && 'new-chat-greeting--exit',
        )}
        aria-hidden={settling}
      >
        {props.title}
      </h1>
      {props.subtitle && (
        <p
          className={cn(
            'new-chat-greeting text-center text-sm text-muted-foreground',
            settling && 'new-chat-greeting--exit',
          )}
          aria-hidden={settling}
        >
          {props.subtitle}
        </p>
      )}
    </>
  );
}

function ComposerStack({ props }: Readonly<{ props: NewChatLayoutProps }>) {
  const settling = props.isSettling;
  const narrow = props.layout === 'narrow';
  return (
    <div
      className={cn('new-chat-input-stack relative w-full', !narrow && 'z-20')}
    >
      <p
        className={cn(
          'new-chat-disclaimer absolute bottom-full left-0 right-0 mb-2 text-center text-xs text-muted-foreground',
          settling && 'new-chat-disclaimer--visible',
        )}
        aria-hidden={!settling}
      >
        {props.disclaimer}
      </p>
      {props.leading}
      {props.composer}
    </div>
  );
}

function DockExtras({ props }: Readonly<{ props: NewChatLayoutProps }>) {
  const settling = props.isSettling;
  const narrow = props.layout === 'narrow';
  if (narrow && settling) return null;
  return (
    <div
      className={cn(
        'new-chat-dock-extras flex flex-col gap-4 overflow-hidden',
        !narrow && 'mt-4',
        settling && 'new-chat-dock-extras--collapsed',
      )}
      aria-hidden={settling}
    >
      {props.extras}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" />
        <span>{props.privacyHint}</span>
      </div>
    </div>
  );
}

function ComposeContent({ props }: Readonly<{ props: NewChatLayoutProps }>) {
  return (
    <div className="new-chat-compose__content flex w-full flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:200ms]">
      <Greeting props={props} />
      {!props.isSettling && props.starters.length > 0 && (
        <StarterPrompts starters={props.starters} />
      )}
      <ComposerStack props={props} />
      {props.supporting}
      <DockExtras props={props} />
    </div>
  );
}

function ComposeStage({ props }: Readonly<{ props: NewChatLayoutProps }>) {
  const settling = props.isSettling;
  const { stageRef, composeRef, liftPx } = useComposeLift(true, settling);
  return (
    <div
      ref={stageRef}
      className="relative flex min-h-0 flex-1 flex-col justify-end px-2 pb-2 sm:px-4 sm:pb-4"
    >
      <div
        ref={composeRef}
        className={cn(
          'new-chat-compose mx-auto w-full max-w-[800px]',
          settling ? 'new-chat-compose--settling' : 'new-chat-compose--idle',
        )}
        style={
          settling
            ? undefined
            : ({ '--new-chat-lift': `${liftPx}px` } as CSSProperties)
        }
      >
        <ComposeContent props={props} />
      </div>
    </div>
  );
}

/**
 * The new chat's layout. It fills the rest of its positioned, column-flex
 * parent, and its backdrop covers the whole parent, so a host header placed
 * above it sits on the backdrop.
 */
export function NewChatLayout(props: NewChatLayoutProps) {
  return (
    <>
      {props.backdropPhase !== 'hidden' && (
        <NewChatBackdrop
          phase={props.backdropPhase}
          onExitComplete={props.onBackdropExitComplete}
        />
      )}
      <ComposeStage props={props} />
    </>
  );
}
