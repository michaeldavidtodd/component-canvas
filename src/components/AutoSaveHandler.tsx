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
    console.log('🤖 AutoSave effect triggered:', { 
      currentProject: !!currentProject, 
      autoSaveEnabled, 
      isInitialized,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      hasInitializedRef: hasInitializedRef.current
    });

    if (!currentProject || !autoSaveEnabled) {
      console.log('🚫 AutoSave skipped: missing project or disabled');
      return;
    }

    // Don't auto-save if not fully initialized yet
    if (!isInitialized) {
      console.log('🚫 AutoSave skipped: not initialized');
      return;
    }

    // Don't auto-save on first initialization after loading
    if (!hasInitializedRef.current) {
      console.log('📝 AutoSave: First initialization, setting baseline');
      hasInitializedRef.current = true;
      previousStateRef.current = { nodes, edges };
      return;
    }

    // Check if there are actual changes
    const currentState = { nodes, edges };
    const hasChanges = !previousStateRef.current || 
      JSON.stringify(previousStateRef.current.nodes) !== JSON.stringify(nodes) ||
      JSON.stringify(previousStateRef.current.edges) !== JSON.stringify(edges);

    if (!hasChanges) {
      console.log('🚫 AutoSave skipped: no changes detected');
      return;
    }

    console.log('⏰ AutoSave: Changes detected, setting timeout...');

    const timeoutId = setTimeout(() => {
      console.log('💾 AutoSave: Executing auto-save');
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