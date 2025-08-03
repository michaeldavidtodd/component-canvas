import { useEffect, useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { initialNodes, initialEdges } from '@/lib/initial-elements';

interface ProjectManagerProps {
  onProjectLoaded: (nodes: Node[], edges: Edge[]) => void;
  onInitialized: (initialized: boolean) => void;
}

export const ProjectManager = ({ onProjectLoaded, onInitialized }: ProjectManagerProps) => {
  const { user, isAnonymous, loading } = useAuth();
  const { 
    currentProject, 
    projects, 
    versions, 
    setCurrentProject, 
    createProject, 
    saveVersion, 
    loadVersions 
  } = useProjectPersistence();
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);

  // Wait for projects to be loaded from the database
  const projectsLoaded = useRef(false);

  // Step 1: Initialize project when user is ready AND projects are loaded
  useEffect(() => {
    if (!user || isAnonymous || loading || isInitialized || initializingRef.current) return;
    
    // Wait for the initial project load to complete
    if (!projectsLoaded.current) return;

    console.log('🚀 ProjectManager: Initializing with', projects.length, 'projects');
    initializingRef.current = true;

    const initializeProject = async () => {
      if (projects.length > 0) {
        // Use existing project
        const project = projects[0];
        console.log('📁 Using existing project:', project.name);
        setCurrentProject(project);
        await loadVersions(project.id);
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
  }, [user, isAnonymous, loading, isInitialized, projectsLoaded.current]);

  // Track when projects have been loaded
  useEffect(() => {
    if (!loading && user && !isAnonymous) {
      // Set a small delay to allow projects to load
      const timer = setTimeout(() => {
        projectsLoaded.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isAnonymous, loading]);

  // Step 2: Load canvas data when versions change
  useEffect(() => {
    if (!currentProject || !isInitialized) return;

    if (versions.length > 0) {
      const latestVersion = versions[0];
      console.log('🎯 Loading version:', latestVersion.name || 'Auto-save');
      onProjectLoaded(latestVersion.nodes as any, latestVersion.edges as any);
    } else {
      console.log('🎯 Loading default nodes');
      onProjectLoaded(initialNodes, initialEdges);
    }
  }, [versions, currentProject, isInitialized, onProjectLoaded]);

  // Step 3: Handle anonymous users
  useEffect(() => {
    if ((isAnonymous || !user) && !loading && !isInitialized) {
      console.log('👤 Anonymous user - using defaults');
      onProjectLoaded(initialNodes, initialEdges);
      setIsInitialized(true);
      onInitialized(true);
    }
  }, [user, isAnonymous, loading, isInitialized, onProjectLoaded]);

  return null; // This component only manages logic, no UI
};