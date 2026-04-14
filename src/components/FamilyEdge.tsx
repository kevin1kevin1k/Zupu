import type { EdgeProps } from "@xyflow/react";

type FamilyEdgeData = {
  parentIds: string[];
  childIds: string[];
  parentCenters: number[];
  childCenters: number[];
  familyCenterX: number;
  parentBottomY: number;
  parentJoinY: number;
  childBusY: number;
  childTopY: number;
};

export function FamilyEdge({ data, id }: EdgeProps) {
  const family = data as FamilyEdgeData | undefined;

  if (!family) {
    return null;
  }

  const segments: string[] = [];
  const parentCenters = [...family.parentCenters].sort((left, right) => left - right);
  const childCenters = [...family.childCenters].sort((left, right) => left - right);
  const busStartX = Math.min(family.familyCenterX, ...childCenters);
  const busEndX = Math.max(family.familyCenterX, ...childCenters);

  if (parentCenters.length === 1) {
    segments.push(
      `M ${family.familyCenterX} ${family.parentBottomY} L ${family.familyCenterX} ${family.childBusY}`,
    );
  } else {
    for (const parentCenter of parentCenters) {
      segments.push(
        `M ${parentCenter} ${family.parentBottomY} L ${parentCenter} ${family.parentJoinY}`,
      );
    }

    segments.push(
      `M ${parentCenters[0]} ${family.parentJoinY} L ${parentCenters[parentCenters.length - 1]} ${family.parentJoinY}`,
    );
    segments.push(
      `M ${family.familyCenterX} ${family.parentJoinY} L ${family.familyCenterX} ${family.childBusY}`,
    );
  }

  if (busEndX > busStartX) {
    segments.push(`M ${busStartX} ${family.childBusY} L ${busEndX} ${family.childBusY}`);
  }

  for (const childCenter of childCenters) {
    segments.push(`M ${childCenter} ${family.childBusY} L ${childCenter} ${family.childTopY}`);
  }

  return (
    <>
      {segments.map((segment, index) => (
        <path
          d={segment}
          fill="none"
          key={`${id}-${index}`}
        />
      ))}
    </>
  );
}
