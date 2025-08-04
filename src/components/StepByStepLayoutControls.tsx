import React from 'react';
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
  RotateCcw
} from 'lucide-react';

interface StepByStepLayoutControlsProps {
  onExecuteStep: (stepId: string) => void;
  completedSteps: Set<string>;
  onReset: () => void;
}

const layoutSteps = [
  {
    id: 'hierarchy-rows',
    title: 'Organize by Hierarchy',
    description: 'Divide nodes into rows based on their level in the component tree',
    icon: Layers,
    color: 'bg-blue-500'
  },
  {
    id: 'proximity-order',
    title: 'Order by Proximity',
    description: 'Arrange nodes within each row based on proximity to their parent',
    icon: ArrowUpDown,
    color: 'bg-green-500'
  },
  {
    id: 'apply-spacing',
    title: 'Apply Node Spacing',
    description: 'Add proper spacing between nodes within sibling groups',
    icon: SeparatorHorizontal,
    color: 'bg-purple-500'
  },
  {
    id: 'shift-parents',
    title: 'Shift Parent Positions',
    description: 'Move parent nodes to better center over their child groups',
    icon: Move,
    color: 'bg-orange-500'
  },
  {
    id: 'center-trees',
    title: 'Center Trees',
    description: 'Center each component tree while maintaining relative spacing',
    icon: AlignCenter,
    color: 'bg-pink-500'
  }
];

export function StepByStepLayoutControls({ 
  onExecuteStep, 
  completedSteps, 
  onReset 
}: StepByStepLayoutControlsProps) {
  return (
    <Card className="w-80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Layout Steps</CardTitle>
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
                      <span className="font-medium">{index + 1}. {step.title}</span>
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
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