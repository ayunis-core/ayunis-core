import type { ImageGenerationModel } from '../../../domain/models/image-generation.model';

export class GenerateImageCommand {
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
