import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ToolApprovalBrokerService } from 'src/domain/runs/application/services/tool-approval-broker.service';
import { ToolApprovalNotFoundError } from 'src/domain/runs/application/runs.errors';
import { DecideToolApprovalCommand } from './decide-tool-approval.command';
import { DecideToolApprovalUseCase } from './decide-tool-approval.use-case';

describe('DecideToolApprovalUseCase', () => {
  const owner = randomUUID();
  const orgId = randomUUID();
  const threadId = randomUUID();
  let broker: ToolApprovalBrokerService;

  function useCaseAs(userId: string | undefined): DecideToolApprovalUseCase {
    const context = {
      get: jest.fn((key: string) => (key === 'userId' ? userId : orgId)),
    } as unknown as ContextService;
    return new DecideToolApprovalUseCase(broker, context);
  }

  beforeEach(() => {
    broker = new ToolApprovalBrokerService();
  });

  it('settles the owner pending call', async () => {
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-1',
      userId: owner,
    });

    await useCaseAs(owner).execute(
      new DecideToolApprovalCommand(threadId, 'call-1', 'approved'),
    );

    await expect(pending).resolves.toBe('approved');
  });

  it('does not let another user decide and keeps the call pending', async () => {
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-2',
      userId: owner,
    });

    await expect(
      useCaseAs(randomUUID()).execute(
        new DecideToolApprovalCommand(threadId, 'call-2', 'approved'),
      ),
    ).rejects.toThrow(ToolApprovalNotFoundError);

    await useCaseAs(owner).execute(
      new DecideToolApprovalCommand(threadId, 'call-2', 'declined'),
    );
    await expect(pending).resolves.toBe('declined');
  });

  it('reports an unknown call', async () => {
    await expect(
      useCaseAs(owner).execute(
        new DecideToolApprovalCommand(threadId, 'nope', 'approved'),
      ),
    ).rejects.toThrow(ToolApprovalNotFoundError);
  });

  it('requires an authenticated user', async () => {
    await expect(
      useCaseAs(undefined).execute(
        new DecideToolApprovalCommand(threadId, 'call-3', 'approved'),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
