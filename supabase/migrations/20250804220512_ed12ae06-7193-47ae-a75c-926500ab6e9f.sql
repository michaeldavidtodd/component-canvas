-- Add public sharing support to projects
ALTER TABLE public.projects 
ADD COLUMN is_public boolean DEFAULT false,
ADD COLUMN share_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Create index for faster lookups by share token
CREATE INDEX idx_projects_share_token ON public.projects(share_token) WHERE is_public = true;

-- Update RLS policies to allow public access to shared projects
CREATE POLICY "Public projects are viewable by everyone" 
ON public.projects 
FOR SELECT 
USING (is_public = true);

-- Allow public access to versions of shared projects
CREATE POLICY "Versions of public projects are viewable by everyone" 
ON public.project_versions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_versions.project_id 
    AND is_public = true
  )
);