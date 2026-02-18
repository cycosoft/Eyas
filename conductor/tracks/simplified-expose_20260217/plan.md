# Implementation Plan: Simplified Expose Workflow

## Phase 1: Dependency Cleanup and Infrastructure
- [ ] Task: Remove `mkcert` and `hostile` dependencies and install `selfsigned` v5.x
- [ ] Task: Refactor `src/eyas-core/expose/expose-certs.js` to use `selfsigned` instead of `mkcert`
- [ ] Task: Delete `src/eyas-core/expose/expose-hosts.js` and remove its references in the project
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Core Server Refactor
- [ ] Task: Update `src/eyas-core/expose/expose-server.js` to use fixed port `12701` and bind strictly to `127.0.0.1`
- [ ] Task: Update main process listeners in `src/eyas-core/index.js` to remove calls to the deleted hosts module
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: UI Simplification
- [ ] Task: Update `ExposeSetupModal.vue` to remove setup steps and display the new mnemonic URL
- [ ] Task: Update the "Expose" menu logic in `src/eyas-core/index.js` to reflect the simplified state
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Final Validation and Cleanup
- [ ] Task: Run full suite of E2E tests to ensure no regressions in the "Expose" workflow
- [ ] Task: Perform manual verification of SSL bypass in Chrome
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
