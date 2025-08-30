# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
```bash
# Frontend development
cd apps/web && npm run dev  # Start Next.js dev server (runs on localhost:3001)
npm run lint                # Run ESLint checks
npm run build              # Build production Next.js app

# Meal Data Generation
npm run generate-meals     # Generate new meals with OpenAI + Supabase (from apps/web)
```

### Testing
```bash
# Frontend testing (from apps/web directory)
npm test              # Run Vitest unit tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

## Deployment & Testing Environments

### Environment Setup
- **Production**: `chefscart.ai` (main branch)
- **Preview Deployments**: Vercel automatic previews for all branches/PRs

### Development Workflow (ALWAYS USE PREVIEW FIRST)
```bash
# Create feature branch for ANY changes (never push directly to main)
git checkout -b feature/your-feature-name

# Make changes, commit, and push feature branch
git add .
git commit -m "Your changes"
git push origin feature/your-feature-name

# Vercel automatically creates preview deployment
# View preview URL in Vercel dashboard: https://chefscart-feature-your-feature-name.vercel.app

# IMPORTANT: Test preview thoroughly before merging to main
# Only after preview testing, merge to main via PR or direct merge
git checkout main
git merge feature/your-feature-name
git push origin main
```

### Production Deployment
```bash
# Push to main branch (auto-deploys to chefscart.ai)
git push origin main

# View production site
open https://chefscart.ai
```

### Vercel Configuration
1. **In Vercel Dashboard**:
   - Production Branch: `main` → deploys to `chefscart.ai`
   - Preview Deployments: Automatic for all other branches and PRs
   - Preview URLs: `chefscart-[branch-name].vercel.app` format

2. **Testing Strategy**:
   - **ALWAYS** use Vercel preview deployments before production
   - Each branch/PR gets its own preview URL: `chefscart-[branch-name].vercel.app`
   - **NEVER** push directly to main without preview testing first
   - Preview URLs available immediately after pushing feature branch

3. **Environment Variables**:
   - Set same variables for both production and preview environments
   - Use Vercel's environment settings to manage different values if needed

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS  
- **Database**: Supabase (PostgreSQL) with 532+ curated meals
- **Deployment**: Vercel (seamless Next.js deployment with automatic builds)
- **AI**: OpenAI GPT-5-mini for selective analysis and content generation
- **External APIs**: Instacart IDP, Resend
- **Testing**: Vitest + React Testing Library

### Core User Flow
1. ZIP validation → Check Instacart coverage with prioritized grocery retailers
2. 9-step guided onboarding → Collect preferences (cuisines, diets, spice tolerance, allergens, etc.)
3. Supabase meal matching → Filter 532+ meals by preferences using intelligent scoring
4. Instacart integration → Build shopping cart with scaled ingredients  
5. Email confirmation → Send cart link via Resend

## Authentication System

### Magic Link Authentication
The application uses Supabase Auth with magic links (passwordless email authentication) using PKCE flow.

#### Authentication Flow
1. **User requests magic link** at `/login`
   - `createAuthClient().auth.signInWithOtp()` called with email
   - `emailRedirectTo` set to `${window.location.origin}/auth/callback`
   - Magic link sent via Resend SMTP to user's email

2. **Magic link format** (in email):
   ```
   https://[resend-tracking]/CL0/https://[project].supabase.co/auth/v1/verify?token=pkce_[token]&type=magiclink&redirect_to=http://localhost:3001/auth/callback
   ```

3. **User clicks magic link**:
   - Goes to Resend tracking → Supabase verify endpoint
   - Supabase verifies PKCE token and sets auth cookies
   - Redirects to our `/auth/callback` route with session established

4. **Auth callback processing** (`/src/app/auth/callback/route.ts`):
   - Checks for existing session in cookies via `createServerAuthClient().auth.getSession()`
   - If session exists → redirects to `/dashboard` (or `/dashboard?welcome=true` for new users)
   - If no session → attempts token exchange/verification
   - On failure → redirects to `/login?error=auth_failed`

#### Critical Configuration
- **Supabase client instances**: Use singleton pattern to avoid "Multiple GoTrueClient instances" errors
  - Server-side: `createServerAuthClient()` from `lib/supabase-server.ts`
  - Client-side: `createAuthClient()` from `lib/supabase.ts` (singleton)
  - API/Components: `getSupabaseClient()` or `createClient()` (alias) from `lib/supabase.ts`

- **Environment Requirements**:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set
  - Supabase Dashboard → Auth → URL Configuration:
    - Site URL: `http://localhost:3001` (local) or `https://chefscart.ai` (prod)
    - Redirect URLs: Include `http://localhost:3001/auth/callback`

