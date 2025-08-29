-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  zip_code VARCHAR(5) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(50),
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  UNIQUE(email, zip_code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_zip_code ON waitlist (zip_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist (notified);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;