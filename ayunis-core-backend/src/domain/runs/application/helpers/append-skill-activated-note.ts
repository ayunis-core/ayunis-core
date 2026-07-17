export function appendSkillActivatedNote(
  instructions: string | undefined,
  skillName: string | undefined,
): string {
  if (!skillName) {
    return instructions ?? '';
  }
  const note = `<already_activated_skill>
Skill "${skillName}" has already been activated on this thread. Do not call activate_skill for this skill.
</already_activated_skill>`;
  return instructions ? `${instructions}\n\n${note}` : note;
}
