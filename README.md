# ChefsCart

Your AI sous-chef that turns personal meal plans into a ready-to-checkout Instacart cart in ≤ 5 minutes.

## Overview

ChefsCart is a conversational AI meal planning application that:
1. Captures user preferences through a friendly chat wizard
2. Generates personalized meal plans using OpenAI GPT-4o-mini
3. Creates Instacart shopping carts with all required ingredients
4. Handles dietary restrictions, pantry inventory, and budget preferences

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **Database**: Firestore
- **AI**: OpenAI GPT-4o-mini (chat + vision)
- **Email**: SendGrid
- **Hosting**: Firebase Hosting
- **Monitoring**: Sentry

## Project Structure

```
chefscart/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── validate-zip/  # ZIP code validation
│   │   │   └── geo-ip/        # Location detection
│   │   └── page.tsx           # Landing page
├── components/                 # React components
│   ├── ZipCodeInput.tsx       # ZIP validation component
│   └── PreferencesChat.tsx    # Chat wizard
├── functions/                  # Firebase Cloud Functions
├── lib/                       # Utility libraries
│   ├── firebase.ts           # Firebase client config
│   └── firebase-admin.ts     # Firebase admin config
├── types/                     # TypeScript type definitions
└── config/                    # Configuration files
```

## Features Implemented

### Phase 1 - MVP (Current)
- ✅ Landing page with ZIP code validation
- ✅ Preferences chat wizard (10-step conversational flow)
- ✅ TypeScript types and interfaces
- ✅ Firebase configuration
- ✅ Environment variable setup
- ✅ Responsive design with Tailwind CSS

### Phase 1.1 - Next Steps
- 🔄 Firebase Cloud Functions for GPT integration
- 🔄 Firestore data models and security rules
- 🔄 OpenAI meal plan generation
- 🔄 Instacart IDP integration
- 🔄 Email notifications with SendGrid

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore, Functions, and Hosting enabled

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your API keys:
   - Firebase configuration
   - OpenAI API key
   - SendGrid API key
   - Instacart IDP credentials

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## User Flow

1. **Landing & ZIP Check** - User enters ZIP code, system validates Instacart coverage
2. **Preferences Chat Wizard** - 10-step conversational flow for preferences
3. **Meal Plan Generation** - GPT creates personalized recipes with nutrition info
4. **Cart Creation** - System builds Instacart shopping list with deep-link
5. **Delivery & Support** - Email confirmation with cart link and instructions

## Data Models

Key TypeScript interfaces defined in `types/index.ts`:
- `User` - User profile and preferences
- `MealPlan` - Generated meal plans with recipes
- `Recipe` - Individual recipe with ingredients and nutrition
- `InstacartList` - Shopping cart integration data

## Development

### Running the Application
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## Performance Targets

- **LCP**: ≤ 2s on 4G
- **GPT Response**: ≤ 7s (p95) 
- **Error Budget**: < 1% 5xx errors
- **Ingredient Match**: ≥ 90% success rate

---

*ChefsCart - Making meal planning effortless with AI* 🧑‍🍳
