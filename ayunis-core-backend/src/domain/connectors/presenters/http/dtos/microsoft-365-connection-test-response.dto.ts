import { ApiProperty } from '@nestjs/swagger';
import { Microsoft365ConnectionTestOutcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';

export class Microsoft365PermissionResponseDto {
  @ApiProperty({
    description: 'Microsoft Graph application permission',
    example: 'Sites.Selected',
  })
  name: string;

  @ApiProperty({ description: 'Whether Ayunis cannot work without it' })
  required: boolean;

  @ApiProperty({ description: "Whether the app's token carries it" })
  granted: boolean;
}

export class Microsoft365ConnectionTestResponseDto {
  @ApiProperty({
    description:
      'Whether the connection works, or the setup mistake that stops it',
    enum: Microsoft365ConnectionTestOutcome,
    enumName: 'Microsoft365ConnectionTestOutcome',
  })
  outcome: Microsoft365ConnectionTestOutcome;

  @ApiProperty({
    description: 'The Microsoft Graph permissions Ayunis uses',
    type: [Microsoft365PermissionResponseDto],
  })
  permissions: Microsoft365PermissionResponseDto[];

  @ApiProperty({
    description:
      'Microsoft Graph permissions granted to the app that Ayunis does not use',
    type: [String],
  })
  otherGrantedPermissions: string[];

  @ApiProperty({
    description: "Entra's error code when it refused the token",
    type: String,
    nullable: true,
    example: 'AADSTS7000215',
  })
  entraErrorCode: string | null;
}
