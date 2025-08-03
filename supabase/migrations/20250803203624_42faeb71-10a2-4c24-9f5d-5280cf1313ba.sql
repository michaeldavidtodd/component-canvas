-- Fix security warning by setting proper search_path for the function
CREATE OR REPLACE FUNCTION public.get_next_version_number(project_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM public.project_versions
  WHERE project_id = project_uuid;
$$;