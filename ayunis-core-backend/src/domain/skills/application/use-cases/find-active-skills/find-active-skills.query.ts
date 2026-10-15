/**
 * Query for finding all active skills for the current user.
 * Used by run execution to build the system prompt and activate_skill tool.
 * Mandatory organisation skills are forced in only outside workspace chats.
 */
export class FindActiveSkillsQuery {
  constructor(readonly includeMandatory: boolean = true) {}
}
