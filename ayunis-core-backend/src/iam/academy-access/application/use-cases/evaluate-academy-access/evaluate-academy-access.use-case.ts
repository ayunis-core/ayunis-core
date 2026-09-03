import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { IsAddonActiveUseCase } from 'src/iam/addons/application/use-cases/is-addon-active/is-addon-active.use-case';
import { IsAddonActiveQuery } from 'src/iam/addons/application/use-cases/is-addon-active/is-addon-active.query';
import { GetAcademyCompletionUseCase } from 'src/domain/academy/application/use-cases/get-academy-completion/get-academy-completion.use-case';
import { GetAcademyCompletionQuery } from 'src/domain/academy/application/use-cases/get-academy-completion/get-academy-completion.query';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { EvaluateAcademyAccessQuery } from './evaluate-academy-access.query';

export interface AcademyAccessEvaluation {
  readonly mode: AcademyAccessMode;
  /** Whether the gate applies at all — false for unrestricted orgs and orgs without the add-on. */
  readonly required: boolean;
  readonly allowed: boolean;
  readonly completedAt: Date | null;
  readonly expiresAt: Date | null;
}

@Injectable()
export class EvaluateAcademyAccessUseCase {
  private readonly logger = new Logger(EvaluateAcademyAccessUseCase.name);

  constructor(
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly isAddonActiveUseCase: IsAddonActiveUseCase,
    private readonly getAcademyCompletionUseCase: GetAcademyCompletionUseCase,
  ) {}

  /**
   * Runs on every gated request, so the checks are ordered cheapest-first and
   * short-circuit: an unrestricted org — the default — costs a single indexed
   * lookup and never touches the add-on or completion tables.
   */
  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: EvaluateAcademyAccessQuery,
  ): Promise<AcademyAccessEvaluation> {
    const settings = await this.getOrgSettingsUseCase.execute(
      new GetOrgAcademyAccessSettingsQuery(query.orgId),
    );
    if (settings.mode === AcademyAccessMode.UNRESTRICTED) {
      return this.ungated(settings.mode);
    }

    // An org without the academy add-on cannot take the certificate at all, so
    // gating on it would lock them out with no way forward.
    const addonActive = await this.isAddonActiveUseCase.execute(
      new IsAddonActiveQuery(query.orgId, AddonType.AYUNIS_CORE_ACADEMY),
    );
    if (!addonActive) {
      this.logger.warn(
        {
          orgId: query.orgId,
          mode: settings.mode,
        },
        'Academy gate configured but add-on inactive',
      );
      return this.ungated(settings.mode);
    }

    return this.evaluateCompletion(settings.mode, query.userId);
  }

  private async evaluateCompletion(
    mode: AcademyAccessMode,
    userId: UUID,
  ): Promise<AcademyAccessEvaluation> {
    const { completedAt, expiresAt } =
      await this.getAcademyCompletionUseCase.execute(
        new GetAcademyCompletionQuery({ userId }),
      );

    const annual = mode === AcademyAccessMode.REQUIRED_ANNUALLY;
    const allowed =
      completedAt !== null &&
      (!annual || (expiresAt !== null && expiresAt.getTime() > Date.now()));

    return {
      mode,
      required: true,
      allowed,
      completedAt,
      // Only annual orgs act on expiry; surfacing it elsewhere would suggest a
      // deadline that does not exist.
      expiresAt: annual ? expiresAt : null,
    };
  }

  private ungated(mode: AcademyAccessMode): AcademyAccessEvaluation {
    return {
      mode,
      required: false,
      allowed: true,
      completedAt: null,
      expiresAt: null,
    };
  }
}
