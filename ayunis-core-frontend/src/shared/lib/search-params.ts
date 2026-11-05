import { z } from 'zod';

// The router JSON-parses every search value, so a hand-written or external
// URL such as `?search=4711` arrives as a number (and `true` as a boolean);
// values set through the router are quoted and stay strings.
// ponytail: digits beyond 2^53 already lose precision in that parse; a custom
// router parseSearch is the upgrade if long numeric values ever matter.
export const searchParamString = z
  .union([z.string(), z.number(), z.boolean()])
  .transform(String);
