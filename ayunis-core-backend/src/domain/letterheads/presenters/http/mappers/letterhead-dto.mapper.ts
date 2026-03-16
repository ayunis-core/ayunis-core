import { Injectable } from '@nestjs/common';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadResponseDto } from '../dtos/letterhead-response.dto';

@Injectable()
export class LetterheadDtoMapper {
  toDto(letterhead: Letterhead): LetterheadResponseDto {
    const dto = new LetterheadResponseDto();
    dto.id = letterhead.id;
    dto.name = letterhead.name;
    dto.description = letterhead.description;
    dto.firstPageMargins = { ...letterhead.firstPageMargins };
    dto.continuationPageMargins = { ...letterhead.continuationPageMargins };
    dto.hasContinuationPage = letterhead.continuationPageStoragePath !== null;
    dto.createdAt = letterhead.createdAt.toISOString();
    dto.updatedAt = letterhead.updatedAt.toISOString();
    return dto;
  }
}
