# Ayunis Core

> An open-source AI gateway for public administrations

Ayunis Core is a comprehensive AI platform that enables intelligent conversations with customizable agents, advanced prompt management, and extensible tool integration. Built with ❤️ for public administrations.

## ✨ Features

### 🤖 AI Conversations

- **Multiple LLM providers** - Seamlessly connect to Ollama, Mistral, Anthropic or OpenAI without configuration overhead
- **Prompt Library** - Organize prompts for easy reuse
- **Agent Builder (coming soon)** - Create your personalized AI assistants to help with your tasks. Share the best with your entire team.
- **RAG Pipeline (coming soon)** - Enhance model context with your own data & documents. Use our pipeline in your own services.

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
cp ./ayunis-core-backend/env.example ./ayunis-core-backend/.env
```

**Edit the environment file with your production values**

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
- SwaggerUI: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs-json

## 🎯 First steps

- Create an account
- Go to Admin Settings -> Models and enable some models
- Invite users
- Go to the Prompt Library and add some prompts for easy access
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
