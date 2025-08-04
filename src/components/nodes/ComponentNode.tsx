import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ComponentType } from '@/types/component';
import { 
  Component, 
  Layers, 
  Palette, 
  Copy, 
  Square,
  Plus
} from 'lucide-react';

const getNodeIcon = (type: ComponentType) => {
  switch (type) {
    case 'main-component':
      return <Component className="w-4 h-4" />;
    case 'variant':
      return <Layers className="w-4 h-4" />;
    case 'sub-component':
      return <Square className="w-4 h-4" />;
    case 'token':
      return <Palette className="w-4 h-4" />;
    case 'instance':
      return <Copy className="w-4 h-4" />;
    default:
      return <Component className="w-4 h-4" />;
  }
};

const getNodeColor = (type: ComponentType) => {
  switch (type) {
    case 'main-component':
      return 'bg-component-main text-white';
    case 'variant':
      return 'bg-component-variant text-white';
    case 'sub-component':
      return 'bg-component-sub text-white';
    case 'token':
      return 'bg-component-token text-white';
    case 'instance':
      return 'bg-component-instance text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getBorderColor = (type: ComponentType) => {
  switch (type) {
    case 'main-component':
      return 'border-component-main';
    case 'variant':
      return 'border-component-variant';
    case 'sub-component':
      return 'border-component-sub';
    case 'token':
      return 'border-component-token';
    case 'instance':
      return 'border-component-instance';
    default:
      return 'border-border';
  }
};

export const ComponentNode = memo(({ data, selected }: any) => {
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

  const addNode = useCallback((side: 'left' | 'right') => {
    const nodes = getNodes();
    const edges = getEdges();
    const currentNode = nodes.find(n => n.data === data);
    
    if (!currentNode) return;

    // Generate new node ID
    const newId = `node-${Date.now()}`;
    
    // Calculate position based on side
    const offsetX = side === 'left' ? -200 : 200;
    const newPosition = {
      x: currentNode.position.x + offsetX,
      y: currentNode.position.y,
    };

    // Create new node
    const newNode = {
      id: newId,
      type: 'component',
      position: newPosition,
      data: {
        label: 'New Component',
        componentType: 'main-component' as ComponentType,
        description: 'A new component',
      },
    };

    // Create new edge
    const newEdge = {
      id: `edge-${Date.now()}`,
      source: side === 'left' ? newId : currentNode.id,
      target: side === 'left' ? currentNode.id : newId,
      type: 'default',
      style: { stroke: 'hsl(258 100% 68%)' },
    };

    // Add to flow
    setNodes((nodes) => [...nodes, newNode]);
    setEdges((edges) => [...edges, newEdge]);
  }, [data, setNodes, setEdges, getNodes, getEdges]);

  return (
    <div className={`
      relative bg-workspace border-2 rounded-lg shadow-md min-w-[160px] p-3
      ${selected ? getBorderColor(data.componentType) : 'border-border'}
      transition-all duration-200 group
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-border hover:!bg-primary"
      />
      
      {/* Left side handle with add button */}
      <div 
        className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2"
        onMouseEnter={() => setHoveredSide('left')}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          className="!w-3 !h-3 !bg-border hover:!bg-primary"
        />
        {hoveredSide === 'left' && (
          <button
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-8 w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
            onClick={() => addNode('left')}
            aria-label="Add node to the left"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Right side handle with add button */}
      <div 
        className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2"
        onMouseEnter={() => setHoveredSide('right')}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-3 !h-3 !bg-border hover:!bg-primary"
        />
        {hoveredSide === 'right' && (
          <button
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-8 w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
            onClick={() => addNode('right')}
            aria-label="Add node to the right"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <div className={`
          p-1.5 rounded-md flex items-center justify-center
          ${getNodeColor(data.componentType)}
        `}>
          {getNodeIcon(data.componentType)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {data.label}
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {data.componentType.replace('-', ' ')}
          </p>
          {data.componentType === 'token' && data.tokenType && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{data.tokenType}</span>
              {data.tokenSubType && (
                <span className="ml-1">• {data.tokenSubType}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {data.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {data.description}
        </p>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-border hover:!bg-primary"
      />
    </div>
  );
});