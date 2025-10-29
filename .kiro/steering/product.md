# Ayunis Core Product Overview

Ayunis Core is an open-source AI gateway designed specifically for public administrations. It provides a comprehensive platform for intelligent conversations with customizable AI agents, advanced prompt management, and extensible tool integration.

## Core Features

- **Multi-LLM Support**: Seamlessly integrates with Ollama, Mistral, Anthropic, and OpenAI providers
- **Agent Builder**: Create and share personalized AI assistants across teams
- **RAG Pipeline**: Enhance model context with custom data and documents
- **Prompt Library**: Organize and reuse prompts efficiently
- **Tool Integration**: Extensible system for enhanced AI capabilities
- **File Processing**: Upload and process various file types for context
- **Source Management**: Track and reference information sources

## Architecture

The platform follows a multi-service architecture:
- **Backend**: NestJS application with hexagonal architecture
- **Frontend**: React application using TanStack Router
- **Database**: PostgreSQL with pgvector extension for embeddings
- **Storage**: MinIO for file storage
- **E2E Testing**: Cypress-based UI testing suite

## Target Users

Built specifically for public sector organizations requiring:
- Multi-tenancy with organization and user management
- Secure authentication and role-based access control
- Data sovereignty (your data belongs to you)
- Open architecture with standardized OpenAPI interfaces