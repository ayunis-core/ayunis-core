export function markToolAsRecentlyActivated(
  activatedToolNames: Set<string>,
  toolName: string,
): void {
  activatedToolNames.delete(toolName);
  activatedToolNames.add(toolName);
}
