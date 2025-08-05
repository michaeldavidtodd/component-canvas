import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ArrowRight, ArrowLeft, Sparkles, MessageCircleCode, History, SquareArrowOutUpRight, ExternalLink, Component, Layers, Square, Palette, Copy } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import './OnboardingFlow.css';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Component Library Planner!',
    description: '',
    content: (
      <div className="space-y-4">
        {/* <div className="flex items-center justify-center">
          <div className="w-[300px] h-40 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <ReactFlow
              nodes={[
                {
                  id: '1',
                  type: 'default',
                  position: { x: 143, y: 10 },
                  width: 150,
                  data: { 
                    label: (
                      <div className="flex flex-row items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                          </div>
                        </div>
                        <div className="text-xs text-white font-medium">Component</div>
                      </div>
                    )
                  },
                  style: { 
                    background: '#1e293b', 
                    border: '2px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
                },
                {
                  id: '2',
                  type: 'default',
                  position: { x: 80, y: 100 },
                  width: 120,
                  data: { 
                    label: (
                      <div className="flex flex-row items-center gap-3">
                        <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-0.5">
                            <div className="w-4 h-1.5 bg-white rounded-sm"></div>
                            <div className="w-4 h-1.5 bg-white rounded-sm opacity-80"></div>
                            <div className="w-4 h-1.5 bg-white rounded-sm opacity-60"></div>
                          </div>
                        </div>
                        <div className="text-xs text-white font-medium">Variant</div>
                      </div>
                    )
                  },
                  style: { 
                    background: '#1e293b', 
                    border: '2px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
                },
                {
                  id: '3',
                  type: 'default',
                  position: { x: 235, y: 100 },
                  width: 120,
                  data: { 
                    label: (
                      <div className="flex flex-row items-center gap-3">
                        <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-0.5">
                            <div className="w-4 h-1.5 bg-white rounded-sm"></div>
                            <div className="w-4 h-1.5 bg-white rounded-sm opacity-80"></div>
                            <div className="w-4 h-1.5 bg-white rounded-sm opacity-60"></div>
                          </div>
                        </div>
                        <div className="text-xs text-white font-medium">Variant</div>
                      </div>
                    )
                  },
                  style: { 
                    background: '#1e293b', 
                    border: '2px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
                }
              ]}
              edges={[
                { 
                  id: 'e1-2', 
                  source: '1', 
                  target: '2',
                  style: { stroke: '#a855f7', strokeWidth: 2 }
                },
                { 
                  id: 'e1-3', 
                  source: '1', 
                  target: '3',
                  style: { stroke: '#a855f7', strokeWidth: 2 }
                }
              ]}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              preventScrolling={true}
              style={{ background: 'transparent' }}
            >
              <Background color="#334155" gap={20} size={1} />
            </ReactFlow>
          </div>
        </div> */}
        <div className="flex items-center justify-center gap-4">
          <Component className="w-16 h-16 text-purple-500" />
          <Layers className="w-16 h-16 text-blue-500" />
          <Square className="w-16 h-16 text-green-500" />
          <Palette className="w-16 h-16 text-yellow-500" />
          <Copy className="w-16 h-16 text-orange-500" />
        </div>
        <p className="text-center text-balance text-sm">
          Create node-based diagrams  designed for Figma component library relationships. Track changes, and share your designs with your team.
        </p>
      </div>
    ),
    highlight: null
  },
  {
    id: 'smart-layout',
    title: 'Smart Auto Layout',
    description: 'Automatically organize your components as you build.',
    content: (
      <div className="space-y-4">
        {/* <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div> */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Updates layout structure as you make changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Maintains clean, readable layouts automatically</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Focuses view on newly added components</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Toggle "Auto Smart Layout" in the toolbar!</Badge>
      </div>
    ),
    highlight: 'smart-layout'
  },
  {
    id: 'version-history',
    title: 'Version History',
    description: 'Never lose your work and track every change.',
    content: (
      <div className="space-y-4">
        {/* <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <History className="w-8 h-8 text-white" />
          </div>
        </div> */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Automatic saves when changes are made</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Browse, preview, and restore previous versions</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">See exactly what changed when</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Click the History button to explore!</Badge>
      </div>
    ),
    highlight: 'version-history'
  },
  {
    id: 'sharing',
    title: 'Share Your Designs',
    description: 'Collaborate with your team effortlessly.',
    content: (
      <div className="space-y-4">
        {/* <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <SquareArrowOutUpRight className="w-8 h-8 text-white" />
          </div>
        </div> */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SquareArrowOutUpRight className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Generate public links instantly</span>
          </div>
          <div className="flex items-center gap-2">
            <SquareArrowOutUpRight className="w-4 h-4 text-purple-600" />
            <span className="text-sm">View-only access for stakeholders</span>
          </div>
          <div className="flex items-center gap-2">
            <SquareArrowOutUpRight className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Perfect for design reviews</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Look for the share button in the toolbar!</Badge>
      </div>
    ),
    highlight: 'sharing'
  },
  {
    id: 'support-feedback',
    title: 'Support & Feedback',
    description: 'Your feedback helps us improve this tool for everyone. We appreciate every contribution!',
    content: (
      <div className="space-y-4">
        {/* <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <MessageCircleCode className="w-8 h-8 text-white" />
          </div>
        </div> */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageCircleCode className="w-4 h-4 text-orange-600" />
            <span className="text-sm">Found a bug or have a feature request?</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircleCode className="w-4 h-4 text-orange-600" />
            <span className="text-sm">Want to contribute to the project?</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircleCode className="w-4 h-4 text-orange-600" />
            <span className="text-sm">Visit the GitHub page for support and feedback</span>
          </div>
        </div>
        <a href="https://github.com/michaeldavidtodd/fig-node-planner" target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline mt-4 inline-flex items-center gap-1 border border-orange-600/60 rounded-full px-3 py-1">Visit the GitHub page for support and feedback! <ExternalLink className="w-3 h-3" /></a>
        {/* <p className="text-center text-muted-foreground text-sm">
          Your feedback helps us improve this tool for everyone. We appreciate every contribution!
        </p> */}
      </div>
    ),
    highlight: null
  }
];

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  if (!isVisible) return null;

  return (
    <Drawer open={isVisible} onOpenChange={() => handleSkip()}>
      <DrawerContent variant="dialog">
        <div className={`md:px-6 md:py-4 h-full flex flex-col`}>
          <div className="flex items-center justify-between mb-2 px-4">
            <div className="flex gap-1">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
          
          <DrawerHeader className={isFirstStep ? "flex flex-col items-center" : ""}>
            <DrawerTitle className="text-xl">{currentStepData.title}</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground text-balance">{currentStepData.description}</DrawerDescription>
          </DrawerHeader>
          
          <div className={`px-4 pb-4 space-y-6 flex-1 flex flex-col justify-between ${isFirstStep ? 'text-center' : ''}`}>
            {currentStepData.content}
            
            <div className="flex items-center justify-between">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />
              
              <div className="flex gap-2">
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip tour
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="flex items-center gap-1"
                >
                  <span className="hidden md:block">{isLastStep ? 'Get Started' : onboardingSteps[currentStep + 1]?.title || 'Next'}</span>
                  <span className="block md:hidden">Next</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};