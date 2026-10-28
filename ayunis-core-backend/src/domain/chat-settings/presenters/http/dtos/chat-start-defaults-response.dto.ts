import { ApiProperty } from '@nestjs/swagger';

export class ChatStartDefaultsResponseDto {
  @ApiProperty({
    description: 'Whether new chats start in anonymous mode; users may opt out',
    example: false,
  })
  anonymousModeByDefault: boolean;
}
