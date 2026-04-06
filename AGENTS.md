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
