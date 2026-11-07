import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { KnowledgeBasesCapability } from './knowledge-bases.capability';

describe('KnowledgeBasesCapability', () => {
  const capability = new KnowledgeBasesCapability(createAssembleToolUseCase());
  const satzungen: KnowledgeBaseSummary = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Satzungen <2026>',
  };

  it('offers the knowledge tools and lists the available knowledge bases', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({
        knowledgeBases: () => Promise.resolve([satzungen]),
      }),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.KNOWLEDGE_QUERY,
      ToolType.KNOWLEDGE_GET_TEXT,
    ]);
    const [section] = sectionsIn(contribution, PromptSlot.RESOURCES);
    expect(section).toContain(
      `<knowledge_base id="${satzungen.id}" name="Satzungen &lt;2026&gt;" />`,
    );
    expect(section).toContain(
      'Search all relevant knowledge bases with all phrasings in a single knowledge_query call by passing several knowledgeBaseIds and queries.',
    );
  });

  it('contributes nothing without knowledge bases', async () => {
    expect(await capability.contribute(aCapabilityContext())).toEqual({});
  });

  it('does not load knowledge bases when the model cannot use tools', async () => {
    const knowledgeBases = jest.fn().mockResolvedValue([satzungen]);

    expect(
      await capability.contribute(
        aCapabilityContext({ canUseTools: false, knowledgeBases }),
      ),
    ).toEqual({});
    expect(knowledgeBases).not.toHaveBeenCalled();
  });
});
