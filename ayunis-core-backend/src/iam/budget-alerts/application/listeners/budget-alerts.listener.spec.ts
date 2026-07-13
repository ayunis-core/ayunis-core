import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { OrgContextRunner } from 'src/common/context/services/org-context-runner.service';
import { TokensConsumedEvent } from 'src/domain/usage/application/events/tokens-consumed.event';
import { EvaluateBudgetAlertsForOrgUseCase } from '../use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.use-case';
import { BudgetAlertsListener } from './budget-alerts.listener';

const COOLDOWN_MS = 10 * 60 * 1000;

describe('BudgetAlertsListener', () => {
  let listener: BudgetAlertsListener;
  let orgContextRunner: { runForOrg: jest.Mock };
  let evaluateOrg: { execute: jest.Mock };

  const orgA = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgB = '22222222-2222-2222-2222-222222222222' as UUID;

  function tokensConsumed(orgId: UUID | undefined): TokensConsumedEvent {
    return new TokensConsumedEvent(
      undefined,
      undefined,
      orgId,
      'model',
      'provider',
      10,
      20,
    );
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    orgContextRunner = {
      runForOrg: jest.fn((_orgId: UUID, callback: () => Promise<void>) =>
        callback(),
      ),
    };
    evaluateOrg = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAlertsListener,
        { provide: OrgContextRunner, useValue: orgContextRunner },
        { provide: EvaluateBudgetAlertsForOrgUseCase, useValue: evaluateOrg },
      ],
    }).compile();

    listener = module.get(BudgetAlertsListener);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('evaluates the org immediately on the first event', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));

    expect(orgContextRunner.runForOrg).toHaveBeenCalledWith(
      orgA,
      expect.any(Function),
    );
    expect(evaluateOrg.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: orgA }),
    );
  });

  it('defers events during the cooldown to one trailing evaluation', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    expect(evaluateOrg.execute).toHaveBeenCalledTimes(1);

    // The crossing missed inside the window is delivered without any further
    // event — the org may be fully blocked by then.
    await jest.advanceTimersByTimeAsync(COOLDOWN_MS);

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(2);
  });

  it('runs no trailing evaluation when the window stayed quiet', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));

    await jest.advanceTimersByTimeAsync(COOLDOWN_MS * 2);

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(1);
  });

  it('throttles a continuously busy org to one evaluation per window', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await jest.advanceTimersByTimeAsync(COOLDOWN_MS);
    // Event during the trailing window is deferred again.
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    expect(evaluateOrg.execute).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(COOLDOWN_MS);

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(3);
  });

  it('evaluates again immediately once the cooldown has fully elapsed', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await jest.advanceTimersByTimeAsync(COOLDOWN_MS);

    await listener.handleTokensConsumed(tokensConsumed(orgA));

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(2);
  });

  it('tracks cooldowns per org', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await listener.handleTokensConsumed(tokensConsumed(orgB));

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(2);
    expect(evaluateOrg.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ orgId: orgA }),
    );
    expect(evaluateOrg.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ orgId: orgB }),
    );
  });

  it('ignores usage collected without an org context', async () => {
    await listener.handleTokensConsumed(tokensConsumed(undefined));

    await jest.advanceTimersByTimeAsync(COOLDOWN_MS);

    expect(evaluateOrg.execute).not.toHaveBeenCalled();
  });

  it('never rejects when the evaluation fails', async () => {
    evaluateOrg.execute.mockRejectedValue(new Error('boom'));

    await expect(
      listener.handleTokensConsumed(tokensConsumed(orgA)),
    ).resolves.toBeUndefined();
  });

  it('clears pending timers on module destroy', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    await listener.handleTokensConsumed(tokensConsumed(orgA));

    listener.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(COOLDOWN_MS * 2);

    expect(evaluateOrg.execute).toHaveBeenCalledTimes(1);
  });

  it('never rejects when the trailing evaluation fails', async () => {
    await listener.handleTokensConsumed(tokensConsumed(orgA));
    evaluateOrg.execute.mockRejectedValue(new Error('boom'));
    await listener.handleTokensConsumed(tokensConsumed(orgA));

    await expect(
      jest.advanceTimersByTimeAsync(COOLDOWN_MS),
    ).resolves.not.toThrow();
    expect(evaluateOrg.execute).toHaveBeenCalledTimes(2);
  });
});
