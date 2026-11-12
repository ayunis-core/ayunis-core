import { randomUUID } from 'crypto';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import type { RecordingSearchTool } from 'src/domain/tools/domain/tools/recording-search-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { RecordingsCapability } from './recordings.capability';

describe('RecordingsCapability', () => {
  function capability(recordingsEnabled: boolean) {
    return new RecordingsCapability(createAssembleToolUseCase(), {
      get: () => recordingsEnabled,
    } as never);
  }

  function scopeOf(tools: readonly unknown[] = []) {
    return (tools[0] as RecordingSearchTool).scope;
  }

  it('offers recording_search in a personal chat without workspace recordings', async () => {
    const contribution =
      await capability(true).contribute(aCapabilityContext());

    expect(toolNames(contribution)).toEqual([ToolType.RECORDING_SEARCH]);
    expect(scopeOf(contribution.tools).workspaceId).toBeNull();
    expect(contribution.sections ?? []).toEqual([]);
  });

  it("scopes recording_search in a workspace chat to that workspace's recordings", async () => {
    const workspaceId = randomUUID();

    const contribution = await capability(true).contribute(
      aCapabilityContext({ thread: aThread({ workspaceId }) }),
    );

    expect(scopeOf(contribution.tools).workspaceId).toBe(workspaceId);
  });

  it('offers nothing with recordings turned off', async () => {
    const contribution =
      await capability(false).contribute(aCapabilityContext());

    expect(toolNames(contribution)).toEqual([]);
  });

  it('offers nothing to a model that cannot use tools', async () => {
    const contribution = await capability(true).contribute(
      aCapabilityContext({ canUseTools: false }),
    );

    expect(toolNames(contribution)).toEqual([]);
  });
});
