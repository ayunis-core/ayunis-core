export class UpsertMemoryEntryCommand {
  constructor(
    public readonly key: string,
    public readonly content: string,
    /** `undefined` keeps the stored description; empty or `null` clears it. */
    public readonly description?: string | null,
  ) {}
}
