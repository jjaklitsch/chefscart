# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Always Check Build Before Committing
Before committing any changes to the repository, ALWAYS run `npm run build` to ensure there are no TypeScript or compilation errors. Only commit and push changes if the build succeeds.

## Key Commands

### Development
```bash
# Frontend development
cd apps/web && npm run dev  # Start Next.js dev server (runs on localhost:3001)
npm run lint                # Run ESLint checks
npm run build              # Build production Next.js app

# Meal Data Generation
npm run generate-meals     # Generate new meals with OpenAI + Supabase (from apps/web)

# Meal Image Generation (scripts directory)
cd scripts && npm run generate-images  # Generate meal images with Imagen 4
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
- **AI**: OpenAI GPT-5-mini (`gpt-5-mini`) for selective analysis and content generation with reasoning capabilities
- **External APIs**: Instacart IDP, Resend
- **Testing**: Vitest + React Testing Library

### Core User Flow
1. ZIP validation → Check Instacart coverage via cached lookup
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
- 9 steps: plan selector, dietary style, cuisines, foods to avoid, favorites, organic preference, spice tolerance, delivery preferences, pantry photos
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

### Page Layout Pattern (CRITICAL)
**ALWAYS include Header and Footer on all pages** to maintain consistent navigation:

```tsx
import Header from '../../../components/Header'  // Adjust path as needed
import Footer from '../../../components/Footer'  // Adjust path as needed

export default function YourPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      {/* Your page content here */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... */}
      </div>
      
      <Footer />
    </div>
  )
}
```

**Common locations that need Header/Footer:**
- Profile pages (`/profile/[username]/page.tsx`)
- Recipe pages (`/recipes/[slug]/page.tsx`) 
- Community pages (`/community/*`)
- Settings pages (`/preferences`, `/account`)
- Any new user-facing pages

This pattern ensures users always have navigation access and consistent branding across the entire application.

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
- `scripts/simple-zip-coverage.cjs` - Populate ZIP code Instacart coverage cache
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

## ZIP Code Cache System

The application maintains a comprehensive cache of US ZIP codes to quickly validate Instacart delivery coverage without making real-time API calls during user onboarding.

### Database Schema
The `zip_code_cache` table stores simplified coverage data:
```sql
CREATE TABLE zip_code_cache (
    zip_code VARCHAR(5) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    has_instacart_coverage BOOLEAN NOT NULL DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_api_check TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    api_response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Cache Population
**Script**: `scripts/simple-zip-coverage.cjs`
- Efficiently checks ~41,000+ real US ZIP codes for Instacart coverage
- Only stores coverage status (boolean), not retailer details
- Processes at 10-20 requests/second with proper rate limiting
- Handles all major US ZIP code ranges (00501-99999)

**Usage**:
```bash
cd scripts && node simple-zip-coverage.cjs --conservative  # 10 req/sec
cd scripts && node simple-zip-coverage.cjs                 # 20 req/sec (default)
```

### Coverage Statistics
- **Total Coverage**: ~41,000+ US ZIP codes
- **Geographic Scope**: All 50 states, DC, Puerto Rico, military bases
- **Expected Coverage Rate**: 60-80% nationally (higher in metro areas)
- **Update Frequency**: Run periodically as Instacart expands service areas

### Integration Points
- **User Onboarding**: `/api/validate-zip` endpoint checks cache first
- **Fallback**: Real-time Instacart API call if ZIP not cached
- **Frontend**: `ZipCodeInput.tsx` component validates against cache

### Key Benefits
- **Fast Response**: Sub-100ms ZIP validation (vs 1-2s API calls)
- **Reduced API Costs**: Avoids repeated calls for same ZIP codes
- **Offline Capability**: Works even if Instacart API is temporarily unavailable
- **Accurate Coverage**: Distinguishes between valid ZIP codes with/without coverage

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

## Meal Image Generation (Imagen 4)

The application features a 2-step AI-powered image generation system for creating professional food photography using Google's Imagen 4 model.

### System Architecture
**Step 1: Prompt Generation** (Gemini 1.5 Flash)
- Analyzes meal title, description, cuisines, and primary ingredient
- Generates professional food photography prompts with specific constraints
- Creates negative prompts to exclude unwanted elements (props, utensils, etc.)
- Returns structured JSON with prompt, negative_prompt, and plate/bowl recommendation

**Step 2: Image Generation** (Imagen 4)
- Uses `imagen-4.0-generate-001` model for high-quality 2K images  
- Combines main prompt with negative prompt constraints
- Generates 1:1 aspect ratio images perfect for social media/e-commerce
- Uploads images to Supabase Storage with public URLs
- Maintains local backups for redundancy

### Database Schema
Images are tracked in the `meal2` table with these fields:
```sql
image_prompt          TEXT                     -- Generated photography prompt
image_negative_prompt TEXT                     -- Elements to exclude  
image_url            TEXT                     -- Public Supabase Storage URL
image_generated_at   TIMESTAMP WITH TIME ZONE -- Generation timestamp
image_generation_model VARCHAR(100)           -- Model used (imagen-4.0-generate-001)
```

### Usage Commands
```bash
# Generate images for meals (run from scripts directory)
cd scripts && npm run generate-images

# The script processes meals in meal2 table that don't have images yet
# Default: processes 2 meals at a time to avoid rate limits
# Images are saved to Supabase Storage bucket: meal-images/meals/
```

### Generated Image Properties
- **Resolution**: 2K quality for print/web use
- **Format**: PNG with transparency support
- **Aspect Ratio**: 1:1 (square) for consistent social media display
- **Style**: Professional food photography with:
  - White seamless background
  - Overhead 90° camera angle (or 15-25° for tall items)
  - Soft diffused studio lighting
  - White rimless plate/bowl centered with 12-15% margin
  - Generous restaurant-style portions

### API Dependencies & Pricing
- **Google AI Studio API**: Requires `GEMINI_API_KEY` environment variable
- **Supabase Storage**: Uses `meal-images` bucket for public hosting
- **Cost**: ~$0.04 per image (Imagen 4 Standard pricing)

### Quota Limits & Pricing Tiers

**Current Tier 1 Limits** (Paid):
- **Daily Quota**: 70 images/day for Imagen 4 Standard
- **Rate Limit**: 10 requests/minute maximum
- **Cost**: $0.04 per image ($2.80/day at full quota)

**Upgrade Options**:
- **Tier 2**: 1,000 images/day ($40/day max) - requires $250+ spending + 30 days
- **Tier 3**: 15,000 images/day ($600/day max) - enterprise level
- **Vertex AI Alternative**: Same $0.04 pricing with more flexible quotas

**Cost Optimization**:
- **Batch Mode**: 50% cost reduction ($0.02/image) for async processing
- **Quota Reset**: Daily limits reset every 24 hours
- **Free Testing**: Google AI Studio offers limited free testing

**Production Recommendations**:
- For 533 meals: ~$21.32 total cost (8 days at Tier 1 quota)
- Consider Tier 2 upgrade for faster processing: ~$21.32 in 1 day
- Use rate-limited script to respect quota boundaries

### Quality Controls
- Automatic negative prompting prevents common issues (props, utensils, text overlays)
- Local backups ensure no image loss during upload failures
- Structured prompts ensure consistent professional food photography style
- Rate limiting (7 seconds delay) prevents API quota exceeded errors
- Resumable processing for large datasets with quota management

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