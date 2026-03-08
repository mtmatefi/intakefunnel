
-- Table to link Strategy Sculptor initiatives with Intake Pipeline intakes
CREATE TABLE public.initiative_intake_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  initiative_id TEXT NOT NULL,
  initiative_title TEXT NOT NULL,
  initiative_data JSONB DEFAULT '{}'::jsonb,
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  source_app TEXT NOT NULL DEFAULT 'strategy_sculptor',
  sync_status TEXT NOT NULL DEFAULT 'linked',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, initiative_id)
);

-- Enable RLS
ALTER TABLE public.initiative_intake_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view links for their intakes
CREATE POLICY "Users can view initiative links for accessible intakes"
ON public.initiative_intake_links FOR SELECT TO authenticated
USING (
  intake_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM intakes 
    WHERE intakes.id = initiative_intake_links.intake_id 
    AND (intakes.requester_id = auth.uid() OR has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- Architects and admins can manage links
CREATE POLICY "Architects and admins can manage initiative links"
ON public.initiative_intake_links FOR ALL TO authenticated
USING (has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Public insert for API webhook (tenant_api_key validated in edge function)
CREATE POLICY "Public insert for webhook"
ON public.initiative_intake_links FOR INSERT TO anon
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_initiative_links_updated_at
  BEFORE UPDATE ON public.initiative_intake_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
