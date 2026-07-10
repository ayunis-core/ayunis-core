import { ApiProperty } from '@nestjs/swagger';

export class RecoveryCodesResponseDto {
  @ApiProperty({
    description:
      'Single-use recovery codes. Shown exactly once — the user must store ' +
      'them before continuing.',
    type: [String],
    example: ['A1B2C-D3E4F', 'G5H6J-K7M8N'],
  })
  recoveryCodes: string[];
}
