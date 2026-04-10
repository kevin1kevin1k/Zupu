import type { Edge } from "@xyflow/react";
import type { PersonFlowNode } from "../components/PersonNode";
import type { FamilyTreeDocument, Gender, Person, Relationship } from "../types/family";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;
const RANK_SPACING = 184;
const TOP_PADDING = 72;
const SPOUSE_GAP = 28;
const CLUSTER_GAP = 72;
const MIN_SAME_LEVEL_GAP = 72;
const HALF_NODE_WIDTH = NODE_WIDTH / 2;
const PARTNER_CENTER_DISTANCE = NODE_WIDTH + SPOUSE_GAP;
const PARTNER_OUTER_EXTENT = PARTNER_CENTER_DISTANCE + HALF_NODE_WIDTH;
const SIBLING_GAP = NODE_WIDTH + CLUSTER_GAP;

export function createBlankPerson(name: string, gender: Gender): Person {
  return {
    id: crypto.randomUUID(),
    name,
    gender,
  };
}

export function createRelationship(
  type: Relationship["type"],
  fromPersonId: string,
  toPersonId: string,
): Relationship {
  return {
    id: crypto.randomUUID(),
    type,
    fromPersonId,
    toPersonId,
  };
}

export function getDocumentExport(
  people: Person[],
  relationships: Relationship[],
): FamilyTreeDocument {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    people,
    relationships,
  };
}

export function parseImportedDocument(input: string): FamilyTreeDocument {
  const parsed = JSON.parse(input) as Partial<FamilyTreeDocument>;

  if (!Array.isArray(parsed.people) || !Array.isArray(parsed.relationships)) {
    throw new Error("匯入格式錯誤：缺少 people 或 relationships 陣列。");
  }

  return {
    version: 1,
    people: parsed.people.map(assertPerson),
    relationships: parsed.relationships.map(assertRelationship),
  };
}

function assertPerson(raw: unknown): Person {
  const person = raw as Person;

  if (
    !person ||
    typeof person.id !== "string" ||
    typeof person.name !== "string" ||
    !["male", "female", "other"].includes(person.gender)
  ) {
    throw new Error("匯入格式錯誤：人物資料不完整。");
  }

  return {
    id: person.id,
    name: person.name,
    gender: person.gender,
    photoUrl: person.photoUrl,
  };
}

function assertRelationship(raw: unknown): Relationship {
  const relationship = raw as Relationship;

  if (
    !relationship ||
    typeof relationship.id !== "string" ||
    !["spouse", "parent-child"].includes(relationship.type) ||
    typeof relationship.fromPersonId !== "string" ||
    typeof relationship.toPersonId !== "string"
  ) {
    throw new Error("匯入格式錯誤：關係資料不完整。");
  }

  return relationship;
}

export function buildFlowElements(
  people: Person[],
  relationships: Relationship[],
): {
  nodes: PersonFlowNode[];
  edges: Edge[];
} {
  const groupByPersonId = createSpouseGroups(people, relationships);
  const generationByGroupId = resolveGenerations(groupByPersonId, relationships);
  const personCenterXById = resolvePersonCenterX(
    people,
    relationships,
    groupByPersonId,
    generationByGroupId,
  );

  const nodes = people.map((person) => {
    const groupId = groupByPersonId.get(person.id) ?? person.id;
    const generation = generationByGroupId.get(groupId) ?? 0;
    const centeredY = TOP_PADDING + generation * RANK_SPACING;
    const centeredX = personCenterXById.get(person.id) ?? 0;

    return {
      id: person.id,
      type: "person",
      position: {
        x: centeredX - NODE_WIDTH / 2,
        y: centeredY - NODE_HEIGHT / 2,
      },
      data: {
        name: person.name,
        gender: person.gender,
        photoUrl: person.photoUrl,
      },
      draggable: false,
    } satisfies PersonFlowNode;
  });

  const edges = relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.fromPersonId,
    target: relationship.toPersonId,
    type: relationship.type === "spouse" ? "spouse" : "smoothstep",
    animated: false,
    className:
      relationship.type === "spouse" ? "relationship-edge relationship-edge--spouse" : "relationship-edge",
  }));

  return { nodes, edges };
}

