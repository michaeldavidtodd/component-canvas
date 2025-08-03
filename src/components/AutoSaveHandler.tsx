import { useEffect } from 'react';
import { useReactFlow, Node, Edge } from '@xyflow/react';

interface AutoSaveHandlerProps {
  currentProject: any;
  autoSaveEnabled: boolean;
  isInitialized: boolean;
  nodes: Node[];
  edges: Edge[];
  onAutoSave: (projectId: string, nodes: Node[], edges: Edge[], viewport?: any) => void;
}

export const AutoSaveHandler = ({
  currentProject,
  autoSaveEnabled,
  isInitialized,
  nodes,
  edges,
  onAutoSave
}: AutoSaveHandlerProps) => {
  const { getViewport } = useReactFlow();

  // Auto-save functionality
  useEffect(() => {
    if (!currentProject || !isInitialized) return;

    const timeoutId = setTimeout(() => {
      if (autoSaveEnabled) {
        onAutoSave(currentProject.id, nodes, edges, getViewport());
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, currentProject, autoSaveEnabled, onAutoSave, getViewport, isInitialized]);

  // This component doesn't render anything, it just handles the auto-save logic
  return null;
};