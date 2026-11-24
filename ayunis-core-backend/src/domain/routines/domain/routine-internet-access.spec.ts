import {
  ROUTINE_ALLOWED_DOMAINS_MAX,
  RoutineInternetAccess,
  routineInternetSettings,
  runAllowedDomains,
} from './routine-internet-access';

describe('routineInternetSettings', () => {
  it('stores URLs and hosts as lowercase hosts, once each', () => {
    expect(
      routineInternetSettings(RoutineInternetAccess.ALLOWLIST, [
        'https://Recht.NRW.de/path?x=1',
        ' recht.nrw.de. ',
        'nrw.de',
      ]),
    ).toEqual({
      ok: true,
      settings: {
        internetAccess: RoutineInternetAccess.ALLOWLIST,
        allowedDomains: ['recht.nrw.de', 'nrw.de'],
      },
    });
  });

  it.each([
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- the rejected input
    ['192.168.0.1', 'ip-address'],
    ['*.nrw.de', 'wildcard'],
    ['localhost', 'missing-dot'],
  ])('rejects %s (%s)', (domain, reason) => {
    expect(
      routineInternetSettings(RoutineInternetAccess.ALLOWLIST, [
        'nrw.de',
        domain,
      ]),
    ).toEqual({ ok: false, problem: { reason, domain } });
  });

  it(`rejects more than ${ROUTINE_ALLOWED_DOMAINS_MAX} domains`, () => {
    const domains = Array.from({ length: 21 }, (_, i) => `amt${i}.nrw.de`);

    expect(
      routineInternetSettings(RoutineInternetAccess.ALLOWLIST, domains),
    ).toEqual({ ok: false, problem: { reason: 'too-many' } });
  });

  it('counts duplicates once towards the limit', () => {
    const domains = [
      ...Array.from({ length: 20 }, (_, i) => `amt${i}.nrw.de`),
      'AMT0.nrw.de',
    ];

    expect(
      routineInternetSettings(RoutineInternetAccess.ALLOWLIST, domains).ok,
    ).toBe(true);
  });

  it('needs a domain in allowlist mode only', () => {
    expect(
      routineInternetSettings(RoutineInternetAccess.ALLOWLIST, []),
    ).toEqual({ ok: false, problem: { reason: 'required' } });
    expect(routineInternetSettings(RoutineInternetAccess.ALL, []).ok).toBe(
      true,
    );
  });

  it('keeps the domains in another mode, where the run ignores them', () => {
    const result = routineInternetSettings(RoutineInternetAccess.ALL, [
      'nrw.de',
    ]);

    expect(result).toMatchObject({ settings: { allowedDomains: ['nrw.de'] } });
    expect(
      runAllowedDomains({
        internetAccess: RoutineInternetAccess.ALL,
        allowedDomains: ['nrw.de'],
      }),
    ).toBeUndefined();
  });
});