export function getSpouseId(
  personId: string,
  relationships: Relationship[],
): string | null {
  const spouseRelationship = relationships.find((relationship) => {
    if (relationship.type !== "spouse") {
      return false;
    }

    return (
      relationship.fromPersonId === personId || relationship.toPersonId === personId
    );
  });

  if (!spouseRelationship) {
    return null;
  }

  return spouseRelationship.fromPersonId === personId
    ? spouseRelationship.toPersonId
    : spouseRelationship.fromPersonId;
}

export function getNextPersonName(prefix: string, people: Person[]): string {
  return `${prefix} ${people.length + 1}`;
}

type LayoutBlock = {
  id: string;
  personIds: string[];
  anchorPersonId: string;
  familySignature: string;
  generation: number;
  sortIndex: number;
  parentIds: string[];
  parentSignature: string | null;
  width: number;
};

type SpouseSide = "left" | "right" | null;

type MeasuredBlock = {
  spouseSide: SpouseSide;
  familyCenterOffset: number;
  layerLeftByDepth: Map<number, number>;
  layerRightByDepth: Map<number, number>;
  leftExtent: number;
  rightExtent: number;
  childPlacements: {
    blockId: string;
    offsetFromFamilyCenter: number;
    spouseSide: SpouseSide;
  }[];
};

function createSpouseGroups(
  people: Person[],
  relationships: Relationship[],
): Map<string, string> {
  const parentById = new Map<string, string>();

  for (const person of people) {
    parentById.set(person.id, person.id);
  }

  const find = (id: string): string => {
    const parent = parentById.get(id);

    if (!parent || parent === id) {
      return id;
    }

    const root = find(parent);
    parentById.set(id, root);
    return root;
  };

  const union = (leftId: string, rightId: string) => {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);

    if (leftRoot !== rightRoot) {
      parentById.set(rightRoot, leftRoot);
    }
  };

  for (const relationship of relationships) {
    if (relationship.type === "spouse") {
      union(relationship.fromPersonId, relationship.toPersonId);
    }
  }

  const groupByPersonId = new Map<string, string>();

  for (const person of people) {
    groupByPersonId.set(person.id, find(person.id));
  }

  return groupByPersonId;
}

function resolveGenerations(
  groupByPersonId: Map<string, string>,
  relationships: Relationship[],
): Map<string, number> {
  const generationByGroupId = new Map<string, number>();
  const childrenByGroupId = new Map<string, Set<string>>();
  const indegreeByGroupId = new Map<string, number>();

  for (const groupId of new Set(groupByPersonId.values())) {
    generationByGroupId.set(groupId, 0);
    indegreeByGroupId.set(groupId, 0);
    childrenByGroupId.set(groupId, new Set());
  }

  for (const relationship of relationships) {
    if (relationship.type !== "parent-child") {
      continue;
    }

    const parentGroupId = groupByPersonId.get(relationship.fromPersonId);
    const childGroupId = groupByPersonId.get(relationship.toPersonId);

    if (!parentGroupId || !childGroupId || parentGroupId === childGroupId) {
      continue;
    }

    const childGroups = childrenByGroupId.get(parentGroupId);

    if (!childGroups || childGroups.has(childGroupId)) {
      continue;
    }

    childGroups.add(childGroupId);
    indegreeByGroupId.set(
      childGroupId,
      (indegreeByGroupId.get(childGroupId) ?? 0) + 1,
    );
  }

  const pendingGroupIds = [...indegreeByGroupId.entries()]
    .filter(([, indegree]) => indegree === 0)
    .map(([groupId]) => groupId);

  while (pendingGroupIds.length > 0) {
    const groupId = pendingGroupIds.shift()!;
    const currentGeneration = generationByGroupId.get(groupId) ?? 0;
    const childGroups = childrenByGroupId.get(groupId) ?? new Set<string>();

    for (const childGroupId of childGroups) {
      generationByGroupId.set(
        childGroupId,
        Math.max(generationByGroupId.get(childGroupId) ?? 0, currentGeneration + 1),
      );

      const nextIndegree = (indegreeByGroupId.get(childGroupId) ?? 1) - 1;
      indegreeByGroupId.set(childGroupId, nextIndegree);

      if (nextIndegree === 0) {
        pendingGroupIds.push(childGroupId);
      }
    }
  }

  return generationByGroupId;
}

