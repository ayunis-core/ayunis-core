import type { AnonymizationLanguage } from '../../ports/anonymization.port';

export class AnonymizeTextCommand {
  constructor(
    public readonly text: string,
    public readonly language: AnonymizationLanguage,
    public readonly entities?: string[],
  ) {}
}
