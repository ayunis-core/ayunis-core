import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import { EvaluateAcademyAccessUseCase } from './evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from './evaluate-academy-access.query';
import { GetOrgAcademyAccessSettingsUseCase } from '../get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { IsAddonActiveUseCase } from 'src/iam/addons/application/use-cases/is-addon-active/is-addon-active.use-case';
import { GetAcademyCompletionUseCase } from 'src/domain/academy/application/use-cases/get-academy-completion/get-academy-completion.use-case';
import { OrgAcademyAccessSettings } from '../../../domain/org-academy-access-settings.entity';
import { AcademyAccessMode } from '../../../domain/value-objects/academy-access-mode.enum';

describe('EvaluateAcademyAccessUseCase', () => {
  let useCase: EvaluateAcademyAccessUseCase;
  let getOrgSettingsUseCase: jest.Mocked<GetOrgAcademyAccessSettingsUseCase>;
  let isAddonActiveUseCase: jest.Mocked<IsAddonActiveUseCase>;
  let getAcademyCompletionUseCase: jest.Mocked<GetAcademyCompletionUseCase>;

  const userId = randomUUID();
  const orgId = randomUUID();

  const HOUR_MS = 60 * 60 * 1000;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateAcademyAccessUseCase,
        {
          provide: getLoggerToken(EvaluateAcademyAccessUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        {
          provide: GetOrgAcademyAccessSettingsUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IsAddonActiveUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetAcademyCompletionUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(EvaluateAcademyAccessUseCase);
    getOrgSettingsUseCase = module.get(GetOrgAcademyAccessSettingsUseCase);
    isAddonActiveUseCase = module.get(IsAddonActiveUseCase);
    getAcademyCompletionUseCase = module.get(GetAcademyCompletionUseCase);

    isAddonActiveUseCase.execute.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  function withMode(mode: AcademyAccessMode): void {
    getOrgSettingsUseCase.execute.mockResolvedValue(
      new OrgAcademyAccessSettings({ orgId, mode }),
    );
  }

  function withCompletion(completedAt: Date | null, expiresAt: Date | null) {
    getAcademyCompletionUseCase.execute.mockResolvedValue({
      completedAt,
      expiresAt,
    });
  }

  function evaluate() {
    return useCase.execute(new EvaluateAcademyAccessQuery(userId, orgId));
  }

  describe('unrestricted', () => {
    beforeEach(() => withMode(AcademyAccessMode.UNRESTRICTED));

    it('allows without applying the gate', async () => {
      await expect(evaluate()).resolves.toEqual({
        mode: AcademyAccessMode.UNRESTRICTED,
        required: false,
        allowed: true,
        completedAt: null,
        expiresAt: null,
      });
    });

    // The default org pays one indexed lookup per gated request and no more —
    // this is what keeps the guard affordable on the hot path.
    it('short-circuits before the add-on and completion lookups', async () => {
      await evaluate();

      expect(isAddonActiveUseCase.execute).not.toHaveBeenCalled();
      expect(getAcademyCompletionUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('add-on inactive', () => {
    it('fails open, because the org cannot take the certificate at all', async () => {
      withMode(AcademyAccessMode.REQUIRED_ONCE);
      isAddonActiveUseCase.execute.mockResolvedValue(false);

      const result = await evaluate();

      expect(result.allowed).toBe(true);
      expect(result.required).toBe(false);
      expect(getAcademyCompletionUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('required once', () => {
    beforeEach(() => withMode(AcademyAccessMode.REQUIRED_ONCE));

    it('denies a user who never completed the academy', async () => {
      withCompletion(null, null);

      const result = await evaluate();

      expect(result).toEqual({
        mode: AcademyAccessMode.REQUIRED_ONCE,
        required: true,
        allowed: false,
        completedAt: null,
        expiresAt: null,
      });
    });

    it('allows a long-expired completion, since the pass is permanent', async () => {
      const completedAt = new Date(Date.now() - 5000 * HOUR_MS);
      withCompletion(completedAt, new Date(Date.now() - HOUR_MS));

      const result = await evaluate();

      expect(result.allowed).toBe(true);
      // Surfacing an expiry here would imply a deadline this mode does not have.
      expect(result.expiresAt).toBeNull();
      expect(result.completedAt).toEqual(completedAt);
    });
  });

  describe('required annually', () => {
    beforeEach(() => withMode(AcademyAccessMode.REQUIRED_ANNUALLY));

    it('denies a user who never completed the academy', async () => {
      withCompletion(null, null);

      const result = await evaluate();

      expect(result.allowed).toBe(false);
      expect(result.expiresAt).toBeNull();
    });

    it('allows a completion that has not expired yet', async () => {
      const expiresAt = new Date(Date.now() + HOUR_MS);
      withCompletion(new Date(Date.now() - HOUR_MS), expiresAt);

      const result = await evaluate();

      expect(result.allowed).toBe(true);
      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('denies an expired completion and reports when it lapsed', async () => {
      const expiresAt = new Date(Date.now() - HOUR_MS);
      withCompletion(new Date(Date.now() - 5000 * HOUR_MS), expiresAt);

      const result = await evaluate();

      expect(result.allowed).toBe(false);
      expect(result.required).toBe(true);
      expect(result.expiresAt).toEqual(expiresAt);
    });
  });
});
