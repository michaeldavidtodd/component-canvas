import { useCallback, useState } from 'react';
import {
  ReactFlow,
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
import { initialNodes, initialEdges } from '@/lib/initial-elements';
import { ComponentNodeData, ComponentType } from '@/types/component';

const nodeTypes = {
  component: ComponentNode,
};

export const ComponentLibraryPlanner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeSelect = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const addNode = useCallback((type: ComponentType) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'component',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'New Component',
        componentType: type,
        description: '',
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
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
    const rowSpacing = 250; // Vertical spacing between rows
    const minNodeSpacing = 300; // Minimum horizontal spacing between nodes
    const baseY = 100; // Starting Y position
    
    setNodes((nds) => {
      // Step 1: Build hierarchy tree based on actual connections
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
      
      // Step 2: Calculate depth levels for each node
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
      
      // Step 3: Position nodes level by level
      const updatedNodes = new Map<string, { x: number; y: number }>();
      const maxLevel = Math.max(...Array.from(levelNodes.keys()));
      
      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelNodes.get(level) || [];
        if (nodesAtLevel.length === 0) continue;
        
        const y = baseY + (level * rowSpacing);
        
        // Step 4: Group nodes by their parent for better organization
        const nodeGroups = new Map<string, typeof nds>();
        const orphanNodes: typeof nds = [];
        
        nodesAtLevel.forEach(node => {
          const parentId = parents.get(node.id);
          if (parentId) {
            if (!nodeGroups.has(parentId)) {
              nodeGroups.set(parentId, []);
            }
            nodeGroups.get(parentId)!.push(node);
          } else {
            orphanNodes.push(node);
          }
        });
        
        // Step 5: Position groups based on parent positions
        const allGroupsNodes: { nodes: typeof nds; parentX?: number }[] = [];
        
        // Add groups with parents
        Array.from(nodeGroups.entries()).forEach(([parentId, groupNodes]) => {
          const parentPos = updatedNodes.get(parentId);
          allGroupsNodes.push({
            nodes: groupNodes,
            parentX: parentPos?.x
          });
        });
        
        // Add orphan nodes as individual groups
        orphanNodes.forEach(node => {
          allGroupsNodes.push({ nodes: [node] });
        });
        
        // Sort groups by parent position (left to right)
        allGroupsNodes.sort((a, b) => {
          const aX = a.parentX ?? 0;
          const bX = b.parentX ?? 0;
          return aX - bX;
        });
        
        // Step 6: First, identify and position shared child nodes (nodes with multiple parents)
        const sharedChildren = new Map<string, string[]>(); // nodeId -> parentIds
        allGroupsNodes.forEach(group => {
          group.nodes.forEach(node => {
            const nodeParents = edges.filter(edge => edge.target === node.id).map(edge => edge.source);
            if (nodeParents.length > 1) {
              sharedChildren.set(node.id, nodeParents);
            }
          });
        });

        // Step 7: Calculate positions for each group
        let currentX = 0;
        const totalGroups = allGroupsNodes.length;
        const totalWidth = Math.max(0, (totalGroups - 1) * minNodeSpacing * 2); // Extra spacing between groups
        let startX = -totalWidth / 2;
        
        allGroupsNodes.forEach((group, groupIndex) => {
          const groupNodes = group.nodes;
          const groupWidth = Math.max(0, (groupNodes.length - 1) * minNodeSpacing);
          const groupStartX = startX + (groupIndex * minNodeSpacing * 2) - (groupWidth / 2);
          
          // Position nodes within the group
          groupNodes.forEach((node, nodeIndex) => {
            let nodeX = groupStartX + (nodeIndex * minNodeSpacing);
            
            // Special handling for shared children - center them below their parents
            if (sharedChildren.has(node.id)) {
              const parentIds = sharedChildren.get(node.id)!;
              const parentPositions = parentIds
                .map(parentId => updatedNodes.get(parentId))
                .filter(pos => pos !== undefined);
              
              if (parentPositions.length > 0) {
                const avgParentX = parentPositions.reduce((sum, pos) => sum + pos!.x, 0) / parentPositions.length;
                nodeX = avgParentX;
              }
            }
            // If this group has a parent, try to center it around the parent
            else if (group.parentX !== undefined) {
              const groupCenterX = groupStartX + (groupWidth / 2);
              const offsetToParent = group.parentX - groupCenterX;
              nodeX += offsetToParent;
            }
            
            updatedNodes.set(node.id, { x: nodeX, y });
          });
          
          // Step 8: Adjust spacing within row to avoid overlaps while maintaining shared child centering
          const rowNodeIds = groupNodes.map(n => n.id);
          const sortedRowNodes = rowNodeIds
            .map(id => ({ id, x: updatedNodes.get(id)!.x }))
            .sort((a, b) => a.x - b.x);
          
          // Ensure minimum spacing between adjacent nodes
          for (let i = 1; i < sortedRowNodes.length; i++) {
            const prevNode = sortedRowNodes[i - 1];
            const currentNode = sortedRowNodes[i];
            
            if (currentNode.x - prevNode.x < minNodeSpacing) {
              // Only adjust if it's not a shared child (preserve their centering)
              if (!sharedChildren.has(currentNode.id)) {
                currentNode.x = prevNode.x + minNodeSpacing;
                updatedNodes.set(currentNode.id, { x: currentNode.x, y });
              }
            }
          }
        });
        
        // Step 9: Final pass to ensure no overlaps in any row after shared children positioning
        for (let level = 0; level <= maxLevel; level++) {
          const nodesAtLevel = levelNodes.get(level) || [];
          if (nodesAtLevel.length <= 1) continue;
          
          const levelNodePositions = nodesAtLevel
            .map(node => ({ 
              id: node.id, 
              x: updatedNodes.get(node.id)!.x,
              isShared: sharedChildren.has(node.id)
            }))
            .sort((a, b) => a.x - b.x);
          
          // Adjust overlapping nodes, prioritizing shared children positions
          for (let i = 1; i < levelNodePositions.length; i++) {
            const prevNode = levelNodePositions[i - 1];
            const currentNode = levelNodePositions[i];
            
            if (currentNode.x - prevNode.x < minNodeSpacing) {
              if (currentNode.isShared && !prevNode.isShared) {
                // If current is shared and previous isn't, move previous left
                const newX = currentNode.x - minNodeSpacing;
                prevNode.x = newX;
                updatedNodes.set(prevNode.id, { x: newX, y: baseY + (level * rowSpacing) });
                
                // Cascade adjustment to earlier nodes if needed
                let currentPrevNode = prevNode;
                for (let j = i - 2; j >= 0; j--) {
                  const earlierNode = levelNodePositions[j];
                  if (currentPrevNode.x - earlierNode.x < minNodeSpacing) {
                    earlierNode.x = currentPrevNode.x - minNodeSpacing;
                    updatedNodes.set(earlierNode.id, { x: earlierNode.x, y: baseY + (level * rowSpacing) });
                    currentPrevNode = earlierNode;
                  } else {
                    break;
                  }
                }
              } else if (!currentNode.isShared) {
                // If current is not shared, move it right
                currentNode.x = prevNode.x + minNodeSpacing;
                updatedNodes.set(currentNode.id, { x: currentNode.x, y: baseY + (level * rowSpacing) });
              }
            }
          }
        }
      }
      
      // Apply the new positions
      return nds.map(node => {
        const newPos = updatedNodes.get(node.id);
        return newPos ? { ...node, position: newPos } : node;
      });
    });
  }, [setNodes, edges]);

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

  return (
    <div className="flex h-screen bg-canvas">
      <Toolbar onAddNode={addNode} />
      
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
          <Background color="#e1e5e9" gap={16} />
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
        </ReactFlow>
      </div>

      <PropertiesPanel 
        selectedNode={selectedNode}
        onUpdateNode={updateNodeData}
        onDeleteNode={deleteSelectedNode}
        onSmartLayout={smartLayout}
        onCleanupLayout={cleanupLayout}
      />
    </div>
  );
};