import { ApiProperty } from '@nestjs/swagger';

export class TriggerPasswordResetResponseDto {
  @ApiProperty({
    description: 'The password reset URL sent to the user',
    example: 'https://app.ayunis.de/password/reset?token=eyJhbGci...',
  })
  resetUrl: string;

  constructor(resetUrl: string) {
    this.resetUrl = resetUrl;
  }
}
