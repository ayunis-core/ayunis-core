export class ModelConfig {
  public readonly displayName: string;
  public readonly canStream: boolean;
  public readonly isReasoning: boolean;
  public readonly isArchived: boolean;

  constructor(params: {
    displayName: string;
    canStream: boolean;
    isReasoning: boolean;
    isArchived: boolean;
  }) {
    this.displayName = params.displayName;
    this.canStream = params.canStream;
    this.isReasoning = params.isReasoning;
    this.isArchived = params.isArchived;
  }
}
