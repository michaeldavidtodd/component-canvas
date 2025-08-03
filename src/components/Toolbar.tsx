import { ComponentType } from '@/types/component';
import { Button } from '@/components/ui/button';
import { 
  Component, 
  Layers, 
  Palette, 
  Copy, 
  Square,
  Plus 
} from 'lucide-react';

interface ToolbarProps {
  onAddNode: (type: ComponentType) => void;
}

const nodeTypes: { type: ComponentType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'main-component',
    label: 'Main Component',
    icon: <Component className="w-4 h-4" />,
    color: 'bg-component-main'
  },
  {
    type: 'variant',
    label: 'Variant',
    icon: <Layers className="w-4 h-4" />,
    color: 'bg-component-variant'
  },
  {
    type: 'sub-component',
    label: 'Sub Component',
    icon: <Square className="w-4 h-4" />,
    color: 'bg-component-sub'
  },
  {
    type: 'token',
    label: 'Design Token',
    icon: <Palette className="w-4 h-4" />,
    color: 'bg-component-token'
  },
  {
    type: 'instance',
    label: 'Instance',
    icon: <Copy className="w-4 h-4" />,
    color: 'bg-component-instance'
  },
];

export const Toolbar = ({ onAddNode }: ToolbarProps) => {
  return (
    <div className="w-64 bg-workspace border-r border-border p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Component Library Planner
        </h2>
        <p className="text-sm text-muted-foreground">
          Design and visualize your component structure
        </p>
      </div>
      
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground mb-1">Add Components</h3>
        {nodeTypes.map((nodeType) => (
          <Button
            key={nodeType.type}
            variant="ghost"
            className="justify-start gap-3 h-auto p-3 hover:bg-secondary"
            onClick={() => onAddNode(nodeType.type)}
          >
            <div className={`p-1.5 rounded-md text-white ${nodeType.color}`}>
              {nodeType.icon}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{nodeType.label}</span>
            </div>
            <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
          </Button>
        ))}
      </div>
      
      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Click and drag to create connections between components
        </p>
      </div>
    </div>
  );
};