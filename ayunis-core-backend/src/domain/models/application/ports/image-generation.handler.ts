import type { ImageGenerationModel } from '../../domain/models/image-generation.model';

export interface ReferenceImage {
  data: Buffer;
  contentType: string;
}

export class ImageGenerationInput {
  public readonly model: ImageGenerationModel;
  public readonly prompt: string;
  public readonly size?: string;
  public readonly quality?: string;
  public readonly referenceImages?: ReferenceImage[];

  constructor(params: {
    model: ImageGenerationModel;
    prompt: string;
    size?: string;
    quality?: string;
    referenceImages?: ReferenceImage[];
  }) {
    this.model = params.model;
    this.prompt = params.prompt;
    this.size = params.size;
    this.quality = params.quality;
    this.referenceImages = params.referenceImages;
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
