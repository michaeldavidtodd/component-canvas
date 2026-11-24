import React, { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

export default function SimpleDeleteEdge(props: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [edgePath, labelX, labelY] = getBezierPath(props);

  // The canvas lock (Controls) clears `selectable`, so treat that as read-only.
  const isLocked = !props.selectable;
  const showButton = !isLocked && (isHovered || props.selected);

  useEffect(() => {
    if (isLocked) setIsHovered(false);
  }, [isLocked]);

  const handleMouseEnter = () => {
    if (isLocked) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  // Only pass safe props to BaseEdge. Selected edges get a thicker stroke so
  // the selection is as obvious as it is on nodes; the semantic edge color is
  // kept so the relationship type stays readable.
  const { style } = props;
  const edgeStyle = props.selected ? { ...style, strokeWidth: 3 } : style;

  return (
    <>
      <BaseEdge path={edgePath} style={edgeStyle} />
      {/* Wide invisible hit area for stable hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={40}
        style={{ cursor: isLocked ? 'default' : 'pointer', pointerEvents: isLocked ? 'none' : 'all' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {showButton && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
              padding: '8px', // Add padding to increase hover area
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="w-7 h-7 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full flex items-center justify-center border-2 border-background shadow-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setEdges((edges) => edges.filter((edge) => edge.id !== props.id));
              }}
              aria-label="Delete connection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}