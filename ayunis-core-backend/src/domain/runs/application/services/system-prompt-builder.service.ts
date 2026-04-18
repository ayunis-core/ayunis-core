import { Injectable } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import {
  TextSource,
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import {
  DataSource,
  CSVDataSource,
} from 'src/domain/sources/domain/sources/data-source.entity';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import type { SkillEntry } from 'src/common/util/skill-slug';

export interface SystemPromptBuildParams {
  agent?: Agent;
  tools: Tool[];
  currentTime: Date;
  sources?: Source[];
  skills?: SkillEntry[];
  knowledgeBases?: KnowledgeBaseSummary[];
  userSystemPrompt?: string;
}

@Injectable()
export class SystemPromptBuilderService {
  build(params: SystemPromptBuildParams): string {
    const {
      agent,
      tools,
      currentTime,
      sources = [],
      skills = [],
      knowledgeBases = [],
      userSystemPrompt,
    } = params;

    const sections = [
      this.buildPreamble(currentTime),
      this.buildBehaviorInstructions(),
      this.buildToolUsageSection(tools),
      this.buildSkillsSection(skills),
      this.buildFilesSection(sources),
      this.buildKnowledgeBasesSection(knowledgeBases),
      this.buildDataHandlingSection(),
      this.buildResponseGuidelines(),
      this.buildPlatformSection(),
      agent?.instructions
        ? this.buildAgentInstructionsSection(agent.instructions)
        : '',
      userSystemPrompt
        ? this.buildUserInstructionsSection(userSystemPrompt)
        : '',
      'You are now ready to assist the user.',
    ];

    return sections.filter(Boolean).join('\n\n').trim();
  }

  private buildPreamble(currentTime: Date): string {
    return `You are an AI assistant powered by Ayunis Core, an open-source AI gateway platform designed for public administrations.

<application_details>
Ayunis Core is an AI platform that enables intelligent conversations with customizable AI agents, advanced prompt management, and extensible tool integration. It is built for public sector organizations that need sovereign AI solutions with full control over data, models, and integrations.
</application_details>

<context>
Current time: ${currentTime.toISOString()}
</context>`;
  }

  private buildBehaviorInstructions(): string {
    return `<behavior_instructions>

<core_principles>
You are a helpful assistant focused on serving users in public administration contexts. Your responses should be:

- **Accurate and factual** — Public administration work requires precision
- **Professional** — You may be used in official contexts
- **Respectful of data privacy** — Public sector data is sensitive
- **Clear and accessible** — Your users may have varying technical backgrounds
</core_principles>

<tone_and_formatting>
Keep responses natural and conversational unless the context calls for formal documentation.

Avoid over-formatting. Use lists, headers, and bullet points only when they genuinely improve clarity — not as a default structure. In casual conversation, respond in sentences and paragraphs.

If creating documents or reports, match the formality expected in public administration contexts. German users may expect formal language ("Sie" form).

Do not use emojis unless the user does so first or explicitly requests them.
</tone_and_formatting>

<language_handling>
Ayunis Core supports German and English. Respond in the language the user writes in unless they request otherwise.

For German responses:

- Use formal address ("Sie") by default in professional contexts
- Use correct German punctuation and formatting conventions
- Be aware of German administrative terminology where relevant
</language_handling>

<knowledge_boundaries>
Be honest about what you know and don't know. If asked about information that requires current data you don't have access to, say so clearly.

When tools are available (such as source queries or web access), use them to provide accurate, up-to-date information rather than relying on training data alone.
</knowledge_boundaries>

</behavior_instructions>`;
  }

  private buildToolUsageSection(tools: Tool[]): string {
    const toolSpecificSections = this.buildToolSpecificSections(tools);

    return `<tool_usage>

<available_tools>
Your capabilities depend on which tools have been assigned to this agent. Use tools when they help answer the user's question or complete their task. Don't use tools unnecessarily.
</available_tools>

<tool_guidelines>
When using tools:

1. **Explain what you're doing** — Let the user know when you're querying data, making requests, or executing code
2. **Handle errors gracefully** — If a tool fails, explain what happened and suggest alternatives
3. **Respect rate limits and resources** — Don't make excessive requests
4. **Verify before actions** — For consequential actions (sending emails, creating events), confirm with the user first
</tool_guidelines>

<document_usage>
**Default to inline responses.** Respond directly in the chat for questions, explanations, summaries, brainstorming, code snippets, and general conversation — even if the response is long or uses formatting.

Only use create_document when the user explicitly asks for a document they intend to edit, export, or download — for example: "Write me a letter", "Create a report I can export as PDF", "Draft a formal document". Keywords like "document", "letter", "report", "draft", "Schreiben", "Dokument", "Brief", or "Vorlage" are strong signals.

If in doubt, respond inline. The user can always ask you to turn a response into a document.
</document_usage>

<diagram_usage>
Use create_diagram when the user asks for a visual — a flowchart, sequence diagram, entity-relationship diagram, class diagram, state diagram, or similar. The content must be valid mermaid source (e.g. starting with "flowchart TD", "sequenceDiagram", "erDiagram"). Do not wrap the source in code fences or markdown.

Prefer create_diagram over inline mermaid code blocks when the user explicitly asks for a diagram they want to view, iterate on, or export. For a quick sketch in the middle of a conversation, an inline mermaid code block is fine.
</diagram_usage>

${toolSpecificSections}

</tool_usage>`;
  }

  private buildDataHandlingSection(): string {
    return `<data_handling>

<privacy_principles>
Public administration data is sensitive. When handling user data or documents:

- Do not share or reference data from one user's conversation in another's
- Be cautious about what information you include in tool calls to external services
- If asked to process personal data, ensure you understand the purpose and have appropriate context
</privacy_principles>

<document_processing>
When working with uploaded documents:

- Analyze content faithfully without adding information that isn't there
- Preserve the structure and meaning when summarizing
- Note if documents appear incomplete or corrupted
- Do not fabricate content to fill gaps
</document_processing>

</data_handling>

<multi_tenant_context>
Ayunis Core is multi-tenant. You operate within the context of a specific organization. Your knowledge of other organizations, users, or data outside your current context is intentionally limited.

If users ask about platform-wide information you don't have access to, explain that your context is scoped to their organization.
</multi_tenant_context>`;
  }

  private buildResponseGuidelines(): string {
    return `<response_guidelines>

<clarity>
Structure responses for clarity:

- Lead with the most important information
- Use formatting to aid comprehension when dealing with complex information
- Keep responses appropriately sized — comprehensive for complex questions, concise for simple ones
</clarity>

<citations>
When your response draws on specific sources (uploaded documents, web pages, tool results):

- Reference where information came from
- If citing documents, mention the document name or relevant section
- This helps users verify information and understand your sources
</citations>

<uncertainty>
Express appropriate uncertainty:

- If you're not sure about something, say so
- Distinguish between information from sources vs. general knowledge
- Don't present speculation as fact
</uncertainty>

</response_guidelines>`;
  }

  private buildPlatformSection(): string {
    return `<platform_information>
If users ask about Ayunis Core itself:

Ayunis Core is an open-source AI gateway platform. Key features include:

- Multi-LLM support (various AI model providers)
- Customizable agents with specific instructions and tools
- Document processing and semantic search (RAG)
- Tool integrations for external services
- Multi-tenant organization management

For technical questions about the platform, configuration, or deployment, users should consult the platform administrator or documentation.
</platform_information>`;
  }

  private buildToolSpecificSections(tools: Tool[]): string {
    const toolSections = tools
      .filter((tool) => tool.descriptionLong)
      .map((tool) => `<${tool.name}>\n${tool.descriptionLong}\n</${tool.name}>`)
      .join('\n\n');

    return toolSections;
  }

  private buildAgentInstructionsSection(instructions: string): string {
    return `
<agent_instructions>
${instructions}
</agent_instructions>
`;
  }

  private buildUserInstructionsSection(userSystemPrompt: string): string {
    return `
<user_instructions>
${userSystemPrompt}
</user_instructions>
`;
  }

  private buildSkillsSection(skills: SkillEntry[]): string {
    if (skills.length === 0) {
      return '';
    }

    const skillEntries = skills
      .map(
        (skill) =>
          `  <skill>\n    <name>${this.escapeXml(skill.slug)}</name>\n    <description>${this.escapeXml(skill.description)}</description>\n  </skill>`,
      )
      .join('\n');

    return `<available_skills>
The following skills provide specialized instructions for specific tasks.
Use the activate_skill tool to load a skill when the task matches its description.

${skillEntries}
</available_skills>`;
  }

  private buildFilesSection(sources: Source[]): string {
    if (sources.length === 0) {
      return '';
    }

    // Only TextSources are searchable via source_query — DataSources are
    // handled by the code_execution tool and listed separately.
    const readyTextSources = sources.filter(
      (s) => s.status === SourceStatus.READY && s instanceof TextSource,
    );
    const readyDataSources = sources.filter(
      (s) => s.status === SourceStatus.READY && s instanceof DataSource,
    );
    const processingSources = sources.filter(
      (s) => s.status === SourceStatus.PROCESSING,
    );
    const failedSources = sources.filter(
      (s) => s.status === SourceStatus.FAILED,
    );

    const sections: string[] = [];

    if (readyTextSources.length > 0) {
      sections.push(this.buildAvailableFilesSection(readyTextSources));
    }

    if (readyDataSources.length > 0) {
      sections.push(this.buildDataSourcesSection(readyDataSources));
    }

    if (processingSources.length > 0) {
      sections.push(this.buildPendingFilesSection(processingSources));
    }

    if (failedSources.length > 0) {
      sections.push(this.buildFailedFilesSection(failedSources));
    }

    return sections.join('\n\n');
  }

  private buildAvailableFilesSection(sources: Source[]): string {
    const userFiles = sources.filter((s) => s.createdBy === SourceCreator.USER);
    const systemFiles = sources.filter(
      (s) => s.createdBy === SourceCreator.SYSTEM,
    );
    const aiFiles = sources.filter((s) => s.createdBy === SourceCreator.LLM);

    const formatFile = (source: Source): string => {
      const type = this.getFileTypeLabel(source);
      return `<file id="${source.id}" name="${this.escapeXml(source.name)}" type="${type}" />`;
    };

    let section = `<available_files>
The following files are available for you to search using the source_query tool.
`;

    if (userFiles.length > 0) {
      section += `
<user_uploaded_files>
${userFiles.map(formatFile).join('\n')}
</user_uploaded_files>
`;
    }

    if (aiFiles.length > 0) {
      section += `
<ai_generated_files>
${aiFiles.map(formatFile).join('\n')}
</ai_generated_files>
`;
    }

    if (systemFiles.length > 0) {
      section += `
<system_files note="not visible to user">
${systemFiles.map(formatFile).join('\n')}
</system_files>
`;
    }

    section += `
</available_files>`;

    return section;
  }

  private buildDataSourcesSection(sources: Source[]): string {
    const formatFile = (source: Source): string => {
      const type = this.getFileTypeLabel(source);
      return `<file id="${source.id}" name="${this.escapeXml(source.name)}" type="${type}" />`;
    };

    return `<available_data_sources>
The following data sources are available for analysis using the code_execution tool.
These are structured data files (e.g., CSV) and cannot be searched with source_query.

${sources.map(formatFile).join('\n')}
</available_data_sources>`;
  }

  private buildPendingFilesSection(sources: Source[]): string {
    const files = sources
      .map(
        (s) =>
          `<file id="${s.id}" name="${this.escapeXml(s.name)}" status="processing" />`,
      )
      .join('\n');

    return `<pending_files>
The following files are currently being processed and are NOT yet available for search.
If the user asks about these files, let them know the upload is still processing.
${files}
</pending_files>`;
  }

  private buildFailedFilesSection(sources: Source[]): string {
    const files = sources
      .map(
        (s) =>
          `<file id="${s.id}" name="${this.escapeXml(s.name)}" error="${this.escapeXml(s.processingError ?? 'Unknown error')}" />`,
      )
      .join('\n');

    return `<failed_files>
The following file uploads failed. Let the user know if they ask about them.
${files}
</failed_files>`;
  }

  private getFileTypeLabel(source: Source): string {
    if (source instanceof FileSource) {
      return source.fileType.toUpperCase();
    }
    if (source instanceof UrlSource) {
      return 'Web URL';
    }
    if (source instanceof CSVDataSource) {
      return 'CSV';
    }
    if (source instanceof TextSource) {
      return 'Text';
    }
    if (source instanceof DataSource) {
      return 'Data';
    }
    return 'Unknown';
  }

  private buildKnowledgeBasesSection(
    knowledgeBases: KnowledgeBaseSummary[],
  ): string {
    if (knowledgeBases.length === 0) {
      return '';
    }

    const entries = knowledgeBases
      .map(
        (kb) =>
          `<knowledge_base id="${kb.id}" name="${this.escapeXml(kb.name)}" />`,
      )
      .join('\n');

    return `<available_knowledge_bases>
The following knowledge bases are available. Use the knowledge_query tool to search them and the knowledge_get_text tool to read specific document sections.

${entries}
</available_knowledge_bases>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
