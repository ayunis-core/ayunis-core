# Admin Module

The Admin module provides secure access to administrative endpoints using environment variable authentication.

## Configuration

Set the `ADMIN_TOKEN` environment variable to define the admin authentication token:

```bash
ADMIN_TOKEN=your-secure-admin-token-here
```

If not set, it defaults to `admin-token`.

## Usage

### Securing Controllers

Apply the `@Admin()` decorator and `AdminGuard` to controllers or methods that require admin authentication:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Admin } from './application/decorators/admin.decorator';
import { AdminGuard } from './application/guards/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
@Admin()
export class AdminController {
  @Get('some-endpoint')
  someAdminEndpoint() {
    return { message: 'Admin access granted' };
  }
}
```

### Making Requests

Include the admin token in the `x-admin-token` header when making requests to admin endpoints:

```bash
curl -H "x-admin-token: your-secure-admin-token-here" \
     http://localhost:3000/admin/some-endpoint
```

## Security Notes

- The admin token is checked against the `ADMIN_TOKEN` environment variable
- Admin endpoints bypass the regular authentication mechanism
- Use a strong, unique token for production environments
- Consider using a secrets management system for production deployments
