import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { FinishRoutineTool } from './finish-routine-tool.entity';

describe('FinishRoutineTool', () => {
  const tool: Tool = new FinishRoutineTool();

  it('is named after its tool type', () => {
    expect(tool.name).toBe(ToolType.FINISH_ROUTINE);
    expect(tool.type).toBe(ToolType.FINISH_ROUTINE);
  });

  it('accepts a call without arguments', () => {
    expect(tool.validateParams({})).toEqual({});
  });

  it('accepts and ignores arguments the model adds anyway, so ending the run never fails', () => {
    expect(tool.validateParams({ summary: 'Zwei neue Verordnungen' })).toEqual(
      {},
    );
  });

  it('tells the model that only this call ends the run', () => {
    expect(tool.description).toContain('The run only ends');
  });

  it('does not return personal data', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
