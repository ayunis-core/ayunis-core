import type { UUID } from 'crypto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 20;
const MAX_NOTIFICATIONS_PAGE_SIZE = 100;

export class FindNotificationsQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of notifications to return',
    default: DEFAULT_NOTIFICATIONS_PAGE_SIZE,
    maximum: MAX_NOTIFICATIONS_PAGE_SIZE,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_NOTIFICATIONS_PAGE_SIZE)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of notifications to skip',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    description:
      "Only the notifications this routine sent. Another user's routine yields none.",
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  routineId?: UUID;

  @ApiPropertyOptional({
    description: 'Only the notifications of this type',
    enum: NotificationType,
    enumName: 'NotificationType',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
