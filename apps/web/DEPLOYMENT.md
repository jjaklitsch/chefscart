# ChefsCart Vercel Deployment Guide

## Prerequisites
- GitHub repository with latest code pushed
- Vercel account connected to GitHub
- All environment variables ready

## Deployment Steps

### 1. Import from GitHub
1. Go to Vercel Dashboard
2. Click "New Project"
3. Import from GitHub: `https://github.com/jjaklitsch/chefscart`
4. Select the repository and configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Environment Variables
Copy all variables from `.env.local` to Vercel:

**Required Variables:**
```
SUPABASE_URL=https://bcbpcuzjkuptyxinjchg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=https://bcbpcuzjkuptyxinjchg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=support@chefscart.ai
INSTACART_API_KEY=your_instacart_key
INSTACART_IDP_BASE_URL=https://connect.dev.instacart.tools
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
CRON_API_KEY=your_secure_cron_api_key
CRON_SECRET=your_secure_cron_secret
```

**Important Notes:**
- Update `NEXT_PUBLIC_APP_URL` to your actual Vercel domain
- Use production-grade secrets for `CRON_API_KEY` and `CRON_SECRET`
- Keep the same Supabase URL and keys from development

### 3. Cron Job Configuration
The `vercel.json` file configures:
- **Monthly ZIP sync**: Runs on 1st of each month at midnight
- **Function timeouts**: 5 minutes for sync, 1 minute for notifications

### 4. Database Setup
If not already done, run the simplified schema:
```sql
-- Run in Supabase SQL Editor
-- File: scripts/simplified-zip-cache-schema.sql
```

### 5. Post-Deployment Verification
1. Test core functionality:
   - ZIP code validation
   - Onboarding flow
   - Meal recommendations
   - Cart creation
2. Test waitlist signup
3. Monitor cron job logs in Vercel Functions tab

## Troubleshooting

### Build Errors
- Ensure `apps/web` is set as root directory
- Check TypeScript errors in build logs
- Verify all dependencies in package.json

### Runtime Errors
- Check environment variables are set correctly
- Verify Supabase connection
- Check function logs for API errors

### Cron Jobs
- Verify cron schedule in Vercel Functions dashboard
- Test endpoint manually: `POST /api/cron/instacart-sync` with auth header
- Check function execution logs

## Monitoring
- **Function Logs**: Vercel Dashboard → Functions tab
- **Database**: Supabase Dashboard → Logs
- **Email Delivery**: Resend Dashboard → Logs
- **Errors**: Vercel Dashboard → Functions → Error logs

## Support
For deployment issues, check:
1. Vercel build logs
2. Function execution logs
3. Supabase logs
4. Environment variable configuration