import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { FinishRoutineCapability } from './finish-routine.capability';

describe('FinishRoutineCapability', () => {
  const capability = new FinishRoutineCapability(createAssembleToolUseCase());

  it('offers finish_routine', async () => {
    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([ToolType.FINISH_ROUTINE]);
  });

  it('rejects a model that cannot use tools, since such a run could never finish', async () => {
    await expect(
      capability.contribute(aCapabilityContext({ canUseTools: false })),
    ).rejects.toBeInstanceOf(RunInvalidInputError);
  });
});
