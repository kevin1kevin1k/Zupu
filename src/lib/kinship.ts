import type { Person, Relationship } from "../types/family";

function getSpouseId(
  personId: string,
  relationships: Relationship[],
): string | null {
  const relationship = relationships.find((candidate) => {
    if (candidate.type !== "spouse") {
      return false;
    }

    return (
      candidate.fromPersonId === personId || candidate.toPersonId === personId
    );
  });

  if (!relationship) {
    return null;
  }

  return relationship.fromPersonId === personId
    ? relationship.toPersonId
    : relationship.fromPersonId;
}

function getParentIds(personId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter(
      (relationship) =>
        relationship.type === "parent-child" &&
        relationship.toPersonId === personId,
    )
    .map((relationship) => relationship.fromPersonId);
}

function getChildIds(personId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter(
      (relationship) =>
        relationship.type === "parent-child" &&
        relationship.fromPersonId === personId,
    )
    .map((relationship) => relationship.toPersonId);
}

function sharesParent(
  firstPersonId: string,
  secondPersonId: string,
  relationships: Relationship[],
): boolean {
  const firstParentIds = new Set(getParentIds(firstPersonId, relationships));
  const secondParentIds = getParentIds(secondPersonId, relationships);

  return secondParentIds.some((parentId) => firstParentIds.has(parentId));
}

function labelByGender(
  gender: Person["gender"] | undefined,
  maleLabel: string,
  femaleLabel: string,
): string {
  if (gender === "male") {
    return maleLabel;
  }

  if (gender === "female") {
    return femaleLabel;
  }

  return "暫不支援";
}

function resolveParentSiblingLabel(
  parent: Person,
  parentSibling: Person,
  parentIndex: number,
  parentSiblingIndex: number,
): string {
  if (parent.gender === "male") {
    if (parentSibling.gender === "male") {
      return parentSiblingIndex < parentIndex ? "伯父" : "叔叔";
    }

    if (parentSibling.gender === "female") {
      return "姑姑";
    }

    return "暫不支援";
  }

  if (parent.gender === "female") {
    if (parentSibling.gender === "male") {
      return "舅舅";
    }

    if (parentSibling.gender === "female") {
      return "阿姨";
    }
  }

  return "暫不支援";
}

function resolveParentSiblingSpouseLabel(
  parent: Person,
  parentSibling: Person,
  parentSiblingSpouse: Person,
  parentIndex: number,
  parentSiblingIndex: number,
): string {
  if (parent.gender === "male") {
    if (parentSibling.gender === "male") {
      if (parentSiblingSpouse.gender !== "female") {
        return "暫不支援";
      }

      return parentSiblingIndex < parentIndex ? "伯母" : "嬸嬸";
    }

    if (parentSibling.gender === "female") {
      return parentSiblingSpouse.gender === "male" ? "姑丈" : "暫不支援";
    }
  }

  if (parent.gender === "female") {
    if (parentSibling.gender === "male") {
      return parentSiblingSpouse.gender === "female" ? "舅媽" : "暫不支援";
    }

    if (parentSibling.gender === "female") {
      return parentSiblingSpouse.gender === "male" ? "姨丈" : "暫不支援";
    }
  }

  return "暫不支援";
}

export function resolveKinshipLabel(
  basePersonId: string,
  targetPersonId: string,
  people: Person[],
  relationships: Relationship[],
): string {
  if (basePersonId === targetPersonId) {
    return "本人";
  }

  const personById = new Map(people.map((person) => [person.id, person]));
  const personIndexById = new Map(people.map((person, index) => [person.id, index]));
  const basePerson = personById.get(basePersonId);
  const targetPerson = personById.get(targetPersonId);

  if (!basePerson || !targetPerson) {
    return "暫不支援";
  }

  const spouseId = getSpouseId(basePersonId, relationships);

  if (spouseId === targetPersonId) {
    return labelByGender(targetPerson.gender, "丈夫", "妻子");
  }

  const parentIds = new Set(getParentIds(basePersonId, relationships));

  if (parentIds.has(targetPersonId)) {
    return labelByGender(targetPerson.gender, "父親", "母親");
  }

  const childIds = new Set(getChildIds(basePersonId, relationships));

  if (childIds.has(targetPersonId)) {
    return labelByGender(targetPerson.gender, "兒子", "女兒");
  }

  const targetParentIds = new Set(getParentIds(targetPersonId, relationships));
  const sharedParentIds = [...parentIds].filter((parentId) => targetParentIds.has(parentId));

  if (sharedParentIds.length > 0) {
    const baseIndex = personIndexById.get(basePersonId) ?? 0;
    const targetIndex = personIndexById.get(targetPersonId) ?? 0;

    if (targetIndex < baseIndex) {
      return labelByGender(targetPerson.gender, "哥哥", "姊姊");
    }

    return labelByGender(targetPerson.gender, "弟弟", "妹妹");
  }

  const grandParentIds = new Set(
    [...parentIds].flatMap((parentId) => getParentIds(parentId, relationships)),
  );

  if (grandParentIds.has(targetPersonId)) {
    return labelByGender(targetPerson.gender, "祖父", "祖母");
  }

  const grandChildIds = new Set(
    [...childIds].flatMap((childId) => getChildIds(childId, relationships)),
  );

  if (grandChildIds.has(targetPersonId)) {
    return labelByGender(targetPerson.gender, "孫子", "孫女");
  }

  for (const parentId of parentIds) {
    const parent = personById.get(parentId);

    if (!parent) {
      continue;
    }

    const parentIndex = personIndexById.get(parentId) ?? 0;
    const parentSiblingIds = people
      .filter((person) => person.id !== parentId && sharesParent(parentId, person.id, relationships))
      .map((person) => person.id);

    for (const parentSiblingId of parentSiblingIds) {
      const parentSibling = personById.get(parentSiblingId);

      if (!parentSibling) {
        continue;
      }

      const parentSiblingIndex = personIndexById.get(parentSiblingId) ?? 0;

      if (targetPersonId === parentSiblingId) {
        return resolveParentSiblingLabel(
          parent,
          parentSibling,
          parentIndex,
          parentSiblingIndex,
        );
      }

      if (getSpouseId(parentSiblingId, relationships) === targetPersonId) {
        return resolveParentSiblingSpouseLabel(
          parent,
          parentSibling,
          targetPerson,
          parentIndex,
          parentSiblingIndex,
        );
      }
    }
  }

  if (spouseId) {
    const spouseParentIds = new Set(getParentIds(spouseId, relationships));

    if (spouseParentIds.has(targetPersonId)) {
      if (basePerson.gender === "male") {
        return labelByGender(targetPerson.gender, "岳父", "岳母");
      }

      if (basePerson.gender === "female") {
        return labelByGender(targetPerson.gender, "公公", "婆婆");
      }
    }
  }

  return "暫不支援";
}
