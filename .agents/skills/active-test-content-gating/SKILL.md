---
name: active-test-content-gating
description: Architectural post-mortem and operational guidelines for implementing active test content visibility gating in Eyas UI components, specifically addressing IPC-to-Vue state synchronization, Vue test state leaks, and token reduction.
tags:
  - post-mortem
  - ui-components
  - testing
  - electron-ipc
---

# Feature Post-Mortem: Active Test Content Gating

## Overview
This skill documents the engineering post-mortem from implementing dynamic visibility gating for the `AppHeader` environment chooser dropdown. The dropdown dynamically hides when users navigate away to external websites, while remaining visible during active test content viewing or fallback/startup screens.

## When to Use
- Trigger when debugging or extending `AppHeader`, `AppHeaderOmniHub`, or related navigation components.
- Trigger when handling Electron IPC payloads (`NavigationStatePayload`) in the Vue UI store.
- Trigger when troubleshooting Vitest UI component test state leaks or configuring Vitest CLI executions.

## Instructions

### 1. Production Code Efficiency
- **Collocated State Contracts**: Understand that Electron main-process IPC payloads (`NavigationStatePayload`) map directly to reactive frontend state in `AppHeader.logic.ts`.
- **Pre-defined Helper Types**: Ensure clear separation and definitions of semantic types (`DomainUrl`) vs. raw strings when writing helper utilities, avoiding initial linter rejections (`no-restricted-syntax`).

### 2. Eliminating Test Re-Learning (Shared State Isolation)
- **Module-Level Reactive State Leaks**: In Vue UI testing, state is maintained in exported reactive objects (`export const state = reactive({...})`). Mutating this state in one test (e.g., setting `state.currentUrl`) persists into subsequent test cases unless explicitly cleared.
  - **Mandatory Pattern**: Every UI component test file MUST include a comprehensive state reset in its `beforeEach` block.
- **Explicit Vitest Configs**: Interface unit tests require specific configuration paths. Never run bare `vitest`; always specify:
  ```bash
  npx vitest run path/to/test.ts --config vitest.config.interface.ts
  ```

### 3. Token & Resource Reduction Strategies
- **Targeted CLI Verification**: Avoid running `npm run check` or project-wide linting during iteration. Localize verification to the exact test file and lint target (`npx eslint <file> --fix`) to keep stdout buffers small and token consumption minimal.
- **Precision Grepping**: When searching for IPC channels (e.g., `navigation-state-updated`), filter by directory (`src/eyas-interface` or `src/eyas-core`) rather than scanning the entire repository root.
