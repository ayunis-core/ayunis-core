import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateThreadInstructionDto {
  @ApiProperty({
    description: 'The instruction for the thread',
    example:
      'Please analyze the attached documents and provide insights on market trends.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  instruction: string;
}
