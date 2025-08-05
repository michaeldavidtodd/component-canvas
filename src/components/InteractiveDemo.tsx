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

const initialNodes: Node[] = [
  {
    id: 'button-main',
    type: 'component',
    position: { x: 250, y: 50 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Button',
      componentType: 'main-component' as ComponentType,
      description: 'Primary button component for user interactions',
      url: 'https://figma.com/button-component'
    },
  },
  {
    id: 'button-primary',
    type: 'component',
    position: { x: 100, y: 200 },
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
    position: { x: 400, y: 200 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Secondary Button',
      componentType: 'variant' as ComponentType,
      description: 'Secondary variant for less prominent actions',
    },
  },
  {
    id: 'button-icon',
    type: 'component',
    position: { x: 250, y: 350 },
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
    position: { x: 600, y: 50 },
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
    id: 'button-instance',
    type: 'component',
    position: { x: 50, y: 500 },
    style: { width: 200, height: 80 },
    data: {
      label: 'Login Button',
      componentType: 'instance' as ComponentType,
      description: 'Instance of primary button used on login form',
    },
  }
];

const initialEdges: Edge[] = [
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
  {
    id: 'e3',
    source: 'button-primary',
    target: 'button-icon',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  },
  {
    id: 'e4',
    source: 'button-secondary',
    target: 'button-icon',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  },
  {
    id: 'e5',
    source: 'button-primary',
    target: 'primary-color',
    type: 'default',
    style: { stroke: 'hsl(45 100% 68%)', strokeWidth: 2 },
  },
  {
    id: 'e6',
    source: 'button-primary',
    target: 'button-instance',
    type: 'default',
    style: { stroke: 'hsl(216 8% 45%)', strokeWidth: 2 },
  }
];

const nodeTypes = {
  component: ComponentNode,
};

const InteractiveDemo = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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