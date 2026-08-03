import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/guards/public.guard';
import { McpOAuthClientMetadataDto } from './dto/mcp-oauth.dto';

@ApiTags('mcp-integrations')
@Controller('mcp-integrations/oauth')
export class McpOAuthMetadataController {
  constructor(private readonly configService: ConfigService) {}

  @Get('client-metadata.json')
  @Public()
  @ApiOperation({ summary: 'Get MCP OAuth client metadata' })
  @ApiOkResponse({ type: McpOAuthClientMetadataDto })
  getClientMetadata(): McpOAuthClientMetadataDto {
    const backendBaseUrl =
      this.configService.getOrThrow<string>('mcp.backendBaseUrl');
    const frontendBaseUrl = this.configService.getOrThrow<string>(
      'mcp.frontendBaseUrl',
    );
    const clientId = new URL(
      '/api/mcp-integrations/oauth/client-metadata.json',
      backendBaseUrl,
    ).toString();
    const redirectUri = new URL(
      '/settings/integrations/oauth/callback',
      frontendBaseUrl,
    ).toString();

    return {
      client_id: clientId,
      client_name: 'Ayunis Core',
      client_uri: new URL(frontendBaseUrl).toString(),
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
    };
  }
}
