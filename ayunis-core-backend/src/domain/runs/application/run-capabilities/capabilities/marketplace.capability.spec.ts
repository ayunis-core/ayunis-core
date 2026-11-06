import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { MarketplaceCapability } from './marketplace.capability';

const buildCapability = (enabled: boolean) =>
  new MarketplaceCapability({ enabled } as never, createAssembleToolUseCase());

describe('MarketplaceCapability', () => {
  it('offers search and install when a marketplace is configured', async () => {
    expect(
      toolNames(await buildCapability(true).contribute(aCapabilityContext())),
    ).toEqual([
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('offers nothing when no marketplace is configured', async () => {
    expect(
      await buildCapability(false).contribute(aCapabilityContext()),
    ).toEqual({});
  });

  it('offers nothing when the model cannot use tools', async () => {
    expect(
      await buildCapability(true).contribute(
        aCapabilityContext({ canUseTools: false }),
      ),
    ).toEqual({});
  });
});
