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
    const maxIterations = 5; // Maximum iterations to prevent infinite loops
    
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

      // Function to get all descendants of a node
      const getAllDescendants = (nodeId: string): string[] => {
        const descendants: string[] = [];
        const nodeChildren = children.get(nodeId) || [];
        
        nodeChildren.forEach(childId => {
          descendants.push(childId);
          descendants.push(...getAllDescendants(childId));
        });
        
        return descendants;
      };

      // Function to calculate subtree width (total width needed for all descendants)
      const calculateSubtreeWidth = (nodeId: string): number => {
        const descendants = getAllDescendants(nodeId);
        if (descendants.length === 0) return 0;
        
        // Group descendants by level
        const descendantsByLevel = new Map<number, string[]>();
        descendants.forEach(descendantId => {
          const level = nodeLevels.get(descendantId);
          if (level !== undefined) {
            if (!descendantsByLevel.has(level)) {
              descendantsByLevel.set(level, []);
            }
            descendantsByLevel.get(level)!.push(descendantId);
          }
        });
        
        // Find the widest level
        let maxWidth = 0;
        descendantsByLevel.forEach(levelDescendants => {
          const width = Math.max(0, (levelDescendants.length - 1) * nodeSpacing);
          maxWidth = Math.max(maxWidth, width);
        });
        
        return maxWidth;
      };

      // Function to check if two line segments intersect
      const linesIntersect = (line1: { x1: number; y1: number; x2: number; y2: number }, 
                             line2: { x1: number; y1: number; x2: number; y2: number }): boolean => {
        const { x1: x1a, y1: y1a, x2: x2a, y2: y2a } = line1;
        const { x1: x1b, y1: y1b, x2: x2b, y2: y2b } = line2;
        
        const denom = (x1a - x2a) * (y1b - y2b) - (y1a - y2a) * (x1b - x2b);
        if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
        
        const t = ((x1a - x1b) * (y1b - y2b) - (y1a - y1b) * (x1b - x2b)) / denom;
        const u = -((x1a - x2a) * (y1a - y1b) - (y1a - y2a) * (x1a - x1b)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
      };

      // Function to detect connection line conflicts
      const detectLineConflicts = (positions: Map<string, { x: number; y: number }>): boolean => {
        const connectionLines: Array<{ x1: number; y1: number; x2: number; y2: number; edge: any }> = [];
        
        // Build connection lines based on current positions
        edges.forEach(edge => {
          const sourcePos = positions.get(edge.source);
          const targetPos = positions.get(edge.target);
          
          if (sourcePos && targetPos) {
            connectionLines.push({
              x1: sourcePos.x,
              y1: sourcePos.y,
              x2: targetPos.x,
              y2: targetPos.y,
              edge
            });
          }
        });
        
        // Check for intersections between connection lines
        for (let i = 0; i < connectionLines.length; i++) {
          for (let j = i + 1; j < connectionLines.length; j++) {
            const line1 = connectionLines[i];
            const line2 = connectionLines[j];
            
            // Skip if lines share a common node
            if (line1.edge.source === line2.edge.source || 
                line1.edge.source === line2.edge.target ||
                line1.edge.target === line2.edge.source || 
                line1.edge.target === line2.edge.target) {
              continue;
            }
            
            // Check if lines are close enough to cause visual conflict
            const minDistance = 30; // Minimum distance between parallel lines
            const midY1 = (line1.y1 + line1.y2) / 2;
            const midY2 = (line2.y1 + line2.y2) / 2;
            
            // For lines at similar Y levels, check horizontal overlap
            if (Math.abs(midY1 - midY2) < rowSpacing * 0.3) {
              const line1MinX = Math.min(line1.x1, line1.x2);
              const line1MaxX = Math.max(line1.x1, line1.x2);
              const line2MinX = Math.min(line2.x1, line2.x2);
              const line2MaxX = Math.max(line2.x1, line2.x2);
              
              // Check for horizontal overlap
              if (!(line1MaxX < line2MinX - minDistance || line2MaxX < line1MinX - minDistance)) {
                return true; // Conflict detected
              }
            }
            
            // Also check for actual line intersections
            if (linesIntersect(line1, line2)) {
              return true;
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
        
        // Position nodes level by level
        const updatedNodes = new Map<string, { x: number; y: number }>();
        const maxLevel = Math.max(...Array.from(levelNodes.keys()));
        
        // First, position root nodes with proper spacing for their subtrees
        const rootNodesAtLevel0 = levelNodes.get(0) || [];
        if (rootNodesAtLevel0.length > 0) {
          const y = baseY;
          
          // Calculate spacing needed for each root node based on its subtree width
          const rootSpacings = rootNodesAtLevel0.map(rootNode => {
            const subtreeWidth = calculateSubtreeWidth(rootNode.id);
            return Math.max(subtreeWidth + siblingSpacing, siblingSpacing);
          });
          
          // Calculate total width and position root nodes
          const totalWidth = rootSpacings.reduce((sum, spacing) => sum + spacing, 0) - siblingSpacing;
          let currentX = -totalWidth / 2;
          
          rootNodesAtLevel0.forEach((rootNode, index) => {
            const centerX = currentX + rootSpacings[index] / 2;
            updatedNodes.set(rootNode.id, { x: centerX, y });
            currentX += rootSpacings[index];
          });
        }
        
        // Then position nodes at other levels, centering them under their root ancestors
        for (let level = 1; level <= maxLevel; level++) {
          const nodesAtLevel = levelNodes.get(level) || [];
          if (nodesAtLevel.length === 0) continue;
          
          const y = baseY + (level * rowSpacing);
          
          // Group nodes by their root ancestor
          const nodesByRoot = new Map<string, typeof nds>();
          
          nodesAtLevel.forEach(node => {
            // Find the root ancestor
            let currentId = node.id;
            while (parents.has(currentId)) {
              currentId = parents.get(currentId)!;
            }
            
            if (!nodesByRoot.has(currentId)) {
              nodesByRoot.set(currentId, []);
            }
            nodesByRoot.get(currentId)!.push(node);
          });
          
          // Position each group under its root
          nodesByRoot.forEach((groupNodes, rootId) => {
            const rootPos = updatedNodes.get(rootId);
            if (!rootPos) return;
            
            // Group by immediate parent within this root subtree
            const siblingGroups = new Map<string, typeof nds>();
            
            groupNodes.forEach(node => {
              const parentId = parents.get(node.id);
              if (parentId) {
                if (!siblingGroups.has(parentId)) {
                  siblingGroups.set(parentId, []);
                }
                siblingGroups.get(parentId)!.push(node);
              }
            });
            
            // Calculate total width needed for all sibling groups
            const groups = Array.from(siblingGroups.values());
            let totalGroupWidth = 0;
            groups.forEach(group => {
              const groupWidth = Math.max(0, (group.length - 1) * nodeSpacing);
              totalGroupWidth += groupWidth;
              if (totalGroupWidth > 0) totalGroupWidth += siblingSpacing;
            });
            totalGroupWidth = Math.max(totalGroupWidth - siblingSpacing, 0);
            
            // Center all groups under the root
            let currentX = rootPos.x - totalGroupWidth / 2;
            
            Array.from(siblingGroups.entries()).forEach(([parentId, groupNodes]) => {
              const parentPos = updatedNodes.get(parentId);
              const groupWidth = Math.max(0, (groupNodes.length - 1) * nodeSpacing);
              
              // Try to center under parent, but maintain overall centering under root
              let groupStartX = currentX;
              if (parentPos && groupNodes.length === 1) {
                // Single node can be centered exactly under parent
                groupStartX = parentPos.x;
              } else if (parentPos) {
                // Multiple nodes: try to center under parent but respect flow
                const idealCenterX = parentPos.x;
                const actualCenterX = currentX + groupWidth / 2;
                const offset = idealCenterX - actualCenterX;
                groupStartX = Math.max(currentX, currentX + offset);
              }
              
              // Position individual nodes
              groupNodes.forEach((node, nodeIndex) => {
                const nodeX = groupStartX + (nodeIndex * nodeSpacing);
                updatedNodes.set(node.id, { x: nodeX, y });
              });
              
              currentX = groupStartX + groupWidth + siblingSpacing;
            });
          });
        }
        
        // Check for connection line conflicts
        hasConflicts = detectLineConflicts(updatedNodes);
        
        if (hasConflicts && iteration < maxIterations) {
          // Increase spacing for next iteration
          siblingSpacing += 50;
        } else {
          // Apply final positions to nodes
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
      
      // Fallback return (should not reach here)
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