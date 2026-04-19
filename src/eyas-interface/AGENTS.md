# AI Agent Instructions: Interface (Vue/UI)

## 1. Technology Stack
- **Framework**: Vue 3 (Composition API / `<script setup>`).
- **State Management**: Pinia.
- **UI Components**: Vuetify.
- **Testing**: Vitest with JSDOM environment. Run targeted tests with `npx vitest <file> --config vitest.config.interface.js`.

## 2. Component Patterns
- **Script Setup**: Always use `<script setup lang="ts">`.
- **State**: Use `ref` or `reactive` for local state. Use `:key` over complex state logic for re-renders when necessary.
- **Clean Logic**: Avoid `watchers` where possible; prefer computed properties or explicit event handlers.
- **Type Safety**: Use shared interfaces from `src/types/` for props, state, and IPC data.

## 3. Testing
- **Selectors**: Always use `data-qa` selectors for component and E2E tests.
- **TDD**: Write/update tests in `tests/unit/components/*.test.ts` before making changes.
- **VM Types**: Update `src/types/components.ts` with VM types to support type-safe testing.

