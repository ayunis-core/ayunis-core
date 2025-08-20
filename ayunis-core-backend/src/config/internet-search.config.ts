import { registerAs } from '@nestjs/config';

export default registerAs('internetSearch', () => ({
  isAvailable:
    process.env.BRAVE_SEARCH_URL &&
    process.env.BRAVE_SEARCH_API_KEY &&
    process.env.BRAVE_SEARCH_API_KEY !== '',
  brave: {
    url: process.env.BRAVE_SEARCH_URL,
    apiKey: process.env.BRAVE_SEARCH_API_KEY,
  },
}));
