import { Card } from '@/components/ui/card';

export const ConnectionLegend = () => {
  return (
    <Card className="absolute top-4 right-4 p-4 bg-background/95 backdrop-blur-sm border shadow-lg z-10">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Connection Types</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-0.5 rounded"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          />
          <span className="text-xs text-muted-foreground">Component to Variant</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-0.5 rounded"
            style={{ backgroundColor: 'hsl(var(--muted-foreground))' }}
          />
          <span className="text-xs text-muted-foreground">Component Relationships</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-0.5 rounded"
            style={{ backgroundColor: 'hsl(var(--component-token))' }}
          />
          <span className="text-xs text-muted-foreground">Token Usage</span>
        </div>
      </div>
    </Card>
  );
};