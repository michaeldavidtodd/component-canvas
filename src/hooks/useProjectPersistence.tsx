import { useState, useEffect, useCallback } from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectVersionRow = Database['public']['Tables']['project_versions']['Row'];

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  name?: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  is_auto_save: boolean;
  created_at: string;
}

export const useProjectPersistence = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Load projects for current user
  const loadProjects = useCallback(async () => {
    if (!user) {
      console.log('🚫 LoadProjects: No user');
      return;
    }

    console.log('🔍 LoadProjects: Starting to load projects for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      console.log('📋 LoadProjects: Raw projects from DB:', data);
      console.log('📊 LoadProjects: Found', data?.length || 0, 'projects');
      
      setProjects(data || []);
    } catch (error) {
      console.error('❌ LoadProjects: Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load versions for current project
  const loadVersions = useCallback(async (projectId: string) => {
    if (!projectId) return;

    console.log('🔍 Loading versions for project:', projectId);

    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📋 Raw versions data from DB:', data);
      
      const transformedData: ProjectVersion[] = (data || []).map(row => ({
        id: row.id,
        project_id: row.project_id,
        version_number: row.version_number,
        name: row.name || undefined,
        nodes: (row.nodes as unknown as Node[]) || [],
        edges: (row.edges as unknown as Edge[]) || [],
        viewport: (row.viewport as unknown as Viewport) || undefined,
        is_auto_save: row.is_auto_save,
        created_at: row.created_at
      }));
      
      console.log('🔄 Transformed versions:', transformedData.map(v => ({
        id: v.id,
        name: v.name,
        nodesCount: v.nodes?.length,
        edgesCount: v.edges?.length,
        isAutoSave: v.is_auto_save
      })));
      
      setVersions(transformedData);
    } catch (error) {
      console.error('❌ Error loading versions:', error);
      toast({
        title: "Error",
        description: "Failed to load project versions",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Create new project
  const createProject = useCallback(async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name,
          description
        })
        .select()
        .single();

      if (error) throw error;

      const newProject = data as Project;
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      
      toast({
        title: "Success",
        description: "Project created successfully"
      });

      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
      return null;
    }
  }, [user, toast]);

  // Save project state as a new version
  const saveVersion = useCallback(async (
    projectId: string,
    nodes: Node[],
    edges: Edge[],
    viewport?: Viewport,
    versionName?: string,
    isAutoSave = false
  ) => {
    if (!user || !projectId) return null;

    console.log('💾 Saving version:', {
      projectId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      versionName,
      isAutoSave
    });

    try {
      // Get next version number
      const { data: versionData } = await supabase
        .rpc('get_next_version_number', { project_uuid: projectId });

      const versionNumber = versionData || 1;

      const { data, error } = await supabase
        .from('project_versions')
        .insert({
          project_id: projectId,
          version_number: versionNumber,
          name: versionName,
          nodes: nodes as any,
          edges: edges as any,
          viewport: viewport as any,
          is_auto_save: isAutoSave
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Version saved successfully:', {
        versionId: data.id,
        versionNumber: data.version_number,
        savedNodesCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
        savedEdgesCount: Array.isArray(data.edges) ? data.edges.length : 0
      });

      const newVersion: ProjectVersion = {
        id: data.id,
        project_id: data.project_id,
        version_number: data.version_number,
        name: data.name || undefined,
        nodes: (data.nodes as unknown as Node[]) || [],
        edges: (data.edges as unknown as Edge[]) || [],
        viewport: (data.viewport as unknown as Viewport) || undefined,
        is_auto_save: data.is_auto_save,
        created_at: data.created_at
      };
      setVersions(prev => [newVersion, ...prev]);

      // Update project's updated_at timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

      // Only show toasts for manual saves, not during initialization or auto-saves
      if (!isAutoSave && versionName !== 'Initial version') {
        toast({
          title: "Success",
          description: "Version saved successfully"
        });
      }

      return newVersion;
    } catch (error) {
      console.error('❌ Error saving version:', error);
      if (!isAutoSave) {
        toast({
          title: "Error",
          description: "Failed to save version",
          variant: "destructive"
        });
      }
      return null;
    }
  }, [user, toast]);

  // Auto-save functionality
  const autoSave = useCallback(async (
    projectId: string,
    nodes: Node[],
    edges: Edge[],
    viewport?: Viewport
  ) => {
    if (!autoSaveEnabled || !projectId) return;

    // Check if there's been any actual change
    const latestVersion = versions[0];
    if (latestVersion && 
        JSON.stringify(latestVersion.nodes) === JSON.stringify(nodes) &&
        JSON.stringify(latestVersion.edges) === JSON.stringify(edges)) {
      return; // No changes, skip auto-save
    }

    await saveVersion(projectId, nodes, edges, viewport, undefined, true);
  }, [autoSaveEnabled, versions, saveVersion]);

  // Load specific version
  const loadVersion = useCallback(async (versionId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) throw error;
      
      const transformedVersion: ProjectVersion = {
        id: data.id,
        project_id: data.project_id,
        version_number: data.version_number,
        name: data.name || undefined,
        nodes: (data.nodes as unknown as Node[]) || [],
        edges: (data.edges as unknown as Edge[]) || [],
        viewport: (data.viewport as unknown as Viewport) || undefined,
        is_auto_save: data.is_auto_save,
        created_at: data.created_at
      };
      
      return transformedVersion;
    } catch (error) {
      console.error('Error loading version:', error);
      toast({
        title: "Error",
        description: "Failed to load version",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Delete version
  const deleteVersion = useCallback(async (versionId: string) => {
    try {
      const { error } = await supabase
        .from('project_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;

      setVersions(prev => prev.filter(v => v.id !== versionId));
      toast({
        title: "Success",
        description: "Version deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting version:', error);
      toast({
        title: "Error",
        description: "Failed to delete version",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setVersions([]);
    }
  }, [user, loadProjects]);

  // Load versions when current project changes
  useEffect(() => {
    if (currentProject) {
      loadVersions(currentProject.id);
    } else {
      setVersions([]);
    }
  }, [currentProject, loadVersions]);

  return {
    // State
    currentProject,
    projects,
    versions,
    loading,
    autoSaveEnabled,

    // Actions
    setCurrentProject,
    setAutoSaveEnabled,
    createProject,
    saveVersion,
    autoSave,
    loadVersion,
    deleteVersion,
    loadProjects,
    loadVersions
  };
};