import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';

export default function SimpleDeleteEdge(props: any) {
  console.log('SimpleDeleteEdge is rendering!', props.id);
  
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath(props);

  return (
    <>
      <BaseEdge path={edgePath} {...props} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <button
            style={{
              width: '20px',
              height: '20px',
              background: 'red',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
            }}
            onClick={() => {
              console.log('Delete clicked!', props.id);
              setEdges((edges) => edges.filter((edge) => edge.id !== props.id));
            }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}