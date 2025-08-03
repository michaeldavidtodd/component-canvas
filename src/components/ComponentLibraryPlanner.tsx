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
    const minNodeSpacing = 200; // Minimum horizontal spacing between nodes
    const baseY = 100; // Starting Y position
    
    // Define hierarchy order
    const hierarchy: ComponentType[] = ['main-component', 'variant', 'sub-component', 'instance', 'token'];
    
    setNodes((nds) => {
      // Step 1: Group nodes by type and sort by hierarchy
      const groupedNodes = new Map<ComponentType, typeof nds>();
      hierarchy.forEach(type => groupedNodes.set(type, []));
      
      nds.forEach(node => {
        const nodeType = (node.data as ComponentNodeData).componentType;
        if (groupedNodes.has(nodeType)) {
          groupedNodes.get(nodeType)!.push(node);
        }
      });
      
      // Step 2: Calculate positions for each row
      const rows: { type: ComponentType; nodes: typeof nds; y: number }[] = [];
      let currentY = baseY;
      
      hierarchy.forEach(type => {
        const nodesOfType = groupedNodes.get(type)!;
        if (nodesOfType.length > 0) {
          rows.push({ type, nodes: nodesOfType, y: currentY });
          currentY += rowSpacing;
        }
      });
      
      // Step 3: Position nodes within each row and center-align
      const updatedNodes = new Map<string, { x: number; y: number }>();
      
      rows.forEach((row, rowIndex) => {
        const totalWidth = (row.nodes.length - 1) * minNodeSpacing;
        const startX = -totalWidth / 2; // Center around 0
        
        // Step 4: For rows after the first, reorder based on relationships
        let orderedNodes = [...row.nodes];
        if (rowIndex > 0) {
          const prevRow = rows[rowIndex - 1];
          const prevNodePositions = prevRow.nodes.map(n => ({
            id: n.id,
            x: updatedNodes.get(n.id)?.x || 0
          }));
          
          // Sort current row nodes by their relationship to previous row
          orderedNodes.sort((a, b) => {
            const aConnections = edges.filter(e => e.target === a.id).map(e => e.source);
            const bConnections = edges.filter(e => e.target === b.id).map(e => e.source);
            
            const aParentX = aConnections.length > 0 
              ? Math.min(...aConnections.map(id => prevNodePositions.find(p => p.id === id)?.x || 0))
              : 0;
            const bParentX = bConnections.length > 0 
              ? Math.min(...bConnections.map(id => prevNodePositions.find(p => p.id === id)?.x || 0))
              : 0;
            
            return aParentX - bParentX;
          });
        }
        
        // Step 5: Position nodes with optimization for connected nodes
        orderedNodes.forEach((node, index) => {
          let x = startX + (index * minNodeSpacing);
          
          // Optimize position based on parent connections
          if (rowIndex > 0) {
            const connections = edges.filter(e => e.target === node.id);
            if (connections.length > 0) {
              const parentPositions = connections
                .map(e => updatedNodes.get(e.source)?.x)
                .filter(x => x !== undefined) as number[];
              
              if (parentPositions.length > 0) {
                const avgParentX = parentPositions.reduce((sum, x) => sum + x, 0) / parentPositions.length;
                // Adjust position to be closer to parent average, but maintain minimum spacing
                const minX = index > 0 ? (updatedNodes.get(orderedNodes[index - 1].id)?.x || 0) + minNodeSpacing : startX;
                const maxX = index < orderedNodes.length - 1 ? startX + ((index + 1) * minNodeSpacing) - minNodeSpacing : Infinity;
                
                x = Math.max(minX, Math.min(maxX, avgParentX));
              }
            }
          }
          
          updatedNodes.set(node.id, { x, y: row.y });
        });
      });
      
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