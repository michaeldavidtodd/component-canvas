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
    console.log('Smart Layout clicked, selectedNode:', selectedNode);
    if (!selectedNode) {
      return;
    }

    // Simple level-based layout
    const levels = new Map<string, number>();
    const queue = [{ id: selectedNode.id, level: 0 }];
    const processed = new Set<string>();

    // Build levels using BFS
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (processed.has(id)) continue;
      processed.add(id);
      levels.set(id, level);

      // Add children to next level
      const children = edges
        .filter(edge => edge.source === id)
        .map(edge => edge.target);
      
      children.forEach(childId => {
        if (!processed.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    levels.forEach((level, nodeId) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(nodeId);
    });

    console.log('Levels:', Object.fromEntries(levels));
    console.log('Nodes by level:', Object.fromEntries(nodesByLevel));

    // Apply layout
    setNodes((nds) => {
      return nds.map((node) => {
        const level = levels.get(node.id);
        if (level !== undefined) {
          const levelNodes = nodesByLevel.get(level)!;
          const nodeIndex = levelNodes.indexOf(node.id);
          
          const levelSpacing = 200;
          const nodeSpacing = 350;
          
          const newY = selectedNode.position.y + (level * levelSpacing);
          
          let newX;
          if (levelNodes.length === 1) {
            newX = selectedNode.position.x;
          } else {
            const totalWidth = (levelNodes.length - 1) * nodeSpacing;
            const startX = selectedNode.position.x - (totalWidth / 2);
            newX = startX + (nodeIndex * nodeSpacing);
          }
          
          return {
            ...node,
            position: { x: newX, y: newY }
          };
        }
        return node;
      });
    });
    
    console.log('Simple layout applied');
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