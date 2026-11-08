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
}
