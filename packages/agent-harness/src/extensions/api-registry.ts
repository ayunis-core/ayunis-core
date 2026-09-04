import {
  MissingExtensionError,
  type ExtensionApi,
  type ExtensionDefinitionIdentity,
} from '@ayunis/agent-extensions';

interface RegisteredApi {
  readonly ownerName: string;
  readonly value: unknown;
}

export class ApiRegistry {
  private readonly entries = new Map<
    ExtensionDefinitionIdentity,
    RegisteredApi
  >();

  register(
    definition: ExtensionDefinitionIdentity,
    ownerName: string,
    value: unknown,
  ): void {
    this.entries.set(definition, { ownerName, value });
  }

  use<Definition extends ExtensionDefinitionIdentity>(
    consumerName: string,
    definition: Definition,
  ): ExtensionApi<Definition> {
    const api = this.entries.get(definition);
    if (!api) {
      throw new MissingExtensionError(consumerName, definition.name);
    }
    return api.value;
  }

  useOptional<Definition extends ExtensionDefinitionIdentity>(
    definition: Definition,
  ): ExtensionApi<Definition> | undefined {
    return this.entries.get(definition)?.value;
  }
}
