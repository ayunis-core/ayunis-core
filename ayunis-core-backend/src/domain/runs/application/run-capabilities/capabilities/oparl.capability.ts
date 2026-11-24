import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import { FindLinkedOparlBodiesQuery } from 'src/domain/oparl/application/use-cases/find-linked-oparl-bodies/find-linked-oparl-bodies.query';
import { FindLinkedOparlBodiesUseCase } from 'src/domain/oparl/application/use-cases/find-linked-oparl-bodies/find-linked-oparl-bodies.use-case';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { OparlToolScope } from 'src/domain/tools/domain/tools/oparl-tool-scope';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

const OPARL_TOOLS = [
  ToolType.OPARL_SEARCH,
  ToolType.OPARL_GET,
  ToolType.OPARL_READ_FILE,
  ToolType.OPARL_LIST,
] as const;

/**
 * The council information tools in every chat of an org that linked at
 * least one OParl body. Also in anonymous runs: the data is public and its
 * results are not anonymized.
 */
@Injectable()
export class OparlCapability implements RunCapability {
  constructor(
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly configService: ConfigService,
    private readonly findLinkedBodies: FindLinkedOparlBodiesUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Oparl}`)) {
      return {};
    }
    const bodies = await this.findLinkedBodies.execute(
      new FindLinkedOparlBodiesQuery(context.orgId),
    );
    if (bodies.length === 0) return {};
    const tools = await assembleTools(
      this.assembleToolUseCase,
      OPARL_TOOLS,
      new OparlToolScope(
        bodies.map(({ id, name, systemName }) => ({ id, name, systemName })),
      ),
    );
    return { tools };
  }
}
