# Implementation Plan: Root-Level Expose Status Menu

## Phase 1: Test Preparation (Red Phase)
- [x] Task: Update `tests/electron/menu-template.test.js` to assert the new root-level menu item.
    - [x] Sub-task: Add a test case verifying that when `exposeActive` is true, the template contains an additional top-level item at the end.
    - [x] Sub-task: Add a test case verifying that when `exposeActive` is false, this item is absent.
    - [x] Sub-task: Run tests and confirm they fail.
- [x] Task: Conductor - User Manual Verification 'Test Preparation' (Protocol in workflow.md)

## Phase 2: Implementation (Green Phase)
- [x] Task: Refactor `src/eyas-core/menu-template.js` for DRYness.
    - [x] Sub-task: Extract the Expose management sub-menu array into a helper function.
- [x] Task: Implement the dynamic root-level status item.
    - [x] Sub-task: Logic to push the status item to the end of the `menu` array only if `exposeActive` is true.
    - [x] Sub-task: Ensure it uses the shared helper for its sub-menu.
- [x] Task: Run tests and confirm they pass.
- [x] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Finalization
- [x] Task: Run the full `npm run check` suite to ensure no regressions.
- [x] Task: Conductor - User Manual Verification 'Finalization' (Protocol in workflow.md)
