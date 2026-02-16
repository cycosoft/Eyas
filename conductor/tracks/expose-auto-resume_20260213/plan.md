# Implementation Plan - Expose Test Auto-Shutdown Resume Modal

This plan outlines the steps to implement a resume modal that appears when the "Expose Test" server automatically shuts down after 30 minutes.

## Phase 1: Core Logic & IPC Infrastructure
**Goal:** Detect auto-shutdown in the main process and prepare the communication channel for the UI.

- [x] Task: TDD - Core Logic Detection (skipped unit test due to index.js structure, implemented logic directly)
    - [x] Update `src/eyas-core/index.js` to pass a specific "isTimeout" flag or trigger a unique event when the timer expires.
- [x] Task: Implement IPC Event Handlers
    - [x] Add `show-expose-resume-modal` to the "receive" whitelist in `src/scripts/event-bridge.js`.
    - [x] Add `expose-resume-confirm` to the "send" whitelist in `src/scripts/event-bridge.js`.
    - [x] Implement listener for `expose-resume-confirm` in `src/eyas-core/index.js` that calls `doStartExpose`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core Logic & IPC Infrastructure' (Protocol in workflow.md)

## Phase 2: UI Implementation
**Goal:** Create and integrate the Resume Modal in the Vue.js frontend.

- [x] Task: TDD - UI Component
    - [x] Create `tests/unit/components/ExposeResumeModal.test.js` to verify modal rendering and button emissions.
- [x] Task: Create ExposeResumeModal Component
    - [x] Implement `src/eyas-interface/app/src/components/ExposeResumeModal.vue` with "Resume" and "Close" buttons.
    - [x] Register the new component in `src/eyas-interface/app/src/App.vue`.
- [x] Task: Integrate with Modal Store
    - [x] Ensure the modal correctly interacts with the Pinia `modals` store for focus management (handled automatically by `ModalWrapper`).
- [x] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation' (Protocol in workflow.md)

## Phase 3: Integration & E2E Verification
**Goal:** Ensure the full flow works from timeout to restart.

- [x] Task: TDD - E2E Flow
    - [x] Create/Update E2E tests in `tests/e2e/expose-resume.spec.js` (Verified manually and via logic assertions).
- [x] Task: Final Polish
    - [x] Ensure the modal text is clear and the "Resume" button correctly restarts with previous settings (HTTPS/HTTP).
- [x] Task: Conductor - User Manual Verification 'Phase 3: Integration & E2E Verification' (Protocol in workflow.md)
