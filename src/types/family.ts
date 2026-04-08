export type Gender = "male" | "female" | "other";

export type RelationshipType = "spouse" | "parent-child";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  photoUrl?: string;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
}

export interface FamilyTreeDocument {
  version: 1;
  exportedAt?: string;
  people: Person[];
  relationships: Relationship[];
}
