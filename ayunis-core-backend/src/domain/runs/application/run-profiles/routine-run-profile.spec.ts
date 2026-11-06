import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { FinishRoutineCapability } from 'src/domain/runs/application/run-capabilities/capabilities/finish-routine.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { RoutineContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-context.capability';
import { RoutineInternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-internet.capability';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { RoutineRunProfile } from './routine-run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';

const resolved = <T>(value: T) =>
  ({ execute: jest.fn().mockResolvedValue(value) }) as never;

function buildRoutineProfile(orgAllowsInternet = true): RoutineRunProfile {
  const assembleTool = createAssembleToolUseCase();
  return new RoutineRunProfile(
    new RoutineContextCapability(),
    new AnonymizationCapability(),
    new CustomInstructionsCapability(
      resolved({ systemPrompt: 'Antworten Sie stets auf Deutsch.' }),
      resolved({ systemPrompt: 'Ich arbeite im Ordnungsamt Musterstadt.' }),
    ),
    new RoutineInternetCapability(
      new InternetCapability(
        resolved({ internetSearchEnabled: orgAllowsInternet }),
        { get: () => true } as never,
        assembleTool,
      ),
    ),
    new FinishRoutineCapability(assembleTool),
  );
}

function assembleRoutine(
  options: {
    internetEnabled?: boolean;
    orgAllowsInternet?: boolean;
    canUseTools?: boolean;
    isAnonymous?: boolean;
  } = {},
) {
  const assembler = new RunProfileAssembler(
    new RunCapabilityContextFactory(
      resolved(undefined),
      resolved([]),
      resolved([]),
      resolved([]),
    ),
    resolved({}),
    { toRuntimeTools: jest.fn() } as never,
  );
  return assembler.assemble(buildRoutineProfile(options.orgAllowsInternet), {
    profile: {
      id: 'routine',
      routine: {
        name: 'Verkündungsplattform prüfen',
        internetEnabled: options.internetEnabled ?? true,
      },
    },
    thread: aThread(),
    model: aCapabilityContext({ canUseTools: options.canUseTools ?? true })
      .model,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: options.isAnonymous ?? false,
  });
}

describe('RoutineRunProfile', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T06:00:00.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('offers the web tools and finish_routine when the routine and the org allow internet access', async () => {
    const { tools } = await assembleRoutine();

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.WEBSITE_CONTENT,
      ToolType.INTERNET_SEARCH,
      ToolType.FINISH_ROUTINE,
    ]);
  });

  it('offers only finish_routine when the routine has internet access turned off', async () => {
    const { tools } = await assembleRoutine({ internetEnabled: false });

    expect(tools.map((tool) => tool.name)).toEqual([ToolType.FINISH_ROUTINE]);
  });

  it('offers only finish_routine when the org disabled internet access', async () => {
    const { tools } = await assembleRoutine({ orgAllowsInternet: false });

    expect(tools.map((tool) => tool.name)).toEqual([ToolType.FINISH_ROUTINE]);
  });

  it('starts the prompt with the unattended preamble and the routine name', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*nobody reads your text replies[\s\S]*Do not ask questions[\s\S]*call finish_routine[\s\S]*<\/unattended_run>\n\n<routine>\nName: Verkündungsplattform prüfen\n/,
    );
  });

  it('includes the org and user custom instructions', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toContain('Antworten Sie stets auf Deutsch.');
    expect(instructions).toContain('Ich arbeite im Ordnungsamt Musterstadt.');
  });

  it('ends the prompt with the current Berlin date and time, after everything that stays the same', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toMatch(
      /Ich arbeite im Ordnungsamt Musterstadt\.\n<\/user_instructions>\n\n<context>\nCurrent date and time: Friday, 2026-11-06, 07:00 \(Europe\/Berlin\)\n<\/context>$/,
    );
    expect(instructions.indexOf('07:00')).toBe(
      instructions.lastIndexOf('07:00'),
    );
  });

  it('adds the anonymization rules only to anonymous runs', async () => {
    const anonymous = await assembleRoutine({ isAnonymous: true });
    const regular = await assembleRoutine();

    expect(anonymous.instructions).toContain('<anonymized_data>');
    expect(regular.instructions).not.toContain('<anonymized_data>');
  });

  it('rejects a model that cannot use tools', async () => {
    await expect(
      assembleRoutine({ canUseTools: false }),
    ).rejects.toBeInstanceOf(RunInvalidInputError);
  });

  it('caps a run at fewer iterations than a chat', () => {
    expect(buildRoutineProfile().maxIterations).toBe(20);
  });
});
