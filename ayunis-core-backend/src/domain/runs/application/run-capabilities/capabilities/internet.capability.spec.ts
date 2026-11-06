import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { InternetCapability } from './internet.capability';

function buildCapability(options: {
  orgAllowsInternet: boolean;
  searchConfigured: boolean;
}) {
  const getOrgChatSettings = jest
    .fn()
    .mockResolvedValue({ internetSearchEnabled: options.orgAllowsInternet });
  const capability = new InternetCapability(
    { execute: getOrgChatSettings } as never,
    {
      get: (key: string) =>
        key === 'internetSearch.isAvailable' && options.searchConfigured,
    } as never,
    createAssembleToolUseCase(),
  );
  return { capability, getOrgChatSettings };
}

describe('InternetCapability', () => {
  it('offers website content and internet search when the org allows internet access', async () => {
    const { capability } = buildCapability({
      orgAllowsInternet: true,
      searchConfigured: true,
    });

    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([ToolType.WEBSITE_CONTENT, ToolType.INTERNET_SEARCH]);
  });

  it('offers only website content without a configured search provider', async () => {
    const { capability } = buildCapability({
      orgAllowsInternet: true,
      searchConfigured: false,
    });

    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([ToolType.WEBSITE_CONTENT]);
  });

  it('offers no web tools when the org disabled internet access', async () => {
    const { capability } = buildCapability({
      orgAllowsInternet: false,
      searchConfigured: true,
    });

    expect(await capability.contribute(aCapabilityContext())).toEqual({});
  });

  it('skips the org settings lookup when the model cannot use tools', async () => {
    const { capability, getOrgChatSettings } = buildCapability({
      orgAllowsInternet: true,
      searchConfigured: true,
    });

    expect(
      await capability.contribute(aCapabilityContext({ canUseTools: false })),
    ).toEqual({});
    expect(getOrgChatSettings).not.toHaveBeenCalled();
  });
});
