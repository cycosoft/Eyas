# Implementation Plan - DRY Refactor: Expose Test Timeout

This plan outlines the steps to centralize the "Expose Test" timeout duration and implement a shared utility for human-readable time formatting.

## Phase 1: Shared Infrastructure
**Goal:** Create the single source of truth for time and the formatting logic.

- [x] Task: TDD - Time Formatting Utility
    - [x] Create `tests/electron/time-utils.test.js` to verify `formatDuration` handles various inputs (5000ms -> "5s", 1800000ms -> "30m", etc.).
- [x] Task: Implement Centralized Constant & Utility
    - [x] Add `EXPIRE_MS` to `src/scripts/constants.js`.
    - [x] Create `src/scripts/time-utils.js` with the `formatDuration` implementation.
    - [x] Add `time-utils.js` to `electron.vite.config.js` and `src/scripts/compile-module.js`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Shared Infrastructure' (Protocol in workflow.md)

## Phase 2: Backend Logic Refactor
**Goal:** Update the main process and timeout module to use the new infrastructure.

- [x] Task: Refactor Expose Timeout Module
    - [x] Update `src/eyas-core/expose/expose-timeout.js` to import and use `EXPIRE_MS` from constants.
- [x] Task: Refactor Main Process (Menu & Events)
    - [x] Update `src/eyas-core/index.js` to import `EXPIRE_MS` and `formatDuration`.
    - [x] Update the `exposeRemainingMinutes` context property (and potentially rename it to `exposeRemainingTime`) to use `formatDuration`.
    - [x] Pass the formatted `EXPIRE_MS` as a payload in the `show-expose-resume-modal` event.
- [x] Task: Update Menu Template
    - [x] Update `src/eyas-core/menu-template.js` to accept a pre-formatted string instead of just minutes.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Backend Logic Refactor' (Protocol in workflow.md)

## Phase 3: Frontend & Final Verification
**Goal:** Update the UI to show dynamic durations and verify the full flow.

- [x] Task: Refactor Resume Modal UI
    - [x] Update `src/eyas-interface/app/src/components/ExposeResumeModal.vue` to accept and display the duration from the IPC payload.
- [x] Task: Final Verification
    - [x] Verify that changing `EXPIRE_MS` in `constants.js` to `5000` updates all UI locations correctly.
    - [x] Revert `EXPIRE_MS` to `1800000` (30m) for the final state.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Frontend & Final Verification' (Protocol in workflow.md)
