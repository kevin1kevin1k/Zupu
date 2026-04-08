import test from "node:test";
import assert from "node:assert/strict";
import { sampleTree } from "../src/data/sampleTree.ts";
import { buildFlowElements } from "../src/lib/tree.ts";
import type { FamilyTreeDocument } from "../src/types/family";

const NODE_WIDTH = 190;

function getCenterX(nodeId: string) {
  const { nodes } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const node = nodes.find((candidate) => candidate.id === nodeId);

  assert.ok(node, `expected node ${nodeId} to exist`);
  return node.position.x + NODE_WIDTH / 2;
}

function getCenterXFromDocument(document: FamilyTreeDocument, nodeId: string) {
  const { nodes } = buildFlowElements(document.people, document.relationships);
  const node = nodes.find((candidate) => candidate.id === nodeId);

  assert.ok(node, `expected node ${nodeId} to exist`);
  return node.position.x + NODE_WIDTH / 2;
}

const recursiveSampleTree: FamilyTreeDocument = {
  version: 1,
  people: [
    { id: "p-grandpa", name: "王大山", gender: "male" },
    { id: "p-grandma", name: "林春梅", gender: "female" },
    { id: "p-father", name: "王志明", gender: "male" },
    { id: "p-mother", name: "陳雅惠", gender: "female" },
    { id: "p-user", name: "王小華", gender: "female" },
    { id: "p-brother", name: "王小宇", gender: "male" },
    { id: "p-spouse-9", name: "配偶9", gender: "other" },
    { id: "p-user-child", name: "王王", gender: "male" },
    { id: "p-brother-child", name: "子女10", gender: "other" },
    { id: "p-user-child-spouse", name: "陳陳", gender: "female" },
  ],
  relationships: [
    { id: "r-grandparents", type: "spouse", fromPersonId: "p-grandpa", toPersonId: "p-grandma" },
    { id: "r-parents", type: "spouse", fromPersonId: "p-father", toPersonId: "p-mother" },
    { id: "r-brother-spouse", type: "spouse", fromPersonId: "p-brother", toPersonId: "p-spouse-9" },
    { id: "r-user-child-spouse", type: "spouse", fromPersonId: "p-user-child", toPersonId: "p-user-child-spouse" },
    { id: "r-grandpa-father", type: "parent-child", fromPersonId: "p-grandpa", toPersonId: "p-father" },
    { id: "r-grandma-father", type: "parent-child", fromPersonId: "p-grandma", toPersonId: "p-father" },
    { id: "r-father-user", type: "parent-child", fromPersonId: "p-father", toPersonId: "p-user" },
    { id: "r-mother-user", type: "parent-child", fromPersonId: "p-mother", toPersonId: "p-user" },
    { id: "r-father-brother", type: "parent-child", fromPersonId: "p-father", toPersonId: "p-brother" },
    { id: "r-mother-brother", type: "parent-child", fromPersonId: "p-mother", toPersonId: "p-brother" },
    { id: "r-user-user-child", type: "parent-child", fromPersonId: "p-user", toPersonId: "p-user-child" },
    { id: "r-brother-brother-child", type: "parent-child", fromPersonId: "p-brother", toPersonId: "p-brother-child" },
    { id: "r-spouse9-brother-child", type: "parent-child", fromPersonId: "p-spouse-9", toPersonId: "p-brother-child" },
  ],
};

test("parent-child edges are static solid connectors", () => {
  const { edges } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const parentChildEdges = edges.filter((edge) => edge.type === "smoothstep");

  assert.ok(parentChildEdges.length > 0);

  for (const edge of parentChildEdges) {
    assert.equal(edge.animated, false);
  }
});

test("a married child stays centered under that child's parents", () => {
  const grandparentsCenterX =
    (getCenterX("p-grandpa") + getCenterX("p-grandma")) / 2;
  const fatherCenterX = getCenterX("p-father");

  assert.equal(fatherCenterX, grandparentsCenterX);
});

test("siblings keep equal spacing and stay centered under the parents", () => {
  const fatherParentsCenterX =
    (getCenterX("p-father") + getCenterX("p-mother")) / 2;
  const userCenterX = getCenterX("p-user");
  const brotherCenterX = getCenterX("p-brother");
  const siblingsCenterX = (userCenterX + brotherCenterX) / 2;

  assert.equal(siblingsCenterX, fatherParentsCenterX);
  assert.equal(Math.abs(userCenterX - fatherParentsCenterX), Math.abs(brotherCenterX - fatherParentsCenterX));
});

test("deeper descendants recursively expand sibling spacing while keeping centers aligned", () => {
  const parentGenerationCenterX =
    (getCenterXFromDocument(recursiveSampleTree, "p-father") +
      getCenterXFromDocument(recursiveSampleTree, "p-mother")) / 2;
  const userCenterX = getCenterXFromDocument(recursiveSampleTree, "p-user");
  const brotherCenterX = getCenterXFromDocument(recursiveSampleTree, "p-brother");
  const siblingCenterX = (userCenterX + brotherCenterX) / 2;
  const userChildCenterX = getCenterXFromDocument(recursiveSampleTree, "p-user-child");
  const userChildSpouseCenterX = getCenterXFromDocument(recursiveSampleTree, "p-user-child-spouse");
  const brotherChildCenterX = getCenterXFromDocument(recursiveSampleTree, "p-brother-child");
  const brotherFamilyCenterX =
    (getCenterXFromDocument(recursiveSampleTree, "p-brother") +
      getCenterXFromDocument(recursiveSampleTree, "p-spouse-9")) / 2;

  assert.equal(siblingCenterX, parentGenerationCenterX);
  assert.equal(Math.abs(userCenterX - parentGenerationCenterX), Math.abs(brotherCenterX - parentGenerationCenterX));
  assert.equal(brotherChildCenterX, brotherFamilyCenterX);

  const userChildRight = userChildSpouseCenterX + NODE_WIDTH / 2;
  const brotherChildLeft = brotherChildCenterX - NODE_WIDTH / 2;

  assert.ok(
    brotherChildLeft >= userChildRight,
    "expected recursive subtree expansion to prevent cousin generation overlap",
  );
});
