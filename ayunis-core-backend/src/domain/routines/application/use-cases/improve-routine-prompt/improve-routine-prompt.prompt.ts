import type { ImproveRoutinePromptCommand } from './improve-routine-prompt.command';

const TASK_GUIDANCE = `You are rewriting the TASK of a routine. A routine runs its task unattended on a schedule: nobody watches the run and nobody can answer questions, and the user only hears from it through a notification. The task is the run's first and only message, so it has to stand on its own.
- Keep every goal, source, rule, exception and piece of domain knowledge the author wrote down. Keep placeholders in square brackets as they are, for the author to fill in.
- Start with one sentence that states the goal, then give the steps in the order the assistant should work through them, numbered "1.", "2." and so on.
- Make every decision one the assistant can take alone: replace questions to the user and vague phrases such as "if needed" or "keep me posted" with what to check and what counts as relevant.
- Say when the user should be notified and what the notification contains, for example a short summary with links to the sources. When the task implies that a run can find nothing worth reporting, say that such a run ends without a notification.
- When the author was brief, expand on how to work — never on what is true. Do not add sources, websites, rules, legal facts, deadlines or figures the author did not write.
- Do not introduce new prohibitions or disclaimers unless the author explicitly included them. Preserve the author’s exact restrictions.
- Leave out when the routine runs; its schedule is set separately.`;

export function buildImproveRoutinePromptPrompt(
  command: ImproveRoutinePromptCommand,
): string {
  return `${TASK_GUIDANCE}

When the author’s text has an identifiable language, write in that language, even if it differs from the UI language. Random characters, gibberish, numbers and punctuation are not evidence of English. If the language cannot be confidently determined, write in ${command.language === 'de' ? 'German' : 'English'}, the user's current UI language. Keep their voice and their level of formality — this stays their routine. Return only the rewritten task as plain text, without quotes, labels or any explanation. It is shown in a plain text field, so do not use Markdown: no #, no ** or __, no --- separators.

Routine name: ${command.name?.trim() || '(not given yet)'}

Task as written by the author:
${command.prompt.trim()}`;
}
