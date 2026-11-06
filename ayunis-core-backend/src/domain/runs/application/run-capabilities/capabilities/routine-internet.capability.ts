import { Injectable } from '@nestjs/common';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { routineOf } from 'src/domain/runs/application/run-capabilities/routine-of.helper';
import { InternetCapability } from './internet.capability';

/** The chat's web tools, only for routines with internet access turned on. */
@Injectable()
export class RoutineInternetCapability implements RunCapability {
  constructor(private readonly internetCapability: InternetCapability) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!routineOf(context).internetEnabled) return {};
    return this.internetCapability.contribute(context);
  }
}
