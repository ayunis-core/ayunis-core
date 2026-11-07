import { Test } from '@nestjs/testing';
import { EvaluateAcademyAccessUseCase } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.query';
import { AcademyCertificateRequiredError } from 'src/iam/academy-access/application/academy-access.errors';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineAcademyGate } from './routine-academy-gate.service';

describe('RoutineAcademyGate', () => {
  let gate: RoutineAcademyGate;
  const evaluateAcademyAccess = { execute: jest.fn() };

  const evaluation = (allowed: boolean) => ({
    mode: AcademyAccessMode.REQUIRED_ANNUALLY,
    required: true,
    allowed,
    completedAt: null,
    expiresAt: null,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RoutineAcademyGate,
        {
          provide: EvaluateAcademyAccessUseCase,
          useValue: evaluateAcademyAccess,
        },
      ],
    }).compile();
    gate = module.get(RoutineAcademyGate);
  });

  it("admits the owner when their organization's academy rule allows them", async () => {
    evaluateAcademyAccess.execute.mockResolvedValue(evaluation(true));

    await expect(
      gate.admit(TEST_USER_ID, TEST_ORG_ID),
    ).resolves.toBeUndefined();
    expect(evaluateAcademyAccess.execute).toHaveBeenCalledWith(
      new EvaluateAcademyAccessQuery(TEST_USER_ID, TEST_ORG_ID),
    );
  });

  it('refuses an owner without the required academy certificate, as chat does', async () => {
    evaluateAcademyAccess.execute.mockResolvedValue(evaluation(false));

    await expect(gate.admit(TEST_USER_ID, TEST_ORG_ID)).rejects.toThrow(
      AcademyCertificateRequiredError,
    );
  });
});
