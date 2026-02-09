# Ayunis Core

> An open-source AI gateway for public administrations

Ayunis Core is a comprehensive AI platform that enables intelligent conversations with customizable agents, advanced prompt management, and extensible tool integration. Built with ❤️ for public administrations.

## ✨ Features

### 🤖 AI Conversations

- **Multiple LLM providers** - Seamlessly connect to Ollama, Mistral, Anthropic or OpenAI without configuration overhead
- **Prompt Library** - Organize prompts for easy reuse
- **Agent Builder** - Create your personalized AI assistants to help with your tasks. Share the best with your entire team.
- **RAG Pipeline** - Enhance model context with your own data & documents. Use our pipeline in your own services.

### 🛠️ Advanced Capabilities

- **Tool Integration** - Extensible tool system for enhanced AI capabilities
- **File Processing** - Upload and process various file types for context
- **Source Management** - Track and reference information sources
- **Web Search (coming soon)** - Internet search integration for real-time information

### 🏗️ Public Sector Ready

- **Multi-tenancy** - Organization and user management
- **Authentication** - Secure user authentication and authorization
- **Role-based Access** - Fine-grained permission system
- **Sovereign** - Your data belongs to you
- **Open** - All functionality & data is accessible from the outside through standardized OpenAPI interfaces

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm
- Docker and Docker Compose

### Installation

**Clone the repository and navigate to the project root**

```bash
cd /path/to/ayunis-core
```

**Create your production environment file**

> [!] You must create each env file, even if you don't change variables

```bash
cp ./.env.example ./.env
cp ./ayunis-core-backend/.env.example ./ayunis-core-backend/.env
cp ./ayunis-core-frontend/.env.example ./ayunis-core-frontend/.env
```

**Edit the backend environment file with your production values**

```bash
nano ./ayunis-core-backend/.env
```

**Build and start the production stack**

```bash
docker compose up -d --build
```

**Change application port**

Change `HOST_PORT` in the `.env` file in the project root

**Access the application**

- Application: http://localhost:3000
- Backend Base URL: http://localhost:3000/api
- SwaggerUI: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs-json

## ⚙️ Configuration

### E-Mail Provider Configuration

E-mails for email confirmation and user invite flows will only be sent if at least `SMPT_HOST` and `SMTP_PORT` are configured. See `/ayunis-core-backend/src/config/emails.config.ts`.

If no email configuration is provided,

- email confirmation will be skipped and registering users can log in and access the product right away
- invite accept links will be displayed to the inviting user instead of being sent to the invited user
- password reset will not work (coming soon)

### MCP (Model Context Protocol) Configuration

MCP integration enables Ayunis Core to connect to external data sources through MCP servers like Locaboo 4.

#### Required Configuration

**MCP_ENCRYPTION_KEY** (Required):
- Encrypts all MCP integration credentials (API keys, bearer tokens) at rest in the database
- Uses AES-256-GCM encryption
- Must be a 64-character hexadecimal string (32 bytes)
- Generate a secure key with:
  ```bash
  openssl rand -hex 32
  ```
- The application will fail to start if this variable is not set or is invalid

**LOCABOO_4_URL** (Required for Locaboo 4 integration):
- Base URL of the Locaboo 4 MCP server instance
- Example values:
  - Local development: `http://localhost:8080`
  - Production: `https://locaboo.your-domain.com`
- Used when creating Locaboo 4 MCP integrations

#### Authentication Approach

Ayunis Core uses a simplified authentication system for MCP integrations:

1. **NO_AUTH**: For public MCP servers requiring no authentication
2. **BEARER_TOKEN**: For API tokens and simple authentication
   - Users provide their Locaboo 3 API token when creating a Locaboo 4 integration
   - Tokens are stored encrypted using the `MCP_ENCRYPTION_KEY`
   - No automatic token refresh is performed
   - Manual token rotation is supported through the UI
3. **OAUTH** (Future): Reserved for standard OAuth 2.1 implementations

#### Security Considerations

- All credentials are encrypted at rest using AES-256-GCM
- Encryption key is read from environment variables, never stored in code or database
- Tokens are never logged or displayed in plain text in logs
- Use HTTPS in production to protect tokens in transit
- Rotate the MCP_ENCRYPTION_KEY periodically by:
  1. Generating a new key with `openssl rand -hex 32`
  2. Updating MCP_ENCRYPTION_KEY environment variable
  3. Restarting the application (no data migration needed - decryption uses the new key)

