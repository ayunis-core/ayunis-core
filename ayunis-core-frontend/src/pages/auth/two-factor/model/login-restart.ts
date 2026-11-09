// After SSO the server sends the two-factor step with its fixed hop as the
// redirect; the real destination sits in session storage. Forwarding the hop
// to /login would make a restarted SSO land on the success page itself.
const SSO_SUCCESS_PATH = '/sso/success';

export function loginRestartSearch(redirect?: string): { redirect?: string } {
  return redirect === SSO_SUCCESS_PATH ? {} : { redirect };
}
