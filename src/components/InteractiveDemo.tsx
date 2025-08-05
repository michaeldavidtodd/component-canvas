import React, { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Controls,
  Background,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ComponentNode } from '@/components/nodes/ComponentNode';
import { ComponentType } from '@/types/component';
import dagre from '@dagrejs/dagre';

const nodeWidth = 200;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // Create a fresh graph instance each time
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  
  // Configure dagre for hierarchical layout
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 150,  // Vertical spacing between levels
    nodesep: 80,   // Horizontal spacing between nodes
    edgesep: 20,   // Edge separation
    marginx: 50,   // Margin around the graph
    marginy: 50
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

const initialNodes: Node[] = [
  // Top level - Main Component
  {
    id: 'button-main',
    type: 'component',
    position: { x: 300, y: 50 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Button',
      componentType: 'main-component' as ComponentType,
      description: 'Primary button component for user interactions',
      url: 'https://figma.com/button-component'
    },
  },
  // Second level - Variants
  {
    id: 'button-primary',
    type: 'component',
    position: { x: 150, y: 180 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Primary Button',
      componentType: 'variant' as ComponentType,
      description: 'Primary variant with brand colors',
    },
  },
  {
    id: 'button-secondary',
    type: 'component',
    position: { x: 450, y: 180 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Secondary Button',
      componentType: 'variant' as ComponentType,
      description: 'Secondary variant for less prominent actions',
    },
  },
  // Third level - Sub-components and Tokens
  {
    id: 'button-icon',
    type: 'component',
    position: { x: 50, y: 310 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Button Icon',
      componentType: 'sub-component' as ComponentType,
      description: 'Icon element used within button components',
    },
  },
  {
    id: 'primary-color',
    type: 'component',
    position: { x: 300, y: 310 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Primary Color',
      componentType: 'token' as ComponentType,
      description: 'Primary brand color token',
      tokenType: 'color',
      tokenSubType: 'background'
    },
  },
  {
    id: 'button-text',
    type: 'component',
    position: { x: 550, y: 310 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Button Text',
      componentType: 'sub-component' as ComponentType,
      description: 'Text element used within button components',
    },
  },
  // Bottom level - Instances
  {
    id: 'button-instance-1',
    type: 'component',
    position: { x: 100, y: 440 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Login Button',
      componentType: 'instance' as ComponentType,
      description: 'Instance of primary button used on login form',
    },
  },
  {
    id: 'button-instance-2',
    type: 'component',
    position: { x: 400, y: 440 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Cancel Button',
      componentType: 'instance' as ComponentType,
      description: 'Instance of secondary button used for cancel actions',
    },
  }
];

const initialEdges: Edge[] = [
  // Main component to variants
  {
    id: 'e1',
    source: 'button-main',
    target: 'button-primary',
    type: 'default',
    style: { stroke: 'hsl(258 100% 68%)', strokeWidth: 2 },
  },
  {
    id: 'e2',
    source: 'button-main',
    target: 'button-secondary',
    type: 'default',
    style: { stroke: 'hsl(258 100% 68%)', strokeWidth: 2 },
  },
  // Variants to sub-components and tokens
  {
    id: 'e3',
    source: 'button-primary',
    target: 'button-icon',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  },
  {
    id: 'e4',
    source: 'button-primary',
    target: 'primary-color',
    type: 'default',
    style: { stroke: 'hsl(45 100% 68%)', strokeWidth: 2 },
  },
  {
    id: 'e5',
    source: 'button-secondary',
    target: 'button-text',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  },
  // Variants to instances
  {
    id: 'e6',
    source: 'button-primary',
    target: 'button-instance-1',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  },
  {
    id: 'e7',
    source: 'button-secondary',
    target: 'button-instance-2',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  }
];

const nodeTypes = {
  component: ComponentNode,
};

const InteractiveDemo = () => {
  const layoutedElements = getLayoutedElements(initialNodes, initialEdges);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedElements.edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full bg-canvas rounded-2xl overflow-hidden border-2 border-border shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ background: 'hsl(var(--canvas))' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls 
          style={{ 
            background: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }} 
        />
        <Background 
          color="hsl(var(--border))"
          gap={20}
        />
        <MiniMap 
          style={{ 
            background: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          nodeColor={(node) => {
            const nodeData = nodes.find(n => n.id === node.id)?.data;
            if (!nodeData) return 'hsl(var(--muted))';
            
            switch (nodeData.componentType) {
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
      
      {/* Demo Instructions */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border max-w-xs">
        <h4 className="font-bold text-sm text-foreground mb-2">Interactive Demo</h4>
        <p className="text-xs text-muted-foreground">
          • Drag nodes to reorganize<br/>
          • Use controls to zoom/pan<br/>
          • Connect components by dragging from edges<br/>
          • Hover over nodes to add new ones
        </p>
      </div>
    </div>
  );
};

export default InteractiveDemo;