#### Common Issues & Solutions
- **"Multiple GoTrueClient instances"**: Ensure all imports use singleton clients
- **"Auth session missing" or "link_expired"**: Magic links expire quickly (1 hour), use fresh links
- **Import errors**: Ensure `createClient` alias exists in `lib/supabase.ts`
- **PKCE token errors**: Don't try to handle PKCE tokens directly - let Supabase verify first

#### Testing Magic Links
1. Start dev server: `cd apps/web && npm run dev`
2. Go to `http://localhost:3001/login`
3. Send magic link and click **immediately** (links expire fast)
4. Watch terminal for detailed auth logs
5. Should redirect to `/dashboard` on success

### Key Files & Patterns

#### Frontend Structure
- `src/app/` - Next.js App Router pages
- `components/GuidedOnboarding.tsx` - Main onboarding wizard (9 steps)
- `src/app/api/recommend-meals/route.ts` - Core meal recommendation API with Supabase
- `types/index.ts` - All TypeScript interfaces
- API routes in `src/app/api/` handle all backend functionality

#### Configuration
- `.env.local` - All environment variables (located at project root)
- Contains Supabase, OpenAI, Resend, and Instacart API credentials
- Note: Server restart required after .env.local changes

#### Database Schema
- **Meals Table**: 532+ curated meals with comprehensive metadata
  - Timing: `prep_time`, `cook_time`, `time_total_min`
  - Difficulty: `cooking_difficulty` (easy/medium/challenging)
  - Classification: `courses`, `cuisines`, `diets_supported`
  - Ingredients: `ingredients_json` with scaling support
  - Search: `search_keywords`, `allergens_present`

### Working with the Guided Onboarding
The guided onboarding (`GuidedOnboarding.tsx`) uses a step-based flow:
- 9 steps: plan selector, dietary style, cuisines, foods to avoid, favorites, organic preference, spice tolerance, retailer selection, pantry photos
- State managed in `answers` object, converted to `UserPreferences` on completion
- Steps defined in `onboardingSteps` array
- Special handling for meal plan configuration (breakfasts/lunches/dinners per week)

### API Integration Patterns  
- All backend logic handled by Next.js API routes in `src/app/api/`
- Core meal recommendation: `/api/recommend-meals` - filters Supabase meals by user preferences
- Mock endpoints available for testing (e.g., `/api/create-cart-mock`)
- Error handling with try-catch and proper status codes
- TypeScript interfaces ensure type safety across API boundaries
- Retailers API with intelligent grocery store prioritization:
  - Tier 0: Whole Foods first
  - Tier 0.5: Major chains by store count (Aldi, Kroger, Publix, etc.)
  - Tier 1: Premium chains (Pavilions, Gelson's, Erewhon, Trader Joe's, etc.)
  - Filters out convenience/drug stores when ≥3 grocery options available

### Common Tasks
- Add new onboarding step: Update `onboardingSteps` array in `GuidedOnboarding.tsx`
- Modify meal filtering: Edit meal recommendation logic in `/api/recommend-meals/route.ts`
- Add new API endpoint: Create new route in `src/app/api/[endpoint]/route.ts`
- Update user preferences: Modify `UserPreferences` interface in `types/index.ts`

### Database Migrations
**Important**: Supabase restricts DDL operations through API for security. Use this process:

1. **Manual DDL** (via Supabase Dashboard SQL Editor):
   - Go to: https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg/sql
   - Run DDL commands (ALTER TABLE, CREATE INDEX, etc.)

2. **Data Migration** (via API scripts):
   - Use `scripts/create-migration-function.js` to detect schema changes needed
   - Use `scripts/run-migration-rest.js` to populate/update data after DDL
   - Scripts handle batch processing and data integrity checks

**Schema Update Pattern**:
```sql
-- Add new columns
ALTER TABLE meals ADD COLUMN IF NOT EXISTS new_column_name TYPE;
-- Add constraints/indexes  
CREATE INDEX IF NOT EXISTS idx_name ON meals (column_name);
```

**Migration Scripts**:
- `scripts/generate-meal-data.js` - Generate new meals with OpenAI + Supabase
- `scripts/run-migration-rest.js` - Migrate existing data after schema changes
- `npm run generate-meals` - Run meal generation (from apps/web directory)

### Cooking Difficulty Assessment
The `cooking_difficulty` field is determined by AI analysis during meal generation, considering:

