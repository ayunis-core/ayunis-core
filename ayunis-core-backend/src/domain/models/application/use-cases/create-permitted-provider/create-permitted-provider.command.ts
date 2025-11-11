import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

export class CreatePermittedProviderCommand {
  permittedProvider: PermittedProvider;

  constructor(params: { permittedProvider: PermittedProvider }) {
    this.permittedProvider = params.permittedProvider;
  }
}
