import { Node } from '@xyflow/react';
import { ComponentNodeData, ComponentType, TokenType, TokenSubType } from '@/types/component';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, FileText } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: any;
  onUpdateNode: (nodeId: string, updates: Partial<ComponentNodeData>) => void;
  onDeleteNode: () => void;
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
  onDeleteNode
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

  const handleUrlChange = (value: string) => {
    onUpdateNode(selectedNode.id, { url: value });
  };

  const handleTypeChange = (value: ComponentType) => {
    onUpdateNode(selectedNode.id, { componentType: value });
  };

  const handleTokenTypeChange = (value: TokenType) => {
    onUpdateNode(selectedNode.id, { 
      tokenType: value,
      tokenSubType: undefined // Reset sub-type when main type changes
    });
  };

  const handleTokenSubTypeChange = (value: TokenSubType) => {
    onUpdateNode(selectedNode.id, { tokenSubType: value });
  };

  // Token type options
  const tokenTypeOptions: { value: TokenType; label: string }[] = [
    { value: 'color', label: 'Color' },
    { value: 'spacing', label: 'Spacing' },
    { value: 'corner-radius', label: 'Corner Radius' },
    { value: 'size', label: 'Size' },
  ];

  // Dynamic sub-type options based on selected token type
  const getTokenSubTypeOptions = (tokenType: TokenType): { value: TokenSubType; label: string }[] => {
    switch (tokenType) {
      case 'color':
        return [
          { value: 'background', label: 'Background' },
          { value: 'foreground', label: 'Foreground' },
        ];
      case 'spacing':
        return [
          { value: 'padding', label: 'Padding' },
          { value: 'margin', label: 'Margin' },
          { value: 'gap', label: 'Gap' },
        ];
      case 'size':
        return [
          { value: 'font-size', label: 'Font Size' },
          { value: 'dimensions', label: 'Dimensions' },
        ];
      default:
        return [];
    }
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

         {/* URL field for main components */}
         {selectedNode.data.componentType === 'main-component' && (
           <div>
             <Label htmlFor="component-url" className="text-sm font-medium">
               Figma URL
             </Label>
             <Input
               id="component-url"
               value={selectedNode.data.url || ''}
               onChange={(e) => handleUrlChange(e.target.value)}
               placeholder="https://figma.com/..."
               className="mt-1"
               type="url"
             />
             <p className="text-xs text-muted-foreground mt-1">
               Link to this component in Figma or other design tool
             </p>
           </div>
         )}

         {/* Token-specific fields */}
        {selectedNode.data.componentType === 'token' && (
          <div className="border-t border-border pt-4 space-y-4">
            <div>
              <Label htmlFor="token-type" className="text-sm font-medium">
                Token Type
              </Label>
              <Select
                value={selectedNode.data.tokenType || ''}
                onValueChange={handleTokenTypeChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select token type" />
                </SelectTrigger>
                <SelectContent>
                  {tokenTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNode.data.tokenType && getTokenSubTypeOptions(selectedNode.data.tokenType).length > 0 && (
              <div className="ml-4">
                <Label htmlFor="token-subtype" className="text-sm font-medium text-muted-foreground">
                  {selectedNode.data.tokenType === 'color' ? 'Color Usage' : 
                   selectedNode.data.tokenType === 'spacing' ? 'Spacing Type' : 
                   selectedNode.data.tokenType === 'size' ? 'Size Type' : 'Subtype'}
                </Label>
                <Select
                  value={selectedNode.data.tokenSubType || ''}
                  onValueChange={handleTokenSubTypeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTokenSubTypeOptions(selectedNode.data.tokenType).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

       <div className="mt-auto pt-4 border-t border-border space-y-2">
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