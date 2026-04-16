# AI Agent Instructions: Interface (Vue/UI)

## 1. Technology Stack
- **Framework**: Vue 3 (Options API).
- **State Management**: Pinia.
- **UI Components**: Vuetify.
- **Testing**: Vitest with JSDOM environment.

## 2. Component Patterns
- **Options API**: Always use Options API. Define `data: () => ({})`.
- **State**: Use `:key` over complex state logic for re-renders.
- **Clean Logic**: Avoid `watchers` where possible; prefer computed properties or explicit event handlers.

## 3. Testing
- **Selectors**: Always use `data-qa` selectors for component and E2E tests.
