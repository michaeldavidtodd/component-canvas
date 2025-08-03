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

    // Build hierarchy levels and track parent relationships
    const nodeLevels = new Map<string, number>();
    const nodeParents = new Map<string, string>();
    const nodesByLevel = new Map<number, string[]>();
    
    const buildHierarchy = (nodeId: string, level: number, parentId?: string) => {
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! <= level) {
        return; // Already processed at a higher or equal level
      }
      
      nodeLevels.set(nodeId, level);
      if (parentId) {
        nodeParents.set(nodeId, parentId);
      }
      
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      const levelNodes = nodesByLevel.get(level)!;
      if (!levelNodes.includes(nodeId)) {
        levelNodes.push(nodeId);
      }
      
      // Find direct children and place them at the next level
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        buildHierarchy(edge.target, level + 1, nodeId);
      });
    };

    // Start hierarchy from selected node
    buildHierarchy(selectedNode.id, 0);

    console.log('Node levels:', Object.fromEntries(nodeLevels));
    console.log('Node parents:', Object.fromEntries(nodeParents));

    if (nodesByLevel.size <= 1) {
      console.log('No hierarchy found, returning early');
      return;
    }

    console.log('Starting hierarchical layout...');
    
    setNodes((nds) => {
      return nds.map((node) => {
        const level = nodeLevels.get(node.id);
        if (level !== undefined && level > 0) {
          const levelSpacing = 200;
          const newY = selectedNode.position.y + (level * levelSpacing);
          
          let newX = selectedNode.position.x; // Default to center under selected node
          
          // If this node has a direct parent, position it below that parent
          const parentId = nodeParents.get(node.id);
          if (parentId) {
            const parentNode = nds.find(n => n.id === parentId);
            if (parentNode) {
              // Check if parent has multiple children at this level
              const siblingNodes = Array.from(nodesByLevel.get(level) || [])
                .filter(siblingId => nodeParents.get(siblingId) === parentId);
              
              if (siblingNodes.length === 1) {
                // Single child - position directly below parent
                newX = parentNode.position.x;
              } else {
                // Multiple children - spread them around parent
                const siblingIndex = siblingNodes.indexOf(node.id);
                const siblingSpacing = 250;
                const totalSiblingWidth = (siblingNodes.length - 1) * siblingSpacing;
                const siblingStartX = parentNode.position.x - (totalSiblingWidth / 2);
                newX = siblingStartX + (siblingIndex * siblingSpacing);
              }
            }
          } else {
            // No direct parent found, use level-based positioning
            const levelNodes = nodesByLevel.get(level)!;
            const indexInLevel = levelNodes.indexOf(node.id);
            const nodeSpacing = 300;
            const totalLevelWidth = (levelNodes.length - 1) * nodeSpacing;
            const startX = selectedNode.position.x - (totalLevelWidth / 2);
            newX = startX + (indexInLevel * nodeSpacing);
          }
          
          const newPosition = { x: newX, y: newY };
          console.log(`Moving node ${node.id} (level ${level}, parent: ${parentId}) from`, node.position, 'to', newPosition);
          
          return {
            ...node,
            position: newPosition
          };
        }
        return node;
      });
    });
    
    console.log('Hierarchical layout applied');
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