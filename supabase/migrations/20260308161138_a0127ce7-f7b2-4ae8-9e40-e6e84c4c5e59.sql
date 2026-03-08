
ALTER TABLE public.initiative_intake_links 
ADD COLUMN IF NOT EXISTS callback_url text,
ADD COLUMN IF NOT EXISTS enrichment_sent_at timestamp with time zone;
