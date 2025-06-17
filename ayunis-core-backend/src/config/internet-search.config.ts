import { registerAs } from '@nestjs/config';

export default registerAs('internetSearch', () => ({
  brave: {
    url: process.env.BRAVE_SEARCH_URL,
    apiKey: process.env.BRAVE_SEARCH_API_KEY,
  },
}));
