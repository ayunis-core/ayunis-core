import { Injectable } from '@nestjs/common';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { routineOf } from 'src/domain/runs/application/run-capabilities/routine-of.helper';
import { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';
import { InternetCapability } from './internet.capability';

/**
 * The chat's web tools, only for routines with internet access turned on, and
 * limited to the routine's allowed domains when it has them.
 */
@Injectable()
export class RoutineInternetCapability implements RunCapability {
  constructor(private readonly internetCapability: InternetCapability) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    const routine = routineOf(context);
    if (!routine.internetEnabled) return {};
    return this.internetCapability.contributeWebTools(
      context,
      routine.allowedDomains && new AllowedDomains(routine.allowedDomains),
    );
  }
}
