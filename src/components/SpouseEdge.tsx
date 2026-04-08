import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

const HEART_SIZE = 26;

export function SpouseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const startX = Math.min(sourceX, targetX);
  const endX = Math.max(sourceX, targetX);
  const centerX = (startX + endX) / 2;
  const centerY = (sourceY + targetY) / 2;
  const path = `M ${startX} ${centerY} L ${endX} ${centerY}`;

  return (
    <>
      <BaseEdge id={id} path={path} />
      <EdgeLabelRenderer>
        <div
          className="spouse-edge__heart"
          style={{
            transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
            width: `${HEART_SIZE}px`,
            height: `${HEART_SIZE}px`,
          }}
        >
          ♥
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
