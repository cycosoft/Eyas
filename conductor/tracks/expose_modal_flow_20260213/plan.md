# Implementation Plan: Decouple Expose Modal

## Phase 1: Decouple UI from Server Logic
- [x] Task: Analyze `startExposeHandler` in `src/eyas-core/index.js` to identify where the modal is shown and where `doStartExpose` is called.
- [x] Task: Modify `startExposeHandler` to only display the `ExposeSetupModal` and prevent the immediate call to `doStartExpose`.
- [ ] Task: Add a "Cancel" button or dismissal handler to the `ExposeSetupModal.vue` component that closes the modal without further action.
- [ ] Task: Ensure the "Continue" button handler in `ExposeSetupModal.vue` sends a new IPC event (e.g., `expose-setup-continue`).
- [ ] Task: Confirm a listener for the `expose-setup-continue` event exists in `src/eyas-core/index.js` and that it correctly calls the `doStartExpose` function.
- [ ] Task: Conductor - User Manual Verification 'Decouple UI from Server Logic' (Protocol in workflow.md)

## Phase 2: Testing and Verification
- [ ] Task: Write a unit test for `startExposeHandler` to verify that it only shows the modal and does not start the server.
- [ ] Task: Write a component test for `ExposeSetupModal.vue` to verify the "Cancel" functionality.
- [ ] Task: Create or update an end-to-end test to simulate the full user flow:
    - [ ] Sub-task: Click the "Expose Test" menu item.
    - [ ] Sub-task: Click the "Cancel" button in the modal and verify that the server has not started.
    - [ ] Sub-task: Click the "Expose Test" menu item again.
    - [ ] Sub-task: Click the "Continue" button and verify that the server has started successfully.
- [ ] Task: Conductor - User Manual Verification 'Testing and Verification' (Protocol in workflow.md)
