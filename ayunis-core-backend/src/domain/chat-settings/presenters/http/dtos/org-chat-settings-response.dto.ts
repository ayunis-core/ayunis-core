import { ApiProperty } from '@nestjs/swagger';

export class OrgChatSettingsResponseDto {
  @ApiProperty({
    description:
      'Whether internet access (web search and website content tools) is available to the AI assistant in chats',
    example: true,
  })
  internetSearchEnabled: boolean;
}
