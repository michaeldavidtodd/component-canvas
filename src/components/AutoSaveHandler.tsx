import { useEffect, useRef } from 'react';
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
  const previousStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const hasInitializedRef = useRef(false);

  // Auto-save functionality
  useEffect(() => {
    if (!currentProject || !isInitialized || !autoSaveEnabled) return;

    // Don't auto-save on first initialization
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      previousStateRef.current = { nodes, edges };
      return;
    }

    // Check if there are actual changes
    const currentState = { nodes, edges };
    const hasChanges = !previousStateRef.current || 
      JSON.stringify(previousStateRef.current.nodes) !== JSON.stringify(nodes) ||
      JSON.stringify(previousStateRef.current.edges) !== JSON.stringify(edges);

    if (!hasChanges) return;

    const timeoutId = setTimeout(() => {
      try {
        const viewport = getViewport();
        onAutoSave(currentProject.id, nodes, edges, viewport);
        previousStateRef.current = { nodes, edges };
      } catch (error) {
        // Fallback if viewport is not available
        console.warn('Viewport not available for auto-save, saving without viewport');
        onAutoSave(currentProject.id, nodes, edges, undefined);
        previousStateRef.current = { nodes, edges };
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, currentProject, autoSaveEnabled, onAutoSave, getViewport, isInitialized]);

  // Reset when project changes
  useEffect(() => {
    hasInitializedRef.current = false;
    previousStateRef.current = null;
  }, [currentProject?.id]);

  // This component doesn't render anything, it just handles the auto-save logic
  return null;
};