function resolvePersonCenterX(
  people: Person[],
  relationships: Relationship[],
  groupByPersonId: Map<string, string>,
  generationByGroupId: Map<string, number>,
): Map<string, number> {
  const personOrderById = new Map<string, number>(
    people.map((person, index) => [person.id, index]),
  );
  const parentIdsByPersonId = buildParentIdsByPersonId(people, relationships);
  const blocks = buildLayoutBlocks(
    people,
    groupByPersonId,
    generationByGroupId,
    parentIdsByPersonId,
    personOrderById,
  );
  const centerXByPersonId = new Map<string, number>();
  const childrenByBlockId = buildChildrenByBlockId(blocks);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const parentBlockIds = new Set<string>();

  for (const childBlocks of childrenByBlockId.values()) {
    for (const childBlock of childBlocks) {
      parentBlockIds.add(childBlock.id);
    }
  }

  const rootBlocks = blocks
    .filter((block) => !parentBlockIds.has(block.id))
    .sort((left, right) => left.sortIndex - right.sortIndex);

  const measuredBlockCache = new Map<string, MeasuredBlock>();

  const measureBlock = (
    blockId: string,
    spouseSide: SpouseSide,
  ): MeasuredBlock => {
    const cacheKey = `${blockId}:${spouseSide ?? "none"}`;
    const cached = measuredBlockCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const block = blockById.get(blockId);

    if (!block) {
      throw new Error(`layout block not found: ${blockId}`);
    }

    const localExtents = getBlockExtents(block, spouseSide);
    const familyCenterOffset = getFamilyCenterOffset(block, spouseSide);
    const layerLeftByDepth = new Map<number, number>([
      [0, -localExtents.leftExtent],
    ]);
    const layerRightByDepth = new Map<number, number>([
      [0, localExtents.rightExtent],
    ]);
    const childBlocks = [...(childrenByBlockId.get(blockId) ?? [])].sort(
      (left, right) => left.sortIndex - right.sortIndex,
    );

    const childPlacements: MeasuredBlock["childPlacements"] = [];
    let childClusterLeft = Number.POSITIVE_INFINITY;
    let childClusterRight = Number.NEGATIVE_INFINITY;

    if (childBlocks.length > 0) {
      const childMeasures = childBlocks.map((childBlock, index) => {
        const childSpouseSide = resolveSpouseSide(
          childBlock,
          index,
          childBlocks.length,
        );

        return {
          blockId: childBlock.id,
          spouseSide: childSpouseSide,
          measure: measureBlock(childBlock.id, childSpouseSide),
        };
      });

      const requiredSiblingSpacing = childMeasures.reduce(
        (maximumSpacing, childMeasure, index) => {
          if (index === 0) {
            return maximumSpacing;
          }

          const previousMeasure = childMeasures[index - 1]!.measure;
          const currentMeasure = childMeasure.measure;

          return Math.max(
            maximumSpacing,
            getRequiredCenterDistance(previousMeasure, currentMeasure),
          );
        },
        SIBLING_GAP,
      );

      for (const [index, childMeasure] of childMeasures.entries()) {
        const offsetFromFamilyCenter =
          (index - (childMeasures.length - 1) / 2) * requiredSiblingSpacing;

        childPlacements.push({
          blockId: childMeasure.blockId,
          offsetFromFamilyCenter,
          spouseSide: childMeasure.spouseSide,
        });

        childClusterLeft = Math.min(
          childClusterLeft,
          offsetFromFamilyCenter - childMeasure.measure.leftExtent,
        );
        childClusterRight = Math.max(
          childClusterRight,
          offsetFromFamilyCenter + childMeasure.measure.rightExtent,
        );

        mergeMeasuredLayers(
          layerLeftByDepth,
          layerRightByDepth,
          childMeasure.measure,
          familyCenterOffset + offsetFromFamilyCenter,
          1,
        );
      }
    }

    const subtreeLeft = childPlacements.length === 0
      ? -localExtents.leftExtent
      : Math.min(
          -localExtents.leftExtent,
          familyCenterOffset + childClusterLeft,
        );
    const subtreeRight = childPlacements.length === 0
      ? localExtents.rightExtent
      : Math.max(
          localExtents.rightExtent,
          familyCenterOffset + childClusterRight,
        );

    const measuredBlock = {
      spouseSide,
      familyCenterOffset,
      layerLeftByDepth,
      layerRightByDepth,
      leftExtent: -subtreeLeft,
      rightExtent: subtreeRight,
      childPlacements,
    } satisfies MeasuredBlock;

    measuredBlockCache.set(cacheKey, measuredBlock);
    return measuredBlock;
  };

  const assignBlockCenters = (
    blockId: string,
    anchorCenterX: number,
    spouseSide: SpouseSide,
  ) => {
    const block = blockById.get(blockId);

    if (!block) {
      throw new Error(`layout block not found: ${blockId}`);
    }

    const measuredBlock = measureBlock(blockId, spouseSide);
    const blockCenters = layoutAnchoredBlockMembers(
      block,
      anchorCenterX,
      spouseSide,
    );

    for (const [personId, centerX] of blockCenters) {
      centerXByPersonId.set(personId, centerX);
    }

    const familyCenterX = anchorCenterX + measuredBlock.familyCenterOffset;

    for (const childPlacement of measuredBlock.childPlacements) {
      assignBlockCenters(
        childPlacement.blockId,
        familyCenterX + childPlacement.offsetFromFamilyCenter,
        childPlacement.spouseSide,
      );
    }
  };

  if (rootBlocks.length === 0) {
    return centerXByPersonId;
  }

  const rootDescriptors = rootBlocks.map((block, index) => {
    const spouseSide = resolveSpouseSide(block, index, rootBlocks.length);
    const measure = measureBlock(block.id, spouseSide);

    return {
      block,
      spouseSide,
      measure,
    };
  });

  let previousRight = Number.NEGATIVE_INFINITY;
  const rootCenterByBlockId = new Map<string, number>();

  for (const [index, descriptor] of rootDescriptors.entries()) {
    if (index === 0) {
      rootCenterByBlockId.set(descriptor.block.id, 0);
      previousRight = descriptor.measure.rightExtent;
      continue;
    }

    const previousDescriptor = rootDescriptors[index - 1]!;
    const previousCenterX = rootCenterByBlockId.get(previousDescriptor.block.id) ?? 0;
    const centerDistance = Math.max(
      getRequiredCenterDistance(previousDescriptor.measure, descriptor.measure),
      previousDescriptor.measure.rightExtent +
        CLUSTER_GAP +
        descriptor.measure.leftExtent,
    );
    const centerX = previousCenterX + centerDistance;

    rootCenterByBlockId.set(descriptor.block.id, centerX);
    previousRight = centerX + descriptor.measure.rightExtent;
  }

  const leftMost = Math.min(
    ...rootDescriptors.map((descriptor) => {
      const centerX = rootCenterByBlockId.get(descriptor.block.id) ?? 0;

      return centerX - descriptor.measure.leftExtent;
    }),
  );
  const rightMost = Math.max(
    ...rootDescriptors.map((descriptor) => {
      const centerX = rootCenterByBlockId.get(descriptor.block.id) ?? 0;

      return centerX + descriptor.measure.rightExtent;
    }),
  );
  const layoutShift = -((leftMost + rightMost) / 2);

  for (const descriptor of rootDescriptors) {
    assignBlockCenters(
      descriptor.block.id,
      (rootCenterByBlockId.get(descriptor.block.id) ?? 0) + layoutShift,
      descriptor.spouseSide,
    );
  }

  return centerXByPersonId;
}

