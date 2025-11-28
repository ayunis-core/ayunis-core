import {
  RunInput,
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { PendingImageUpload } from 'src/domain/messages/domain/value-objects/pending-image-upload.value-object';

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
    const pendingImages = files.map((file, index) => {
      const altText = dto.imageAltTexts?.[index];
      return new PendingImageUpload(file.buffer, file.mimetype, altText);
    });

    return new RunUserInput(dto.text ?? '', pendingImages);
  }
}
