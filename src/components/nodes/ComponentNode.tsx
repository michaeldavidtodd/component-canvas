import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ComponentType } from '@/types/component';
import { 
  Component, 
  Layers, 
  Palette, 
  Copy, 
  Square 
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
  return (
    <div className={`
      relative bg-workspace border-2 rounded-lg shadow-md min-w-[160px] p-3
      ${selected ? getBorderColor(data.componentType) : 'border-border'}
      transition-all duration-200
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-border hover:!bg-primary"
      />
      
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