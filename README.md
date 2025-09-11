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

**Create your production environment file (only backend required in production)**

```bash
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

### Model Configuration

Before you can access models as a user inside the product, you must create them from outside the product via HTTP requests (the experience of this will get better as soon as we have an admin UI).

#### Request to add language models

This will allow users to chat with these models.

> [!ATTENTION] You must restart the docker containers for each change to take effect

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

See `/src/domain/models/domain/models/embedding.model.ts`

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
