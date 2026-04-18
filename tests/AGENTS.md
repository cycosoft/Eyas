# Test Suite Standards & Patterns

This directory contains the verification logic for Eyas. All tests must be strictly typed and follow these isolation patterns to prevent flakiness and maintain structural integrity.

## 1. IPC Bridge Mocking
When mocking the `window.eyas` interface (the Electron IPC bridge), always use the shared `WindowWithEyas` interface.

- **Casting**: Use `(window as unknown as WindowWithEyas).eyas = { ... }`.
- **Channel Typing**: Ensure `send` and `receive` mock implementations use the `ChannelName` alias for the channel argument.
- **Payloads**: Use `unknown` for payload arguments in mock functions to ensure the implementation handles them safely.

## 2. Module Isolation & Configuration
For tests that require resetting module state (e.g., loading different configurations), use Vitest's `vi.doMock` pattern.

- **Mocking**: Call `vi.doMock()` before dynamically importing the module under test.
- **Loading**: Use dynamic `await import()` inside the `test` block.
- **Type Casting**: Use `ModuleWithDefault<T>` from `@/types/node-helpers.js` to type the result of dynamic imports or `vi.importActual` calls.

## 3. Component ViewModels
Vue component tests must never define local `type ComponentVM = { ... }` blocks.

- **Registry**: Import the component's ViewModel interface (e.g., `SettingsModalVM`) from `@/types/eyas-interface.js`.
- **Registry-First**: If a component ViewModel or store state is missing or out of date, update `src/types/eyas-interface.ts` **before** modifying the test file.
- **Consistency**: This ensures that changes to the component's reactive state are automatically reflected in the test suite's type requirements.

## 4. General Requirements
- **No `any`**: The use of `any` is strictly prohibited. Use `unknown` or define a specific interface in `src/types/`.
- **Async Safety**: Always `await` file system cleanup in `afterEach` hooks using `fs-extra` to prevent race conditions between tests.
- **Naming**: Use backticks for test descriptions to maintain consistency (e.g., `describe(`MyComponent`, () => { ... })`).
