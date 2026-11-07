import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { SkillEntry } from 'src/common/util/skill-slug';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import type {
  RunCapabilityContext,
  SkillCatalog,
} from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type PromptSection,
  type RunCapability,
  type RunProfileHandle,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * On-demand skills: the skill catalog in the prompt, `activate_skill`, and the
 * create/edit skill widgets. Activating a skill copies its sources, MCP
 * integrations and knowledge bases onto the thread, so the activation hook
 * refreshes the run's tools and instructions before the next model call.
 */
@Injectable()
export class SkillsCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    const runNotes = buildActivatedSkillNotes(context.activatedSkillName);
    if (!context.model.canUseTools) return { sections: runNotes };
    const catalog = await context.skillCatalog();
    const tools = await this.assembleSkillTools(catalog);
    const sections = [...buildCatalogSections(catalog.entries), ...runNotes];
    return { tools, sections, hooks: [createSkillActivationHook] };
  }

  private async assembleSkillTools(catalog: SkillCatalog): Promise<Tool[]> {
    const assemble = (type: ToolType, toolContext?: unknown) =>
      assembleTools(this.assembleToolUseCase, [type], toolContext);
    const tools = await assemble(ToolType.CREATE_SKILL);
    if (catalog.editableSkillIds.size > 0) {
      tools.push(
        ...(await assemble(ToolType.EDIT_SKILL, catalog.editableSkillIds)),
      );
    }
    if (catalog.slugMap.size > 0) {
      tools.push(...(await assemble(ToolType.ACTIVATE_SKILL, catalog.slugMap)));
    }
    return tools;
  }
}

export function createSkillActivationHook(run: RunProfileHandle): Hook {
  const activateSkill = ToolType.ACTIVATE_SKILL as string;
  return {
    name: 'ayunis-skill-activation',
    inheritToChildRuns: false,
    afterToolCall: async (ctx) => {
      if (ctx.isError || ctx.toolCall.name !== activateSkill) return;
      await run.refresh(ctx);
    },
  };
}

function buildCatalogSections(entries: SkillEntry[]): PromptSection[] {
  if (entries.length === 0) return [];
  const skills = entries
    .map(
      (skill) =>
        `  <skill>\n    <name>${escapeXml(skill.slug)}</name>\n    <description>${escapeXml(skill.description)}</description>\n  </skill>`,
    )
    .join('\n');
  return [
    {
      slot: PromptSlot.RESOURCES,
      content: `<available_skills>
The following skills provide specialized instructions for specific tasks.
Use the activate_skill tool to load a skill when the task matches its description.

${skills}
</available_skills>`,
    },
  ];
}

// A quick action activates its skill before the run; the note keeps the model
// from activating it again, including after a later refresh.
function buildActivatedSkillNotes(skillName?: string): PromptSection[] {
  if (!skillName) return [];
  return [
    {
      slot: PromptSlot.RUN_NOTES,
      content: `<already_activated_skill>
Skill "${skillName}" has already been activated on this thread. Do not call activate_skill for this skill.
</already_activated_skill>`,
    },
  ];
}
