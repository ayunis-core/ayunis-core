// The ?redirect param is attacker-controllable via a crafted link, and the
// router's `to` accepts any string. Only a single-slash absolute path is a
// safe destination: `//host` and `/\host` are read as protocol-relative URLs
// by browsers and would leave the origin.
const SAFE_PATH = /^\/(?![/\\])/;

export function safeRedirectPath(redirect: string | undefined): string {
  return redirect && SAFE_PATH.test(redirect) ? redirect : '/chat';
}
