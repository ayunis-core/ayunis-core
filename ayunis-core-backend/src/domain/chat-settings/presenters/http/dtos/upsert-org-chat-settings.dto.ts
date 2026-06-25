import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpsertOrgChatSettingsDto {
  @ApiProperty({
    description:
      'Whether internet access (web search and website content tools) is available to the AI assistant in chats',
    example: true,
  })
  @IsBoolean()
  internetSearchEnabled: boolean;
}
