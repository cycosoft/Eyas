# Implementation Plan - DRY Refactor: Expose Test Timeout

This plan outlines the steps to centralize the "Expose Test" timeout duration and implement a shared utility for human-readable time formatting.

## Phase 1: Shared Infrastructure
**Goal:** Create the single source of truth for time and the formatting logic.

- [ ] Task: TDD - Time Formatting Utility
    - [ ] Create `tests/electron/time-utils.test.js` to verify `formatDuration` handles various inputs (5000ms -> "5s", 1800000ms -> "30m", etc.).
- [ ] Task: Implement Centralized Constant & Utility
    - [ ] Add `EXPIRE_MS` to `src/scripts/constants.js`.
    - [ ] Create `src/scripts/time-utils.js` with the `formatDuration` implementation.
    - [ ] Add `time-utils.js` to `electron.vite.config.js` and `src/scripts/compile-module.js`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Shared Infrastructure' (Protocol in workflow.md)

## Phase 2: Backend Logic Refactor
**Goal:** Update the main process and timeout module to use the new infrastructure.

- [ ] Task: Refactor Expose Timeout Module
    - [ ] Update `src/eyas-core/expose/expose-timeout.js` to import and use `EXPIRE_MS` from constants.
- [ ] Task: Refactor Main Process (Menu & Events)
    - [ ] Update `src/eyas-core/index.js` to import `EXPIRE_MS` and `formatDuration`.
    - [ ] Update the `exposeRemainingMinutes` context property (and potentially rename it to `exposeRemainingTime`) to use `formatDuration`.
    - [ ] Pass the formatted `EXPIRE_MS` as a payload in the `show-expose-resume-modal` event.
- [ ] Task: Update Menu Template
    - [ ] Update `src/eyas-core/menu-template.js` to accept a pre-formatted string instead of just minutes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend Logic Refactor' (Protocol in workflow.md)

## Phase 3: Frontend & Final Verification
**Goal:** Update the UI to show dynamic durations and verify the full flow.

- [ ] Task: Refactor Resume Modal UI
    - [ ] Update `src/eyas-interface/app/src/components/ExposeResumeModal.vue` to accept and display the duration from the IPC payload.
- [ ] Task: Final Verification
    - [ ] Verify that changing `EXPIRE_MS` in `constants.js` to `5000` updates all UI locations correctly.
    - [ ] Revert `EXPIRE_MS` to `1800000` (30m) for the final state.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend & Final Verification' (Protocol in workflow.md)
