import type { UUID } from 'crypto';
import { Command, CommandRunner, Option } from 'nest-commander';
import {
  parseBooleanOption,
  parseOrgIdOption,
} from 'src/cli/application/commands/sso/sso-command-options';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { writeSsoCommandResult } from 'src/cli/application/commands/sso/sso-command-output';

interface SetJitOptions {
  orgId: UUID;
  enabled: boolean;
}

@Command({
  name: 'sso:set-jit',
  description: 'Set JIT provisioning for an organization SSO connection',
})
export class SetOrgSsoJitProvisioningCliCommand extends CommandRunner {
  constructor(private readonly useCase: SetOrgSsoJitProvisioningUseCase) {
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
    flags: '--enabled <boolean>',
    description: 'Whether JIT account provisioning is enabled',
    required: true,
  })
  parseEnabled(value: string): boolean {
    return parseBooleanOption(value);
  }

  async run(_: string[], options: SetJitOptions): Promise<void> {
    const connection = await this.useCase.execute(
      new SetOrgSsoJitProvisioningCommand(options.orgId, options.enabled),
    );
    writeSsoCommandResult('jit_updated', connection);
  }
}
