import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { RunNoModelFoundError } from 'src/domain/runs/application/runs.errors';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import { EffectiveRunModelResolverService } from './effective-run-model-resolver.service';
import {
  PersonalContextAccessService,
  type PersonalContextAccess,
} from './personal-context-access.service';

export interface AdmittedRunModel {
  readonly model: LanguageModel;
  readonly isAnonymous: boolean;
  readonly personalContext: PersonalContextAccess;
}

/**
 * Admits the thread's model for one run: the user's current effective grant
 * of it, the fair-use preflight, and what that grant allows the run.
 */
@Injectable()
export class RunModelAdmissionService {
  constructor(
    private readonly effectiveRunModelResolver: EffectiveRunModelResolverService,
    private readonly inferenceAdmissionGuard: InferenceAdmissionGuard,
    private readonly personalContextAccess: PersonalContextAccessService,
  ) {}

  async admit(
    thread: Thread,
    profile: RunProfileInput,
    { userId, orgId }: { userId: UUID; orgId: UUID },
  ): Promise<AdmittedRunModel> {
    const storedPermit = thread.model;
    if (!storedPermit) {
      throw new RunNoModelFoundError({ threadId: thread.id });
    }
    const permit = await this.effectiveRunModelResolver.resolve({
      storedPermit,
      userId,
      orgId,
    });
    await this.inferenceAdmissionGuard.preflight(
      { userId, orgId },
      permit.model,
    );
    const isAnonymous = thread.isAnonymous || permit.anonymousOnly;
    return {
      model: permit.model,
      isAnonymous,
      personalContext: this.personalContextAccess.resolve({
        profile,
        isAnonymous,
        permit,
      }),
    };
  }
}
