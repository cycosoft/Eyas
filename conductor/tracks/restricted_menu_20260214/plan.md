# Implementation Plan: Restricted Menu State

## Phase 1: Test Preparation (Red Phase)
- [x] Task: Update `tests/electron/menu-template.test.js` to support the initialization state. 3c37984
    - [x] Sub-task: Add a test case verifying that when `isInitializing` is true, functional menus (Tools, Network, Cache) have `enabled: false` on their top-level items.
    - [x] Sub-task: Verify that non-restricted menus (App, Viewport, Links) remain enabled.
    - [x] Sub-task: Confirm tests fail as expected.
- [ ] Task: Conductor - User Manual Verification 'Test Preparation' (Protocol in workflow.md)

## Phase 2: Core Implementation (Green Phase)
- [x] Task: Update `src/eyas-core/menu-template.js` to handle `isInitializing`. cc73075
    - [x] Sub-task: Pass `isInitializing` through the context.
    - [x] Sub-task: Set `enabled: !isInitializing` for Tools, Network, and Cache menu headers.
- [x] Task: Manage state in `src/eyas-core/index.js`. cc73075
    - [x] Sub-task: Initialize `$isInitializing` to `true`.
    - [x] Sub-task: Update IPC listeners or navigation handlers (e.g., `did-start-navigation`) to set `$isInitializing = false` and call `setMenu()`.
    - [x] Sub-task: Ensure `$isInitializing` is reset to `true` during `startAFreshTest()`.
- [x] Task: Confirm unit tests pass.
- [ ] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Verification & Finalization
- [ ] Task: Run full regression suite (`npm run check`).
- [ ] Task: Conductor - User Manual Verification 'Verification & Finalization' (Protocol in workflow.md)
