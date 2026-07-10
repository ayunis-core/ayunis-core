import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({
    description:
      'Base32 TOTP secret for manual entry in an authenticator app. Shown ' +
      'only during setup and never again.',
  })
  secret: string;

  @ApiProperty({
    description: 'otpauth:// URI encoded in the QR code.',
  })
  otpauthUri: string;

  @ApiProperty({
    description: 'QR code for the otpauth URI as a PNG data URI.',
  })
  qrCodeDataUri: string;
}
