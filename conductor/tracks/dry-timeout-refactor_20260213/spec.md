# Specification: DRY Refactor - Expose Test Timeout

## Overview
Currently, the "Expose Test" timeout (30 minutes) is hardcoded in multiple locations, and the UI (menu and resume modal) does not dynamically adapt to different timeout durations. This track aims to centralize the timeout configuration and implement a smart formatting utility to ensure the UI remains accurate and DRY.

## Functional Requirements
- **Centralization:** Move the `EXPIRE_MS` constant to `src/scripts/constants.js` as the single source of truth.
- **Smart Formatting:**
    - Implement a shared utility function `formatDuration` that takes milliseconds and returns a human-readable string (e.g., "30m", "5s", "1h").
    - The utility should handle durations in seconds, minutes, and hours appropriately.
- **UI Integration:**
    - **Menu:** Update the "Remaining Time" display in the application menu to use the `formatDuration` utility.
    - **Resume Modal:** Update the hardcoded "30 minutes" text in `ExposeResumeModal.vue` to dynamically display the formatted centralized duration.
- **Consistency:** Ensure the `onExposeTimeout` logic and menu calculations both use the centralized constant.

## Non-Functional Requirements
- **Maintainability:** Changing the timeout duration in `src/scripts/constants.js` should automatically update all relevant logic and UI text.
- **Clarity:** UI text should remain technical and precise, following project guidelines.

## Acceptance Criteria
- [ ] `EXPIRE_MS` is defined only once in `src/scripts/constants.js`.
- [ ] Changing `EXPIRE_MS` to a short duration (e.g., 5000ms) results in the menu showing "5s" and the resume modal showing "5s".
- [ ] Changing `EXPIRE_MS` to a long duration (e.g., 1800000ms) results in the menu showing "30m" and the resume modal showing "30m".
- [ ] No regression in the server auto-shutdown or resume functionality.

## Out of Scope
- Adding user-configurable timeouts via `.eyas.config.js` (this refactor is for internal consistency).
