import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  anAssemblyState,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { AdoptionCapability } from './adoption.capability';

function contribute(toolNames: string[]) {
  return new AdoptionCapability().contribute(
    aCapabilityContext(),
    anAssemblyState(toolNames),
  );
}

describe('AdoptionCapability', () => {
  it('tells the model to offer skills only when the run can create them', () => {
    expect(contribute([ToolType.SET_MEMORY]).sections ?? []).toEqual([]);

    const [rules] = sectionsIn(
      contribute([ToolType.CREATE_SKILL]),
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );
    expect(rules).toContain(ToolType.CREATE_SKILL);
  });

  it('suggests routines only to users the routine tools were offered to', () => {
    const [withoutRoutines] = sectionsIn(
      contribute([ToolType.CREATE_SKILL]),
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );
    const [withRoutines] = sectionsIn(
      contribute([ToolType.CREATE_SKILL, ToolType.CREATE_ROUTINE]),
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );

    expect(withoutRoutines).not.toMatch(/routine/i);
    expect(withRoutines).toContain(ToolType.CREATE_ROUTINE);
  });

  it('suggests refining a skill only when the run can edit skills', () => {
    const [withoutEditing] = sectionsIn(
      contribute([ToolType.CREATE_SKILL]),
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );
    const [withEditing] = sectionsIn(
      contribute([ToolType.CREATE_SKILL, ToolType.EDIT_SKILL]),
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );

    expect(withoutEditing).not.toContain(ToolType.EDIT_SKILL);
    expect(withEditing).toContain(ToolType.EDIT_SKILL);
  });
});
