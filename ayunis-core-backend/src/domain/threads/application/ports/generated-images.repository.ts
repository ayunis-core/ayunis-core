import type { UUID } from 'crypto';
import type { GeneratedImage } from '../../domain/generated-image.entity';

export abstract class GeneratedImagesRepository {
  abstract save(image: GeneratedImage): Promise<GeneratedImage>;
  abstract findById(id: UUID): Promise<GeneratedImage | null>;
  abstract findByIdAndThreadId(
    id: UUID,
    threadId: UUID,
  ): Promise<GeneratedImage | null>;
  abstract findByThreadId(threadId: UUID): Promise<GeneratedImage[]>;
}
