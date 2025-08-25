#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupBucket() {
  try {
    console.log('🗄️ Setting up Supabase storage bucket for meal images...');
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const mealImagesBucket = buckets.find(b => b.name === 'meal-images');
    
    if (mealImagesBucket) {
      console.log('✅ Bucket "meal-images" already exists');
    } else {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('meal-images', {
        public: true, // Make images publicly accessible
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error);
        return;
      }
      
      console.log('✅ Created bucket "meal-images"');
    }
    
    // Get public URL pattern
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/meal-images/`;
    console.log(`📸 Images will be accessible at: ${publicUrl}[filename]`);
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

setupBucket();