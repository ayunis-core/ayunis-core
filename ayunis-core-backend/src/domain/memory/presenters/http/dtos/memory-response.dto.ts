import { ApiProperty } from '@nestjs/swagger';
import { MemoryEntryResponseDto } from './memory-entry-response.dto';

export class MemoryResponseDto {
  @ApiProperty({
    description:
      'All memory entries of the authenticated user. The reserved keys are always present, the reserved keys first.',
    type: [MemoryEntryResponseDto],
  })
  entries: MemoryEntryResponseDto[];
}
