# Type System & Modernization Standards

This directory is the **Source of Truth** for the Eyas type system. All agents must adhere to these strict standards to ensure project-wide type safety and maintainability.

## 1. Semantic Aliasing (Mandatory)
Avoid raw primitives (`string`, `number`, `boolean`) in type annotations. Always check `src/types/primitives.ts` for a semantic alias that provides domain context.

- **Paths**: Use `FilePath`.
- **URLs**: Use `DomainUrl`.
- **IDs/Names**: Use `ChannelName`, `EventType`, or `AppTitle`.
- **Numbers**: Use `PortNumber`, `TimestampMS`, or `ViewportWidth`.
- **UI State**: Use `IsVisible`, `IsEnabled`, or `ModalMode`.

## 2. Component ViewModels
Every Vue component must have a corresponding ViewModel interface defined in `src/types/components.ts`.

- **Naming**: `[ComponentName]VM` (e.g., `SettingsModalVM`).
- **Tests**: Never define local `ComponentVM` types in `*.test.ts` files. Import the shared interface from the registry.
- **Window Object**: Use `WindowWithEyas` (from `src/types/ipc.js`) when casting `window` for IPC bridge access.

## 3. Mocking & Node Helpers
Refer to `src/types/node-helpers.ts` for standardized Node.js and Electron utility types.

- **Dynamic Imports**: Use `ModuleWithDefault<T>` to type default exports from dynamic `import()` or `vi.doMock` calls.
- **Exec/Shell**: Use `ExecResult` and `ExecCallback` for `child_process` interactions.

## 4. Organization & Modularity
- **Domain Logic**: Prioritize updating existing domain files (e.g., `settings.ts`, `test-server.ts`, `build.ts`, `ipc.ts`) over creating new files.
- **Registry Modularity**: Avoid creating monolithic registry files. Distribute interfaces based on domain (e.g., `components.ts` for UI, `ipc.ts` for bridge, `build.ts` for filesystem).
- **Registry Maintenance**: The registry must be updated **before** affected code or tests are modified. If a new interface is needed to resolve a linter error, add it here first.
- **Imports**: Always use the `.js` extension in import statements (e.g., `import type { ... } from './primitives.js'`).
