import type { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import type { ReferenceImage } from '../../ports/image-generation.handler';

export class GenerateImageCommand {
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
