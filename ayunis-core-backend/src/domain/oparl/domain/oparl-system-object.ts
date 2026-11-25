import type { OparlSystemMetadata } from './oparl-system.entity';

const SYSTEM_TYPE = /^https?:\/\/schema\.oparl\.org\/1\.\d+\/System$/;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** An OParl 1.0/1.1 `System`: its type, an ID and the URL of its body list. */
export function isOparlSystemObject<
  T extends { id: string; [property: string]: unknown },
>(object: T): object is T & { body: string } {
  return (
    typeof object.type === 'string' &&
    SYSTEM_TYPE.test(object.type) &&
    typeof object.body === 'string'
  );
}

export function systemMetadata(object: {
  id: string;
  [property: string]: unknown;
}): OparlSystemMetadata {
  return {
    oparlId: object.id,
    name: text(object.name),
    vendor: text(object.vendor),
    product: text(object.product),
    oparlVersion: text(object.oparlVersion),
    website: text(object.website),
    raw: object,
  };
}
