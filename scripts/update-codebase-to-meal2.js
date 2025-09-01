#!/usr/bin/env node

/**
 * Update codebase to reference meal2 table instead of meals table
 * Creates backup and updates all references
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, '..', 'apps', 'web');

const filesToUpdate = [
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

function updateFileContents(filePath) {
  try {
    const fullPath = path.join(webDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Create backup
    const backupPath = fullPath + '.backup-meals';
    fs.writeFileSync(backupPath, content);
    
    // Replace table references
    const updatedContent = content
      .replace(/\.from\(\s*['"`]meals['"`]\s*\)/g, ".from('meal2')")
      .replace(/\.from\(\s*"meals"\s*\)/g, '.from("meal2")')
      .replace(/\.from\(\s*'meals'\s*\)/g, ".from('meal2')")
      .replace(/\.from\(\s*`meals`\s*\)/g, ".from('meal2')");

    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      // Remove backup if no changes
      fs.unlinkSync(backupPath);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔄 Updating codebase to reference meal2 table');
  console.log('============================================\n');

  let updatedCount = 0;
  let totalFiles = filesToUpdate.length;

  for (const filePath of filesToUpdate) {
    if (updateFileContents(filePath)) {
      updatedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`• ${updatedCount} files updated`);
  console.log(`• ${totalFiles - updatedCount} files unchanged`);
  console.log(`• Backups created as *.backup-meals`);
  
  if (updatedCount > 0) {
    console.log('\n✅ Codebase now references meal2 table');
    console.log('📋 Next steps:');
    console.log('1. Create meal2 table in Supabase Dashboard (SQL provided earlier)');
    console.log('2. Generate improved meal data for first 10 meals');
    console.log('3. Test frontend with new data');
    console.log('\n⚠️ To revert: Run `git checkout -- apps/web/` or restore from *.backup-meals files');
  }
}

main();