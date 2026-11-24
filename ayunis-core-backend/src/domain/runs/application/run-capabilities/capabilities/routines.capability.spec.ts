import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import type { EditRoutineTool } from 'src/domain/tools/domain/tools/edit-routine-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { RoutinesCapability } from './routines.capability';

describe('RoutinesCapability', () => {
  const routine = aRoutine({ name: 'Amtsblatt', dailyTime: '07:30' });

  function capability(manageableRoutines: Routine[] | null) {
    return new RoutinesCapability(createAssembleToolUseCase(), {
      execute: jest.fn().mockResolvedValue(manageableRoutines),
    } as never);
  }

  it('offers routine creation and editing of the user’s routines', async () => {
    const contribution = await capability([routine]).contribute(
      aCapabilityContext(),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.CREATE_ROUTINE,
      ToolType.EDIT_ROUTINE,
    ]);
    const editTool = contribution.tools?.[1] as EditRoutineTool;
    expect(
      editTool.validateParams({
        routine_id: routine.id,
        name: '',
        prompt: '',
        daily_time: '08:00',
        change_summary: 'Eine halbe Stunde später',
      }),
    ).toMatchObject({ routine_id: routine.id });
    expect(() =>
      editTool.validateParams({
        routine_id: '99999999-9999-4999-8999-999999999999',
        name: '',
        prompt: '',
        daily_time: '',
        change_summary: 'Fremde Routine',
      }),
    ).toThrow();
  });

  it("tells the model each routine's internet access and allowed domains", async () => {
    const limited = aRoutine({
      internetAccess: RoutineInternetAccess.ALLOWLIST,
      allowedDomains: ['nrw.de', 'bund.de'],
    });

    const contribution = await capability([limited]).contribute(
      aCapabilityContext(),
    );

    expect(JSON.stringify(contribution.tools?.[1].parameters)).toContain(
      'internet_access allowlist, allowed_domains nrw.de, bund.de',
    );
  });

  it('offers only routine creation to a user without routines', async () => {
    const contribution = await capability([]).contribute(aCapabilityContext());

    expect(toolNames(contribution)).toEqual([ToolType.CREATE_ROUTINE]);
  });

  it('offers nothing to a user who may not manage routines', async () => {
    const contribution =
      await capability(null).contribute(aCapabilityContext());

    expect(contribution.tools ?? []).toEqual([]);
  });

  it('offers nothing when the model cannot use tools', async () => {
    const contribution = await capability([routine]).contribute(
      aCapabilityContext({ canUseTools: false }),
    );

    expect(contribution.tools ?? []).toEqual([]);
  });
});
