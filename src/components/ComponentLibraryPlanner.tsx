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
      console.log('No selected node, returning early');
      return;
    }

    // Build hierarchy and track relationships
    const nodeLevels = new Map<string, number>();
    const nodeChildren = new Map<string, string[]>();
    const nodeParents = new Map<string, string[]>();
    
    const buildHierarchy = (nodeId: string, level: number) => {
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! <= level) {
        return;
      }
      
      nodeLevels.set(nodeId, level);
      
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      const children = outgoingEdges.map(edge => edge.target);
      nodeChildren.set(nodeId, children);
      
      // Track parents for each child
      children.forEach(childId => {
        if (!nodeParents.has(childId)) {
          nodeParents.set(childId, []);
        }
        nodeParents.get(childId)!.push(nodeId);
      });
      
      // Recurse to children
      children.forEach(childId => {
        buildHierarchy(childId, level + 1);
      });
    };

    buildHierarchy(selectedNode.id, 0);

    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    for (const [nodeId, level] of nodeLevels) {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(nodeId);
    }

    console.log('Node hierarchy built:', Object.fromEntries(nodeLevels));

    if (nodesByLevel.size <= 1) {
      console.log('No hierarchy found');
      return;
    }

    setNodes((nds) => {
      return nds.map((node) => {
        const level = nodeLevels.get(node.id);
        if (level !== undefined && level > 0) {
          const levelSpacing = 200;
          const nodeSpacing = 350; // Increased spacing to avoid overlaps
          const newY = selectedNode.position.y + (level * levelSpacing);
          
          let newX = selectedNode.position.x;
          
          const parents = nodeParents.get(node.id) || [];
          
          if (parents.length === 1) {
            // Single parent - position based on parent's position and siblings
            const parentId = parents[0];
            const parentNode = nds.find(n => n.id === parentId);
            const allSiblings = nodeChildren.get(parentId) || [];
            
            if (parentNode && allSiblings.length > 0) {
              const nodeIndex = allSiblings.indexOf(node.id);
              
              if (allSiblings.length === 1) {
                // Only child - position directly below parent
                newX = parentNode.position.x;
              } else {
                // Has siblings - spread around parent
                const totalWidth = (allSiblings.length - 1) * nodeSpacing;
                const startX = parentNode.position.x - (totalWidth / 2);
                newX = startX + (nodeIndex * nodeSpacing);
              }
            }
          } else if (parents.length > 1) {
            // Multiple parents - position between them
            const parentNodes = parents.map(pid => nds.find(n => n.id === pid)).filter(Boolean);
            if (parentNodes.length > 0) {
              const avgX = parentNodes.reduce((sum, p) => sum + (p?.position.x || 0), 0) / parentNodes.length;
              newX = avgX;
            }
          } else {
            // No direct parent in current hierarchy - use level-based positioning
            const levelNodes = nodesByLevel.get(level) || [];
            const indexInLevel = levelNodes.indexOf(node.id);
            const totalWidth = (levelNodes.length - 1) * nodeSpacing;
            const startX = selectedNode.position.x - (totalWidth / 2);
            newX = startX + (indexInLevel * nodeSpacing);
          }
          
          const newPosition = { x: newX, y: newY };
          console.log(`Moving node ${node.id} (level ${level}) to`, newPosition);
          
          return {
            ...node,
            position: newPosition
          };
        }
        return node;
      });
    });
    
    console.log('Smart layout applied');
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