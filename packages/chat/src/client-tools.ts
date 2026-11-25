import type { ToolCardRegistration } from './tool-cards';

export interface ClientToolCall {
  readonly id: string;
  readonly name: string;
  readonly params: Record<string, unknown>;
}

export type ClientToolExecutor<Context, Outcome> = (
  call: ClientToolCall,
  context: Context,
) => Promise<Outcome>;

export interface ClientToolRegistration<Context, Outcome> {
  readonly execute?: ClientToolExecutor<Context, Outcome>;
  readonly render?: ToolCardRegistration['render'];
}

export function createClientToolRegistry<Context, Outcome>(
  registrations: Readonly<
    Record<string, ClientToolRegistration<Context, Outcome>>
  >,
): ReadonlyMap<string, ClientToolRegistration<Context, Outcome>> {
  return new Map(Object.entries(registrations));
}
