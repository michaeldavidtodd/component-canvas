export type ComponentType = 
  | 'main-component'
  | 'variant'
  | 'sub-component'
  | 'token'
  | 'instance';

export interface ComponentNodeData extends Record<string, unknown> {
  label: string;
  componentType: ComponentType;
  description: string;
}