import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { CodeExecutionTool } from 'src/domain/tools/domain/tools/code-execution-tool.entity';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
} from 'src/domain/runs/testing/run-capability.fixture';
import { CodeExecutionCapability } from './code-execution.capability';

const csvSource = (status: SourceStatus) =>
  new CSVDataSource({
    name: `haushalt-${status}.csv`,
    data: { headers: [], rows: [] },
    status,
  });

describe('CodeExecutionCapability', () => {
  const capability = new CodeExecutionCapability(createAssembleToolUseCase());

  it('offers only READY data sources to the code execution tool', async () => {
    const ready = csvSource(SourceStatus.READY);
    const processing = csvSource(SourceStatus.PROCESSING);
    const failed = csvSource(SourceStatus.FAILED);

    const { tools } = await capability.contribute(
      aCapabilityContext({ threadSources: [ready, processing, failed] }),
    );

    const [tool] = tools as CodeExecutionTool[];
    expect(tool).toBeInstanceOf(CodeExecutionTool);
    expect(tool.description).toContain(ready.id);
    expect(tool.description).not.toContain(processing.id);
    expect(tool.description).not.toContain(failed.id);
  });

  it('offers no tool when the model cannot use tools', async () => {
    expect(
      await capability.contribute(aCapabilityContext({ canUseTools: false })),
    ).toEqual({});
  });
});
