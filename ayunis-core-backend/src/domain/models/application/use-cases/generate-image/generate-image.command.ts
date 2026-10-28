import type { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import type { ReferenceImage } from 'src/domain/models/application/ports/image-generation.handler';

export class GenerateImageCommand {
  public readonly model: ImageGenerationModel;
  public readonly prompt: string;
  public readonly size?: string;
  public readonly quality?: string;
  public readonly background?: 'transparent';
  public readonly referenceImages?: ReferenceImage[];

  constructor(params: {
    model: ImageGenerationModel;
    prompt: string;
    size?: string;
    quality?: string;
    background?: 'transparent';
    referenceImages?: ReferenceImage[];
  }) {
    this.model = params.model;
    this.prompt = params.prompt;
    this.size = params.size;
    this.quality = params.quality;
    this.background = params.background;
    this.referenceImages = params.referenceImages;
  }
}
