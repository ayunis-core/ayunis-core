import type { ImageGenerationModel } from '../../domain/models/image-generation.model';

export class ImageGenerationInput {
  public readonly model: ImageGenerationModel;
  public readonly prompt: string;
  public readonly size?: string;
  public readonly quality?: string;

  constructor(params: {
    model: ImageGenerationModel;
    prompt: string;
    size?: string;
    quality?: string;
  }) {
    this.model = params.model;
    this.prompt = params.prompt;
    this.size = params.size;
    this.quality = params.quality;
  }
}

export interface ImageGenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export class ImageGenerationResult {
  constructor(
    public readonly imageData: Buffer,
    public readonly contentType: string,
    public readonly revisedPrompt?: string,
    public readonly usage?: ImageGenerationUsage,
  ) {}
}

export abstract class ImageGenerationHandler {
  abstract generate(
    input: ImageGenerationInput,
  ): Promise<ImageGenerationResult>;
}
