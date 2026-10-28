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
      dto.anonymousModeByDefault === undefined,
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
}
