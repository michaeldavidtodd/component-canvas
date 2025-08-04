export type ComponentType = 
  | 'main-component'
  | 'variant'
  | 'sub-component'
  | 'token'
  | 'instance';

export type TokenType = 'color' | 'spacing' | 'corner-radius' | 'size';
export type TokenSubType = 
  | 'background' | 'foreground' // for color
  | 'padding' | 'margin' | 'gap' // for spacing  
  | 'font-size' | 'dimensions'; // for size

export interface ComponentNodeData extends Record<string, unknown> {
  label: string;
  componentType: ComponentType;
  description: string;
  // Token-specific fields
  tokenType?: TokenType;
  tokenSubType?: TokenSubType;
}