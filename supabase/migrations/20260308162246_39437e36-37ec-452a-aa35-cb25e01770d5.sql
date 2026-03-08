
-- Add compliance-specific columns to guidelines
ALTER TABLE public.guidelines 
  ADD COLUMN IF NOT EXISTS compliance_framework text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS risk_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_initiative_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicability_conditions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_frequency_days integer DEFAULT 365,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