**Factors Analyzed**:
- **Technique complexity**: knife skills, timing coordination, temperature control
- **Skill requirements**: multitasking, precision, experience needed  
- **Failure risk**: how forgiving the recipe is vs easy to mess up
- **Equipment mastery**: specialized tools or cooking methods

**Categories**:
- **Easy**: Simple techniques, forgiving recipes (roasted vegetables, basic pasta)
- **Medium**: Some technique required, moderate attention (stir-fry, braised meats) 
- **Challenging**: Complex techniques, high skill needed (risotto, soufflé, emulsification)

Current distribution: 125 easy (23%), 307 medium (58%), 100 challenging (19%)

## AI Usage Strategy

### Where We Use AI (Essential):
- **Pantry photo analysis**: Computer vision for ingredient identification from photos
- **Meal data generation**: Creating comprehensive, consistent meal metadata at scale  
- **Cooking difficulty assessment**: AI-based technique analysis (built into generation)

### Where We Use Pure Logic (Optimal):
- **Meal recommendation**: Database filtering + mathematical scoring for speed & reliability
- **Ingredient scaling**: Mathematical ratios for different serving sizes
- **User preference matching**: Rule-based filtering on cuisines, diets, allergens, etc.

### Future Optimization Opportunities:
- **Ingredient categorization**: Consider static lookup tables vs AI
- **Cost estimation**: Explore pricing APIs vs AI estimation

## MCP (Model Context Protocol) Setup

The project uses MCP servers for browser automation and testing. The `.mcp.json` file is configured with two MCP servers:

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://[::1]:3002/mcp"
    },
    "browsermcp": {
      "command": "npx",
      "args": ["@browsermcp/mcp@latest"]
    }
  }
}
```

### Playwright MCP Server
**Configuration**: URL-based server running on port 3002

**Setup:**
1. Start the Playwright server manually:
   ```bash
   npx @playwright/mcp@latest --headless --host localhost --port 3002
   ```

2. Or use the provided startup script:
   ```bash
   ./start-mcp-servers.sh
   ```

3. Verify it's running by checking: `http://[::1]:3002/mcp`

**Features**: Browser automation, screenshots, web interaction, headless operation

**Status**: ✅ Successfully tested and working for ChefsCart application testing

### Browser MCP Server
**Configuration**: Command-based server with Chrome extension dependency

**Setup:**
1. Install the Browser MCP Chrome extension from https://browsermcp.io/
2. Pin the extension to your Chrome toolbar
3. Click the extension icon and press "Connect" to link your browser session
4. The server starts automatically when the extension is connected

**Features**: Direct browser control, preserves login sessions, avoids bot detection

### Development Workflow
To start the full development environment:

1. Start ChefsCart dev server: `npm run dev` (port 3001)
2. Start MCP servers: `./start-mcp-servers.sh` (port 3002)
3. Setup Browser MCP extension in Chrome (one-time setup)

**Troubleshooting**: Ensure port 3002 is available, Playwright server is running, and Chrome extension is connected.

### Recent Testing & Fixes (August 2025)

**Issues Resolved:**
1. **Favorite Foods UI**: Fixed display issue where selected items showed internal IDs (e.g., "beef_steak") instead of user-friendly labels ("Beef/Steak")
   - Updated `handlePillToggle` and `isPillSelected` functions for consistency
   - Modified chip display logic to show proper labels for predefined options

2. **Meal Variety**: Enhanced meal recommendation randomization to prevent repeated selections
   - Added score-tier randomization (10-point bands) to diversify high-scoring meals
   - Improved diversity algorithm with stricter cuisine limits (max 2 initially, up to 3 with new proteins)
   - Added comprehensive logging for debugging score distribution and selection process

3. **Timing Display**: Successfully updated all UI components to show prep and cook time separately
   - Updated MealCard, MealPlanPreview components to show "Xm prep + Ym cook" format
   - Fixed API field mapping to use database prep_time/cook_time fields correctly
   - All components now display detailed timing information instead of just total time

**Testing Confirmed:**
- ✅ MCP server integration working for application testing
- ✅ Meal recommendation API returning varied results with randomization
- ✅ Favorite foods selection UI displaying proper labels
- ✅ Timing displays working across all meal components

## Additional Setup Files

### Documentation
- `scripts/MEAL_GENERATOR_SETUP.md` - Detailed meal generation setup guide
- `docs/BRAND_STYLE_GUIDE.md` - Brand guidelines and design system
- `docs/STYLE_GUIDE_IMPLEMENTATION.md` - Implementation of brand guidelines