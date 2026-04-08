# Zupu

繁中｜一個為家人設計的族譜網站，重點放在手機可用、共同編輯與清楚的自動排版。  
EN | A family tree web app focused on mobile usability, shared editing, and clear automatic layout.

## Project Overview

`Zupu` aims to make it easy for family members to build and browse a shared family tree without technical knowledge.

Current v1 goals:
- Add people as standalone nodes or as relatives such as spouse and child.
- Visualize parent-child and spouse relationships in a readable tree.
- Auto-layout the tree to avoid overlapping nodes and confusing relationship lines.
- Support name search, basic edit history, JSON export, and simplified kinship labels.

## 專案簡介

`Zupu` 的目標是讓家人可以用簡單直覺的方式，一起建立與維護同一棵族譜。

目前第一版聚焦在：
- 新增人物節點，並建立配偶、親子關係。
- 以圖形化方式呈現族譜，強調可讀性。
- 自動排版，避免節點重疊與關係線混亂。
- 支援姓名搜尋、基本編輯紀錄、JSON 匯出，以及簡化版相對稱謂。

## Current Status

This repository now includes a local frontend prototype for the family tree canvas. The main product definition still lives in [docs/PRD.md](/Users/kevin1kevin1k/Zupu/docs/PRD.md), and the prototype focuses on validating the v1 interaction model quickly.

目前這個 repo 已經有一個可本地執行的前端原型，用來快速驗證族譜畫布、人物新增與 JSON 匯入匯出。最主要的需求文件仍在 [docs/PRD.md](/Users/kevin1kevin1k/Zupu/docs/PRD.md)。

## Local Development

Run the prototype locally from the repository root:

```bash
npm install
npm run dev
```

Optional checks:

```bash
npm run check
npm run build
```

在 repo 根目錄執行以下指令即可啟動本地原型：

```bash
npm install
npm run dev
```

可選的檢查指令：

```bash
npm run check
npm run build
```

## Repository Structure

- `src/`: local React + Vite prototype for the family tree canvas.
- [docs/PRD.md](/Users/kevin1kevin1k/Zupu/docs/PRD.md): v1 product requirements for the family tree website.
- [docs/TODO.md](/Users/kevin1kevin1k/Zupu/docs/TODO.md): implementation checklist derived from the PRD.
- [AGENTS.md](/Users/kevin1kevin1k/Zupu/AGENTS.md): contributor guidelines for this repository.

## Next Steps

- Iterate on the layout rules for spouse and child placement.
- Add search, kinship labels, and edit history after the prototype proves the interaction model.
- Introduce a backend and persistence only after the local prototype is stable.
