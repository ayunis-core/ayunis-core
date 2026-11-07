import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { WorkspaceInstructionsCapability } from './workspace-instructions.capability';

describe('WorkspaceInstructionsCapability', () => {
  const capability = new WorkspaceInstructionsCapability();

  it('lists the escaped workspace instructions among the resources', () => {
    const contribution = capability.contribute(
      aCapabilityContext({
        workspaceContext: {
          instruction: 'Use <local> terminology.',
          skills: [],
          knowledgeBases: [],
          runtimeKnowledgeBases: [],
        },
      }),
    );

    expect(sectionsIn(contribution, PromptSlot.RESOURCES)).toEqual([
      '<workspace_instructions>\nThese instructions apply to every chat in this workspace.\n\nUse &lt;local&gt; terminology.\n</workspace_instructions>',
    ]);
  });

  it('contributes nothing outside a workspace with instructions', () => {
    expect(capability.contribute(aCapabilityContext())).toEqual({});
  });
});
