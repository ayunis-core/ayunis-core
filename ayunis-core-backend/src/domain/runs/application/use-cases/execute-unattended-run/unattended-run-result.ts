/**
 * How an unattended execution ended. `nudges` counts the nudges sent;
 * `aborted` means the caller's signal stopped it.
 */
export type UnattendedRunResult =
  | { readonly status: 'done'; readonly nudges: number }
  | {
      readonly status: 'failed';
      readonly nudges: number;
      readonly reason: string;
    }
  | { readonly status: 'aborted'; readonly nudges: number };
