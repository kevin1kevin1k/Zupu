import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sampleTree } from "../src/data/sampleTree.ts";
import { buildFlowElements, deletePersonFromTree } from "../src/lib/tree.ts";
import type { FamilyTreeDocument } from "../src/types/family";

const NODE_WIDTH = 190;
const SPOUSE_GAP = 28;
const MIN_SAME_LEVEL_GAP = 72;

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

function getHorizontalGapFromDocument(
  document: FamilyTreeDocument,
  leftNodeId: string,
  rightNodeId: string,
) {
  const leftCenterX = getCenterXFromDocument(document, leftNodeId);
  const rightCenterX = getCenterXFromDocument(document, rightNodeId);

  return rightCenterX - leftCenterX - NODE_WIDTH;
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

const sameLevelGapSampleTree: FamilyTreeDocument = {
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
    { id: "p-user-child-spouse", name: "陳陳", gender: "female" },
    { id: "p-user-child-11", name: "子女11", gender: "other" },
    { id: "p-user-child-12", name: "子女12", gender: "other" },
    { id: "p-brother-child-10", name: "子女10", gender: "other" },
    { id: "p-brother-child-13", name: "子女13", gender: "other" },
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
    { id: "r-user-user-child-11", type: "parent-child", fromPersonId: "p-user", toPersonId: "p-user-child-11" },
    { id: "r-user-user-child-12", type: "parent-child", fromPersonId: "p-user", toPersonId: "p-user-child-12" },
    { id: "r-brother-brother-child-10", type: "parent-child", fromPersonId: "p-brother", toPersonId: "p-brother-child-10" },
    { id: "r-spouse9-brother-child-10", type: "parent-child", fromPersonId: "p-spouse-9", toPersonId: "p-brother-child-10" },
    { id: "r-brother-brother-child-13", type: "parent-child", fromPersonId: "p-brother", toPersonId: "p-brother-child-13" },
    { id: "r-spouse9-brother-child-13", type: "parent-child", fromPersonId: "p-spouse-9", toPersonId: "p-brother-child-13" },
  ],
};

test("parent-child edges are static solid connectors", () => {
  const { edges } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const parentChildEdges = edges.filter((edge) => edge.type === "family");

  assert.ok(parentChildEdges.length > 0);

  for (const edge of parentChildEdges) {
    assert.equal(edge.animated, false);
  }
});

test("children with the same parents are grouped into one family edge", () => {
  const { edges } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const familyEdges = edges.filter((edge) => edge.type === "family");
  const familyEdgeData = familyEdges.map((edge) => {
    const data = edge.data as {
      parentIds: string[];
      childIds: string[];
    };

    return {
      parentIds: data.parentIds,
      childIds: data.childIds,
    };
  });

  assert.equal(familyEdges.length, 2);
  assert.deepEqual(
    familyEdgeData,
    [
      { parentIds: ["p-grandpa", "p-grandma"], childIds: ["p-father"] },
      { parentIds: ["p-father", "p-mother"], childIds: ["p-user", "p-brother"] },
    ],
  );
});

test("family edge geometry is included for custom bus rendering", () => {
  const { edges } = buildFlowElements(sampleTree.people, sampleTree.relationships);
  const familyEdge = edges.find((edge) => edge.type === "family");
  const data = familyEdge?.data as {
    parentIds: string[];
    childIds: string[];
    parentCenters: number[];
    childCenters: number[];
    familyCenterX: number;
    parentBottomY: number;
    parentJoinY: number;
    childBusY: number;
    childTopY: number;
  } | undefined;

  assert.ok(data, "expected a family edge with rendering geometry");
  assert.equal(data.parentIds.length, data.parentCenters.length);
  assert.equal(data.childIds.length, data.childCenters.length);
  assert.ok(typeof data.familyCenterX === "number");
  assert.ok(data.parentJoinY > data.parentBottomY);
  assert.ok(data.childTopY > data.childBusY);
});

