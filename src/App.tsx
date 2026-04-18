import { useEffect, useRef, useState } from "react";
import {
  Background,
  type Edge,
  type EdgeTypes,
  MiniMap,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";
import { sampleTree } from "./data/sampleTree";
import { FamilyEdge } from "./components/FamilyEdge";
import { PersonNode, type PersonFlowNode } from "./components/PersonNode";
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
  family: FamilyEdge,
  spouse: SpouseEdge,
};

function App() {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 960px)").matches
      : false,
  );
  const [isGlobalFabOpen, setIsGlobalFabOpen] = useState(false);
  const [isPersonFabOpen, setIsPersonFabOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>(sampleTree.people);
  const [relationships, setRelationships] = useState<Relationship[]>(sampleTree.relationships);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string>("");
  const [flowViewport, setFlowViewport] = useState({ width: 0, height: 0 });
  const [editDraft, setEditDraft] = useState<{
    name: string;
    gender: Gender;
    photoUrl: string;
  }>({
    name: "",
    gender: "other",
    photoUrl: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<PersonFlowNode, Edge> | null>(null);

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;
  const selectedSpouseId = selectedPersonId ? getSpouseId(selectedPersonId, relationships) : null;
  const isFlowViewportReady = flowViewport.width > 0 && flowViewport.height > 0;
  const { nodes, edges } = buildFlowElements(
    people,
    relationships,
    selectedPersonId,
  );

  useEffect(() => {
    if (!reactFlowInstanceRef.current || !isFlowViewportReady) {
      return;
    }

    requestAnimationFrame(() => {
      void reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 350 });
    });
  }, [isFlowViewportReady, people.length, relationships.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !flowWrapperRef.current) {
      return;
    }

    const wrapper = flowWrapperRef.current;
    const updateViewportReady = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      setFlowViewport({ width, height });
    };

    updateViewportReady();

    const observer = new ResizeObserver(() => {
      updateViewportReady();
    });

    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 960px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  function addStandalonePerson() {
    const newPerson = createBlankPerson(getNextPersonName("新人物", people), "other");

    setPeople((current) => [...current, newPerson]);
    setSelectedPersonId(newPerson.id);
    setIsGlobalFabOpen(false);
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
    setIsPersonFabOpen(false);
    setIsEditModalOpen(false);
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
    setIsPersonFabOpen(false);
    setIsEditModalOpen(false);
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
    setIsPersonFabOpen(false);
    setIsEditModalOpen(false);
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
      setIsGlobalFabOpen(false);
      setIsPersonFabOpen(false);
      setIsEditModalOpen(false);
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
    setIsGlobalFabOpen(false);
    setIsPersonFabOpen(false);
    setIsEditModalOpen(false);
    setImportMessage("已還原範例家譜。");
  }

  function openEditModal() {
    if (!selectedPerson) {
      return;
    }

    setEditDraft({
      name: selectedPerson.name,
      gender: selectedPerson.gender,
      photoUrl: selectedPerson.photoUrl ?? "",
    });
    setIsPersonFabOpen(false);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setIsEditModalOpen(false);
  }

  function saveEditedPerson() {
    if (!selectedPersonId) {
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === selectedPersonId
          ? {
              ...person,
              name: editDraft.name,
              gender: editDraft.gender,
              photoUrl: editDraft.photoUrl || undefined,
            }
          : person,
      ),
    );
    setIsEditModalOpen(false);
    setIsPersonFabOpen(true);
  }

  function renderGlobalActions(panelClassName: string) {
    return (
      <div className={panelClassName}>
        <button
          onClick={() => {
            addStandalonePerson();
            setIsGlobalFabOpen(false);
          }}
          type="button"
        >
          新增獨立人物
        </button>
        <button
          onClick={() => {
            fileInputRef.current?.click();
            setIsGlobalFabOpen(false);
          }}
          type="button"
        >
          匯入 JSON
        </button>
        <button
          onClick={() => {
            exportJson();
            setIsGlobalFabOpen(false);
          }}
          type="button"
        >
          匯出 JSON
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            resetSampleData();
            setIsGlobalFabOpen(false);
          }}
          type="button"
        >
          還原範例資料
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="canvas-stage">
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

        <div className="canvas-stage__header">
          <h1>Zupu 族譜</h1>
          {!isMobile ? (
            <div className="canvas-stage__actions">
              <div className="desktop-actions">
                {isGlobalFabOpen ? renderGlobalActions("desktop-actions__panel") : null}
                <button
                  aria-expanded={isGlobalFabOpen}
                  aria-label={isGlobalFabOpen ? "關閉更多操作" : "開啟更多操作"}
                  className="desktop-actions__trigger"
                  onClick={() => {
                    setIsGlobalFabOpen((current) => !current);
                  }}
                  type="button"
                >
                  {isGlobalFabOpen ? "×" : "更多"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {importMessage ? (
          <p className="canvas-stage__status">{importMessage}</p>
        ) : null}

        <div className="flow-wrapper" ref={flowWrapperRef}>
          {isFlowViewportReady ? (
            <div
              className="flow-viewport"
              style={{ width: flowViewport.width, height: flowViewport.height }}
            >
              <ReactFlow
                edgeTypes={edgeTypes}
                edges={edges}
                height={flowViewport.height}
                minZoom={0.2}
                nodeTypes={nodeTypes}
                nodes={nodes}
                onInit={(instance) => {
                  reactFlowInstanceRef.current = instance;
                }}
                width={flowViewport.width}
                onNodeClick={(_, node) => {
                  setIsGlobalFabOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedPersonId(node.id);
                  setIsPersonFabOpen(true);
                }}
                onPaneClick={() => {
                  setIsGlobalFabOpen(false);
                  setIsPersonFabOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedPersonId(null);
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#d7d8d0" gap={20} />
                {!isMobile ? <MiniMap className="family-minimap" pannable zoomable /> : null}
              </ReactFlow>
            </div>
          ) : null}
        </div>

        {selectedPerson ? (
          <div className="person-context-fab">
            {isPersonFabOpen ? (
              <div className="person-context-fab__panel">
                <button
                  onClick={openEditModal}
                  type="button"
                >
                  編輯資料
                </button>
                {!selectedSpouseId ? (
                  <button
                    className="button-secondary"
                    onClick={addSpouse}
                    type="button"
                  >
                    新增配偶
                  </button>
                ) : null}
                <button
                  className="button-secondary"
                  onClick={addChild}
                  type="button"
                >
                  新增子女
                </button>
              </div>
            ) : null}
            <button
              aria-expanded={isPersonFabOpen}
              aria-label={isPersonFabOpen ? "關閉人物操作" : "開啟人物操作"}
              className="person-context-fab__trigger"
              onClick={() => {
                setIsPersonFabOpen((current) => !current);
              }}
              type="button"
            >
              {isPersonFabOpen ? "×" : "編輯"}
            </button>
          </div>
        ) : null}

        {isMobile && !selectedPerson ? (
          <div className="global-fab">
            {isGlobalFabOpen ? renderGlobalActions("global-fab__panel") : null}
            <button
              aria-expanded={isGlobalFabOpen}
              aria-label={isGlobalFabOpen ? "關閉更多操作" : "開啟更多操作"}
              className="global-fab__trigger"
              onClick={() => {
                setIsGlobalFabOpen((current) => !current);
              }}
              type="button"
            >
              {isGlobalFabOpen ? "×" : "⋯"}
            </button>
          </div>
        ) : null}
      </main>

      {isEditModalOpen && selectedPerson ? (
        <div
          className="edit-modal__backdrop"
          onClick={closeEditModal}
          role="presentation"
        >
          <div
            className="edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="edit-modal__header">
              <h2 id="edit-modal-title">編輯資料</h2>
            </div>
            <div className="form-stack">
              <label>
                <span>姓名</span>
                <input
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  type="text"
                  value={editDraft.name}
                />
              </label>
              <label>
                <span>性別</span>
                <select
                  onChange={(event) =>
                    setEditDraft((current) => ({
                      ...current,
                      gender: event.target.value as Gender,
                    }))
                  }
                  value={editDraft.gender}
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">未設定</option>
                </select>
              </label>
              <label>
                <span>照片 URL（選填）</span>
                <input
                  onChange={(event) =>
                    setEditDraft((current) => ({
                      ...current,
                      photoUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/photo.jpg"
                  type="url"
                  value={editDraft.photoUrl}
                />
              </label>
            </div>
            <div className="edit-modal__footer">
              <button
                className="button-secondary"
                onClick={closeEditModal}
                type="button"
              >
                取消
              </button>
              <button
                onClick={saveEditedPerson}
                type="button"
              >
                儲存
              </button>
            </div>
            <button
              className="button-danger edit-modal__delete"
              onClick={deleteSelectedPerson}
              type="button"
            >
              刪除人物
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
