import { useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  type EdgeTypes,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { sampleTree } from "./data/sampleTree";
import { PersonNode } from "./components/PersonNode";
import { SpouseEdge } from "./components/SpouseEdge";
import {
  buildFlowElements,
  createBlankPerson,
  createRelationship,
  deletePersonFromTree,
  getDocumentExport,
  getNextPersonName,
  getSpouseId,
  parseImportedDocument,
} from "./lib/tree";
import type { Gender, Person, Relationship } from "./types/family";

const nodeTypes = {
  person: PersonNode,
};

const edgeTypes: EdgeTypes = {
  spouse: SpouseEdge,
};

function App() {
  const [people, setPeople] = useState<Person[]>(sampleTree.people);
  const [relationships, setRelationships] = useState<Relationship[]>(sampleTree.relationships);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(sampleTree.people[4]?.id ?? null);
  const [importMessage, setImportMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reactFlow = useReactFlow();

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;
  const selectedSpouseId = selectedPersonId ? getSpouseId(selectedPersonId, relationships) : null;
  const { nodes, edges } = buildFlowElements(people, relationships);

  useEffect(() => {
    requestAnimationFrame(() => {
      void reactFlow.fitView({ padding: 0.2, duration: 350 });
    });
  }, [people.length, relationships.length, reactFlow]);

  function updateSelectedPerson<K extends keyof Person>(key: K, value: Person[K]) {
    if (!selectedPersonId) {
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === selectedPersonId ? { ...person, [key]: value } : person,
      ),
    );
  }

  function addStandalonePerson() {
    const newPerson = createBlankPerson(getNextPersonName("新人物", people), "other");

    setPeople((current) => [...current, newPerson]);
    setSelectedPersonId(newPerson.id);
  }

  function addSpouse() {
    if (!selectedPersonId || selectedSpouseId) {
      return;
    }

    const newPerson = createBlankPerson(getNextPersonName("配偶", people), "other");

    setPeople((current) => [...current, newPerson]);
    setRelationships((current) => [
      ...current,
      createRelationship("spouse", selectedPersonId, newPerson.id),
    ]);
    setSelectedPersonId(newPerson.id);
  }

  function addChild() {
    if (!selectedPersonId) {
      return;
    }

    const newPerson = createBlankPerson(getNextPersonName("子女", people), "other");
    const nextRelationships = [
      createRelationship("parent-child", selectedPersonId, newPerson.id),
    ];

    if (selectedSpouseId) {
      nextRelationships.push(
        createRelationship("parent-child", selectedSpouseId, newPerson.id),
      );
    }

    setPeople((current) => [...current, newPerson]);
    setRelationships((current) => [...current, ...nextRelationships]);
    setSelectedPersonId(newPerson.id);
  }

  function deleteSelectedPerson() {
    if (!selectedPerson) {
      return;
    }

    const confirmed = window.confirm(
      `確定要刪除「${selectedPerson.name}」嗎？這會移除此人物，以及所有與他/她直接相關的關係；其他人物會保留。`,
    );

    if (!confirmed) {
      return;
    }

    const nextDocument = deletePersonFromTree(
      people,
      relationships,
      selectedPerson.id,
    );

    setPeople(nextDocument.people);
    setRelationships(nextDocument.relationships);
    setSelectedPersonId(nextDocument.people[0]?.id ?? null);
    setImportMessage("已刪除人物並移除相關關係。");
  }

  function exportJson() {
    const payload = JSON.stringify(getDocumentExport(people, relationships), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `zupu-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setImportMessage("已匯出目前族譜 JSON。");
  }

  async function importJson(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseImportedDocument(text);

      setPeople(parsed.people);
      setRelationships(parsed.relationships);
      setSelectedPersonId(parsed.people[0]?.id ?? null);
      setImportMessage("已成功匯入族譜 JSON。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "匯入失敗。";
      setImportMessage(message);
    }
  }

  function resetSampleData() {
    setPeople(sampleTree.people);
    setRelationships(sampleTree.relationships);
    setSelectedPersonId(sampleTree.people[4]?.id ?? null);
    setImportMessage("已還原範例家譜。");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__hero">
          <span className="sidebar__eyebrow">Local Prototype</span>
          <h1>Zupu 族譜原型</h1>
          <p>
            先用純前端資料流驗證新增人物、配偶與子女，以及自動排版是否夠清楚可讀。
          </p>
        </div>

        <section className="panel">
          <h2>操作</h2>
          <div className="action-grid">
            <button onClick={addStandalonePerson} type="button">
              新增獨立人物
            </button>
            <button disabled={!selectedPerson || Boolean(selectedSpouseId)} onClick={addSpouse} type="button">
              為選中人物新增配偶
            </button>
            <button disabled={!selectedPerson} onClick={addChild} type="button">
              為選中人物新增子女
            </button>
            <button onClick={exportJson} type="button">
              匯出 JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} type="button">
              匯入 JSON
            </button>
            <button className="button-secondary" onClick={resetSampleData} type="button">
              還原範例資料
            </button>
          </div>
          <input
            accept="application/json"
            hidden
            onChange={(event) => {
              void importJson(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
          <p className="panel__hint">
            {importMessage || "提示：先點選人物，再從側欄建立配偶或子女。"}
          </p>
        </section>

        <section className="panel">
          <h2>人物資料</h2>
          {selectedPerson ? (
            <div className="form-stack">
              <label>
                <span>姓名</span>
                <input
                  onChange={(event) => updateSelectedPerson("name", event.target.value)}
                  type="text"
                  value={selectedPerson.name}
                />
              </label>
              <label>
                <span>性別</span>
                <select
                  onChange={(event) => updateSelectedPerson("gender", event.target.value as Gender)}
                  value={selectedPerson.gender}
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <label>
                <span>照片 URL（選填）</span>
                <input
                  onChange={(event) => updateSelectedPerson("photoUrl", event.target.value || undefined)}
                  placeholder="https://example.com/photo.jpg"
                  type="url"
                  value={selectedPerson.photoUrl ?? ""}
                />
              </label>
              <div className="selection-meta">
                <span>人物 ID</span>
                <code>{selectedPerson.id}</code>
              </div>
              <p className="panel__hint">
                {selectedSpouseId
                  ? "此人物已經有一位配偶；第一版原型不再新增第二位配偶。"
                  : "此人物目前沒有配偶。"}
              </p>
              <button
                className="button-danger"
                onClick={deleteSelectedPerson}
                type="button"
              >
                刪除人物
              </button>
            </div>
          ) : (
            <p className="panel__hint">請先點選畫布上的人物節點。</p>
          )}
        </section>

        <section className="panel">
          <h2>原型範圍</h2>
          <ul className="scope-list">
            <li>有：新增、編輯、刪除人物，建立配偶與子女，畫布重排，JSON 匯入匯出。</li>
            <li>沒有：後端、登入、搜尋、稱謂、編輯紀錄、資料庫。</li>
          </ul>
        </section>
      </aside>

      <main className="canvas-stage">
        <div className="canvas-stage__header">
          <div>
            <span className="canvas-stage__label">Family Canvas</span>
            <h2>手機優先的族譜可視化原型</h2>
          </div>
          <p>
            節點可點選，視窗可縮放平移。這一版先把「能看、能加、能重排」做出來。
          </p>
        </div>

        <div className="flow-wrapper">
          <ReactFlow
            edgeTypes={edgeTypes}
            edges={edges}
            fitView
            minZoom={0.2}
            nodeTypes={nodeTypes}
            nodes={nodes}
            onNodeClick={(_, node) => {
              setSelectedPersonId(node.id);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#d7d8d0" gap={20} />
            <MiniMap pannable zoomable />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </main>
    </div>
  );
}

export default App;
