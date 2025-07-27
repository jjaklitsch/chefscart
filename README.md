# ChefsCart - AI Sous-Chef Meal Planning Platform

> Your AI sous-chef that turns personal meal plans into a ready-to-checkout Instacart cart in ≤ 5 min.

## 🚀 Quick Start (Mock Instacart Flow)

```bash
# Install dependencies and build packages
pnpm i && pnpm build

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to access the ChefsCart application with mock Instacart integration.

## 📁 Monorepo Structure

This project is organized as a pnpm monorepo with TypeScript strict mode enforced across all packages:

```
chefscart/
├── apps/
│   └── web/                    # Next.js 14 web application
│       ├── src/app/           # Next.js app router pages
│       ├── components/        # Page-specific React components
│       ├── lib/              # Firebase and utility functions
│       └── types/            # App-specific TypeScript types
├── packages/
│   ├── ui/                   # Shared UI components & design system
│   │   ├── src/components/   # Reusable React components
│   │   ├── src/tokens.ts     # Design system tokens from PRD §3
│   │   └── dist/            # Built package output
│   ├── core-ai/             # OpenAI integration & AI utilities
│   │   ├── src/             # AI logic, meal planning, vision parsing
│   │   └── dist/            # Built package output
│   └── core-flows/          # Business logic & workflow management
│       ├── src/             # ZIP validation, Instacart integration, email
│       └── dist/            # Built package output
├── functions/               # Firebase Functions (Node.js backend)
├── docs/                   # Project documentation & PRD
└── *.json                  # Config files (Firebase, Firestore, etc.)
```

## 🛠️ Development Workflow

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Firebase CLI** (for functions deployment)

### Package Management

```bash
# Install all dependencies
pnpm i

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Type checking across all packages
pnpm type-check

# Lint all packages
pnpm lint
```

### Development Commands

```bash
# Start web app development server
pnpm dev

# Start web app only
pnpm --filter @chefscart/web dev

# Build specific package
pnpm --filter @chefscart/ui build

# Test specific package
pnpm --filter @chefscart/core-ai test

# Watch mode for package development
pnpm --filter @chefscart/ui dev
```

## 🏗️ Architecture Overview

### Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend**: Firebase Functions (Node.js 20)
- **Database**: Firestore
- **AI**: OpenAI GPT-4o-mini (chat + vision)
- **Email**: Resend
- **Testing**: Vitest + @testing-library
- **Hosting**: Firebase Hosting

### Package Dependencies

```
apps/web
├── @chefscart/ui (workspace:*)
├── @chefscart/core-ai (workspace:*)
└── @chefscart/core-flows (workspace:*)

packages/ui
├── React components
└── Design system tokens

packages/core-ai
├── OpenAI client setup
├── Meal planning logic
├── Vision parsing for pantry
└── AI types & interfaces

packages/core-flows
├── ZIP validation
├── Instacart integration (mock + real)
├── Email service
└── Business logic workflows
```

## 🎯 Key Features & User Flow

1. **ZIP Validation** - Silently verify coverage; unsupported → wait-list
2. **Conversational Wizard** - Gather preferences via chat interface
3. **AI Meal Planning** - GPT-4o-mini generates N + 40% meals for fallback
4. **Recipe Review** - User can swap/remove meals before approval
5. **Instacart Integration** - Build shopping cart via `/products/products_link`
6. **Email Delivery** - Send deep-link via Resend with plan details

## 🧪 Testing Strategy

The project uses **Vitest** with comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm --filter @chefscart/web test

# Coverage reports
pnpm test:coverage

# UI test runner
pnpm test:ui
```

### Test Organization

- **Unit Tests**: Individual functions and components
- **Integration Tests**: Package interactions and workflows
- **E2E Tests**: Complete user scenarios (scenarios 1-6 from PRD §5)

## 🔒 Security & Configuration

### TypeScript Strict Mode

All packages enforce strict TypeScript configuration with:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

### Environment Variables

```bash
# Required for production
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
INSTACART_API_KEY=... # Optional, uses mock if not provided

# Firebase configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
# ... other Firebase config
```

### Feature Flags

```bash
# Toggle mock Instacart integration
FEATURE_FLAG_NO_API=true  # Uses mock responses
FEATURE_FLAG_NO_API=false # Uses real Instacart API
```

## 🎨 Design System

The UI package implements the design tokens from PRD §3:

- **Primary**: Orange 600 (#E65300) for CTAs, Orange 50 (#FFF1E6) for selection
- **Accent**: Lime 500 (#A3D34E) for success, Sky 500 (#4BB8F2) for links
- **Neutral**: 100 (#FFFAF2) background, 900 (#2F3438) headlines
- **Typography**: Inter family, SemiBold for headers, 16/24px body
- **Spacing**: 4/8/12/16/24/32/48/64px scale
- **Border Radius**: 12px buttons, 24px cards

## 📋 Mock Instacart Flow

When running `pnpm dev`, the application operates in **mock mode** by default:

1. **ZIP Validation** - All ZIP codes return "supported"
2. **Meal Generation** - Uses cached/static meal plans
3. **Instacart Cart** - Returns mock deep-link URLs
4. **Email Delivery** - Uses Resend test mode or logs to console

To enable real Instacart integration, set `FEATURE_FLAG_NO_API=false` and provide valid API keys.

## 🚢 Deployment

```bash
# Build for production
pnpm build

# Deploy Firebase Functions
firebase deploy --only functions

# Deploy web app to Firebase Hosting
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

## 📚 Additional Documentation

- **[Setup Guide](./SETUP_GUIDE.md)** - Detailed installation instructions
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing documentation
- **[PRD](./docs/ChefsCart_PRD_v0.4.pdf)** - Complete product requirements
- **[Quick Test](./QUICK_TEST.md)** - Basic functionality verification

## 🤝 Contributing

1. Ensure TypeScript strict mode compliance
2. Write tests first (TDD approach)
3. Follow conventional commit messages
4. Use `pnpm` for package management
5. All code must pass `pnpm type-check` before commit

---

**🍳 Happy cooking with ChefsCart!**