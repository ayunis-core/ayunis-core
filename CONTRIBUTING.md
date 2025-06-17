# Contributing to Ayunis Core

Thank you for your interest in contributing to Ayunis Core! This document provides guidelines and information to help you contribute effectively to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Development Guidelines](#development-guidelines)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please treat all contributors with respect and create a welcoming environment for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/todo/ayunis-core.git` <-- TODO!!
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm
- Docker and Docker Compose

### Local Development

**Clone the repository:**

```bash
git clone https://github.com/your-username/ayunis-core.git <-- TODO!!
cd ayunis-core
```

**Start the backend:**

```bash
cd core-backend
npm install
# Start the Container
docker compose up -d
# Run migrations
npm run migration:run:dev
```

**Start the frontend:**

```bash
cd core-frontend
npm install
npm run dev
```

**Access the application:**

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

## Architecture Overview

### Backend Structure

Ayunis Core follows a **Hexagonal Architecture** (Ports and Adapters) pattern with clear separation of concerns:

```
src/domain/[module-name]/
├── application/
│   ├── use-cases/          # Business logic use cases with commands / queries
│   ├── ports/              # Interface definitions (abstract classes)
│   └── errors/             # Domain-specific errors
├── domain/                 # Core business entities and value objects
├── infrastructure/         # External adapters (DB, APIs, etc.)
│   └── persistence/        # Database implementations
└── presenters/            # HTTP controllers and DTOs
    └── http/
```

**Key Principles**

- **Domain modules** live in `src/domain/[module-name]`
- **Interfaces** are represented through abstract classes when possible
- **Ports** (interfaces) use domain objects for input/output
- **Configuration** is centralized in `/src/config`
- **Dependency injection** through NestJS modules
- **OpenAPI decorators** for every controller endpoint

### Frontend Structure

The frontend follows a **feature sliced design** architecture with:

- `app/` - Routes and their data access
- `pages/` - Route-specific components and logic
- `widgets/` - Complex UI components
- `layouts/` - Reusable layouts for pages and widgets
- `features/` - Reusable feature modules
- `shared/` - Common utilities and components

**Key Principles**

- **Data loading** in routes, optionally used as initial data for page specific data queries
- **Import hierarchy** according to feature sliced design guidelines
- **Backend connections** are auto generated using orval

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names

### Backend Guidelines

1. **Use Cases**: Each use case should have a single responsibility
2. **Domain Objects**: Use domain entities and value objects to encapsulate business logic
3. **Error Handling**: Create domain-specific error classes in `application/errors/`
4. **Testing**: Write unit tests for use cases and integration tests for controllers
5. **Validation**: Use class-validator decorators in DTOs
6. **Database**: Use TypeORM entities and repositories

### Frontend Guidelines

1. **Components**: Create reusable, composable components
2. **State Management**: Use appropriate state management (React Context, etc.)
3. **API Integration**: Use the generated API client from `shared/api/generated/`
4. **Styling**: Follow the existing UI component patterns
5. **Internationalization**: Use the localization system in `shared/locales/`

## Testing

### Backend Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration
```

### Testing Guidelines

- Write unit tests for all use cases
- Mock external dependencies
- Aim for high test coverage (>80%)
- Use descriptive test names that explain the behavior

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Write clear commit messages** following conventional commits:
   ```
   feat: add user authentication
   fix: resolve database connection issue
   docs: update API documentation
   refac: split create-user-use-case
   ```
3. **Update documentation** if needed
4. **Add/update tests** for your changes
5. **Ensure all tests pass** locally
6. **Submit a pull request** with:
   - Clear title and description
   - Link to related issues
   - Screenshots for UI changes
   - Testing instructions

### PR Review Criteria

- Code follows architecture patterns
- Tests are included and passing
- Documentation is updated
- No breaking changes (or properly documented)
- Code is readable and maintainable

## Issue Reporting

When reporting issues, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Environment details** (OS, Node version, etc.)
5. **Error messages** or logs
6. **Screenshots** if applicable

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## Development Guidelines

### Database Migrations

```bash
# Generate migration
npm run migration:generate:dev -- src/db/migrations/MigrationName

# Run migrations
npm run migration:run:dev
```

Check `package.json` for all migration related scripts

### API Documentation

- Use Swagger decorators for API documentation
- Update OpenAPI specs when adding new endpoints
- Keep examples up to date

## Getting Help

- Check existing [issues](https://github.com/your-org/ayunis-core/issues)
- Read the [documentation](https://docs.ayunis.com)
- Open a new issue

## License

By contributing to Ayunis Core, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Ayunis Core! 🚀
