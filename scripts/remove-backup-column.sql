-- Remove ingredients_json_original backup column
-- This column was created during the normalization process as a safety backup
-- Since normalization is complete and successful, it's no longer needed

ALTER TABLE meals DROP COLUMN IF EXISTS ingredients_json_original;

-- Verify column was removed
-- You can uncomment this to check:
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'meals' 
-- AND column_name = 'ingredients_json_original';