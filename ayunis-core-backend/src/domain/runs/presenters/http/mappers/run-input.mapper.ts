import {
  RunInput,
  RunUserInput,
  RunToolResultInput,
  RunImageInput,
} from 'src/domain/runs/domain/run-input.entity';
import { SendMessageDto } from '../dto/send-message.dto';

export class RunInputMapper {
  static toCommand(dto: SendMessageDto['input']): RunInput {
    if (dto.type === 'text') {
      return new RunUserInput(dto.text, []);
    }
    if (dto.type === 'image') {
      const runImages: RunImageInput[] = dto.images.map(
        (image) => new RunImageInput(image.imageUrl, image.altText),
      );
      // ImageInput maps to RunUserInput with empty text and images
      return new RunUserInput('', runImages);
    }
    if (dto.type === 'tool_result') {
      return new RunToolResultInput(dto.toolId, dto.toolName, dto.result);
    }
    // This should never happen, but TypeScript needs it for exhaustiveness
    const invalidType = dto as { type?: string };
    throw new Error(`Invalid input type: ${String(invalidType.type)}`);
  }
}
