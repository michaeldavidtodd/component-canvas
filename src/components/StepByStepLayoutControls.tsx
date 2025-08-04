import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  ArrowUpDown, 
  SeparatorHorizontal, 
  Move, 
  AlignCenter,
  RotateCcw,
  GripVertical,
  Shuffle
} from 'lucide-react';

interface StepByStepLayoutControlsProps {
  onExecuteStep: (stepId: string) => void;
  completedSteps: Set<string>;
  onReset: () => void;
  onRandomize: () => void;
}

const layoutSteps = [
  {
    id: 'hierarchy-rows',
    title: 'Organize by Hierarchy',
    description: 'Set Y positions by hierarchy level, keeping current X positions intact',
    icon: Layers,
    color: 'bg-blue-500'
  },
  {
    id: 'proximity-order',
    title: 'Group Siblings',
    description: 'Group siblings horizontally while maintaining hierarchy levels from step 1',
    icon: ArrowUpDown,
    color: 'bg-green-500'
  },
  {
    id: 'center-parents-safe',
    title: 'Center Parents (Safe)',
    description: 'Center parent nodes over children while preventing nodes from getting too close',
    icon: AlignCenter,
    color: 'bg-purple-500'
  }
];

export function StepByStepLayoutControls({ 
  onExecuteStep, 
  completedSteps, 
  onReset,
  onRandomize
}: StepByStepLayoutControlsProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <Card 
      ref={dragRef}
      className="w-80 shadow-lg border-2"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Layout Steps</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRandomize}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Randomize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Execute layout steps one at a time to see their individual effects
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {layoutSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.has(step.id);
          
          return (
            <div key={step.id} className="space-y-2">
              <Button
                variant={isCompleted ? "default" : "outline"}
                onClick={() => onExecuteStep(step.id)}
                className="w-full justify-start text-left h-auto p-4"
              >
                <div className="flex items-start gap-3 w-full">
                  <div className={`rounded-full p-2 ${step.color} text-white flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-left break-words">{index + 1}. {step.title}</span>
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-left break-words whitespace-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Button>
              
              {index < layoutSteps.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          );
        })}
        
        <Separator className="my-4" />
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Tips:</strong></p>
          <p>• Execute steps in order for best results</p>
          <p>• Click any step multiple times to re-apply</p>
          <p>• Use Reset to start over</p>
        </div>
      </CardContent>
    </Card>
  );
}