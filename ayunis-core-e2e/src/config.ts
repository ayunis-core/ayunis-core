// Stack endpoints, derived from the frontend URL's slot offset
// (frontend 3001+N*10 → backend 3000+N*10, mailcatcher web 1080+N*10).
// Each can be overridden individually for non-slot targets (e.g. CI).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3021';
const offset = Number(new URL(baseURL).port || '3001') - 3001;

export const config = {
  baseURL,
  apiURL: process.env.E2E_API_URL ?? `http://localhost:${3000 + offset}`,
  mailURL: process.env.E2E_MAIL_URL ?? `http://localhost:${1080 + offset}`,
};
