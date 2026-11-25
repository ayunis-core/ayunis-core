export class ImproveRoutinePromptCommand {
  public readonly name?: string;
  public readonly language?: 'en' | 'de';
  public readonly prompt: string;
  public readonly consumeTrialMessage: boolean;

  constructor(params: {
    name?: string;
    language?: 'en' | 'de';
    prompt: string;
    consumeTrialMessage: boolean;
  }) {
    this.name = params.name;
    this.language = params.language;
    this.prompt = params.prompt;
    this.consumeTrialMessage = params.consumeTrialMessage;
  }
}
