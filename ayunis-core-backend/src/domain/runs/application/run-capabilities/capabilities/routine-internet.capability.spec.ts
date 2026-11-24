import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import type { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { InternetCapability } from './internet.capability';
import { RoutineInternetCapability } from './routine-internet.capability';

function buildCapability(orgAllowsInternet: boolean) {
  const getOrgChatSettings = jest
    .fn()
    .mockResolvedValue({ internetSearchEnabled: orgAllowsInternet });
  const capability = new RoutineInternetCapability(
    new InternetCapability(
      { execute: getOrgChatSettings } as never,
      { get: () => true } as never,
      createAssembleToolUseCase(),
    ),
  );
  return { capability, getOrgChatSettings };
}

const routineRun = (internetEnabled: boolean) =>
  aCapabilityContext({
    profile: {
      id: 'routine',
      routine: { name: 'Verkündungsplattform prüfen', internetEnabled },
    },
  });

describe('RoutineInternetCapability', () => {
  it('offers website content and internet search when the routine and the org allow internet access', async () => {
    const { capability } = buildCapability(true);

    expect(toolNames(await capability.contribute(routineRun(true)))).toEqual([
      ToolType.WEBSITE_CONTENT,
      ToolType.INTERNET_SEARCH,
    ]);
  });

  it('offers no web tools when the routine has internet access turned off', async () => {
    const { capability, getOrgChatSettings } = buildCapability(true);

    expect(toolNames(await capability.contribute(routineRun(false)))).toEqual(
      [],
    );
    expect(getOrgChatSettings).not.toHaveBeenCalled();
  });

  it('offers no web tools when the org disabled internet access, even if the routine allows it', async () => {
    const { capability } = buildCapability(false);

    expect(toolNames(await capability.contribute(routineRun(true)))).toEqual(
      [],
    );
  });

  describe('with allowed domains', () => {
    const allowlistRun = aCapabilityContext({
      profile: {
        id: 'routine',
        routine: {
          name: 'Verkündungsplattform prüfen',
          internetEnabled: true,
          allowedDomains: ['nrw.de', 'bund.de'],
        },
      },
    });

    it('limits both web tools to the allowed domains', async () => {
      const { capability } = buildCapability(true);

      const { tools = [] } = await capability.contribute(allowlistRun);

      expect(
        tools.map((tool) => [
          tool.name,
          (tool as WebsiteContentTool | InternetSearchTool).allowedDomains
            ?.entries,
        ]),
      ).toEqual([
        [ToolType.WEBSITE_CONTENT, ['nrw.de', 'bund.de']],
        [ToolType.INTERNET_SEARCH, ['nrw.de', 'bund.de']],
      ]);
    });

    it('names the allowed domains in the instructions', async () => {
      const { capability } = buildCapability(true);

      const [policy] = sectionsIn(
        await capability.contribute(allowlistRun),
        PromptSlot.POLICIES,
      );

      expect(policy).toContain('nrw.de, bund.de');
    });

    it('offers no web tools and no instructions when the org disabled internet access', async () => {
      const { capability } = buildCapability(false);

      expect(await capability.contribute(allowlistRun)).toEqual({});
    });
  });

  it('leaves the web tools unrestricted and adds no instructions without allowed domains', async () => {
    const { capability } = buildCapability(true);

    const contribution = await capability.contribute(routineRun(true));

    expect(contribution.sections).toBeUndefined();
    expect(
      (contribution.tools ?? []).map(
        (tool) =>
          (tool as WebsiteContentTool | InternetSearchTool).allowedDomains,
      ),
    ).toEqual([undefined, undefined]);
  });
});
