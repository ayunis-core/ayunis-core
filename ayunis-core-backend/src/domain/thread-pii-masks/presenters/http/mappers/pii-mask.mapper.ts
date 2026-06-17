import { Injectable } from '@nestjs/common';
import type { ThreadPiiMask } from '../../../domain/thread-pii-mask.entity';
import { PiiMaskResponseDto } from '../dtos/pii-mask-response.dto';

@Injectable()
export class PiiMaskDtoMapper {
  toDto(mask: ThreadPiiMask): PiiMaskResponseDto {
    return {
      token: mask.token,
      value: mask.value,
      category: mask.category,
    };
  }

  toDtoArray(masks: ThreadPiiMask[]): PiiMaskResponseDto[] {
    return masks.map((mask) => this.toDto(mask));
  }
}
