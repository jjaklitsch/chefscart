# ChefsCart Shop Setup Guide

This guide walks you through completing the affiliate shop implementation.

## 🛠 Database Setup

### 1. Create Shop Tables
Run these SQL scripts in your Supabase Dashboard (https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg/sql):

```sql
-- First, run the table creation script:
-- Copy and paste contents from: scripts/create-shop-tables.sql

-- Then, populate with initial data:
-- Copy and paste contents from: scripts/populate-shop-data.sql
```

### 2. Verify Table Creation
After running the scripts, verify these tables exist:
- `shop_categories` (9 categories)
- `cooking_equipment` (100+ items) 
- `equipment_categories` (junction table)

## 🔑 Amazon API Configuration

### 1. Get Amazon Product Advertising API Access
1. Sign up for Amazon Associates Program: https://affiliate-program.amazon.com/
2. Apply for Product Advertising API access: https://webservices.amazon.com/paapi5/
3. Get your AWS Access Key and Secret Key from AWS IAM

### 2. Update Environment Variables
Update these values in `.env.local`:
```env
# Replace with your actual AWS credentials
AWS_ACCESS_KEY=your_actual_aws_access_key
AWS_SECRET_KEY=your_actual_aws_secret_key

# Verify your affiliate ID
AMAZON_AFFILIATE_ID=chefscart-20
```

**Note**: AWS credentials require IAM user with Product Advertising API permissions.

## 🚀 Testing the Shop

### 1. Start the Development Server
```bash
cd apps/web && npm run dev
```

### 2. Test Shop Features

#### Shop Home Page
- Navigate to: http://localhost:3001/shop
- Verify: Categories load, search bar works
- Check: Featured equipment displays

#### Category Pages  
- Click on any category (e.g., "Knives & Cutting Tools")
- Verify: Equipment items load with Amazon products
- Test: "View All Options" links work

#### Search Functionality
- Use search bar with terms like "chef knife", "mixing bowl"
- Verify: Amazon products load with affiliate links
- Test: Pagination (Load More button)
- Check: "Add to Amazon Cart" links include affiliate ID

#### Recipe Integration
- Visit any recipe page (e.g., http://localhost:3001/recipes/beef-stir-fry)
- Verify: "Required Equipment" section appears
- Check: Equipment tags link to shop search pages
- Test: Equipment recommendations based on recipe type

### 3. Test Amazon Integration

#### Affiliate Links
All Amazon links should include `tag=chefscart-20`:
- Product page links: `https://www.amazon.com/dp/ASIN?tag=chefscart-20`
- Add to cart links: `https://www.amazon.com/dp/ASIN?tag=chefscart-20&linkCode=osi&th=1&psc=1`

#### API Rate Limits
- Amazon PA-API has strict rate limits
- Test gradually to avoid hitting limits
- Monitor API response for error messages

## 🎯 Key URLs to Test

### Static Pages
- `/shop` - Main shop page
- `/shop/search?q=knife` - Search results

### Dynamic Category Pages
- `/shop/category/knives-cutting-tools`
- `/shop/category/cookware-pans`
- `/shop/category/baking-essentials`
- `/shop/category/kitchen-appliances`

### Recipe Integration
- Visit any recipe and check for equipment sections
- Click equipment tags to verify shop links work

## 📋 Pre-Launch Checklist

### Database
- [ ] Shop tables created and populated
- [ ] Equipment categories properly assigned
- [ ] Sample data loads correctly

### Amazon Integration
- [ ] AWS credentials configured
- [ ] Affiliate ID set correctly
- [ ] API responses return product data
- [ ] All links include affiliate tracking

### User Experience
- [ ] Shop navigation visible in header/footer
- [ ] Search functionality works
- [ ] Category pages load properly
- [ ] Recipe equipment sections display
- [ ] Equipment tags link to shop pages
- [ ] Mobile responsiveness works

### SEO
- [ ] Sitemap includes shop URLs
- [ ] Category pages have proper metadata
- [ ] Internal linking structure works

## 🐛 Troubleshooting

### Amazon API Issues
- **"AWS credentials not configured"**: Update `.env.local` with real credentials
- **"Request failed: 400"**: Check affiliate ID and API permissions
- **"Request failed: 429"**: Rate limit exceeded, wait before retrying
- **No products returned**: Try different search terms or check API quota

### Database Issues  
- **Tables don't exist**: Re-run migration scripts in Supabase dashboard
- **No equipment data**: Run populate-shop-data.sql script
- **Categories empty**: Check equipment_categories junction table

### UI Issues
- **Equipment section not showing**: Check recipe data and component props
- **Links not working**: Verify slug generation and routing
- **Search not loading**: Check API route and Amazon integration

## 📈 Performance Considerations

### Caching
- Amazon API responses should be cached for better performance
- Consider implementing Redis or similar for product data

### Rate Limiting
- Amazon PA-API has daily request limits
- Monitor usage and implement request throttling if needed

### Database Optimization
- Add indexes on frequently queried columns
- Consider pagination for large equipment lists

## 🔄 Future Enhancements

### Phase 2 Features
- Product comparison tools
- User reviews and ratings
- Equipment wish lists
- Bulk cart creation for entire recipes

### Analytics Integration
- Track affiliate click-through rates
- Monitor conversion metrics
- A/B test product recommendations

### Content Management
- Admin interface for managing equipment
- Automated product price updates
- Equipment recommendation engine improvements

## 💡 Tips for Success

1. **Start Small**: Test with a few equipment items first
2. **Monitor Metrics**: Track affiliate earnings and click-through rates  
3. **User Feedback**: Collect feedback on equipment recommendations
4. **Regular Updates**: Keep equipment database current with new products
5. **SEO Focus**: Optimize equipment pages for search visibility

---

**Ready to launch!** Once you complete the database setup and Amazon API configuration, your affiliate shop will be fully functional.