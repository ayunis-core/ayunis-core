import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { Lock } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import NewChatBackdrop, { type NewChatBackdropPhase } from './NewChatBackdrop';
import { useComposeLift } from './use-compose-lift';

export type NewChatShellPhase = NewChatBackdropPhase | 'hidden';

export interface NewChatStarterPrompt {
  id: string;
  label: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface NewChatShellProps {
  /** Selects the host landmark. Defaults to a neutral container for nested layouts. */
  as?: 'div' | 'main';
  header: ReactNode;
  greeting?: ReactNode;
  starterPrompts?: readonly NewChatStarterPrompt[];
  leadingContent?: ReactNode;
  composer?: ReactNode;
  supportingContent?: ReactNode;
  extras?: ReactNode;
  privacyHint?: ReactNode;
  disclaimer?: ReactNode;
  emptyState?: ReactNode;
  /** Constrains spacing and typography for a narrow host without changing hierarchy. */
  layout?: 'page' | 'narrow';
  isSettling?: boolean;
  backdropPhase?: NewChatShellPhase;
  onBackdropExitComplete?: () => void;
  testId?: string;
}

function StarterPrompts({
  prompts,
}: Readonly<{ prompts: readonly NewChatStarterPrompt[] }>) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={prompt.disabled}
          onClick={prompt.onSelect}
        >
          {prompt.label}
        </Button>
      ))}
    </div>
  );
}

function Greeting({
  children,
  narrow,
  settling,
}: Readonly<{
  children: ReactNode;
  narrow: boolean;
  settling: boolean;
}>) {
  return (
    <h1
      className={cn(
        'new-chat-greeting text-center font-bold',
        narrow ? 'text-xl' : 'text-2xl',
        settling && 'new-chat-greeting--exit',
      )}
      aria-hidden={settling}
    >
      {children}
    </h1>
  );
}

function ComposerStack({ props }: Readonly<{ props: NewChatShellProps }>) {
  const settling = props.isSettling ?? false;
  const narrow = props.layout === 'narrow';
  return (
    <div
      className={cn('new-chat-input-stack relative w-full', !narrow && 'z-20')}
    >
      {props.disclaimer !== undefined && (
        <p
          className={cn(
            'new-chat-disclaimer absolute bottom-full left-0 right-0 mb-2 text-center text-xs text-muted-foreground',
            settling && 'new-chat-disclaimer--visible',
          )}
          aria-hidden={!settling}
        >
          {props.disclaimer}
        </p>
      )}
      {props.leadingContent}
      {props.composer}
    </div>
  );
}

function DockExtras({ props }: Readonly<{ props: NewChatShellProps }>) {
  const settling = props.isSettling ?? false;
  const narrow = props.layout === 'narrow';
  if (
    (props.extras === undefined && props.privacyHint === undefined) ||
    (narrow && settling)
  ) {
    return null;
  }
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
      {props.privacyHint !== undefined && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span>{props.privacyHint}</span>
        </div>
      )}
    </div>
  );
}

function ComposeContent({ props }: Readonly<{ props: NewChatShellProps }>) {
  const settling = props.isSettling ?? false;
  const prompts = props.starterPrompts ?? [];
  const narrow = props.layout === 'narrow';
  return (
    <div className="new-chat-compose__content flex w-full flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:200ms]">
      {props.greeting !== undefined && (
        <Greeting narrow={narrow} settling={settling}>
          {props.greeting}
        </Greeting>
      )}
      {!settling && prompts.length > 0 && <StarterPrompts prompts={prompts} />}
      <ComposerStack props={props} />
      {props.supportingContent}
      <DockExtras props={props} />
    </div>
  );
}

function ComposeStage({ props }: Readonly<{ props: NewChatShellProps }>) {
  const settling = props.isSettling ?? false;
  const { stageRef, composeRef, liftPx } = useComposeLift(true, settling);
  return (
    <div
      ref={stageRef}
      className="flex min-h-0 flex-1 flex-col justify-end px-2 pb-2 sm:px-4 sm:pb-4"
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

export function NewChatShell(props: Readonly<NewChatShellProps>) {
  const phase = props.backdropPhase ?? 'idle';
  const Root = props.as ?? 'div';
  return (
    <Root
      className="absolute inset-0 overflow-hidden"
      data-testid={props.testId}
    >
      {phase !== 'hidden' && (
        <NewChatBackdrop
          phase={phase}
          onExitComplete={props.onBackdropExitComplete}
        />
      )}
      <div className="absolute inset-0 z-[1] flex min-h-0 flex-col">
        <div className="sticky top-0 z-10 mb-1.5 w-full shrink-0 bg-background px-3 pt-2">
          {props.header}
        </div>
        {props.composer !== undefined ? (
          <ComposeStage props={props} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 pb-2 sm:px-4 sm:pb-4">
            <div className="w-full max-w-[800px]">{props.emptyState}</div>
          </div>
        )}
      </div>
    </Root>
  );
}
