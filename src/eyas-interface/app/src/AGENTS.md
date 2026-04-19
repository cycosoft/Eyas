# Vue Interface Standards

## Core Philosophy
The interface is a lightweight Vue 3 application responsible for user interaction and visualization. It communicates with the Electron core exclusively via IPC.

## Application Structure
- **Stores (`/stores`)**: Use Pinia for global state management (e.g., user preferences, current session status).
- **Components (`/components`)**: Modular UI elements. See the local `AGENTS.md` in that directory for component-specific rules.
- **Utils (`/utils`)**: Pure functional logic for the UI. Avoid mixing Vue-specific code (refs/computed) in this directory; use Composables instead.

## State Management
- **Persistence**: If state needs to persist across app restarts, send it to the Electron core via IPC.
- **Reactivity**: Prefer `ref()` over `reactive()` for clarity in state definition.

## Rules & Constraints
- **No Direct Core Access**: Never import from `src/eyas-core/`. Communication must be via `window.eyas` IPC.
- **CSS Standards**: Use Vanilla CSS in `<style scoped>` blocks. Avoid global styles unless absolutely necessary.
- **Linter Compliance**:
    - Always run linting on `.vue` files.
    - Maintain explicit return types for all computed properties and methods.
- **Modern Resolution**: Use `.js` extensions in all imports.
