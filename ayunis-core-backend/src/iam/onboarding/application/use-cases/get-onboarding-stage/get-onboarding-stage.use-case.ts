import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import type { ReservedMemoryKey } from 'src/domain/memory/domain/memory.constants';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { isMemoryAvailable } from 'src/domain/models/domain/permitted-model.entity';
import { HasPersonalSkillUseCase } from 'src/domain/skills/application/use-cases/has-personal-skill/has-personal-skill.use-case';
import { OnboardingUnexpectedError } from 'src/iam/onboarding/application/onboarding.errors';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { OnboardingStageResult } from './onboarding-stage-result';

const PERSONAL_MEMORY_KEY: ReservedMemoryKey = 'personal';
const NO_STAGE: OnboardingStageResult = { stage: null, modelId: null };

/**
 * Which onboarding hint the user should see, worked out afresh on every
 * request: `profile` while their `personal` memory is empty and a model with
 * memory and tools is available to them, then `first_skill` until they own a
 * personal skill, provided they may create one. Without memory there is no
 * hint.
 */
@Injectable()
export class GetOnboardingStageUseCase {
  private readonly logger = new Logger(GetOnboardingStageUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
    private readonly findUserMemoryUseCase: FindUserMemoryUseCase,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly hasPersonalSkillUseCase: HasPersonalSkillUseCase,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(): Promise<OnboardingStageResult> {
    const user = getRequiredUserContext(this.contextService);
    this.logger.log({ userId: user.userId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Memory}`)) {
      return NO_STAGE;
    }
    if (!(await this.hasPersonalMemory())) {
      return this.profileStage(user);
    }
    return (await this.isFirstSkillPending(user))
      ? { stage: OnboardingStage.FIRST_SKILL, modelId: null }
      : NO_STAGE;
  }

  private async hasPersonalMemory(): Promise<boolean> {
    const entries = await this.findUserMemoryUseCase.execute();
    return entries.some(
      (entry) =>
        entry.key === PERSONAL_MEMORY_KEY && entry.content.trim() !== '',
    );
  }

  private async profileStage(
    user: UserContext,
  ): Promise<OnboardingStageResult> {
    const modelId = await this.findProfileModelId(user);
    return modelId ? { stage: OnboardingStage.PROFILE, modelId } : NO_STAGE;
  }

  /**
   * The user's default model if it qualifies, else the first one that does.
   * A profile chat records the profile with `set_memory`, so the model needs
   * tools as well as memory; the run gives it no onboarding instructions
   * otherwise.
   */
  private async findProfileModelId({
    userId,
    orgId,
  }: UserContext): Promise<UUID | null> {
    const { models } = await this.getEffectiveLanguageModelsUseCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );
    const qualifying = models
      .filter((permit) => isMemoryAvailable(permit) && permit.model.canUseTools)
      .sort((a, b) => a.model.name.localeCompare(b.model.name));
    if (qualifying.length === 0) return null;
    // A model with memory is never anonymous-only, so a default exists.
    const defaultModel = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({ orgId, userId, excludeAnonymousOnly: true }),
    );
    const chosen =
      qualifying.find((permit) => permit.id === defaultModel.id) ??
      qualifying[0];
    return chosen.id;
  }

  private async isFirstSkillPending({
    orgId,
    role,
  }: UserContext): Promise<boolean> {
    const mayCreateSkills = await this.hasPermissionUseCase.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_SKILLS),
    );
    if (!mayCreateSkills) return false;
    return !(await this.hasPersonalSkillUseCase.execute());
  }
}
