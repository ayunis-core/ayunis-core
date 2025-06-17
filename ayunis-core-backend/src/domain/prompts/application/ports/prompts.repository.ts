import { Prompt } from '../../domain/prompt.entity';
import { UUID } from 'crypto';

export abstract class PromptsRepository {
  abstract create(prompt: Prompt): Promise<Prompt>;
  abstract findOne(id: UUID, userId: UUID): Promise<Prompt | null>;
  abstract findAllByUser(userId: UUID): Promise<Prompt[]>;
  abstract update(prompt: Prompt): Promise<Prompt>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
}
