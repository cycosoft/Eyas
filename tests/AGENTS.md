# Testing Standards

## Core Philosophy
We follow a **TDD-First** approach. Tests are not just verification; they are the documentation of intended behavior.

## Test Categories
- **Unit Tests (`tests/unit/`)**: Test pure functions and individual components in isolation.
- **Integration Tests (`tests/integration/`)**: Test the interaction between multiple modules or the integration of core logic with the test server.
- **Electron/E2E Tests (`tests/electron/`)**: Test the full application lifecycle, including IPC and native window behavior.

## Execution Standards
- **Targeted Testing**: Run only the relevant test file to save time.
    - `npx vitest path/to/test.ts --config <config-file>`
- **Config Selection**:
    - Use `vitest.config.interface.js` for interface/Vue tests.
    - Use `vitest.config.core.js` for core/logic tests.

## Rules & Constraints
- **VM Integrity**: When testing Vue components, always cast the wrapper VM to its registry-defined interface (e.g., `as TestServerActiveModalVM`).
- **Mocking**:
    - Use `vi.mock()` for external dependencies (e.g., `electron`, `fs`).
    - Never mock the logic you are testing.
- **Behavioral Parity**: When refactoring code to satisfy linter rules (like `max-lines`), verify that existing tests pass BEFORE and AFTER the change.
- **ESM resolution**: Always use `.js` extensions in imports within test files.
