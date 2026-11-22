import { ApiProperty } from '@nestjs/swagger';
import {
  SharePointLocationKind,
  SharePointResolutionOutcome,
} from 'src/domain/connectors/application/models/sharepoint-location';
import { SharePointGrantScope } from 'src/domain/connectors/domain/microsoft-365/sharepoint-grant';

export class SharePointGrantResponseDto {
  @ApiProperty({
    description:
      'What the grant covers: the whole site (Sites.Selected) or one folder (Files.SelectedOperations.Selected)',
    enum: SharePointGrantScope,
    enumName: 'SharePointGrantScope',
  })
  scope: SharePointGrantScope;

  @ApiProperty({
    description:
      'Microsoft Graph PowerShell commands that grant the organization’s app read access, for the Microsoft 365 admin',
  })
  command: string;
}

export class SharePointLocationResolutionResponseDto {
  @ApiProperty({
    description:
      'Found, not granted to Ayunis, not found or not granted (where Microsoft Graph cannot tell), not found, or not a URL of a site, library or folder',
    enum: SharePointResolutionOutcome,
    enumName: 'SharePointResolutionOutcome',
  })
  outcome: SharePointResolutionOutcome;

  @ApiProperty({
    description: 'What was found',
    enum: SharePointLocationKind,
    enumName: 'SharePointLocationKind',
    nullable: true,
  })
  kind: SharePointLocationKind | null;

  @ApiProperty({
    description: 'The name of what was found',
    type: String,
    nullable: true,
    example: 'Satzungen',
  })
  name: string | null;

  @ApiProperty({
    description:
      'SharePoint’s own URL of what was found, to add as the synced location',
    type: String,
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    description: 'How to grant it, when it is not (or may not be) granted',
    type: SharePointGrantResponseDto,
    nullable: true,
  })
  grant: SharePointGrantResponseDto | null;
}
