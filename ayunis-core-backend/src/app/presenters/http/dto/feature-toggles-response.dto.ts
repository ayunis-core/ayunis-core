import { ApiProperty } from '@nestjs/swagger';

export class FeatureTogglesResponseDto {
  @ApiProperty({
    description: 'Cloud subscriptions are managed externally',
    default: false,
  })
  externalSubscriptionsEnabled: boolean;

  @ApiProperty({
    description: 'Users can create routines that run on their behalf',
    default: false,
  })
  routinesEnabled: boolean;

  @ApiProperty({
    description:
      'Users can keep meeting recordings owned by them, a team, a workspace or the organization',
    default: false,
  })
  recordingsEnabled: boolean;

  @ApiProperty({
    description:
      'Release notes of Ayunis arrive in the inbox (needs routines and a configured release-note source)',
    default: false,
  })
  releaseNotesEnabled: boolean;

  @ApiProperty({
    description:
      'Voice input is available (needs a configured Mistral API key)',
    default: false,
  })
  voiceEnabled: boolean;

  @ApiProperty({
    description:
      'Assistant messages can be read aloud (opt-in, needs voice to be available)',
    default: false,
  })
  readAloudEnabled: boolean;

  @ApiProperty({
    description:
      'The Outlook add-in can be installed (manifest) and signed in to (session handoff)',
    default: false,
  })
  outlookAddinEnabled: boolean;

  @ApiProperty({
    description:
      'The assistant remembers facts about each user across chats, and users can manage what it remembers',
    default: false,
  })
  memoryEnabled: boolean;

  @ApiProperty({
    description:
      'Admins can connect the organization to external products such as Microsoft 365 (Connections)',
    default: false,
  })
  connectorsEnabled: boolean;
}
