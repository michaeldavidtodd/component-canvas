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
    const rowSpacing = 250; // Vertical spacing between levels
    let siblingSpacing = 200; // Horizontal spacing between sibling groups (will be adjusted)
    const nodeSpacing = 180; // Spacing between individual nodes
    const baseY = 100; // Starting Y position
    const maxIterations = 5; // Maximum iterations to prevent infinite loops
    const nodeWidth = 150; // Approximate node width for collision detection
    
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

      // Function to center parents over their children (bottom-to-top, left-to-right)
      const centerParentsOverChildren = (
        positions: Map<string, { x: number; y: number }>,
        allNodes: Node[],
        children: Map<string, string[]>,
        parents: Map<string, string>,
        nodeWidth: number
      ): Map<string, { x: number; y: number }> => {
        const finalPositions = new Map(positions);
        
        // Find all root nodes and process trees from left to right
        const rootNodes = allNodes
          .filter(node => !parents.has(node.id))
          .map(node => ({ id: node.id, x: finalPositions.get(node.id)?.x || 0 }))
          .sort((a, b) => a.x - b.x);
        
        // Process each tree independently from left to right
        rootNodes.forEach(root => {
          const processedNodes = new Set<string>();
          
          // Get max depth for this tree to start from bottom
          const getDepth = (nodeId: string, currentDepth = 0): number => {
            const nodeChildren = children.get(nodeId) || [];
            if (nodeChildren.length === 0) return currentDepth;
            
            return Math.max(...nodeChildren.map(childId => getDepth(childId, currentDepth + 1)));
          };
          
          const maxDepth = getDepth(root.id);
          
          // Process from bottom level to top level
          for (let depth = maxDepth; depth >= 0; depth--) {
            const nodesAtDepth = new Set<string>();
            
            // Find all nodes at this depth in this tree
            const findNodesAtDepth = (nodeId: string, currentDepth = 0) => {
              if (currentDepth === depth) {
                nodesAtDepth.add(nodeId);
              } else if (currentDepth < depth) {
                const nodeChildren = children.get(nodeId) || [];
                nodeChildren.forEach(childId => findNodesAtDepth(childId, currentDepth + 1));
              }
            };
            
            findNodesAtDepth(root.id);
            
            // For each node at this depth, center it over its children (if any)
            Array.from(nodesAtDepth).forEach(nodeId => {
              if (processedNodes.has(nodeId)) return;
              
              const nodeChildren = children.get(nodeId) || [];
              if (nodeChildren.length > 0) {
                // Calculate center position based on children
                const childPositions = nodeChildren
                  .map(childId => finalPositions.get(childId))
                  .filter(pos => pos !== undefined) as { x: number; y: number }[];
                
                if (childPositions.length > 0) {
                  const minChildX = Math.min(...childPositions.map(pos => pos.x));
                  const maxChildX = Math.max(...childPositions.map(pos => pos.x));
                  const centerX = (minChildX + maxChildX) / 2;
                  
                   const currentPos = finalPositions.get(nodeId);
                   if (currentPos) {
                     // Check for conflicts with other nodes at the same level
                     const currentY = currentPos.y;
                     const nodesAtSameLevel = Array.from(finalPositions.entries())
                       .filter(([id, pos]) => Math.abs(pos.y - currentY) < 50 && id !== nodeId)
                       .map(([id, pos]) => ({ id, x: pos.x }))
                       .sort((a, b) => a.x - b.x);
                     
                     let adjustedX = centerX;
                     
                     // Check for overlaps and adjust if necessary
                     for (const otherNode of nodesAtSameLevel) {
                       if (Math.abs(adjustedX - otherNode.x) < nodeWidth + 20) {
                         // If there's a conflict, shift right
                         if (adjustedX >= otherNode.x) {
                           adjustedX = otherNode.x + nodeWidth + 20;
                         }
                       }
                     }
                     
                     // Add debugging for the problematic nodes
                     if (nodeId.includes('Primary Button') || nodeId.includes('Secondary Button')) {
                       console.log(`Centering ${nodeId}: centerX=${centerX}, adjustedX=${adjustedX}, conflicts with:`, nodesAtSameLevel);
                     }
                     
                     finalPositions.set(nodeId, { x: adjustedX, y: currentY });
                   }
                }
              }
              
              processedNodes.add(nodeId);
            });
          }
        });
        
        return finalPositions;
      };

      // Layout positioning with conflict resolution
      let iteration = 0;
      let hasConflicts = true;
      
      while (hasConflicts && iteration < maxIterations) {
        iteration++;
        
        // Position nodes level by level
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
          
          // Collect all sibling groups and their target parent positions
          const groupsWithPositions: { nodes: typeof nds; parentX: number; parentId?: string }[] = [];
          
          // Add sibling groups based on their parent positions
          Array.from(siblingGroups.entries()).forEach(([parentId, groupNodes]) => {
            const parentPos = updatedNodes.get(parentId);
            if (parentPos) {
              groupsWithPositions.push({
                nodes: groupNodes,
                parentX: parentPos.x,
                parentId
              });
            } else {
              // Parent not positioned yet, use default
              groupsWithPositions.push({
                nodes: groupNodes,
                parentX: 0,
                parentId
              });
            }
          });
          
          // Add orphan nodes as individual groups
          orphanNodes.forEach((node, index) => {
            groupsWithPositions.push({
              nodes: [node],
              parentX: index * siblingSpacing
            });
          });
          
          // Sort groups by parent position (left to right)
          groupsWithPositions.sort((a, b) => a.parentX - b.parentX);
          
          // Calculate total width needed for all groups
          let totalGroupWidth = 0;
          groupsWithPositions.forEach(group => {
            const groupWidth = Math.max(0, (group.nodes.length - 1) * nodeSpacing);
            totalGroupWidth += groupWidth + siblingSpacing;
          });
          totalGroupWidth = Math.max(totalGroupWidth - siblingSpacing, 0); // Remove last spacing
          
          // Position each group
          let currentX = -totalGroupWidth / 2;
          
           groupsWithPositions.forEach((group, groupIndex) => {
             const groupNodes = group.nodes;
             const groupWidth = Math.max(0, (groupNodes.length - 1) * (nodeWidth + 20)); // Use actual node width + spacing
            
            // For sibling groups, center them around their parent's X position
            let groupStartX = currentX;
            if (group.parentId && group.nodes.length > 0) {
              // Center the group around the parent position
              groupStartX = group.parentX - (groupWidth / 2);
              
              // Adjust if this would cause overlap with previous groups
              if (groupIndex > 0) {
                const minX = currentX;
                groupStartX = Math.max(groupStartX, minX);
              }
            }
            
             // Position individual nodes within the group
             groupNodes.forEach((node, nodeIndex) => {
               const nodeX = groupStartX + (nodeIndex * (nodeWidth + 20)); // Use actual node width + spacing
               updatedNodes.set(node.id, { x: nodeX, y });
             });
            
            // Update currentX for next group
            currentX = groupStartX + groupWidth + siblingSpacing;
          });
          
          // Final pass: ensure no overlaps within this level
          const levelNodePositions = nodesAtLevel
            .map(node => ({
              id: node.id,
              x: updatedNodes.get(node.id)?.x || 0
            }))
            .sort((a, b) => a.x - b.x);
          
          // Adjust overlapping nodes
          for (let i = 1; i < levelNodePositions.length; i++) {
            const prevNode = levelNodePositions[i - 1];
            const currentNode = levelNodePositions[i];
            
            if (currentNode.x - prevNode.x < nodeSpacing) {
              currentNode.x = prevNode.x + nodeSpacing;
              updatedNodes.set(currentNode.id, { x: currentNode.x, y });
            }
          }
        }
        
        // Check for connection line conflicts
        hasConflicts = detectLineConflicts(updatedNodes);
        
        if (hasConflicts && iteration < maxIterations) {
          // Increase spacing for next iteration
          siblingSpacing += 50;
        } else {
          // Skip the centering pass for now to preserve sibling spacing
          // const finalNodes = centerParentsOverChildren(updatedNodes, nds, children, parents, nodeWidth);
          
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
          // Step 1: Reset to simple grid and organize into clear hierarchy rows
          const gridX = 200;
          return nds.map((node, index) => {
            const level = nodeLevels.get(node.id) || 0;
            const nodesAtLevel = levelNodes.get(level) || [];
            const indexAtLevel = nodesAtLevel.findIndex(n => n.id === node.id);
            return {
              ...node,
              position: { x: gridX * indexAtLevel, y: baseY + (level * rowSpacing) }
            };
          });
          
        case 'proximity-order':
          // Step 2: Group siblings together near their parents
          const proximityPositions = new Map<string, { x: number; y: number }>();
          
          for (let level = 0; level <= Math.max(...Array.from(levelNodes.keys())); level++) {
            const nodesAtLevel = levelNodes.get(level) || [];
            const y = baseY + (level * rowSpacing);
            
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
          
        case 'apply-spacing':
          // Step 3: Apply proper spacing between sibling nodes
          const spacingPositions = new Map<string, { x: number; y: number }>();
          const siblingSpacing = 200;
          
          for (let level = 0; level <= Math.max(...Array.from(levelNodes.keys())); level++) {
            const nodesAtLevel = levelNodes.get(level) || [];
            const y = baseY + (level * rowSpacing);
            
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
            
            let currentX = -300;
            Array.from(siblingGroups.entries()).forEach(([parentId, groupNodes]) => {
              groupNodes.forEach((node, index) => {
                spacingPositions.set(node.id, { 
                  x: currentX + (index * (nodeWidth + 40)), 
                  y 
                });
              });
              currentX += (groupNodes.length * (nodeWidth + 40)) + siblingSpacing;
            });
            
            orphanNodes.forEach((node, index) => {
              spacingPositions.set(node.id, { 
                x: currentX + (index * (nodeWidth + 40)), 
                y 
              });
            });
          }
          
          return nds.map(node => {
            const newPos = spacingPositions.get(node.id);
            return newPos ? { ...node, position: { x: newPos.x, y: newPos.y } } : node;
          });
          
        case 'shift-parents':
          // Step 4: Center parents over their children
          const shiftPositions = new Map<string, { x: number; y: number }>();
          
          // First, set all current positions
          nds.forEach(node => {
            shiftPositions.set(node.id, { x: node.position.x, y: node.position.y });
          });
          
          // Process from bottom to top
          for (let level = Math.max(...Array.from(levelNodes.keys())); level >= 0; level--) {
            const nodesAtLevel = levelNodes.get(level) || [];
            
            nodesAtLevel.forEach(node => {
              const nodeChildren = children.get(node.id) || [];
              if (nodeChildren.length > 0) {
                const childPositions = nodeChildren
                  .map(childId => shiftPositions.get(childId))
                  .filter(pos => pos !== undefined) as { x: number; y: number }[];
                
                if (childPositions.length > 0) {
                  const minChildX = Math.min(...childPositions.map(pos => pos.x));
                  const maxChildX = Math.max(...childPositions.map(pos => pos.x));
                  const centerX = (minChildX + maxChildX) / 2;
                  
                  const currentPos = shiftPositions.get(node.id);
                  if (currentPos) {
                    shiftPositions.set(node.id, { x: centerX, y: currentPos.y });
                  }
                }
              }
            });
          }
          
          return nds.map(node => {
            const newPos = shiftPositions.get(node.id);
            return newPos ? { ...node, position: { x: newPos.x, y: newPos.y } } : node;
          });
          
        case 'center-trees':
          // Step 5: Center entire trees while maintaining spacing
          const treePositions = new Map<string, { x: number; y: number }>();
          
          // Group nodes by root
          const treeGroups = new Map<string, typeof nds>();
          
          rootNodes.forEach(root => {
            const treeNodes: typeof nds = [];
            const addToTree = (nodeId: string) => {
              const node = nodeMap.get(nodeId);
              if (node) {
                treeNodes.push(node);
                const nodeChildren = children.get(nodeId) || [];
                nodeChildren.forEach(addToTree);
              }
            };
            addToTree(root.id);
            treeGroups.set(root.id, treeNodes);
          });
          
          let treeOffsetX = -400;
          Array.from(treeGroups.entries()).forEach(([rootId, treeNodes]) => {
            const treeMinX = Math.min(...treeNodes.map(n => n.position.x));
            const offsetX = treeOffsetX - treeMinX;
            
            treeNodes.forEach(node => {
              treePositions.set(node.id, {
                x: node.position.x + offsetX,
                y: node.position.y
              });
            });
            
            const treeMaxX = Math.max(...treeNodes.map(n => n.position.x + offsetX));
            treeOffsetX = treeMaxX + 300;
          });
          
          return nds.map(node => {
            const newPos = treePositions.get(node.id);
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