# Technology Stack

## Backend (ayunis-core-backend)

**Framework**: NestJS with TypeScript
**Architecture**: Hexagonal (Ports & Adapters) pattern
**Database**: PostgreSQL with pgvector extension for vector embeddings
**ORM**: TypeORM with migrations
**Authentication**: JWT with Passport.js (local and JWT strategies)
**API Documentation**: Swagger/OpenAPI
**Testing**: Jest for unit tests, supertest for e2e tests
**Code Generation**: Orval for API client generation

### Key Dependencies
- `@nestjs/core`, `@nestjs/common` - Core NestJS framework
- `@anthropic-ai/sdk`, `@mistralai/mistralai`, `openai`, `ollama` - LLM provider SDKs
- `typeorm`, `pg` - Database ORM and PostgreSQL driver
- `bcrypt` - Password hashing
- `class-validator`, `class-transformer` - DTO validation and transformation
- `helmet` - Security middleware
- `winston` - Logging
- `minio` - Object storage client
- `mjml`, `nodemailer` - Email templating and sending

## Frontend (ayunis-core-frontend)

**Framework**: React 19 with TypeScript
**Build Tool**: Vite
**Routing**: TanStack Router with file-based routing
**State Management**: TanStack Query for server state
**UI Library**: shadcn/ui (PREFERRED) - Built on Radix UI primitives
**Styling**: Tailwind CSS with shadcn/ui components
**Forms**: React Hook Form with Zod validation
**Testing**: Vitest with jsdom
**Internationalization**: i18next

### UI Component Guidelines

**CRITICAL**: Always prefer shadcn/ui components over custom UI implementations

**shadcn/ui Usage Rules**:
- **ALWAYS use shadcn/ui components** when available (Button, Input, Card, Dialog, etc.)
- **NEVER create custom UI components** that duplicate shadcn/ui functionality
- **Extend shadcn/ui components** using composition and Tailwind classes when customization is needed
- **Add new shadcn/ui components** using `npx shadcn@latest add <component>` when needed
- **Follow shadcn/ui patterns** for consistent styling and behavior across the application

**Available shadcn/ui Components**:
- Layout: Card, Separator, Skeleton, AspectRatio
- Forms: Button, Input, Label, Checkbox, Select, Switch, Slider, Textarea
- Navigation: DropdownMenu, NavigationMenu, Tabs, Breadcrumb
- Feedback: Alert, Badge, Progress, Toast, Tooltip
- Overlays: Dialog, Popover, Sheet, AlertDialog
- Data Display: Table, Avatar, Calendar, Command

**Custom Component Guidelines**:
- Only create custom components for **business-specific functionality** (e.g., ChatMessage, AgentCard)
- Custom components should **compose shadcn/ui primitives**, not replace them
- Use Tailwind CSS for styling, following shadcn/ui design tokens
- Maintain consistency with shadcn/ui design system

### Key Dependencies
- `@tanstack/react-router` - File-based routing
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI primitives (via shadcn/ui)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management (shadcn/ui)
- `clsx` - Conditional className utility
- `tailwind-merge` - Tailwind class merging utility
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `axios` - HTTP client
- `react-markdown` - Markdown rendering

## Code Execution Service (ayunis-core-code-execution)

**Language**: Python
**Framework**: FastAPI
**Containerization**: Docker with security restrictions
**Execution**: Sandboxed Python environment

## Infrastructure

**Containerization**: Docker with Docker Compose
**Database**: PostgreSQL 16 with pgvector extension
**Object Storage**: MinIO (S3-compatible)
**Reverse Proxy**: Docker socket proxy for secure code execution
**Development**: Hot reload with volume mounts

## Common Commands

### Backend Development
```bash
# Start development environment
npm run start:dev

# Database migrations
npm run migration:generate:dev -- migrations/MigrationName
npm run migration:run:dev
npm run migration:revert:dev

# Testing
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report

# Code generation
npm run generate:client  # Generate API client from OpenAPI spec

# CLI commands
npm run cli:ts -- seed:minimal  # Seed database
```

### Frontend Development
```bash
# Start development server
npm run dev           # Runs on port 3001

# Build for production
npm run build

# Testing
npm run test

# API client generation
npm run openapi:update  # Fetch schema and generate client
```

### Full Stack Development
```bash
# Production environment
docker compose up -d --build

# Development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f app
```

## Code Style & Linting

- **ESLint**: Configured with TypeScript and Prettier integration
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict configuration with decorators enabled
- **Path Mapping**: `src/*` aliases configured for clean imports