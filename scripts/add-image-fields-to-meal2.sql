-- Add fields for storing image generation data in meal2 table
ALTER TABLE meal2 
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_negative_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS image_generation_model VARCHAR(100);

-- Add index for tracking which meals need images
CREATE INDEX IF NOT EXISTS idx_meal2_image_status 
ON meal2(image_url) 
WHERE image_url IS NULL;

-- Optional: Add a comment to document the fields
COMMENT ON COLUMN meal2.image_prompt IS 'The prompt used to generate the meal image';
COMMENT ON COLUMN meal2.image_negative_prompt IS 'Negative prompt to exclude unwanted elements';
COMMENT ON COLUMN meal2.image_url IS 'URL or path to the generated meal image';
COMMENT ON COLUMN meal2.image_generated_at IS 'Timestamp when the image was generated';
COMMENT ON COLUMN meal2.image_generation_model IS 'Model used for generation (e.g., imagen-3-fast-generate-001)';