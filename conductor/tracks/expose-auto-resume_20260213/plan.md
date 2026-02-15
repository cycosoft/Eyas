# Implementation Plan - Expose Test Auto-Shutdown Resume Modal

This plan outlines the steps to implement a resume modal that appears when the "Expose Test" server automatically shuts down after 30 minutes.

## Phase 1: Core Logic & IPC Infrastructure
**Goal:** Detect auto-shutdown in the main process and prepare the communication channel for the UI.

- [ ] Task: TDD - Core Logic Detection
    - [ ] Create `tests/electron/expose-resume.test.js` to verify that the auto-shutdown callback triggers a notification.
    - [ ] Update `src/eyas-core/index.js` to pass a specific "isTimeout" flag or trigger a unique event when the timer expires.
- [ ] Task: Implement IPC Event Handlers
    - [ ] Add `show-expose-resume-modal` to the "receive" whitelist in `src/scripts/event-bridge.js`.
    - [ ] Add `expose-resume-confirm` to the "send" whitelist in `src/scripts/event-bridge.js`.
    - [ ] Implement listener for `expose-resume-confirm` in `src/eyas-core/index.js` that calls `doStartExpose`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Logic & IPC Infrastructure' (Protocol in workflow.md)

## Phase 2: UI Implementation
**Goal:** Create and integrate the Resume Modal in the Vue.js frontend.

- [ ] Task: TDD - UI Component
    - [ ] Create `tests/unit/components/ExposeResumeModal.test.js` to verify modal rendering and button emissions.
- [ ] Task: Create ExposeResumeModal Component
    - [ ] Implement `src/eyas-interface/app/src/components/ExposeResumeModal.vue` with "Resume" and "Close" buttons.
    - [ ] Register the new component in `src/eyas-interface/app/src/App.vue`.
- [ ] Task: Integrate with Modal Store
    - [ ] Ensure the modal correctly interacts with the Pinia `modals` store for focus management.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation' (Protocol in workflow.md)

## Phase 3: Integration & E2E Verification
**Goal:** Ensure the full flow works from timeout to restart.

- [ ] Task: TDD - E2E Flow
    - [ ] Create/Update E2E tests in `tests/e2e/expose-resume.spec.js` (using a shortened timeout for testing if possible, or mocking the timeout trigger).
- [ ] Task: Final Polish
    - [ ] Ensure the modal text is clear and the "Resume" button correctly restarts with previous settings (HTTPS/HTTP).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & E2E Verification' (Protocol in workflow.md)
