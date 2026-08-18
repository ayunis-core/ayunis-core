import { Injectable } from '@nestjs/common';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { PiiMaskResponseDto } from 'src/domain/thread-pii-masks/presenters/http/dtos/pii-mask-response.dto';

@Injectable()
export class PiiMaskDtoMapper {
  toDto(mask: ThreadPiiMask): PiiMaskResponseDto {
    return {
      id: mask.id,
      token: mask.token,
      value: mask.value,
      category: mask.category,
      unmasked: mask.unmasked,
    };
  }

  toDtoArray(masks: ThreadPiiMask[]): PiiMaskResponseDto[] {
    return masks.map((mask) => this.toDto(mask));
  }
}
