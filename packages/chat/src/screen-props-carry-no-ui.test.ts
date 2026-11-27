import type { ComponentType, ReactElement, ReactNode } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type { ChatConfig } from './chat-config';
import type { ConversationProps } from './chat-conversation-config';
import type { HistoryProps } from './history';
import type { NewChatProps } from './new-chat';
import type { NewChatComposerProps } from './new-chat-composer';

/*
 * Config inside the chat carries no UI (AYC-2159): no ReactNode, component or
 * render function in `ChatConfig` or the props of the public screens. These
 * checks run in the package's `typecheck`.
 */

type Depth = [never, 0, 1, 2, 3, 4, 5, 6];
type IsAny<T> = 0 extends 1 & T ? true : false;
type Opaque = PromiseLike<unknown> | EventTarget | Blob | Date | RegExp;

/** The paths under `T` that can hold UI, e.g. `.events.render()`. */
type UIPaths<T, Path extends string = '', D extends number = 7> = [D] extends [
  never,
]
  ? never
  : IsAny<T> extends true
    ? Path
    : [ReactElement] extends [T]
      ? Path
      : WalkUIPaths<T, Path, Depth[D]>;

type WalkUIPaths<
  T,
  Path extends string,
  D extends number,
> = T extends abstract new (...args: never) => unknown
  ? Path
  : T extends (...args: never) => infer Result
    ? UIPaths<Result, `${Path}()`, D>
    : T extends Opaque
      ? never
      : T extends ReadonlyMap<unknown, infer Value>
        ? UIPaths<Value, `${Path}[]`, D>
        : T extends ReadonlySet<infer Value> | readonly (infer Value)[]
          ? UIPaths<Value, `${Path}[]`, D>
          : T extends object
            ? {
                [K in keyof T & string]-?: UIPaths<T[K], `${Path}.${K}`, D>;
              }[keyof T & string]
            : never;

/**
 * Exempt on purpose: the tool-card and client-tool registries register a
 * tool's card by name (part of the contract), and `lifecycle` is the handle
 * `createChatRunLifecycle` makes.
 */
type Exempt = 'toolCards' | 'clientTools' | 'lifecycle';
type Checked<T> = {
  [K in keyof T]: K extends Exempt
    ? undefined
    : K extends 'config'
      ? Omit<T[K], Exempt>
      : T[K];
};

describe('the chat configuration', () => {
  it('carries no UI in ChatConfig or the screen props', () => {
    expectTypeOf<UIPaths<Checked<ChatConfig>>>().toEqualTypeOf<never>();
    expectTypeOf<UIPaths<Checked<NewChatProps>>>().toEqualTypeOf<never>();
    expectTypeOf<UIPaths<Checked<ConversationProps>>>().toEqualTypeOf<never>();
    expectTypeOf<UIPaths<Checked<HistoryProps>>>().toEqualTypeOf<never>();
    expectTypeOf<
      UIPaths<Checked<NewChatComposerProps>>
    >().toEqualTypeOf<never>();
  });

  it('would report a node, a component or a render function', () => {
    interface WithUI {
      readonly header?: ReactNode;
      readonly events: { readonly render: (id: string) => ReactNode };
      readonly cards: ReadonlyMap<string, { card: ComponentType }>;
      readonly items: readonly { readonly icon: ReactElement }[];
      readonly label: string;
      readonly onSelect: (id: string) => void;
    }
    expectTypeOf<UIPaths<WithUI>>().toEqualTypeOf<
      | '.header'
      | '.events.render()'
      | '.cards[].card'
      | '.cards[].card()'
      | '.items[].icon'
    >();
  });
});
