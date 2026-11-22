// How far the canvas can zoom out. React Flow defaults to 0.5; Figma-style
// navigation needs a much wider range so large graphs can be seen at a glance.
export const MIN_ZOOM = 0.1;

export const FIT_VIEW_OPTIONS = {
  padding: 0.2,
  includeHiddenNodes: false,
  minZoom: MIN_ZOOM,
  maxZoom: 2,
};