function mergeMeasuredLayers(
  layerLeftByDepth: Map<number, number>,
  layerRightByDepth: Map<number, number>,
  measuredBlock: MeasuredBlock,
  offsetX: number,
  depthOffset: number,
) {
  for (const [depth, left] of measuredBlock.layerLeftByDepth.entries()) {
    const targetDepth = depth + depthOffset;
    const shiftedLeft = left + offsetX;
    const existingLeft = layerLeftByDepth.get(targetDepth);

    layerLeftByDepth.set(
      targetDepth,
      existingLeft === undefined ? shiftedLeft : Math.min(existingLeft, shiftedLeft),
    );
  }

  for (const [depth, right] of measuredBlock.layerRightByDepth.entries()) {
    const targetDepth = depth + depthOffset;
    const shiftedRight = right + offsetX;
    const existingRight = layerRightByDepth.get(targetDepth);

    layerRightByDepth.set(
      targetDepth,
      existingRight === undefined ? shiftedRight : Math.max(existingRight, shiftedRight),
    );
  }
}

function getRequiredCenterDistance(
  leftBlock: MeasuredBlock,
  rightBlock: MeasuredBlock,
): number {
  let requiredDistance = 0;
  const allDepths = new Set<number>([
    ...leftBlock.layerRightByDepth.keys(),
    ...rightBlock.layerLeftByDepth.keys(),
  ]);

  for (const depth of allDepths) {
    const leftRight = leftBlock.layerRightByDepth.get(depth);
    const rightLeft = rightBlock.layerLeftByDepth.get(depth);

    if (leftRight === undefined || rightLeft === undefined) {
      continue;
    }

    requiredDistance = Math.max(
      requiredDistance,
      leftRight - rightLeft + MIN_SAME_LEVEL_GAP,
    );
  }

  return requiredDistance;
}

