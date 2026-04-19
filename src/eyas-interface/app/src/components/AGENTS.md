## Linter-Driven Development
The linter (`eslint.config.js`) is the source of truth for code structure and style. Always run linting before completing a task. The patterns below are provided as the standard ways to resolve violations (such as file length or complexity) within this module.

## Component API Style
All Vue components MUST use the **Composition API** with `<script setup>`.

## Component Refactoring
When a component triggers a linter violation (e.g., `max-lines`, `complexity`), use these patterns to resolve it:

### 1. Composable Extraction (Primary Pattern)
- **What**: Move stateful logic, computed properties, and methods to a Composable.
- **Where**: Create a sibling file named `use[ComponentName]Logic.ts` or similar in a `composables/` subdirectory (or sibling if small).
- **Pattern**:
    - Use `ref`, `computed`, and standard hooks within the Composable.
    - Export the necessary state and methods.
- **Benefit**: Naturally separates concerns and drastically reduces the `.vue` file size.

### 2. Logic Extraction (Utility Pattern)
- **What**: Move pure helper functions to a utility file.
- **Where**: Use `[ComponentName].utils.ts`.
- **Pattern**:
    - Move non-reactive calculations and formatting to the utility file.
- **Benefit**: Keeps Composables and Components focused on state management rather than raw data transformation.

## Testing & VM Integrity
- **Registry Check**: Always check `src/types/components.ts` for the corresponding VM type before refactoring.
- **Expose Pattern**: Since `<script setup>` is closed by default, you MUST use `defineExpose()` to expose any properties defined in the `ComponentVM` registry. This ensures existing unit tests (which often cast `wrapper.vm`) continue to function correctly.

## Import Conventions
- **ESM Standard**: All imports from `.ts` files MUST use the `.js` extension (e.g., `import { ... } from './MyComponent.utils.js'`).
- **Relative Paths**: Avoid deep relative parent imports (more than 2 levels) where aliases like `@/` are available.
