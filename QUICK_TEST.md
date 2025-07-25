# Quick Testing Guide

## 🚨 Java Required for Firebase Emulators

The Firebase emulators need Java to run. Here are your options:

### Option A: Install Java (Recommended)
```bash
# Install Java via Homebrew
brew install openjdk@11

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"

# Restart terminal, then:
firebase emulators:start --only functions,firestore
```

### Option B: Test with Deployed Functions
```bash
# Deploy functions to Firebase
firebase deploy --only functions

# Start Next.js app (update API routes to use production URLs)
npm run dev
```

### Option C: Mock Testing (No Backend)
For immediate UI testing, I can create a mock mode that simulates the backend responses.

## 🎯 Current Status

✅ **Your OpenAI API key is configured**
✅ **Support email updated to support@chefscart.ai**
✅ **All dependencies installed**
✅ **Ready to test once Java is installed**

## 🧪 Test Flow Once Java is Ready

1. **Start emulators:**
   ```bash
   firebase emulators:start --only functions,firestore
   ```

2. **Start Next.js in another terminal:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Visit http://localhost:3000
   - Enter ZIP: 10001 (NYC - has coverage)
   - Complete preferences wizard
   - Watch GPT generate your meal plan!
   - Create mock Instacart cart

## 🔧 Alternative: Deploy to Production Now

If you want to skip local testing and go straight to production:

```bash
# Build the project
npm run build

# Deploy everything to Firebase
firebase deploy

# Your app will be live at: https://chefscart-e0744.web.app
```

Which option would you prefer?