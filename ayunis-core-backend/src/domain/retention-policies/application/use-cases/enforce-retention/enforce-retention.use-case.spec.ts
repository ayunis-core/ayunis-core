import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  EnforceRetentionUseCase,
  BATCH_SIZE,
  MAX_BATCHES_PER_ORG,
} from './enforce-retention.use-case';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import { OrgRetentionPolicy } from 'src/domain/retention-policies/domain/org-retention-policy.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { DeleteThreadUseCase } from 'src/domain/threads/application/use-cases/delete-thread/delete-thread.use-case';
import {
  FindExpiredThreadRefsByOrgUseCase,
  type ExpiredThreadRef,
} from 'src/domain/threads/application/use-cases/find-expired-thread-refs-by-org/find-expired-thread-refs-by-org.use-case';

describe('EnforceRetentionUseCase', () => {
  let useCase: EnforceRetentionUseCase;
  let retentionRepo: { findAllEnabled: jest.Mock };
  let findExpired: { execute: jest.Mock };
  let deleteThread: { execute: jest.Mock };
  let contextService: { run: jest.Mock; set: jest.Mock };
  let dryRun: boolean;

  const ref = (): ExpiredThreadRef => ({
    id: randomUUID(),
    userId: randomUUID(),
  });

  beforeEach(async () => {
    dryRun = false;
    retentionRepo = { findAllEnabled: jest.fn().mockResolvedValue([]) };
    findExpired = { execute: jest.fn().mockResolvedValue([]) };
    deleteThread = { execute: jest.fn().mockResolvedValue(undefined) };
    contextService = {
      run: jest.fn((cb: () => Promise<void>) => cb()),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnforceRetentionUseCase,
        { provide: RetentionPoliciesRepository, useValue: retentionRepo },
        { provide: FindExpiredThreadRefsByOrgUseCase, useValue: findExpired },
        { provide: DeleteThreadUseCase, useValue: deleteThread },
        { provide: ContextService, useValue: contextService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => dryRun) },
        },
      ],
    }).compile();

    useCase = module.get(EnforceRetentionUseCase);
  });

  it('only processes orgs with an enabled policy', async () => {
    retentionRepo.findAllEnabled.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.orgsProcessed).toBe(0);
    expect(findExpired.execute).not.toHaveBeenCalled();
  });

  it('queries expired threads using the policy cutoff and deletes each one', async () => {
    const orgId = randomUUID();
    const policy = new OrgRetentionPolicy({ orgId, retentionDays: 90 });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    const threads = [ref(), ref()];
    findExpired.execute.mockResolvedValueOnce(threads).mockResolvedValue([]);

    const result = await useCase.execute();

    // Cutoff is ~90 days before now.
    const query = findExpired.execute.mock.calls[0][0];
    expect(query.orgId).toBe(orgId);
    const ageDays =
      (Date.now() - query.activeBefore.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(ageDays)).toBe(90);

    expect(deleteThread.execute).toHaveBeenCalledTimes(2);
    expect(contextService.set).toHaveBeenCalledWith(
      'userId',
      threads[0].userId,
    );
    expect(result.totalDeleted).toBe(2);
    expect(result.perOrg[0].deleted).toBe(2);
  });

  it('continues past a thread that fails to delete and counts the failure', async () => {
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 30,
    });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    findExpired.execute
      .mockResolvedValueOnce([ref(), ref()])
      .mockResolvedValue([]);
    deleteThread.execute
      .mockRejectedValueOnce(new Error('storage down'))
      .mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result.totalDeleted).toBe(1);
    expect(result.totalFailed).toBe(1);
  });

  it('in dry-run, counts candidates without deleting anything', async () => {
    dryRun = true;
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 365,
    });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    findExpired.execute
      .mockResolvedValueOnce([ref(), ref(), ref()])
      .mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.dryRun).toBe(true);
    expect(deleteThread.execute).not.toHaveBeenCalled();
    expect(result.perOrg[0].scanned).toBe(3);
    expect(result.totalDeleted).toBe(0);
  });

  it('flags capReached when expired threads remain after the batch cap', async () => {
    // Dry-run so each page is only counted (no per-thread deletes), keeping the
    // cap-sized loop cheap while still exercising the cap path. Every fetch —
    // including the post-cap probe — returns a full page, so work remains.
    dryRun = true;
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 90,
    });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    findExpired.execute.mockResolvedValue(
      Array.from({ length: BATCH_SIZE }, ref),
    );

    const result = await useCase.execute();

    expect(result.perOrg[0].capReached).toBe(true);
  });

  it('does not flag capReached when an org drains exactly on the cap boundary', async () => {
    dryRun = true;
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 90,
    });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    // Exactly MAX_BATCHES_PER_ORG full pages, then the confirming probe (the
    // next fetch) finds nothing — the org is drained, not truncated.
    let calls = 0;
    findExpired.execute.mockImplementation(() => {
      calls += 1;
      const drained = calls > MAX_BATCHES_PER_ORG;
      return Promise.resolve(
        drained ? [] : Array.from({ length: BATCH_SIZE }, ref),
      );
    });

    const result = await useCase.execute();

    expect(result.perOrg[0].capReached).toBe(false);
  });

  it('advances the paging offset past threads that failed to delete', async () => {
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 90,
    });
    retentionRepo.findAllEnabled.mockResolvedValue([policy]);
    // A full page (100) forces a second fetch; first thread fails, rest succeed.
    const fullPage = Array.from({ length: 100 }, ref);
    findExpired.execute.mockResolvedValueOnce(fullPage).mockResolvedValue([]);
    deleteThread.execute
      .mockRejectedValueOnce(new Error('locked'))
      .mockResolvedValue(undefined);

    const result = await useCase.execute();

    // Second page must skip exactly the one failed (sticky) thread.
    const secondQuery = findExpired.execute.mock.calls[1][0];
    expect(secondQuery.offset).toBe(1);
    expect(result.totalDeleted).toBe(99);
    expect(result.totalFailed).toBe(1);
  });
});
