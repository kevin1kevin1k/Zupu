import test from "node:test";
import assert from "node:assert/strict";
import { sampleTree } from "../src/data/sampleTree.ts";
import { buildFlowElements } from "../src/lib/tree.ts";

const NODE_WIDTH = 190;

function getCenterX(nodeId: string) {
  const { nodes } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const node = nodes.find((candidate) => candidate.id === nodeId);

  assert.ok(node, `expected node ${nodeId} to exist`);
  return node.position.x + NODE_WIDTH / 2;
}

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
