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
