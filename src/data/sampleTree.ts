import type { FamilyTreeDocument } from "../types/family";

export const sampleTree: FamilyTreeDocument = {
  version: 1,
  people: [
    { id: "p-grandpa", name: "王大山", gender: "male" },
    { id: "p-grandma", name: "林春梅", gender: "female" },
    { id: "p-father", name: "王志明", gender: "male" },
    { id: "p-mother", name: "陳雅惠", gender: "female" },
    { id: "p-user", name: "王小華", gender: "female" },
    { id: "p-brother", name: "王小宇", gender: "male" }
  ],
  relationships: [
    {
      id: "r-grandparents",
      type: "spouse",
      fromPersonId: "p-grandpa",
      toPersonId: "p-grandma"
    },
    {
      id: "r-parents",
      type: "spouse",
      fromPersonId: "p-father",
      toPersonId: "p-mother"
    },
    {
      id: "r-grandpa-father",
      type: "parent-child",
      fromPersonId: "p-grandpa",
      toPersonId: "p-father"
    },
    {
      id: "r-grandma-father",
      type: "parent-child",
      fromPersonId: "p-grandma",
      toPersonId: "p-father"
    },
    {
      id: "r-father-user",
      type: "parent-child",
      fromPersonId: "p-father",
      toPersonId: "p-user"
    },
    {
      id: "r-mother-user",
      type: "parent-child",
      fromPersonId: "p-mother",
      toPersonId: "p-user"
    },
    {
      id: "r-father-brother",
      type: "parent-child",
      fromPersonId: "p-father",
      toPersonId: "p-brother"
    },
    {
      id: "r-mother-brother",
      type: "parent-child",
      fromPersonId: "p-mother",
      toPersonId: "p-brother"
    }
  ]
};
