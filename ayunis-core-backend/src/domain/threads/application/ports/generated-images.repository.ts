import type { UUID } from 'crypto';
import type { GeneratedImage } from '../../domain/generated-image.entity';

export abstract class GeneratedImagesRepository {
  abstract save(image: GeneratedImage): Promise<GeneratedImage>;
  abstract findByIdAndThreadId(
    id: UUID,
    threadId: UUID,
  ): Promise<GeneratedImage | null>;
  abstract findManyByThreadId(threadId: UUID): Promise<GeneratedImage[]>;
}