#### Configuration Validation

The application validates MCP configuration on startup:
- `MCP_ENCRYPTION_KEY` must be set and valid (64 hex characters)
- If validation fails, the application will not start
- Check application logs for specific error messages if startup fails

#### Creating MCP Integrations

Admins can create MCP integrations through the admin UI or API:

1. Navigate to Admin Settings → Integrations → MCP
2. Click "Add Integration"
3. Select integration type (e.g., "Locaboo 4")
4. Provide server URL and authentication credentials
5. Test connection before saving
6. Once saved, organization users can use the integration in agents

For API-based creation, see the MCP integration endpoints in the OpenAPI documentation.

### Model Configuration

Models are managed through the **Super Admin Models** API, accessible to users with the `SUPER_ADMIN` system role. The API is available at `/api/super-admin/models/` and documented in the SwaggerUI.

The model management workflow:

1. **Super admins** create models in the **catalog** — the master pool of all available models
2. **Super admins** then **permit** specific models for each organization
3. **Organization admins** can pick from the permitted models for their users
4. **Users** choose from the models their organization admin has enabled

#### Creating models via the Super Admin API

All super admin endpoints require JWT authentication with a user that has the `SUPER_ADMIN` system role. You can promote a user to super admin using the CLI:

```bash
cd ayunis-core-backend
npx nestjs-command make:super-admin <email>
```

Then use the authenticated API to manage the model catalog. See the full endpoint documentation at `/api/docs` under the **Super Admin Models** tag.

> [!ATTENTION] The embedding model dimension must match the model's required dimensions. If you need other dimensions, create a Github Issue and we will take care of it.

See also:
- `/src/domain/models/domain/models/language.model.ts`
- `/src/domain/models/domain/models/embedding.model.ts`
- `/src/domain/models/domain/value-objects/embedding-dimensions.enum.ts`

## 🎯 First steps

- Create an account
- As a super admin, add models to the catalog and permit them for your organization (see [Model Configuration](#model-configuration))
- Go to Admin Settings → Models and enable at least one language model and one embedding model
- Invite users
- Go to the Prompt Library and add some prompts for easy access
- Create some agents for your most important use cases
- Chat with your enabled models, add prompts via the book icon button below the chat input

## 💻 Development

### Git Hooks (Husky)

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks for code quality checks.

#### Setup

When you clone the repository, Git hooks are automatically set up when you run:

```bash
npm install
```

This installs Husky and configures Git to use the hooks in the `.husky/` directory.

#### Available Hooks

- **pre-commit**: Runs linting and formatting checks on staged files
  - Frontend: ESLint, Prettier, and TypeScript type checking
  - Backend: ESLint, Prettier, and TypeScript type checking
  - Auto-fixes issues when possible (set `PRECOMMIT_NO_FIX=1` to disable auto-fix)

- **commit-msg**: Validates commit message format
  - Requires a type prefix (e.g., `feat:`, `fix:`, `chore:`, etc.)
  - Requires a task ID with `AYC-` prefix (e.g., `AYC-123`)

#### Commit Message Format

Commit messages must follow this format:

```
<type>: <description> (AYC-<task-id>)
```

Examples:
- `feat: add new chart widget (AYC-123)`
- `fix: correct date validation (AYC-456)`
- `chore: update dependencies (AYC-789)`

Valid types: `feat`, `feature`, `fix`, `chore`, `refactor`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`, `check`

#### Manual Setup

If hooks aren't working, you can manually set them up:

```bash
npm install
npx husky install
```

**Note**: On some systems (especially Windows), Git may not preserve executable permissions for hook files. If hooks aren't running, ensure the hook files are executable:

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

On Windows (Git Bash), you can use the same `chmod` commands, or use PowerShell:

```powershell
git update-index --chmod=+x .husky/pre-commit
git update-index --chmod=+x .husky/commit-msg
```

## 📚 Resources

- **Documentation (Coming Soon)**
- **[Contributing Guide](CONTRIBUTING.md)**
- **[Deployment Guide](DEPLOYMENT.md)**
- **[License](LICENSE.md)**

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 🙏 Acknowledgments

- Built with ❤️ by the Ayunis team and contributors
- Thanks to all our open source contributors

---

**Start building intelligent conversations today with Ayunis Core!** 🚀
