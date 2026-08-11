import type { UUID } from 'crypto';
import { Command, CommandRunner, Option } from 'nest-commander';
import { parseOrgIdOption } from 'src/cli/application/commands/sso/sso-command-options';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { writeSsoCommandResult } from 'src/cli/application/commands/sso/sso-command-output';

interface OrgSsoOptions {
  orgId: UUID;
}

@Command({
  name: 'sso:disable',
  description: 'Disable SSO for an organization',
})
export class DisableOrgSsoCliCommand extends CommandRunner {
  constructor(private readonly useCase: SetOrgSsoEnabledUseCase) {
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

  async run(_: string[], options: OrgSsoOptions): Promise<void> {
    const connection = await this.useCase.execute(
      new SetOrgSsoEnabledCommand(options.orgId, false),
    );
    writeSsoCommandResult('disabled', connection);
  }
}
