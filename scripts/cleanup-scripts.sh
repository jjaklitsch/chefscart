#!/bin/bash
echo "🧹 Cleaning up completed migration scripts..."

# Remove old ingredient normalization attempts
rm -f ai-add-shoppable-names.js
rm -f ai-regenerate-meal-ingredients.js
rm -f ai-regenerate-parallel.js
rm -f ai-normalize-meals-row-by-row.js
rm -f normalize-existing-ingredients.js
rm -f normalize-existing-ingredients-new.js
rm -f parallel-normalize-meals.js
rm -f process-single-meal.js
rm -f check-regeneration-results.js

# Remove database schema experiments
rm -f create-canonical-ingredients-schema.sql
rm -f create-schema-clean.sql
rm -f create-schema-supabase.js
rm -f setup-canonical-schema.js
rm -f add-columns-api.js
rm -f add-columns-direct.js
rm -f add-columns.sql
rm -f add-ingredients-backup-field.sql
rm -f create-backup-column.js

# Remove Spoonacular import work
rm -f import-spoonacular-data.js
rm -f import-spoonacular-data-fixed.js
rm -f ai-cleanse-spoonacular-data.js
rm -f ai-cleanse-spoonacular-data-parallel.js
rm -f ai-cleanse-spoonacular-data-targeted.js
rm -f spoonacular-categories.js

# Remove course classification fixes
rm -f fix-course-classification.js
rm -f fix-course-final.js
rm -f finish-course-fix.js

# Remove migration utilities
rm -f migrate-existing-meals.js
rm -f migrate-simple.js
rm -f migrate-time-and-difficulty.sql
rm -f create-migration-function.js
rm -f run-migration.js
rm -f run-migration-pg.js
rm -f run-migration-rest.js
rm -f update-meal-generation.js

# Remove ingredient matching experiments
rm -f ai-enhanced-ingredient-matcher.js
rm -f build-ingredient-matcher.js
rm -f generate-missing-aliases.js

# Remove test/sample files
rm -f list-sample-meals.js
rm -f test-supabase-images.js
rm -f normalization-progress.log

echo "✅ Cleanup completed!"
echo "📁 Remaining scripts:"
ls -la *.js *.md *.sql

