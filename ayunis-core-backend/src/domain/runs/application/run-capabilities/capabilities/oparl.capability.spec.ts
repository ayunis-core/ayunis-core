import type { UUID } from 'crypto';
import {
  TEST_ORG_ID,
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { OparlCapability } from './oparl.capability';

const MUSTERSTADT = {
  id: '33333333-3333-4333-8333-333333333333' as UUID,
  name: 'Gemeinde Musterstadt',
  systemName: 'Ratsinfo Musterstadt',
};

describe('OparlCapability', () => {
  function capability(
    options: { enabled?: boolean; linked?: (typeof MUSTERSTADT)[] } = {},
  ) {
    const findLinkedBodies = {
      execute: jest.fn().mockResolvedValue(options.linked ?? [MUSTERSTADT]),
    };
    return {
      findLinkedBodies,
      capability: new OparlCapability(
        createAssembleToolUseCase(),
        { get: () => options.enabled ?? true } as never,
        findLinkedBodies as never,
      ),
    };
  }

  it('offers the four council tools in a chat of an org with a linked body, naming the body, also in anonymous runs and without anonymizing their results', async () => {
    const { capability: oparl, findLinkedBodies } = capability();

    const contribution = await oparl.contribute(
      aCapabilityContext({ isAnonymous: true }),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.OPARL_SEARCH,
      ToolType.OPARL_GET,
      ToolType.OPARL_READ_FILE,
      ToolType.OPARL_LIST,
    ]);
    expect(contribution.tools?.[0].description).toContain(
      `Gemeinde Musterstadt (bodyId ${MUSTERSTADT.id}, Ratsinfo Musterstadt)`,
    );
    expect(contribution.tools?.every((tool) => !tool.returnsPii)).toBe(true);
    expect(findLinkedBodies.execute).toHaveBeenCalledWith({
      orgId: TEST_ORG_ID,
    });
  });

  it('offers nothing to an org without linked bodies', async () => {
    const { capability: oparl } = capability({ linked: [] });

    expect(toolNames(await oparl.contribute(aCapabilityContext()))).toEqual([]);
  });

  it('offers nothing with OParl turned off, without looking up links', async () => {
    const { capability: oparl, findLinkedBodies } = capability({
      enabled: false,
    });

    expect(toolNames(await oparl.contribute(aCapabilityContext()))).toEqual([]);
    expect(findLinkedBodies.execute).not.toHaveBeenCalled();
  });

  it('offers nothing to a model that cannot use tools', async () => {
    const { capability: oparl } = capability();

    const contribution = await oparl.contribute(
      aCapabilityContext({ canUseTools: false }),
    );

    expect(toolNames(contribution)).toEqual([]);
  });
});
