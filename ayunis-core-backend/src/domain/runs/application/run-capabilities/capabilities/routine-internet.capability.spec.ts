import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
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
});
