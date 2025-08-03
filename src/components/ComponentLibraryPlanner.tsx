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
    if (!selectedNode) return;

    // Find all nodes connected below the selected node
    const connectedNodes = new Set<string>();
    const visited = new Set<string>();
    
    const findConnectedBelow = (nodeId: string, level: number = 0) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        if (!connectedNodes.has(edge.target)) {
          connectedNodes.add(edge.target);
          findConnectedBelow(edge.target, level + 1);
        }
      });
    };

    findConnectedBelow(selectedNode.id);

    if (connectedNodes.size === 0) return;

    // Arrange nodes in a tree-like layout below the selected node
    setNodes((nds) => {
      return nds.map((node) => {
        if (connectedNodes.has(node.id)) {
          // Calculate depth from selected node
          const getDepth = (nodeId: string, depth: number = 1): number => {
            const parentEdge = edges.find(edge => edge.target === nodeId);
            if (!parentEdge || parentEdge.source === selectedNode.id) return depth;
            return getDepth(parentEdge.source, depth + 1);
          };

          const depth = getDepth(node.id);
          const nodesAtSameDepth = Array.from(connectedNodes).filter(id => {
            return getDepth(id) === depth;
          });
          const indexAtDepth = nodesAtSameDepth.indexOf(node.id);
          const totalAtDepth = nodesAtSameDepth.length;

          // Calculate position
          const baseX = selectedNode.position.x;
          const baseY = selectedNode.position.y + (depth * 150);
          const spacing = 200;
          const totalWidth = (totalAtDepth - 1) * spacing;
          const startX = baseX - (totalWidth / 2);
          
          return {
            ...node,
            position: {
              x: startX + (indexAtDepth * spacing),
              y: baseY
            }
          };
        }
        return node;
      });
    });
  }, [selectedNode, edges, setNodes]);

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
      />
    </div>
  );
};