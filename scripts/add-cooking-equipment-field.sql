-- Add cooking_equipment field to meals table
-- This field will store an array of cooking equipment needed for the meal

-- Add the new column
ALTER TABLE meals 
ADD COLUMN cooking_equipment text[] DEFAULT '{}';

-- Add a comment explaining the field
COMMENT ON COLUMN meals.cooking_equipment IS 'Array of cooking equipment needed for preparing this meal';

-- Create an index for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_meals_cooking_equipment 
ON meals USING GIN (cooking_equipment);

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'meals' 
AND column_name = 'cooking_equipment';