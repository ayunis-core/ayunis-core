import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export class SuccessResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Whether the credentials were accepted',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description:
      'True when a second factor is required before a session is issued. ' +
      'Complete the login via /auth/mfa/verify (or /auth/mfa/setup when ' +
      'enrollmentRequired is true).',
    example: false,
  })
  mfaRequired: boolean;

  @ApiProperty({
    description:
      'True when the org requires two-factor auth and the user must enroll ' +
      'before receiving a session.',
    example: false,
  })
  enrollmentRequired: boolean;
}

export class MfaLoginConfirmResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description:
      'Single-use recovery codes issued on enrollment. Shown exactly once.',
    type: [String],
  })
  recoveryCodes: string[];
}

export class MeResponseDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User system role',
    enum: SystemRole,
    example: SystemRole.SUPER_ADMIN,
  })
  systemRole: SystemRole;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Authentication failed',
  })
  message: string;
}
