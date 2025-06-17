# Ayunis Core

[![License](https://img.shields.io/badge/license-AGPL)](LICENSE.md)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()

> An open-source AI gateway for public administrations

Ayunis Core is a comprehensive AI platform that enables intelligent conversations with customizable agents, advanced prompt management, and extensible tool integration. Built with ❤️ for public administrations.

## ✨ Features

### 🤖 AI Conversations

- **Multiple LLM providers** - Seamlessly connect to Ollama, Mistral, Anthropic or OpenAI without configuration overhead
- **Prompt Library** - Organize prompts for easy reuse
- **Agent Builder (coming soon)** - Create your personalized AI assistants to help with your tasks. Share the best with your entire team.

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

**Clone the repository:**

```bash
git clone https://github.com/your-username/ayunis-core.git
cd ayunis-core
```

**Start the services:**

```bash
# Start all services with Docker
docker compose up -d

# Install backend dependencies
cd core-backend
npm install

# Run database migrations
npm run migration:run:dev

# Install frontend dependencies
cd ../core-frontend
npm install
```

**Access the application:**

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

## 📚 Resources

- **[Documentation](https://todo.de)**
- **[Contributing Guide](CONTRIBUTING.md)**
- **[Deployment Guide](DEPLOYMENT.md)**
- **[License](LICENSE.md)**

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 🙏 Acknowledgments

- Built with ❤️ by the Ayunis team and contributors
- Inspired by modern AI conversation platforms
- Thanks to all our open source contributors

---

**Start building intelligent conversations today with Ayunis Core!** 🚀