function buildParentIdsByPersonId(
  people: Person[],
  relationships: Relationship[],
): Map<string, string[]> {
  const parentIdsByPersonId = new Map<string, Set<string>>();

  for (const person of people) {
    parentIdsByPersonId.set(person.id, new Set());
  }

  for (const relationship of relationships) {
    if (relationship.type !== "parent-child") {
      continue;
    }

    parentIdsByPersonId.get(relationship.toPersonId)?.add(relationship.fromPersonId);
  }

  return new Map(
    [...parentIdsByPersonId.entries()].map(([personId, parentIds]) => [
      personId,
      [...parentIds],
    ]),
  );
}

function buildLayoutBlocks(
  people: Person[],
  groupByPersonId: Map<string, string>,
  generationByGroupId: Map<string, number>,
  parentIdsByPersonId: Map<string, string[]>,
  personOrderById: Map<string, number>,
): LayoutBlock[] {
  const peopleByGroupId = new Map<string, Person[]>();

  for (const person of people) {
    const groupId = groupByPersonId.get(person.id) ?? person.id;
    const groupPeople = peopleByGroupId.get(groupId) ?? [];

    groupPeople.push(person);
    peopleByGroupId.set(groupId, groupPeople);
  }

  return [...peopleByGroupId.entries()].map(([groupId, groupPeople]) => {
    const orderedPeople = [...groupPeople].sort(
      (left, right) =>
        (personOrderById.get(left.id) ?? 0) - (personOrderById.get(right.id) ?? 0),
    );
    const representativePerson =
      orderedPeople.find(
        (person) => (parentIdsByPersonId.get(person.id)?.length ?? 0) > 0,
      ) ?? orderedPeople[0];
    const parentIds = [
      ...(parentIdsByPersonId.get(representativePerson.id) ?? []),
    ].sort(
      (left, right) =>
        (personOrderById.get(left) ?? 0) - (personOrderById.get(right) ?? 0),
    );

    return {
      id: groupId,
      personIds: orderedPeople.map((person) => person.id),
      anchorPersonId: representativePerson.id,
      familySignature: orderedPeople.map((person) => person.id).join("|"),
      generation: generationByGroupId.get(groupId) ?? 0,
      sortIndex: Math.min(
        ...orderedPeople.map((person) => personOrderById.get(person.id) ?? 0),
      ),
      parentIds,
      parentSignature: parentIds.length > 0 ? parentIds.join("|") : null,
      width:
        orderedPeople.length * NODE_WIDTH +
        Math.max(0, orderedPeople.length - 1) * SPOUSE_GAP,
    } satisfies LayoutBlock;
  });
}

