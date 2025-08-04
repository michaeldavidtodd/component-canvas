import { Edge } from '@xyflow/react';

export const initialNodes = [
  {
    id: '1',
    type: 'component',
    position: { x: 250, y: 100 },
    data: {
      label: 'Button',
      componentType: 'main-component',
      description: 'Primary button component for user interactions',
    },
  },
  {
    id: '2',
    type: 'component',
    position: { x: 100, y: 250 },
    data: {
      label: 'Primary Button',
      componentType: 'variant',
      description: 'Primary variant of the button component',
    },
  },
  {
    id: '3',
    type: 'component',
    position: { x: 400, y: 250 },
    data: {
      label: 'Secondary Button',
      componentType: 'variant',
      description: 'Secondary variant of the button component',
    },
  },
  {
    id: '4',
    type: 'component',
    position: { x: 250, y: 400 },
    data: {
      label: 'Button Icon',
      componentType: 'sub-component',
      description: 'Icon element used within button components',
    },
  },
  {
    id: '5',
    type: 'component',
    position: { x: 600, y: 100 },
    data: {
      label: 'Primary Color',
      componentType: 'token',
      description: 'Primary brand color token',
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'straight',
    style: { stroke: 'hsl(258 100% 68%)' },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'straight',
    style: { stroke: 'hsl(258 100% 68%)' },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    type: 'straight',
    style: { stroke: 'hsl(216 8% 45%)' },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'straight',
    style: { stroke: 'hsl(216 8% 45%)' },
  },
  {
    id: 'e2-5',
    source: '2',
    target: '5',
    type: 'straight',
    style: { stroke: 'hsl(45 100% 68%)' },
  },
];