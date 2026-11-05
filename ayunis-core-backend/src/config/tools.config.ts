import { registerAs } from '@nestjs/config';

interface TextPageLimits {
  maxLines: number;
  maxChars: number;
}

export interface ToolsConfig {
  sourceGetText: TextPageLimits;
  websiteContent: TextPageLimits;
}

const parseIntWithDefault = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const parsed = parseInt(value || String(defaultValue), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export default registerAs('tools', (): ToolsConfig => ({
  sourceGetText: {
    maxLines: parseIntWithDefault(process.env.SOURCE_GET_TEXT_MAX_LINES, 200),
    maxChars: parseIntWithDefault(process.env.SOURCE_GET_TEXT_MAX_CHARS, 5000),
  },
  // Cleaned web pages up to ~15k tokens come back in one call; the line limit
  // is set high enough that the character limit is what bounds a page.
  websiteContent: {
    maxLines: 2_000,
    maxChars: 60_000,
  },
}));
