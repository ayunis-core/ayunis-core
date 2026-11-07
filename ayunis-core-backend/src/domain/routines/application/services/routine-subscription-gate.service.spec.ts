import { Test } from '@nestjs/testing';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { GetTrialUseCase } from 'src/iam/trials/application/use-cases/get-trial/get-trial.use-case';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { TrialNotFoundError } from 'src/iam/trials/application/trial.errors';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { RoutineSubscriptionRequiredError } from 'src/domain/routines/application/routines.errors';
import { TEST_ORG_ID } from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineSubscriptionGate } from './routine-subscription-gate.service';

describe('RoutineSubscriptionGate', () => {
  let gate: RoutineSubscriptionGate;
  const hasActiveSubscription = { execute: jest.fn() };
  const getTrial = { execute: jest.fn() };
  const incrementTrialMessages = { execute: jest.fn() };

  const trial = (messagesSent: number, maxMessages = 10) =>
    new Trial({ orgId: TEST_ORG_ID, messagesSent, maxMessages });

  beforeEach(async () => {
    jest.resetAllMocks();
    incrementTrialMessages.execute.mockResolvedValue(trial(1));
    const module = await Test.createTestingModule({
      providers: [
        RoutineSubscriptionGate,
        {
          provide: HasActiveSubscriptionUseCase,
          useValue: hasActiveSubscription,
        },
        { provide: GetTrialUseCase, useValue: getTrial },
        {
          provide: IncrementTrialMessagesUseCase,
          useValue: incrementTrialMessages,
        },
      ],
    }).compile();
    gate = module.get(RoutineSubscriptionGate);
  });

  it('admits an organization with an active subscription without touching the trial', async () => {
    hasActiveSubscription.execute.mockResolvedValue({
      hasActiveSubscription: true,
    });

    await gate.admit(TEST_ORG_ID);

    expect(getTrial.execute).not.toHaveBeenCalled();
    expect(incrementTrialMessages.execute).not.toHaveBeenCalled();
  });

  it('consumes one trial message when a trial still has messages left', async () => {
    hasActiveSubscription.execute.mockResolvedValue({
      hasActiveSubscription: false,
    });
    getTrial.execute.mockResolvedValue(trial(9));

    await gate.admit(TEST_ORG_ID);

    expect(incrementTrialMessages.execute).toHaveBeenCalledTimes(1);
    expect(incrementTrialMessages.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: TEST_ORG_ID }),
    );
  });

  it('still admits the run when counting the trial message fails', async () => {
    hasActiveSubscription.execute.mockResolvedValue({
      hasActiveSubscription: false,
    });
    getTrial.execute.mockResolvedValue(trial(3));
    incrementTrialMessages.execute.mockRejectedValue(new Error('db down'));

    await expect(gate.admit(TEST_ORG_ID)).resolves.toBeUndefined();
  });

  it('rejects an organization whose trial is used up', async () => {
    hasActiveSubscription.execute.mockResolvedValue({
      hasActiveSubscription: false,
    });
    getTrial.execute.mockResolvedValue(trial(10));

    await expect(gate.admit(TEST_ORG_ID)).rejects.toThrow(
      RoutineSubscriptionRequiredError,
    );
    expect(incrementTrialMessages.execute).not.toHaveBeenCalled();
  });

  it('rejects an organization with neither subscription nor trial', async () => {
    hasActiveSubscription.execute.mockResolvedValue({
      hasActiveSubscription: false,
    });
    getTrial.execute.mockRejectedValue(new TrialNotFoundError(TEST_ORG_ID));

    await expect(gate.admit(TEST_ORG_ID)).rejects.toThrow(
      RoutineSubscriptionRequiredError,
    );
  });
});
