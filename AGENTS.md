<!-- SPECTRA:START v1.0.1 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `$spectra-*` skills when:

- A discussion needs structure before coding → `$spectra-discuss`
- User wants to plan, propose, or design a change → `$spectra-propose`
- Tasks are ready to implement → `$spectra-apply`
- There's an in-progress change to continue → `$spectra-ingest`
- User asks about specs or how something works → `$spectra-ask`
- Implementation is done → `$spectra-archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `$spectra-apply` and `$spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# Repository Guidelines

## Project Structure & Module Organization
This repository is currently empty, so contributors should keep the initial layout simple and predictable. Place application code in `src/`, tests in `tests/`, static assets in `assets/`, and helper scripts in `scripts/`. Keep configuration files at the repository root.

Example layout:
```text
src/
tests/
assets/
scripts/
README.md
```

Prefer small, focused modules. Match test locations to source locations when possible, for example `src/auth/login.py` with `tests/auth/test_login.py`.

## Build, Test, and Development Commands
No standard toolchain is committed yet. When adding one, document it in `README.md` and keep command names conventional.

Suggested defaults:
- `make dev`: start the local development workflow.
- `make test`: run the full test suite.
- `make lint`: run formatting and lint checks.
- `make build`: produce a release artifact if the project needs one.

If `make` is not used, provide equivalent commands in the README, such as `npm test`, `pytest`, or `uv run pytest`.

## Coding Style & Naming Conventions
Use consistent formatting from the start. Prefer 4-space indentation for Python and 2 spaces for JSON, YAML, and Markdown lists. Use `snake_case` for files and functions, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.

Adopt an autoformatter and linter early, such as `ruff` for Python or `eslint` plus `prettier` for JavaScript/TypeScript. Do not merge code that fails formatting or lint checks.

## Testing Guidelines
Add automated tests alongside new features and bug fixes. Name test files `test_<module>.py` or `<module>.test.ts` based on the chosen stack. Keep unit tests fast and isolate integration tests in a separate directory or marker.

Run the complete suite before opening a pull request. New code should include meaningful coverage for the changed behavior.

## Commit & Pull Request Guidelines
There is no Git history yet, so use clear imperative commit messages such as `Add login form validation` or `Create initial test harness`. Keep commits focused and easy to review.

Pull requests should include a short summary, testing notes, and linked issues when available. Add screenshots or terminal output for UI or CLI changes. Update this guide when repository conventions become more concrete.

## Response Format & Language
- For every implementation report response, always use Traditional Chinese.
- For `/review` slash command responses, always use Traditional Chinese (technical terms may remain in English).
- For every implementation report response (but not commit-only replies such as `建立 commit` after an already-reported batch), always include these sections in order:
  1. `實作結果摘要` (clear summary + impacted area)
  2. `修改檔案` (reviewer scan order: docs/config -> backend -> frontend -> tests/helpers; include one-line summary per file; always use ordered numbering `1. 2. 3.` instead of bullet points; every file label must be the full repository-relative path such as `frontend/e2e/auth.spec.ts`)
  3. `測試方式與結果` (fully executable commands with concrete values, plus key outputs)
  4. `人工驗證步驟` (only for behavior not fully covered by automation; include expected result per step)

## Commit & Pull Request Guidelines
Use Conventional Commits:
- `feat: add token validation`
- `fix: handle empty config path`
- `docs: add onboarding notes`

Commit truthfulness rule:
- When the user asks to `建立 commit`, do not claim success unless `git commit` has actually been executed successfully.
- Before replying that a commit was created, always verify with `git log --oneline -1` and report the real latest commit hash/message from the repository state.
- If the expected changes are still present in `git status --short`, do not claim the commit is complete.
- Root cause note: a previous false report claimed a commit hash that did not exist because the reply was sent before verifying actual repo state. This must not happen again.
