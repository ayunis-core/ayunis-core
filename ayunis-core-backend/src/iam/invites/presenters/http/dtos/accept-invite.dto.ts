import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({
    description: 'JWT token from the invite',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  inviteToken: string;

  @ApiProperty({
    description: 'Name of the user accepting the invite',
    example: 'John Doe',
  })
  @IsString()
  userName: string;

  @ApiProperty({
    description: 'Password of the user accepting the invite',
    example: 'password',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Marketing acceptance',
    example: true,
  })
  @IsBoolean()
  hasAcceptedMarketing: boolean;

  @ApiPropertyOptional({
    description: 'Department within the municipality',
    example: 'hauptamt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
