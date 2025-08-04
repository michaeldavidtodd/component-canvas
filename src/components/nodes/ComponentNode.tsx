import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, useStore, NodeResizer } from '@xyflow/react';
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

export const ComponentNode = memo(({ data, selected, id }: any) => {
  const [hoveredSide, setHoveredSide] = useState<'top' | 'bottom' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

  // Get the current node to access its style (width)
  const currentNode = useStore((s) => s.nodeLookup.get(id));
  const nodeWidth = currentNode?.style?.width || 200;

  const addNode = useCallback((side: 'top' | 'bottom') => {
    console.log('ADD NODE CALLED!', side);
    const nodes = getNodes();
    const edges = getEdges();
    const currentNode = nodes.find(n => n.data === data);
    
    if (!currentNode) return;

    // Generate new node ID
    const newId = `node-${Date.now()}`;
    
    // Calculate position based on side
    const offsetY = side === 'top' ? -150 : 150;
    const newPosition = {
      x: currentNode.position.x,
      y: currentNode.position.y + offsetY,
    };

    // Create new node with selected: true and proper dimensions
    const newNode = {
      id: newId,
      type: 'component',
      position: newPosition,
      selected: true,
      style: { width: 200, height: 80 },
      data: {
        label: 'New Component',
        componentType: 'main-component' as ComponentType,
        description: 'A new component',
      },
    };

    // Use same color logic as onConnect
    const currentType = currentNode.data.componentType as ComponentType;
    const newType = 'main-component' as ComponentType;
    
    let strokeColor = 'hsl(216 8% 45%)'; // default
    if ((currentType === 'main-component' && newType === 'variant') || 
        (currentType === 'variant' && newType === 'main-component')) {
      strokeColor = 'hsl(258 100% 68%)';
    } else if (currentType === 'token' || newType === 'token') {
      strokeColor = 'hsl(45 100% 68%)';
    }

    // Create new edge
    const newEdge = {
      id: `edge-${Date.now()}`,
      source: side === 'top' ? newId : currentNode.id,
      target: side === 'top' ? currentNode.id : newId,
      type: 'default',
      animated: true,
      style: { stroke: strokeColor },
    };

    // Deselect all existing nodes and add the new selected node
    setNodes((nodes) => [...nodes.map(n => ({ ...n, selected: false })), newNode]);
    setEdges((edges) => [...edges, newEdge]);
    
    // Dispatch custom event to notify parent component of selection
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nodeCreated', { 
        detail: { node: newNode } 
      }));
    }, 0);
  }, [data, setNodes, setEdges, getNodes, getEdges]);

  const handleMouseEnter = (side: 'top' | 'bottom') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredSide(side);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredSide(null);
    }, 150);
  };

  return (
    <div 
      className={`
        relative bg-workspace border-2 rounded-lg shadow-md p-3
        ${selected ? getBorderColor(data.componentType) : 'border-border'}
        transition-all duration-200 group
      `}
    >
      <NodeResizer 
        minWidth={160} 
        minHeight={80}
        isVisible={selected}
        keepAspectRatio={false}
      />
      {/* Top handle with add button */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
        onMouseEnter={() => handleMouseEnter('top')}
        onMouseLeave={handleMouseLeave}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-border hover:!bg-primary"
        />
        {hoveredSide === 'top' && (
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 w-8 h-8 flex items-center justify-center"
            onMouseEnter={() => handleMouseEnter('top')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                console.log('BUTTON CLICKED TOP!');
                addNode('top');
              }}
              aria-label="Add node above"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
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
          <h3 className="font-medium text-sm text-foreground break-words">
            {data.label}
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {data.componentType.replace('-', ' ')}
          </p>
          {data.componentType === 'token' && data.tokenType && (
            <div className="text-xs text-muted-foreground mt-1 break-words">
              <span className="font-medium">{data.tokenType}</span>
              {data.tokenSubType && (
                <span className="ml-1">• {data.tokenSubType}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {data.description && (
        <p className="text-xs text-muted-foreground break-words leading-relaxed">
          {data.description}
        </p>
      )}
      
      {/* Bottom handle with add button */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-8 h-8 flex items-center justify-center"
        onMouseEnter={() => handleMouseEnter('bottom')}
        onMouseLeave={handleMouseLeave}
      >
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-border hover:!bg-primary"
        />
        {hoveredSide === 'bottom' && (
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 w-8 h-8 flex items-center justify-center"
            onMouseEnter={() => handleMouseEnter('bottom')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                console.log('BUTTON CLICKED BOTTOM!');
                addNode('bottom');
              }}
              aria-label="Add node below"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});