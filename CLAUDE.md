# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CactusCash is a budget calculator application built with:
- **Backend**: .NET 8.0 Web API with Clean Architecture
- **Frontend**: React with Vite, Tailwind CSS, and Vitest for testing

## Architecture

The solution follows Clean Architecture principles with clear separation of concerns:

### Backend (.NET)

- **CactusCash.Domain**: Core business entities and domain logic (no dependencies)
- **CactusCash.Application**: Use cases, business logic, and application services (depends on Domain)
- **CactusCash.Infrastructure**: External concerns like data access, external services (depends on Application)
- **CactusCash.API**: ASP.NET Core Web API presentation layer with Swagger/OpenAPI (depends on Application and Infrastructure)

**Dependency Flow**: API → Infrastructure → Application → Domain

All projects target .NET 8.0 with nullable reference types enabled.

### Frontend (React)

Located in `CactusCash.React/`:

**Tech Stack:**
- React 19.1 with Vite 7.1 as build tool
- Tailwind CSS 3.4 for styling with PostCSS and Autoprefixer
- Vitest 3.2 for testing with jsdom environment
- React Testing Library 16.3 for component testing
- ESLint 9.36 with React-specific plugins

**Project Structure:**
- `src/components/` - React UI components
  - `Dashboard.jsx` - Main application logic and state management container
  - `FinancialCalculator.jsx` - Presentation component for calculator UI
  - `Navbar.jsx` - Navigation bar with routing to dashboard and auth links
  - `Hero.jsx` - Landing page hero section with features
- `src/config/` - Configuration system
  - `calculator-config.loader.ts` - Dynamic config loader with fallbacks
  - `calculator-config.types.ts` - TypeScript type definitions
  - `calculator-config.json` - Runtime configuration file
  - `calculator-config.example.json` - Schema reference and example
- `src/utils/` - Pure calculation functions and helpers
  - `calculations.js` - Financial calculation utilities
- `src/integration/` - Integration tests for complete user workflows
- `src/App.jsx` - Root component with view state management (landing vs dashboard)
- `src/main.jsx` - Application entry point
- `src/setupTests.js` - Vitest setup with Testing Library

**Key Features:**
- Single-page application with client-side view switching
- Configurable business rules and default values via JSON
- Comprehensive test coverage (69+ tests: 38 unit, 29 component, 7 integration)
- Responsive design with mobile-first approach

## Common Commands

### Backend (.NET)

```bash
# Build the entire solution
dotnet build

# Run the API
dotnet run --project CactusCash.API

# Run all tests
dotnet test

# Run tests for a specific project
dotnet test tests/CactusCash.Domain.Tests
dotnet test tests/CactusCash.Application.Tests
dotnet test tests/CactusCash.API.Tests

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Add a new project to the solution
dotnet sln add <path-to-project>

# Restore dependencies
dotnet restore
```

### Frontend (React)

From the `CactusCash.React/` directory:

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Testing

### Backend
- **Framework**: xUnit
- **Coverage**: coverlet.collector
- Tests organized in `tests/` folder mirroring the main project structure
- Each layer (Domain, Application, API) has its own test project

### Frontend
- **Framework**: Vitest with React Testing Library
- **Environment**: jsdom
- Setup file: `src/setupTests.js`
- Coverage configured with v8 provider
- Test suite includes 69+ tests: 38 unit tests, 29 component tests, 7 integration tests

## Project Structure Notes

### Backend (.NET)
- All C# projects use implicit usings and nullable reference types
- The API includes Swagger/OpenAPI for API documentation
- Test projects are properly marked with `IsTestProject` property
- Backend follows standard Clean Architecture folder structure:
  - `Domain/Entities/`, `Domain/ValueObjects/`, `Domain/Enums/`, `Domain/Interfaces/`
  - `Application/Services/`, `Application/DTOs/`, `Application/Validators/`, `Application/Mappings/`

### Frontend (React)
- Uses ES modules (`"type": "module"` in package.json)
- Test configuration embedded in `vite.config.js`
- Configuration file pattern: `calculator-config.example.json` for schema reference
- Development server runs on port 5173 by default
