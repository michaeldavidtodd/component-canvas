import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/project-context';
import { initialNodes, initialEdges } from '@/lib/initial-elements';

interface ProjectManagerProps {
  onProjectLoaded: (nodes: Node[], edges: Edge[]) => void;
  onInitialized: (initialized: boolean) => void;
}

export const ProjectManager = ({ onProjectLoaded, onInitialized }: ProjectManagerProps) => {
  const { user, isAnonymous, loading } = useAuth();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    projects,
    versions,
    projectsLoaded,
    versionsLoading,
    selectProject,
    createProject,
    saveVersion,
  } = useProject();
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);
  // Only load canvas data when the active project changes, not every time a
  // version is saved (which would reset undo history on each save).
  const loadedProjectIdRef = useRef<string | null>(null);

  // Reset initialization when user or projects change
  useEffect(() => {
    if (user && !isAnonymous && !loading) {
      console.log('🔄 ProjectManager: Resetting initialization state');
      setIsInitialized(false);
      initializingRef.current = false;
    }
  }, [user, isAnonymous, loading]); // Reset when user changes

  // Step 1: Initialize project when user is ready AND projects are loaded
  useEffect(() => {
    console.log('🔄 ProjectManager: Effect triggered', {
      user: !!user,
      isAnonymous,
      loading,
      isInitialized,
      initializingRef: initializingRef.current,
      projectsLoaded,
      projectsCount: projects.length
    });

    if (!user || isAnonymous || loading || isInitialized || initializingRef.current) {
      console.log('🚫 ProjectManager: Early return');
      return;
    }
    
    // Wait for the initial project load to complete
    if (!projectsLoaded) {
      console.log('🚫 ProjectManager: Projects not loaded yet');
      return;
    }

    console.log('🚀 ProjectManager: Initializing with', projects.length, 'projects');
    initializingRef.current = true;

    const initializeProject = async () => {
      if (projects.length > 0) {
        // Prefer the project in the URL, then the last opened project, then the
        // most recently updated one.
        const storedProjectId = user
          ? localStorage.getItem(`component-canvas:active-project:${user.id}`)
          : null;
        const routeProject = routeProjectId
          ? projects.find((project) => project.id === routeProjectId)
          : null;
        const storedProject = storedProjectId
          ? projects.find((project) => project.id === storedProjectId)
          : null;
        const project = routeProject ?? storedProject ?? projects[0];

        console.log('📁 Using existing project:', project.name, 'ID:', project.id);
        await selectProject(project);
      } else {
        // Create new project
        console.log('🆕 Creating new project');
        const project = await createProject('My Component Library', 'A visual library of design components');
        if (project) {
          await saveVersion(project.id, initialNodes, initialEdges, undefined, 'Initial version', false);
        }
      }
      setIsInitialized(true);
      onInitialized(true);
    };

    initializeProject();
  }, [user, isAnonymous, loading, isInitialized, projects, projectsLoaded, routeProjectId, selectProject, createProject, saveVersion, onInitialized]);

  // Keep the URL in sync with the active project so refreshes and deep links
  // reopen the same project.
  const currentProjectId = currentProject?.id;
  useEffect(() => {
    if (!currentProjectId || routeProjectId === currentProjectId) return;
    navigate(`/app/${currentProjectId}`, { replace: true });
  }, [currentProjectId, routeProjectId, navigate]);

  // Follow deep links and back/forward navigation to a different project.
  useEffect(() => {
    if (!isInitialized || !projectsLoaded || !routeProjectId) return;
    if (routeProjectId === currentProjectId) return;

    const project = projects.find((candidate) => candidate.id === routeProjectId);
    if (project) {
      void selectProject(project);
    }
  }, [isInitialized, projectsLoaded, routeProjectId, currentProjectId, projects, selectProject]);

  // Step 2: Load canvas data when versions change. Wait for the version fetch
  // to finish so switching projects doesn't briefly render the default canvas.
  useEffect(() => {
    if (!currentProject || !isInitialized || versionsLoading) return;
    if (loadedProjectIdRef.current === currentProject.id) return;

    loadedProjectIdRef.current = currentProject.id;

    if (versions.length > 0) {
      const latestVersion = versions[0];
      console.log('🎯 Loading version:', latestVersion.name || 'Auto-save');
      onProjectLoaded(latestVersion.nodes, latestVersion.edges);
    } else {
      console.log('🎯 Loading default nodes');
      onProjectLoaded(initialNodes, initialEdges);
    }
  }, [versions, versionsLoading, currentProject, isInitialized, onProjectLoaded]);

  // Step 3: Handle anonymous users
  useEffect(() => {
    if ((isAnonymous || !user) && !loading && !isInitialized) {
      console.log('👤 Anonymous user - using defaults');
      onProjectLoaded(initialNodes, initialEdges);
      setIsInitialized(true);
      onInitialized(true);
    }
  }, [user, isAnonymous, loading, isInitialized, onProjectLoaded, onInitialized]);

  return null; // This component only manages logic, no UI
};