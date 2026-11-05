import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';

export class UpsertOrgChatSettingsDto {
  @ApiPropertyOptional({
    description: 'Whether internet access is available to the AI assistant',
    example: true,
  })
  @ValidateIf(
    (dto: UpsertOrgChatSettingsDto) =>
      dto.internetSearchEnabled !== undefined ||
      (dto.anonymousModeByDefault === undefined &&
        dto.memoryEnabled === undefined),
  )
  @IsBoolean()
  internetSearchEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether new chats start in anonymous mode; users can opt out',
    example: false,
  })
  @ValidateIf(
    (dto: UpsertOrgChatSettingsDto) => dto.anonymousModeByDefault !== undefined,
  )
  @IsBoolean()
  anonymousModeByDefault?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether the AI assistant may remember durable facts about each user across chats',
    example: false,
  })
  @ValidateIf(
    (dto: UpsertOrgChatSettingsDto) => dto.memoryEnabled !== undefined,
  )
  @IsBoolean()
  memoryEnabled?: boolean;
}
