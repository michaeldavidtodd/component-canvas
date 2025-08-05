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

const initialNodes: Node[] = [
  {
    id: 'button-main',
    type: 'default',
    position: { x: 200, y: 50 },
    data: { 
      label: (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <span className="font-semibold">Button</span>
        </div>
      )
    },
    style: {
      background: 'hsl(var(--primary))',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 'bold',
      padding: '12px 16px',
      minWidth: '120px'
    }
  },
  {
    id: 'button-primary',
    type: 'default',
    position: { x: 50, y: 180 },
    data: { 
      label: (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-blue rounded-full"></div>
          <span>Primary</span>
        </div>
      )
    },
    style: {
      background: 'hsl(var(--brand-blue))',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '8px 12px',
      minWidth: '100px'
    }
  },
  {
    id: 'button-secondary',
    type: 'default',
    position: { x: 200, y: 180 },
    data: { 
      label: (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-green rounded-full"></div>
          <span>Secondary</span>
        </div>
      )
    },
    style: {
      background: 'hsl(var(--brand-green))',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '8px 12px',
      minWidth: '100px'
    }
  },
  {
    id: 'button-ghost',
    type: 'default',
    position: { x: 350, y: 180 },
    data: { 
      label: (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted rounded-full border-2 border-border"></div>
          <span>Ghost</span>
        </div>
      )
    },
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      border: '2px solid hsl(var(--border))',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '8px 12px',
      minWidth: '100px'
    }
  },
  {
    id: 'icon-component',
    type: 'default',
    position: { x: 200, y: 300 },
    data: { 
      label: (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-orange rounded-full"></div>
          <span>Icon</span>
        </div>
      )
    },
    style: {
      background: 'hsl(var(--brand-orange))',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '8px 12px',
      minWidth: '80px'
    }
  }
];

const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'button-main',
    target: 'button-primary',
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--brand-blue))', strokeWidth: 2 },
    animated: true
  },
  {
    id: 'e2',
    source: 'button-main',
    target: 'button-secondary',
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--brand-green))', strokeWidth: 2 },
    animated: true
  },
  {
    id: 'e3',
    source: 'button-main',
    target: 'button-ghost',
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
    animated: true
  },
  {
    id: 'e4',
    source: 'button-main',
    target: 'icon-component',
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--brand-orange))', strokeWidth: 2 },
    animated: true
  }
];

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
            if (node.id.includes('primary')) return 'hsl(var(--brand-blue))';
            if (node.id.includes('secondary')) return 'hsl(var(--brand-green))';
            if (node.id.includes('ghost')) return 'hsl(var(--muted))';
            if (node.id.includes('icon')) return 'hsl(var(--brand-orange))';
            return 'hsl(var(--primary))';
          }}
        />
      </ReactFlow>
      
      {/* Demo Instructions */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border max-w-xs">
        <h4 className="font-bold text-sm text-foreground mb-2">Interactive Demo</h4>
        <p className="text-xs text-muted-foreground">
          • Drag nodes to reorganize<br/>
          • Use controls to zoom/pan<br/>
          • Connect components by dragging from edges
        </p>
      </div>
    </div>
  );
};

export default InteractiveDemo;