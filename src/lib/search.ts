import type { Person, Relationship } from "../types/family";

export type SearchResult = {
  personId: string;
  name: string;
  summary: string;
};

export function buildSearchResults(
  people: Person[],
  relationships: Relationship[],
  query: string,
): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const parentChildRelationships = relationships.filter(
    (relationship) => relationship.type === "parent-child",
  );

  const results = people.map((person, index) => {
    const normalizedName = person.name.toLocaleLowerCase();
    const spouseId = relationships.find((relationship) => {
      if (relationship.type !== "spouse") {
        return false;
      }

      return (
        relationship.fromPersonId === person.id ||
        relationship.toPersonId === person.id
      );
    });
    const spousePersonId = spouseId
      ? spouseId.fromPersonId === person.id
        ? spouseId.toPersonId
        : spouseId.fromPersonId
      : null;
    const spouseName = spousePersonId
      ? people.find((candidate) => candidate.id === spousePersonId)?.name ?? null
      : null;
    const childCount = new Set(
      parentChildRelationships
        .filter((relationship) => relationship.fromPersonId === person.id)
        .map((relationship) => relationship.toPersonId),
    ).size;

    const summaryParts = [
      spouseName ? `配偶：${spouseName}` : null,
      childCount > 0 ? `子女：${childCount}` : null,
    ].filter((part): part is string => Boolean(part));

    const matchPriority = normalizedQuery.length === 0
      ? 3
      : normalizedName === normalizedQuery
        ? 0
        : normalizedName.startsWith(normalizedQuery)
          ? 1
          : normalizedName.includes(normalizedQuery)
            ? 2
            : 99;

    return {
      personId: person.id,
      name: person.name,
      summary: summaryParts.length > 0 ? summaryParts.join("・") : "尚無關係資料",
      matchPriority,
      index,
    };
  });

  return results
    .filter((result) => normalizedQuery.length === 0 || result.matchPriority < 99)
    .sort((left, right) => {
      if (left.matchPriority !== right.matchPriority) {
        return left.matchPriority - right.matchPriority;
      }

      return left.index - right.index;
    })
    .map(({ personId, name, summary }) => ({
      personId,
      name,
      summary,
    }));
}
