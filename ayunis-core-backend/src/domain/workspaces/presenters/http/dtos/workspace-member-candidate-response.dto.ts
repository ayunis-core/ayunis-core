import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceMemberCandidateResponseDto {
  @ApiProperty({
    description: 'The user ID of the colleague',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'The name of the colleague',
    example: 'Ben Maier',
  })
  name: string;

  @ApiProperty({
    description: 'The email of the colleague',
    example: 'ben.maier@example.com',
  })
  email: string;
}
