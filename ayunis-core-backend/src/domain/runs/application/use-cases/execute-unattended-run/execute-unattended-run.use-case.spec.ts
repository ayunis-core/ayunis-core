import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { RunMaxIterationsReachedError } from 'src/domain/runs/application/runs.errors';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import type { RunProfile } from 'src/domain/runs/application/run-profiles/run-profile';
import type { RunProfileRegistry } from 'src/domain/runs/application/run-profiles/run-profile.registry';
import {
  ROUTINE_NUDGE_MESSAGE,
  routineCompletionPolicy,
} from 'src/domain/runs/application/run-profiles/routine-completion.policy';
import type { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import type { ExecuteRunUseCase } from 'src/domain/runs/application/use-cases/execute-run/execute-run.use-case';
import { ExecuteUnattendedRunCommand } from './execute-unattended-run.command';
import { ExecuteUnattendedRunUseCase } from './execute-unattended-run.use-case';

const threadId = randomUUID();
const TASK =
  'Prüfe die Verkündungsplattform Niedersachsen auf neue Gesetze und Verordnungen.';
const profileInput = {
  id: 'routine',
  routine: { name: 'Verkündungsplattform prüfen', internetEnabled: true },
} as const;

interface ScriptedRun {
  items: Message[];
  outcome?: RunExecutionOutcome;
  error?: Error;
}

const assistantId = randomUUID();
const userMessage = (text: string) =>
  new UserMessage({ threadId, content: [new TextMessageContent(text)] });
const textReply = (text: string, id: UUID = randomUUID()) =>
  new AssistantMessage({
    id,
    threadId,
    content: [new TextMessageContent(text)],
  });
const finishCall = (callId = 'call-finish') =>
  new AssistantMessage({
    threadId,
    content: [new ToolUseMessageContent(callId, ToolType.FINISH_ROUTINE, {})],
  });
const externalResult = (callId = 'call-finish') =>
  new ToolResultMessage({
    threadId,
    content: [
      new ToolResultMessageContent(
        callId,
        ToolType.FINISH_ROUTINE,
        'Tool execution is handled externally',
      ),
    ],
  });

const finishedRun = (): ScriptedRun => ({
  items: [userMessage(TASK), finishCall(), externalResult()],
  outcome: 'completed',
});
const textOnlyRun = (
  text = 'Es gibt zwei neue Verordnungen.',
): ScriptedRun => ({
  items: [userMessage(TASK), textReply(text)],
  outcome: 'completed',
});

function buildUseCase(runs: ScriptedRun[], onRun?: () => void) {
  const commands: ExecuteRunCommand[] = [];
  const execute = jest.fn((command: ExecuteRunCommand) => {
    commands.push(command);
    onRun?.();
    const run = runs.shift();
    if (!run) throw new Error('No scripted run left');
    return Promise.resolve(
      (async function* () {
        await Promise.resolve();
        yield* run.items;
        if (run.error) throw run.error;
        return run.outcome ?? 'completed';
      })(),
    );
  });
  const profile = {
    id: 'routine',
    completionPolicy: routineCompletionPolicy,
  } as RunProfile;
  const useCase = new ExecuteUnattendedRunUseCase(
    { execute } as unknown as ExecuteRunUseCase,
    {
      get: jest.fn().mockReturnValue(profile),
    } as unknown as RunProfileRegistry,
  );
  return { useCase, commands };
}

const command = (signal = new AbortController().signal) =>
  new ExecuteUnattendedRunCommand({
    threadId,
    input: new RunUserInput(TASK),
    profile: profileInput,
    signal,
  });

describe('ExecuteUnattendedRunUseCase', () => {
  it('is done after one run that called finish_routine', async () => {
    const { useCase, commands } = buildUseCase([finishedRun()]);

    await expect(useCase.execute(command())).resolves.toEqual({
      status: 'done',
      nudges: 0,
    });
    expect(commands).toHaveLength(1);
  });

  it('runs the task on the thread with the profile input and the caller signal', async () => {
    const { useCase, commands } = buildUseCase([finishedRun()]);
    const signal = new AbortController().signal;

    await useCase.execute(command(signal));

    expect(commands[0]).toMatchObject({
      threadId,
      profile: profileInput,
      signal,
    });
    expect((commands[0].input as RunUserInput).text).toBe(TASK);
  });

  it('nudges a text reply as a new user message on the same thread and runs again', async () => {
    const { useCase, commands } = buildUseCase([textOnlyRun(), finishedRun()]);

    await expect(useCase.execute(command())).resolves.toEqual({
      status: 'done',
      nudges: 1,
    });
    expect(commands).toHaveLength(2);
    expect(commands[1].threadId).toBe(threadId);
    expect(commands[1].profile).toEqual(profileInput);
    expect((commands[1].input as RunUserInput).text).toBe(
      ROUTINE_NUDGE_MESSAGE,
    );
  });

  it('fails after the second nudge is answered with text again', async () => {
    const { useCase, commands } = buildUseCase([
      textOnlyRun(),
      textOnlyRun('Ich habe nichts Neues gefunden.'),
      textOnlyRun('Wie gesagt: nichts Neues.'),
    ]);

    await expect(useCase.execute(command())).resolves.toEqual({
      status: 'failed',
      nudges: 2,
      reason: 'finish_routine_not_called',
    });
    expect(commands).toHaveLength(3);
  });

  it('judges the final assistant turn, not a streaming snapshot of it', async () => {
    const snapshot = new AssistantMessage({
      id: assistantId,
      threadId,
      content: [
        new TextMessageContent('Ich bin'),
        new ToolUseMessageContent('call-early', ToolType.FINISH_ROUTINE, {}),
      ],
    });
    const { useCase } = buildUseCase([
      {
        items: [
          userMessage(TASK),
          snapshot,
          textReply('Ich bin fertig.', assistantId),
        ],
        outcome: 'completed',
      },
      finishedRun(),
    ]);

    await expect(useCase.execute(command())).resolves.toEqual({
      status: 'done',
      nudges: 1,
    });
  });

  it('judges the last turn when finish_routine was called earlier in the run', async () => {
    const { useCase } = buildUseCase([
      {
        items: [
          userMessage(TASK),
          finishCall('call-rejected'),
          externalResult('call-rejected'),
          textReply('Zusammenfassung: nichts Neues.'),
        ],
        outcome: 'completed',
      },
      finishedRun(),
    ]);

    await expect(useCase.execute(command())).resolves.toMatchObject({
      nudges: 1,
    });
  });

  it('reports an aborted run without nudging', async () => {
    const { useCase, commands } = buildUseCase([
      { items: [userMessage(TASK)], outcome: 'aborted' },
    ]);

    await expect(useCase.execute(command())).resolves.toEqual({
      status: 'aborted',
      nudges: 0,
    });
    expect(commands).toHaveLength(1);
  });

  it('sends no nudge once the caller aborted after a text reply', async () => {
    const controller = new AbortController();
    const { useCase, commands } = buildUseCase([textOnlyRun()], () =>
      controller.abort(new Error('Routine timed out')),
    );

    await expect(useCase.execute(command(controller.signal))).resolves.toEqual({
      status: 'aborted',
      nudges: 0,
    });
    expect(commands).toHaveLength(1);
  });

  it('propagates a run failure instead of nudging', async () => {
    const { useCase, commands } = buildUseCase([
      {
        items: [userMessage(TASK)],
        error: new RunMaxIterationsReachedError(20),
      },
    ]);

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      RunMaxIterationsReachedError,
    );
    expect(commands).toHaveLength(1);
  });
});
