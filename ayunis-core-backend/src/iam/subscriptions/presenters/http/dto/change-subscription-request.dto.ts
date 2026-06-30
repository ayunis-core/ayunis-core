import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CreateSubscriptionRequestDto } from './create-subscription-request.dto';
import { OldSubscriptionDisposition } from '../../../domain/value-objects/old-subscription-disposition.enum';

export class ChangeSubscriptionRequestDto extends CreateSubscriptionRequestDto {
  @ApiProperty({
    description:
      'How to handle the current subscription. CANCEL soft-cancels it (kept in history); DELETE removes it entirely. A new subscription is created with the provided data either way.',
    enum: OldSubscriptionDisposition,
    example: OldSubscriptionDisposition.CANCEL,
  })
  @IsEnum(OldSubscriptionDisposition)
  oldSubscriptionDisposition: OldSubscriptionDisposition;
}
