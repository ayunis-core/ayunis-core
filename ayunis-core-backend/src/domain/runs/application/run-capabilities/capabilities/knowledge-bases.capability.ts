import { Injectable } from '@nestjs/common';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class KnowledgeBasesCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const knowledgeBases = await context.knowledgeBases();
    if (knowledgeBases.length === 0) return {};
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.KNOWLEDGE_QUERY, ToolType.KNOWLEDGE_GET_TEXT],
      knowledgeBases,
    );
    return {
      tools,
      sections: [
        { slot: PromptSlot.RESOURCES, content: buildSection(knowledgeBases) },
      ],
    };
  }
}

function buildSection(knowledgeBases: KnowledgeBaseSummary[]): string {
  const entries = knowledgeBases
    .map(
      (kb) => `<knowledge_base id="${kb.id}" name="${escapeXml(kb.name)}" />`,
    )
    .join('\n');

  return `<available_knowledge_bases>
The following knowledge bases are available. Use the knowledge_query tool to search them and the knowledge_get_text tool to read specific document sections.
Search all relevant knowledge bases with all phrasings in a single knowledge_query call by passing several knowledgeBaseIds and queries.

${entries}
</available_knowledge_bases>`;
}
