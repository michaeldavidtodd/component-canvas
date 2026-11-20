import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import type { Project, ProjectVersion } from '@/types/project';

export type { Project, ProjectVersion };

export const useProjectPersistence = () => {
  const { user, isAnonymous } = useAuth();
  const { toast } = useToast();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const currentProjectRef = useRef<Project | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const versionsRequestRef = useRef(0);
  // Bumped whenever versions are added/removed so an in-flight load that
  // started before the mutation can't overwrite the newer local state.
  const versionsMutationRef = useRef(0);

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
      setProjectsLoaded(true);
    }
  }, [user, toast]);

  // Load versions for current project. Clearing first and tracking the latest
  // request prevents a slow response for a previous project from overwriting
  // the versions of the project the user just switched to.
  const loadVersions = useCallback(async (projectId: string) => {
    if (!projectId) return;

    const requestId = ++versionsRequestRef.current;
    const mutationAtStart = versionsMutationRef.current;
    console.log('🔍 Loading versions for project:', projectId);
    setVersionsLoading(true);
    setVersions([]);

    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (requestId !== versionsRequestRef.current || mutationAtStart !== versionsMutationRef.current) return;

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
      if (requestId !== versionsRequestRef.current) return;
      console.error('❌ Error loading versions:', error);
      toast({
        title: "Error",
        description: "Failed to load project versions",
        variant: "destructive"
      });
    } finally {
      if (requestId === versionsRequestRef.current) {
        setVersionsLoading(false);
      }
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
      // Clear the previous project's versions before activating the new one so
      // the canvas never renders stale data during the switch.
      setVersions([]);
      setVersionsLoading(true);
      setCurrentProjectState(newProject);
      
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

  // Switch the active project. The currentProject effect loads its versions.
  const selectProject = useCallback(async (projectOrId: Project | string) => {
    const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId.id;
    const existing = typeof projectOrId === 'string'
      ? projects.find(p => p.id === projectId) ?? null
      : projectOrId;

    if (existing) {
      // Selecting the already-active project won't change the state reference,
      // so reload versions explicitly instead of waiting for the effect.
      if (currentProjectRef.current?.id === existing.id) {
        await loadVersions(existing.id);
        return existing;
      }
      setVersions([]);
      setVersionsLoading(true);
      setCurrentProjectState(existing);
      return existing;
    }

    // Fall back to fetching when the project isn't in the loaded list (e.g. a deep link).
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const project = data as Project;
      setProjects(prev => prev.some(p => p.id === project.id) ? prev : [project, ...prev]);
      if (currentProjectRef.current?.id === project.id) {
        await loadVersions(project.id);
        return project;
      }
      setVersions([]);
      setVersionsLoading(true);
      setCurrentProjectState(project);
      return project;
    } catch (error) {
      console.error('Error selecting project:', error);
      toast({
        title: "Error",
        description: "Failed to open project",
        variant: "destructive"
      });
      return null;
    }
  }, [projects, loadVersions, toast]);

  // Update project
  const updateProject = useCallback(async (projectId: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => {
    if (!user) return null;

    console.log('🔄 updateProject called with:', { projectId, updates, currentProjectId: currentProjectRef.current?.id });

    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      const updatedProject = data as Project;
      console.log('🔄 Database update successful:', updatedProject);
      
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));

      // Keep currentProject in sync when the project being edited is the open one
      if (currentProjectRef.current?.id === projectId) {
        console.log('🔄 Updating currentProject state to:', updatedProject.name);
        // Create a new object reference to ensure React detects the change
        setCurrentProjectState({ ...updatedProject });
      }
      
      toast({
        title: "Success",
        description: "Project updated successfully"
      });

      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
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
          nodes: nodes as unknown as Json,
          edges: edges as unknown as Json,
          viewport: (viewport ?? null) as unknown as Json,
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
      versionsMutationRef.current += 1;
      setVersions(prev => prev.some(v => v.id === newVersion.id) ? prev : [newVersion, ...prev]);

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

      versionsMutationRef.current += 1;
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

  const toggleProjectPublic = useCallback(async (projectId: string, isPublic: boolean) => {
    if (!user && !isAnonymous) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_public: isPublic })
        .eq('id', projectId)
        .select('share_token')
        .single();

      if (error) throw error;

      // Update local state, including the share token so the share URL is
      // available immediately after enabling sharing.
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, is_public: isPublic, share_token: data.share_token }
          : p
      ));

      if (currentProjectRef.current?.id === projectId) {
        setCurrentProjectState({ ...currentProjectRef.current, is_public: isPublic, share_token: data.share_token });
      }

      return data.share_token;
    } catch (error) {
      console.error('Error toggling project public status:', error);
      toast({
        title: "Error",
        description: "Failed to update sharing settings",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, isAnonymous, toast]);

  const getPublicProject = useCallback(async (shareToken: string) => {
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (projectError) throw projectError;

      const { data: versions, error: versionsError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      const transformedVersions: ProjectVersion[] = (versions || []).map(row => ({
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

      return { project, versions: transformedVersions };
    } catch (error) {
      console.error('Error loading public project:', error);
      throw error;
    }
  }, []);

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
      setProjectsLoaded(false);
      setCurrentProjectState(null);
      setVersions([]);
      setVersionsLoading(false);
    }
  }, [user, loadProjects]);

  // Load versions when current project changes
  useEffect(() => {
    if (currentProject) {
      loadVersions(currentProject.id);
    } else {
      setVersions([]);
      setVersionsLoading(false);
    }
  }, [currentProject, loadVersions]);

  // Update ref when currentProject changes
  useEffect(() => {
    currentProjectRef.current = currentProject;
    console.log('🎯 useProjectPersistence: currentProject changed:', currentProject);
    console.log('🎯 useProjectPersistence: ref updated to:', currentProjectRef.current);
  }, [currentProject]);

  // Remember the active project per user so a refresh or reopen returns to the
  // same project instead of silently falling back to the most recently updated.
  useEffect(() => {
    if (!user || isAnonymous || !currentProject) return;
    localStorage.setItem(`component-canvas:active-project:${user.id}`, currentProject.id);
  }, [user, isAnonymous, currentProject]);

  return {
    // State
    currentProject,
    projects,
    versions,
    loading,
    projectsLoaded,
    versionsLoading,
    autoSaveEnabled,

    // Actions
    setCurrentProject: (project: Project | null) => {
      console.log('🔧 setCurrentProject called with:', project);
      setCurrentProjectState(project);
    },
    selectProject,
    setAutoSaveEnabled,
    createProject,
    updateProject,
    saveVersion,
    autoSave,
    loadVersion,
    deleteVersion,
    loadProjects,
    loadVersions,
    toggleProjectPublic,
    getPublicProject
  };
};