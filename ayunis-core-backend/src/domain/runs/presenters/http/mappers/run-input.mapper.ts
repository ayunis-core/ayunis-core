import type { RunInput } from 'src/domain/runs/domain/run-input.entity';
import {
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import type { SendMessageDto } from 'src/domain/runs/presenters/http/dto/send-message.dto';
import type { ImageUploadData } from 'src/domain/runs/domain/run-input.entity';
import type { UUID } from 'crypto';
import { uploadedImageFile } from 'src/domain/runs/presenters/http/upload-bytes';

export class RunInputMapper {
  /**
   * Converts DTO + uploaded files to RunInput.
   *
   * @param dto - The SendMessageDto from the request body
   * @param files - Array of uploaded files (from @UploadedFiles())
   * @param skillId - Optional skill ID for skill activation
   */
  static toCommand(
    dto: SendMessageDto,
    files: Express.Multer.File[] = [],
    skillId?: UUID,
  ): RunInput {
    const pendingImages: ImageUploadData[] = files.map((file, index) => ({
      buffer: uploadedImageFile(file).bytes.take(),
      contentType: file.mimetype,
      altText: dto.imageAltTexts?.[index],
    }));
    if (dto.toolResult) {
      return new RunToolResultInput(
        dto.toolResult.toolId,
        dto.toolResult.toolName,
        dto.toolResult.result,
      );
    }

    return new RunUserInput(dto.text ?? '', pendingImages, skillId);
  }
}
