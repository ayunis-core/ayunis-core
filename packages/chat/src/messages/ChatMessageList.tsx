import { Fragment, type ReactNode } from 'react';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';

type Message = GetThreadResponseDto['messages'][number];

type UserUnit = {
  readonly kind: 'user';
  readonly key: string;
  readonly message: Message;
};
type AssistantUnit = { readonly kind: 'agent-run'; readonly key: string };

interface ChatMessageListProps<Run extends AssistantUnit> {
  readonly units: readonly (UserUnit | Run)[];
  readonly pendingSubmission: string | null;
  readonly contextHint: ReactNode;
  readonly loading?: ReactNode;
  readonly waiting?: ReactNode;
  readonly renderUser: (message: Message) => ReactNode;
  readonly renderRun: (run: Run, grouped: boolean) => ReactNode;
}

export function ChatMessageList<Run extends AssistantUnit>({
  units,
  pendingSubmission,
  contextHint,
  loading,
  waiting,
  renderUser,
  renderRun,
}: ChatMessageListProps<Run>) {
  const firstUser = units.findIndex((unit) => unit.kind === 'user');

  return (
    <div className="p-4 pb-8">
      {units.map((unit, index) => (
        <Fragment key={unit.key}>
          {unit.kind === 'user' ? (
            <>
              {index === firstUser && contextHint}
              {renderUser(unit.message)}
            </>
          ) : (
            renderRun(unit, units[index - 1]?.kind === 'agent-run')
          )}
        </Fragment>
      ))}
      {pendingSubmission !== null && (
        <>
          {firstUser === -1 && contextHint}
          <div data-testid="pending-user-message">
            {renderUser(makePendingUserMessage(pendingSubmission))}
          </div>
        </>
      )}
      {waiting && <div className="mt-4 max-w-2xl">{waiting}</div>}
      {loading}
    </div>
  );
}

function makePendingUserMessage(text: string): Message {
  return {
    id: 'pending-user-message',
    role: 'user',
    content: [{ type: 'text', text }],
    createdAt: new Date().toISOString(),
  } as unknown as Message;
}
