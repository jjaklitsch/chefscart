# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
```bash
# Frontend development
npm run dev        # Start Next.js dev server on http://localhost:3000
npm run lint       # Run ESLint checks
npm run build      # Build production Next.js app

# Firebase Functions (from /functions directory)
cd functions
npm run build      # Compile TypeScript
npm run serve      # Start local Firebase emulators
npm run deploy     # Deploy functions to Firebase
```

### Testing
```bash
# No test commands configured yet
# Consider adding: npm test, npm run test:watch
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **AI**: OpenAI GPT-4o-mini for meal planning
- **Database**: Firestore
- **External APIs**: Instacart IDP, Resend

### Core User Flow
1. ZIP validation → Check Instacart coverage
2. 10-step chat wizard → Collect preferences  
3. GPT generation → Create personalized meal plans
4. Instacart integration → Build shopping cart
5. Email confirmation → Send cart link

### Key Files & Patterns

#### Frontend Structure
- `src/app/` - Next.js App Router pages
- `components/PreferencesChat.tsx` - Main chat wizard (10 steps)
- `types/index.ts` - All TypeScript interfaces
- API routes in `src/app/api/` handle backend calls

#### Firebase Functions
- `functions/src/gptPlan.ts` - GPT meal plan generation
- `functions/src/createList.ts` - Instacart cart creation  
- `functions/src/emailSend.ts` - Resend integration
- Deploy with `npm run deploy` from `/functions`

#### Configuration
- `.env.local` - Frontend and API environment variables (located at project root)
- `functions/.env` - Backend environment variables for Firebase Functions
- Copy from `.env.local.example` and `functions/.env.example`
- Note: Server restart required after .env.local changes

### Working with the Chat Wizard
The chat wizard (`PreferencesChat.tsx`) uses a step-based flow:
- Each step has a type: 'text', 'select', 'multiselect', 'file', 'meal-config'
- State managed in `userPreferences` object
- Steps defined in `chatSteps` array
- Special handling for meal configuration (days/adults/kids per meal type)

### API Integration Patterns
- Frontend API routes proxy to Firebase Functions
- Mock endpoints available (e.g., `/api/generate-mealplan/mock`)
- Error handling with try-catch and proper status codes
- TypeScript interfaces ensure type safety across API boundaries

### Common Tasks
- Add new chat step: Update `chatSteps` array in `PreferencesChat.tsx`
- Modify GPT prompt: Edit `functions/src/gptPlan.ts`
- Change email template: Update `functions/src/emailSend.ts`
- Add new API endpoint: Create route in `src/app/api/` and function in `functions/src/`