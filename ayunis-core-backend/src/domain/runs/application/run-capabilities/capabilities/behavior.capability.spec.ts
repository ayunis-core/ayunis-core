import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import { sectionsIn } from 'src/domain/runs/testing/run-capability.fixture';
import { BehaviorCapability } from './behavior.capability';

describe('BehaviorCapability', () => {
  const contribution = new BehaviorCapability().contribute();

  it('frames the run with the behavior instructions', () => {
    const [framing] = sectionsIn(contribution, PromptSlot.FRAMING);

    expect(framing).toContain('<knowledge_boundaries>');
    expect(framing).toContain('time-sensitive facts');
    expect(framing).toContain('web search');
  });

  it('asks for independent lookups in the same turn', () => {
    const [guidance] = sectionsIn(contribution, PromptSlot.TOOL_USAGE);

    expect(guidance).toContain(
      'request them together in the same turn instead of one after another',
    );
    expect(guidance).toContain(
      'When a tool accepts several inputs in one call, use that single call',
    );
  });

  it('requires exact chunk IDs from retrieval tools in plain-text citation markers', () => {
    const policies = sectionsIn(contribution, PromptSlot.POLICIES).join('\n');

    expect(policies).toContain('{{source:<chunk UUID>|<plain-text label>}}');
    expect(policies).toContain(
      'Use only chunkId values returned by source_query or knowledge_query',
    );
    expect(policies).toContain(
      'Never cite a result marked citable=false or a system-only source',
    );
    expect(policies).toContain(
      'Never put source citation markers in tool-call arguments or generated content',
    );
  });

  it('allows URL reference markers only in chat with complete URLs', () => {
    const policies = sectionsIn(contribution, PromptSlot.POLICIES).join('\n');

    expect(policies).toContain('{{url:<url>}}');
    expect(policies).toContain('Only use complete http:// or https:// URLs');
    expect(policies).toContain(
      'Never put URL reference markers in tool-call arguments or generated content',
    );
    expect(policies).toContain('Never invent URLs');
  });

  it('describes the platform for questions about Ayunis Core', () => {
    expect(sectionsIn(contribution, PromptSlot.POLICIES).join('\n')).toContain(
      '<platform_information>',
    );
  });
});
