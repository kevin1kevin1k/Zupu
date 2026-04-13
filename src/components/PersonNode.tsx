import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Gender } from "../types/family";

type PersonNodeData = {
  name: string;
  gender: Gender;
  photoUrl?: string;
};

type PersonFlowNode = Node<PersonNodeData, "person">;

export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const genderClass = data.gender === "other" ? "unknown" : data.gender;

  return (
    <div
      className={`person-node person-node--${genderClass} ${selected ? "person-node--selected" : ""}`}
    >
      <Handle className="person-node__handle" position={Position.Top} type="target" />
      <div className="person-node__avatar">
        {data.photoUrl ? (
          <img alt={data.name} src={data.photoUrl} />
        ) : (
          <span>{data.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="person-node__content">
        <strong>{data.name}</strong>
      </div>
      <Handle className="person-node__handle" position={Position.Bottom} type="source" />
    </div>
  );
}

export type { PersonNodeData };
export type { PersonFlowNode };
