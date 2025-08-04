import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Background,
  Controls,
  MiniMap,
  Node,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ComponentNode } from './nodes/ComponentNode';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { ConnectionLegend } from './ConnectionLegend';
import { VersionHistory } from './VersionHistory';
import { AutoSaveHandler } from './AutoSaveHandler';
import { ProjectManager } from './ProjectManager';
import { initialNodes, initialEdges } from '@/lib/initial-elements';
import { ComponentNodeData, ComponentType } from '@/types/component';
import { useAuth } from '@/hooks/useAuth';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { Button } from '@/components/ui/button';
import { User, LogOut, Save, History, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  component: ComponentNode,
};

export const ComponentLibraryPlanner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isProjectInitialized, setIsProjectInitialized] = useState(false);
  const { user, isAnonymous, signOut } = useAuth();
  const navigate = useNavigate();
  
  const {
    currentProject,
    projects,
    versions,
    loading,
    autoSaveEnabled,
    setCurrentProject,
    setAutoSaveEnabled,
    saveVersion,
    autoSave,
    loadVersion,
  } = useProjectPersistence();

  // Force set currentProject if we have projects but no currentProject
  useEffect(() => {
    if (!currentProject && projects.length > 0 && user && !isAnonymous) {
      console.log('🔧 ComponentLibraryPlanner: Force setting currentProject to:', projects[0]);
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, user, isAnonymous, setCurrentProject]);

  // Debug logging
  console.log('🔍 ComponentLibraryPlanner state:', {
    user: !!user,
    isAnonymous,
    currentProject: !!currentProject,
    projectName: currentProject?.name,
    autoSaveEnabled,
    isProjectInitialized,
    versionsCount: versions.length
  });

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      let strokeColor = 'hsl(216 8% 45%)'; // default muted-foreground
      
      if (sourceNode && targetNode) {
        const sourceType = sourceNode.data.componentType;
        const targetType = targetNode.data.componentType;
        
        // Component to Variant connection
        if ((sourceType === 'main-component' && targetType === 'variant') || 
            (sourceType === 'variant' && targetType === 'main-component')) {
          strokeColor = 'hsl(258 100% 68%)'; // primary
        }
        // Token usage connections
        else if (sourceType === 'token' || targetType === 'token') {
          strokeColor = 'hsl(45 100% 68%)'; // component-token
        }
      }
      
      const newEdge = {
        ...params,
        type: 'smoothstep',
        style: { stroke: strokeColor }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes]
  );

  const handleNodeSelect = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const addNode = useCallback((type: ComponentType) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'component',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      selected: true,
      data: {
        label: 'New Component',
        componentType: type,
        description: '',
      },
    };
    
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setSelectedNode(newNode);
  }, [setNodes]);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<ComponentNodeData>) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
    
    // Update selected node if it's the one being modified
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, ...updates } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const smartLayout = useCallback(() => {
    const rowSpacing = 250; // Vertical spacing between levels
    let siblingSpacing = 200; // Horizontal spacing between sibling groups (will be adjusted)
    const nodeSpacing = 180; // Spacing between individual nodes
    const baseY = 100; // Starting Y position
    const maxIterations = 3; // Maximum iterations to prevent infinite loops
    
    setNodes((nds) => {
      // Build hierarchy tree based on connections
      const nodeMap = new Map(nds.map(node => [node.id, node]));
      const children = new Map<string, string[]>();
      const parents = new Map<string, string>();
      
      // Build parent-child relationships from edges
      edges.forEach(edge => {
        if (!children.has(edge.source)) {
          children.set(edge.source, []);
        }
        children.get(edge.source)!.push(edge.target);
        parents.set(edge.target, edge.source);
      });
      
      // Find root nodes (nodes with no parents)
      const rootNodes = nds.filter(node => !parents.has(node.id));
      
      // Calculate depth levels for each node
      const nodeLevels = new Map<string, number>();
      const levelNodes = new Map<number, typeof nds>();
      
      const calculateLevel = (nodeId: string, level: number = 0) => {
        if (nodeLevels.has(nodeId)) return;
        
        nodeLevels.set(nodeId, level);
        if (!levelNodes.has(level)) {
          levelNodes.set(level, []);
        }
        const node = nodeMap.get(nodeId);
        if (node) {
          levelNodes.get(level)!.push(node);
        }
        
        // Process children at next level
        const nodeChildren = children.get(nodeId) || [];
        nodeChildren.forEach(childId => calculateLevel(childId, level + 1));
      };
      
      // Start with root nodes at level 0
      rootNodes.forEach(node => calculateLevel(node.id, 0));
      
      // Handle orphaned nodes (not connected to anything)
      nds.forEach(node => {
        if (!nodeLevels.has(node.id)) {
          calculateLevel(node.id, 0);
        }
      });

      // Simple conflict detection for overlapping connection lines
      const detectLineConflicts = (positions: Map<string, { x: number; y: number }>): boolean => {
        const connectionLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        
        edges.forEach(edge => {
          const sourcePos = positions.get(edge.source);
          const targetPos = positions.get(edge.target);
          
          if (sourcePos && targetPos) {
            connectionLines.push({
              x1: sourcePos.x,
              y1: sourcePos.y,
              x2: targetPos.x,
              y2: targetPos.y
            });
          }
        });
        
        // Check for close parallel lines
        for (let i = 0; i < connectionLines.length; i++) {
          for (let j = i + 1; j < connectionLines.length; j++) {
            const line1 = connectionLines[i];
            const line2 = connectionLines[j];
            
            const line1MinX = Math.min(line1.x1, line1.x2);
            const line1MaxX = Math.max(line1.x1, line1.x2);
            const line2MinX = Math.min(line2.x1, line2.x2);
            const line2MaxX = Math.max(line2.x1, line2.x2);
            
            // Check for horizontal overlap with insufficient spacing
            if (!(line1MaxX < line2MinX - 30 || line2MaxX < line1MinX - 30)) {
              return true; // Conflict detected
            }
          }
        }
        
        return false;
      };

      // Layout positioning with conflict resolution
      let iteration = 0;
      let hasConflicts = true;
      
      while (hasConflicts && iteration < maxIterations) {
        iteration++;
        
        const updatedNodes = new Map<string, { x: number; y: number }>();
        const maxLevel = Math.max(...Array.from(levelNodes.keys()));
        
        for (let level = 0; level <= maxLevel; level++) {
          const nodesAtLevel = levelNodes.get(level) || [];
          if (nodesAtLevel.length === 0) continue;
          
          const y = baseY + (level * rowSpacing);
          
          // Group nodes by their parent for sibling grouping
          const siblingGroups = new Map<string, typeof nds>();
          const orphanNodes: typeof nds = [];
          
          nodesAtLevel.forEach(node => {
            const parentId = parents.get(node.id);
            if (parentId) {
              if (!siblingGroups.has(parentId)) {
                siblingGroups.set(parentId, []);
              }
              siblingGroups.get(parentId)!.push(node);
            } else {
              orphanNodes.push(node);
            }
          });
          
          // Position sibling groups centered under their parents
          siblingGroups.forEach((groupNodes, parentId) => {
            const parentPos = updatedNodes.get(parentId);
            if (!parentPos) return;
            
            const groupWidth = Math.max(0, (groupNodes.length - 1) * nodeSpacing);
            const groupStartX = parentPos.x - groupWidth / 2;
            
            groupNodes.forEach((node, nodeIndex) => {
              const nodeX = groupStartX + (nodeIndex * nodeSpacing);
              updatedNodes.set(node.id, { x: nodeX, y });
            });
          });
          
          // Position orphan nodes (root level)
          if (orphanNodes.length > 0) {
            const totalWidth = Math.max(0, (orphanNodes.length - 1) * siblingSpacing);
            let currentX = -totalWidth / 2;
            
            orphanNodes.forEach((node) => {
              updatedNodes.set(node.id, { x: currentX, y });
              currentX += siblingSpacing;
            });
          }
          
          // Fix overlaps within the level
          const levelNodePositions = nodesAtLevel
            .map(node => ({
              id: node.id,
              x: updatedNodes.get(node.id)?.x || 0
            }))
            .sort((a, b) => a.x - b.x);
          
          for (let i = 1; i < levelNodePositions.length; i++) {
            const prevNode = levelNodePositions[i - 1];
            const currentNode = levelNodePositions[i];
            
            if (currentNode.x - prevNode.x < nodeSpacing) {
              const shift = nodeSpacing - (currentNode.x - prevNode.x);
              for (let j = i; j < levelNodePositions.length; j++) {
                levelNodePositions[j].x += shift;
                updatedNodes.set(levelNodePositions[j].id, { 
                  x: levelNodePositions[j].x, 
                  y 
                });
              }
            }
          }
        }
        
        // Check for connection line conflicts
        hasConflicts = detectLineConflicts(updatedNodes);
        
        if (hasConflicts && iteration < maxIterations) {
          siblingSpacing += 50;
        } else {
          // Apply final positions
          return nds.map(node => {
            const newPosition = updatedNodes.get(node.id);
            if (newPosition) {
              return {
                ...node,
                position: { x: newPosition.x, y: newPosition.y }
              };
            }
            return node;
          });
        }
      }
      
      return nds;
    });
  }, [edges, setNodes]);

  const cleanupLayout = useCallback(() => {
    const gridSize = 50; // Grid snap size
    const minSpacing = 200; // Minimum spacing between nodes
    
    setNodes((nds) => {
      // Group nodes by approximate Y position (rows)
      const tolerance = 100; // Y position tolerance for same row
      const rows: { y: number; nodes: typeof nds }[] = [];
      
      nds.forEach((node) => {
        const existingRow = rows.find(row => Math.abs(row.y - node.position.y) <= tolerance);
        if (existingRow) {
          existingRow.nodes.push(node);
        } else {
          rows.push({ y: node.position.y, nodes: [node] });
        }
      });
      
      // Process each row separately
      return nds.map((node) => {
        const currentRow = rows.find(row => row.nodes.includes(node))!;
        const rowNodes = currentRow.nodes.sort((a, b) => a.position.x - b.position.x);
        const nodeIndex = rowNodes.findIndex(n => n.id === node.id);
        
        // Snap Y to grid and use row average
        const avgY = currentRow.nodes.reduce((sum, n) => sum + n.position.y, 0) / currentRow.nodes.length;
        const snappedY = Math.round(avgY / gridSize) * gridSize;
        
        // For X position, maintain order but ensure minimum spacing
        let newX = node.position.x;
        
        if (nodeIndex > 0) {
          const prevNode = rowNodes[nodeIndex - 1];
          const minX = prevNode.position.x + minSpacing;
          if (newX < minX) {
            newX = minX;
          }
        }
        
        // Snap X to grid
        newX = Math.round(newX / gridSize) * gridSize;
        
        return {
          ...node,
          position: { x: newX, y: snappedY }
        };
      });
    });
  }, [setNodes]);

  // Handle project data loading
  const handleProjectLoaded = useCallback((loadedNodes: Node[], loadedEdges: Edge[]) => {
    console.log('📋 Loading project data:', { nodesCount: loadedNodes.length, edgesCount: loadedEdges.length });
    setNodes(loadedNodes as any);
    setEdges(loadedEdges as any);
  }, [setNodes, setEdges]);


  const handleManualSave = useCallback(async () => {
    if (!currentProject) return;
    
    const versionName = `Version ${new Date().toLocaleString()}`;
    await saveVersion(currentProject.id, nodes, edges, undefined, versionName, false);
  }, [currentProject, nodes, edges, saveVersion]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <ReactFlowProvider>
      <ProjectManager 
        onProjectLoaded={handleProjectLoaded} 
        onInitialized={setIsProjectInitialized}
      />
      <div className="flex h-screen bg-canvas">
        <Toolbar 
          onAddNode={addNode}
          user={user}
          isAnonymous={isAnonymous}
          onSignOut={handleSignOut}
          onNavigateToAuth={() => navigate('/auth')}
          onSave={handleManualSave}
          onShowVersions={() => setShowVersionHistory(true)}
          currentProject={currentProject}
          autoSaveEnabled={autoSaveEnabled}
          onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
        />
        
        <VersionHistory
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
          versions={versions}
          onLoadVersion={loadVersion}
          onVersionLoaded={(version) => {
            setNodes(version.nodes as any);
            setEdges(version.edges as any);
          }}
        />
        
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => handleNodeSelect(node)}
            onPaneClick={() => handleNodeSelect(null)}
            fitView
            className="bg-canvas"
          >
            <Background className="[&>*]:!stroke-border" gap={16} />
            <Controls className="bg-workspace border border-border" />
            <MiniMap 
              className="bg-workspace border border-border"
              nodeColor={(node) => {
                const data = node.data as ComponentNodeData;
                switch (data.componentType) {
                  case 'main-component': return 'hsl(var(--component-main))';
                  case 'variant': return 'hsl(var(--component-variant))';
                  case 'sub-component': return 'hsl(var(--component-sub))';
                  case 'token': return 'hsl(var(--component-token))';
                  case 'instance': return 'hsl(var(--component-instance))';
                  default: return 'hsl(var(--muted))';
                }
              }}
            />
            
            {/* Auto-save handler that needs ReactFlow context - only for authenticated users */}
            {user && !isAnonymous && currentProject && (
              <AutoSaveHandler
                currentProject={currentProject}
                autoSaveEnabled={autoSaveEnabled}
                isInitialized={isProjectInitialized}
                nodes={nodes}
                edges={edges}
                onAutoSave={autoSave}
              />
            )}
          </ReactFlow>
          <ConnectionLegend />
        </div>

        <PropertiesPanel
          selectedNode={selectedNode}
          onUpdateNode={updateNodeData}
          onDeleteNode={deleteSelectedNode}
          onSmartLayout={smartLayout}
          onCleanupLayout={cleanupLayout}
        />
      </div>
    </ReactFlowProvider>
  );
};