# Implementation Plan: Refactor Expose Menu and Modal Integration

## Phase 1: ExposeSetupModal Enhancements
- [x] Task: Add an HTTPS toggle to `src/eyas-interface/app/src/components/ExposeSetupModal.vue`.
    - [x] Sub-task: Update `data` to include a boolean for HTTPS state (defaulting to the current global state).
    - [x] Sub-task: Add a UI element (e.g., a checkbox or switch) as a new step in the modal's list.
    - [x] Sub-task: Ensure the state is emitted or included in the payload when "Continue" is clicked.
- [x] Task: Write a unit test for `ExposeSetupModal.vue` to verify the HTTPS toggle state changes and is correctly passed on "Continue".
- [x] Task: Conductor - User Manual Verification 'ExposeSetupModal Enhancements' (Protocol in workflow.md)

## Phase 2: Core Logic and Menu Refactoring
- [x] Task: Update the `expose-setup-continue` IPC listener in `src/eyas-core/index.js` to receive the HTTPS state from the modal and apply it to the `$exposeHttpsEnabled` variable before calling `doStartExpose`.
- [x] Task: Refactor `src/eyas-core/menu-template.js` to restructure the "Tools" menu.
    - [x] Sub-task: Remove the "HTTPS for Expose" toggle from the tools submenu.
    - [x] Sub-task: Remove the top-level Expose menu generation.
    - [x] Sub-task: Implement the dynamic "Expose Test" / "Exposed for..." sub-menu within the "Tools" menu based on `exposeActive`.
- [x] Task: Write unit tests for `buildMenuTemplate` in `tests/electron/menu-template.test.js` to verify the new consolidated structure and dynamic behavior.
- [x] Task: Conductor - User Manual Verification 'Core Logic and Menu Refactoring' (Protocol in workflow.md)

## Phase 3: Cleanup and Final Verification
- [x] Task: Update the E2E tests in `tests/e2e/menu.spec.js` to reflect the new menu hierarchy (finding Expose options under Tools).
- [x] Task: Run the full `npm run check` suite to ensure no regressions in functionality or styling.
- [x] Task: Conductor - User Manual Verification 'Cleanup and Final Verification' (Protocol in workflow.md)
