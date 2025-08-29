import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/onboarding',
          '/preferences', 
          '/profile',
          '/cart-builder/*',
          '/cart-preparation/*',
          '/cart-success/*',
          '/meal-plan/*',
          '/grocery-list',
          '/login',
          '/welcome',
          '/api/*',
          '/auth/*',
        ],
      },
    ],
    sitemap: 'https://chefscart.ai/sitemap.xml',
  }
}