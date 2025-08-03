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
    
    const findConnectedBelow = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        if (!connectedNodes.has(edge.target)) {
          connectedNodes.add(edge.target);
          findConnectedBelow(edge.target);
        }
      });
    };

    findConnectedBelow(selectedNode.id);

    if (connectedNodes.size === 0) return;

    // Group nodes by depth level
    const getNodeDepth = (nodeId: string): number => {
      const parentEdge = edges.find(edge => edge.target === nodeId);
      if (!parentEdge || parentEdge.source === selectedNode.id) return 1;
      return getNodeDepth(parentEdge.source) + 1;
    };

    const nodesByDepth = new Map<number, string[]>();
    connectedNodes.forEach(nodeId => {
      const depth = getNodeDepth(nodeId);
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)!.push(nodeId);
    });

    // Calculate node dimensions (approximate based on content)
    const getNodeDimensions = (node: Node) => {
      const baseWidth = 160; // min-w-[160px] from ComponentNode
      const baseHeight = 80;
      const nodeData = node.data as ComponentNodeData;
      const labelLength = (nodeData.label as string)?.length || 0;
      const descriptionLength = (nodeData.description as string)?.length || 0;
      
      // Adjust width based on content
      const width = Math.max(baseWidth, Math.min(labelLength * 8 + 40, 250));
      // Adjust height based on description
      const height = baseHeight + (descriptionLength > 0 ? Math.ceil(descriptionLength / 30) * 20 : 0);
      
      return { width, height };
    };

    // Check if two nodes overlap
    const nodesOverlap = (node1: any, node2: any) => {
      const dim1 = getNodeDimensions(node1);
      const dim2 = getNodeDimensions(node2);
      
      const left1 = node1.position.x;
      const right1 = node1.position.x + dim1.width;
      const top1 = node1.position.y;
      const bottom1 = node1.position.y + dim1.height;
      
      const left2 = node2.position.x;
      const right2 = node2.position.x + dim2.width;
      const top2 = node2.position.y;
      const bottom2 = node2.position.y + dim2.height;
      
      return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
    };

    setNodes((nds) => {
      const updatedNodes = [...nds];
      const nodeMap = new Map(updatedNodes.map(node => [node.id, node]));
      
      // Layout nodes level by level
      Array.from(nodesByDepth.keys()).sort().forEach(depth => {
        const nodesAtDepth = nodesByDepth.get(depth)!;
        const baseY = selectedNode.position.y + (depth * 150);
        
        if (nodesAtDepth.length === 1) {
          // Single node - center it below parent
          const nodeId = nodesAtDepth[0];
          const node = nodeMap.get(nodeId)!;
          const parentEdge = edges.find(edge => edge.target === nodeId);
          const parentNode = parentEdge ? nodeMap.get(parentEdge.source) : selectedNode;
          
          node.position = {
            x: parentNode.position.x,
            y: baseY
          };
        } else {
          // Multiple nodes - spread them out and check for overlaps
          const minSpacing = 50; // Minimum gap between nodes
          let positions: { nodeId: string; x: number; width: number }[] = [];
          
          // Calculate initial positions
          nodesAtDepth.forEach((nodeId, index) => {
            const node = nodeMap.get(nodeId)!;
            const dimensions = getNodeDimensions(node);
            const spacing = 200;
            const totalWidth = (nodesAtDepth.length - 1) * spacing;
            const startX = selectedNode.position.x - (totalWidth / 2);
            
            positions.push({
              nodeId,
              x: startX + (index * spacing),
              width: dimensions.width
            });
          });
          
          // Resolve overlaps by adjusting positions
          let hasOverlaps = true;
          let iterations = 0;
          const maxIterations = 20;
          
          while (hasOverlaps && iterations < maxIterations) {
            hasOverlaps = false;
            iterations++;
            
            for (let i = 0; i < positions.length - 1; i++) {
              const current = positions[i];
              const next = positions[i + 1];
              
              const currentRight = current.x + current.width;
              const nextLeft = next.x;
              
              if (currentRight + minSpacing > nextLeft) {
                // Overlap detected - push the next node to the right
                const overlap = (currentRight + minSpacing) - nextLeft;
                next.x += overlap;
                hasOverlaps = true;
                
                // Also push subsequent nodes
                for (let j = i + 2; j < positions.length; j++) {
                  positions[j].x += overlap;
                }
              }
            }
          }
          
          // Apply the calculated positions
          positions.forEach(({ nodeId, x }) => {
            const node = nodeMap.get(nodeId)!;
            node.position = { x, y: baseY };
          });
        }
      });
      
      return updatedNodes;
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