test("family edges anchor married children by the child person instead of the spouse block", () => {
  const { edges } = buildFlowElements(recursiveSampleTree.people, recursiveSampleTree.relationships);
  const marriedChildFamilyEdge = edges.find((edge) => {
    if (edge.type !== "family") {
      return false;
    }

    const data = edge.data as { parentIds: string[]; childIds: string[] };
    return data.parentIds.join("|") === "p-brother|p-spouse-9";
  });

  assert.ok(marriedChildFamilyEdge, "expected family edge for the married child family");
  assert.deepEqual(
    (marriedChildFamilyEdge.data as { childIds: string[] }).childIds,
    ["p-brother-child"],
  );
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

test("non-spouse people on the same generation keep a larger minimum gap than spouses", () => {
  const cousinGap = getHorizontalGapFromDocument(
    sameLevelGapSampleTree,
    "p-user-child-12",
    "p-brother-child-10",
  );
  const spouseGap = getHorizontalGapFromDocument(
    sameLevelGapSampleTree,
    "p-user-child-spouse",
    "p-user-child",
  );
  const parentGenerationCenterX =
    (getCenterXFromDocument(sameLevelGapSampleTree, "p-father") +
      getCenterXFromDocument(sameLevelGapSampleTree, "p-mother")) / 2;
  const userCenterX = getCenterXFromDocument(sameLevelGapSampleTree, "p-user");
  const brotherCenterX = getCenterXFromDocument(sameLevelGapSampleTree, "p-brother");

  assert.ok(
    cousinGap >= MIN_SAME_LEVEL_GAP,
    `expected same-generation non-spouse gap to be at least ${MIN_SAME_LEVEL_GAP}, got ${cousinGap}`,
  );
  assert.ok(
    cousinGap > spouseGap,
    `expected non-spouse gap ${cousinGap} to be greater than spouse gap ${spouseGap}`,
  );
  assert.equal(spouseGap, SPOUSE_GAP);
  assert.equal(
    (userCenterX + brotherCenterX) / 2,
    parentGenerationCenterX,
  );
  assert.equal(
    Math.abs(userCenterX - parentGenerationCenterX),
    Math.abs(brotherCenterX - parentGenerationCenterX),
  );
});

test("deleting a standalone person removes only that person", () => {
  const standaloneTree: FamilyTreeDocument = {
    version: 1,
    people: [
      { id: "p-1", name: "人物 1", gender: "male" },
      { id: "p-2", name: "人物 2", gender: "female" },
    ],
    relationships: [],
  };

  const result = deletePersonFromTree(
    standaloneTree.people,
    standaloneTree.relationships,
    "p-2",
  );

  assert.deepEqual(
    result.people.map((person) => person.id),
    ["p-1"],
  );
  assert.deepEqual(result.relationships, []);
});

test("deleting a person removes direct relationships but keeps the remaining relatives", () => {
  const result = deletePersonFromTree(
    sampleTree.people,
    sampleTree.relationships,
    "p-father",
  );

  assert.ok(!result.people.some((person) => person.id === "p-father"));
  assert.ok(result.people.some((person) => person.id === "p-mother"));
  assert.ok(result.people.some((person) => person.id === "p-user"));
  assert.ok(result.people.some((person) => person.id === "p-brother"));

  assert.ok(
    result.relationships.every(
      (relationship) =>
        relationship.fromPersonId !== "p-father" &&
        relationship.toPersonId !== "p-father",
    ),
  );
  assert.ok(
    result.relationships.every(
      (relationship) =>
        relationship.fromPersonId === "p-mother" ||
        relationship.toPersonId !== "p-user",
    ),
  );
});

test("selected nodes have a strong readable highlight style", () => {
  const styles = readFileSync(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /\.person-node--selected\s*\{[\s\S]*0 0 0 4px/);
  assert.doesNotMatch(styles, /\.person-node--selected\s*\{[\s\S]*transform:/);
  assert.match(
    styles,
    /\.person-node--selected\s+\.person-node__content strong\s*\{/,
  );
});

test("buildFlowElements marks only the selected person node as selected", () => {
  const { nodes } = buildFlowElements(
    sampleTree.people,
    sampleTree.relationships,
    "p-user",
  );
  const selectedNode = nodes.find((node) => node.id === "p-user");
  const unselectedNode = nodes.find((node) => node.id === "p-brother");

  assert.ok(selectedNode, "expected selected node to exist");
  assert.ok(unselectedNode, "expected comparison node to exist");
  assert.equal(selectedNode.selected, true);
  assert.notEqual(unselectedNode.selected, true);
});

test("person nodes use gender color classes instead of rendering gender text", () => {
  const componentSource = readFileSync(
    new URL("../src/components/PersonNode.tsx", import.meta.url),
    "utf8",
  );

  assert.match(componentSource, /const genderClass = data\.gender === "other" \? "unknown" : data\.gender;/);
  assert.match(componentSource, /person-node person-node--\$\{genderClass\}/);
  assert.doesNotMatch(componentSource, /genderLabel/);
  assert.doesNotMatch(componentSource, /<span>\{genderLabel\[data\.gender\]\}<\/span>/);
});

test("gendered node styles exist for male female and unknown cards", () => {
  const styles = readFileSync(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /\.person-node--male\s*\{/);
  assert.match(styles, /\.person-node--female\s*\{/);
  assert.match(styles, /\.person-node--unknown\s*\{/);
});

test("app UI omits prototype-only explanatory copy and person ids", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(appSource, /人物 ID/);
  assert.doesNotMatch(appSource, /原型範圍/);
  assert.doesNotMatch(appSource, /先用純前端資料流驗證新增人物、配偶與子女，以及自動排版是否夠清楚可讀/);
  assert.doesNotMatch(appSource, /節點可點選，視窗可縮放平移。這一版先把「能看、能加、能重排」做出來。/);
});

test("app includes a mobile fab entry for low-frequency global actions", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(appSource, /className="mobile-toolbar mobile-only"/);
  assert.match(appSource, /className="mobile-fab mobile-only"/);
  assert.match(appSource, /className="mobile-fab__trigger"/);
  assert.match(appSource, /className="mobile-fab__panel"/);
  assert.match(appSource, /新增獨立人物/);
  assert.match(appSource, /匯入 JSON/);
  assert.match(appSource, /匯出 JSON/);
  assert.match(appSource, /還原範例資料/);
});

test("person detail section includes spouse and child actions", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /className="detail-actions"/);
  assert.match(appSource, /新增配偶/);
  assert.match(appSource, /新增子女/);
});

test("mobile fab panel does not contain spouse or child actions", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const mobileFabSection = appSource.match(
    /<div className="mobile-fab mobile-only">[\s\S]*?className="mobile-fab__panel"[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  );

  assert.ok(mobileFabSection, "expected mobile fab markup to exist");
  assert.doesNotMatch(mobileFabSection[0], /新增配偶/);
  assert.doesNotMatch(mobileFabSection[0], /新增子女/);
});

test("clicking the flow pane clears the selected person", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /onPaneClick=\{\(\) => \{[\s\S]*setSelectedPersonId\(null\);?[\s\S]*\}\}/);
});

test("person detail panel is hidden instead of showing an empty-state hint", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(appSource, /請先點選畫布上的人物節點。/);
  assert.match(appSource, /\{selectedPerson \? \(\s*<section className="panel">/);
});
