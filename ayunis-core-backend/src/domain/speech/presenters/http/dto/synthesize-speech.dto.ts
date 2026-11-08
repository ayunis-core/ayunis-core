import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  UI_LANGUAGES,
  type UiLanguage,
} from 'src/domain/speech/domain/speech-language';

// Bounds cost and generation time per request: about 20 minutes of speech.
export const MAX_SPEECH_TEXT_LENGTH = 30_000;

export class SynthesizeSpeechDto {
  @ApiProperty({
    description: 'Plain text to read aloud, without markup',
    maxLength: MAX_SPEECH_TEXT_LENGTH,
  })
  @IsString()
  @Matches(/\S/, { message: 'text must not be empty' })
  @MaxLength(MAX_SPEECH_TEXT_LENGTH)
  text: string;

  @ApiPropertyOptional({
    enum: UI_LANGUAGES,
    description:
      'Current UI language, used when the language of the text is unidentifiable; defaults to English',
  })
  @IsOptional()
  @IsIn(UI_LANGUAGES)
  language?: UiLanguage;
}
