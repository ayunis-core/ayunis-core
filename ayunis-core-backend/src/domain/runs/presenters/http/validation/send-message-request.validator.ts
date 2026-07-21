import { BadRequestException, Injectable } from '@nestjs/common';
import type { SendMessageDto } from '../dto/send-message.dto';
import { MAX_TOTAL_SIZE_BYTES } from '../image-upload.constants';

// Cross-field rules that DTO decorators cannot express: the "at least one
// input" rule spans body fields and uploaded files, and the total-size rule
// aggregates over all files (multer only limits per-file size).
@Injectable()
export class SendMessageRequestValidator {
  validate(dto: SendMessageDto, files: Express.Multer.File[]): void {
    this.requireInput(dto, files);
    this.validateTotalFileSize(files);
  }

  private requireInput(
    dto: SendMessageDto,
    files: Express.Multer.File[],
  ): void {
    const hasInput =
      Boolean(dto.text?.trim()) ||
      files.length > 0 ||
      Boolean(dto.toolResult) ||
      Boolean(dto.skillId);

    if (!hasInput) {
      throw new BadRequestException(
        'Message must contain text, images, tool result, or skillId',
      );
    }
  }

  private validateTotalFileSize(files: Express.Multer.File[]): void {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new BadRequestException(
        `Total file size (${Math.round(totalSize / (1024 * 1024))}MB) exceeds maximum (${MAX_TOTAL_SIZE_BYTES / (1024 * 1024)}MB)`,
      );
    }
  }
}
