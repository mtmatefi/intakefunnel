ALTER TABLE public.innovation_work_items
  ADD COLUMN acceptance_criteria text[] DEFAULT '{}',
  ADD COLUMN functional_requirements text[] DEFAULT '{}',
  ADD COLUMN non_functional_requirements text[] DEFAULT '{}',
  ADD COLUMN priority text DEFAULT 'medium',
  ADD COLUMN story_points integer DEFAULT NULL,
  ADD COLUMN definition_of_done text DEFAULT NULL;