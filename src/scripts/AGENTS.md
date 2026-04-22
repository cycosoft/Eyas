# Scripts & Utilities Standards

## Core Philosophy
This directory contains build-time scripts, configuration normalizers, and shared runtime utilities. Maintain a strict separation between build logic and runtime code.

## Script Categories
- **Build Scripts**: Used for versioning, signing, and compilation (e.g., `bump-build-version.ts`, `compile-runners.ts`).
- **Configuration**: Logic for parsing and validating the user's `eyas.config.js` (e.g., `get-config.ts`).
- **Runtime Utils**: Shared logic used by both Core and Interface (e.g., `path-utils.ts`, `time-utils.ts`).

## Rules & Constraints
- **IIFEs**: When using an async IIFE to run a script, you MUST provide an explicit return type to satisfy the linter.
    - *Correct*: `(async (): Promise<void> => { ... })();`
- **Error Handling**: Scripts must fail loudly. Use `process.exit(1)` on fatal errors to stop build pipelines.
- **Testing**:
    - Tests for these scripts are located in `tests/electron/`.
    - Always use the electron vitest config.
    - `npx vitest tests/electron/<filename>.test.ts --config vitest.config.electron.js`
