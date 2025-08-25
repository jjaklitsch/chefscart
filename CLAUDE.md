# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
```bash
# Frontend development
cd apps/web && npm run dev  # Start Next.js dev server (runs on localhost:3001)
npm run lint                # Run ESLint checks
npm run build              # Build production Next.js app

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
1. ZIP validation → Check Instacart coverage with prioritized grocery retailers
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
- `apps/web/apphosting.yaml` - Firebase App Hosting deployment configuration
- Copy from `.env.local.example` and `functions/.env.example`
- Note: Server restart required after .env.local changes

#### Firebase App Hosting Secrets Management
The `apps/web/apphosting.yaml` file configures environment variables and secrets for production deployment.

**Current configured secrets:**
- `firebase_api_key` → `NEXT_PUBLIC_FIREBASE_API_KEY`
- `firebase_private_key` → `FIREBASE_PRIVATE_KEY`
- `openai_api_key` → `OPENAI_API_KEY`
- `resend_api_key` → `RESEND_API_KEY`

**To add a new secret:**
1. Add to `apphosting.yaml`:
   ```yaml
   - variable: NEW_ENV_VAR_NAME
     secret: new_secret_name
   ```
2. Set the secret value:
   ```bash
   echo "SECRET_VALUE" | firebase apphosting:secrets:set new_secret_name --data-file -
   ```
3. Grant access to the backend:
   ```bash
   firebase apphosting:secrets:grantaccess new_secret_name --backend chefscart
   ```
4. Deploy to apply changes:
   ```bash
   git commit -am "Add new secret" && git push origin main
   ```

**Important:** Never commit actual secret values to git. Always use secret references in `apphosting.yaml`.

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
- Retailers API with intelligent grocery store prioritization:
  - Tier 0: Whole Foods first
  - Tier 0.5: Major chains by store count (Aldi, Kroger, Publix, etc.)
  - Tier 1: Premium chains (Pavilions, Gelson's, Erewhon, Trader Joe's, etc.)
  - Filters out convenience/drug stores when ≥3 grocery options available

### Common Tasks
- Add new chat step: Update `chatSteps` array in `PreferencesChat.tsx`
- Modify GPT prompt: Edit `functions/src/gptPlan.ts`
- Change email template: Update `functions/src/emailSend.ts`
- Add new API endpoint: Create route in `src/app/api/` and function in `functions/src/`