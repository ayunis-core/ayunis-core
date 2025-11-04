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
- Admin Base URL: http://localhost:3000/api/admin
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

Before you can access models as a user inside the product, you must create them from outside the product via HTTP requests (the experience of this will get better as soon as we have an admin UI). Models you create will be available for admin users to enable for their particular organisation.

In other words:

- The models your create are the pool of models available inside the product in general
- Each admin can pick and choose models from that pool for their particular organisation
- Users of an organisation can choose models from the ones the admin selected

#### Request to add language models

This will allow users to chat with these models.

> [!ATTENTION] You must restart the docker containers for changes to take effect

```bash
curl -X POST http://localhost:3000/api/admin/language-models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "mistral-large-latest", # the exact string identifying the model at the provider side
    "provider": "mistral", # mistral, openai, anthropic or ollama
    "displayName": "Mistral Large", # the name displayed to the user
    "canStream": true, # true if the model can stream its response
    "isReasoning": false, # true if the model has reasoning capabilities
    "canUseTools": true, # true if the model can use tools / function calling
    "isArchived": false # model will be hidden everywhere if true
  }'
```

See also `/src/domain/models/domain/models/language.model.ts`

#### Request to add embedding models:

This will enable RAG use cases.

```bash
curl -X POST http://localhost:3000/api/admin/embedding-models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "mistral-large-latest", # the exact string identifying the model at the provider side
    "provider": "mistral", # mistral, openai, anthropic or ollama
    "displayName": "Mistral Large", # the name displayed to the user
    "dimensions": 1024 # 1024 or 1536, see /src/domain/models/domain/value-objects/embedding-dimensions.enum.ts
  }'
```

> [!ATTENTION] The dimension must match the model's required dimensions. If you need other dimensions, create a Github Issue and we will take care of it.

See also `/src/domain/models/domain/models/embedding.model.ts`

#### Other methods

```bash
# Get models
curl -X GET http://localhost:3000/api/admin/models/ \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE"
```

```bash
# Update model
curl -X PUT http://localhost:3000/api/admin/models/:id \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "mistral-large-latest",
    "provider": "mistral",
    "displayName": "Mistral Large",
    "canStream": true,
    "isReasoning": false,
    "isArchived": false
  }'
```

```bash
# Delete model
curl -X DELETE http://localhost:3000/api/admin/models/:id
```

Examples

```json
{
  "id": "123",
  "name": "mistral-large-latest",
  "provider": "mistral",
  "displayName": "Mistral Large",
  "canStream": true,
  "isReasoning": false,
  "isArchived": false
},
{
  "id": "123",
  "name": "claude-sonnet-4-20250514",
  "provider": "anthropic",
  "displayName": "Claude 4 Sonnet",
  "canStream": true,
  "isReasoning": false,
  "isArchived": false
},
{
  "id": "123",
  "name": "gpt-4.1",
  "provider": "openai",
  "displayName": "GPT 4.1",
  "canStream": true,
  "isReasoning": false,
  "isArchived": false
},
{
  "id": "123",
  "name": "text-embedding-3-large",
  "provider": "openai",
  "createdAt": "2025-08-08T09:55:52.980Z",
  "updatedAt": "2025-08-08T09:55:52.980Z",
  "displayName": "Text Embedding 3 Large",
  "type": "embedding",
  "isArchived": false,
  "dimensions": 1536
  },
```

## 🎯 First steps

- Create an account
- Go to Admin Settings -> Models and enable some models (only those created through the admin interface will be visible here)
  - Enable at least one language model and one embedding model
- Invite users
- Go to the Prompt Library and add some prompts for easy access
- Create some agents for your most important use cases
- Chat with your enabled models, add prompts via the book icon button below the chat input

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
