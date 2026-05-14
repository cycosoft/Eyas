---
name: vue-interface-standards
description: Component patterns, state management, and testing standards for the Vue 3 frontend interface in Eyas.
tags:
  - vue3
  - interface
  - frontend
---

# Reusable Skill: Interface (Vue/UI) Standards

## Overview
This skill defines the technology stack, component patterns, and targeted verification workflows for developing and extending the Vue 3 frontend interface.

## When to Use
- Trigger when building or refactoring Vue components in `src/eyas-interface/`.
- Trigger when managing UI state via Pinia or styling with Vuetify.

## Instructions

### 1. Technology Stack & Verification
- **Framework**: Vue 3 (Composition API / `<script setup>`).
- **State Management**: Pinia.
- **UI Components**: Vuetify.
- **Testing**: Vitest with JSDOM environment. Run targeted tests with:
  ```bash
  npx vitest run <file> --config vitest.config.interface.ts
  ```

### 2. Component Patterns
- **Script Setup**: Always use `<script setup lang="ts">`.
- **State**: Use `ref` or `reactive` for local state. Use `:key` over complex state logic for re-renders when necessary.
- **Clean Logic**: Avoid watchers where possible; prefer computed properties or explicit event handlers.
- **Type Safety**: Use shared interfaces from `src/types/` for props, state, and IPC data.

### 3. Testing Mandates
- **Selectors**: Always use `data-qa` selectors for component and E2E tests.
- **TDD**: Write/update tests in `tests/unit/components/*.test.ts` before making changes.
- **VM Types**: Update `src/types/components.ts` with VM types to support type-safe testing.
