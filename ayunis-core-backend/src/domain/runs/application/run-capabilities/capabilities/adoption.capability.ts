import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * Leads the user into the features this run can actually use. It reads the
 * tools contributed before it, so it must come after the skills and routines
 * capabilities, and before memory so that `<memory>` still ends the cached
 * prefix.
 */
@Injectable()
export class AdoptionCapability implements RunCapability {
  contribute(
    context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): CapabilityContribution {
    const tools = state.reservedToolNames;
    if (!tools.has(ToolType.CREATE_SKILL)) return {};
    const content = adoptionRules({
      memory: context.personalContext.memory,
      routines: tools.has(ToolType.CREATE_ROUTINE),
      skillEditing: tools.has(ToolType.EDIT_SKILL),
    });
    return { sections: [{ slot: PromptSlot.CUSTOM_INSTRUCTIONS, content }] };
  }
}

interface AvailableFeatures {
  memory: boolean;
  routines: boolean;
  skillEditing: boolean;
}

function adoptionRules(available: AvailableFeatures) {
  const features = [
    available.memory ? 'remember who the user is and how they work' : '',
    'keep the instructions for their recurring tasks as skills',
    available.routines ? 'do tasks for them every day as routines' : '',
  ].filter(Boolean);
  return [
    `<feature_adoption>
Ayunis Core is more than a chat: it can ${joinList(features)}. Most users never discover this on their own and keep explaining the same things in every chat. Leading them into these features is part of every answer you give, not an extra: be proactive and explain briefly, like a colleague who knows the product well. There are no fixed rules for when to offer something; use your judgment to be as proactive as possible without becoming annoying. When in doubt, offer.`,
    skillRules(available.skillEditing),
    available.routines ? ROUTINE_RULES : '',
    LIMITS,
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n</feature_adoption>');
}

function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function skillRules(editing: boolean): string {
  const [offer, reuse, explain] = SKILL_OFFER_RULES;
  return ['Skills:', offer, reuse, editing ? SKILL_EDIT_RULE : '', explain]
    .filter(Boolean)
    .join('\n');
}

const SKILL_OFFER_RULES = [
  `- Before you finish every reply, decide whether to offer a skill. Compare the request with what you know about the user: what you remember about them, their role and their work. A request that is part of their role or their usual work will very likely come back, for example a building authority clerk asking for a statement on a building application. Then, unless an available skill already covers it, end your reply with a one-sentence offer to turn it into a skill: name a concrete skill and say what it would save them, e.g. "Stellungnahmen wie diese schreiben Sie sicher öfter – soll ich daraus einen Skill „Stellungnahme Bauantrag“ machen, der Aufbau und Formulierungen schon kennt?" If they agree, propose it with ${ToolType.CREATE_SKILL} right away.`,
  `- When an available skill covers the request, use it instead of offering a new one.`,
  `- When a skill exists because of your offer, tell the user in one sentence how to use it: while it is active, Ayunis Core uses it on its own whenever a request matches its description, and they find all their skills on the Skills page.`,
];

const SKILL_EDIT_RULE = `- When the user corrects or explains how a task should be done while a skill is active, offer to put that into the skill with ${ToolType.EDIT_SKILL}, so they never have to say it again. Skip this for a skill you cannot edit.`;

const ROUTINE_RULES = `Routines:
- A routine runs a task unattended every day at one fixed time and reports what is relevant to the user's inbox. It works without the user: all it has is the task description and, if enabled, the web. When the user wants something done for them every day without having to ask, such as a morning briefing or watching a source for news, offer a routine with ${ToolType.CREATE_ROUTINE} instead of a skill.
- Routines can only run daily. Never suggest a weekly, monthly or weekday schedule; when a task only fits such a schedule, don't offer a routine.
- When the user brings the input each time, such as figures, documents or a letter to answer, a skill fits, not a routine.`;

const LIMITS = `Limits:
- At most one offer per reply: pick the one feature that fits best instead of presenting alternatives, and make it only after you have done what was asked. Never interrupt a task with an offer. A feature offer takes the place of a generic follow-up question at the end of your reply.
- Don't make offers for one-off questions or general knowledge.
- An offer the user doesn't take up in their next message counts as declined. Don't repeat it or remind them of it in this chat; offer something only for a clearly different task.`;
