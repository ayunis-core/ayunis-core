import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ValidatePiiWhitelistExceptionUseCase } from 'src/domain/anonymization-settings/application/use-cases/validate-pii-whitelist-exception/validate-pii-whitelist-exception.use-case';
import { AnonymizationWhitelistEntry } from 'src/domain/anonymization-settings/domain/anonymization-whitelist-entry.entity';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { AddAnonymizationExceptionTool } from 'src/domain/tools/domain/tools/add-anonymization-exception-tool.entity';
import { AddAnonymizationExceptionToolHandler } from './add-anonymization-exception-tool.handler';

const orgId = '11111111-1111-4111-8111-111111111111' as UUID;
const threadId = '33333333-3333-4333-8333-333333333333' as UUID;

function buildHandler(
  rules: { category: PiiCategory; pattern: string | null }[],
  masks: { category: PiiCategory; value: string }[] = [],
): AddAnonymizationExceptionToolHandler {
  const repository = {
    findByOrgId: jest
      .fn()
      .mockResolvedValue(
        rules.map(
          (rule) => new AnonymizationWhitelistEntry({ orgId, ...rule }),
        ),
      ),
  };
  const getThreadPiiMasks = {
    execute: jest
      .fn()
      .mockResolvedValue(
        masks.map(
          (mask, index) =>
            new ThreadPiiMask({ threadId, maskIndex: index + 1, ...mask }),
        ),
      ),
  };
  return new AddAnonymizationExceptionToolHandler(
    getThreadPiiMasks as never,
    new ValidatePiiWhitelistExceptionUseCase(repository as never),
  );
}

function execute(
  handler: AddAnonymizationExceptionToolHandler,
  input: Record<string, unknown>,
): Promise<string> {
  return handler.execute({
    tool: new AddAnonymizationExceptionTool(),
    input,
    context: { orgId, threadId, isAnonymous: true },
  });
}

describe('AddAnonymizationExceptionToolHandler', () => {
  it('checks a masked word against its original value, not the placeholder', async () => {
    const handler = buildHandler(
      [{ category: PiiCategory.LOCATION, pattern: 'Marl' }],
      [{ category: PiiCategory.LOCATION, value: 'Bayern' }],
    );

    const result = await execute(handler, {
      category: 'location',
      word: '{{pii:LOCATION_1}}',
    });

    expect(JSON.parse(result)).toMatchObject({
      status: 'awaiting_confirmation',
    });
    expect(result).not.toContain('Bayern');
  });

  it('rejects a placeholder that does not exist in the thread', async () => {
    const handler = buildHandler([], []);

    await expect(
      execute(handler, {
        category: 'location',
        word: '{{pii:LOCATION_7}}',
      }),
    ).rejects.toMatchObject({ exposeToLLM: true });
  });

  it('does not accept a pattern from the model', async () => {
    const handler = buildHandler([]);

    await expect(
      execute(handler, { category: 'location', word: 'Bayern', pattern: '.*' }),
    ).rejects.toMatchObject({ exposeToLLM: true });
  });

  it('answers the same for any guess about a masked value', async () => {
    const handler = buildHandler(
      [],
      [{ category: PiiCategory.PERSON_NAME, value: 'Hans Meier' }],
    );
    const answers = await Promise.all(
      ['H.*', 'A.*', 'Hans Meier', 'Hans Maier'].map((guess) =>
        execute(handler, { category: 'person_name', word: guess }),
      ),
    );

    expect(new Set(answers).size).toBe(1);
  });

  it('tells the model when the word is already exempt', async () => {
    const handler = buildHandler([
      { category: PiiCategory.LOCATION, pattern: 'Bayern' },
    ]);

    const error: unknown = await execute(handler, {
      category: 'location',
      word: 'Bayern',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ToolExecutionFailedError);
    expect(error).toMatchObject({ exposeToLLM: true });
    expect((error as Error).message).toContain('already exempts');
  });
});
