import {
  RunInput,
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { ImageUploadData } from 'src/domain/runs/domain/run-input.entity';

export class RunInputMapper {
  /**
   * Converts DTO + uploaded files to RunInput.
   *
   * @param dto - The SendMessageDto from the request body
   * @param files - Array of uploaded files (from @UploadedFiles())
   */
  static toCommand(
    dto: SendMessageDto,
    files: Express.Multer.File[] = [],
  ): RunInput {
    // Handle tool result input
    if (dto.toolResult) {
      return new RunToolResultInput(
        dto.toolResult.toolId,
        dto.toolResult.toolName,
        dto.toolResult.result,
      );
    }

    // Handle user input (text and/or images)
    const pendingImages: ImageUploadData[] = files.map((file, index) => ({
      buffer: file.buffer,
      contentType: file.mimetype,
      altText: dto.imageAltTexts?.[index],
    }));

    return new RunUserInput(dto.text ?? '', pendingImages);
  }
}
