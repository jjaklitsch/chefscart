#!/usr/bin/env node

/**
 * Temporarily revert codebase to use meals table instead of meal2 
 * So you can see all 532+ recipes while we populate meal2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, '..', 'apps', 'web');

const filesToRevert = [
  'src/app/sitemap.ts',
  'src/app/recipes/[slug]/page.tsx', 
  'components/Footer.tsx',
  'lib/shopping-cart-service.ts',
  'src/app/api/recommend-meals/route.ts',
  'src/app/api/favorites/route.ts',
  'src/app/api/favorites/check/route.ts',
  'src/app/recipes/page.tsx',
  'src/app/recipes/course/[slug]/page.tsx',
  'src/app/recipes/cuisine/[slug]/page.tsx', 
  'src/app/recipes/difficulty/[slug]/page.tsx',
  'src/app/recipes/diet/[slug]/page.tsx',
  'components/RelatedRecipes.tsx',
  'src/app/recipes/cuisines/page.tsx',
  'src/app/recipes/diets/page.tsx'
];

function revertFile(filePath) {
  try {
    const fullPath = path.join(webDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace meal2 back to meals
    const revertedContent = content
      .replace(/\.from\(\\s*['\"`]meal2['\"`]\\s*\)/g, ".from('meals')")
      .replace(/\.from\(\\s*\"meal2\"\\s*\)/g, '.from("meals")')
      .replace(/\.from\(\\s*'meal2'\\s*\)/g, ".from('meals')")
      .replace(/\.from\(\\s*`meal2`\\s*\)/g, ".from('meals')");

    if (content !== revertedContent) {
      fs.writeFileSync(fullPath, revertedContent);
      console.log(`✅ Reverted: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error reverting ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔄 Temporarily reverting codebase to use meals table');
console.log('='.repeat(50));

let revertedCount = 0;
for (const filePath of filesToRevert) {
  if (revertFile(filePath)) {
    revertedCount++;
  }
}

console.log(`\\n📊 Reverted ${revertedCount} files back to meals table`);
console.log('🌐 Frontend will now show all 532+ recipes again');
console.log('\\n💡 To switch back to meal2: run the update-codebase-to-meal2.js script');