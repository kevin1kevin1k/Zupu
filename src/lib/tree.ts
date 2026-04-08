import type { Edge } from "@xyflow/react";
import type { PersonFlowNode } from "../components/PersonNode";
import type { FamilyTreeDocument, Gender, Person, Relationship } from "../types/family";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;
const RANK_SPACING = 184;
const TOP_PADDING = 72;
const SPOUSE_GAP = 28;
const CLUSTER_GAP = 72;

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
    type: "smoothstep",
    label: relationship.type === "spouse" ? "配偶" : undefined,
    animated: relationship.type === "parent-child",
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
  generation: number;
  sortIndex: number;
  parentIds: string[];
  parentSignature: string | null;
  width: number;
};

type LayoutCluster = {
  id: string;
  blocks: LayoutBlock[];
  sortIndex: number;
  desiredCenterX: number | null;
  width: number;
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
  const blocksByGeneration = groupBy(blocks, (block) => block.generation);
  const centerXByPersonId = new Map<string, number>();

  for (const generation of [...blocksByGeneration.keys()].sort((left, right) => left - right)) {
    const generationBlocks = blocksByGeneration.get(generation) ?? [];
    const clusters = buildLayoutClusters(
      generationBlocks,
      centerXByPersonId,
      personOrderById,
    );
    const clusterCenters = placeClusters(clusters);

    for (const cluster of clusters) {
      const clusterCenter = clusterCenters.get(cluster.id) ?? 0;
      let cursor = clusterCenter - cluster.width / 2;

      for (const block of cluster.blocks) {
        const blockStart = cursor;
        const blockCenters = layoutBlockMembers(block, blockStart);

        for (const [personId, centerX] of blockCenters) {
          centerXByPersonId.set(personId, centerX);
        }

        cursor += block.width + CLUSTER_GAP;
      }
    }
  }

  return centerXByPersonId;
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

function buildLayoutClusters(
  generationBlocks: LayoutBlock[],
  centerXByPersonId: Map<string, number>,
  personOrderById: Map<string, number>,
): LayoutCluster[] {
  const blocksByClusterId = new Map<string, LayoutBlock[]>();

  for (const block of generationBlocks) {
    const clusterId = block.parentSignature ?? `standalone:${block.id}`;
    const clusterBlocks = blocksByClusterId.get(clusterId) ?? [];

    clusterBlocks.push(block);
    blocksByClusterId.set(clusterId, clusterBlocks);
  }

  return [...blocksByClusterId.entries()].map(([clusterId, clusterBlocks]) => {
    const orderedBlocks = [...clusterBlocks].sort(
      (left, right) => left.sortIndex - right.sortIndex,
    );
    const anchorParentIds = orderedBlocks[0]?.parentIds ?? [];
    const parentCenters = anchorParentIds
      .map((parentId) => centerXByPersonId.get(parentId))
      .filter((value): value is number => typeof value === "number");
    const desiredCenterX =
      parentCenters.length > 0
        ? parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length
        : null;
    const width =
      orderedBlocks.reduce((sum, block) => sum + block.width, 0) +
      Math.max(0, orderedBlocks.length - 1) * CLUSTER_GAP;

    return {
      id: clusterId,
      blocks: orderedBlocks,
      sortIndex: Math.min(...orderedBlocks.map((block) => block.sortIndex)),
      desiredCenterX,
      width,
    } satisfies LayoutCluster;
  }).sort((left, right) => {
    if (left.desiredCenterX !== null && right.desiredCenterX !== null) {
      if (left.desiredCenterX !== right.desiredCenterX) {
        return left.desiredCenterX - right.desiredCenterX;
      }
    } else if (left.desiredCenterX !== null) {
      return -1;
    } else if (right.desiredCenterX !== null) {
      return 1;
    }

    return left.sortIndex - right.sortIndex;
  });
}

function placeClusters(clusters: LayoutCluster[]): Map<string, number> {
  const centerXByClusterId = new Map<string, number>();

  if (clusters.length === 0) {
    return centerXByClusterId;
  }

  const hasAnchoredCluster = clusters.some(
    (cluster) => cluster.desiredCenterX !== null,
  );
  let previousRight = Number.NEGATIVE_INFINITY;

  for (const cluster of clusters) {
    const fallbackCenter =
      previousRight === Number.NEGATIVE_INFINITY
        ? cluster.width / 2
        : previousRight + CLUSTER_GAP + cluster.width / 2;
    const desiredCenter = cluster.desiredCenterX ?? fallbackCenter;
    const minimumCenter =
      previousRight === Number.NEGATIVE_INFINITY
        ? desiredCenter
        : previousRight + CLUSTER_GAP + cluster.width / 2;
    const centerX = Math.max(desiredCenter, minimumCenter);

    centerXByClusterId.set(cluster.id, centerX);
    previousRight = centerX + cluster.width / 2;
  }

  if (!hasAnchoredCluster) {
    const leftMost =
      Math.min(
        ...clusters.map((cluster) => {
          const centerX = centerXByClusterId.get(cluster.id) ?? 0;
          return centerX - cluster.width / 2;
        }),
      ) ?? 0;
    const rightMost =
      Math.max(
        ...clusters.map((cluster) => {
          const centerX = centerXByClusterId.get(cluster.id) ?? 0;
          return centerX + cluster.width / 2;
        }),
      ) ?? 0;
    const shift = -((leftMost + rightMost) / 2);

    for (const cluster of clusters) {
      centerXByClusterId.set(
        cluster.id,
        (centerXByClusterId.get(cluster.id) ?? 0) + shift,
      );
    }
  }

  return centerXByClusterId;
}

function layoutBlockMembers(
  block: LayoutBlock,
  blockStart: number,
): Map<string, number> {
  const centerXByPersonId = new Map<string, number>();
  let cursor = blockStart;

  for (const personId of block.personIds) {
    centerXByPersonId.set(personId, cursor + NODE_WIDTH / 2);
    cursor += NODE_WIDTH + SPOUSE_GAP;
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
