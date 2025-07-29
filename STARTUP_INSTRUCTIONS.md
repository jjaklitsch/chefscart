# ChefsCart Development Setup

## Quick Start

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)

### Development Server

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start the Next.js development server on http://localhost:3001

2. **Alternative - Direct approach:**
   ```bash
   cd apps/web
   npm run dev
   ```

### Available Scripts

From the root directory:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run setup` - Install dependencies

### Firebase Functions

To work with Firebase Functions:

```bash
cd functions
npm install
npm run build    # Compile TypeScript
npm run serve    # Start local emulators
npm run deploy   # Deploy to Firebase
```

### Environment Setup

1. Copy environment variables from existing `.env.local` files
2. Ensure OpenAI API key is configured for meal plan generation
3. Firebase configuration should be set up for production deployment

### Project Structure

```
chefscart/
├── apps/web/          # Next.js frontend application
├── functions/         # Firebase Cloud Functions
├── docs/             # Documentation
└── tests/            # Test files
```

## Recent Updates Completed

### Core Functionality ✅
- **Fixed meal generator** - Now correctly generates specified number of meals (e.g., 5 breakfast, 5 dinner)
- **DALL-E thumbnail generation** - Implemented automatic food image generation for recipes
- **Intermediate cart building** - Added step to consolidate ingredients before Instacart checkout
- **Enhanced onboarding** - Added progress checklist with navigation between completed steps

### UI/UX Improvements ✅
- **Fixed layout issues** - Ingredients and cooking instructions now extend to full width
- **Removed blank spots** - Cleaned up empty rows in ingredients sections  
- **Social media icons** - Added Instagram, YouTube, and TikTok icons to footer
- **Better meal images** - Replaced placeholder images with food-styled graphics

### Technical Improvements ✅
- **Removed pnpm dependencies** - Migrated to use npm exclusively
- **Updated package.json** - Cleaned up scripts and dependencies
- **Enhanced error handling** - Better fallbacks for API failures
- **Responsive design** - Mobile-friendly sidebar and navigation

### Known Issues
- OpenAI API integration may need environment variable configuration for full functionality
- Meal suggestion "failed to fetch" errors indicate API key setup needed

### Notes

- Development server runs on port 3001 to avoid conflicts
- All meal images are now properly styled food graphics
- Cart building step includes 10% quantity buffer and pantry item detection
- Onboarding flow includes step-by-step navigation with progress tracking