function buildChildrenByBlockId(
  blocks: LayoutBlock[],
): Map<string, LayoutBlock[]> {
  const childrenByBlockId = new Map<string, LayoutBlock[]>();
  const blockByFamilySignature = new Map(
    blocks.map((block) => [block.familySignature, block]),
  );

  for (const block of blocks) {
    if (!block.parentSignature) {
      continue;
    }

    let parentBlock = blockByFamilySignature.get(block.parentSignature);

    if (!parentBlock) {
      parentBlock = blocks.find((candidate) =>
        block.parentIds.every((parentId) => candidate.personIds.includes(parentId)),
      );
    }

    if (!parentBlock) {
      continue;
    }

    const childBlocks = childrenByBlockId.get(parentBlock.id) ?? [];
    childBlocks.push(block);
    childrenByBlockId.set(parentBlock.id, childBlocks);
  }

  for (const childBlocks of childrenByBlockId.values()) {
    childBlocks.sort((left, right) => left.sortIndex - right.sortIndex);
  }

  return childrenByBlockId;
}

function resolveSpouseSide(
  block: LayoutBlock,
  blockIndex: number,
  blockCount: number,
): "left" | "right" | null {
  if (block.personIds.length <= 1) {
    return null;
  }

  if (blockCount === 1) {
    return "right";
  }

  if (blockIndex < (blockCount - 1) / 2) {
    return "left";
  }

  return "right";
}

function getBlockExtents(
  block: LayoutBlock,
  spouseSide: "left" | "right" | null,
): {
  leftExtent: number;
  rightExtent: number;
} {
  if (block.personIds.length <= 1 || spouseSide === null) {
    return {
      leftExtent: HALF_NODE_WIDTH,
      rightExtent: HALF_NODE_WIDTH,
    };
  }

  if (spouseSide === "left") {
    return {
      leftExtent: PARTNER_OUTER_EXTENT,
      rightExtent: HALF_NODE_WIDTH,
    };
  }

  return {
    leftExtent: HALF_NODE_WIDTH,
    rightExtent: PARTNER_OUTER_EXTENT,
  };
}

function getFamilyCenterOffset(
  block: LayoutBlock,
  spouseSide: "left" | "right" | null,
): number {
  if (block.personIds.length <= 1 || spouseSide === null) {
    return 0;
  }

  return spouseSide === "left"
    ? -(PARTNER_CENTER_DISTANCE / 2)
    : PARTNER_CENTER_DISTANCE / 2;
}

function layoutAnchoredBlockMembers(
  block: LayoutBlock,
  anchorCenter: number,
  spouseSide: "left" | "right" | null,
): Map<string, number> {
  const centerXByPersonId = new Map<string, number>();
  const spouseIds = block.personIds.filter(
    (personId) => personId !== block.anchorPersonId,
  );

  centerXByPersonId.set(block.anchorPersonId, anchorCenter);

  if (spouseIds.length === 1 && spouseSide) {
    const spouseCenter =
      spouseSide === "left"
        ? anchorCenter - PARTNER_CENTER_DISTANCE
        : anchorCenter + PARTNER_CENTER_DISTANCE;

    centerXByPersonId.set(spouseIds[0], spouseCenter);
  }

  return centerXByPersonId;
}

function groupBy<T, TKey>(
  items: T[],
  getKey: (item: T) => TKey,
): Map<TKey, T[]> {
  const grouped = new Map<TKey, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const group = grouped.get(key) ?? [];

    group.push(item);
    grouped.set(key, group);
  }

  return grouped;
}
