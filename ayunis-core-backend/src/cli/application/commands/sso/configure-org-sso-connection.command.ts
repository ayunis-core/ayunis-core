import type { UUID } from 'crypto';
import { Command, CommandRunner, Option } from 'nest-commander';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import {
  parseBooleanOption,
  parseOrgIdOption,
} from 'src/cli/application/commands/sso/sso-command-options';
import { writeSsoCommandResult } from 'src/cli/application/commands/sso/sso-command-output';

interface ConfigureSsoOptions {
  orgId: UUID;
  emailDomain: string;
  zitadelOrgId: string;
  jitProvisioningEnabled: boolean;
}

@Command({
  name: 'sso:configure',
  description: 'Configure an organization SSO connection',
})
export class ConfigureOrgSsoConnectionCliCommand extends CommandRunner {
  constructor(private readonly useCase: ConfigureOrgSsoConnectionUseCase) {
    super();
  }

  @Option({
    flags: '--org-id <orgId>',
    description: 'Ayunis organization UUID',
    required: true,
  })
  parseOrgId(value: string): UUID {
    return parseOrgIdOption(value);
  }

  @Option({
    flags: '--email-domain <emailDomain>',
    description: 'Verified customer email domain',
    required: true,
  })
  parseEmailDomain(value: string): string {
    return value;
  }

  @Option({
    flags: '--zitadel-org-id <zitadelOrgId>',
    description: 'Zitadel organization ID',
    required: true,
  })
  parseZitadelOrgId(value: string): string {
    return value;
  }

  @Option({
    flags: '--jit-provisioning-enabled <boolean>',
    description: 'Whether JIT account provisioning is enabled',
    required: true,
  })
  parseJitProvisioningEnabled(value: string): boolean {
    return parseBooleanOption(value);
  }

  async run(_: string[], options: ConfigureSsoOptions): Promise<void> {
    const connection = await this.useCase.execute(
      new ConfigureOrgSsoConnectionCommand(
        options.orgId,
        options.emailDomain,
        options.zitadelOrgId,
        options.jitProvisioningEnabled,
      ),
    );
    writeSsoCommandResult('configured', connection);
  }
}
