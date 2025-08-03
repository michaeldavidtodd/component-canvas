import { Node } from '@xyflow/react';
import { ComponentNodeData, ComponentType } from '@/types/component';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, FileText, Layout, Sparkles } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: any;
  onUpdateNode: (nodeId: string, updates: Partial<ComponentNodeData>) => void;
  onDeleteNode: () => void;
  onSmartLayout: () => void;
  onCleanupLayout: () => void;
}

const componentTypeOptions: { value: ComponentType; label: string }[] = [
  { value: 'main-component', label: 'Main Component' },
  { value: 'variant', label: 'Variant' },
  { value: 'sub-component', label: 'Sub Component' },
  { value: 'token', label: 'Design Token' },
  { value: 'instance', label: 'Instance' },
];

export const PropertiesPanel = ({ 
  selectedNode, 
  onUpdateNode, 
  onDeleteNode,
  onSmartLayout,
  onCleanupLayout 
}: PropertiesPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-workspace border-l border-border p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">No Selection</h3>
            <p className="text-xs text-muted-foreground">
              Select a component to view and edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleLabelChange = (value: string) => {
    onUpdateNode(selectedNode.id, { label: value });
  };

  const handleDescriptionChange = (value: string) => {
    onUpdateNode(selectedNode.id, { description: value });
  };

  const handleTypeChange = (value: ComponentType) => {
    onUpdateNode(selectedNode.id, { componentType: value });
  };

  return (
    <div className="w-80 bg-workspace border-l border-border p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Properties</h3>
        <p className="text-sm text-muted-foreground">
          Configure the selected component
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="component-name" className="text-sm font-medium">
            Component Name
          </Label>
          <Input
            id="component-name"
            value={selectedNode.data.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Enter component name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="component-type" className="text-sm font-medium">
            Component Type
          </Label>
          <Select
            value={selectedNode.data.componentType}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {componentTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="component-description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="component-description"
            value={selectedNode.data.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe this component's purpose and usage"
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('Smart Layout button clicked!');
            onSmartLayout();
          }}
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Smart Layout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCleanupLayout}
          className="w-full gap-2"
        >
          <Layout className="w-4 h-4" />
          Clean Up
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteNode}
          className="w-full gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Component
        </Button>
      </div>
    </div>
  );
};