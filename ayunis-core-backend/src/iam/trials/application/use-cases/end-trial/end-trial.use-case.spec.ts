import { randomUUID } from 'crypto';
import { EndTrialUseCase } from './end-trial.use-case';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import type { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';

describe('Ending a free trial after a paid subscription arrives', () => {
  const orgId = randomUUID();
  let stored: Trial | null;
  let useCase: EndTrialUseCase;

  beforeEach(() => {
    stored = new Trial({ orgId, messagesSent: 7, maxMessages: 100 });
    useCase = new EndTrialUseCase({
      endRemainingAllowance: async () => {
        if (!stored || stored.messagesSent >= stored.maxMessages) return false;
        stored.maxMessages = stored.messagesSent;
        return true;
      },
    } as unknown as TrialRepository);
  });

  it('removes the remaining allowance without inventing usage', async () => {
    expect(await useCase.execute(orgId)).toBe(true);
    expect(stored).toMatchObject({ messagesSent: 7, maxMessages: 7 });
  });

  it('is a no-op for an exhausted trial', async () => {
    await useCase.execute(orgId);
    const before = structuredClone(stored);
    expect(await useCase.execute(orgId)).toBe(false);
    expect(stored).toEqual(before);
  });

  it('does not create a trial for an organization that has none', async () => {
    stored = null;
    expect(await useCase.execute(orgId)).toBe(false);
    expect(stored).toBeNull();
  });
});
