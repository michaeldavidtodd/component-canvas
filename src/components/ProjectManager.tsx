import { useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { initialNodes, initialEdges } from '@/lib/initial-elements';

interface ProjectManagerProps {
  onProjectLoaded: (nodes: Node[], edges: Edge[]) => void;
}

export const ProjectManager = ({ onProjectLoaded }: ProjectManagerProps) => {
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

  // Step 1: Initialize project when user is ready
  useEffect(() => {
    if (!user || isAnonymous || loading || isInitialized) return;

    console.log('🚀 ProjectManager: Initializing with', projects.length, 'projects');

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
    };

    initializeProject();
  }, [user, isAnonymous, loading, isInitialized]); // Removed 'projects' from dependencies to prevent re-runs

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
    }
  }, [user, isAnonymous, loading, isInitialized, onProjectLoaded]);

  return null; // This component only manages logic, no UI
};