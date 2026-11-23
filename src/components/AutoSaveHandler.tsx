import { useEffect, useRef } from 'react';
import { useReactFlow, Node, Edge, Viewport } from '@xyflow/react';
import type { Project } from '@/types/project';
import { serializeDocument } from '@/lib/documentSnapshot';

interface AutoSaveHandlerProps {
  currentProject: Project;
  autoSaveEnabled: boolean;
  isInitialized: boolean;
  nodes: Node[];
  edges: Edge[];
  onAutoSave: (projectId: string, nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
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
  // Content-only fingerprint of the last state we saved (or baselined).
  const previousSnapshotRef = useRef<string | null>(null);
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

    // Compare content only: selection, drag state, and measured sizes are
    // ignored so interacting with the canvas doesn't create empty versions.
    const snapshot = serializeDocument(nodes, edges);

    // Don't auto-save on first initialization after loading
    if (!hasInitializedRef.current) {
      console.log('📝 AutoSave: First initialization, setting baseline');
      hasInitializedRef.current = true;
      previousSnapshotRef.current = snapshot;
      return;
    }

    if (previousSnapshotRef.current === snapshot) {
      console.log('🚫 AutoSave skipped: no changes detected');
      return;
    }

    console.log('⏰ AutoSave: Changes detected, setting timeout...');

    const timeoutId = setTimeout(() => {
      console.log('💾 AutoSave: Executing auto-save');
      try {
        const viewport = getViewport();
        onAutoSave(currentProject.id, nodes, edges, viewport);
        previousSnapshotRef.current = snapshot;
      } catch (error) {
        // Fallback if viewport is not available
        console.warn('Viewport not available for auto-save, saving without viewport');
        onAutoSave(currentProject.id, nodes, edges, undefined);
        previousSnapshotRef.current = snapshot;
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, currentProject, autoSaveEnabled, onAutoSave, getViewport, isInitialized]);

  // Reset when project changes
  useEffect(() => {
    hasInitializedRef.current = false;
    previousSnapshotRef.current = null;
  }, [currentProject?.id]);

  // This component doesn't render anything, it just handles the auto-save logic
  return null;
};
