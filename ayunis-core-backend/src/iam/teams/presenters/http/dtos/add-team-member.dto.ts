import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { UUID } from 'crypto';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'The user ID to add to the team',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: UUID;
}
