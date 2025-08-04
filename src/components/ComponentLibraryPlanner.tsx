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
import { StepByStepLayoutControls } from './StepByStepLayoutControls';
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
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showStepControls, setShowStepControls] = useState(false);
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
    const rowSpacing = 150; // Vertical spacing between levels
    const nodeWidth = 200; // Width allocated per node
    const baseY = 100; // Starting Y position
    const subtreeSpacing = 50; // Extra spacing between subtrees
    
    setNodes((nds) => {
      const nodeMap = new Map(nds.map(node => [node.id, node]));
      const children = new Map<string, string[]>();
      const parents = new Map<string, string[]>();
      
      // Build parent-child relationships from edges
      edges.forEach(edge => {
        if (!children.has(edge.source)) {
          children.set(edge.source, []);
        }
        children.get(edge.source)!.push(edge.target);
        
        if (!parents.has(edge.target)) {
          parents.set(edge.target, []);
        }
        parents.get(edge.target)!.push(edge.source);
      });
      
      // Find root nodes (nodes with no parents)
      const rootNodes = nds.filter(node => 
        !edges.some(edge => edge.target === node.id)
      );
      if (rootNodes.length === 0) return nds;
      
      // Calculate subtree widths (bottom-up) - this is key for family tree layout
      const subtreeWidths = new Map<string, number>();
      const visited = new Set<string>();
      
      const calculateSubtreeWidth = (nodeId: string): number => {
        if (visited.has(nodeId)) return subtreeWidths.get(nodeId) || nodeWidth;
        visited.add(nodeId);
        
        const nodeChildren = children.get(nodeId) || [];
        if (nodeChildren.length === 0) {
          // Leaf node - only needs its own width
          subtreeWidths.set(nodeId, nodeWidth);
          return nodeWidth;
        }
        
        // Sum of children's subtree widths
        const childrenWidth = nodeChildren.reduce((sum, childId) => {
          return sum + calculateSubtreeWidth(childId);
        }, 0);
        
        // Node needs at least its children's combined width, minimum its own width
        const width = Math.max(nodeWidth, childrenWidth);
        subtreeWidths.set(nodeId, width);
        return width;
      };
      
      // Calculate subtree widths for all nodes
      nds.forEach(node => calculateSubtreeWidth(node.id));
      
      // Calculate levels for positioning
      const levels = new Map<string, number>();
      const levelVisited = new Set<string>();
      
      const calculateLevel = (nodeId: string, level: number) => {
        if (levelVisited.has(nodeId)) return;
        levelVisited.add(nodeId);
        levels.set(nodeId, level);
        
        const nodeChildren = children.get(nodeId) || [];
        nodeChildren.forEach(childId => {
          calculateLevel(childId, level + 1);
        });
      };
      
      rootNodes.forEach(root => calculateLevel(root.id, 0));
      
      // Position nodes using family tree algorithm with connection-weighted centering
      const layoutPositions = new Map<string, { x: number; y: number }>();
      
      // Allocate horizontal space (top-down)
      const positionSubtree = (nodeId: string, centerX: number, level: number) => {
        const y = baseY + (level * rowSpacing);
        const nodeChildren = children.get(nodeId) || [];
        
        if (nodeChildren.length === 0) {
          // Leaf node - just position it
          layoutPositions.set(nodeId, { x: centerX, y });
          return;
        }
        
        // Distribute children within allocated space
        const totalChildrenWidth = nodeChildren.reduce((sum, childId) => {
          return sum + (subtreeWidths.get(childId) || nodeWidth);
        }, 0);
        
        let currentX = centerX - totalChildrenWidth / 2;
        const childPositions: { id: string; x: number; parentCount: number }[] = [];
        
        // Position children and collect their info
        nodeChildren.forEach(childId => {
          const childWidth = subtreeWidths.get(childId) || nodeWidth;
          const childCenterX = currentX + childWidth / 2;
          
          positionSubtree(childId, childCenterX, level + 1);
          
          // Count total parents for this child
          const childParents = parents.get(childId) || [];
          childPositions.push({ 
            id: childId, 
            x: childCenterX, 
            parentCount: childParents.length 
          });
          
          currentX += childWidth;
        });
        
        // Find the optimal parent position based on children with most connections
        let bestCenterX = centerX;
        if (childPositions.length > 0) {
          // Find children with the maximum number of parent connections
          const maxParents = Math.max(...childPositions.map(c => c.parentCount));
          const priorityChildren = childPositions.filter(c => c.parentCount === maxParents);
          
          if (priorityChildren.length > 0 && maxParents > 1) {
            // Center over the priority children
            const minPriorityX = Math.min(...priorityChildren.map(c => c.x));
            const maxPriorityX = Math.max(...priorityChildren.map(c => c.x));
            bestCenterX = (minPriorityX + maxPriorityX) / 2;
          }
        }
        
        // Position current node
        layoutPositions.set(nodeId, { x: bestCenterX, y });
      };
      
      // Position each root and its subtree
      if (rootNodes.length === 1) {
        positionSubtree(rootNodes[0].id, 0, 0);
      } else {
        // Multiple roots - distribute them with even spacing
        const totalRootsWidth = rootNodes.reduce((sum, root) => {
          return sum + (subtreeWidths.get(root.id) || nodeWidth);
        }, 0);
        
        // Add spacing between subtrees
        const totalSpacing = (rootNodes.length - 1) * subtreeSpacing;
        const totalWidth = totalRootsWidth + totalSpacing;
        
        let currentX = -totalWidth / 2;
        rootNodes.forEach((root, index) => {
          const rootWidth = subtreeWidths.get(root.id) || nodeWidth;
          const rootCenterX = currentX + rootWidth / 2;
          
          positionSubtree(root.id, rootCenterX, 0);
          currentX += rootWidth;
          
          // Add spacing between subtrees (except after the last one)
          if (index < rootNodes.length - 1) {
            currentX += subtreeSpacing;
          }
        });
      }
      
      // Apply positions
      return nds.map(node => {
        const newPos = layoutPositions.get(node.id);
        if (newPos) {
          return {
            ...node,
            position: newPos,
          };
        }
        return node;
      });
    });
  }, [edges, setNodes]);

  // Step-by-step layout functions
  const executeLayoutStep = useCallback((stepId: string) => {
    const rowSpacing = 250;
    const nodeWidth = 150;
    
    setNodes((nds) => {
      // Build hierarchy first for all steps
      const nodeMap = new Map(nds.map(node => [node.id, node]));
      const children = new Map<string, string[]>();
      const parents = new Map<string, string>();
      
      edges.forEach(edge => {
        if (!children.has(edge.source)) {
          children.set(edge.source, []);
        }
        children.get(edge.source)!.push(edge.target);
        parents.set(edge.target, edge.source);
      });
      
      const rootNodes = nds.filter(node => !parents.has(node.id));
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
        const nodeChildren = children.get(nodeId) || [];
        nodeChildren.forEach(childId => calculateLevel(childId, level + 1));
      };
      
      rootNodes.forEach(node => calculateLevel(node.id, 0));
      nds.forEach(node => {
        if (!nodeLevels.has(node.id)) {
          calculateLevel(node.id, 0);
        }
      });
      
      const baseY = 100;
      
      switch (stepId) {
        case 'hierarchy-rows':
          // Step 1: Only set Y positions by hierarchy level (keep current X positions)
          return nds.map(node => {
            const level = nodeLevels.get(node.id) || 0;
            return {
              ...node,
              position: { 
                x: node.position.x, // Keep current X
                y: baseY + (level * rowSpacing) 
              }
            };
          });
          
        case 'proximity-order':
          // Step 2: Group siblings horizontally (build on step 1's Y positions)
          const proximityPositions = new Map<string, { x: number; y: number }>();
          
          for (let level = 0; level <= Math.max(...Array.from(levelNodes.keys())); level++) {
            const nodesAtLevel = levelNodes.get(level) || [];
            const y = baseY + (level * rowSpacing); // Use consistent Y from step 1
            
            // Group by parent
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
            
            let currentX = 0;
            
            // Position orphan nodes first
            orphanNodes.forEach((node, index) => {
              proximityPositions.set(node.id, { x: currentX + (index * 200), y });
            });
            currentX += orphanNodes.length * 200 + 100;
            
            // Position sibling groups
            Array.from(siblingGroups.entries()).forEach(([parentId, groupNodes]) => {
              groupNodes.forEach((node, index) => {
                proximityPositions.set(node.id, { x: currentX + (index * 200), y });
              });
              currentX += groupNodes.length * 200 + 100;
            });
          }
          
          return nds.map(node => {
            const newPos = proximityPositions.get(node.id);
            return newPos ? { ...node, position: { x: newPos.x, y: newPos.y } } : node;
          });
          
        case 'center-parents-safe':
          // Step 3: Center parents over children while preventing nodes from getting too close
          const safePositions = new Map<string, { x: number; y: number }>();
          const minNodeDistance = 180; // Minimum distance between nodes
          
          // First, set all current positions
          nds.forEach(node => {
            safePositions.set(node.id, { x: node.position.x, y: node.position.y });
          });
          
          // Process from bottom to top
          for (let level = Math.max(...Array.from(levelNodes.keys())); level >= 0; level--) {
            const nodesAtLevel = levelNodes.get(level) || [];
            
            nodesAtLevel.forEach(node => {
              const nodeChildren = children.get(node.id) || [];
              if (nodeChildren.length > 0) {
                const childPositions = nodeChildren
                  .map(childId => safePositions.get(childId))
                  .filter(pos => pos !== undefined) as { x: number; y: number }[];
                
                if (childPositions.length > 0) {
                  const minChildX = Math.min(...childPositions.map(pos => pos.x));
                  const maxChildX = Math.max(...childPositions.map(pos => pos.x));
                  const centerX = (minChildX + maxChildX) / 2;
                  
                  const currentPos = safePositions.get(node.id);
                  if (currentPos) {
                    let adjustedX = centerX;
                    
                    // Check for conflicts with ALL other nodes (not just same level)
                    const allOtherNodes = Array.from(safePositions.entries())
                      .filter(([id]) => id !== node.id)
                      .map(([id, pos]) => pos);
                    
                    // Ensure minimum distance from other nodes
                    let conflicts = true;
                    let iterations = 0;
                    const maxIterations = 20;
                    
                    while (conflicts && iterations < maxIterations) {
                      conflicts = false;
                      iterations++;
                      
                      for (const otherPos of allOtherNodes) {
                        const horizontalDistance = Math.abs(adjustedX - otherPos.x);
                        const verticalDistance = Math.abs(currentPos.y - otherPos.y);
                        
                        // Only check for conflicts if nodes are close vertically (within 2 levels)
                        if (verticalDistance < 200 && horizontalDistance < minNodeDistance) {
                          // Only move away (spread apart), never closer
                          if (adjustedX >= otherPos.x) {
                            adjustedX = otherPos.x + minNodeDistance;
                          } else {
                            adjustedX = otherPos.x - minNodeDistance;
                          }
                          conflicts = true;
                        }
                      }
                    }
                    
                    safePositions.set(node.id, { x: adjustedX, y: currentPos.y });
                  }
                }
              }
            });
          }
          
          return nds.map(node => {
            const newPos = safePositions.get(node.id);
            return newPos ? { ...node, position: { x: newPos.x, y: newPos.y } } : node;
          });
          
        default:
          return nds;
      }
    });
    
    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }, [edges, setNodes]);

  const resetLayoutSteps = useCallback(() => {
    setCompletedSteps(new Set());
  }, []);

  const randomizeLayout = useCallback(() => {
    setNodes((nds) => {
      // Define the area bounds for randomization
      const bounds = {
        minX: -500,
        maxX: 1500,
        minY: 50,
        maxY: 800
      };
      
      return nds.map(node => ({
        ...node,
        position: {
          x: Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
          y: Math.random() * (bounds.maxY - bounds.minY) + bounds.minY
        }
      }));
    });
    
    // Reset completed steps since positions are now random
    setCompletedSteps(new Set());
  }, [setNodes]);

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
           onToggleStepControls={() => setShowStepControls(!showStepControls)}
           showStepControls={showStepControls}
         />
         
         {/* Step-by-step layout controls */}
         {showStepControls && (
           <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
              <StepByStepLayoutControls
                onExecuteStep={executeLayoutStep}
                completedSteps={completedSteps}
                onReset={resetLayoutSteps}
                onRandomize={randomizeLayout}
              />
           </div>
         )}
      </div>
    </ReactFlowProvider>
  );
};