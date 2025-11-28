import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateTrialRequestDto {
  @ApiProperty({
    description: 'Maximum number of messages allowed in the trial',
    example: 2000,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxMessages?: number;

  @ApiProperty({
    description:
      'Number of messages already sent (can be used to reset or adjust)',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  messagesSent?: number;
}
