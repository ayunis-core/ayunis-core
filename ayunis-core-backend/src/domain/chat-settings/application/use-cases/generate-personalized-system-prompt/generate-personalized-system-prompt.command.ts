export class GeneratePersonalizedSystemPromptCommand {
  public readonly preferredName: string;
  public readonly communicationStyle?: string;
  public readonly workContext?: string;

  constructor(params: {
    preferredName: string;
    communicationStyle?: string;
    workContext?: string;
  }) {
    this.preferredName = params.preferredName;
    this.communicationStyle = params.communicationStyle;
    this.workContext = params.workContext;
  }
}
