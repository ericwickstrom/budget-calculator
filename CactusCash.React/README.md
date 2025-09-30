# CactusCash.React

Frontend React application for the CactusCash financial calculator.

## Overview

This is the React-based user interface for CactusCash, a comprehensive financial planning and projection tool.

## Features

- Real-time financial projections
- Configurable expense tracking
- Investment balance calculations
- Unemployment benefits estimation
- ACA subsidy calculations
- PTO payout tracking

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Testing framework
- **React Testing Library** - Component testing

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd CactusCash.React
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Project Structure

```
CactusCash.React/
├── src/
│   ├── components/        # React components
│   ├── config/           # Configuration loader and types
│   ├── utils/            # Utility functions and calculations
│   ├── integration/      # Integration tests
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/               # Static assets
├── index.html            # HTML template
└── vite.config.js        # Vite configuration
```

## Configuration

The application uses a JSON configuration file for default values and business rules. See `src/config/calculator-config.example.json` for the configuration schema.

## Testing

- **Unit Tests**: 38 tests for calculation functions (100% coverage)
- **Component Tests**: 29 tests for UI components
- **Integration Tests**: 7 end-to-end user workflow tests

**Total**: 69 tests with 100% pass rate

## License

Private - All rights reserved