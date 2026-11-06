import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  PromptSlot,
  type PromptSection,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { composeRunInstructions } from './compose-run-instructions';

class LongDescriptionTool extends Tool {
  constructor(name: string, descriptionLong?: string) {
    super({
      name,
      description: `${name} short`,
      descriptionLong,
      parameters: { type: 'object', properties: {} },
      type: ToolType.CODE_EXECUTION,
    });
  }
  validateParams(): Record<string, never> {
    return {};
  }
  get returnsPii(): boolean {
    return false;
  }
}

const profile = {
  preamble: 'You are the Ayunis assistant.',
  closing: 'You are now ready to assist the user.',
};
const section = (slot: PromptSlot, content: string): PromptSection => ({
  slot,
  content,
});

describe('composeRunInstructions', () => {
  it('puts the preamble first and renders slots in their fixed order', () => {
    const instructions = composeRunInstructions(
      profile,
      [
        section(PromptSlot.RUN_NOTES, '<note/>'),
        section(PromptSlot.CUSTOM_INSTRUCTIONS, '<user_instructions/>'),
        section(PromptSlot.POLICIES, '<data_handling/>'),
        section(PromptSlot.RESOURCES, '<available_files/>'),
        section(PromptSlot.TOOL_USAGE, '<tool_guidelines/>'),
        section(PromptSlot.FRAMING, '<context/>'),
      ],
      [],
    );

    expect(instructions.split('\n\n').filter(Boolean)).toEqual([
      'You are the Ayunis assistant.',
      '<context/>',
      '<tool_usage>',
      '<tool_guidelines/>',
      '</tool_usage>',
      '<available_files/>',
      '<data_handling/>',
      '<user_instructions/>',
      'You are now ready to assist the user.',
      '<note/>',
    ]);
  });

  it('keeps contribution order within a slot', () => {
    const instructions = composeRunInstructions(
      profile,
      [
        section(PromptSlot.POLICIES, '<data_handling/>'),
        section(PromptSlot.POLICIES, '<legal_references/>'),
      ],
      [],
    );

    expect(instructions.indexOf('<data_handling/>')).toBeLessThan(
      instructions.indexOf('<legal_references/>'),
    );
  });

  it('follows the tool usage guidance with each tool long description', () => {
    const instructions = composeRunInstructions(
      profile,
      [section(PromptSlot.TOOL_USAGE, '<file_usage/>')],
      [
        new LongDescriptionTool('code_execution', 'Runs Python.'),
        new LongDescriptionTool('send_email'),
      ],
    );

    expect(instructions).toContain(
      '<tool_usage>\n\n<file_usage/>\n\n<code_execution>\nRuns Python.\n</code_execution>\n\n</tool_usage>',
    );
    expect(instructions).not.toContain('<send_email>');
  });

  it('omits the tool usage block when there is neither guidance nor a long description', () => {
    const instructions = composeRunInstructions(
      profile,
      [],
      [new LongDescriptionTool('send_email')],
    );

    expect(instructions).not.toContain('<tool_usage>');
  });

  it('renders the preamble alone when nothing else is contributed', () => {
    expect(composeRunInstructions({ preamble: 'Preamble.' }, [], [])).toBe(
      'Preamble.',
    );
  });
});
