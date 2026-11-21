import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import { loadToolsHints } from 'src/domain/runs/application/run-capabilities/load-tools-hint.helper';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  FEATURE_GUIDES,
  type FeatureGuide,
} from 'src/domain/runs/application/run-capabilities/capabilities/feature-guides';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';

/**
 * Explains the feature whose empty page a feature-guide chat was started from
 * and leads the user into setting it up. It offers only the tools contributed
 * before it, offered or loadable, so it must come after the skill management
 * and routines capabilities. Those capabilities already withhold tools the user's role may
 * not use, so the create permission only decides what replaces the pointer to
 * the page's create button.
 */
@Injectable()
export class FeatureGuideCapability implements RunCapability {
  readonly id = 'feature_guide';
  readonly description =
    'Guidance for chats started from an empty feature page.';

  constructor(
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): Promise<CapabilityContribution> {
    const { origin } = context.thread;
    if (origin.kind !== ThreadOriginKind.FEATURE_GUIDE) return {};
    const guide = FEATURE_GUIDES[origin.feature];
    if (!this.isEnabled(guide)) return {};
    const mayCreate = await this.mayCreate(context, guide);
    const content = renderGuide(guide, nextStep(guide, mayCreate, state));
    return { sections: [{ slot: PromptSlot.RESOURCES, content }] };
  }

  private isEnabled(guide: FeatureGuide): boolean {
    return (
      !guide.flag ||
      Boolean(this.configService.get<boolean>(`features.${guide.flag}`))
    );
  }

  private mayCreate(
    context: RunCapabilityContext,
    guide: FeatureGuide,
  ): Promise<boolean> {
    if (!guide.createPermission) return Promise.resolve(true);
    const { role } = getRequiredUserContext(this.contextService);
    return this.hasPermissionUseCase.execute(
      new HasPermissionQuery(
        context.orgId,
        role,
        guide.createPermission.permission,
      ),
    );
  }
}

function nextStep(
  guide: FeatureGuide,
  mayCreate: boolean,
  state: CapabilityAssemblyState,
): string {
  const usable = guide.toolOffers.filter(({ tool }) =>
    state.reservedToolNames.has(tool),
  );
  const offers = [
    ...usable.map(({ offer }) => offer),
    ...loadToolsHints(
      state,
      usable.map(({ tool }) => tool),
    ),
  ];
  if (!mayCreate && guide.createPermission) {
    return [...offers, guide.createPermission.otherwise].join('\n');
  }
  return offers.length > 0 ? offers.join('\n') : guide.uiNextStep;
}

function renderGuide(guide: FeatureGuide, next: string): string {
  const help = guide.helpPath
    ? `\n- For details, link the help center article: https://help.ayunis.com/de/${guide.helpPath} in a German conversation, https://help.ayunis.com/en/${guide.helpPath} in any other language.`
    : '';
  return `<feature_guide>
The user started this chat from the empty ${guide.page} page in Ayunis Core: they have no ${guide.plural} yet and want to learn how ${guide.plural} work. Reply in the user's language.
- Explain briefly and concretely what ${guide.plural} are, how they work and where to set them up, based on the facts below. UI labels are given as "English" / "German"; quote the one matching the conversation language exactly.
- Then lead them towards trying it: ask what they would like to use ${guide.plural} for, and once they tell you, suggest a concrete first step tailored to that, as described under next step.
- Keep it short and practical: a few sentences and the steps, not a manual. Answer follow-up questions without repeating the whole explanation.
- Stick to the facts below. If the user asks about something they don't cover, say so instead of guessing.${help}

<facts>
${guide.facts}
</facts>

<next_step>
${next}
</next_step>
</feature_guide>`;
}
