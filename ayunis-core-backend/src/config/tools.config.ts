import { registerAs } from '@nestjs/config';

export interface ToolsConfig {
  sourceGetText: {
    maxLines: number;
    maxChars: number;
  };
}

export default registerAs(
  'tools',
  (): ToolsConfig => ({
    sourceGetText: {
      maxLines: parseInt(process.env.SOURCE_GET_TEXT_MAX_LINES || '200', 10),
      maxChars: parseInt(process.env.SOURCE_GET_TEXT_MAX_CHARS || '5000', 10),
    },
  }),
);
