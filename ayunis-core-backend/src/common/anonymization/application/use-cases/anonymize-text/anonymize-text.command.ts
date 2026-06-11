import type { PiiWhitelistEntry } from '../../../domain/pii-whitelist-entry';

export class AnonymizeTextCommand {
  constructor(
    public readonly text: string,
    public readonly entities?: string[],
    public readonly whitelist?: PiiWhitelistEntry[],
  ) {}
}
